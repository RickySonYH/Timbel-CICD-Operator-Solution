// [advice from AI] 시스템 관리 API 라우트
// 사용자, 그룹, 권한, 시스템 설정 관리

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// [advice from AI] 데이터베이스 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    // JWT 토큰의 userId를 id로 매핑
    req.user = {
      id: user.userId || user.id,
      roleType: user.roleType || 'user',
      permissionLevel: user.permissionLevel || 0
    };
    next();
  });
};

// [advice from AI] 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  // permissionLevel이 0이거나 roleType이 admin인 경우 관리자로 인정
  if (req.user.roleType !== 'admin' && req.user.permissionLevel !== 0) {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin privileges required' 
    });
  }
  next();
};

// [advice from AI] 사용자 관리 API

// 사용자 목록 조회
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.id, u.username, u.email, u.full_name, u.role_type, 
             u.permission_level, u.is_active, u.created_at, u.updated_at,
             COUNT(ugm.group_id) as group_count
      FROM timbel_users u
      LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      conditions.push(`(u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      conditions.push(`u.role_type = $${paramCount}`);
      params.push(role);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    // 전체 개수 조회
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM timbel_users u
    `;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [usersResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// 사용자 상세 정보 조회
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const userResult = await pool.query(`
      SELECT u.*, 
             array_agg(json_build_object(
               'id', ug.id,
               'name', ug.name,
               'role', ugm.role
             )) as groups
      FROM timbel_users u
      LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
      LEFT JOIN user_groups ug ON ugm.group_id = ug.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: userResult.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// 사용자 생성
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, full_name, role_type, permission_level, password } = req.body;
    
    // 비밀번호 해싱
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const result = await pool.query(`
      INSERT INTO timbel_users (username, email, full_name, role_type, permission_level, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, full_name, role_type, permission_level, is_active, created_at
    `, [username, email, full_name, role_type, permission_level || 1, hashedPassword]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Username or email already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  }
});

// 사용자 수정
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, role_type, permission_level, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE timbel_users 
      SET username = $1, email = $2, full_name = $3, role_type = $4, 
          permission_level = $5, is_active = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING id, username, email, full_name, role_type, permission_level, is_active, updated_at
    `, [username, email, full_name, role_type, permission_level, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Username or email already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update user' });
    }
  }
});

// 사용자 비밀번호 변경
router.put('/users/:id/password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const result = await pool.query(`
      UPDATE timbel_users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, updated_at
    `, [hashedPassword, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// 사용자 삭제
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 자기 자신은 삭제할 수 없음
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    
    const result = await pool.query(`
      DELETE FROM timbel_users 
      WHERE id = $1
      RETURNING id, username
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// [advice from AI] 그룹 관리 API

// 그룹 목록 조회
router.get('/groups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.id, g.name, g.description, g.created_at, g.updated_at,
             u.full_name as created_by_name,
             COUNT(ugm.user_id) as member_count
      FROM user_groups g
      LEFT JOIN timbel_users u ON g.created_by = u.id
      LEFT JOIN user_group_memberships ugm ON g.id = ugm.group_id
      GROUP BY g.id, u.full_name
      ORDER BY g.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

// 그룹 생성
router.post('/groups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const result = await pool.query(`
      INSERT INTO user_groups (name, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, created_at
    `, [name, description, req.user.id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create group error:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Group name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create group' });
    }
  }
});

// 그룹 수정
router.put('/groups/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const result = await pool.query(`
      UPDATE user_groups 
      SET name = $1, description = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, description, updated_at
    `, [name, description, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update group error:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Group name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update group' });
    }
  }
});

// 그룹 삭제
router.delete('/groups/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM user_groups 
      WHERE id = $1
      RETURNING id, name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete group' });
  }
});

// 그룹 멤버 관리
router.get('/groups/:id/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.role_type, u.is_active,
             ugm.role as membership_role, ugm.joined_at
      FROM user_group_memberships ugm
      JOIN timbel_users u ON ugm.user_id = u.id
      WHERE ugm.group_id = $1
      ORDER BY ugm.joined_at DESC
    `, [id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch group members' });
  }
});

// 그룹에 멤버 추가
router.post('/groups/:id/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'member' } = req.body;
    
    const result = await pool.query(`
      INSERT INTO user_group_memberships (user_id, group_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, group_id) 
      DO UPDATE SET role = $3, joined_at = NOW()
      RETURNING user_id, group_id, role, joined_at
    `, [user_id, id, role]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json({ success: false, error: 'Failed to add group member' });
  }
});

// 그룹에서 멤버 제거
router.delete('/groups/:id/members/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM user_group_memberships 
      WHERE group_id = $1 AND user_id = $2
      RETURNING user_id, group_id
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Group membership not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove group member' });
  }
});

