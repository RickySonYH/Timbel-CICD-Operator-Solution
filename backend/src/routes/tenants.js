// [advice from AI] 멀티 테넌시 관리 API
// 테넌트 생성, 수정, 삭제, 사용자 관리

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const tenantIsolation = require('../middleware/tenantIsolation');

// Auth DB 연결
const authPool = new Pool({
  host: process.env.AUTH_DB_HOST || 'postgres',
  port: process.env.AUTH_DB_PORT || 5432,
  database: process.env.AUTH_DB_NAME || 'timbel_auth',
  user: process.env.AUTH_DB_USER || 'timbel_user',
  password: process.env.AUTH_DB_PASSWORD || 'timbel_password',
  max: 20,
});

/**
 * GET /api/tenants
 * 테넌트 목록 조회 (슈퍼 관리자용)
 */
router.get('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const result = await authPool.query(
      `SELECT * FROM tenants ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ 테넌트 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/tenants
 * 테넌트 생성
 */
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const {
      name,
      display_name,
      description,
      plan = 'basic',
      max_users = 10,
      max_projects = 5,
      max_deployments_per_day = 50,
      max_storage_gb = 10
    } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'name과 display_name은 필수입니다'
      });
    }

    const result = await authPool.query(
      `INSERT INTO tenants (name, display_name, description, plan, max_users, max_projects, max_deployments_per_day, max_storage_gb)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, display_name, description, plan, max_users, max_projects, max_deployments_per_day, max_storage_gb]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '테넌트가 생성되었습니다'
    });
  } catch (error) {
    console.error('❌ 테넌트 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/tenants/:id
 * 특정 테넌트 조회
 */
router.get('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await authPool.query(
      `SELECT * FROM tenants WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '테넌트를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 테넌트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * PUT /api/tenants/:id
 * 테넌트 수정
 */
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['display_name', 'description', 'status', 'plan', 'max_users', 'max_projects', 'max_deployments_per_day', 'max_storage_gb'];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '수정할 필드가 없습니다'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE tenants SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await authPool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '테넌트를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '테넌트가 수정되었습니다'
    });
  } catch (error) {
    console.error('❌ 테넌트 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/tenants/:id
 * 테넌트 삭제
 */
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await authPool.query(
      `DELETE FROM tenants WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '테넌트를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '테넌트가 삭제되었습니다'
    });
  } catch (error) {
    console.error('❌ 테넌트 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/tenants/:id/users
 * 테넌트 사용자 목록 조회
 */
router.get('/:id/users', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await authPool.query(
      `SELECT tu.*, u.username, u.email 
       FROM tenant_users tu
       LEFT JOIN timbel_users u ON tu.user_id = u.id
       WHERE tu.tenant_id = $1
       ORDER BY tu.joined_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ 테넌트 사용자 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/tenants/:id/users
 * 테넌트에 사용자 추가
 */
router.post('/:id/users', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'member' } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'user_id는 필수입니다'
      });
    }

    const result = await authPool.query(
      `INSERT INTO tenant_users (tenant_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [id, user_id, role]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '사용자가 테넌트에 추가되었습니다'
    });
  } catch (error) {
    console.error('❌ 사용자 추가 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/tenants/:id/users/:userId
 * 테넌트에서 사용자 제거
 */
router.delete('/:id/users/:userId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const result = await authPool.query(
      `DELETE FROM tenant_users WHERE tenant_id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '사용자를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '사용자가 테넌트에서 제거되었습니다'
    });
  } catch (error) {
    console.error('❌ 사용자 제거 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

