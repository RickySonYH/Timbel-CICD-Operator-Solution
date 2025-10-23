// [advice from AI] 솔루션 관리 API 라우트
const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const { Pool } = require('pg');

// [advice from AI] 데이터베이스 연결 설정
const db = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 솔루션 타입 목록 조회 (테스트용 - 토큰 검증 우회)
router.get('/types-test', async (req, res) => {
  try {
    const query = `
      SELECT id, name, display_name, description, icon, color, created_at, updated_at
      FROM solution_types
      ORDER BY name
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      types: result.rows
    });
  } catch (error) {
    console.error('솔루션 타입 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 타입 조회에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 목록 조회 (테스트용 - 토큰 검증 우회)
router.get('/test', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.name,
        s.display_name,
        s.description,
        s.type_id,
        st.name as type_name,
        st.display_name as type_display_name,
        st.icon,
        st.color,
        s.config,
        s.status,
        s.last_health_check,
        s.health_status,
        s.metrics,
        s.version,
        s.is_enabled,
        s.is_visible,
        s.sort_order,
        s.project_id,
        s.created_by,
        u.username as created_by_username,
        s.created_at,
        s.updated_at
      FROM solutions s
      JOIN solution_types st ON s.type_id = st.id
      LEFT JOIN timbel_users u ON s.created_by = u.id
      ORDER BY s.sort_order ASC, s.display_name ASC
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      solutions: result.rows
    });
  } catch (error) {
    console.error('솔루션 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 목록 조회에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 타입 목록 조회
router.get('/types', jwtAuth.verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT id, name, display_name, description, icon, color, created_at, updated_at
      FROM solution_types
      ORDER BY name
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      types: result.rows
    });
  } catch (error) {
    console.error('솔루션 타입 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 타입 조회에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 목록 조회
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { type, status, enabled } = req.query;
    
    let query = `
      SELECT 
        s.id,
        s.name,
        s.display_name,
        s.description,
        s.type_id,
        st.name as type_name,
        st.display_name as type_display_name,
        st.icon,
        st.color,
        s.config,
        s.status,
        s.last_health_check,
        s.health_status,
        s.metrics,
        s.version,
        s.is_enabled,
        s.is_visible,
        s.sort_order,
        s.project_id,
        s.created_by,
        u.username as created_by_username,
        s.created_at,
        s.updated_at
      FROM solutions s
      JOIN solution_types st ON s.type_id = st.id
      LEFT JOIN timbel_users u ON s.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (type) {
      paramCount++;
      query += ` AND st.name = $${paramCount}`;
      params.push(type);
    }
    
    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
    }
    
    if (enabled !== undefined) {
      paramCount++;
      query += ` AND s.is_enabled = $${paramCount}`;
      params.push(enabled === 'true');
    }
    
    query += ` ORDER BY s.sort_order ASC, s.display_name ASC`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      solutions: result.rows
    });
  } catch (error) {
    console.error('솔루션 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 목록 조회에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 상세 조회
router.get('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        s.*,
        st.name as type_name,
        st.display_name as type_display_name,
        st.icon,
        st.color,
        u.username as created_by_username
      FROM solutions s
      JOIN solution_types st ON s.type_id = st.id
      LEFT JOIN timbel_users u ON s.created_by = u.id
      WHERE s.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '솔루션을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      solution: result.rows[0]
    });
  } catch (error) {
    console.error('솔루션 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 상세 조회에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 생성
router.post('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      name,
      display_name,
      description,
      type_id,
      config = {},
      project_id,
      version = '1.0.0',
      is_enabled = true,
      is_visible = true,
      sort_order = 0
    } = req.body;
    
    // 필수 필드 검증
    if (!name || !display_name || !type_id) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다. (name, display_name, type_id)'
      });
    }
    
    // 솔루션 타입 존재 확인
    const typeCheck = await db.query('SELECT id FROM solution_types WHERE id = $1', [type_id]);
    if (typeCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '존재하지 않는 솔루션 타입입니다.'
      });
    }
    
    // 중복 이름 확인
    const nameCheck = await db.query('SELECT id FROM solutions WHERE name = $1', [name]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 솔루션 이름입니다.'
      });
    }
    
    const query = `
      INSERT INTO solutions (
        name, display_name, description, type_id, config, project_id,
        version, is_enabled, is_visible, sort_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      name,
      display_name,
      description,
      type_id,
      JSON.stringify(config),
      project_id,
      version,
      is_enabled,
      is_visible,
      sort_order,
      req.user.id
    ]);
    
    res.status(201).json({
      success: true,
      solution: result.rows[0]
    });
  } catch (error) {
    console.error('솔루션 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 생성에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 수정
router.put('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      display_name,
      description,
      config,
      project_id,
      version,
      is_enabled,
      is_visible,
      sort_order
    } = req.body;
    
    // 솔루션 존재 확인
    const solutionCheck = await db.query('SELECT id FROM solutions WHERE id = $1', [id]);
    if (solutionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '솔루션을 찾을 수 없습니다.'
      });
    }
    
    const updateFields = [];
    const params = [];
    let paramCount = 0;
    
    if (display_name !== undefined) {
      paramCount++;
      updateFields.push(`display_name = $${paramCount}`);
      params.push(display_name);
    }
    
    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      params.push(description);
    }
    
    if (config !== undefined) {
      paramCount++;
      updateFields.push(`config = $${paramCount}`);
      params.push(JSON.stringify(config));
    }
    
    if (project_id !== undefined) {
      paramCount++;
      updateFields.push(`project_id = $${paramCount}`);
      params.push(project_id);
    }
    
    if (version !== undefined) {
      paramCount++;
      updateFields.push(`version = $${paramCount}`);
      params.push(version);
    }
    
    if (is_enabled !== undefined) {
      paramCount++;
      updateFields.push(`is_enabled = $${paramCount}`);
      params.push(is_enabled);
    }
    
    if (is_visible !== undefined) {
      paramCount++;
      updateFields.push(`is_visible = $${paramCount}`);
      params.push(is_visible);
    }
    
    if (sort_order !== undefined) {
      paramCount++;
      updateFields.push(`sort_order = $${paramCount}`);
      params.push(sort_order);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '수정할 필드가 없습니다.'
      });
    }
    
    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(id);
    
    const query = `
      UPDATE solutions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      solution: result.rows[0]
    });
  } catch (error) {
    console.error('솔루션 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 수정에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 삭제
router.delete('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 솔루션 존재 확인
    const solutionCheck = await db.query('SELECT id FROM solutions WHERE id = $1', [id]);
    if (solutionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '솔루션을 찾을 수 없습니다.'
      });
    }
    
    const query = 'DELETE FROM solutions WHERE id = $1';
    await db.query(query, [id]);
    
    res.json({
      success: true,
      message: '솔루션이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('솔루션 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 삭제에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 상태 업데이트
router.patch('/:id/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, health_status, metrics } = req.body;
    
    // 솔루션 존재 확인
    const solutionCheck = await db.query('SELECT id FROM solutions WHERE id = $1', [id]);
    if (solutionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '솔루션을 찾을 수 없습니다.'
      });
    }
    
    const updateFields = [];
    const params = [];
    let paramCount = 0;
    
    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      params.push(status);
    }
    
    if (health_status !== undefined) {
      paramCount++;
      updateFields.push(`health_status = $${paramCount}`);
      params.push(health_status);
    }
    
    if (metrics !== undefined) {
      paramCount++;
      updateFields.push(`metrics = $${paramCount}`);
      params.push(JSON.stringify(metrics));
    }
    
    paramCount++;
    updateFields.push(`last_health_check = NOW()`);
    
    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(id);
    
    const query = `
      UPDATE solutions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      solution: result.rows[0]
    });
  } catch (error) {
    console.error('솔루션 상태 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 상태 업데이트에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 메트릭 히스토리 조회
router.get('/:id/metrics-history', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const query = `
      SELECT metrics, recorded_at
      FROM solution_metrics_history
      WHERE solution_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [id, limit, offset]);
    
    res.json({
      success: true,
      metrics_history: result.rows
    });
  } catch (error) {
    console.error('솔루션 메트릭 히스토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 메트릭 히스토리 조회에 실패했습니다.'
    });
  }
});

// [advice from AI] 솔루션 상태 로그 조회
router.get('/:id/status-logs', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT 
        ssl.old_status,
        ssl.new_status,
        ssl.reason,
        ssl.changed_at,
        u.username as changed_by_username
      FROM solution_status_logs ssl
      LEFT JOIN timbel_users u ON ssl.changed_by = u.id
      WHERE ssl.solution_id = $1
      ORDER BY ssl.changed_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [id, limit, offset]);
    
    res.json({
      success: true,
      status_logs: result.rows
    });
  } catch (error) {
    console.error('솔루션 상태 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '솔루션 상태 로그 조회에 실패했습니다.'
    });
  }
});

module.exports = router;
