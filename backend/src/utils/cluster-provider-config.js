// [advice from AI] 클라우드 프로바이더별 Kubernetes 클러스터 배포 설정
// 각 프로바이더의 특성에 맞는 배포 매니페스트 생성 및 설정

/**
 * 프로바이더별 기본 설정 템플릿
 */
const PROVIDER_DEFAULTS = {
  aws: {
    ingress_class: 'alb',
    storage_class: 'gp3',
    load_balancer_type: 'nlb',
    service_type: 'LoadBalancer',
    annotations: {
      'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb',
      'service.beta.kubernetes.io/aws-load-balancer-backend-protocol': 'tcp'
    },
    env_vars: {
      AWS_REGION: '${region}',
      AWS_DEFAULT_REGION: '${region}'
    }
  },
  gcp: {
    ingress_class: 'gce',
    storage_class: 'standard-rwo',
    load_balancer_type: 'gce',
    service_type: 'LoadBalancer',
    annotations: {
      'cloud.google.com/load-balancer-type': 'External'
    },
    env_vars: {
      GCP_PROJECT: '${project_id}',
      GCP_REGION: '${region}'
    }
  },
  azure: {
    ingress_class: 'azure-application-gateway',
    storage_class: 'managed-csi',
    load_balancer_type: 'azure',
    service_type: 'LoadBalancer',
    annotations: {
      'service.beta.kubernetes.io/azure-load-balancer-internal': 'false'
    },
    env_vars: {
      AZURE_SUBSCRIPTION_ID: '${subscription_id}',
      AZURE_RESOURCE_GROUP: '${resource_group}'
    }
  },
  ncp: {
    ingress_class: 'nginx',
    storage_class: 'nks-block-storage',
    load_balancer_type: 'ncloud',
    service_type: 'LoadBalancer',
    annotations: {
      'service.beta.kubernetes.io/ncloud-load-balancer-type': 'network'
    },
    env_vars: {
      NCLOUD_REGION: '${region}'
    }
  },
  'on-premise': {
    ingress_class: 'nginx',
    storage_class: 'local-path',
    load_balancer_type: 'metallb',
    service_type: 'NodePort',
    annotations: {
      'metallb.universe.tf/allow-shared-ip': 'true'
    },
    env_vars: {}
  },
  kind: {
    ingress_class: 'nginx',
    storage_class: 'standard',
    load_balancer_type: 'none',
    service_type: 'NodePort',
    annotations: {},
    env_vars: {}
  }
};

/**
 * 클러스터 설정 기반 배포 매니페스트 생성
 */
function generateDeploymentManifest(cluster, applicationConfig) {
  const provider = cluster.cloud_provider || 'on-premise';
  const providerConfig = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS['on-premise'];
  
  const manifest = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: applicationConfig.name,
      namespace: applicationConfig.namespace || 'default',
      labels: {
        app: applicationConfig.name,
        cluster: cluster.cluster_name,
        provider: provider,
        environment: cluster.cluster_type
      }
    },
    spec: {
      replicas: applicationConfig.replicas || getDefaultReplicas(cluster.cluster_type),
      selector: {
        matchLabels: {
          app: applicationConfig.name
        }
      },
      template: {
        metadata: {
          labels: {
            app: applicationConfig.name,
            version: applicationConfig.version || 'latest'
          }
        },
        spec: {
          containers: [
            {
              name: applicationConfig.name,
              image: applicationConfig.image,
              ports: applicationConfig.ports || [{ containerPort: 8080 }],
              env: generateEnvironmentVariables(cluster, providerConfig, applicationConfig),
              resources: getResourceLimits(cluster, applicationConfig),
              ...getProviderSpecificContainerConfig(provider, applicationConfig)
            }
          ],
          ...getProviderSpecificPodConfig(provider, cluster)
        }
      }
    }
  };

  return manifest;
}

/**
 * Service 매니페스트 생성
 */
function generateServiceManifest(cluster, applicationConfig) {
  const provider = cluster.cloud_provider || 'on-premise';
  const providerConfig = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS['on-premise'];
  
  const manifest = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: `${applicationConfig.name}-service`,
      namespace: applicationConfig.namespace || 'default',
      annotations: {
        ...providerConfig.annotations,
        'timbel.io/cluster': cluster.cluster_name,
        'timbel.io/provider': provider
      }
    },
    spec: {
      type: providerConfig.service_type,
      selector: {
        app: applicationConfig.name
      },
      ports: (applicationConfig.ports || [{ containerPort: 8080 }]).map((port, index) => ({
        name: `port-${index}`,
        port: port.port || port.containerPort,
        targetPort: port.containerPort,
        protocol: port.protocol || 'TCP'
      })),
      ...getProviderSpecificServiceConfig(provider, cluster)
    }
  };

  return manifest;
}

/**
 * Ingress 매니페스트 생성
 */
