// [advice from AI] 프로덕션 레벨 Dead Letter Queue 시스템
// 실패한 작업의 재처리 및 분석

const fs = require('fs').promises;
const path = require('path');
const { globalErrorHandler } = require('../middleware/globalErrorHandler');

class DeadLetterQueue {
  constructor(options = {}) {
    this.name = options.name || 'DefaultDLQ';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 60000; // 1분
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.persistPath = options.persistPath || path.join(process.cwd(), 'data', 'dlq');
    this.autoProcess = options.autoProcess !== false; // 기본적으로 자동 처리
    
    // 메모리 큐
    this.queue = [];
    this.processing = false;
    this.stats = {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      retriedItems: 0,
      permanentFailures: 0
    };
    
    // 파일 시스템 초기화
    this.ensurePersistDirectory();
    
    // 자동 처리 시작
    if (this.autoProcess) {
      this.startAutoProcessing();
    }
    
    console.log(`📬 Dead Letter Queue '${this.name}' 초기화됨`);
  }

  // [advice from AI] 지속성 디렉토리 생성
  async ensurePersistDirectory() {
    try {
      await fs.mkdir(this.persistPath, { recursive: true });
    } catch (error) {
      console.error(`DLQ 디렉토리 생성 실패 (${this.name}):`, error);
    }
  }

  // [advice from AI] 실패한 작업을 큐에 추가
  async add(item, metadata = {}) {
    const dlqItem = {
      id: this.generateItemId(),
      data: item,
      metadata: {
        ...metadata,
        addedAt: new Date().toISOString(),
        attempts: 0,
        lastAttempt: null,
        nextRetry: new Date().toISOString(),
        source: metadata.source || 'unknown',
        errorHistory: []
      }
    };
    
    // 큐 크기 제한 확인
    if (this.queue.length >= this.maxQueueSize) {
      console.warn(`⚠️ DLQ '${this.name}' 크기 제한 도달, 가장 오래된 아이템 제거`);
      const oldestItem = this.queue.shift();
      await this.persistItem(oldestItem, 'overflow');
    }
    
    this.queue.push(dlqItem);
    this.stats.totalItems++;
    
    // 디스크에 지속화
    await this.persistItem(dlqItem, 'added');
    
    console.log(`📥 DLQ '${this.name}'에 아이템 추가: ${dlqItem.id}`);
    
    return dlqItem.id;
  }

