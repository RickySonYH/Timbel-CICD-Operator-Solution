// [advice from AI] 프로덕션 레벨 지능형 승인 어드바이저 API
// 단계별 체크리스트, 자동 검증, ML 예측, 위험 분석 제공

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const { checkAdvancedPermission } = require('./advanced-permissions');
const systemLogger = require('../middleware/systemLogger');
const IntelligentApprovalAdvisor = require('../services/intelligentApprovalAdvisor');

// [advice from AI] 싱글톤 인스턴스
let advisorInstance = null;
const getAdvisorInstance = () => {
  if (!advisorInstance) {
    advisorInstance = new IntelligentApprovalAdvisor();
  }
  return advisorInstance;
};

// [advice from AI] 프로젝트별 체크리스트 생성
router.get('/projects/:projectId/checklist/:stage', 
  jwtAuth.verifyToken, 
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { projectId, stage } = req.params;
      const advisor = getAdvisorInstance();

      systemLogger.info('체크리스트 생성 요청', {
        projectId,
        stage,
        userId: req.user?.id,
        endpoint: req.originalUrl
      });

      const result = await advisor.generateChecklistForProject(projectId, stage);

      // 자동 검증 실행 (비동기로 백그라운드에서)
      if (result.success && result.data.checklist) {
        Promise.all(
          result.data.checklist
            .filter(item => item.automatedCheck)
            .map(async (item) => {
              try {
                const validationResults = await advisor.executeValidationRules(projectId, item);
                return { itemId: item.id, validation: validationResults };
              } catch (error) {
                systemLogger.error('자동 검증 실패', { projectId, itemId: item.id, error: error.message });
                return { itemId: item.id, validation: { error: error.message } };
              }
            })
        ).then(validations => {
          // 검증 결과를 이벤트로 전송 (웹소켓 등으로 실시간 업데이트 가능)
          advisor.emit('validationComplete', { projectId, stage, validations });
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: '체크리스트가 성공적으로 생성되었습니다.',
        metadata: {
          stage,
          projectId,
          generatedAt: new Date().toISOString(),
          cacheUsed: result.fromCache || false
        }
      });

    } catch (error) {
      systemLogger.error('체크리스트 생성 실패', {
        projectId: req.params.projectId,
        stage: req.params.stage,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '체크리스트 생성 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// [advice from AI] 승인 점수 계산
router.post('/projects/:projectId/approval-score/:stage',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_approve_requests'),
  async (req, res) => {
    try {
      const { projectId, stage } = req.params;
      const { checklistResponses, additionalData } = req.body;
      const advisor = getAdvisorInstance();

      systemLogger.info('승인 점수 계산 요청', {
        projectId,
        stage,
        userId: req.user?.id,
        responseCount: Object.keys(checklistResponses || {}).length
      });

      // 입력 검증
      if (!checklistResponses || typeof checklistResponses !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '체크리스트 응답이 필요합니다.'
        });
      }

      const scoreResult = await advisor.calculateApprovalScore(projectId, stage, checklistResponses);
      
      // ML 기반 성공 예측 (병렬 실행)
      const successPrediction = await advisor.predictProjectSuccess(projectId, stage);
      
      // 유사 프로젝트 인사이트
      const similarInsights = await advisor.getSimilarProjectInsights(projectId, stage);

      // 종합 추천사항 생성
      const recommendations = advisor.generateRecommendations(scoreResult, successPrediction, similarInsights);

      // 결과 저장 (감사 로그)
      await advisor.saveApprovalAnalysis({
        projectId,
        stage,
        userId: req.user.id,
        score: scoreResult.score,
        recommendation: scoreResult.recommendation,
        responses: checklistResponses,
        mlPrediction: successPrediction,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: {
          approvalScore: scoreResult,
          successPrediction,
          similarInsights,
          recommendations,
          analysis: {
            totalChecked: Object.keys(checklistResponses).length,
            passedChecks: Object.values(checklistResponses).filter(v => v === true).length,
            criticalIssuesCount: scoreResult.criticalIssues.length,
            riskLevel: scoreResult.score >= 80 ? 'low' : scoreResult.score >= 60 ? 'medium' : 'high'
          }
        },
        message: '승인 분석이 완료되었습니다.',
        metadata: {
          analyzedAt: new Date().toISOString(),
          analyzer: 'IntelligentApprovalAdvisor v2.0'
        }
      });

    } catch (error) {
      systemLogger.error('승인 점수 계산 실패', {
        projectId: req.params.projectId,
        stage: req.params.stage,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '승인 분석 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 프로젝트 위험 분석
router.get('/projects/:projectId/risk-analysis',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const advisor = getAdvisorInstance();

      const riskAnalysis = await advisor.comprehensiveRiskAnalysis(projectId);

      res.json({
        success: true,
        data: riskAnalysis,
        message: '위험 분석이 완료되었습니다.'
      });

    } catch (error) {
      systemLogger.error('위험 분석 실패', {
        projectId: req.params.projectId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '위험 분석 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 베스트 프랙티스 추천
router.get('/best-practices/:stage',
  jwtAuth.verifyToken,
  async (req, res) => {
    try {
      const { stage } = req.params;
      const { businessType, complexity, teamSize } = req.query;
      const advisor = getAdvisorInstance();

      const bestPractices = await advisor.getContextualBestPractices(stage, {
        businessType,
        complexity,
        teamSize: parseInt(teamSize) || 5
      });

      res.json({
        success: true,
        data: {
          stage,
          practices: bestPractices,
          context: { businessType, complexity, teamSize }
        },
        message: '베스트 프랙티스가 조회되었습니다.'
      });

    } catch (error) {
      systemLogger.error('베스트 프랙티스 조회 실패', {
        stage: req.params.stage,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '베스트 프랙티스 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 어드바이저 성능 메트릭
router.get('/metrics',
  jwtAuth.verifyToken,
  jwtAuth.requireRole(['admin', 'operations']),
  async (req, res) => {
    try {
      const advisor = getAdvisorInstance();
      const metrics = advisor.getPerformanceMetrics();

      res.json({
        success: true,
        data: metrics,
        message: '성능 메트릭이 조회되었습니다.'
      });

    } catch (error) {
      systemLogger.error('메트릭 조회 실패', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '메트릭 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 어드바이저 설정 업데이트
router.put('/config',
  jwtAuth.verifyToken,
  jwtAuth.requireRole(['admin']),
  async (req, res) => {
    try {
      const { config } = req.body;
      const advisor = getAdvisorInstance();

      await advisor.updateConfiguration(config);

      systemLogger.info('어드바이저 설정 업데이트', {
        userId: req.user.id,
        config: config
      });

      res.json({
        success: true,
        message: '설정이 업데이트되었습니다.',
        data: advisor.getConfiguration()
      });

    } catch (error) {
      systemLogger.error('설정 업데이트 실패', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '설정 업데이트 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 실시간 검증 상태 조회
router.get('/projects/:projectId/validation-status/:stage',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { projectId, stage } = req.params;
      const advisor = getAdvisorInstance();

      const validationStatus = await advisor.getValidationStatus(projectId, stage);

      res.json({
        success: true,
        data: validationStatus,
        message: '검증 상태가 조회되었습니다.'
      });

    } catch (error) {
      systemLogger.error('검증 상태 조회 실패', {
        projectId: req.params.projectId,
        stage: req.params.stage,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '검증 상태 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 어드바이저 헬스체크
router.get('/health',
  async (req, res) => {
    try {
      const advisor = getAdvisorInstance();
      const health = await advisor.healthCheck();

      res.json({
        success: true,
        data: health,
        message: '어드바이저가 정상 작동 중입니다.'
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'ServiceUnavailable',
        message: '어드바이저 서비스에 문제가 있습니다.',
        details: error.message
      });
    }
  }
);

// [advice from AI] 에러 핸들러
router.use((error, req, res, next) => {
  systemLogger.error('지능형 승인 API 오류', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: '지능형 승인 서비스에서 오류가 발생했습니다.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