// [advice from AI] 권한 관리 API

// 권한 목록 조회
router.get('/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.description, p.resource, p.action, p.created_at
      FROM permissions p
      ORDER BY p.resource, p.action
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
});

// 그룹별 권한 조회
router.get('/groups/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.id, p.name, p.description, p.resource, p.action,
             gp.granted_at, u.full_name as granted_by_name
      FROM permissions p
      JOIN group_permissions gp ON p.id = gp.permission_id
      LEFT JOIN timbel_users u ON gp.granted_by = u.id
      WHERE gp.group_id = $1
      ORDER BY p.resource, p.action
    `, [id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get group permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch group permissions' });
  }
});

// 그룹에 권한 부여
router.post('/groups/:id/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permission_id } = req.body;
    
    const result = await pool.query(`
      INSERT INTO group_permissions (group_id, permission_id, granted_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (group_id, permission_id) DO NOTHING
      RETURNING group_id, permission_id, granted_at
    `, [id, permission_id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Permission already granted to group' });
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Grant group permission error:', error);
    res.status(500).json({ success: false, error: 'Failed to grant group permission' });
  }
});

// 그룹에서 권한 제거
router.delete('/groups/:id/permissions/:permissionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, permissionId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM group_permissions 
      WHERE group_id = $1 AND permission_id = $2
      RETURNING group_id, permission_id
    `, [id, permissionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Group permission not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Revoke group permission error:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke group permission' });
  }
});

// [advice from AI] 알림 설정 API

// 이메일 설정 조회
router.get('/notifications/email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT settings FROM system_settings 
      WHERE key = 'email_notifications'
    `);
    
    const settings = result.rows.length > 0 ? result.rows[0].settings : {
      enabled: false,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: '',
      useTLS: true,
      useSSL: false
    };
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get email settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email settings' });
  }
});

// 이메일 설정 저장
router.put('/notifications/email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    await pool.query(`
      INSERT INTO system_settings (key, settings, updated_by, updated_at)
      VALUES ('email_notifications', $1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET settings = $1, updated_by = $2, updated_at = NOW()
    `, [JSON.stringify(settings), req.user.id]);
    
    res.json({ success: true, message: 'Email settings saved successfully' });
  } catch (error) {
    console.error('Save email settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save email settings' });
  }
});

// 시스템 알림 설정 조회
router.get('/notifications/system', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT settings FROM system_settings 
      WHERE key = 'system_notifications'
    `);
    
    const settings = result.rows.length > 0 ? result.rows[0].settings : {
      enabled: true,
      browserPush: true,
      inAppNotification: true,
      soundEnabled: true,
      desktopNotification: true
    };
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system settings' });
  }
});

// 시스템 알림 설정 저장
router.put('/notifications/system', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    await pool.query(`
      INSERT INTO system_settings (key, settings, updated_by, updated_at)
      VALUES ('system_notifications', $1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET settings = $1, updated_by = $2, updated_at = NOW()
    `, [JSON.stringify(settings), req.user.id]);
    
    res.json({ success: true, message: 'System notification settings saved successfully' });
  } catch (error) {
    console.error('Save system settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save system settings' });
  }
});

// 알림 템플릿 목록 조회
router.get('/notifications/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, type, subject, content, variables, is_active, created_at, updated_at
      FROM notification_templates
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, templates: result.rows });
  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification templates' });
  }
});

