// [advice from AI] 협업용 알림 센터
// 상단 프레임의 메시지 센터에서 승인 관리 및 협업 기능 제공

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const EmailService = require('./emailService');
const PushNotificationService = require('./pushNotificationService');

class CollaborationNotificationCenter {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
    
    this.emailService = new EmailService();
    this.pushService = new PushNotificationService();
  }

  // [advice from AI] 내가 승인해야 할 항목들 조회
  async getMyPendingApprovals(userId, filters = {}) {
    try {
      const {
        priority = '',
        type = '',
        department_id = '',
        limit = 20,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          ar.*,
          u.full_name as requester_name,
          u.email as requester_email,
          d.name as department_name,
          p.name as project_name,
          aa.level as my_approval_level,
          aa.assigned_at as assigned_to_me_at,
          aa.timeout_hours,
          aa.escalation_config,
          CASE 
            WHEN aa.assigned_at + INTERVAL '1 hour' * aa.timeout_hours < NOW() THEN 'overdue'
            WHEN aa.assigned_at + INTERVAL '1 hour' * (aa.timeout_hours * 0.8) < NOW() THEN 'urgent'
            ELSE 'normal'
          END as urgency_status
        FROM approval_requests ar
        JOIN approval_assignments aa ON ar.request_id = aa.request_id
        JOIN timbel_users u ON ar.requester_id = u.id
        LEFT JOIN departments d ON ar.department_id = d.id
        LEFT JOIN projects p ON ar.project_id = p.id
        WHERE aa.approver_id = $1 
        AND aa.status = 'pending'
        AND ar.status = 'pending'
      `;

      const params = [userId];
      let paramCount = 1;

      if (priority) {
        paramCount++;
        query += ` AND ar.priority = $${paramCount}`;
        params.push(priority);
      }

      if (type) {
        paramCount++;
        query += ` AND ar.type = $${paramCount}`;
        params.push(type);
      }

      if (department_id) {
        paramCount++;
        query += ` AND ar.department_id = $${paramCount}`;
        params.push(department_id);
      }

      query += ` ORDER BY 
        CASE 
          WHEN aa.assigned_at + INTERVAL '1 hour' * aa.timeout_hours < NOW() THEN 1
          WHEN aa.assigned_at + INTERVAL '1 hour' * (aa.timeout_hours * 0.8) < NOW() THEN 2
          ELSE 3
        END,
        ar.priority DESC,
        aa.assigned_at ASC
      `;

      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      // [advice from AI] 통계 정보 추가
      const statsQuery = `
        SELECT 
          COUNT(*) as total_pending,
          COUNT(CASE WHEN ar.priority = 'urgent' THEN 1 END) as urgent_count,
          COUNT(CASE WHEN ar.priority = 'high' THEN 1 END) as high_count,
          COUNT(CASE WHEN aa.assigned_at + INTERVAL '1 hour' * aa.timeout_hours < NOW() THEN 1 END) as overdue_count
        FROM approval_requests ar
        JOIN approval_assignments aa ON ar.request_id = aa.request_id
        WHERE aa.approver_id = $1 
        AND aa.status = 'pending'
        AND ar.status = 'pending'
      `;

      const statsResult = await this.pool.query(statsQuery, [userId]);

      return {
        success: true,
        data: {
          approvals: result.rows,
          stats: statsResult.rows[0],
          pagination: {
            limit,
            offset,
            hasMore: result.rows.length === limit
          }
        }
      };

    } catch (error) {
      console.error('내 승인 대기 목록 조회 실패:', error);
      throw new Error(`내 승인 대기 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 내가 요청한 승인 상태 조회
  async getMyRequestedApprovals(userId, filters = {}) {
    try {
      const {
        status = '',
        type = '',
        priority = '',
        limit = 20,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          ar.*,
          d.name as department_name,
          p.name as project_name,
          COUNT(aa.id) as total_approvers,
          COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN aa.status = 'rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_count,
          MAX(aa.responded_at) as last_response_at
        FROM approval_requests ar
        LEFT JOIN departments d ON ar.department_id = d.id
        LEFT JOIN projects p ON ar.project_id = p.id
        LEFT JOIN approval_assignments aa ON ar.request_id = aa.request_id
        WHERE ar.requester_id = $1
      `;

      const params = [userId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND ar.status = $${paramCount}`;
        params.push(status);
      }

      if (type) {
        paramCount++;
        query += ` AND ar.type = $${paramCount}`;
        params.push(type);
      }

      if (priority) {
        paramCount++;
        query += ` AND ar.priority = $${paramCount}`;
        params.push(priority);
      }

      query += ` GROUP BY ar.id, d.name, p.name
        ORDER BY ar.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      // [advice from AI] 통계 정보
      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
          AVG(CASE WHEN status = 'approved' THEN 
            EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 
          END) as avg_approval_hours
        FROM approval_requests 
        WHERE requester_id = $1
      `;

      const statsResult = await this.pool.query(statsQuery, [userId]);

      return {
        success: true,
        data: {
          requests: result.rows,
          stats: statsResult.rows[0],
          pagination: {
            limit,
            offset,
            hasMore: result.rows.length === limit
          }
        }
      };

    } catch (error) {
      console.error('내 요청한 승인 조회 실패:', error);
      throw new Error(`내 요청한 승인 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 팀/부서별 승인 현황 조회
  async getTeamApprovalStatus(userId, filters = {}) {
    try {
      const {
        department_id = '',
        period = '30d',
        limit = 50
      } = filters;

      // [advice from AI] 사용자 부서 정보 조회
      const userResult = await this.pool.query(`
        SELECT u.department_id, d.name as department_name
        FROM timbel_users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = $1
      `, [userId]);

      const userDepartment = userResult.rows[0];
      const targetDepartmentId = department_id || userDepartment.department_id;

      if (!targetDepartmentId) {
        return {
          success: true,
          data: {
            team_stats: [],
            department_approvals: [],
            message: '부서 정보가 없습니다'
          }
        };
      }

      // [advice from AI] 기간 필터 설정
      let timeFilter = '';
      if (period === '7d') {
        timeFilter = "ar.created_at >= NOW() - INTERVAL '7 days'";
      } else if (period === '30d') {
        timeFilter = "ar.created_at >= NOW() - INTERVAL '30 days'";
      } else if (period === '90d') {
        timeFilter = "ar.created_at >= NOW() - INTERVAL '90 days'";
      }

      // [advice from AI] 팀 승인 통계
      const teamStatsQuery = `
        SELECT 
          ar.type,
          ar.priority,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN ar.status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN ar.status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN ar.status = 'rejected' THEN 1 END) as rejected_requests,
          AVG(CASE WHEN ar.status = 'approved' THEN 
            EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at)) / 3600 
          END) as avg_approval_hours
        FROM approval_requests ar
        WHERE ar.department_id = $1
        ${timeFilter ? `AND ${timeFilter}` : ''}
        GROUP BY ar.type, ar.priority
        ORDER BY total_requests DESC
      `;

      const teamStatsResult = await this.pool.query(teamStatsQuery, [targetDepartmentId]);

      // [advice from AI] 부서 승인 현황 (최근 요청들)
      const departmentApprovalsQuery = `
        SELECT 
          ar.*,
          u.full_name as requester_name,
          p.name as project_name,
          COUNT(aa.id) as total_approvers,
          COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_count
        FROM approval_requests ar
        JOIN timbel_users u ON ar.requester_id = u.id
        LEFT JOIN projects p ON ar.project_id = p.id
        LEFT JOIN approval_assignments aa ON ar.request_id = aa.request_id
        WHERE ar.department_id = $1
        ${timeFilter ? `AND ${timeFilter}` : ''}
        GROUP BY ar.id, u.full_name, p.name
        ORDER BY ar.created_at DESC
        LIMIT $2
      `;

      const departmentApprovalsResult = await this.pool.query(departmentApprovalsQuery, [targetDepartmentId, limit]);

      // [advice from AI] 부서별 승인자 성과
      const approverPerformanceQuery = `
        SELECT 
          u.full_name,
          u.role_type,
          COUNT(aa.id) as total_assignments,
          COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN aa.status = 'rejected' THEN 1 END) as rejected_count,
          AVG(CASE WHEN aa.status != 'pending' THEN 
            EXTRACT(EPOCH FROM (aa.responded_at - aa.assigned_at)) / 3600 
          END) as avg_response_hours
        FROM approval_assignments aa
        JOIN timbel_users u ON aa.approver_id = u.id
        JOIN approval_requests ar ON aa.request_id = ar.request_id
        WHERE ar.department_id = $1
        ${timeFilter ? `AND ar.created_at >= NOW() - INTERVAL '${period.replace('d', ' days')}'` : ''}
        GROUP BY u.id, u.full_name, u.role_type
        ORDER BY total_assignments DESC
      `;

      const approverPerformanceResult = await this.pool.query(approverPerformanceQuery, [targetDepartmentId]);

      return {
        success: true,
        data: {
          department: userDepartment,
          team_stats: teamStatsResult.rows,
          department_approvals: departmentApprovalsResult.rows,
          approver_performance: approverPerformanceResult.rows,
          period: period
        }
      };

    } catch (error) {
      console.error('팀 승인 현황 조회 실패:', error);
      throw new Error(`팀 승인 현황 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 우선순위별 알림 분류 조회
  async getNotificationsByPriority(userId, filters = {}) {
    try {
      const {
        priority = '',
        is_read = '',
        limit = 50,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          am.*,
          u.full_name as sender_name,
          ar.title as request_title,
          ar.type as request_type,
          ar.priority as request_priority,
          ar.status as request_status
        FROM approval_messages am
        JOIN timbel_users u ON am.sender_id = u.id
        LEFT JOIN approval_requests ar ON am.request_id = ar.request_id
        WHERE am.recipient_id = $1
      `;

      const params = [userId];
      let paramCount = 1;

      if (priority) {
        paramCount++;
        query += ` AND am.priority = $${paramCount}`;
        params.push(priority);
      }

      if (is_read !== '') {
        paramCount++;
        query += ` AND am.is_read = $${paramCount}`;
        params.push(is_read === 'true');
      }

      query += ` ORDER BY 
        CASE am.priority 
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        am.sent_at DESC
      `;

      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      // [advice from AI] 우선순위별 통계
      const statsQuery = `
        SELECT 
          priority,
          COUNT(*) as count,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
        FROM approval_messages 
        WHERE recipient_id = $1
        GROUP BY priority
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `;

      const statsResult = await this.pool.query(statsQuery, [userId]);

      return {
        success: true,
        data: {
          notifications: result.rows,
          priority_stats: statsResult.rows,
          pagination: {
            limit,
            offset,
            hasMore: result.rows.length === limit
          }
        }
      };

    } catch (error) {
      console.error('우선순위별 알림 조회 실패:', error);
      throw new Error(`우선순위별 알림 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 알림 센터 대시보드 통계
  async getNotificationCenterStats(userId) {
    try {
      // [advice from AI] 내가 승인해야 할 항목 통계
      const pendingApprovalsStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_pending,
          COUNT(CASE WHEN ar.priority = 'urgent' THEN 1 END) as urgent_pending,
          COUNT(CASE WHEN ar.priority = 'high' THEN 1 END) as high_pending,
          COUNT(CASE WHEN aa.assigned_at + INTERVAL '1 hour' * aa.timeout_hours < NOW() THEN 1 END) as overdue_pending
        FROM approval_requests ar
        JOIN approval_assignments aa ON ar.request_id = aa.request_id
        WHERE aa.approver_id = $1 
        AND aa.status = 'pending'
        AND ar.status = 'pending'
      `, [userId]);

      // [advice from AI] 내가 요청한 승인 통계
      const myRequestsStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests
        FROM approval_requests 
        WHERE requester_id = $1
      `, [userId]);

      // [advice from AI] 읽지 않은 메시지 통계
      const unreadMessagesStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_unread,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_unread,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_unread
        FROM approval_messages 
        WHERE recipient_id = $1 
        AND is_read = false
      `, [userId]);

      // [advice from AI] 최근 활동 (최근 7일)
      const recentActivity = await this.pool.query(`
        SELECT 
          'approval_request' as activity_type,
          ar.title,
          ar.type,
          ar.priority,
          ar.created_at,
          'created' as action
        FROM approval_requests ar
        WHERE ar.requester_id = $1
        AND ar.created_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'approval_response' as activity_type,
          ar.title,
          ar.type,
          ar.priority,
          aa.responded_at as created_at,
          aa.status as action
        FROM approval_assignments aa
        JOIN approval_requests ar ON aa.request_id = ar.request_id
        WHERE aa.approver_id = $1
        AND aa.responded_at >= NOW() - INTERVAL '7 days'
        
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);

      return {
        success: true,
        data: {
          pending_approvals: pendingApprovalsStats.rows[0],
          my_requests: myRequestsStats.rows[0],
          unread_messages: unreadMessagesStats.rows[0],
          recent_activity: recentActivity.rows
        }
      };

    } catch (error) {
      console.error('알림 센터 통계 조회 실패:', error);
      throw new Error(`알림 센터 통계 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 알림 읽음 처리
  async markNotificationAsRead(userId, messageId) {
    try {
      const result = await this.pool.query(`
        UPDATE approval_messages 
        SET is_read = true, read_at = NOW()
        WHERE message_id = $1 AND recipient_id = $2
        RETURNING id, message_id, read_at
      `, [messageId, userId]);

      if (result.rows.length === 0) {
        throw new Error('메시지를 찾을 수 없습니다');
      }

      return {
        success: true,
        data: result.rows[0],
        message: '알림이 읽음 처리되었습니다'
      };

    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      throw new Error(`알림 읽음 처리 실패: ${error.message}`);
    }
  }

  // [advice from AI] 모든 알림 읽음 처리
  async markAllNotificationsAsRead(userId) {
    try {
      const result = await this.pool.query(`
        UPDATE approval_messages 
        SET is_read = true, read_at = NOW()
        WHERE recipient_id = $1 AND is_read = false
        RETURNING COUNT(*) as updated_count
      `, [userId]);

      return {
        success: true,
        data: {
          updated_count: result.rows[0].updated_count
        },
        message: '모든 알림이 읽음 처리되었습니다'
      };

    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
      throw new Error(`모든 알림 읽음 처리 실패: ${error.message}`);
    }
  }

  // [advice from AI] 서비스 종료
  async close() {
    await this.pool.end();
    await this.emailService.close();
    await this.pushService.close();
  }
}

module.exports = CollaborationNotificationCenter;
