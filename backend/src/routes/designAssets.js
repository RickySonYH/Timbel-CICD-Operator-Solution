const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 설정 (통일된 설정)
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] JWT 인증 미들웨어 import
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] 기존 authenticateToken 함수 (호환성을 위해 유지)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'timbel-super-secret-jwt-key-change-in-production', (err, user) => {
    if (err) {
      console.error('❌ JWT 토큰 검증 실패:', err.message);
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

// [advice from AI] 파일 업로드 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = '/app/uploads/design-assets';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/svg+xml', 'image/gif',
      'application/pdf', 'application/zip',
      'application/vnd.adobe.illustrator',
      'application/vnd.sketch',
      'application/vnd.figma'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다.'), false);
    }
  }
});

// [advice from AI] 디자인 자산 목록 조회
router.get('/', authenticateToken, checkPermission('design_assets', 'read'), async (req, res) => {
  try {
    const { category, tag, search } = req.query;
    let query = `
      SELECT da.*, u.full_name as creator_name
      FROM design_assets da
      LEFT JOIN timbel_users u ON da.creator_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND da.category = $${paramCount}`;
      params.push(category);
    }

    if (tag) {
      paramCount++;
      query += ` AND da.tags ILIKE $${paramCount}`;
      params.push(`%${tag}%`);
    }

    if (search) {
      paramCount++;
      query += ` AND (da.name ILIKE $${paramCount} OR da.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY da.created_at DESC`;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Design assets fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch design assets' 
    });
  }
});

// [advice from AI] 디자인 자산 상세 조회
router.get('/:id', authenticateToken, checkPermission('design_assets', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT da.*, u.full_name as creator_name
      FROM design_assets da
      LEFT JOIN timbel_users u ON da.creator_id = u.id
      WHERE da.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Design asset not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Design asset fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch design asset' 
    });
  }
});

// [advice from AI] 디자인 자산 생성
router.post('/', authenticateToken, checkPermission('design_assets', 'create'), upload.single('file'), async (req, res) => {
  try {
    const { name, description, category, tags, version, license } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    // [advice from AI] 태그를 배열로 변환
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    
    const result = await pool.query(`
      INSERT INTO design_assets (
        name, description, category, tags, version, license,
        file_info, creator_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      name,
      description,
      category,
      tagsArray,
      version || '1.0.0',
      license || 'MIT',
      JSON.stringify(fileInfo),
      req.user.userId || req.user.id,
      'active'
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Design asset creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create design asset' 
    });
  }
});

// [advice from AI] 디자인 자산 수정
router.put('/:id', authenticateToken, checkPermission('design_assets', 'update'), async (req, res) => {
  try {
    const { name, description, category, tags, version, license } = req.body;
    
    // [advice from AI] 태그를 배열로 변환
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    
    const result = await pool.query(`
      UPDATE design_assets 
      SET name = $1, description = $2, category = $3, tags = $4, 
          version = $5, license = $6, updated_at = NOW()
      WHERE id = $7 AND creator_id = $8
      RETURNING *
    `, [
      name, description, category, tagsArray, version, license,
      req.params.id, req.user.userId || req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Design asset not found or no permission'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Design asset update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update design asset' 
    });
  }
});

// [advice from AI] 디자인 자산 삭제
router.delete('/:id', authenticateToken, checkPermission('design_assets', 'delete'), async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM design_assets 
      WHERE id = $1 AND creator_id = $2
      RETURNING *
    `, [req.params.id, req.user.userId || req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Design asset not found or no permission'
      });
    }

    // 파일도 삭제
    const fileInfo = JSON.parse(result.rows[0].file_info);
    try {
      await fs.unlink(fileInfo.path);
    } catch (fileError) {
      console.warn('File deletion failed:', fileError);
    }

    res.json({
      success: true,
      message: 'Design asset deleted successfully'
    });
  } catch (error) {
    console.error('Design asset deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete design asset' 
    });
  }
});

// [advice from AI] 파일 다운로드
router.get('/:id/download', authenticateToken, checkPermission('design_assets', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT file_info FROM design_assets WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Design asset not found'
      });
    }

    const fileInfo = JSON.parse(result.rows[0].file_info);
    const filePath = fileInfo.path;
    const fileName = fileInfo.originalName;

    res.download(filePath, fileName);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download file' 
    });
  }
});

module.exports = router;
