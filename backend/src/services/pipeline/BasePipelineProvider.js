// [advice from AI] 확장 가능한 파이프라인 프로바이더 기본 인터페이스
// 다양한 CI/CD 솔루션을 지원하는 플러그인 아키텍처

const EventEmitter = require('events');

/**
 * 파이프라인 프로바이더 기본 추상 클래스
 * 모든 CI/CD 프로바이더는 이 인터페이스를 구현해야 함
 */
class BasePipelineProvider extends EventEmitter {
  constructor(name, config = {}) {
    super();
    
    this.name = name;
    this.config = config;
    this.isConnected = false;
    this.capabilities = new Set();
    this.metadata = {
      version: '1.0.0',
      description: 'Base Pipeline Provider',
      author: 'Timbel Platform',
      supportedFeatures: []
    };
    
    // [advice from AI] 프로바이더별 설정 검증
    this.validateConfig();
  }

  // [advice from AI] 필수 구현 메서드들 - 하위 클래스에서 반드시 구현
  
  /**
   * 프로바이더 연결 및 초기화
   */
  async connect() {
    throw new Error(`connect() method must be implemented by ${this.name} provider`);
  }

  /**
   * 연결 상태 확인
   */
  async testConnection() {
    throw new Error(`testConnection() method must be implemented by ${this.name} provider`);
  }

  /**
   * 파이프라인 생성
   */
  async createPipeline(pipelineConfig) {
    throw new Error(`createPipeline() method must be implemented by ${this.name} provider`);
  }

  /**
   * 파이프라인 실행
   */
  async executePipeline(pipelineId, parameters = {}) {
    throw new Error(`executePipeline() method must be implemented by ${this.name} provider`);
  }

  /**
   * 파이프라인 상태 조회
   */
  async getPipelineStatus(pipelineId) {
    throw new Error(`getPipelineStatus() method must be implemented by ${this.name} provider`);
  }

  /**
   * 파이프라인 로그 조회
   */
  async getPipelineLogs(pipelineId, options = {}) {
    throw new Error(`getPipelineLogs() method must be implemented by ${this.name} provider`);
  }

  /**
   * 파이프라인 중단
   */
  async stopPipeline(pipelineId) {
    throw new Error(`stopPipeline() method must be implemented by ${this.name} provider`);
  }

  /**
   * 파이프라인 삭제
   */
  async deletePipeline(pipelineId) {
    throw new Error(`deletePipeline() method must be implemented by ${this.name} provider`);
  }

  // [advice from AI] 선택적 구현 메서드들 - 프로바이더 기능에 따라 구현

  /**
   * 아티팩트 관리 (선택적)
   */
  async getArtifacts(pipelineId) {
    if (!this.capabilities.has('artifacts')) {
      throw new Error(`Artifacts not supported by ${this.name} provider`);
    }
    return [];
  }

  /**
   * 웹훅 설정 (선택적)
   */
  async setupWebhook(repositoryUrl, webhookConfig) {
    if (!this.capabilities.has('webhooks')) {
      throw new Error(`Webhooks not supported by ${this.name} provider`);
    }
    return null;
  }

  /**
   * 환경 변수 관리 (선택적)
   */
  async setEnvironmentVariables(pipelineId, variables) {
    if (!this.capabilities.has('environment_variables')) {
      throw new Error(`Environment variables not supported by ${this.name} provider`);
    }
    return true;
  }

  /**
   * 브랜치별 파이프라인 설정 (선택적)
   */
  async configureBranchPipeline(repositoryUrl, branch, config) {
    if (!this.capabilities.has('branch_pipelines')) {
      throw new Error(`Branch pipelines not supported by ${this.name} provider`);
    }
    return null;
  }

  // [advice from AI] 공통 유틸리티 메서드들

