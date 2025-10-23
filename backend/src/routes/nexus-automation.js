// [advice from AI] Nexus 자동화 API 라우트
const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const nexusService = require('../services/nexusService');

// [advice from AI] Nexus 서버 상태 확인
router.get('/health', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 Nexus 서버 상태 확인...');
    const result = await nexusService.checkHealth();
    
    if (result.status === 'connected') {
      res.json({
        success: true,
        health: result,
        message: `Nexus 서버 연결됨 (버전: ${result.version}, Repositories: ${result.repositories_count}개)`
      });
    } else {
      res.status(500).json({
        success: false,
        health: result,
        message: 'Nexus 서버 연결 실패'
      });
    }
  } catch (error) {
    console.error('❌ Nexus 서버 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Nexus 서버 상태 확인 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Nexus 저장소 목록 조회
router.get('/repositories', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 Nexus 저장소 목록 조회...');
    const result = await nexusService.listRepositories();
    
    if (result.success) {
      res.json({
        success: true,
        repositories: result.repositories,
        total: result.total,
        message: `${result.total}개 Nexus 저장소 조회 완료`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        repositories: [],
        message: 'Nexus 서버 연결 실패'
      });
    }
  } catch (error) {
    console.error('❌ Nexus 저장소 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Nexus 저장소 목록 조회 중 오류가 발생했습니다.',
      message: error.message,
      repositories: []
    });
  }
});

// [advice from AI] Nexus 컴포넌트 목록 조회
router.get('/components', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 Nexus 컴포넌트 목록 조회...');
    const result = await nexusService.listComponents();
    
    if (result.success) {
      res.json({
        success: true,
        components: result.components,
        total: result.total,
        message: `${result.total}개 Nexus 컴포넌트 조회 완료`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        components: [],
        message: 'Nexus 서버 연결 실패'
      });
    }
  } catch (error) {
    console.error('❌ Nexus 컴포넌트 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Nexus 컴포넌트 목록 조회 중 오류가 발생했습니다.',
      message: error.message,
      components: []
    });
  }
});

// [advice from AI] Nexus 저장소 생성
router.post('/create-repository', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { name, type = 'hosted', format = 'maven2', version_policy = 'release' } = req.body;
    console.log('🔨 Nexus 저장소 생성 요청:', { name, type, format });
    
    const result = await nexusService.createRepository(name, {
      type,
      format,
      version_policy
    });
    
    if (result.success) {
      res.json({
        success: true,
        repository_name: result.repository_name,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Nexus 저장소 생성에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('❌ Nexus 저장소 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Nexus 저장소 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Nexus 저장소 삭제
router.delete('/delete-repository/:name', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    console.log('🗑️ Nexus 저장소 삭제 요청:', { name });
    
    const result = await nexusService.deleteRepository(name);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Nexus 저장소 삭제에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('❌ Nexus 저장소 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Nexus 저장소 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
