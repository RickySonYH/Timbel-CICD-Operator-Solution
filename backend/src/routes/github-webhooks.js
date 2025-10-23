// [advice from AI] GitHub 웹훅 관리 API
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_cicd_operator',
  password: 'timbel_password',
  port: 5432,
});

// [advice from AI] GitHub 웹훅 목록 조회
router.get('/webhooks', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 실제 웹훅 데이터가 없을 때 빈 배열 반환
    const result = await pool.query(`
      SELECT 
        id,
        repository_url,
        webhook_url,
        events,
        secret_token,
        is_active,
        jenkins_job_id,
        created_at,
        last_triggered_at
      FROM github_webhooks
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      webhooks: result.rows,
      total: result.rows.length,
      message: result.rows.length === 0 ? 
        '등록된 GitHub 웹훅이 없습니다. 새로운 파이프라인을 구성하면 웹훅이 자동으로 생성됩니다.' : 
        `${result.rows.length}개 웹훅 조회 완료`
    });

  } catch (error) {
    console.error('GitHub 웹훅 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub 웹훅 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] GitHub 웹훅 생성
router.post('/webhooks', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      repository_url,
      webhook_url,
      events = ['push', 'pull_request'],
      secret_token,
      jenkins_job_id
    } = req.body;

    const result = await pool.query(`
      INSERT INTO github_webhooks (
        repository_url, webhook_url, events, secret_token, jenkins_job_id, is_active
      )
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [
      repository_url,
      webhook_url,
      JSON.stringify(events),
      secret_token,
      jenkins_job_id
    ]);

    res.json({
      success: true,
      webhook: result.rows[0],
      message: 'GitHub 웹훅이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('GitHub 웹훅 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub 웹훅 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] GitHub 웹훅 상태 업데이트
router.put('/webhooks/:id/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(`
      UPDATE github_webhooks 
      SET is_active = $1, last_triggered_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '웹훅을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      webhook: result.rows[0],
      message: `웹훅 상태가 ${is_active ? '활성화' : '비활성화'}되었습니다.`
    });

  } catch (error) {
    console.error('GitHub 웹훅 상태 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub 웹훅 상태 업데이트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] GitHub 웹훅 삭제
router.delete('/webhooks/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM github_webhooks 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '웹훅을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: 'GitHub 웹훅이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('GitHub 웹훅 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub 웹훅 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
