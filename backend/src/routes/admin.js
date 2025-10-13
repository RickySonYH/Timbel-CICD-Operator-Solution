// [advice from AI] 관리자 전용 API 라우트 - 시스템 관리, 모니터링 설정 등
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀 (운영센터 DB)
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_cicd_operator',
  password: 'timbel_password',
  port: 5432,
});

// [advice from AI] 모니터링 설정 조회
router.get('/monitoring-configs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, config_name, config_type, endpoint_url,
        status, last_check, created_at
      FROM monitoring_configurations
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      configs: result.rows
    });

  } catch (error) {
    console.error('모니터링 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '모니터링 설정 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 모니터링 설정 생성
router.post('/monitoring-configs', async (req, res) => {
  try {
    const { config_name, config_type, endpoint_url, api_key, username, password } = req.body;

    const result = await pool.query(`
      INSERT INTO monitoring_configurations (
        config_name, config_type, endpoint_url, api_key, username, password
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [config_name, config_type, endpoint_url, api_key, username, password]);

    res.json({
      success: true,
      config: result.rows[0]
    });

  } catch (error) {
    console.error('모니터링 설정 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '모니터링 설정 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 모니터링 연결 테스트
router.post('/monitoring-configs/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 설정 정보 조회
    const configResult = await pool.query(`
      SELECT * FROM monitoring_configurations WHERE id = $1
    `, [id]);

    if (configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '모니터링 설정을 찾을 수 없습니다.'
      });
    }

    const config = configResult.rows[0];
    let testResult = { success: false, error: '연결 테스트 미구현' };

    // 실제 연결 테스트 (기본 HTTP 요청)
    try {
      const fetch = require('node-fetch');
      const response = await fetch(config.endpoint_url, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        testResult = { success: true, error: null };
        
        // 연결 상태 업데이트
        await pool.query(`
          UPDATE monitoring_configurations 
          SET status = 'connected', last_check = NOW()
          WHERE id = $1
        `, [id]);
      } else {
        testResult = { success: false, error: `HTTP ${response.status}` };
      }
    } catch (fetchError) {
      testResult = { success: false, error: fetchError.message };
      
      // 연결 실패 상태 업데이트
      await pool.query(`
        UPDATE monitoring_configurations 
        SET status = 'error', last_check = NOW()
        WHERE id = $1
      `, [id]);
    }

    res.json(testResult);

  } catch (error) {
    console.error('모니터링 연결 테스트 오류:', error);
    res.status(500).json({
      success: false,
      error: '연결 테스트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 모니터링 대상 서버 조회
router.get('/monitored-servers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ms.id, ms.server_name, ms.server_type, ms.ip_address, ms.port,
        ms.health_check_url, ms.status, ms.last_heartbeat, ms.created_at,
        mc.config_name as monitoring_config_name
      FROM monitored_servers ms
      LEFT JOIN monitoring_configurations mc ON ms.monitoring_config_id = mc.id
      ORDER BY ms.created_at DESC
    `);

    res.json({
      success: true,
      servers: result.rows
    });

  } catch (error) {
    console.error('모니터링 서버 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '모니터링 서버 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 모니터링 대상 서버 등록
router.post('/monitored-servers', async (req, res) => {
  try {
    const { 
      server_name, 
      server_type, 
      ip_address, 
      port, 
      monitoring_config_id, 
      health_check_url 
    } = req.body;

    const result = await pool.query(`
      INSERT INTO monitored_servers (
        server_name, server_type, ip_address, port, 
        monitoring_config_id, health_check_url
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [server_name, server_type, ip_address, port, monitoring_config_id, health_check_url]);

    res.json({
      success: true,
      server: result.rows[0]
    });

  } catch (error) {
    console.error('모니터링 서버 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '모니터링 서버 등록 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
