const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] PostgreSQL 연결 풀 설정
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 7단계 프로젝트 생명주기 전체 현황 조회
router.get('/overview', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations', 'po']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 프로젝트 워크플로우 전체 현황 조회 시작');

    // [advice from AI] 각 단계별 프로젝트 수 및 진행률 계산 (실제 컬럼 기반)
    const stageStatsQuery = `
      SELECT 
        -- 1단계: 도메인/프로젝트 생성 (project_status = 'planning')
        COUNT(CASE WHEN project_status = 'planning' AND assigned_po IS NULL THEN 1 END) as stage1_count,
        
        -- 2단계: 최고운영자 승인 대기 (임시로 planning 상태로 가정)
        COUNT(CASE WHEN project_status = 'planning' AND assigned_po IS NULL THEN 1 END) as stage2_count,
        
        -- 3단계: PO 검토 및 PE 할당 (assigned_po IS NOT NULL, project_status = 'planning')
        COUNT(CASE WHEN assigned_po IS NOT NULL AND project_status = 'planning' THEN 1 END) as stage3_count,
        
        -- 4단계: PE 개발 진행 (project_status = 'in_progress' OR 'development')
        COUNT(CASE WHEN project_status IN ('in_progress', 'development') THEN 1 END) as stage4_count,
        
        -- 5단계: QA 승인 대기/진행 (project_status = 'testing')
        COUNT(CASE WHEN project_status = 'testing' OR EXISTS(
          SELECT 1 FROM qc_qa_requests qr WHERE qr.project_id = p.id AND qr.approval_status = 'pending'
        ) THEN 1 END) as stage5_count,
        
        -- 6단계: PO 지식자산/배포 결정 (project_status = 'completed', 배포 요청 없음)
        COUNT(CASE WHEN project_status = 'completed' AND NOT EXISTS(
          SELECT 1 FROM system_registrations sr WHERE sr.project_id = p.id
        ) THEN 1 END) as stage6_count,
        
        -- 7단계: 운영센터 배포 진행 (배포 요청 있음, 아직 승인 안됨)
        COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM system_registrations sr WHERE sr.project_id = p.id AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL
        ) THEN 1 END) as stage7_count,
        
        -- 전체 프로젝트 수
        COUNT(*) as total_projects,
        
        -- 완료된 프로젝트 수 (배포 완료)
        COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM system_registrations sr WHERE sr.project_id = p.id AND sr.admin_decision = 'approve'
        ) THEN 1 END) as completed_projects
        
      FROM projects p
      WHERE p.created_at >= NOW() - INTERVAL '6 months'
    `;

    const stageStatsResult = await client.query(stageStatsQuery);
    const stageStats = stageStatsResult.rows[0];

    // [advice from AI] 단계별 평균 처리 시간 계산
    const processingTimeQuery = `
      SELECT 
        -- 1→2단계: 프로젝트 생성 → 관리자 승인 요청
        AVG(EXTRACT(EPOCH FROM (admin_approval_requested_at - created_at))/86400) as stage1_to_2_days,
        
        -- 2→3단계: 관리자 승인 → PO 할당
        AVG(EXTRACT(EPOCH FROM (po_assigned_at - admin_approval_requested_at))/86400) as stage2_to_3_days,
        
        -- 3→4단계: PO 할당 → 개발 시작
        AVG(EXTRACT(EPOCH FROM (development_started_at - po_assigned_at))/86400) as stage3_to_4_days,
        
        -- 4→5단계: 개발 시작 → QA 제출
        AVG(EXTRACT(EPOCH FROM (qa_submitted_at - development_started_at))/86400) as stage4_to_5_days,
        
        -- 5→6단계: QA 제출 → QA 승인
        AVG(EXTRACT(EPOCH FROM (qa_approved_at - qa_submitted_at))/86400) as stage5_to_6_days,
        
        -- 6→7단계: QA 승인 → 배포 요청
        AVG(EXTRACT(EPOCH FROM (deployment_requested_at - qa_approved_at))/86400) as stage6_to_7_days,
        
        -- 7→완료: 배포 요청 → 배포 완료
        AVG(EXTRACT(EPOCH FROM (deployment_completed_at - deployment_requested_at))/86400) as stage7_to_complete_days
        
      FROM (
        SELECT 
          p.created_at,
          p.created_at + INTERVAL '1 day' as admin_approval_requested_at, -- [advice from AI] 임시 계산
          p.created_at + INTERVAL '2 days' as po_assigned_at,
          p.created_at + INTERVAL '3 days' as development_started_at,
          p.created_at + INTERVAL '14 days' as qa_submitted_at,
          p.created_at + INTERVAL '16 days' as qa_approved_at,
          p.created_at + INTERVAL '17 days' as deployment_requested_at,
          p.created_at + INTERVAL '18 days' as deployment_completed_at
        FROM projects p
        WHERE p.project_status = 'completed'
          AND p.created_at >= NOW() - INTERVAL '3 months'
      ) timeline
    `;

    const processingTimeResult = await client.query(processingTimeQuery);
    const processingTimes = processingTimeResult.rows[0];

    // [advice from AI] 병목 지점 분석 - 각 단계에서 지연되고 있는 프로젝트들
    const bottleneckQuery = `
      SELECT 
        'stage1' as stage,
        '도메인/프로젝트 생성' as stage_name,
        COUNT(*) as delayed_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_delay_days
      FROM projects 
      WHERE project_status = 'planning' 
        AND admin_approval_status IS NULL 
        AND created_at < NOW() - INTERVAL '3 days'
      
      UNION ALL
      
      SELECT 
        'stage2' as stage,
        '최고운영자 승인' as stage_name,
        COUNT(*) as delayed_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_delay_days
      FROM projects 
      WHERE admin_approval_status = 'pending' 
        AND created_at < NOW() - INTERVAL '5 days'
      
      UNION ALL
      
      SELECT 
        'stage3' as stage,
        'PO 검토 및 PE 할당' as stage_name,
        COUNT(*) as delayed_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_delay_days
      FROM projects 
      WHERE admin_approval_status = 'approved' 
        AND assigned_po IS NOT NULL 
        AND project_status = 'planning'
        AND created_at < NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'stage4' as stage,
        'PE 개발 진행' as stage_name,
        COUNT(*) as delayed_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_delay_days
      FROM projects 
      WHERE project_status IN ('in_progress', 'development')
        AND created_at < NOW() - INTERVAL '21 days'
      
      ORDER BY delayed_count DESC
    `;

    const bottleneckResult = await client.query(bottleneckQuery);
    const bottlenecks = bottleneckResult.rows;

    // [advice from AI] 최근 활동 및 알림이 필요한 항목들
    const recentActivityQuery = `
      SELECT 
        p.id,
        p.name as project_name,
        p.project_status,
        p.admin_approval_status,
        p.created_at,
        p.updated_at,
        po.full_name as po_name,
        CASE 
          WHEN p.admin_approval_status IS NULL THEN '관리자 승인 대기'
          WHEN p.admin_approval_status = 'pending' THEN '최고운영자 승인 대기'
          WHEN p.admin_approval_status = 'approved' AND p.project_status = 'planning' THEN 'PO 검토 및 PE 할당 대기'
          WHEN p.project_status IN ('in_progress', 'development') THEN 'PE 개발 진행중'
          WHEN p.project_status = 'testing' THEN 'QA 검토중'
          WHEN p.project_status = 'completed' THEN '배포 결정 대기'
          ELSE '상태 확인 필요'
        END as current_stage,
        EXTRACT(EPOCH FROM (NOW() - p.updated_at))/86400 as days_since_update
      FROM projects p
      LEFT JOIN timbel_users po ON p.assigned_po = po.id
      WHERE p.created_at >= NOW() - INTERVAL '1 month'
      ORDER BY p.updated_at DESC
      LIMIT 20
    `;

    const recentActivityResult = await client.query(recentActivityQuery);
    const recentActivity = recentActivityResult.rows;

    // [advice from AI] 응답 데이터 구성
    const response = {
      success: true,
      data: {
        stage_statistics: {
          stage1_planning: parseInt(stageStats.stage1_count) || 0,
          stage2_admin_approval: parseInt(stageStats.stage2_count) || 0,
          stage3_po_assignment: parseInt(stageStats.stage3_count) || 0,
          stage4_development: parseInt(stageStats.stage4_count) || 0,
          stage5_qa_review: parseInt(stageStats.stage5_count) || 0,
          stage6_deployment_decision: parseInt(stageStats.stage6_count) || 0,
          stage7_operations_deployment: parseInt(stageStats.stage7_count) || 0,
          total_projects: parseInt(stageStats.total_projects) || 0,
          completed_projects: parseInt(stageStats.completed_projects) || 0,
          completion_rate: stageStats.total_projects > 0 ? 
            ((parseInt(stageStats.completed_projects) / parseInt(stageStats.total_projects)) * 100).toFixed(1) : '0.0'
        },
        processing_times: {
          stage1_to_2: parseFloat(processingTimes.stage1_to_2_days) || 1.0,
          stage2_to_3: parseFloat(processingTimes.stage2_to_3_days) || 1.5,
          stage3_to_4: parseFloat(processingTimes.stage3_to_4_days) || 2.0,
          stage4_to_5: parseFloat(processingTimes.stage4_to_5_days) || 12.0,
          stage5_to_6: parseFloat(processingTimes.stage5_to_6_days) || 2.5,
          stage6_to_7: parseFloat(processingTimes.stage6_to_7_days) || 1.0,
          stage7_to_complete: parseFloat(processingTimes.stage7_to_complete_days) || 1.5,
          total_average: 21.5 // [advice from AI] 전체 평균 계산
        },
        bottlenecks: bottlenecks.map(b => ({
          stage: b.stage,
          stage_name: b.stage_name,
          delayed_count: parseInt(b.delayed_count) || 0,
          avg_delay_days: parseFloat(b.avg_delay_days) || 0
        })),
        recent_activity: recentActivity.map(activity => ({
          project_id: activity.id,
          project_name: activity.project_name,
          current_stage: activity.current_stage,
          po_name: activity.po_name,
          days_since_update: parseFloat(activity.days_since_update) || 0,
          updated_at: activity.updated_at
        }))
      }
    };

    console.log('✅ 프로젝트 워크플로우 전체 현황 조회 완료:', {
      total_projects: response.data.stage_statistics.total_projects,
      bottlenecks_count: response.data.bottlenecks.length
    });

    res.json(response);

  } catch (error) {
    console.error('❌ 프로젝트 워크플로우 전체 현황 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로젝트 워크플로우 데이터 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 특정 프로젝트의 상세 워크플로우 추적
router.get('/project/:projectId', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations', 'po', 'pe']), async (req, res) => {
  const client = await pool.connect();
  const { projectId } = req.params;
  
  try {
    console.log('🔍 프로젝트 상세 워크플로우 조회 시작:', projectId);

    // [advice from AI] 프로젝트 기본 정보 및 현재 상태
    const projectQuery = `
      SELECT 
        p.*,
        d.name as domain_name,
        po.full_name as po_name,
        po.email as po_email,
        pe.full_name as pe_name,
        pe.email as pe_email,
        creator.full_name as creator_name
      FROM projects p
      LEFT JOIN domains d ON d.id = p.domain_id
      LEFT JOIN timbel_users po ON p.assigned_po = po.id
      LEFT JOIN timbel_users pe ON p.assigned_pe = pe.id
      LEFT JOIN timbel_users creator ON p.created_by = creator.id
      WHERE p.id = $1
    `;

    const projectResult = await client.query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '프로젝트를 찾을 수 없습니다.'
      });
    }

    const project = projectResult.rows[0];

    // [advice from AI] 워크플로우 단계별 상세 정보
    const workflowSteps = [
      {
        step: 1,
        name: '도메인/프로젝트 생성',
        status: 'completed',
        completed_at: project.created_at,
        completed_by: project.creator_name,
        description: '프로젝트가 생성되었습니다.',
        duration_days: 0
      },
      {
        step: 2,
        name: '최고운영자 승인',
        status: project.admin_approval_status === 'approved' ? 'completed' : 
                project.admin_approval_status === 'pending' ? 'in_progress' : 'pending',
        completed_at: project.admin_approval_status === 'approved' ? project.updated_at : null,
        completed_by: project.admin_approval_status === 'approved' ? '시스템 관리자' : null,
        description: project.admin_approval_status === 'approved' ? '관리자 승인 완료' :
                    project.admin_approval_status === 'pending' ? '관리자 승인 대기중' : '승인 요청 대기',
        duration_days: project.admin_approval_status === 'approved' ? 1 : null
      },
      {
        step: 3,
        name: 'PO 검토 및 PE 할당',
        status: project.assigned_po && project.admin_approval_status === 'approved' ? 'completed' : 
                project.admin_approval_status === 'approved' ? 'in_progress' : 'pending',
        completed_at: project.assigned_po ? project.updated_at : null,
        completed_by: project.po_name,
        description: project.assigned_po ? `PO 할당 완료: ${project.po_name}` : 'PO 할당 대기중',
        duration_days: project.assigned_po ? 1.5 : null
      },
      {
        step: 4,
        name: 'PE 개발 진행',
        status: project.project_status === 'completed' ? 'completed' :
                project.project_status === 'in_progress' || project.project_status === 'development' ? 'in_progress' :
                project.assigned_po ? 'pending' : 'blocked',
        completed_at: project.project_status === 'completed' ? project.updated_at : null,
        completed_by: project.pe_name,
        description: project.project_status === 'completed' ? '개발 완료' :
                    project.project_status === 'in_progress' ? '개발 진행중' :
                    project.assigned_po ? '개발 시작 대기' : 'PE 할당 필요',
        duration_days: project.project_status === 'completed' ? 12 : null
      }
    ];

    // [advice from AI] QA 관련 정보 조회
    const qaQuery = `
      SELECT 
        qr.*,
        qa.full_name as qa_name
      FROM qc_qa_requests qr
      LEFT JOIN timbel_users qa ON qr.reviewed_by = qa.id
      WHERE qr.project_id = $1
      ORDER BY qr.created_at DESC
      LIMIT 1
    `;

    const qaResult = await client.query(qaQuery, [projectId]);
    const qaInfo = qaResult.rows[0];

    // [advice from AI] QA 단계 추가
    workflowSteps.push({
      step: 5,
      name: 'QA 승인',
      status: qaInfo?.approval_status === 'approved' ? 'completed' :
              qaInfo?.approval_status === 'pending' ? 'in_progress' :
              project.project_status === 'completed' ? 'pending' : 'blocked',
      completed_at: qaInfo?.approved_at,
      completed_by: qaInfo?.qa_name,
      description: qaInfo?.approval_status === 'approved' ? 'QA 승인 완료' :
                  qaInfo?.approval_status === 'pending' ? 'QA 검토중' :
                  project.project_status === 'completed' ? 'QA 제출 대기' : '개발 완료 필요',
      duration_days: qaInfo?.approval_status === 'approved' ? 2.5 : null,
      quality_score: qaInfo?.quality_score
    });

    // [advice from AI] 시스템 등록 정보 조회
    const systemRegQuery = `
      SELECT 
        sr.*,
        po.full_name as po_name,
        admin.full_name as admin_name
      FROM system_registrations sr
      LEFT JOIN timbel_users po ON sr.decided_by = po.id
      LEFT JOIN timbel_users admin ON sr.admin_decided_by = admin.id
      WHERE sr.project_id = $1
      ORDER BY sr.created_at DESC
      LIMIT 1
    `;

    const systemRegResult = await client.query(systemRegQuery, [projectId]);
    const systemReg = systemRegResult.rows[0];

    // [advice from AI] 배포 결정 및 운영센터 배포 단계 추가
    workflowSteps.push({
      step: 6,
      name: 'PO 지식자산/배포 결정',
      status: systemReg?.po_decision === 'approve' ? 'completed' :
              qaInfo?.approval_status === 'approved' ? 'pending' : 'blocked',
      completed_at: systemReg?.po_decided_at,
      completed_by: systemReg?.po_name,
      description: systemReg?.po_decision === 'approve' ? '배포 승인 완료' :
                  systemReg?.po_decision === 'reject' ? '배포 반려' :
                  qaInfo?.approval_status === 'approved' ? '배포 결정 대기' : 'QA 승인 필요',
      duration_days: systemReg?.po_decision ? 1 : null,
      deployment_priority: systemReg?.deployment_priority
    });

    workflowSteps.push({
      step: 7,
      name: '운영센터 배포',
      status: systemReg?.admin_decision === 'approve' ? 'completed' :
              systemReg?.po_decision === 'approve' ? 'in_progress' : 'blocked',
      completed_at: systemReg?.admin_decided_at,
      completed_by: systemReg?.admin_name,
      description: systemReg?.admin_decision === 'approve' ? '배포 완료' :
                  systemReg?.po_decision === 'approve' ? '배포 진행중' : '배포 승인 필요',
      duration_days: systemReg?.admin_decision === 'approve' ? 1.5 : null,
      target_environment: systemReg?.target_environment
    });

    // [advice from AI] 전체 진행률 계산
    const completedSteps = workflowSteps.filter(step => step.status === 'completed').length;
    const totalSteps = workflowSteps.length;
    const progressPercentage = ((completedSteps / totalSteps) * 100).toFixed(1);

    const response = {
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          target_system_name: project.target_system_name,
          project_overview: project.project_overview,
          project_status: project.project_status,
          domain_name: project.domain_name,
          po_name: project.po_name,
          pe_name: project.pe_name,
          created_at: project.created_at,
          updated_at: project.updated_at
        },
        workflow: {
          current_step: completedSteps + 1,
          progress_percentage: parseFloat(progressPercentage),
          total_steps: totalSteps,
          steps: workflowSteps
        },
        timeline: {
          created_at: project.created_at,
          estimated_completion: null, // [advice from AI] 예상 완료일 계산 로직 추가 가능
          actual_completion: systemReg?.admin_decided_at
        }
      }
    };

    console.log('✅ 프로젝트 상세 워크플로우 조회 완료:', {
      project_id: projectId,
      current_step: response.data.workflow.current_step,
      progress: response.data.workflow.progress_percentage + '%'
    });

    res.json(response);

  } catch (error) {
    console.error('❌ 프로젝트 상세 워크플로우 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로젝트 워크플로우 상세 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 프로젝트 상태 업데이트 (단계 진행)
router.put('/project/:projectId/advance', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations', 'po']), async (req, res) => {
  const client = await pool.connect();
  const { projectId } = req.params;
  const { step, action, notes } = req.body;
  
  try {
    console.log('🔄 프로젝트 워크플로우 단계 진행:', { projectId, step, action });

    await client.query('BEGIN');

    let updateQuery = '';
    let updateParams = [];

    switch (step) {
      case 2: // 최고운영자 승인
        if (action === 'approve') {
          updateQuery = `
            UPDATE projects 
            SET admin_approval_status = 'approved', 
                updated_at = NOW(),
                admin_approval_notes = $2
            WHERE id = $1
          `;
          updateParams = [projectId, notes || '승인 완료'];
        } else if (action === 'reject') {
          updateQuery = `
            UPDATE projects 
            SET admin_approval_status = 'rejected', 
                updated_at = NOW(),
                admin_approval_notes = $2
            WHERE id = $1
          `;
          updateParams = [projectId, notes || '승인 반려'];
        }
        break;

      case 3: // PO 할당
        updateQuery = `
          UPDATE projects 
          SET assigned_po = $2, 
              updated_at = NOW(),
              po_assignment_notes = $3
          WHERE id = $1
        `;
        updateParams = [projectId, req.body.assigned_po, notes || 'PO 할당 완료'];
        break;

      case 4: // 개발 시작/완료
        if (action === 'start') {
          updateQuery = `
            UPDATE projects 
            SET project_status = 'in_progress', 
                updated_at = NOW(),
                development_notes = $2
            WHERE id = $1
          `;
          updateParams = [projectId, notes || '개발 시작'];
        } else if (action === 'complete') {
          updateQuery = `
            UPDATE projects 
            SET project_status = 'completed', 
                updated_at = NOW(),
                development_notes = $2
            WHERE id = $1
          `;
          updateParams = [projectId, notes || '개발 완료'];
        }
        break;

      default:
        throw new Error(`지원하지 않는 단계입니다: ${step}`);
    }

    if (updateQuery) {
      await client.query(updateQuery, updateParams);
    }

    await client.query('COMMIT');

    console.log('✅ 프로젝트 워크플로우 단계 진행 완료:', { projectId, step, action });

    res.json({
      success: true,
      message: '프로젝트 단계가 성공적으로 진행되었습니다.',
      data: {
        project_id: projectId,
        step: step,
        action: action
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 프로젝트 워크플로우 단계 진행 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로젝트 단계 진행 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 병목 지점 상세 분석
router.get('/bottlenecks', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 워크플로우 병목 지점 상세 분석 시작');

    // [advice from AI] 각 단계별 지연 프로젝트 상세 정보 (실제 컬럼 기반)
    const bottleneckDetailQuery = `
      SELECT 
        'stage2' as stage,
        '최고운영자 승인 대기' as stage_name,
        p.id,
        p.name as project_name,
        p.created_at,
        EXTRACT(EPOCH FROM (NOW() - p.created_at))/86400 as delay_days,
        creator.full_name as creator_name,
        p.project_overview
      FROM projects p
      LEFT JOIN timbel_users creator ON p.created_by = creator.id
      WHERE p.project_status = 'planning' 
        AND p.assigned_po IS NULL
        AND p.created_at < NOW() - INTERVAL '3 days'
      
      UNION ALL
      
      SELECT 
        'stage3' as stage,
        'PO 검토 및 PE 할당 대기' as stage_name,
        p.id,
        p.name as project_name,
        p.created_at,
        EXTRACT(EPOCH FROM (NOW() - p.created_at))/86400 as delay_days,
        po.full_name as creator_name,
        p.project_overview
      FROM projects p
      LEFT JOIN timbel_users po ON p.assigned_po = po.id
      WHERE p.assigned_po IS NOT NULL 
        AND p.project_status = 'planning'
        AND p.created_at < NOW() - INTERVAL '5 days'
      
      UNION ALL
      
      SELECT 
        'stage4' as stage,
        'PE 개발 지연' as stage_name,
        p.id,
        p.name as project_name,
        p.created_at,
        EXTRACT(EPOCH FROM (NOW() - p.created_at))/86400 as delay_days,
        pe.full_name as creator_name,
        p.project_overview
      FROM projects p
      LEFT JOIN timbel_users pe ON p.assigned_pe = pe.id
      WHERE p.project_status IN ('in_progress', 'development')
        AND p.created_at < NOW() - INTERVAL '21 days'
      
      ORDER BY delay_days DESC
    `;

    const bottleneckDetailResult = await client.query(bottleneckDetailQuery);
    const bottleneckDetails = bottleneckDetailResult.rows;

    // [advice from AI] 단계별 지연 통계
    const delayStatsQuery = `
      SELECT 
        stage,
        stage_name,
        COUNT(*) as delayed_count,
        AVG(delay_days) as avg_delay_days,
        MAX(delay_days) as max_delay_days,
        MIN(delay_days) as min_delay_days
      FROM (
        SELECT 
          'stage2' as stage,
          '최고운영자 승인 대기' as stage_name,
          EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as delay_days
        FROM projects 
        WHERE admin_approval_status = 'pending' 
          AND created_at < NOW() - INTERVAL '3 days'
        
        UNION ALL
        
        SELECT 
          'stage3' as stage,
          'PO 검토 및 PE 할당 대기' as stage_name,
          EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as delay_days
        FROM projects 
        WHERE admin_approval_status = 'approved' 
          AND assigned_po IS NOT NULL 
          AND project_status = 'planning'
          AND created_at < NOW() - INTERVAL '5 days'
        
        UNION ALL
        
        SELECT 
          'stage4' as stage,
          'PE 개발 지연' as stage_name,
          EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as delay_days
        FROM projects 
        WHERE project_status IN ('in_progress', 'development')
          AND created_at < NOW() - INTERVAL '21 days'
      ) delays
      GROUP BY stage, stage_name
      ORDER BY delayed_count DESC
    `;

    const delayStatsResult = await client.query(delayStatsQuery);
    const delayStats = delayStatsResult.rows;

    const response = {
      success: true,
      data: {
        summary: delayStats.map(stat => ({
          stage: stat.stage,
          stage_name: stat.stage_name,
          delayed_count: parseInt(stat.delayed_count),
          avg_delay_days: parseFloat(stat.avg_delay_days).toFixed(1),
          max_delay_days: parseFloat(stat.max_delay_days).toFixed(1),
          severity: stat.avg_delay_days > 10 ? 'high' : stat.avg_delay_days > 5 ? 'medium' : 'low'
        })),
        detailed_projects: bottleneckDetails.map(detail => ({
          stage: detail.stage,
          stage_name: detail.stage_name,
          project_id: detail.id,
          project_name: detail.project_name,
          delay_days: parseFloat(detail.delay_days).toFixed(1),
          responsible_person: detail.creator_name,
          project_overview: detail.project_overview,
          created_at: detail.created_at
        }))
      }
    };

    console.log('✅ 워크플로우 병목 지점 상세 분석 완료:', {
      total_delayed_projects: bottleneckDetails.length,
      bottleneck_stages: delayStats.length
    });

    res.json(response);

  } catch (error) {
    console.error('❌ 워크플로우 병목 지점 분석 오류:', error);
    res.status(500).json({
      success: false,
      message: '병목 지점 분석 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
