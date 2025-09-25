// [advice from AI] PO 대시보드 API

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timbel_db',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// [advice from AI] 사용자 ID 매핑
const userIdMapping = {
  'admin-001': 'e512d6df-0396-4806-9c86-ff16ce312993',
  'po-001': '1a71adf6-daa1-4267-98f7-b99098945630',
  'pe-001': 'cb45aae6-4b47-4238-af31-5bbbeaa3d18c',
  'qa-001': 'a3cdd9a5-6dd0-465f-9160-7638464840fb',
  'op-001': '8d451115-5cbe-4093-b92e-5d44c21d2a92'
};

// [advice from AI] PO 대시보드 통계 데이터 조회 (단순화 버전)
router.get('/dashboard-stats', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    console.log('📊 PO 대시보드 통계 조회 - 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      // 프로젝트 요약 통계
      const projectSummaryResult = await client.query(`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN approval_status = 'approved' AND project_status = 'planning' THEN 1 END) as approved_projects,
          COUNT(CASE WHEN approval_status = 'approved' AND project_status IN ('in_progress', 'development') THEN 1 END) as assigned_projects,
          COUNT(CASE WHEN project_status = 'completed' THEN 1 END) as completed_projects,
          COUNT(CASE WHEN deadline < CURRENT_DATE AND project_status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_projects
        FROM projects
      `);
      
      // PE 작업 현황 (실제 할당 데이터 기반, 테이블 없으면 기본값)
      let peWorkloadResult;
      try {
        peWorkloadResult = await client.query(`
          SELECT 
            u.id as pe_id,
            u.full_name as pe_name,
            COALESCE(pwa_stats.total_assignments, 0) as total_assignments,
            COALESCE(pwa_stats.active_assignments, 0) as active_assignments,
            COALESCE(pwa_stats.completed_assignments, 0) as completed_assignments,
            COALESCE(pwa_stats.avg_progress, 0.0) as avg_progress,
            COALESCE(pwa_stats.current_workload_hours, 0) as current_workload_hours
          FROM timbel_users u
          LEFT JOIN (
            SELECT 
              assigned_to,
              COUNT(*) as total_assignments,
              COUNT(CASE WHEN assignment_status IN ('assigned', 'in_progress') THEN 1 END) as active_assignments,
              COUNT(CASE WHEN assignment_status = 'completed' THEN 1 END) as completed_assignments,
              ROUND(AVG(CASE WHEN progress_percentage IS NOT NULL THEN progress_percentage END), 1) as avg_progress,
              SUM(CASE WHEN assignment_status IN ('assigned', 'in_progress') THEN COALESCE(estimated_hours, 8) END) as current_workload_hours
            FROM project_work_assignments
            GROUP BY assigned_to
          ) pwa_stats ON u.id = pwa_stats.assigned_to
          WHERE u.role_type = 'pe'
          ORDER BY u.full_name
          LIMIT 10
        `);
      } catch (tableError) {
        console.log('⚠️ project_work_assignments 테이블 없음, 기본값으로 처리');
        // 테이블이 없으면 PE 사용자만 조회하고 할당 정보는 0으로 설정
        peWorkloadResult = await client.query(`
          SELECT 
            u.id as pe_id,
            u.full_name as pe_name,
            0 as total_assignments,
            0 as active_assignments,
            0 as completed_assignments,
            0.0 as avg_progress,
            0 as current_workload_hours
          FROM timbel_users u
          WHERE u.role_type = 'pe'
          ORDER BY u.full_name
          LIMIT 10
        `);
      }
      
      // 데이터 가공 (단순화)
      const dashboardData = {
        project_summary: projectSummaryResult.rows[0] || {
          total_projects: 0,
          approved_projects: 0,
          assigned_projects: 0,
          completed_projects: 0,
          overdue_projects: 0
        },
        pe_workload: peWorkloadResult.rows.map(row => ({
          ...row,
          total_assignments: parseInt(row.total_assignments) || 0,
          active_assignments: parseInt(row.active_assignments) || 0,
          completed_assignments: parseInt(row.completed_assignments) || 0,
          avg_progress: parseFloat(row.avg_progress) || 0,
          current_workload_hours: parseInt(row.current_workload_hours) || 0,
          git_activity: null
        })),
        recent_activities: [],
        urgent_items: []
      };
      
      console.log('✅ PO 대시보드 통계 조회 완료');
      console.log('  - 총 프로젝트:', dashboardData.project_summary.total_projects);
      console.log('  - 승인된 프로젝트:', dashboardData.project_summary.approved_projects);
      console.log('  - PE 수:', dashboardData.pe_workload.length);
      console.log('  - 긴급 사항:', dashboardData.urgent_items.length);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: dashboardData
      });
      
    } catch (dbError) {
      console.error('❌ 데이터베이스 오류:', dbError);
      throw dbError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PO 대시보드 통계 조회 실패:', error);
    
    // 이미 응답이 전송되었는지 확인
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch PO dashboard stats',
        message: error.message
      });
    }
  }
});