function generateIngressManifest(cluster, applicationConfig) {
  const provider = cluster.cloud_provider || 'on-premise';
  const providerConfig = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS['on-premise'];
  
  // Ingress가 필요 없는 경우
  if (!applicationConfig.ingress_enabled) {
    return null;
  }

  const manifest = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: `${applicationConfig.name}-ingress`,
      namespace: applicationConfig.namespace || 'default',
      annotations: {
        'kubernetes.io/ingress.class': cluster.ingress_class || providerConfig.ingress_class,
        ...getProviderSpecificIngressAnnotations(provider, cluster, applicationConfig)
      }
    },
    spec: {
      rules: [
        {
          host: applicationConfig.domain || `${applicationConfig.name}.${cluster.cluster_name}.local`,
          http: {
            paths: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: `${applicationConfig.name}-service`,
                    port: {
                      number: applicationConfig.ports?.[0]?.port || 8080
                    }
                  }
                }
              }
            ]
          }
        }
      ],
      ...getProviderSpecificIngressConfig(provider, cluster)
    }
  };

  return manifest;
}

/**
 * 환경변수 생성
 */
function generateEnvironmentVariables(cluster, providerConfig, applicationConfig) {
  const baseEnvs = [
    { name: 'CLUSTER_NAME', value: cluster.cluster_name },
    { name: 'CLUSTER_TYPE', value: cluster.cluster_type },
    { name: 'CLOUD_PROVIDER', value: cluster.cloud_provider },
    { name: 'KUBERNETES_VERSION', value: cluster.kubernetes_version || 'unknown' }
  ];

  // 프로바이더별 환경변수 추가
  const providerEnvs = Object.entries(providerConfig.env_vars || {}).map(([key, value]) => ({
    name: key,
    value: interpolateValue(value, cluster)
  }));

  // 애플리케이션 커스텀 환경변수
  const customEnvs = applicationConfig.env || [];

  return [...baseEnvs, ...providerEnvs, ...customEnvs];
}

/**
 * 리소스 제한 설정
 */
function getResourceLimits(cluster, applicationConfig) {
  // 사용자 정의가 있으면 우선 사용
  if (applicationConfig.resources) {
    return applicationConfig.resources;
  }

  // 클러스터 타입별 기본값
  const resourceDefaults = {
    development: {
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m', memory: '512Mi' }
    },
    staging: {
      requests: { cpu: '200m', memory: '256Mi' },
      limits: { cpu: '1000m', memory: '1Gi' }
    },
    production: {
      requests: { cpu: '500m', memory: '512Mi' },
      limits: { cpu: '2000m', memory: '2Gi' }
    },
    dr: {
      requests: { cpu: '500m', memory: '512Mi' },
      limits: { cpu: '2000m', memory: '2Gi' }
    }
  };

  return resourceDefaults[cluster.cluster_type] || resourceDefaults.development;
}

/**
 * 기본 레플리카 수
 */
function getDefaultReplicas(clusterType) {
  const replicaDefaults = {
    development: 1,
    staging: 2,
    production: 3,
    dr: 2
  };
  return replicaDefaults[clusterType] || 1;
}

/**
 * 프로바이더별 컨테이너 설정
 */
function getProviderSpecificContainerConfig(provider, applicationConfig) {
  const configs = {
    aws: {
      // AWS에서는 IAM Role for Service Account (IRSA) 사용 가능
      volumeMounts: applicationConfig.use_irsa ? [
        { name: 'aws-iam-token', mountPath: '/var/run/secrets/eks.amazonaws.com/serviceaccount', readOnly: true }
      ] : []
    },
    gcp: {
      // GCP에서는 Workload Identity 사용 가능
      volumeMounts: []
    },
    azure: {
      // Azure에서는 Managed Identity 사용 가능
      volumeMounts: []
    },
    'on-premise': {},
    kind: {}
  };

  return configs[provider] || {};
}

/**
 * 프로바이더별 Pod 설정
 */
function getProviderSpecificPodConfig(provider, cluster) {
  const configs = {
    aws: {
      // AWS에서 특정 노드 그룹에 배포
      nodeSelector: cluster.provider_config?.node_selector || {},
      serviceAccountName: cluster.provider_config?.service_account || 'default'
    },
    gcp: {
      nodeSelector: cluster.provider_config?.node_selector || {},
      serviceAccountName: cluster.provider_config?.service_account || 'default'
    },
    azure: {
      nodeSelector: cluster.provider_config?.node_selector || {}
    },
    'on-premise': {},
    kind: {}
  };

  return configs[provider] || {};
}

/**
 * 프로바이더별 Service 설정
 */
