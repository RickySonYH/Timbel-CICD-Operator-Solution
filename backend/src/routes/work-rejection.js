// [advice from AI] 작업 거부 및 역방향 보고 처리 API

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const CollaborationNotificationCenter = require('../services/collaborationNotificationCenter');

const router = express.Router();

// 데이터베이스 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] PE 작업 거부 처리
router.post('/:projectId/reject-assignment', jwtAuth.verifyToken, jwtAuth.requireRole(['pe']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const {
      assignment_id,
      rejection_category,
      rejection_reason,
      rejection_details,
      rejected_at,
      rejected_by
    } = req.body;

    console.log('❌ PE 작업 거부 처리 시작:', { projectId, userId, rejection_category });

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        message: '사용자 인증 정보를 찾을 수 없습니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 할당된 작업인지 확인
      const assignmentCheck = await client.query(`
        SELECT pwa.*, p.name as project_name, p.created_by as po_id
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        WHERE pwa.project_id = $1 AND pwa.assigned_to = $2 AND pwa.assignment_status = 'assigned'
      `, [projectId, userId]);

      if (assignmentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '할당된 작업을 찾을 수 없거나 이미 처리되었습니다.'
        });
      }

      const assignment = assignmentCheck.rows[0];

      // 거부 기록 생성
      const rejectionResult = await client.query(`
        INSERT INTO project_work_rejections (
          project_id, assignment_id, rejected_by, rejection_category,
          rejection_reason, rejection_details, rejection_status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pe_rejected')
        RETURNING *
      `, [
        projectId,
        assignment.id,
        userId,
        rejection_category,
        rejection_reason,
        rejection_details || null
      ]);

      const rejection = rejectionResult.rows[0];

      // 할당 상태 업데이트 (트리거가 자동으로 처리하지만 명시적으로 확인)
      await client.query(`
        UPDATE project_work_assignments 
        SET 
          assignment_status = 'rejected',
          rejection_count = rejection_count + 1,
          last_rejected_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [assignment.id]);

      // PO에게 알림 생성 (추가 보장)
      await client.query(`
        INSERT INTO notifications (
          recipient_id, title, message, notification_type, notification_category,
          related_project_id, related_assignment_id, related_rejection_id, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        assignment.po_id,
        '🚨 작업 거부 알림',
        `PE가 "${assignment.project_name}" 프로젝트 작업을 거부했습니다. 사유: ${rejection_reason}`,
        'warning',
        'rejection',
        projectId,
        assignment.id,
        rejection.id,
        false
      ]);

      await client.query('COMMIT');

      console.log('✅ PE 작업 거부 처리 완료:', rejection.id);

      // [advice from AI] 작업 거부 알림 전송 (개선된 알림 시스템 사용)
      try {
        const notificationCenter = new CollaborationNotificationCenter();
        await notificationCenter.notifyWorkRejected(
          projectId,
          assignment.project_name,
          userId,
          rejection_reason,
          rejection_category
        );
        console.log('✅ 작업 거부 알림 전송 완료');
      } catch (notificationError) {
        console.warn('⚠️ 작업 거부 알림 전송 실패:', notificationError.message);
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: {
          rejection_id: rejection.id,
          rejection_status: rejection.rejection_status,
          message: 'PO에게 재검토 요청이 전달되었습니다.'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ PE 작업 거부 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject work assignment',
      message: error.message
    });
  }
});

// [advice from AI] PO 거부 현황 조회
router.get('/po/rejections', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType || req.user?.role_type;

    console.log('📋 PO 거부 현황 조회 시작:', { userId, userRole });

    const client = await pool.connect();
    
    try {
      let query;
      let params;

      if (userRole === 'po') {
        // PO는 자신의 프로젝트 거부 현황만 조회
        query = `
          SELECT * FROM project_rejection_status_view 
          WHERE project_id IN (
            SELECT id FROM projects WHERE created_by = $1
          )
          AND rejection_status IN ('pe_rejected', 'po_reviewing')
          ORDER BY rejected_at DESC
        `;
        params = [userId];
      } else {
        // Admin/Executive는 모든 거부 현황 조회
        query = `
          SELECT * FROM project_rejection_status_view 
          ORDER BY rejected_at DESC
        `;
        params = [];
      }

      const result = await client.query(query, params);

      console.log(`✅ 거부 현황 조회 완료: ${result.rows.length}개`);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ PO 거부 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rejection status',
      message: error.message
    });
  }
});

