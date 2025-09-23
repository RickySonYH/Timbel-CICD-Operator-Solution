// [advice from AI] PO 프로젝트 선점 시스템 API
// 여러 PO가 승인된 프로젝트를 선점하고 자기 소속 PE에게 할당하는 시스템

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const CollaborationNotificationCenter = require('../services/collaborationNotificationCenter');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 선점 가능한 프로젝트 목록 조회 (PO, Admin, Executive용)
router.get('/available-projects', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { 
      urgency_level = null, 
      is_urgent = null,
      limit = 50,
      offset = 0 
    } = req.query;

    console.log('📋 선점 가능한 프로젝트 조회:', { userId, urgency_level, is_urgent });

    const client = await pool.connect();
    
    try {
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      if (urgency_level) {
        whereConditions.push(`urgency_level = $${paramIndex}`);
        params.push(urgency_level);
        paramIndex++;
      }
      
      if (is_urgent !== null) {
        whereConditions.push(`is_urgent_development = $${paramIndex}`);
        params.push(is_urgent === 'true');
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 
        ? `AND ${whereConditions.join(' AND ')}` 
        : '';
      
      const result = await client.query(`
        SELECT *
        FROM po_available_projects
        WHERE is_claimable = TRUE
        ${whereClause}
        ORDER BY urgency_score DESC, approved_at ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, parseInt(limit), parseInt(offset)]);
      
      // 전체 개수 조회
      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM po_available_projects
        WHERE is_claimable = TRUE
        ${whereClause}
      `, params);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: result.rows.length === parseInt(limit)
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 선점 가능한 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available projects',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 선점 처리 (PO, Admin, Executive용)
router.post('/projects/:projectId/claim', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const {
      claim_reason = '',
      estimated_completion_days = null
    } = req.body;

    console.log('🏃‍♂️ 프로젝트 선점 요청:', { projectId, userId, claim_reason });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 프로젝트 선점 가능 여부 확인
      const projectCheck = await client.query(`
        SELECT 
          p.id, p.name, p.approval_status, p.project_status,
          p.claimed_by_po, p.is_urgent_development,
          creator.full_name as creator_name
        FROM projects p
        LEFT JOIN timbel_users creator ON p.created_by = creator.id
        WHERE p.id = $1
      `, [projectId]);
      
      if (projectCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          message: '프로젝트를 찾을 수 없습니다.'
        });
      }
      
      const project = projectCheck.rows[0];
      
      if (project.approval_status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Project not approved',
          message: '승인되지 않은 프로젝트는 선점할 수 없습니다.'
        });
      }
      
      if (project.claimed_by_po) {
        return res.status(409).json({
          success: false,
          error: 'Project already claimed',
          message: '이미 다른 PO가 선점한 프로젝트입니다.'
        });
      }
      
      // 2. PO의 현재 워크로드 확인
      const workloadCheck = await client.query(`
        SELECT COUNT(*) as active_claims
        FROM project_po_claims
        WHERE claimed_by_po = $1 AND claim_status = 'active'
      `, [userId]);
      
      const currentWorkload = parseInt(workloadCheck.rows[0].active_claims);
      const maxWorkload = project.is_urgent_development ? 10 : 5; // 긴급 프로젝트는 더 많이 허용
      
      if (currentWorkload >= maxWorkload) {
        return res.status(400).json({
          success: false,
          error: 'Workload exceeded',
          message: `현재 진행 중인 프로젝트가 ${currentWorkload}개입니다. 최대 ${maxWorkload}개까지 선점 가능합니다.`
        });
      }
      
      // 3. 프로젝트 선점 처리
      const claimResult = await client.query(`
        INSERT INTO project_po_claims (
          project_id, claimed_by_po, claim_reason, estimated_completion_days
        ) VALUES ($1, $2, $3, $4)
        RETURNING id, claimed_at
      `, [projectId, userId, claim_reason, estimated_completion_days]);
      
      const claimId = claimResult.rows[0].id;
      
      // 4. 프로젝트 테이블 업데이트
      await client.query(`
        UPDATE projects 
        SET claimed_by_po = $1, claimed_at = NOW(), po_claim_notes = $2
        WHERE id = $3
      `, [userId, claim_reason, projectId]);
      
      // 5. 선점 히스토리 기록
      await client.query(`
        INSERT INTO po_claim_history (
          project_id, po_user_id, claim_id, action_type, action_details
        ) VALUES ($1, $2, $3, 'claimed', $4)
      `, [projectId, userId, claimId, claim_reason]);
      
      await client.query('COMMIT');
      
      console.log('✅ 프로젝트 선점 완료:', { projectId, claimId, userId });
      
      // 6. 선점 알림 전송
      try {
        const notificationCenter = new CollaborationNotificationCenter();
        
        // 최고관리자들에게 알림
        const adminsResult = await client.query(`
          SELECT id FROM timbel_users WHERE role_type IN ('admin', 'executive')
        `);
        
        for (const admin of adminsResult.rows) {
          await client.query(`
            INSERT INTO approval_messages (
              message_id, recipient_id, sender_id, title, message, 
              priority, message_type, sent_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [
            uuidv4(), admin.id, userId,
            '👨‍💼 프로젝트 선점 알림',
            `"${project.name}" 프로젝트를 PO가 선점했습니다.\n사유: ${claim_reason || '일반 업무'}`,
            project.is_urgent_development ? 'urgent' : 'medium',
            'po_claim'
          ]);
        }
        
        console.log('✅ 프로젝트 선점 알림 전송 완료');
      } catch (notificationError) {
        console.warn('⚠️ 프로젝트 선점 알림 전송 실패:', notificationError.message);
      }
      
      res.json({
        success: true,
        data: {
          claim_id: claimId,
          project_id: projectId,
          project_name: project.name,
          claimed_at: claimResult.rows[0].claimed_at,
          current_workload: currentWorkload + 1
        },
        message: `"${project.name}" 프로젝트를 성공적으로 선점했습니다.`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 선점 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim project',
      message: error.message
    });
  }
});

// [advice from AI] 내가 선점한 프로젝트 목록 조회 (PO, Admin, Executive용)
router.get('/my-claims', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { 
      claim_status = 'active',
      limit = 20,
      offset = 0 
    } = req.query;

    console.log('📋 내 선점 프로젝트 조회:', { userId, claim_status });

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          ppc.*,
          p.name as project_name,
          p.project_overview,
          p.urgency_level,
          p.deadline,
          p.is_urgent_development,
          
          -- PE 할당 정보
          pwa.id as assignment_id,
          pwa.assigned_to as assigned_pe_id,
          pwa.assignment_status,
          pe.full_name as assigned_pe_name,
          
          -- 진행률 정보
          pwa.progress_percentage,
          pwa.assigned_at as pe_assigned_at
          
        FROM project_po_claims ppc
        JOIN projects p ON ppc.project_id = p.id
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        WHERE ppc.claimed_by_po = $1
        AND ppc.claim_status = $2
        ORDER BY ppc.claimed_at DESC
        LIMIT $3 OFFSET $4
      `, [userId, claim_status, parseInt(limit), parseInt(offset)]);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: result.rows.length === parseInt(limit)
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 내 선점 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch my claims',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 반납 처리 (PO, Admin, Executive용)
router.post('/projects/:projectId/return', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const { return_reason = '' } = req.body;

    console.log('🔄 프로젝트 반납 요청:', { projectId, userId, return_reason });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 선점 확인
      const claimCheck = await client.query(`
        SELECT ppc.*, p.name as project_name
        FROM project_po_claims ppc
        JOIN projects p ON ppc.project_id = p.id
        WHERE ppc.project_id = $1 AND ppc.claimed_by_po = $2 AND ppc.claim_status = 'active'
      `, [projectId, userId]);
      
      if (claimCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Claim not found',
          message: '선점한 프로젝트를 찾을 수 없습니다.'
        });
      }
      
      const claim = claimCheck.rows[0];
      
      // 2. PE에게 이미 할당된 경우 확인
      const assignmentCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM project_work_assignments
        WHERE project_id = $1 AND assignment_status IN ('assigned', 'in_progress')
      `, [projectId]);
      
      if (parseInt(assignmentCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Project already assigned to PE',
          message: '이미 PE에게 할당된 프로젝트는 반납할 수 없습니다.'
        });
      }
      
      // 3. 선점 상태 변경
      await client.query(`
        UPDATE project_po_claims 
        SET claim_status = 'returned', returned_at = NOW()
        WHERE id = $1
      `, [claim.id]);
      
      // 4. 프로젝트 테이블 업데이트
      await client.query(`
        UPDATE projects 
        SET claimed_by_po = NULL, claimed_at = NULL, po_claim_notes = NULL
        WHERE id = $1
      `, [projectId]);
      
      // 5. 반납 히스토리 기록
      await client.query(`
        INSERT INTO po_claim_history (
          project_id, po_user_id, claim_id, action_type, action_details
        ) VALUES ($1, $2, $3, 'returned', $4)
      `, [projectId, userId, claim.id, return_reason]);
      
      await client.query('COMMIT');
      
      console.log('✅ 프로젝트 반납 완료:', { projectId, claimId: claim.id });
      
      res.json({
        success: true,
        data: {
          project_id: projectId,
          project_name: claim.project_name,
          returned_at: new Date().toISOString()
        },
        message: `"${claim.project_name}" 프로젝트를 반납했습니다.`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 반납 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to return project',
      message: error.message
    });
  }
});

// [advice from AI] PO 성과 통계 조회
router.get('/performance-stats', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    const { po_user_id = null } = req.query;

    // 관리자는 모든 PO 조회, PO는 본인만 조회
    const targetUserId = (userRole === 'admin' || userRole === 'executive') && po_user_id 
      ? po_user_id 
      : userId;

    console.log('📊 PO 성과 통계 조회:', { userId, userRole, targetUserId });

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM po_performance_summary
        WHERE po_user_id = $1
      `, [targetUserId]);
      
      // 최근 3개월 상세 성과
      const monthlyResult = await client.query(`
        SELECT 
          performance_month,
          projects_claimed,
          projects_completed,
          projects_returned,
          avg_claim_to_pe_assignment_hours,
          avg_project_completion_days,
          project_success_rate
        FROM po_performance_tracking
        WHERE po_user_id = $1
        AND performance_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
        ORDER BY performance_month DESC
      `, [targetUserId]);
      
      res.json({
        success: true,
        data: {
          summary: result.rows[0] || null,
          monthly_performance: monthlyResult.rows
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PO 성과 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance stats',
      message: error.message
    });
  }
});

