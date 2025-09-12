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

  // [advice from AI] 테넌트별 모니터링 데이터 생성
  async generateMonitoringData(tenantId, context) {
    try {
      console.log(`📊 [시뮬레이터] 모니터링 데이터 생성 시작: ${tenantId}`);
      
      const { tenant, services, timestamp } = context;
      
      // [advice from AI] 가상 하드웨어 리소스 계산
      const totalCpu = tenant.total_allocated_cpu ? parseFloat(tenant.total_allocated_cpu) : 2.0;
      const totalMemory = tenant.total_allocated_memory ? parseFloat(tenant.total_allocated_memory) : 4.0;
      const totalGpu = tenant.total_allocated_gpu ? parseInt(tenant.total_allocated_gpu) : 0;
      
      // [advice from AI] 서비스별 모니터링 데이터 생성
      const serviceMonitoringData = services.map(service => {
        const baseCpu = parseFloat(service.cpu_cores) || 0.5;
        const baseMemory = parseFloat(service.memory_gb) || 1.0;
        
        // [advice from AI] 서비스별 특성에 따른 가상 메트릭 생성
        const serviceType = service.service_name.toLowerCase();
        let cpuUsage, memoryUsage, responseTime, errorRate, uptime;
        
        switch (serviceType) {
          case 'callbot':
            cpuUsage = Math.random() * 30 + 20; // 20-50%
            memoryUsage = Math.random() * 20 + 30; // 30-50%
            responseTime = Math.random() * 200 + 100; // 100-300ms
            errorRate = Math.random() * 0.5; // 0-0.5%
            uptime = 99.5 + Math.random() * 0.5; // 99.5-100%
            break;
          case 'chatbot':
            cpuUsage = Math.random() * 25 + 15; // 15-40%
            memoryUsage = Math.random() * 15 + 25; // 25-40%
            responseTime = Math.random() * 150 + 80; // 80-230ms
            errorRate = Math.random() * 0.3; // 0-0.3%
            uptime = 99.7 + Math.random() * 0.3; // 99.7-100%
            break;
          case 'advisor':
            cpuUsage = Math.random() * 40 + 30; // 30-70%
            memoryUsage = Math.random() * 25 + 35; // 35-60%
            responseTime = Math.random() * 300 + 200; // 200-500ms
            errorRate = Math.random() * 0.8; // 0-0.8%
            uptime = 99.0 + Math.random() * 1.0; // 99-100%
            break;
          case 'stt':
            cpuUsage = Math.random() * 35 + 25; // 25-60%
            memoryUsage = Math.random() * 20 + 30; // 30-50%
            responseTime = Math.random() * 400 + 300; // 300-700ms
            errorRate = Math.random() * 1.0; // 0-1%
            uptime = 98.5 + Math.random() * 1.5; // 98.5-100%
            break;
          case 'tts':
            cpuUsage = Math.random() * 50 + 40; // 40-90%
            memoryUsage = Math.random() * 30 + 40; // 40-70%
            responseTime = Math.random() * 500 + 400; // 400-900ms
            errorRate = Math.random() * 1.2; // 0-1.2%
            uptime = 98.0 + Math.random() * 2.0; // 98-100%
            break;
          case 'ta':
            cpuUsage = Math.random() * 30 + 20; // 20-50%
            memoryUsage = Math.random() * 20 + 30; // 30-50%
            responseTime = Math.random() * 250 + 150; // 150-400ms
            errorRate = Math.random() * 0.6; // 0-0.6%
            uptime = 99.2 + Math.random() * 0.8; // 99.2-100%
            break;
          case 'qa':
            cpuUsage = Math.random() * 25 + 15; // 15-40%
            memoryUsage = Math.random() * 15 + 25; // 25-40%
            responseTime = Math.random() * 200 + 100; // 100-300ms
            errorRate = Math.random() * 0.4; // 0-0.4%
            uptime = 99.5 + Math.random() * 0.5; // 99.5-100%
            break;
          default:
            cpuUsage = Math.random() * 20 + 10; // 10-30%
            memoryUsage = Math.random() * 15 + 20; // 20-35%
            responseTime = Math.random() * 100 + 50; // 50-150ms
            errorRate = Math.random() * 0.2; // 0-0.2%
            uptime = 99.8 + Math.random() * 0.2; // 99.8-100%
        }
        
        return {
          name: service.service_name,
          type: service.service_type,
          status: 'running',
          uptime: `${uptime.toFixed(1)}%`,
          response_time: Math.round(responseTime),
          error_rate: `${errorRate.toFixed(2)}%`,
          resources: {
            cpu_usage: Math.round(cpuUsage),
            memory_usage: Math.round(memoryUsage),
            gpu_usage: serviceType === 'tts' ? Math.random() * 30 + 20 : 0,
            disk_usage: Math.random() * 20 + 10,
            network_io: Math.random() * 50 + 10,
            requests_per_second: Math.random() * 100 + 50
          },
          metrics: {
            cpu_cores: baseCpu,
            memory_gb: baseMemory,
            replicas: service.replicas || 1,
            health_checks: {
              liveness: 'healthy',
              readiness: 'healthy',
              startup: 'healthy'
            }
          },
          health_checks: {
            status: 'healthy',
            last_check: new Date().toISOString(),
            checks: [
              { name: 'HTTP Health', status: 'pass', response_time: Math.round(responseTime * 0.8) },
              { name: 'Database Connection', status: 'pass', response_time: Math.round(responseTime * 0.3) },
              { name: 'External API', status: 'pass', response_time: Math.round(responseTime * 0.5) }
            ]
          }
        };
      });
      
      // [advice from AI] 전체 테넌트 메트릭 계산
      const totalCpuUsage = serviceMonitoringData.reduce((sum, s) => sum + s.resources.cpu_usage, 0) / serviceMonitoringData.length;
      const totalMemoryUsage = serviceMonitoringData.reduce((sum, s) => sum + s.resources.memory_usage, 0) / serviceMonitoringData.length;
      const avgResponseTime = serviceMonitoringData.reduce((sum, s) => sum + s.response_time, 0) / serviceMonitoringData.length;
      const avgErrorRate = serviceMonitoringData.reduce((sum, s) => sum + parseFloat(s.error_rate), 0) / serviceMonitoringData.length;
      
      const monitoringData = {
        tenantId: tenantId,
        timestamp: timestamp,
        overall_status: 'healthy',
        uptime_percentage: 99.5 + Math.random() * 0.5,
        total_services: serviceMonitoringData.length,
        running_services: serviceMonitoringData.filter(s => s.status === 'running').length,
        services: serviceMonitoringData,
        metrics: {
          cpu_usage: Math.round(totalCpuUsage),
          memory_usage: Math.round(totalMemoryUsage),
          gpu_usage: totalGpu > 0 ? Math.round(Math.random() * 30 + 20) : 0,
          disk_usage: Math.round(Math.random() * 20 + 30),
          network_io: Math.round(Math.random() * 100 + 50),
          response_time: Math.round(avgResponseTime),
          error_rate: avgErrorRate.toFixed(2),
          requests_per_second: Math.round(Math.random() * 200 + 100)
        },
        alerts: this.generateAlerts(serviceMonitoringData),
        recommendations: this.generateRecommendations(serviceMonitoringData, totalCpu, totalMemory)
      };
      
      // [advice from AI] 모니터링 데이터 저장
      this.monitoringData.set(tenantId, monitoringData);
      
      console.log(`✅ [시뮬레이터] 모니터링 데이터 생성 완료: ${tenantId}`);
      return monitoringData;
      
    } catch (error) {
      console.error(`❌ [시뮬레이터] 모니터링 데이터 생성 실패: ${tenantId}`, error);
      throw error;
    }
  }

  // [advice from AI] 실시간 메트릭 조회
  async getRealtimeMetrics(tenantId) {
    try {
      const monitoringData = this.monitoringData.get(tenantId);
      if (!monitoringData) {
        // [advice from AI] 기존 데이터가 없으면 새로 생성
        return await this.generateMonitoringData(tenantId, {
          tenant: { tenant_id: tenantId },
          services: [],
          timestamp: new Date().toISOString()
        });
      }
      
      // [advice from AI] 실시간 데이터 업데이트 (약간의 변동 추가)
      const updatedData = { ...monitoringData };
      updatedData.timestamp = new Date().toISOString();
      
      // [advice from AI] 메트릭에 약간의 변동 추가
      updatedData.services = updatedData.services.map(service => ({
        ...service,
        resources: {
          ...service.resources,
          cpu_usage: Math.max(0, Math.min(100, service.resources.cpu_usage + (Math.random() - 0.5) * 5)),
          memory_usage: Math.max(0, Math.min(100, service.resources.memory_usage + (Math.random() - 0.5) * 3)),
          network_io: Math.max(0, service.resources.network_io + (Math.random() - 0.5) * 10)
        },
        response_time: Math.max(50, service.response_time + (Math.random() - 0.5) * 20)
      }));
      
      this.monitoringData.set(tenantId, updatedData);
      return updatedData;
      
    } catch (error) {
      console.error(`❌ [시뮬레이터] 실시간 메트릭 조회 실패: ${tenantId}`, error);
      throw error;
    }
  }

  // [advice from AI] 알림 생성
  generateAlerts(services) {
    const alerts = [];
    
    services.forEach(service => {
      if (service.resources.cpu_usage > 80) {
        alerts.push({
          id: `cpu-high-${service.name}`,
          type: 'warning',
          service: service.name,
          message: `CPU 사용률이 높습니다: ${service.resources.cpu_usage}%`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (service.resources.memory_usage > 85) {
        alerts.push({
          id: `memory-high-${service.name}`,
          type: 'warning',
          service: service.name,
          message: `메모리 사용률이 높습니다: ${service.resources.memory_usage}%`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (parseFloat(service.error_rate) > 1.0) {
        alerts.push({
          id: `error-rate-high-${service.name}`,
          type: 'critical',
          service: service.name,
          message: `에러율이 높습니다: ${service.error_rate}`,
          timestamp: new Date().toISOString()
        });
      }
      
      if (service.response_time > 1000) {
        alerts.push({
          id: `response-slow-${service.name}`,
          type: 'warning',
          service: service.name,
          message: `응답 시간이 느립니다: ${service.response_time}ms`,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return alerts;
  }

  // [advice from AI] 권장사항 생성
  generateRecommendations(services, totalCpu, totalMemory) {
    const recommendations = [];
    
    const avgCpuUsage = services.reduce((sum, s) => sum + s.resources.cpu_usage, 0) / services.length;
    const avgMemoryUsage = services.reduce((sum, s) => sum + s.resources.memory_usage, 0) / services.length;
    
    if (avgCpuUsage > 70) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        title: 'CPU 사용률 최적화',
        description: `평균 CPU 사용률이 ${avgCpuUsage.toFixed(1)}%로 높습니다. 오토스케일링 설정을 검토하거나 리소스를 추가하는 것을 고려하세요.`,
        action: 'Configure auto-scaling or increase CPU resources'
      });
    }
    
    if (avgMemoryUsage > 75) {
      recommendations.push({
        type: 'scaling',
        priority: 'medium',
        title: '메모리 사용률 최적화',
        description: `평균 메모리 사용률이 ${avgMemoryUsage.toFixed(1)}%로 높습니다. 메모리 리소스를 추가하거나 메모리 누수를 확인하세요.`,
        action: 'Increase memory resources or check for memory leaks'
      });
    }
    
    if (services.some(s => parseFloat(s.error_rate) > 0.5)) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: '에러율 개선',
        description: '일부 서비스에서 에러율이 높습니다. 로그를 확인하고 문제를 해결하세요.',
        action: 'Check service logs and resolve issues'
      });
    }
    
    return recommendations;
  }

  // [advice from AI] 상세 모니터링 데이터 생성
  async generateDetailedMonitoringData(tenantId, type = 'all') {
    try {
      console.log(`📊 [시뮬레이터] 상세 모니터링 데이터 생성: ${tenantId}, 타입: ${type}`);
      
      const baseData = this.monitoringData.get(tenantId);
      if (!baseData) {
        // [advice from AI] 기본 데이터가 없으면 생성
        await this.generateMonitoringData(tenantId, {
          tenant: { tenant_id: tenantId },
          services: [],
          timestamp: new Date().toISOString()
        });
      }

      const detailedData = {
        tenantId: tenantId,
        timestamp: new Date().toISOString(),
        resources: {},
        network: {},
        logs: {},
        performance: {}
      };

      // [advice from AI] 리소스 사용률 데이터 (24시간 히스토리)
      if (type === 'all' || type === 'resources') {
        detailedData.resources = {
          cpu_history: this.generateTimeSeriesData(24, 0, 100, 'cpu'),
          memory_history: this.generateTimeSeriesData(24, 0, 100, 'memory'),
          disk_history: this.generateTimeSeriesData(24, 0, 100, 'disk'),
          gpu_history: this.generateTimeSeriesData(24, 0, 100, 'gpu'),
          current_usage: {
            cpu: Math.random() * 50 + 20,
            memory: Math.random() * 40 + 30,
            disk: Math.random() * 30 + 40,
            gpu: Math.random() * 60 + 10
          },
          predictions: {
            cpu_trend: Math.random() > 0.5 ? 'increasing' : 'stable',
            memory_trend: Math.random() > 0.5 ? 'increasing' : 'stable',
            disk_trend: Math.random() > 0.5 ? 'increasing' : 'stable'
          }
        };
      }

      // [advice from AI] 네트워크 트래픽 데이터
      if (type === 'all' || type === 'network') {
        detailedData.network = {
          traffic_history: this.generateTimeSeriesData(24, 0, 1000, 'network'),
          bandwidth_usage: {
            incoming: Math.random() * 500 + 100,
            outgoing: Math.random() * 300 + 50,
            total: Math.random() * 800 + 150
          },
          connections: {
            active: Math.floor(Math.random() * 1000) + 100,
            established: Math.floor(Math.random() * 500) + 50,
            listening: Math.floor(Math.random() * 20) + 5
          },
          latency: {
            average: Math.random() * 50 + 10,
            min: Math.random() * 20 + 5,
            max: Math.random() * 100 + 50,
            p95: Math.random() * 80 + 20
          },
          errors: {
            connection_timeout: Math.floor(Math.random() * 10),
            dns_failure: Math.floor(Math.random() * 5),
            tcp_reset: Math.floor(Math.random() * 3)
          }
        };
      }

      // [advice from AI] 로그 분석 데이터
      if (type === 'all' || type === 'logs') {
        detailedData.logs = {
          log_levels: {
            error: Math.floor(Math.random() * 50) + 5,
            warning: Math.floor(Math.random() * 100) + 10,
            info: Math.floor(Math.random() * 1000) + 100,
            debug: Math.floor(Math.random() * 500) + 50
          },
          recent_errors: this.generateRecentLogs('error', 10),
          recent_warnings: this.generateRecentLogs('warning', 15),
          top_errors: this.generateTopErrors(5),
          log_volume: this.generateTimeSeriesData(24, 0, 10000, 'logs'),
          patterns: {
            error_spikes: Math.floor(Math.random() * 5),
            warning_trends: Math.random() > 0.5 ? 'increasing' : 'decreasing',
            info_volume: Math.floor(Math.random() * 10000) + 1000
          }
        };
      }

      // [advice from AI] 성능 지표 데이터
      if (type === 'all' || type === 'performance') {
        detailedData.performance = {
          response_times: {
            average: Math.random() * 200 + 50,
            p50: Math.random() * 150 + 30,
            p95: Math.random() * 500 + 100,
            p99: Math.random() * 1000 + 200,
            max: Math.random() * 2000 + 500
          },
          throughput: {
            requests_per_second: Math.random() * 1000 + 100,
            requests_per_minute: Math.random() * 60000 + 6000,
            peak_rps: Math.random() * 2000 + 500
          },
          error_rates: {
            current: Math.random() * 2,
            average: Math.random() * 1.5,
            peak: Math.random() * 5 + 1
          },
          availability: {
            uptime_percentage: 99.5 + Math.random() * 0.5,
            downtime_minutes: Math.random() * 10,
            last_incident: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          scalability: {
            auto_scaling_events: Math.floor(Math.random() * 20) + 5,
            scale_up_events: Math.floor(Math.random() * 10) + 2,
            scale_down_events: Math.floor(Math.random() * 15) + 3,
            current_replicas: Math.floor(Math.random() * 10) + 1
          }
        };
      }

      return detailedData;

    } catch (error) {
      console.error(`❌ [시뮬레이터] 상세 모니터링 데이터 생성 실패: ${tenantId}`, error);
      throw error;
    }
  }

  // [advice from AI] 시계열 데이터 생성 (24시간)
  generateTimeSeriesData(hours, min, max, type) {
    const data = [];
    const now = new Date();
    
    for (let i = hours - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      let value;
      
      switch (type) {
        case 'cpu':
          value = Math.random() * (max - min) + min;
          break;
        case 'memory':
          value = Math.random() * (max - min) + min;
          break;
        case 'disk':
          value = Math.random() * (max - min) + min;
          break;
        case 'gpu':
          value = Math.random() * (max - min) + min;
          break;
        case 'network':
          value = Math.random() * (max - min) + min;
          break;
        case 'logs':
          value = Math.floor(Math.random() * (max - min) + min);
          break;
        default:
          value = Math.random() * (max - min) + min;
      }
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 100) / 100
      });
    }
    
    return data;
  }

  // [advice from AI] 최근 로그 생성
  generateRecentLogs(level, count) {
    const logs = [];
    const messages = {
      error: [
        'Database connection failed',
        'Memory allocation error',
        'Service timeout occurred',
        'Authentication failed',
        'File not found',
        'Network unreachable',
        'Disk space low',
        'Process crashed'
      ],
      warning: [
        'High memory usage detected',
        'Slow query detected',
        'Connection pool exhausted',
        'Cache miss rate high',
        'Disk space warning',
        'CPU usage high',
        'Network latency increased',
        'Service response slow'
      ]
    };

    for (let i = 0; i < count; i++) {
      const message = messages[level][Math.floor(Math.random() * messages[level].length)];
      logs.push({
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        level: level,
        message: message,
        service: `service-${Math.floor(Math.random() * 5) + 1}`,
        trace_id: `trace-${Math.random().toString(36).substr(2, 9)}`
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // [advice from AI] 상위 에러 생성
  generateTopErrors(count) {
    const errors = [
      { message: 'Database connection timeout', count: Math.floor(Math.random() * 100) + 10 },
      { message: 'Memory allocation failed', count: Math.floor(Math.random() * 50) + 5 },
      { message: 'Service unavailable', count: Math.floor(Math.random() * 30) + 3 },
      { message: 'Authentication error', count: Math.floor(Math.random() * 20) + 2 },
      { message: 'File system error', count: Math.floor(Math.random() * 15) + 1 },
      { message: 'Network timeout', count: Math.floor(Math.random() * 25) + 2 },
      { message: 'Configuration error', count: Math.floor(Math.random() * 10) + 1 },
      { message: 'Resource exhausted', count: Math.floor(Math.random() * 40) + 5 }
    ];

    return errors
      .sort((a, b) => b.count - a.count)
      .slice(0, count);
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
