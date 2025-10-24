// [advice from AI] SLA 모니터링 API
// Uptime, Response Time, Availability 조회

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const slaMonitor = require('../services/slaMonitor');

/**
 * GET /api/sla/targets
 * 모니터링 대상 목록 조회
 */
router.get('/targets', jwtAuth.verifyToken, async (req, res) => {
  try {
    const targets = await slaMonitor.getAllTargetsStatus();

    res.json({
      success: true,
      data: targets,
      total: targets.length
    });
  } catch (error) {
    console.error('❌ 모니터링 대상 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/sla/targets
 * 모니터링 대상 추가
 */
router.post('/targets', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { name, url, type, method, expected_status, timeout } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'name과 url은 필수입니다'
      });
    }

    const target = await slaMonitor.addTarget({
      name,
      url,
      type,
      method,
      expected_status,
      timeout
    });

    res.status(201).json({
      success: true,
      data: target,
      message: '모니터링 대상이 추가되었습니다'
    });
  } catch (error) {
    console.error('❌ 모니터링 대상 추가 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/sla/targets/:id
 * 모니터링 대상 삭제
 */
router.delete('/targets/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { id } = req.params;

    await slaMonitor.removeTarget(parseInt(id));

    res.json({
      success: true,
      message: '모니터링 대상이 삭제되었습니다'
    });
  } catch (error) {
    console.error('❌ 모니터링 대상 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/sla/targets/:id/statistics
 * 특정 대상의 SLA 통계 조회
 */
router.get('/targets/:id/statistics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '24h' } = req.query;

    const statistics = await slaMonitor.getSLAStatistics(parseInt(id), period);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('❌ SLA 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/sla/targets/:id/history
 * 특정 대상의 체크 이력 조회
 */
router.get('/targets/:id/history', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const history = await slaMonitor.getRecentResults(parseInt(id), parseInt(limit));

    res.json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (error) {
    console.error('❌ 체크 이력 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/sla/targets/:id/check
 * 즉시 체크 실행
 */
router.post('/targets/:id/check', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { id } = req.params;

    // 대상 찾기
    const allTargets = await slaMonitor.getAllTargetsStatus();
    const target = allTargets.find(t => t.id === parseInt(id));

    if (!target) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '모니터링 대상을 찾을 수 없습니다'
      });
    }

    // 체크 실행
    const result = await slaMonitor.checkTarget({
      id: target.id,
      name: target.name,
      url: target.url,
      type: target.type,
      method: 'GET',
      expected_status: 200,
      timeout: 5000
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ 즉시 체크 실행 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/sla/dashboard
 * SLA 대시보드 데이터 조회
 */
router.get('/dashboard', jwtAuth.verifyToken, async (req, res) => {
  try {
    const targets = await slaMonitor.getAllTargetsStatus();

    const totalTargets = targets.length;
    const upTargets = targets.filter(t => t.current_status === 'up').length;
    const downTargets = targets.filter(t => t.current_status === 'down').length;
    const degradedTargets = targets.filter(t => t.current_status === 'degraded').length;

    const avgUptime = targets.reduce((sum, t) => sum + (parseFloat(t.uptime_24h) || 0), 0) / (totalTargets || 1);
    const avgResponseTime = targets.reduce((sum, t) => sum + (t.last_response_time || 0), 0) / (totalTargets || 1);

    res.json({
      success: true,
      data: {
        summary: {
          totalTargets,
          upTargets,
          downTargets,
          degradedTargets,
          avgUptime: Math.round(avgUptime * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime)
        },
        targets: targets.map(t => ({
          id: t.id,
          name: t.name,
          url: t.url,
          status: t.current_status,
          uptime24h: parseFloat(t.uptime_24h) || 0,
          lastResponseTime: t.last_response_time,
          lastCheckedAt: t.last_checked_at
        }))
      }
    });
  } catch (error) {
    console.error('❌ SLA 대시보드 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

