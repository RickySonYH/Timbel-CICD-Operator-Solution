// [advice from AI] 프로젝트 삭제 이중 승인 시스템 API
// 관리자 → PO 승인 → PE 승인 → 최종 삭제 워크플로우

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
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 프로젝트 삭제 요청 생성 (관리자만)
router.post('/projects/:projectId/request-deletion', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const { request_reason } = req.body;

    console.log('🗑️ 프로젝트 삭제 요청:', { projectId, userId, request_reason });

    if (!request_reason || request_reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reason',
        message: '삭제 사유를 10자 이상 입력해주세요.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 프로젝트 존재 및 상태 확인
      const projectResult = await client.query(`
        SELECT 
          p.*,
          po.full_name as po_name,
          pe.full_name as pe_name
        FROM projects p
        LEFT JOIN timbel_users po ON p.claimed_by_po = po.id
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        WHERE p.id = $1
      `, [projectId]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          message: '프로젝트를 찾을 수 없습니다.'
        });
      }
      
      const project = projectResult.rows[0];
      
      // 2. 삭제 가능 상태 확인
      if (project.project_status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete completed project',
          message: '완료된 프로젝트는 삭제할 수 없습니다. 아카이브 기능을 사용하세요.'
        });
      }
      
      // 3. 기존 삭제 요청 확인
      const existingRequestResult = await client.query(`
        SELECT id FROM project_deletion_requests
        WHERE project_id = $1 AND deletion_status NOT IN ('rejected', 'cancelled', 'completed')
      `, [projectId]);
      
      if (existingRequestResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Deletion request already exists',
          message: '이미 삭제 요청이 진행 중입니다.'
        });
      }
      
      // [advice from AI] 프로젝트 상태별 승인 대상자 구분
      let poApprovalRequired = false;
      let peApprovalRequired = false;
      
      if (project.approval_status === 'pending') {
        // 승인 전: PO만 승인 필요
        poApprovalRequired = !!project.claimed_by_po;
        peApprovalRequired = false;
        console.log('📋 승인 전 프로젝트: PO만 승인 필요');
      } else if (project.approval_status === 'approved' && project.project_status === 'planning') {
        // 승인 후, 할당 전: PO만 승인 필요
        poApprovalRequired = !!project.claimed_by_po;
        peApprovalRequired = false;
        console.log('📋 승인 후 할당 전 프로젝트: PO만 승인 필요');
      } else if (project.approval_status === 'approved' && project.project_status === 'in_progress') {
        // 승인 후, PE 할당됨: PO + PE 모두 승인 필요
        poApprovalRequired = !!project.claimed_by_po;
        peApprovalRequired = !!project.pe_name;
        console.log('📋 진행 중 프로젝트: PO + PE 모두 승인 필요');
      } else {
        // 기타 상태: 기본적으로 PO만 승인 필요
        poApprovalRequired = !!project.claimed_by_po;
        peApprovalRequired = false;
        console.log('📋 기타 상태 프로젝트: PO만 승인 필요');
      }
      
      // 5. 삭제 요청 생성
      const deletionRequestResult = await client.query(`
        INSERT INTO project_deletion_requests (
          project_id, project_name, requested_by, request_reason,
          po_approval_required, pe_approval_required,
          deletion_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
      `, [
        projectId, 
        project.name, 
        userId, 
        request_reason,
        poApprovalRequired,
        peApprovalRequired,
        poApprovalRequired ? 'pending_po_approval' : (peApprovalRequired ? 'pending_pe_approval' : 'approved')
      ]);
      
      const deletionRequestId = deletionRequestResult.rows[0].id;
      
      // 6. 승인 히스토리 기록
      await client.query(`
        INSERT INTO project_deletion_approval_history (
          deletion_request_id, approval_step, approver_id, approver_role,
          approval_action, approval_reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        deletionRequestId, 'deletion_requested', userId, 'admin', 'requested', request_reason
      ]);
      
      await client.query('COMMIT');
      
      console.log('✅ 프로젝트 삭제 요청 생성 완료:', deletionRequestId);
      
      // 7. 알림 전송
      try {
        const notificationCenter = new CollaborationNotificationCenter();
        
        // [advice from AI] 프로젝트 상태별 알림 전송
        if (poApprovalRequired && project.claimed_by_po) {
          const poMessage = project.project_status === 'in_progress' 
            ? `"${project.name}" 프로젝트의 삭제 승인이 필요합니다.\n사유: ${request_reason}\n\n현재 진행 중인 프로젝트로 PE 승인도 필요합니다.\n메시지에서 바로 승인/거부할 수 있습니다.`
            : `"${project.name}" 프로젝트의 삭제 승인이 필요합니다.\n사유: ${request_reason}\n\n메시지에서 바로 승인/거부할 수 있습니다.`;
            
          await client.query(`
            INSERT INTO approval_messages (
              message_id, recipient_id, sender_id, request_type, subject, content, 
              priority, message_type, sent_at, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
          `, [
            deletionRequestId, project.claimed_by_po, userId, 'approval',
            '🗑️ 프로젝트 삭제 승인 요청',
            poMessage,
            'high', 'notification',
            JSON.stringify({
              deletion_request_id: deletionRequestId,
              project_id: projectId,
              project_name: project.name,
              approval_type: 'po_approval',
              project_status: project.project_status,
              requires_pe_approval: peApprovalRequired
            })
          ]);
        }
        
        console.log('✅ 삭제 요청 알림 전송 완료');
      } catch (notificationError) {
        console.warn('⚠️ 삭제 요청 알림 전송 실패:', notificationError.message);
      }
      
      res.json({
        success: true,
        data: {
          deletion_request_id: deletionRequestId,
          project_id: projectId,
          project_name: project.name,
          po_approval_required: poApprovalRequired,
          pe_approval_required: peApprovalRequired,
          next_step: poApprovalRequired ? 'PO 승인 대기' : (peApprovalRequired ? 'PE 승인 대기' : '최종 승인 대기')
        },
        message: '프로젝트 삭제 요청이 생성되었습니다.'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 삭제 요청 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deletion request',
      message: error.message
    });
  }
});

// [advice from AI] PO 삭제 승인 처리
router.post('/requests/:deletionRequestId/po-approval', jwtAuth.verifyToken, jwtAuth.requireRole(['po']), async (req, res) => {
  try {
    const { deletionRequestId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const { approval_action, approval_reason } = req.body; // 'approved' or 'rejected'

    console.log('👨‍💼 PO 삭제 승인 처리:', { deletionRequestId, userId, approval_action });

    if (!['approved', 'rejected'].includes(approval_action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approval action',
        message: '승인 액션은 approved 또는 rejected여야 합니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 삭제 요청 확인 및 권한 검증
      const requestResult = await client.query(`
        SELECT 
          pdr.*,
          p.claimed_by_po
        FROM project_deletion_requests pdr
        JOIN projects p ON pdr.project_id = p.id
        WHERE pdr.id = $1 
        AND pdr.deletion_status = 'pending_po_approval'
        AND p.claimed_by_po = $2
      `, [deletionRequestId, userId]);
      
      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invalid deletion request or no permission',
          message: '삭제 요청을 찾을 수 없거나 승인 권한이 없습니다.'
        });
      }
      
      const deletionRequest = requestResult.rows[0];
      
      // 2. PO 승인 처리
      const nextStatus = approval_action === 'approved' 
        ? (deletionRequest.pe_approval_required ? 'pending_pe_approval' : 'approved')
        : 'rejected';
      
      await client.query(`
        UPDATE project_deletion_requests 
        SET 
          po_approver_id = $1,
          po_approval_status = $2,
          po_approval_reason = $3,
          po_approved_at = NOW(),
          deletion_status = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [userId, approval_action, approval_reason, nextStatus, deletionRequestId]);
      
      // 3. 승인 히스토리 기록
      await client.query(`
        INSERT INTO project_deletion_approval_history (
          deletion_request_id, approval_step, approver_id, approver_role,
          approval_action, approval_reason, next_step
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        deletionRequestId, 'po_approval', userId, 'po', 
        approval_action, approval_reason, 
        approval_action === 'approved' ? (deletionRequest.pe_approval_required ? 'pe_approval' : 'final_deletion') : 'rejected'
      ]);
      
      await client.query('COMMIT');
      
      console.log('✅ PO 삭제 승인 처리 완료:', { deletionRequestId, approval_action });
      
      res.json({
        success: true,
        data: {
          deletion_request_id: deletionRequestId,
          approval_action: approval_action,
          next_step: approval_action === 'approved' 
            ? (deletionRequest.pe_approval_required ? 'PE 승인 대기' : '최종 삭제 대기')
            : '삭제 요청 거부됨'
        },
        message: `PO 삭제 승인이 ${approval_action === 'approved' ? '승인' : '거부'}되었습니다.`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PO 삭제 승인 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process PO approval',
      message: error.message
    });
  }
});

// [advice from AI] PE 삭제 승인 처리
router.post('/requests/:deletionRequestId/pe-approval', jwtAuth.verifyToken, jwtAuth.requireRole(['pe']), async (req, res) => {
  try {
    const { deletionRequestId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const { approval_action, approval_reason } = req.body; // 'approved' or 'rejected'

    console.log('👨‍💻 PE 삭제 승인 처리:', { deletionRequestId, userId, approval_action });

    if (!['approved', 'rejected'].includes(approval_action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approval action',
        message: '승인 액션은 approved 또는 rejected여야 합니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 삭제 요청 확인 및 권한 검증
      const requestResult = await client.query(`
        SELECT 
          pdr.*,
          pwa.assigned_to
        FROM project_deletion_requests pdr
        JOIN project_work_assignments pwa ON pdr.project_id = pwa.project_id
        WHERE pdr.id = $1 
        AND pdr.deletion_status = 'pending_pe_approval'
        AND pwa.assigned_to = $2
        AND pwa.assignment_status IN ('assigned', 'in_progress')
      `, [deletionRequestId, userId]);
      
      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invalid deletion request or no permission',
          message: '삭제 요청을 찾을 수 없거나 승인 권한이 없습니다.'
        });
      }
      
      const deletionRequest = requestResult.rows[0];
      
      // 2. PE 승인 처리
      const nextStatus = approval_action === 'approved' ? 'approved' : 'rejected';
      
      await client.query(`
        UPDATE project_deletion_requests 
        SET 
          pe_approver_id = $1,
          pe_approval_status = $2,
          pe_approval_reason = $3,
          pe_approved_at = NOW(),
          deletion_status = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [userId, approval_action, approval_reason, nextStatus, deletionRequestId]);
      
      // 3. 승인 히스토리 기록
      await client.query(`
        INSERT INTO project_deletion_approval_history (
          deletion_request_id, approval_step, approver_id, approver_role,
          approval_action, approval_reason, next_step
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        deletionRequestId, 'pe_approval', userId, 'pe', 
        approval_action, approval_reason, 
        approval_action === 'approved' ? 'final_deletion' : 'rejected'
      ]);
      
      await client.query('COMMIT');
      
      console.log('✅ PE 삭제 승인 처리 완료:', { deletionRequestId, approval_action });
      
      res.json({
        success: true,
        data: {
          deletion_request_id: deletionRequestId,
          approval_action: approval_action,
          next_step: approval_action === 'approved' ? '최종 삭제 대기' : '삭제 요청 거부됨'
        },
        message: `PE 삭제 승인이 ${approval_action === 'approved' ? '승인' : '거부'}되었습니다.`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 삭제 승인 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process PE approval',
      message: error.message
    });
  }
});

// [advice from AI] 최종 프로젝트 삭제 실행 (관리자만)
router.post('/requests/:deletionRequestId/execute-deletion', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    const { deletionRequestId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    console.log('💥 프로젝트 최종 삭제 실행:', { deletionRequestId, userId });

    const client = await pool.connect();
    
    try {
      // 안전한 삭제 함수 호출
      const result = await client.query(`
        SELECT safe_delete_project($1, $2) as result
      `, [deletionRequestId, userId]);
      
      const deletionResult = result.rows[0].result;
      
      if (deletionResult.success) {
        console.log('✅ 프로젝트 안전 삭제 완료:', deletionResult);
        
        res.json({
          success: true,
          data: deletionResult,
          message: '프로젝트가 안전하게 삭제되었습니다. 30일간 복구 가능합니다.'
        });
      } else {
        res.status(400).json({
          success: false,
          error: deletionResult.error,
          message: '프로젝트 삭제에 실패했습니다.'
        });
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 최종 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute project deletion',
      message: error.message
    });
  }
});

// [advice from AI] 삭제 요청 목록 조회 (권한별)
router.get('/requests', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    const { 
      status = null,
      limit = 20,
      offset = 0 
    } = req.query;

    console.log('📋 삭제 요청 목록 조회:', { userId, userRole, status });

    const client = await pool.connect();
    
    try {
      let query = `
        SELECT * FROM project_deletion_approval_status
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      // 권한별 필터링
      if (userRole === 'po') {
        query += ` AND (
          (deletion_status = 'pending_po_approval' AND po_approver_id IS NULL AND 
           EXISTS(SELECT 1 FROM projects WHERE id = project_id AND claimed_by_po = $${paramIndex}))
          OR po_approver_id = $${paramIndex}
        )`;
        params.push(userId);
        paramIndex++;
      } else if (userRole === 'pe') {
        query += ` AND (
          (deletion_status = 'pending_pe_approval' AND pe_approver_id IS NULL AND 
           EXISTS(SELECT 1 FROM project_work_assignments WHERE project_id = project_id AND assigned_to = $${paramIndex}))
          OR pe_approver_id = $${paramIndex}
        )`;
        params.push(userId);
        paramIndex++;
      } else if (userRole !== 'admin' && userRole !== 'executive') {
        // 일반 사용자는 자신이 관련된 것만
        query += ` AND (requested_by = $${paramIndex} OR po_approver_id = $${paramIndex} OR pe_approver_id = $${paramIndex})`;
        params.push(userId);
        paramIndex++;
      }
      
      if (status) {
        query += ` AND deletion_status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await client.query(query, params);
      
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
    console.error('❌ 삭제 요청 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deletion requests',
      message: error.message
    });
  }
});

// [advice from AI] 삭제 요청 취소 (요청자만)
router.post('/requests/:deletionRequestId/cancel', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { deletionRequestId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;

    console.log('❌ 삭제 요청 취소:', { deletionRequestId, userId });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 삭제 요청 확인 및 권한 검증
      const requestResult = await client.query(`
        SELECT * FROM project_deletion_requests
        WHERE id = $1 
        AND (
          requested_by = $2 
          OR $3 IN ('admin', 'executive')
        )
        AND deletion_status NOT IN ('completed', 'rejected')
      `, [deletionRequestId, userId, userRole]);
      
      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invalid deletion request or no permission',
          message: '삭제 요청을 찾을 수 없거나 취소 권한이 없습니다.'
        });
      }
      
      // 2. 삭제 요청 취소 처리
      await client.query(`
        UPDATE project_deletion_requests 
        SET 
          deletion_status = 'cancelled',
          updated_at = NOW()
        WHERE id = $1
      `, [deletionRequestId]);
      
      // 3. 취소 히스토리 기록
      await client.query(`
        INSERT INTO project_deletion_approval_history (
          deletion_request_id, approval_step, approver_id, approver_role,
          approval_action, approval_reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        deletionRequestId, 'cancellation', userId, userRole, 'cancelled', '요청자에 의한 취소'
      ]);
      
      await client.query('COMMIT');
      
      console.log('✅ 삭제 요청 취소 완료:', deletionRequestId);
      
      res.json({
        success: true,
        data: {
          deletion_request_id: deletionRequestId,
          cancelled_at: new Date().toISOString()
        },
        message: '삭제 요청이 취소되었습니다.'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 삭제 요청 취소 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel deletion request',
      message: error.message
    });
  }
});

module.exports = router;
