// [advice from AI] 카탈로그 시스템 API 라우트
// 도메인, 시스템, 컴포넌트, API, 리소스 관리

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
    req.user = user;
    next();
  });
};

// [advice from AI] 권한 확인 미들웨어
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const permissionName = `${resource}.${action}`;
      console.log('Permission check - req.user:', req.user);
      console.log('Permission check - userId:', req.user.userId || req.user.id);
      
      const result = await pool.query(`
        SELECT p.id 
        FROM permissions p
        JOIN group_permissions gp ON p.id = gp.permission_id
        JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id
        WHERE p.name = $1 AND ugm.user_id = $2
      `, [permissionName, req.user.userId || req.user.id]);

      if (result.rows.length === 0) {
        return res.status(403).json({ 
          success: false, 
          error: `Permission required: ${permissionName}` 
        });
      }
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ success: false, error: 'Permission check failed' });
    }
  };
};

// [advice from AI] 카탈로그 대시보드 통계 조회
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM domains) as total_domains,
        (SELECT COUNT(*) FROM systems) as total_systems,
        (SELECT COUNT(*) FROM components) as total_components,
        (SELECT COUNT(*) FROM apis) as total_apis,
        (SELECT COUNT(*) FROM resources) as total_resources,
        (SELECT COUNT(*) FROM knowledge_assets) as total_knowledge_assets,
        (SELECT COUNT(*) FROM approval_workflows WHERE status = 'pending') as pending_approvals
    `);

    res.json({ 
      success: true, 
      data: stats.rows[0] 
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// [advice from AI] 도메인 관련 API
router.get('/domains', authenticateToken, checkPermission('domains', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.full_name as owner_name, u.role_type as owner_role
      FROM domains d
      LEFT JOIN timbel_users u ON d.owner_id = u.id
      ORDER BY d.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch domains' });
  }
});

router.post('/domains', authenticateToken, checkPermission('domains', 'write'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const result = await pool.query(`
      INSERT INTO domains (name, description, owner_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, description, req.user.id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create domain error:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Domain name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create domain' });
    }
  }
});

router.put('/domains/:id', authenticateToken, checkPermission('domains', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    
    const result = await pool.query(`
      UPDATE domains 
      SET name = $1, description = $2, status = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [name, description, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to update domain' });
  }
});

router.delete('/domains/:id', authenticateToken, checkPermission('domains', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM domains 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete domain' });
  }
});

// [advice from AI] 시스템 관련 API
router.get('/systems', authenticateToken, checkPermission('systems', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, d.name as domain_name, u.full_name as owner_name, u.role_type as owner_role
      FROM systems s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN timbel_users u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get systems error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch systems' });
  }
});

router.post('/systems', authenticateToken, checkPermission('systems', 'write'), async (req, res) => {
  try {
    const { name, description, domain_id, version } = req.body;
    
    const result = await pool.query(`
      INSERT INTO systems (name, description, domain_id, owner_id, version)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, domain_id, req.user.id, version || '1.0.0']);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create system error:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'System name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create system' });
    }
  }
});

router.put('/systems/:id', authenticateToken, checkPermission('systems', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, domain_id, status, version } = req.body;
    
    const result = await pool.query(`
      UPDATE systems 
      SET name = $1, description = $2, domain_id = $3, status = $4, version = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [name, description, domain_id, status, version, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'System not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update system error:', error);
    res.status(500).json({ success: false, error: 'Failed to update system' });
  }
});

router.delete('/systems/:id', authenticateToken, checkPermission('systems', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM systems 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'System not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete system error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete system' });
  }
});

// [advice from AI] 컴포넌트 관련 API
router.get('/components', authenticateToken, checkPermission('components', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, s.name as system_name, d.name as domain_name, u.full_name as owner_name
      FROM components c
      LEFT JOIN systems s ON c.system_id = s.id
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN timbel_users u ON c.owner_id = u.id
      ORDER BY c.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get components error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch components' });
  }
});

router.post('/components', authenticateToken, checkPermission('components', 'write'), async (req, res) => {
  try {
    const { name, description, system_id, type, version, repository_url, documentation_url } = req.body;
    
    const result = await pool.query(`
      INSERT INTO components (name, description, system_id, owner_id, type, version, repository_url, documentation_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, description, system_id, req.user.id, type, version || '1.0.0', repository_url, documentation_url]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create component error:', error);
    res.status(500).json({ success: false, error: 'Failed to create component' });
  }
});

router.put('/components/:id', authenticateToken, checkPermission('components', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, system_id, type, status, version, repository_url, documentation_url } = req.body;
    
    const result = await pool.query(`
      UPDATE components 
      SET name = $1, description = $2, system_id = $3, type = $4, status = $5, 
          version = $6, repository_url = $7, documentation_url = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [name, description, system_id, type, status, version, repository_url, documentation_url, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update component error:', error);
    res.status(500).json({ success: false, error: 'Failed to update component' });
  }
});

router.delete('/components/:id', authenticateToken, checkPermission('components', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM components 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete component error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete component' });
  }
});

// [advice from AI] API 관련 API
router.get('/apis', authenticateToken, checkPermission('apis', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, s.name as system_name, d.name as domain_name, u.full_name as owner_name
      FROM apis a
      LEFT JOIN systems s ON a.system_id = s.id
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN timbel_users u ON a.owner_id = u.id
      ORDER BY a.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get APIs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch APIs' });
  }
});

router.post('/apis', authenticateToken, checkPermission('apis', 'write'), async (req, res) => {
  try {
    const { name, description, system_id, endpoint, method, version, documentation_url } = req.body;
    
    const result = await pool.query(`
      INSERT INTO apis (name, description, system_id, owner_id, endpoint, method, version, documentation_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, description, system_id, req.user.id, endpoint, method, version || '1.0.0', documentation_url]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create API error:', error);
    res.status(500).json({ success: false, error: 'Failed to create API' });
  }
});

router.put('/apis/:id', authenticateToken, checkPermission('apis', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, system_id, endpoint, method, status, version, documentation_url } = req.body;
    
    const result = await pool.query(`
      UPDATE apis 
      SET name = $1, description = $2, system_id = $3, endpoint = $4, method = $5, 
          status = $6, version = $7, documentation_url = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [name, description, system_id, endpoint, method, status, version, documentation_url, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'API not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update API error:', error);
    res.status(500).json({ success: false, error: 'Failed to update API' });
  }
});

router.delete('/apis/:id', authenticateToken, checkPermission('apis', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM apis 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'API not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete API error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete API' });
  }
});

// [advice from AI] 리소스 관련 API
router.get('/resources', authenticateToken, checkPermission('resources', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.full_name as owner_name
      FROM resources r
      LEFT JOIN timbel_users u ON r.owner_id = u.id
      ORDER BY r.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

router.post('/resources', authenticateToken, checkPermission('resources', 'write'), async (req, res) => {
  try {
    const { name, description, type, file_path, file_size, mime_type } = req.body;
    
    const result = await pool.query(`
      INSERT INTO resources (name, description, type, owner_id, file_path, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, description, type, req.user.id, file_path, file_size, mime_type]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ success: false, error: 'Failed to create resource' });
  }
});

router.put('/resources/:id', authenticateToken, checkPermission('resources', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, status } = req.body;
    
    const result = await pool.query(`
      UPDATE resources 
      SET name = $1, description = $2, type = $3, status = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, description, type, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ success: false, error: 'Failed to update resource' });
  }
});

router.delete('/resources/:id', authenticateToken, checkPermission('resources', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM resources 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete resource' });
  }
});

module.exports = router;