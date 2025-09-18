const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] CI/CD 파이프라인 목록 조회
router.get('/pipelines', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      entity_id,
      status,
      pipeline_type,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT 
        p.*,
        ce.name as entity_name,
        ce.kind as entity_kind,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name
      FROM catalog_cicd_pipelines p
      LEFT JOIN catalog_entities ce ON p.entity_id = ce.id
      LEFT JOIN timbel_users u1 ON p.created_by = u1.id
      LEFT JOIN timbel_users u2 ON p.updated_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (entity_id) {
      query += ` AND p.entity_id = $${++paramCount}`;
      params.push(entity_id);
    }

    if (status) {
      query += ` AND p.status = $${++paramCount}`;
      params.push(status);
    }

    if (pipeline_type) {
      query += ` AND p.pipeline_type = $${++paramCount}`;
      params.push(pipeline_type);
    }

    query += ` ORDER BY p.created_at DESC`;

    // 페이지네이션
    const offset = (page - 1) * limit;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('CI/CD 파이프라인 목록 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'CI/CD 파이프라인 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] CI/CD 파이프라인 생성
router.post('/pipelines', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      entity_id,
      pipeline_name,
      pipeline_type,
      configuration,
      webhook_url
    } = req.body;

    // 필수 필드 검증
    if (!entity_id || !pipeline_name || !pipeline_type || !configuration) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.',
        message: 'entity_id, pipeline_name, pipeline_type, configuration은 필수 필드입니다.'
      });
    }

    // 엔티티 존재 확인
    const entityQuery = `
      SELECT id, name FROM catalog_entities WHERE id = $1
    `;
    const entityResult = await pool.query(entityQuery, [entity_id]);

    if (entityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '엔티티를 찾을 수 없습니다.',
        message: '해당 ID의 엔티티가 존재하지 않습니다.'
      });
    }

    const insertQuery = `
      INSERT INTO catalog_cicd_pipelines (
        entity_id, pipeline_name, pipeline_type, configuration, 
        webhook_url, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $6
      ) RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      entity_id, pipeline_name, pipeline_type, JSON.stringify(configuration),
      webhook_url, req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'CI/CD 파이프라인이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('CI/CD 파이프라인 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'CI/CD 파이프라인 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] CI/CD 파이프라인 실행
router.post('/pipelines/:id/run', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      trigger_type = 'manual',
      environment,
      version,
      commit_hash,
      branch,
      pull_request_number,
      metadata = {}
    } = req.body;

    // 파이프라인 조회
    const pipelineQuery = `
      SELECT * FROM catalog_cicd_pipelines WHERE id = $1
    `;
    const pipelineResult = await pool.query(pipelineQuery, [id]);

    if (pipelineResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '파이프라인을 찾을 수 없습니다.',
        message: '해당 ID의 파이프라인이 존재하지 않습니다.'
      });
    }

    const pipeline = pipelineResult.rows[0];

    // 실행 번호 계산
    const runNumberQuery = `
      SELECT COALESCE(MAX(run_number), 0) + 1 as next_run_number
      FROM catalog_cicd_runs 
      WHERE pipeline_id = $1
    `;
    const runNumberResult = await pool.query(runNumberQuery, [id]);
    const runNumber = runNumberResult.rows[0].next_run_number;

    // 실행 기록 생성
    const insertRunQuery = `
      INSERT INTO catalog_cicd_runs (
        pipeline_id, run_number, status, trigger_type, trigger_by,
        environment, version, commit_hash, branch, pull_request_number, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;

    const runResult = await pool.query(insertRunQuery, [
      id, runNumber, 'running', trigger_type, req.user.id,
      environment, version, commit_hash, branch, pull_request_number, JSON.stringify(metadata)
    ]);

    // 파이프라인 상태 업데이트
    const updatePipelineQuery = `
      UPDATE catalog_cicd_pipelines 
      SET status = 'running', last_run_at = CURRENT_TIMESTAMP, last_run_status = 'running'
      WHERE id = $1
    `;
    await pool.query(updatePipelineQuery, [id]);

    // 실제 CI/CD 실행 로직은 여기에 구현
    // 예: GitHub Actions, Jenkins, GitLab CI 등과 연동
    // 현재는 시뮬레이션으로 처리

    res.json({
      success: true,
      data: runResult.rows[0],
      message: 'CI/CD 파이프라인이 실행되었습니다.'
    });

  } catch (error) {
    console.error('CI/CD 파이프라인 실행 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'CI/CD 파이프라인 실행 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] CI/CD 실행 로그 조회
router.get('/runs', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      pipeline_id,
      status,
      trigger_type,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT 
        r.*,
        p.pipeline_name,
        ce.name as entity_name,
        ce.kind as entity_kind,
        u.full_name as triggered_by_name
      FROM catalog_cicd_runs r
      LEFT JOIN catalog_cicd_pipelines p ON r.pipeline_id = p.id
      LEFT JOIN catalog_entities ce ON p.entity_id = ce.id
      LEFT JOIN timbel_users u ON r.trigger_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (pipeline_id) {
      query += ` AND r.pipeline_id = $${++paramCount}`;
      params.push(pipeline_id);
    }

    if (status) {
      query += ` AND r.status = $${++paramCount}`;
      params.push(status);
    }

    if (trigger_type) {
      query += ` AND r.trigger_type = $${++paramCount}`;
      params.push(trigger_type);
    }

    query += ` ORDER BY r.started_at DESC`;

    // 페이지네이션
    const offset = (page - 1) * limit;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('CI/CD 실행 로그 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'CI/CD 실행 로그 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] CI/CD 실행 상태 업데이트
router.put('/runs/:id/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, logs, artifacts = [] } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: '상태가 필요합니다.',
        message: 'status 필드는 필수입니다.'
      });
    }

    const validStatuses = ['running', 'success', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 상태입니다.',
        message: `status는 ${validStatuses.join(', ')} 중 하나여야 합니다.`
      });
    }

    const updateFields = ['status = $1'];
    const updateValues = [status];
    let paramCount = 1;

    if (logs !== undefined) {
      updateFields.push(`logs = $${++paramCount}`);
      updateValues.push(logs);
    }

    if (artifacts !== undefined) {
      updateFields.push(`artifacts = $${++paramCount}`);
      updateValues.push(JSON.stringify(artifacts));
    }

    if (status !== 'running') {
      updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
      updateFields.push(`duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER`);
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE catalog_cicd_runs 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '실행 로그를 찾을 수 없습니다.',
        message: '해당 ID의 실행 로그가 존재하지 않습니다.'
      });
    }

    // 파이프라인 상태도 업데이트
    if (status !== 'running') {
      const pipelineUpdateQuery = `
        UPDATE catalog_cicd_pipelines 
        SET status = 'idle', last_run_status = $1
        WHERE id = (SELECT pipeline_id FROM catalog_cicd_runs WHERE id = $2)
      `;
      await pool.query(pipelineUpdateQuery, [status, id]);
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'CI/CD 실행 상태가 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('CI/CD 실행 상태 업데이트 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'CI/CD 실행 상태 업데이트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] CI/CD 통계 조회
router.get('/stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        p.pipeline_type,
        COUNT(*) as total_pipelines,
        COUNT(CASE WHEN p.status = 'running' THEN 1 END) as running_pipelines,
        COUNT(CASE WHEN p.status = 'idle' THEN 1 END) as idle_pipelines,
        COUNT(r.id) as total_runs,
        COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs,
        AVG(r.duration) as avg_duration
      FROM catalog_cicd_pipelines p
      LEFT JOIN catalog_cicd_runs r ON p.id = r.pipeline_id
      GROUP BY p.pipeline_type
      ORDER BY total_pipelines DESC
    `;

    const result = await pool.query(statsQuery);

    // 최근 실행 통계
    const recentStatsQuery = `
      SELECT 
        DATE(r.started_at) as date,
        COUNT(*) as total_runs,
        COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs
      FROM catalog_cicd_runs r
      WHERE r.started_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(r.started_at)
      ORDER BY date DESC
    `;

    const recentResult = await pool.query(recentStatsQuery);

    res.json({
      success: true,
      data: {
        by_type: result.rows,
        recent_runs: recentResult.rows
      }
    });

  } catch (error) {
    console.error('CI/CD 통계 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'CI/CD 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
