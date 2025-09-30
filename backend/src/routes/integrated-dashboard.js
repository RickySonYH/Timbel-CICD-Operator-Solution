// [advice from AI] 통합 홈 대시보드 API
// 전체 업무 흐름, PO/PE 성과, 이벤트, CI/CD, 운영 서버 현황을 한눈에 보는 대시보드

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 통합 대시보드 메인 데이터 조회
router.get('/overview', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;

    console.log('🏠 통합 대시보드 조회:', { userId, userRole });

    const client = await pool.connect();
    
    try {
      // 1. 전체 업무 흐름 현황 (직접 쿼리)
      const workflowResult = await client.query(`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approval,
          COUNT(CASE WHEN approval_status = 'approved' AND assigned_po IS NULL THEN 1 END) as available_for_claim,
          COUNT(CASE WHEN assigned_po IS NOT NULL AND project_status = 'planning' THEN 1 END) as po_claimed,
          COUNT(CASE WHEN project_status IN ('in_progress', 'development') THEN 1 END) as pe_working,
          COUNT(CASE WHEN project_status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN urgency_level IN ('high', 'critical') AND project_status NOT IN ('completed', 'cancelled') THEN 1 END) as urgent_active,
          COUNT(CASE WHEN deadline < CURRENT_DATE AND project_status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as this_week_created,
          COUNT(CASE WHEN project_status = 'completed' AND updated_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as this_week_completed
        FROM projects
      `);
      
      // 2. 개인별 성과 현황 (간단한 버전)
      const performanceResult = await client.query(`
        SELECT 
          u.id as user_id,
          u.full_name as user_name,
          u.role_type,
          COUNT(CASE 
            WHEN u.role_type = 'po' AND p.assigned_po = u.id AND p.project_status NOT IN ('completed', 'cancelled') THEN 1
            WHEN u.role_type = 'pe' AND pwa.assigned_to = u.id AND pwa.assignment_status IN ('assigned', 'in_progress') THEN 1
          END) as active_workload,
          COUNT(CASE 
            WHEN u.role_type = 'po' AND p.assigned_po = u.id AND p.project_status = 'completed' 
                 AND p.updated_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1
            WHEN u.role_type = 'pe' AND pwa.assigned_to = u.id AND pwa.assignment_status = 'completed' 
                 AND pwa.updated_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1
          END) as monthly_completed,
          COUNT(CASE 
            WHEN u.role_type = 'po' AND p.assigned_po = u.id AND p.project_status = 'completed' THEN 1
            WHEN u.role_type = 'pe' AND pwa.assigned_to = u.id AND pwa.assignment_status = 'completed' THEN 1
          END) as total_completed,
          CASE 
            WHEN u.role_type = 'pe' AND COUNT(pwa.id) > 0 THEN
              ROUND(AVG(CASE WHEN pwa.progress_percentage IS NOT NULL THEN pwa.progress_percentage END), 1)
            WHEN u.role_type = 'po' AND COUNT(p.id) > 0 THEN
              ROUND(
                COUNT(CASE WHEN p.project_status = 'completed' THEN 1 END) * 100.0 / 
                COUNT(p.id), 1
              )
            ELSE 0
          END as progress_rate_percent
        FROM timbel_users u
        LEFT JOIN projects p ON u.id = p.assigned_po
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
        WHERE u.role_type IN ('po', 'pe')
        GROUP BY u.id, u.full_name, u.role_type
        HAVING COUNT(CASE WHEN u.role_type = 'po' THEN p.id WHEN u.role_type = 'pe' THEN pwa.id END) > 0
        ORDER BY progress_rate_percent DESC, monthly_completed DESC
        LIMIT 10
      `);
      
      // 3. 최근 이벤트 (최신 20개) - [advice from AI] 테이블 없음으로 임시 비활성화
      const eventsResult = { rows: [] };
      
      // 4. CI/CD 현황 (실제 데이터만)
      let cicdStats = null;
      try {
        const cicdResult = await client.query(`
          SELECT 
            COUNT(*) as total_executions,
            COUNT(CASE WHEN execution_status = 'running' THEN 1 END) as running_pipelines,
            COUNT(CASE WHEN execution_status = 'pending' THEN 1 END) as pending_pipelines,
            COUNT(CASE 
              WHEN execution_status = 'success' 
              AND start_time >= NOW() - INTERVAL '24 hours' THEN 1 
            END) as success_24h,
            COUNT(CASE 
              WHEN execution_status = 'failure' 
              AND start_time >= NOW() - INTERVAL '24 hours' THEN 1 
            END) as failure_24h,
            CASE 
              WHEN COUNT(CASE WHEN start_time >= NOW() - INTERVAL '7 days' THEN 1 END) > 0 THEN
                ROUND(
                  COUNT(CASE 
                    WHEN execution_status = 'success' 
                    AND start_time >= NOW() - INTERVAL '7 days' THEN 1 
                  END) * 100.0 / 
                  COUNT(CASE WHEN start_time >= NOW() - INTERVAL '7 days' THEN 1 END), 2
                )
              ELSE 0
            END as success_rate_7d,
            AVG(duration_seconds) as avg_duration_seconds,
            COUNT(CASE WHEN deployment_environment = 'development' AND execution_status = 'success' THEN 1 END) as dev_deployments,
            COUNT(CASE WHEN deployment_environment = 'staging' AND execution_status = 'success' THEN 1 END) as staging_deployments,
            COUNT(CASE WHEN deployment_environment = 'production' AND execution_status = 'success' THEN 1 END) as prod_deployments,
            MAX(start_time) as last_execution_time
          FROM cicd_pipeline_executions
          WHERE start_time >= NOW() - INTERVAL '30 days'
        `);
        cicdStats = cicdResult.rows[0] || null;
      } catch (cicdError) {
        console.log('ℹ️ CI/CD 테이블이 아직 없음, null로 처리');
        cicdStats = null;
      }
      
      // 5. 인프라 현황 (실제 데이터만)
      let infraStats = null;
      try {
        const infraResult = await client.query(`
          SELECT * FROM infrastructure_dashboard
          LIMIT 1
        `);
        infraStats = infraResult.rows[0] || null;
      } catch (infraError) {
        console.log('ℹ️ 인프라 모니터링 테이블이 아직 없음, null로 처리');
        infraStats = null;
      }
      
      // 6. 권한별 추가 정보
      let roleSpecificData = {};
      
      if (userRole === 'admin' || userRole === 'executive') {
        // 관리자: 전체 시스템 관리 정보
        const adminStatsResult = await client.query(`
          SELECT 
            COUNT(CASE WHEN u.role_type = 'po' THEN 1 END) as total_pos,
            COUNT(CASE WHEN u.role_type = 'pe' THEN 1 END) as total_pes,
            COUNT(CASE WHEN u.updated_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_users_24h,
            COUNT(CASE WHEN p.approval_status = 'pending' THEN 1 END) as pending_approvals
          FROM timbel_users u
          CROSS JOIN projects p
        `);
        
        roleSpecificData = {
          total_pos: parseInt(adminStatsResult.rows[0].total_pos),
          total_pes: parseInt(adminStatsResult.rows[0].total_pes),
          active_users_24h: parseInt(adminStatsResult.rows[0].active_users_24h),
          pending_approvals: parseInt(adminStatsResult.rows[0].pending_approvals)
        };
      } else if (userRole === 'po') {
        // PO: 내 성과 및 선점 가능한 프로젝트
        const poStatsResult = await client.query(`
          SELECT 
            COUNT(CASE WHEN ppc.claim_status = 'active' THEN 1 END) as my_active_claims,
            COUNT(CASE WHEN p.approval_status = 'approved' AND p.assigned_po IS NULL THEN 1 END) as available_to_claim,
            COUNT(CASE WHEN p.assigned_po = $1 AND p.project_status = 'completed' THEN 1 END) as my_completed_projects
          FROM projects p
          LEFT JOIN project_po_claims ppc ON p.id = ppc.project_id AND ppc.assigned_po = $1
        `, [userId]);
        
        roleSpecificData = {
          my_active_claims: parseInt(poStatsResult.rows[0].my_active_claims),
          available_to_claim: parseInt(poStatsResult.rows[0].available_to_claim),
          my_completed_projects: parseInt(poStatsResult.rows[0].my_completed_projects)
        };
      } else if (userRole === 'pe') {
        // PE: 내 할당 업무 및 진행률
        const peStatsResult = await client.query(`
          SELECT 
            COUNT(CASE WHEN assignment_status = 'assigned' THEN 1 END) as pending_assignments,
            COUNT(CASE WHEN assignment_status = 'in_progress' THEN 1 END) as active_assignments,
            COUNT(CASE WHEN assignment_status = 'completed' THEN 1 END) as completed_assignments,
            AVG(progress_percentage) as avg_progress
          FROM project_work_assignments
          WHERE assigned_to = $1
        `, [userId]);
        
        roleSpecificData = {
          pending_assignments: parseInt(peStatsResult.rows[0].pending_assignments),
          active_assignments: parseInt(peStatsResult.rows[0].active_assignments),
          completed_assignments: parseInt(peStatsResult.rows[0].completed_assignments),
          avg_progress: parseFloat(peStatsResult.rows[0].avg_progress) || 0
        };
      }
      
      res.json({
        success: true,
        data: {
          workflow_stats: workflowResult.rows[0] || {},
          performance_stats: performanceResult.rows,
          recent_events: eventsResult.rows,
          cicd_stats: cicdStats,
          infrastructure_stats: infraStats,
          role_specific_data: roleSpecificData,
          user_role: userRole,
          last_updated: new Date().toISOString()
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 통합 대시보드 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrated dashboard',
      message: error.message
    });
  }
});

