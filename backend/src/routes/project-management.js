// [advice from AI] PO/관리자용 프로젝트 관리 API
// 프로젝트 강제 정지, 재할당, 상태 변경 등

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// 데이터베이스 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 모든 프로젝트 할당 현황 조회 (관리자용)
router.get('/assignments', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    console.log('📋 관리자용 프로젝트 할당 현황 조회 시작');

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          pwa.id as assignment_id,
          pwa.project_id,
          p.name as project_name,
          pwa.assigned_to as assigned_pe_id,
          pe_user.full_name as assigned_pe_name,
          pwa.assignment_status,
          pwa.progress_percentage,
          p.urgency_level,
          p.deadline,
          pwa.assigned_at,
          wg.name as work_group_name,
          pwa.assignment_notes,
          po_user.full_name as assigned_by_name
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        JOIN timbel_users pe_user ON pwa.assigned_to = pe_user.id
        LEFT JOIN timbel_users po_user ON pwa.assigned_by = po_user.id
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        WHERE p.approval_status = 'approved'
        ORDER BY 
          CASE pwa.assignment_status
            WHEN 'rejected' THEN 1
            WHEN 'paused' THEN 2
            WHEN 'in_progress' THEN 3
            WHEN 'assigned' THEN 4
            ELSE 5
          END,
          p.urgency_level = 'critical' DESC,
          p.urgency_level = 'high' DESC,
          pwa.assigned_at DESC
      `);

      console.log(`✅ 프로젝트 할당 현황 조회 완료: ${result.rows.length}개`);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 프로젝트 할당 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project assignments',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 일시 정지
router.post('/:assignmentId/pause', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId || req.user?.id;

    console.log('⏸️ 프로젝트 일시 정지 요청:', { assignmentId, reason });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 할당 정보 조회
      const assignmentResult = await client.query(`
        SELECT pwa.*, p.name as project_name, pe.full_name as pe_name, pe.id as pe_id
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        JOIN timbel_users pe ON pwa.assigned_to = pe.id
        WHERE pwa.id = $1
      `, [assignmentId]);

      if (assignmentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '할당 정보를 찾을 수 없습니다.'
        });
      }

      const assignment = assignmentResult.rows[0];

      // 상태 업데이트
      await client.query(`
        UPDATE project_work_assignments 
        SET 
          assignment_status = 'paused',
          updated_at = NOW(),
          assignment_history = assignment_history || $1
        WHERE id = $2
      `, [
        JSON.stringify({
          action: 'paused',
          timestamp: new Date().toISOString(),
          by_user_id: userId,
          reason: reason,
          previous_status: assignment.assignment_status
        }),
        assignmentId
      ]);

      // PE에게 알림
      await client.query(`
        INSERT INTO notifications (
          recipient_id, title, message, notification_type, notification_category,
          related_project_id, related_assignment_id, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        assignment.pe_id,
        '⏸️ 프로젝트 일시 정지',
        `"${assignment.project_name}" 프로젝트가 일시 정지되었습니다. 사유: ${reason}`,
        'warning',
        'project',
        assignment.project_id,
        assignmentId,
        false
      ]);

      await client.query('COMMIT');

      console.log('✅ 프로젝트 일시 정지 완료:', assignmentId);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        message: '프로젝트가 일시 정지되었습니다.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 프로젝트 일시 정지 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause project',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 재할당
