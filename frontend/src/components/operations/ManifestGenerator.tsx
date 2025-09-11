// [advice from AI] ECP-AI 수준의 완전한 Kubernetes 매니페스트 생성기
// 서버별 개별 매니페스트, 네임스페이스, 서비스, Ingress, HPA 등 포함

export class ManifestGenerator {
  // [advice from AI] ECP-AI 수준의 완전한 매니페스트 생성
  static generateCompleteManifests(tenantConfig: any, hardwareResult?: any) {
    const manifests: {[key: string]: string} = {};
    
    if (tenantConfig.deploymentMode === 'auto-calculate' && hardwareResult) {
      // [advice from AI] 자동 계산 모드: 하드웨어 계산 결과 기반 서버별 매니페스트
      hardwareResult.serverConfigurations.forEach((server: any, index: number) => {
        const serverName = server.role.replace(/\s+/g, '-').toLowerCase().replace(/[()]/g, '');
        manifests[`${serverName}-${index + 1}`] = this.generateServerManifest(server, tenantConfig, 'auto-calculated');
      });
    } else {
      // [advice from AI] 커스텀 모드: 사용자 정의 서버별 매니페스트
      tenantConfig.customServerSpecs.forEach((server: any, index: number) => {
        const serverName = server.name.replace(/\s+/g, '-').toLowerCase();
        manifests[`${serverName}-${index + 1}`] = this.generateServerManifest(server, tenantConfig, 'custom-specs');
      });
    }

    // [advice from AI] 공통 리소스 매니페스트 추가
    manifests['namespace'] = this.generateNamespaceManifest(tenantConfig);
    manifests['configmap'] = this.generateConfigMapManifest(tenantConfig);
    manifests['service'] = this.generateServiceManifest(tenantConfig);
    manifests['ingress'] = this.generateIngressManifest(tenantConfig);
    manifests['monitoring'] = this.generateMonitoringManifest(tenantConfig);
    
    return manifests;
  }

