// [advice from AI] Kubernetes HPA 관리 API
// HPA 생성, 수정, 삭제, 조회

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const hpaService = require('../services/kubernetesHPA');

/**
 * GET /api/hpa
 * HPA 목록 조회
 */
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { namespace = 'default', context } = req.query;

    const result = await hpaService.listHPAs(namespace, context);

    res.json({
      success: true,
      data: result.hpas,
      total: result.total
    });
  } catch (error) {
    console.error('❌ HPA 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/hpa/:name
 * 특정 HPA 조회
 */
router.get('/:name', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', context } = req.query;

    const hpa = await hpaService.getHPA(name, namespace, context);

    res.json({
      success: true,
      data: hpa
    });
  } catch (error) {
    console.error('❌ HPA 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/hpa
 * HPA 생성
 */
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const {
      name,
      namespace = 'default',
      deployment,
      minReplicas = 2,
      maxReplicas = 10,
      targetCPU = 80,
      targetMemory = null,
      context = null
    } = req.body;

    if (!name || !deployment) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'name과 deployment는 필수입니다'
      });
    }

    const result = await hpaService.createHPA({
      name,
      namespace,
      deployment,
      minReplicas,
      maxReplicas,
      targetCPU,
      targetMemory,
      context
    });

    res.status(201).json({
      success: true,
      data: result.hpa,
      message: result.message
    });
  } catch (error) {
    console.error('❌ HPA 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * PUT /api/hpa/:name
 * HPA 수정
 */
router.put('/:name', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', context, ...updates } = req.body;

    const result = await hpaService.updateHPA(name, namespace, updates, context);

    res.json({
      success: true,
      data: result.hpa,
      message: result.message
    });
  } catch (error) {
    console.error('❌ HPA 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/hpa/:name
 * HPA 삭제
 */
router.delete('/:name', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', context } = req.query;

    const result = await hpaService.deleteHPA(name, namespace, context);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('❌ HPA 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/hpa/statistics/overview
 * HPA 통계 조회
 */
router.get('/statistics/overview', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { namespace, context } = req.query;

    const result = await hpaService.getHPAStatistics(namespace || null, context);

    res.json({
      success: true,
      data: result.statistics
    });
  } catch (error) {
    console.error('❌ HPA 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/hpa/:name/events
 * HPA 이벤트 조회
 */
router.get('/:name/events', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace = 'default', context } = req.query;

    const result = await hpaService.getHPAEvents(name, namespace, context);

    res.json({
      success: true,
      data: result.events
    });
  } catch (error) {
    console.error('❌ HPA 이벤트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

