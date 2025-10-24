// [advice from AI] API v1 라우터
// 버전 1 API 엔드포인트

const express = require('express');
const router = express.Router();

// v1 헬스 체크
router.get('/health', (req, res) => {
  res.json({
    success: true,
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// v1 API 정보
router.get('/info', (req, res) => {
  res.json({
    success: true,
    version: 'v1',
    status: 'stable',
    features: [
      'Basic CRUD operations',
      'JWT Authentication',
      'Role-based access control'
    ]
  });
});

module.exports = router;

