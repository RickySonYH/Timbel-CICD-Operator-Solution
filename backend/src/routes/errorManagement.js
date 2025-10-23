// [advice from AI] 프로덕션 레벨 에러 관리 API 엔드포인트
// Circuit Breaker, Dead Letter Queue, 에러 통계 관리

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const { circuitBreakerManager } = require('../utils/CircuitBreaker');
const { dlqManager } = require('../utils/DeadLetterQueue');
const { globalErrorHandler } = require('../middleware/globalErrorHandler');

// [advice from AI] Circuit Breaker 상태 조회
router.get('/circuit-breakers', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const states = circuitBreakerManager.getAllStates();
    
    res.json({
      success: true,
      data: states,
      message: 'Circuit Breaker 상태 조회 완료'
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Circuit Breaker 상태 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 특정 Circuit Breaker 상태 조회
router.get('/circuit-breakers/:name', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { name } = req.params;
    const breaker = circuitBreakerManager.get(name);
    
    if (!breaker) {
      return res.status(404).json({
        success: false,
        error: 'Circuit Breaker를 찾을 수 없습니다',
        message: `'${name}' Circuit Breaker가 존재하지 않습니다`
      });
    }
    
    const state = breaker.getState();
    
    res.json({
      success: true,
      data: state,
      message: `Circuit Breaker '${name}' 상태 조회 완료`
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Circuit Breaker 상태 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] Circuit Breaker 강제 리셋
router.post('/circuit-breakers/:name/reset', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { name } = req.params;
    const breaker = circuitBreakerManager.get(name);
    
    if (!breaker) {
      return res.status(404).json({
        success: false,
        error: 'Circuit Breaker를 찾을 수 없습니다',
        message: `'${name}' Circuit Breaker가 존재하지 않습니다`
      });
    }
    
    breaker.forceReset();
    
    console.log(`🔧 관리자 ${req.user?.username}이 Circuit Breaker '${name}' 강제 리셋`);
    
    res.json({
      success: true,
      data: breaker.getState(),
      message: `Circuit Breaker '${name}' 강제 리셋 완료`
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Circuit Breaker 리셋 실패',
      message: error.message
    });
  }
});

// [advice from AI] 모든 Circuit Breaker 강제 리셋
router.post('/circuit-breakers/reset-all', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    circuitBreakerManager.resetAll();
    
    console.log(`🔧 관리자 ${req.user?.username}이 모든 Circuit Breaker 강제 리셋`);
    
    const states = circuitBreakerManager.getAllStates();
    
    res.json({
      success: true,
      data: states,
      message: '모든 Circuit Breaker 강제 리셋 완료'
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '모든 Circuit Breaker 리셋 실패',
      message: error.message
    });
  }
});

// [advice from AI] Dead Letter Queue 상태 조회
router.get('/dead-letter-queues', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const status = dlqManager.getAllStatus();
    
    res.json({
      success: true,
      data: status,
      message: 'Dead Letter Queue 상태 조회 완료'
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Dead Letter Queue 상태 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 특정 DLQ 상태 조회
router.get('/dead-letter-queues/:name', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { name } = req.params;
    const dlq = dlqManager.get(name);
    
    if (!dlq) {
      return res.status(404).json({
        success: false,
        error: 'Dead Letter Queue를 찾을 수 없습니다',
        message: `'${name}' DLQ가 존재하지 않습니다`
      });
    }
    
    const status = dlq.getStatus();
    
    res.json({
      success: true,
      data: status,
      message: `Dead Letter Queue '${name}' 상태 조회 완료`
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Dead Letter Queue 상태 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] DLQ 수동 처리
router.post('/dead-letter-queues/:name/process', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { name } = req.params;
    const dlq = dlqManager.get(name);
    
    if (!dlq) {
      return res.status(404).json({
        success: false,
        error: 'Dead Letter Queue를 찾을 수 없습니다',
        message: `'${name}' DLQ가 존재하지 않습니다`
      });
    }
    
    const result = await dlq.manualProcess();
    
    console.log(`🔧 ${req.user?.username}이 DLQ '${name}' 수동 처리 실행`);
    
    res.json({
      success: true,
      data: {
        processed: result,
        status: dlq.getStatus()
      },
      message: `Dead Letter Queue '${name}' 수동 처리 완료`
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Dead Letter Queue 처리 실패',
      message: error.message
    });
  }
});

// [advice from AI] 모든 DLQ 수동 처리
router.post('/dead-letter-queues/process-all', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const results = await dlqManager.processAll();
    
    console.log(`🔧 관리자 ${req.user?.username}이 모든 DLQ 수동 처리 실행`);
    
    res.json({
      success: true,
      data: {
        results,
        status: dlqManager.getAllStatus()
      },
      message: '모든 Dead Letter Queue 수동 처리 완료'
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '모든 Dead Letter Queue 처리 실패',
      message: error.message
    });
  }
});

// [advice from AI] 특정 DLQ 아이템 강제 재시도
router.post('/dead-letter-queues/:name/items/:itemId/retry', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { name, itemId } = req.params;
    const dlq = dlqManager.get(name);
    
    if (!dlq) {
      return res.status(404).json({
        success: false,
        error: 'Dead Letter Queue를 찾을 수 없습니다',
        message: `'${name}' DLQ가 존재하지 않습니다`
      });
    }
    
    const item = await dlq.forceRetry(itemId);
    
    console.log(`🔧 ${req.user?.username}이 DLQ '${name}' 아이템 '${itemId}' 강제 재시도`);
    
    res.json({
      success: true,
      data: item,
      message: `DLQ 아이템 '${itemId}' 강제 재시도 완료`
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'DLQ 아이템 재시도 실패',
      message: error.message
    });
  }
});

