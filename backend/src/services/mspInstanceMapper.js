// [advice from AI] MSP별 인스턴스 매핑 시스템
// 하드웨어 리소스 계산 결과를 AWS, NCP, Azure, GCP 인스턴스로 매핑

class MSPInstanceMapper {
  constructor() {
    // [advice from AI] MSP별 인스턴스 타입 매핑 테이블
    this.instanceMappings = {
      aws: {
        cpu_instances: [
          { type: 'c5.large', cpu: 2, memory: 4, cost_per_hour: 0.085 },
          { type: 'c5.xlarge', cpu: 4, memory: 8, cost_per_hour: 0.17 },
          { type: 'c5.2xlarge', cpu: 8, memory: 16, cost_per_hour: 0.34 },
          { type: 'c5.4xlarge', cpu: 16, memory: 32, cost_per_hour: 0.68 },
          { type: 'c5.9xlarge', cpu: 36, memory: 72, cost_per_hour: 1.53 }
        ],
        gpu_instances: [
          { type: 'g4dn.xlarge', cpu: 4, memory: 16, gpu: 1, gpu_type: 'T4', cost_per_hour: 0.526 },
          { type: 'g4dn.2xlarge', cpu: 8, memory: 32, gpu: 1, gpu_type: 'T4', cost_per_hour: 0.752 },
          { type: 'g4dn.4xlarge', cpu: 16, memory: 64, gpu: 1, gpu_type: 'T4', cost_per_hour: 1.204 },
          { type: 'g4dn.8xlarge', cpu: 32, memory: 128, gpu: 1, gpu_type: 'T4', cost_per_hour: 2.176 },
          { type: 'p3.2xlarge', cpu: 8, memory: 61, gpu: 1, gpu_type: 'V100', cost_per_hour: 3.06 }
        ],
        storage_classes: ['gp3', 'io2', 'st1'],
        regions: ['ap-northeast-2', 'ap-northeast-1', 'us-east-1', 'us-west-2']
      },
      ncp: {
        cpu_instances: [
          { type: 'c2-standard-2', cpu: 2, memory: 8, cost_per_hour: 0.096 },
          { type: 'c2-standard-4', cpu: 4, memory: 16, cost_per_hour: 0.192 },
          { type: 'c2-standard-8', cpu: 8, memory: 32, cost_per_hour: 0.384 },
          { type: 'c2-standard-16', cpu: 16, memory: 64, cost_per_hour: 0.768 },
          { type: 'c2-standard-32', cpu: 32, memory: 128, cost_per_hour: 1.536 }
        ],
        gpu_instances: [
          { type: 'g2-standard-4', cpu: 4, memory: 16, gpu: 1, gpu_type: 'V100', cost_per_hour: 1.2 },
          { type: 'g2-standard-8', cpu: 8, memory: 32, gpu: 1, gpu_type: 'V100', cost_per_hour: 1.8 },
          { type: 'g2-standard-16', cpu: 16, memory: 64, gpu: 1, gpu_type: 'V100', cost_per_hour: 2.4 },
          { type: 'g2-standard-32', cpu: 32, memory: 128, gpu: 1, gpu_type: 'V100', cost_per_hour: 3.6 }
        ],
        storage_classes: ['SSD', 'HDD'],
        regions: ['KR-1', 'KR-2']
      },
      azure: {
        cpu_instances: [
          { type: 'Standard_D2s_v3', cpu: 2, memory: 8, cost_per_hour: 0.096 },
          { type: 'Standard_D4s_v3', cpu: 4, memory: 16, cost_per_hour: 0.192 },
          { type: 'Standard_D8s_v3', cpu: 8, memory: 32, cost_per_hour: 0.384 },
          { type: 'Standard_D16s_v3', cpu: 16, memory: 64, cost_per_hour: 0.768 }
        ],
        gpu_instances: [
          { type: 'Standard_NC6s_v3', cpu: 6, memory: 112, gpu: 1, gpu_type: 'V100', cost_per_hour: 3.06 },
          { type: 'Standard_NC12s_v3', cpu: 12, memory: 224, gpu: 2, gpu_type: 'V100', cost_per_hour: 6.12 }
        ],
        storage_classes: ['Premium_SSD', 'Standard_SSD'],
        regions: ['koreacentral', 'koreasouth', 'eastus', 'westus2']
      },
      gcp: {
        cpu_instances: [
          { type: 'n2-standard-2', cpu: 2, memory: 8, cost_per_hour: 0.097 },
          { type: 'n2-standard-4', cpu: 4, memory: 16, cost_per_hour: 0.194 },
          { type: 'n2-standard-8', cpu: 8, memory: 32, cost_per_hour: 0.388 },
          { type: 'n2-standard-16', cpu: 16, memory: 64, cost_per_hour: 0.776 }
        ],
        gpu_instances: [
          { type: 'n1-standard-4-k80', cpu: 4, memory: 15, gpu: 1, gpu_type: 'K80', cost_per_hour: 0.45 },
          { type: 'n1-standard-8-v100', cpu: 8, memory: 30, gpu: 1, gpu_type: 'V100', cost_per_hour: 2.48 }
        ],
        storage_classes: ['pd-ssd', 'pd-standard'],
        regions: ['asia-northeast3', 'asia-northeast1', 'us-central1']
      }
    };
  }