router.post('/:assignmentId/reassign', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { new_assignee_id, reason } = req.body;
    const userId = req.user?.userId || req.user?.id;

    console.log('🔄 프로젝트 재할당 요청:', { assignmentId, new_assignee_id, reason });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 기존 할당 정보 조회
      const assignmentResult = await client.query(`
        SELECT pwa.*, p.name as project_name, 
               old_pe.full_name as old_pe_name, old_pe.id as old_pe_id,
               new_pe.full_name as new_pe_name
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        JOIN timbel_users old_pe ON pwa.assigned_to = old_pe.id
        JOIN timbel_users new_pe ON new_pe.id = $2
        WHERE pwa.id = $1
      `, [assignmentId, new_assignee_id]);

      if (assignmentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '할당 정보를 찾을 수 없습니다.'
        });
      }

      const assignment = assignmentResult.rows[0];

      // 할당 정보 업데이트
      await client.query(`
        UPDATE project_work_assignments 
        SET 
          assigned_to = $1,
          assigned_by = $2,
          assignment_status = 'assigned',
          progress_percentage = 0,
          assigned_at = NOW(),
          updated_at = NOW(),
          assignment_history = assignment_history || $3
        WHERE id = $4
      `, [
        new_assignee_id,
        userId,
        JSON.stringify({
          action: 'reassigned',
          timestamp: new Date().toISOString(),
          by_user_id: userId,
          reason: reason,
          previous_assignee: assignment.old_pe_id,
          new_assignee: new_assignee_id
        }),
        assignmentId
      ]);

      // 기존 PE에게 알림
      await client.query(`
        INSERT INTO notifications (
          recipient_id, title, message, notification_type, notification_category,
          related_project_id, related_assignment_id, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        assignment.old_pe_id,
        '🔄 프로젝트 재할당',
        `"${assignment.project_name}" 프로젝트가 ${assignment.new_pe_name}님에게 재할당되었습니다. 사유: ${reason}`,
        'info',
        'project',
        assignment.project_id,
        assignmentId,
        false
      ]);

      // 새 PE에게 알림
      await client.query(`
        INSERT INTO notifications (
          recipient_id, title, message, notification_type, notification_category,
          related_project_id, related_assignment_id, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        new_assignee_id,
        '🎯 새 프로젝트 할당',
        `"${assignment.project_name}" 프로젝트가 할당되었습니다. 이전 담당자: ${assignment.old_pe_name}`,
        'success',
        'project',
        assignment.project_id,
        assignmentId,
        false
      ]);

      await client.query('COMMIT');

      console.log('✅ 프로젝트 재할당 완료:', assignmentId);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        message: '프로젝트가 재할당되었습니다.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 프로젝트 재할당 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reassign project',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 상태 변경
router.post('/:assignmentId/status', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { new_status, reason } = req.body;
    const userId = req.user?.userId || req.user?.id;

    console.log('📝 프로젝트 상태 변경 요청:', { assignmentId, new_status, reason });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 할당 정보 조회
      const assignmentResult = await client.query(`
        SELECT pwa.*, p.name as project_name, pe.full_name as pe_name, pe.id as pe_id
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        JOIN timbel_users pe ON pwa.assigned_to = pe.id
        WHERE pwa.id = $1
      `, [assignmentId]);

      if (assignmentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '할당 정보를 찾을 수 없습니다.'
        });
      }

      const assignment = assignmentResult.rows[0];

      // 상태 업데이트
      await client.query(`
        UPDATE project_work_assignments 
        SET 
          assignment_status = $1,
          updated_at = NOW(),
          assignment_history = assignment_history || $2
        WHERE id = $3
      `, [
        new_status,
        JSON.stringify({
          action: 'status_changed',
          timestamp: new Date().toISOString(),
          by_user_id: userId,
          reason: reason,
          previous_status: assignment.assignment_status,
          new_status: new_status
        }),
        assignmentId
      ]);

      // 상태별 알림 메시지
      let notificationTitle = '';
      let notificationType = 'info';
      
      switch (new_status) {
        case 'in_progress':
          notificationTitle = '▶️ 프로젝트 재시작';
          notificationType = 'success';
          break;
        case 'completed':
          notificationTitle = '✅ 프로젝트 완료 처리';
          notificationType = 'success';
          break;
        case 'cancelled':
          notificationTitle = '❌ 프로젝트 취소';
          notificationType = 'error';
          break;
        default:
          notificationTitle = '📝 프로젝트 상태 변경';
      }

      // PE에게 알림
      await client.query(`
        INSERT INTO notifications (
          recipient_id, title, message, notification_type, notification_category,
          related_project_id, related_assignment_id, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        assignment.pe_id,
        notificationTitle,
        `"${assignment.project_name}" 프로젝트 상태가 "${new_status}"로 변경되었습니다. 사유: ${reason}`,
        notificationType,
        'project',
        assignment.project_id,
        assignmentId,
        false
      ]);

      await client.query('COMMIT');

      console.log('✅ 프로젝트 상태 변경 완료:', assignmentId);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        message: '프로젝트 상태가 변경되었습니다.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 프로젝트 상태 변경 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change project status',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 할당 이력 조회
router.get('/:assignmentId/history', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { assignmentId } = req.params;

    console.log('📜 프로젝트 할당 이력 조회:', assignmentId);

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          pwa.assignment_history,
          p.name as project_name,
          pe.full_name as current_assignee
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        JOIN timbel_users pe ON pwa.assigned_to = pe.id
        WHERE pwa.id = $1
      `, [assignmentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '할당 정보를 찾을 수 없습니다.'
        });
      }

      console.log('✅ 프로젝트 할당 이력 조회 완료');

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: {
          project_name: result.rows[0].project_name,
          current_assignee: result.rows[0].current_assignee,
          history: result.rows[0].assignment_history || []
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 프로젝트 할당 이력 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment history',
      message: error.message
    });
  }
});

module.exports = router;
