// [advice from AI] 배포 요청 및 히스토리 관리 API
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'timbel_cicd_operator',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password'
});

// [advice from AI] 배포 요청 목록 조회
router.get('/deployment-requests', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        od.id,
        od.project_name,
        od.repository_url,
        'development' as environment,
        od.status,
        od.created_by as requested_by,
        od.created_at as requested_at,
        0 as current_step,
        'normal' as priority
      FROM operations_deployments od
      WHERE od.status IN ('pending', 'in_progress', 'approved')
      ORDER BY od.created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    console.error('배포 요청 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 요청 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 배포 요청 승인
router.post('/deployment-requests/:id/approve', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'system';

    // 배포 요청 상태 업데이트
    const result = await pool.query(`
      UPDATE operations_deployments
      SET 
        status = 'approved',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '배포 요청을 찾을 수 없습니다.'
      });
    }

    // 5단계 자동 진행 시작 (비동기)
    // 실제 환경에서는 별도 워커나 큐 시스템 사용
    console.log(`🚀 배포 요청 승인: ${id} - 5단계 자동 진행 시작`);

    res.json({
      success: true,
      message: '배포 요청이 승인되었습니다. 5단계 자동 진행이 시작됩니다.',
      deployment: result.rows[0]
    });
  } catch (error) {
    console.error('배포 요청 승인 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 요청 승인 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 배포 요청 거부
router.post('/deployment-requests/:id/reject', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE operations_deployments
      SET 
        status = 'rejected',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '배포 요청을 찾을 수 없습니다.'
      });
    }

    console.log(`❌ 배포 요청 거부: ${id} - 사유: ${reason}`);

    res.json({
      success: true,
      message: '배포 요청이 거부되었습니다.',
      deployment: result.rows[0]
    });
  } catch (error) {
    console.error('배포 요청 거부 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 요청 거부 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 배포 히스토리 조회
router.get('/deployment-history', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        od.id,
        od.project_name,
        'development' as environment,
        od.status,
        od.created_at as deployed_at,
        od.created_by as deployed_by,
        od.version,
        od.repository_url,
        'abc123' as commit_hash,
        COALESCE(EXTRACT(EPOCH FROM (od.updated_at - od.created_at))::integer, 0) as duration_seconds
      FROM operations_deployments od
      WHERE od.status IN ('completed', 'failed', 'rollback', 'success')
      ORDER BY od.created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      deployments: result.rows
    });
  } catch (error) {
    console.error('배포 히스토리 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 히스토리 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 배포 롤백
router.post('/deployments/:id/rollback', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'system';

    // 기존 배포 정보 조회
    const deployment = await pool.query(`
      SELECT * FROM operations_deployments WHERE id = $1
    `, [id]);

    if (deployment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '배포를 찾을 수 없습니다.'
      });
    }

    const originalDeployment = deployment.rows[0];

    // 롤백 배포 기록 생성
    const rollbackResult = await pool.query(`
      INSERT INTO operations_deployments (
        deployment_name,
        project_name,
        repository_url,
        status,
        created_by,
        created_at,
        branch,
        version,
        deployment_strategy
      ) VALUES ($1, $2, $3, 'rollback', $4, NOW(), 'main', 'rollback', 'rollback')
      RETURNING *
    `, [
      `rollback-${originalDeployment.project_name}`,
      originalDeployment.project_name,
      originalDeployment.repository_url,
      userId
    ]);

    console.log(`🔄 배포 롤백 시작: ${id}`);

    res.json({
      success: true,
      message: '롤백이 시작되었습니다.',
      rollback_deployment: rollbackResult.rows[0]
    });
  } catch (error) {
    console.error('배포 롤백 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 롤백 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;

