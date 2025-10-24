// [advice from AI] Rate Limit 관리 API (관리자용)
// Rate Limit 상태 조회, 초기화

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const rateLimiter = require('../middleware/advancedRateLimiter');

/**
 * GET /api/rate-limit/status/:identifier
 * 특정 사용자/IP의 Rate Limit 상태 조회
 */
router.get('/status/:identifier', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { identifier } = req.params;

    const status = await rateLimiter.getStatus(identifier);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Rate Limit 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/rate-limit/reset/:identifier
 * 특정 사용자/IP의 Rate Limit 초기화
 */
router.delete('/reset/:identifier', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { identifier } = req.params;

    const result = await rateLimiter.resetLimit(identifier);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Rate Limit 초기화 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/rate-limit/config
 * Rate Limit 설정 조회
 */
router.get('/config', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: rateLimiter.enabled,
      roleLimits: rateLimiter.roleLimits,
      ipLimit: rateLimiter.ipLimit
    }
  });
});

module.exports = router;

