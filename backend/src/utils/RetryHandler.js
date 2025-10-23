// [advice from AI] 프로덕션 레벨 Retry 및 Fallback 로직
// 지수 백오프, 지터, 조건부 재시도 지원

class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1초
    this.maxDelay = options.maxDelay || 30000; // 30초
    this.exponentialBase = options.exponentialBase || 2;
    this.jitter = options.jitter !== false; // 기본적으로 지터 활성화
    this.retryCondition = options.retryCondition || this.defaultRetryCondition;
    this.onRetry = options.onRetry || null;
    this.onFailure = options.onFailure || null;
    this.name = options.name || 'RetryHandler';
    
    // 통계
    this.stats = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      retriesPerformed: 0,
      averageRetries: 0
    };
  }

  // [advice from AI] 기본 재시도 조건
  defaultRetryCondition(error, attempt) {
    // 네트워크 오류, 타임아웃, 서버 오류 (5xx)는 재시도
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ENOTFOUND',
      'ETIMEDOUT',
      'TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR'
    ];
    
    // HTTP 상태 코드 기반 재시도
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // 429 Too Many Requests도 재시도
    if (error.status === 429) {
      return true;
    }
    
    // 에러 코드 기반 재시도
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }
    
    // 에러 메시지 기반 재시도
    if (error.message) {
      const retryableMessages = [
        'timeout',
        'connection reset',
        'connection refused',
        'network error',
        'temporary failure'
      ];
      
      const message = error.message.toLowerCase();
      return retryableMessages.some(msg => message.includes(msg));
    }
    
    return false;
  }

  // [advice from AI] 지연 시간 계산 (지수 백오프 + 지터)
  calculateDelay(attempt) {
    // 지수 백오프: baseDelay * (exponentialBase ^ attempt)
    let delay = this.baseDelay * Math.pow(this.exponentialBase, attempt);
    
    // 최대 지연 시간 제한
    delay = Math.min(delay, this.maxDelay);
    
    // 지터 추가 (랜덤성으로 thundering herd 방지)
    if (this.jitter) {
      const jitterRange = delay * 0.1; // 10% 지터
      const randomJitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += randomJitter;
    }
    
    return Math.max(delay, 0);
  }

  // [advice from AI] 메인 실행 함수
  async execute(fn, ...args) {
    let lastError = null;
    let attempt = 0;
    const startTime = Date.now();
    
    this.stats.totalAttempts++;
    
    while (attempt <= this.maxRetries) {
      try {
        console.log(`🔄 ${this.name} 시도 ${attempt + 1}/${this.maxRetries + 1}`);
        
        const result = await fn(...args);
        
        // 성공
        this.stats.successfulAttempts++;
        if (attempt > 0) {
          this.stats.retriesPerformed += attempt;
          this.stats.averageRetries = this.stats.retriesPerformed / this.stats.successfulAttempts;
        }
        
        const executionTime = Date.now() - startTime;
        console.log(`✅ ${this.name} 성공 (${attempt}회 재시도, ${executionTime}ms)`);
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        // 재시도 조건 확인
        if (attempt > this.maxRetries || !this.retryCondition(error, attempt)) {
          break;
        }
        
        // 재시도 콜백 실행
        if (this.onRetry) {
          try {
            await this.onRetry(error, attempt, this.maxRetries);
          } catch (callbackError) {
            console.error(`재시도 콜백 오류:`, callbackError);
          }
        }
        
        // 지연 후 재시도
        const delay = this.calculateDelay(attempt - 1);
        console.log(`⏳ ${this.name} ${delay}ms 후 재시도 (${attempt}/${this.maxRetries})`);
        
        await this.sleep(delay);
      }
    }
    
    // 모든 재시도 실패
    this.stats.failedAttempts++;
    
    if (this.onFailure) {
      try {
        await this.onFailure(lastError, attempt - 1);
      } catch (callbackError) {
        console.error(`실패 콜백 오류:`, callbackError);
      }
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`❌ ${this.name} 최종 실패 (${attempt - 1}회 재시도, ${executionTime}ms)`);
    
    // 재시도 정보를 포함한 에러 생성
    const retryError = new Error(`${this.name} 실패: ${lastError.message}`);
    retryError.originalError = lastError;
    retryError.attempts = attempt;
    retryError.maxRetries = this.maxRetries;
    retryError.executionTime = executionTime;
    retryError.code = 'RETRY_EXHAUSTED';
    
    throw retryError;
  }

  // [advice from AI] 비동기 sleep 함수
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // [advice from AI] 통계 조회
  getStats() {
    return {
      name: this.name,
      ...this.stats,
      successRate: this.stats.totalAttempts > 0 ? 
        (this.stats.successfulAttempts / this.stats.totalAttempts) * 100 : 0,
      configuration: {
        maxRetries: this.maxRetries,
        baseDelay: this.baseDelay,
        maxDelay: this.maxDelay,
        exponentialBase: this.exponentialBase,
        jitter: this.jitter
      }
    };
  }

  // [advice from AI] 통계 초기화
  resetStats() {
    this.stats = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      retriesPerformed: 0,
      averageRetries: 0
    };
    console.log(`📊 ${this.name} 통계 초기화`);
  }
}

