// [advice from AI] 프로덕션 레벨 고급 모니터링 API 엔드포인트
// 실시간 메트릭, 지능형 알림, 성능 분석, 예측 시스템

const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const jwtAuth = require('../middleware/jwtAuth');
const { globalErrorHandler } = require('../middleware/globalErrorHandler');
const { intelligentAlertSystem } = require('../services/intelligentAlertSystem');
const { realTimeMetricsCollector } = require('../services/realTimeMetricsCollector');
const { performanceAnalyzer } = require('../services/performanceAnalyzer');

// [advice from AI] 실시간 메트릭 스트림 (Server-Sent Events)
router.get('/metrics/stream', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), (req, res) => {
  try {
    console.log(`📡 실시간 메트릭 스트림 연결: ${req.user?.username}`);
    
    // SSE 클라이언트 추가
    realTimeMetricsCollector.addSSEClient(res);
    
    // 연결 유지 (클라이언트가 연결을 끊을 때까지)
    req.on('close', () => {
      console.log(`📡 실시간 메트릭 스트림 연결 해제: ${req.user?.username}`);
    });
    
  } catch (error) {
    // [advice from AI] catch 블록에서 비동기 에러 처리
    globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    }).catch(console.error);
    
    res.status(500).json({
      success: false,
      error: '실시간 메트릭 스트림 연결 실패',
      message: error.message
    });
  }
});