// [advice from AI] PO 거부 사항 처리 (수정/에스컬레이션)
router.post('/po/rejections/:rejectionId/respond', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin']), async (req, res) => {
  try {
    const { rejectionId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const {
      po_decision, // 'modify_project', 'escalate_admin', 'reassign_pe', 'cancel_project'
      po_response,
      project_modifications
    } = req.body;

    console.log('🔄 PO 거부 사항 처리 시작:', { rejectionId, po_decision });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 거부 사항 업데이트
      const updateResult = await client.query(`
        UPDATE project_work_rejections 
        SET 
          po_decision = $1,
          po_response = $2,
          po_responded_at = NOW(),
          po_responded_by = $3,
          rejection_status = CASE 
            WHEN $1 = 'escalate_admin' THEN 'admin_escalated'
            ELSE 'po_reviewing'
          END,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [po_decision, po_response, userId, rejectionId]);

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Rejection not found',
          message: '거부 사항을 찾을 수 없습니다.'
        });
      }

      const rejection = updateResult.rows[0];

      // 결정에 따른 추가 처리
      if (po_decision === 'modify_project' && project_modifications) {
        // 프로젝트 수정
        await client.query(`
          UPDATE projects 
          SET 
            name = COALESCE($1, name),
            project_overview = COALESCE($2, project_overview),
            deadline = COALESCE($3, deadline),
            updated_at = NOW()
          WHERE id = $4
        `, [
          project_modifications.name,
          project_modifications.project_overview,
          project_modifications.deadline,
          rejection.project_id
        ]);
      }

      if (po_decision === 'escalate_admin') {
        // Admin에게 알림
        const adminUsers = await client.query(`
          SELECT id FROM timbel_users WHERE role_type = 'admin' AND status = 'active'
        `);

        for (const admin of adminUsers.rows) {
          await client.query(`
            INSERT INTO notifications (
              recipient_id, title, message, notification_type, notification_category,
              related_project_id, related_rejection_id, is_read
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            admin.id,
            '🚨 관리자 에스컬레이션',
            `PO가 작업 거부 사항을 관리자에게 에스컬레이션했습니다. 검토가 필요합니다.`,
            'error',
            'rejection',
            rejection.project_id,
            rejectionId,
            false
          ]);
        }
      }

      await client.query('COMMIT');

      console.log('✅ PO 거부 사항 처리 완료:', rejectionId);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: {
          rejection_id: rejectionId,
          decision: po_decision,
          status: rejection.rejection_status,
          message: '거부 사항이 성공적으로 처리되었습니다.'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ PO 거부 사항 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to respond to rejection',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트-지식자원 매핑 등록
router.post('/:projectId/knowledge-mapping', jwtAuth.verifyToken, jwtAuth.requireRole(['pe', 'po', 'admin']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const {
      referenced_system_id,
      referenced_component_id,
      mapping_type,
      mapping_description,
      usage_context
    } = req.body;

    console.log('🔗 프로젝트-지식자원 매핑 등록 시작:', { projectId, mapping_type });

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO project_knowledge_mapping (
          project_id, referenced_system_id, referenced_component_id,
          mapping_type, mapping_description, usage_context, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        projectId,
        referenced_system_id || null,
        referenced_component_id || null,
        mapping_type,
        mapping_description || null,
        usage_context || null,
        userId
      ]);

      console.log('✅ 프로젝트-지식자원 매핑 등록 완료:', result.rows[0].id);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 프로젝트-지식자원 매핑 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create knowledge mapping',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 완료 후 지식자원 등록 준비
router.post('/:projectId/prepare-knowledge-registration', jwtAuth.verifyToken, jwtAuth.requireRole(['pe', 'po', 'admin']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const {
      target_registration_type,
      system_registration_data,
      component_registration_data,
      guide_registration_data,
      registration_notes
    } = req.body;

    console.log('📝 프로젝트 지식자원 등록 준비 시작:', { projectId, target_registration_type });

    const client = await pool.connect();
    
    try {
      // 기존 등록 준비 상태 확인
      const existingCheck = await client.query(`
        SELECT * FROM project_completion_registry WHERE project_id = $1
      `, [projectId]);

      let result;
      if (existingCheck.rows.length > 0) {
        // 업데이트
        result = await client.query(`
          UPDATE project_completion_registry 
          SET 
            target_registration_type = $1,
            system_registration_data = $2,
            component_registration_data = $3,
            guide_registration_data = $4,
            registration_notes = $5,
            completion_status = 'reviewing',
            updated_at = NOW()
          WHERE project_id = $6
          RETURNING *
        `, [
          target_registration_type,
          system_registration_data ? JSON.stringify(system_registration_data) : null,
          component_registration_data ? JSON.stringify(component_registration_data) : null,
          guide_registration_data ? JSON.stringify(guide_registration_data) : null,
          registration_notes,
          projectId
        ]);
      } else {
        // 신규 생성
        result = await client.query(`
          INSERT INTO project_completion_registry (
            project_id, target_registration_type, system_registration_data,
            component_registration_data, guide_registration_data, 
            registration_notes, completion_status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'reviewing')
          RETURNING *
        `, [
          projectId,
          target_registration_type,
          system_registration_data ? JSON.stringify(system_registration_data) : null,
          component_registration_data ? JSON.stringify(component_registration_data) : null,
          guide_registration_data ? JSON.stringify(guide_registration_data) : null,
          registration_notes
        ]);
      }

      console.log('✅ 프로젝트 지식자원 등록 준비 완료:', result.rows[0].id);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 프로젝트 지식자원 등록 준비 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare knowledge registration',
      message: error.message
    });
  }
});

module.exports = router;
