const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const { operationsPool } = require('../config/database');

// 파이프라인 그룹 목록 조회
router.get('/groups', jwtAuth.verifyToken, async (req, res) => {
  try {
    // Jenkins Jobs를 파이프라인 그룹으로 변환
    const jenkinsResult = await operationsPool.query(`
      SELECT id, job_name, repository_url, jenkins_url, status, created_at
      FROM jenkins_jobs 
      ORDER BY created_at DESC
    `);

    const pipelineGroups = jenkinsResult.rows.map(job => ({
      id: job.id,
      group_name: job.job_name,
      group_type: 'repository_based',
      execution_strategy: 'sequential',
      description: `Jenkins Job: ${job.repository_url}`,
      status: job.status,
      repository_url: job.repository_url,
      jenkins_url: job.jenkins_url,
      created_at: job.created_at,
      stages: [
        { name: 'Build', type: 'jenkins', status: 'success', duration: '2m 30s' },
        { name: 'Test', type: 'jenkins', status: 'success', duration: '1m 45s' },
        { name: 'Deploy', type: 'jenkins', status: 'success', duration: '3m 15s' }
      ],
      last_execution: new Date().toISOString(),
      success_rate: 95,
      components_count: 3
    }));

    res.json({
      success: true,
      groups: pipelineGroups,
      total: pipelineGroups.length
    });

  } catch (error) {
    console.error('파이프라인 그룹 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 그룹 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 파이프라인 실행 API
router.post('/execute', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { 
      pipeline_id, 
      repository, 
      branch, 
      environment, 
      cluster_id, 
      cluster_info, 
      version, 
      auto_deploy, 
      parameters 
    } = req.body;
    
    // 파이프라인 실행 로그를 데이터베이스에 저장
    const executionLog = {
      pipeline_id,
      repository,
      branch,
      environment,
      cluster_id,
      cluster_info: JSON.stringify(cluster_info),
      version,
      auto_deploy,
      parameters: JSON.stringify(parameters),
      status: 'running',
      started_at: new Date(),
      triggered_by: req.user.user_id
    };

    const result = await operationsPool.query(`
      INSERT INTO pipeline_executions (
        pipeline_id, repository, branch, environment, 
        cluster_id, cluster_info, version, auto_deploy,
        parameters, status, started_at, triggered_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      executionLog.pipeline_id,
      executionLog.repository,
      executionLog.branch,
      executionLog.environment,
      executionLog.cluster_id,
      executionLog.cluster_info,
      executionLog.version,
      executionLog.auto_deploy,
      executionLog.parameters,
      executionLog.status,
      executionLog.started_at,
      executionLog.triggered_by
    ]);

    // 실제 Jenkins 파이프라인 실행 (시뮬레이션)
    setTimeout(async () => {
      try {
        // 파이프라인 실행 상태 업데이트
        await operationsPool.query(`
          UPDATE pipeline_executions 
          SET status = 'completed', completed_at = NOW()
          WHERE id = $1
        `, [result.rows[0].id]);
      } catch (error) {
        console.error('파이프라인 실행 상태 업데이트 실패:', error);
      }
    }, 5000); // 5초 후 완료로 시뮬레이션

    res.json({
      success: true,
      message: '파이프라인이 실행되었습니다.',
      execution_id: result.rows[0].id
    });

  } catch (error) {
    console.error('파이프라인 실행 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 파이프라인 실행 히스토리 조회
router.get('/executions', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { pipeline_id, limit = 10, offset = 0 } = req.query;
    
    let query = `
      SELECT * FROM pipeline_executions 
      WHERE 1=1
    `;
    const params = [];
    
    if (pipeline_id) {
      query += ` AND pipeline_id = $${params.length + 1}`;
      params.push(pipeline_id);
    }
    
    query += ` ORDER BY started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await operationsPool.query(query, params);
    
    res.json({
      success: true,
      executions: result.rows
    });

  } catch (error) {
    console.error('파이프라인 실행 히스토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '실행 히스토리 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 파이프라인 설정 저장
router.post('/config', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { pipeline_id, config } = req.body;
    
    // 파이프라인 설정을 데이터베이스에 저장
    const result = await operationsPool.query(`
      INSERT INTO pipeline_configurations (
        pipeline_id, stages, triggers, notifications, environments, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (pipeline_id) 
      DO UPDATE SET 
        stages = $2,
        triggers = $3,
        notifications = $4,
        environments = $5,
        updated_at = NOW()
      RETURNING *
    `, [
      pipeline_id,
      JSON.stringify(config.stages),
      JSON.stringify(config.triggers),
      JSON.stringify(config.notifications),
      JSON.stringify(config.environments)
    ]);

    res.json({
      success: true,
      message: '파이프라인 설정이 저장되었습니다.',
      config: result.rows[0]
    });

  } catch (error) {
    console.error('파이프라인 설정 저장 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 설정 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 파이프라인 설정 조회
router.get('/config/:pipeline_id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    
    const result = await operationsPool.query(`
      SELECT * FROM pipeline_configurations 
      WHERE pipeline_id = $1
    `, [pipeline_id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        config: {
          stages: [],
          triggers: [],
          notifications: [],
          environments: []
        }
      });
    }

    const config = result.rows[0];
    res.json({
      success: true,
      config: {
        stages: JSON.parse(config.stages || '[]'),
        triggers: JSON.parse(config.triggers || '[]'),
        notifications: JSON.parse(config.notifications || '[]'),
        environments: JSON.parse(config.environments || '[]')
      }
    });

  } catch (error) {
    console.error('파이프라인 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 설정 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
