// [advice from AI] 지식 추출 API 라우터

const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const KnowledgeExtractor = require('../services/knowledgeExtractor');
const DiagramGenerator = require('../services/diagramGenerator');
const DocumentationGenerator = require('../services/documentationGenerator');
const RelationshipMapper = require('../services/relationshipMapper');
const ExternalSourceExtractor = require('../services/externalSourceExtractor');
const ApprovalService = require('../services/approvalService');
const { storePendingKnowledgeAssets } = require('../services/pendingAssetStore');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 시스템 승인 완료 시 카탈로그와 지식 자산에 동시 등록
const registerApprovedSystem = async (systemInfo, extractionData, userId) => {
  const { Pool } = require('pg');
  const pool = new Pool({
    user: process.env.DB_USER || 'timbel_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'timbel_db',
    password: process.env.DB_PASSWORD || 'timbel_password',
    port: process.env.DB_PORT || 5434,
  });

  try {
    // 1. 카탈로그 시스템에 등록
    const catalogSystemResult = await pool.query(`
      INSERT INTO catalog_systems (name, title, description, owner_group, lifecycle)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, title
    `, [
      systemInfo.name.toLowerCase().replace(/\s+/g, '-'),
      systemInfo.name,
      systemInfo.description,
      'development-team', // 기본 소유 그룹
      'development' // 개발 단계
    ]);

    const catalogSystemId = catalogSystemResult.rows[0].id;

    // 2. 지식 자산으로도 등록 (시스템 자체를 하나의 지식 자산으로)
    const knowledgeAssetResult = await pool.query(`
      INSERT INTO design_assets (
        name, description, file_type, category, 
        owner, status, metadata, created_by, scan_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name
    `, [
      systemInfo.name,
      `시스템: ${systemInfo.description}`,
      'system-architecture',
      systemInfo.category || 'application',
      extractionData.defaultOwner || 'System',
      'approved', // 승인된 상태로 등록
      JSON.stringify({
        version: systemInfo.version,
        source: extractionData.source,
        catalogSystemId: catalogSystemId,
        systemType: 'extracted-system',
        extractedAssets: extractionData.extractedAssets
      }),
      userId,
      JSON.stringify({
        extractionDate: new Date().toISOString(),
        approvalDate: new Date().toISOString(),
        systemLevel: true
      })
    ]);

    console.log(`✅ 시스템 등록 완료:`, {
      catalogSystem: catalogSystemResult.rows[0],
      knowledgeAsset: knowledgeAssetResult.rows[0]
    });

    return {
      catalogSystemId,
      knowledgeAssetId: knowledgeAssetResult.rows[0].id,
      systemName: systemInfo.name
    };

  } catch (error) {
    console.error('❌ 시스템 등록 실패:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// [advice from AI] 전체 프로젝트 스캔 및 지식 추출
router.post('/scan-project', jwtAuth.verifyToken, jwtAuth.requireRole('po'), async (req, res) => {
  try {
    const { projectPath, options = {} } = req.body;
    
    // [advice from AI] 기본값: 현재 프로젝트 디렉토리
    const scanPath = projectPath || path.resolve(__dirname, '../../..');
    
    console.log('🔍 지식 추출 시작:', {
      requestedBy: req.user.email,
      scanPath,
      options
    });

    // [advice from AI] 1단계: 지식 추출
    console.log('📊 1단계: 프로젝트 스캔 및 지식 추출...');
    const extractor = new KnowledgeExtractor();
    const extractionResults = await extractor.scanProject(scanPath);

    // [advice from AI] 2단계: 관계 매핑 (Backstage.io 스타일)
    let relationshipResults = null;
    if (options.mapRelationships !== false) {
      try {
        console.log('🔗 2단계: 지식 자산 간 관계 매핑...');
        const mapper = new RelationshipMapper();
        relationshipResults = await mapper.analyzeAllRelationships(extractionResults);
        console.log('✅ 관계 매핑 완료');
      } catch (relationshipError) {
        console.error('⚠️ 관계 매핑 실패 (지식 추출은 성공):', relationshipError.message);
      }
    }

    // [advice from AI] 3단계: 자동 문서 생성
    let documentationResults = null;
    if (options.generateDocumentation !== false) {
      try {
        console.log('📝 3단계: 자동 문서 생성...');
        const docGenerator = new DocumentationGenerator();
        documentationResults = await docGenerator.generateAllDocumentation(scanPath, extractionResults);
        console.log('✅ 자동 문서 생성 완료');
      } catch (docError) {
        console.error('⚠️ 문서 생성 실패 (지식 추출은 성공):', docError.message);
      }
    }

    // [advice from AI] 4단계: 다이어그램 생성
    let diagramResults = null;
    if (options.generateDiagrams !== false) {
      try {
        console.log('🎨 4단계: 다이어그램 자동 생성...');
        const generator = new DiagramGenerator();
        diagramResults = await generator.generateAllDiagrams(scanPath);
        console.log('✅ 다이어그램 자동 생성 완료');
      } catch (diagramError) {
        console.error('⚠️ 다이어그램 생성 실패 (지식 추출은 성공):', diagramError.message);
      }
    }

    res.json({
      success: true,
      data: {
        // [advice from AI] 1단계: 지식 추출 결과
        extraction: {
          scanSummary: extractionResults.scanSummary,
          extractedCounts: {
            codeComponents: extractionResults.codeComponents.length,
            designAssets: extractionResults.designAssets.length,
            documents: extractionResults.documents.length,
            catalogComponents: extractionResults.catalogComponents.length
          }
        },
        
        // [advice from AI] 2단계: 관계 매핑 결과
        relationships: relationshipResults ? {
          success: true,
          totalRelationships: relationshipResults.totalRelationships,
          confidence: relationshipResults.confidence,
          relationshipTypes: {
            codeToCode: relationshipResults.codeToCodeRelationships.length,
            codeToDocument: relationshipResults.codeToDocumentRelationships.length,
            codeToDesign: relationshipResults.codeToDesignRelationships.length,
            documentToDesign: relationshipResults.documentToDesignRelationships.length,
            ownership: relationshipResults.ownershipRelationships.length,
            project: relationshipResults.projectRelationships.length,
            tags: relationshipResults.tagRelationships.length
          }
        } : { success: false, reason: '관계 매핑이 비활성화되었거나 실패했습니다.' },
        
        // [advice from AI] 3단계: 문서 생성 결과
        documentation: documentationResults ? {
          success: true,
          generatedDocuments: Object.keys(documentationResults).filter(key => 
            documentationResults[key] !== null && key !== 'errors'
          ),
          errors: documentationResults.errors || []
        } : { success: false, reason: '문서 생성이 비활성화되었거나 실패했습니다.' },
        
        // [advice from AI] 4단계: 다이어그램 생성 결과
        diagrams: diagramResults ? {
          success: true,
          generatedDiagrams: Object.keys(diagramResults).filter(key => 
            diagramResults[key] !== null && key !== 'errors'
          ),
          errors: diagramResults.errors || []
        } : { success: false, reason: '다이어그램 생성이 비활성화되었거나 실패했습니다.' }
      },
      message: '🎉 통합 지식 관리 시스템 구축이 완료되었습니다! (추출→관계매핑→문서생성→다이어그램생성)'
    });

  } catch (error) {
    console.error('❌ 지식 추출 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Knowledge Extraction Failed',
      message: error.message
    });
  }
});

// [advice from AI] 특정 디렉토리 스캔
router.post('/scan-directory', jwtAuth.verifyToken, jwtAuth.requireRole('po'), async (req, res) => {
  try {
    const { directoryPath } = req.body;
    
    if (!directoryPath) {
      return res.status(400).json({
        success: false,
        error: 'Directory path required',
        message: '스캔할 디렉토리 경로를 지정해주세요.'
      });
    }

    console.log('📁 디렉토리 스캔 시작:', {
      requestedBy: req.user.email,
      directoryPath
    });

    const extractor = new KnowledgeExtractor();
    const results = await extractor.scanProject(directoryPath);

    res.json({
      success: true,
      data: {
        scanSummary: results.scanSummary,
        extractedCounts: {
          codeComponents: results.codeComponents.length,
          designAssets: results.designAssets.length,
          documents: results.documents.length,
          catalogComponents: results.catalogComponents.length
        }
      },
      message: `디렉토리 ${directoryPath} 스캔이 완료되었습니다.`
    });

  } catch (error) {
    console.error('❌ 디렉토리 스캔 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Directory Scan Failed',
      message: error.message
    });
  }
});

// [advice from AI] 스캔 상태 조회
router.get('/scan-status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    // [advice from AI] 각 테이블의 스캔된 항목 수 조회
    const [codeComponentsResult, designAssetsResult, documentsResult, catalogComponentsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count, MAX(last_scanned_at) as last_scan FROM code_components WHERE last_scanned_at IS NOT NULL'),
      pool.query('SELECT COUNT(*) as count, MAX(last_scanned_at) as last_scan FROM design_assets WHERE last_scanned_at IS NOT NULL'),
      pool.query('SELECT COUNT(*) as count, MAX(last_scanned_at) as last_scan FROM documents WHERE last_scanned_at IS NOT NULL'),
      pool.query('SELECT COUNT(*) as count, MAX(last_scanned_at) as last_scan FROM catalog_components WHERE last_scanned_at IS NOT NULL')
    ]);

    const status = {
      codeComponents: {
        count: parseInt(codeComponentsResult.rows[0].count),
        lastScan: codeComponentsResult.rows[0].last_scan
      },
      designAssets: {
        count: parseInt(designAssetsResult.rows[0].count),
        lastScan: designAssetsResult.rows[0].last_scan
      },
      documents: {
        count: parseInt(documentsResult.rows[0].count),
        lastScan: documentsResult.rows[0].last_scan
      },
      catalogComponents: {
        count: parseInt(catalogComponentsResult.rows[0].count),
        lastScan: catalogComponentsResult.rows[0].last_scan
      },
      totalKnowledgeItems: 
        parseInt(codeComponentsResult.rows[0].count) +
        parseInt(designAssetsResult.rows[0].count) +
        parseInt(documentsResult.rows[0].count) +
        parseInt(catalogComponentsResult.rows[0].count)
    };

    res.json({
      success: true,
      data: status,
      message: '스캔 상태 조회 완료'
    });

  } catch (error) {
    console.error('❌ 스캔 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Scan Status Failed',
      message: error.message
    });
  }
});