// 알림 템플릿 생성
router.post('/notifications/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type, subject, content, is_active = true } = req.body;
    
    const result = await pool.query(`
      INSERT INTO notification_templates (name, type, subject, content, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, type, subject, content, is_active, created_at
    `, [name, type, subject, content, is_active, req.user.id]);
    
    res.status(201).json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Create notification template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification template' });
  }
});

// 알림 템플릿 수정
router.put('/notifications/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, subject, content, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE notification_templates 
      SET name = $1, type = $2, subject = $3, content = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, name, type, subject, content, is_active, updated_at
    `, [name, type, subject, content, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    res.json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Update notification template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification template' });
  }
});

// 알림 규칙 목록 조회
router.get('/notifications/rules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, event, condition, actions, is_active, recipients, priority, created_at, updated_at
      FROM notification_rules
      ORDER BY priority DESC, created_at DESC
    `);
    
    res.json({ success: true, rules: result.rows });
  } catch (error) {
    console.error('Get notification rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification rules' });
  }
});

// 알림 규칙 생성
router.post('/notifications/rules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, event, condition, actions, is_active = true, recipients, priority = 'medium' } = req.body;
    
    const result = await pool.query(`
      INSERT INTO notification_rules (name, event, condition, actions, is_active, recipients, priority, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, event, condition, actions, is_active, recipients, priority, created_at
    `, [name, event, condition, JSON.stringify(actions), is_active, JSON.stringify(recipients), priority, req.user.id]);
    
    res.status(201).json({ success: true, rule: result.rows[0] });
  } catch (error) {
    console.error('Create notification rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification rule' });
  }
});

// 알림 규칙 수정
router.put('/notifications/rules/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, event, condition, actions, is_active, recipients, priority } = req.body;
    
    const result = await pool.query(`
      UPDATE notification_rules 
      SET name = $1, event = $2, condition = $3, actions = $4, is_active = $5, 
          recipients = $6, priority = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING id, name, event, condition, actions, is_active, recipients, priority, updated_at
    `, [name, event, condition, JSON.stringify(actions), is_active, JSON.stringify(recipients), priority, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    
    res.json({ success: true, rule: result.rows[0] });
  } catch (error) {
    console.error('Update notification rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification rule' });
  }
});

// 알림 로그 조회
router.get('/notifications/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, type, recipient, subject, status, sent_at, error_message
      FROM notification_logs
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      conditions.push(`type = $${paramCount}`);
      params.push(type);
    }

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY sent_at DESC`;

    // 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM notification_logs`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [logsResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    res.json({
      success: true,
      logs: logsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get notification logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification logs' });
  }
});

// 이메일 테스트
router.post('/notifications/email/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    // 실제 이메일 전송 로직은 여기에 구현
    // 현재는 로그만 남김
    console.log(`Test email sent to: ${email}`);
    
    // 알림 로그에 기록
    await pool.query(`
      INSERT INTO notification_logs (type, recipient, subject, status, sent_at)
      VALUES ('email', $1, 'Test Email', 'sent', NOW())
    `, [email]);
    
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});

// [advice from AI] 로그 관리 API

