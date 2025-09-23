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
  database: process.env.DB_NAME || 'timbel_db',
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
          pending_approvals: parseInt(pendingProjects.rows[0].count),
          approved_projects: parseInt(approvedProjects.rows[0].count),
          rejected_projects: parseInt(rejectedProjects.rows[0].count),
          total_projects: parseInt(totalProjects.rows[0].count)
        };
      } else if (userRole === 'po') {
        // PO용 통계
        const [claimedProjects, availableProjects, assignedProjects] = await Promise.all([
          client.query('SELECT COUNT(*) as count FROM projects WHERE claimed_by_po = $1', [userId]),
          client.query('SELECT COUNT(*) as count FROM projects WHERE approval_status = \'approved\' AND claimed_by_po IS NULL'),
          client.query(`
            SELECT COUNT(*) as count 
            FROM project_work_assignments pwa 
            JOIN projects p ON pwa.project_id = p.id 
            WHERE p.claimed_by_po = $1
          `, [userId])
        ]);
        
        stats = {
          claimed_projects: parseInt(claimedProjects.rows[0].count),
          available_projects: parseInt(availableProjects.rows[0].count),
          assigned_projects: parseInt(assignedProjects.rows[0].count)
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
          assigned_projects: parseInt(assignedProjects.rows[0].count),
          in_progress_projects: parseInt(inProgressProjects.rows[0].count),
          completed_projects: parseInt(completedProjects.rows[0].count)
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

    const client = await pool.connect();
    
    try {
      // 기존 approval_messages 테이블에서 사용자별 메시지 조회 (올바른 필드명)
      let query = `
        SELECT 
          am.message_id as id,
          am.subject as title,
          am.content as message,
          am.message_type,
          am.priority,
          am.sent_at as created_at,
          am.is_read,
          sender.full_name as sender_name,
          sender.role_type as sender_role,
          am.metadata
        FROM approval_messages am
        LEFT JOIN timbel_users sender ON am.sender_id = sender.id
        WHERE am.recipient_id = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;
      
      if (message_type) {
        query += ` AND am.message_type = $${paramIndex}`;
        params.push(message_type);
        paramIndex++;
      }
      
      if (is_read !== null) {
        query += ` AND am.is_read = $${paramIndex}`;
        params.push(is_read === 'true');
        paramIndex++;
      }
      
      if (priority) {
        query += ` AND am.priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }
      
      query += ` ORDER BY am.sent_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await client.query(query, params);
      
      // 읽지 않은 메시지 개수
      const unreadCountResult = await client.query(`
        SELECT COUNT(*) as count
        FROM approval_messages
        WHERE recipient_id = $1 AND is_read = FALSE
      `, [userId]);
      
      const unreadCount = parseInt(unreadCountResult.rows[0].count);
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rows.length,
          hasMore: result.rows.length === parseInt(limit)
        },
        stats: {
          unread_count: unreadCount,
          total_count: result.rows.length
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

    const client = await pool.connect();
    
    try {
      // 기본 알림 통계
      const basicStatsResult = await client.query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_messages,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_messages,
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
        const adminStatsResult = await client.query(`
          SELECT 
            COUNT(*) as pending_approvals,
            COUNT(CASE WHEN urgency_level = 'critical' THEN 1 END) as urgent_approvals,
            COUNT(CASE WHEN is_urgent_development = TRUE THEN 1 END) as urgent_development_projects
          FROM projects
          WHERE approval_status = 'pending'
        `);
        
        roleSpecificStats = {
          pending_approvals: parseInt(adminStatsResult.rows[0].pending_approvals),
          urgent_approvals: parseInt(adminStatsResult.rows[0].urgent_approvals),
          urgent_development_projects: parseInt(adminStatsResult.rows[0].urgent_development_projects)
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
          my_projects: parseInt(poStatsResult.rows[0].my_projects),
          active_projects: parseInt(poStatsResult.rows[0].active_projects),
          overdue_projects: parseInt(poStatsResult.rows[0].overdue_projects)
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
          assigned_tasks: parseInt(peStatsResult.rows[0].assigned_tasks),
          pending_tasks: parseInt(peStatsResult.rows[0].pending_tasks),
          active_tasks: parseInt(peStatsResult.rows[0].active_tasks)
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

    console.log('📖 알림 읽음 처리:', { messageId, userId });

    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE approval_messages SET is_read = TRUE, read_at = NOW() WHERE message_id = $1 AND recipient_id = $2',
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

module.exports = router;