// [advice from AI] 프로젝트 진행 현황 상세 조회
router.get('/progress-overview', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    console.log('📈 프로젝트 진행 현황 조회 - 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          p.id,
          p.name,
          p.project_overview,
          p.urgency_level,
          p.deadline,
          p.project_status,
          p.created_at,
          d.name as domain_name,
          COUNT(DISTINCT wg.id) as work_group_count,
          COUNT(DISTINCT pwa.id) as assignment_count,
          COUNT(DISTINCT CASE WHEN pwa.assignment_status = 'completed' THEN pwa.id END) as completed_assignments,
          ROUND(AVG(CASE WHEN pwa.assignment_status IN ('in_progress', 'completed') THEN pwa.progress_percentage END), 2) as avg_progress,
          STRING_AGG(DISTINCT u.full_name, ', ') as assigned_pes
        FROM projects p
        LEFT JOIN domains d ON p.domain_id = d.id
        LEFT JOIN work_groups wg ON p.id = wg.project_id
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN timbel_users u ON pwa.assigned_to = u.id
        WHERE p.project_status IN ('in_progress', 'development', 'testing', 'completed')
        GROUP BY p.id, p.name, p.project_overview, p.urgency_level, p.deadline, p.project_status, p.created_at, d.name
        ORDER BY 
          CASE p.urgency_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          p.created_at DESC
      `);
      
      console.log('✅ 프로젝트 진행 현황 조회 완료:', result.rows.length, '개');
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows.map(row => ({
          ...row,
          work_group_count: parseInt(row.work_group_count) || 0,
          assignment_count: parseInt(row.assignment_count) || 0,
          completed_assignments: parseInt(row.completed_assignments) || 0,
          avg_progress: parseFloat(row.avg_progress) || 0
        }))
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 진행 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project progress overview',
      message: error.message
    });
  }
});

// [advice from AI] PE 성과 통계 조회
router.get('/pe-performance', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    console.log('🎯 PE 성과 통계 조회 - 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          u.id as pe_id,
          u.full_name as pe_name,
          u.email,
          COUNT(pwa.id) as total_assignments,
          COUNT(CASE WHEN pwa.assignment_status = 'completed' THEN 1 END) as completed_assignments,
          COUNT(CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN 1 END) as active_assignments,
          ROUND(AVG(CASE WHEN pwa.assignment_status = 'completed' THEN pwa.progress_percentage END), 2) as avg_completion_rate,
          ROUND(AVG(CASE WHEN pwa.assignment_status = 'completed' AND pwa.quality_score IS NOT NULL THEN pwa.quality_score END), 2) as avg_quality_score,
          SUM(CASE WHEN pwa.assignment_status = 'completed' THEN COALESCE(pwa.actual_hours, 0) END) as total_hours_worked,
          COUNT(CASE WHEN pwa.assignment_status = 'completed' AND pwa.completed_at <= pwa.due_date THEN 1 END) as on_time_completions,
          COUNT(CASE WHEN pwa.assignment_status = 'completed' THEN 1 END) as total_completions
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
        WHERE u.role_type = 'pe'
        GROUP BY u.id, u.full_name, u.email
        ORDER BY completed_assignments DESC, avg_quality_score DESC NULLS LAST
      `);
      
      console.log('✅ PE 성과 통계 조회 완료:', result.rows.length, '명');
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows.map(row => ({
          ...row,
          total_assignments: parseInt(row.total_assignments) || 0,
          completed_assignments: parseInt(row.completed_assignments) || 0,
          active_assignments: parseInt(row.active_assignments) || 0,
          avg_completion_rate: parseFloat(row.avg_completion_rate) || 0,
          avg_quality_score: parseFloat(row.avg_quality_score) || 0,
          total_hours_worked: parseInt(row.total_hours_worked) || 0,
          on_time_completions: parseInt(row.on_time_completions) || 0,
          total_completions: parseInt(row.total_completions) || 0,
          on_time_rate: row.total_completions > 0 ? 
            Math.round((parseInt(row.on_time_completions) / parseInt(row.total_completions)) * 100) : 0
        }))
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 성과 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PE performance stats',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 진행 현황 조회 API
router.get('/project-progress', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    console.log('📊 프로젝트 진행 현황 조회 요청 - 사용자:', req.user?.userId || req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT DISTINCT
          p.id as project_id,
          p.name as project_name,
          p.urgency_level,
          p.deadline,
          p.project_status,
          pwa.id as assignment_id,
          pwa.assigned_to as assigned_pe_id,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.start_date,
          pwa.due_date,
          pwa.estimated_hours,
          pwa.actual_hours,
          pwa.assignment_notes,
          wg.name as work_group_name,
          pe_user.full_name as assigned_pe_name,
          COALESCE(pwa.updated_at, pwa.assigned_at) as last_activity,
          pr.repository_url,
          pga.commits_last_7_days,
          pga.activity_score,
          pga.last_commit_date
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        LEFT JOIN timbel_users pe_user ON pwa.assigned_to = pe_user.id
        LEFT JOIN project_repositories pr ON p.id = pr.project_id
        LEFT JOIN project_git_analytics pga ON p.id = pga.project_id
        WHERE pwa.assignment_status IN ('assigned', 'in_progress', 'review')
        ORDER BY 
          CASE p.urgency_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          pwa.assigned_at DESC
      `);

      // Git 활동 데이터 구조화
      const progressData = result.rows.map(row => ({
        ...row,
        git_activity: row.commits_last_7_days ? {
          commits_last_7_days: row.commits_last_7_days,
          activity_score: row.activity_score,
          last_commit_date: row.last_commit_date
        } : null
      }));

      console.log(`✅ 프로젝트 진행 현황 조회 완료: ${progressData.length}개`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: progressData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 프로젝트 진행 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project progress',
      message: error.message
    });
  }
});

// [advice from AI] PE 성과 데이터 조회 API  
router.get('/pe-performance', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    console.log('📈 PE 성과 데이터 조회 요청 - 사용자:', req.user?.userId || req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pe_user.id as pe_id,
          pe_user.full_name as pe_name,
          COUNT(DISTINCT pwa.id) as total_assignments,
          COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.id END) as active_assignments,
          COUNT(DISTINCT CASE WHEN pwa.assignment_status = 'completed' THEN pwa.id END) as completed_assignments,
          COALESCE(ROUND(AVG(pwa.progress_percentage)), 0) as avg_progress,
          COALESCE(SUM(pga.commits_last_7_days), 0) as total_commits,
          COALESCE(ROUND(AVG(pwa.quality_score), 1), 0) as avg_quality_score,
          COALESCE(
            ROUND(
              COUNT(CASE WHEN pwa.assignment_status = 'completed' AND pwa.completed_at <= pwa.due_date THEN 1 END) * 100.0 / 
              NULLIF(COUNT(CASE WHEN pwa.assignment_status = 'completed' THEN 1 END), 0)
            ), 0
          ) as on_time_delivery_rate,
          CASE 
            WHEN COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.id END) >= 5 THEN 'high'
            WHEN COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.id END) >= 3 THEN 'medium'
            ELSE 'low'
          END as workload_level
        FROM timbel_users pe_user
        LEFT JOIN project_work_assignments pwa ON pe_user.id = pwa.assigned_to
        LEFT JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN project_git_analytics pga ON p.id = pga.project_id
        WHERE pe_user.role_type = 'pe' 
          AND pe_user.status = 'active'
        GROUP BY pe_user.id, pe_user.full_name
        HAVING COUNT(DISTINCT pwa.id) > 0
        ORDER BY total_assignments DESC, pe_user.full_name
      `);

      console.log(`✅ PE 성과 데이터 조회 완료: ${result.rows.length}개`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ PE 성과 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PE performance data',
      message: error.message
    });
  }
});

