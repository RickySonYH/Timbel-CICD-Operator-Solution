// [advice from AI] 솔루션 인스턴스 관리 API - 실제 데이터베이스 연동
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] 데이터베이스 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_cicd_operator',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 솔루션 타입 조회 API
router.get('/solution-types', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📋 솔루션 타입 목록 조회');
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          key,
          name,
          category,
          default_port,
          description,
          is_active,
          created_at,
          updated_at
        FROM solution_types 
        WHERE is_active = true
        ORDER BY category, name
      `);
      
      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 솔루션 타입 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '솔루션 타입 조회 실패',
      error: error.message
    });
  }
});

// [advice from AI] 솔루션 타입 추가 API
router.post('/solution-types', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('➕ 새 솔루션 타입 추가:', req.body);
    
    const { key, name, category, default_port, description } = req.body;
    const userId = req.user?.id || 'system';
    
    if (!key || !name || !category) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다. (key, name, category)'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // 중복 키 확인
      const existingType = await client.query(
        'SELECT id FROM solution_types WHERE key = $1',
        [key]
      );
      
      if (existingType.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: '이미 존재하는 솔루션 타입 키입니다.'
        });
      }
      
      const result = await client.query(`
        INSERT INTO solution_types (
          key, name, category, default_port, description, 
          is_active, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        RETURNING *
      `, [key, name, category, default_port || 8080, description || '', userId]);
      
      console.log('✅ 솔루션 타입 추가 완료:', result.rows[0].key);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: '솔루션 타입이 성공적으로 추가되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 솔루션 타입 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '솔루션 타입 추가 실패',
      error: error.message
    });
  }
});

// [advice from AI] 솔루션 인스턴스 조회 API
router.get('/instances', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📋 솔루션 인스턴스 목록 조회');
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          si.id,
          si.type,
          si.name,
          si.url,
          si.environment,
          si.region,
          si.status,
          si.description,
          si.credentials,
          si.metrics,
          si.created_at,
          si.updated_at,
          st.name as type_name,
          st.category as type_category
        FROM solution_instances si
        LEFT JOIN solution_types st ON si.type = st.key
        WHERE si.is_active = true
        ORDER BY si.type, si.environment, si.name
      `);
      
      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 솔루션 인스턴스 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '솔루션 인스턴스 조회 실패',
      error: error.message
    });
  }
});

// [advice from AI] 솔루션 인스턴스 추가 API
router.post('/instances', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('➕ 새 솔루션 인스턴스 추가:', req.body);
    
    const { 
      type, name, url, environment, region, description, 
      username, token 
    } = req.body;
    const userId = req.user?.id || 'system';
    
    if (!type || !name || !url || !environment) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다. (type, name, url, environment)'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // 솔루션 타입 존재 확인
      const typeCheck = await client.query(
        'SELECT id FROM solution_types WHERE key = $1 AND is_active = true',
        [type]
      );
      
      if (typeCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '존재하지 않는 솔루션 타입입니다.'
        });
      }
      
      const credentials = username && token ? { username, token } : {};
      const metrics = { lastCheck: new Date().toISOString() };
      
      const result = await client.query(`
        INSERT INTO solution_instances (
          type, name, url, environment, region, status, description,
          credentials, metrics, is_active, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'unknown', $6, $7, $8, true, $9, NOW(), NOW())
        RETURNING *
      `, [
        type, name, url, environment, region || '', 
        description || '', JSON.stringify(credentials), JSON.stringify(metrics), userId
      ]);
      
      console.log('✅ 솔루션 인스턴스 추가 완료:', result.rows[0].name);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: '솔루션 인스턴스가 성공적으로 추가되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 솔루션 인스턴스 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '솔루션 인스턴스 추가 실패',
      error: error.message
    });
  }
});

// [advice from AI] 솔루션 인스턴스 수정 API
router.put('/instances/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ 솔루션 인스턴스 수정:', id);
    
    const { 
      name, url, environment, region, description, status,
      username, token 
    } = req.body;
    const userId = req.user?.id || 'system';
    
    const client = await pool.connect();
    
    try {
      const credentials = username && token ? { username, token } : {};
      
      const result = await client.query(`
        UPDATE solution_instances 
        SET 
          name = COALESCE($2, name),
          url = COALESCE($3, url),
          environment = COALESCE($4, environment),
          region = COALESCE($5, region),
          description = COALESCE($6, description),
          status = COALESCE($7, status),
          credentials = COALESCE($8, credentials),
          updated_by = $9,
          updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING *
      `, [
        id, name, url, environment, region, description, status,
        Object.keys(credentials).length > 0 ? JSON.stringify(credentials) : null,
        userId
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '솔루션 인스턴스를 찾을 수 없습니다.'
        });
      }
      
      console.log('✅ 솔루션 인스턴스 수정 완료:', result.rows[0].name);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: '솔루션 인스턴스가 성공적으로 수정되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 솔루션 인스턴스 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '솔루션 인스턴스 수정 실패',
      error: error.message
    });
  }
});

// [advice from AI] 솔루션 인스턴스 삭제 API
router.delete('/instances/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 솔루션 인스턴스 삭제:', id);
    
    const userId = req.user?.id || 'system';
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        UPDATE solution_instances 
        SET 
          is_active = false,
          updated_by = $2,
          updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING name
      `, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '솔루션 인스턴스를 찾을 수 없습니다.'
        });
      }
      
      console.log('✅ 솔루션 인스턴스 삭제 완료:', result.rows[0].name);
      
      res.json({
        success: true,
        message: '솔루션 인스턴스가 성공적으로 삭제되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 솔루션 인스턴스 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '솔루션 인스턴스 삭제 실패',
      error: error.message
    });
  }
});

// [advice from AI] 솔루션 인스턴스 상태 업데이트 API
router.patch('/instances/:id/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log('🔄 솔루션 인스턴스 상태 업데이트:', id, status);
    
    const userId = req.user?.id || 'system';
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        UPDATE solution_instances 
        SET 
          status = $2,
          metrics = jsonb_set(
            COALESCE(metrics, '{}'), 
            '{lastCheck}', 
            to_jsonb(NOW()::text)
          ),
          updated_by = $3,
          updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING name, status
      `, [id, status, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '솔루션 인스턴스를 찾을 수 없습니다.'
        });
      }
      
      console.log('✅ 상태 업데이트 완료:', result.rows[0].name, '→', result.rows[0].status);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: '상태가 성공적으로 업데이트되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 상태 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '상태 업데이트 실패',
      error: error.message
    });
  }
});

module.exports = router;
