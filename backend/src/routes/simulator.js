// [advice from AI] ECP-AI K8s Orchestrator 시뮬레이터 API 엔드포인트
// 매니페스트 배포, 모니터링 데이터 조회, 인스턴스 관리

const express = require('express');
const router = express.Router();
const { getECPAISimulator } = require('../services/ecpAISimulator');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] 시뮬레이터 인스턴스 가져오기
const simulator = getECPAISimulator();

// [advice from AI] 매니페스트 배포 엔드포인트
router.post('/deploy', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    const { tenantId, manifest } = req.body;
    
    if (!tenantId || !manifest) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '테넌트 ID와 매니페스트는 필수입니다'
      });
    }
    
    console.log(`🚀 [시뮬레이터 API] 테넌트 ${tenantId} 매니페스트 배포 요청`);
    
    // [advice from AI] 시뮬레이터에 매니페스트 배포
    const result = await simulator.deployManifest(tenantId, manifest);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          deploymentId: result.deploymentId,
          status: result.status,
          services: result.services,
          message: '매니페스트 배포가 완료되었습니다'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Deployment Failed',
        message: result.error
      });
    }
    
  } catch (error) {
    console.error('시뮬레이터 배포 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '시뮬레이터 배포 중 오류가 발생했습니다'
    });
  }
});

// [advice from AI] 테넌트 모니터링 데이터 조회
router.get('/monitoring/:tenantId', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    console.log(`📊 [시뮬레이터 API] 테넌트 ${tenantId} 모니터링 데이터 조회`);
    
    const monitoringData = simulator.getMonitoringData(tenantId);
    
    if (monitoringData) {
      res.json({
        success: true,
        data: monitoringData
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '테넌트 모니터링 데이터를 찾을 수 없습니다'
      });
    }
    
  } catch (error) {
    console.error('모니터링 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '모니터링 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

// [advice from AI] 모든 테넌트 모니터링 데이터 조회
router.get('/monitoring', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    console.log('📊 [시뮬레이터 API] 전체 모니터링 데이터 조회');
    
    const allMonitoringData = simulator.getAllMonitoringData();
    
    res.json({
      success: true,
      data: {
        tenants: Object.keys(allMonitoringData).length,
        monitoring: allMonitoringData,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('전체 모니터링 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '전체 모니터링 데이터 조회 중 오류가 발생했습니다'
    });
  }
});

// [advice from AI] 테넌트 인스턴스 조회
router.get('/instance/:tenantId', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    console.log(`🔍 [시뮬레이터 API] 테넌트 ${tenantId} 인스턴스 조회`);
    
    const instance = simulator.getInstance(tenantId);
    
    if (instance) {
      res.json({
        success: true,
        data: instance
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '테넌트 인스턴스를 찾을 수 없습니다'
      });
    }
    
  } catch (error) {
    console.error('인스턴스 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '인스턴스 조회 중 오류가 발생했습니다'
    });
  }
});

// [advice from AI] 배포 상태 조회
router.get('/deployment/:deploymentId', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    const { deploymentId } = req.params;
    
    console.log(`📋 [시뮬레이터 API] 배포 ${deploymentId} 상태 조회`);
    
    const deployment = simulator.getDeployment(deploymentId);
    
    if (deployment) {
      res.json({
        success: true,
        data: deployment
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '배포 정보를 찾을 수 없습니다'
      });
    }
    
  } catch (error) {
    console.error('배포 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '배포 상태 조회 중 오류가 발생했습니다'
    });
  }
});

// [advice from AI] 테넌트 삭제
router.delete('/tenant/:tenantId', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    console.log(`🗑️ [시뮬레이터 API] 테넌트 ${tenantId} 삭제 요청`);
    
    const result = await simulator.deleteTenant(tenantId);
    
    if (result.success) {
      res.json({
        success: true,
        message: '테넌트가 성공적으로 삭제되었습니다'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Delete Failed',
        message: result.error
      });
    }
    
  } catch (error) {
    console.error('테넌트 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '테넌트 삭제 중 오류가 발생했습니다'
    });
  }
});

// [advice from AI] 시뮬레이터 상태 조회
router.get('/status', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    console.log('🔍 [시뮬레이터 API] 시뮬레이터 상태 조회');
    
    const allInstances = Array.from(simulator.instances.values());
    const allMonitoring = simulator.getAllMonitoringData();
    
    const status = {
      simulator: {
        status: 'running',
        version: '2.0',
        uptime: process.uptime(),
        instances: allInstances.length,
        activeTenants: Object.keys(allMonitoring).length
      },
      instances: allInstances.map(instance => ({
        tenantId: instance.tenantId,
        status: instance.status,
        services: instance.services.length,
        createdAt: instance.createdAt
      })),
      monitoring: {
        totalTenants: Object.keys(allMonitoring).length,
        averageCpu: Object.values(allMonitoring).reduce((sum, m) => sum + m.cpu, 0) / Object.keys(allMonitoring).length || 0,
        averageMemory: Object.values(allMonitoring).reduce((sum, m) => sum + m.memory, 0) / Object.keys(allMonitoring).length || 0,
        totalPods: Object.values(allMonitoring).reduce((sum, m) => sum + m.pods, 0)
      }
    };
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('시뮬레이터 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '시뮬레이터 상태 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;
