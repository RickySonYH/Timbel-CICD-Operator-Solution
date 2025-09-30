const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 설정 (통일된 설정)
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] JWT 인증 미들웨어 import (중복 제거됨)

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
router.get('/', authenticateToken, async (req, res) => {
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
router.get('/:id', authenticateToken, async (req, res) => {
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

// [advice from AI] 디자인 자산 생성 - Admin, PO, PE만 가능
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), upload.single('file'), async (req, res) => {
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

// [advice from AI] 디자인 자산 수정 - Admin, PO, PE만 가능
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), async (req, res) => {
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

// [advice from AI] 디자인 자산 삭제 - Admin만 가능
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
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

// [advice from AI] 파일 다운로드 (단일 파일)
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, file_path, file_type FROM design_assets WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Design asset not found'
      });
    }

    const asset = result.rows[0];
    const filePath = asset.file_path;
    const fileName = asset.name;
    const fileExtension = asset.file_type;

    console.log('다운로드 요청:', { filePath, fileName, fileExtension });

    // 파일 경로가 상대 경로인 경우 절대 경로로 변환
    const fs = require('fs');
    const path = require('path');
    
    let fullPath = filePath;
    if (!path.isAbsolute(filePath)) {
      // 프로젝트 루트 기준으로 절대 경로 생성
      const projectRoot = path.resolve(__dirname, '../../..');
      
      // '../test_image.png' 같은 경우를 처리
      if (filePath.startsWith('../')) {
        fullPath = path.resolve(projectRoot, filePath.substring(3));
      } else {
        fullPath = path.resolve(projectRoot, filePath);
      }
    }

    console.log('📁 파일 경로 계산:', {
      원본_경로: filePath,
      계산된_절대_경로: fullPath,
      프로젝트_루트: path.resolve(__dirname, '../../..')
    });

    // 파일 존재 여부 확인
    if (!fs.existsSync(fullPath)) {
      console.error('❌ 파일이 존재하지 않음:', fullPath);
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `요청한 파일을 찾을 수 없습니다. 경로: ${fullPath}`
      });
    }

    // 파일 정보 확인
    const fileStats = fs.statSync(fullPath);
    console.log('📊 파일 정보:', {
      크기: fileStats.size,
      수정일: fileStats.mtime,
      읽기권한: fs.constants.R_OK
    });

    // 파일 확장자가 없는 경우 추가
    const downloadFileName = fileName.includes('.') ? fileName : `${fileName}.${fileExtension}`;

    console.log('⬇️ 파일 다운로드 시작:', { fullPath, downloadFileName });
    
    // 파일 읽기 권한 확인
    try {
      fs.accessSync(fullPath, fs.constants.R_OK);
      console.log('✅ 파일 읽기 권한 확인됨');
    } catch (accessErr) {
      console.error('❌ 파일 읽기 권한 없음:', accessErr);
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: '파일에 대한 읽기 권한이 없습니다.'
      });
    }
    
    res.download(fullPath, downloadFileName, (err) => {
      if (err) {
        console.error('❌ 다운로드 중 오류:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            error: 'Download failed',
            message: `파일 다운로드 중 오류가 발생했습니다: ${err.message}`
          });
        }
      } else {
        console.log('✅ 파일 다운로드 완료:', downloadFileName);
      }
    });

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download file',
      message: error.message
    });
  }
});

// [advice from AI] 종속성 포함 다운로드 (ZIP 파일)
router.get('/:id/download-with-dependencies', authenticateToken, async (req, res) => {
  try {
    const assetId = req.params.id;
    
    // 자산 정보 조회
    const assetResult = await pool.query(`
      SELECT name, file_path, file_type, related_components, usage_locations 
      FROM design_assets WHERE id = $1
    `, [assetId]);

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Design asset not found'
      });
    }

    const asset = assetResult.rows[0];
    console.log('📦 종속성 포함 다운로드 요청:', asset.name);

    const archiver = require('archiver');
    const fs = require('fs');
    const path = require('path');

    // ZIP 파일 생성
    const archive = archiver('zip', {
      zlib: { level: 9 } // 최대 압축
    });

    // 응답 헤더 설정
    const zipFileName = `${asset.name}_with_dependencies.zip`;
    res.attachment(zipFileName);
    res.setHeader('Content-Type', 'application/zip');

    // 아카이브를 응답 스트림에 연결
    archive.pipe(res);

    // 메인 파일 추가
    const projectRoot = path.resolve(__dirname, '../../..');
    let mainFilePath = asset.file_path;
    
    if (!path.isAbsolute(mainFilePath)) {
      if (mainFilePath.startsWith('../')) {
        mainFilePath = path.resolve(projectRoot, mainFilePath.substring(3));
      } else {
        mainFilePath = path.resolve(projectRoot, mainFilePath);
      }
    }

    if (fs.existsSync(mainFilePath)) {
      archive.file(mainFilePath, { name: `main/${path.basename(mainFilePath)}` });
      console.log('📁 메인 파일 추가:', path.basename(mainFilePath));
    }

    // 관련 컴포넌트 파일들 추가
    if (asset.related_components && Array.isArray(asset.related_components)) {
      for (const relatedId of asset.related_components) {
        try {
          // 관련 자산 정보 조회
          const relatedResult = await pool.query(`
            SELECT name, file_path, file_type FROM design_assets WHERE id = $1
            UNION ALL
            SELECT name, file_info->>'file_path' as file_path, 'code' as file_type FROM code_components WHERE id = $1
          `, [relatedId]);

          if (relatedResult.rows.length > 0) {
            const related = relatedResult.rows[0];
            let relatedPath = related.file_path;
            
            if (relatedPath && !path.isAbsolute(relatedPath)) {
              if (relatedPath.startsWith('../')) {
                relatedPath = path.resolve(projectRoot, relatedPath.substring(3));
              } else {
                relatedPath = path.resolve(projectRoot, relatedPath);
              }
            }

            if (relatedPath && fs.existsSync(relatedPath)) {
              archive.file(relatedPath, { name: `dependencies/${path.basename(relatedPath)}` });
              console.log('🔗 관련 파일 추가:', path.basename(relatedPath));
            }
          }
        } catch (err) {
          console.warn('관련 파일 추가 실패:', err.message);
        }
      }
    }

    // README 파일 생성
    const readmeContent = `# ${asset.name} - 종속성 포함 패키지

## 포함된 파일들
- main/${path.basename(mainFilePath || asset.name)} (메인 파일)
- dependencies/ (관련 파일들)

## 사용 방법
1. 메인 파일을 프로젝트에 복사
2. dependencies 폴더의 파일들을 적절한 위치에 배치
3. 필요한 의존성 설치 및 설정

생성일: ${new Date().toLocaleString('ko-KR')}
`;

    archive.append(readmeContent, { name: 'README.md' });

    // 아카이브 완료
    await archive.finalize();

    console.log('✅ ZIP 파일 생성 완료:', zipFileName);

  } catch (error) {
    console.error('❌ 종속성 포함 다운로드 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create dependency package',
      message: error.message
    });
  }
});

module.exports = router;
