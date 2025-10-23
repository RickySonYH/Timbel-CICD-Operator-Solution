// [advice from AI] 관리자 전용 API 라우트 - 시스템 관리, 모니터링 설정 등
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const advancedPermissions = require('./advanced-permissions');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀 (지식 관리 DB - 사용자 정보)
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_knowledge',
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

// [advice from AI] 사용자 목록 조회 API
router.get('/users', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_users'), async (req, res) => {
  try {
    // [advice from AI] timbel_knowledge DB에서 사용자 정보 조회
    const knowledgePool = new Pool({
      user: 'timbel_user',
      host: 'postgres',
      database: 'timbel_knowledge',
      password: 'timbel_password',
      port: 5432,
    });

    const result = await knowledgePool.query(`
      SELECT 
        id,
        username,
        email,
        full_name,
        role,
        status,
        permission_level,
        work_permissions,
        created_at,
        updated_at
      FROM timbel_users 
      WHERE status != 'deleted'
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1
          WHEN 'operations' THEN 2
          WHEN 'deployer' THEN 3
          ELSE 4
        END,
        full_name
    `);

    await knowledgePool.end();

    console.log(`✅ 사용자 목록 ${result.rows.length}개 조회 완료`);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('❌ 사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '사용자 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 역할 목록 조회 API
router.get('/roles', jwtAuth.verifyToken, async (req, res) => {
  try {
    const roles = [
      { id: 'admin', name: '관리자', description: '시스템 전체 관리 권한' },
      { id: 'operations', name: '운영자', description: 'CI/CD 파이프라인 관리 권한' },
      { id: 'deployer', name: '배포자', description: '배포 실행 권한' },
      { id: 'viewer', name: '조회자', description: '읽기 전용 권한' }
    ];

    res.json({
      success: true,
      roles: roles
    });

  } catch (error) {
    console.error('❌ 역할 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '역할 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 설정 조회 API
router.get('/system-configs', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_system'), async (req, res) => {
  try {
    const systemConfigs = [
      {
        id: 1,
        config_key: 'jenkins_url',
        config_name: 'Jenkins 서버 URL',
        config_value: process.env.JENKINS_URL || 'http://jenkins.langsa.ai:8080',
        config_type: 'url',
        description: 'Jenkins CI/CD 서버 주소'
      },
      {
        id: 2,
        config_key: 'argocd_url',
        config_name: 'ArgoCD 서버 URL',
        config_value: process.env.ARGOCD_URL || 'http://argocd.langsa.ai',
        config_type: 'url',
        description: 'ArgoCD GitOps 배포 서버 주소'
      },
      {
        id: 3,
        config_key: 'nexus_url',
        config_name: 'Nexus Repository URL',
        config_value: process.env.NEXUS_URL || 'http://nexus.langsa.ai:8081',
        config_type: 'url',
        description: 'Nexus 아티팩트 저장소 주소'
      },
      {
        id: 4,
        config_key: 'docker_registry',
        config_name: 'Docker Registry',
        config_value: process.env.DOCKER_REGISTRY || 'nexus.langsa.ai:8082',
        config_type: 'url',
        description: 'Docker 이미지 저장소 주소'
      },
      {
        id: 5,
        config_key: 'max_concurrent_builds',
        config_name: '최대 동시 빌드 수',
        config_value: process.env.MAX_CONCURRENT_BUILDS || '5',
        config_type: 'number',
        description: '동시에 실행 가능한 최대 빌드 수'
      }
    ];

    res.json({
      success: true,
      configs: systemConfigs
    });

  } catch (error) {
    console.error('❌ 시스템 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 설정 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] ========== 사용자 관리 API ==========

// 모든 사용자 조회
router.get('/users', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    console.log('👥 모든 사용자 조회');
    
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role_type,
        u.permission_level,
        u.status,
        u.created_at,
        u.last_login
      FROM timbel_users u
      ORDER BY u.created_at DESC
    `);

    console.log(`✅ 사용자 목록 ${result.rows.length}개 조회 완료`);

    res.json({
      success: true,
      users: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ 사용자 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '사용자 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 사용자 상태 변경
router.put('/users/:userId/status', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    console.log(`🔄 사용자 상태 변경: ${userId} -> ${status}`);

    if (!['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상태입니다.'
      });
    }

    const result = await pool.query(`
      UPDATE timbel_users 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, email, full_name, status
    `, [status, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log(`✅ 사용자 상태 변경 완료: ${result.rows[0].username} -> ${status}`);

    res.json({
      success: true,
      user: result.rows[0],
      message: '사용자 상태가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('❌ 사용자 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      error: '사용자 상태 변경 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 사용자 권한 변경
router.put('/users/:userId/role', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_type, permission_level } = req.body;

    console.log(`🔑 사용자 권한 변경: ${userId} -> ${role_type}/${permission_level}`);

    const result = await pool.query(`
      UPDATE timbel_users 
      SET 
        role_type = COALESCE($1, role_type),
        permission_level = COALESCE($2, permission_level),
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, username, email, full_name, role_type, permission_level
    `, [role_type, permission_level, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log(`✅ 사용자 권한 변경 완료: ${result.rows[0].username}`);

    res.json({
      success: true,
      user: result.rows[0],
      message: '사용자 권한이 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('❌ 사용자 권한 변경 오류:', error);
    res.status(500).json({
      success: false,
      error: '사용자 권한 변경 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 사용자 생성 (관리자용)
router.post('/users', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { username, email, password, full_name, role_type = 'developer', permission_level = 2 } = req.body;

    console.log(`➕ 사용자 생성: ${username} (${role_type})`);

    // 비밀번호 해싱
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO timbel_users (username, email, password_hash, full_name, role_type, permission_level, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, username, email, full_name, role_type, permission_level, status, created_at
    `, [username, email, hashedPassword, full_name, role_type, permission_level]);

    console.log(`✅ 사용자 생성 완료: ${result.rows[0].username}`);

    res.json({
      success: true,
      user: result.rows[0],
      message: '사용자가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('❌ 사용자 생성 오류:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 사용자명 또는 이메일입니다.'
      });
    }

    res.status(500).json({
      success: false,
      error: '사용자 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 사용자 삭제
router.delete('/users/:userId', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🗑️ 사용자 삭제: ${userId}`);

    const result = await pool.query(`
      DELETE FROM timbel_users 
      WHERE id = $1 AND role_type != 'admin'
      RETURNING username
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없거나 관리자는 삭제할 수 없습니다.'
      });
    }

    console.log(`✅ 사용자 삭제 완료: ${result.rows[0].username}`);

    res.json({
      success: true,
      message: '사용자가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 사용자 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '사용자 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 가입 승인 대기 사용자 목록
router.get('/users/pending-approvals', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    console.log('📋 가입 승인 대기 사용자 조회');
    
    const result = await pool.query(`
      SELECT 
        id, username, email, full_name, created_at
      FROM timbel_users
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      pending_users: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ 가입 승인 대기 사용자 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '가입 승인 대기 사용자 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 회원가입 승인
router.post('/users/:userId/approve', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_type = 'developer', permission_level = 2 } = req.body;

    console.log(`✅ 회원가입 승인: ${userId}`);

    const result = await pool.query(`
      UPDATE timbel_users 
      SET 
        status = 'active',
        role_type = $1,
        permission_level = $2,
        updated_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING id, username, email, full_name, role_type, permission_level, status
    `, [role_type, permission_level, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '승인 대기 중인 사용자를 찾을 수 없습니다.'
      });
    }

    console.log(`✅ 회원가입 승인 완료: ${result.rows[0].username}`);

    res.json({
      success: true,
      user: result.rows[0],
      message: '회원가입이 승인되었습니다.'
    });

  } catch (error) {
    console.error('❌ 회원가입 승인 오류:', error);
    res.status(500).json({
      success: false,
      error: '회원가입 승인 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 회원가입 거부
router.post('/users/:userId/reject', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    console.log(`❌ 회원가입 거부: ${userId}`);

    const result = await pool.query(`
      DELETE FROM timbel_users 
      WHERE id = $1 AND status = 'pending'
      RETURNING username, email
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '승인 대기 중인 사용자를 찾을 수 없습니다.'
      });
    }

    console.log(`✅ 회원가입 거부 완료: ${result.rows[0].username}`);

    // TODO: 이메일 알림 전송 (선택사항)

    res.json({
      success: true,
      message: '회원가입이 거부되었습니다.'
    });

  } catch (error) {
    console.error('❌ 회원가입 거부 오류:', error);
    res.status(500).json({
      success: false,
      error: '회원가입 거부 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