function getProviderSpecificServiceConfig(provider, cluster) {
  const configs = {
    aws: {
      // AWS NLB 사용 시 추가 설정
      externalTrafficPolicy: 'Local',
      sessionAffinity: 'ClientIP'
    },
    gcp: {
      externalTrafficPolicy: 'Cluster'
    },
    azure: {
      externalTrafficPolicy: 'Local'
    },
    'on-premise': {
      // MetalLB 사용 시
      externalTrafficPolicy: 'Local'
    },
    kind: {
      // NodePort만 사용
      externalTrafficPolicy: 'Cluster'
    }
  };

  return configs[provider] || {};
}

/**
 * 프로바이더별 Ingress Annotation
 */
function getProviderSpecificIngressAnnotations(provider, cluster, applicationConfig) {
  const annotations = {
    aws: {
      'alb.ingress.kubernetes.io/scheme': 'internet-facing',
      'alb.ingress.kubernetes.io/target-type': 'ip',
      'alb.ingress.kubernetes.io/listen-ports': '[{"HTTP": 80}, {"HTTPS": 443}]'
    },
    gcp: {
      'kubernetes.io/ingress.global-static-ip-name': cluster.provider_config?.static_ip_name || ''
    },
    azure: {
      'appgw.ingress.kubernetes.io/backend-protocol': 'http'
    },
    ncp: {
      'nginx.ingress.kubernetes.io/rewrite-target': '/'
    },
    'on-premise': {
      'nginx.ingress.kubernetes.io/rewrite-target': '/',
      'nginx.ingress.kubernetes.io/ssl-redirect': 'false'
    },
    kind: {
      'nginx.ingress.kubernetes.io/rewrite-target': '/'
    }
  };

  return annotations[provider] || {};
}

/**
 * 프로바이더별 Ingress 설정
 */
function getProviderSpecificIngressConfig(provider, cluster) {
  const configs = {
    aws: {
      ingressClassName: 'alb'
    },
    gcp: {
      ingressClassName: 'gce'
    },
    azure: {
      ingressClassName: 'azure-application-gateway'
    },
    'on-premise': {
      ingressClassName: 'nginx'
    },
    kind: {
      ingressClassName: 'nginx'
    }
  };

  return configs[provider] || {};
}

/**
 * 값 보간 (템플릿 변수 치환)
 */
function interpolateValue(template, cluster) {
  return template
    .replace('${region}', cluster.region || '')
    .replace('${project_id}', cluster.provider_config?.project_id || '')
    .replace('${subscription_id}', cluster.provider_config?.subscription_id || '')
    .replace('${resource_group}', cluster.provider_config?.resource_group || '');
}

/**
 * ConfigMap 생성
 */
function generateConfigMapManifest(cluster, applicationConfig) {
  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: `${applicationConfig.name}-config`,
      namespace: applicationConfig.namespace || 'default'
    },
    data: {
      'cluster.name': cluster.cluster_name,
      'cluster.type': cluster.cluster_type,
      'cloud.provider': cluster.cloud_provider,
      ...(applicationConfig.config_data || {})
    }
  };
}

/**
 * 전체 배포 매니페스트 번들 생성
 */
function generateDeploymentBundle(cluster, applicationConfig) {
  const manifests = {
    deployment: generateDeploymentManifest(cluster, applicationConfig),
    service: generateServiceManifest(cluster, applicationConfig),
    configmap: generateConfigMapManifest(cluster, applicationConfig)
  };

  // Ingress가 필요한 경우만 추가
  if (applicationConfig.ingress_enabled) {
    manifests.ingress = generateIngressManifest(cluster, applicationConfig);
  }

  return manifests;
}

/**
 * kubectl apply 명령어 생성
 */
function generateKubectlApplyCommand(cluster, manifests) {
  const provider = cluster.cloud_provider || 'on-premise';
  
  // 프로바이더별 kubectl 인증 설정
  const authCommands = {
    aws: `aws eks update-kubeconfig --name ${cluster.cluster_name} --region ${cluster.region}`,
    gcp: `gcloud container clusters get-credentials ${cluster.cluster_name} --region ${cluster.region}`,
    azure: `az aks get-credentials --resource-group ${cluster.provider_config?.resource_group} --name ${cluster.cluster_name}`,
    'on-premise': `export KUBECONFIG=${cluster.kubeconfig_path || '~/.kube/config'}`,
    kind: `kind export kubeconfig --name ${cluster.cluster_name}`
  };

  return {
    auth_command: authCommands[provider] || authCommands['on-premise'],
    apply_commands: [
      'kubectl apply -f deployment.yaml',
      'kubectl apply -f service.yaml',
      'kubectl apply -f configmap.yaml',
      manifests.ingress ? 'kubectl apply -f ingress.yaml' : null
    ].filter(Boolean)
  };
}

module.exports = {
  PROVIDER_DEFAULTS,
  generateDeploymentManifest,
  generateServiceManifest,
  generateIngressManifest,
  generateConfigMapManifest,
  generateDeploymentBundle,
  generateKubectlApplyCommand,
  getResourceLimits,
  getDefaultReplicas
};

