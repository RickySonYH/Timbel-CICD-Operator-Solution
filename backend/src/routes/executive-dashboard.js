// [advice from AI] 경영진 대시보드 API
// 최고관리자용 전체 시스템 현황, 전략적 지표, 조직 성과 데이터 제공

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// [advice from AI] 경영진 대시보드 메인 데이터
router.get('/overview', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // 1. 시스템 전체 현황
      const systemOverview = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM timbel_users WHERE is_active = true) as total_users,
          (SELECT COUNT(*) FROM projects WHERE project_status NOT IN ('cancelled', 'completed')) as active_projects,
          (SELECT COUNT(*) FROM projects WHERE project_status = 'operational') as operational_systems,
          (SELECT COUNT(*) FROM build_failures WHERE created_at > NOW() - INTERVAL '24 hours') as recent_failures,
          (SELECT COUNT(*) FROM issue_reports WHERE status = 'open') as open_issues
      `);
      
      // 2. 프로젝트 상태 분포
      const projectDistribution = await client.query(`
        SELECT 
          project_status,
          urgency_level,
          COUNT(*) as count,
          AVG(expected_completion_hours) as avg_hours,
          SUM(expected_completion_hours) as total_hours
        FROM projects 
        WHERE project_status NOT IN ('cancelled')
        GROUP BY project_status, urgency_level
        ORDER BY 
          CASE urgency_level 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2  
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          CASE project_status
            WHEN 'draft' THEN 1
            WHEN 'pending_approval' THEN 2
            WHEN 'po_approved' THEN 3
            WHEN 'pe_assigned' THEN 4
            WHEN 'qa_requested' THEN 5
            WHEN 'qa_approved' THEN 6
            WHEN 'deployment_requested' THEN 7
            WHEN 'deployed' THEN 8
            WHEN 'operational' THEN 9
          END
      `);
      
      // 3. 조직별 성과 지표
      const organizationStats = await client.query(`
        SELECT 
          role_type,
          COUNT(*) as total_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
          ROUND(AVG(CASE WHEN is_active = true THEN 100 ELSE 0 END), 1) as activity_rate
        FROM timbel_users 
        GROUP BY role_type
        ORDER BY 
          CASE role_type
            WHEN 'executive' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'po' THEN 3
            WHEN 'pe' THEN 4
            WHEN 'qa' THEN 5
            WHEN 'operations' THEN 6
            ELSE 7
          END
      `);
      
      // 4. 비즈니스 메트릭 (메타데이터에서 추출)
      const businessMetrics = await client.query(`
        SELECT 
          COUNT(*) as total_strategic_projects,
          AVG(CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER)) as avg_expected_roi,
          SUM(expected_completion_hours) as total_investment_hours,
          COUNT(CASE WHEN urgency_level IN ('critical', 'high') THEN 1 END) as high_priority_projects,
          COUNT(CASE WHEN is_urgent_development = true THEN 1 END) as urgent_projects
        FROM projects 
        WHERE metadata->>'strategic_priority' IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      // 5. 최근 주요 활동 (프로젝트 승인, 완료 등)
      const recentActivities = await client.query(`
        SELECT 
          'project_approval' as activity_type,
          p.name as project_name,
          pa.approval_action,
          pa.approved_at as activity_time,
          u.full_name as actor_name,
          p.metadata->>'expected_roi' as expected_roi,
          p.expected_completion_hours
        FROM project_approvals pa
        JOIN projects p ON pa.project_id = p.id
        JOIN timbel_users u ON pa.approver_id = u.id
        WHERE pa.approved_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'project_creation' as activity_type,
          name as project_name,
          project_status as approval_action,
          created_at as activity_time,
          (SELECT full_name FROM timbel_users WHERE id = created_by) as actor_name,
          metadata->>'expected_roi' as expected_roi,
          expected_completion_hours
        FROM projects 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        ORDER BY activity_time DESC
        LIMIT 10
      `);
      
      // 6. 워크플로우 효율성 지표
      const workflowEfficiency = await client.query(`
        SELECT 
          COUNT(DISTINCT p.id) as projects_in_workflow,
          AVG(EXTRACT(DAYS FROM (COALESCE(pa.approved_at, NOW()) - p.created_at))) as avg_approval_days,
          COUNT(CASE WHEN pa.approval_action = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN pa.approval_action = 'rejected' THEN 1 END) as rejected_count,
          ROUND(
            COUNT(CASE WHEN pa.approval_action = 'approved' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(pa.approval_action), 0), 1
          ) as approval_rate
        FROM projects p
        LEFT JOIN project_approvals pa ON p.id = pa.project_id
        WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      // 7. 리소스 활용률
      const resourceUtilization = await client.query(`
        SELECT 
          COUNT(DISTINCT pwa.assigned_pe_id) as active_pes,
          COUNT(pwa.id) as total_assignments,
          ROUND(AVG(pwa.estimated_hours), 1) as avg_estimated_hours,
          COUNT(CASE WHEN pwa.status = 'in_progress' THEN 1 END) as active_assignments,
          COUNT(CASE WHEN pwa.status = 'completed' THEN 1 END) as completed_assignments
        FROM project_work_assignments pwa
        WHERE pwa.created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      const dashboardData = {
        system_overview: systemOverview.rows[0],
        project_distribution: projectDistribution.rows,
        organization_stats: organizationStats.rows,
        business_metrics: businessMetrics.rows[0],
        recent_activities: recentActivities.rows,
        workflow_efficiency: workflowEfficiency.rows[0],
        resource_utilization: resourceUtilization.rows[0],
        last_updated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: dashboardData
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('경영진 대시보드 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '대시보드 데이터를 불러오는데 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 전략적 프로젝트 포트폴리오 분석
router.get('/strategic-portfolio', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // 1. 전략적 우선순위별 프로젝트 분포
      const strategicDistribution = await client.query(`
        SELECT 
          CAST(metadata->>'strategic_priority' AS INTEGER) as priority,
          urgency_level,
          COUNT(*) as project_count,
          SUM(expected_completion_hours) as total_hours,
          AVG(CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER)) as avg_roi,
          array_agg(name ORDER BY created_at DESC) as project_names
        FROM projects 
        WHERE metadata->>'strategic_priority' IS NOT NULL
        GROUP BY CAST(metadata->>'strategic_priority' AS INTEGER), urgency_level
        ORDER BY priority, urgency_level
      `);
      
      // 2. ROI 분석
      const roiAnalysis = await client.query(`
        SELECT 
          CASE 
            WHEN CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER) >= 400 THEN 'very_high'
            WHEN CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER) >= 300 THEN 'high'
            WHEN CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER) >= 200 THEN 'medium'
            ELSE 'low'
          END as roi_category,
          COUNT(*) as project_count,
          AVG(CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER)) as avg_roi,
          SUM(expected_completion_hours) as total_investment
        FROM projects 
        WHERE metadata->>'expected_roi' IS NOT NULL
        GROUP BY 
          CASE 
            WHEN CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER) >= 400 THEN 'very_high'
            WHEN CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER) >= 300 THEN 'high'
            WHEN CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER) >= 200 THEN 'medium'
            ELSE 'low'
          END
        ORDER BY avg_roi DESC
      `);
      
      // 3. 비즈니스 임팩트 분석
      const impactAnalysis = await client.query(`
        SELECT 
          metadata->>'business_impact' as impact_level,
          COUNT(*) as project_count,
          AVG(expected_completion_hours) as avg_hours,
          AVG(CAST(metadata->>'expected_roi' AS INTEGER)) as avg_roi
        FROM projects 
        WHERE metadata->>'business_impact' IS NOT NULL
        GROUP BY metadata->>'business_impact'
        ORDER BY 
          CASE metadata->>'business_impact'
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `);
      
      // 4. 리스크 및 기회 분석
      const riskOpportunityAnalysis = await client.query(`
        SELECT 
          urgency_level,
          is_urgent_development,
          COUNT(*) as project_count,
          AVG(CAST(REPLACE(metadata->>'expected_roi', '%', '') AS INTEGER)) as avg_roi,
          SUM(expected_completion_hours) as total_hours,
          array_agg(urgent_reason) FILTER (WHERE urgent_reason IS NOT NULL) as risk_factors
        FROM projects 
        WHERE metadata->>'strategic_priority' IS NOT NULL
        GROUP BY urgency_level, is_urgent_development
        ORDER BY urgency_level, is_urgent_development DESC
      `);
      
      res.json({
        success: true,
        data: {
          strategic_distribution: strategicDistribution.rows,
          roi_analysis: roiAnalysis.rows,
          impact_analysis: impactAnalysis.rows,
          risk_opportunity_analysis: riskOpportunityAnalysis.rows,
          analysis_date: new Date().toISOString()
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('전략 포트폴리오 분석 오류:', error);
    res.status(500).json({
      success: false,
      message: '전략 포트폴리오 분석에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 성과 리포트 데이터
router.get('/performance-report', async (req, res) => {
  try {
    const { period = '30' } = req.query; // 기본 30일
    const client = await pool.connect();
    
    try {
      // 1. 기간별 성과 지표
      const performanceMetrics = await client.query(`
        SELECT 
          DATE_TRUNC('week', created_at) as period,
          COUNT(*) as projects_created,
          COUNT(CASE WHEN project_status != 'draft' THEN 1 END) as projects_progressed,
          AVG(expected_completion_hours) as avg_project_size,
          SUM(expected_completion_hours) as total_investment
        FROM projects 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY period DESC
      `);
      
      // 2. 조직별 생산성
      const organizationProductivity = await client.query(`
        SELECT 
          u.role_type,
          COUNT(DISTINCT CASE WHEN pwa.status = 'completed' THEN pwa.id END) as completed_tasks,
          COUNT(DISTINCT CASE WHEN pwa.status = 'in_progress' THEN pwa.id END) as active_tasks,
          AVG(pwa.estimated_hours) as avg_task_hours,
          COUNT(DISTINCT u.id) as team_size
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_pe_id
        WHERE u.role_type IN ('po', 'pe', 'qa', 'operations')
        AND (pwa.created_at IS NULL OR pwa.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days')
        GROUP BY u.role_type
        ORDER BY completed_tasks DESC
      `);
      
      // 3. 품질 지표
      const qualityMetrics = await client.query(`
        SELECT 
          COUNT(DISTINCT qqa.id) as total_qa_requests,
          COUNT(CASE WHEN qqa.status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN qqa.status = 'rejected' THEN 1 END) as rejected_requests,
          AVG(qqa.quality_score) as avg_quality_score,
          COUNT(DISTINCT bf.id) as build_failures,
          COUNT(DISTINCT ir.id) as issue_reports
        FROM qc_qa_requests qqa
        LEFT JOIN build_failures bf ON bf.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
        LEFT JOIN issue_reports ir ON ir.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
        WHERE qqa.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
      `);
      
      // 4. 비용 효율성 (시간 기준)
      const costEfficiency = await client.query(`
        SELECT 
          SUM(p.expected_completion_hours) as total_planned_hours,
          COUNT(DISTINCT p.id) as total_projects,
          AVG(p.expected_completion_hours) as avg_project_hours,
          SUM(CASE WHEN p.project_status = 'operational' THEN p.expected_completion_hours ELSE 0 END) as completed_hours,
          ROUND(
            SUM(CASE WHEN p.project_status = 'operational' THEN p.expected_completion_hours ELSE 0 END) * 100.0 / 
            NULLIF(SUM(p.expected_completion_hours), 0), 1
          ) as completion_efficiency
        FROM projects p
        WHERE p.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
      `);
      
      // 5. 전략적 목표 달성률
      const strategicGoals = await client.query(`
        SELECT 
          metadata->>'business_impact' as impact_category,
          COUNT(*) as total_projects,
          COUNT(CASE WHEN project_status IN ('deployed', 'operational') THEN 1 END) as achieved_projects,
          ROUND(
            COUNT(CASE WHEN project_status IN ('deployed', 'operational') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0), 1
          ) as achievement_rate,
          AVG(CAST(metadata->>'expected_roi' AS INTEGER)) as avg_expected_roi
        FROM projects 
        WHERE metadata->>'business_impact' IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
        GROUP BY metadata->>'business_impact'
        ORDER BY achievement_rate DESC
      `);
      
      res.json({
        success: true,
        data: {
          performance_metrics: performanceMetrics.rows,
          organization_productivity: organizationProductivity.rows,
          quality_metrics: qualityMetrics.rows[0],
          cost_efficiency: costEfficiency.rows[0],
          strategic_goals: strategicGoals.rows,
          report_period: `${period} days`,
          generated_at: new Date().toISOString()
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('성과 리포트 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '성과 리포트 생성에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 워크플로우 데이터
router.get('/workflow', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const workflowData = await client.query(`
        SELECT 
          CASE 
            WHEN project_status IN ('draft', 'planning', 'pending_approval') THEN 1
            WHEN project_status = 'po_approved' THEN 2
            WHEN project_status = 'pe_assigned' THEN 3
            WHEN project_status IN ('qa_requested', 'qa_approved') THEN 4
            WHEN project_status = 'po_final_approved' THEN 5
            WHEN project_status IN ('deployment_requested', 'deployment_approved') THEN 6
            WHEN project_status IN ('deployed', 'operational') THEN 7
            ELSE 99
          END as stage_number,
          CASE 
            WHEN project_status IN ('draft', 'planning', 'pending_approval') THEN '1단계: 프로젝트 생성 및 승인 요청'
            WHEN project_status = 'po_approved' THEN '2단계: PO 승인 완료'
            WHEN project_status = 'pe_assigned' THEN '3단계: PE 할당 및 개발'
            WHEN project_status IN ('qa_requested', 'qa_approved') THEN '4단계: QA 검증'
            WHEN project_status = 'po_final_approved' THEN '5단계: PO 최종 승인'
            WHEN project_status IN ('deployment_requested', 'deployment_approved') THEN '6단계: 배포 승인'
            WHEN project_status IN ('deployed', 'operational') THEN '7단계: 배포 완료 및 운영'
            ELSE project_status
          END as stage_name,
          project_status as status_code,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_days
        FROM projects 
        WHERE project_status NOT IN ('cancelled', 'suspended')
        GROUP BY stage_number, stage_name, project_status
        ORDER BY stage_number, project_status
      `);

      res.json({
        success: true,
        data: workflowData.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 워크플로우 데이터 로드 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 전략 분석 데이터
router.get('/strategic-analysis', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // 도메인별 프로젝트 분포
      const domainAnalysis = await client.query(`
        SELECT 
          d.name as domain_name,
          COUNT(p.id) as project_count,
          AVG(CASE WHEN p.project_status = 'operational' THEN 1 ELSE 0 END) * 100 as success_rate
        FROM domains d
        LEFT JOIN projects p ON d.id = p.domain_id
        GROUP BY d.id, d.name
        ORDER BY project_count DESC
        LIMIT 10
      `);

      // 월별 프로젝트 생성 추이
      const monthlyTrend = await client.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as project_count
        FROM projects
        WHERE created_at > NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `);

      res.json({
        success: true,
        data: {
          domainAnalysis: domainAnalysis.rows,
          monthlyTrend: monthlyTrend.rows
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 전략 분석 데이터 로드 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 성과 리포트 데이터
router.get('/performance-reports', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // PE 성과 분석
      const pePerformance = await client.query(`
        SELECT 
          u.full_name as pe_name,
          COUNT(pwa.id) as assigned_projects,
          COUNT(CASE WHEN p.project_status IN ('operational', 'deployed') THEN 1 END) as completed_projects,
          AVG(EXTRACT(EPOCH FROM (COALESCE(pwa.completion_date, NOW()) - pwa.assignment_date))/86400) as avg_completion_days
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_pe_id
        LEFT JOIN projects p ON pwa.project_id = p.id
        WHERE u.role_type = 'pe' AND u.is_active = true
        GROUP BY u.id, u.full_name
        HAVING COUNT(pwa.id) > 0
        ORDER BY assigned_projects DESC
        LIMIT 10
      `);

      // QA 품질 지표
      const qaMetrics = await client.query(`
        SELECT 
          COUNT(*) as total_qa_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_review_days
        FROM qc_qa_requests
        WHERE created_at > NOW() - INTERVAL '30 days'
      `);

      res.json({
        success: true,
        data: {
          pePerformance: pePerformance.rows,
          qaMetrics: qaMetrics.rows[0] || {
            total_qa_requests: 0,
            approved_count: 0,
            rejected_count: 0,
            avg_review_days: 0
          }
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 성과 리포트 데이터 로드 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