  /**
   * 설정 검증
   */
  validateConfig() {
    const requiredFields = this.getRequiredConfigFields();
    const missingFields = requiredFields.filter(field => !this.config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required configuration fields for ${this.name}: ${missingFields.join(', ')}`);
    }
  }

  /**
   * 필수 설정 필드 반환 (하위 클래스에서 오버라이드)
   */
  getRequiredConfigFields() {
    return ['serverUrl']; // 기본적으로 서버 URL만 필수
  }

  /**
   * 프로바이더 메타데이터 설정
   */
  setMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * 기능 추가
   */
  addCapability(capability) {
    this.capabilities.add(capability);
  }

  /**
   * 기능 확인
   */
  hasCapability(capability) {
    return this.capabilities.has(capability);
  }

  /**
   * 프로바이더 정보 반환
   */
  getProviderInfo() {
    return {
      name: this.name,
      connected: this.isConnected,
      capabilities: Array.from(this.capabilities),
      metadata: this.metadata,
      config: {
        serverUrl: this.config.serverUrl,
        // 민감한 정보는 제외하고 반환
      }
    };
  }

  /**
   * 이벤트 발생 헬퍼
   */
  emitPipelineEvent(eventType, pipelineId, data = {}) {
    this.emit('pipeline_event', {
      provider: this.name,
      eventType,
      pipelineId,
      timestamp: new Date().toISOString(),
      data
    });
  }

  /**
   * 에러 이벤트 발생
   */
  emitError(error, context = {}) {
    this.emit('provider_error', {
      provider: this.name,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 연결 해제
   */
  async disconnect() {
    this.isConnected = false;
    this.emit('provider_disconnected', { provider: this.name });
  }

  /**
   * 헬스 체크
   */
  async healthCheck() {
    try {
      const isHealthy = await this.testConnection();
      return {
        provider: this.name,
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
        details: await this.getHealthDetails()
      };
    } catch (error) {
      return {
        provider: this.name,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 상세 헬스 정보 (하위 클래스에서 오버라이드 가능)
   */
  async getHealthDetails() {
    return {
      connection: this.isConnected,
      capabilities: Array.from(this.capabilities).length
    };
  }

  /**
   * 파이프라인 템플릿 지원 여부 확인
   */
  supportsTemplates() {
    return this.capabilities.has('templates');
  }

  /**
   * 실시간 로그 스트리밍 지원 여부 확인
   */
  supportsLogStreaming() {
    return this.capabilities.has('log_streaming');
  }

  /**
   * 파이프라인 실행 통계 조회 (선택적)
   */
  async getPipelineStats(timeRange = '24h') {
    if (!this.capabilities.has('statistics')) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        running: 0
      };
    }
    
    // 하위 클래스에서 구현
    return this.getProviderStats(timeRange);
  }

  /**
   * 프로바이더별 통계 구현 (하위 클래스에서 오버라이드)
   */
  async getProviderStats(timeRange) {
    return {
      total: 0,
      success: 0,
      failed: 0,
      running: 0
    };
  }
}

// [advice from AI] 파이프라인 상태 상수
BasePipelineProvider.PIPELINE_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running', 
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

// [advice from AI] 파이프라인 이벤트 타입
BasePipelineProvider.EVENT_TYPES = {
  PIPELINE_STARTED: 'pipeline_started',
  PIPELINE_COMPLETED: 'pipeline_completed',
  PIPELINE_FAILED: 'pipeline_failed',
  PIPELINE_CANCELLED: 'pipeline_cancelled',
  STAGE_STARTED: 'stage_started',
  STAGE_COMPLETED: 'stage_completed',
  STAGE_FAILED: 'stage_failed',
  LOG_RECEIVED: 'log_received'
};

// [advice from AI] 지원 가능한 기능 목록
BasePipelineProvider.CAPABILITIES = {
  ARTIFACTS: 'artifacts',
  WEBHOOKS: 'webhooks',
  ENVIRONMENT_VARIABLES: 'environment_variables',
  BRANCH_PIPELINES: 'branch_pipelines',
  TEMPLATES: 'templates',
  LOG_STREAMING: 'log_streaming',
  STATISTICS: 'statistics',
  ROLLBACK: 'rollback',
  PARALLEL_EXECUTION: 'parallel_execution',
  MATRIX_BUILDS: 'matrix_builds'
};

module.exports = BasePipelineProvider;