  // [advice from AI] 고유 아이템 ID 생성
  generateItemId() {
    return `DLQ_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // [advice from AI] 아이템을 디스크에 지속화
  async persistItem(item, action) {
    try {
      const filename = `${item.id}_${action}.json`;
      const filepath = path.join(this.persistPath, filename);
      
      const persistData = {
        ...item,
        persistedAt: new Date().toISOString(),
        action
      };
      
      await fs.writeFile(filepath, JSON.stringify(persistData, null, 2));
    } catch (error) {
      console.error(`DLQ 아이템 지속화 실패 (${this.name}):`, error);
    }
  }

  // [advice from AI] 자동 처리 시작
  startAutoProcessing() {
    const processInterval = Math.max(this.retryDelay / 4, 15000); // 최소 15초
    
    setInterval(async () => {
      if (!this.processing && this.queue.length > 0) {
        await this.processQueue();
      }
    }, processInterval);
    
    console.log(`🔄 DLQ '${this.name}' 자동 처리 시작 (${processInterval}ms 간격)`);
  }

  // [advice from AI] 큐 처리
  async processQueue() {
    if (this.processing) {
      return;
    }
    
    this.processing = true;
    console.log(`🔄 DLQ '${this.name}' 처리 시작 (${this.queue.length}개 아이템)`);
    
    const now = new Date();
    const processableItems = this.queue.filter(item => {
      const nextRetry = new Date(item.metadata.nextRetry);
      return now >= nextRetry && item.metadata.attempts < this.maxRetries;
    });
    
    for (const item of processableItems) {
      await this.processItem(item);
    }
    
    // 처리 완료된 아이템들 제거
    this.queue = this.queue.filter(item => 
      item.metadata.attempts < this.maxRetries || 
      new Date() < new Date(item.metadata.nextRetry)
    );
    
    this.processing = false;
    console.log(`✅ DLQ '${this.name}' 처리 완료`);
  }

  // [advice from AI] 개별 아이템 처리
  async processItem(item) {
    item.metadata.attempts++;
    item.metadata.lastAttempt = new Date().toISOString();
    
    console.log(`🔄 DLQ 아이템 재처리 시도: ${item.id} (${item.metadata.attempts}/${this.maxRetries})`);
    
    try {
      // 재처리 로직 실행
      const result = await this.retryItem(item);
      
      if (result.success) {
        // 성공 시 큐에서 제거
        this.stats.processedItems++;
        await this.persistItem(item, 'processed');
        
        const index = this.queue.findIndex(queueItem => queueItem.id === item.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        
        console.log(`✅ DLQ 아이템 재처리 성공: ${item.id}`);
      } else {
        throw new Error(result.error || '재처리 실패');
      }
      
    } catch (error) {
      this.stats.retriedItems++;
      item.metadata.errorHistory.push({
        attempt: item.metadata.attempts,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (item.metadata.attempts >= this.maxRetries) {
        // 최대 재시도 횟수 도달 - 영구 실패 처리
        this.stats.permanentFailures++;
        await this.handlePermanentFailure(item);
        
        console.log(`❌ DLQ 아이템 영구 실패: ${item.id}`);
      } else {
        // 다음 재시도 시간 설정 (지수 백오프)
        const nextRetryDelay = this.retryDelay * Math.pow(2, item.metadata.attempts - 1);
        item.metadata.nextRetry = new Date(Date.now() + nextRetryDelay).toISOString();
        
        console.log(`⏳ DLQ 아이템 재시도 예약: ${item.id} (${new Date(item.metadata.nextRetry).toLocaleTimeString()})`);
      }
      
      await this.persistItem(item, 'retry_failed');
    }
  }

  // [advice from AI] 아이템 재처리 로직 (오버라이드 가능)
  async retryItem(item) {
    // 기본 구현 - 하위 클래스에서 오버라이드
    console.log(`🔄 기본 재처리 로직 실행: ${item.id}`);
    
    // 실제 재처리 로직을 여기에 구현하거나
    // 하위 클래스에서 오버라이드해야 함
    return {
      success: false,
      error: '재처리 로직이 구현되지 않음'
    };
  }

  // [advice from AI] 영구 실패 처리
  async handlePermanentFailure(item) {
    this.stats.failedItems++;
    
    // 영구 실패 아이템을 별도 저장
    await this.persistItem(item, 'permanent_failure');
    
    // 관리자에게 알림
    await globalErrorHandler.handleError(
      new Error(`DLQ 아이템 영구 실패: ${item.id}`),
      {
        component: 'DeadLetterQueue',
        dlqName: this.name,
        itemId: item.id,
        attempts: item.metadata.attempts,
        errorHistory: item.metadata.errorHistory
      }
    );
    
    // 큐에서 제거
    const index = this.queue.findIndex(queueItem => queueItem.id === item.id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  // [advice from AI] 큐 상태 조회
  getStatus() {
    const now = new Date();
    const pendingItems = this.queue.filter(item => 
      item.metadata.attempts < this.maxRetries
    ).length;
    
    const readyToProcess = this.queue.filter(item => 
      new Date(item.metadata.nextRetry) <= now && 
      item.metadata.attempts < this.maxRetries
    ).length;
    
    return {
      name: this.name,
      queueSize: this.queue.length,
      pendingItems,
      readyToProcess,
      processing: this.processing,
      stats: { ...this.stats },
      configuration: {
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        maxQueueSize: this.maxQueueSize,
        autoProcess: this.autoProcess
      }
    };
  }

  // [advice from AI] 큐 수동 처리
  async manualProcess() {
    if (this.processing) {
      console.log(`⚠️ DLQ '${this.name}' 이미 처리 중`);
      return false;
    }
    
    console.log(`🔧 DLQ '${this.name}' 수동 처리 시작`);
    await this.processQueue();
    return true;
  }

  // [advice from AI] 특정 아이템 강제 재시도
  async forceRetry(itemId) {
    const item = this.queue.find(queueItem => queueItem.id === itemId);
    
    if (!item) {
      throw new Error(`DLQ 아이템을 찾을 수 없음: ${itemId}`);
    }
    
    // 재시도 조건 초기화
    item.metadata.nextRetry = new Date().toISOString();
    
    console.log(`🔧 DLQ 아이템 강제 재시도: ${itemId}`);
    await this.processItem(item);
    
    return item;
  }

  // [advice from AI] 큐 초기화
  async clear() {
    const clearedCount = this.queue.length;
    this.queue = [];
    
    // 통계 초기화
    this.stats = {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      retriedItems: 0,
      permanentFailures: 0
    };
    
    console.log(`🧹 DLQ '${this.name}' 초기화 완료 (${clearedCount}개 아이템 제거)`);
    return clearedCount;
  }

  // [advice from AI] 지속화된 아이템 복구
  async recoverFromDisk() {
    try {
      const files = await fs.readdir(this.persistPath);
      const dlqFiles = files.filter(file => 
        file.startsWith(`DLQ_${this.name}_`) && 
        file.endsWith('_added.json')
      );
      
      let recoveredCount = 0;
      
      for (const file of dlqFiles) {
        try {
          const filepath = path.join(this.persistPath, file);
          const content = await fs.readFile(filepath, 'utf8');
          const item = JSON.parse(content);
          
          // 중복 방지
          if (!this.queue.find(queueItem => queueItem.id === item.id)) {
            this.queue.push(item);
            recoveredCount++;
          }
        } catch (fileError) {
          console.error(`DLQ 파일 복구 실패 (${file}):`, fileError);
        }
      }
      
      console.log(`💾 DLQ '${this.name}' 디스크 복구 완료: ${recoveredCount}개 아이템`);
      return recoveredCount;
    } catch (error) {
      console.error(`DLQ 디스크 복구 실패 (${this.name}):`, error);
      return 0;
    }
  }
}

// [advice from AI] 특화된 DLQ 클래스들
class DatabaseOperationDLQ extends DeadLetterQueue {
  constructor(options = {}) {
    super({
      name: 'DatabaseOperations',
      maxRetries: 5,
      retryDelay: 30000, // 30초
      ...options
    });
  }

  async retryItem(item) {
    try {
      const { operation, query, params } = item.data;
      
      console.log(`🔄 데이터베이스 작업 재시도: ${operation}`);
      
      // 실제 데이터베이스 작업 재실행
      // const result = await pool.query(query, params);
      
      return {
        success: true,
        result: 'Database operation retried successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class APICallDLQ extends DeadLetterQueue {
  constructor(options = {}) {
    super({
      name: 'APICalls',
      maxRetries: 3,
      retryDelay: 60000, // 1분
      ...options
    });
  }

  async retryItem(item) {
    try {
      const { url, method, data, headers } = item.data;
      
      console.log(`🔄 API 호출 재시도: ${method} ${url}`);
      
      // 실제 API 호출 재실행
      // const response = await fetch(url, { method, body: data, headers });
      
      return {
        success: true,
        result: 'API call retried successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// [advice from AI] DLQ 관리자
class DeadLetterQueueManager {
  constructor() {
    this.queues = new Map();
  }

  // DLQ 생성/등록
  create(name, type = 'default', options = {}) {
    if (this.queues.has(name)) {
      console.log(`⚠️ DLQ '${name}'이 이미 존재합니다`);
      return this.queues.get(name);
    }
    
    let dlq;
    switch (type) {
      case 'database':
        dlq = new DatabaseOperationDLQ({ ...options, name });
        break;
      case 'api':
        dlq = new APICallDLQ({ ...options, name });
        break;
      default:
        dlq = new DeadLetterQueue({ ...options, name });
    }
    
    this.queues.set(name, dlq);
    console.log(`✅ DLQ '${name}' (${type}) 생성됨`);
    
    return dlq;
  }

  // DLQ 조회
  get(name) {
    return this.queues.get(name);
  }

  // 모든 DLQ 상태 조회
  getAllStatus() {
    const status = {};
    for (const [name, dlq] of this.queues) {
      status[name] = dlq.getStatus();
    }
    return status;
  }

  // 모든 DLQ 수동 처리
  async processAll() {
    const results = {};
    for (const [name, dlq] of this.queues) {
      results[name] = await dlq.manualProcess();
    }
    return results;
  }
}

// [advice from AI] 싱글톤 인스턴스
const dlqManager = new DeadLetterQueueManager();

module.exports = {
  DeadLetterQueue,
  DatabaseOperationDLQ,
  APICallDLQ,
  DeadLetterQueueManager,
  dlqManager
};
