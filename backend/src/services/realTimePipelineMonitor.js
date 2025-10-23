// [advice from AI] 프로덕션 레벨 실시간 파이프라인 모니터링 시스템
// WebSocket 기반 실시간 추적, 단계별 진행 상황, 자동 알림 및 롤백

const EventEmitter = require('events');
const WebSocket = require('ws');
const { Pool } = require('pg');
const systemLogger = require('../middleware/systemLogger');
const { circuitBreakerManager } = require('../utils/CircuitBreaker');
const { IntelligentAlertSystem } = require('./intelligentAlertSystem');

class RealTimePipelineMonitor extends EventEmitter {
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

    // [advice from AI] WebSocket 서버 설정
    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, userId, subscriptions }
    
    // [advice from AI] 파이프라인 상태 추적
    this.activePipelines = new Map(); // pipelineId -> pipelineData
    this.pipelineMetrics = new Map(); // pipelineId -> metrics
    this.stageTimings = new Map(); // pipelineId -> { stage -> timing }
    
    // [advice from AI] 모니터링 설정
    this.config = {
      monitoringInterval: 5000, // 5초마다 상태 체크
      logRetentionDays: 30,
      maxConcurrentPipelines: 50,
      alertThresholds: {
        stageDuration: {
          warning: 300000, // 5분
          critical: 600000  // 10분
        },
        queueTime: {
          warning: 60000,   // 1분
          critical: 300000  // 5분
        },
        failureRate: {
          warning: 0.1,     // 10%
          critical: 0.2     // 20%
        }
      },
      autoRollback: {
        enabled: true,
        conditions: ['deployment_failed', 'health_check_failed', 'critical_error'],
        timeout: 300000 // 5분
      }
    };

    // [advice from AI] 외부 서비스 연동
    this.alertSystem = new IntelligentAlertSystem();
    this.circuitBreaker = circuitBreakerManager.create('pipeline_monitor', {
      failureThreshold: 5,
      resetTimeout: 30000
    });

    // [advice from AI] 파이프라인 단계 정의
    this.pipelineStages = {
      'cicd_pipeline': [
        { id: 'source_checkout', name: '소스 체크아웃', order: 1, critical: true },
        { id: 'dependency_install', name: '의존성 설치', order: 2, critical: true },
        { id: 'unit_test', name: '단위 테스트', order: 3, critical: true },
        { id: 'code_quality', name: '코드 품질 검사', order: 4, critical: false },
        { id: 'security_scan', name: '보안 스캔', order: 5, critical: false },
        { id: 'build_artifact', name: '아티팩트 빌드', order: 6, critical: true },
        { id: 'docker_build', name: 'Docker 이미지 빌드', order: 7, critical: true },
        { id: 'registry_push', name: '레지스트리 푸시', order: 8, critical: true },
        { id: 'deploy_staging', name: '스테이징 배포', order: 9, critical: false },
        { id: 'integration_test', name: '통합 테스트', order: 10, critical: false },
        { id: 'deploy_production', name: '프로덕션 배포', order: 11, critical: true },
        { id: 'health_check', name: '헬스 체크', order: 12, critical: true },
        { id: 'smoke_test', name: '스모크 테스트', order: 13, critical: false }
      ]
    };

    this.init();
  }

  // [advice from AI] 초기화
  async init() {
    try {
      await this.initializeWebSocketServer();
      await this.loadActivePipelines();
      this.startMonitoring();
      
      systemLogger.info('🚀 실시간 파이프라인 모니터 초기화 완료', {
        component: 'RealTimePipelineMonitor',
        wsPort: process.env.PIPELINE_WS_PORT || 3002,
        monitoringInterval: this.config.monitoringInterval
      });

    } catch (error) {
      systemLogger.error('파이프라인 모니터 초기화 실패', { error: error.message });
      throw error;
    }
  }

  // [advice from AI] WebSocket 서버 초기화
  async initializeWebSocketServer() {
    const port = process.env.PIPELINE_WS_PORT || 3002;
    
    this.wss = new WebSocket.Server({ 
      port: port,
      perMessageDeflate: false,
      clientTracking: true
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      
      this.clients.set(clientId, {
        ws,
        userId: null,
        subscriptions: new Set(),
        connectedAt: new Date(),
        lastPing: new Date()
      });

      ws.on('message', (data) => {
        this.handleWebSocketMessage(clientId, data);
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        systemLogger.debug('WebSocket 클라이언트 연결 해제', { clientId });
      });

      ws.on('error', (error) => {
        systemLogger.error('WebSocket 오류', { clientId, error: error.message });
        this.clients.delete(clientId);
      });

      // 연결 확인 메시지
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString()
      }));

      systemLogger.debug('새로운 WebSocket 클라이언트 연결', { clientId });
    });

    systemLogger.info('WebSocket 서버 시작', { port });
  }

  // [advice from AI] WebSocket 메시지 처리
  handleWebSocketMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);
      
      if (!client) return;

      switch (message.type) {
        case 'authenticate':
          client.userId = message.userId;
          client.token = message.token;
          this.sendToClient(clientId, {
            type: 'authenticated',
            success: true
          });
          break;

        case 'subscribe_pipeline':
          client.subscriptions.add(message.pipelineId);
          this.sendPipelineStatus(clientId, message.pipelineId);
          break;

        case 'unsubscribe_pipeline':
          client.subscriptions.delete(message.pipelineId);
          break;

        case 'subscribe_all':
          client.subscriptions.add('*');
          break;

        case 'ping':
          client.lastPing = new Date();
          this.sendToClient(clientId, { type: 'pong' });
          break;

        default:
          systemLogger.warn('알 수 없는 WebSocket 메시지', { type: message.type, clientId });
      }
    } catch (error) {
      systemLogger.error('WebSocket 메시지 처리 오류', { clientId, error: error.message });
    }
  }

  // [advice from AI] 클라이언트에 메시지 전송
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
    }
  }

  // [advice from AI] 파이프라인 상태를 구독 중인 클라이언트들에게 브로드캐스트
  broadcastPipelineUpdate(pipelineId, update) {
    const message = {
      type: 'pipeline_update',
      pipelineId,
      data: update
    };

    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscriptions.has(pipelineId) || client.subscriptions.has('*')) {
        this.sendToClient(clientId, message);
      }
    }
  }

  // [advice from AI] 파이프라인 등록 및 추적 시작
  async registerPipeline(pipelineData) {
    try {
      const pipelineId = pipelineData.id || this.generatePipelineId();
      const stages = this.pipelineStages[pipelineData.type] || this.pipelineStages['cicd_pipeline'];
      
      const pipeline = {
        id: pipelineId,
        type: pipelineData.type || 'cicd_pipeline',
        projectId: pipelineData.projectId,
        repositoryUrl: pipelineData.repositoryUrl,
        branch: pipelineData.branch || 'main',
        environment: pipelineData.environment || 'development',
        userId: pipelineData.userId,
        
        // 상태 정보
        status: 'queued',
        currentStage: null,
        currentStageIndex: -1,
        stages: stages.map(stage => ({
          ...stage,
          status: 'pending',
          startTime: null,
          endTime: null,
          duration: null,
          logs: [],
          metrics: {}
        })),
        
        // 시간 정보
        queuedAt: new Date(),
        startedAt: null,
        completedAt: null,
        
        // 메트릭
        metrics: {
          totalDuration: null,
          queueTime: null,
          buildTime: null,
          testTime: null,
          deployTime: null
        },
        
        // 설정
        config: pipelineData.config || {},
        rollbackEnabled: pipelineData.rollbackEnabled !== false
      };

      // 데이터베이스에 저장
      await this.savePipelineToDatabase(pipeline);
      
      // 메모리에 저장
      this.activePipelines.set(pipelineId, pipeline);
      this.stageTimings.set(pipelineId, {});
      
      // 클라이언트들에게 알림
      this.broadcastPipelineUpdate(pipelineId, {
        type: 'pipeline_registered',
        pipeline: this.sanitizePipelineData(pipeline)
      });

      systemLogger.info('파이프라인 등록 완료', {
        pipelineId,
        projectId: pipeline.projectId,
        type: pipeline.type,
        stages: stages.length
      });

      this.emit('pipeline_registered', pipeline);
      return pipeline;

    } catch (error) {
      systemLogger.error('파이프라인 등록 실패', {
        error: error.message,
        pipelineData
      });
      throw error;
    }
  }

  // [advice from AI] 파이프라인 상태 업데이트
  async updatePipelineStatus(pipelineId, status, metadata = {}) {
    try {
      const pipeline = this.activePipelines.get(pipelineId);
      if (!pipeline) {
        throw new Error(`파이프라인을 찾을 수 없습니다: ${pipelineId}`);
      }

      const previousStatus = pipeline.status;
      pipeline.status = status;
      pipeline.updatedAt = new Date();

      // 상태별 특별 처리
      switch (status) {
        case 'running':
          if (!pipeline.startedAt) {
            pipeline.startedAt = new Date();
            pipeline.metrics.queueTime = pipeline.startedAt - pipeline.queuedAt;
          }
          break;

        case 'completed':
          pipeline.completedAt = new Date();
          pipeline.metrics.totalDuration = pipeline.completedAt - pipeline.startedAt;
          this.calculateStageMetrics(pipeline);
          await this.archivePipeline(pipeline);
          break;

        case 'failed':
          pipeline.completedAt = new Date();
          pipeline.failureReason = metadata.reason;
          pipeline.failureStage = pipeline.currentStage;
          
          // 자동 롤백 조건 확인
          if (this.shouldAutoRollback(pipeline, metadata)) {
            await this.initiateAutoRollback(pipeline);
          }
          
          await this.archivePipeline(pipeline);
          break;

        case 'cancelled':
          pipeline.completedAt = new Date();
          pipeline.cancellationReason = metadata.reason;
          await this.archivePipeline(pipeline);
          break;
      }

      // 메타데이터 추가
      if (metadata.logs) {
        pipeline.logs = pipeline.logs || [];
        pipeline.logs.push(...metadata.logs);
      }

      if (metadata.metrics) {
        pipeline.metrics = { ...pipeline.metrics, ...metadata.metrics };
      }

      // 데이터베이스 업데이트
      await this.updatePipelineInDatabase(pipeline);

      // 클라이언트들에게 알림
      this.broadcastPipelineUpdate(pipelineId, {
        type: 'status_changed',
        previousStatus,
        currentStatus: status,
        pipeline: this.sanitizePipelineData(pipeline),
        metadata
      });

      // 알림 시스템 연동
      await this.sendStatusAlert(pipeline, previousStatus, status, metadata);

      systemLogger.info('파이프라인 상태 업데이트', {
        pipelineId,
        previousStatus,
        currentStatus: status,
        stage: pipeline.currentStage
      });

      this.emit('pipeline_status_changed', pipeline, previousStatus, status);
      return pipeline;

    } catch (error) {
      systemLogger.error('파이프라인 상태 업데이트 실패', {
        pipelineId,
        status,
        error: error.message
      });
      throw error;
    }
  }

  // [advice from AI] 파이프라인 스테이지 진행
  async advancePipelineStage(pipelineId, stageId, stageStatus, stageData = {}) {
    try {
      const pipeline = this.activePipelines.get(pipelineId);
      if (!pipeline) {
        throw new Error(`파이프라인을 찾을 수 없습니다: ${pipelineId}`);
      }

      const stageIndex = pipeline.stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) {
        throw new Error(`스테이지를 찾을 수 없습니다: ${stageId}`);
      }

      const stage = pipeline.stages[stageIndex];
      const previousStageStatus = stage.status;
      
      // 스테이지 상태 업데이트
      stage.status = stageStatus;
      stage.updatedAt = new Date();

      switch (stageStatus) {
        case 'running':
          stage.startTime = new Date();
          pipeline.currentStage = stageId;
          pipeline.currentStageIndex = stageIndex;
          
          // 파이프라인 상태도 running으로 변경 (첫 번째 스테이지인 경우)
          if (pipeline.status === 'queued') {
            await this.updatePipelineStatus(pipelineId, 'running');
          }
          break;

        case 'completed':
          stage.endTime = new Date();
          stage.duration = stage.endTime - stage.startTime;
          
          // 다음 스테이지로 자동 진행
          const nextStageIndex = stageIndex + 1;
          if (nextStageIndex < pipeline.stages.length) {
            const nextStage = pipeline.stages[nextStageIndex];
            await this.advancePipelineStage(pipelineId, nextStage.id, 'running');
          } else {
            // 모든 스테이지 완료
            await this.updatePipelineStatus(pipelineId, 'completed');
          }
          break;

        case 'failed':
          stage.endTime = new Date();
          stage.duration = stage.endTime - stage.startTime;
          stage.errorMessage = stageData.errorMessage;
          stage.errorDetails = stageData.errorDetails;
          
          // 중요 스테이지 실패 시 파이프라인 실패
          if (stage.critical) {
            await this.updatePipelineStatus(pipelineId, 'failed', {
              reason: `Critical stage failed: ${stage.name}`,
              stage: stageId,
              error: stageData.errorMessage
            });
          } else {
            // 비중요 스테이지는 건너뛰고 계속 진행
            const nextStageIndex = stageIndex + 1;
            if (nextStageIndex < pipeline.stages.length) {
              const nextStage = pipeline.stages[nextStageIndex];
              await this.advancePipelineStage(pipelineId, nextStage.id, 'running');
            }
          }
          break;

        case 'skipped':
          stage.endTime = new Date();
          stage.duration = 0;
          stage.skipReason = stageData.reason;
          
          // 다음 스테이지로 진행
          const nextSkipIndex = stageIndex + 1;
          if (nextSkipIndex < pipeline.stages.length) {
            const nextStage = pipeline.stages[nextSkipIndex];
            await this.advancePipelineStage(pipelineId, nextStage.id, 'running');
          }
          break;
      }

      // 스테이지 데이터 추가
      if (stageData.logs) {
        stage.logs = stage.logs || [];
        stage.logs.push(...stageData.logs);
      }

      if (stageData.metrics) {
        stage.metrics = { ...stage.metrics, ...stageData.metrics };
      }

      if (stageData.artifacts) {
        stage.artifacts = stageData.artifacts;
      }

      // 스테이지 타이밍 기록
      this.recordStageTiming(pipelineId, stageId, stageStatus, stage);

      // 데이터베이스 업데이트
      await this.updatePipelineInDatabase(pipeline);

      // 클라이언트들에게 알림
      this.broadcastPipelineUpdate(pipelineId, {
        type: 'stage_updated',
        stageId,
        previousStatus: previousStageStatus,
        currentStatus: stageStatus,
        stage: this.sanitizeStageData(stage),
        pipeline: this.sanitizePipelineData(pipeline)
      });

      // 스테이지 완료 시간 알림 체크
      await this.checkStageTimeoutAlert(pipeline, stage);

      systemLogger.info('파이프라인 스테이지 업데이트', {
        pipelineId,
        stageId,
        previousStatus: previousStageStatus,
        currentStatus: stageStatus,
        duration: stage.duration
      });

      this.emit('stage_updated', pipeline, stage, previousStageStatus, stageStatus);
      return stage;

    } catch (error) {
      systemLogger.error('파이프라인 스테이지 업데이트 실패', {
        pipelineId,
        stageId,
        stageStatus,
        error: error.message
      });
      throw error;
    }
  }

  // [advice from AI] 파이프라인 로그 스트리밍
  async streamPipelineLogs(pipelineId, stageId, logData) {
    try {
      const pipeline = this.activePipelines.get(pipelineId);
      if (!pipeline) return;

      const logEntry = {
        timestamp: new Date(),
        level: logData.level || 'info',
        message: logData.message,
        source: logData.source || 'pipeline',
        stageId: stageId
      };

      // 파이프라인 로그에 추가
      pipeline.logs = pipeline.logs || [];
      pipeline.logs.push(logEntry);

      // 스테이지별 로그에도 추가
      if (stageId) {
        const stage = pipeline.stages.find(s => s.id === stageId);
        if (stage) {
          stage.logs = stage.logs || [];
          stage.logs.push(logEntry);
        }
      }

      // 실시간 로그 스트리밍
      this.broadcastPipelineUpdate(pipelineId, {
        type: 'log_stream',
        stageId,
        log: logEntry
      });

      // 로그 레벨에 따른 알림
      if (logData.level === 'error' || logData.level === 'fatal') {
        await this.sendLogAlert(pipeline, logEntry);
      }

    } catch (error) {
      systemLogger.error('파이프라인 로그 스트리밍 실패', {
        pipelineId,
        stageId,
        error: error.message
      });
    }
  }

  // [advice from AI] 자동 롤백 실행
  async initiateAutoRollback(pipeline) {
    try {
      if (!this.config.autoRollback.enabled || !pipeline.rollbackEnabled) {
        return false;
      }

      systemLogger.info('자동 롤백 시작', {
        pipelineId: pipeline.id,
        projectId: pipeline.projectId,
        failureStage: pipeline.failureStage
      });

      // 롤백 파이프라인 생성
      const rollbackPipeline = await this.createRollbackPipeline(pipeline);
      
      // 알림 발송
      await this.alertSystem.sendAlert({
        type: 'auto_rollback_initiated',
        severity: 'high',
        title: '자동 롤백 시작',
        message: `파이프라인 실패로 인한 자동 롤백이 시작되었습니다.`,
        data: {
          originalPipeline: pipeline.id,
          rollbackPipeline: rollbackPipeline.id,
          failureStage: pipeline.failureStage,
          failureReason: pipeline.failureReason
        },
        channels: ['slack', 'email']
      });

      return rollbackPipeline;

    } catch (error) {
      systemLogger.error('자동 롤백 실패', {
        pipelineId: pipeline.id,
        error: error.message
      });
      
      // 롤백 실패 알림
      await this.alertSystem.sendAlert({
        type: 'auto_rollback_failed',
        severity: 'critical',
        title: '자동 롤백 실패',
        message: `자동 롤백 실행 중 오류가 발생했습니다: ${error.message}`,
        data: { pipelineId: pipeline.id, error: error.message },
        channels: ['slack', 'email']
      });

      return false;
    }
  }

  // [advice from AI] 유틸리티 메서드들
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generatePipelineId() {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizePipelineData(pipeline) {
    // 클라이언트에 전송할 때 민감한 정보 제거
    const { config, ...sanitized } = pipeline;
    return {
      ...sanitized,
      config: {
        environment: config.environment,
        branch: config.branch,
        // 민감한 설정 정보는 제외
      }
    };
  }

  sanitizeStageData(stage) {
    const { logs, ...sanitized } = stage;
    return {
      ...sanitized,
      logs: logs ? logs.slice(-10) : [] // 최근 10개 로그만
    };
  }

  shouldAutoRollback(pipeline, metadata) {
    if (!this.config.autoRollback.enabled) return false;
    if (!pipeline.rollbackEnabled) return false;
    if (pipeline.environment === 'development') return false;

    return this.config.autoRollback.conditions.some(condition => {
      switch (condition) {
        case 'deployment_failed':
          return pipeline.failureStage && pipeline.failureStage.includes('deploy');
        case 'health_check_failed':
          return pipeline.failureStage === 'health_check';
        case 'critical_error':
          return metadata.severity === 'critical';
        default:
          return false;
      }
    });
  }

  // [advice from AI] 데이터베이스 관련 메서드들
  async savePipelineToDatabase(pipeline) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO pipeline_executions (
          id, type, project_id, repository_url, branch, environment,
          user_id, status, current_stage, stages_config, config,
          queued_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        pipeline.id, pipeline.type, pipeline.projectId, pipeline.repositoryUrl,
        pipeline.branch, pipeline.environment, pipeline.userId, pipeline.status,
        pipeline.currentStage, JSON.stringify(pipeline.stages), JSON.stringify(pipeline.config),
        pipeline.queuedAt
      ]);
    } finally {
      client.release();
    }
  }

  async updatePipelineInDatabase(pipeline) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        UPDATE pipeline_executions SET
          status = $2, current_stage = $3, current_stage_index = $4,
          stages_config = $5, metrics = $6, started_at = $7, completed_at = $8,
          failure_reason = $9, failure_stage = $10, updated_at = NOW()
        WHERE id = $1
      `, [
        pipeline.id, pipeline.status, pipeline.currentStage, pipeline.currentStageIndex,
        JSON.stringify(pipeline.stages), JSON.stringify(pipeline.metrics),
        pipeline.startedAt, pipeline.completedAt, pipeline.failureReason, pipeline.failureStage
      ]);
    } finally {
      client.release();
    }
  }

  async loadActivePipelines() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM pipeline_executions
        WHERE status IN ('queued', 'running', 'paused')
        ORDER BY queued_at ASC
      `);

      for (const row of result.rows) {
        const pipeline = {
          id: row.id,
          type: row.type,
          projectId: row.project_id,
          repositoryUrl: row.repository_url,
          branch: row.branch,
          environment: row.environment,
          userId: row.user_id,
          status: row.status,
          currentStage: row.current_stage,
          currentStageIndex: row.current_stage_index || -1,
          stages: JSON.parse(row.stages_config || '[]'),
          config: JSON.parse(row.config || '{}'),
          metrics: JSON.parse(row.metrics || '{}'),
          queuedAt: row.queued_at,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          failureReason: row.failure_reason,
          failureStage: row.failure_stage,
          logs: []
        };

        this.activePipelines.set(pipeline.id, pipeline);
        this.stageTimings.set(pipeline.id, {});
      }

      systemLogger.info('활성 파이프라인 로드 완료', {
        count: result.rows.length
      });

    } finally {
      client.release();
    }
  }

  // [advice from AI] 모니터링 시작
  startMonitoring() {
    // 정기적인 상태 체크
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoringInterval);

    // WebSocket 클라이언트 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleClients();
    }, 60000); // 1분마다

    systemLogger.info('파이프라인 모니터링 시작', {
      interval: this.config.monitoringInterval
    });
  }

  // [advice from AI] 헬스 체크
  async performHealthCheck() {
    try {
      // 장시간 실행 중인 파이프라인 체크
      for (const [pipelineId, pipeline] of this.activePipelines.entries()) {
        if (pipeline.status === 'running') {
          const runningTime = new Date() - pipeline.startedAt;
          
          if (runningTime > this.config.alertThresholds.stageDuration.critical) {
            await this.sendTimeoutAlert(pipeline, runningTime);
          }
        }
      }

      // 큐에 너무 오래 대기 중인 파이프라인 체크
      for (const [pipelineId, pipeline] of this.activePipelines.entries()) {
        if (pipeline.status === 'queued') {
          const queueTime = new Date() - pipeline.queuedAt;
          
          if (queueTime > this.config.alertThresholds.queueTime.warning) {
            await this.sendQueueAlert(pipeline, queueTime);
          }
        }
      }

    } catch (error) {
      systemLogger.error('헬스 체크 실패', { error: error.message });
    }
  }

  // [advice from AI] 오래된 WebSocket 클라이언트 정리
  cleanupStaleClients() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5분

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > staleThreshold) {
        client.ws.terminate();
        this.clients.delete(clientId);
        systemLogger.debug('오래된 WebSocket 클라이언트 정리', { clientId });
      }
    }
  }

  // [advice from AI] 서비스 종료
  async shutdown() {
    try {
      // 모니터링 중지
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // WebSocket 서버 종료
      if (this.wss) {
        this.wss.close();
      }

      // 데이터베이스 연결 종료
      await this.pool.end();

      systemLogger.info('실시간 파이프라인 모니터 종료 완료');

    } catch (error) {
      systemLogger.error('파이프라인 모니터 종료 중 오류', { error: error.message });
    }
  }

  // [advice from AI] API 메서드들
  async getPipelineStatus(pipelineId) {
    const pipeline = this.activePipelines.get(pipelineId);
    return pipeline ? this.sanitizePipelineData(pipeline) : null;
  }

  async getAllActivePipelines() {
    const pipelines = Array.from(this.activePipelines.values());
    return pipelines.map(p => this.sanitizePipelineData(p));
  }

  async getPipelineMetrics() {
    const metrics = {
      activePipelines: this.activePipelines.size,
      queuedPipelines: Array.from(this.activePipelines.values()).filter(p => p.status === 'queued').length,
      runningPipelines: Array.from(this.activePipelines.values()).filter(p => p.status === 'running').length,
      connectedClients: this.clients.size,
      avgPipelineDuration: this.calculateAverageMetrics(),
      failureRate: this.calculateFailureRate()
    };

    return metrics;
  }

  calculateAverageMetrics() {
    // 구현 생략 - 평균 메트릭 계산 로직
    return 0;
  }

  calculateFailureRate() {
    // 구현 생략 - 실패율 계산 로직
    return 0;
  }

  // [advice from AI] 파이프라인 요약 정보
  async getPipelineSummary() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_pipelines,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running_count,
          COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued_count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
          ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 2) as avg_duration_seconds
        FROM pipeline_executions 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      const stats = result.rows[0];
      const activePipelines = Array.from(this.activePipelines.values());

      return {
        overview: {
          total_pipelines: parseInt(stats.total_pipelines) || 0,
          running_count: parseInt(stats.running_count) || 0,
          queued_count: parseInt(stats.queued_count) || 0,
          completed_count: parseInt(stats.completed_count) || 0,
          failed_count: parseInt(stats.failed_count) || 0,
          avg_duration_seconds: parseFloat(stats.avg_duration_seconds) || 0
        },
        active_pipelines: activePipelines.map(p => this.sanitizePipelineData(p)),
        connected_clients: this.clients.size,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      systemLogger.error('파이프라인 요약 조회 오류', { error: error.message });
      throw error;
    }
  }

  // [advice from AI] 파이프라인 히스토리
  async getPipelineHistory(options = {}) {
    try {
      const { limit = 50, offset = 0, status, environment } = options;
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (status) {
        whereClause += ' AND status = $' + (params.length + 1);
        params.push(status);
      }

      if (environment) {
        whereClause += ' AND environment = $' + (params.length + 1);
        params.push(environment);
      }

      params.push(limit, offset);

      const result = await this.pool.query(`
        SELECT 
          id,
          pipeline_id,
          repository,
          branch,
          environment,
          status,
          type,
          current_stage,
          started_at,
          completed_at,
          created_at,
          failure_reason,
          EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) as duration_seconds
        FROM pipeline_executions 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params);

      const countResult = await this.pool.query(`
        SELECT COUNT(*) as total
        FROM pipeline_executions 
        ${whereClause}
      `, params.slice(0, -2));

      return {
        executions: result.rows.map(row => ({
          ...row,
          duration_seconds: parseFloat(row.duration_seconds) || 0
        })),
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          has_more: parseInt(countResult.rows[0].total) > offset + limit
        }
      };
    } catch (error) {
      systemLogger.error('파이프라인 히스토리 조회 오류', { error: error.message });
      throw error;
    }
  }
}

module.exports = RealTimePipelineMonitor;
