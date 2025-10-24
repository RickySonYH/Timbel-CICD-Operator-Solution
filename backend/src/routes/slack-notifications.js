// [advice from AI] Slack 알림 API 라우트

const express = require('express');
const router = express.Router();
const { getSlackNotificationService } = require('../services/slackNotificationService');

const slackService = getSlackNotificationService();

/**
 * @route   POST /api/slack/test
 * @desc    Slack 연결 테스트
 * @access  Private
 */
router.post('/test', async (req, res) => {
  try {
    const { channel } = req.body;
    
    const result = await slackService.sendSimpleMessage(
      '✅ Timbel CI/CD Operator - Slack 연결 테스트 성공!',
      channel
    );
    
    res.json({
      success: result.success,
      message: result.success ? 'Slack 연결 테스트 성공' : 'Slack 연결 실패',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 테스트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/slack/pipeline/started
 * @desc    파이프라인 시작 알림
 * @access  Private
 */
router.post('/pipeline/started', async (req, res) => {
  try {
    const pipelineInfo = req.body;
    
    const result = await slackService.notifyPipelineStarted(pipelineInfo);
    
    res.json({
      success: result.success,
      message: '파이프라인 시작 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/slack/pipeline/success
 * @desc    파이프라인 성공 알림
 * @access  Private
 */
router.post('/pipeline/success', async (req, res) => {
  try {
    const pipelineInfo = req.body;
    
    const result = await slackService.notifyPipelineSuccess(pipelineInfo);
    
    res.json({
      success: result.success,
      message: '파이프라인 성공 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/slack/pipeline/failure
 * @desc    파이프라인 실패 알림
 * @access  Private
 */
router.post('/pipeline/failure', async (req, res) => {
  try {
    const pipelineInfo = req.body;
    
    const result = await slackService.notifyPipelineFailure(pipelineInfo);
    
    res.json({
      success: result.success,
      message: '파이프라인 실패 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/slack/rollback
 * @desc    롤백 알림
 * @access  Private
 */
router.post('/rollback', async (req, res) => {
  try {
    const rollbackInfo = req.body;
    
    const result = await slackService.notifyRollback(rollbackInfo);
    
    res.json({
      success: result.success,
      message: '롤백 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/slack/approval
 * @desc    승인 요청 알림
 * @access  Private
 */
router.post('/approval', async (req, res) => {
  try {
    const approvalInfo = req.body;
    
    const result = await slackService.notifyApprovalRequired(approvalInfo);
    
    res.json({
      success: result.success,
      message: '승인 요청 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/slack/alert
 * @desc    시스템 경고 알림
 * @access  Private
 */
router.post('/alert', async (req, res) => {
  try {
    const alertInfo = req.body;
    
    const result = await slackService.notifySystemAlert(alertInfo);
    
    res.json({
      success: result.success,
      message: '시스템 경고 알림 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/slack/custom
 * @desc    커스텀 메시지 전송
 * @access  Private
 */
router.post('/custom', async (req, res) => {
  try {
    const { blocks, text, channel } = req.body;
    
    const result = await slackService.sendCustomMessage(blocks, text, channel);
    
    res.json({
      success: result.success,
      message: '커스텀 메시지 전송 완료',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Slack 알림 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/slack/config
 * @desc    Slack 설정 확인
 * @access  Private
 */
router.get('/config', (req, res) => {
  try {
    const config = slackService.checkConfiguration();
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    console.error('❌ Slack 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

