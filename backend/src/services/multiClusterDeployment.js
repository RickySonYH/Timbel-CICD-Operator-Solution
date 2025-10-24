// [advice from AI] 멀티 클러스터 동시 배포 서비스
// 여러 Kubernetes 클러스터에 동시 배포 및 컨텍스트 전환 관리

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class MultiClusterDeployment {
  constructor() {
    this.deployments = new Map(); // 배포 진행 상태 추적
  }

  /**
   * 여러 클러스터에 동시 배포
   * @param {Object} deploymentConfig - 배포 설정
   * @returns {Promise<Object>} 배포 결과
   */
  async deployToMultipleClusters(deploymentConfig) {
    const {
      clusters, // ['cluster1', 'cluster2', 'cluster3']
      manifest, // Kubernetes YAML manifest
      namespace = 'default',
      strategy = 'parallel', // 'parallel' or 'sequential'
      rollbackOnFailure = true
    } = deploymentConfig;

    const deploymentId = `deploy-${Date.now()}`;
    
    console.log(`🚀 멀티 클러스터 배포 시작 (ID: ${deploymentId})`);
    console.log(`   대상 클러스터: ${clusters.join(', ')}`);
    console.log(`   전략: ${strategy}`);

    this.deployments.set(deploymentId, {
      id: deploymentId,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      clusters: clusters.map(c => ({ name: c, status: 'pending' })),
      results: []
    });

    try {
      let results;
      
      if (strategy === 'parallel') {
        // 병렬 배포
        results = await this.parallelDeploy(clusters, manifest, namespace);
      } else {
        // 순차 배포
        results = await this.sequentialDeploy(clusters, manifest, namespace);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      const deployment = this.deployments.get(deploymentId);
      deployment.status = failureCount === 0 ? 'completed' : 'partial_success';
      deployment.completedAt = new Date().toISOString();
      deployment.results = results;
      deployment.summary = {
        total: clusters.length,
        success: successCount,
        failure: failureCount
      };

      // 실패 시 롤백
      if (rollbackOnFailure && failureCount > 0) {
        console.log(`⚠️ ${failureCount}개 클러스터 배포 실패 - 롤백 시작`);
        await this.rollbackFailedDeployments(results.filter(r => r.success));
      }

      return {
        success: failureCount === 0,
        deploymentId,
        summary: deployment.summary,
        results,
        message: `${successCount}/${clusters.length} 클러스터에 배포 완료`
      };

    } catch (error) {
      console.error(`❌ 멀티 클러스터 배포 오류:`, error.message);
      
      const deployment = this.deployments.get(deploymentId);
      deployment.status = 'failed';
      deployment.error = error.message;
      deployment.completedAt = new Date().toISOString();

      throw error;
    }
  }

  /**
   * 병렬 배포
   */
  async parallelDeploy(clusters, manifest, namespace) {
    console.log(`🔄 병렬 배포 시작 (${clusters.length}개 클러스터)`);
    
    const deployPromises = clusters.map(cluster => 
      this.deployToCluster(cluster, manifest, namespace)
        .catch(error => ({
          cluster,
          success: false,
          error: error.message
        }))
    );

    return await Promise.all(deployPromises);
  }

  /**
   * 순차 배포
   */
  async sequentialDeploy(clusters, manifest, namespace) {
    console.log(`➡️ 순차 배포 시작 (${clusters.length}개 클러스터)`);
    
    const results = [];
    
    for (const cluster of clusters) {
      try {
        const result = await this.deployToCluster(cluster, manifest, namespace);
        results.push(result);
        
        if (!result.success) {
          console.log(`⚠️ ${cluster} 배포 실패 - 순차 배포 중단`);
          break; // 실패 시 중단
        }
      } catch (error) {
        results.push({
          cluster,
          success: false,
          error: error.message
        });
        break; // 실패 시 중단
      }
    }

    return results;
  }

  /**
   * 단일 클러스터에 배포
   */
  async deployToCluster(clusterName, manifest, namespace) {
    console.log(`📦 ${clusterName}에 배포 중...`);
    
    try {
      // 1. 클러스터 컨텍스트 전환
      await this.switchContext(clusterName);

      // 2. Namespace 확인 및 생성
      await this.ensureNamespace(clusterName, namespace);

      // 3. Manifest 배포
      const manifestPath = await this.writeManifestToFile(manifest, clusterName);
      const { stdout, stderr } = await execPromise(
        `kubectl apply -f ${manifestPath} -n ${namespace} --context ${clusterName}`,
        { timeout: 60000 }
      );

      // 4. 임시 파일 삭제
      await fs.unlink(manifestPath);

      // 5. 배포 상태 확인
      const deploymentStatus = await this.checkDeploymentStatus(clusterName, namespace);

      return {
        cluster: clusterName,
        success: true,
        namespace,
        output: stdout,
        status: deploymentStatus,
        deployedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ ${clusterName} 배포 실패:`, error.message);
      return {
        cluster: clusterName,
        success: false,
        namespace,
        error: error.message,
        failedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Kubernetes 컨텍스트 전환
   */
  async switchContext(clusterName) {
    try {
      await execPromise(`kubectl config use-context ${clusterName}`, { timeout: 5000 });
      console.log(`✅ 컨텍스트 전환: ${clusterName}`);
    } catch (error) {
      console.warn(`⚠️ 컨텍스트 전환 실패 (${clusterName}):`, error.message);
      // 컨텍스트가 없어도 계속 진행 (--context 플래그 사용)
    }
  }

  /**
   * Namespace 확인 및 생성
   */
  async ensureNamespace(clusterName, namespace) {
    if (namespace === 'default') return;

    try {
      await execPromise(
        `kubectl get namespace ${namespace} --context ${clusterName}`,
        { timeout: 5000 }
      );
      console.log(`✅ Namespace 존재: ${namespace}`);
    } catch (error) {
      // Namespace가 없으면 생성
      console.log(`📝 Namespace 생성: ${namespace}`);
      await execPromise(
        `kubectl create namespace ${namespace} --context ${clusterName}`,
        { timeout: 5000 }
      );
    }
  }

  /**
   * Manifest를 임시 파일로 저장
   */
  async writeManifestToFile(manifest, clusterName) {
    const tmpDir = '/tmp/k8s-manifests';
    await fs.mkdir(tmpDir, { recursive: true });
    
    const manifestPath = path.join(tmpDir, `${clusterName}-${Date.now()}.yaml`);
    await fs.writeFile(manifestPath, manifest, 'utf8');
    
    return manifestPath;
  }

  /**
   * 배포 상태 확인
   */
  async checkDeploymentStatus(clusterName, namespace) {
    try {
      const { stdout } = await execPromise(
        `kubectl get deployments -n ${namespace} --context ${clusterName} -o json`,
        { timeout: 10000 }
      );

      const deployments = JSON.parse(stdout);
      
      return {
        totalDeployments: deployments.items.length,
        readyDeployments: deployments.items.filter(d => 
          d.status.readyReplicas === d.status.replicas
        ).length
      };
    } catch (error) {
      console.warn(`⚠️ 배포 상태 확인 실패:`, error.message);
      return { status: 'unknown' };
    }
  }

  /**
   * 실패한 배포 롤백
   */
  async rollbackFailedDeployments(successfulDeployments) {
    console.log(`🔙 롤백 시작 (${successfulDeployments.length}개 클러스터)`);
    
    for (const deployment of successfulDeployments) {
      try {
        await execPromise(
          `kubectl rollout undo deployment --all -n ${deployment.namespace} --context ${deployment.cluster}`,
          { timeout: 30000 }
        );
        console.log(`✅ ${deployment.cluster} 롤백 완료`);
      } catch (error) {
        console.error(`❌ ${deployment.cluster} 롤백 실패:`, error.message);
      }
    }
  }

  /**
   * 사용 가능한 클러스터 목록 조회
   */
  async getAvailableClusters() {
    try {
      const { stdout } = await execPromise('kubectl config get-contexts -o name', { timeout: 5000 });
      const clusters = stdout.trim().split('\n').filter(c => c);
      
      return clusters.map(cluster => ({
        name: cluster,
        available: true
      }));
    } catch (error) {
      console.warn('⚠️ 클러스터 목록 조회 실패:', error.message);
      return [
        { name: 'kind-timbel-cluster', available: true },
        { name: 'production-cluster', available: false },
        { name: 'staging-cluster', available: false }
      ];
    }
  }

  /**
   * 배포 상태 조회
   */
  getDeploymentStatus(deploymentId) {
    return this.deployments.get(deploymentId) || null;
  }

  /**
   * 모든 배포 이력 조회
   */
  getAllDeployments() {
    return Array.from(this.deployments.values());
  }
}

module.exports = new MultiClusterDeployment();

