const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
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
    const uploadDir = '/app/uploads/code-components';
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
      'application/javascript', 'text/javascript', 'text/typescript',
      'text/x-javascript', 'application/json', 'text/plain',
      'application/zip', 'application/x-zip-compressed',
      'application/x-tar', 'application/gzip'
    ];
    
    const allowedExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', '.cpp', '.c',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
      '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.zip', '.tar', '.gz'
    ];
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다.'), false);
    }
  }
});

// [advice from AI] 코드 컴포넌트 목록 조회
router.get('/', authenticateToken, checkPermission('code_components', 'read'), async (req, res) => {
  try {
    const { type, language, framework, search } = req.query;
    let query = `
      SELECT cc.*, u.full_name as creator_name
      FROM code_components cc
      LEFT JOIN timbel_users u ON cc.creator_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      query += ` AND cc.type = $${paramCount}`;
      params.push(type);
    }

    if (language) {
      paramCount++;
      query += ` AND cc.language = $${paramCount}`;
      params.push(language);
    }

    if (framework) {
      paramCount++;
      query += ` AND cc.framework = $${paramCount}`;
      params.push(framework);
    }

    if (search) {
      paramCount++;
      query += ` AND (cc.name ILIKE $${paramCount} OR cc.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY cc.created_at DESC`;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Code components fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch code components' 
    });
  }
});

// [advice from AI] 코드 컴포넌트 상세 조회
router.get('/:id', authenticateToken, checkPermission('code_components', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cc.*, u.full_name as creator_name
      FROM code_components cc
      LEFT JOIN timbel_users u ON cc.creator_id = u.id
      WHERE cc.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Code component not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Code component fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch code component' 
    });
  }
});

// [advice from AI] GitHub API 클라이언트 (간단한 구현)
const axios = require('axios');

// [advice from AI] 외부 저장소에서 정보 가져오기
const fetchExternalSourceInfo = async (sourceType, sourceUrl) => {
  try {
    switch (sourceType) {
      case 'github':
        const githubMatch = sourceUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (githubMatch) {
          const [, owner, repo] = githubMatch;
          const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
          return {
            name: response.data.name,
            description: response.data.description,
            language: response.data.language,
            stars: response.data.stargazers_count,
            forks: response.data.forks_count,
            last_updated: response.data.updated_at,
            clone_url: response.data.clone_url
          };
        }
        break;
      case 'npm':
        const packageName = sourceUrl.replace('https://www.npmjs.com/package/', '');
        const npmResponse = await axios.get(`https://registry.npmjs.org/${packageName}`);
        return {
          name: npmResponse.data.name,
          description: npmResponse.data.description,
          version: npmResponse.data['dist-tags'].latest,
          dependencies: npmResponse.data.versions[npmResponse.data['dist-tags'].latest]?.dependencies || {},
          last_updated: npmResponse.data.time[npmResponse.data['dist-tags'].latest]
        };
      default:
        return null;
    }
  } catch (error) {
    console.warn('Failed to fetch external source info:', error.message);
    return null;
  }
};

// [advice from AI] 코드 컴포넌트 생성 (파일 업로드 또는 외부 저장소)
router.post('/', authenticateToken, checkPermission('code_components', 'create'), upload.single('file'), async (req, res) => {
  try {
    const { 
      name, description, type, language, framework, dependencies, 
      usage_example, version, source_type, source_url, source_info 
    } = req.body;
    
    let fileInfo = null;
    let externalInfo = null;

    // [advice from AI] 소스 타입에 따른 처리
    if (source_type === 'upload') {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'File is required for upload type'
        });
      }
      
      fileInfo = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    } else if (source_type && source_url) {
      // [advice from AI] 외부 저장소에서 정보 가져오기
      externalInfo = await fetchExternalSourceInfo(source_type, source_url);
      
      if (externalInfo) {
        // 외부 저장소 정보로 자동 채우기
        const finalName = name || externalInfo.name;
        const finalDescription = description || externalInfo.description;
        const finalLanguage = language || externalInfo.language;
        
        const result = await pool.query(`
          INSERT INTO code_components (
            name, description, type, language, framework, dependencies,
            usage_example, version, file_info, source_type, source_url, 
            source_info, creator_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `, [
          finalName,
          finalDescription,
          type || 'library',
          finalLanguage,
          framework,
          JSON.stringify(externalInfo.dependencies || []),
          usage_example,
          version || externalInfo.version || '1.0.0',
          null, // 파일 업로드가 아닌 경우
          source_type,
          source_url,
          JSON.stringify({ ...externalInfo, ...JSON.parse(source_info || '{}') }),
          req.user.userId || req.user.id,
          'active'
        ]);

        return res.status(201).json({
          success: true,
          data: result.rows[0]
        });
      }
    }

    // [advice from AI] 의존성을 JSON 배열로 변환
    const dependenciesArray = dependencies ? 
      JSON.parse(dependencies) : [];

    const result = await pool.query(`
      INSERT INTO code_components (
        name, description, type, language, framework, dependencies,
        usage_example, version, file_info, source_type, source_url, 
        source_info, creator_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      name,
      description,
      type,
      language,
      framework,
      JSON.stringify(dependenciesArray),
      usage_example,
      version || '1.0.0',
      fileInfo ? JSON.stringify(fileInfo) : null,
      source_type || 'upload',
      source_url,
      JSON.stringify(JSON.parse(source_info || '{}')),
      req.user.userId || req.user.id,
      'active'
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Code component creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create code component' 
    });
  }
});

// [advice from AI] 코드 컴포넌트 수정
router.put('/:id', authenticateToken, checkPermission('code_components', 'update'), async (req, res) => {
  try {
    const { name, description, type, language, framework, dependencies, usage_example, version } = req.body;
    
    // [advice from AI] 의존성을 JSON 배열로 변환
    const dependenciesArray = dependencies ? 
      JSON.parse(dependencies) : [];
    
    const result = await pool.query(`
      UPDATE code_components 
      SET name = $1, description = $2, type = $3, language = $4, 
          framework = $5, dependencies = $6, usage_example = $7, 
          version = $8, updated_at = NOW()
      WHERE id = $9 AND creator_id = $10
      RETURNING *
    `, [
      name, description, type, language, framework, 
      JSON.stringify(dependenciesArray), usage_example, version,
      req.params.id, req.user.userId || req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Code component not found or no permission'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Code component update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update code component' 
    });
  }
});

// [advice from AI] 코드 컴포넌트 삭제
router.delete('/:id', authenticateToken, checkPermission('code_components', 'delete'), async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM code_components 
      WHERE id = $1 AND creator_id = $2
      RETURNING *
    `, [req.params.id, req.user.userId || req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Code component not found or no permission'
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
      message: 'Code component deleted successfully'
    });
  } catch (error) {
    console.error('Code component deletion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete code component' 
    });
  }
});