// [advice from AI] 글로벌 에러 통계 조회
router.get('/error-statistics', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const stats = globalErrorHandler.getErrorStats();
    
    res.json({
      success: true,
      data: stats,
      message: '에러 통계 조회 완료'
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '에러 통계 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 에러 히스토리 초기화
router.post('/error-statistics/clear', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    globalErrorHandler.clearHistory();
    
    console.log(`🔧 관리자 ${req.user?.username}이 에러 히스토리 초기화`);
    
    res.json({
      success: true,
      data: globalErrorHandler.getErrorStats(),
      message: '에러 히스토리 초기화 완료'
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '에러 히스토리 초기화 실패',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 복구 상태 종합 조회
router.get('/recovery-status', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const circuitBreakerStates = circuitBreakerManager.getAllStates();
    const dlqStatus = dlqManager.getAllStatus();
    const errorStats = globalErrorHandler.getErrorStats();
    
    // 전체적인 시스템 건강도 계산
    const totalBreakers = circuitBreakerStates.globalStats.totalBreakers;
    const openBreakers = circuitBreakerStates.globalStats.openBreakers;
    const totalDLQItems = Object.values(dlqStatus).reduce((sum, dlq) => sum + dlq.queueSize, 0);
    const recentErrors = errorStats.recentErrors.length;
    
    let systemHealth = 'HEALTHY';
    if (openBreakers > 0 || totalDLQItems > 50 || recentErrors > 10) {
      systemHealth = 'DEGRADED';
    }
    if (openBreakers > totalBreakers * 0.5 || totalDLQItems > 100 || recentErrors > 50) {
      systemHealth = 'CRITICAL';
    }
    
    const recoveryStatus = {
      systemHealth,
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        total: totalBreakers,
        open: openBreakers,
        halfOpen: circuitBreakerStates.globalStats.halfOpenBreakers,
        closed: circuitBreakerStates.globalStats.closedBreakers,
        details: circuitBreakerStates.breakers
      },
      deadLetterQueues: {
        totalQueues: Object.keys(dlqStatus).length,
        totalItems: totalDLQItems,
        details: dlqStatus
      },
      errorStatistics: {
        recentErrorCount: recentErrors,
        totalErrors: errorStats.totalErrors,
        topErrors: errorStats.topErrors.slice(0, 5),
        errorsByCategory: errorStats.errorsByCategory
      },
      recommendations: []
    };
    
    // 복구 권장사항 생성
    if (openBreakers > 0) {
      recoveryStatus.recommendations.push({
        type: 'CIRCUIT_BREAKER',
        priority: 'HIGH',
        message: `${openBreakers}개의 Circuit Breaker가 OPEN 상태입니다. 외부 서비스 상태를 확인하고 필요시 강제 리셋하세요.`
      });
    }
    
    if (totalDLQItems > 20) {
      recoveryStatus.recommendations.push({
        type: 'DEAD_LETTER_QUEUE',
        priority: totalDLQItems > 50 ? 'HIGH' : 'MEDIUM',
        message: `${totalDLQItems}개의 실패한 작업이 DLQ에서 대기 중입니다. 수동 처리를 고려하세요.`
      });
    }
    
    if (recentErrors > 10) {
      recoveryStatus.recommendations.push({
        type: 'ERROR_RATE',
        priority: recentErrors > 30 ? 'HIGH' : 'MEDIUM',
        message: `최근 에러 발생률이 높습니다 (${recentErrors}개). 로그를 확인하고 근본 원인을 파악하세요.`
      });
    }
    
    res.json({
      success: true,
      data: recoveryStatus,
      message: '시스템 복구 상태 조회 완료'
    });
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '시스템 복구 상태 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 에러 처리 테스트 엔드포인트 (개발/테스트용)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-error', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
    try {
      const { errorType = 'generic', message = 'Test error' } = req.body;
      
      let testError;
      switch (errorType) {
        case 'database':
          testError = new Error(message);
          testError.code = 'ECONNRESET';
          break;
        case 'timeout':
          testError = new Error(message);
          testError.code = 'ETIMEDOUT';
          break;
        case 'validation':
          testError = new Error(message);
          testError.status = 400;
          break;
        case 'server':
          testError = new Error(message);
          testError.status = 500;
          break;
        default:
          testError = new Error(message);
      }
      
      await globalErrorHandler.handleError(testError, {
        endpoint: req.originalUrl,
        userId: req.user?.id,
        testMode: true
      });
      
      res.json({
        success: true,
        data: {
          errorType,
          message,
          processed: true
        },
        message: '테스트 에러 처리 완료'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '테스트 에러 처리 실패',
        message: error.message
      });
    }
  });
}

module.exports = router;
