// [advice from AI] 확장 가능한 파이프라인 오케스트레이터
// 다중 CI/CD 프로바이더 관리 및 파이프라인 실행 조정

const EventEmitter = require('events');
const { Pool } = require('pg');
const systemLogger = require('../../middleware/systemLogger');
const { circuitBreakerManager } = require('../../utils/CircuitBreaker');
const { globalErrorHandler } = require('../../middleware/globalErrorHandler');

class PipelineOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    // [advice from AI] 데이터베이스 연결
    this.pool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'timbel_cicd_operator',
      user: process.env.DB_USER || 'timbel_user',
      password: process.env.DB_PASSWORD || 'timbel_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // [advice from AI] 등록된 프로바이더들
    this.providers = new Map(); // providerName -> providerInstance
    this.providerConfigs = new Map(); // providerName -> config
    this.activeExecutions = new Map(); // executionId -> executionContext
    
    // [advice from AI] 실행 큐 관리
    this.executionQueue = [];
    this.maxConcurrentExecutions = parseInt(process.env.MAX_CONCURRENT_PIPELINES || '10');
    this.currentExecutions = 0;
    
    // [advice from AI] 서킷 브레이커
    this.circuitBreaker = circuitBreakerManager.create('pipeline_orchestrator', {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 30000
    });
    
    // [advice from AI] 초기화
    this.initialize();
  }

  // [advice from AI] 오케스트레이터 초기화
  async initialize() {
    try {
      systemLogger.info('파이프라인 오케스트레이터 초기화 시작');
      
      // 기본 프로바이더들 로드
      await this.loadDefaultProviders();
      
      // 데이터베이스에서 설정된 프로바이더들 로드
      await this.loadConfiguredProviders();
      
      // 실행 큐 처리 시작
      this.startExecutionProcessor();
      
      systemLogger.info('파이프라인 오케스트레이터 초기화 완료', {
        providers: Array.from(this.providers.keys()),
        maxConcurrentExecutions: this.maxConcurrentExecutions
      });
      
    } catch (error) {
      systemLogger.error('파이프라인 오케스트레이터 초기화 실패', { error: error.message });
      await globalErrorHandler.handleError(error, { context: 'PipelineOrchestrator.initialize' });
    }
  }

  // [advice from AI] 기본 프로바이더 로드
  async loadDefaultProviders() {
    const defaultProviders = [
      { name: 'jenkins', module: './providers/JenkinsProvider' },
      { name: 'argocd', module: './providers/ArgoCDProvider' },
      { name: 'nexus', module: './providers/NexusProvider' }
    ];

    for (const { name, module } of defaultProviders) {
      try {
        const ProviderClass = require(module);
        const config = this.getProviderConfig(name);
        
        if (config && config.enabled !== false) {
          await this.registerProvider(name, ProviderClass, config);
          systemLogger.info(`기본 프로바이더 로드 완료: ${name}`);
        }
      } catch (error) {
        systemLogger.warn(`기본 프로바이더 로드 실패: ${name}`, { error: error.message });
      }
    }
  }

  // [advice from AI] 설정된 프로바이더들 로드
  async loadConfiguredProviders() {
    try {
      const result = await this.pool.query(`
        SELECT name, provider_type, config, enabled 
        FROM pipeline_providers 
        WHERE enabled = true
      `);

      for (const row of result.rows) {
        try {
          const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
          await this.loadCustomProvider(row.name, row.provider_type, config);
        } catch (error) {
          systemLogger.warn(`커스텀 프로바이더 로드 실패: ${row.name}`, { error: error.message });
        }
      }
    } catch (error) {
      systemLogger.error('설정된 프로바이더 로드 중 오류', { error: error.message });
    }
  }

  // [advice from AI] 커스텀 프로바이더 로드
  async loadCustomProvider(name, providerType, config) {
    const providerMap = {
      'github_actions': './providers/GitHubActionsProvider',
      'gitlab_ci': './providers/GitLabCIProvider',
      'azure_devops': './providers/AzureDevOpsProvider',
      'circleci': './providers/CircleCIProvider',
      'drone': './providers/DroneProvider'
    };

    const module = providerMap[providerType];
    if (!module) {
      throw new Error(`Unsupported provider type: ${providerType}`);
    }

    try {
      const ProviderClass = require(module);
      await this.registerProvider(name, ProviderClass, config);
      systemLogger.info(`커스텀 프로바이더 로드 완료: ${name} (${providerType})`);
    } catch (error) {
      systemLogger.error(`커스텀 프로바이더 로드 실패: ${name}`, { error: error.message });
      throw error;
    }
  }

  // [advice from AI] 프로바이더 등록
  async registerProvider(name, ProviderClass, config) {
    try {
      const provider = new ProviderClass(name, config);
      
      // 이벤트 리스너 설정
      provider.on('pipeline_event', (event) => this.handleProviderEvent(event));
      provider.on('provider_error', (error) => this.handleProviderError(error));
      provider.on('provider_disconnected', (info) => this.handleProviderDisconnected(info));
      
      // 연결 테스트
      await provider.connect();
      
      this.providers.set(name, provider);
      this.providerConfigs.set(name, config);
      
      this.emit('provider_registered', { name, capabilities: provider.capabilities });
      
      systemLogger.info(`프로바이더 등록 완료: ${name}`, {
        capabilities: Array.from(provider.capabilities),
        connected: provider.isConnected
      });
      
    } catch (error) {
      systemLogger.error(`프로바이더 등록 실패: ${name}`, { error: error.message });
      throw error;
    }
  }

  // [advice from AI] 프로바이더 설정 조회
  getProviderConfig(providerName) {
    const configs = {
      jenkins: {
        serverUrl: process.env.JENKINS_URL || 'http://jenkins:8080',
        username: process.env.JENKINS_USERNAME || 'admin',
        apiToken: process.env.JENKINS_API_TOKEN || '',
        enabled: process.env.JENKINS_ENABLED !== 'false'
      },
      argocd: {
        serverUrl: process.env.ARGOCD_URL || 'http://argocd:8080',
        username: process.env.ARGOCD_USERNAME || 'admin',
        password: process.env.ARGOCD_PASSWORD || '',
        enabled: process.env.ARGOCD_ENABLED !== 'false'
      },
      nexus: {
        serverUrl: process.env.NEXUS_URL || 'http://nexus:8081',
        username: process.env.NEXUS_USERNAME || 'admin',
        password: process.env.NEXUS_PASSWORD || '',
        enabled: process.env.NEXUS_ENABLED !== 'false'
      }
    };

    return configs[providerName];
  }

  // [advice from AI] 파이프라인 실행
  async executePipeline(request) {
    const executionId = this.generateExecutionId();
    
    try {
      // 실행 컨텍스트 생성
      const executionContext = {
        id: executionId,
        request,
        status: 'queued',
        createdAt: new Date(),
        provider: null,
        pipelineId: null,
        stages: [],
        logs: []
      };

      this.activeExecutions.set(executionId, executionContext);

      // 데이터베이스에 실행 기록
      await this.recordExecution(executionContext);

      // 실행 큐에 추가
      this.executionQueue.push(executionId);
      
      this.emit('pipeline_queued', { executionId, request });
      
      systemLogger.info('파이프라인 실행 요청 큐에 추가', {
        executionId,
        repository: request.repository,
        branch: request.branch,
        queuePosition: this.executionQueue.length
      });

      return { executionId, status: 'queued' };
      
    } catch (error) {
      systemLogger.error('파이프라인 실행 요청 실패', { 
        executionId, 
        error: error.message,
        request 
      });
      
      await globalErrorHandler.handleError(error, { 
        context: 'PipelineOrchestrator.executePipeline',
        executionId,
        request 
      });
      
      throw error;
    }
  }

  // [advice from AI] 실행 큐 처리기
  startExecutionProcessor() {
    setInterval(async () => {
      if (this.currentExecutions < this.maxConcurrentExecutions && this.executionQueue.length > 0) {
        const executionId = this.executionQueue.shift();
        await this.processExecution(executionId);
      }
    }, 1000); // 1초마다 확인
  }

  // [advice from AI] 개별 실행 처리
  async processExecution(executionId) {
    const executionContext = this.activeExecutions.get(executionId);
    if (!executionContext) return;

    try {
      this.currentExecutions++;
      executionContext.status = 'running';
      executionContext.startedAt = new Date();

      await this.updateExecutionStatus(executionId, 'running');

      // 적절한 프로바이더 선택
      const provider = await this.selectProvider(executionContext.request);
      if (!provider) {
        throw new Error('No suitable provider found for pipeline execution');
      }

      executionContext.provider = provider.name;

      // 파이프라인 실행
      const result = await this.circuitBreaker.execute(async () => {
        return await provider.executePipeline(executionContext.request.pipelineConfig, executionContext.request.parameters);
      });

      executionContext.pipelineId = result.pipelineId;
      executionContext.status = 'running';

      // 실행 모니터링 시작
      this.monitorExecution(executionId, provider);

      this.emit('pipeline_started', { executionId, provider: provider.name, pipelineId: result.pipelineId });

    } catch (error) {
      await this.handleExecutionError(executionId, error);
    }
  }

  // [advice from AI] 프로바이더 선택 로직
  async selectProvider(request) {
    const { providerPreference, repository, pipelineType } = request;

    // 1. 명시적 프로바이더 지정
    if (providerPreference && this.providers.has(providerPreference)) {
      const provider = this.providers.get(providerPreference);
      if (provider.isConnected) {
        return provider;
      }
    }

    // 2. 파이프라인 타입별 기본 프로바이더
    const typeProviderMap = {
      'build': 'jenkins',
      'deploy': 'argocd',
      'artifact': 'nexus',
      'test': 'jenkins',
      'full_cicd': 'jenkins'
    };

    const defaultProvider = typeProviderMap[pipelineType];
    if (defaultProvider && this.providers.has(defaultProvider)) {
      const provider = this.providers.get(defaultProvider);
      if (provider.isConnected) {
        return provider;
      }
    }

    // 3. 연결된 프로바이더 중 첫 번째
    for (const provider of this.providers.values()) {
      if (provider.isConnected) {
        return provider;
      }
    }

    return null;
  }

  // [advice from AI] 실행 모니터링
  async monitorExecution(executionId, provider) {
    const executionContext = this.activeExecutions.get(executionId);
    if (!executionContext || !executionContext.pipelineId) return;

    const monitorInterval = setInterval(async () => {
      try {
        const status = await provider.getPipelineStatus(executionContext.pipelineId);
        
        if (status.status !== executionContext.status) {
          executionContext.status = status.status;
          await this.updateExecutionStatus(executionId, status.status);
          
          this.emit('pipeline_status_changed', {
            executionId,
            status: status.status,
            provider: provider.name
          });
        }

        // 실행 완료 확인
        if (['success', 'failed', 'cancelled'].includes(status.status)) {
          clearInterval(monitorInterval);
          await this.completeExecution(executionId, status);
        }

      } catch (error) {
        systemLogger.error('실행 모니터링 오류', {
          executionId,
          provider: provider.name,
          error: error.message
        });
      }
    }, 5000); // 5초마다 상태 확인
  }

  // [advice from AI] 실행 완료 처리
  async completeExecution(executionId, finalStatus) {
    const executionContext = this.activeExecutions.get(executionId);
    if (!executionContext) return;

    try {
      executionContext.status = finalStatus.status;
      executionContext.completedAt = new Date();
      executionContext.result = finalStatus;

      await this.updateExecutionStatus(executionId, finalStatus.status, finalStatus);

      this.emit('pipeline_completed', {
        executionId,
        status: finalStatus.status,
        duration: executionContext.completedAt - executionContext.startedAt,
        provider: executionContext.provider
      });

      // 정리
      this.activeExecutions.delete(executionId);
      this.currentExecutions--;

      systemLogger.info('파이프라인 실행 완료', {
        executionId,
        status: finalStatus.status,
        provider: executionContext.provider,
        duration: executionContext.completedAt - executionContext.startedAt
      });

    } catch (error) {
      await globalErrorHandler.handleError(error, {
        context: 'PipelineOrchestrator.completeExecution',
        executionId
      });
    }
  }

  // [advice from AI] 데이터베이스 관련 메서드들

  async recordExecution(executionContext) {
    try {
      await this.pool.query(`
        INSERT INTO pipeline_executions (
          pipeline_id, repository, branch, environment, 
          status, created_at, parameters, config
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        executionContext.id,
        executionContext.request.repository,
        executionContext.request.branch || 'main',
        executionContext.request.environment || 'development',
        executionContext.status,
        executionContext.createdAt,
        JSON.stringify(executionContext.request.parameters || {}),
        JSON.stringify(executionContext.request.pipelineConfig || {})
      ]);
    } catch (error) {
      systemLogger.error('실행 기록 저장 실패', { error: error.message, executionContext });
    }
  }

  async updateExecutionStatus(executionId, status, details = {}) {
    try {
      const executionContext = this.activeExecutions.get(executionId);
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (status === 'running') {
        updateData.started_at = new Date();
      } else if (['success', 'failed', 'cancelled'].includes(status)) {
        updateData.completed_at = new Date();
        if (details.error) {
          updateData.failure_reason = details.error;
        }
      }

      const setClause = Object.keys(updateData).map((key, index) => 
        `${key} = $${index + 2}`
      ).join(', ');

      await this.pool.query(`
        UPDATE pipeline_executions 
        SET ${setClause}
        WHERE pipeline_id = $1
      `, [executionId, ...Object.values(updateData)]);

    } catch (error) {
      systemLogger.error('실행 상태 업데이트 실패', { error: error.message, executionId, status });
    }
  }

  // [advice from AI] 이벤트 핸들러들

  handleProviderEvent(event) {
    systemLogger.debug('프로바이더 이벤트 수신', event);
    this.emit('provider_event', event);
  }

  handleProviderError(error) {
    systemLogger.error('프로바이더 오류', error);
    this.emit('provider_error', error);
  }

  handleProviderDisconnected(info) {
    systemLogger.warn('프로바이더 연결 해제', info);
    this.emit('provider_disconnected', info);
  }

  async handleExecutionError(executionId, error) {
    const executionContext = this.activeExecutions.get(executionId);
    if (executionContext) {
      executionContext.status = 'failed';
      executionContext.error = error.message;
      executionContext.completedAt = new Date();

      await this.updateExecutionStatus(executionId, 'failed', { error: error.message });
    }

    this.activeExecutions.delete(executionId);
    this.currentExecutions--;

    this.emit('pipeline_failed', { executionId, error: error.message });

    await globalErrorHandler.handleError(error, {
      context: 'PipelineOrchestrator.handleExecutionError',
      executionId
    });
  }

  // [advice from AI] 유틸리티 메서드들

  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // [advice from AI] 공개 API 메서드들

  /**
   * 등록된 프로바이더 목록 조회
   */
  getProviders() {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      ...provider.getProviderInfo()
    }));
  }

  /**
   * 특정 프로바이더 조회
   */
  getProvider(name) {
    return this.providers.get(name);
  }

  /**
   * 활성 실행 목록 조회
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values()).map(context => ({
      id: context.id,
      status: context.status,
      provider: context.provider,
      repository: context.request?.repository,
      branch: context.request?.branch,
      createdAt: context.createdAt,
      startedAt: context.startedAt
    }));
  }

  /**
   * 실행 상태 조회
   */
  getExecutionStatus(executionId) {
    const context = this.activeExecutions.get(executionId);
    if (!context) return null;

    return {
      id: context.id,
      status: context.status,
      provider: context.provider,
      pipelineId: context.pipelineId,
      createdAt: context.createdAt,
      startedAt: context.startedAt,
      completedAt: context.completedAt,
      stages: context.stages,
      error: context.error
    };
  }

  /**
   * 파이프라인 중단
   */
  async stopPipeline(executionId) {
    const context = this.activeExecutions.get(executionId);
    if (!context || !context.provider) {
      throw new Error('Execution not found or not started');
    }

    const provider = this.providers.get(context.provider);
    if (!provider) {
      throw new Error('Provider not found');
    }

    await provider.stopPipeline(context.pipelineId);
    await this.updateExecutionStatus(executionId, 'cancelled');
    
    context.status = 'cancelled';
    context.completedAt = new Date();
    
    this.emit('pipeline_cancelled', { executionId });
    
    return { status: 'cancelled' };
  }

  /**
   * 오케스트레이터 통계
   */
  getStats() {
    const activeExecutions = this.activeExecutions.size;
    const queuedExecutions = this.executionQueue.length;
    const providers = this.providers.size;
    const connectedProviders = Array.from(this.providers.values())
      .filter(p => p.isConnected).length;

    return {
      activeExecutions,
      queuedExecutions,
      providers,
      connectedProviders,
      maxConcurrentExecutions: this.maxConcurrentExecutions,
      currentExecutions: this.currentExecutions
    };
  }

  /**
   * 프로바이더 헬스 체크
   */
  async checkProvidersHealth() {
    const healthChecks = await Promise.allSettled(
      Array.from(this.providers.values()).map(provider => provider.healthCheck())
    );

    return healthChecks.map((result, index) => {
      const providerName = Array.from(this.providers.keys())[index];
      return {
        provider: providerName,
        ...(result.status === 'fulfilled' ? result.value : { healthy: false, error: result.reason.message })
      };
    });
  }

  /**
   * 오케스트레이터 종료
   */
  async shutdown() {
    try {
      systemLogger.info('파이프라인 오케스트레이터 종료 시작');

      // 모든 프로바이더 연결 해제
      for (const provider of this.providers.values()) {
        await provider.disconnect();
      }

      // 데이터베이스 연결 종료
      await this.pool.end();

      systemLogger.info('파이프라인 오케스트레이터 종료 완료');

    } catch (error) {
      systemLogger.error('파이프라인 오케스트레이터 종료 중 오류', { error: error.message });
    }
  }
}

module.exports = PipelineOrchestrator;