  // [advice from AI] 서버별 개별 매니페스트 생성
  static generateServerManifest(server: any, tenantConfig: any, mode: string) {
    const isAutoMode = mode === 'auto-calculated';
    const serverName = isAutoMode 
      ? server.role.replace(/\s+/g, '-').toLowerCase().replace(/[()]/g, '')
      : server.name.replace(/\s+/g, '-').toLowerCase();
    
    const cpuCores = isAutoMode ? server.cpu_cores : server.cpu;
    const memoryGb = isAutoMode ? server.ram_gb : server.memory;
    const gpuCount = isAutoMode ? (server.gpu_quantity === '-' ? 0 : parseInt(server.gpu_quantity) || 0) : server.gpu;
    const storageGb = isAutoMode ? server.instance_storage_gb : server.storage;
    const replicas = isAutoMode ? 1 : server.replicas;

    return `---
# [advice from AI] ${serverName} 서버 배포 매니페스트 (ECP-AI 스타일)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${tenantConfig.tenantId}-${serverName}
  namespace: ${tenantConfig.tenantId}
  labels:
    app: ${tenantConfig.tenantId}
    component: ${serverName}
    tier: ${isAutoMode ? 'auto-calculated' : 'custom'}
    managed-by: timbel-platform
    version: v1.0.0
  annotations:
    deployment.kubernetes.io/revision: "1"
    timbel.io/server-type: "${isAutoMode ? server.role : server.type}"
    timbel.io/created-by: "deployment-wizard"
spec:
  replicas: ${replicas}
  strategy:
    type: ${tenantConfig.deploymentStrategy === 'rolling' ? 'RollingUpdate' : 'Recreate'}
    ${tenantConfig.deploymentStrategy === 'rolling' ? `rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1` : ''}
  selector:
    matchLabels:
      app: ${tenantConfig.tenantId}
      component: ${serverName}
  template:
    metadata:
      labels:
        app: ${tenantConfig.tenantId}
        component: ${serverName}
        version: v1.0.0
        tier: ${isAutoMode ? 'auto-calculated' : 'custom'}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: ${serverName}
        image: ${tenantConfig.registry.url}/${tenantConfig.tenantId}-${serverName}:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        - containerPort: 9090
          name: metrics
          protocol: TCP
        - containerPort: 8443
          name: https
          protocol: TCP
        resources:
          requests:
            cpu: "${cpuCores}"
            memory: "${memoryGb}Gi"${gpuCount > 0 ? `
            nvidia.com/gpu: "${gpuCount}"` : ''}
          limits:
            cpu: "${cpuCores * 2}"
            memory: "${memoryGb * 2}Gi"${gpuCount > 0 ? `
            nvidia.com/gpu: "${gpuCount}"` : ''}
        env:
        - name: ENVIRONMENT
          value: "${tenantConfig.environment}"
        - name: TENANT_ID
          value: "${tenantConfig.tenantId}"
        - name: COMPONENT_NAME
          value: "${serverName}"
        - name: CLOUD_PROVIDER
          value: "${tenantConfig.cloudProvider}"
        - name: REGION
          value: "${tenantConfig.region}"
        - name: SERVER_TYPE
          value: "${isAutoMode ? server.role : server.type}"
        - name: DEPLOYMENT_MODE
          value: "${tenantConfig.deploymentMode}"
        ${this.generateEnvVarsFromConfig(tenantConfig, serverName, isAutoMode, server)}
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /startup
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
        volumeMounts:
        - name: ${serverName}-storage
          mountPath: /data
        - name: config-volume
          mountPath: /config
          readOnly: true
        - name: logs-volume
          mountPath: /var/log
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
      volumes:
      - name: ${serverName}-storage
        persistentVolumeClaim:
          claimName: ${tenantConfig.tenantId}-${serverName}-pvc
      - name: config-volume
        configMap:
          name: ${tenantConfig.tenantId}-config
      - name: logs-volume
        emptyDir: {}
      nodeSelector:
        ${gpuCount > 0 ? 'accelerator: nvidia-tesla-t4' : 'node-type: standard'}
        kubernetes.io/arch: amd64
      tolerations:${gpuCount > 0 ? `
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule` : ''}
      - key: node.kubernetes.io/not-ready
        operator: Exists
        effect: NoExecute
        tolerationSeconds: 300
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: component
                  operator: In
                  values: ["${serverName}"]
              topologyKey: kubernetes.io/hostname

---
# [advice from AI] ${serverName} 서비스
apiVersion: v1
kind: Service
metadata:
  name: ${tenantConfig.tenantId}-${serverName}-service
  namespace: ${tenantConfig.tenantId}
  labels:
    app: ${tenantConfig.tenantId}
    component: ${serverName}
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: http
spec:
  selector:
    app: ${tenantConfig.tenantId}
    component: ${serverName}
  ports:
  - name: http
    port: 8080
    targetPort: 8080
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
  - name: https
    port: 8443
    targetPort: 8443
    protocol: TCP
  type: ClusterIP

---
# [advice from AI] ${serverName} PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${tenantConfig.tenantId}-${serverName}-pvc
  namespace: ${tenantConfig.tenantId}
  labels:
    app: ${tenantConfig.tenantId}
    component: ${serverName}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${storageGb}Gi
  storageClassName: ${tenantConfig.cloudProvider === 'aws' ? 'gp3' : tenantConfig.cloudProvider === 'gcp' ? 'ssd' : 'fast-ssd'}

---
# [advice from AI] ${serverName} HPA (오토스케일링)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${tenantConfig.tenantId}-${serverName}-hpa
  namespace: ${tenantConfig.tenantId}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${tenantConfig.tenantId}-${serverName}
  minReplicas: ${replicas}
  maxReplicas: ${Math.max(3, replicas * 3)}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60`;
  }