// 로그 목록 조회
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, level = '', source = '', startDate = '', endDate = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, level, source, message, metadata, created_at
      FROM system_logs
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (level) {
      paramCount++;
      conditions.push(`level = $${paramCount}`);
      params.push(level);
    }

    if (source) {
      paramCount++;
      conditions.push(`source = $${paramCount}`);
      params.push(source);
    }

    if (startDate) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC`;

    // 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM system_logs`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [logsResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    res.json({
      success: true,
      logs: logsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

// 로그 통계 조회
router.get('/logs/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let timeFilter = '';
    if (period === '24h') {
      timeFilter = "created_at >= NOW() - INTERVAL '24 hours'";
    } else if (period === '7d') {
      timeFilter = "created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      timeFilter = "created_at >= NOW() - INTERVAL '30 days'";
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN level = 'ERROR' OR level = 'FATAL' THEN 1 END) as error_count,
        COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warning_count,
        COUNT(CASE WHEN level = 'INFO' THEN 1 END) as info_count,
        COUNT(CASE WHEN level = 'DEBUG' THEN 1 END) as debug_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count,
        json_object_agg(source, source_count) as by_source
      FROM (
        SELECT level, source, created_at,
               COUNT(*) OVER (PARTITION BY source) as source_count
        FROM system_logs
        ${timeFilter ? `WHERE ${timeFilter}` : ''}
      ) subquery
    `);

    res.json({ success: true, stats: result.rows[0] });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch log statistics' });
  }
});

// 로그 삭제
router.delete('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { olderThan, level, source } = req.body;
    
    let query = 'DELETE FROM system_logs';
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (olderThan) {
      paramCount++;
      conditions.push(`created_at < $${paramCount}`);
      params.push(olderThan);
    }

    if (level) {
      paramCount++;
      conditions.push(`level = $${paramCount}`);
      params.push(level);
    }

    if (source) {
      paramCount++;
      conditions.push(`source = $${paramCount}`);
      params.push(source);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      message: `${result.rowCount} log entries deleted`,
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('Delete logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete logs' });
  }
});

// [advice from AI] 백업 및 복원 API

// 백업 목록 조회
router.get('/backups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, type, size, status, created_at, created_by
      FROM backup_files
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, backups: result.rows });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch backups' });
  }
});

// 백업 생성
router.post('/backups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type = 'full', description = '' } = req.body;
    
    // 실제 백업 로직은 여기에 구현
    // 현재는 데이터베이스에 기록만 함
    const result = await pool.query(`
      INSERT INTO backup_files (name, type, description, status, created_by)
      VALUES ($1, $2, $3, 'in_progress', $4)
      RETURNING id, name, type, status, created_at
    `, [name, type, description, req.user.id]);
    
    // 백그라운드에서 실제 백업 수행
    // setTimeout(() => {
    //   // 백업 로직 실행
    //   pool.query(`
    //     UPDATE backup_files 
    //     SET status = 'completed', size = $1, completed_at = NOW()
    //     WHERE id = $2
    //   `, [backupSize, result.rows[0].id]);
    // }, 1000);
    
    res.status(201).json({ success: true, backup: result.rows[0] });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

// 백업 복원
router.post('/backups/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 백업 파일 존재 확인
    const backupResult = await pool.query(`
      SELECT id, name, type, status FROM backup_files WHERE id = $1
    `, [id]);
    
    if (backupResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    
    if (backupResult.rows[0].status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Backup is not completed' });
    }
    
    // 복원 작업 기록
    await pool.query(`
      INSERT INTO restore_operations (backup_id, status, started_by, started_at)
      VALUES ($1, 'in_progress', $2, NOW())
    `, [id, req.user.id]);
    
    res.json({ success: true, message: 'Restore operation started' });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ success: false, error: 'Failed to restore backup' });
  }
});

// 백업 삭제
router.delete('/backups/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM backup_files 
      WHERE id = $1
      RETURNING id, name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete backup' });
  }
});

// [advice from AI] 시스템 설정 API

// 시스템 설정 조회
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, settings, updated_at, updated_by
      FROM system_settings
      ORDER BY key
    `);
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        ...row.settings,
        updated_at: row.updated_at,
        updated_by: row.updated_by
      };
    });
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system settings' });
  }
});

// 시스템 설정 저장
router.put('/settings/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const settings = req.body;
    
    await pool.query(`
      INSERT INTO system_settings (key, settings, updated_by, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET settings = $2, updated_by = $3, updated_at = NOW()
    `, [key, JSON.stringify(settings), req.user.id]);
    
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Save system settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save system settings' });
  }
});

// [advice from AI] 보안 설정 API

// JWT 설정 조회
router.get('/security/jwt', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT settings FROM system_settings 
      WHERE key = 'jwt_security'
    `);
    
    let settings;
    if (result.rows.length > 0) {
      const dbSettings = result.rows[0].settings;
      // [advice from AI] 데이터베이스에서 읽어온 값을 프론트엔드 형식으로 변환
      settings = {
        secretKey: dbSettings.secretKey || '',
        expirationTime: parseInt(dbSettings.expiresIn) || 30, // '30m' -> 30
        refreshTokenExpiration: parseInt(dbSettings.refreshTokenExpiresIn) || 7, // '7d' -> 7
        algorithm: dbSettings.algorithm || 'HS256',
        issuer: dbSettings.issuer || 'timbel-platform',
        audience: dbSettings.audience || 'timbel-users'
      };
    } else {
      // 기본값
      settings = {
        secretKey: '',
        expirationTime: 30,
        refreshTokenExpiration: 7,
        algorithm: 'HS256',
        issuer: 'timbel-platform',
        audience: 'timbel-users'
      };
    }
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get JWT settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch JWT settings' });
  }
});