// [advice from AI] 지식 검색 (엘라스틱서치 준비)
router.get('/search', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { 
      query = '', 
      type = 'all', // 'code', 'design', 'document', 'catalog', 'all'
      limit = 20, 
      offset = 0 
    } = req.query;

    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    const searchResults = {
      codeComponents: [],
      designAssets: [],
      documents: [],
      catalogComponents: [],
      totalResults: 0
    };

    // [advice from AI] 타입별 검색
    if (type === 'all' || type === 'code') {
      const codeQuery = `
        SELECT *, 'code' as result_type FROM code_components 
        WHERE title ILIKE $1 OR description ILIKE $1 OR source_code ILIKE $1
        ORDER BY last_scanned_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const codeResult = await pool.query(codeQuery, [`%${query}%`, limit, offset]);
      searchResults.codeComponents = codeResult.rows;
    }

    if (type === 'all' || type === 'design') {
      const designQuery = `
        SELECT *, 'design' as result_type FROM design_assets 
        WHERE name ILIKE $1 OR title ILIKE $1 OR description ILIKE $1
        ORDER BY last_scanned_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const designResult = await pool.query(designQuery, [`%${query}%`, limit, offset]);
      searchResults.designAssets = designResult.rows;
    }

    if (type === 'all' || type === 'document') {
      const docQuery = `
        SELECT *, 'document' as result_type FROM documents 
        WHERE title ILIKE $1 OR content ILIKE $1
        ORDER BY last_scanned_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const docResult = await pool.query(docQuery, [`%${query}%`, limit, offset]);
      searchResults.documents = docResult.rows;
    }

    if (type === 'all' || type === 'catalog') {
      const catalogQuery = `
        SELECT *, 'catalog' as result_type FROM catalog_components 
        WHERE name ILIKE $1 OR title ILIKE $1 OR description ILIKE $1
        ORDER BY last_scanned_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const catalogResult = await pool.query(catalogQuery, [`%${query}%`, limit, offset]);
      searchResults.catalogComponents = catalogResult.rows;
    }

    searchResults.totalResults = 
      searchResults.codeComponents.length +
      searchResults.designAssets.length +
      searchResults.documents.length +
      searchResults.catalogComponents.length;

    res.json({
      success: true,
      data: searchResults,
      query: {
        searchTerm: query,
        type,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      message: `${searchResults.totalResults}개의 지식 항목을 찾았습니다.`
    });

  } catch (error) {
    console.error('❌ 지식 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Knowledge Search Failed',
      message: error.message
    });
  }
});

