// [advice from AI] 지식자원 카탈로그 API 라우트 - 실제 테이블 구조 기반 완전 수정
const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwtAuth = require('../middleware/jwtAuth');
const advancedPermissions = require('./advanced-permissions');
const { createCacheMiddleware, createCacheInvalidationMiddleware } = require('../middleware/cacheMiddleware-optimized');
const RepositoryAnalyzer = require('../services/git/RepositoryAnalyzer');
const GitServiceFactory = require('../services/git/GitServiceFactory');
const ComponentAnalyzer = require('../services/ComponentAnalyzer');

const router = express.Router();

// [advice from AI] 시간 관련 유틸리티 함수
function getRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffInSeconds = Math.floor((now - then) / 1000);
  
  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  return then.toLocaleDateString('ko-KR');
}

// [advice from AI] 데이터베이스 연결 풀 - 두 개의 DB 연결
const knowledgePool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_knowledge', // 지식자원 DB
  password: 'timbel_password',
  port: 5432,
});

const operationsPool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_cicd_operator', // 운영센터 DB
  password: 'timbel_password',
  port: 5432,
});

// 하위 호환성을 위한 기본 pool
const pool = knowledgePool;

// [advice from AI] 파일 업로드를 위한 multer 설정
const uploadDir = path.join(__dirname, '../../uploads/documents');

// uploads 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 파일명: timestamp_originalname
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${timestamp}_${name}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 제한
  },
  fileFilter: function (req, file, cb) {
    // 허용되는 파일 타입
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다. PDF, DOC, DOCX, TXT, MD, HTML, JSON 파일만 업로드 가능합니다.'));
    }
  }
});

// [advice from AI] 레포지토리 분석기 인스턴스
const repositoryAnalyzer = new RepositoryAnalyzer();