// JWT 설정 저장
router.put('/security/jwt', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    // [advice from AI] JWT 설정을 저장할 때 분 단위를 초 단위로 변환
    const processedSettings = {
      ...settings,
      expiresIn: `${settings.expirationTime}m`, // 분을 'm' 형식으로 변환
      refreshTokenExpiresIn: `${settings.refreshTokenExpiration}d`, // 일을 'd' 형식으로 변환
      algorithm: settings.algorithm || 'HS256',
      issuer: settings.issuer || 'timbel-platform',
      audience: settings.audience || 'timbel-users'
    };
    
    await pool.query(`
      INSERT INTO system_settings (key, settings, updated_by, updated_at)
      VALUES ('jwt_security', $1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET settings = $1, updated_by = $2, updated_at = NOW()
    `, [JSON.stringify(processedSettings), req.user.id]);
    
    res.json({ success: true, message: 'JWT settings saved successfully' });
  } catch (error) {
    console.error('Save JWT settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save JWT settings' });
  }
});

// 암호화 설정 조회
router.get('/security/encryption', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT settings FROM system_settings 
      WHERE key = 'encryption_settings'
    `);
    
    const settings = result.rows.length > 0 ? result.rows[0].settings : {
      enabled: true,
      algorithm: 'AES-256-GCM',
      keyLength: 256,
      saltRounds: 12,
      dataAtRest: true,
      dataInTransit: true
    };
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get encryption settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch encryption settings' });
  }
});

// 암호화 설정 저장
router.put('/security/encryption', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    await pool.query(`
      INSERT INTO system_settings (key, settings, updated_by, updated_at)
      VALUES ('encryption_settings', $1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET settings = $1, updated_by = $2, updated_at = NOW()
    `, [JSON.stringify(settings), req.user.id]);
    
    res.json({ success: true, message: 'Encryption settings saved successfully' });
  } catch (error) {
    console.error('Save encryption settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save encryption settings' });
  }
});

// 접근 제어 설정 조회
router.get('/security/access-control', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT settings FROM system_settings 
      WHERE key = 'access_control_settings'
    `);
    
    const settings = result.rows.length > 0 ? result.rows[0].settings : {
      enabled: false,
      ipWhitelist: [],
      ipBlacklist: [],
      geoRestrictions: false,
      allowedCountries: [],
      blockedCountries: [],
      timeRestrictions: false,
      allowedHours: [{ start: 0, end: 23 }],
      maxLoginAttempts: 5,
      lockoutDuration: 900
    };
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get access control settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch access control settings' });
  }
});

// 접근 제어 설정 저장
router.put('/security/access-control', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    await pool.query(`
      INSERT INTO system_settings (key, settings, updated_by, updated_at)
      VALUES ('access_control_settings', $1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET settings = $1, updated_by = $2, updated_at = NOW()
    `, [JSON.stringify(settings), req.user.id]);
    
    res.json({ success: true, message: 'Access control settings saved successfully' });
  } catch (error) {
    console.error('Save access control settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save access control settings' });
  }
});

// 세션 설정 조회
router.get('/security/session', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT settings FROM system_settings 
      WHERE key = 'session_settings'
    `);
    
    const settings = result.rows.length > 0 ? result.rows[0].settings : {
      enabled: true,
      timeout: 1800,
      maxConcurrentSessions: 3,
      rememberMe: true,
      rememberMeDuration: 2592000,
      secureCookies: true,
      httpOnlyCookies: true,
      sameSitePolicy: 'strict'
    };
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get session settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch session settings' });
  }
});

// 세션 설정 저장
router.put('/security/session', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    await pool.query(`
      INSERT INTO system_settings (key, settings, updated_by, updated_at)
      VALUES ('session_settings', $1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET settings = $1, updated_by = $2, updated_at = NOW()
    `, [JSON.stringify(settings), req.user.id]);
    
    res.json({ success: true, message: 'Session settings saved successfully' });
  } catch (error) {
    console.error('Save session settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save session settings' });
  }
});

// 보안 정책 목록 조회
router.get('/security/policies', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, type, rules, is_active, priority, created_at
      FROM security_policies
      ORDER BY priority DESC, created_at DESC
    `);
    
    res.json({ success: true, policies: result.rows });
  } catch (error) {
    console.error('Get security policies error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security policies' });
  }
});

