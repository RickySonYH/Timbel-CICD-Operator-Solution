// [advice from AI] 프로덕션 레벨 Circuit Breaker 패턴 구현
// 외부 서비스 장애 격리 및 자동 복구

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5; // 실패 임계값
    this.resetTimeout = options.resetTimeout || 60000; // 1분 후 재시도
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10초 모니터링 주기
    this.expectedErrors = options.expectedErrors || []; // 예상 가능한 에러들
    this.fallbackFunction = options.fallback || null; // 폴백 함수
    
    // 상태 관리
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    this.successCount = 0;
    
    // 통계 수집
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitOpenTime: 0,
      lastReset: Date.now()
    };
    
    // 이벤트 리스너
    this.listeners = {};
    
    console.log(`🔌 Circuit Breaker '${this.name}' 초기화됨 - 임계값: ${this.failureThreshold}, 재설정: ${this.resetTimeout}ms`);
  }

  // [advice from AI] 이벤트 리스너 등록
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // [advice from AI] 이벤트 발생
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Circuit Breaker 이벤트 리스너 오류 (${event}):`, error);
        }
      });
    }
  }

  // [advice from AI] 함수 실행 (메인 인터페이스)
  async execute(fn, ...args) {
    this.stats.totalRequests++;
    
    // Circuit이 OPEN 상태인지 확인
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit Breaker OPEN: ${this.name} (다음 시도: ${new Date(this.nextAttempt).toLocaleTimeString()})`);
        error.code = 'CIRCUIT_OPEN';
        
        // 폴백 함수가 있으면 실행
        if (this.fallbackFunction) {
          console.log(`🔄 ${this.name} 폴백 함수 실행`);
          return await this.fallbackFunction(...args);
        }
        
        this.stats.failedRequests++;
        throw error;
      } else {
        // HALF_OPEN 상태로 전환
        this.state = 'HALF_OPEN';
        this.emit('stateChange', { 
          state: this.state, 
          name: this.name, 
          timestamp: Date.now() 
        });
        console.log(`🔄 ${this.name} Circuit Breaker HALF_OPEN 상태로 전환`);
      }
    }

    try {
      // 함수 실행
      const startTime = Date.now();
      const result = await fn(...args);
      const executionTime = Date.now() - startTime;
      
      // 성공 처리
      this.onSuccess(executionTime);
      return result;
      
    } catch (error) {
      // 실패 처리
      this.onFailure(error);
      throw error;
    }
  }

  // [advice from AI] 성공 처리
  onSuccess(executionTime) {
    this.stats.successfulRequests++;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      // HALF_OPEN 상태에서 일정 횟수 성공하면 CLOSED로 복구
      if (this.successCount >= Math.ceil(this.failureThreshold / 2)) {
        this.reset();
        console.log(`✅ ${this.name} Circuit Breaker 복구됨 (${this.successCount}회 연속 성공)`);
      }
    } else if (this.state === 'CLOSED') {
      // CLOSED 상태에서는 실패 카운트 감소
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
    }
    
    this.emit('success', { 
      name: this.name, 
      executionTime, 
      state: this.state,
      timestamp: Date.now()
    });
  }

  // [advice from AI] 실패 처리
  onFailure(error) {
    this.stats.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // 타임아웃 에러 카운트
    if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') {
      this.stats.timeouts++;
    }
    
    // 예상 가능한 에러는 Circuit Breaker 카운트에서 제외
    const isExpectedError = this.expectedErrors.some(expectedError => {
      if (typeof expectedError === 'string') {
        return error.message.includes(expectedError);
      }
      if (expectedError instanceof RegExp) {
        return expectedError.test(error.message);
      }
      return error.code === expectedError || error.name === expectedError;
    });
    
    if (isExpectedError) {
      console.log(`⚠️ ${this.name} 예상 가능한 에러 (Circuit Breaker 카운트 제외): ${error.message}`);
      return;
    }
    
    // HALF_OPEN 상태에서 실패하면 즉시 OPEN
    if (this.state === 'HALF_OPEN') {
      this.trip();
      console.log(`❌ ${this.name} HALF_OPEN 상태에서 실패 - 즉시 OPEN`);
    }
    // CLOSED 상태에서 임계값 도달하면 OPEN
    else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.trip();
      console.log(`❌ ${this.name} 실패 임계값 도달 (${this.failureCount}/${this.failureThreshold}) - OPEN`);
    }
    
    this.emit('failure', { 
      name: this.name, 
      error: error.message, 
      failureCount: this.failureCount,
      state: this.state,
      timestamp: Date.now()
    });
  }

  // [advice from AI] Circuit Breaker OPEN 상태로 전환
  trip() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.successCount = 0;
    this.stats.circuitOpenTime = Date.now();
    
    this.emit('stateChange', { 
      state: this.state, 
      name: this.name, 
      nextAttempt: this.nextAttempt,
      timestamp: Date.now() 
    });
  }

  // [advice from AI] Circuit Breaker 리셋 (CLOSED 상태로 복구)
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.stats.lastReset = Date.now();
    
    this.emit('stateChange', { 
      state: this.state, 
      name: this.name, 
      timestamp: Date.now() 
    });
  }

  // [advice from AI] 강제 리셋 (관리자 기능)
  forceReset() {
    console.log(`🔧 ${this.name} Circuit Breaker 강제 리셋`);
    this.reset();
    this.emit('forceReset', { name: this.name, timestamp: Date.now() });
  }

  // [advice from AI] 현재 상태 조회
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      successCount: this.successCount,
      stats: { ...this.stats },
      healthStatus: this.getHealthStatus()
    };
  }

  // [advice from AI] 건강 상태 평가
  getHealthStatus() {
    if (this.state === 'OPEN') {
      return 'UNHEALTHY';
    }
    
    const recentFailureRate = this.stats.totalRequests > 0 ? 
      (this.stats.failedRequests / this.stats.totalRequests) * 100 : 0;
    
    if (recentFailureRate > 50) {
      return 'DEGRADED';
    } else if (recentFailureRate > 20) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  // [advice from AI] 통계 초기화
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitOpenTime: 0,
      lastReset: Date.now()
    };
    
    this.emit('statsReset', { name: this.name, timestamp: Date.now() });
    console.log(`📊 ${this.name} Circuit Breaker 통계 초기화`);
  }
}

