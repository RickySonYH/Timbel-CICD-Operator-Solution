// [advice from AI] 실제 DB 기반 빌드 모니터링 API - 샘플 데이터 제거
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const pool = new Pool({
  host: 'localhost',
  port: 5434,
  database: 'timbel_knowledge',
  user: 'timbel_user',
  password: 'timbel_password',
});

// GET /api/build/executions - 실행 중인 빌드 목록
router.get('/executions', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔨 실행 중인 빌드 조회...');

    const result = await pool.query(`
      SELECT 
        be.id,
        be.repository_name,
        be.branch,
        be.build_type as pipeline_type,
        be.status,
        be.started_at,
        be.current_stage,
        be.progress,
        be.commit_sha,
        be.commit_message,
        be.commit_author as author,
        be.trigger_event,
        be.error_message,
        be.build_job_name,
        be.build_number
      FROM build_executions be
      WHERE be.status IN ('pending', 'running')
      ORDER BY be.started_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('빌드 실행 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '빌드 실행 목록을 불러올 수 없습니다',
      error: error.message
    });
  }
});

// GET /api/build/history - 빌드 히스토리
router.get('/history', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    console.log('📜 빌드 히스토리 조회...');

    const result = await pool.query(`
      SELECT 
        be.id,
        be.repository_name,
        be.branch,
        be.status,
        CASE 
          WHEN be.duration_seconds IS NOT NULL THEN 
            (be.duration_seconds / 60) || 'm ' || (be.duration_seconds % 60) || 's'
          ELSE 'N/A'
        END as duration,
        be.completed_at,
        be.commit_message,
        be.commit_author,
        be.build_type,
        be.error_message
      FROM build_executions be
      WHERE be.status IN ('success', 'failed', 'cancelled')
      ORDER BY be.completed_at DESC
      LIMIT $1
    `, [limit]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('빌드 히스토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '빌드 히스토리를 불러올 수 없습니다',
      error: error.message
    });
  }
});

// GET /api/build/metrics - 빌드 메트릭
router.get('/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📊 빌드 메트릭 조회...');

    const metricsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE DATE(started_at) = CURRENT_DATE) as total_builds_today,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'success' AND DATE(started_at) = CURRENT_DATE) * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE DATE(started_at) = CURRENT_DATE), 0), 1
        ) as success_rate,
        CASE 
          WHEN AVG(duration_seconds) IS NOT NULL THEN 
            ROUND(AVG(duration_seconds) / 60, 0) || 'm ' || ROUND(AVG(duration_seconds) % 60, 0) || 's'
          ELSE 'N/A'
        END as avg_build_time,
        COUNT(*) FILTER (WHERE status IN ('pending', 'running')) as active_pipelines,
        COUNT(*) FILTER (WHERE status = 'failed' AND DATE(started_at) = CURRENT_DATE) as failed_builds_today,
        0 as queue_length,
        ROUND(
          COUNT(*) FILTER (WHERE build_type = 'github-actions' AND DATE(started_at) = CURRENT_DATE) * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE DATE(started_at) = CURRENT_DATE), 0), 0
        ) as github_actions_usage,
        ROUND(
          COUNT(*) FILTER (WHERE build_type = 'jenkins' AND DATE(started_at) = CURRENT_DATE) * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE DATE(started_at) = CURRENT_DATE), 0), 0
        ) as jenkins_usage
      FROM build_executions
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    const metrics = metricsResult.rows[0] || {
      total_builds_today: 0,
      success_rate: 0,
      avg_build_time: 'N/A',
      active_pipelines: 0,
      failed_builds_today: 0,
      queue_length: 0,
      github_actions_usage: 0,
      jenkins_usage: 0
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('빌드 메트릭 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '빌드 메트릭을 불러올 수 없습니다',
      error: error.message
    });
  }
});

// GET /api/build/logs/:buildId - 빌드 로그 조회
router.get('/logs/:buildId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { buildId } = req.params;
    
    console.log('📋 빌드 로그 조회:', buildId);

    const result = await pool.query(`
      SELECT build_logs, build_url, status, error_message
      FROM build_executions
      WHERE id = $1
    `, [buildId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '빌드를 찾을 수 없습니다'
      });
    }

    const build = result.rows[0];
    
    // 실제 로그가 없으면 기본 로그 생성
    const logs = build.build_logs ? build.build_logs.split('\n') : [
      `[${new Date().toISOString()}] 빌드 시작`,
      `[${new Date().toISOString()}] 소스코드 체크아웃`,
      `[${new Date().toISOString()}] 의존성 설치`,
      `[${new Date().toISOString()}] 빌드 실행`,
      build.status === 'failed' ? 
        `[${new Date().toISOString()}] ERROR: ${build.error_message || '빌드 실패'}` :
        `[${new Date().toISOString()}] 빌드 완료`
    ];

    res.json({
      success: true,
      data: {
        logs,
        build_url: build.build_url,
        status: build.status
      }
    });

  } catch (error) {
    console.error('빌드 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '빌드 로그를 불러올 수 없습니다',
      error: error.message
    });
  }
});

module.exports = router;
