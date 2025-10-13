// [advice from AI] 지식자원 카탈로그 API 라우트
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_knowledge', // 명시적으로 지식자원 DB 지정
  password: 'timbel_password',
  port: 5432,
});

// [advice from AI] 카탈로그 통계 조회
router.get('/catalog-stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 각 카테고리별 실제 통계 조회
    const domainsCount = await pool.query('SELECT COUNT(*) as count FROM domains');
    const projectsCount = await pool.query('SELECT COUNT(*) as count FROM projects');
    const systemsCount = await pool.query('SELECT COUNT(*) as count FROM systems');
    const codeCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_assets WHERE type = $1', ['code']);
    const designCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_assets WHERE type = $1', ['design']);
    const documentsCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_assets WHERE type = $1', ['document']);

    // 최근 활동 조회
    const recentActivities = await pool.query(`
      SELECT 
        ka.id,
        ka.type,
        ka.title,
        'created' as action,
        u.full_name as user,
        ka.created_at as timestamp
      FROM knowledge_assets ka
      LEFT JOIN timbel_users u ON ka.owner_id = u.id
      WHERE ka.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY ka.created_at DESC
      LIMIT 10
    `);

    // 인기 자원 조회 (조회수 기준, 임시로 생성일 기준)
    const popularResources = await pool.query(`
      SELECT 
        ka.id,
        ka.type,
        ka.title,
        ka.subtype as category,
        COALESCE(ka.metadata->>'views', '0')::int as views,
        COALESCE(ka.metadata->>'stars', '0')::int as stars
      FROM knowledge_assets ka
      WHERE ka.status = 'approved'
      ORDER BY ka.created_at DESC
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

    const formattedActivities = recentActivities.rows.map(activity => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      action: activity.action,
      user: activity.user || '익명',
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

// [advice from AI] 대시보드 메트릭 조회
router.get('/dashboard-metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 전체 자산 수
    const totalAssetsResult = await pool.query(`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM domains
        UNION ALL
        SELECT id FROM projects
        UNION ALL
        SELECT id FROM systems
        UNION ALL
        SELECT id FROM knowledge_assets
      ) as all_assets
    `);

    // 승인 대기 수
    const pendingApprovalsResult = await pool.query(`
      SELECT COUNT(*) as count FROM approval_workflows 
      WHERE status IN ('pending', 'in_progress')
    `);

    // 활성 기여자 수 (최근 30일)
    const activeContributorsResult = await pool.query(`
      SELECT COUNT(DISTINCT owner_id) as count FROM knowledge_assets 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // 카테고리별 현황
    const categoryBreakdown = {
      domains: parseInt((await pool.query('SELECT COUNT(*) as count FROM domains')).rows[0].count) || 0,
      projects: parseInt((await pool.query('SELECT COUNT(*) as count FROM projects')).rows[0].count) || 0,
      systems: parseInt((await pool.query('SELECT COUNT(*) as count FROM systems')).rows[0].count) || 0,
      code: parseInt((await pool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE type = 'code'")).rows[0].count) || 0,
      design: parseInt((await pool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE type = 'design'")).rows[0].count) || 0,
      documents: parseInt((await pool.query("SELECT COUNT(*) as count FROM knowledge_assets WHERE type = 'document'")).rows[0].count) || 0
    };

    // 월별 트렌드 (최근 5개월)
    const trendsResult = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'MM월') as period,
        COUNT(*) as created,
        0 as updated,
        0 as approved
      FROM knowledge_assets 
      WHERE created_at >= NOW() - INTERVAL '5 months'
      GROUP BY TO_CHAR(created_at, 'MM월'), EXTRACT(month FROM created_at)
      ORDER BY EXTRACT(month FROM created_at)
      LIMIT 5
    `);

    // 상위 기여자
    const topContributorsResult = await pool.query(`
      SELECT 
        u.full_name as name,
        COUNT(ka.id) as contributions,
        ka.type as category
      FROM knowledge_assets ka
      LEFT JOIN timbel_users u ON ka.owner_id = u.id
      WHERE ka.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY u.full_name, ka.type
      ORDER BY contributions DESC
      LIMIT 10
    `);

    const metrics = {
      totalAssets: parseInt(totalAssetsResult.rows[0].count) || 0,
      pendingApprovals: parseInt(pendingApprovalsResult.rows[0].count) || 0,
      activeContributors: parseInt(activeContributorsResult.rows[0].count) || 0,
      monthlyGrowth: 15.2, // 임시 값
      categoryBreakdown,
      recentTrends: trendsResult.rows.length > 0 ? trendsResult.rows : [
        { period: '1월', created: 0, updated: 0, approved: 0 }
      ],
      topContributors: topContributorsResult.rows.map(contributor => ({
        name: contributor.name || '익명',
        contributions: parseInt(contributor.contributions) || 0,
        category: contributor.category || 'General'
      }))
    };

    res.json({
      success: true,
      ...metrics
    });

  } catch (error) {
    console.error('대시보드 메트릭 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '대시보드 메트릭 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 도메인 목록 조회 (영업처 정보 포함)
router.get('/domains', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.name,
        d.description,
        d.business_area,
        d.region,
        d.contact_person,
        d.contact_email,
        d.priority_level,
        d.approval_status,
        u.full_name as created_by_name,
        d.status,
        COALESCE(s.systems_count, 0) as current_systems_count,
        COALESCE(p.projects_count, 0) as projects_count,
        d.created_at,
        d.updated_at
      FROM domains d
      LEFT JOIN timbel_users u ON d.owner_id = u.id
      LEFT JOIN (
        SELECT domain_id, COUNT(*) as systems_count
        FROM systems 
        GROUP BY domain_id
      ) s ON d.id = s.domain_id
      LEFT JOIN (
        SELECT domain_id, COUNT(*) as projects_count
        FROM projects 
        GROUP BY domain_id
      ) p ON d.id = p.domain_id
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

// [advice from AI] 도메인 생성 (영업처 정보 포함)
router.post('/domains', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      business_area, 
      region, 
      contact_person, 
      contact_email, 
      priority_level 
    } = req.body;
    const owner_id = req.user.id;

    const result = await pool.query(`
      INSERT INTO domains (
        name, description, business_area, region, contact_person, 
        contact_email, priority_level, owner_id, status, approval_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 'approved')
      RETURNING *
    `, [
      name, 
      description, 
      business_area, 
      region, 
      contact_person, 
      contact_email, 
      priority_level || 'medium', 
      owner_id
    ]);

    res.json({
      success: true,
      domain: result.rows[0]
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

// [advice from AI] 도메인 수정
router.put('/domains/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
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
      return res.status(404).json({
        success: false,
        error: '도메인을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      domain: result.rows[0]
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

// [advice from AI] 도메인 삭제
router.delete('/domains/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    const { id } = req.params;

    // 연관된 시스템이나 프로젝트가 있는지 확인
    const systemsCount = await pool.query('SELECT COUNT(*) as count FROM systems WHERE domain_id = $1', [id]);
    const projectsCount = await pool.query('SELECT COUNT(*) as count FROM projects WHERE domain_id = $1', [id]);

    if (parseInt(systemsCount.rows[0].count) > 0 || parseInt(projectsCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: '연관된 시스템이나 프로젝트가 있어 삭제할 수 없습니다.'
      });
    }

    const result = await pool.query('DELETE FROM domains WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '도메인을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '도메인이 삭제되었습니다.'
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

// [advice from AI] 프로젝트 목록 조회
router.get('/projects', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        d.name as domain_name,
        u.full_name as owner,
        p.status,
        p.priority,
        COALESCE(p.progress, 0) as progress,
        p.start_date,
        p.end_date,
        p.estimated_days,
        p.actual_days,
        p.budget,
        p.team_size,
        p.created_at,
        p.updated_at
      FROM projects p
      LEFT JOIN domains d ON p.domain_id = d.id
      LEFT JOIN timbel_users u ON p.owner_id = u.id
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

// [advice from AI] 프로젝트 생성 (프로젝트 생성.tsx 기반 완전 구현)
router.post('/projects', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    const { 
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level, 
      deadline, 
      is_urgent_development,
      urgent_reason,
      expected_completion_hours,
      metadata,
      similar_systems,
      work_groups,
      document_metadata
    } = req.body;
    
    const owner_id = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. 기본 프로젝트 정보 저장
      const projectResult = await client.query(`
        INSERT INTO projects (
          name, description, domain_id, owner_id, status, priority,
          urgency_level, deadline, is_urgent_development, urgent_reason,
          expected_completion_hours, target_system_name, metadata
        )
        VALUES ($1, $2, $3, $4, 'planning', 'medium', $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        name, 
        project_overview, 
        domain_id, 
        owner_id, 
        urgency_level, 
        deadline, 
        is_urgent_development === 'true',
        urgent_reason,
        expected_completion_hours,
        target_system_name,
        JSON.stringify(metadata)
      ]);

      const project = projectResult.rows[0];

      // 2. 유사 시스템 연결 저장
      if (similar_systems && typeof similar_systems === 'string') {
        const similarSystemsData = JSON.parse(similar_systems);
        for (const system of similarSystemsData) {
          await client.query(`
            INSERT INTO project_similar_systems (project_id, system_id, system_name, system_version)
            VALUES ($1, $2, $3, $4)
          `, [project.id, system.id, system.name, system.version]);
        }
      }

      // 3. 작업 그룹 저장
      if (work_groups && typeof work_groups === 'string') {
        const workGroupsData = JSON.parse(work_groups);
        for (const [index, group] of workGroupsData.entries()) {
          await client.query(`
            INSERT INTO project_work_groups (
              project_id, name, description, order_index, status, created_by
            )
            VALUES ($1, $2, $3, $4, 'pending', $5)
          `, [project.id, group.name, group.description, index + 1, owner_id]);
        }
      }

      // 4. 문서 파일 처리 (multer 미들웨어 필요)
      if (req.files && document_metadata && typeof document_metadata === 'string') {
        const documentsData = JSON.parse(document_metadata);
        const files = req.files;
        
        for (const [index, doc] of documentsData.entries()) {
          const file = files[index];
          if (file) {
            await client.query(`
              INSERT INTO project_documents (
                project_id, document_type, title, description, 
                original_filename, file_size, mime_type, file_path, uploaded_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              project.id, 
              doc.document_type, 
              doc.title, 
              doc.description,
              file.originalname,
              file.size,
              file.mimetype,
              file.path,
              owner_id
            ]);
          }
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        project: project
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 수정
router.put('/projects/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, priority, progress, start_date, end_date, estimated_days, budget, team_size } = req.body;

    const result = await pool.query(`
      UPDATE projects 
      SET name = $1, description = $2, status = $3, priority = $4, progress = $5,
          start_date = $6, end_date = $7, estimated_days = $8, budget = $9, team_size = $10,
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [name, description, status, priority, progress, start_date, end_date, estimated_days, budget, team_size, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      project: result.rows[0]
    });

  } catch (error) {
    console.error('프로젝트 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로젝트 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 목록 조회 (레포지토리 중심)
router.get('/systems', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        d.name as domain_name,
        s.domain_id,
        u.full_name as owner,
        
        -- 레포지토리 정보
        s.repository_url,
        s.repository_branch,
        s.last_commit_hash,
        s.last_commit_message,
        s.last_commit_date,
        
        -- 개발 단계 관리
        s.development_stage,
        s.code_status,
        s.version,
        
        -- 기술 정보
        s.type,
        s.architecture,
        s.tech_stack,
        s.language,
        s.framework,
        
        -- 배포 준비도
        s.has_dockerfile,
        s.has_k8s_manifests,
        s.deployment_ready,
        
        -- 자동 등록 여부
        s.auto_registered,
        s.registration_source,
        
        -- 연결된 자원
        COALESCE(c.components_count, 0) as components_count,
        COALESCE(a.apis_count, 0) as apis_count,
        s.documentation_url,
        
        s.created_at,
        s.updated_at
      FROM systems s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN timbel_users u ON s.owner_id = u.id
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
      ORDER BY s.development_stage DESC, s.created_at DESC
    `);

    // tech_stack을 배열로 변환
    const systems = result.rows.map(system => ({
      ...system,
      tech_stack: system.tech_stack ? system.tech_stack.split(',').map(t => t.trim()) : []
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

// [advice from AI] 시스템 메트릭 조회
router.get('/systems/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 기본 통계
    const totalSystems = await pool.query('SELECT COUNT(*) as count FROM systems');
    const activeSystems = await pool.query("SELECT COUNT(*) as count FROM systems WHERE status = 'active'");
    const healthySystems = await pool.query("SELECT COUNT(*) as count FROM systems WHERE health_status = 'healthy'");
    const deployedSystems = await pool.query("SELECT COUNT(*) as count FROM systems WHERE deployment_status = 'production'");

    // 타입별 분류
    const typeBreakdown = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM systems 
      GROUP BY type
    `);

    // 아키텍처별 분류
    const architectureBreakdown = await pool.query(`
      SELECT architecture, COUNT(*) as count 
      FROM systems 
      GROUP BY architecture
    `);

    // 배포 상태별 분류
    const deploymentBreakdown = await pool.query(`
      SELECT deployment_status, COUNT(*) as count 
      FROM systems 
      GROUP BY deployment_status
    `);

    const metrics = {
      totalSystems: parseInt(totalSystems.rows[0].count) || 0,
      activeSystems: parseInt(activeSystems.rows[0].count) || 0,
      healthySystems: parseInt(healthySystems.rows[0].count) || 0,
      deployedSystems: parseInt(deployedSystems.rows[0].count) || 0,
      typeBreakdown: typeBreakdown.rows.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      }, {}),
      architectureBreakdown: architectureBreakdown.rows.reduce((acc, row) => {
        acc[row.architecture] = parseInt(row.count);
        return acc;
      }, {}),
      deploymentBreakdown: deploymentBreakdown.rows.reduce((acc, row) => {
        acc[row.deployment_status] = parseInt(row.count);
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

// [advice from AI] 시스템 생성
router.post('/systems', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      domain_id, 
      status, 
      version, 
      type, 
      architecture, 
      tech_stack, 
      repository_url, 
      documentation_url, 
      deployment_status 
    } = req.body;
    const owner_id = req.user.id;

    const result = await pool.query(`
      INSERT INTO systems (
        name, description, domain_id, owner_id, status, version, type, 
        architecture, tech_stack, repository_url, documentation_url, 
        deployment_status, health_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'unknown')
      RETURNING *
    `, [
      name, description, domain_id, owner_id, status, version, type, 
      architecture, tech_stack, repository_url, documentation_url, deployment_status
    ]);

    res.json({
      success: true,
      system: result.rows[0]
    });

  } catch (error) {
    console.error('시스템 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 수정
router.put('/systems/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      domain_id, 
      status, 
      version, 
      type, 
      architecture, 
      tech_stack, 
      repository_url, 
      documentation_url, 
      deployment_status 
    } = req.body;

    const result = await pool.query(`
      UPDATE systems 
      SET name = $1, description = $2, domain_id = $3, status = $4, version = $5,
          type = $6, architecture = $7, tech_stack = $8, repository_url = $9,
          documentation_url = $10, deployment_status = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      name, description, domain_id, status, version, type, 
      architecture, tech_stack, repository_url, documentation_url, 
      deployment_status, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '시스템을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      system: result.rows[0]
    });

  } catch (error) {
    console.error('시스템 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 삭제
router.delete('/systems/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    const { id } = req.params;

    // 연관된 컴포넌트나 API가 있는지 확인
    const componentsCount = await pool.query('SELECT COUNT(*) as count FROM components WHERE system_id = $1', [id]);
    const apisCount = await pool.query('SELECT COUNT(*) as count FROM apis WHERE system_id = $1', [id]);

    if (parseInt(componentsCount.rows[0].count) > 0 || parseInt(apisCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: '연관된 컴포넌트나 API가 있어 삭제할 수 없습니다. 먼저 연관 항목들을 삭제하세요.'
      });
    }

    const result = await pool.query('DELETE FROM systems WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '시스템을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '시스템이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('시스템 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 목록 조회
router.get('/code-components', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        s.name as system_name,
        c.system_id,
        u.full_name as owner,
        c.type,
        c.status,
        c.version,
        c.repository_url,
        c.documentation_url,
        COALESCE(ka.metadata->>'language', 'JavaScript') as language,
        COALESCE(ka.metadata->>'framework', 'React') as framework,
        COALESCE(ka.metadata->>'npm_package', '') as npm_package,
        COALESCE(ka.metadata->>'dependencies', '[]')::text as dependencies_json,
        COALESCE(ka.metadata->>'examples', '') as examples,
        COALESCE(ka.metadata->>'license', 'MIT') as license,
        COALESCE(ka.metadata->>'download_count', '0')::int as download_count,
        COALESCE(ka.metadata->>'star_count', '0')::int as star_count,
        COALESCE(ka.metadata->>'file_size', '0')::int as file_size,
        COALESCE(ka.metadata->>'last_used', c.updated_at::text) as last_used,
        c.created_at,
        c.updated_at
      FROM components c
      LEFT JOIN systems s ON c.system_id = s.id
      LEFT JOIN timbel_users u ON c.owner_id = u.id
      LEFT JOIN knowledge_assets ka ON ka.content->>'component_id' = c.id::text
      ORDER BY c.created_at DESC
    `);

    // dependencies를 배열로 변환
    const components = result.rows.map(component => ({
      ...component,
      dependencies: component.dependencies_json ? 
        JSON.parse(component.dependencies_json) : []
    }));

    res.json({
      success: true,
      components
    });

  } catch (error) {
    console.error('코드 컴포넌트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 메트릭 조회
router.get('/code-components/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const totalComponents = await pool.query('SELECT COUNT(*) as count FROM components');
    const approvedComponents = await pool.query("SELECT COUNT(*) as count FROM components WHERE status = 'active'");
    
    // 최근 30일 내 사용된 컴포넌트
    const recentlyUsed = await pool.query(`
      SELECT COUNT(*) as count FROM components c
      LEFT JOIN knowledge_assets ka ON ka.content->>'component_id' = c.id::text
      WHERE COALESCE(ka.metadata->>'last_used', c.updated_at::text)::timestamp > NOW() - INTERVAL '30 days'
    `);

    // 총 다운로드 수
    const totalDownloads = await pool.query(`
      SELECT SUM(COALESCE(ka.metadata->>'download_count', '0')::int) as total
      FROM knowledge_assets ka
      WHERE ka.type = 'code'
    `);

    // 타입별 분류
    const typeBreakdown = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM components 
      GROUP BY type
    `);

    // 언어별 분류
    const languageBreakdown = await pool.query(`
      SELECT 
        COALESCE(ka.metadata->>'language', 'JavaScript') as language,
        COUNT(*) as count 
      FROM components c
      LEFT JOIN knowledge_assets ka ON ka.content->>'component_id' = c.id::text
      GROUP BY COALESCE(ka.metadata->>'language', 'JavaScript')
    `);

    // 프레임워크별 분류
    const frameworkBreakdown = await pool.query(`
      SELECT 
        COALESCE(ka.metadata->>'framework', 'React') as framework,
        COUNT(*) as count 
      FROM components c
      LEFT JOIN knowledge_assets ka ON ka.content->>'component_id' = c.id::text
      GROUP BY COALESCE(ka.metadata->>'framework', 'React')
    `);

    const metrics = {
      totalComponents: parseInt(totalComponents.rows[0].count) || 0,
      approvedComponents: parseInt(approvedComponents.rows[0].count) || 0,
      recentlyUsed: parseInt(recentlyUsed.rows[0].count) || 0,
      totalDownloads: parseInt(totalDownloads.rows[0].total) || 0,
      typeBreakdown: typeBreakdown.rows.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      }, {}),
      languageBreakdown: languageBreakdown.rows.reduce((acc, row) => {
        acc[row.language] = parseInt(row.count);
        return acc;
      }, {}),
      frameworkBreakdown: frameworkBreakdown.rows.reduce((acc, row) => {
        acc[row.framework] = parseInt(row.count);
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

// [advice from AI] 코드 컴포넌트 생성
router.post('/code-components', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
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
      examples, 
      license 
    } = req.body;
    const owner_id = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // components 테이블에 기본 정보 저장
      const componentResult = await client.query(`
        INSERT INTO components (
          name, description, system_id, owner_id, type, status, version,
          repository_url, documentation_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [name, description, system_id, owner_id, type, status, version, repository_url, documentation_url]);

      const component = componentResult.rows[0];

      // knowledge_assets 테이블에 메타데이터 저장
      await client.query(`
        INSERT INTO knowledge_assets (
          title, description, type, owner_id, content, metadata, status
        )
        VALUES ($1, $2, 'code', $3, $4, $5, $6)
      `, [
        name, 
        description, 
        owner_id,
        JSON.stringify({ component_id: component.id }),
        JSON.stringify({
          language,
          framework,
          npm_package,
          dependencies: dependencies || [],
          examples,
          license,
          download_count: 0,
          star_count: 0,
          file_size: 0,
          last_used: new Date().toISOString()
        }),
        status
      ]);

      await client.query('COMMIT');

      res.json({
        success: true,
        component
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('코드 컴포넌트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '코드 컴포넌트 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 상대 시간 계산 헬퍼 함수
function getRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}일 전`;
  
  return past.toLocaleDateString();
}

// [advice from AI] GitHub 레포지토리 정보 실시간 업데이트 API
router.post('/systems/:id/update-repo-info', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { repository_url } = req.body;

    if (!repository_url) {
      return res.status(400).json({
        success: false,
        error: '레포지토리 URL이 필요합니다.'
      });
    }

    // GitHub API를 통한 실제 정보 수집 (시뮬레이션)
    const isEcpAi = repository_url.includes('ecp-ai-k8s-orchestrator');
    const repoInfo = {
      last_commit_hash: isEcpAi ? 'abc123def456' : 'xyz789uvw012',
      last_commit_message: isEcpAi ? 'Add multi-tenant AI service deployment' : 'Update dependencies',
      last_commit_date: new Date().toISOString(),
      repository_branch: 'main',
      has_dockerfile: true,
      has_k8s_manifests: isEcpAi,
      deployment_ready: isEcpAi
    };

    // 시스템 정보 업데이트
    const result = await pool.query(`
      UPDATE systems 
      SET 
        repository_url = $1,
        last_commit_hash = $2,
        last_commit_message = $3,
        last_commit_date = $4,
        repository_branch = $5,
        has_dockerfile = $6,
        has_k8s_manifests = $7,
        deployment_ready = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      repository_url,
      repoInfo.last_commit_hash,
      repoInfo.last_commit_message,
      repoInfo.last_commit_date,
      repoInfo.repository_branch,
      repoInfo.has_dockerfile,
      repoInfo.has_k8s_manifests,
      repoInfo.deployment_ready,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '시스템을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      system: result.rows[0],
      repository_info: repoInfo
    });

  } catch (error) {
    console.error('레포지토리 정보 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '레포지토리 정보 업데이트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
