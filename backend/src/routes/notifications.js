// [advice from AI] 권한별 메시지 센터 API
// 기존 collaborationNotificationCenter 기반으로 프로젝트 플로우 알림 통합

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const CollaborationNotificationCenter = require('../services/collaborationNotificationCenter');

const router = express.Router();

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 승인 대시보드 통계 조회 (메시지 센터 통합)
router.get('/dashboard-stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('📊 승인 대시보드 통계 조회:', { userId, userRole });

    const client = await pool.connect();
    
    try {
      let stats = {};
      
      if (userRole === 'admin' || userRole === 'executive') {
        // 관리자용 통계
        const [pendingProjects, approvedProjects, rejectedProjects, totalProjects] = await Promise.all([
          client.query('SELECT COUNT(*) as count FROM projects WHERE approval_status = \'pending\''),
          client.query('SELECT COUNT(*) as count FROM projects WHERE approval_status = \'approved\''),
          client.query('SELECT COUNT(*) as count FROM projects WHERE approval_status = \'rejected\''),
          client.query('SELECT COUNT(*) as count FROM projects')
        ]);
        
        stats = {
          pending_approvals: parseInt(pendingProjects.rows[0].count) || 0,
          approved_projects: parseInt(approvedProjects.rows[0].count) || 0,
          rejected_projects: parseInt(rejectedProjects.rows[0].count) || 0,
          total_projects: parseInt(totalProjects.rows[0].count) || 0
        };
      } else if (userRole === 'po') {
        // PO용 통계
        const [claimedProjects, availableProjects, assignedProjects] = await Promise.all([
          client.query('SELECT COUNT(*) as count FROM projects WHERE assigned_po = $1', [userId]),
          client.query('SELECT COUNT(*) as count FROM projects WHERE approval_status = \'approved\' AND assigned_po IS NULL'),
          client.query(`
            SELECT COUNT(*) as count 
            FROM project_work_assignments pwa 
            JOIN projects p ON pwa.project_id = p.id 
            WHERE p.assigned_po = $1
          `, [userId])
        ]);
        
        stats = {
          claimed_projects: parseInt(claimedProjects.rows[0].count) || 0,
          available_projects: parseInt(availableProjects.rows[0].count) || 0,
          assigned_projects: parseInt(assignedProjects.rows[0].count) || 0
        };
      } else if (userRole === 'pe') {
        // PE용 통계
        const [assignedProjects, inProgressProjects, completedProjects] = await Promise.all([
          client.query('SELECT COUNT(*) as count FROM project_work_assignments WHERE assigned_to = $1', [userId]),
          client.query(`
            SELECT COUNT(*) as count 
            FROM project_work_assignments pwa 
            JOIN projects p ON pwa.project_id = p.id 
            WHERE pwa.assigned_to = $1 AND p.project_status = 'in_progress'
          `, [userId]),
          client.query(`
            SELECT COUNT(*) as count 
            FROM project_work_assignments pwa 
            JOIN projects p ON pwa.project_id = p.id 
            WHERE pwa.assigned_to = $1 AND p.project_status = 'completed'
          `, [userId])
        ]);
        
        stats = {
          assigned_projects: parseInt(assignedProjects.rows[0].count) || 0,
          in_progress_projects: parseInt(inProgressProjects.rows[0].count) || 0,
          completed_projects: parseInt(completedProjects.rows[0].count) || 0
        };
      }
      
      res.json({
        success: true,
        data: stats
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 승인 대시보드 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '승인 대시보드 통계 조회에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 사용자별 알림 목록 조회 (권한별 필터링)
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    const {
      limit = 20,
      offset = 0,
      message_type = null,
      is_read = null,
      priority = null
    } = req.query;

    console.log('📬 권한별 알림 조회:', { userId, userRole, limit, offset });
    console.log('📬 요청 헤더:', req.headers.authorization ? 'Authorization 있음' : 'Authorization 없음');

    const client = await pool.connect();
    
    try {
      // 메시지 센터와 기존 approval_messages를 통합하여 조회
      let notifications = [];
      
      // 통합 메시지 시스템에서 사용자별 메시지 조회
      let query = `
        SELECT 
          um.id,
          um.title,
          um.content as message,
          um.message_type,
          um.priority,
          um.created_at,
          umr.is_read,
          sender.full_name as sender_name,
          sender.role_type as sender_role,
          um.metadata,
          'unified_system' as source
        FROM unified_messages um
        JOIN unified_message_recipients umr ON um.id = umr.message_id
        LEFT JOIN timbel_users sender ON um.sender_id = sender.id
        WHERE umr.recipient_id = $1
          AND umr.is_deleted = FALSE
          AND um.status = 'active'
          AND (um.expires_at IS NULL OR um.expires_at > NOW())
      `;
      
      const params = [userId];
      let paramIndex = 2;
      
      if (message_type) {
        query += ` AND um.message_type = $${paramIndex}`;
        params.push(message_type);
        paramIndex++;
      }
      
      if (is_read !== null) {
        query += ` AND umr.is_read = $${paramIndex}`;
        params.push(is_read === 'true');
        paramIndex++;
      }
      
      if (priority) {
        query += ` AND um.priority = $${paramIndex}`;
        params.push(parseInt(priority) || 1); // [advice from AI] priority를 숫자로 처리
        paramIndex++;
      }
      
      query += ` ORDER BY um.created_at DESC`;
      
      try {
        console.log('📨 통합 메시지 시스템 쿼리 실행:', query);
        console.log('📨 쿼리 파라미터:', params);
        const messageResult = await client.query(query, params);
        console.log('📨 통합 메시지 조회 결과:', messageResult.rows.length, '개');
        console.log('📨 통합 메시지 전체 데이터:', messageResult.rows.map(r => ({ id: r.id, title: r.title, created_at: r.created_at, is_read: r.is_read })));
        notifications = notifications.concat(messageResult.rows);
      } catch (error) {
        console.log('⚠️ 통합 메시지 시스템 조회 오류:', error.message);
      }
      
      // 시간순으로 정렬하고 페이지네이션 적용
      console.log('📋 전체 알림 개수 (정렬 전):', notifications.length);
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      console.log('📋 정렬 후 최신 3개:', notifications.slice(0, 3).map(n => ({ id: n.id, title: n.title, created_at: n.created_at, source: n.source })));
      const paginatedNotifications = notifications.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
      
      // 읽지 않은 메시지 개수 계산 (통합 시스템)
      let unreadCount = 0;
      
      try {
        const unreadResult = await client.query(`
          SELECT COUNT(*) as count
          FROM unified_messages um
          JOIN unified_message_recipients umr ON um.id = umr.message_id
          WHERE umr.recipient_id = $1 
            AND umr.is_read = FALSE 
            AND umr.is_deleted = FALSE
            AND um.status = 'active'
            AND (um.expires_at IS NULL OR um.expires_at > NOW())
        `, [userId]);
        
        unreadCount = parseInt(unreadResult.rows[0].count) || 0;
      } catch (error) {
        console.log('⚠️ 통합 메시지 시스템 읽지 않은 메시지 계산 오류:', error.message);
      }
      
      res.json({
        success: true,
        data: paginatedNotifications,
        notifications: paginatedNotifications, // MessageCenter에서 사용하는 필드명
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: notifications.length,
          hasMore: notifications.length > parseInt(offset) + parseInt(limit)
        },
        stats: {
          unread_count: unreadCount,
          total_count: notifications.length
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 권한별 알림 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// [advice from AI] 알림 읽음 처리
router.put('/:messageId/read', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    console.log('📖 알림 읽음 처리:', { messageId, userId });

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        UPDATE approval_messages 
        SET is_read = TRUE, read_at = NOW()
        WHERE message_id = $1 AND recipient_id = $2
        RETURNING *
      `, [messageId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          message: '알림을 찾을 수 없습니다.'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        message: '알림이 읽음 처리되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 알림 읽음 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

// [advice from AI] 모든 알림 읽음 처리
router.put('/read-all', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    console.log('📖 모든 알림 읽음 처리:', { userId });

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        UPDATE approval_messages 
        SET is_read = TRUE, read_at = NOW()
        WHERE recipient_id = $1 AND is_read = FALSE
        RETURNING COUNT(*) as updated_count
      `, [userId]);
      
      res.json({
        success: true,
        data: {
          updated_count: result.rowCount
        },
        message: `${result.rowCount}개의 알림이 읽음 처리되었습니다.`
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 모든 알림 읽음 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

// [advice from AI] 알림 통계 조회 (권한별)
router.get('/stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;

    console.log('📊 권한별 알림 통계 조회:', { userId, userRole });
    console.log('📊 요청 헤더:', req.headers.authorization ? 'Authorization 있음' : 'Authorization 없음');

    const client = await pool.connect();
    
    try {
      // 기본 알림 통계
      const basicStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
          COUNT(CASE WHEN priority = 4 THEN 1 END) as urgent_messages,
          COUNT(CASE WHEN priority = 3 THEN 1 END) as high_messages,
          COUNT(CASE WHEN sent_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_messages
        FROM approval_messages
        WHERE recipient_id = $1
      `, [userId]);
      
      // 메시지 타입별 통계
      const typeStatsResult = await client.query(`
        SELECT 
          message_type,
          COUNT(*) as count,
          COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_count
        FROM approval_messages
        WHERE recipient_id = $1
        GROUP BY message_type
        ORDER BY count DESC
      `, [userId]);
      
      // 권한별 추가 통계
      let roleSpecificStats = {};
      
      if (userRole === 'admin' || userRole === 'executive') {
        // 관리자: 승인 대기 프로젝트 통계
        // 통합 메시지 시스템에서 승인 대기 통계 조회
        const adminStatsResult = await client.query(`
          SELECT 
            COUNT(CASE WHEN um.message_type IN ('approval_request', 'budget_approval') AND umr.is_read = FALSE THEN 1 END) as pending_approvals,
            COUNT(CASE WHEN um.message_type IN ('approval_request', 'budget_approval') AND um.priority >= 3 AND umr.is_read = FALSE THEN 1 END) as urgent_approvals,
            COUNT(CASE WHEN um.message_type = 'approval_request' AND um.priority = 4 AND umr.is_read = FALSE THEN 1 END) as urgent_development_projects
          FROM unified_messages um
          JOIN unified_message_recipients umr ON um.id = umr.message_id
          WHERE umr.recipient_id = $1
            AND umr.is_deleted = FALSE
            AND um.status = 'active'
        `, [userId]);
        
        roleSpecificStats = {
          pending_approvals: parseInt(adminStatsResult.rows[0].pending_approvals) || 0,
          urgent_approvals: parseInt(adminStatsResult.rows[0].urgent_approvals) || 0,
          urgent_development_projects: parseInt(adminStatsResult.rows[0].urgent_development_projects) || 0
        };
      } else if (userRole === 'po') {
        // PO: 내 프로젝트 관련 통계
        const poStatsResult = await client.query(`
          SELECT 
            COUNT(*) as my_projects,
            COUNT(CASE WHEN project_status = 'in_progress' THEN 1 END) as active_projects,
            COUNT(CASE WHEN deadline < CURRENT_DATE AND project_status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_projects
          FROM projects
          WHERE created_by = $1
        `, [userId]);
        
        roleSpecificStats = {
          my_projects: parseInt(poStatsResult.rows[0].my_projects) || 0,
          active_projects: parseInt(poStatsResult.rows[0].active_projects) || 0,
          overdue_projects: parseInt(poStatsResult.rows[0].overdue_projects) || 0
        };
      } else if (userRole === 'pe') {
        // PE: 할당된 작업 통계
        const peStatsResult = await client.query(`
          SELECT 
            COUNT(*) as assigned_tasks,
            COUNT(CASE WHEN assignment_status = 'assigned' THEN 1 END) as pending_tasks,
            COUNT(CASE WHEN assignment_status = 'in_progress' THEN 1 END) as active_tasks
          FROM project_work_assignments
          WHERE assigned_to = $1
        `, [userId]);
        
        roleSpecificStats = {
          assigned_tasks: parseInt(peStatsResult.rows[0].assigned_tasks) || 0,
          pending_tasks: parseInt(peStatsResult.rows[0].pending_tasks) || 0,
          active_tasks: parseInt(peStatsResult.rows[0].active_tasks) || 0
        };
      }
      
      // [advice from AI] 프론트엔드가 기대하는 필드명으로 응답 구조 변경
      const basicStats = basicStatsResult.rows[0];
      res.json({
        success: true,
        my_pending_approvals: roleSpecificStats.pending_approvals || 0,
        my_pending_requests: basicStats.unread_messages || 0,
        unread_messages: basicStats.unread_messages || 0,
        total_notifications: basicStats.total_messages || 0,
        role_specific_stats: roleSpecificStats,
        basic_stats: basicStats,
        type_stats: typeStatsResult.rows,
        user_role: userRole
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 알림 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification stats',
      message: error.message
    });
  }
});

// [advice from AI] 메시지 센터에서 승인/거부 처리 API
router.post('/approve/:messageId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { action, reason } = req.body; // 'approve' or 'reject'
    const userId = req.user?.userId || req.user?.id;
    
    console.log('✅ 메시지 센터 승인/거부 처리:', { messageId, action, userId });

    const client = await pool.connect();
    
    try {
      // 메시지 정보 조회
      const messageResult = await client.query(
        'SELECT * FROM approval_messages WHERE message_id = $1 AND recipient_id = $2',
        [messageId, userId]
      );
      
      if (messageResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '메시지를 찾을 수 없습니다.'
        });
      }
      
      const message = messageResult.rows[0];
      
      // 삭제 승인 메시지인 경우
      if (message.metadata && message.metadata.deletion_request_id) {
        const deletionRequestId = message.metadata.deletion_request_id;
        
        if (action === 'approve') {
          // PO 승인 처리
          await client.query(
            'UPDATE project_deletion_requests SET po_approved = TRUE, po_approved_at = NOW(), po_approval_reason = $1 WHERE id = $2',
            [reason || '승인', deletionRequestId]
          );
          
          // PE에게 승인 요청 전송
          const peResult = await client.query(`
            SELECT pwa.assigned_to, pe.full_name, pe.username
            FROM project_deletion_requests pdr
            JOIN project_work_assignments pwa ON pdr.project_id = pwa.project_id
            JOIN timbel_users pe ON pwa.assigned_to = pe.id
            WHERE pdr.id = $1
          `, [deletionRequestId]);
          
          if (peResult.rows.length > 0) {
            const pe = peResult.rows[0];
            await client.query(`
              INSERT INTO approval_messages (
                message_id, recipient_id, sender_id, request_type, subject, content, 
                priority, message_type, sent_at, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
            `, [
              require('uuid').v4(), pe.assigned_to, userId, 'approval',
              '🗑️ 프로젝트 삭제 승인 요청 (PE)',
              `PO가 승인한 프로젝트 삭제에 대한 PE 승인이 필요합니다.\n사유: ${reason || '승인'}`,
              'high', 'notification',
              JSON.stringify({
                deletion_request_id: deletionRequestId,
                project_name: message.metadata.project_name,
                approval_type: 'pe_approval'
              })
            ]);
          }
          
          // 메시지 읽음 처리
          await client.query(
            'UPDATE approval_messages SET is_read = TRUE, read_at = NOW() WHERE message_id = $1',
            [messageId]
          );
          
          res.json({
            success: true,
            message: 'PO 승인이 완료되었습니다. PE에게 승인 요청이 전송되었습니다.'
          });
          
        } else if (action === 'reject') {
          // 거부 처리
          await client.query(
            'UPDATE project_deletion_requests SET deletion_status = \'rejected\', rejection_reason = $1, rejected_at = NOW() WHERE id = $2',
            [reason || '거부', deletionRequestId]
          );
          
          // 메시지 읽음 처리
          await client.query(
            'UPDATE approval_messages SET is_read = TRUE, read_at = NOW() WHERE message_id = $1',
            [messageId]
          );
          
          res.json({
            success: true,
            message: '삭제 요청이 거부되었습니다.'
          });
        }
      } else {
        // 일반 승인 메시지 처리
        await client.query(
          'UPDATE approval_messages SET is_read = TRUE, read_at = NOW() WHERE message_id = $1',
          [messageId]
        );
        
        res.json({
          success: true,
          message: action === 'approve' ? '승인 처리되었습니다.' : '거부 처리되었습니다.'
        });
      }
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 메시지 센터 승인/거부 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '승인/거부 처리에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 알림 읽음 처리
router.post('/:messageId/read', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    console.log('📖 알림 읽음 처리 (통합 시스템):', { messageId, userId });

    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE unified_message_recipients SET is_read = TRUE, read_at = NOW() WHERE message_id = $1 AND recipient_id = $2',
        [messageId, userId]
      );
      
      res.json({
        success: true,
        message: '알림을 읽음 처리했습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 알림 읽음 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '알림 읽음 처리에 실패했습니다.',
      error: error.message
    });
  }
});

// QC/QA 피드백 알림 통계 API
router.get('/feedback-stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('📊 QC/QA 피드백 알림 통계 조회:', { userId, userRole });

    const client = await pool.connect();
    
    try {
      let stats = {
        my_pending_approvals: 0,
        my_pending_requests: 0,
        unread_messages: 0,
        total_notifications: 0,
        qc_feedback_stats: {
          new_feedbacks: 0,
          pending_responses: 0,
          completed_feedbacks: 0
        }
      };

      if (userRole === 'pe') {
        // PE용 QC/QA 피드백 통계
        const feedbackStats = await client.query(`
          SELECT 
            COUNT(CASE WHEN feedback_status = 'open' THEN 1 END) as new_feedbacks,
            COUNT(CASE WHEN feedback_status = 'in_progress' THEN 1 END) as pending_responses,
            COUNT(CASE WHEN feedback_status = 'fixed' THEN 1 END) as completed_feedbacks,
            COUNT(*) as total_feedbacks
          FROM qc_feedback_items 
          WHERE assigned_to_pe = $1
        `, [userId]);

        // 읽지 않은 피드백 관련 메시지
        const unreadMessages = await client.query(`
          SELECT COUNT(*) as count
          FROM user_messages 
          WHERE recipient_id = $1 
            AND is_read = false 
            AND message_type IN ('qc_qa_request', 'pe_feedback_response')
        `, [userId]);

        stats.qc_feedback_stats = {
          new_feedbacks: parseInt(feedbackStats.rows[0].new_feedbacks) || 0,
          pending_responses: parseInt(feedbackStats.rows[0].pending_responses) || 0,
          completed_feedbacks: parseInt(feedbackStats.rows[0].completed_feedbacks) || 0
        };
        stats.unread_messages = parseInt(unreadMessages.rows[0].count) || 0;
        stats.total_notifications = stats.qc_feedback_stats.new_feedbacks + stats.unread_messages;

      } else if (userRole === 'qa') {
        // QC/QA용 통계
        const qcStats = await client.query(`
          SELECT 
            COUNT(CASE WHEN request_status = 'pending' THEN 1 END) as pending_requests,
            COUNT(CASE WHEN request_status = 'in_progress' THEN 1 END) as in_progress_requests,
            COUNT(CASE WHEN request_status = 'completed' THEN 1 END) as completed_requests
          FROM qc_qa_requests 
          WHERE assigned_to = $1 OR assigned_to IS NULL
        `, [userId]);

        // 읽지 않은 PE 응답 메시지
        const unreadMessages = await client.query(`
          SELECT COUNT(*) as count
          FROM user_messages 
          WHERE recipient_id = $1 
            AND is_read = false 
            AND message_type = 'pe_feedback_response'
        `, [userId]);

        stats.my_pending_requests = parseInt(qcStats.rows[0].pending_requests) || 0;
        stats.unread_messages = parseInt(unreadMessages.rows[0].count) || 0;
        stats.total_notifications = stats.my_pending_requests + stats.unread_messages;
      }

      res.json({
        success: true,
        data: stats
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ QC/QA 피드백 알림 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: 'QC/QA 피드백 알림 통계 조회에 실패했습니다.',
      error: error.message
    });
  }
});

// QC/QA 피드백 관련 메시지 목록 API
router.get('/feedback-messages', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    const { limit = 20, offset = 0 } = req.query;
    
    console.log('📬 QC/QA 피드백 메시지 조회:', { userId, userRole, limit, offset });

    const client = await pool.connect();
    
    try {
      let messages = [];

      if (userRole === 'pe') {
        // PE용 QC/QA 피드백 관련 메시지
        const result = await client.query(`
          SELECT 
            um.id,
            um.title,
            um.content,
            um.message_type,
            um.priority,
            um.is_read,
            um.created_at,
            sender.full_name as sender_name,
            p.name as project_name,
            qfi.title as feedback_title,
            qfi.feedback_status,
            qfi.severity_level
          FROM user_messages um
          LEFT JOIN timbel_users sender ON um.sender_id = sender.id
          LEFT JOIN projects p ON um.related_project_id = p.id
          LEFT JOIN qc_feedback_items qfi ON um.related_qc_request_id = qfi.qc_request_id
          WHERE um.recipient_id = $1 
            AND um.message_type IN ('qc_qa_request', 'pe_feedback_response')
          ORDER BY um.created_at DESC
          LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        messages = result.rows;

      } else if (userRole === 'qa') {
        // QC/QA용 PE 응답 메시지
        const result = await client.query(`
          SELECT 
            um.id,
            um.title,
            um.content,
            um.message_type,
            um.priority,
            um.is_read,
            um.created_at,
            sender.full_name as sender_name,
            p.name as project_name
          FROM user_messages um
          LEFT JOIN timbel_users sender ON um.sender_id = sender.id
          LEFT JOIN projects p ON um.related_project_id = p.id
          WHERE um.recipient_id = $1 
            AND um.message_type = 'pe_feedback_response'
          ORDER BY um.created_at DESC
          LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        messages = result.rows;
      }

      res.json({
        success: true,
        data: messages
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ QC/QA 피드백 메시지 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: 'QC/QA 피드백 메시지 조회에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 메시지 생성 API
router.post('/messages/create', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { title, message, messageType, priority, recipients, eventCategory, eventSource } = req.body;
    
    console.log('📝 메시지 생성 요청:', { 
      userId, 
      title, 
      messageType, 
      priority, 
      recipientCount: recipients?.length 
    });

    if (!title || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: '제목, 내용, 수신자는 필수입니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 통합 메시지 시스템 사용 (테이블은 이미 생성됨)
      
      // 메시지 생성
      const messageResult = await client.query(`
        INSERT INTO unified_messages (
          title, content, message_type, priority, sender_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        title, 
        message, 
        messageType || 'info', 
        priority || 1, // [advice from AI] priority를 숫자로 처리 (1=low, 2=normal, 3=high, 4=urgent) 
        userId,
        JSON.stringify({
          event_category: eventCategory || 'manual_message',
          event_source: eventSource || 'user'
        })
      ]);
      
      const messageId = messageResult.rows[0].id;
      
      // 수신자 추가
      for (const recipientId of recipients) {
        await client.query(`
          INSERT INTO unified_message_recipients (message_id, recipient_id)
          VALUES ($1, $2)
        `, [messageId, recipientId]);
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ 메시지 생성 완료: ${messageId} - ${title}`);
      
      res.json({
        success: true,
        message: '메시지가 성공적으로 생성되었습니다.',
        messageId
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 메시지 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create message',
      message: error.message
    });
  }
});

// [advice from AI] 사용자 목록 조회 API
router.get('/users/list', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    console.log('👥 사용자 목록 조회 요청:', { userId });

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          full_name,
          role_type,
          email,
          status
        FROM timbel_users 
        WHERE status != 'inactive'
          AND id != $1
        ORDER BY role_type, full_name
      `, [userId]);
      
      console.log(`✅ 사용자 목록 조회 완료: ${result.rows.length}명`);
      
      res.json({
        success: true,
        users: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 사용자 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load users',
      message: error.message
    });
  }
});

module.exports = router;