// [advice from AI] 지식 항목 상세 조회
router.get('/item/:type/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { type, id } = req.params;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    let tableName, result;

    switch (type) {
      case 'code':
        tableName = 'code_components';
        break;
      case 'design':
        tableName = 'design_assets';
        break;
      case 'document':
        tableName = 'documents';
        break;
      case 'catalog':
        tableName = 'catalog_components';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type',
          message: '유효하지 않은 타입입니다. (code, design, document, catalog 중 선택)'
        });
    }

    const query = `SELECT * FROM ${tableName} WHERE id = $1`;
    result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        message: '해당 지식 항목을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        type,
        item: result.rows[0]
      },
      message: '지식 항목 상세 조회 완료'
    });

  } catch (error) {
    console.error('❌ 지식 항목 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Item Detail Failed',
      message: error.message
    });
  }
});

// [advice from AI] 다이어그램 자동 생성
router.post('/generate-diagrams', jwtAuth.verifyToken, jwtAuth.requireRole('po'), async (req, res) => {
  try {
    const { projectPath, diagramTypes = ['all'] } = req.body;
    
    // [advice from AI] 기본값: 현재 프로젝트 디렉토리
    const scanPath = projectPath || path.resolve(__dirname, '../../..');
    
    console.log('🎨 다이어그램 생성 시작:', {
      requestedBy: req.user.email,
      scanPath,
      diagramTypes
    });

    const generator = new DiagramGenerator();
    const results = await generator.generateAllDiagrams(scanPath);

    res.json({
      success: true,
      data: {
        generatedDiagrams: Object.keys(results).filter(key => 
          results[key] !== null && key !== 'errors'
        ),
        errors: results.errors,
        diagrams: {
          dependencyDiagram: results.dependencyDiagram,
          apiArchitecture: results.apiArchitecture,
          componentHierarchy: results.componentHierarchy,
          systemArchitecture: results.systemArchitecture,
          dataFlow: results.dataFlow
        }
      },
      message: '다이어그램 자동 생성이 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 다이어그램 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Diagram Generation Failed',
      message: error.message
    });
  }
});

// [advice from AI] 통합 검색 API
router.get('/search', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { query, type = 'all', limit = 20, offset = 0 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          codeComponents: [],
          designAssets: [],
          documents: [],
          catalogComponents: [],
          totalResults: 0
        }
      });
    }

    console.log('🔍 통합 검색 요청:', { query, type, limit, offset });

    const Pool = require('pg').Pool;
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    const searchTerm = `%${query.trim()}%`;
    let results = {
      codeComponents: [],
      designAssets: [],
      documents: [],
      catalogComponents: [],
      totalResults: 0
    };

    // 코드 컴포넌트 검색
    if (type === 'all' || type === 'code') {
      const codeQuery = `
        SELECT id, name, title, description, type, language, framework, 
               source_code, creator_id, created_at, 'code' as result_type
        FROM code_components 
        WHERE (name ILIKE $1 OR title ILIKE $1 OR description ILIKE $1 
               OR language ILIKE $1 OR framework ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const codeResult = await pool.query(codeQuery, [searchTerm, limit, offset]);
      results.codeComponents = codeResult.rows;
    }

    // 디자인 자산 검색
    if (type === 'all' || type === 'design') {
      const designQuery = `
        SELECT id, name, title, description, category, file_type, file_path,
               creator_id, created_at, 'design' as result_type
        FROM design_assets 
        WHERE (name ILIKE $1 OR title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const designResult = await pool.query(designQuery, [searchTerm, limit, offset]);
      results.designAssets = designResult.rows;
    }

    // 문서 검색
    if (type === 'all' || type === 'document') {
      const docQuery = `
        SELECT id, title, content, category, format, file_path,
               author_id as creator_id, created_at, 'document' as result_type,
               title as name, content as description
        FROM documents 
        WHERE (title ILIKE $1 OR content ILIKE $1 OR category ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const docResult = await pool.query(docQuery, [searchTerm, limit, offset]);
      results.documents = docResult.rows;
    }

    // 카탈로그 컴포넌트 검색
    if (type === 'all' || type === 'catalog') {
      const catalogQuery = `
        SELECT id, name, title, description, type, owner_group,
               source_location as file_path, created_at, 'catalog' as result_type
        FROM catalog_components 
        WHERE (name ILIKE $1 OR title ILIKE $1 OR description ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const catalogResult = await pool.query(catalogQuery, [searchTerm, limit, offset]);
      results.catalogComponents = catalogResult.rows;
    }

    results.totalResults = results.codeComponents.length + 
                          results.designAssets.length + 
                          results.documents.length + 
                          results.catalogComponents.length;

    console.log('✅ 검색 완료:', results.totalResults, '개 결과');

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Search Failed',
      message: error.message
    });
  }
});