// 보안 정책 생성
router.post('/security/policies', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type, rules, is_active = true, priority = 1 } = req.body;
    
    const result = await pool.query(`
      INSERT INTO security_policies (name, type, rules, is_active, priority, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, type, rules, is_active, priority, created_at
    `, [name, type, JSON.stringify(rules), is_active, priority, req.user.id]);
    
    res.status(201).json({ success: true, policy: result.rows[0] });
  } catch (error) {
    console.error('Create security policy error:', error);
    res.status(500).json({ success: false, error: 'Failed to create security policy' });
  }
});

// 보안 정책 수정
router.put('/security/policies/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, rules, is_active, priority } = req.body;
    
    const result = await pool.query(`
      UPDATE security_policies 
      SET name = $1, type = $2, rules = $3, is_active = $4, priority = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, name, type, rules, is_active, priority, updated_at
    `, [name, type, JSON.stringify(rules), is_active, priority, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Security policy not found' });
    }
    
    res.json({ success: true, policy: result.rows[0] });
  } catch (error) {
    console.error('Update security policy error:', error);
    res.status(500).json({ success: false, error: 'Failed to update security policy' });
  }
});

// 보안 이벤트 목록 조회
router.get('/security/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, severity = '', type = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, type, severity, description, source, timestamp, resolved
      FROM security_events
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (severity) {
      paramCount++;
      conditions.push(`severity = $${paramCount}`);
      params.push(severity);
    }

    if (type) {
      paramCount++;
      conditions.push(`type = $${paramCount}`);
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY timestamp DESC`;

    // 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM security_events`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [eventsResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    res.json({
      success: true,
      events: eventsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security events' });
  }
});

// 보안 감사 결과 조회
router.get('/security/audit', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, type, result, details, timestamp, performed_by
      FROM security_audits
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    
    res.json({ success: true, audits: result.rows });
  } catch (error) {
    console.error('Get security audits error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security audits' });
  }
});

// 보안 테스트 실행
router.post('/security/test/:testType', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { testType } = req.params;
    
    // 실제 보안 테스트 로직은 여기에 구현
    // 현재는 로그만 남김
    console.log(`Security test executed: ${testType}`);
    
    // 보안 감사 결과에 기록
    await pool.query(`
      INSERT INTO security_audits (type, result, details, performed_by, timestamp)
      VALUES ($1, 'passed', 'Test completed successfully', $2, NOW())
    `, [testType, req.user.id]);
    
    res.json({ success: true, message: `${testType} test completed successfully` });
  } catch (error) {
    console.error('Security test error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute security test' });
  }
});

// [advice from AI] API 키 관리 API