  // [advice from AI] 하드웨어 계산 결과를 MSP별 인스턴스로 매핑
  async mapHardwareToMSPInstances(hardwareResult, cloudProvider, region) {
    try {
      console.log('🔄 MSP 인스턴스 매핑 시작:', { cloudProvider, region });

      const mspData = this.instanceMappings[cloudProvider];
      if (!mspData) {
        throw new Error(`지원되지 않는 클라우드 제공업체: ${cloudProvider}`);
      }

      const mappedInstances = [];

      // [advice from AI] 서버 구성별 최적 인스턴스 매핑
      for (const serverConfig of hardwareResult.serverConfigurations) {
        const requiredCpu = serverConfig.cpu_cores;
        const requiredMemory = serverConfig.ram_gb;
        const requiredGpu = serverConfig.gpu_quantity === '-' ? 0 : parseInt(serverConfig.gpu_quantity) || 0;

        let selectedInstance;

        if (requiredGpu > 0) {
          // [advice from AI] GPU가 필요한 경우 GPU 인스턴스 선택
          selectedInstance = this.findBestGPUInstance(mspData.gpu_instances, requiredCpu, requiredMemory, requiredGpu);
        } else {
          // [advice from AI] CPU 전용 인스턴스 선택
          selectedInstance = this.findBestCPUInstance(mspData.cpu_instances, requiredCpu, requiredMemory);
        }

        if (selectedInstance) {
          mappedInstances.push({
            server_role: serverConfig.role,
            server_config: serverConfig,
            msp_instance: selectedInstance,
            cloud_provider: cloudProvider,
            region: region,
            estimated_monthly_cost: selectedInstance.cost_per_hour * 24 * 30, // 월 비용
            storage_class: mspData.storage_classes[0], // 기본 스토리지 클래스
            networking: this.generateNetworkingConfig(cloudProvider, region),
            security: this.generateSecurityConfig(cloudProvider),
            monitoring: this.generateMonitoringConfig(selectedInstance),
            deployment_manifest: this.generateDeploymentManifest(serverConfig, selectedInstance, cloudProvider)
          });
        }
      }

      const totalMonthlyCost = mappedInstances.reduce((sum, instance) => sum + instance.estimated_monthly_cost, 0);

      console.log(`✅ MSP 인스턴스 매핑 완료: ${mappedInstances.length}개 인스턴스`);

      return {
        success: true,
        data: {
          cloud_provider: cloudProvider,
          region: region,
          mapped_instances: mappedInstances,
          total_instances: mappedInstances.length,
          total_monthly_cost: totalMonthlyCost,
          total_cpu: mappedInstances.reduce((sum, i) => sum + i.msp_instance.cpu, 0),
          total_memory: mappedInstances.reduce((sum, i) => sum + i.msp_instance.memory, 0),
          total_gpu: mappedInstances.reduce((sum, i) => sum + (i.msp_instance.gpu || 0), 0),
          deployment_ready: true,
          created_at: new Date().toISOString()
        },
        message: 'MSP 인스턴스 매핑 완료'
      };

    } catch (error) {
      console.error('MSP 인스턴스 매핑 오류:', error);
      throw new Error(`MSP 인스턴스 매핑 실패: ${error.message}`);
    }
  }

  // [advice from AI] 최적 CPU 인스턴스 찾기
  findBestCPUInstance(cpuInstances, requiredCpu, requiredMemory) {
    return cpuInstances
      .filter(instance => instance.cpu >= requiredCpu && instance.memory >= requiredMemory)
      .sort((a, b) => a.cost_per_hour - b.cost_per_hour)[0]; // 가장 저렴한 것
  }

  // [advice from AI] 최적 GPU 인스턴스 찾기
  findBestGPUInstance(gpuInstances, requiredCpu, requiredMemory, requiredGpu) {
    return gpuInstances
      .filter(instance => 
        instance.cpu >= requiredCpu && 
        instance.memory >= requiredMemory && 
        instance.gpu >= requiredGpu
      )
      .sort((a, b) => a.cost_per_hour - b.cost_per_hour)[0];
  }

