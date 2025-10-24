// [advice from AI] 파이프라인 실행 이력 API 라우트

const express = require('express');
const router = express.Router();
const { getPipelineHistoryService } = require('../services/pipelineHistoryService');

const historyService = getPipelineHistoryService();

/**
 * @route   GET /api/pipeline-history/executions
 * @desc    파이프라인 실행 이력 조회
 * @access  Private
 */
router.get('/executions', async (req, res) => {
  try {
    const {
      pipeline_id,
      status,
      trigger_type,
      deployment_target,
      from_date,
      to_date,
      limit = 50
    } = req.query;
    
    const filters = {
      pipeline_id,
      status,
      trigger_type,
      deployment_target,
      from_date,
      to_date,
      limit: parseInt(limit)
    };
    
    const executions = await historyService.getExecutionHistory(filters);
    
    res.json({
      success: true,
      data: executions,
      count: executions.length
    });
    
  } catch (error) {
    console.error('❌ 실행 이력 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/pipeline-history/executions/:executionId
 * @desc    파이프라인 실행 상세 조회
 * @access  Private
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const execution = await historyService.getExecutionDetail(executionId);
    
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '실행 이력을 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      data: execution
    });
    
  } catch (error) {
    console.error('❌ 실행 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/pipeline-history/executions
 * @desc    파이프라인 실행 시작 기록
 * @access  Private
 */
router.post('/executions', async (req, res) => {
  try {
    const executionData = req.body;
    
    const execution = await historyService.startExecution(executionData);
    
    res.status(201).json({
      success: true,
      data: execution,
      message: '파이프라인 실행이 시작되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 실행 시작 기록 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/pipeline-history/executions/:executionId/complete
 * @desc    파이프라인 실행 완료 기록
 * @access  Private
 */
router.put('/executions/:executionId/complete', async (req, res) => {
  try {
    const { executionId } = req.params;
    const completionData = req.body;
    
    const execution = await historyService.completeExecution(executionId, completionData);
    
    res.json({
      success: true,
      data: execution,
      message: '파이프라인 실행이 완료되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 실행 완료 기록 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/pipeline-history/executions/:executionId/stages
 * @desc    스테이지 실행 시작 기록
 * @access  Private
 */
router.post('/executions/:executionId/stages', async (req, res) => {
  try {
    const { executionId } = req.params;
    const stageData = req.body;
    
    const stage = await historyService.startStageExecution(executionId, stageData);
    
    res.status(201).json({
      success: true,
      data: stage,
      message: '스테이지 실행이 시작되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 스테이지 실행 시작 기록 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/pipeline-history/stages/:stageId/complete
 * @desc    스테이지 실행 완료 기록
 * @access  Private
 */
router.put('/stages/:stageId/complete', async (req, res) => {
  try {
    const { stageId } = req.params;
    const completionData = req.body;
    
    const stage = await historyService.completeStageExecution(stageId, completionData);
    
    res.json({
      success: true,
      data: stage,
      message: '스테이지 실행이 완료되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 스테이지 실행 완료 기록 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/pipeline-history/executions/:executionId/artifacts
 * @desc    아티팩트 추가
 * @access  Private
 */
router.post('/executions/:executionId/artifacts', async (req, res) => {
  try {
    const { executionId } = req.params;
    const artifactData = req.body;
    
    const artifact = await historyService.addArtifact(executionId, artifactData);
    
    res.status(201).json({
      success: true,
      data: artifact,
      message: '아티팩트가 추가되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 아티팩트 추가 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/pipeline-history/executions/:executionId/metrics
 * @desc    메트릭 기록
 * @access  Private
 */
router.post('/executions/:executionId/metrics', async (req, res) => {
  try {
    const { executionId } = req.params;
    const metricData = req.body;
    
    const metric = await historyService.recordMetric(executionId, metricData);
    
    res.status(201).json({
      success: true,
      data: metric,
      message: '메트릭이 기록되었습니다'
    });
    
  } catch (error) {
    console.error('❌ 메트릭 기록 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/pipeline-history/statistics/:pipelineId
 * @desc    파이프라인 통계 조회
 * @access  Private
 */
router.get('/statistics/:pipelineId', async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const { days = 30 } = req.query;
    
    const stats = await historyService.getPipelineStatistics(pipelineId, parseInt(days));
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '통계 데이터를 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/pipeline-history/statistics
 * @desc    전체 통계 조회
 * @access  Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await historyService.getPipelineStatistics(null, parseInt(days));
    
    res.json({
      success: true,
      data: stats || []
    });
    
  } catch (error) {
    console.error('❌ 전체 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/pipeline-history/slow-pipelines
 * @desc    느린 파이프라인 탐지
 * @access  Private
 */
router.get('/slow-pipelines', async (req, res) => {
  try {
    const { 
      threshold = 300,
      days = 7 
    } = req.query;
    
    const slowPipelines = await historyService.detectSlowPipelines(
      parseInt(threshold),
      parseInt(days)
    );
    
    res.json({
      success: true,
      data: slowPipelines,
      count: slowPipelines.length,
      threshold_seconds: parseInt(threshold),
      days: parseInt(days)
    });
    
  } catch (error) {
    console.error('❌ 느린 파이프라인 탐지 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/pipeline-history/dashboard-stats
 * @desc    대시보드 통계
 * @access  Private
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const stats = await historyService.getDashboardStats(parseInt(days));
    
    res.json({
      success: true,
      data: stats,
      period_days: parseInt(days)
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

module.exports = router;

