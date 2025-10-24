// [advice from AI] 클러스터 리소스 모니터링 API 라우트
// Kubernetes 클러스터의 실시간 리소스 사용량 모니터링

const express = require('express');
const router = express.Router();
const clusterResourceMonitor = require('../services/clusterResourceMonitor');

// [advice from AI] ===== 클러스터 전체 리소스 현황 =====

/**
 * GET /api/cluster-monitor/resources
 * 클러스터 전체 리소스 현황 조회
 */
router.get('/resources', async (req, res) => {
  try {
    const { cluster = 'default' } = req.query;

    console.log(`📊 클러스터 리소스 조회: ${cluster}`);

    const resources = await clusterResourceMonitor.getClusterResources(cluster);

    res.json({
      success: true,
      data: resources,
      message: '클러스터 리소스 조회 완료'
    });

  } catch (error) {
    console.error('❌ 클러스터 리소스 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/cluster-monitor/resources/summary
 * 클러스터 리소스 요약 정보
 */
router.get('/resources/summary', async (req, res) => {
  try {
    const { cluster = 'default' } = req.query;

    const resources = await clusterResourceMonitor.getClusterResources(cluster);

    res.json({
      success: true,
      data: resources.summary,
      message: '클러스터 리소스 요약 조회 완료'
    });

  } catch (error) {
    console.error('❌ 클러스터 리소스 요약 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] ===== 노드별 상세 메트릭 =====

/**
 * GET /api/cluster-monitor/nodes/:nodeName/metrics
 * 특정 노드의 상세 메트릭 조회
 */
router.get('/nodes/:nodeName/metrics', async (req, res) => {
  try {
    const { nodeName } = req.params;
    const { timeRange = '1h' } = req.query;

    console.log(`📊 노드 메트릭 조회: ${nodeName}, 시간 범위: ${timeRange}`);

    const metrics = await clusterResourceMonitor.getNodeMetrics(nodeName, timeRange);

    res.json({
      success: true,
      data: metrics,
      message: '노드 메트릭 조회 완료'
    });

  } catch (error) {
    console.error('❌ 노드 메트릭 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/cluster-monitor/nodes
 * 모든 노드의 현재 상태 조회
 */
router.get('/nodes', async (req, res) => {
  try {
    const { cluster = 'default' } = req.query;

    const resources = await clusterResourceMonitor.getClusterResources(cluster);

    res.json({
      success: true,
      data: resources.nodes,
      message: '노드 목록 조회 완료'
    });

  } catch (error) {
    console.error('❌ 노드 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] ===== Namespace별 리소스 =====

/**
 * GET /api/cluster-monitor/namespaces
 * Namespace별 리소스 사용 현황
 */
router.get('/namespaces', async (req, res) => {
  try {
    const { cluster = 'default' } = req.query;

    console.log(`📊 Namespace 리소스 조회: ${cluster}`);

    const namespaces = await clusterResourceMonitor.getNamespaceResources(cluster);

    res.json({
      success: true,
      data: namespaces,
      message: 'Namespace 리소스 조회 완료'
    });

  } catch (error) {
    console.error('❌ Namespace 리소스 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] ===== 리소스 알림 및 임계값 =====

/**
 * POST /api/cluster-monitor/alerts/check
 * 리소스 임계값 체크 및 알림 생성
 */
router.post('/alerts/check', async (req, res) => {
  try {
    const { cluster = 'default', thresholds } = req.body;

    console.log(`🚨 리소스 임계값 체크: ${cluster}`);

    const alerts = await clusterResourceMonitor.checkResourceThresholds(cluster, thresholds);

    res.json({
      success: true,
      data: {
        alert_count: alerts.length,
        critical_count: alerts.filter(a => a.severity === 'critical').length,
        warning_count: alerts.filter(a => a.severity === 'warning').length,
        alerts: alerts
      },
      message: '리소스 임계값 체크 완료'
    });

  } catch (error) {
    console.error('❌ 리소스 임계값 체크 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/cluster-monitor/alerts
 * 현재 활성 알림 목록 조회
 */
router.get('/alerts', async (req, res) => {
  try {
    const { cluster = 'default' } = req.query;

    const alerts = await clusterResourceMonitor.checkResourceThresholds(cluster);

    res.json({
      success: true,
      data: alerts,
      message: '활성 알림 조회 완료'
    });

  } catch (error) {
    console.error('❌ 활성 알림 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] ===== 캐시 관리 =====

/**
 * DELETE /api/cluster-monitor/cache
 * 캐시 초기화
 */
router.delete('/cache', async (req, res) => {
  try {
    clusterResourceMonitor.clearCache();

    res.json({
      success: true,
      message: '캐시가 초기화되었습니다'
    });

  } catch (error) {
    console.error('❌ 캐시 초기화 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] ===== Health Check =====

/**
 * GET /api/cluster-monitor/health
 * 모니터링 서비스 상태 확인
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: '클러스터 리소스 모니터링 서비스 정상'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;

