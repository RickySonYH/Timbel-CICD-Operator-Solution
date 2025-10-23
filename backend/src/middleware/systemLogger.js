// [advice from AI] 시스템 로그 수집 미들웨어
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class SystemLogger {
  constructor() {
    // PostgreSQL 연결 - system_logs 테이블이 있는 timbel_cicd_operator DB
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: 'timbel_cicd_operator',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });

    console.log('🔧 SystemLogger 초기화됨');
  }

  // [advice from AI] 로그 기록 메서드
  async log(level, service, message, metadata = {}) {
    try {
      const logEntry = {
        level: level.toLowerCase(),
        service,
        component: metadata.component || null,
        message,
        username: metadata.username || metadata.user || null,
        ip_address: metadata.ip_address || metadata.ip || null,
        endpoint: metadata.endpoint || null,
        method: metadata.method || null,
        response_time: metadata.response_time || null,
        status_code: metadata.status_code || null,
        user_agent: metadata.user_agent || null,
        request_id: metadata.request_id || null,
        session_id: metadata.session_id || null,
        metadata: metadata.extra ? JSON.stringify(metadata.extra) : null,
        stack_trace: metadata.stack_trace || null
      };

      const query = `
        INSERT INTO system_logs (
          level, service, component, message, username, ip_address,
          endpoint, method, response_time, status_code, user_agent,
          request_id, session_id, metadata, stack_trace
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
      `;

      await this.pool.query(query, [
        logEntry.level, logEntry.service, logEntry.component, logEntry.message,
        logEntry.username, logEntry.ip_address, logEntry.endpoint, logEntry.method,
        logEntry.response_time, logEntry.status_code, logEntry.user_agent,
        logEntry.request_id, logEntry.session_id, logEntry.metadata, logEntry.stack_trace
      ]);

      // 콘솔에도 출력 (개발 시 편의성)
      console.log(`📝 [${level.toUpperCase()}] ${service}: ${message}`);

    } catch (error) {
      console.error('❌ SystemLogger 오류:', error.message);
      // 로깅 실패해도 애플리케이션은 계속 동작해야 함
    }
  }

  // [advice from AI] 편의 메서드들
  debug(service, message, metadata = {}) {
    return this.log('debug', service, message, metadata);
  }

  info(service, message, metadata = {}) {
    return this.log('info', service, message, metadata);
  }

  warn(service, message, metadata = {}) {
    return this.log('warn', service, message, metadata);
  }

  error(service, message, metadata = {}) {
    return this.log('error', service, message, metadata);
  }

  fatal(service, message, metadata = {}) {
    return this.log('fatal', service, message, metadata);
  }

  // [advice from AI] HTTP 요청 로깅 미들웨어
  httpLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = uuidv4();
      
      // 요청 ID를 req 객체에 저장
      req.requestId = requestId;

      // 응답 완료 시 로그 기록
      res.on('finish', async () => {
        const responseTime = Date.now() - startTime;
        const username = req.user?.username || 'anonymous';
        
        const logLevel = res.statusCode >= 500 ? 'error' 
                      : res.statusCode >= 400 ? 'warn' 
                      : 'info';

        const message = `API 요청: ${req.method} ${req.originalUrl} - ${res.statusCode} (${responseTime}ms) - ${username}`;

        await this.log(logLevel, 'backend', message, {
          component: 'http-api',
          username,
          ip_address: req.ip || req.connection.remoteAddress,
          endpoint: req.originalUrl,
          method: req.method,
          response_time: responseTime,
          status_code: res.statusCode,
          user_agent: req.get('User-Agent'),
          request_id: requestId,
          extra: {
            body_size: req.get('Content-Length'),
            referer: req.get('Referer')
          }
        });
      });

      next();
    };
  }

  // [advice from AI] 에러 로깅 미들웨어
  errorLogger() {
    return (error, req, res, next) => {
      const username = req.user?.username || 'anonymous';
      const message = `API 오류: ${req.method} ${req.originalUrl} - ${error.message}`;

      this.error('backend', message, {
        component: 'error-handler',
        username,
        ip_address: req.ip || req.connection.remoteAddress,
        endpoint: req.originalUrl,
        method: req.method,
        status_code: error.status || 500,
        user_agent: req.get('User-Agent'),
        request_id: req.requestId,
        stack_trace: error.stack,
        extra: {
          error_name: error.name,
          error_code: error.code
        }
      });

      next(error);
    };
  }

  // [advice from AI] 데이터베이스 쿼리 로깅
  async logDatabaseQuery(query, duration, error = null) {
    const level = error ? 'error' : duration > 1000 ? 'warn' : 'debug';
    const message = error 
      ? `Database query failed: ${error.message}`
      : `Database query executed (${duration}ms): ${query.substring(0, 100)}...`;

    await this.log(level, 'postgres', message, {
      component: 'database',
      response_time: duration,
      stack_trace: error?.stack,
      extra: {
        query: query.substring(0, 500),
        error_code: error?.code
      }
    });
  }

  // [advice from AI] 시스템 이벤트 로깅
  async logSystemEvent(event, details = {}) {
    await this.info('system', `System event: ${event}`, {
      component: 'system-events',
      extra: details
    });
  }

  // [advice from AI] 사용자 액션 로깅
  async logUserAction(username, action, details = {}) {
    await this.info('user-activity', `User action: ${action}`, {
      component: 'user-actions',
      username,
      extra: details
    });
  }
}

// 싱글톤 인스턴스 생성
const systemLogger = new SystemLogger();

module.exports = systemLogger;