  // [advice from AI] 네트워킹 설정 생성
  generateNetworkingConfig(cloudProvider, region) {
    const configs = {
      aws: {
        vpc_cidr: '10.0.0.0/16',
        subnet_cidrs: ['10.0.1.0/24', '10.0.2.0/24'],
        load_balancer_type: 'ALB',
        ingress_controller: 'nginx'
      },
      ncp: {
        vpc_cidr: '192.168.0.0/16',
        subnet_cidrs: ['192.168.1.0/24', '192.168.2.0/24'],
        load_balancer_type: 'NLB',
        ingress_controller: 'nginx'
      },
      azure: {
        vnet_cidr: '10.1.0.0/16',
        subnet_cidrs: ['10.1.1.0/24', '10.1.2.0/24'],
        load_balancer_type: 'Standard',
        ingress_controller: 'application-gateway'
      },
      gcp: {
        vpc_cidr: '10.2.0.0/16',
        subnet_cidrs: ['10.2.1.0/24', '10.2.2.0/24'],
        load_balancer_type: 'GCLB',
        ingress_controller: 'gce'
      }
    };

    return configs[cloudProvider] || configs.aws;
  }

  // [advice from AI] 보안 설정 생성
  generateSecurityConfig(cloudProvider) {
    return {
      network_policies: true,
      rbac_enabled: true,
      pod_security_standards: 'restricted',
      secrets_encryption: true,
      audit_logging: true,
      vulnerability_scanning: true,
      tls_termination: 'ingress',
      certificate_manager: cloudProvider === 'aws' ? 'cert-manager' : 
                          cloudProvider === 'azure' ? 'key-vault' : 'cert-manager'
    };
  }

  // [advice from AI] 모니터링 설정 생성
  generateMonitoringConfig(instance) {
    return {
      prometheus_enabled: true,
      grafana_enabled: true,
      alertmanager_enabled: true,
      log_aggregation: 'fluentd',
      metrics_retention: '30d',
      log_retention: '7d',
      custom_metrics: [
        'cpu_usage_percent',
        'memory_usage_percent',
        'disk_io_ops',
        'network_bytes_total'
      ],
      alerts: [
        {
          name: 'HighCPUUsage',
          threshold: 80,
          duration: '5m',
          severity: 'warning'
        },
        {
          name: 'HighMemoryUsage', 
          threshold: 85,
          duration: '5m',
          severity: 'warning'
        },
        {
          name: 'InstanceDown',
          threshold: 0,
          duration: '1m',
          severity: 'critical'
        }
      ]
    };
  }

