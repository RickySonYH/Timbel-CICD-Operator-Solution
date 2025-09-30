// [advice from AI] 시스템 관리 API 라우터 - 자동 추출된 시스템 데이터 기반

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 시스템 목록 조회 - 등록 관리용 (모든 상태)
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const systemsResult = await client.query(`
      SELECT 
        s.id, s.name, s.description, s.version, s.status,
        s.domain_id, s.owner_id,
        s.created_at, s.updated_at,
        d.name as domain_name,
        u.full_name as owner_name
      FROM systems s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN timbel_users u ON s.owner_id = u.id
      ORDER BY s.name
    `);
    
    client.release();
    
    console.log(`시스템 등록 관리 조회: ${systemsResult.rows.length}개`);
    
    res.json({
      success: true,
      data: systemsResult.rows
    });
    
  } catch (error) {
    console.error('시스템 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch systems',
      message: error.message
    });
  }
});

// [advice from AI] PostgreSQL 연결 풀
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 시스템 스냅샷 정보 조회
router.get('/:systemId/snapshot', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { systemId } = req.params;
    
    // systemId가 extraction_id인지 approval_request_id인지 확인
    let query = '';
    let params = [];
    
    // 먼저 approval_request_id로 조회 시도
    query = `
      SELECT 
        ss.*,
        ar.title as approval_title,
        ar.status as approval_status,
        COUNT(pka.id) as total_pending_assets,
        COUNT(CASE WHEN pka.asset_type = 'code_component' THEN 1 END) as code_components,
        COUNT(CASE WHEN pka.asset_type = 'document' THEN 1 END) as documents,
        COUNT(CASE WHEN pka.asset_type = 'design_asset' THEN 1 END) as design_assets,
        COUNT(CASE WHEN pka.asset_type = 'catalog_component' THEN 1 END) as catalog_components
      FROM system_snapshots ss
      LEFT JOIN pending_knowledge_assets pka ON ss.extraction_id = pka.extraction_id
      LEFT JOIN approval_requests ar ON pka.approval_request_id = ar.request_id
      WHERE ar.request_id = $1 OR ss.extraction_id = $1 OR ss.id = $1
      GROUP BY ss.id, ss.extraction_id, ss.system_name, ss.system_description, 
               ss.repository_url, ss.branch_name, ss.commit_hash, ss.total_files, 
               ss.total_size, ss.languages_detected, ss.frameworks_detected, 
               ss.dependencies, ss.project_structure, ss.readme_content, 
               ss.license_info, ss.metadata, ss.created_at, ss.extraction_timestamp,
               ar.title, ar.status
      ORDER BY ss.created_at DESC
      LIMIT 1
    `;
    params = [systemId];

    console.log('시스템 스냅샷 조회:', { systemId, query });

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'System Not Found',
        message: '시스템 스냅샷을 찾을 수 없습니다.'
      });
    }

    const snapshot = result.rows[0];
    
    // 메타데이터에 자산 통계 추가
    const metadata = snapshot.metadata ? JSON.parse(snapshot.metadata) : {};
    metadata.assets = {
      codeComponents: parseInt(snapshot.code_components) || 0,
      documents: parseInt(snapshot.documents) || 0,
      designAssets: parseInt(snapshot.design_assets) || 0,
      catalogComponents: parseInt(snapshot.catalog_components) || 0,
      totalAssets: parseInt(snapshot.total_pending_assets) || 0
    };

    res.json({
      success: true,
      data: {
        ...snapshot,
        metadata: metadata
      },
      message: '시스템 스냅샷을 조회했습니다.'
    });

  } catch (error) {
    console.error('시스템 스냅샷 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'System Snapshot Failed',
      message: '시스템 스냅샷 조회에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 시스템 파일 트리 조회 (GitHub 스타일)
router.get('/:systemId/files', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { systemId } = req.params;
    const { path: requestedPath = '' } = req.query;
    
    // 시스템의 extraction_id 찾기
    const extractionQuery = `
      SELECT ss.extraction_id, ss.system_name
      FROM system_snapshots ss
      LEFT JOIN pending_knowledge_assets pka ON ss.extraction_id = pka.extraction_id
      LEFT JOIN approval_requests ar ON pka.approval_request_id = ar.request_id
      WHERE ar.request_id = $1 OR ss.extraction_id = $1 OR ss.id = $1
      LIMIT 1
    `;
    
    const extractionResult = await pool.query(extractionQuery, [systemId]);
    
    if (extractionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'System Not Found',
        message: '시스템을 찾을 수 없습니다.'
      });
    }

    const { extraction_id } = extractionResult.rows[0];
    
    // 파일 목록 조회
    const filesQuery = `
      SELECT 
        file_name,
        file_path,
        file_extension,
        file_size,
        language,
        line_count,
        is_binary,
        created_at as last_modified
      FROM source_code_repository
      WHERE extraction_id = $1
        AND ($2 = '' OR file_path LIKE $2 || '%')
        AND file_path NOT LIKE '%.git%'
        AND file_path NOT LIKE '%node_modules%'
      ORDER BY 
        CASE WHEN file_path LIKE '%/' THEN 0 ELSE 1 END, -- 디렉토리 먼저
        file_path ASC
      LIMIT 1000
    `;
    
    const filesResult = await pool.query(filesQuery, [extraction_id, requestedPath]);
    
    // 파일 트리 구조 생성
    const fileTree = this.buildFileTree(filesResult.rows, requestedPath);
    
    res.json({
      success: true,
      data: fileTree,
      total: filesResult.rows.length,
      extraction_id: extraction_id,
      message: '파일 트리를 조회했습니다.'
    });

  } catch (error) {
    console.error('파일 트리 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'File Tree Failed',
      message: '파일 트리 조회에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 파일 트리 구조 생성 헬퍼
router.buildFileTree = function(files, basePath = '') {
  const tree = [];
  const pathMap = new Map();
  
  // 디렉토리 구조 생성
  files.forEach(file => {
    const relativePath = file.file_path.startsWith(basePath) 
      ? file.file_path.substring(basePath.length).replace(/^\//, '')
      : file.file_path;
    
    const pathParts = relativePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const isDirectory = pathParts.length > 1;
    
    if (isDirectory) {
      // 디렉토리 생성
      const dirPath = pathParts.slice(0, -1).join('/');
      if (!pathMap.has(dirPath)) {
        pathMap.set(dirPath, {
          name: pathParts[0],
          type: 'directory',
          path: basePath + dirPath,
          children: []
        });
      }
    }
    
    // 파일 추가
    tree.push({
      name: fileName,
      type: 'file',
      path: file.file_path,
      size: file.file_size,
      language: file.language,
      lastModified: file.last_modified
    });
  });
  
  // 루트 레벨 항목만 반환 (간단한 구현)
  const rootItems = [];
  const processedPaths = new Set();
  
  files.forEach(file => {
    const pathParts = file.file_path.split('/');
    const rootName = pathParts[0];
    
    if (!processedPaths.has(rootName)) {
      processedPaths.add(rootName);
      
      if (pathParts.length === 1) {
        // 루트 파일
        rootItems.push({
          name: file.file_name,
          type: 'file',
          path: file.file_path,
          size: file.file_size,
          language: file.language,
          lastModified: file.created_at
        });
      } else {
        // 루트 디렉토리
        rootItems.push({
          name: rootName,
          type: 'directory',
          path: rootName,
          children: [] // 실제로는 하위 파일들을 포함해야 함
        });
      }
    }
  });
  
  return rootItems;
};

module.exports = router;
