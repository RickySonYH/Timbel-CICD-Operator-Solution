const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const axios = require('axios');
const https = require('https');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: parseInt(process.env.DB_PORT) || 5432,
});

// [advice from AI] 실제 헬스 체크 함수 구현
async function performHealthCheck(infrastructure) {
  const startTime = Date.now();
  const timeout = 10000; // 10초 타임아웃
  
  try {
    let url = infrastructure.service_url;
    
    // [advice from AI] Docker 컨테이너에서 localhost 접근 문제 해결
    if (url.includes('localhost')) {
      url = url.replace('localhost', 'host.docker.internal');
      console.log(`🔄 URL 변환: ${infrastructure.service_url} → ${url}`);
    }
    
    console.log(`🔍 헬스 체크 시작: ${infrastructure.service_name} (${url})`);
    
    // HTTPS 요청을 위한 agent 설정 (자체 서명 인증서 허용)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    const response = await axios.get(url, {
      timeout,
      httpsAgent,
      validateStatus: (status) => status < 500 // 500 미만은 모두 성공으로 간주
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ ${infrastructure.service_name} 헬스 체크 성공: ${response.status} (${responseTime}ms)`);
    
    return {
      health_status: 'active',
      error_message: null,
      response_time_ms: responseTime,
      status_code: response.status,
      metadata: {
        checked_at: new Date().toISOString(),
        status_text: response.statusText
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ ${infrastructure.service_name} 헬스 체크 실패: ${error.message} (${responseTime}ms)`);
    
    let status = 'error';
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      status = 'inactive';
    } else if (error.code === 'ECONNABORTED') {
      status = 'timeout';
    }
    
    return {
      health_status: status,
      error_message: error.message,
      response_time_ms: responseTime,
      status_code: error.response?.status || 0,
      metadata: {
        checked_at: new Date().toISOString(),
        error_code: error.code
      }
    };
  }
}

// [advice from AI] 간단한 암호화/복호화 함수 (실제 운영에서는 더 강력한 암호화 사용)
function encryptInfrastructure(data) {
  return {
    admin_password_encrypted: data.admin_password ? Buffer.from(data.admin_password).toString('base64') : null,
    service_accounts: data.service_accounts || null
  };
}

function decryptInfrastructure(infrastructure) {
  const decrypted = { ...infrastructure };
  if (infrastructure.admin_password_encrypted) {
    try {
      decrypted.admin_password = Buffer.from(infrastructure.admin_password_encrypted, 'base64').toString('utf8');
    } catch (error) {
      console.error('복호화 오류:', error);
      decrypted.admin_password = null;
    }
  }
  return decrypted;
}

// GET all deployment infrastructures
router.get('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deployment_infrastructure ORDER BY created_at DESC');
    console.log('🔍 DB에서 조회된 인프라 개수:', result.rows.length);
    
    // [advice from AI] 실제 헬스 체크 수행
    const infrastructures = await Promise.all(
      result.rows.map(async (infra) => {
        try {
          const health = await performHealthCheck(infra);
          return {
            ...infra,
            status: infra.status || 'operational', // [advice from AI] 운영 상태 설정
            health_status: health.health_status,
            health_message: health.error_message || 'OK',
            response_time_ms: health.response_time_ms,
            last_health_check: health.metadata?.checked_at || new Date().toISOString()
          };
        } catch (healthError) {
          console.error(`❌ ${infra.service_name} 헬스체크 오류:`, healthError.message);
          return {
            ...infra,
            status: infra.status || 'operational', // [advice from AI] 운영 상태 설정
            health_status: 'error',
            health_message: healthError.message,
            response_time_ms: 0,
            last_health_check: new Date().toISOString()
          };
        }
      })
    );

    console.log('📤 API 응답 인프라 개수:', infrastructures.length);
    res.json({ success: true, data: infrastructures });
  } catch (error) {
    console.error('❌ 배포 인프라 조회 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deployment infrastructures', message: error.message });
  }
});

// GET a single deployment infrastructure by ID
router.get('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM deployment_infrastructure WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Infrastructure not found', message: '해당 인프라를 찾을 수 없습니다.' });
    }
    const infrastructure = decryptInfrastructure(result.rows[0]);
    try {
      const health = await performHealthCheck(infrastructure);
      res.json({ 
        success: true, 
        data: { 
          ...infrastructure, 
          health_status: health.health_status, 
          health_message: health.error_message || 'OK',
          response_time_ms: health.response_time_ms,
          last_health_check: health.metadata?.checked_at || new Date().toISOString()
        } 
      });
    } catch (healthError) {
      console.error(`❌ ${infrastructure.service_name} 헬스체크 오류:`, healthError.message);
      res.json({ 
        success: true, 
        data: { 
          ...infrastructure, 
          health_status: 'error', 
          health_message: healthError.message,
          response_time_ms: 0,
          last_health_check: new Date().toISOString()
        } 
      });
    }
  } catch (error) {
    console.error('❌ 배포 인프라 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deployment infrastructure', message: error.message });
  }
});

// POST a new deployment infrastructure
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  const { service_name, service_type, environment, service_url, admin_username, admin_password_encrypted, service_accounts, description, tags } = req.body;

  if (!service_name || !service_type || !service_url) {
    return res.status(400).json({ success: false, error: 'Missing required fields', message: '필수 필드를 입력해주세요 (service_name, service_type, service_url).' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO deployment_infrastructure (service_name, service_type, environment, service_url, admin_username, admin_password_encrypted, service_accounts, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [service_name, service_type, environment, service_url, admin_username, admin_password_encrypted, service_accounts, description, tags]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ 배포 인프라 생성 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to create deployment infrastructure', message: error.message });
  }
});

// PUT (update) an existing deployment infrastructure
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  const { id } = req.params;
  const { service_name, service_type, environment, service_url, admin_username, admin_password_encrypted, service_accounts, description, tags } = req.body;

  try {
    const result = await pool.query(
      `UPDATE deployment_infrastructure
       SET service_name = $1, service_type = $2, environment = $3, service_url = $4, admin_username = $5, admin_password_encrypted = $6, service_accounts = $7, description = $8, tags = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [service_name, service_type, environment, service_url, admin_username, admin_password_encrypted, service_accounts, description, tags, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Infrastructure not found', message: '해당 인프라를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ 배포 인프라 업데이트 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to update deployment infrastructure', message: error.message });
  }
});

// DELETE a deployment infrastructure
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  console.log('🗑️ 인프라 삭제 요청:', { id, user: req.user?.userId });
  
  try {
    // [advice from AI] 단순하고 직접적인 삭제
    const result = await pool.query('DELETE FROM deployment_infrastructure WHERE id = $1 RETURNING service_name', [id]);
    
    if (result.rows.length === 0) {
      console.log('❌ 삭제할 인프라를 찾을 수 없음:', id);
      return res.status(404).json({ 
        success: false, 
        error: 'Infrastructure not found', 
        message: '해당 인프라를 찾을 수 없습니다.' 
      });
    }
    
    console.log('✅ 인프라 삭제 완료:', result.rows[0].service_name);
    res.json({ 
      success: true, 
      message: `${result.rows[0].service_name} 인프라가 성공적으로 삭제되었습니다.` 
    });
  } catch (error) {
    console.error('❌ 배포 인프라 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete deployment infrastructure', 
      message: error.message 
    });
  }
});

module.exports = router;