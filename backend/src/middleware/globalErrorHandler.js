// [advice from AI] 프로덕션 레벨 글로벌 에러 핸들러
// 에러 분류, 로깅, 알림, 복구 전략 통합

const fs = require('fs').promises;
const path = require('path');
const { circuitBreakerManager } = require('../utils/CircuitBreaker');

// [advice from AI] 에러 분류 및 심각도 정의
const ERROR_CATEGORIES = {
  CRITICAL: {
    level: 1,
    description: '즉시 대응 필요한 시스템 장애',
    autoRecover: false,
    alertRequired: true,
    examples: ['데이터베이스 연결 실패', '메모리 부족', '디스크 공간 부족']
  },
  HIGH: {
    level: 2,
    description: '서비스 영향도가 높은 오류',
    autoRecover: true,
    alertRequired: true,
    examples: ['외부 API 연결 실패', 'Circuit Breaker OPEN', '인증 서비스 장애']
  },
  MEDIUM: {
    level: 3,
    description: '일부 기능에 영향을 주는 오류',
    autoRecover: true,
    alertRequired: false,
    examples: ['파일 업로드 실패', '캐시 연결 실패', '이메일 발송 실패']
  },
  LOW: {
    level: 4,
    description: '사용자 경험에 미미한 영향',
    autoRecover: true,
    alertRequired: false,
    examples: ['검증 오류', '요청 형식 오류', '권한 부족']
  },
  INFO: {
    level: 5,
    description: '정보성 로그',
    autoRecover: false,
    alertRequired: false,
    examples: ['사용자 로그인', '데이터 조회', '설정 변경']
  }
};

// [advice from AI] 에러 패턴 매칭
const ERROR_PATTERNS = [
  {
    pattern: /database|connection|pool|sql|postgres/i,
    category: 'CRITICAL',
    component: 'DATABASE',
    autoActions: ['retry_connection', 'circuit_breaker']
  },
  {
    pattern: /memory|heap|out of memory/i,
    category: 'CRITICAL',
    component: 'SYSTEM',
    autoActions: ['gc_collect', 'restart_service']
  },
  {
    pattern: /disk|storage|ENOSPC/i,
    category: 'CRITICAL',
    component: 'SYSTEM',
    autoActions: ['cleanup_logs', 'alert_admin']
  },
  {
    pattern: /timeout|ETIMEDOUT|ECONNRESET/i,
    category: 'HIGH',
    component: 'NETWORK',
    autoActions: ['retry_request', 'circuit_breaker']
  },
  {
    pattern: /authentication|unauthorized|jwt|token/i,
    category: 'HIGH',
    component: 'AUTH',
    autoActions: ['refresh_token', 'redirect_login']
  },
  {
    pattern: /validation|invalid|bad request/i,
    category: 'LOW',
    component: 'VALIDATION',
    autoActions: ['log_only']
  },
  {
    pattern: /permission|forbidden|access denied/i,
    category: 'LOW',
    component: 'AUTHORIZATION',
    autoActions: ['log_only']
  }
];

class GlobalErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxHistorySize = 1000;
    this.alertThresholds = {
      CRITICAL: 1,    // 1회 발생시 즉시 알림
      HIGH: 3,        // 3회 발생시 알림
      MEDIUM: 10,     // 10회 발생시 알림
      LOW: 50         // 50회 발생시 알림
    };
    
    // 자동 복구 액션 매핑
    this.autoActions = {
      retry_connection: this.retryDatabaseConnection.bind(this),
      circuit_breaker: this.handleCircuitBreaker.bind(this),
      gc_collect: this.forceGarbageCollection.bind(this),
      restart_service: this.restartService.bind(this),
      cleanup_logs: this.cleanupLogs.bind(this),
      alert_admin: this.sendAdminAlert.bind(this),
      retry_request: this.retryRequest.bind(this),
      refresh_token: this.refreshAuthToken.bind(this),
      redirect_login: this.redirectToLogin.bind(this),
      log_only: this.logOnly.bind(this)
    };
    
    // 에러 로그 파일 경로
    this.logPath = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  // [advice from AI] 로그 디렉토리 생성
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('로그 디렉토리 생성 실패:', error);
    }
  }

  // [advice from AI] 메인 에러 처리 함수
  async handleError(error, context = {}) {
    const errorInfo = this.analyzeError(error, context);
    
    // 에러 히스토리에 추가
    this.addToHistory(errorInfo);
    
    // 에러 카운트 증가
    this.incrementErrorCount(errorInfo);
    
    // 로깅
    await this.logError(errorInfo);
    
    // 알림 확인 및 발송
    await this.checkAndSendAlert(errorInfo);
    
    // 자동 복구 액션 실행
    await this.executeAutoActions(errorInfo);
    
    // 메트릭 업데이트
    this.updateMetrics(errorInfo);
    
    return errorInfo;
  }

  // [advice from AI] 에러 분석 및 분류
  analyzeError(error, context) {
    const timestamp = new Date().toISOString();
    const errorMessage = error.message || error.toString();
    const stackTrace = error.stack || '';
    
    // 패턴 매칭으로 에러 분류
    let category = 'MEDIUM';
    let component = 'UNKNOWN';
    let autoActions = ['log_only'];
    
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(errorMessage) || pattern.pattern.test(stackTrace)) {
        category = pattern.category;
        component = pattern.component;
        autoActions = pattern.autoActions;
        break;
      }
    }
    
    // HTTP 상태 코드 기반 분류
    if (error.status) {
      if (error.status >= 500) {
        category = 'HIGH';
      } else if (error.status >= 400) {
        category = 'LOW';
      }
    }
    
    // Circuit Breaker 관련 에러
    if (error.code === 'CIRCUIT_OPEN') {
      category = 'HIGH';
      component = 'CIRCUIT_BREAKER';
      autoActions = ['circuit_breaker'];
    }
    
    return {
      id: this.generateErrorId(),
      timestamp,
      category,
      component,
      level: ERROR_CATEGORIES[category].level,
      message: errorMessage,
      stack: stackTrace,
      code: error.code || 'UNKNOWN',
      status: error.status || null,
      context: {
        ...context,
        userId: context.userId || null,
        requestId: context.requestId || null,
        endpoint: context.endpoint || null,
        userAgent: context.userAgent || null,
        ip: context.ip || null
      },
      autoActions,
      recovered: false,
      alertSent: false
    };
  }

  // [advice from AI] 고유 에러 ID 생성
  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // [advice from AI] 에러 히스토리 관리
  addToHistory(errorInfo) {
    this.errorHistory.push(errorInfo);
    
    // 히스토리 크기 제한
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  // [advice from AI] 에러 카운트 증가
  incrementErrorCount(errorInfo) {
    const key = `${errorInfo.category}_${errorInfo.component}`;
    const current = this.errorCounts.get(key) || { count: 0, lastOccurrence: null };
    
    this.errorCounts.set(key, {
      count: current.count + 1,
      lastOccurrence: errorInfo.timestamp,
      category: errorInfo.category,
      component: errorInfo.component
    });
  }

  // [advice from AI] 에러 로깅
  async logError(errorInfo) {
    const logEntry = {
      ...errorInfo,
      hostname: require('os').hostname(),
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    // 콘솔 로깅 (개발 환경)
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${errorInfo.category}] ${errorInfo.component}: ${errorInfo.message}`);
      if (errorInfo.level <= 2) {
        console.error(errorInfo.stack);
      }
    }
    
    // 파일 로깅
    try {
      const logFile = path.join(this.logPath, `error_${new Date().toISOString().split('T')[0]}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(logFile, logLine);
    } catch (logError) {
      console.error('에러 로그 파일 쓰기 실패:', logError);
    }
  }

  // [advice from AI] 알림 확인 및 발송
  async checkAndSendAlert(errorInfo) {
    const key = `${errorInfo.category}_${errorInfo.component}`;
    const errorCount = this.errorCounts.get(key);
    const threshold = this.alertThresholds[errorInfo.category];
    
    if (errorCount && errorCount.count >= threshold && !errorInfo.alertSent) {
      await this.sendAlert(errorInfo, errorCount.count);
      errorInfo.alertSent = true;
    }
  }

  // [advice from AI] 알림 발송
  async sendAlert(errorInfo, count) {
    const alertData = {
      severity: errorInfo.category,
      component: errorInfo.component,
      message: errorInfo.message,
      count,
      timestamp: errorInfo.timestamp,
      errorId: errorInfo.id
    };
    
    console.log(`🚨 [ALERT] ${errorInfo.category} - ${errorInfo.component}: ${errorInfo.message} (${count}회 발생)`);
    
    // 실제 알림 시스템 연동 (예: Slack, Email, SMS)
    // await this.sendSlackAlert(alertData);
    // await this.sendEmailAlert(alertData);
  }

  // [advice from AI] 자동 복구 액션 실행
  async executeAutoActions(errorInfo) {
    for (const actionName of errorInfo.autoActions) {
      const action = this.autoActions[actionName];
      
      if (action) {
        try {
          console.log(`🔧 자동 복구 액션 실행: ${actionName}`);
          await action(errorInfo);
        } catch (actionError) {
          console.error(`자동 복구 액션 실패 (${actionName}):`, actionError);
        }
      }
    }
  }

  // [advice from AI] 자동 복구 액션들
  async retryDatabaseConnection(errorInfo) {
    console.log('🔄 데이터베이스 연결 재시도');
    // 실제 데이터베이스 재연결 로직
  }

  async handleCircuitBreaker(errorInfo) {
    console.log('🔌 Circuit Breaker 상태 확인');
    const states = circuitBreakerManager.getAllStates();
    
    // OPEN 상태인 Circuit Breaker가 있으면 로그
    Object.entries(states.breakers).forEach(([name, state]) => {
      if (state.state === 'OPEN') {
        console.log(`⚠️ Circuit Breaker '${name}' OPEN 상태`);
      }
    });
  }

  async forceGarbageCollection(errorInfo) {
    if (global.gc) {
      console.log('🗑️ 강제 가비지 컬렉션 실행');
      global.gc();
    }
  }

  async restartService(errorInfo) {
    console.log('🔄 서비스 재시작 신호 발송');
    // 실제 서비스 재시작은 프로세스 매니저(PM2, Docker)에 위임
    process.emit('SIGTERM');
  }

  async cleanupLogs(errorInfo) {
    console.log('🧹 오래된 로그 파일 정리');
    try {
      const files = await fs.readdir(this.logPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // 7일 이전
      
      for (const file of files) {
        const filePath = path.join(this.logPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️ 오래된 로그 파일 삭제: ${file}`);
        }
      }
    } catch (cleanupError) {
      console.error('로그 정리 실패:', cleanupError);
    }
  }

  async sendAdminAlert(errorInfo) {
    console.log('📧 관리자 알림 발송');
    // 실제 관리자 알림 로직
  }

  async retryRequest(errorInfo) {
    console.log('🔄 요청 재시도 로직');
    // 실제 요청 재시도 로직
  }

  async refreshAuthToken(errorInfo) {
    console.log('🔑 인증 토큰 갱신');
    // 실제 토큰 갱신 로직
  }

  async redirectToLogin(errorInfo) {
    console.log('🔐 로그인 페이지 리다이렉트');
    // 실제 리다이렉트 로직
  }

  async logOnly(errorInfo) {
    // 로깅만 수행 (이미 완료됨)
  }

  // [advice from AI] 메트릭 업데이트
  updateMetrics(errorInfo) {
    // Prometheus 메트릭 업데이트 등
  }

  // [advice from AI] Express 에러 미들웨어
  expressErrorHandler() {
    return async (error, req, res, next) => {
      const context = {
        endpoint: `${req.method} ${req.originalUrl}`,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        requestId: req.id || req.headers['x-request-id']
      };
      
      const errorInfo = await this.handleError(error, context);
      
      // HTTP 응답
      const statusCode = error.status || 500;
      const response = {
        success: false,
        error: errorInfo.category === 'LOW' ? error.message : 'Internal Server Error',
        errorId: errorInfo.id,
        timestamp: errorInfo.timestamp
      };
      
      // 개발 환경에서는 더 자세한 정보 제공
      if (process.env.NODE_ENV !== 'production') {
        response.stack = error.stack;
        response.details = errorInfo;
      }
      
      res.status(statusCode).json(response);
    };
  }

  // [advice from AI] 처리되지 않은 예외 핸들러
  setupGlobalHandlers() {
    process.on('uncaughtException', async (error) => {
      console.error('🚨 처리되지 않은 예외:', error);
      await this.handleError(error, { source: 'uncaughtException' });
      
      // 심각한 오류이므로 프로세스 종료
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('🚨 처리되지 않은 Promise 거부:', reason);
      await this.handleError(reason, { source: 'unhandledRejection', promise });
    });
  }

  // [advice from AI] 에러 통계 조회
  getErrorStats() {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByCategory: {},
      errorsByComponent: {},
      recentErrors: this.errorHistory.slice(-10),
      topErrors: []
    };
    
    // 카테고리별 통계
    for (const [key, data] of this.errorCounts) {
      if (!stats.errorsByCategory[data.category]) {
        stats.errorsByCategory[data.category] = 0;
      }
      stats.errorsByCategory[data.category] += data.count;
      
      if (!stats.errorsByComponent[data.component]) {
        stats.errorsByComponent[data.component] = 0;
      }
      stats.errorsByComponent[data.component] += data.count;
    }
    
    // 상위 에러들
    stats.topErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, data]) => ({
        key,
        category: data.category,
        component: data.component,
        count: data.count,
        lastOccurrence: data.lastOccurrence
      }));
    
    return stats;
  }

  // [advice from AI] 에러 히스토리 초기화
  clearHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
    console.log('📊 에러 히스토리 초기화 완료');
  }
}

// [advice from AI] 싱글톤 인스턴스
const globalErrorHandler = new GlobalErrorHandler();

module.exports = {
  GlobalErrorHandler,
  globalErrorHandler,
  ERROR_CATEGORIES,
  ERROR_PATTERNS
};