// [advice from AI] 실시간 이벤트 추가 (내부 시스템용)
router.post('/events', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      event_type,
      event_category,
      event_severity = 'info',
      title,
      description,
      project_id = null,
      user_id = null,
      pipeline_id = null,
      server_name = null,
      service_name = null,
      event_data = {}
    } = req.body;

    console.log('📝 시스템 이벤트 추가:', { event_type, title });

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        -- INSERT INTO system_event_stream ( -- [advice from AI] 테이블 없음으로 비활성화
          event_type, event_category, event_severity, title, description,
          project_id, user_id, pipeline_id, server_name, service_name, event_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, event_timestamp
      `, [
        event_type, event_category, event_severity, title, description,
        project_id, user_id, pipeline_id, server_name, service_name, JSON.stringify(event_data)
      ]);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: '이벤트가 추가되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 시스템 이벤트 추가 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add system event',
      message: error.message
    });
  }
});

// [advice from AI] CI/CD 파이프라인 상태 업데이트 (Webhook용)
router.post('/cicd/pipeline-update', async (req, res) => {
  try {
    const {
      pipeline_name,
      pipeline_type,
      repository_url,
      branch_name,
      execution_id,
      execution_status,
      start_time,
      end_time,
      duration_seconds,
      deployment_environment,
      project_id = null
    } = req.body;

    console.log('🔄 CI/CD 파이프라인 상태 업데이트:', { pipeline_name, execution_status });

    const client = await pool.connect();
    
    try {
      // Upsert 방식으로 파이프라인 실행 정보 업데이트
      const result = await client.query(`
        INSERT INTO cicd_pipeline_executions (
          pipeline_name, pipeline_type, repository_url, branch_name,
          execution_id, execution_status, start_time, end_time, 
          duration_seconds, deployment_environment, project_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (execution_id) DO UPDATE SET
          execution_status = EXCLUDED.execution_status,
          end_time = EXCLUDED.end_time,
          duration_seconds = EXCLUDED.duration_seconds
        RETURNING id
      `, [
        pipeline_name, pipeline_type, repository_url, branch_name,
        execution_id, execution_status, start_time, end_time,
        duration_seconds, deployment_environment, project_id
      ]);
      
      // 이벤트 스트림에도 추가
      await client.query(`
        -- INSERT INTO system_event_stream ( -- [advice from AI] 테이블 없음으로 비활성화
          event_type, event_category, event_severity, title, description,
          project_id, pipeline_id, event_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'cicd_pipeline_update',
        'cicd',
        execution_status === 'failure' ? 'error' : execution_status === 'success' ? 'success' : 'info',
        `CI/CD 파이프라인 ${execution_status}`,
        `${pipeline_name} 파이프라인이 ${execution_status} 상태입니다.`,
        project_id,
        execution_id,
        JSON.stringify({ repository_url, branch_name, duration_seconds })
      ]);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'CI/CD 파이프라인 상태가 업데이트되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ CI/CD 파이프라인 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pipeline status',
      message: error.message
    });
  }
});

