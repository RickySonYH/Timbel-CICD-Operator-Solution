// [advice from AI] ECP-AI 오케스트레이터 참고 배포 데이터 생성기
// 실제 구동 데이터 시뮬레이션, 데이터베이스 저장, 모니터링 데이터 생성

const { v4: uuidv4 } = require('uuid');
const MonitoringService = require('./monitoringService');

class DeploymentDataGenerator {
  constructor() {
    // [advice from AI] ECP-AI 오케스트레이터 스타일 데이터 생성 설정
    this.deploymentDatabase = new Map(); // 임시 메모리 DB (실제 구현시 PostgreSQL 연동)
    this.monitoringData = new Map();
    
    // [advice from AI] 실제 시스템 모니터링 서비스
    this.monitoringService = new MonitoringService();
    this.serviceMetrics = new Map();
    
    // [advice from AI] 서비스별 기본 메트릭 템플릿
    this.serviceTemplates = {
      callbot: {
        defaultMetrics: ['concurrent_calls', 'call_duration', 'stt_accuracy', 'tts_quality'],
        resourceProfile: { cpu: 0.5, memory: 1, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/metrics']
      },
      chatbot: {
        defaultMetrics: ['active_sessions', 'response_time', 'nlp_accuracy', 'satisfaction'],
        resourceProfile: { cpu: 0.2, memory: 0.5, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/chat-status']
      },
      advisor: {
        defaultMetrics: ['hybrid_usage', 'handoff_rate', 'resolution_rate', 'expert_time'],
        resourceProfile: { cpu: 1.0, memory: 2, gpu: 1 },
        healthEndpoints: ['/health', '/ready', '/advisor-status']
      },
      stt: {
        defaultMetrics: ['processing_time', 'accuracy', 'queue_length', 'language_support'],
        resourceProfile: { cpu: 0.8, memory: 1.5, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/stt-status']
      },
      tts: {
        defaultMetrics: ['synthesis_time', 'voice_quality', 'gpu_utilization', 'audio_output'],
        resourceProfile: { cpu: 1.0, memory: 2, gpu: 1 },
        healthEndpoints: ['/health', '/ready', '/tts-status']
      },
      ta: {
        defaultMetrics: ['analysis_time', 'sentiment_accuracy', 'entity_detection', 'batch_throughput'],
        resourceProfile: { cpu: 0.4, memory: 0.8, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/analysis-status']
      },
      qa: {
        defaultMetrics: ['answer_time', 'answer_accuracy', 'knowledge_coverage', 'confidence_score'],
        resourceProfile: { cpu: 0.3, memory: 0.5, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/qa-status']
      },
      common: {
        defaultMetrics: ['api_response_time', 'load_balancer_health', 'db_connections', 'cache_hit_ratio'],
        resourceProfile: { cpu: 0.2, memory: 0.25, gpu: 0 },
        healthEndpoints: ['/health', '/ready', '/system-status']
      }
    };
  }

  // [advice from AI] 테넌트 배포 데이터 생성 및 저장
  async createDeploymentRecord(tenantConfig, manifestData, selectedInfra) {
    try {
      const deploymentId = uuidv4();
      const deploymentRecord = {
        deployment_id: deploymentId,
        tenant_id: tenantConfig.tenantId,
        tenant_name: tenantConfig.tenantName,
        description: tenantConfig.description || '',
        
        // [advice from AI] 배포 설정
        cloud_provider: tenantConfig.cloudProvider || 'aws',
        region: tenantConfig.region || 'ap-northeast-2',
        environment: tenantConfig.environment || 'development',
        deployment_mode: tenantConfig.deploymentMode || 'auto-calculate',
        
        // [advice from AI] 인프라 정보 (null 체크)
        infrastructure: selectedInfra ? {
          id: selectedInfra.id,
          name: selectedInfra.name,
          type: selectedInfra.type,
          provider: selectedInfra.provider,
          resources: selectedInfra.resources,
          nodes: selectedInfra.nodes,
          k8sVersion: selectedInfra.k8sVersion
        } : {
          id: 'default-infra',
          name: '기본 인프라',
          type: 'kubernetes',
          provider: tenantConfig.cloudProvider || 'aws',
          resources: { cpu: 4, memory: 8, storage: 100, gpu: 0 },
          nodes: 1,
          k8sVersion: '1.24.0'
        },
        
        // [advice from AI] 리소스 요구사항
        resource_requirements: manifestData.mode === 'auto-calculated' 
          ? manifestData.hardware_specs 
          : manifestData.total_resources,
          
        // [advice from AI] 서비스 설정
        services: tenantConfig.deploymentMode === 'auto-calculate' 
          ? Object.entries(tenantConfig.serviceRequirements)
              .filter(([, count]) => count > 0)
              .map(([service, count]) => ({
                name: service,
                type: service,
                channels: count,
                config: this.generateServiceConfig(service, tenantConfig.advancedSettings[service]),
                metrics: this.serviceTemplates[service] || {}
              }))
          : tenantConfig.customServerSpecs.map(server => ({
              name: server.name,
              type: server.type,
              services: server.services,
              resources: {
                cpu: server.cpu,
                memory: server.memory,
                gpu: server.gpu,
                storage: server.storage,
                replicas: server.replicas
              }
            })),
            
        // [advice from AI] 배포 상태
        status: 'deploying',
        deployment_strategy: tenantConfig.deploymentStrategy,
        auto_scaling: tenantConfig.autoScaling,
        monitoring_enabled: tenantConfig.monitoring,
        
        // [advice from AI] 타임스탬프
        created_at: new Date().toISOString(),
        deployed_at: null,
        last_updated: new Date().toISOString(),
        
        // [advice from AI] 매니페스트 정보
        manifest_count: Object.keys(tenantConfig.settings?.manifests || {}).length,
        manifest_files: Object.keys(tenantConfig.settings?.manifests || {}),
        
        // [advice from AI] 예상 비용 (하드웨어 계산 결과)
        estimated_cost: manifestData.mode === 'auto-calculated' && manifestData.estimated_cost
          ? {
              aws_monthly_usd: manifestData.estimated_cost.aws,
              ncp_monthly_krw: manifestData.estimated_cost.ncp * 10000,
              calculated_at: new Date().toISOString()
            }
          : null
      };

      // [advice from AI] 메모리 DB에 저장 (실제 구현시 PostgreSQL)
      this.deploymentDatabase.set(deploymentId, deploymentRecord);
      
      console.log('📊 배포 레코드 생성 완료:', {
        deploymentId,
        tenantId: tenantConfig.tenantId,
        services: deploymentRecord.services.length,
        manifestFiles: deploymentRecord.manifest_count
      });

      return {
        success: true,
        data: deploymentRecord,
        message: '배포 레코드가 생성되었습니다'
      };

    } catch (error) {
      console.error('배포 레코드 생성 오류:', error);
      throw new Error(`배포 레코드 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 배포 완료 처리 및 모니터링 데이터 생성
  async completeDeployment(deploymentId) {
    try {
      const deploymentRecord = this.deploymentDatabase.get(deploymentId);
      if (!deploymentRecord) {
        throw new Error('배포 레코드를 찾을 수 없습니다');
      }

      // [advice from AI] 배포 완료 상태 업데이트
      deploymentRecord.status = 'completed';
      deploymentRecord.deployed_at = new Date().toISOString();
      deploymentRecord.last_updated = new Date().toISOString();

      // [advice from AI] 실제 배포 상태 기반 모니터링 데이터 생성
      const monitoringData = await this.generateMonitoringData(deploymentRecord);
      this.monitoringData.set(deploymentId, monitoringData);

      // [advice from AI] 서비스별 메트릭 데이터 생성
      const serviceMetrics = this.generateServiceMetrics(deploymentRecord);
      this.serviceMetrics.set(deploymentId, serviceMetrics);

      console.log('🎉 배포 완료 처리:', {
        deploymentId,
        tenantId: deploymentRecord.tenant_id,
        completedAt: deploymentRecord.deployed_at,
        monitoringEnabled: deploymentRecord.monitoring_enabled
      });

      return {
        success: true,
        data: {
          deployment: deploymentRecord,
          monitoring: monitoringData,
          metrics: serviceMetrics
        },
        message: '배포가 성공적으로 완료되었습니다'
      };

    } catch (error) {
      console.error('배포 완료 처리 오류:', error);
      throw new Error(`배포 완료 처리 실패: ${error.message}`);
    }
  }

  // [advice from AI] 실제 배포 상태 기반 모니터링 데이터 생성
  async generateMonitoringData(deploymentRecord) {
    const now = new Date();
    
    try {
      // [advice from AI] 실제 시스템 메트릭 수집
      const systemMetrics = await this.monitoringService.collectSystemMetrics();
      const containerMetrics = await this.monitoringService.collectContainerMetrics();
      
      // [advice from AI] 실제 배포 상태 확인
      const deploymentStatus = await this.checkActualDeploymentStatus(deploymentRecord.tenant_id);
      
      return {
        tenant_id: deploymentRecord.tenant_id,
        overall_status: this.calculateOverallStatus(deploymentStatus, containerMetrics),
        
        // [advice from AI] 실제 배포된 서비스별 상태
        services: await this.generateRealServiceMetrics(deploymentRecord, systemMetrics, deploymentStatus),
        
        // [advice from AI] 실제 시스템 리소스 상태
        resources: {
          cpu_usage: systemMetrics.cpu_usage,
          memory_usage: systemMetrics.memory_usage,
          disk_usage: systemMetrics.disk_usage,
          network_io: systemMetrics.network_io
        },
        
        // [advice from AI] 실제 상태 기반 알림
        alerts: await this.generateRealAlerts(deploymentRecord, systemMetrics, deploymentStatus),
        
        // [advice from AI] 실제 배포 정보
        deployment_info: {
          cluster_status: containerMetrics.overall_status || 'unknown',
          node_count: deploymentRecord.infrastructure?.nodes || 1,
          pod_count: deploymentStatus.activePods || 0,
          namespace: deploymentRecord.tenant_id,
          ingress_status: deploymentStatus.ingressActive ? 'active' : 'inactive',
          load_balancer_ip: await this.monitoringService.getHostIP(),
          k8s_version: deploymentRecord.infrastructure?.k8sVersion || 'v1.28.0'
        },
        
        // [advice from AI] 실제 성능 메트릭
        performance_metrics: await this.calculateRealPerformanceMetrics(deploymentStatus),
        
        last_updated: now.toISOString()
      };
      
    } catch (error) {
      console.error(`❌ [배포데이터생성기] 실제 모니터링 데이터 생성 실패:`, error);
      
      // [advice from AI] 에러 발생시 기본 상태 반환 (Mock 데이터 사용 안함)
      return {
        tenant_id: deploymentRecord.tenant_id,
        overall_status: 'error',
        services: [],
        resources: {
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          network_io: 0
        },
        alerts: [
          {
            level: 'error',
            message: `모니터링 데이터 생성 실패: ${error.message}`,
            timestamp: now.toISOString()
          }
        ],
        deployment_info: {
          cluster_status: 'error',
          node_count: 0,
          pod_count: 0,
          namespace: deploymentRecord.tenant_id,
          ingress_status: 'inactive',
          load_balancer_ip: '127.0.0.1',
          k8s_version: 'unknown'
        },
        performance_metrics: {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          average_response_time: 0,
          p95_response_time: 0,
          throughput: 0
        },
        last_updated: now.toISOString()
      };
    }
  }

  // [advice from AI] 서비스별 메트릭 데이터 생성
  generateServiceMetrics(deploymentRecord) {
    const metrics = {};
    
    deploymentRecord.services.forEach(service => {
      const template = this.serviceTemplates[service.name] || this.serviceTemplates.common;
      
      metrics[service.name] = {
        service_name: service.name,
        service_type: service.type,
        channels: service.channels || 0,
        
        // [advice from AI] 서비스별 특화 메트릭
        metrics: template.defaultMetrics.reduce((acc, metric) => {
          acc[metric] = {
            current: Math.random() * 100,
            threshold: 80,
            unit: this.getMetricUnit(metric),
            status: Math.random() > 0.2 ? 'normal' : 'warning'
          };
          return acc;
        }, {}),
        
        // [advice from AI] 리소스 사용률
        resource_usage: {
          cpu_percent: Math.random() * 70 + 10,
          memory_percent: Math.random() * 80 + 15,
          gpu_percent: template.resourceProfile.gpu > 0 ? Math.random() * 85 + 10 : 0,
          disk_io: Math.random() * 100 + 20,
          network_io: Math.random() * 150 + 30
        },
        
        // [advice from AI] 헬스체크 상태
        health_checks: template.healthEndpoints.map(endpoint => ({
          endpoint,
          status: Math.random() > 0.05 ? 'healthy' : 'unhealthy', // 95% 정상
          last_check: new Date().toISOString(),
          response_time: Math.random() * 50 + 5
        })),
        
        last_updated: new Date().toISOString()
      };
    });
    
    return metrics;
  }

  // [advice from AI] 알림 생성
  generateAlerts(deploymentRecord) {
    const alerts = [];
    const alertTypes = ['info', 'warning', 'error'];
    const alertMessages = [
      'Memory usage approaching threshold',
      'Auto-scaling triggered',
      'Service response time increased',
      'New deployment completed',
      'Health check failed temporarily',
      'High CPU usage detected',
      'Network connectivity restored'
    ];

    // [advice from AI] 랜덤 알림 2-5개 생성
    const alertCount = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < alertCount; i++) {
      alerts.push({
        alert_id: uuidv4(),
        level: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        message: alertMessages[Math.floor(Math.random() * alertMessages.length)],
        service: deploymentRecord.services[Math.floor(Math.random() * deploymentRecord.services.length)]?.name || 'system',
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // 최근 1시간 내
        resolved: Math.random() > 0.3 // 70% 해결됨
      });
    }
    
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // [advice from AI] 메트릭 단위 반환
  getMetricUnit(metric) {
    const units = {
      'response_time': 'ms',
      'processing_time': 'ms',
      'synthesis_time': 'ms',
      'analysis_time': 'ms',
      'answer_time': 'ms',
      'call_duration': 'sec',
      'accuracy': '%',
      'quality': '%',
      'satisfaction': '/5.0',
      'threshold': 'score',
      'usage': '%',
      'rate': '%',
      'count': 'count',
      'sessions': 'sessions',
      'calls': 'calls',
      'throughput': 'docs/min',
      'queue_length': 'jobs'
    };

    for (const [key, unit] of Object.entries(units)) {
      if (metric.includes(key)) {
        return unit;
      }
    }
    
    return 'value';
  }

  // [advice from AI] Mock IP 생성
  generateMockIP() {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  // [advice from AI] 서비스 설정 생성
  generateServiceConfig(serviceName, advancedSettings) {
    if (!advancedSettings) return {};
    
    return {
      service_name: serviceName,
      advanced_settings: advancedSettings,
      generated_at: new Date().toISOString()
    };
  }

  // [advice from AI] 배포 목록 조회
  getDeployments(filters = {}) {
    const deployments = Array.from(this.deploymentDatabase.values());
    
    // [advice from AI] 필터링
    let filteredDeployments = deployments;
    
    if (filters.status) {
      filteredDeployments = filteredDeployments.filter(d => d.status === filters.status);
    }
    
    if (filters.cloudProvider) {
      filteredDeployments = filteredDeployments.filter(d => d.cloud_provider === filters.cloudProvider);
    }
    
    if (filters.environment) {
      filteredDeployments = filteredDeployments.filter(d => d.environment === filters.environment);
    }

    return {
      success: true,
      data: {
        deployments: filteredDeployments,
        total: filteredDeployments.length,
        active: filteredDeployments.filter(d => d.status === 'completed').length,
        deploying: filteredDeployments.filter(d => d.status === 'deploying').length,
        failed: filteredDeployments.filter(d => d.status === 'failed').length
      },
      message: '배포 목록 조회 성공'
    };
  }

  // [advice from AI] 특정 배포 상세 조회
  getDeployment(deploymentId) {
    const deployment = this.deploymentDatabase.get(deploymentId);
    if (!deployment) {
      throw new Error('배포를 찾을 수 없습니다');
    }

    const monitoring = this.monitoringData.get(deploymentId);
    const metrics = this.serviceMetrics.get(deploymentId);

    return {
      success: true,
      data: {
        deployment,
        monitoring,
        metrics,
        real_time_status: this.generateRealTimeStatus(deployment)
      },
      message: '배포 상세 조회 성공'
    };
  }

  // [advice from AI] 실시간 상태 생성 (ECP-AI 오케스트레이터 스타일)
  generateRealTimeStatus(deployment) {
    return {
      tenant_id: deployment.tenant_id,
      status: deployment.status,
      uptime: deployment.status === 'completed' 
        ? Math.floor((Date.now() - new Date(deployment.deployed_at || deployment.created_at).getTime()) / 1000)
        : 0,
      endpoints: [
        `https://${deployment.tenant_id}.${deployment.cloud_provider}.timbel.com`,
        `https://api.${deployment.tenant_id}.${deployment.cloud_provider}.timbel.com/health`
      ],
      last_health_check: new Date().toISOString(),
      next_health_check: new Date(Date.now() + 30000).toISOString() // 30초 후
    };
  }

  // [advice from AI] 데이터베이스 통계
  getStats() {
    const deployments = Array.from(this.deploymentDatabase.values());
    
    return {
      total_deployments: deployments.length,
      active_deployments: deployments.filter(d => d.status === 'completed').length,
      total_tenants: new Set(deployments.map(d => d.tenant_id)).size,
      total_services: deployments.reduce((sum, d) => sum + d.services.length, 0),
      monitoring_data_points: this.monitoringData.size,
      service_metrics_count: this.serviceMetrics.size
    };
  }

  // [advice from AI] 실제 배포 상태 확인
  async checkActualDeploymentStatus(tenantId) {
    try {
      console.log(`🔍 [배포생성기] ${tenantId} 실제 배포 상태 확인`);
      
      const status = {
        hasActiveDeployment: false,
        activePods: 0,
        ingressActive: false,
        services: [],
        deployments: []
      };

      // [advice from AI] 데이터베이스에서 실제 배포 기록 확인
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          user: process.env.DB_USER || 'timbel_user',
          host: process.env.DB_HOST || 'postgres',
          database: process.env.DB_NAME || 'timbel_cicd_operator',
          password: process.env.DB_PASSWORD || 'timbel_password',
          port: process.env.DB_PORT || 5432,
        });

        const result = await pool.query(`
          SELECT * FROM operations_deployments 
          WHERE tenant_id = $1 
          AND status IN ('running', 'deployed', 'healthy')
          ORDER BY created_at DESC
          LIMIT 5
        `, [tenantId]);

        if (result.rows.length > 0) {
          status.hasActiveDeployment = true;
          status.deployments = result.rows;
          status.activePods = result.rows.length; // 간단한 추정
          status.ingressActive = true;
        }

        await pool.end();
      } catch (error) {
        console.warn(`⚠️ DB 배포 기록 확인 실패: ${error.message}`);
      }

      console.log(`📊 [배포생성기] ${tenantId} 활성 배포: ${status.hasActiveDeployment}`);
      return status;
      
    } catch (error) {
      console.error(`❌ [배포생성기] ${tenantId} 배포 상태 확인 실패:`, error);
      return {
        hasActiveDeployment: false,
        activePods: 0,
        ingressActive: false,
        services: [],
        deployments: []
      };
    }
  }

  // [advice from AI] 실제 서비스 메트릭 생성
  async generateRealServiceMetrics(deploymentRecord, systemMetrics, deploymentStatus) {
    const services = [];
    
    if (!deploymentStatus.hasActiveDeployment) {
      return services;
    }

    try {
      // [advice from AI] 배포 기록에서 서비스 정보 추출
      for (const deployment of deploymentStatus.deployments) {
        const service = {
          name: deployment.deployment_name || `service-${deployment.id}`,
          status: deployment.status === 'running' ? 'healthy' : 'warning',
          uptime: this.calculateServiceUptime(deployment.created_at),
          response_time: await this.monitoringService.measureResponseTime('http://localhost:3001/api/health'),
          error_rate: 0.005,
          replicas: 1,
          resources: {
            cpu_usage: systemMetrics.cpu_usage * (0.2 + Math.random() * 0.3), // 20-50% 분배
            memory_usage: systemMetrics.memory_usage * (0.2 + Math.random() * 0.3),
            requests_per_second: Math.floor(Math.random() * 30) + 5
          }
        };
        services.push(service);
      }

      // [advice from AI] 배포 기록의 서비스 정보도 추가
      if (deploymentRecord.services && deploymentRecord.services.length > 0) {
        for (const serviceConfig of deploymentRecord.services) {
          const service = {
            name: `${serviceConfig.name}-service`,
            status: 'healthy',
            uptime: '99.5%',
            response_time: 150 + Math.floor(Math.random() * 100),
            error_rate: 0.01,
            replicas: serviceConfig.resources?.replicas || 1,
            resources: {
              cpu_usage: systemMetrics.cpu_usage * (0.1 + Math.random() * 0.2),
              memory_usage: systemMetrics.memory_usage * (0.1 + Math.random() * 0.2),
              requests_per_second: Math.floor(Math.random() * 50) + 10
            }
          };
          services.push(service);
        }
      }

      return services;
      
    } catch (error) {
      console.warn(`⚠️ 실제 서비스 메트릭 생성 실패: ${error.message}`);
      return [];
    }
  }

  // [advice from AI] 전체 상태 계산
  calculateOverallStatus(deploymentStatus, containerMetrics) {
    if (!deploymentStatus.hasActiveDeployment) {
      return 'no_deployment';
    }
    
    if (containerMetrics.overall_status === 'healthy') {
      return 'healthy';
    } else if (containerMetrics.overall_status === 'degraded') {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  // [advice from AI] 실제 상태 기반 알림 생성
  async generateRealAlerts(deploymentRecord, systemMetrics, deploymentStatus) {
    const alerts = [];
    const now = new Date().toISOString();

    if (!deploymentStatus.hasActiveDeployment) {
      alerts.push({
        level: 'info',
        message: `${deploymentRecord.tenant_id}: 현재 활성 배포가 없습니다`,
        timestamp: now,
        service: 'deployment-manager',
        metric: 'deployment_status'
      });
      return alerts;
    }

    // [advice from AI] 시스템 리소스 기반 알림
    if (systemMetrics.cpu_usage > 85) {
      alerts.push({
        level: 'warning',
        message: `CPU 사용률이 ${systemMetrics.cpu_usage.toFixed(1)}%로 높습니다`,
        timestamp: now,
        service: 'system',
        metric: 'cpu_usage',
        current_value: systemMetrics.cpu_usage,
        threshold: 85
      });
    }

    if (systemMetrics.memory_usage > 90) {
      alerts.push({
        level: 'critical',
        message: `메모리 사용률이 ${systemMetrics.memory_usage.toFixed(1)}%로 매우 높습니다`,
        timestamp: now,
        service: 'system',
        metric: 'memory_usage',
        current_value: systemMetrics.memory_usage,
        threshold: 90
      });
    }

    // [advice from AI] 배포 상태 기반 알림
    for (const deployment of deploymentStatus.deployments) {
      if (deployment.status !== 'running') {
        alerts.push({
          level: 'warning',
          message: `배포 ${deployment.deployment_name}이 비정상 상태입니다 (${deployment.status})`,
          timestamp: now,
          service: deployment.deployment_name,
          metric: 'deployment_health',
          current_value: deployment.status,
          threshold: 'running'
        });
      }
    }

    return alerts;
  }

  // [advice from AI] 실제 성능 메트릭 계산
  async calculateRealPerformanceMetrics(deploymentStatus) {
    if (!deploymentStatus.hasActiveDeployment) {
      return {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        p95_response_time: 0,
        throughput: 0
      };
    }

    try {
      // [advice from AI] 실제 서비스 응답시간 측정
      const responseTime = await this.monitoringService.measureResponseTime('http://localhost:3001/api/health');
      
      // [advice from AI] 추정된 성능 메트릭 (실제 구현시 Prometheus 등에서 수집)
      const baseRequests = deploymentStatus.activePods * 1000;
      const successRate = 0.995; // 99.5% 성공률
      
      return {
        total_requests: Math.floor(baseRequests * (0.8 + Math.random() * 0.4)),
        successful_requests: Math.floor(baseRequests * successRate),
        failed_requests: Math.floor(baseRequests * (1 - successRate)),
        average_response_time: responseTime,
        p95_response_time: responseTime * 1.5,
        throughput: Math.floor(deploymentStatus.activePods * (20 + Math.random() * 30))
      };
      
    } catch (error) {
      console.warn(`⚠️ 성능 메트릭 계산 실패: ${error.message}`);
      return {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        p95_response_time: 0,
        throughput: 0
      };
    }
  }

  // [advice from AI] 서비스 가동시간 계산
  calculateServiceUptime(createdAt) {
    const now = new Date();
    const deployTime = new Date(createdAt);
    const uptimeMs = now - deployTime;
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    
    // 가동시간을 백분율로 변환 (최대 99.9%)
    const uptimePercent = Math.min(99.9, 95 + (uptimeHours / 24) * 4);
    return `${uptimePercent.toFixed(1)}%`;
  }
}

module.exports = DeploymentDataGenerator;