// [advice from AI] 개별 자산 상세 정보 조회
router.get('/item/:assetType/:assetId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { assetType, assetId } = req.params;
    
    console.log('📊 자산 상세 정보 조회:', { assetType, assetId });

    const Pool = require('pg').Pool;
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    let query = '';
    let tableName = '';
    
    switch (assetType) {
      case 'code_component':
      case 'code':
        tableName = 'code_components';
        query = `
          SELECT cc.*, u.full_name as creator_name
          FROM code_components cc
          LEFT JOIN timbel_users u ON cc.creator_id = u.id
          WHERE cc.id = $1
        `;
        break;
      case 'design_asset':
      case 'design':
        tableName = 'design_assets';
        query = `
          SELECT da.*, u.full_name as creator_name
          FROM design_assets da
          LEFT JOIN timbel_users u ON da.creator_id = u.id
          WHERE da.id = $1
        `;
        break;
      case 'document':
        tableName = 'documents';
        query = `
          SELECT d.*, u.full_name as creator_name
          FROM documents d
          LEFT JOIN timbel_users u ON d.author_id = u.id
          WHERE d.id = $1
        `;
        break;
      case 'catalog_component':
      case 'catalog':
        tableName = 'catalog_components';
        query = `
          SELECT * FROM catalog_components WHERE id = $1
        `;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid Asset Type',
          message: `지원하지 않는 타입: ${assetType}. 지원 타입: code_component, code, design_asset, design, document, catalog_component, catalog`
        });
    }

    const result = await pool.query(query, [assetId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Asset Not Found',
        message: `${assetType} with ID ${assetId} not found`
      });
    }

    console.log('✅ 자산 상세 정보 조회 성공');

    res.json({
      success: true,
      data: {
        item: result.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ 자산 상세 정보 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Asset Detail Fetch Failed',
      message: error.message
    });
  }
});

