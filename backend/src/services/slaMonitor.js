// [advice from AI] SLA 모니터링 서비스
// Uptime, Response Time, Availability 추적

const axios = require('axios');
const { Pool } = require('pg');

class SLAMonitor {
  constructor() {
    this.monitoringTargets = [];
    this.monitoringInterval = null;
    this.checkInterval = parseInt(process.env.SLA_CHECK_INTERVAL) || 60000; // 1분
    
    // [advice from AI] Operations DB 연결
    this.pool = new Pool({
      host: process.env.OPERATIONS_DB_HOST || 'postgres',
      port: process.env.OPERATIONS_DB_PORT || 5432,
      database: process.env.OPERATIONS_DB_NAME || 'timbel_operations',
      user: process.env.OPERATIONS_DB_USER || 'timbel_user',
      password: process.env.OPERATIONS_DB_PASSWORD || 'timbel_password',
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * 모니터링 시작
   */
  async start() {
    try {
      console.log('🎯 SLA 모니터링 서비스 시작...');
      
      // 데이터베이스 테이블 초기화
      await this.initializeDatabase();
      
      // 모니터링 대상 로드
      await this.loadMonitoringTargets();
      
      // 주기적 체크 시작
      this.monitoringInterval = setInterval(() => {
        this.checkAllTargets();
      }, this.checkInterval);
      
      // 즉시 첫 체크 실행
      await this.checkAllTargets();
      
      console.log(`✅ SLA 모니터링 활성화 (체크 주기: ${this.checkInterval / 1000}초)`);
    } catch (error) {
      console.error('❌ SLA 모니터링 시작 실패:', error);
    }
  }

  /**
   * 모니터링 중지
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('✅ SLA 모니터링 중지');
    }
  }

  /**
   * 데이터베이스 초기화
   */
  async initializeDatabase() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sla_monitoring_targets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'http',
        method VARCHAR(10) DEFAULT 'GET',
        expected_status INTEGER DEFAULT 200,
        timeout INTEGER DEFAULT 5000,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sla_check_results (
        id SERIAL PRIMARY KEY,
        target_id INTEGER REFERENCES sla_monitoring_targets(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        response_time INTEGER,
        status_code INTEGER,
        error_message TEXT,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sla_results_target ON sla_check_results(target_id);
      CREATE INDEX IF NOT EXISTS idx_sla_results_checked_at ON sla_check_results(checked_at);
    `;

    await this.pool.query(createTableQuery);
  }

  /**
   * 모니터링 대상 로드
   */
  async loadMonitoringTargets() {
    try {
      const result = await this.pool.query(
        'SELECT * FROM sla_monitoring_targets WHERE enabled = TRUE'
      );
      this.monitoringTargets = result.rows;
      console.log(`📋 모니터링 대상 로드: ${this.monitoringTargets.length}개`);
    } catch (error) {
      console.error('❌ 모니터링 대상 로드 실패:', error);
      this.monitoringTargets = [];
    }
  }

  /**
   * 모든 대상 체크
   */
  async checkAllTargets() {
    if (this.monitoringTargets.length === 0) {
      await this.loadMonitoringTargets();
    }

    const checks = this.monitoringTargets.map(target => 
      this.checkTarget(target).catch(err => {
        console.error(`❌ ${target.name} 체크 실패:`, err.message);
      })
    );

    await Promise.allSettled(checks);
  }

  /**
   * 단일 대상 체크
   */
  async checkTarget(target) {
    const startTime = Date.now();
    let status = 'down';
    let responseTime = null;
    let statusCode = null;
    let errorMessage = null;

    try {
      const response = await axios({
        method: target.method || 'GET',
        url: target.url,
        timeout: target.timeout || 5000,
        validateStatus: () => true // 모든 상태 코드 허용
      });

      responseTime = Date.now() - startTime;
      statusCode = response.status;

      if (response.status === (target.expected_status || 200)) {
        status = 'up';
      } else {
        status = 'degraded';
        errorMessage = `Unexpected status: ${response.status}`;
      }
    } catch (error) {
      responseTime = Date.now() - startTime;
      status = 'down';
      errorMessage = error.message;
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
      }
    }

    // 결과 저장
    await this.saveCheckResult({
      target_id: target.id,
      status,
      response_time: responseTime,
      status_code: statusCode,
      error_message: errorMessage
    });

    return {
      target: target.name,
      status,
      responseTime,
      statusCode,
      errorMessage
    };
  }

  /**
   * 체크 결과 저장
   */
  async saveCheckResult(result) {
    try {
      await this.pool.query(
        `INSERT INTO sla_check_results (target_id, status, response_time, status_code, error_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [result.target_id, result.status, result.response_time, result.status_code, result.error_message]
      );
    } catch (error) {
      console.error('❌ 체크 결과 저장 실패:', error);
    }
  }

  /**
   * 모니터링 대상 추가
   */
  async addTarget(target) {
    try {
      const result = await this.pool.query(
        `INSERT INTO sla_monitoring_targets (name, url, type, method, expected_status, timeout, enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          target.name,
          target.url,
          target.type || 'http',
          target.method || 'GET',
          target.expected_status || 200,
          target.timeout || 5000,
          target.enabled !== false
        ]
      );

      await this.loadMonitoringTargets();
      return result.rows[0];
    } catch (error) {
      console.error('❌ 모니터링 대상 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 모니터링 대상 삭제
   */
  async removeTarget(id) {
    try {
      await this.pool.query('DELETE FROM sla_monitoring_targets WHERE id = $1', [id]);
      await this.loadMonitoringTargets();
    } catch (error) {
      console.error('❌ 모니터링 대상 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * SLA 통계 조회
   */
  async getSLAStatistics(targetId, period = '24h') {
    try {
      let timeCondition = '';
      if (period === '1h') {
        timeCondition = "checked_at >= NOW() - INTERVAL '1 hour'";
      } else if (period === '24h') {
        timeCondition = "checked_at >= NOW() - INTERVAL '24 hours'";
      } else if (period === '7d') {
        timeCondition = "checked_at >= NOW() - INTERVAL '7 days'";
      } else {
        timeCondition = "checked_at >= NOW() - INTERVAL '30 days'";
      }

      const query = `
        SELECT 
          COUNT(*) as total_checks,
          COUNT(*) FILTER (WHERE status = 'up') as up_checks,
          COUNT(*) FILTER (WHERE status = 'down') as down_checks,
          COUNT(*) FILTER (WHERE status = 'degraded') as degraded_checks,
          AVG(response_time) as avg_response_time,
          MIN(response_time) as min_response_time,
          MAX(response_time) as max_response_time,
          ROUND((COUNT(*) FILTER (WHERE status = 'up')::NUMERIC / COUNT(*)::NUMERIC * 100), 2) as uptime_percentage
        FROM sla_check_results
        WHERE target_id = $1 AND ${timeCondition}
      `;

      const result = await this.pool.query(query, [targetId]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ SLA 통계 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 최근 체크 결과 조회
   */
  async getRecentResults(targetId, limit = 100) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM sla_check_results 
         WHERE target_id = $1 
         ORDER BY checked_at DESC 
         LIMIT $2`,
        [targetId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ 최근 결과 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 대상의 현재 상태 조회
   */
  async getAllTargetsStatus() {
    try {
      const query = `
        SELECT 
          t.id,
          t.name,
          t.url,
          t.type,
          t.enabled,
          r.status as current_status,
          r.response_time as last_response_time,
          r.checked_at as last_checked_at,
          (
            SELECT ROUND((COUNT(*) FILTER (WHERE status = 'up')::NUMERIC / COUNT(*)::NUMERIC * 100), 2)
            FROM sla_check_results
            WHERE target_id = t.id AND checked_at >= NOW() - INTERVAL '24 hours'
          ) as uptime_24h
        FROM sla_monitoring_targets t
        LEFT JOIN LATERAL (
          SELECT status, response_time, checked_at
          FROM sla_check_results
          WHERE target_id = t.id
          ORDER BY checked_at DESC
          LIMIT 1
        ) r ON true
        ORDER BY t.name
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ 전체 상태 조회 실패:', error);
      throw error;
    }
  }
}

module.exports = new SLAMonitor();