  // [advice from AI] 환경변수 생성
  static generateEnvVarsFromConfig(tenantConfig: any, serverName: string, isAutoMode: boolean, serverData?: any) {
    if (isAutoMode) {
      // [advice from AI] 자동 계산 모드: 서비스별 특화 환경변수
      const serviceEnvs: {[key: string]: string[]} = {
        'callbot': [
          `- name: STT_ENDPOINT
          value: "${tenantConfig.advancedSettings.callbot.sttEndpoint}"`,
          `- name: TTS_ENDPOINT
          value: "${tenantConfig.advancedSettings.callbot.ttsEndpoint}"`,
          `- name: MAX_CONCURRENT_CALLS
          value: "${tenantConfig.advancedSettings.callbot.maxConcurrentCalls}"`,
          `- name: CALL_TIMEOUT
          value: "${tenantConfig.advancedSettings.callbot.callTimeout}"`
        ],
        'chatbot': [
          `- name: NLP_ENDPOINT
          value: "${tenantConfig.advancedSettings.chatbot.nlpEndpoint}"`,
          `- name: CHAT_HISTORY_SIZE
          value: "${tenantConfig.advancedSettings.chatbot.chatHistorySize}"`,
          `- name: MAX_SESSIONS
          value: "${tenantConfig.advancedSettings.chatbot.maxSessions}"`,
          `- name: SESSION_TIMEOUT
          value: "${tenantConfig.advancedSettings.chatbot.sessionTimeout}"`
        ],
        'advisor': [
          `- name: HYBRID_MODE
          value: "${tenantConfig.advancedSettings.advisor.hybridMode}"`,
          `- name: HANDOFF_THRESHOLD
          value: "${tenantConfig.advancedSettings.advisor.expertHandoffThreshold}"`,
          `- name: KNOWLEDGE_BASE
          value: "${tenantConfig.advancedSettings.advisor.knowledgeBase}"`,
          `- name: SERVICE_INTEGRATIONS
          value: "${tenantConfig.advancedSettings.advisor.multiServiceIntegration.join(',')}"`
        ],
        'stt': [
          `- name: MODEL_PATH
          value: "${tenantConfig.advancedSettings.stt.modelPath}"`,
          `- name: LANGUAGE_CODE
          value: "${tenantConfig.advancedSettings.stt.languageCode}"`,
          `- name: SAMPLING_RATE
          value: "${tenantConfig.advancedSettings.stt.samplingRate}"`,
          `- name: MAX_AUDIO_LENGTH
          value: "${tenantConfig.advancedSettings.stt.maxAudioLength}"`
        ],
        'tts': [
          `- name: VOICE_TYPE
          value: "${tenantConfig.advancedSettings.tts.voiceType}"`,
          `- name: SPEED
          value: "${tenantConfig.advancedSettings.tts.speed}"`,
          `- name: AUDIO_FORMAT
          value: "${tenantConfig.advancedSettings.tts.audioFormat}"`,
          `- name: MAX_TEXT_LENGTH
          value: "${tenantConfig.advancedSettings.tts.maxTextLength}"`
        ]
      };

      const matchedService = Object.keys(serviceEnvs).find(service => 
        serverName.includes(service) || serverName.includes(service.substring(0, 3))
      );

      return matchedService ? serviceEnvs[matchedService].join('\n        ') : '';
    } else {
      // [advice from AI] 커스텀 모드: 범용 환경변수
      return `- name: SERVER_NAME
          value: "${serverName}"
        - name: ALLOCATED_SERVICES
          value: "${serverData?.services?.join(',') || ''}"
        - name: CUSTOM_MODE
          value: "true"`;
    }
  }

  // [advice from AI] 네임스페이스 매니페스트
  static generateNamespaceManifest(tenantConfig: any) {
    return `---
# [advice from AI] 테넌트 네임스페이스 (ECP-AI 스타일)
apiVersion: v1
kind: Namespace
metadata:
  name: ${tenantConfig.tenantId}
  labels:
    app.kubernetes.io/name: ${tenantConfig.tenantName}
    app.kubernetes.io/managed-by: timbel-platform
    app.kubernetes.io/version: v1.0.0
    app.kubernetes.io/component: tenant-namespace
    environment: ${tenantConfig.environment}
    cloud-provider: ${tenantConfig.cloudProvider}
    region: ${tenantConfig.region}
    deployment-mode: ${tenantConfig.deploymentMode}
    timbel.io/tenant-type: ecp-ai-compatible
  annotations:
    timbel.io/tenant-id: ${tenantConfig.tenantId}
    timbel.io/created-at: ${new Date().toISOString()}
    timbel.io/description: "${tenantConfig.description}"
    timbel.io/deployment-wizard: "v2.0"

---
# [advice from AI] 네임스페이스 리소스 할당량
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${tenantConfig.tenantId}-quota
  namespace: ${tenantConfig.tenantId}
spec:
  hard:
    requests.cpu: "${tenantConfig.advancedSettings.common.resourceQuota.cpu}"
    requests.memory: "${tenantConfig.advancedSettings.common.resourceQuota.memory}"
    requests.storage: "${tenantConfig.advancedSettings.common.resourceQuota.storage}"
    limits.cpu: "${parseInt(tenantConfig.advancedSettings.common.resourceQuota.cpu) * 2}"
    limits.memory: "${tenantConfig.advancedSettings.common.resourceQuota.memory}"
    persistentvolumeclaims: "20"
    services: "50"
    secrets: "20"
    configmaps: "20"
    pods: "100"

---
# [advice from AI] 네트워크 정책 (보안 강화)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${tenantConfig.tenantId}-network-policy
  namespace: ${tenantConfig.tenantId}
spec:
  podSelector:
    matchLabels:
      app: ${tenantConfig.tenantId}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ${tenantConfig.tenantId}
    - namespaceSelector:
        matchLabels:
          name: kube-system
    - namespaceSelector:
        matchLabels:
          name: monitoring
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to:
    - namespaceSelector:
        matchLabels:
          name: ${tenantConfig.tenantId}
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80`;
  }