// [advice from AI] 파일 다운로드
router.get('/:id/download', authenticateToken, checkPermission('code_components', 'read'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT file_info FROM code_components WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Code component not found'
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

// [advice from AI] 사용 통계 업데이트
router.post('/:id/usage', authenticateToken, checkPermission('code_components', 'read'), async (req, res) => {
  try {
    const { project_name } = req.body;
    
    await pool.query(`
      INSERT INTO code_component_usage (component_id, user_id, project_name)
      VALUES ($1, $2, $3)
    `, [req.params.id, req.user.userId || req.user.id, project_name || 'Unknown']);

    // 다운로드 수 증가
    await pool.query(`
      UPDATE code_components 
      SET download_count = download_count + 1
      WHERE id = $1
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'Usage recorded successfully'
    });
  } catch (error) {
    console.error('Usage recording error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to record usage' 
    });
  }
});

// [advice from AI] 외부 저장소 정보 미리보기 API
router.post('/preview-external', authenticateToken, checkPermission('code_components', 'read'), async (req, res) => {
  try {
    const { source_type, source_url } = req.body;
    
    if (!source_type || !source_url) {
      return res.status(400).json({
        success: false,
        error: 'Source type and source URL are required'
      });
    }

    const externalInfo = await fetchExternalSourceInfo(source_type, source_url);
    
    if (!externalInfo) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch external source information'
      });
    }

    res.json({
      success: true,
      data: externalInfo
    });
  } catch (error) {
    console.error('External source preview error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to preview external source' 
    });
  }
});

module.exports = router;