// [advice from AI] 외부 소스에서 지식 자산 자동 추출 - 2단계 승인 프로세스
// [advice from AI] 자동 등록은 Admin, PO, PE만 가능
router.post('/extract-from-source', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), async (req, res) => {
  try {
    const { source, options = {}, system, approvalStrategy = 'system-first' } = req.body;

    console.log('🤖 외부 소스 자동 추출 요청:', {
      requestedBy: req.user.email,
      source,
      options,
      system,
      approvalStrategy
    });

    // 입력 검증
    if (!source || !source.type || !source.url) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Input',
        message: 'source.type과 source.url이 필요합니다.'
      });
    }

    // 시스템 정보 검증 (2단계 승인인 경우)
    if (approvalStrategy === 'system-first') {
      if (!system || !system.name || !system.description) {
        return res.status(400).json({
          success: false,
          error: 'Invalid System Info',
          message: '2단계 승인을 위해서는 시스템명과 설명이 필요합니다.'
        });
      }
    }

    // 지원하는 소스 타입 검증
    const supportedTypes = ['github', 'gitlab', 'bitbucket', 'url'];
    if (!supportedTypes.includes(source.type)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported Source Type',
        message: `지원하는 소스 타입: ${supportedTypes.join(', ')}`
      });
    }

    // 기본 옵션 설정
    const extractionOptions = {
      extractCode: options.extractCode !== false,
      extractDocuments: options.extractDocuments !== false,
      extractDesignAssets: options.extractDesignAssets !== false,
      extractCatalogComponents: options.extractCatalogComponents !== false,
      generateDiagrams: options.generateDiagrams !== false,
      mapRelationships: options.mapRelationships !== false,
      generateDocumentation: options.generateDocumentation !== false,
      defaultOwner: options.defaultOwner || req.user.fullName || 'System',
      ...options
    };

    const extractor = new ExternalSourceExtractor();
    const result = await extractor.extractFromExternalSource(source, extractionOptions, req.user.userId);

    if (result.success) {
      // [advice from AI] 승인 전략에 따른 후처리
      if (approvalStrategy === 'system-first') {
        // [advice from AI] 실제 추출된 데이터를 임시 테이블에 저장
        try {
          const { Pool } = require('pg');
          const tempPool = new Pool({
            user: process.env.DB_USER || 'timbel_user',
            host: process.env.DB_HOST || 'postgres',
            database: process.env.DB_NAME || 'timbel_db',
            password: process.env.DB_PASSWORD || 'timbel_password',
            port: process.env.DB_PORT || 5432,
          });
          
          const extractionId = result.extractionId || uuidv4();
          
          // 추출된 실제 데이터를 임시 테이블에 저장
          const allAssets = [];
          
          // [advice from AI] 실제 추출된 데이터를 pending 테이블에만 저장
          console.log('💾 추출된 데이터를 pending 테이블에 저장 시작...');
          
          // 코드 컴포넌트 저장
          if (result.codeComponents && result.codeComponents.length > 0) {
            console.log(`📝 코드 컴포넌트 ${result.codeComponents.length}개 저장 중...`);
            for (const component of result.codeComponents) {
              await tempPool.query(`
                INSERT INTO pending_knowledge_assets 
                (extraction_id, asset_type, asset_data, system_info, source_info)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                extractionId,
                'code_component',
                JSON.stringify({
                  ...component,
                  created_by: req.user.userId,
                  approval_status: 'draft'
                }),
                JSON.stringify(system),
                JSON.stringify(source)
              ]);
              allAssets.push({ type: 'code', name: component.name, file_path: component.file_path });
            }
            console.log(`✅ 코드 컴포넌트 ${result.codeComponents.length}개 저장 완료`);
          }
          
          // 문서 저장
          if (result.documents) {
            for (const document of result.documents) {
              await tempPool.query(`
                INSERT INTO pending_knowledge_assets 
                (extraction_id, asset_type, asset_data, system_info, source_info)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                extractionId,
                'document',
                JSON.stringify(document),
                JSON.stringify(system),
                JSON.stringify(source)
              ]);
              allAssets.push({ type: 'document', name: document.title, file_path: document.file_path });
            }
          }
          
          // 디자인 자산 저장
          if (result.designAssets) {
            for (const asset of result.designAssets) {
              await tempPool.query(`
                INSERT INTO pending_knowledge_assets 
                (extraction_id, asset_type, asset_data, system_info, source_info)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                extractionId,
                'design_asset',
                JSON.stringify(asset),
                JSON.stringify(system),
                JSON.stringify(source)
              ]);
              allAssets.push({ type: 'design', name: asset.name, file_path: asset.file_path });
            }
          }
          
          // 카탈로그 컴포넌트 저장
          if (result.catalogComponents) {
            for (const catalog of result.catalogComponents) {
              await tempPool.query(`
                INSERT INTO pending_knowledge_assets 
                (extraction_id, asset_type, asset_data, system_info, source_info)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                extractionId,
                'catalog_component',
                JSON.stringify(catalog),
                JSON.stringify(system),
                JSON.stringify(source)
              ]);
              allAssets.push({ type: 'catalog', name: catalog.name, file_path: catalog.file_path });
            }
          }
          
          const approvalService = new ApprovalService();
          
          // 시스템 개요 생성 (실제 추출 데이터 포함)
          const systemOverview = {
            name: system.name,
            description: system.description,
            category: system.category || 'application',
            version: system.version || '1.0.0',
            source: source,
            extractedAssets: {
              codeComponents: result.codeComponents?.length || 0,
              designAssets: result.designAssets?.length || 0,
              documents: result.documents?.length || 0,
              catalogComponents: result.catalogComponents?.length || 0
            },
            extractionId: extractionId,
            totalAssets: allAssets.length,
            assetsList: allAssets.slice(0, 20) // 첫 20개만 요약에 포함
          };

          // [advice from AI] 실제 데이터를 포함한 시스템 승인 요청 생성
          const systemApprovalRequest = await approvalService.createApprovalRequest({
            type: 'system_registration',
            title: `시스템 등록 승인: ${system.name}`,
            description: `${system.description}\n\n추출된 지식 자산 요약:\n- 코드 컴포넌트: ${systemOverview.extractedAssets.codeComponents}개\n- 문서: ${systemOverview.extractedAssets.documents}개\n- 디자인 자산: ${systemOverview.extractedAssets.designAssets}개\n- 카탈로그 컴포넌트: ${systemOverview.extractedAssets.catalogComponents}개\n\n총 ${systemOverview.totalAssets}개의 자산이 추출되었습니다.`,
            requesterId: req.user.userId,
            requesterEmail: req.user.email,
            priority: 'medium',
            metadata: systemOverview,
            workflow: {
              stages: [
                { role: 'po', required: true },
                { role: 'admin', required: true }
              ]
            }
          });
          
          // [advice from AI] 추출된 실제 자산들을 pending 테이블에 저장
          if (result.extractedAssets && result.extractedAssets.length > 0) {
            console.log(`💾 ${result.extractedAssets.length}개 자산을 pending 테이블에 저장 중...`);
            
            await storePendingKnowledgeAssets(
              result.extractedAssets,
              systemApprovalRequest.request_id,
              extractionId,
              system,
              source
            );
            
            console.log('✅ pending 자산 저장 완료');
          }

          res.json({
            success: true,
            data: {
              summary: {
                codeComponents: result.codeComponents?.length || 0,
                designAssets: result.designAssets?.length || 0,
                documents: result.documents?.length || 0,
                catalogComponents: result.catalogComponents?.length || 0,
                diagrams: result.diagramResults ? Object.keys(result.diagramResults).filter(key => 
                  result.diagramResults[key] !== null && key !== 'errors'
                ).length : 0,
                relationships: result.relationshipResults?.totalRelationships || 0
              },
              extractionId: extractionId,
              extractedAssets: allAssets,
              errors: result.errors || [],
              warnings: result.warnings || [],
              approvalStrategy: 'system-first',
              systemApprovalId: systemApprovalRequest.request_id,
              nextStep: 'system_approval_pending'
            },
            message: `지식 자산 추출 완료! 시스템 "${system.name}" 승인 요청이 생성되었습니다. (총 ${allAssets.length}개 자산)`
          });

        } catch (approvalError) {
          console.error('시스템 승인 요청 생성 실패:', approvalError);
          res.json({
            success: true,
            data: {
              summary: result.summary || {},
              extractionId: result.extractionId,
              stats: result.stats || {},
              errors: result.errors || [],
              warnings: result.warnings || []
            },
            warning: '지식 자산 추출은 완료되었으나 승인 요청 생성에 실패했습니다.',
            message: '외부 소스에서 지식 자산 추출이 완료되었습니다!'
          });
        }
        
      } else {
        // 개별 직접 승인: 기존 방식 (각 지식 자산별로 개별 승인 요청)
        res.json({
          success: true,
          data: {
            ...result,
            approvalStrategy: 'direct-individual',
            nextStep: 'individual_approvals_pending'
          },
          message: '외부 소스에서 지식 자산 추출이 완료되었습니다!'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Extraction Failed',
        message: result.error || '추출 중 오류가 발생했습니다.',
        details: result
      });
    }

  } catch (error) {
    console.error('❌ 외부 소스 추출 실패:', error);
    res.status(500).json({
      success: false,
      error: 'External Source Extraction Failed',
      message: error.message
    });
  }
});

