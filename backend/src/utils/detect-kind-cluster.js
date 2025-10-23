// [advice from AI] KIND 클러스터 자동 감지 및 등록 유틸리티
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * KIND 클러스터 정보를 감지합니다
 */
async function detectKindCluster() {
  try {
    // kubectl이 설치되어 있는지 확인
    try {
      await execAsync('which kubectl');
    } catch (error) {
      console.log('⚠️ kubectl이 설치되지 않았습니다.');
      return null;
    }

    // 클러스터 정보 조회
    const { stdout: clusterInfo } = await execAsync('kubectl cluster-info 2>&1');
    
    if (!clusterInfo.includes('Kubernetes control plane is running')) {
      console.log('⚠️ 실행 중인 Kubernetes 클러스터가 없습니다.');
      return null;
    }

    // 클러스터 이름 가져오기
    const { stdout: clusterName } = await execAsync('kubectl config view --minify -o jsonpath=\'{.clusters[0].name}\'');
    
    // 클러스터 엔드포인트 가져오기
    const { stdout: clusterEndpoint } = await execAsync('kubectl config view --minify -o jsonpath=\'{.clusters[0].cluster.server}\'');
    
    // KIND 클러스터인지 확인
    if (!clusterName.includes('kind')) {
      console.log(`ℹ️ KIND 클러스터가 아닙니다: ${clusterName}`);
      return null;
    }

    // 노드 정보 가져오기
    const { stdout: nodesJson } = await execAsync('kubectl get nodes -o json');
    const nodes = JSON.parse(nodesJson);
    const nodeCount = nodes.items ? nodes.items.length : 0;

    // Kubernetes 버전 가져오기
    const { stdout: versionJson } = await execAsync('kubectl version -o json');
    const versionInfo = JSON.parse(versionJson);
    const k8sVersion = versionInfo.serverVersion ? 
      `${versionInfo.serverVersion.major}.${versionInfo.serverVersion.minor}` : 
      'unknown';

    console.log('✅ KIND 클러스터 감지됨:', {
      name: clusterName,
      endpoint: clusterEndpoint,
      nodeCount,
      version: k8sVersion
    });

    return {
      cluster_name: clusterName,
      endpoint_url: clusterEndpoint,
      k8s_version: k8sVersion,
      region: 'local',
      provider: 'kind',
      node_count: nodeCount,
      status: 'active',
      description: 'KIND (Kubernetes IN Docker) 로컬 개발 클러스터'
    };

  } catch (error) {
    console.error('❌ KIND 클러스터 감지 실패:', error.message);
    return null;
  }
}

/**
 * KIND 클러스터를 데이터베이스에 등록합니다
 */
async function registerKindCluster(pool) {
  try {
    const clusterInfo = await detectKindCluster();
    
    if (!clusterInfo) {
      console.log('ℹ️ 등록할 KIND 클러스터가 없습니다.');
      return null;
    }

    // 이미 등록되어 있는지 확인
    const checkResult = await pool.query(
      'SELECT id, cluster_name, status FROM kubernetes_clusters WHERE cluster_name = $1',
      [clusterInfo.cluster_name]
    );

    if (checkResult.rows.length > 0) {
      const existing = checkResult.rows[0];
      console.log(`ℹ️ KIND 클러스터가 이미 등록되어 있습니다: ${existing.cluster_name} (${existing.status})`);
      return existing;
    }

    // 새로 등록
    const insertResult = await pool.query(`
      INSERT INTO kubernetes_clusters (
        cluster_name, endpoint_url, k8s_version, region, provider, 
        node_count, status, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      clusterInfo.cluster_name,
      clusterInfo.endpoint_url,
      clusterInfo.k8s_version,
      clusterInfo.region,
      clusterInfo.provider,
      clusterInfo.node_count,
      clusterInfo.status,
      clusterInfo.description,
      'system-auto-detect'
    ]);

    console.log('✅ KIND 클러스터가 성공적으로 등록되었습니다:', insertResult.rows[0].cluster_name);
    return insertResult.rows[0];

  } catch (error) {
    console.error('❌ KIND 클러스터 등록 실패:', error);
    return null;
  }
}

module.exports = {
  detectKindCluster,
  registerKindCluster
};
