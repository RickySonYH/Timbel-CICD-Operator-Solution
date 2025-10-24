// [advice from AI] 감사 로그 서비스
// 모든 사용자 액션 추적 및 보안 감사

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class AuditLogService {
  constructor() {
    this.pool = new Pool({
      host: process.env.OPERATIONS_DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'timbel_user',
      password: process.env.DB_PASSWORD || 'timbel2024!',
      database: process.env.OPERATIONS_DB_NAME || 'timbel_cicd_operator',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    console.log('📋 AuditLogService 초기화 완료');
  }

  /**
   * 감사 로그 기록
   */
  async log(logData) {
    try {
      const logId = `audit-${Date.now()}-${uuidv4().substring(0, 8)}`;
      
      const query = `
        INSERT INTO audit_logs (
          log_id, user_id, username, user_email, user_role,
          action, action_type, resource_type, resource_id, resource_name,
          description, old_value, new_value, changes,
          ip_address, user_agent, request_method, request_url, request_body,
          status_code, success, error_message,
          severity, category, tags, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26
        ) RETURNING *
      `;
      
      const values = [
        logId,
        logData.user_id || null,
        logData.username || null,
        logData.user_email || null,
        logData.user_role || null,
        logData.action,
        logData.action_type,
        logData.resource_type || null,
        logData.resource_id || null,
        logData.resource_name || null,
        logData.description || null,
        JSON.stringify(logData.old_value || null),
        JSON.stringify(logData.new_value || null),
        JSON.stringify(logData.changes || null),
        logData.ip_address || null,
        logData.user_agent || null,
        logData.request_method || null,
        logData.request_url || null,
        JSON.stringify(logData.request_body || null),
        logData.status_code || 200,
        logData.success !== false,
        logData.error_message || null,
        logData.severity || 'info',
        logData.category || 'system',
        logData.tags || [],
        JSON.stringify(logData.metadata || {})
      ];
      
      const result = await this.pool.query(query, values);
      
      return {
        success: true,
        log_id: logId,
        data: result.rows[0]
      };
      
    } catch (error) {
      console.error('❌ 감사 로그 기록 실패:', error);
      // 감사 로그 실패는 애플리케이션 중단으로 이어지면 안 됨
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 로그인 이력 기록
   */
  async logLogin(loginData) {
    try {
      const query = `
        INSERT INTO login_history (
          user_id, username, login_type, success, failure_reason,
          session_id, token_id, ip_address, user_agent,
          location_country, location_city, is_suspicious, risk_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        loginData.user_id,
        loginData.username,
        loginData.login_type || 'password',
        loginData.success,
        loginData.failure_reason || null,
        loginData.session_id || null,
        loginData.token_id || null,
        loginData.ip_address || null,
        loginData.user_agent || null,
        loginData.location_country || null,
        loginData.location_city || null,
        loginData.is_suspicious || false,
        loginData.risk_score || 0
      ];
      
      const result = await this.pool.query(query, values);
      
      // 동시에 감사 로그에도 기록
      await this.log({
        user_id: loginData.user_id,
        username: loginData.username,
        action: loginData.success ? 'login_success' : 'login_failed',
        action_type: 'login',
        description: loginData.success ? '로그인 성공' : `로그인 실패: ${loginData.failure_reason || 'Unknown'}`,
        ip_address: loginData.ip_address,
        user_agent: loginData.user_agent,
        success: loginData.success,
        severity: loginData.success ? 'info' : 'warning',
        category: 'authentication'
      });
      
      return {
        success: true,
        data: result.rows[0]
      };
      
    } catch (error) {
      console.error('❌ 로그인 이력 기록 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 보안 이벤트 생성
   */
  async createSecurityEvent(eventData) {
    try {
      const eventId = `sec-${uuidv4()}`;
      
      const query = `
        INSERT INTO security_events (
          event_id, event_type, severity, description,
          user_id, ip_address, resource_type, resource_id,
          detection_method, threat_level, action_taken,
          status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        eventId,
        eventData.event_type,
        eventData.severity || 'medium',
        eventData.description,
        eventData.user_id || null,
        eventData.ip_address || null,
        eventData.resource_type || null,
        eventData.resource_id || null,
        eventData.detection_method || 'manual',
        eventData.threat_level || 0,
        eventData.action_taken || null,
        eventData.status || 'open',
        JSON.stringify(eventData.metadata || {})
      ];
      
      const result = await this.pool.query(query, values);
      
      console.log(`🚨 보안 이벤트 생성: ${eventData.event_type} (${eventData.severity})`);
      
      return {
        success: true,
        event_id: eventId,
        data: result.rows[0]
      };
      
    } catch (error) {
      console.error('❌ 보안 이벤트 생성 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 감사 로그 검색
   */
  async searchLogs(filters = {}) {
    try {
      const query = `
        SELECT * FROM search_audit_logs(
          $1, $2, $3, $4, $5, $6
        )
      `;
      
      const values = [
        filters.user_id || null,
        filters.action || null,
        filters.resource_type || null,
        filters.from_date || null,
        filters.to_date || null,
        filters.limit || 100
      ];
      
      const result = await this.pool.query(query, values);
      
      return {
        success: true,
        data: result.rows,
        count: result.rows.length
      };
      
    } catch (error) {
      console.error('❌ 감사 로그 검색 실패:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 사용자 활동 통계
   */
  async getUserActivityStats(userId, days = 30) {
    try {
      const query = `
        SELECT 
          COUNT(*) AS total_actions,
          COUNT(*) FILTER (WHERE success = TRUE) AS successful_actions,
          COUNT(*) FILTER (WHERE success = FALSE) AS failed_actions,
          COUNT(DISTINCT action) AS unique_actions,
          COUNT(DISTINCT DATE(created_at)) AS active_days,
          MAX(created_at) AS last_action_at,
          ARRAY_AGG(DISTINCT action) AS actions_performed
        FROM audit_logs
        WHERE user_id = $1
          AND created_at >= NOW() - ($2 || ' days')::INTERVAL
      `;
      
      const result = await this.pool.query(query, [userId, days]);
      
      return {
        success: true,
        data: result.rows[0] || {}
      };
      
    } catch (error) {
      console.error('❌ 사용자 활동 통계 조회 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 의심스러운 활동 탐지
   */
  async detectSuspiciousActivity(userId, timeWindowMinutes = 5, threshold = 50) {
    try {
      const query = `
        SELECT * FROM detect_suspicious_activity($1, $2, $3)
      `;
      
      const result = await this.pool.query(query, [
        userId,
        timeWindowMinutes,
        threshold
      ]);
      
      const detection = result.rows[0];
      
      // 의심스러운 활동 감지 시 보안 이벤트 생성
      if (detection && detection.is_suspicious) {
        await this.createSecurityEvent({
          event_type: 'suspicious_activity',
          severity: 'high',
          description: `의심스러운 활동 탐지: ${detection.action_count}회 액션, ${detection.unique_ips}개 IP, ${detection.failed_attempts}회 실패`,
          user_id: userId,
          detection_method: 'automatic',
          threat_level: detection.risk_score,
          metadata: detection
        });
      }
      
      return {
        success: true,
        data: detection
      };
      
    } catch (error) {
      console.error('❌ 의심스러운 활동 탐지 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 보안 이벤트 목록 조회
   */
  async getSecurityEvents(filters = {}) {
    try {
      let query = `
        SELECT * FROM security_events
        WHERE 1=1
      `;
      
      const values = [];
      let paramIndex = 1;
      
      if (filters.event_type) {
        query += ` AND event_type = $${paramIndex++}`;
        values.push(filters.event_type);
      }
      
      if (filters.severity) {
        query += ` AND severity = $${paramIndex++}`;
        values.push(filters.severity);
      }
      
      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filters.status);
      }
      
      if (filters.user_id) {
        query += ` AND user_id = $${paramIndex++}`;
        values.push(filters.user_id);
      }
      
      query += ` ORDER BY created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(filters.limit);
      }
      
      const result = await this.pool.query(query, values);
      
      return {
        success: true,
        data: result.rows,
        count: result.rows.length
      };
      
    } catch (error) {
      console.error('❌ 보안 이벤트 조회 실패:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 오래된 로그 정리
   */
  async cleanupOldLogs(retentionDays = 90) {
    try {
      const query = `SELECT * FROM cleanup_old_audit_logs($1)`;
      const result = await this.pool.query(query, [retentionDays]);
      
      const deletedCount = result.rows[0]?.deleted_count || 0;
      
      console.log(`🧹 오래된 감사 로그 정리 완료: ${deletedCount}개 삭제`);
      
      return {
        success: true,
        deleted_count: deletedCount
      };
      
    } catch (error) {
      console.error('❌ 로그 정리 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 대시보드 통계
   */
  async getDashboardStats(days = 7) {
    try {
      const query = `
        SELECT 
          COUNT(*) AS total_logs,
          COUNT(DISTINCT user_id) AS unique_users,
          COUNT(*) FILTER (WHERE success = FALSE) AS failed_actions,
          COUNT(*) FILTER (WHERE severity IN ('error', 'critical')) AS critical_events,
          COUNT(*) FILTER (WHERE action_type = 'login') AS login_attempts,
          COUNT(*) FILTER (WHERE action_type = 'login' AND success = TRUE) AS successful_logins
        FROM audit_logs
        WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      `;
      
      const result = await this.pool.query(query, [days]);
      
      // 보안 이벤트 통계
      const securityQuery = `
        SELECT 
          COUNT(*) AS total_events,
          COUNT(*) FILTER (WHERE status = 'open') AS open_events,
          COUNT(*) FILTER (WHERE severity = 'critical') AS critical_events
        FROM security_events
        WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      `;
      
      const securityResult = await this.pool.query(securityQuery, [days]);
      
      return {
        success: true,
        data: {
          ...result.rows[0],
          security: securityResult.rows[0]
        }
      };
      
    } catch (error) {
      console.error('❌ 대시보드 통계 조회 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton 인스턴스
let auditLogServiceInstance = null;

function getAuditLogService() {
  if (!auditLogServiceInstance) {
    auditLogServiceInstance = new AuditLogService();
  }
  return auditLogServiceInstance;
}

module.exports = {
  AuditLogService,
  getAuditLogService
};