  // [advice from AI] ConfigMap 매니페스트
  static generateConfigMapManifest(tenantConfig: any) {
    return `---
# [advice from AI] 테넌트 설정 ConfigMap (ECP-AI 호환)
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${tenantConfig.tenantId}-config
  namespace: ${tenantConfig.tenantId}
  labels:
    app: ${tenantConfig.tenantId}
    component: configuration
data:
  # [advice from AI] 기본 테넌트 정보
  tenant-id: "${tenantConfig.tenantId}"
  tenant-name: "${tenantConfig.tenantName}"
  environment: "${tenantConfig.environment}"
  cloud-provider: "${tenantConfig.cloudProvider}"
  region: "${tenantConfig.region}"
  deployment-mode: "${tenantConfig.deploymentMode}"
  
  # [advice from AI] ECP-AI 서비스 설정
  ${tenantConfig.deploymentMode === 'auto-calculate' ? `
  # 자동 계산 모드 - ECP-AI 서비스별 설정
  callbot-stt-endpoint: "${tenantConfig.advancedSettings.callbot.sttEndpoint}"
  callbot-tts-endpoint: "${tenantConfig.advancedSettings.callbot.ttsEndpoint}"
  callbot-max-calls: "${tenantConfig.advancedSettings.callbot.maxConcurrentCalls}"
  callbot-timeout: "${tenantConfig.advancedSettings.callbot.callTimeout}"
  
  chatbot-nlp-endpoint: "${tenantConfig.advancedSettings.chatbot.nlpEndpoint}"
  chatbot-history-size: "${tenantConfig.advancedSettings.chatbot.chatHistorySize}"
  chatbot-max-sessions: "${tenantConfig.advancedSettings.chatbot.maxSessions}"
  chatbot-session-timeout: "${tenantConfig.advancedSettings.chatbot.sessionTimeout}"
  
  advisor-hybrid-mode: "${tenantConfig.advancedSettings.advisor.hybridMode}"
  advisor-handoff-threshold: "${tenantConfig.advancedSettings.advisor.expertHandoffThreshold}"
  advisor-knowledge-base: "${tenantConfig.advancedSettings.advisor.knowledgeBase}"
  advisor-integrations: "${tenantConfig.advancedSettings.advisor.multiServiceIntegration.join(',')}"
  
  stt-model-path: "${tenantConfig.advancedSettings.stt.modelPath}"
  stt-language-code: "${tenantConfig.advancedSettings.stt.languageCode}"
  stt-sampling-rate: "${tenantConfig.advancedSettings.stt.samplingRate}"
  stt-max-audio-length: "${tenantConfig.advancedSettings.stt.maxAudioLength}"
  
  tts-voice-type: "${tenantConfig.advancedSettings.tts.voiceType}"
  tts-speed: "${tenantConfig.advancedSettings.tts.speed}"
  tts-audio-format: "${tenantConfig.advancedSettings.tts.audioFormat}"
  tts-max-text-length: "${tenantConfig.advancedSettings.tts.maxTextLength}"
  
  ta-analysis-mode: "${tenantConfig.advancedSettings.ta.analysisMode}"
  ta-batch-size: "${tenantConfig.advancedSettings.ta.batchSize}"
  ta-report-interval: "${tenantConfig.advancedSettings.ta.reportInterval}"
  ta-sentiment-analysis: "${tenantConfig.advancedSettings.ta.sentimentAnalysis}"
  
  qa-quality-threshold: "${tenantConfig.advancedSettings.qa.qualityThreshold}"
  qa-evaluation-mode: "${tenantConfig.advancedSettings.qa.evaluationMode}"
  qa-alert-webhook: "${tenantConfig.advancedSettings.qa.alertWebhook}"
  qa-report-format: "${tenantConfig.advancedSettings.qa.reportFormat}"` : `
  # 커스텀 모드 설정
  custom-servers: "${tenantConfig.customServerSpecs.length}"
  total-cpu: "${tenantConfig.customServerSpecs.reduce((sum: number, server: any) => sum + server.cpu, 0)}"
  total-memory: "${tenantConfig.customServerSpecs.reduce((sum: number, server: any) => sum + server.memory, 0)}"
  total-gpu: "${tenantConfig.customServerSpecs.reduce((sum: number, server: any) => sum + server.gpu, 0)}"`}
  
  # [advice from AI] 레지스트리 설정
  registry-url: "${tenantConfig.registry.url}"
  registry-type: "${tenantConfig.registry.type}"
  
  # [advice from AI] 배포 설정
  deployment-strategy: "${tenantConfig.deploymentStrategy}"
  auto-scaling: "${tenantConfig.autoScaling}"
  monitoring-enabled: "${tenantConfig.monitoring}"
  
  # [advice from AI] 로깅 설정
  log-level: "info"
  log-format: "json"
  
  # [advice from AI] 보안 설정
  network-policy-enabled: "${tenantConfig.advancedSettings.common.networkPolicy}"
  backup-enabled: "${tenantConfig.advancedSettings.common.backup}"`;
  }