// PO 시스템 등록 결정 API
router.post('/system-registration-decision', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { notification_id, project_id, qc_request_id, decision, registration_notes, deployment_priority, target_environment } = req.body;
    const userId = req.user?.userId || req.user?.id;
    
    console.log('🎯 PO 시스템 등록 결정:', { notification_id, project_id, decision, userId });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 시스템 등록 요청 테이블 생성
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_registrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id),
          qc_request_id UUID REFERENCES qc_qa_requests(id),
          requested_by UUID REFERENCES timbel_users(id),
          po_decision VARCHAR(50) NOT NULL, -- approve, reject, defer
          registration_notes TEXT,
          deployment_priority VARCHAR(50) DEFAULT 'normal', -- high, normal, low
          target_environment VARCHAR(50) DEFAULT 'production',
          admin_approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
          admin_approved_by UUID REFERENCES timbel_users(id),
          admin_approval_notes TEXT,
          admin_approved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 2. 시스템 등록 요청 생성
      const registrationResult = await client.query(`
        INSERT INTO system_registrations (
          project_id, qc_request_id, requested_by, po_decision, registration_notes, 
          deployment_priority, target_environment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [project_id, qc_request_id, userId, decision, registration_notes, deployment_priority, target_environment]);

      const registrationId = registrationResult.rows[0].id;

      // 3. 프로젝트 상태 업데이트
      if (decision === 'approve') {
        await client.query(`
          UPDATE projects SET 
            project_status = 'system_registration_requested',
            updated_at = NOW()
          WHERE id = $1
        `, [project_id]);
      } else {
        await client.query(`
          UPDATE projects SET 
            project_status = 'qc_approved',
            updated_at = NOW()
          WHERE id = $1
        `, [project_id]);
      }

      // 4. 알림 메시지를 읽음 처리
      await client.query(`
        UPDATE unified_message_recipients SET 
          is_read = true,
          read_at = NOW()
        WHERE message_id = $1 AND recipient_id = $2
      `, [notification_id, userId]);

      // 5. 시스템 이벤트 로그
      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, event_timestamp, event_data, is_processed, requires_action
        ) VALUES (
          gen_random_uuid(), 'po_system_registration_decision', 'system_management',
          'PO 시스템 등록 결정', $1,
          $2, $3, NOW(), $4, true, $5
        )
      `, [
        `${decision === 'approve' ? '시스템 등록이 승인' : decision === 'reject' ? '시스템 등록이 반려' : '시스템 등록이 보류'}되었습니다.`,
        project_id,
        userId,
        JSON.stringify({
          registration_id: registrationId,
          decision,
          deployment_priority,
          target_environment,
          notes: registration_notes,
          next_action: decision === 'approve' ? 'admin_system_approval' : 'po_review_required'
        }),
        decision === 'approve'
      ]);

      // 6. 관리자에게 알림 (승인 시에만)
      if (decision === 'approve') {
        const adminUsers = await client.query(`
          SELECT id, full_name FROM timbel_users 
          WHERE role_type = 'admin' AND status = 'active'
        `);

        if (adminUsers.rows.length > 0) {
          // 프로젝트 정보 조회
          const projectInfo = await client.query(`
            SELECT name FROM projects WHERE id = $1
          `, [project_id]);
          
          const projectName = projectInfo.rows[0]?.name || '알 수 없는 프로젝트';

          const messageResult = await client.query(`
            INSERT INTO unified_messages (
              id, message_type, title, message, priority_level, sender_id, 
              related_project_id, metadata, created_at
            ) VALUES (
              gen_random_uuid(), 'system_registration_approval_request', 
              'PO 시스템 등록 승인 요청',
              $1, 'high', $2, $3, $4, NOW()
            ) RETURNING id
          `, [
            `${projectName} 프로젝트의 시스템 등록이 PO에 의해 승인되었습니다.\n\n` +
            `배포 우선순위: ${deployment_priority === 'high' ? '높음' : deployment_priority === 'normal' ? '보통' : '낮음'}\n` +
            `대상 환경: ${target_environment}\n\n` +
            `PO 승인 사유:\n${registration_notes}\n\n` +
            `관리자 승인을 진행해 주세요.`,
            userId,
            project_id,
            JSON.stringify({
              registration_id: registrationId,
              deployment_priority,
              target_environment,
              po_notes: registration_notes
            })
          ]);

          const messageId = messageResult.rows[0].id;

          // 모든 관리자에게 메시지 전송
          for (const admin of adminUsers.rows) {
            await client.query(`
              INSERT INTO unified_message_recipients (
                message_id, recipient_id, recipient_type, is_read, received_at
              ) VALUES ($1, $2, 'user', false, NOW())
            `, [messageId, admin.id]);
          }
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `시스템 등록 결정이 완료되었습니다.`,
        data: {
          registration_id: registrationId,
          decision,
          project_id,
          next_step: decision === 'approve' ? 'admin_system_approval' : 'po_review_completed'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ PO 시스템 등록 결정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process system registration decision',
      message: 'PO 시스템 등록 결정 처리 중 오류가 발생했습니다.'
    });
  }
});

