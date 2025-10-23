// [advice from AI] ArgoCD 자동화 API 라우트
const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const argocdService = require('../services/argocdService');

// [advice from AI] ArgoCD 서버 상태 확인
router.get('/health', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 ArgoCD 서버 상태 확인...');
    const result = await argocdService.checkHealth();
    
    if (result.status === 'connected') {
      res.json({
        success: true,
        health: result,
        message: `ArgoCD 서버 연결됨 (버전: ${result.version}, Applications: ${result.applications_count}개)`
      });
    } else {
      res.status(500).json({
        success: false,
        health: result,
        message: 'ArgoCD 서버 연결 실패'
      });
    }
  } catch (error) {
    console.error('❌ ArgoCD 서버 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      error: 'ArgoCD 서버 상태 확인 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] ArgoCD 애플리케이션 목록 조회
router.get('/applications', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 ArgoCD 애플리케이션 목록 조회...');
    const result = await argocdService.listApplications();
    
    if (result.success) {
      res.json({
        success: true,
        applications: result.applications,
        total: result.total,
        message: `${result.total}개 ArgoCD 애플리케이션 조회 완료`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        applications: [],
        message: 'ArgoCD 서버 연결 실패'
      });
    }
  } catch (error) {
    console.error('❌ ArgoCD 애플리케이션 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'ArgoCD 애플리케이션 목록 조회 중 오류가 발생했습니다.',
      message: error.message,
      applications: []
    });
  }
});

// [advice from AI] ArgoCD 애플리케이션 생성
router.post('/create-application', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { name, repository_url, path = '.', destination_namespace = 'default', destination_server = 'https://kubernetes.default.svc' } = req.body;
    console.log('🔨 ArgoCD 애플리케이션 생성 요청:', { name, repository_url });
    
    const result = await argocdService.createApplication(name, {
      repository_url,
      path,
      destination_namespace,
      destination_server
    });
    
    if (result.success) {
      res.json({
        success: true,
        application_name: result.application_name,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'ArgoCD 애플리케이션 생성에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('❌ ArgoCD 애플리케이션 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'ArgoCD 애플리케이션 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] ArgoCD 애플리케이션 동기화
router.post('/sync-application', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { application_name } = req.body;
    console.log('🔄 ArgoCD 애플리케이션 동기화 요청:', { application_name });
    
    const result = await argocdService.syncApplication(application_name);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'ArgoCD 애플리케이션 동기화에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('❌ ArgoCD 애플리케이션 동기화 실패:', error);
    res.status(500).json({
      success: false,
      error: 'ArgoCD 애플리케이션 동기화 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] ArgoCD 애플리케이션 삭제
router.delete('/delete-application/:name', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    console.log('🗑️ ArgoCD 애플리케이션 삭제 요청:', { name });
    
    const result = await argocdService.deleteApplication(name);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'ArgoCD 애플리케이션 삭제에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('❌ ArgoCD 애플리케이션 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'ArgoCD 애플리케이션 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
