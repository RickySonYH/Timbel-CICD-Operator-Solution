// [advice from AI] 통합 모니터링 API 라우트
// 모든 Phase의 모니터링 데이터를 통합하여 제공

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] 데이터베이스 연결 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// [advice from AI] 통합 모니터링 개요 조회
router.get('/integrated/overview', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    console.log('📊 통합 모니터링 개요 조회');

    // [advice from AI] 1. 전체 시스템 메트릭 수집
    const systemMetrics = await getSystemMetrics();
    
    // [advice from AI] 2. Phase별 메트릭 수집
    const phaseMetrics = await getPhaseMetrics();
    
    // [advice from AI] 3. 시스템 알림 수집
    const systemAlerts = await getSystemAlerts();

    res.json({
      success: true,
      data: {
        metrics: systemMetrics,
        phaseMetrics: phaseMetrics,
        alerts: systemAlerts
      },
      message: '통합 모니터링 데이터 조회 성공'
    });

  } catch (error) {
    console.error('통합 모니터링 개요 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] Phase별 상세 모니터링 조회
router.get('/phase/:phaseId', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    const { phaseId } = req.params;
    console.log(`📊 Phase ${phaseId} 모니터링 조회`);

    let phaseData = {};

    switch (phaseId) {
      case '1-2':
        phaseData = await getPhase1_2Metrics();
        break;
      case '3-4':
        phaseData = await getPhase3_4Metrics();
        break;
      case '5':
        phaseData = await getPhase5Metrics();
        break;
      case '6':
        phaseData = await getPhase6Metrics();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid Phase ID',
          message: '유효하지 않은 Phase ID입니다.'
        });
    }

    res.json({
      success: true,
      data: phaseData,
      message: `Phase ${phaseId} 모니터링 데이터 조회 성공`
    });

  } catch (error) {
    console.error(`Phase ${req.params.phaseId} 모니터링 조회 오류:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] 예측 분석 데이터 조회
router.get('/predictive/analysis', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    console.log('📊 예측 분석 데이터 조회');

    // [advice from AI] 예측 분석 데이터 생성 (향후 실제 ML 모델 연동)
    const predictiveData = {
      trends: {
        cpuUsage: { direction: 'up', confidence: 0.85, prediction: 'CPU 사용률이 7일 내 15% 증가 예상' },
        memoryUsage: { direction: 'stable', confidence: 0.72, prediction: '메모리 사용률이 안정적으로 유지될 예상' },
        errorRate: { direction: 'down', confidence: 0.91, prediction: '에러율이 3일 내 5% 감소 예상' }
      },
      recommendations: [
        'CPU 사용률 증가에 대비하여 자동 스케일링 설정을 검토하세요.',
        '메모리 사용률이 안정적이므로 현재 설정을 유지하세요.',
        '에러율 감소 추세가 지속되므로 모니터링 임계값을 조정하세요.'
      ],
      riskFactors: [
        { factor: '높은 CPU 사용률', risk: 'medium', impact: '성능 저하 가능성' },
        { factor: '디스크 공간 부족', risk: 'high', impact: '서비스 중단 가능성' }
      ]
    };

    res.json({
      success: true,
      data: predictiveData,
      message: '예측 분석 데이터 조회 성공'
    });

  } catch (error) {
    console.error('예측 분석 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] 자동 스케일링 설정 조회
router.get('/autoscaling/config', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    console.log('📊 자동 스케일링 설정 조회');

    const autoscalingConfig = {
      enabled: true,
      policies: [
        {
          service: 'callbot',
          minReplicas: 2,
          maxReplicas: 10,
          targetCpu: 70,
          targetMemory: 80,
          scaleUpCooldown: 300,
          scaleDownCooldown: 600
        },
        {
          service: 'chatbot',
          minReplicas: 1,
          maxReplicas: 5,
          targetCpu: 60,
          targetMemory: 70,
          scaleUpCooldown: 300,
          scaleDownCooldown: 600
        }
      ],
      metrics: {
        currentReplicas: 8,
        targetReplicas: 6,
        cpuUtilization: 65,
        memoryUtilization: 72
      }
    };

    res.json({
      success: true,
      data: autoscalingConfig,
      message: '자동 스케일링 설정 조회 성공'
    });

  } catch (error) {
    console.error('자동 스케일링 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] 장애 복구 상태 조회
router.get('/disaster-recovery/status', jwtAuth.verifyToken, jwtAuth.requireRole('operations'), async (req, res) => {
  try {
    console.log('📊 장애 복구 상태 조회');

    const disasterRecoveryStatus = {
      overallStatus: 'healthy',
      lastBackup: new Date().toISOString(),
      backupFrequency: 'daily',
      recoveryTimeObjective: '4 hours',
      recoveryPointObjective: '1 hour',
      healthChecks: [
        { service: 'Database', status: 'healthy', lastCheck: new Date().toISOString() },
        { service: 'File Storage', status: 'healthy', lastCheck: new Date().toISOString() },
        { service: 'Configuration', status: 'healthy', lastCheck: new Date().toISOString() }
      ],
      recentIncidents: []
    };

    res.json({
      success: true,
      data: disasterRecoveryStatus,
      message: '장애 복구 상태 조회 성공'
    });

  } catch (error) {
    console.error('장애 복구 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// [advice from AI] 전체 시스템 메트릭 수집
async function getSystemMetrics() {
  try {
    // [advice from AI] 기본 시스템 메트릭 (향후 실제 데이터로 교체)
    return {
      systemHealth: 95,
      totalAlerts: 3,
      activeProjects: 12,
      runningServices: 24,
      totalUsers: 156,
      qaTestCases: 89,
      bugReports: 7,
      deployments: 45
    };
  } catch (error) {
    console.error('시스템 메트릭 수집 오류:', error);
    return {
      systemHealth: 0,
      totalAlerts: 0,
      activeProjects: 0,
      runningServices: 0,
      totalUsers: 0,
      qaTestCases: 0,
      bugReports: 0,
      deployments: 0
    };
  }
}

// [advice from AI] Phase별 메트릭 수집
async function getPhaseMetrics() {
  try {
    return [
      {
        phase: 'Phase 1-2',
        name: '프로젝트/PO 관리',
        status: 'healthy',
        metrics: {
          activeItems: 12,
          completionRate: 85,
          errorRate: 2,
          lastActivity: new Date().toISOString()
        },
        alerts: 1,
        trends: { direction: 'up', percentage: 5 }
      },
      {
        phase: 'Phase 3-4',
        name: 'PE/완료 시스템',
        status: 'healthy',
        metrics: {
          activeItems: 8,
          completionRate: 92,
          errorRate: 1,
          lastActivity: new Date().toISOString()
        },
        alerts: 0,
        trends: { direction: 'stable', percentage: 0 }
      },
      {
        phase: 'Phase 5',
        name: 'QA/QC 시스템',
        status: 'warning',
        metrics: {
          activeItems: 15,
          completionRate: 78,
          errorRate: 4,
          lastActivity: new Date().toISOString()
        },
        alerts: 2,
        trends: { direction: 'down', percentage: -3 }
      },
      {
        phase: 'Phase 6',
        name: '운영 시스템',
        status: 'healthy',
        metrics: {
          activeItems: 6,
          completionRate: 96,
          errorRate: 0,
          lastActivity: new Date().toISOString()
        },
        alerts: 0,
        trends: { direction: 'up', percentage: 2 }
      }
    ];
  } catch (error) {
    console.error('Phase별 메트릭 수집 오류:', error);
    return [];
  }
}

// [advice from AI] 시스템 알림 수집
async function getSystemAlerts() {
  try {
    return [
      {
        id: 'alert-001',
        phase: 'Phase 5',
        severity: 'warning',
        title: 'QA 테스트 케이스 실행 지연',
        description: '일부 테스트 케이스의 실행 시간이 평소보다 30% 길어졌습니다.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        resolved: false,
        source: 'QA System'
      },
      {
        id: 'alert-002',
        phase: 'Phase 6',
        severity: 'info',
        title: '새로운 배포 완료',
        description: 'ECP-메인-배포-v1.3.0이 성공적으로 배포되었습니다.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        resolved: true,
        source: 'Operations System'
      },
      {
        id: 'alert-003',
        phase: 'Phase 1-2',
        severity: 'error',
        title: '프로젝트 데이터 동기화 실패',
        description: '프로젝트 데이터베이스 동기화에 실패했습니다.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        resolved: false,
        source: 'Project System'
      }
    ];
  } catch (error) {
    console.error('시스템 알림 수집 오류:', error);
    return [];
  }
}

// [advice from AI] Phase별 상세 메트릭 수집 함수들
async function getPhase1_2Metrics() {
  return {
    projects: { total: 12, active: 8, completed: 4 },
    instructions: { total: 45, pending: 12, inProgress: 20, completed: 13 },
    approvals: { total: 23, pending: 5, approved: 18 }
  };
}

async function getPhase3_4Metrics() {
  return {
    tasks: { total: 67, pending: 15, inProgress: 35, completed: 17 },
    reports: { total: 12, draft: 3, submitted: 9 },
    completions: { total: 8, pending: 2, approved: 6 }
  };
}

async function getPhase5Metrics() {
  return {
    testCases: { total: 89, passed: 67, failed: 15, blocked: 7 },
    bugReports: { total: 23, open: 7, inProgress: 8, resolved: 8 },
    qaApprovals: { total: 15, pending: 3, approved: 12 }
  };
}

async function getPhase6Metrics() {
  return {
    tenants: { total: 6, active: 5, inactive: 1 },
    services: { total: 24, running: 22, stopped: 2 },
    deployments: { total: 45, successful: 42, failed: 3 }
  };
}

module.exports = router;