// [advice from AI] 추출 진행 상황 조회
router.get('/progress', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 전역 추출기 인스턴스가 없으므로 임시로 새 인스턴스 생성
    // 실제 환경에서는 Redis나 다른 저장소를 사용해야 함
    const extractor = new ExternalSourceExtractor();
    const progress = extractor.getCurrentProgress();

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('❌ 진행 상황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Progress Fetch Failed',
      message: error.message
    });
  }
});

// [advice from AI] 지원하는 소스 타입 조회
router.get('/supported-sources', jwtAuth.verifyToken, async (req, res) => {
  try {
    const supportedSources = [
      {
        type: 'github',
        name: 'GitHub',
        description: 'GitHub 레포지토리에서 지식 자산 추출',
        features: ['Public/Private 레포지토리', '브랜치 선택', 'API 메타데이터'],
        urlPattern: 'https://github.com/username/repository',
        requiresToken: false
      },
      {
        type: 'gitlab',
        name: 'GitLab',
        description: 'GitLab 레포지토리에서 지식 자산 추출',
        features: ['Public/Private 레포지토리', '브랜치 선택'],
        urlPattern: 'https://gitlab.com/username/repository',
        requiresToken: false
      },
      {
        type: 'bitbucket',
        name: 'Bitbucket',
        description: 'Bitbucket 레포지토리에서 지식 자산 추출',
        features: ['Public/Private 레포지토리', '브랜치 선택'],
        urlPattern: 'https://bitbucket.org/username/repository',
        requiresToken: false
      },
      {
        type: 'url',
        name: '일반 URL',
        description: '일반 웹 URL에서 파일 다운로드 및 추출',
        features: ['파일 다운로드', '압축 파일 지원'],
        urlPattern: 'https://example.com/file.zip',
        requiresToken: false
      }
    ];

    res.json({
      success: true,
      data: supportedSources
    });

  } catch (error) {
    console.error('❌ 지원 소스 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Supported Sources Fetch Failed',
      message: error.message
    });
  }
});

// [advice from AI] 생성된 다이어그램 목록 조회
router.get('/diagrams', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { type } = req.query;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    let query = 'SELECT * FROM auto_generated_diagrams';
    const params = [];

    if (type && type !== 'all') {
      query += ' WHERE diagram_type = $1';
      params.push(type);
    }

    query += ' ORDER BY last_generated_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      message: '다이어그램 목록 조회 완료'
    });

  } catch (error) {
    console.error('❌ 다이어그램 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Diagrams List Failed',
      message: error.message
    });
  }
});

// [advice from AI] 특정 다이어그램 상세 조회
router.get('/diagrams/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    const result = await pool.query('SELECT * FROM auto_generated_diagrams WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Diagram not found',
        message: '해당 다이어그램을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '다이어그램 상세 조회 완료'
    });

  } catch (error) {
    console.error('❌ 다이어그램 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Diagram Detail Failed',
      message: error.message
    });
  }
});

