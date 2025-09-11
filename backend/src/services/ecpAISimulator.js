// [advice from AI] ECP-AI K8s Orchestrator 시뮬레이터 서비스
// 매니페스트 수신, 가상 인스턴스 생성, 모니터링 데이터 제공

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class ECPAISimulator extends EventEmitter {
  constructor() {
    super();
    
    // [advice from AI] 시뮬레이터 상태 관리
    this.instances = new Map(); // tenantId -> instance data
    this.monitoringData = new Map(); // tenantId -> monitoring data
    this.deployments = new Map(); // deploymentId -> deployment status
    
    // [advice from AI] ECP-AI K8s Orchestrator 기본 설정
    this.baseConfig = {
      version: '2.0',
      registry: 'harbor.ecp-ai.com',
      namespace: 'ecp-ai-simulator',
      monitoring: {
        prometheus: true,
        grafana: true,
        alerting: true
      }
    };
    
    // [advice from AI] 서비스별 리소스 계산 가중치 (ECP-AI K8s Orchestrator 기반)
    this.serviceWeights = {
      callbot: { cpu: 0.5, memory: 1.0, gpu: 0, priority: 'high' },
      chatbot: { cpu: 0.2, memory: 0.5, gpu: 0, priority: 'medium' },
      advisor: { cpu: 1.0, memory: 2.0, gpu: 1, priority: 'high' },
      stt: { cpu: 0.8, memory: 1.5, gpu: 0, priority: 'medium' },
      tts: { cpu: 1.0, memory: 2.0, gpu: 1, priority: 'high' },
      ta: { cpu: 0.4, memory: 0.8, gpu: 0, priority: 'low' },
      qa: { cpu: 0.3, memory: 0.6, gpu: 0, priority: 'low' },
      common: { cpu: 0.1, memory: 0.2, gpu: 0, priority: 'low' }
    };
    
    // [advice from AI] 모니터링 데이터 생성 시작
    this.startMonitoring();
  }
  
  // [advice from AI] 매니페스트 수신 및 가상 인스턴스 생성
  async deployManifest(tenantId, manifest) {
    try {
      console.log(`🚀 [시뮬레이터] 테넌트 ${tenantId} 매니페스트 배포 시작:`, manifest);
      
      const deploymentId = uuidv4();
      const deployment = {
        id: deploymentId,
        tenantId: tenantId,
        status: 'deploying',
        startTime: new Date(),
        manifest: manifest,
        services: [],
        monitoring: {
          cpu: 0,
          memory: 0,
          pods: 0,
          health: 'unknown'
        }
      };
      
      // [advice from AI] 배포 상태 저장
      this.deployments.set(deploymentId, deployment);
      
      // [advice from AI] 서비스별 가상 인스턴스 생성
      for (const service of manifest.services || []) {
        const instance = await this.createVirtualInstance(tenantId, service, manifest);
        deployment.services.push(instance);
      }
      
      // [advice from AI] 배포 완료 처리
      deployment.status = 'deployed';
      deployment.endTime = new Date();
      deployment.duration = deployment.endTime - deployment.startTime;
      
      // [advice from AI] 인스턴스 데이터 저장
      this.instances.set(tenantId, {
        tenantId: tenantId,
        deploymentId: deploymentId,
        services: deployment.services,
        status: 'active',
        createdAt: new Date(),
        lastUpdated: new Date()
      });
      
      console.log(`✅ [시뮬레이터] 테넌트 ${tenantId} 배포 완료:`, {
        deploymentId: deploymentId,
        services: deployment.services.length,
        duration: deployment.duration
      });
      
      // [advice from AI] 배포 완료 이벤트 발생
      this.emit('deploymentComplete', {
        tenantId: tenantId,
        deploymentId: deploymentId,
        services: deployment.services
      });
      
      return {
        success: true,
        deploymentId: deploymentId,
        status: 'deployed',
        services: deployment.services
      };
      
    } catch (error) {
      console.error(`❌ [시뮬레이터] 테넌트 ${tenantId} 배포 실패:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // [advice from AI] 가상 인스턴스 생성
  async createVirtualInstance(tenantId, service, manifest) {
    const instanceId = uuidv4();
    const serviceConfig = this.serviceWeights[service] || this.serviceWeights.common;
    
    // [advice from AI] 리소스 계산 (ECP-AI K8s Orchestrator 방식)
    const resources = this.calculateResources(service, manifest.resourceRequirements || {});
    
    const instance = {
      id: instanceId,
      tenantId: tenantId,
      service: service,
      status: 'running',
      resources: resources,
      image: manifest.orchestratorConfig?.baseImages?.[service] || `ecp-ai/${service}:latest`,
      registry: manifest.orchestratorConfig?.registry || 'harbor.ecp-ai.com',
      namespace: `tenant-${tenantId}`,
      ports: this.getServicePorts(service),
      healthCheck: {
        path: '/health',
        port: 8080,
        status: 'healthy'
      },
      metrics: {
        cpu: Math.random() * 0.8 + 0.1, // 10-90% CPU 사용률
        memory: Math.random() * 0.7 + 0.2, // 20-90% 메모리 사용률
        pods: 1,
        uptime: 0
      },
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    console.log(`🔧 [시뮬레이터] 가상 인스턴스 생성:`, {
      tenantId: tenantId,
      service: service,
      instanceId: instanceId,
      resources: resources
    });
    
    return instance;
  }
  
  // [advice from AI] 리소스 계산 (ECP-AI K8s Orchestrator 하드웨어 계산기 기반)
  calculateResources(service, requirements) {
    const baseConfig = this.serviceWeights[service] || this.serviceWeights.common;
    
    // [advice from AI] 기본 리소스 + 요구사항 기반 계산
    let cpu = baseConfig.cpu;
    let memory = baseConfig.memory;
    let gpu = baseConfig.gpu;
    
    // [advice from AI] 커스텀 요구사항이 있으면 적용
    if (requirements.cpu) {
      cpu = Math.max(cpu, parseFloat(requirements.cpu));
    }
    if (requirements.memory) {
      memory = Math.max(memory, parseFloat(requirements.memory));
    }
    if (requirements.gpu) {
      gpu = Math.max(gpu, parseInt(requirements.gpu));
    }
    
    // [advice from AI] 서비스별 최적화 적용
    if (service === 'tts' || service === 'advisor') {
      // GPU 필요 서비스는 최소 1 GPU 보장
      gpu = Math.max(gpu, 1);
    }
    
    return {
      cpu: cpu,
      memory: memory,
      gpu: gpu,
      storage: 10, // 기본 10GB
      replicas: 1 // 기본 1개 replica
    };
  }
  
  // [advice from AI] 서비스별 포트 설정
  getServicePorts(service) {
    const portMap = {
      callbot: [8080, 9090],
      chatbot: [8080],
      advisor: [8080, 9090],
      stt: [8080],
      tts: [8080],
      ta: [8080],
      qa: [8080],
      common: [8080]
    };
    
    return portMap[service] || [8080];
  }
  
  // [advice from AI] 모니터링 데이터 생성 시작
  startMonitoring() {
    // [advice from AI] 5초마다 모니터링 데이터 업데이트
    setInterval(() => {
      this.updateMonitoringData();
    }, 5000);
    
    console.log('📊 [시뮬레이터] 모니터링 데이터 생성 시작');
  }
  
  // [advice from AI] 모니터링 데이터 업데이트
  updateMonitoringData() {
    for (const [tenantId, instance] of this.instances) {
      if (instance.status === 'active') {
        // [advice from AI] 각 서비스별 메트릭 업데이트
        for (const service of instance.services) {
          service.metrics.cpu = Math.max(0.1, Math.min(0.9, service.metrics.cpu + (Math.random() - 0.5) * 0.1));
          service.metrics.memory = Math.max(0.2, Math.min(0.9, service.metrics.memory + (Math.random() - 0.5) * 0.05));
          service.metrics.uptime = Date.now() - service.createdAt.getTime();
          service.lastUpdated = new Date();
        }
        
        // [advice from AI] 테넌트 전체 모니터링 데이터 업데이트
        const totalCpu = instance.services.reduce((sum, s) => sum + s.metrics.cpu, 0);
        const totalMemory = instance.services.reduce((sum, s) => sum + s.metrics.memory, 0);
        const totalPods = instance.services.reduce((sum, s) => sum + s.metrics.pods, 0);
        
        this.monitoringData.set(tenantId, {
          tenantId: tenantId,
          timestamp: new Date(),
          cpu: totalCpu / instance.services.length,
          memory: totalMemory / instance.services.length,
          pods: totalPods,
          health: this.calculateHealth(instance.services),
          services: instance.services.map(s => ({
            service: s.service,
            status: s.status,
            cpu: s.metrics.cpu,
            memory: s.metrics.memory,
            uptime: s.metrics.uptime
          }))
        });
      }
    }
  }
  
  // [advice from AI] 헬스 상태 계산
  calculateHealth(services) {
    const healthyServices = services.filter(s => s.healthCheck.status === 'healthy').length;
    const healthRatio = healthyServices / services.length;
    
    if (healthRatio >= 0.9) return 'excellent';
    if (healthRatio >= 0.7) return 'good';
    if (healthRatio >= 0.5) return 'warning';
    return 'critical';
  }
  
  // [advice from AI] 테넌트 모니터링 데이터 조회
  getMonitoringData(tenantId) {
    return this.monitoringData.get(tenantId) || null;
  }
  
  // [advice from AI] 모든 테넌트 모니터링 데이터 조회
  getAllMonitoringData() {
    const data = {};
    for (const [tenantId, monitoring] of this.monitoringData) {
      data[tenantId] = monitoring;
    }
    return data;
  }
  
  // [advice from AI] 테넌트 인스턴스 조회
  getInstance(tenantId) {
    return this.instances.get(tenantId) || null;
  }
  
  // [advice from AI] 배포 상태 조회
  getDeployment(deploymentId) {
    return this.deployments.get(deploymentId) || null;
  }
  
  // [advice from AI] 테넌트 삭제
  async deleteTenant(tenantId) {
    try {
      const instance = this.instances.get(tenantId);
      if (instance) {
        // [advice from AI] 모든 서비스 정리
        for (const service of instance.services) {
          service.status = 'terminated';
        }
        
        // [advice from AI] 데이터 삭제
        this.instances.delete(tenantId);
        this.monitoringData.delete(tenantId);
        
        console.log(`🗑️ [시뮬레이터] 테넌트 ${tenantId} 삭제 완료`);
        return { success: true };
      }
      
      return { success: false, error: 'Tenant not found' };
    } catch (error) {
      console.error(`❌ [시뮬레이터] 테넌트 ${tenantId} 삭제 실패:`, error);
      return { success: false, error: error.message };
    }
  }
}

// [advice from AI] 싱글톤 패턴으로 시뮬레이터 인스턴스 관리
let simulatorInstance = null;

function getECPAISimulator() {
  if (!simulatorInstance) {
    simulatorInstance = new ECPAISimulator();
  }
  return simulatorInstance;
}

module.exports = {
  ECPAISimulator,
  getECPAISimulator
};
