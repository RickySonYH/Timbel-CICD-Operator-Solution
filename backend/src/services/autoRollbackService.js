// [advice from AI] 자동 롤백 서비스
// 배포 실패 시 자동으로 이전 버전으로 롤백

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { getPipelineHistoryService } = require('./pipelineHistoryService');
const { getLogStreamService } = require('./logStreamService');

class AutoRollbackService {
  constructor() {
    this.historyService = getPipelineHistoryService();
    this.logStreamService = getLogStreamService();
    
    // 롤백 설정
    this.config = {
      maxRollbackAttempts: 3,
      rollbackTimeout: 300000, // 5분
      healthCheckInterval: 10000, // 10초
      healthCheckMaxAttempts: 30,
      enableAutoRollback: process.env.ENABLE_AUTO_ROLLBACK !== 'false'
    };
    
    console.log('🔄 AutoRollbackService 초기화 완료');
    console.log(`   자동 롤백: ${this.config.enableAutoRollback ? '활성화' : '비활성화'}`);
  }

  /**
   * 배포 실패 감지 및 자동 롤백 트리거
   */
  async handleDeploymentFailure(executionId, deploymentInfo) {
    try {
      if (!this.config.enableAutoRollback) {
        console.log('⏸️ 자동 롤백이 비활성화되어 있습니다');
        return {
          success: false,
          message: '자동 롤백 비활성화됨'
        };
      }
      
      console.log(`🚨 배포 실패 감지: ${executionId}`);
      
      // 이전 성공 배포 조회
      const previousDeployment = await this.findPreviousSuccessfulDeployment(
        deploymentInfo.pipeline_id,
        deploymentInfo.namespace,
        deploymentInfo.deployment_target
      );
      
      if (!previousDeployment) {
        console.log('❌ 롤백할 이전 배포를 찾을 수 없습니다');
        return {
          success: false,
          message: '롤백할 이전 배포가 없습니다'
        };
      }
      
      console.log(`📦 이전 배포 발견: ${previousDeployment.execution_id}`);
      console.log(`   이미지: ${previousDeployment.docker_image}:${previousDeployment.docker_tag}`);
      console.log(`   배포일시: ${previousDeployment.finished_at}`);
      
      // 롤백 실행
      const rollbackResult = await this.executeRollback(
        executionId,
        deploymentInfo,
        previousDeployment
      );
      
      return rollbackResult;
      
    } catch (error) {
      console.error('❌ 자동 롤백 처리 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 이전 성공 배포 조회
   */
  async findPreviousSuccessfulDeployment(pipelineId, namespace, deploymentTarget) {
    try {
      const executions = await this.historyService.getExecutionHistory({
        pipeline_id: pipelineId,
        status: 'success',
        deployment_target: deploymentTarget,
        limit: 5
      });
      
      // namespace가 일치하는 이전 배포 찾기
      const previousDeployment = executions.find(exec => 
        exec.namespace === namespace && 
        exec.docker_image && 
        exec.docker_tag
      );
      
      return previousDeployment || null;
      
    } catch (error) {
      console.error('❌ 이전 배포 조회 실패:', error);
      return null;
    }
  }

  /**
   * 롤백 실행
   */
  async executeRollback(failedExecutionId, deploymentInfo, previousDeployment) {
    try {
      const rollbackExecutionId = `rollback-${Date.now()}`;
      
      // 롤백 실행 기록 시작
      await this.historyService.startExecution({
        execution_id: rollbackExecutionId,
        pipeline_id: deploymentInfo.pipeline_id,
        pipeline_name: `Rollback: ${deploymentInfo.pipeline_name}`,
        trigger_type: 'rollback',
        trigger_by: 'system',
        trigger_reason: `자동 롤백 - 원본 실행 실패: ${failedExecutionId}`,
        deployment_target: deploymentInfo.deployment_target,
        namespace: deploymentInfo.namespace,
        cluster_id: deploymentInfo.cluster_id,
        docker_image: previousDeployment.docker_image,
        docker_tag: previousDeployment.docker_tag,
        branch: previousDeployment.branch,
        commit_hash: previousDeployment.commit_hash
      });
      
      console.log(`🔄 롤백 시작: ${rollbackExecutionId}`);
      
      // 로그 스트리밍 시작
      const streamId = `rollback-${rollbackExecutionId}`;
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: `🔄 자동 롤백 시작`,
        timestamp: new Date().toISOString()
      });
      
      // Kubernetes 롤백 실행
      const rollbackMethod = deploymentInfo.rollback_strategy || 'kubectl';
      
      let rollbackSuccess = false;
      
      if (rollbackMethod === 'kubectl') {
        rollbackSuccess = await this.rollbackWithKubectl(
          deploymentInfo,
          previousDeployment,
          streamId
        );
      } else if (rollbackMethod === 'argocd') {
        rollbackSuccess = await this.rollbackWithArgoCD(
          deploymentInfo,
          previousDeployment,
          streamId
        );
      }
      
      if (rollbackSuccess) {
        // 헬스 체크
        const isHealthy = await this.performHealthCheck(
          deploymentInfo,
          streamId
        );
        
        if (isHealthy) {
          // 롤백 성공
          await this.historyService.completeExecution(rollbackExecutionId, {
            status: 'success',
            docker_image: previousDeployment.docker_image,
            docker_tag: previousDeployment.docker_tag
          });
          
          this.logStreamService.broadcast(streamId, {
            level: 'success',
            message: `✅ 롤백 완료 및 서비스 정상 확인`,
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ 롤백 성공: ${rollbackExecutionId}`);
          
          return {
            success: true,
            rollback_execution_id: rollbackExecutionId,
            previous_version: {
              image: previousDeployment.docker_image,
              tag: previousDeployment.docker_tag
            },
            message: '자동 롤백 성공'
          };
          
        } else {
          // 헬스 체크 실패
          await this.historyService.completeExecution(rollbackExecutionId, {
            status: 'failed',
            error_message: '롤백 후 헬스 체크 실패'
          });
          
          this.logStreamService.broadcast(streamId, {
            level: 'error',
            message: `❌ 롤백 후 헬스 체크 실패`,
            timestamp: new Date().toISOString()
          });
          
          return {
            success: false,
            message: '롤백 후 헬스 체크 실패'
          };
        }
        
      } else {
        // 롤백 실패
        await this.historyService.completeExecution(rollbackExecutionId, {
          status: 'failed',
          error_message: '롤백 실행 실패'
        });
        
        return {
          success: false,
          message: '롤백 실행 실패'
        };
      }
      
    } catch (error) {
      console.error('❌ 롤백 실행 오류:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * kubectl을 사용한 롤백
   */
  async rollbackWithKubectl(deploymentInfo, previousDeployment, streamId) {
    try {
      const { namespace, cluster_id } = deploymentInfo;
      const deploymentName = deploymentInfo.deployment_name || deploymentInfo.pipeline_name;
      const image = `${previousDeployment.docker_image}:${previousDeployment.docker_tag}`;
      
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: `📦 이미지 롤백: ${image}`,
        timestamp: new Date().toISOString()
      });
      
      // kubectl set image 명령 실행
      const command = `kubectl set image deployment/${deploymentName} ${deploymentName}=${image} -n ${namespace}`;
      
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: `$ ${command}`,
        timestamp: new Date().toISOString()
      });
      
      const { stdout, stderr } = await execPromise(command, {
        timeout: 60000
      });
      
      if (stderr && !stderr.includes('warning')) {
        throw new Error(stderr);
      }
      
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: stdout || '✓ 이미지 업데이트 완료',
        timestamp: new Date().toISOString()
      });
      
      // 롤아웃 상태 확인
      const rolloutCommand = `kubectl rollout status deployment/${deploymentName} -n ${namespace} --timeout=5m`;
      
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: `⏳ 롤아웃 대기 중...`,
        timestamp: new Date().toISOString()
      });
      
      const { stdout: rolloutOutput } = await execPromise(rolloutCommand, {
        timeout: 300000 // 5분
      });
      
      this.logStreamService.broadcast(streamId, {
        level: 'success',
        message: rolloutOutput || '✓ 롤아웃 완료',
        timestamp: new Date().toISOString()
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ kubectl 롤백 실패:', error);
      
      this.logStreamService.broadcast(streamId, {
        level: 'error',
        message: `❌ 롤백 실패: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      // kubectl 명령 실패 시 fallback: 이전 리비전으로 롤백
      try {
        const fallbackCommand = `kubectl rollout undo deployment/${deploymentInfo.deployment_name} -n ${deploymentInfo.namespace}`;
        
        this.logStreamService.broadcast(streamId, {
          level: 'warn',
          message: `⚠️ Fallback: kubectl rollout undo 시도`,
          timestamp: new Date().toISOString()
        });
        
        await execPromise(fallbackCommand, { timeout: 60000 });
        
        this.logStreamService.broadcast(streamId, {
          level: 'success',
          message: `✓ Fallback 롤백 성공`,
          timestamp: new Date().toISOString()
        });
        
        return true;
        
      } catch (fallbackError) {
        console.error('❌ Fallback 롤백도 실패:', fallbackError);
        return false;
      }
    }
  }

  /**
   * ArgoCD를 사용한 롤백
   */
  async rollbackWithArgoCD(deploymentInfo, previousDeployment, streamId) {
    try {
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: `🔄 ArgoCD 롤백 시작`,
        timestamp: new Date().toISOString()
      });
      
      // ArgoCD CLI를 사용한 롤백
      const appName = deploymentInfo.argocd_app_name || deploymentInfo.pipeline_name;
      const command = `argocd app rollback ${appName} --prune`;
      
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: `$ ${command}`,
        timestamp: new Date().toISOString()
      });
      
      const { stdout, stderr } = await execPromise(command, {
        timeout: 120000
      });
      
      if (stderr) {
        throw new Error(stderr);
      }
      
      this.logStreamService.broadcast(streamId, {
        level: 'success',
        message: stdout || '✓ ArgoCD 롤백 완료',
        timestamp: new Date().toISOString()
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ ArgoCD 롤백 실패:', error);
      
      this.logStreamService.broadcast(streamId, {
        level: 'error',
        message: `❌ ArgoCD 롤백 실패: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  /**
   * 배포 후 헬스 체크
   */
  async performHealthCheck(deploymentInfo, streamId) {
    try {
      this.logStreamService.broadcast(streamId, {
        level: 'info',
        message: `🏥 헬스 체크 시작`,
        timestamp: new Date().toISOString()
      });
      
      const { namespace } = deploymentInfo;
      const deploymentName = deploymentInfo.deployment_name || deploymentInfo.pipeline_name;
      
      for (let attempt = 1; attempt <= this.config.healthCheckMaxAttempts; attempt++) {
        // Pod 상태 확인
        const command = `kubectl get deployment ${deploymentName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Available")].status}'`;
        
        try {
          const { stdout } = await execPromise(command, { timeout: 5000 });
          
          if (stdout.trim() === 'True') {
            this.logStreamService.broadcast(streamId, {
              level: 'success',
              message: `✅ 헬스 체크 성공 (시도 ${attempt}/${this.config.healthCheckMaxAttempts})`,
              timestamp: new Date().toISOString()
            });
            
            return true;
          }
          
          this.logStreamService.broadcast(streamId, {
            level: 'info',
            message: `⏳ 헬스 체크 대기 중... (시도 ${attempt}/${this.config.healthCheckMaxAttempts})`,
            timestamp: new Date().toISOString()
          });
          
        } catch (cmdError) {
          console.error('헬스 체크 명령 실패:', cmdError);
        }
        
        // 다음 시도 전 대기
        await new Promise(resolve => setTimeout(resolve, this.config.healthCheckInterval));
      }
      
      this.logStreamService.broadcast(streamId, {
        level: 'error',
        message: `❌ 헬스 체크 시간 초과 (${this.config.healthCheckMaxAttempts}회 시도)`,
        timestamp: new Date().toISOString()
      });
      
      return false;
      
    } catch (error) {
      console.error('❌ 헬스 체크 오류:', error);
      return false;
    }
  }

  /**
   * 수동 롤백 트리거
   */
  async triggerManualRollback(executionId) {
    try {
      const execution = await this.historyService.getExecutionDetail(executionId);
      
      if (!execution) {
        return {
          success: false,
          message: '실행 이력을 찾을 수 없습니다'
        };
      }
      
      const deploymentInfo = {
        pipeline_id: execution.pipeline_id,
        pipeline_name: execution.pipeline_name,
        namespace: execution.namespace,
        deployment_target: execution.deployment_target,
        cluster_id: execution.cluster_id,
        deployment_name: execution.pipeline_name
      };
      
      return await this.handleDeploymentFailure(executionId, deploymentInfo);
      
    } catch (error) {
      console.error('❌ 수동 롤백 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton 인스턴스
let autoRollbackServiceInstance = null;

function getAutoRollbackService() {
  if (!autoRollbackServiceInstance) {
    autoRollbackServiceInstance = new AutoRollbackService();
  }
  return autoRollbackServiceInstance;
}

module.exports = {
  AutoRollbackService,
  getAutoRollbackService
};

