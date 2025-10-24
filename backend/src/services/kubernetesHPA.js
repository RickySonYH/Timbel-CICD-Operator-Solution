// [advice from AI] Kubernetes HPA (Horizontal Pod Autoscaler) 관리 서비스
// kubectl 기반 자동 스케일링 설정 및 관리

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class KubernetesHPAService {
  constructor() {
    this.kubectl = process.env.KUBECTL_PATH || 'kubectl';
  }

  /**
   * HPA 생성
   */
  async createHPA(options) {
    const {
      name,
      namespace = 'default',
      deployment,
      minReplicas = 2,
      maxReplicas = 10,
      targetCPU = 80,
      targetMemory = null,
      context = null
    } = options;

    try {
      let command = `${this.kubectl}`;
      if (context) {
        command += ` --context=${context}`;
      }
      
      command += ` autoscale deployment ${deployment}`;
      command += ` --namespace=${namespace}`;
      command += ` --min=${minReplicas}`;
      command += ` --max=${maxReplicas}`;
      command += ` --cpu-percent=${targetCPU}`;
      command += ` --name=${name}`;

      console.log(`🎯 HPA 생성 중: ${name}`);
      const { stdout, stderr } = await execPromise(command);

      // 메모리 타겟 설정 (별도 명령)
      if (targetMemory) {
        await this.setMemoryTarget(name, namespace, targetMemory, context);
      }

      return {
        success: true,
        message: `HPA ${name} 생성 완료`,
        output: stdout,
        hpa: await this.getHPA(name, namespace, context)
      };
    } catch (error) {
      console.error(`❌ HPA 생성 실패:`, error);
      throw new Error(`HPA 생성 실패: ${error.message}`);
    }
  }

  /**
   * HPA 목록 조회
   */
  async listHPAs(namespace = 'default', context = null) {
    try {
      let command = `${this.kubectl}`;
      if (context) {
        command += ` --context=${context}`;
      }
      
      command += ` get hpa --namespace=${namespace} -o json`;

      const { stdout } = await execPromise(command);
      const result = JSON.parse(stdout);

      const hpas = result.items.map(item => ({
        name: item.metadata.name,
        namespace: item.metadata.namespace,
        deployment: item.spec.scaleTargetRef.name,
        minReplicas: item.spec.minReplicas,
        maxReplicas: item.spec.maxReplicas,
        currentReplicas: item.status.currentReplicas || 0,
        desiredReplicas: item.status.desiredReplicas || 0,
        targetCPU: item.spec.metrics?.find(m => m.type === 'Resource' && m.resource.name === 'cpu')?.resource.target.averageUtilization || null,
        targetMemory: item.spec.metrics?.find(m => m.type === 'Resource' && m.resource.name === 'memory')?.resource.target.averageUtilization || null,
        currentCPU: item.status.currentMetrics?.find(m => m.type === 'Resource' && m.resource.name === 'cpu')?.resource.current.averageUtilization || null,
        currentMemory: item.status.currentMetrics?.find(m => m.type === 'Resource' && m.resource.name === 'memory')?.resource.current.averageUtilization || null,
        createdAt: item.metadata.creationTimestamp
      }));

      return {
        success: true,
        hpas,
        total: hpas.length
      };
    } catch (error) {
      console.error(`❌ HPA 목록 조회 실패:`, error);
      throw new Error(`HPA 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 HPA 조회
   */
  async getHPA(name, namespace = 'default', context = null) {
    try {
      let command = `${this.kubectl}`;
      if (context) {
        command += ` --context=${context}`;
      }
      
      command += ` get hpa ${name} --namespace=${namespace} -o json`;

      const { stdout } = await execPromise(command);
      const hpa = JSON.parse(stdout);

      return {
        name: hpa.metadata.name,
        namespace: hpa.metadata.namespace,
        deployment: hpa.spec.scaleTargetRef.name,
        minReplicas: hpa.spec.minReplicas,
        maxReplicas: hpa.spec.maxReplicas,
        currentReplicas: hpa.status.currentReplicas || 0,
        desiredReplicas: hpa.status.desiredReplicas || 0,
        targetCPU: hpa.spec.metrics?.find(m => m.type === 'Resource' && m.resource.name === 'cpu')?.resource.target.averageUtilization || null,
        targetMemory: hpa.spec.metrics?.find(m => m.type === 'Resource' && m.resource.name === 'memory')?.resource.target.averageUtilization || null,
        currentCPU: hpa.status.currentMetrics?.find(m => m.type === 'Resource' && m.resource.name === 'cpu')?.resource.current.averageUtilization || null,
        currentMemory: hpa.status.currentMetrics?.find(m => m.type === 'Resource' && m.resource.name === 'memory')?.resource.current.averageUtilization || null,
        conditions: hpa.status.conditions || [],
        createdAt: hpa.metadata.creationTimestamp
      };
    } catch (error) {
      console.error(`❌ HPA 조회 실패:`, error);
      throw new Error(`HPA 조회 실패: ${error.message}`);
    }
  }

  /**
   * HPA 수정
   */
  async updateHPA(name, namespace, updates, context = null) {
    try {
      const { minReplicas, maxReplicas, targetCPU, targetMemory } = updates;

      // HPA YAML 가져오기
      let getCommand = `${this.kubectl}`;
      if (context) {
        getCommand += ` --context=${context}`;
      }
      getCommand += ` get hpa ${name} --namespace=${namespace} -o json`;

      const { stdout } = await execPromise(getCommand);
      const hpa = JSON.parse(stdout);

      // 업데이트 적용
      if (minReplicas !== undefined) hpa.spec.minReplicas = minReplicas;
      if (maxReplicas !== undefined) hpa.spec.maxReplicas = maxReplicas;

      if (targetCPU !== undefined) {
        const cpuMetric = hpa.spec.metrics?.find(m => m.type === 'Resource' && m.resource.name === 'cpu');
        if (cpuMetric) {
          cpuMetric.resource.target.averageUtilization = targetCPU;
        }
      }

      if (targetMemory !== undefined) {
        let memMetric = hpa.spec.metrics?.find(m => m.type === 'Resource' && m.resource.name === 'memory');
        if (!memMetric) {
          if (!hpa.spec.metrics) hpa.spec.metrics = [];
          hpa.spec.metrics.push({
            type: 'Resource',
            resource: {
              name: 'memory',
              target: {
                type: 'Utilization',
                averageUtilization: targetMemory
              }
            }
          });
        } else {
          memMetric.resource.target.averageUtilization = targetMemory;
        }
      }

      // 임시 파일에 저장 후 적용
      const fs = require('fs');
      const path = require('path');
      const tmpFile = path.join('/tmp', `hpa-${name}-${Date.now()}.json`);
      fs.writeFileSync(tmpFile, JSON.stringify(hpa));

      let applyCommand = `${this.kubectl}`;
      if (context) {
        applyCommand += ` --context=${context}`;
      }
      applyCommand += ` apply -f ${tmpFile}`;

      await execPromise(applyCommand);
      fs.unlinkSync(tmpFile);

      console.log(`✅ HPA 수정 완료: ${name}`);

      return {
        success: true,
        message: `HPA ${name} 수정 완료`,
        hpa: await this.getHPA(name, namespace, context)
      };
    } catch (error) {
      console.error(`❌ HPA 수정 실패:`, error);
      throw new Error(`HPA 수정 실패: ${error.message}`);
    }
  }

  /**
   * HPA 삭제
   */
  async deleteHPA(name, namespace = 'default', context = null) {
    try {
      let command = `${this.kubectl}`;
      if (context) {
        command += ` --context=${context}`;
      }
      
      command += ` delete hpa ${name} --namespace=${namespace}`;

      console.log(`🗑️  HPA 삭제 중: ${name}`);
      await execPromise(command);

      return {
        success: true,
        message: `HPA ${name} 삭제 완료`
      };
    } catch (error) {
      console.error(`❌ HPA 삭제 실패:`, error);
      throw new Error(`HPA 삭제 실패: ${error.message}`);
    }
  }

  /**
   * HPA 통계 조회
   */
  async getHPAStatistics(namespace = null, context = null) {
    try {
      let command = `${this.kubectl}`;
      if (context) {
        command += ` --context=${context}`;
      }
      
      command += ` get hpa`;
      if (namespace) {
        command += ` --namespace=${namespace}`;
      } else {
        command += ` --all-namespaces`;
      }
      command += ` -o json`;

      const { stdout } = await execPromise(command);
      const result = JSON.parse(stdout);

      const total = result.items.length;
      const scaling = result.items.filter(item => 
        (item.status.currentReplicas || 0) !== (item.status.desiredReplicas || 0)
      ).length;
      const atMin = result.items.filter(item => 
        (item.status.currentReplicas || 0) === item.spec.minReplicas
      ).length;
      const atMax = result.items.filter(item => 
        (item.status.currentReplicas || 0) === item.spec.maxReplicas
      ).length;

      return {
        success: true,
        statistics: {
          total,
          scaling,
          atMin,
          atMax,
          active: total - atMin
        }
      };
    } catch (error) {
      console.error(`❌ HPA 통계 조회 실패:`, error);
      throw new Error(`HPA 통계 조회 실패: ${error.message}`);
    }
  }

  /**
   * 메모리 타겟 설정 (별도)
   */
  async setMemoryTarget(name, namespace, targetMemory, context = null) {
    try {
      let command = `${this.kubectl}`;
      if (context) {
        command += ` --context=${context}`;
      }
      
      command += ` patch hpa ${name} --namespace=${namespace} --type=json -p='[{"op":"add","path":"/spec/metrics/-","value":{"type":"Resource","resource":{"name":"memory","target":{"type":"Utilization","averageUtilization":${targetMemory}}}}}]'`;

      await execPromise(command);
      console.log(`✅ 메모리 타겟 설정 완료: ${targetMemory}%`);
    } catch (error) {
      console.warn(`⚠️ 메모리 타겟 설정 실패 (무시):`, error.message);
    }
  }

  /**
   * HPA 이벤트 조회
   */
  async getHPAEvents(name, namespace = 'default', context = null) {
    try {
      let command = `${this.kubectl}`;
      if (context) {
        command += ` --context=${context}`;
      }
      
      command += ` get events --namespace=${namespace} --field-selector involvedObject.name=${name},involvedObject.kind=HorizontalPodAutoscaler --sort-by=.lastTimestamp -o json`;

      const { stdout } = await execPromise(command);
      const result = JSON.parse(stdout);

      const events = result.items.map(event => ({
        type: event.type,
        reason: event.reason,
        message: event.message,
        timestamp: event.lastTimestamp || event.firstTimestamp,
        count: event.count || 1
      }));

      return {
        success: true,
        events
      };
    } catch (error) {
      console.error(`❌ HPA 이벤트 조회 실패:`, error);
      return { success: true, events: [] };
    }
  }
}

module.exports = new KubernetesHPAService();