  // [advice from AI] 배포 매니페스트 생성
  generateDeploymentManifest(serverConfig, mspInstance, cloudProvider) {
    const serverName = serverConfig.role.replace(/\s+/g, '-').toLowerCase().replace(/[()]/g, '');
    
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `${serverName}-deployment`,
        labels: {
          app: serverName,
          'cloud-provider': cloudProvider,
          'instance-type': mspInstance.type,
          'managed-by': 'timbel-platform'
        },
        annotations: {
          'timbel.io/server-role': serverConfig.role,
          'timbel.io/msp-instance': mspInstance.type,
          'timbel.io/estimated-cost': `$${(mspInstance.cost_per_hour * 24 * 30).toFixed(2)}/month`
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: serverName
          }
        },
        template: {
          metadata: {
            labels: {
              app: serverName,
              version: 'v1.0.0'
            }
          },
          spec: {
            containers: [{
              name: serverName,
              image: `ecp-ai/${serverName}:latest`,
              resources: {
                requests: {
                  cpu: `${serverConfig.cpu_cores}`,
                  memory: `${serverConfig.ram_gb}Gi`
                },
                limits: {
                  cpu: `${serverConfig.cpu_cores * 2}`,
                  memory: `${serverConfig.ram_gb * 2}Gi`
                }
              },
              ports: [{
                containerPort: 8080,
                name: 'http'
              }],
              env: [
                {
                  name: 'CLOUD_PROVIDER',
                  value: cloudProvider
                },
                {
                  name: 'INSTANCE_TYPE',
                  value: mspInstance.type
                },
                {
                  name: 'SERVER_ROLE',
                  value: serverConfig.role
                }
              ]
            }],
            nodeSelector: {
              'kubernetes.io/arch': 'amd64',
              'node.kubernetes.io/instance-type': mspInstance.type
            }
          }
        }
      }
    };
  }

  // [advice from AI] 비용 최적화 분석
  async analyzeCostOptimization(mappedInstances) {
    const analysis = {
      current_cost: mappedInstances.reduce((sum, i) => sum + i.estimated_monthly_cost, 0),
      optimizations: [],
      savings_opportunities: []
    };

    // [advice from AI] 오버프로비저닝 검사
    mappedInstances.forEach(instance => {
      const cpuUtilization = (instance.server_config.cpu_cores / instance.msp_instance.cpu) * 100;
      const memoryUtilization = (instance.server_config.ram_gb / instance.msp_instance.memory) * 100;

      if (cpuUtilization < 50) {
        analysis.optimizations.push({
          instance: instance.msp_instance.type,
          issue: 'CPU 오버프로비저닝',
          current_utilization: `${cpuUtilization.toFixed(1)}%`,
          recommendation: '더 작은 인스턴스 타입 사용 권장'
        });
      }

      if (memoryUtilization < 50) {
        analysis.optimizations.push({
          instance: instance.msp_instance.type,
          issue: '메모리 오버프로비저닝',
          current_utilization: `${memoryUtilization.toFixed(1)}%`,
          recommendation: '메모리 최적화된 인스턴스 타입 고려'
        });
      }
    });

    return analysis;
  }

  // [advice from AI] 배포 검증
  async validateDeploymentConfiguration(mappedInstances, tenantConfig) {
    const validationResults = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    // [advice from AI] 리소스 검증
    mappedInstances.forEach(instance => {
      if (instance.msp_instance.cpu < 1) {
        validationResults.warnings.push(`${instance.server_role}: CPU가 1 Core 미만입니다`);
      }

      if (instance.msp_instance.memory < 1) {
        validationResults.errors.push(`${instance.server_role}: 메모리가 1GB 미만입니다`);
        validationResults.valid = false;
      }
    });

    // [advice from AI] 네트워크 포트 충돌 검사
    const usedPorts = new Set();
    mappedInstances.forEach(instance => {
      const ports = instance.deployment_manifest.spec.template.spec.containers[0].ports;
      ports.forEach(port => {
        if (usedPorts.has(port.containerPort)) {
          validationResults.warnings.push(`포트 ${port.containerPort} 충돌 가능성`);
        }
        usedPorts.add(port.containerPort);
      });
    });

    // [advice from AI] 비용 검증
    const totalCost = mappedInstances.reduce((sum, i) => sum + i.estimated_monthly_cost, 0);
    if (totalCost > 10000) { // $10,000 이상
      validationResults.warnings.push(`월 예상 비용이 $${totalCost.toFixed(0)}로 높습니다`);
      validationResults.recommendations.push('비용 최적화 검토를 권장합니다');
    }

    return validationResults;
  }

  // [advice from AI] 배포 패키지 생성 (다운로드용)
  async generateDeploymentPackage(tenantConfig, mappedInstances, manifests) {
    const deploymentPackage = {
      metadata: {
        tenant_id: tenantConfig.tenantId,
        tenant_name: tenantConfig.tenantName,
        cloud_provider: tenantConfig.cloudProvider,
        region: tenantConfig.region,
        deployment_mode: tenantConfig.deploymentMode,
        created_at: new Date().toISOString(),
        created_by: 'timbel-deployment-wizard'
      },
      hardware_specification: {
        total_instances: mappedInstances.length,
        total_cpu: mappedInstances.reduce((sum, i) => sum + i.msp_instance.cpu, 0),
        total_memory: mappedInstances.reduce((sum, i) => sum + i.msp_instance.memory, 0),
        total_gpu: mappedInstances.reduce((sum, i) => sum + (i.msp_instance.gpu || 0), 0),
        estimated_monthly_cost: mappedInstances.reduce((sum, i) => sum + i.estimated_monthly_cost, 0)
      },
      msp_instances: mappedInstances,
      kubernetes_manifests: manifests,
      deployment_scripts: {
        [`deploy-${tenantConfig.cloudProvider}.sh`]: this.generateDeploymentScript(tenantConfig.cloudProvider, manifests),
        [`cleanup-${tenantConfig.cloudProvider}.sh`]: this.generateCleanupScript(tenantConfig.cloudProvider, tenantConfig.tenantId)
      },
      configuration_files: {
        'terraform/main.tf': this.generateTerraformConfig(mappedInstances, tenantConfig.cloudProvider),
        'ansible/playbook.yml': this.generateAnsiblePlaybook(mappedInstances),
        'monitoring/prometheus.yml': this.generatePrometheusConfig(tenantConfig.tenantId),
        'monitoring/grafana-dashboard.json': this.generateGrafanaDashboard(tenantConfig.tenantId)
      }
    };

    return {
      success: true,
      data: deploymentPackage,
      message: '배포 패키지 생성 완료'
    };
  }

  // [advice from AI] 배포 스크립트 생성
  generateDeploymentScript(cloudProvider, manifests) {
    const manifestFiles = Object.keys(manifests).map(name => `${name}.yaml`).join(' ');
    
    return `#!/bin/bash
# [advice from AI] ${cloudProvider.toUpperCase()} 배포 스크립트 (Timbel 자동 생성)

set -e

echo "🚀 ${cloudProvider.toUpperCase()} 배포 시작..."

# kubectl 연결 확인
kubectl cluster-info

# 네임스페이스 생성
kubectl apply -f namespace.yaml

# 매니페스트 적용
kubectl apply -f ${manifestFiles}

# 배포 상태 확인
kubectl rollout status deployment --all --timeout=600s

echo "✅ 배포 완료!"
`;
  }

  // [advice from AI] 정리 스크립트 생성
  generateCleanupScript(cloudProvider, tenantId) {
    return `#!/bin/bash
# [advice from AI] ${cloudProvider.toUpperCase()} 정리 스크립트 (Timbel 자동 생성)

set -e

echo "🗑️ ${tenantId} 테넌트 정리 시작..."

# 네임스페이스 삭제 (모든 리소스 함께 삭제)
kubectl delete namespace ${tenantId} --ignore-not-found=true

echo "✅ 정리 완료!"
`;
  }

  // [advice from AI] Terraform 설정 생성
  generateTerraformConfig(mappedInstances, cloudProvider) {
    return `# [advice from AI] ${cloudProvider.toUpperCase()} Terraform 설정 (Timbel 자동 생성)

terraform {
  required_providers {
    ${cloudProvider === 'aws' ? 'aws' : cloudProvider} = {
      source  = "hashicorp/${cloudProvider === 'aws' ? 'aws' : cloudProvider}"
      version = "~> 5.0"
    }
  }
}

# 인스턴스 리소스
${mappedInstances.map((instance, index) => `
resource "${cloudProvider === 'aws' ? 'aws_instance' : cloudProvider + '_instance'}" "server_${index + 1}" {
  instance_type = "${instance.msp_instance.type}"
  
  tags = {
    Name = "${instance.server_role}"
    ManagedBy = "timbel-platform"
    ServerRole = "${instance.server_role}"
  }
}
`).join('\n')}
`;
  }

  // [advice from AI] Ansible 플레이북 생성
  generateAnsiblePlaybook(mappedInstances) {
    return `---
# [advice from AI] Ansible 플레이북 (Timbel 자동 생성)
- name: ECP-AI 서비스 배포
  hosts: all
  become: yes
  
  tasks:
    - name: Docker 설치
      apt:
        name: docker.io
        state: present
        
    - name: Kubernetes 설치
      shell: |
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        mv kubectl /usr/local/bin/
        
    ${mappedInstances.map(instance => `
    - name: ${instance.server_role} 서비스 배포
      k8s:
        definition: "{{ lookup('file', '${instance.server_role}-deployment.yaml') | from_yaml }}"
        state: present
    `).join('\n')}
`;
  }

  // [advice from AI] Prometheus 설정 생성
  generatePrometheusConfig(tenantId) {
    return `# [advice from AI] Prometheus 설정 (Timbel 자동 생성)
global:
  scrape_interval: 30s
  evaluation_interval: 30s

rule_files:
  - "${tenantId}-alerts.yml"

scrape_configs:
  - job_name: '${tenantId}-services'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - ${tenantId}
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
`;
  }

  // [advice from AI] Grafana 대시보드 생성
  generateGrafanaDashboard(tenantId) {
    return JSON.stringify({
      dashboard: {
        title: `${tenantId} 모니터링 대시보드`,
        tags: ['timbel', 'ecp-ai', tenantId],
        timezone: 'Asia/Seoul',
        panels: [
          {
            title: 'CPU 사용률',
            type: 'graph',
            targets: [{
              expr: `avg(cpu_usage{tenant="${tenantId}"})`
            }]
          },
          {
            title: '메모리 사용률',
            type: 'graph', 
            targets: [{
              expr: `avg(memory_usage{tenant="${tenantId}"})`
            }]
          },
          {
            title: '서비스 상태',
            type: 'stat',
            targets: [{
              expr: `up{tenant="${tenantId}"}`
            }]
          }
        ]
      }
    }, null, 2);
  }
}

module.exports = MSPInstanceMapper;