// [advice from AI] Circuit Breaker 관리자 클래스
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.globalStats = {
      totalBreakers: 0,
      openBreakers: 0,
      halfOpenBreakers: 0,
      closedBreakers: 0,
      totalRequests: 0,
      totalFailures: 0
    };
    
    // 주기적 상태 업데이트
    setInterval(() => {
      this.updateGlobalStats();
    }, 5000);
  }

  // [advice from AI] Circuit Breaker 생성/등록
  create(name, options = {}) {
    if (this.breakers.has(name)) {
      console.log(`⚠️ Circuit Breaker '${name}'이 이미 존재합니다`);
      return this.breakers.get(name);
    }
    
    const breaker = new CircuitBreaker({ ...options, name });
    
    // 이벤트 리스너 등록
    breaker.on('stateChange', (data) => {
      console.log(`🔄 Circuit Breaker '${data.name}' 상태 변경: ${data.state}`);
      this.updateGlobalStats();
    });
    
    breaker.on('failure', (data) => {
      console.log(`❌ Circuit Breaker '${data.name}' 실패: ${data.error} (${data.failureCount}회)`);
    });
    
    this.breakers.set(name, breaker);
    this.globalStats.totalBreakers++;
    
    console.log(`✅ Circuit Breaker '${name}' 생성됨`);
    return breaker;
  }

  // [advice from AI] Circuit Breaker 조회
  get(name) {
    return this.breakers.get(name);
  }

  // [advice from AI] 모든 Circuit Breaker 상태 조회
  getAllStates() {
    const states = {};
    for (const [name, breaker] of this.breakers) {
      states[name] = breaker.getState();
    }
    return {
      breakers: states,
      globalStats: this.globalStats,
      timestamp: Date.now()
    };
  }

  // [advice from AI] 글로벌 통계 업데이트
  updateGlobalStats() {
    this.globalStats = {
      totalBreakers: this.breakers.size,
      openBreakers: 0,
      halfOpenBreakers: 0,
      closedBreakers: 0,
      totalRequests: 0,
      totalFailures: 0
    };
    
    for (const [name, breaker] of this.breakers) {
      const state = breaker.getState();
      
      switch (state.state) {
        case 'OPEN':
          this.globalStats.openBreakers++;
          break;
        case 'HALF_OPEN':
          this.globalStats.halfOpenBreakers++;
          break;
        case 'CLOSED':
          this.globalStats.closedBreakers++;
          break;
      }
      
      this.globalStats.totalRequests += state.stats.totalRequests;
      this.globalStats.totalFailures += state.stats.failedRequests;
    }
  }

  // [advice from AI] 모든 Circuit Breaker 강제 리셋
  resetAll() {
    console.log('🔧 모든 Circuit Breaker 강제 리셋');
    for (const [name, breaker] of this.breakers) {
      breaker.forceReset();
    }
  }

  // [advice from AI] 특정 Circuit Breaker 제거
  remove(name) {
    if (this.breakers.has(name)) {
      this.breakers.delete(name);
      this.globalStats.totalBreakers--;
      console.log(`🗑️ Circuit Breaker '${name}' 제거됨`);
      return true;
    }
    return false;
  }
}

// [advice from AI] 싱글톤 인스턴스 생성
const circuitBreakerManager = new CircuitBreakerManager();

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager
};
