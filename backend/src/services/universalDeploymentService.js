// [advice from AI] 범용 배포 서비스 - 기존 하드웨어 계산기 통합
const RDCCalculatorService = require('./rdcCalculatorService');
const { Pool } = require('pg');

class UniversalDeploymentService {
  constructor() {
    this.rdcCalculator = new RDCCalculatorService();
    this.pool = new Pool({
      host: 'localhost',
      port: 5434,
      database: 'timbel_knowledge',
      user: 'timbel_user',
      password: 'timbel_password',
    });
  }

  // 프로젝트 배포 설정 자동 생성
  async generateDeploymentConfig(projectId, repositoryUrl) {
    console.log('🔍 프로젝트 배포 설정 자동 생성 시작:', projectId);
    
    const client = await this.pool.connect();
    
    try {
      // 1. 프로젝트 정보 조회
      const projectResult = await client.query(`
        SELECT p.*, pr.repository_url, pcr.technical_summary, pcr.project_summary
        FROM projects p
        LEFT JOIN project_repositories pr ON p.id = pr.project_id
        LEFT JOIN project_completion_reports pcr ON p.id = pcr.project_id
        WHERE p.id = $1
      `, [projectId]);
      
      if (projectResult.rows.length === 0) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }
      
      const project = projectResult.rows[0];
      const repoUrl = repositoryUrl || project.repository_url;
      
      if (!repoUrl) {
        throw new Error('레포지토리 URL이 없습니다.');
      }
      
      // 2. 레포지토리 분석 (간소화 버전)
      const repoAnalysis = await this.analyzeRepository(repoUrl);
      
      // 3. 서비스 타입 결정
      const serviceType = this.determineServiceType(project, repoAnalysis);
      
      // 4. 하드웨어 요구사항 계산
      const hardwareRequirements = await this.calculateHardwareRequirements(project, serviceType, repoAnalysis);
      
      // 5. 배포 설정 생성
      const deploymentConfig = await this.generateKubernetesConfig(project, serviceType, hardwareRequirements);
      
      // 6. 결과 저장
      await client.query(`
        INSERT INTO deployment_automation (
          project_id, target_environment, k8s_namespace, ingress_hostname,
          automation_status, deployment_strategy
        ) VALUES ($1, $2, $3, $4, 'configured', 'rolling')
      `, [
        projectId,
        'production',
        this.generateNamespace(project.name),
        this.generateHostname(project.name, serviceType)
      ]);
      
      console.log('✅ 배포 설정 자동 생성 완료');
      
      return {
        project_info: {
          id: project.id,
          name: project.name,
          description: project.description
        },
        repository_analysis: repoAnalysis,
        service_type: serviceType,
        hardware_requirements: hardwareRequirements,
        deployment_config: deploymentConfig,
        estimated_resources: hardwareRequirements.kubernetes_resources
      };
      
    } finally {
      client.release();
    }
  }

  // 레포지토리 분석 (GitHub API 기반)
  async analyzeRepository(repositoryUrl) {
    console.log('📊 레포지토리 분석:', repositoryUrl);
    
    // GitHub URL 파싱
    const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('유효하지 않은 GitHub URL입니다.');
    }
    
    const owner = match[1];
    const repo = match[2].replace('.git', '');
    
    // 간소화된 분석 (실제로는 GitHub API 호출)
    return {
      owner,
      repo,
      primary_language: this.detectLanguageFromRepo(repo),
      has_dockerfile: true, // 가정
      has_k8s_manifests: false,
      estimated_complexity: 'medium',
      service_patterns: this.detectServicePatterns(repo)
    };
  }

  // 언어 감지 (레포 이름 기반 간소화)
  detectLanguageFromRepo(repoName) {
    const name = repoName.toLowerCase();
    
    if (name.includes('react') || name.includes('vue') || name.includes('angular')) return 'javascript';
    if (name.includes('django') || name.includes('flask') || name.includes('python')) return 'python';
    if (name.includes('spring') || name.includes('java')) return 'java';
    if (name.includes('go') || name.includes('golang')) return 'go';
    if (name.includes('rust')) return 'rust';
    
    return 'javascript'; // 기본값
  }

  // 서비스 패턴 감지
  detectServicePatterns(repoName) {
    const name = repoName.toLowerCase();
    const patterns = [];
    
    // ECP-AI 특화 패턴
    if (name.includes('orchestrator')) patterns.push('orchestrator');
    if (name.includes('callbot') || name.includes('call')) patterns.push('callbot');
    if (name.includes('chatbot') || name.includes('chat')) patterns.push('chatbot');
    if (name.includes('stt') || name.includes('speech-to-text')) patterns.push('stt');
    if (name.includes('tts') || name.includes('text-to-speech')) patterns.push('tts');
    if (name.includes('advisor')) patterns.push('advisor');
    
    // 일반 패턴
    if (name.includes('api') || name.includes('backend')) patterns.push('api_backend');
    if (name.includes('frontend') || name.includes('ui')) patterns.push('web_frontend');
    if (name.includes('ai') || name.includes('ml') || name.includes('model')) patterns.push('ai_ml_service');
    if (name.includes('db') || name.includes('database')) patterns.push('database');
    
    return patterns.length > 0 ? patterns : ['generic_service'];
  }

  // 서비스 타입 결정
  determineServiceType(project, repoAnalysis) {
    const patterns = repoAnalysis.service_patterns;
    
    // ECP-AI 오케스트레이터인 경우 특별 처리
    if (patterns.includes('orchestrator')) {
      return 'ai_orchestrator'; // 8개 서비스 모두 배포
    }
    
    // 단일 서비스 타입 결정
    if (patterns.includes('ai_ml_service')) return 'ai_ml_service';
    if (patterns.includes('api_backend')) return 'api_backend';
    if (patterns.includes('web_frontend')) return 'web_frontend';
    if (patterns.includes('database')) return 'database';
    
    return 'generic_service';
  }

  // 하드웨어 요구사항 계산 (기존 계산기 활용)
  async calculateHardwareRequirements(project, serviceType, repoAnalysis) {
    console.log('💻 하드웨어 요구사항 계산...');
    
    try {
      // ECP-AI 오케스트레이터인 경우 8개 서비스 계산
      if (serviceType === 'ai_orchestrator') {
        const ecpAIRequirements = {
          callbot: 10,   // 기본 채널 수
          chatbot: 20,
          advisor: 5,
          stt: 15,
          tts: 10,
          ta: 10,
          qa: 5
        };
        
        const hardwareResult = await this.rdcCalculator.calculateHardware(ecpAIRequirements, 'auto');
        
        return {
          service_count: 8,
          total_channels: Object.values(ecpAIRequirements).reduce((sum, val) => sum + val, 0),
          hardware_result: hardwareResult,
          kubernetes_resources: this.convertToKubernetesResources(hardwareResult),
          deployment_strategy: 'multi_service'
        };
      }
      
      // 단일 서비스인 경우 기본 계산
      const singleServiceReq = { [serviceType]: 1 };
      const hardwareResult = await this.rdcCalculator.calculateFallback(singleServiceReq, 'auto');
      
      return {
        service_count: 1,
        hardware_result: hardwareResult,
        kubernetes_resources: this.convertToKubernetesResources(hardwareResult),
        deployment_strategy: 'single_service'
      };
      
    } catch (error) {
      console.error('하드웨어 계산 실패:', error.message);
      
      // 기본값 반환
      return {
        service_count: 1,
        kubernetes_resources: {
          cpu_request: '200m',
          memory_request: '256Mi',
          cpu_limit: '1000m',
          memory_limit: '1Gi',
          replicas_min: 1,
          replicas_max: 5
        },
        deployment_strategy: 'single_service',
        fallback_used: true
      };
    }
  }

  // RDC 계산 결과를 Kubernetes 리소스로 변환 (Core, GB, GPU 단위)
  convertToKubernetesResources(hardwareResult) {
    const cpuCores = hardwareResult.cpu || 1; // Core 단위
    const memoryGB = hardwareResult.memory || 2; // GB 단위
    const storageGB = hardwareResult.storage || 10; // GB 단위
    const gpuCount = hardwareResult.gpu || 0; // GPU 개수
    const serverCount = hardwareResult.servers || 1; // 서버 인스턴스 수
    
    // 인스턴스 정보 활용
    const instanceInfo = hardwareResult.cloud_instances || {};
    const awsInstance = instanceInfo.aws?.recommended?.[0];
    const azureInstance = instanceInfo.azure?.recommended?.[0];
    const gcpInstance = instanceInfo.gcp?.recommended?.[0];
    
    return {
      // CPU: Core → millicores 변환 (1 Core = 1000m)
      cpu_request: `${Math.round(cpuCores * 0.5 * 1000)}m`, // 50% 요청
      cpu_limit: `${Math.round(cpuCores * 1000)}m`, // 100% 제한
      cpu_cores_request: cpuCores * 0.5, // Core 단위 표시용
      cpu_cores_limit: cpuCores,
      cpu_cores_total: cpuCores * serverCount, // 전체 CPU Core
      
      // Memory: GB → Mi 변환 (1GB = 1024Mi)
      memory_request: `${Math.round(memoryGB * 0.5 * 1024)}Mi`, // 50% 요청
      memory_limit: `${Math.round(memoryGB * 1024)}Mi`, // 100% 제한  
      memory_gb_request: memoryGB * 0.5, // GB 단위 표시용
      memory_gb_limit: memoryGB,
      memory_gb_total: memoryGB * serverCount, // 전체 메모리 GB
      
      // GPU: 하드웨어 계산기 결과 활용
      gpu_count: gpuCount,
      gpu_type: hardwareResult.gpu_type || 'nvidia-tesla-t4',
      gpu_memory: gpuCount > 0 ? `${gpuCount * 16}GB` : '0GB', // GPU당 16GB 가정
      gpu_required: gpuCount > 0,
      
      // Storage: GB → Gi 변환
      storage_size: `${storageGB}Gi`,
      storage_gb: storageGB, // GB 단위 표시용
      storage_gb_total: storageGB * serverCount, // 전체 스토리지
      
      // 인스턴스 정보
      server_instances: serverCount,
      replicas_min: Math.max(1, Math.round(serverCount * 0.5)),
      replicas_max: Math.max(2, serverCount * 2),
      
      // 클라우드 인스턴스 추천
      cloud_recommendations: {
        aws: awsInstance ? {
          instance_type: awsInstance.instanceType,
          quantity: awsInstance.quantity,
          monthly_cost: awsInstance.monthlyCost
        } : null,
        azure: azureInstance ? {
          instance_type: azureInstance.instanceType,
          quantity: azureInstance.quantity,
          monthly_cost: azureInstance.monthlyCost
        } : null,
        gcp: gcpInstance ? {
          instance_type: gcpInstance.instanceType,
          quantity: gcpInstance.quantity,
          monthly_cost: gcpInstance.monthlyCost
        } : null
      },
      
      // 비용 추정 (Core, GB, GPU 기준)
      estimated_monthly_cost: Math.round(
        cpuCores * serverCount * 30 + // CPU 비용
        memoryGB * serverCount * 10 + // Memory 비용
        storageGB * serverCount * 0.5 + // Storage 비용
        gpuCount * 500 // GPU 비용 (GPU당 $500/월)
      ),
      
      // 성능 예측
      performance_estimation: {
        max_concurrent_users: Math.round(cpuCores * memoryGB * 100), // 대략적인 동시 사용자 수
        throughput_per_second: Math.round(cpuCores * 1000), // 초당 처리량
        response_time_ms: gpuCount > 0 ? 50 : 100 // 예상 응답시간
      }
    };
  }

  // Kubernetes 설정 생성
  async generateKubernetesConfig(project, serviceType, hardwareRequirements) {
    const client = await this.pool.connect();
    
    try {
      // 템플릿 조회
      const templateResult = await client.query(`
        SELECT * FROM deployment_templates 
        WHERE service_type = $1 OR service_type = 'generic_service'
        ORDER BY CASE WHEN service_type = $1 THEN 0 ELSE 1 END
        LIMIT 1
      `, [serviceType]);
      
      if (templateResult.rows.length === 0) {
        throw new Error('적합한 배포 템플릿을 찾을 수 없습니다.');
      }
      
      const template = templateResult.rows[0];
      const resources = hardwareRequirements.kubernetes_resources;
      
      // 템플릿 변수 치환
      const namespace = this.generateNamespace(project.name);
      const hostname = this.generateHostname(project.name, serviceType);
      
      const deploymentYaml = template.k8s_deployment_yaml
        .replace(/{{PROJECT_NAME}}/g, project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
        .replace(/{{SERVICE_TYPE}}/g, serviceType)
        .replace(/{{NAMESPACE}}/g, namespace)
        .replace(/{{REPLICAS}}/g, resources.replicas_min.toString())
        .replace(/{{IMAGE_URL}}/g, `registry.rdc.rickyson.com/${project.name.toLowerCase()}:latest`)
        .replace(/{{ENVIRONMENT}}/g, 'production');
      
      const serviceYaml = template.k8s_service_yaml
        .replace(/{{PROJECT_NAME}}/g, project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
        .replace(/{{SERVICE_TYPE}}/g, serviceType)
        .replace(/{{NAMESPACE}}/g, namespace);
      
      const ingressYaml = template.k8s_ingress_yaml
        .replace(/{{PROJECT_NAME}}/g, project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
        .replace(/{{SERVICE_TYPE}}/g, serviceType)
        .replace(/{{NAMESPACE}}/g, namespace)
        .replace(/{{HOSTNAME}}/g, hostname);
      
      return {
        namespace,
        hostname,
        manifests: {
          deployment: deploymentYaml,
          service: serviceYaml,
          ingress: ingressYaml,
          hpa: template.k8s_hpa_yaml
        },
        estimated_cost: hardwareRequirements.hardware_result?.estimated_cost || 'N/A'
      };
      
    } finally {
      client.release();
    }
  }

  // 네임스페이스 생성
  generateNamespace(projectName) {
    return `timbel-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
  }

  // 호스트명 생성
  generateHostname(projectName, serviceType) {
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    if (serviceType === 'ai_orchestrator') {
      return `${cleanName}.rdc.rickyson.com`; // 메인 도메인
    }
    
    return `${cleanName}.rdc.rickyson.com`;
  }
}

module.exports = UniversalDeploymentService;