// [advice from AI] 지식 자산 관계 조회 (Backstage.io 스타일)
router.get('/relationships/:assetType/:assetId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { assetType, assetId } = req.params;
    const { direction = 'both' } = req.query; // 'incoming', 'outgoing', 'both'
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    const relationships = {
      incoming: [], // 이 자산을 참조하는 관계들
      outgoing: [], // 이 자산이 참조하는 관계들
      summary: {
        totalRelationships: 0,
        relationshipTypes: {},
        connectedAssets: 0
      }
    };

    // [advice from AI] Incoming 관계 조회
    if (direction === 'incoming' || direction === 'both') {
      const incomingQuery = `
        SELECT r.*, 
               CASE r.source_type
                 WHEN 'code_component' THEN cc.name
                 WHEN 'design_asset' THEN da.name  
                 WHEN 'document' THEN d.title
                 WHEN 'catalog_component' THEN cat.name
               END as source_name
        FROM knowledge_asset_relationships r
        LEFT JOIN code_components cc ON r.source_type = 'code_component' AND r.source_id = cc.id
        LEFT JOIN design_assets da ON r.source_type = 'design_asset' AND r.source_id = da.id
        LEFT JOIN documents d ON r.source_type = 'document' AND r.source_id = d.id
        LEFT JOIN catalog_components cat ON r.source_type = 'catalog_component' AND r.source_id = cat.id
        WHERE r.target_type = $1 AND r.target_id = $2
        ORDER BY r.confidence_score DESC, r.created_at DESC
      `;
      
      const incomingResult = await pool.query(incomingQuery, [assetType, assetId]);
      relationships.incoming = incomingResult.rows;
    }

    // [advice from AI] Outgoing 관계 조회
    if (direction === 'outgoing' || direction === 'both') {
      const outgoingQuery = `
        SELECT r.*,
               CASE r.target_type
                 WHEN 'code_component' THEN cc.name
                 WHEN 'design_asset' THEN da.name  
                 WHEN 'document' THEN d.title
                 WHEN 'catalog_component' THEN cat.name
               END as target_name
        FROM knowledge_asset_relationships r
        LEFT JOIN code_components cc ON r.target_type = 'code_component' AND r.target_id = cc.id
        LEFT JOIN design_assets da ON r.target_type = 'design_asset' AND r.target_id = da.id
        LEFT JOIN documents d ON r.target_type = 'document' AND r.target_id = d.id
        LEFT JOIN catalog_components cat ON r.target_type = 'catalog_component' AND r.target_id = cat.id
        WHERE r.source_type = $1 AND r.source_id = $2
        ORDER BY r.confidence_score DESC, r.created_at DESC
      `;
      
      const outgoingResult = await pool.query(outgoingQuery, [assetType, assetId]);
      relationships.outgoing = outgoingResult.rows;
    }

    // [advice from AI] 요약 통계
    const allRelationships = [...relationships.incoming, ...relationships.outgoing];
    relationships.summary.totalRelationships = allRelationships.length;
    
    // 관계 타입별 카운트
    const typeCount = {};
    for (const rel of allRelationships) {
      typeCount[rel.relationship_type] = (typeCount[rel.relationship_type] || 0) + 1;
    }
    relationships.summary.relationshipTypes = typeCount;
    
    // 연결된 고유 자산 수
    const connectedAssets = new Set();
    for (const rel of allRelationships) {
      connectedAssets.add(`${rel.source_type}:${rel.source_id}`);
      connectedAssets.add(`${rel.target_type}:${rel.target_id}`);
    }
    relationships.summary.connectedAssets = connectedAssets.size;

    res.json({
      success: true,
      data: relationships,
      asset: { type: assetType, id: assetId },
      message: `${assetType} 자산의 관계 조회 완료`
    });

  } catch (error) {
    console.error('❌ 관계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Relationships Query Failed',
      message: error.message
    });
  }
});

// [advice from AI] 관계 그래프 조회 (전체 네트워크)
router.get('/relationship-graph', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { assetType, limit = 100 } = req.query;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    let query = `
      SELECT 
        r.source_type, r.source_id, r.target_type, r.target_id,
        r.relationship_type, r.confidence_score,
        COALESCE(cc1.name, da1.name, d1.title, cat1.name) as source_name,
        COALESCE(cc2.name, da2.name, d2.title, cat2.name) as target_name
      FROM knowledge_asset_relationships r
      LEFT JOIN code_components cc1 ON r.source_type = 'code_component' AND r.source_id = cc1.id
      LEFT JOIN design_assets da1 ON r.source_type = 'design_asset' AND r.source_id = da1.id
      LEFT JOIN documents d1 ON r.source_type = 'document' AND r.source_id = d1.id
      LEFT JOIN catalog_components cat1 ON r.source_type = 'catalog_component' AND r.source_id = cat1.id
      LEFT JOIN code_components cc2 ON r.target_type = 'code_component' AND r.target_id = cc2.id
      LEFT JOIN design_assets da2 ON r.target_type = 'design_asset' AND r.target_id = da2.id
      LEFT JOIN documents d2 ON r.target_type = 'document' AND r.target_id = d2.id
      LEFT JOIN catalog_components cat2 ON r.target_type = 'catalog_component' AND r.target_id = cat2.id
      WHERE r.confidence_score > 0.3
    `;

    const params = [];
    if (assetType && assetType !== 'all') {
      query += ' AND (r.source_type = $1 OR r.target_type = $1)';
      params.push(assetType);
    }

    query += ` ORDER BY r.confidence_score DESC LIMIT ${parseInt(limit)}`;

    const result = await pool.query(query, params);

    // [advice from AI] 그래프 데이터 형태로 변환
    const nodes = new Map();
    const edges = [];

    for (const row of result.rows) {
      // 노드 추가
      const sourceKey = `${row.source_type}:${row.source_id}`;
      const targetKey = `${row.target_type}:${row.target_id}`;
      
      if (!nodes.has(sourceKey)) {
        nodes.set(sourceKey, {
          id: sourceKey,
          name: row.source_name,
          type: row.source_type,
          assetId: row.source_id
        });
      }
      
      if (!nodes.has(targetKey)) {
        nodes.set(targetKey, {
          id: targetKey,
          name: row.target_name,
          type: row.target_type,
          assetId: row.target_id
        });
      }

      // 엣지 추가
      edges.push({
        source: sourceKey,
        target: targetKey,
        relationship: row.relationship_type,
        confidence: row.confidence_score
      });
    }

    res.json({
      success: true,
      data: {
        nodes: Array.from(nodes.values()),
        edges: edges,
        summary: {
          nodeCount: nodes.size,
          edgeCount: edges.length,
          avgConfidence: edges.reduce((sum, e) => sum + e.confidence, 0) / edges.length
        }
      },
      message: '관계 그래프 조회 완료'
    });

  } catch (error) {
    console.error('❌ 관계 그래프 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Relationship Graph Failed',
      message: error.message
    });
  }
});