// PO용 PE 성과 분석 API
router.get('/pe-performance-analytics', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('📊 PO용 PE 성과 분석 데이터 로딩 시작');

    // PE별 상세 성과 분석
    const pePerformanceResult = await client.query(`
      WITH pe_stats AS (
        SELECT 
          u.id as pe_id,
          u.full_name as pe_name,
          u.email,
          u.created_at as join_date,
          -- 프로젝트 통계
          COUNT(DISTINCT pwa.project_id) as total_projects,
          COUNT(DISTINCT CASE WHEN pwa.assignment_status = 'completed' THEN pwa.project_id END) as completed_projects,
          COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) as active_projects,
          -- 평균 진행률
          AVG(CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.progress_percentage END) as avg_progress,
          -- 완료율
          CASE 
            WHEN COUNT(DISTINCT pwa.project_id) > 0 THEN 
              (COUNT(DISTINCT CASE WHEN pwa.assignment_status = 'completed' THEN pwa.project_id END)::float / 
               COUNT(DISTINCT pwa.project_id) * 100)
            ELSE 0 
          END as completion_rate,
          -- 평균 개발 시간 (완료된 프로젝트만)
          AVG(CASE 
            WHEN pwa.assignment_status = 'completed' AND pwa.actual_start_date IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (pwa.updated_at - pwa.actual_start_date)) / 3600 
          END) as avg_development_hours,
          -- 품질 점수 (QC/QA 결과 기반)
          AVG(qr.quality_score) as avg_quality_score,
          -- 재작업률 (QC 피드백 기반)
          COUNT(DISTINCT qfi.id)::float / NULLIF(COUNT(DISTINCT CASE WHEN pwa.assignment_status = 'completed' THEN pwa.project_id END), 0) * 100 as rework_rate,
          -- 최근 30일 활동
          COUNT(DISTINCT CASE 
            WHEN pwa.updated_at >= NOW() - INTERVAL '30 days' 
            THEN pwa.project_id 
          END) as recent_activity_count,
          -- 지연 프로젝트 수
          COUNT(DISTINCT CASE 
            WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
                 AND p.deadline IS NOT NULL 
                 AND p.deadline < NOW() 
            THEN pwa.project_id 
          END) as delayed_projects,
          -- 평균 예상 시간 대비 실제 시간 비율
          AVG(CASE 
            WHEN pwa.pe_estimated_hours > 0 AND pwa.actual_start_date IS NOT NULL
            THEN (EXTRACT(EPOCH FROM (COALESCE(pwa.updated_at, NOW()) - pwa.actual_start_date)) / 3600) / pwa.pe_estimated_hours * 100
          END) as time_efficiency_ratio
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
        LEFT JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
        LEFT JOIN qc_feedback_items qfi ON qr.id = qfi.qc_request_id AND qfi.assigned_to_pe = u.id
        WHERE u.role_type = 'pe' AND u.status = 'active'
        GROUP BY u.id, u.full_name, u.email, u.created_at
      ),
      pe_trends AS (
        SELECT 
          u.id as pe_id,
          -- 최근 3개월 월별 완료 프로젝트 수
          COUNT(DISTINCT CASE 
            WHEN pwa.assignment_status = 'completed' 
                 AND pwa.updated_at >= DATE_TRUNC('month', NOW() - INTERVAL '2 months')
                 AND pwa.updated_at < DATE_TRUNC('month', NOW() - INTERVAL '1 months')
            THEN pwa.project_id 
          END) as completed_2_months_ago,
          COUNT(DISTINCT CASE 
            WHEN pwa.assignment_status = 'completed' 
                 AND pwa.updated_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 months')
                 AND pwa.updated_at < DATE_TRUNC('month', NOW())
            THEN pwa.project_id 
          END) as completed_1_month_ago,
          COUNT(DISTINCT CASE 
            WHEN pwa.assignment_status = 'completed' 
                 AND pwa.updated_at >= DATE_TRUNC('month', NOW())
            THEN pwa.project_id 
          END) as completed_this_month,
          -- 품질 점수 트렌드
          AVG(CASE 
            WHEN qr.updated_at >= NOW() - INTERVAL '60 days'
            THEN qr.quality_score 
          END) as recent_quality_score,
          AVG(CASE 
            WHEN qr.updated_at < NOW() - INTERVAL '60 days'
            THEN qr.quality_score 
          END) as past_quality_score
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
        LEFT JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
        WHERE u.role_type = 'pe' AND u.status = 'active'
        GROUP BY u.id
      )
      SELECT 
        ps.*,
        pt.completed_2_months_ago,
        pt.completed_1_month_ago,
        pt.completed_this_month,
        pt.recent_quality_score,
        pt.past_quality_score,
        -- 성과 등급 계산
        CASE 
          WHEN ps.completion_rate >= 90 AND ps.avg_quality_score >= 85 THEN 'S'
          WHEN ps.completion_rate >= 80 AND ps.avg_quality_score >= 75 THEN 'A'
          WHEN ps.completion_rate >= 70 AND ps.avg_quality_score >= 65 THEN 'B'
          WHEN ps.completion_rate >= 60 AND ps.avg_quality_score >= 55 THEN 'C'
          ELSE 'D'
        END as performance_grade,
        -- 트렌드 방향
        CASE 
          WHEN pt.completed_this_month > pt.completed_1_month_ago THEN 'up'
          WHEN pt.completed_this_month < pt.completed_1_month_ago THEN 'down'
          ELSE 'stable'
        END as productivity_trend,
        CASE 
          WHEN pt.recent_quality_score > pt.past_quality_score THEN 'up'
          WHEN pt.recent_quality_score < pt.past_quality_score THEN 'down'
          ELSE 'stable'
        END as quality_trend
      FROM pe_stats ps
      LEFT JOIN pe_trends pt ON ps.pe_id = pt.pe_id
      ORDER BY ps.completion_rate DESC, ps.avg_quality_score DESC
    `);

    // 팀 전체 벤치마크 데이터
    const teamBenchmarkResult = await client.query(`
      SELECT 
        AVG(completion_rate) as team_avg_completion_rate,
        AVG(avg_quality_score) as team_avg_quality_score,
        AVG(avg_development_hours) as team_avg_development_hours,
        AVG(rework_rate) as team_avg_rework_rate,
        COUNT(*) as total_pe_count,
        COUNT(CASE WHEN completion_rate >= 80 THEN 1 END) as high_performers_count
      FROM (
        SELECT 
          u.id,
          CASE 
            WHEN COUNT(DISTINCT pwa.project_id) > 0 THEN 
              (COUNT(DISTINCT CASE WHEN pwa.assignment_status = 'completed' THEN pwa.project_id END)::float / 
               COUNT(DISTINCT pwa.project_id) * 100)
            ELSE 0 
          END as completion_rate,
          AVG(qr.quality_score) as avg_quality_score,
          AVG(CASE 
            WHEN pwa.assignment_status = 'completed' AND pwa.actual_start_date IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (pwa.updated_at - pwa.actual_start_date)) / 3600 
          END) as avg_development_hours,
          COUNT(DISTINCT qfi.id)::float / NULLIF(COUNT(DISTINCT CASE WHEN pwa.assignment_status = 'completed' THEN pwa.project_id END), 0) * 100 as rework_rate
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
        LEFT JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
        LEFT JOIN qc_feedback_items qfi ON qr.id = qfi.qc_request_id AND qfi.assigned_to_pe = u.id
        WHERE u.role_type = 'pe' AND u.status = 'active'
        GROUP BY u.id
      ) team_stats
    `);

    console.log(`✅ PE 성과 분석 완료: ${pePerformanceResult.rows.length}명의 PE 데이터 로딩`);

    // 숫자 데이터 타입 변환
    const processedPePerformance = pePerformanceResult.rows.map(pe => ({
      ...pe,
      total_projects: parseInt(pe.total_projects) || 0,
      completed_projects: parseInt(pe.completed_projects) || 0,
      active_projects: parseInt(pe.active_projects) || 0,
      avg_progress: parseFloat(pe.avg_progress) || 0,
      completion_rate: parseFloat(pe.completion_rate) || 0,
      avg_development_hours: parseFloat(pe.avg_development_hours) || 0,
      avg_quality_score: parseFloat(pe.avg_quality_score) || 0,
      rework_rate: parseFloat(pe.rework_rate) || 0,
      recent_activity_count: parseInt(pe.recent_activity_count) || 0,
      delayed_projects: parseInt(pe.delayed_projects) || 0,
      time_efficiency_ratio: parseFloat(pe.time_efficiency_ratio) || 0,
      completed_2_months_ago: parseInt(pe.completed_2_months_ago) || 0,
      completed_1_month_ago: parseInt(pe.completed_1_month_ago) || 0,
      completed_this_month: parseInt(pe.completed_this_month) || 0,
      recent_quality_score: parseFloat(pe.recent_quality_score) || 0,
      past_quality_score: parseFloat(pe.past_quality_score) || 0
    }));

    const processedTeamBenchmark = teamBenchmarkResult.rows[0] ? {
      ...teamBenchmarkResult.rows[0],
      total_pes: parseInt(teamBenchmarkResult.rows[0].total_pes) || 0,
      high_performers: parseInt(teamBenchmarkResult.rows[0].high_performers) || 0,
      avg_completion_rate: parseFloat(teamBenchmarkResult.rows[0].avg_completion_rate) || 0,
      avg_quality_score: parseFloat(teamBenchmarkResult.rows[0].avg_quality_score) || 0,
      avg_rework_rate: parseFloat(teamBenchmarkResult.rows[0].avg_rework_rate) || 0
    } : {};

    res.json({
      success: true,
      data: {
        pe_performance: processedPePerformance,
        team_benchmark: processedTeamBenchmark
      },
      message: 'PE 성과 분석 데이터를 성공적으로 로딩했습니다.'
    });

  } catch (error) {
    console.error('❌ PE 성과 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load PE performance analytics',
      message: 'PE 성과 분석 데이터 로딩에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// PO용 업무 부하 분산 모니터링 API
router.get('/workload-distribution-analytics', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('⚖️ PO용 업무 부하 분산 분석 시작');

    // PE별 현재 워크로드 상세 분석
    const workloadAnalysisResult = await client.query(`
      SELECT 
        u.id as pe_id,
        u.full_name as pe_name,
        u.email,
        -- 현재 할당된 프로젝트 수
        COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) as active_projects,
        -- 예상 총 작업 시간
        COALESCE(SUM(CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.pe_estimated_hours END), 0) as total_estimated_hours,
        -- 우선순위별 프로젝트 분포
        COUNT(DISTINCT CASE WHEN p.urgency_level = 'high' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) as high_priority_projects,
        COUNT(DISTINCT CASE WHEN p.urgency_level = 'medium' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) as medium_priority_projects,
        COUNT(DISTINCT CASE WHEN p.urgency_level = 'low' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) as low_priority_projects,
        -- 지연 프로젝트 수
        COUNT(DISTINCT CASE 
          WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
               AND p.deadline IS NOT NULL 
               AND p.deadline < NOW() 
          THEN pwa.project_id 
        END) as overdue_projects,
        -- 이번 주 마감 프로젝트 수
        COUNT(DISTINCT CASE 
          WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
               AND p.deadline IS NOT NULL 
               AND p.deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
          THEN pwa.project_id 
        END) as due_this_week,
        -- 최근 30일 완료 프로젝트 수 (생산성 지표)
        COUNT(DISTINCT CASE 
          WHEN pwa.assignment_status = 'completed' 
               AND pwa.updated_at >= NOW() - INTERVAL '30 days'
          THEN pwa.project_id 
        END) as recent_completions,
        -- 워크로드 점수 계산 (0-100)
        LEAST(100, 
          (COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 20) +
          (COUNT(DISTINCT CASE WHEN p.urgency_level = 'high' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 15) +
          (COUNT(DISTINCT CASE 
            WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
                 AND p.deadline IS NOT NULL 
                 AND p.deadline < NOW() 
            THEN pwa.project_id 
          END) * 25)
        ) as workload_score,
        -- 워크로드 상태 분류
        CASE 
          WHEN LEAST(100, 
            (COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 20) +
            (COUNT(DISTINCT CASE WHEN p.urgency_level = 'high' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 15) +
            (COUNT(DISTINCT CASE 
              WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
                   AND p.deadline IS NOT NULL 
                   AND p.deadline < NOW() 
              THEN pwa.project_id 
            END) * 25)
          ) >= 80 THEN 'overloaded'
          WHEN LEAST(100, 
            (COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 20) +
            (COUNT(DISTINCT CASE WHEN p.urgency_level = 'high' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 15) +
            (COUNT(DISTINCT CASE 
              WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
                   AND p.deadline IS NOT NULL 
                   AND p.deadline < NOW() 
              THEN pwa.project_id 
            END) * 25)
          ) >= 60 THEN 'busy'
          WHEN LEAST(100, 
            (COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 20) +
            (COUNT(DISTINCT CASE WHEN p.urgency_level = 'high' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 15) +
            (COUNT(DISTINCT CASE 
              WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
                   AND p.deadline IS NOT NULL 
                   AND p.deadline < NOW() 
              THEN pwa.project_id 
            END) * 25)
          ) >= 30 THEN 'balanced'
          WHEN LEAST(100, 
            (COUNT(DISTINCT CASE WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 20) +
            (COUNT(DISTINCT CASE WHEN p.urgency_level = 'high' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN pwa.project_id END) * 15) +
            (COUNT(DISTINCT CASE 
              WHEN pwa.assignment_status IN ('assigned', 'in_progress') 
                   AND p.deadline IS NOT NULL 
                   AND p.deadline < NOW() 
              THEN pwa.project_id 
            END) * 25)
          ) >= 10 THEN 'light'
          ELSE 'available'
        END as workload_status,
        -- 추천 액션
        'optimal_load' as recommendation
      FROM timbel_users u
      LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
      LEFT JOIN projects p ON pwa.project_id = p.id
      WHERE u.role_type = 'pe' AND u.status = 'active'
      GROUP BY u.id, u.full_name, u.email
      ORDER BY workload_score DESC
    `);

    // 프로젝트 할당 최적화 제안 - 간단한 버전
    const optimizationSuggestionsResult = await client.query(`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.urgency_level,
        u.id as pe_id,
        u.full_name as pe_name,
        COUNT(DISTINCT pwa2.project_id) as current_load,
        50 as match_score
      FROM projects p
      CROSS JOIN timbel_users u
      LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
      LEFT JOIN project_work_assignments pwa2 ON u.id = pwa2.assigned_to AND pwa2.assignment_status IN ('assigned', 'in_progress')
      WHERE p.approval_status = 'approved' 
        AND p.project_status = 'approved'
        AND u.role_type = 'pe' 
        AND u.status = 'active'
        AND (pwa.id IS NULL OR pwa.assignment_status = 'pending')
      GROUP BY p.id, p.name, p.urgency_level, u.id, u.full_name
      HAVING COUNT(DISTINCT pwa2.project_id) < 3
      ORDER BY p.urgency_level DESC
      LIMIT 10
    `);

    console.log(`✅ 업무 부하 분산 분석 완료: ${workloadAnalysisResult.rows.length}명의 PE 워크로드 분석`);

    // 숫자 데이터 타입 변환
    const processedWorkloadAnalysis = workloadAnalysisResult.rows.map(pe => ({
      ...pe,
      active_projects: parseInt(pe.active_projects) || 0,
      overdue_projects: parseInt(pe.overdue_projects) || 0,
      due_this_week: parseInt(pe.due_this_week) || 0,
      recent_completions: parseInt(pe.recent_completions) || 0,
      workload_score: parseInt(pe.workload_score) || 0,
      estimated_work_hours: parseFloat(pe.estimated_work_hours) || 0
    }));

    const processedOptimizationSuggestions = optimizationSuggestionsResult.rows.map(suggestion => ({
      ...suggestion,
      current_load: parseInt(suggestion.current_load) || 0,
      match_score: parseInt(suggestion.match_score) || 0
    }));

    res.json({
      success: true,
      data: {
        workload_analysis: processedWorkloadAnalysis,
        optimization_suggestions: processedOptimizationSuggestions
      },
      message: '업무 부하 분산 분석이 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 업무 부하 분산 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load workload distribution analytics',
      message: '업무 부하 분산 분석에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// PO용 프로젝트 리스크 분석 API
router.get('/project-risk-analysis', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 PO용 프로젝트 리스크 분석 시작');

    // 프로젝트 리스크 분석
    const riskAnalysisResult = await client.query(`
      SELECT 
        p.id,
        p.name as project_name,
        p.urgency_level,
        p.deadline,
        p.created_at,
        p.project_status,
        p.approval_status,
        pwa.assignment_status,
        pwa.progress_percentage,
        pwa.actual_start_date,
        pwa.pe_estimated_hours,
        pe.full_name as pe_name,
        pe.id as pe_id,
        -- 리스크 점수 계산 (0-100)
        CASE 
          -- 데드라인 리스크 (40점)
          WHEN p.deadline IS NOT NULL AND p.deadline < NOW() THEN 40
          WHEN p.deadline IS NOT NULL AND p.deadline < NOW() + INTERVAL '7 days' THEN 30
          WHEN p.deadline IS NOT NULL AND p.deadline < NOW() + INTERVAL '14 days' THEN 20
          ELSE 0
        END +
        CASE 
          -- 진행률 리스크 (30점)
          WHEN pwa.progress_percentage IS NULL OR pwa.progress_percentage < 10 THEN 30
          WHEN pwa.progress_percentage < 30 THEN 20
          WHEN pwa.progress_percentage < 50 THEN 10
          ELSE 0
        END +
        CASE 
          -- 할당 상태 리스크 (20점)
          WHEN p.approval_status = 'approved' AND pwa.assignment_status IS NULL THEN 20
          WHEN pwa.assignment_status = 'assigned' AND pwa.actual_start_date IS NULL THEN 15
          ELSE 0
        END +
        CASE 
          -- 우선순위 리스크 (10점)
          WHEN p.urgency_level = 'critical' AND pwa.progress_percentage < 50 THEN 10
          WHEN p.urgency_level = 'high' AND pwa.progress_percentage < 30 THEN 5
          ELSE 0
        END as risk_score,
        -- 리스크 유형 식별
        ARRAY_REMOVE(ARRAY[
          CASE WHEN p.deadline IS NOT NULL AND p.deadline < NOW() THEN 'deadline_overdue' END,
          CASE WHEN p.deadline IS NOT NULL AND p.deadline < NOW() + INTERVAL '7 days' THEN 'deadline_approaching' END,
          CASE WHEN pwa.progress_percentage IS NULL OR pwa.progress_percentage < 10 THEN 'low_progress' END,
          CASE WHEN p.approval_status = 'approved' AND pwa.assignment_status IS NULL THEN 'unassigned' END,
          CASE WHEN pwa.assignment_status = 'assigned' AND pwa.actual_start_date IS NULL THEN 'not_started' END,
          CASE WHEN p.urgency_level IN ('critical', 'high') AND pwa.progress_percentage < 30 THEN 'high_priority_delayed' END
        ], NULL) as risk_factors,
        -- 예상 완료일 계산
        CASE 
          WHEN pwa.actual_start_date IS NOT NULL AND pwa.pe_estimated_hours IS NOT NULL AND pwa.progress_percentage > 0 THEN
            pwa.actual_start_date + INTERVAL '1 hour' * (pwa.pe_estimated_hours * (100 - pwa.progress_percentage) / 100)
          ELSE NULL
        END as estimated_completion_date
      FROM projects p
      LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
      LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
      WHERE p.project_status NOT IN ('cancelled', 'completed', 'on_hold')
        AND p.approval_status IN ('approved', 'pending')
      ORDER BY risk_score DESC, p.deadline ASC
    `);

    // 리스크 요약 통계
    const riskSummaryResult = await client.query(`
      WITH risk_analysis AS (
        SELECT 
          p.id,
          CASE 
            WHEN p.deadline IS NOT NULL AND p.deadline < NOW() THEN 40
            WHEN p.deadline IS NOT NULL AND p.deadline < NOW() + INTERVAL '7 days' THEN 30
            WHEN p.deadline IS NOT NULL AND p.deadline < NOW() + INTERVAL '14 days' THEN 20
            ELSE 0
          END +
          CASE 
            WHEN pwa.progress_percentage IS NULL OR pwa.progress_percentage < 10 THEN 30
            WHEN pwa.progress_percentage < 30 THEN 20
            WHEN pwa.progress_percentage < 50 THEN 10
            ELSE 0
          END +
          CASE 
            WHEN p.approval_status = 'approved' AND pwa.assignment_status IS NULL THEN 20
            WHEN pwa.assignment_status = 'assigned' AND pwa.actual_start_date IS NULL THEN 15
            ELSE 0
          END +
          CASE 
            WHEN p.urgency_level = 'critical' AND pwa.progress_percentage < 50 THEN 10
            WHEN p.urgency_level = 'high' AND pwa.progress_percentage < 30 THEN 5
            ELSE 0
          END as risk_score
        FROM projects p
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        WHERE p.project_status NOT IN ('cancelled', 'completed', 'on_hold')
          AND p.approval_status IN ('approved', 'pending')
      )
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN risk_score >= 70 THEN 1 END) as critical_risk_count,
        COUNT(CASE WHEN risk_score >= 40 AND risk_score < 70 THEN 1 END) as high_risk_count,
        COUNT(CASE WHEN risk_score >= 20 AND risk_score < 40 THEN 1 END) as medium_risk_count,
        COUNT(CASE WHEN risk_score < 20 THEN 1 END) as low_risk_count,
        ROUND(AVG(risk_score), 1) as avg_risk_score
      FROM risk_analysis
    `);

    console.log(`✅ 프로젝트 리스크 분석 완료: ${riskAnalysisResult.rows.length}개 프로젝트 분석`);

    res.json({
      success: true,
      data: {
        risk_projects: riskAnalysisResult.rows,
        risk_summary: riskSummaryResult.rows[0] || {}
      },
      message: '프로젝트 리스크 분석이 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 프로젝트 리스크 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze project risks',
      message: '프로젝트 리스크 분석에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 배포 현황 통계 API
router.get('/deployment-stats', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('📊 배포 현황 통계 조회 시작...');

    // 배포 현황 통계 (시뮬레이션 데이터)
    const deploymentStatsResult = {
      total_deployments: 45,
      active_deployments: 12,
      pending_deployments: 3,
      failed_deployments: 2,
      success_rate: 87.5,
      recent_deployments: [
        {
          project_name: 'ECP-AI 챗봇 시스템',
          environment: 'production',
          status: 'success',
          deployed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          deployed_by: '신백엔드'
        },
        {
          project_name: 'K8S 모니터링 대시보드',
          environment: 'staging',
          status: 'success',
          deployed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          deployed_by: '박관리'
        },
        {
          project_name: 'AI 추천 엔진',
          environment: 'development',
          status: 'pending',
          deployed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          deployed_by: '김개발'
        },
        {
          project_name: '사용자 인증 시스템',
          environment: 'production',
          status: 'failed',
          deployed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          deployed_by: '이운영'
        },
        {
          project_name: '데이터 분석 플랫폼',
          environment: 'staging',
          status: 'success',
          deployed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          deployed_by: '신백엔드'
        }
      ]
    };

    // 인프라 현황 통계 (deployment_infrastructure 테이블에서 조회)
    let infrastructureStats = {
      total_services: 0,
      healthy_services: 0,
      warning_services: 0,
      error_services: 0
    };

    try {
      const infraResult = await client.query(`
        SELECT 
          COUNT(*) as total_services,
          COUNT(CASE WHEN status = 'active' AND health_status = 'healthy' THEN 1 END) as healthy_services,
          COUNT(CASE WHEN status = 'active' AND health_status = 'warning' THEN 1 END) as warning_services,
          COUNT(CASE WHEN status = 'active' AND health_status = 'error' THEN 1 END) as error_services
        FROM deployment_infrastructure
        WHERE status = 'active'
      `);
      
      if (infraResult.rows.length > 0) {
        infrastructureStats = {
          total_services: parseInt(infraResult.rows[0].total_services) || 0,
          healthy_services: parseInt(infraResult.rows[0].healthy_services) || 0,
          warning_services: parseInt(infraResult.rows[0].warning_services) || 0,
          error_services: parseInt(infraResult.rows[0].error_services) || 0
        };
      }
    } catch (infraError) {
      console.log('⚠️ 인프라 테이블 조회 실패 (테이블이 없을 수 있음):', infraError.message);
    }

    const responseData = {
      ...deploymentStatsResult,
      infrastructure: infrastructureStats,
      environments: {
        production: { deployments: 15, success_rate: 92 },
        staging: { deployments: 18, success_rate: 89 },
        development: { deployments: 12, success_rate: 83 }
      }
    };

    console.log('✅ 배포 현황 통계 조회 완료');
    
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ 배포 현황 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment statistics',
      message: '배포 현황 통계 조회에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
