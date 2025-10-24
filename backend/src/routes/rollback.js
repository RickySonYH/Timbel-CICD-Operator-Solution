// [advice from AI] 자동 롤백 API 라우트

const express = require('express');
const router = express.Router();
const { getAutoRollbackService } = require('../services/autoRollbackService');

const rollbackService = getAutoRollbackService();

/**
 * @route   POST /api/rollback/trigger/:executionId
 * @desc    수동 롤백 트리거
 * @access  Private
 */
router.post('/trigger/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    
    console.log(`🔄 수동 롤백 요청: ${executionId}`);
    
    const result = await rollbackService.triggerManualRollback(executionId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: '롤백이 성공적으로 완료되었습니다'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Rollback Failed',
        message: result.message || result.error
      });
    }
    
  } catch (error) {
    console.error('❌ 롤백 트리거 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/rollback/auto
 * @desc    자동 롤백 실행 (배포 실패 감지 시)
 * @access  Private
 */
router.post('/auto', async (req, res) => {
  try {
    const { execution_id, deployment_info } = req.body;
    
    if (!execution_id || !deployment_info) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'execution_id와 deployment_info가 필요합니다'
      });
    }
    
    console.log(`🚨 자동 롤백 처리: ${execution_id}`);
    
    const result = await rollbackService.handleDeploymentFailure(
      execution_id,
      deployment_info
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: '자동 롤백이 완료되었습니다'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Auto Rollback Failed',
        message: result.message || result.error
      });
    }
    
  } catch (error) {
    console.error('❌ 자동 롤백 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/rollback/config
 * @desc    롤백 설정 조회
 * @access  Private
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: rollbackService.config
    });
    
  } catch (error) {
    console.error('❌ 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/rollback/config
 * @desc    롤백 설정 업데이트
 * @access  Private (Admin only)
 */
router.put('/config', (req, res) => {
  try {
    const updates = req.body;
    
    // 설정 업데이트
    Object.keys(updates).forEach(key => {
      if (key in rollbackService.config) {
        rollbackService.config[key] = updates[key];
      }
    });
    
    console.log('✅ 롤백 설정 업데이트:', updates);
    
    res.json({
      success: true,
      data: rollbackService.config,
      message: '설정이 업데이트되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 설정 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

