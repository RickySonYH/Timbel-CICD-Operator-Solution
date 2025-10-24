// [advice from AI] 멀티 클러스터 배포 API 라우트

const express = require('express');
const router = express.Router();
const multiClusterDeployment = require('../services/multiClusterDeployment');

/**
 * POST /api/multi-cluster/deploy
 * 여러 클러스터에 동시 배포
 */
router.post('/deploy', async (req, res) => {
  try {
    const deploymentConfig = req.body;

    const result = await multiClusterDeployment.deployToMultipleClusters(deploymentConfig);

    res.json({
      success: true,
      data: result,
      message: '멀티 클러스터 배포가 시작되었습니다'
    });

  } catch (error) {
    console.error('❌ 멀티 클러스터 배포 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-cluster/clusters
 * 사용 가능한 클러스터 목록 조회
 */
router.get('/clusters', async (req, res) => {
  try {
    const clusters = await multiClusterDeployment.getAvailableClusters();

    res.json({
      success: true,
      data: clusters,
      message: '클러스터 목록 조회 완료'
    });

  } catch (error) {
    console.error('❌ 클러스터 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-cluster/deployments/:deploymentId
 * 배포 상태 조회
 */
router.get('/deployments/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const deployment = multiClusterDeployment.getDeploymentStatus(deploymentId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: '배포를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      data: deployment
    });

  } catch (error) {
    console.error('❌ 배포 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-cluster/deployments
 * 모든 배포 이력 조회
 */
router.get('/deployments', async (req, res) => {
  try {
    const deployments = multiClusterDeployment.getAllDeployments();

    res.json({
      success: true,
      data: deployments
    });

  } catch (error) {
    console.error('❌ 배포 이력 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