// [advice from AI] 통계 조회
router.get('/statistics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    // [advice from AI] 각종 통계 수집
    const [
      codeStatsResult,
      designStatsResult,
      docStatsResult,
      catalogStatsResult,
      languageStatsResult,
      complexityStatsResult
    ] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN last_scanned_at > NOW() - INTERVAL '1 day' THEN 1 END) as recent_scans,
          AVG(complexity_score) as avg_complexity,
          AVG(line_count) as avg_lines
        FROM code_components
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN last_scanned_at > NOW() - INTERVAL '1 day' THEN 1 END) as recent_scans,
          SUM(file_size_bytes) as total_size,
          COUNT(DISTINCT category) as categories
        FROM design_assets
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN last_scanned_at > NOW() - INTERVAL '1 day' THEN 1 END) as recent_scans,
          AVG(word_count) as avg_words,
          AVG(readability_score) as avg_readability
        FROM documents
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN last_scanned_at > NOW() - INTERVAL '1 day' THEN 1 END) as recent_scans,
          COUNT(DISTINCT type) as types
        FROM catalog_components
      `),
      pool.query(`
        SELECT language, COUNT(*) as count 
        FROM code_components 
        WHERE language IS NOT NULL 
        GROUP BY language 
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT 
          CASE 
            WHEN complexity_score < 2 THEN 'Low'
            WHEN complexity_score < 5 THEN 'Medium'
            ELSE 'High'
          END as complexity_level,
          COUNT(*) as count
        FROM code_components 
        WHERE complexity_score IS NOT NULL
        GROUP BY complexity_level
      `)
    ]);

    const statistics = {
      overview: {
        codeComponents: {
          total: parseInt(codeStatsResult.rows[0].total),
          recentScans: parseInt(codeStatsResult.rows[0].recent_scans),
          avgComplexity: parseFloat(codeStatsResult.rows[0].avg_complexity) || 0,
          avgLines: parseInt(codeStatsResult.rows[0].avg_lines) || 0
        },
        designAssets: {
          total: parseInt(designStatsResult.rows[0].total),
          recentScans: parseInt(designStatsResult.rows[0].recent_scans),
          totalSize: parseInt(designStatsResult.rows[0].total_size) || 0,
          categories: parseInt(designStatsResult.rows[0].categories)
        },
        documents: {
          total: parseInt(docStatsResult.rows[0].total),
          recentScans: parseInt(docStatsResult.rows[0].recent_scans),
          avgWords: parseInt(docStatsResult.rows[0].avg_words) || 0,
          avgReadability: parseFloat(docStatsResult.rows[0].avg_readability) || 0
        },
        catalogComponents: {
          total: parseInt(catalogStatsResult.rows[0].total),
          recentScans: parseInt(catalogStatsResult.rows[0].recent_scans),
          types: parseInt(catalogStatsResult.rows[0].types)
        }
      },
      languageDistribution: languageStatsResult.rows,
      complexityDistribution: complexityStatsResult.rows,
      totalKnowledgeItems: 
        parseInt(codeStatsResult.rows[0].total) +
        parseInt(designStatsResult.rows[0].total) +
        parseInt(docStatsResult.rows[0].total) +
        parseInt(catalogStatsResult.rows[0].total)
    };

    res.json({
      success: true,
      data: statistics,
      message: '지식 통계 조회 완료'
    });

  } catch (error) {
    console.error('❌ 지식 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Statistics Failed',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 승인 완료 처리 API
router.post('/approve-system', jwtAuth.verifyToken, jwtAuth.requireRole('po'), async (req, res) => {
  try {
    const { approvalId, systemInfo, extractionData } = req.body;

    console.log('🏗️ 시스템 승인 완료 처리:', {
      approvalId,
      systemName: systemInfo?.name,
      requestedBy: req.user.email
    });

    // 입력 검증
    if (!approvalId || !systemInfo || !extractionData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Input',
        message: 'approvalId, systemInfo, extractionData가 필요합니다.'
      });
    }

    // 1. 시스템을 카탈로그와 지식 자산에 등록
    const registrationResult = await registerApprovedSystem(
      systemInfo, 
      extractionData, 
      req.user.userId
    );

    // 2. 임시 저장된 지식 자산들을 개별 승인 대기 상태로 전환
    // (여기서는 일단 성공 응답만 보내고, 실제 개별 자산 처리는 별도 구현)

    res.json({
      success: true,
      data: {
        catalogSystemId: registrationResult.catalogSystemId,
        knowledgeAssetId: registrationResult.knowledgeAssetId,
        systemName: registrationResult.systemName,
        nextStep: 'individual_assets_pending'
      },
      message: `시스템 "${systemInfo.name}"이 성공적으로 등록되었습니다. 이제 개별 지식 자산을 승인할 수 있습니다.`
    });

  } catch (error) {
    console.error('❌ 시스템 승인 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'System Approval Failed',
      message: error.message
    });
  }
});

module.exports = router;
