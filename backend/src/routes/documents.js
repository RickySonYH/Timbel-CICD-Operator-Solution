const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'timbel-super-secret-jwt-key-change-in-production', (err, user) => {
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
    const uploadDir = '/app/uploads/documents';
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
    fileSize: 100 * 1024 * 1024 // 100MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/markdown', 'text/html', 'application/json', 'application/xml',
      'image/jpeg', 'image/png', 'image/gif', 'application/zip'
    ];
    
    const allowedExtensions = [
      '.pdf', '.doc', '.docx', '.txt', '.md', '.html', '.json', '.xml',
      '.jpg', '.jpeg', '.png', '.gif', '.zip'
    ];
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다.'), false);
    }
  }
});

// [advice from AI] 문서 목록 조회
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, type, search } = req.query;
    let query = `
      SELECT d.*, u.full_name as author_name
      FROM documents d
      LEFT JOIN timbel_users u ON d.author_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND d.category = $${paramCount}`;
      params.push(category);
    }

    if (type) {
      paramCount++;
      query += ` AND d.format = $${paramCount}`;
      params.push(type);
    }

    if (search) {
      paramCount++;
      query += ` AND (d.title ILIKE $${paramCount} OR d.content ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch documents' 
    });
  }
});

// [advice from AI] 문서 상세 조회
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.full_name as creator_name
      FROM documents d
      LEFT JOIN timbel_users u ON d.creator_id = u.id
      WHERE d.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Document fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch document' 
    });
  }
});

// [advice from AI] 문서 생성 - Admin, PO, PE만 가능
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), upload.single('file'), async (req, res) => {
  try {
    const { 
      title, content, category, type, tags, version, status, is_public 
    } = req.body;
    
    let fileInfo = null;

    // [advice from AI] 파일 업로드인 경우
    if (req.file) {
      fileInfo = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    }

    // [advice from AI] 태그를 배열로 변환
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    const result = await pool.query(`
      INSERT INTO documents (
        title, content, category, type, tags, version, status, is_public,
        file_info, creator_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title,
      content || '',
      category,
      type || 'document',
      tagsArray,
      version || '1.0.0',
      status || 'draft',
      is_public === 'true' || is_public === true,
      fileInfo ? JSON.stringify(fileInfo) : null,
      req.user.userId || req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Document creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create document' 
    });
  }
});

// [advice from AI] 문서 수정 - Admin, PO, PE만 가능
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), async (req, res) => {
  try {
    const { title, content, category, type, tags, version, status, is_public } = req.body;
    
    // [advice from AI] 태그를 배열로 변환
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    
    const result = await pool.query(`
      UPDATE documents 
      SET title = $1, content = $2, category = $3, type = $4, tags = $5, 
          version = $6, status = $7, is_public = $8, updated_at = NOW()
      WHERE id = $9 AND creator_id = $10
      RETURNING *
    `, [
      title, content, category, type, tagsArray, version, status, 
      is_public === 'true' || is_public === true,
      req.params.id, req.user.userId || req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or no permission'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Document update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update document' 
    });
  }
});

// [advice from AI] 문서 삭제 - Admin만 가능
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM documents 
      WHERE id = $1 AND creator_id = $2
      RETURNING *
    `, [req.params.id, req.user.userId || req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or no permission'
      });
    }

    // 파일도 삭제
    if (result.rows[0].file_info) {
      const fileInfo = JSON.parse(result.rows[0].file_info);
      try {
        await fs.unlink(fileInfo.path);
      } catch (fileError) {
        console.warn('File deletion failed:', fileError);
      }
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Document deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete document' 
    });
  }
});

// [advice from AI] 파일 다운로드
router.get('/:id/download', authenticateToken, checkPermission('documents', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT file_info FROM documents WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
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

// [advice from AI] 문서 버전 히스토리 조회
router.get('/:id/versions', authenticateToken, checkPermission('documents', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM document_versions 
      WHERE document_id = $1 
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Document versions fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch document versions' 
    });
  }
});

// [advice from AI] 새 버전 생성
router.post('/:id/versions', authenticateToken, checkPermission('documents', 'update'), async (req, res) => {
  try {
    const { version, change_log } = req.body;
    
    // 현재 문서 정보 조회
    const docResult = await pool.query(`
      SELECT * FROM documents WHERE id = $1 AND creator_id = $2
    `, [req.params.id, req.user.userId || req.user.id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or no permission'
      });
    }

    // 버전 히스토리에 저장
    const versionResult = await pool.query(`
      INSERT INTO document_versions (document_id, version, content, change_log, creator_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      req.params.id,
      version,
      docResult.rows[0].content,
      change_log,
      req.user.userId || req.user.id
    ]);

    res.json({
      success: true,
      data: versionResult.rows[0]
    });
  } catch (error) {
    console.error('Document version creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create document version' 
    });
  }
});

module.exports = router;
