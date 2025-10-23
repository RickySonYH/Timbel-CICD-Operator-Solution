// [advice from AI] 실시간 파이프라인 모니터링 API
// WebSocket 기반 실시간 추적, 단계별 상태 업데이트, 알림 시스템

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const { checkAdvancedPermission } = require('./advanced-permissions');
const systemLogger = require('../middleware/systemLogger');
const RealTimePipelineMonitor = require('../services/realTimePipelineMonitor');

// [advice from AI] 싱글톤 인스턴스
let monitorInstance = null;
const getMonitorInstance = () => {
  if (!monitorInstance) {
    monitorInstance = new RealTimePipelineMonitor();
  }
  return monitorInstance;
};

// [advice from AI] 테스트 라우트
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'realtime-pipeline API 작동 중', timestamp: new Date().toISOString() });
});

// [advice from AI] 파이프라인 요약 정보
router.get('/summary',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const monitor = getMonitorInstance();
      const summary = await monitor.getPipelineSummary();
      
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('파이프라인 요약 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 요약 정보 조회 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// [advice from AI] 파이프라인 히스토리
router.get('/history',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { limit = 50, offset = 0, status, environment } = req.query;
      const monitor = getMonitorInstance();
      const history = await monitor.getPipelineHistory({
        limit: parseInt(limit),
        offset: parseInt(offset),
        status,
        environment
      });
      
      res.json({
        success: true,
        data: history,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('파이프라인 히스토리 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 히스토리 조회 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// [advice from AI] 파이프라인 등록
router.post('/pipelines/register',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const monitor = getMonitorInstance();
      const pipelineData = {
        ...req.body,
        userId: req.user.id
      };

      systemLogger.info('파이프라인 등록 요청', {
        userId: req.user.id,
        projectId: pipelineData.projectId,
        type: pipelineData.type
      });

      const pipeline = await monitor.registerPipeline(pipelineData);

      res.status(201).json({
        success: true,
        data: {
          pipelineId: pipeline.id,
          status: pipeline.status,
          stages: pipeline.stages.length,
          queuedAt: pipeline.queuedAt
        },
        message: '파이프라인이 성공적으로 등록되었습니다.'
      });

    } catch (error) {
      systemLogger.error('파이프라인 등록 실패', {
        error: error.message,
        userId: req.user?.id,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 등록 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// [advice from AI] 파이프라인 상태 업데이트
router.put('/pipelines/:pipelineId/status',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const { status, metadata } = req.body;
      const monitor = getMonitorInstance();

      if (!['queued', 'running', 'completed', 'failed', 'cancelled', 'paused'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '유효하지 않은 파이프라인 상태입니다.'
        });
      }

      const pipeline = await monitor.updatePipelineStatus(pipelineId, status, metadata);

      res.json({
        success: true,
        data: {
          pipelineId: pipeline.id,
          previousStatus: metadata?.previousStatus,
          currentStatus: status,
          updatedAt: pipeline.updatedAt
        },
        message: '파이프라인 상태가 업데이트되었습니다.'
      });

    } catch (error) {
      systemLogger.error('파이프라인 상태 업데이트 실패', {
        pipelineId: req.params.pipelineId,
        status: req.body.status,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 상태 업데이트 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 스테이지 업데이트
router.put('/pipelines/:pipelineId/stages/:stageId',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const { pipelineId, stageId } = req.params;
      const { status, data } = req.body;
      const monitor = getMonitorInstance();

      if (!['pending', 'running', 'completed', 'failed', 'skipped'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '유효하지 않은 스테이지 상태입니다.'
        });
      }

      const stage = await monitor.advancePipelineStage(pipelineId, stageId, status, data);

      res.json({
        success: true,
        data: {
          pipelineId,
          stageId,
          status: stage.status,
          duration: stage.duration,
          startTime: stage.startTime,
          endTime: stage.endTime
        },
        message: '스테이지 상태가 업데이트되었습니다.'
      });

    } catch (error) {
      systemLogger.error('스테이지 업데이트 실패', {
        pipelineId: req.params.pipelineId,
        stageId: req.params.stageId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '스테이지 업데이트 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 로그 스트리밍
router.post('/pipelines/:pipelineId/logs',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const { stageId, logs } = req.body;
      const monitor = getMonitorInstance();

      if (!Array.isArray(logs)) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '로그는 배열 형태여야 합니다.'
        });
      }

      // 각 로그 엔트리를 스트리밍
      for (const logData of logs) {
        await monitor.streamPipelineLogs(pipelineId, stageId, logData);
      }

      res.json({
        success: true,
        data: {
          pipelineId,
          stageId,
          logsCount: logs.length
        },
        message: '로그가 스트리밍되었습니다.'
      });

    } catch (error) {
      systemLogger.error('로그 스트리밍 실패', {
        pipelineId: req.params.pipelineId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '로그 스트리밍 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 활성 파이프라인 목록 조회
router.get('/pipelines/active',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const monitor = getMonitorInstance();
      const pipelines = await monitor.getAllActivePipelines();

      res.json({
        success: true,
        data: {
          pipelines,
          count: pipelines.length
        },
        message: '활성 파이프라인 목록을 조회했습니다.'
      });

    } catch (error) {
      systemLogger.error('활성 파이프라인 조회 실패', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '활성 파이프라인 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 특정 파이프라인 상태 조회
router.get('/pipelines/:pipelineId/status',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const monitor = getMonitorInstance();
      const pipeline = await monitor.getPipelineStatus(pipelineId);

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: '파이프라인을 찾을 수 없습니다.'
        });
      }

      res.json({
        success: true,
        data: pipeline,
        message: '파이프라인 상태를 조회했습니다.'
      });

    } catch (error) {
      systemLogger.error('파이프라인 상태 조회 실패', {
        pipelineId: req.params.pipelineId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 상태 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 메트릭 조회
router.get('/metrics',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const monitor = getMonitorInstance();
      const metrics = await monitor.getPipelineMetrics();

      res.json({
        success: true,
        data: metrics,
        message: '파이프라인 메트릭을 조회했습니다.'
      });

    } catch (error) {
      systemLogger.error('파이프라인 메트릭 조회 실패', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 메트릭 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 취소
router.post('/pipelines/:pipelineId/cancel',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const { reason } = req.body;
      const monitor = getMonitorInstance();

      const pipeline = await monitor.updatePipelineStatus(pipelineId, 'cancelled', {
        reason: reason || '사용자 요청',
        cancelledBy: req.user.id,
        cancelledAt: new Date()
      });

      systemLogger.info('파이프라인 취소', {
        pipelineId,
        userId: req.user.id,
        reason
      });

      res.json({
        success: true,
        data: {
          pipelineId: pipeline.id,
          status: pipeline.status,
          cancelledAt: pipeline.completedAt
        },
        message: '파이프라인이 취소되었습니다.'
      });

    } catch (error) {
      systemLogger.error('파이프라인 취소 실패', {
        pipelineId: req.params.pipelineId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 취소 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 재시작
router.post('/pipelines/:pipelineId/restart',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const { fromStage } = req.body;
      const monitor = getMonitorInstance();

      // 기존 파이프라인 정보 가져오기
      const existingPipeline = await monitor.getPipelineStatus(pipelineId);
      if (!existingPipeline) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: '파이프라인을 찾을 수 없습니다.'
        });
      }

      // 새 파이프라인으로 재시작
      const newPipelineData = {
        ...existingPipeline,
        type: existingPipeline.type,
        projectId: existingPipeline.projectId,
        repositoryUrl: existingPipeline.repositoryUrl,
        branch: existingPipeline.branch,
        environment: existingPipeline.environment,
        userId: req.user.id,
        restartedFrom: pipelineId,
        restartedFromStage: fromStage
      };

      const newPipeline = await monitor.registerPipeline(newPipelineData);

      systemLogger.info('파이프라인 재시작', {
        originalPipelineId: pipelineId,
        newPipelineId: newPipeline.id,
        userId: req.user.id,
        fromStage
      });

      res.json({
        success: true,
        data: {
          originalPipelineId: pipelineId,
          newPipelineId: newPipeline.id,
          status: newPipeline.status,
          queuedAt: newPipeline.queuedAt
        },
        message: '파이프라인이 재시작되었습니다.'
      });

    } catch (error) {
      systemLogger.error('파이프라인 재시작 실패', {
        pipelineId: req.params.pipelineId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 재시작 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 히스토리 조회
router.get('/pipelines/history',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        projectId, 
        environment,
        startDate,
        endDate 
      } = req.query;

      const monitor = getMonitorInstance();
      
      // 데이터베이스에서 히스토리 조회 (구현 필요)
      const history = await monitor.getPipelineHistory({
        page: parseInt(page),
        limit: parseInt(limit),
        filters: {
          status,
          projectId,
          environment,
          startDate,
          endDate
        }
      });

      res.json({
        success: true,
        data: history,
        message: '파이프라인 히스토리를 조회했습니다.'
      });

    } catch (error) {
      systemLogger.error('파이프라인 히스토리 조회 실패', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 히스토리 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] WebSocket 연결 정보 조회
router.get('/websocket/info',
  jwtAuth.verifyToken,
  async (req, res) => {
    try {
      const monitor = getMonitorInstance();
      
      res.json({
        success: true,
        data: {
          websocketUrl: `ws://${req.get('host').split(':')[0]}:${process.env.PIPELINE_WS_PORT || 3002}`,
          protocols: ['pipeline-monitor-v1'],
          authentication: {
            required: true,
            method: 'jwt-token'
          },
          subscriptionTypes: [
            'pipeline_specific', // 특정 파이프라인 구독
            'all_pipelines',     // 모든 파이프라인 구독
            'project_pipelines'  // 프로젝트별 파이프라인 구독
          ]
        },
        message: 'WebSocket 연결 정보입니다.'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'WebSocket 정보 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 헬스체크
router.get('/health',
  async (req, res) => {
    try {
      const monitor = getMonitorInstance();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          websocket: monitor.wss ? 'running' : 'stopped',
          database: 'connected', // 실제 DB 연결 상태 체크 필요
          monitoring: 'active'
        },
        metrics: await monitor.getPipelineMetrics()
      };

      res.json({
        success: true,
        data: health,
        message: '실시간 파이프라인 모니터가 정상 작동 중입니다.'
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'ServiceUnavailable',
        message: '실시간 파이프라인 모니터에 문제가 있습니다.',
        details: error.message
      });
    }
  }
);

// [advice from AI] 에러 핸들러
router.use((error, req, res, next) => {
  systemLogger.error('실시간 파이프라인 API 오류', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: '실시간 파이프라인 모니터링에서 오류가 발생했습니다.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