// [advice from AI] 전체 PO 성과 랭킹 조회 (관리자용)
router.get('/performance-ranking', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    const { period = '3months' } = req.query;

    console.log('🏆 PO 성과 랭킹 조회:', { period });

    const client = await pool.connect();
    
    try {
      let periodFilter = '';
      if (period === '1month') {
        periodFilter = "AND ppt.performance_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')";
      } else if (period === '3months') {
        periodFilter = "AND ppt.performance_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')";
      } else if (period === '6months') {
        periodFilter = "AND ppt.performance_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')";
      }
      
      const result = await client.query(`
        SELECT 
          u.id as po_user_id,
          u.full_name as po_name,
          u.department_id,
          d.name as department_name,
          
          -- 선점 관련 지표
          SUM(ppt.projects_claimed) as total_claimed,
          SUM(ppt.projects_completed) as total_completed,
          SUM(ppt.projects_returned) as total_returned,
          
          -- 효율성 지표
          AVG(ppt.avg_claim_to_pe_assignment_hours) as avg_assignment_hours,
          AVG(ppt.avg_project_completion_days) as avg_completion_days,
          AVG(ppt.project_success_rate) as avg_success_rate,
          
          -- 현재 워크로드
          COUNT(CASE WHEN ppc.claim_status = 'active' THEN 1 END) as current_active_claims,
          
          -- 종합 점수 계산
          (
            SUM(ppt.projects_completed) * 10 + 
            AVG(ppt.project_success_rate) * 2 +
            (100 - COALESCE(AVG(ppt.avg_project_completion_days), 30)) * 0.5
          ) as performance_score
          
        FROM timbel_users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN po_performance_tracking ppt ON u.id = ppt.po_user_id ${periodFilter}
        LEFT JOIN project_po_claims ppc ON u.id = ppc.claimed_by_po AND ppc.claim_status = 'active'
        WHERE u.role_type = 'po'
        GROUP BY u.id, u.full_name, u.department_id, d.name
        ORDER BY performance_score DESC NULLS LAST
      `);
      
      res.json({
        success: true,
        data: result.rows,
        period: period
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PO 성과 랭킹 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance ranking',
      message: error.message
    });
  }
});

module.exports = router;
