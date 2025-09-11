// [advice from AI] ECP-AI 오케스트레이터 실제 인스턴스 생성기
// 테넌트 배포 시 실제 모니터링 가능한 인스턴스 데이터 생성

const { v4: uuidv4 } = require('uuid');

class RealInstanceGenerator {
  constructor() {
    // [advice from AI] ECP-AI 오케스트레이터 스타일 인스턴스 템플릿
    this.serviceTemplates = {
      callbot: {
        baseImage: 'ecp-ai/callbot',
        defaultPorts: [8080, 9090],
        defaultResources: { cpu: 0.5, memory: 1, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/call-status'],
        metrics: ['concurrent_calls', 'call_duration', 'stt_accuracy', 'tts_quality'],
        environmentVars: {
          'STT_ENDPOINT': 'http://stt-service:8080',
          'TTS_ENDPOINT': 'http://tts-service:8080',
          'MAX_CONCURRENT_CALLS': '100',
          'CALL_TIMEOUT': '300'
        }
      },
      chatbot: {
        baseImage: 'ecp-ai/chatbot',
        defaultPorts: [8080],
        defaultResources: { cpu: 0.2, memory: 0.5, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/chat-status'],
        metrics: ['active_sessions', 'response_time', 'nlp_accuracy', 'satisfaction'],
        environmentVars: {
          'NLP_ENDPOINT': 'http://nlp-service:8080',
          'CHAT_HISTORY_SIZE': '1000',
          'MAX_SESSIONS': '500'
        }
      },
      advisor: {
        baseImage: 'ecp-ai/advisor',
        defaultPorts: [8080, 9090],
        defaultResources: { cpu: 1.0, memory: 2, gpu: 1 },
        healthEndpoints: ['/health', '/ready', '/advisor-status'],
        metrics: ['hybrid_usage', 'handoff_rate', 'resolution_rate', 'expert_time'],
        environmentVars: {
          'HYBRID_MODE': 'true',
          'HANDOFF_THRESHOLD': '0.7',
          'KNOWLEDGE_BASE': 'vector-db'
        }
      },
      stt: {
        baseImage: 'ecp-ai/stt',
        defaultPorts: [8080],
        defaultResources: { cpu: 0.8, memory: 1.5, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/stt-status'],
        metrics: ['processing_time', 'accuracy', 'queue_length', 'language_support'],
        environmentVars: {
          'MODEL_PATH': '/models/stt',
          'LANGUAGE_CODE': 'ko-KR',
          'SAMPLING_RATE': '16000'
        }
      },
      tts: {
        baseImage: 'ecp-ai/tts',
        defaultPorts: [8080],
        defaultResources: { cpu: 1.0, memory: 2, gpu: 1 },
        healthEndpoints: ['/health', '/ready', '/tts-status'],
        metrics: ['synthesis_time', 'voice_quality', 'gpu_utilization', 'audio_output'],
        environmentVars: {
          'VOICE_TYPE': 'female',
          'SPEED': '1.0',
          'AUDIO_FORMAT': 'wav'
        }
      },
      ta: {
        baseImage: 'ecp-ai/text-analytics',
        defaultPorts: [8080],
        defaultResources: { cpu: 0.4, memory: 0.8, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/analysis-status'],
        metrics: ['analysis_time', 'sentiment_accuracy', 'entity_detection', 'batch_throughput'],
        environmentVars: {
          'ANALYSIS_MODE': 'batch',
          'BATCH_SIZE': '100',
          'SENTIMENT_ANALYSIS': 'true'
        }
      },
      qa: {
        baseImage: 'ecp-ai/qa-service',
        defaultPorts: [8080],
        defaultResources: { cpu: 0.3, memory: 0.5, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/qa-status'],
        metrics: ['answer_time', 'answer_accuracy', 'knowledge_coverage', 'confidence_score'],
        environmentVars: {
          'QUALITY_THRESHOLD': '0.8',
          'EVALUATION_MODE': 'automatic'
        }
      },
      common: {
        baseImage: 'ecp-ai/common-infrastructure',
        defaultPorts: [8080, 3000],
        defaultResources: { cpu: 0.2, memory: 0.25, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/system-status'],
        metrics: ['api_response_time', 'load_balancer_health', 'db_connections', 'cache_hit_ratio'],
        environmentVars: {
          'LOG_LEVEL': 'info',
          'API_TIMEOUT': '30000'
        }
      }
    };

    // [advice from AI] 실제 인스턴스 데이터 저장소
    this.runningInstances = new Map();
    this.instanceMetrics = new Map();
    this.instanceLogs = new Map();
  }

  // [advice from AI] 테넌트 배포 시 실제 인스턴스 생성
  async createRealInstances(tenantConfig, hardwareResult) {
    try {
      const tenantId = tenantConfig.tenantId;
      const instances = [];

      console.log(`🚀 ${tenantId} 테넌트 실제 인스턴스 생성 시작...`);

      if (tenantConfig.deploymentMode === 'auto-calculate' && hardwareResult) {
        // [advice from AI] 자동 계산 모드: 하드웨어 계산 결과 기반 인스턴스
        for (const server of hardwareResult.serverConfigurations) {
          const instance = await this.createServerInstance(tenantId, server, 'auto-calculated');
          instances.push(instance);
        }
      } else {
        // [advice from AI] 커스텀 모드: 사용자 정의 서버 기반 인스턴스
        for (const server of tenantConfig.customServerSpecs) {
          const instance = await this.createServerInstance(tenantId, server, 'custom-specs');
          instances.push(instance);
        }
      }

      // [advice from AI] 인스턴스 데이터 저장
      this.runningInstances.set(tenantId, instances);

      // [advice from AI] 모니터링 데이터 생성 시작
      this.startInstanceMonitoring(tenantId, instances);

      console.log(`✅ ${tenantId} 테넌트 ${instances.length}개 인스턴스 생성 완료`);

      return {
        success: true,
        data: {
          tenant_id: tenantId,
          instances: instances,
          total_instances: instances.length,
          created_at: new Date().toISOString()
        },
        message: '실제 인스턴스 생성 완료'
      };

    } catch (error) {
      console.error('실제 인스턴스 생성 오류:', error);
      throw new Error(`인스턴스 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 서버별 인스턴스 생성
  async createServerInstance(tenantId, serverConfig, mode) {
    const instanceId = uuidv4();
    const isAutoMode = mode === 'auto-calculated';
    
    const serverName = isAutoMode 
      ? serverConfig.role.replace(/\s+/g, '-').toLowerCase().replace(/[()]/g, '')
      : serverConfig.name.replace(/\s+/g, '-').toLowerCase();

    // [advice from AI] 서버 타입에 따른 서비스 매핑
    const detectedServices = this.detectServicesFromServer(serverConfig, isAutoMode);
    
    const instance = {
      instance_id: instanceId,
      tenant_id: tenantId,
      server_name: serverName,
      server_type: isAutoMode ? serverConfig.role : serverConfig.type,
      
      // [advice from AI] 리소스 설정
      resources: {
        cpu_cores: isAutoMode ? serverConfig.cpu_cores : serverConfig.cpu,
        memory_gb: isAutoMode ? serverConfig.ram_gb : serverConfig.memory,
        gpu_count: isAutoMode ? (serverConfig.gpu_quantity === '-' ? 0 : parseInt(serverConfig.gpu_quantity) || 0) : serverConfig.gpu,
        storage_gb: isAutoMode ? serverConfig.instance_storage_gb : serverConfig.storage,
        replicas: isAutoMode ? 1 : serverConfig.replicas
      },
      
      // [advice from AI] 배포된 서비스들
      deployed_services: detectedServices.map(serviceName => {
        const template = this.serviceTemplates[serviceName] || this.serviceTemplates.common;
        return {
          service_id: uuidv4(),
          service_name: serviceName,
          service_type: serviceName,
          image: template.baseImage,
          ports: template.defaultPorts,
          health_endpoints: template.healthEndpoints,
          environment_vars: template.environmentVars,
          status: 'starting',
          pid: Math.floor(Math.random() * 30000) + 1000, // Mock PID
          started_at: new Date().toISOString()
        };
      }),
      
      // [advice from AI] 인스턴스 상태
      status: 'creating',
      health_score: 0,
      uptime_seconds: 0,
      
      // [advice from AI] 네트워크 설정
      network: {
        internal_ip: this.generateMockIP('10.0'),
        external_ip: this.generateMockIP('192.168'),
        ports: detectedServices.flatMap(s => this.serviceTemplates[s]?.defaultPorts || [8080])
      },
      
      // [advice from AI] 메타데이터
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    // [advice from AI] 시작 시뮬레이션 (2초 후 running 상태로 변경)
    setTimeout(() => {
      instance.status = 'running';
      instance.health_score = Math.floor(Math.random() * 20) + 80; // 80-100%
      instance.deployed_services.forEach(service => {
        service.status = 'running';
      });
      console.log(`✅ 인스턴스 ${instanceId} 시작 완료`);
    }, 2000);

    return instance;
  }

  // [advice from AI] 서버에서 서비스 감지
  detectServicesFromServer(serverConfig, isAutoMode) {
    if (isAutoMode) {
      // [advice from AI] 자동 계산 모드: 서버 역할에서 서비스 추출
      const role = serverConfig.role.toLowerCase();
      
      if (role.includes('tts')) return ['tts'];
      if (role.includes('nlp')) return ['advisor', 'chatbot'];
      if (role.includes('aicm')) return ['advisor'];
      if (role.includes('stt')) return ['stt', 'callbot'];
      if (role.includes('ta')) return ['ta'];
      if (role.includes('qa')) return ['qa'];
      if (role.includes('nginx') || role.includes('gateway')) return ['common'];
      if (role.includes('postgresql') || role.includes('vector')) return ['common'];
      
      return ['common']; // 기본값
    } else {
      // [advice from AI] 커스텀 모드: 사용자 할당 서비스
      return serverConfig.services || ['common'];
    }
  }

  // [advice from AI] 실시간 모니터링 시작
  startInstanceMonitoring(tenantId, instances) {
    // [advice from AI] 30초마다 메트릭 업데이트
    const monitoringInterval = setInterval(() => {
      try {
        const metrics = this.generateRealTimeMetrics(tenantId, instances);
        this.instanceMetrics.set(tenantId, metrics);
        
        // [advice from AI] 인스턴스 상태 업데이트
        instances.forEach(instance => {
          instance.uptime_seconds += 30;
          instance.last_updated = new Date().toISOString();
          
          // [advice from AI] 헬스 스코어 변동 (80-100% 범위)
          instance.health_score = Math.max(80, Math.min(100, 
            instance.health_score + (Math.random() - 0.5) * 5
          ));
          
          // [advice from AI] 서비스 상태 업데이트
          instance.deployed_services.forEach(service => {
            if (Math.random() < 0.02) { // 2% 확률로 재시작
              service.status = 'restarting';
              setTimeout(() => {
                service.status = 'running';
                service.started_at = new Date().toISOString();
              }, 5000);
            }
          });
        });

      } catch (error) {
        console.error(`모니터링 업데이트 오류 (${tenantId}):`, error);
      }
    }, 30000); // 30초마다

    // [advice from AI] 10분 후 모니터링 정리 (메모리 절약)
    setTimeout(() => {
      clearInterval(monitoringInterval);
      console.log(`🔄 ${tenantId} 모니터링 인터벌 정리됨`);
    }, 600000); // 10분

    console.log(`📊 ${tenantId} 실시간 모니터링 시작`);
  }

  // [advice from AI] 실시간 메트릭 생성 (ECP-AI 스타일)
  generateRealTimeMetrics(tenantId, instances) {
    const metrics = {
      tenant_id: tenantId,
      overall_status: 'healthy',
      
      // [advice from AI] 인스턴스별 메트릭
      instances: instances.map(instance => ({
        instance_id: instance.instance_id,
        server_name: instance.server_name,
        status: instance.status,
        health_score: instance.health_score,
        uptime_seconds: instance.uptime_seconds,
        
        // [advice from AI] 리소스 사용률 (변동)
        resource_usage: {
          cpu_percent: Math.random() * 80 + 10, // 10-90%
          memory_percent: Math.random() * 85 + 15, // 15-100%
          gpu_percent: instance.resources.gpu_count > 0 ? Math.random() * 90 + 10 : 0,
          disk_io_mbps: Math.random() * 100 + 20,
          network_io_mbps: Math.random() * 150 + 30
        },
        
        // [advice from AI] 서비스별 메트릭
        services: instance.deployed_services.map(service => ({
          service_name: service.service_name,
          status: service.status,
          pid: service.pid,
          
          // [advice from AI] 서비스별 특화 메트릭
          metrics: this.generateServiceMetrics(service.service_name),
          
          // [advice from AI] 헬스체크 결과
          health_checks: service.health_endpoints.map(endpoint => ({
            endpoint: endpoint,
            status: Math.random() > 0.05 ? 'healthy' : 'unhealthy', // 95% 정상
            response_time_ms: Math.random() * 100 + 10,
            last_check: new Date().toISOString()
          }))
        }))
      })),
      
      // [advice from AI] 전체 테넌트 메트릭
      tenant_metrics: {
        total_instances: instances.length,
        running_instances: instances.filter(i => i.status === 'running').length,
        total_services: instances.reduce((sum, i) => sum + i.deployed_services.length, 0),
        running_services: instances.reduce((sum, i) => 
          sum + i.deployed_services.filter(s => s.status === 'running').length, 0),
        
        // [advice from AI] 집계 리소스 사용률
        aggregated_cpu: instances.reduce((sum, i) => sum + (Math.random() * 80 + 10), 0) / instances.length,
        aggregated_memory: instances.reduce((sum, i) => sum + (Math.random() * 85 + 15), 0) / instances.length,
        aggregated_gpu: instances.reduce((sum, i) => 
          sum + (i.resources.gpu_count > 0 ? Math.random() * 90 + 10 : 0), 0) / 
          instances.filter(i => i.resources.gpu_count > 0).length || 0,
        
        // [advice from AI] 네트워크 트래픽
        total_requests: Math.floor(Math.random() * 5000) + 1000,
        successful_requests: Math.floor(Math.random() * 4800) + 950,
        error_rate_percent: Math.random() * 2 + 0.1, // 0.1-2.1%
        average_response_time: Math.random() * 300 + 100
      },
      
      generated_at: new Date().toISOString()
    };

    return metrics;
  }

  // [advice from AI] 서비스별 특화 메트릭 생성
  generateServiceMetrics(serviceName) {
    const template = this.serviceTemplates[serviceName] || this.serviceTemplates.common;
    const metrics = {};

    template.metrics.forEach(metricName => {
      switch (metricName) {
        case 'concurrent_calls':
          metrics[metricName] = { value: Math.floor(Math.random() * 50) + 5, unit: 'calls' };
          break;
        case 'response_time':
        case 'processing_time':
        case 'synthesis_time':
        case 'analysis_time':
        case 'answer_time':
          metrics[metricName] = { value: Math.floor(Math.random() * 200) + 50, unit: 'ms' };
          break;
        case 'accuracy':
        case 'voice_quality':
        case 'satisfaction':
          metrics[metricName] = { value: Math.random() * 15 + 85, unit: '%' }; // 85-100%
          break;
        case 'active_sessions':
        case 'queue_length':
          metrics[metricName] = { value: Math.floor(Math.random() * 100) + 10, unit: 'count' };
          break;
        case 'gpu_utilization':
          metrics[metricName] = { value: Math.random() * 90 + 10, unit: '%' };
          break;
        case 'throughput':
        case 'batch_throughput':
          metrics[metricName] = { value: Math.floor(Math.random() * 1000) + 100, unit: 'docs/min' };
          break;
        default:
          metrics[metricName] = { value: Math.random() * 100, unit: 'value' };
      }
    });

    return metrics;
  }

  // [advice from AI] 테넌트 인스턴스 조회
  getInstancesByTenant(tenantId) {
    const instances = this.runningInstances.get(tenantId);
    if (!instances) {
      return {
        success: false,
        message: '해당 테넌트의 인스턴스를 찾을 수 없습니다'
      };
    }

    const metrics = this.instanceMetrics.get(tenantId);

    return {
      success: true,
      data: {
        tenant_id: tenantId,
        instances: instances,
        metrics: metrics,
        last_updated: new Date().toISOString()
      },
      message: '테넌트 인스턴스 조회 성공'
    };
  }

  // [advice from AI] 전체 인스턴스 통계
  getAllInstanceStats() {
    const allTenants = Array.from(this.runningInstances.keys());
    let totalInstances = 0;
    let runningInstances = 0;
    let totalServices = 0;
    let runningServices = 0;

    allTenants.forEach(tenantId => {
      const instances = this.runningInstances.get(tenantId) || [];
      totalInstances += instances.length;
      runningInstances += instances.filter(i => i.status === 'running').length;
      
      instances.forEach(instance => {
        totalServices += instance.deployed_services.length;
        runningServices += instance.deployed_services.filter(s => s.status === 'running').length;
      });
    });

    return {
      success: true,
      data: {
        total_tenants_with_instances: allTenants.length,
        total_instances: totalInstances,
        running_instances: runningInstances,
        total_services: totalServices,
        running_services: runningServices,
        uptime_average: totalInstances > 0 ? 
          Array.from(this.runningInstances.values())
            .flat()
            .reduce((sum, i) => sum + i.uptime_seconds, 0) / totalInstances : 0
      },
      message: '전체 인스턴스 통계 조회 성공'
    };
  }

  // [advice from AI] 테넌트 인스턴스 삭제
  async destroyInstances(tenantId) {
    try {
      const instances = this.runningInstances.get(tenantId);
      if (!instances) {
        return { success: true, message: '삭제할 인스턴스가 없습니다' };
      }

      console.log(`🗑️ ${tenantId} 테넌트 인스턴스 삭제 시작...`);

      // [advice from AI] 각 인스턴스의 서비스 중지
      instances.forEach(instance => {
        instance.deployed_services.forEach(service => {
          service.status = 'stopping';
          console.log(`⏹️ 서비스 ${service.service_name} 중지 중...`);
        });
      });

      // [advice from AI] 2초 후 완전 삭제
      setTimeout(() => {
        this.runningInstances.delete(tenantId);
        this.instanceMetrics.delete(tenantId);
        this.instanceLogs.delete(tenantId);
        console.log(`✅ ${tenantId} 테넌트 인스턴스 완전 삭제 완료`);
      }, 2000);

      return {
        success: true,
        data: {
          tenant_id: tenantId,
          destroyed_instances: instances.length,
          destroyed_services: instances.reduce((sum, i) => sum + i.deployed_services.length, 0)
        },
        message: '인스턴스 삭제 시작'
      };

    } catch (error) {
      console.error('인스턴스 삭제 오류:', error);
      throw new Error(`인스턴스 삭제 실패: ${error.message}`);
    }
  }

  // [advice from AI] Mock IP 생성
  generateMockIP(prefix = '192.168') {
    return `${prefix}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  // [advice from AI] 인스턴스 로그 생성
  generateInstanceLogs(tenantId, instanceId) {
    const logs = [
      `[INFO] Instance ${instanceId} starting...`,
      `[INFO] Loading configuration for tenant ${tenantId}`,
      `[INFO] Initializing services...`,
      `[INFO] Health checks passed`,
      `[INFO] Instance ready to serve traffic`,
      `[INFO] Monitoring started`
    ];

    return logs;
  }
}

module.exports = RealInstanceGenerator;
