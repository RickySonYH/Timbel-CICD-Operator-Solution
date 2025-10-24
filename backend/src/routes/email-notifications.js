// [advice from AI] Email 알림 API 라우트

const express = require('express');
const router = express.Router();
const { getEmailNotificationService } = require('../services/emailNotificationService');

const emailService = getEmailNotificationService();

/**
 * @route   POST /api/email/test
 * @desc    Email 연결 테스트
 * @access  Private
 */
router.post('/test', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '수신자 이메일이 필요합니다'
      });
    }
    
    // 연결 테스트
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest.success) {
      return res.status(500).json({
        success: false,
        error: 'SMTP Connection Failed',
        message: connectionTest.error || connectionTest.message
      });
    }
    
    // 테스트 이메일 전송
    const result = await emailService.sendEmail(
      to,
      '✅ Timbel CI/CD Operator - Email 연결 테스트',
      `
        <h2>Email 연결 테스트 성공!</h2>
        <p>Timbel CI/CD Operator의 이메일 알림 시스템이 정상적으로 작동하고 있습니다.</p>
        <p>전송 시간: ${new Date().toLocaleString('ko-KR')}</p>
      `
    );
    
    res.json({
      success: result.success,
      message: result.success ? 'Email 연결 테스트 성공' : 'Email 전송 실패',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Email 테스트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/email/pipeline/started
 * @desc    파이프라인 시작 알림
 * @access  Private
 */
router.post('/pipeline/started', async (req, res) => {
  try {
    const { recipients, pipelineInfo } = req.body;
    
    if (!recipients || !pipelineInfo) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'recipients와 pipelineInfo가 필요합니다'
      });
    }
    
    const result = await emailService.notifyPipelineStarted(recipients, pipelineInfo);
    
    res.json({
      success: result.success,
      message: '파이프라인 시작 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Email 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/email/pipeline/success
 * @desc    파이프라인 성공 알림
 * @access  Private
 */
router.post('/pipeline/success', async (req, res) => {
  try {
    const { recipients, pipelineInfo } = req.body;
    
    if (!recipients || !pipelineInfo) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'recipients와 pipelineInfo가 필요합니다'
      });
    }
    
    const result = await emailService.notifyPipelineSuccess(recipients, pipelineInfo);
    
    res.json({
      success: result.success,
      message: '파이프라인 성공 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Email 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/email/pipeline/failure
 * @desc    파이프라인 실패 알림
 * @access  Private
 */
router.post('/pipeline/failure', async (req, res) => {
  try {
    const { recipients, pipelineInfo } = req.body;
    
    if (!recipients || !pipelineInfo) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'recipients와 pipelineInfo가 필요합니다'
      });
    }
    
    const result = await emailService.notifyPipelineFailure(recipients, pipelineInfo);
    
    res.json({
      success: result.success,
      message: '파이프라인 실패 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Email 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/email/rollback
 * @desc    롤백 알림
 * @access  Private
 */
router.post('/rollback', async (req, res) => {
  try {
    const { recipients, rollbackInfo } = req.body;
    
    if (!recipients || !rollbackInfo) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'recipients와 rollbackInfo가 필요합니다'
      });
    }
    
    const result = await emailService.notifyRollback(recipients, rollbackInfo);
    
    res.json({
      success: result.success,
      message: '롤백 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Email 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/email/approval
 * @desc    승인 요청 알림
 * @access  Private
 */
router.post('/approval', async (req, res) => {
  try {
    const { recipients, approvalInfo } = req.body;
    
    if (!recipients || !approvalInfo) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'recipients와 approvalInfo가 필요합니다'
      });
    }
    
    const result = await emailService.notifyApprovalRequired(recipients, approvalInfo);
    
    res.json({
      success: result.success,
      message: '승인 요청 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Email 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/email/config
 * @desc    Email 설정 확인
 * @access  Private
 */
router.get('/config', (req, res) => {
  try {
    const config = emailService.checkConfiguration();
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    console.error('❌ Email 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