  // [advice from AI] 서비스 매니페스트 (로드밸런서)
  static generateServiceManifest(tenantConfig: any) {
    return `---
# [advice from AI] Load Balancer 서비스 (ECP-AI 스타일)
apiVersion: v1
kind: Service
metadata:
  name: ${tenantConfig.tenantId}-loadbalancer
  namespace: ${tenantConfig.tenantId}
  labels:
    app: ${tenantConfig.tenantId}
    component: loadbalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: http
    external-dns.alpha.kubernetes.io/hostname: ${tenantConfig.tenantId}.${tenantConfig.cloudProvider}.timbel.com
spec:
  selector:
    app: ${tenantConfig.tenantId}
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600`;
  }

  // [advice from AI] Ingress 매니페스트
  static generateIngressManifest(tenantConfig: any) {
    return `---
# [advice from AI] Ingress 설정 (ECP-AI 스타일)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${tenantConfig.tenantId}-ingress
  namespace: ${tenantConfig.tenantId}
  labels:
    app: ${tenantConfig.tenantId}
    component: ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - ${tenantConfig.tenantId}.${tenantConfig.cloudProvider}.timbel.com
    - api.${tenantConfig.tenantId}.${tenantConfig.cloudProvider}.timbel.com
    secretName: ${tenantConfig.tenantId}-tls
  rules:
  - host: ${tenantConfig.tenantId}.${tenantConfig.cloudProvider}.timbel.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${tenantConfig.tenantId}-loadbalancer
            port:
              number: 80
  - host: api.${tenantConfig.tenantId}.${tenantConfig.cloudProvider}.timbel.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: ${tenantConfig.tenantId}-loadbalancer
            port:
              number: 80`;
  }

  // [advice from AI] 모니터링 매니페스트
  static generateMonitoringManifest(tenantConfig: any) {
    return `---
# [advice from AI] ServiceMonitor (Prometheus 연동)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ${tenantConfig.tenantId}-monitoring
  namespace: ${tenantConfig.tenantId}
  labels:
    app: ${tenantConfig.tenantId}
    component: monitoring
spec:
  selector:
    matchLabels:
      app: ${tenantConfig.tenantId}
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s

---
# [advice from AI] PrometheusRule (알림 규칙)
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ${tenantConfig.tenantId}-alerts
  namespace: ${tenantConfig.tenantId}
spec:
  groups:
  - name: ${tenantConfig.tenantId}.rules
    rules:
    - alert: HighCPUUsage
      expr: cpu_usage{tenant_id="${tenantConfig.tenantId}"} > 80
      for: 5m
      labels:
        severity: warning
        tenant: ${tenantConfig.tenantId}
      annotations:
        summary: "High CPU usage detected"
        description: "CPU usage is above 80% for more than 5 minutes"
    
    - alert: HighMemoryUsage
      expr: memory_usage{tenant_id="${tenantConfig.tenantId}"} > 85
      for: 5m
      labels:
        severity: warning
        tenant: ${tenantConfig.tenantId}
      annotations:
        summary: "High Memory usage detected"
        description: "Memory usage is above 85% for more than 5 minutes"
    
    - alert: PodCrashLooping
      expr: increase(kube_pod_container_status_restarts_total{namespace="${tenantConfig.tenantId}"}[1h]) > 5
      for: 5m
      labels:
        severity: critical
        tenant: ${tenantConfig.tenantId}
      annotations:
        summary: "Pod is crash looping"
        description: "Pod has restarted more than 5 times in the last hour"`;
  }
}
