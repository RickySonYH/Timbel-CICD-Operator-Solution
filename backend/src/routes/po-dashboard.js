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
          COUNT(CASE WHEN project_status IN ('in_progress', 'development') THEN 1 END) as assigned_projects,
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

module.exports = router;