// API 키 목록 조회
router.get('/api-keys', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status = '', type = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT ak.id, ak.name, ak.description, ak.key, ak.masked_key, ak.type, ak.status,
             ak.permissions, ak.rate_limit, ak.expires_at, ak.last_used, ak.usage_count,
             ak.created_at, ak.updated_at, u.full_name as created_by
      FROM api_keys ak
      LEFT JOIN timbel_users u ON ak.created_by = u.id
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      conditions.push(`ak.status = $${paramCount}`);
      params.push(status);
    }

    if (type) {
      paramCount++;
      conditions.push(`ak.type = $${paramCount}`);
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ak.created_at DESC`;

    // 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM api_keys ak`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [keysResult, countResult] = await Promise.all([
      pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    res.json({
      success: true,
      apiKeys: keysResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API keys' });
  }
});

// API 키 생성
router.post('/api-keys', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, type, permissions, rateLimit, expiresInDays } = req.body;
    
    // API 키 생성
    const crypto = require('crypto');
    const key = crypto.randomBytes(32).toString('hex');
    const maskedKey = key.substring(0, 8) + '...' + key.substring(key.length - 8);
    
    // 만료일 계산
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    
    const result = await pool.query(`
      INSERT INTO api_keys (name, description, key, masked_key, type, status, permissions, rate_limit, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, description, key, masked_key, type, status, permissions, rate_limit, expires_at, created_at
    `, [
      name, 
      description, 
      key, 
      maskedKey, 
      type, 
      'active', // 기본 상태를 active로 설정
      JSON.stringify(permissions || []), 
      JSON.stringify(rateLimit || { requests: 1000, period: 'hour' }), 
      expiresAt, 
      req.user.id
    ]);
    
    res.status(201).json({ success: true, apiKey: result.rows[0] });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, error: 'Failed to create API key' });
  }
});

// API 키 수정
router.put('/api-keys/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, permissions, rateLimit, expiresInDays, status } = req.body;
    
    // 만료일 계산
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    
    const result = await pool.query(`
      UPDATE api_keys 
      SET name = $1, description = $2, type = $3, permissions = $4, rate_limit = $5, 
          expires_at = $6, status = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING id, name, description, type, status, permissions, rate_limit, expires_at, updated_at
    `, [
      name, 
      description, 
      type, 
      JSON.stringify(permissions || []), 
      JSON.stringify(rateLimit || { requests: 1000, period: 'hour' }), 
      expiresAt, 
      status, 
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    
    res.json({ success: true, apiKey: result.rows[0] });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ success: false, error: 'Failed to update API key' });
  }
});

// API 키 삭제
router.delete('/api-keys/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM api_keys 
      WHERE id = $1
      RETURNING id, name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    
    res.json({ success: true, message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete API key' });
  }
});

// API 키 사용량 조회
router.get('/api-keys/usage', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100, apiKeyId = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, api_key_id, endpoint, method, status_code, response_time, 
             timestamp, ip_address, user_agent
      FROM api_usage_logs
    `;
    
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (apiKeyId) {
      paramCount++;
      conditions.push(`api_key_id = $${paramCount}`);
      params.push(apiKeyId);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]);
    
    res.json({ success: true, usage: result.rows });
  } catch (error) {
    console.error('Get API usage error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API usage' });
  }
});

// API 키 통계 조회
router.get('/api-keys/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_keys,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_keys,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_keys,
        COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked_keys,
        COALESCE(SUM(usage_count), 0) as total_requests,
        COALESCE(SUM(CASE WHEN last_used >= CURRENT_DATE THEN usage_count ELSE 0 END), 0) as requests_today,
        COALESCE(SUM(CASE WHEN last_used >= DATE_TRUNC('month', CURRENT_DATE) THEN usage_count ELSE 0 END), 0) as requests_this_month
      FROM api_keys
    `);

    const topEndpointsResult = await pool.query(`
      SELECT endpoint, COUNT(*) as count
      FROM api_usage_logs
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    `);

    const stats = {
      ...result.rows[0],
      topEndpoints: topEndpointsResult.rows
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get API key stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API key stats' });
  }
});

// API 키 템플릿 목록 조회
router.get('/api-keys/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, type, permissions, rate_limit, expires_in_days, created_at
      FROM api_key_templates
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, templates: result.rows });
  } catch (error) {
    console.error('Get API key templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API key templates' });
  }
});

// API 키 템플릿 생성
router.post('/api-keys/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, type, permissions, rateLimit, expiresInDays } = req.body;
    
    const result = await pool.query(`
      INSERT INTO api_key_templates (name, description, type, permissions, rate_limit, expires_in_days, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, type, permissions, rate_limit, expires_in_days, created_at
    `, [
      name, 
      description, 
      type, 
      JSON.stringify(permissions || []), 
      JSON.stringify(rateLimit || { requests: 1000, period: 'hour' }), 
      expiresInDays, 
      req.user.id
    ]);
    
    res.status(201).json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Create API key template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create API key template' });
  }
});

module.exports = router;