// [advice from AI] 최근 메트릭 조회
router.get('/metrics/recent', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { limit = 100, collector = null } = req.query;
    
    let metrics;
    if (collector) {
      metrics = realTimeMetricsCollector.getCollectorMetrics(collector, parseInt(limit));
    } else {
      metrics = realTimeMetricsCollector.getRecentMetrics(parseInt(limit));
    }
    
    res.json({
      success: true,
      data: {
        metrics,
        count: metrics.length,
        collectors: Array.from(realTimeMetricsCollector.collectors.keys())
      },
      message: '최근 메트릭 조회 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '최근 메트릭 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 상태 종합 조회
router.get('/system/status', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const metricsStatus = realTimeMetricsCollector.getSystemStatus();
    const alertStatus = intelligentAlertSystem.getSystemStatus();
    const analyzerStatus = performanceAnalyzer.getSystemStatus();
    
    // 최근 메트릭으로 간단한 분석 수행
    const recentMetrics = realTimeMetricsCollector.getRecentMetrics(100);
    let quickAnalysis = null;
    
    if (recentMetrics.length > 10) {
      quickAnalysis = await performanceAnalyzer.analyzeMetrics(recentMetrics, 60 * 60 * 1000); // 1시간
    }
    
    const systemStatus = {
      timestamp: Date.now(),
      overall: {
        health: quickAnalysis?.summary?.overallHealth || 'unknown',
        activeComponents: 3,
        totalMetrics: metricsStatus.stats.totalMetrics,
        connectedClients: metricsStatus.stats.connectedClients,
        recentAlerts: alertStatus.recentAlerts.length
      },
      components: {
        metricsCollector: {
          status: 'active',
          details: metricsStatus
        },
        alertSystem: {
          status: 'active',
          details: alertStatus
        },
        performanceAnalyzer: {
          status: 'active',
          details: analyzerStatus
        }
      },
      quickAnalysis: quickAnalysis?.summary || null
    };
    
    res.json({
      success: true,
      data: systemStatus,
      message: '시스템 상태 조회 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '시스템 상태 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 성능 분석 실행
router.post('/analysis/performance', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { 
      timeRange = 24 * 60 * 60 * 1000, // 24시간
      collectors = null,
      includeDetails = true 
    } = req.body;
    
    console.log(`🔍 성능 분석 요청: ${req.user?.username} (시간 범위: ${timeRange}ms)`);
    
    // 메트릭 데이터 수집
    let metricsData;
    if (collectors && Array.isArray(collectors)) {
      metricsData = [];
      collectors.forEach(collector => {
        const collectorMetrics = realTimeMetricsCollector.getCollectorMetrics(collector, 1000);
        metricsData.push(...collectorMetrics);
      });
    } else {
      metricsData = realTimeMetricsCollector.getRecentMetrics(1000);
    }
    
    // 시간 범위 필터링
    const cutoffTime = Date.now() - timeRange;
    const filteredMetrics = metricsData.filter(metric => metric.timestamp >= cutoffTime);
    
    if (filteredMetrics.length < 10) {
      return res.status(400).json({
        success: false,
        error: '분석을 위한 데이터 부족',
        message: '성능 분석을 위해서는 최소 10개의 메트릭 데이터가 필요합니다'
      });
    }
    
    // 성능 분석 실행
    const analysis = await performanceAnalyzer.analyzeMetrics(filteredMetrics, timeRange);
    
    // 응답 데이터 구성
    const responseData = {
      analysis: {
        id: analysis.id,
        timestamp: analysis.timestamp,
        duration: analysis.duration,
        summary: analysis.summary,
        recommendations: analysis.recommendations
      }
    };
    
    if (includeDetails) {
      responseData.analysis.details = {
        metrics: analysis.metrics,
        trends: analysis.trends,
        anomalies: analysis.anomalies,
        predictions: analysis.predictions
      };
    }
    
    res.json({
      success: true,
      data: responseData,
      message: '성능 분석 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '성능 분석 실패',
      message: error.message
    });
  }
});

// [advice from AI] 지능형 알림 시스템 상태 조회
router.get('/alerts/system', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const status = intelligentAlertSystem.getSystemStatus();
    
    res.json({
      success: true,
      data: status,
      message: '지능형 알림 시스템 상태 조회 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '알림 시스템 상태 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 알림 히스토리 조회
router.get('/alerts/history', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const {
      limit = 50,
      severity = null,
      metricName = null,
      startTime = null,
      endTime = null
    } = req.query;
    
    const options = {
      limit: parseInt(limit),
      severity,
      metricName,
      startTime: startTime ? parseInt(startTime) : null,
      endTime: endTime ? parseInt(endTime) : null
    };
    
    const alerts = intelligentAlertSystem.getAlertHistory(options);
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        filters: options
      },
      message: '알림 히스토리 조회 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '알림 히스토리 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 특정 메트릭의 적응형 임계값 조회
router.get('/metrics/:metricName/thresholds', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { metricName } = req.params;
    
    const thresholds = intelligentAlertSystem.getMetricThresholds(metricName);
    
    if (!thresholds) {
      return res.status(404).json({
        success: false,
        error: '임계값 정보 없음',
        message: `메트릭 '${metricName}'에 대한 적응형 임계값이 설정되지 않았습니다`
      });
    }
    
    res.json({
      success: true,
      data: {
        metricName,
        thresholds,
        learningStatus: {
          dataPoints: thresholds.baseline ? 'sufficient' : 'insufficient',
          lastUpdated: thresholds.lastUpdated,
          confidence: thresholds.baseline ? 'high' : 'low'
        }
      },
      message: '적응형 임계값 조회 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '적응형 임계값 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 알림 채널 관리
router.get('/alerts/channels', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const status = intelligentAlertSystem.getSystemStatus();
    const channels = status.channels;
    
    res.json({
      success: true,
      data: {
        channels,
        totalChannels: channels.length,
        activeChannels: channels.filter(c => c.enabled).length
      },
      message: '알림 채널 조회 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '알림 채널 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 알림 채널 설정 업데이트
router.put('/alerts/channels/:channelName', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { channelName } = req.params;
    const { enabled, priority, severityFilter } = req.body;
    
    const channel = intelligentAlertSystem.alertChannels.get(channelName);
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: '알림 채널을 찾을 수 없습니다',
        message: `'${channelName}' 채널이 존재하지 않습니다`
      });
    }
    
    // 설정 업데이트
    if (enabled !== undefined) channel.enabled = enabled;
    if (priority !== undefined) channel.priority = priority;
    if (severityFilter !== undefined) channel.severityFilter = severityFilter;
    
    console.log(`🔧 관리자 ${req.user?.username}이 알림 채널 '${channelName}' 설정 변경`);
    
    res.json({
      success: true,
      data: {
        channelName,
        enabled: channel.enabled,
        priority: channel.priority,
        severityFilter: channel.severityFilter,
        stats: channel.stats
      },
      message: `알림 채널 '${channelName}' 설정 업데이트 완료`
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '알림 채널 설정 업데이트 실패',
      message: error.message
    });
  }
});

// [advice from AI] 수동 메트릭 학습 (테스트/개발용)
router.post('/metrics/learn', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { metricName, value, timestamp } = req.body;
    
    if (!metricName || value === undefined) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터 누락',
        message: 'metricName과 value는 필수입니다'
      });
    }
    
    const learningTimestamp = timestamp || Date.now();
    
    // 지능형 알림 시스템에 학습 데이터 제공
    intelligentAlertSystem.learnMetric(metricName, parseFloat(value), learningTimestamp);
    
    console.log(`🧠 수동 메트릭 학습: ${metricName} = ${value} (${req.user?.username})`);
    
    res.json({
      success: true,
      data: {
        metricName,
        value: parseFloat(value),
        timestamp: learningTimestamp,
        thresholds: intelligentAlertSystem.getMetricThresholds(metricName)
      },
      message: '메트릭 학습 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '메트릭 학습 실패',
      message: error.message
    });
  }
});

// [advice from AI] 대시보드 데이터 조회 (통합)
router.get('/dashboard', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { timeRange = 60 * 60 * 1000 } = req.query; // 기본 1시간
    
    console.log(`📊 모니터링 대시보드 데이터 요청: ${req.user?.username}`);
    
    // 최근 메트릭 데이터
    const recentMetrics = realTimeMetricsCollector.getRecentMetrics(200);
    const cutoffTime = Date.now() - parseInt(timeRange);
    const filteredMetrics = recentMetrics.filter(metric => metric.timestamp >= cutoffTime);
    
    // 시스템 상태
    const metricsStatus = realTimeMetricsCollector.getSystemStatus();
    const alertStatus = intelligentAlertSystem.getSystemStatus();
    
    // 간단한 성능 분석 (충분한 데이터가 있을 때만)
    let performanceInsights = null;
    if (filteredMetrics.length > 20) {
      try {
        const analysis = await performanceAnalyzer.analyzeMetrics(filteredMetrics, parseInt(timeRange));
        performanceInsights = {
          overallHealth: analysis.summary.overallHealth,
          criticalIssues: analysis.summary.criticalIssues,
          warnings: analysis.summary.warnings,
          topConcerns: analysis.summary.topConcerns,
          trends: analysis.summary.trends
        };
      } catch (analysisError) {
        console.warn('성능 분석 실패:', analysisError.message);
      }
    }
    
    // 최신 메트릭 요약
    const latestMetrics = this.summarizeLatestMetrics(filteredMetrics);
    
    // 활성 알림
    const activeAlerts = alertStatus.recentAlerts
      .filter(alert => alert.status === 'active')
      .slice(0, 5);
    
    const dashboardData = {
      timestamp: Date.now(),
      timeRange: parseInt(timeRange),
      overview: {
        systemHealth: performanceInsights?.overallHealth || 'unknown',
        totalMetrics: metricsStatus.stats.totalMetrics,
        metricsPerSecond: metricsStatus.stats.metricsPerSecond,
        connectedClients: metricsStatus.stats.connectedClients,
        activeAlerts: activeAlerts.length,
        criticalIssues: performanceInsights?.criticalIssues || 0
      },
      metrics: {
        latest: latestMetrics,
        collectors: metricsStatus.collectors.map(c => ({
          name: c.name,
          lastRun: c.lastRun,
          stats: c.stats
        }))
      },
      alerts: {
        active: activeAlerts,
        channels: alertStatus.channels.map(c => ({
          name: c.name,
          enabled: c.enabled,
          stats: c.stats
        }))
      },
      performance: performanceInsights,
      trends: performanceInsights?.trends || {}
    };
    
    res.json({
      success: true,
      data: dashboardData,
      message: '대시보드 데이터 조회 완료'
    });
    
  } catch (error) {
    await globalErrorHandler.handleError(error, {
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: '대시보드 데이터 조회 실패',
      message: error.message
    });
  }
});

// [advice from AI] 최신 메트릭 요약 헬퍼 함수
router.summarizeLatestMetrics = function(metrics) {
  const summary = {
    system: { cpu: null, memory: null, disk: null },
    database: { connections: null, queryTime: null },
    application: { uptime: null, memory: null }
  };
  
  // 가장 최근 메트릭들에서 데이터 추출
  const recentSystemMetrics = metrics
    .filter(m => m.collector === 'system')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 1);
    
  const recentDbMetrics = metrics
    .filter(m => m.collector === 'database')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 1);
    
  const recentAppMetrics = metrics
    .filter(m => m.collector === 'application')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 1);
  
  if (recentSystemMetrics.length > 0) {
    const data = recentSystemMetrics[0].data;
    summary.system = {
      cpu: data.cpu?.usage || null,
      memory: data.memory?.usage || null,
      disk: data.disk?.usage || null
    };
  }
  
  if (recentDbMetrics.length > 0) {
    const data = recentDbMetrics[0].data;
    summary.database = {
      connections: data.connections?.active || null,
      queryTime: data.queries?.avgTime || null
    };
  }
  
  if (recentAppMetrics.length > 0) {
    const data = recentAppMetrics[0].data;
    summary.application = {
      uptime: data.process?.uptime || null,
      memory: data.process?.memory?.heapUsed || null
    };
  }
  
  return summary;
};

// [advice from AI] 테스트 알림 발송 (개발/테스트용)
if (process.env.NODE_ENV !== 'production') {
  router.post('/alerts/test', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
    try {
      const { 
        metricName = 'test_metric',
        value = 100,
        severity = 'medium',
        message = '테스트 알림'
      } = req.body;
      
      // 테스트 알림 생성
      const alert = await intelligentAlertSystem.createAlert({
        metricName,
        value: parseFloat(value),
        severity,
        message,
        timestamp: Date.now(),
        type: 'test'
      });
      
      console.log(`🧪 테스트 알림 발송: ${req.user?.username}`);
      
      res.json({
        success: true,
        data: alert,
        message: '테스트 알림 발송 완료'
      });
      
    } catch (error) {
      await globalErrorHandler.handleError(error, {
        endpoint: req.originalUrl,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: '테스트 알림 발송 실패',
        message: error.message
      });
    }
  });
}

module.exports = router;
