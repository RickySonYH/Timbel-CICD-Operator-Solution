// [advice from AI] 메시지 센터 서비스
// 권한별 단계별 이벤트를 관리하는 통합 알림 시스템

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

class MessageCenterService {
  // [advice from AI] 메시지 생성
  static async createMessage({
    title,
    message,
    messageType = 'info',
    eventCategory,
    eventSource = 'system',
    projectId = null,
    relatedUserId = null,
    assignmentId = null,
    metadata = {},
    priority = 1,
    expiresAt = null,
    createdBy = null,
    recipients = [] // 수신자 ID 배열
  }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 통합 메시지 시스템 사용
      const messageResult = await client.query(`
        INSERT INTO unified_messages (
          title, content, message_type, priority, sender_id, expires_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        title, 
        message, 
        messageType, 
        priority,
        createdBy,
        expiresAt,
        JSON.stringify({
          event_category: eventCategory,
          event_source: eventSource,
          project_id: projectId,
          related_user_id: relatedUserId,
          assignment_id: assignmentId,
          ...metadata
        })
      ]);
      
      const messageId = messageResult.rows[0].id;
      
      // 수신자 추가
      if (recipients.length > 0) {
        const recipientValues = recipients.map((recipientId, index) => 
          `($1, $${index + 2})`
        ).join(', ');
        
        await client.query(`
          INSERT INTO unified_message_recipients (message_id, recipient_id)
          VALUES ${recipientValues}
        `, [messageId, ...recipients]);
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ 메시지 생성 완료: ${messageId} - ${title}`);
      return messageId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ 메시지 생성 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // [advice from AI] 사용자별 메시지 목록 조회
  static async getUserMessages(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      messageType = null,
      eventCategory = null,
      isRead = null,
      isStarred = null,
      priority = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;
    
    let whereConditions = ['recipient_user_id = $1'];
    let params = [userId];
    let paramIndex = 2;
    
    if (messageType) {
      whereConditions.push(`message_type = $${paramIndex}`);
      params.push(messageType);
      paramIndex++;
    }
    
    if (eventCategory) {
      whereConditions.push(`event_category = $${paramIndex}`);
      params.push(eventCategory);
      paramIndex++;
    }
    
    if (isRead !== null) {
      whereConditions.push(`is_read = $${paramIndex}`);
      params.push(isRead);
      paramIndex++;
    }
    
    if (isStarred !== null) {
      whereConditions.push(`is_starred = $${paramIndex}`);
      params.push(isStarred);
      paramIndex++;
    }
    
    if (priority !== null) {
      whereConditions.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT *
        FROM user_messages
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);
      
      return result.rows;
    } catch (error) {
      console.error('❌ 사용자 메시지 조회 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // [advice from AI] 메시지 읽음 처리
  static async markAsRead(messageId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query(`
        UPDATE message_recipients 
        SET is_read = TRUE, read_at = NOW()
        WHERE message_id = $1 AND recipient_user_id = $2
      `, [messageId, userId]);
      
      // 액션 로그 추가
      await client.query(`
        INSERT INTO message_actions (message_id, user_id, action_type)
        VALUES ($1, $2, 'read')
      `, [messageId, userId]);
      
    } catch (error) {
      console.error('❌ 메시지 읽음 처리 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // [advice from AI] 읽지 않은 메시지 개수
  static async getUnreadCount(userId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM message_recipients
        WHERE recipient_user_id = $1 AND is_read = FALSE AND is_deleted = FALSE
      `, [userId]);
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ 읽지 않은 메시지 개수 조회 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // [advice from AI] 프로젝트 생성 알림
  static async notifyProjectCreated(projectId, projectName, createdBy) {
    try {
      // 최고관리자들에게 알림
      const client = await pool.connect();
      
      try {
        const adminsResult = await client.query(`
          SELECT id FROM timbel_users WHERE role_type = 'admin'
        `);
        
        const adminIds = adminsResult.rows.map(row => row.id);
        
        if (adminIds.length > 0) {
          await this.createMessage({
            title: '🆕 새 프로젝트 승인 요청',
            message: `"${projectName}" 프로젝트가 생성되어 승인을 기다리고 있습니다.`,
            messageType: 'info',
            eventCategory: 'project_created',
            eventSource: 'user',
            projectId: projectId,
            relatedUserId: createdBy,
            priority: 2,
            createdBy: createdBy,
            recipients: adminIds
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ 프로젝트 생성 알림 실패:', error);
    }
  }
  
  // [advice from AI] 프로젝트 승인 알림
  static async notifyProjectApproved(projectId, projectName, approvedBy, projectCreator) {
    try {
      await this.createMessage({
        title: '✅ 프로젝트 승인 완료',
        message: `"${projectName}" 프로젝트가 승인되었습니다. 이제 PE 할당을 진행할 수 있습니다.`,
        messageType: 'success',
        eventCategory: 'project_approved',
        eventSource: 'user',
        projectId: projectId,
        relatedUserId: approvedBy,
        priority: 2,
        createdBy: approvedBy,
        recipients: [projectCreator]
      });
    } catch (error) {
      console.error('❌ 프로젝트 승인 알림 실패:', error);
    }
  }
  
  // [advice from AI] 프로젝트 거부 알림
  static async notifyProjectRejected(projectId, projectName, rejectedBy, projectCreator, reason) {
    try {
      await this.createMessage({
        title: '❌ 프로젝트 승인 거부',
        message: `"${projectName}" 프로젝트가 거부되었습니다.\n사유: ${reason}`,
        messageType: 'error',
        eventCategory: 'project_rejected',
        eventSource: 'user',
        projectId: projectId,
        relatedUserId: rejectedBy,
        priority: 3,
        createdBy: rejectedBy,
        recipients: [projectCreator],
        metadata: { rejection_reason: reason }
      });
    } catch (error) {
      console.error('❌ 프로젝트 거부 알림 실패:', error);
    }
  }
  
  // [advice from AI] PE 할당 알림
  static async notifyPEAssigned(projectId, projectName, peUserId, assignedBy) {
    try {
      await this.createMessage({
        title: '👨‍💻 새 프로젝트 할당',
        message: `"${projectName}" 프로젝트가 할당되었습니다. 작업 시작을 위해 요구사항을 검토해주세요.`,
        messageType: 'info',
        eventCategory: 'pe_assigned',
        eventSource: 'user',
        projectId: projectId,
        relatedUserId: assignedBy,
        priority: 2,
        createdBy: assignedBy,
        recipients: [peUserId]
      });
    } catch (error) {
      console.error('❌ PE 할당 알림 실패:', error);
    }
  }
  
  // [advice from AI] 작업 시작 알림
  static async notifyWorkStarted(projectId, projectName, peUserId, repositoryUrl) {
    try {
      // PO와 최고관리자에게 알림
      const client = await pool.connect();
      
      try {
        const recipientsResult = await client.query(`
          SELECT DISTINCT u.id
          FROM timbel_users u
          WHERE u.role_type IN ('admin', 'po')
             OR (u.role_type = 'po' AND u.id = (
               SELECT p.created_by FROM projects p WHERE p.id = $1
             ))
        `, [projectId]);
        
        const recipientIds = recipientsResult.rows.map(row => row.id);
        
        if (recipientIds.length > 0) {
          await this.createMessage({
            title: '🚀 프로젝트 작업 시작',
            message: `"${projectName}" 프로젝트의 개발이 시작되었습니다.\n레포지토리: ${repositoryUrl}`,
            messageType: 'success',
            eventCategory: 'work_started',
            eventSource: 'user',
            projectId: projectId,
            relatedUserId: peUserId,
            priority: 2,
            createdBy: peUserId,
            recipients: recipientIds,
            metadata: { repository_url: repositoryUrl }
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ 작업 시작 알림 실패:', error);
    }
  }
  
  // [advice from AI] 작업 거부 알림
  static async notifyWorkRejected(projectId, projectName, peUserId, reason, category) {
    try {
      // PO와 최고관리자에게 알림
      const client = await pool.connect();
      
      try {
        const recipientsResult = await client.query(`
          SELECT DISTINCT u.id
          FROM timbel_users u
          WHERE u.role_type IN ('admin', 'po')
             OR (u.role_type = 'po' AND u.id = (
               SELECT p.created_by FROM projects p WHERE p.id = $1
             ))
        `, [projectId]);
        
        const recipientIds = recipientsResult.rows.map(row => row.id);
        
        if (recipientIds.length > 0) {
          await this.createMessage({
            title: '⚠️ 프로젝트 작업 거부',
            message: `"${projectName}" 프로젝트 작업이 거부되었습니다.\n분류: ${category}\n사유: ${reason}`,
            messageType: 'warning',
            eventCategory: 'work_rejected',
            eventSource: 'user',
            projectId: projectId,
            relatedUserId: peUserId,
            priority: 3,
            createdBy: peUserId,
            recipients: recipientIds,
            metadata: { 
              rejection_reason: reason,
              rejection_category: category
            }
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ 작업 거부 알림 실패:', error);
    }
  }
  
  // [advice from AI] 프로젝트 상태 변경 알림
  static async notifyStatusChanged(projectId, projectName, oldStatus, newStatus, changedBy, reason = null) {
    try {
      // 관련자들에게 알림 (프로젝트 생성자, 할당된 PE, PO, 최고관리자)
      const client = await pool.connect();
      
      try {
        const recipientsResult = await client.query(`
          SELECT DISTINCT u.id
          FROM timbel_users u
          WHERE u.role_type IN ('admin', 'po')
             OR u.id = (SELECT p.created_by FROM projects p WHERE p.id = $1)
             OR u.id IN (
               SELECT pwa.assigned_pe_id 
               FROM project_work_assignments pwa 
               WHERE pwa.project_id = $1
             )
        `, [projectId]);
        
        const recipientIds = recipientsResult.rows.map(row => row.id);
        
        if (recipientIds.length > 0) {
          const statusMessages = {
            'approved': '승인됨',
            'rejected': '거부됨',
            'in_progress': '진행 중',
            'development': '개발 중',
            'completed': '완료됨',
            'cancelled': '취소됨',
            'on_hold': '보류됨'
          };
          
          const messageType = newStatus === 'completed' ? 'success' : 
                             newStatus === 'cancelled' ? 'error' : 'info';
          
          let message = `"${projectName}" 프로젝트 상태가 변경되었습니다.\n${statusMessages[oldStatus] || oldStatus} → ${statusMessages[newStatus] || newStatus}`;
          
          if (reason) {
            message += `\n사유: ${reason}`;
          }
          
          await this.createMessage({
            title: '📋 프로젝트 상태 변경',
            message: message,
            messageType: messageType,
            eventCategory: 'status_changed',
            eventSource: 'user',
            projectId: projectId,
            relatedUserId: changedBy,
            priority: 2,
            createdBy: changedBy,
            recipients: recipientIds,
            metadata: { 
              old_status: oldStatus,
              new_status: newStatus,
              change_reason: reason
            }
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ 상태 변경 알림 실패:', error);
    }
  }
  
  // [advice from AI] 긴급 개발 프로젝트 알림
  static async notifyUrgentProject(projectId, projectName, urgentReason, expectedHours, createdBy) {
    try {
      // 모든 관리자와 PO에게 긴급 알림
      const client = await pool.connect();
      
      try {
        const recipientsResult = await client.query(`
          SELECT id FROM timbel_users WHERE role_type IN ('admin', 'po')
        `);
        
        const recipientIds = recipientsResult.rows.map(row => row.id);
        
        if (recipientIds.length > 0) {
          await this.createMessage({
            title: '🚨 긴급 개발 프로젝트',
            message: `긴급 개발이 필요한 "${projectName}" 프로젝트가 생성되었습니다.\n사유: ${urgentReason}\n예상 완료 시간: ${expectedHours}시간`,
            messageType: 'urgent',
            eventCategory: 'urgent_project',
            eventSource: 'user',
            projectId: projectId,
            relatedUserId: createdBy,
            priority: 4, // 최고 우선순위
            createdBy: createdBy,
            recipients: recipientIds,
            metadata: { 
              urgent_reason: urgentReason,
              expected_hours: expectedHours
            }
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ 긴급 프로젝트 알림 실패:', error);
    }
  }
}

module.exports = MessageCenterService;