// [advice from AI] 인프라 모니터링 데이터 업데이트
router.post('/infrastructure/update', async (req, res) => {
  try {
    const {
      server_name,
      server_type,
      environment,
      service_name,
      status,
      cpu_usage_percent,
      memory_usage_percent,
      disk_usage_percent,
      response_time_ms,
      requests_per_second,
      error_rate_percent
    } = req.body;

    console.log('🖥️ 인프라 모니터링 업데이트:', { server_name, status });

    const client = await pool.connect();
    
    try {
      // 기존 레코드 업데이트 또는 새로 생성
      const result = await client.query(`
        INSERT INTO infrastructure_monitoring (
          server_name, server_type, environment, service_name, status,
          cpu_usage_percent, memory_usage_percent, disk_usage_percent,
          response_time_ms, requests_per_second, error_rate_percent,
          last_health_check
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (server_name, environment) DO UPDATE SET
          status = EXCLUDED.status,
          cpu_usage_percent = EXCLUDED.cpu_usage_percent,
          memory_usage_percent = EXCLUDED.memory_usage_percent,
          disk_usage_percent = EXCLUDED.disk_usage_percent,
          response_time_ms = EXCLUDED.response_time_ms,
          requests_per_second = EXCLUDED.requests_per_second,
          error_rate_percent = EXCLUDED.error_rate_percent,
          last_health_check = NOW(),
          recorded_at = NOW()
        RETURNING id
      `, [
        server_name, server_type, environment, service_name, status,
        cpu_usage_percent, memory_usage_percent, disk_usage_percent,
        response_time_ms, requests_per_second, error_rate_percent
      ]);
      
      // 상태 변경 시 이벤트 스트림에 추가
      if (status === 'critical' || status === 'down') {
        await client.query(`
          -- INSERT INTO system_event_stream ( -- [advice from AI] 테이블 없음으로 비활성화
            event_type, event_category, event_severity, title, description,
            server_name, service_name, event_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          'infrastructure_alert',
          'infrastructure',
          status === 'down' ? 'critical' : 'warning',
          `서버 상태 경고: ${server_name}`,
          `${server_name} 서버가 ${status} 상태입니다.`,
          server_name,
          service_name,
          JSON.stringify({ 
            cpu_usage: cpu_usage_percent, 
            memory_usage: memory_usage_percent,
            response_time: response_time_ms 
          })
        ]);
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        message: '인프라 모니터링 데이터가 업데이트되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 인프라 모니터링 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update infrastructure monitoring',
      message: error.message
    });
  }
});

// [advice from AI] 개인별 상세 성과 조회
router.get('/performance/:userId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;

    // 권한 확인: 관리자는 모든 사용자, 일반 사용자는 본인만
    if (userRole !== 'admin' && userRole !== 'executive' && currentUserId !== targetUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: '다른 사용자의 성과는 조회할 수 없습니다.'
      });
    }

    console.log('👤 개인별 상세 성과 조회:', { targetUserId, currentUserId, userRole });

    const client = await pool.connect();
    
    try {
      // 1. 기본 성과 정보
      const performanceResult = await client.query(`
        SELECT * FROM individual_performance_dashboard
        WHERE user_id = $1
      `, [targetUserId]);
      
      if (performanceResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: '사용자를 찾을 수 없습니다.'
        });
      }
      
      const userInfo = performanceResult.rows[0];
      
      // 2. 역할별 상세 정보
      let detailedStats = {};
      
      if (userInfo.role_type === 'po') {
        // PO 상세 정보
        const poDetailResult = await client.query(`
          SELECT 
            ppc.*,
            p.name as project_name,
            p.urgency_level,
            p.deadline,
            pwa.assigned_to as assigned_pe_id,
            pe.full_name as assigned_pe_name,
            pwa.progress_percentage
          FROM project_po_claims ppc
          JOIN projects p ON ppc.project_id = p.id
          LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
          LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
          WHERE ppc.assigned_po = $1
          ORDER BY ppc.claimed_at DESC
          LIMIT 10
        `, [targetUserId]);
        
        detailedStats = {
          recent_claims: poDetailResult.rows,
          claim_history: [] // 필요시 추가 구현
        };
      } else if (userInfo.role_type === 'pe') {
        // PE 상세 정보
        const peDetailResult = await client.query(`
          SELECT 
            pwa.*,
            p.name as project_name,
            p.urgency_level,
            p.deadline,
            po.full_name as po_name,
            pr.repository_url,
            pr.last_commit_at
          FROM project_work_assignments pwa
          JOIN projects p ON pwa.project_id = p.id
          LEFT JOIN timbel_users po ON p.assigned_po = po.id
          LEFT JOIN project_repositories pr ON p.id = pr.project_id
          WHERE pwa.assigned_to = $1
          ORDER BY pwa.assigned_at DESC
          LIMIT 10
        `, [targetUserId]);
        
        detailedStats = {
          recent_assignments: peDetailResult.rows,
          git_activity: [] // 필요시 Git 활동 추가
        };
      }
      
      res.json({
        success: true,
        data: {
          user_info: userInfo,
          detailed_stats: detailedStats
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 개인별 성과 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch individual performance',
      message: error.message
    });
  }
});

module.exports = router;
