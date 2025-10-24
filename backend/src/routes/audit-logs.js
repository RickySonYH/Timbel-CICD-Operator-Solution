// [advice from AI] 감사 로그 API 라우트

const express = require('express');
const router = express.Router();
const { getAuditLogService } = require('../services/auditLogService');

const auditService = getAuditLogService();

/**
 * @route   GET /api/audit/logs
 * @desc    감사 로그 검색
 * @access  Private (Admin)
 */
router.get('/logs', async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      action: req.query.action,
      resource_type: req.query.resource_type,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
      limit: parseInt(req.query.limit || '100')
    };
    
    const result = await auditService.searchLogs(filters);
    
    res.json({
      success: result.success,
      data: result.data,
      count: result.count
    });
    
  } catch (error) {
    console.error('❌ 감사 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/users/:userId/activity
 * @desc    사용자 활동 통계
 * @access  Private (Admin)
 */
router.get('/users/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days || '30');
    
    const result = await auditService.getUserActivityStats(userId, days);
    
    res.json({
      success: result.success,
      data: result.data
    });
    
  } catch (error) {
    console.error('❌ 사용자 활동 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/audit/detect-suspicious/:userId
 * @desc    의심스러운 활동 탐지
 * @access  Private (Admin)
 */
router.post('/detect-suspicious/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeWindowMinutes = 5, threshold = 50 } = req.body;
    
    const result = await auditService.detectSuspiciousActivity(
      userId,
      timeWindowMinutes,
      threshold
    );
    
    res.json({
      success: result.success,
      data: result.data
    });
    
  } catch (error) {
    console.error('❌ 의심스러운 활동 탐지 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/security-events
 * @desc    보안 이벤트 목록
 * @access  Private (Admin)
 */
router.get('/security-events', async (req, res) => {
  try {
    const filters = {
      event_type: req.query.event_type,
      severity: req.query.severity,
      status: req.query.status,
      user_id: req.query.user_id,
      limit: parseInt(req.query.limit || '50')
    };
    
    const result = await auditService.getSecurityEvents(filters);
    
    res.json({
      success: result.success,
      data: result.data,
      count: result.count
    });
    
  } catch (error) {
    console.error('❌ 보안 이벤트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/audit/security-events
 * @desc    보안 이벤트 생성
 * @access  Private (Admin)
 */
router.post('/security-events', async (req, res) => {
  try {
    const eventData = req.body;
    
    const result = await auditService.createSecurityEvent(eventData);
    
    res.status(201).json({
      success: result.success,
      data: result.data,
      message: '보안 이벤트가 생성되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 보안 이벤트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/audit/dashboard-stats
 * @desc    대시보드 통계
 * @access  Private (Admin)
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days || '7');
    
    const result = await auditService.getDashboardStats(days);
    
    res.json({
      success: result.success,
      data: result.data,
      period_days: days
    });
    
  } catch (error) {
    console.error('❌ 대시보드 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/audit/cleanup
 * @desc    오래된 로그 정리
 * @access  Private (Admin)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body;
    
    const result = await auditService.cleanupOldLogs(retentionDays);
    
    res.json({
      success: result.success,
      deleted_count: result.deleted_count,
      message: `${result.deleted_count}개의 오래된 로그가 삭제되었습니다`
    });
    
  } catch (error) {
    console.error('❌ 로그 정리 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

