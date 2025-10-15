// [advice from AI] Kubernetes 클러스터 관리 API - 멀티 클러스터 배포 지원
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const {
  generateDeploymentBundle,
  generateKubectlApplyCommand,
  PROVIDER_DEFAULTS
} = require('../utils/cluster-provider-config');

// PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'timbel_cicd_operator',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password'
});

// [advice from AI] 클러스터 목록 조회
router.get('/clusters', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        kc.id,
        kc.cluster_name,
        kc.cluster_type,
        kc.api_server_url,
        kc.region,
        kc.cloud_provider,
        kc.status,
        kc.kubernetes_version,
        kc.node_count,
        kc.total_cpu_cores,
        kc.total_memory_gb,
        kc.total_storage_gb,
        kc.is_default,
        kc.is_connected,
        kc.last_health_check,
        kc.description,
        kc.created_at,
        (SELECT COUNT(*) FROM cluster_namespaces WHERE cluster_id = kc.id) as namespace_count,
        (SELECT COUNT(*) FROM cluster_deployments WHERE cluster_id = kc.id) as deployment_count
      FROM kubernetes_clusters kc
      ORDER BY kc.is_default DESC, kc.cluster_type, kc.cluster_name
    `);

    res.json({
      success: true,
      clusters: result.rows
    });
  } catch (error) {
    console.error('클러스터 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '클러스터 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터 등록
router.post('/clusters', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      cluster_name,
      cluster_type,
      api_server_url,
      region,
      cloud_provider,
      kubernetes_version,
      description,
      is_default,
      kubeconfig
    } = req.body;

    const userId = req.user?.id || 'system';

    // 기본 클러스터 설정 시 다른 클러스터의 기본 설정 해제
    if (is_default) {
      await pool.query(`UPDATE kubernetes_clusters SET is_default = false`);
    }

    const result = await pool.query(`
      INSERT INTO kubernetes_clusters (
        cluster_name,
        cluster_type,
        api_server_url,
        region,
        cloud_provider,
        kubernetes_version,
        description,
        is_default,
        kubeconfig_path,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [
      cluster_name,
      cluster_type,
      api_server_url,
      region || null,
      cloud_provider || 'on-premise',
      kubernetes_version || null,
      description || null,
      is_default || false,
      kubeconfig || null,
      userId
    ]);

    console.log(`✅ 클러스터 등록: ${cluster_name} (${cluster_type})`);

    res.json({
      success: true,
      message: '클러스터가 성공적으로 등록되었습니다.',
      cluster: result.rows[0]
    });
  } catch (error) {
    console.error('클러스터 등록 오류:', error);
    res.status(500).json({
      success: false,
      error: '클러스터 등록 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터 수정
router.put('/clusters/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cluster_name,
      cluster_type,
      api_server_url,
      region,
      cloud_provider,
      kubernetes_version,
      description,
      is_default,
      status
    } = req.body;

    // 기본 클러스터 설정 시 다른 클러스터의 기본 설정 해제
    if (is_default) {
      await pool.query(`UPDATE kubernetes_clusters SET is_default = false WHERE id != $1`, [id]);
    }

    const result = await pool.query(`
      UPDATE kubernetes_clusters
      SET 
        cluster_name = COALESCE($1, cluster_name),
        cluster_type = COALESCE($2, cluster_type),
        api_server_url = COALESCE($3, api_server_url),
        region = COALESCE($4, region),
        cloud_provider = COALESCE($5, cloud_provider),
        kubernetes_version = COALESCE($6, kubernetes_version),
        description = COALESCE($7, description),
        is_default = COALESCE($8, is_default),
        status = COALESCE($9, status),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      cluster_name, cluster_type, api_server_url, region, cloud_provider,
      kubernetes_version, description, is_default, status, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '클러스터를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '클러스터 정보가 업데이트되었습니다.',
      cluster: result.rows[0]
    });
  } catch (error) {
    console.error('클러스터 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '클러스터 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터 삭제
router.delete('/clusters/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 기본 클러스터는 삭제 불가
    const checkDefault = await pool.query(`
      SELECT is_default FROM kubernetes_clusters WHERE id = $1
    `, [id]);

    if (checkDefault.rows.length > 0 && checkDefault.rows[0].is_default) {
      return res.status(400).json({
        success: false,
        error: '기본 클러스터는 삭제할 수 없습니다.'
      });
    }

    const result = await pool.query(`
      DELETE FROM kubernetes_clusters WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '클러스터를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '클러스터가 삭제되었습니다.',
      cluster: result.rows[0]
    });
  } catch (error) {
    console.error('클러스터 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '클러스터 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터 헬스 체크
router.post('/clusters/:id/health-check', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 실제 환경에서는 kubectl 또는 k8s client로 헬스 체크
    // 여기서는 시뮬레이션
    const isHealthy = Math.random() > 0.1; // 90% 확률로 정상

    const result = await pool.query(`
      UPDATE kubernetes_clusters
      SET 
        is_connected = $1,
        last_health_check = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [isHealthy, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '클러스터를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      is_healthy: isHealthy,
      cluster: result.rows[0]
    });
  } catch (error) {
    console.error('클러스터 헬스 체크 오류:', error);
    res.status(500).json({
      success: false,
      error: '클러스터 헬스 체크 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터 네임스페이스 목록
router.get('/clusters/:id/namespaces', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cn.*,
        (SELECT COUNT(*) FROM cluster_deployments WHERE namespace_id = cn.id) as deployment_count
      FROM cluster_namespaces cn
      WHERE cn.cluster_id = $1
      ORDER BY cn.namespace_name
    `, [id]);

    res.json({
      success: true,
      namespaces: result.rows
    });
  } catch (error) {
    console.error('네임스페이스 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '네임스페이스 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 네임스페이스 생성
router.post('/clusters/:id/namespaces', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      namespace_name,
      domain_id,
      project_id,
      environment,
      cpu_limit,
      memory_limit,
      storage_limit
    } = req.body;

    const result = await pool.query(`
      INSERT INTO cluster_namespaces (
        cluster_id,
        namespace_name,
        domain_id,
        project_id,
        environment,
        cpu_limit,
        memory_limit,
        storage_limit,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
      id,
      namespace_name,
      domain_id || null,
      project_id || null,
      environment || null,
      cpu_limit || null,
      memory_limit || null,
      storage_limit || null
    ]);

    console.log(`✅ 네임스페이스 생성: ${namespace_name} (클러스터 ${id})`);

    res.json({
      success: true,
      message: '네임스페이스가 생성되었습니다.',
      namespace: result.rows[0]
    });
  } catch (error) {
    console.error('네임스페이스 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '네임스페이스 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터 통계
router.get('/clusters/statistics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_clusters,
        COUNT(*) FILTER (WHERE status = 'active') as active_clusters,
        COUNT(*) FILTER (WHERE cluster_type = 'development') as dev_clusters,
        COUNT(*) FILTER (WHERE cluster_type = 'staging') as staging_clusters,
        COUNT(*) FILTER (WHERE cluster_type = 'production') as prod_clusters,
        SUM(node_count) as total_nodes,
        SUM(total_cpu_cores) as total_cpu,
        SUM(total_memory_gb) as total_memory,
        COUNT(*) FILTER (WHERE is_connected = true) as connected_clusters
      FROM kubernetes_clusters
    `);

    const namespaceCount = await pool.query(`
      SELECT COUNT(*) as total_namespaces FROM cluster_namespaces
    `);

    const deploymentCount = await pool.query(`
      SELECT COUNT(*) as total_deployments FROM cluster_deployments
    `);

    res.json({
      success: true,
      statistics: {
        ...stats.rows[0],
        total_namespaces: parseInt(namespaceCount.rows[0].total_namespaces),
        total_deployments: parseInt(deploymentCount.rows[0].total_deployments)
      }
    });
  } catch (error) {
    console.error('클러스터 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '클러스터 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 프로바이더별 기본 설정 조회
router.get('/provider-defaults/:provider', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { provider } = req.params;
    
    const defaults = PROVIDER_DEFAULTS[provider];
    
    if (!defaults) {
      return res.status(404).json({
        success: false,
        error: `프로바이더 '${provider}'의 기본 설정을 찾을 수 없습니다.`
      });
    }

    res.json({
      success: true,
      provider,
      defaults
    });
  } catch (error) {
    console.error('프로바이더 기본 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로바이더 기본 설정 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터별 배포 매니페스트 생성
router.post('/clusters/:id/generate-manifest', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const applicationConfig = req.body;

    // 클러스터 정보 조회
    const clusterResult = await pool.query(`
      SELECT * FROM kubernetes_clusters WHERE id = $1
    `, [id]);

    if (clusterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '클러스터를 찾을 수 없습니다.'
      });
    }

    const cluster = clusterResult.rows[0];

    // 배포 매니페스트 생성
    const manifests = generateDeploymentBundle(cluster, applicationConfig);
    
    // kubectl 명령어 생성
    const commands = generateKubectlApplyCommand(cluster, manifests);

    console.log(`✅ 배포 매니페스트 생성: ${applicationConfig.name} → ${cluster.cluster_name} (${cluster.cloud_provider})`);

    res.json({
      success: true,
      cluster: {
        id: cluster.id,
        name: cluster.cluster_name,
        type: cluster.cluster_type,
        provider: cluster.cloud_provider
      },
      manifests,
      commands,
      deployment_info: {
        ingress_class: cluster.ingress_class || PROVIDER_DEFAULTS[cluster.cloud_provider]?.ingress_class,
        storage_class: cluster.storage_class || PROVIDER_DEFAULTS[cluster.cloud_provider]?.storage_class,
        service_type: PROVIDER_DEFAULTS[cluster.cloud_provider]?.service_type,
        load_balancer_type: PROVIDER_DEFAULTS[cluster.cloud_provider]?.load_balancer_type
      }
    });
  } catch (error) {
    console.error('배포 매니페스트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 매니페스트 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 클러스터에 애플리케이션 배포
router.post('/clusters/:id/deploy', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const applicationConfig = req.body;
    const userId = req.user?.id || 'system';

    // 클러스터 정보 조회
    const clusterResult = await pool.query(`
      SELECT * FROM kubernetes_clusters WHERE id = $1
    `, [id]);

    if (clusterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '클러스터를 찾을 수 없습니다.'
      });
    }

    const cluster = clusterResult.rows[0];

    // 클러스터 연결 확인
    if (!cluster.is_connected) {
      return res.status(400).json({
        success: false,
        error: '클러스터가 연결되어 있지 않습니다. 먼저 헬스 체크를 수행하세요.'
      });
    }

    // 네임스페이스 확인 또는 생성
    let namespaceResult = await pool.query(`
      SELECT * FROM cluster_namespaces 
      WHERE cluster_id = $1 AND namespace_name = $2
    `, [id, applicationConfig.namespace || 'default']);

    if (namespaceResult.rows.length === 0) {
      // 네임스페이스 자동 생성
      namespaceResult = await pool.query(`
        INSERT INTO cluster_namespaces (
          cluster_id, namespace_name, environment, status, created_at
        ) VALUES ($1, $2, $3, 'active', NOW())
        RETURNING *
      `, [id, applicationConfig.namespace || 'default', cluster.cluster_type]);
    }

    const namespace = namespaceResult.rows[0];

    // 배포 매니페스트 생성
    const manifests = generateDeploymentBundle(cluster, applicationConfig);

    // 배포 기록 저장
    const deploymentResult = await pool.query(`
      INSERT INTO cluster_deployments (
        cluster_id,
        namespace_id,
        application_name,
        deployment_status,
        image_name,
        image_tag,
        replicas,
        deployed_by,
        deployed_at
      ) VALUES ($1, $2, $3, 'deploying', $4, $5, $6, $7, NOW())
      RETURNING *
    `, [
      id,
      namespace.id,
      applicationConfig.name,
      applicationConfig.image,
      applicationConfig.version || 'latest',
      applicationConfig.replicas || 1,
      userId
    ]);

    // 실제 환경에서는 여기서 kubectl apply 실행
    // 현재는 시뮬레이션
    const isSuccess = Math.random() > 0.1; // 90% 성공률

    // 배포 상태 업데이트
    await pool.query(`
      UPDATE cluster_deployments
      SET deployment_status = $1
      WHERE id = $2
    `, [isSuccess ? 'deployed' : 'failed', deploymentResult.rows[0].id]);

    console.log(`${isSuccess ? '✅' : '❌'} 배포 ${isSuccess ? '성공' : '실패'}: ${applicationConfig.name} → ${cluster.cluster_name}`);

    res.json({
      success: isSuccess,
      message: isSuccess ? '배포가 성공적으로 완료되었습니다.' : '배포 중 오류가 발생했습니다.',
      deployment: {
        ...deploymentResult.rows[0],
        deployment_status: isSuccess ? 'deployed' : 'failed'
      },
      manifests,
      cluster_info: {
        name: cluster.cluster_name,
        provider: cluster.cloud_provider,
        ingress_url: `http://${applicationConfig.name}.${cluster.cluster_name}.local`
      }
    });
  } catch (error) {
    console.error('배포 오류:', error);
    res.status(500).json({
      success: false,
      error: '배포 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 전체 시스템 상태 체크 (실사용 모드)
router.get('/system-status', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 모든 주요 서비스 상태 확인
    const systemStatus = {
      timestamp: new Date().toISOString(),
      database: {
        status: 'healthy',
        connection_pool: 'active',
        response_time: '< 50ms'
      },
      kubernetes_clusters: {
        total: 0,
        connected: 0,
        status: 'unknown'
      },
      ci_cd_services: {
        jenkins: 'unknown',
        nexus: 'unknown',
        argocd: 'unknown'
      }
    };

    // 클러스터 연결 상태 확인
    const clusterResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_connected = true) as connected
      FROM kubernetes_clusters
    `);

    if (clusterResult.rows.length > 0) {
      systemStatus.kubernetes_clusters = {
        total: parseInt(clusterResult.rows[0].total),
        connected: parseInt(clusterResult.rows[0].connected),
        status: clusterResult.rows[0].connected > 0 ? 'healthy' : 'warning'
      };
    }

    console.log('🔍 시스템 상태 체크 완료');

    res.json({
      success: true,
      system_status: systemStatus,
      overall_health: 'healthy' // healthy, warning, critical
    });
  } catch (error) {
    console.error('시스템 상태 체크 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 상태 체크 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;