// [advice from AI] 특화된 Retry Handler들
class DatabaseRetryHandler extends RetryHandler {
  constructor(options = {}) {
    super({
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000,
      name: 'DatabaseRetryHandler',
      ...options,
      retryCondition: (error, attempt) => {
        // 데이터베이스 특화 재시도 조건
        const dbRetryableErrors = [
          'ECONNRESET',
          'ECONNREFUSED',
          'connection terminated',
          'connection timeout',
          'server closed the connection',
          'connection lost',
          'database is not available',
          'too many connections'
        ];
        
        if (error.code && dbRetryableErrors.includes(error.code)) {
          return true;
        }
        
        if (error.message) {
          const message = error.message.toLowerCase();
          return dbRetryableErrors.some(msg => message.includes(msg));
        }
        
        return false;
      }
    });
  }
}

class APIRetryHandler extends RetryHandler {
  constructor(options = {}) {
    super({
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      name: 'APIRetryHandler',
      ...options,
      retryCondition: (error, attempt) => {
        // API 특화 재시도 조건
        
        // Rate limiting - 더 긴 지연 후 재시도
        if (error.status === 429) {
          return true;
        }
        
        // 서버 오류
        if (error.status >= 500) {
          return true;
        }
        
        // 네트워크 오류
        const networkErrors = [
          'ECONNRESET',
          'ECONNREFUSED',
          'ENOTFOUND',
          'ETIMEDOUT',
          'NETWORK_ERROR'
        ];
        
        return error.code && networkErrors.includes(error.code);
      }
    });
  }
  
  // Rate limiting을 위한 특별한 지연 계산
  calculateDelay(attempt) {
    const baseDelay = super.calculateDelay(attempt);
    
    // Rate limiting 에러의 경우 더 긴 지연
    if (this.lastError && this.lastError.status === 429) {
      // Retry-After 헤더가 있으면 사용
      if (this.lastError.headers && this.lastError.headers['retry-after']) {
        const retryAfter = parseInt(this.lastError.headers['retry-after']) * 1000;
        return Math.min(retryAfter, this.maxDelay);
      }
      
      // 없으면 지수적으로 증가하는 지연
      return Math.min(baseDelay * 2, this.maxDelay);
    }
    
    return baseDelay;
  }
}

// [advice from AI] Fallback 함수 래퍼
class FallbackHandler {
  constructor(primaryFunction, fallbackFunction, options = {}) {
    this.primaryFunction = primaryFunction;
    this.fallbackFunction = fallbackFunction;
    this.name = options.name || 'FallbackHandler';
    this.timeout = options.timeout || 10000; // 10초
    this.retryHandler = options.retryHandler || new RetryHandler({
      maxRetries: 2,
      name: `${this.name}_Retry`
    });
    
    this.stats = {
      totalCalls: 0,
      primarySuccess: 0,
      fallbackUsed: 0,
      totalFailures: 0
    };
  }

  async execute(...args) {
    this.stats.totalCalls++;
    
    try {
      // 타임아웃과 함께 primary 함수 실행
      const result = await Promise.race([
        this.retryHandler.execute(this.primaryFunction, ...args),
        this.createTimeoutPromise()
      ]);
      
      this.stats.primarySuccess++;
      console.log(`✅ ${this.name} Primary 함수 성공`);
      return result;
      
    } catch (error) {
      console.log(`⚠️ ${this.name} Primary 함수 실패, Fallback 실행: ${error.message}`);
      
      try {
        const fallbackResult = await this.fallbackFunction(...args);
        this.stats.fallbackUsed++;
        console.log(`🔄 ${this.name} Fallback 함수 성공`);
        
        // Fallback 결과에 표시 추가
        if (typeof fallbackResult === 'object' && fallbackResult !== null) {
          fallbackResult._fallbackUsed = true;
          fallbackResult._fallbackReason = error.message;
        }
        
        return fallbackResult;
        
      } catch (fallbackError) {
        this.stats.totalFailures++;
        console.log(`❌ ${this.name} Fallback 함수도 실패: ${fallbackError.message}`);
        
        // 원본 에러와 fallback 에러를 모두 포함
        const combinedError = new Error(`Primary와 Fallback 모두 실패: ${error.message}`);
        combinedError.primaryError = error;
        combinedError.fallbackError = fallbackError;
        combinedError.code = 'FALLBACK_EXHAUSTED';
        
        throw combinedError;
      }
    }
  }

  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(`${this.name} 타임아웃 (${this.timeout}ms)`);
        timeoutError.code = 'TIMEOUT';
        reject(timeoutError);
      }, this.timeout);
    });
  }

  getStats() {
    const total = this.stats.totalCalls;
    return {
      name: this.name,
      ...this.stats,
      primarySuccessRate: total > 0 ? (this.stats.primarySuccess / total) * 100 : 0,
      fallbackUsageRate: total > 0 ? (this.stats.fallbackUsed / total) * 100 : 0,
      totalFailureRate: total > 0 ? (this.stats.totalFailures / total) * 100 : 0
    };
  }
}

module.exports = {
  RetryHandler,
  DatabaseRetryHandler,
  APIRetryHandler,
  FallbackHandler
};