// [advice from AI] 카탈로그 통계 조회 - 실제 데이터 기반
router.get('/catalog-stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 각 카테고리별 실제 통계 조회
    const domainsCount = await pool.query('SELECT COUNT(*) as count FROM domains');
    const projectsCount = await pool.query('SELECT COUNT(*) as count FROM projects');
    const systemsCount = await pool.query('SELECT COUNT(*) as count FROM systems');
    const codeCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type = $1', ['code']);
    const designCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type = $1', ['design']);
    const documentsCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type = $1', ['document']);

    // 최근 활동 조회 - 실제 솔루션 활동 통합 (지식자원 + 운영센터)
    const knowledgeActivities = await knowledgePool.query(`
      (
      SELECT 
          ka.id::text,
          'knowledge_asset' as activity_type,
          ka.asset_type as sub_type,
          CONCAT('지식자산 생성: ', ka.title) as title,
        'created' as action,
        u.full_name as user,
        ka.created_at as timestamp
      FROM knowledge_assets ka
        LEFT JOIN timbel_users u ON ka.author_id = u.id
      WHERE ka.created_at >= NOW() - INTERVAL '7 days'
      )
      UNION ALL
      (
        SELECT 
          p.id::text,
          'project' as activity_type,
          'project' as sub_type,
          CONCAT('프로젝트 생성: ', p.name) as title,
          'created' as action,
          u.full_name as user,
          p.created_at as timestamp
        FROM projects p
        LEFT JOIN timbel_users u ON p.created_by = u.id
        WHERE p.created_at >= NOW() - INTERVAL '7 days'
      )
      UNION ALL
      (
        SELECT 
          s.id::text,
          'system' as activity_type,
          'system' as sub_type,
          CONCAT('시스템 등록: ', s.name) as title,
          'created' as action,
          u.full_name as user,
          s.created_at as timestamp
        FROM systems s
        LEFT JOIN timbel_users u ON s.author_id = u.id
        WHERE s.created_at >= NOW() - INTERVAL '7 days'
      )
      ORDER BY timestamp DESC
      LIMIT 5
    `);

    // 운영센터 활동 조회 (CI/CD, 배포, 이슈)
    const operationsActivities = await operationsPool.query(`
      (
        SELECT 
          jj.id::text,
          'jenkins_build' as activity_type,
          'build' as sub_type,
          CONCAT('Jenkins 빌드: ', jj.job_name) as title,
          CASE jj.job_status 
            WHEN 'success' THEN 'completed'
            WHEN 'failure' THEN 'failed'
            ELSE 'started'
          END as action,
          'Jenkins' as user,
          jj.created_at as timestamp
        FROM jenkins_jobs jj
        WHERE jj.created_at >= NOW() - INTERVAL '7 days'
      )
      UNION ALL
      (
        SELECT 
          od.id::text,
          'deployment' as activity_type,
          'deployment' as sub_type,
          CONCAT('배포 ', od.deployment_status, ': ', od.project_name) as title,
          od.deployment_status as action,
          od.deployed_by as user,
          od.created_at as timestamp
        FROM operations_deployments od
        WHERE od.created_at >= NOW() - INTERVAL '7 days'
      )
      UNION ALL
      (
        SELECT 
          i.id::text,
          'issue' as activity_type,
          i.issue_type as sub_type,
          CONCAT('이슈 ', i.status, ': ', i.title) as title,
          i.status as action,
          i.reported_by as user,
          i.created_at as timestamp
        FROM issues i
        WHERE i.created_at >= NOW() - INTERVAL '7 days'
      )
      ORDER BY timestamp DESC
      LIMIT 5
    `);

    // 두 DB의 활동을 합쳐서 정렬
    const allActivities = [...knowledgeActivities.rows, ...operationsActivities.rows]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // 인기 자원 조회 (실제 다운로드 수 기준)
    const popularResources = await pool.query(`
      SELECT 
        ka.id,
        ka.asset_type as type,
        ka.title,
        ka.category,
        COALESCE(ka.download_count, 0) as views,
        0 as stars
      FROM knowledge_assets ka
      WHERE ka.is_public = true
      ORDER BY ka.download_count DESC, ka.created_at DESC
      LIMIT 10
    `);

    const stats = {
      domains: parseInt(domainsCount.rows[0].count) || 0,
      projects: parseInt(projectsCount.rows[0].count) || 0,
      systems: parseInt(systemsCount.rows[0].count) || 0,
      codeComponents: parseInt(codeCount.rows[0].count) || 0,
      designAssets: parseInt(designCount.rows[0].count) || 0,
      documents: parseInt(documentsCount.rows[0].count) || 0
    };

    const formattedActivities = allActivities.map(activity => ({
      id: activity.id,
      type: activity.activity_type,
      subType: activity.sub_type,
      title: activity.title,
      action: activity.action,
      user: activity.user || '시스템',
      timestamp: getRelativeTime(activity.timestamp)
    }));

    const formattedResources = popularResources.rows.map(resource => ({
      id: resource.id,
      type: resource.type,
      title: resource.title,
      views: resource.views || 0,
      stars: resource.stars || 0,
      category: resource.category || 'General'
    }));

    // [advice from AI] 실제 통계 데이터 사용
    res.json({
      success: true,
      stats,
      recentActivities: formattedActivities,
      popularResources: formattedResources
    });

  } catch (error) {
    console.error('카탈로그 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 도메인 목록 조회 - 실제 테이블 구조 기반
router.get('/domains', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.name,
        d.description,
        d.company_type,
        d.industry,
        d.contact_person,
        d.contact_email,
        d.is_active,
        COUNT(p.id) as projects_count,
        d.created_at,
        d.updated_at
      FROM domains d
      LEFT JOIN projects p ON d.id = p.domain_id
      GROUP BY d.id, d.name, d.description, d.company_type, d.industry, d.contact_person, d.contact_email, d.is_active, d.created_at, d.updated_at
      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      domains: result.rows
    });

  } catch (error) {
    console.error('도메인 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '도메인 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 도메인 생성 - 실제 테이블 구조 기반
router.post('/domains', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_domains'), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      company_type, 
      industry, 
      contact_person, 
      contact_email, 
      contact_phone,
      address
    } = req.body;

    // 필수 필드 검증
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: '필수 필드 누락',
        message: '도메인 이름과 설명은 필수입니다.'
      });
    }

    const result = await pool.query(`
      INSERT INTO domains (
        name, description, company_type, industry, contact_person, 
        contact_email, contact_phone, address, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [
      name, 
      description, 
      company_type || '', 
      industry || '', 
      contact_person || '', 
      contact_email || '', 
      contact_phone || '',
      address || ''
    ]);

    res.json({
      success: true,
      domain: result.rows[0],
      message: '도메인이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('도메인 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '도메인 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 목록 조회 - 실제 테이블 구조 기반
router.get('/projects', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.customer_company,
        p.requirements,
        p.expected_duration,
        p.budget,
        p.priority,
        p.status,
        p.domain_id,
        p.urgency_level,
        p.deadline,
        p.target_system_name,
        p.design_requirements,
        p.total_systems,
        p.total_components,
        p.total_assets,
        d.name as domain_name,
        u.full_name as created_by_name,
        po.full_name as po_name,
        p.created_at,
        p.updated_at
      FROM projects p
      LEFT JOIN domains d ON p.domain_id = d.id
      LEFT JOIN timbel_users u ON p.created_by = u.id
      LEFT JOIN timbel_users po ON p.assigned_po = po.id
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      projects: result.rows
    });

  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 도메인 수정 - 실제 테이블 구조 기반
router.put('/domains/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_domains'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      company_type, 
      industry, 
      contact_person, 
      contact_email, 
      contact_phone,
      address
    } = req.body;

    // 필수 필드 검증
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: '필수 필드 누락',
        message: '도메인 이름과 설명은 필수입니다.'
      });
    }

    const result = await pool.query(`
      UPDATE domains SET
        name = $1, description = $2, company_type = $3, industry = $4,
        contact_person = $5, contact_email = $6, contact_phone = $7, address = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      name, 
      description, 
      company_type || '', 
      industry || '', 
      contact_person || '', 
      contact_email || '', 
      contact_phone || '',
      address || '',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '도메인을 찾을 수 없습니다.',
        message: '해당 도메인이 존재하지 않습니다.'
      });
    }

    res.json({
      success: true,
      domain: result.rows[0],
      message: '도메인이 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('도메인 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '도메인 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 도메인 삭제 - 실제 테이블 구조 기반
router.delete('/domains/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_domains'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM domains WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '도메인을 찾을 수 없습니다.',
        message: '해당 도메인이 존재하지 않습니다.'
      });
    }

    res.json({
      success: true,
      message: '도메인이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('도메인 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '도메인 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 생성 - 실제 테이블 구조 기반
router.post('/projects', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_projects'), async (req, res) => {
  try {
    console.log('🔍 프로젝트 생성 요청 받음:', req.body);
    
    const { 
      name, 
      description, 
      customer_company, 
      requirements, 
      expected_duration, 
      budget, 
      priority, 
      status, 
      domain_id, 
      urgency_level, 
      deadline, 
      target_system_name,
      // 개발자를 위한 상세 정보
      tech_stack,
      dev_environment,
      api_specs,
      database_info,
      performance_security,
      special_notes,
      // 긴급 개발 관련
      is_urgent_development,
      urgent_reason,
      expected_completion_hours
    } = req.body;
    
    console.log('🔍 파싱된 필드들:', {
      name, description, customer_company, requirements, 
      expected_duration, budget, priority, status, domain_id,
      urgency_level, deadline, target_system_name
    });

    // 필수 필드 검증
    if (!name || !description) {
      console.log('❌ 필수 필드 누락:', { name: !!name, description: !!description });
      return res.status(400).json({
        success: false,
        error: '필수 필드 누락',
        message: '프로젝트 이름과 설명은 필수입니다.'
      });
    }

    console.log('🔍 데이터베이스 INSERT 시작');
    
    // 개발자 정보와 긴급 개발 정보를 JSONB로 저장
    const designRequirements = {
      tech_stack: tech_stack || '',
      dev_environment: dev_environment || '',
      api_specs: api_specs || '',
      database_info: database_info || '',
      performance_security: performance_security || '',
      special_notes: special_notes || '',
      urgent_development: {
        is_urgent: is_urgent_development || false,
        reason: urgent_reason || '',
        expected_hours: expected_completion_hours || null
      }
    };
    
    const result = await pool.query(`
        INSERT INTO projects (
        name, description, customer_company, requirements, 
        expected_duration, budget, priority, status, domain_id,
        urgency_level, deadline, target_system_name, created_by, design_requirements
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        name, 
      description, 
      customer_company || '', 
      requirements || '', 
      expected_duration || null, 
      budget || null, 
      priority || 'medium', 
      status || 'planning', 
      domain_id || null,
      urgency_level || 'medium',
      deadline || null,
      target_system_name || '',
      req.user.id, // created_by 필드 추가
      JSON.stringify(designRequirements) // design_requirements JSONB 필드
    ]);

    console.log('✅ 프로젝트 생성 성공:', result.rows[0]);
    res.json({
      success: true,
      project: result.rows[0],
      message: '프로젝트가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('❌ 프로젝트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 수정
router.put('/projects/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_projects'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 프로젝트 수정 요청:', id);
    console.log('🔍 수정할 데이터:', req.body);

    const {
      name,
      description,
      customer_company,
      requirements,
      expected_duration,
      budget,
      priority,
      status,
        domain_id, 
        urgency_level, 
        deadline, 
        target_system_name,
      // 개발자를 위한 상세 정보
      tech_stack,
      dev_environment,
      api_specs,
      database_info,
      performance_security,
      special_notes,
      // 긴급 개발 관련
      is_urgent_development,
      urgent_reason,
      expected_completion_hours
    } = req.body;

    // 필수 필드 검증
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: '필수 필드 누락',
        message: '프로젝트 이름과 설명은 필수입니다.'
      });
    }

    // 프로젝트 존재 확인
    const projectCheck = await pool.query('SELECT id, name FROM projects WHERE id = $1', [id]);
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다.',
        message: '해당 ID의 프로젝트가 존재하지 않습니다.'
      });
    }

    // 개발자 정보와 긴급 개발 정보를 JSONB로 저장
    const designRequirements = {
      tech_stack: tech_stack || '',
      dev_environment: dev_environment || '',
      api_specs: api_specs || '',
      database_info: database_info || '',
      performance_security: performance_security || '',
      special_notes: special_notes || '',
      urgent_development: {
        is_urgent: is_urgent_development || false,
        reason: urgent_reason || '',
        expected_hours: expected_completion_hours ? parseInt(expected_completion_hours) : null
      }
    };

    // 프로젝트 수정
    const result = await pool.query(`
      UPDATE projects SET
        name = $1,
        description = $2,
        customer_company = $3,
        requirements = $4,
        expected_duration = $5,
        budget = $6,
        priority = $7,
        status = $8,
        domain_id = $9,
        urgency_level = $10,
        deadline = $11,
        target_system_name = $12,
        design_requirements = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      name,
      description,
      customer_company || '',
      requirements || '',
      expected_duration ? parseInt(expected_duration) : null,
      budget ? parseInt(budget) : null,
      priority || 'medium',
      status || 'planning',
      domain_id || null,
      urgency_level || 'medium',
      deadline || null,
      target_system_name || '',
      JSON.stringify(designRequirements),
      id
    ]);

    console.log('✅ 프로젝트 수정 성공:', result.rows[0]);

      res.json({
        success: true,
      project: result.rows[0],
      message: '프로젝트가 성공적으로 수정되었습니다.'
      });

    } catch (error) {
    console.error('❌ 프로젝트 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 삭제
router.delete('/projects/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_projects'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 프로젝트 삭제 요청:', id);
    
    // 프로젝트 존재 확인
    const projectCheck = await pool.query('SELECT id, name FROM projects WHERE id = $1', [id]);
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다.',
        message: '해당 ID의 프로젝트가 존재하지 않습니다.'
      });
    }
    
    const projectName = projectCheck.rows[0].name;
    
    // 프로젝트 삭제
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    
    console.log('✅ 프로젝트 삭제 성공:', projectName);

    res.json({
      success: true,
      message: `프로젝트 "${projectName}"이 성공적으로 삭제되었습니다.`
    });

  } catch (error) {
    console.error('❌ 프로젝트 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 목록 조회 - 실제 테이블 구조 기반
router.get('/systems', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.system_type,
        s.technology_stack,
        s.repository_url,
        s.documentation_url,
        s.demo_url,
        s.status,
        s.version,
        s.project_id,
        p.name as project_name,
        u.full_name as author_name,
        
        -- 연결된 자원
        COALESCE(c.components_count, 0) as components_count,
        COALESCE(a.apis_count, 0) as apis_count,
        
        s.created_at,
        s.updated_at
      FROM systems s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN timbel_users u ON s.author_id = u.id
      LEFT JOIN (
        SELECT system_id, COUNT(*) as components_count
        FROM components 
        GROUP BY system_id
      ) c ON s.id = c.system_id
      LEFT JOIN (
        SELECT system_id, COUNT(*) as apis_count
        FROM apis 
        GROUP BY system_id
      ) a ON s.id = a.system_id
      ORDER BY s.created_at DESC
    `);

    // technology_stack JSON 배열을 문자열 배열로 변환
    const systems = result.rows.map(system => ({
      ...system,
      technology_stack: system.technology_stack || []
    }));

    res.json({
      success: true,
      systems
    });

  } catch (error) {
    console.error('시스템 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 메트릭 조회 - 실제 데이터 기반
router.get('/systems/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const totalSystems = await pool.query('SELECT COUNT(*) as count FROM systems');
    const activeSystems = await pool.query("SELECT COUNT(*) as count FROM systems WHERE status IN ('development', 'deployed')");
    const completedSystems = await pool.query("SELECT COUNT(*) as count FROM systems WHERE status = 'completed'");
    const developmentSystems = await pool.query("SELECT COUNT(*) as count FROM systems WHERE status = 'development'");

    // 시스템 타입별 분류
    const typeBreakdown = await pool.query(`
      SELECT system_type, COUNT(*) as count 
      FROM systems 
      WHERE system_type IS NOT NULL
      GROUP BY system_type
    `);

    // 상태별 분류
    const statusBreakdown = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM systems 
      GROUP BY status
    `);

    const metrics = {
      totalSystems: parseInt(totalSystems.rows[0].count) || 0,
      activeSystems: parseInt(activeSystems.rows[0].count) || 0,
      completedSystems: parseInt(completedSystems.rows[0].count) || 0,
      developmentSystems: parseInt(developmentSystems.rows[0].count) || 0,
      typeBreakdown: typeBreakdown.rows.reduce((acc, row) => {
        acc[row.system_type || 'Unknown'] = parseInt(row.count);
        return acc;
      }, {}),
      statusBreakdown: statusBreakdown.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('시스템 메트릭 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 메트릭 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 카탈로그 통계 API - 완전히 새로운 구현
router.get('/catalog-stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📊 새로운 카탈로그 통계 API 호출');
    
    // [advice from AI] 실제 데이터베이스 쿼리로 통계 수집
    const stats = {};
    
    // 도메인 수 조회
    const domainsResult = await pool.query('SELECT COUNT(*) FROM domains');
    stats.domains = parseInt(domainsResult.rows[0].count);
    
    // 프로젝트 수 조회
    const projectsResult = await pool.query('SELECT COUNT(*) FROM projects');
    stats.projects = parseInt(projectsResult.rows[0].count);
    
    // 시스템 수 조회
    const systemsResult = await pool.query('SELECT COUNT(*) FROM systems');
    stats.systems = parseInt(systemsResult.rows[0].count);
    
    // 코드 컴포넌트 수 조회 (components 테이블 + knowledge_assets의 component 타입)
    const codeComponentsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM components) + 
        (SELECT COUNT(*) FROM knowledge_assets WHERE asset_type = 'component') as count
    `);
    stats.codeComponents = parseInt(codeComponentsResult.rows[0].count);
    
    // 디자인 자산 수 조회
    const designAssetsResult = await pool.query("SELECT COUNT(*) FROM knowledge_assets WHERE asset_type = 'design'");
    stats.designAssets = parseInt(designAssetsResult.rows[0].count);
    
    // 문서/가이드 수 조회
    const documentsResult = await pool.query("SELECT COUNT(*) FROM knowledge_assets WHERE asset_type IN ('document', 'guide', 'api_guide')");
    stats.documents = parseInt(documentsResult.rows[0].count);

    console.log('📊 반환할 stats:', stats);

    // 최근 활동 (최근 생성된 컴포넌트들)
    const recentActivitiesResult = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.created_at,
        'code' as type,
        u.full_name as author_name
      FROM components c
      LEFT JOIN timbel_users u ON c.author_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    const recentActivities = recentActivitiesResult.rows.map(row => ({
      id: row.id,
      title: row.name,
      type: row.type,
      author: row.author_name,
      createdAt: row.created_at
    }));

    // 인기 리소스 (재사용 가능한 컴포넌트들)
    const popularResourcesResult = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.component_type,
        c.is_reusable,
        c.created_at
      FROM components c
      WHERE c.is_reusable = true
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    const popularResources = popularResourcesResult.rows.map(row => ({
      id: row.id,
      title: row.name,
      description: row.description,
      type: row.component_type,
      usageCount: 0 // TODO: 실제 사용 횟수 추적 기능 추가
    }));

    res.json({
      success: true,
      stats,
      recentActivities,
      popularResources
    });

  } catch (error) {
    console.error('카탈로그 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 수정
router.put('/code-components/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_components'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      system_id, 
      type, 
      language, 
      framework, 
      status, 
      version, 
      repository_url, 
      documentation_url, 
      npm_package, 
      dependencies, 
      license 
    } = req.body;

    // 필수 필드 검증
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: '컴포넌트명과 설명은 필수입니다.'
      });
    }

    console.log('📝 코드 컴포넌트 수정 요청:', { id, name, type, language, framework });

    // 코드 컴포넌트 수정
    const result = await pool.query(`
      UPDATE components SET
        name = $1,
        description = $2,
        system_id = $3,
        component_type = $4,
        technology = $5,
        repository_url = $6,
        documentation = $7,
        version = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      name,
      description,
      system_id,
      type || 'ui',
      `${language || 'JavaScript'},${framework || 'React'}`,
      repository_url,
      documentation_url || '',
      version || '1.0.0',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '컴포넌트를 찾을 수 없습니다.'
      });
    }

    const updatedComponent = result.rows[0];

    res.json({
      success: true,
      component: updatedComponent
    });

  } catch (error) {
    console.error('코드 컴포넌트 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 삭제
router.delete('/code-components/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_components'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ 코드 컴포넌트 삭제 요청:', { id });

    // 코드 컴포넌트 삭제
    const result = await pool.query(`
      DELETE FROM components 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '컴포넌트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '컴포넌트가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('코드 컴포넌트 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 상세 조회
router.get('/code-components/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.component_type,
        c.technology,
        c.repository_url,
        c.documentation,
        c.version,
        c.is_reusable,
        s.name as system_name,
        u.full_name as author_name,
        c.created_at,
        c.updated_at
      FROM components c
      LEFT JOIN systems s ON c.system_id = s.id
      LEFT JOIN timbel_users u ON c.author_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '컴포넌트를 찾을 수 없습니다.'
      });
    }

    const component = result.rows[0];
    
    // technology 필드를 파싱해서 language, framework, dependencies 추출
    const techParts = component.technology ? component.technology.split(',') : ['JavaScript', 'React'];
    const processedComponent = {
      ...component,
      language: techParts[0] || 'JavaScript',
      framework: techParts[1] || 'React',
      dependencies: techParts.slice(2) || [],
      documentation_url: component.documentation || ''
    };

    res.json({
      success: true,
      component: processedComponent
    });

  } catch (error) {
    console.error('코드 컴포넌트 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 상세 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 생성
router.post('/code-components', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_components'), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      system_id, 
      type, 
      language, 
      framework, 
      status, 
      version, 
      repository_url, 
      documentation_url, 
      npm_package, 
      dependencies, 
      license 
    } = req.body;

    // 필수 필드 검증
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: '컴포넌트명과 설명은 필수입니다.'
      });
    }

    console.log('📝 코드 컴포넌트 등록 요청:', { name, type, language, framework });

    // 시스템 ID가 없으면 기본 시스템 사용
    let systemId = system_id;
    if (!systemId) {
      const systemResult = await pool.query('SELECT id FROM systems LIMIT 1');
      if (systemResult.rows.length > 0) {
        systemId = systemResult.rows[0].id;
      }
    }

    // 코드 컴포넌트 등록
    const result = await pool.query(`
      INSERT INTO components (
        name, description, system_id, author_id, component_type, technology,
        repository_url, documentation, version, is_reusable
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `, [
      name,
      description,
      systemId,
      req.user.id,
      type || 'ui',
      `${language || 'JavaScript'},${framework || 'React'}`,
      repository_url,
      documentation_url || '',
      version || '1.0.0',
      true
    ]);

    const newComponent = result.rows[0];

    res.status(201).json({
      success: true,
      component: newComponent
    });

  } catch (error) {
    console.error('코드 컴포넌트 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 등록 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 목록 조회 - 실제 테이블 구조 기반
router.get('/code-components', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.component_type,
        c.technology,
        c.repository_url,
        c.documentation,
        c.version,
        c.is_reusable,
        s.name as system_name,
        u.full_name as author_name,
        c.created_at,
        c.updated_at
      FROM components c
      LEFT JOIN systems s ON c.system_id = s.id
      LEFT JOIN timbel_users u ON c.author_id = u.id
      ORDER BY c.created_at DESC
    `);

    // technology 필드를 파싱해서 language, framework, dependencies 추출
    const components = result.rows.map(component => {
      const techParts = component.technology ? component.technology.split(',') : ['JavaScript', 'React'];
      return {
      ...component,
        language: techParts[0] || 'JavaScript',
        framework: techParts[1] || 'React',
        dependencies: techParts.slice(2) || [],
        documentation_url: component.documentation || ''
      };
    });

    res.json({
      success: true,
      components
    });

  } catch (error) {
    console.error('코드 컴포넌트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 메트릭
router.get('/code-components/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const totalComponents = await pool.query('SELECT COUNT(*) as count FROM components');
    const reusableComponents = await pool.query("SELECT COUNT(*) as count FROM components WHERE is_reusable = true");
    
    const typeBreakdown = await pool.query(`
      SELECT component_type, COUNT(*) as count 
      FROM components 
      WHERE component_type IS NOT NULL
      GROUP BY component_type
    `);

    const technologyBreakdown = await pool.query(`
      SELECT technology, COUNT(*) as count 
      FROM components 
      WHERE technology IS NOT NULL
      GROUP BY technology
      ORDER BY count DESC
      LIMIT 10
    `);

    const metrics = {
      totalComponents: parseInt(totalComponents.rows[0].count) || 0,
      reusableComponents: parseInt(reusableComponents.rows[0].count) || 0,
      typeBreakdown: typeBreakdown.rows.reduce((acc, row) => {
        acc[row.component_type] = parseInt(row.count);
        return acc;
      }, {}),
      technologyBreakdown: technologyBreakdown.rows.reduce((acc, row) => {
        acc[row.technology] = parseInt(row.count);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('코드 컴포넌트 메트릭 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 메트릭 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 디자인 자산 생성
router.post('/design-assets', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_designs'), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      asset_type, 
      design_tool, 
      file_format, 
      tags, 
      status, 
      version, 
      file_url, 
      preview_url 
    } = req.body;

    // 필수 필드 검증
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: '자산명과 설명은 필수입니다.'
      });
    }

    console.log('📝 디자인 자산 등록 요청:', { title, asset_type, design_tool });

    // 디자인 자산 등록 (knowledge_assets 테이블 사용)
    const result = await pool.query(`
        INSERT INTO knowledge_assets (
        title, description, asset_type, author_id, 
        file_path, file_url, category, tags, 
        download_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *
    `, [
      title,
        description, 
      asset_type || 'component',
      req.user.id,
      file_url || '',
      file_url || '',
      design_tool || 'figma',
      JSON.stringify(tags || []),
      0
    ]);

    const newAsset = result.rows[0];

    res.status(201).json({
      success: true,
      asset: newAsset
    });

  } catch (error) {
    console.error('디자인 자산 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '디자인 자산 등록 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 디자인 자산 목록 조회
router.get('/design-assets', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ka.id,
        ka.title,
        ka.description,
        ka.asset_type,
        ka.file_path,
        ka.file_url,
        ka.category,
        ka.tags,
        u.full_name as author,
        ka.download_count,
        ka.created_at,
        ka.updated_at
      FROM knowledge_assets ka
      LEFT JOIN timbel_users u ON ka.author_id = u.id
      WHERE ka.asset_type IN ('component', 'icon', 'color_palette', 'typography', 'layout', 'template')
      ORDER BY ka.created_at DESC
    `);

      res.json({
        success: true,
      assets: result.rows
      });

    } catch (error) {
    console.error('디자인 자산 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '디자인 자산 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 디자인 자산 메트릭
router.get('/design-assets/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const totalAssets = await pool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type = 'design'");
    const publicAssets = await pool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type = 'design' AND is_public = true");
    
    const categoryBreakdown = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM knowledge_assets 
      WHERE asset_type = 'design' AND category IS NOT NULL
      GROUP BY category
    `);

    const metrics = {
      totalAssets: parseInt(totalAssets.rows[0].count) || 0,
      publicAssets: parseInt(publicAssets.rows[0].count) || 0,
      categoryBreakdown: categoryBreakdown.rows.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('디자인 자산 메트릭 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '디자인 자산 메트릭 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 문서 목록 조회
router.get('/documents', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ka.id,
        ka.title as name,
        ka.description,
        ka.file_path,
        ka.file_url,
        ka.category,
        ka.tags,
        u.full_name as author,
        ka.download_count,
        ka.created_at,
        ka.updated_at
      FROM knowledge_assets ka
      LEFT JOIN timbel_users u ON ka.author_id = u.id
      WHERE ka.asset_type IN ('api_guide', 'user_manual', 'technical_spec', 'best_practice', 'tutorial', 'faq', 'document')
      ORDER BY ka.created_at DESC
    `);

    res.json({
      success: true,
      documents: result.rows
    });

  } catch (error) {
    console.error('문서 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '문서 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 문서 메트릭
router.get('/documents/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const totalDocuments = await pool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type = 'document'");
    const publicDocuments = await pool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type = 'document' AND is_public = true");
    
    const categoryBreakdown = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM knowledge_assets 
      WHERE asset_type = 'document' AND category IS NOT NULL
      GROUP BY category
    `);

    const metrics = {
      totalDocuments: parseInt(totalDocuments.rows[0].count) || 0,
      publicDocuments: parseInt(publicDocuments.rows[0].count) || 0,
      categoryBreakdown: categoryBreakdown.rows.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        return acc;
      }, {})
    };

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('문서 메트릭 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '문서 메트릭 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 지식 대시보드 메트릭 조회
router.get('/dashboard-metrics', 
  jwtAuth.verifyToken, 
  createCacheMiddleware({ type: 'statistics', ttl: 600 }), // 10분 Redis 캐시
  async (req, res) => {
  try {
    console.log('📊 지식 대시보드 메트릭 조회...');
    
    // 각 카테고리별 통계 조회 (실제 테이블 구조에 맞게 수정)
    const [
      domainsResult,
      projectsResult,
      systemsResult,
      componentsResult,
      designAssetsResult,
      documentsResult,
      recentActivitiesResult
    ] = await Promise.all([
      global.knowledgePool.query('SELECT COUNT(*) as count FROM domains'),
      global.knowledgePool.query('SELECT COUNT(*) as count FROM projects'),
      global.knowledgePool.query('SELECT COUNT(*) as count FROM systems'),
      global.knowledgePool.query('SELECT COUNT(*) as count FROM components'),
      global.knowledgePool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type IN ('component', 'icon', 'color_palette', 'typography', 'layout', 'template')"),
      global.knowledgePool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE asset_type IN ('api_guide', 'user_manual', 'technical_spec', 'best_practice', 'tutorial', 'faq', 'document')"),
      global.knowledgePool.query(`
        SELECT COUNT(*) as count 
        FROM knowledge_assets 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `)
    ]);

    // 최근 활동 조회 (최근 7일)
    const recentActivities = await global.knowledgePool.query(`
      SELECT 
        ka.title as name,
        ka.asset_type,
        ka.created_at,
        u.full_name as created_by_name
      FROM knowledge_assets ka
      LEFT JOIN timbel_users u ON ka.author_id = u.id
      WHERE ka.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY ka.created_at DESC
      LIMIT 10
    `);

    // 인기 자산 조회 (다운로드 수 기준)
    const popularAssets = await global.knowledgePool.query(`
      SELECT 
        title as name,
        asset_type,
        download_count,
        0 as star_count
      FROM knowledge_assets 
      WHERE download_count > 0
      ORDER BY download_count DESC
      LIMIT 5
    `);

    const metrics = {
      totalDomains: parseInt(domainsResult.rows[0].count),
      totalProjects: parseInt(projectsResult.rows[0].count),
      totalSystems: parseInt(systemsResult.rows[0].count),
      totalComponents: parseInt(componentsResult.rows[0].count),
      totalDesignAssets: parseInt(designAssetsResult.rows[0].count),
      totalDocuments: parseInt(documentsResult.rows[0].count),
      recentActivitiesCount: parseInt(recentActivitiesResult.rows[0].count),
      recentActivities: recentActivities.rows.map(activity => ({
        name: activity.name,
        type: activity.asset_type,
        created_at: activity.created_at,
        created_by: activity.created_by_name || 'Unknown'
      })),
      popularAssets: popularAssets.rows.map(asset => ({
        name: asset.name,
        type: asset.asset_type,
        downloads: asset.download_count || 0,
        stars: asset.star_count || 0
      })),
      summary: {
        totalAssets: parseInt(componentsResult.rows[0].count) + parseInt(designAssetsResult.rows[0].count) + parseInt(documentsResult.rows[0].count),
        totalDownloads: popularAssets.rows.reduce((sum, asset) => sum + (asset.download_count || 0), 0),
        totalStars: popularAssets.rows.reduce((sum, asset) => sum + (asset.star_count || 0), 0)
      }
    };

    res.json({
      success: true,
      metrics: metrics,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('지식 대시보드 메트릭 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '대시보드 메트릭 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 레포지토리 브랜치 조회 API
router.post('/systems/get-branches', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { url, accessToken } = req.body;
    
    // 입력 검증
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '레포지토리 URL이 필요합니다.'
      });
    }

    console.log('🌿 브랜치 조회 요청:', { url });

    // Git 서비스 감지 및 파싱
    const factory = new GitServiceFactory();
    const { service, type } = factory.detectAndCreateService(url);
    const repositoryInfo = service.parseUrl(url);

    // 브랜치 목록 조회
    const branches = await service.getBranches(repositoryInfo, accessToken);

    res.json({
      success: true,
      data: {
        service: type,
        branches: branches
      }
    });

  } catch (error) {
    console.error('❌ 브랜치 조회 오류:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 레포지토리 분석 API
router.post('/systems/analyze-repository', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { url, branch, accessToken } = req.body;
    
    // 입력 검증
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '레포지토리 URL이 필요합니다.'
      });
    }

    console.log('🔍 레포지토리 분석 요청:', { url, branch });

    // 레포지토리 분석 실행
    const analysisResult = await repositoryAnalyzer.analyzeRepository(
      url, 
      branch || 'main', 
      accessToken
    );

    res.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    console.error('❌ 레포지토리 분석 오류:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 컴포넌트 자동 분석 API
router.post('/auto-analyze', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { 
      repositoryUrl, 
      branch, 
      accessToken, 
      analysisOptions = {} 
    } = req.body;
    
    // 입력 검증
    if (!repositoryUrl) {
      return res.status(400).json({
        success: false,
        error: '레포지토리 URL이 필요합니다.'
      });
    }

    console.log('🔍 컴포넌트 자동 분석 요청:', { repositoryUrl, branch, analysisOptions });

    // 컴포넌트 분석기 인스턴스 생성
    const componentAnalyzer = new ComponentAnalyzer();
    
    // 레포지토리 데이터 구성
    const repositoryData = {
      url: repositoryUrl,
      branch: branch || 'main',
      accessToken: accessToken
    };

    // 컴포넌트 분석 실행
    const analysisResult = await componentAnalyzer.analyzeComponents(
      repositoryData, 
      analysisOptions
    );

    res.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    console.error('❌ 컴포넌트 자동 분석 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 문서 파일 업로드 API
router.post('/documents/upload', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_documents'), upload.single('file'), async (req, res) => {
  try {
    console.log('📁 파일 업로드 요청:', req.file);
    console.log('📝 폼 데이터:', req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '파일이 업로드되지 않았습니다.'
      });
    }

    const {
      title,
      description,
      doc_type = 'document',
      category = 'general',
      tags = '[]',
      version = '1.0.0'
    } = req.body;

    // 파일 정보
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    // 파일 확장자에 따른 content_format 결정
    let contentFormat = 'file';
    const ext = path.extname(originalName).toLowerCase();
    switch (ext) {
      case '.pdf':
        contentFormat = 'pdf';
        break;
      case '.doc':
      case '.docx':
        contentFormat = 'docx';
        break;
      case '.md':
        contentFormat = 'markdown';
        break;
      case '.html':
        contentFormat = 'html';
        break;
      case '.txt':
        contentFormat = 'text';
        break;
      case '.json':
        contentFormat = 'json';
        break;
      default:
        contentFormat = 'file';
    }

    // 태그 파싱 - 항상 배열로 보장
    let parsedTags = [];
    try {
      if (tags && tags !== '[]' && tags !== '{}') {
        const parsed = JSON.parse(tags);
        parsedTags = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      if (typeof tags === 'string' && tags.trim()) {
        parsedTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      }
    }
    
    // 빈 배열이면 기본 태그 추가
    if (parsedTags.length === 0) {
      parsedTags = ['문서'];
    }

    // 파일 URL 생성 (전체 URL로 수정)
    const fileUrl = `http://rdc.rickyson.com:3001/uploads/documents/${fileName}`;

    // 데이터베이스에 문서 정보 저장
    const insertQuery = `
      INSERT INTO knowledge_assets (
        title, description, asset_type, category, tags, 
        file_path, file_url, file_size, mime_type, 
        content_format, version, author, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      title || originalName,
      description || `업로드된 문서: ${originalName}`,
      doc_type,
      category,
      parsedTags,
      filePath,
      fileUrl,
      fileSize,
      mimeType,
      contentFormat,
      version,
      req.user.full_name || req.user.username
    ]);

    console.log('✅ 문서 파일 업로드 성공:', result.rows[0]);

    res.json({
      success: true,
      document: result.rows[0],
      message: '문서 파일이 성공적으로 업로드되었습니다.'
    });

  } catch (error) {
    console.error('❌ 문서 파일 업로드 실패:', error);
    
    // 업로드된 파일이 있다면 삭제
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('파일 삭제 실패:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 문서 생성 (URL 기반)
router.post('/documents', 
  jwtAuth.verifyToken, 
  advancedPermissions.checkAdvancedPermission('can_manage_documents'),
  createCacheInvalidationMiddleware(['dashboard-metrics', 'catalog-stats', 'documents']), // 관련 캐시 무효화
  async (req, res) => {
  try {
    const { 
      title, 
      description, 
      doc_type, 
      category, 
      tags, 
      status, 
      version, 
      content_format, 
      content_url 
    } = req.body;

    // 필수 필드 검증
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: '문서명과 설명은 필수입니다.'
      });
    }

    console.log('📝 문서 등록 요청:', { title, doc_type, content_format });

    // 문서 등록 (knowledge_assets 테이블 사용)
    const result = await pool.query(`
      INSERT INTO knowledge_assets (
        title, description, asset_type, author_id, 
        file_path, file_url, category, tags, 
        download_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *
    `, [
      title,
      description,
      doc_type || 'api_guide',
      req.user.id,
      content_url || '',
      content_url || '',
      category || 'documentation',
      JSON.stringify(tags || []),
      0
    ]);

    const newDocument = result.rows[0];

    res.status(201).json({
      success: true,
      document: newDocument
    });

  } catch (error) {
    console.error('문서 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '문서 등록 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 문서 목록 조회 - 디버깅용
router.get('/documents', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📄 문서 목록 조회 요청');
    
    // 먼저 전체 문서 수 확인
    const countResult = await pool.query('SELECT COUNT(*) as count FROM knowledge_assets');
    console.log('📄 전체 문서 수:', countResult.rows[0].count);
    
    // asset_type 확인
    const typeResult = await pool.query('SELECT DISTINCT asset_type FROM knowledge_assets');
    console.log('📄 asset_type 목록:', typeResult.rows.map(r => r.asset_type));
    
    // 간단한 쿼리로 시작
    const result = await pool.query(`
      SELECT 
        id,
        title,
        description,
        asset_type as doc_type,
        file_path,
        file_url,
        file_url as content_url,
        file_size,
        mime_type,
        content_format,
        category,
        tags,
        version,
        author,
        download_count,
        created_at,
        updated_at
      FROM knowledge_assets
      WHERE asset_type IN ('api_guide', 'user_manual', 'technical_spec', 'best_practice', 'tutorial', 'faq', 'document')
      ORDER BY created_at DESC
    `);

    console.log('📄 문서 조회 결과:', result.rows.length, '개');

    // tags 필드를 안전하게 처리
    const processedDocuments = result.rows.map(doc => ({
      ...doc,
      tags: Array.isArray(doc.tags) ? doc.tags : (doc.tags ? [] : [])
    }));

    res.json({
      success: true,
      documents: processedDocuments
    });

  } catch (error) {
    console.error('문서 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '문서 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 문서 편집 API
router.put('/documents/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_documents'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      doc_type,
      category,
      tags,
      version,
      content_url
    } = req.body;

    console.log('📝 문서 편집 요청:', id, req.body);

    const updateQuery = `
      UPDATE knowledge_assets 
      SET 
        title = $1,
        description = $2,
        asset_type = $3,
        category = $4,
        tags = $5,
        version = $6,
        file_url = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title,
      description,
      doc_type,
      category,
      Array.isArray(tags) ? tags : [],
      version,
      content_url,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '문서를 찾을 수 없습니다.'
      });
    }

    console.log('✅ 문서 편집 성공:', result.rows[0]);

    res.json({
      success: true,
      document: result.rows[0],
      message: '문서가 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('❌ 문서 편집 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 문서 삭제 API
router.delete('/documents/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_documents'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 문서 삭제 요청:', id);

    // 먼저 문서 정보 조회 (파일 삭제를 위해)
    const selectQuery = 'SELECT * FROM knowledge_assets WHERE id = $1';
    const selectResult = await pool.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '문서를 찾을 수 없습니다.'
      });
    }

    const document = selectResult.rows[0];

    // 데이터베이스에서 문서 삭제
    const deleteQuery = 'DELETE FROM knowledge_assets WHERE id = $1 RETURNING *';
    const deleteResult = await pool.query(deleteQuery, [id]);

    // 파일이 있다면 삭제 시도 (오류가 나도 계속 진행)
    if (document.file_path) {
      try {
        const fs = require('fs');
        if (fs.existsSync(document.file_path)) {
          fs.unlinkSync(document.file_path);
          console.log('📁 파일 삭제 완료:', document.file_path);
        }
      } catch (fileError) {
        console.warn('⚠️ 파일 삭제 실패 (계속 진행):', fileError.message);
      }
    }

    console.log('✅ 문서 삭제 성공:', deleteResult.rows[0]);

    res.json({
      success: true,
      message: '문서가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 문서 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 문서 파일 미리보기 API (브라우저에서 바로 보기)
router.get('/documents/:id/preview', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('👁️ 파일 미리보기 요청:', id);

    // 문서 정보 조회
    const selectQuery = 'SELECT * FROM knowledge_assets WHERE id = $1';
    const result = await pool.query(selectQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '문서를 찾을 수 없습니다.'
      });
    }

    const document = result.rows[0];

    // 외부 링크인 경우 리다이렉트
    if (document.file_url && document.file_url.startsWith('http')) {
      return res.redirect(document.file_url);
    }

    // 파일이 실제로 존재하지 않는 경우
    if (!document.file_path || !fs.existsSync(document.file_path)) {
      return res.status(404).send(`
        <html>
          <body>
            <h1>파일을 찾을 수 없습니다</h1>
            <p>요청하신 파일이 삭제되었거나 이동되었습니다.</p>
            <button onclick="window.close()">닫기</button>
          </body>
        </html>
      `);
    }

    // 브라우저에서 바로 볼 수 있도록 inline으로 설정
    const fileName = path.basename(document.file_path);
    const mimeType = document.mime_type || 'application/octet-stream';
    
    // [advice from AI] 미리보기 가능한 파일 타입 확인
    const previewableMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/html',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp'
    ];

    if (previewableMimeTypes.includes(mimeType)) {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.title || fileName)}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.title || fileName)}"`);
    }
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
    
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

    console.log('✅ 파일 미리보기 제공:', document.title || fileName);

  } catch (error) {
    console.error('❌ 파일 미리보기 실패:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>오류가 발생했습니다</h1>
          <p>${error.message}</p>
          <button onclick="window.close()">닫기</button>
        </body>
      </html>
    `);
  }
});

// [advice from AI] 문서 파일 직접 다운로드 API
router.get('/documents/:id/download', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📁 파일 다운로드 요청:', id);

    // 문서 정보 조회
    const selectQuery = 'SELECT * FROM knowledge_assets WHERE id = $1';
    const result = await pool.query(selectQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '문서를 찾을 수 없습니다.'
      });
    }

    const document = result.rows[0];

    // 외부 링크인 경우 (file_path가 URL인 경우)
    if (!document.file_path || !document.file_path.startsWith('/app/uploads/')) {
      return res.status(400).json({
        success: false,
        error: '이 문서는 외부 링크입니다. 다운로드할 수 있는 파일이 아닙니다.'
      });
    }

    // 파일이 실제로 존재하지 않는 경우
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({
        success: false,
        error: '파일을 찾을 수 없습니다. 파일이 삭제되었거나 이동되었을 수 있습니다.'
      });
    }

    // 다운로드 카운트 증가
    try {
      await pool.query('UPDATE knowledge_assets SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1', [id]);
    } catch (countError) {
      console.warn('다운로드 카운트 업데이트 실패:', countError);
    }

    // 파일 다운로드 응답
    const fileName = path.basename(document.file_path);
    const originalName = document.title || fileName;
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);

    console.log('✅ 파일 다운로드 완료:', originalName);

  } catch (error) {
    console.error('❌ 파일 다운로드 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 시스템 등록 API
router.post('/systems', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_systems'), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      tech_stack,
      domain_id,
      repository_url,
      repository_info,
      analysis_data,
      development_stage,
      version,
      architecture_type,
      deployment_info,
      maintenance_info,
      documentation_url,
      contact_info
    } = req.body;

    // 필수 필드 검증
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: '시스템명과 설명은 필수입니다.'
      });
    }

    console.log('📝 시스템 등록 요청:', { name, domain_id });

    // domain_id를 project_id로 매핑 (임시로 첫 번째 프로젝트 사용)
    let projectId = null;
    if (domain_id) {
      // domain_id가 있으면 해당 도메인의 첫 번째 프로젝트를 찾아서 사용
      const projectResult = await pool.query(
        'SELECT id FROM projects WHERE domain_id = $1 LIMIT 1',
        [domain_id]
      );
      if (projectResult.rows.length > 0) {
        projectId = projectResult.rows[0].id;
      }
    }

    // 시스템 등록 (실제 테이블 구조에 맞게 수정)
    const result = await pool.query(`
      INSERT INTO systems (
        project_id, name, description, system_type, technology_stack,
        repository_url, documentation_url, status, version, author_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `, [
      projectId,
      name,
      description,
      category || 'general',
      tech_stack ? JSON.stringify(tech_stack) : '[]',
      repository_url,
      documentation_url,
      development_stage || 'development',
      version || '1.0.0',
      req.user.id
    ]);

    const newSystem = result.rows[0];

    res.status(201).json({
      success: true,
      data: newSystem,
      message: '시스템이 성공적으로 등록되었습니다.'
    });

  } catch (error) {
    console.error('❌ 시스템 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 등록에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 시스템 목록 조회 API (기존 systems GET API 개선)
router.get('/systems', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📋 시스템 목록 조회 요청:', req.user);
    console.log('🌐 요청 URL:', req.originalUrl);
    console.log('🌐 요청 메서드:', req.method);
    
    const { page = 1, limit = 10, search, category, domain_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        s.*,
        p.name as project_name,
        d.name as domain_name,
        u.username as author_username
      FROM systems s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN domains d ON p.domain_id = d.id
      LEFT JOIN timbel_users u ON s.author_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // 검색 조건 추가
    if (search) {
      paramCount++;
      query += ` AND (s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND s.system_type = $${paramCount}`;
      queryParams.push(category);
    }

    if (domain_id) {
      paramCount++;
      query += ` AND d.id = $${paramCount}`;
      queryParams.push(domain_id);
    }

    // 정렬 및 페이징
    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    console.log('📊 DB 쿼리 결과:', result.rows.length, '개 시스템');

    // JSONB 필드 파싱 및 프론트엔드 필드명 매핑
    const systems = result.rows.map(system => ({
      ...system,
      // 프론트엔드에서 사용하는 필드명으로 매핑
      type: system.system_type,
      architecture: system.system_type, // 임시로 system_type 사용
      tech_stack: system.technology_stack || [],
      domain_name: system.domain_name,
      development_stage: system.status,
      code_status: system.status,
      created_by_username: system.author_username,
      project_name: system.project_name
    }));
    
    console.log('📋 매핑된 시스템 데이터:', systems);

    // 총 개수 조회
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM systems s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN domains d ON p.domain_id = d.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (s.name ILIKE $${countParamCount} OR s.description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    if (category) {
      countParamCount++;
      countQuery += ` AND s.system_type = $${countParamCount}`;
      countParams.push(category);
    }

    if (domain_id) {
      countParamCount++;
      countQuery += ` AND d.id = $${countParamCount}`;
      countParams.push(domain_id);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: systems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ 시스템 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 목록을 가져올 수 없습니다.'
    });
  }
});

// [advice from AI] 시스템 편집 API
router.put('/systems/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_systems'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      tech_stack,
      development_stage,
      version
    } = req.body;

    // 필수 필드 검증
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: '시스템명과 설명은 필수입니다.'
      });
    }

    console.log('📝 시스템 편집 요청:', { id, name });

    // 시스템 존재 확인
    const checkResult = await pool.query('SELECT id FROM systems WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '시스템을 찾을 수 없습니다.'
      });
    }

    // 시스템 업데이트
    const result = await pool.query(`
      UPDATE systems SET
        name = $1,
        description = $2,
        system_type = $3,
        technology_stack = $4,
        status = $5,
        version = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      name,
      description,
      category || 'general',
      tech_stack ? JSON.stringify(tech_stack) : '[]',
      development_stage || 'development',
      version || '1.0.0',
      id
    ]);

    const updatedSystem = result.rows[0];

    res.json({
      success: true,
      data: updatedSystem,
      message: '시스템이 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('❌ 시스템 편집 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 편집에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 시스템 삭제 API
router.delete('/systems/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_systems'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ 시스템 삭제 요청:', { id });

    // 시스템 존재 확인
    const checkResult = await pool.query('SELECT id FROM systems WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '시스템을 찾을 수 없습니다.'
      });
    }

    // 시스템 삭제
    await pool.query('DELETE FROM systems WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '시스템이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ 시스템 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 삭제에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 테스트용 새로운 카탈로그 통계 API
router.get('/catalog-stats-test', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🧪 테스트 API 호출됨');
    
    // [advice from AI] 실제 데이터베이스 쿼리로 통계 수집
    const stats = {};
    
    // 도메인 수 조회
    const domainsResult = await pool.query('SELECT COUNT(*) FROM domains');
    stats.domains = parseInt(domainsResult.rows[0].count);
    
    // 프로젝트 수 조회
    const projectsResult = await pool.query('SELECT COUNT(*) FROM projects');
    stats.projects = parseInt(projectsResult.rows[0].count);
    
    // 시스템 수 조회
    const systemsResult = await pool.query('SELECT COUNT(*) FROM systems');
    stats.systems = parseInt(systemsResult.rows[0].count);
    
    // 코드 컴포넌트 수 조회 (components 테이블 + knowledge_assets의 component 타입)
    const codeComponentsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM components) + 
        (SELECT COUNT(*) FROM knowledge_assets WHERE asset_type = 'component') as count
    `);
    stats.codeComponents = parseInt(codeComponentsResult.rows[0].count);
    
    // 디자인 자산 수 조회
    const designAssetsResult = await pool.query("SELECT COUNT(*) FROM knowledge_assets WHERE asset_type = 'design'");
    stats.designAssets = parseInt(designAssetsResult.rows[0].count);
    
    // 문서/가이드 수 조회
    const documentsResult = await pool.query("SELECT COUNT(*) FROM knowledge_assets WHERE asset_type IN ('document', 'guide', 'api_guide')");
    stats.documents = parseInt(documentsResult.rows[0].count);

    console.log('🧪 테스트 stats:', stats);

    res.json({
      success: true,
      stats: stats,
      recentActivities: [],
      popularResources: []
    });
  } catch (error) {
    console.error('❌ 테스트 API 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
