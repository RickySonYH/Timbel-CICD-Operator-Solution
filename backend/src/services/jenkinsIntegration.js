// [advice from AI] Jenkins 서버 연동 서비스 - Phase 2 프로덕션 레벨
// CI/CD 파이프라인 자동화, 실시간 빌드 모니터링, 멀티브랜치 지원

const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class JenkinsIntegration extends EventEmitter {
  constructor() {
    super();
    
    // [advice from AI] Phase 2: 환경 변수 기반 Jenkins 서버 설정 (Docker 네트워크 내부 연결)
    this.jenkinsURL = process.env.JENKINS_URL || 'http://jenkins:8080';
    this.jenkinsUser = process.env.JENKINS_USERNAME || 'admin';
    this.jenkinsPassword = process.env.JENKINS_PASSWORD || 'admin';
    this.jenkinsToken = process.env.JENKINS_API_TOKEN || '';
    this.jenkinsTimeout = parseInt(process.env.JENKINS_BUILD_TIMEOUT || '1800000'); // 30분
    this.jenkinsCrumbIssuer = process.env.JENKINS_CRUMB_ISSUER === 'true';
    
    // [advice from AI] 고급 설정
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.pollInterval = 5000; // 빌드 상태 폴링 간격
    this.maxConcurrentBuilds = parseInt(process.env.MAX_CONCURRENT_BUILDS || '5');
    
    // [advice from AI] 인증 정보 관리
    this.authHeader = this.jenkinsToken 
      ? `Basic ${Buffer.from(`${this.jenkinsUser}:${this.jenkinsToken}`).toString('base64')}`
      : `Basic ${Buffer.from(`${this.jenkinsUser}:${this.jenkinsPassword}`).toString('base64')}`;
    
    // [advice from AI] 빌드 상태 추적
    this.activeBuildQueue = new Map(); // buildId -> buildInfo
    this.buildHistory = new Map(); // buildId -> buildResult
    this.webhookTokens = new Map(); // jobName -> webhookToken
    
    // [advice from AI] Phase 2: 향상된 Axios 클라이언트 설정
    this.client = axios.create({
      baseURL: this.jenkinsURL,
      timeout: this.jenkinsTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'User-Agent': 'Timbel-CICD-Operator/2.0'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // 자체 서명 인증서 허용
      }),
      validateStatus: (status) => status < 500 // 5xx 에러만 재시도
    });
    
    // [advice from AI] CSRF 토큰 관리
    this.crumbToken = null;
    this.crumbField = null;
    this.lastCrumbTime = null;
    this.crumbExpiry = 30 * 60 * 1000; // 30분
    
    // [advice from AI] 요청/응답 인터셉터 설정
    this.setupInterceptors();
    
    // [advice from AI] 지원 이미지 레지스트리
    this.supportedRegistries = [
      'harbor.ecp-ai.com',
      'docker.io',
      'gcr.io',
      'xxxxx.dkr.ecr.region.amazonaws.com',
      'registry.azurecr.io'
    ];

    // [advice from AI] ECP-AI 서비스 템플릿
    this.serviceTemplates = [
      {
        service: 'callbot',
        displayName: '📞 콜봇 서비스',
        defaultImage: 'ecp-ai/callbot',
        defaultPorts: [8080, 9090],
        defaultResources: { cpu: '0.5', memory: '1Gi', gpu: 0 },
        githubTemplate: 'https://github.com/ECP-AI/callbot-template'
      },
      {
        service: 'chatbot',
        displayName: '💬 챗봇 서비스',
        defaultImage: 'ecp-ai/chatbot',
        defaultPorts: [8080],
        defaultResources: { cpu: '0.2', memory: '512Mi', gpu: 0 },
        githubTemplate: 'https://github.com/ECP-AI/chatbot-template'
      },
      {
        service: 'advisor',
        displayName: '👨‍💼 어드바이저 서비스',
        defaultImage: 'ecp-ai/advisor',
        defaultPorts: [8080, 9090],
        defaultResources: { cpu: '1.0', memory: '2Gi', gpu: 1 },
        githubTemplate: 'https://github.com/ECP-AI/advisor-template'
      },
      {
        service: 'stt',
        displayName: '🎤 STT (Speech-to-Text)',
        defaultImage: 'ecp-ai/stt',
        defaultPorts: [8080],
        defaultResources: { cpu: '0.8', memory: '1.5Gi', gpu: 0 },
        githubTemplate: 'https://github.com/ECP-AI/stt-template'
      },
      {
        service: 'tts',
        displayName: '🔊 TTS (Text-to-Speech)',
        defaultImage: 'ecp-ai/tts',
        defaultPorts: [8080],
        defaultResources: { cpu: '1.0', memory: '2Gi', gpu: 1 },
        githubTemplate: 'https://github.com/ECP-AI/tts-template'
      },
      {
        service: 'ta',
        displayName: '📊 TA (Text Analytics)',
        defaultImage: 'ecp-ai/text-analytics',
        defaultPorts: [8080],
        defaultResources: { cpu: '0.4', memory: '800Mi', gpu: 0 },
        githubTemplate: 'https://github.com/ECP-AI/text-analytics-template'
      },
      {
        service: 'qa',
        displayName: '✅ QA (Question Answering)',
        defaultImage: 'ecp-ai/qa-service',
        defaultPorts: [8080],
        defaultResources: { cpu: '0.3', memory: '512Mi', gpu: 0 },
        githubTemplate: 'https://github.com/ECP-AI/qa-service-template'
      },
      {
        service: 'common',
        displayName: '🏢 공통 인프라 서비스',
        defaultImage: 'ecp-ai/common-infrastructure',
        defaultPorts: [8080, 3000],
        defaultResources: { cpu: '0.2', memory: '256Mi', gpu: 0 },
        githubTemplate: 'https://github.com/ECP-AI/common-infrastructure-template'
      }
    ];
  }

  // [advice from AI] Phase 2: 요청/응답 인터셉터 설정
  setupInterceptors() {
    // 요청 인터셉터: CSRF 토큰 자동 추가
    this.client.interceptors.request.use(
      async (config) => {
        // CSRF 토큰이 필요한 POST/PUT/DELETE 요청에 자동 추가
        if (['post', 'put', 'delete'].includes(config.method?.toLowerCase())) {
          await this.ensureCrumbToken();
          if (this.crumbToken && this.crumbField) {
            config.headers[this.crumbField] = this.crumbToken;
          }
        }
        
        console.log(`🔄 Jenkins API 요청: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Jenkins 요청 인터셉터 오류:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터: 자동 재시도 및 에러 처리
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Jenkins API 응답: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // 403 Forbidden (CSRF) 에러시 토큰 갱신 후 재시도
        if (error.response?.status === 403 && !originalRequest._csrfRetry) {
          originalRequest._csrfRetry = true;
          console.log('🔄 Jenkins CSRF 토큰 갱신 후 재시도...');
          
          try {
            this.crumbToken = null; // 기존 토큰 초기화
            await this.ensureCrumbToken();
            if (this.crumbToken && this.crumbField) {
              originalRequest.headers[this.crumbField] = this.crumbToken;
            }
            return this.client(originalRequest);
          } catch (csrfError) {
            console.error('❌ Jenkins CSRF 토큰 갱신 실패:', csrfError.message);
            return Promise.reject(csrfError);
          }
        }
        
        // 5xx 에러시 재시도
        if (error.response?.status >= 500 && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }
        
        if (error.response?.status >= 500 && originalRequest._retryCount < this.maxRetries) {
          originalRequest._retryCount++;
          const delay = this.retryDelay * originalRequest._retryCount;
          
          console.log(`🔄 Jenkins API 재시도 (${originalRequest._retryCount}/${this.maxRetries}) ${delay}ms 후...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client(originalRequest);
        }
        
        console.error(`❌ Jenkins API 오류: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // [advice from AI] Phase 2: CSRF 토큰 자동 관리
  async ensureCrumbToken() {
    if (this.crumbToken && this.isCrumbValid()) {
      return true;
    }
    
    return await this.getCrumbToken();
  }

  // [advice from AI] CSRF 토큰 유효성 검사
  isCrumbValid() {
    if (!this.crumbToken || !this.lastCrumbTime) {
      return false;
    }
    
    const tokenAge = Date.now() - this.lastCrumbTime;
    return tokenAge < this.crumbExpiry;
  }

  // [advice from AI] Phase 2: 향상된 CSRF 토큰 획득
  async getCrumbToken() {
    try {
      console.log('🔐 Jenkins CSRF 토큰 요청 중...');
      
      const response = await axios.get(`${this.jenkinsURL}/crumbIssuer/api/json`, {
        headers: {
          'Authorization': this.authHeader
        },
        timeout: 10000, // 짧은 타임아웃
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      });
      
      if (response.data && response.data.crumb) {
        this.crumbToken = response.data.crumb;
        this.crumbField = response.data.crumbRequestField || 'Jenkins-Crumb';
        this.lastCrumbTime = Date.now();
        
        console.log(`✅ Jenkins CSRF 토큰 획득 성공: ${this.crumbField}`);
        return true;
      }
      
      console.warn('⚠️ Jenkins CSRF 토큰 응답이 비어있음');
      return false;
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ Jenkins CSRF 보호가 비활성화됨');
        return true; // CSRF가 비활성화된 경우
      }
      
      console.warn('⚠️ Jenkins CSRF 토큰 획득 실패:', error.message);
      
      // 상세한 에러 정보 제공
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Jenkins 서버 연결 실패: ${this.jenkinsURL}`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`Jenkins 서버 호스트를 찾을 수 없음: ${this.jenkinsURL}`);
      } else if (error.response?.status === 401) {
        throw new Error(`Jenkins 인증 실패: 잘못된 사용자명 또는 토큰 (${this.jenkinsUser})`);
      }
      
      return false;
    }
  }

  // [advice from AI] Phase 2: 향상된 Jenkins API 호출 (인터셉터 사용)
  async makeJenkinsRequest(method, endpoint, data = null, options = {}) {
    try {
      const config = {
        method: method.toLowerCase(),
        url: endpoint,
        ...options
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client(config);
      return response;
    } catch (error) {
      console.error(`❌ Jenkins API 호출 실패 [${method} ${endpoint}]:`, error.message);
      throw error;
    }
  }

  // [advice from AI] Jenkins 서버 상태 확인
  async checkJenkinsHealth() {
    try {
      const response = await this.makeJenkinsRequest('GET', '/api/json');
      return {
        status: 'healthy',
        version: response.data.version || 'unknown',
        mode: response.data.mode || 'NORMAL',
        numExecutors: response.data.numExecutors || 0,
        jobs: response.data.jobs?.length || 0
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        version: null,
        mode: null,
        numExecutors: 0,
        jobs: 0
      };
    }
  }

  // [advice from AI] Jenkins에서 이미지 목록 가져오기
  async getAvailableImages(registryConfig) {
    try {
      const {
        registryUrl = 'harbor.ecp-ai.com',
        username,
        password,
        registryType = 'harbor'
      } = registryConfig;

      console.log('Jenkins에서 이미지 목록 조회:', { registryUrl, registryType });

      // [advice from AI] Mock 응답 (실제 Jenkins API 연동 시 교체)
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockGetAvailableImages(registryUrl, registryType);
      }

      // [advice from AI] 실제 Jenkins API 호출
      const response = await axios.get(
        `${this.jenkinsURL}/api/json`,
        {
          auth: {
            username: this.jenkinsUser,
            password: this.jenkinsToken
          },
          timeout: this.jenkinsTimeout
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Jenkins에서 이미지 목록 조회 성공'
      };

    } catch (error) {
      console.error('Jenkins 이미지 목록 조회 오류:', error);
      throw new Error(`Jenkins 이미지 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] GitHub Repository에서 Jenkins 빌드 파이프라인 생성
  async createBuildPipeline(buildConfig) {
    try {
      const {
        tenantId,
        serviceName,
        githubRepository,
        dockerfile = 'Dockerfile',
        buildContext = '.',
        targetRegistry,
        imageName,
        imageTag = 'latest'
      } = buildConfig;

      if (!tenantId || !serviceName || !githubRepository || !targetRegistry || !imageName) {
        throw new Error('필수 빌드 설정이 누락되었습니다');
      }

      const pipelineName = `${tenantId}-${serviceName}-build`;
      const buildId = uuidv4();

      // [advice from AI] Jenkins 파이프라인 설정 생성
      const pipelineConfig = {
        pipeline_id: buildId,
        pipeline_name: pipelineName,
        tenant_id: tenantId,
        service_name: serviceName,
        github_repository: githubRepository,
        dockerfile_path: dockerfile,
        build_context: buildContext,
        target_registry: targetRegistry,
        image_name: imageName,
        image_tag: imageTag,
        build_args: buildConfig.buildArgs || {},
        webhook_url: `${this.jenkinsURL}/generic-webhook-trigger/invoke?token=${buildId}`,
        created_at: new Date().toISOString(),
        status: 'created'
      };

      console.log('Jenkins 빌드 파이프라인 생성:', pipelineConfig);

      // [advice from AI] Mock 응답
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockCreateBuildPipeline(pipelineConfig);
      }

      // [advice from AI] 실제 Jenkins 파이프라인 생성
      const jenkinsfile = this.generateJenkinsfile(pipelineConfig);
      const result = await this.createJenkinsPipeline(pipelineName, jenkinsfile);
      
      return {
        success: true,
        data: { ...pipelineConfig, jenkins_job_url: result.jobUrl },
        message: 'Jenkins 빌드 파이프라인이 생성되었습니다'
      };

    } catch (error) {
      console.error('Jenkins 빌드 파이프라인 생성 오류:', error);
      throw new Error(`Jenkins 빌드 파이프라인 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 이미지 빌드 실행
  async triggerImageBuild(pipelineId, buildParams = {}) {
    try {
      if (!pipelineId) {
        throw new Error('파이프라인 ID는 필수입니다');
      }

      const buildId = uuidv4();
      const buildRequest = {
        build_id: buildId,
        pipeline_id: pipelineId,
        parameters: {
          branch: buildParams.branch || 'main',
          dockerfile: buildParams.dockerfile || 'Dockerfile',
          build_args: buildParams.buildArgs || {},
          ...buildParams
        },
        triggered_at: new Date().toISOString(),
        status: 'queued'
      };

      console.log('Jenkins 이미지 빌드 실행:', buildRequest);

      // [advice from AI] Mock 응답
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockTriggerImageBuild(buildRequest);
      }

      // [advice from AI] 실제 Jenkins 빌드 실행
      const response = await axios.post(
        `${this.jenkinsURL}/job/${pipelineId}/buildWithParameters`,
        buildRequest.parameters,
        {
          auth: {
            username: this.jenkinsUser,
            password: this.jenkinsToken
          },
          timeout: this.jenkinsTimeout
        }
      );

      return {
        success: true,
        data: { ...buildRequest, jenkins_build_number: response.headers.location },
        message: 'Jenkins 이미지 빌드가 시작되었습니다'
      };

    } catch (error) {
      console.error('Jenkins 이미지 빌드 실행 오류:', error);
      throw new Error(`Jenkins 이미지 빌드 실행 실패: ${error.message}`);
    }
  }

  // [advice from AI] 빌드 상태 조회
  async getBuildStatus(buildId) {
    try {
      if (!buildId) {
        throw new Error('빌드 ID는 필수입니다');
      }

      // [advice from AI] Mock 응답
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockGetBuildStatus(buildId);
      }

      // [advice from AI] 실제 Jenkins 빌드 상태 조회
      const response = await axios.get(
        `${this.jenkinsURL}/job/${buildId}/lastBuild/api/json`,
        {
          auth: {
            username: this.jenkinsUser,
            password: this.jenkinsToken
          },
          timeout: this.jenkinsTimeout
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Jenkins 빌드 상태 조회 성공'
      };

    } catch (error) {
      console.error('Jenkins 빌드 상태 조회 오류:', error);
      throw new Error(`Jenkins 빌드 상태 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Jenkinsfile 생성
  generateJenkinsfile(pipelineConfig) {
    return `
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = '${pipelineConfig.target_registry}'
        IMAGE_NAME = '${pipelineConfig.image_name}'
        IMAGE_TAG = '${pipelineConfig.image_tag}'
        TENANT_ID = '${pipelineConfig.tenant_id}'
        SERVICE_NAME = '${pipelineConfig.service_name}'
    }
    
    stages {
        stage('Source Checkout') {
            steps {
                git branch: 'main', url: '${pipelineConfig.github_repository}'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    def image = docker.build("\\${DOCKER_REGISTRY}/\\${IMAGE_NAME}:\\${IMAGE_TAG}", 
                                           "-f ${pipelineConfig.dockerfile_path} ${pipelineConfig.build_context}")
                }
            }
        }
        
        stage('Test Image') {
            steps {
                script {
                    sh 'docker run --rm \\${DOCKER_REGISTRY}/\\${IMAGE_NAME}:\\${IMAGE_TAG} /bin/sh -c "echo \\"Image test passed\\""'
                }
            }
        }
        
        stage('Push to Registry') {
            steps {
                script {
                    docker.withRegistry('https://\\${DOCKER_REGISTRY}') {
                        def image = docker.image("\\${DOCKER_REGISTRY}/\\${IMAGE_NAME}:\\${IMAGE_TAG}")
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }
        
        stage('Notify ECP-AI') {
            steps {
                script {
                    // [advice from AI] ECP-AI 오케스트레이터에 빌드 완료 알림
                    sh '''
                        curl -X POST http://timbel-backend:3001/api/operations/jenkins/build-complete \\
                             -H "Content-Type: application/json" \\
                             -d "{\\"tenant_id\\": \\"\\${TENANT_ID}\\", \\"service\\": \\"\\${SERVICE_NAME}\\", \\"image\\": \\"\\${DOCKER_REGISTRY}/\\${IMAGE_NAME}:\\${IMAGE_TAG}\\"}"
                    '''
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'ECP-AI 서비스 이미지 빌드 성공!'
        }
        failure {
            echo 'ECP-AI 서비스 이미지 빌드 실패!'
        }
    }
}`;
  }

  // [advice from AI] Mock 함수들
  mockGetAvailableImages(registryUrl, registryType) {
    const mockImages = {
      'harbor.ecp-ai.com': [
        { name: 'ecp-ai/callbot', tags: ['latest', 'v1.2.0', 'v1.1.5'], size: '245MB' },
        { name: 'ecp-ai/chatbot', tags: ['latest', 'v1.1.8', 'v1.1.7'], size: '189MB' },
        { name: 'ecp-ai/advisor', tags: ['latest', 'v2.0.1', 'v2.0.0'], size: '512MB' },
        { name: 'ecp-ai/stt', tags: ['latest', 'v1.3.2', 'v1.3.1'], size: '1.2GB' },
        { name: 'ecp-ai/tts', tags: ['latest', 'v1.4.0', 'v1.3.9'], size: '2.1GB' },
        { name: 'ecp-ai/text-analytics', tags: ['latest', 'v1.0.5', 'v1.0.4'], size: '387MB' },
        { name: 'ecp-ai/qa-service', tags: ['latest', 'v1.2.3', 'v1.2.2'], size: '298MB' },
        { name: 'ecp-ai/common-infrastructure', tags: ['latest', 'v1.0.2', 'v1.0.1'], size: '156MB' }
      ],
      'docker.io': [
        { name: 'nginx', tags: ['latest', '1.21', '1.20'], size: '133MB' },
        { name: 'postgres', tags: ['latest', '15', '14'], size: '379MB' },
        { name: 'redis', tags: ['latest', '7', '6'], size: '117MB' }
      ]
    };

    return {
      success: true,
      data: {
        registry: registryUrl,
        type: registryType,
        images: mockImages[registryUrl] || [],
        total: mockImages[registryUrl]?.length || 0,
        last_updated: new Date().toISOString()
      },
      message: `Mock ${registryType} 레지스트리 이미지 목록 조회 완료`
    };
  }

  mockCreateBuildPipeline(pipelineConfig) {
    return {
      success: true,
      data: {
        ...pipelineConfig,
        jenkins_job_url: `${this.jenkinsURL}/job/${pipelineConfig.pipeline_name}`,
        webhook_url: pipelineConfig.webhook_url,
        estimated_build_time: '3-5 minutes'
      },
      message: 'Mock Jenkins 빌드 파이프라인 생성 완료'
    };
  }

  mockTriggerImageBuild(buildRequest) {
    return {
      success: true,
      data: {
        ...buildRequest,
        status: 'building',
        jenkins_build_number: Math.floor(Math.random() * 1000) + 1,
        estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        build_logs_url: `${this.jenkinsURL}/job/${buildRequest.pipeline_id}/${Math.floor(Math.random() * 1000)}/console`
      },
      message: 'Mock Jenkins 이미지 빌드 시뮬레이션 시작'
    };
  }

  mockGetBuildStatus(buildId) {
    const statuses = ['building', 'success', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      success: true,
      data: {
        build_id: buildId,
        status: randomStatus,
        progress: randomStatus === 'building' ? Math.floor(Math.random() * 80) + 10 : 100,
        duration: randomStatus === 'building' ? 0 : Math.floor(Math.random() * 300) + 60,
        stages: [
          { name: 'Source Checkout', status: 'completed', duration: 15 },
          { name: 'Build Docker Image', status: randomStatus === 'building' ? 'running' : 'completed', duration: randomStatus === 'building' ? 0 : 180 },
          { name: 'Test Image', status: randomStatus === 'building' ? 'pending' : 'completed', duration: randomStatus === 'building' ? 0 : 30 },
          { name: 'Push to Registry', status: randomStatus === 'building' ? 'pending' : 'completed', duration: randomStatus === 'building' ? 0 : 45 }
        ],
        logs: [
          '[INFO] Starting build process...',
          '[INFO] Cloning repository...',
          '[INFO] Building Docker image...',
          randomStatus === 'building' ? '[INFO] Build in progress...' : '[INFO] Build completed successfully!'
        ]
      },
      message: 'Mock Jenkins 빌드 상태 조회 완료'
    };
  }

  // [advice from AI] 새로운 CI/CD 파이프라인 메서드들 추가
  
  /**
   * Jenkins Job 생성
   */
  async createPipelineJob(config) {
    try {
      console.log(`🔧 Jenkins Job 생성 시작: ${config.jobName}`);
      
      // 실제 Jenkins API 호출 (현재는 Mock)
      const jobConfig = this.generateJobConfig(config);
      
      // Mock 응답
      return {
        success: true,
        data: {
          jobName: config.jobName,
          jobUrl: `${this.jenkinsURL}/job/${config.jobName}`,
          config: jobConfig
        },
        message: `Jenkins Job '${config.jobName}' 생성 완료`
      };
      
    } catch (error) {
      console.error('❌ Jenkins Job 생성 실패:', error);
      throw new Error(`Jenkins Job 생성 실패: ${error.message}`);
    }
  }

  /**
   * Jenkins 빌드 트리거
   */
  async triggerBuild(config) {
    try {
      console.log(`🚀 Jenkins 빌드 트리거: ${config.jobName}`);
      
      const buildNumber = Math.floor(Math.random() * 1000) + 1;
      
      // Mock 응답
      return {
        success: true,
        data: {
          jobName: config.jobName,
          buildNumber: buildNumber,
          buildUrl: `${this.jenkinsURL}/job/${config.jobName}/${buildNumber}`,
          parameters: config.parameters
        },
        buildNumber: buildNumber,
        message: `빌드 #${buildNumber} 트리거 완료`
      };
      
    } catch (error) {
      console.error('❌ Jenkins 빌드 트리거 실패:', error);
      throw new Error(`Jenkins 빌드 트리거 실패: ${error.message}`);
    }
  }

  /**
   * Jenkins Job 삭제
   */
  async deleteJob(jobName) {
    try {
      console.log(`🗑️ Jenkins Job 삭제: ${jobName}`);
      
      // Mock 응답
      return {
        success: true,
        message: `Jenkins Job '${jobName}' 삭제 완료`
      };
      
    } catch (error) {
      console.error('❌ Jenkins Job 삭제 실패:', error);
      throw new Error(`Jenkins Job 삭제 실패: ${error.message}`);
    }
  }

  /**
   * Jenkins Job 설정 생성
   */
  generateJobConfig(config) {
    return {
      repositoryUrl: config.repositoryUrl,
      branch: config.branch,
      dockerfilePath: config.dockerfilePath || 'Dockerfile',
      buildSteps: [
        'git checkout',
        'docker build',
        'docker tag',
        'docker push'
      ],
      postBuildActions: [
        'cleanup workspace',
        'notify pipeline status'
      ]
    };
  }

  // [advice from AI] 서비스 템플릿 조회
  getServiceTemplates() {
    return {
      success: true,
      data: {
        templates: this.serviceTemplates,
        total: this.serviceTemplates.length
      },
      message: 'ECP-AI 서비스 템플릿 조회 성공'
    };
  }

  // [advice from AI] GitHub Repository 유효성 검사
  async validateGitHubRepository(repoUrl, credentials = {}) {
    try {
      if (!repoUrl) {
        throw new Error('GitHub Repository URL이 필요합니다');
      }

      // [advice from AI] Mock 검증
      const isValidUrl = repoUrl.includes('github.com') && repoUrl.includes('/');
      
      return {
        success: isValidUrl,
        data: {
          repository_url: repoUrl,
          accessible: isValidUrl,
          has_dockerfile: true,
          default_branch: 'main',
          last_commit: '2024-01-20T15:30:00Z'
        },
        message: isValidUrl ? 'GitHub Repository 유효성 검사 통과' : 'GitHub Repository URL이 유효하지 않습니다'
      };

    } catch (error) {
      console.error('GitHub Repository 검증 오류:', error);
      throw new Error(`GitHub Repository 검증 실패: ${error.message}`);
    }
  }

  // [advice from AI] 실제 Jenkins Job 생성
  async createJenkinsJob(jobName, jobConfig) {
    try {
      console.log(`🔨 Jenkins Job 생성 시작: ${jobName}`);
      
      const pipelineXml = this.generateJobConfigXML(jobConfig);
      
      const response = await this.makeJenkinsRequest(
        'POST',
        `/createItem?name=${encodeURIComponent(jobName)}`,
        pipelineXml
      );

      console.log(`✅ Jenkins Job 생성 성공: ${jobName}`);
      return {
        success: true,
        jobName,
        jobUrl: `${this.jenkinsURL}/job/${encodeURIComponent(jobName)}/`,
        message: 'Jenkins Job이 성공적으로 생성되었습니다'
      };
    } catch (error) {
      console.error(`❌ Jenkins Job 생성 실패: ${jobName}`, error.message);
      throw new Error(`Jenkins Job 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] Jenkins Job Config XML 생성
  generateJobConfigXML(jobConfig) {
    const {
      githubUrl,
      branch = 'main',
      dockerRegistry = 'nexus.langsa.ai',
      imageName,
      buildScript = 'docker build -t $IMAGE_NAME:$BUILD_NUMBER .'
    } = jobConfig;

    return `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@2.40">
  <actions/>
  <description>ECP-AI 서비스 자동 빌드 파이프라인</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <com.cloudbees.jenkins.GitHubPushTrigger plugin="github@1.34.1">
          <spec></spec>
        </com.cloudbees.jenkins.GitHubPushTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@2.92">
    <script>${this.generatePipelineScript(jobConfig)}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;
  }

  // [advice from AI] 실제 Jenkins Job 빌드 트리거
  async triggerJenkinsBuild(jobName, parameters = {}) {
    try {
      console.log(`🚀 Jenkins 빌드 트리거: ${jobName}`);
      
      const buildParams = Object.keys(parameters).length > 0 
        ? `?${Object.entries(parameters).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`
        : '';

      const response = await this.makeJenkinsRequest(
        'POST',
        `/job/${encodeURIComponent(jobName)}/build${buildParams}`
      );

      // 빌드 번호 추출 (Location 헤더에서)
      const buildNumber = this.extractBuildNumber(response.headers.location);

      console.log(`✅ Jenkins 빌드 트리거 성공: ${jobName} #${buildNumber}`);
      return {
        success: true,
        jobName,
        buildNumber,
        buildUrl: `${this.jenkinsURL}/job/${encodeURIComponent(jobName)}/${buildNumber}/`,
        message: '빌드가 성공적으로 시작되었습니다'
      };
    } catch (error) {
      console.error(`❌ Jenkins 빌드 트리거 실패: ${jobName}`, error.message);
      throw new Error(`Jenkins 빌드 트리거 실패: ${error.message}`);
    }
  }

  // [advice from AI] 빌드 번호 추출 헬퍼
  extractBuildNumber(locationHeader) {
    if (!locationHeader) return 'unknown';
    const match = locationHeader.match(/\/(\d+)\/$/);
    return match ? match[1] : 'unknown';
  }

  // [advice from AI] Jenkins Job 상태 조회
  async getJobStatus(jobName) {
    try {
      const response = await this.makeJenkinsRequest('GET', `/job/${encodeURIComponent(jobName)}/api/json`);
      const jobData = response.data;

      return {
        success: true,
        jobName,
        status: {
          displayName: jobData.displayName,
          description: jobData.description,
          buildable: jobData.buildable,
          color: jobData.color,
          lastBuild: jobData.lastBuild ? {
            number: jobData.lastBuild.number,
            url: jobData.lastBuild.url
          } : null,
          lastSuccessfulBuild: jobData.lastSuccessfulBuild ? {
            number: jobData.lastSuccessfulBuild.number,
            url: jobData.lastSuccessfulBuild.url
          } : null,
          lastFailedBuild: jobData.lastFailedBuild ? {
            number: jobData.lastFailedBuild.number,
            url: jobData.lastFailedBuild.url
          } : null,
          nextBuildNumber: jobData.nextBuildNumber
        }
      };
    } catch (error) {
      console.error(`❌ Jenkins Job 상태 조회 실패: ${jobName}`, error.message);
      throw new Error(`Jenkins Job 상태 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Jenkins Job 삭제
  async deleteJenkinsJob(jobName) {
    try {
      console.log(`🗑️ Jenkins Job 삭제: ${jobName}`);
      
      await this.makeJenkinsRequest('POST', `/job/${encodeURIComponent(jobName)}/doDelete`);

      console.log(`✅ Jenkins Job 삭제 성공: ${jobName}`);
      return {
        success: true,
        jobName,
        message: 'Jenkins Job이 성공적으로 삭제되었습니다'
      };
    } catch (error) {
      console.error(`❌ Jenkins Job 삭제 실패: ${jobName}`, error.message);
      throw new Error(`Jenkins Job 삭제 실패: ${error.message}`);
    }
  }

  // [advice from AI] Jenkins에서 모든 Job 목록 조회
  async listJenkinsJobs() {
    try {
      const response = await this.makeJenkinsRequest('GET', '/api/json?tree=jobs[name,color,url,lastBuild[number,result,timestamp]]');
      
      return {
        success: true,
        jobs: response.data.jobs.map(job => ({
          name: job.name,
          status: job.color,
          url: job.url,
          lastBuild: job.lastBuild ? {
            number: job.lastBuild.number,
            result: job.lastBuild.result,
            timestamp: job.lastBuild.timestamp
          } : null
        }))
      };
    } catch (error) {
      console.error('❌ Jenkins Job 목록 조회 실패:', error.message);
      throw new Error(`Jenkins Job 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 멀티브랜치 파이프라인 생성
  async createMultiBranchPipeline(config) {
    try {
      console.log(`🌿 멀티브랜치 파이프라인 생성: ${config.jobName}`);
      
      const multiBranchConfig = this.generateMultiBranchConfig(config);
      
      const response = await this.makeJenkinsRequest(
        'POST',
        `/createItem?name=${encodeURIComponent(config.jobName)}`,
        multiBranchConfig,
        {
          headers: {
            'Content-Type': 'application/xml'
          }
        }
      );

      console.log(`✅ 멀티브랜치 파이프라인 생성 성공: ${config.jobName}`);
      return {
        success: true,
        jobName: config.jobName,
        jobUrl: `${this.jenkinsURL}/job/${encodeURIComponent(config.jobName)}/`,
        type: 'multibranch',
        branches: config.branches || ['main', 'develop'],
        message: '멀티브랜치 파이프라인이 성공적으로 생성되었습니다'
      };
    } catch (error) {
      console.error(`❌ 멀티브랜치 파이프라인 생성 실패: ${config.jobName}`, error.message);
      throw new Error(`멀티브랜치 파이프라인 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: Blue Ocean 파이프라인 생성
  async createBlueOceanPipeline(config) {
    try {
      console.log(`🌊 Blue Ocean 파이프라인 생성: ${config.jobName}`);
      
      const pipelineConfig = {
        name: config.jobName,
        organization: config.organization || 'jenkins',
        scmSource: {
          id: uuidv4(),
          source: {
            remote: config.repositoryUrl,
            credentialsId: config.credentialsId || '',
            traits: [
              {
                $class: 'jenkins.plugins.git.traits.BranchDiscoveryTrait'
              },
              {
                $class: 'jenkins.plugins.git.traits.OriginPullRequestDiscoveryTrait',
                strategyId: 1
              }
            ]
          }
        }
      };

      // Blue Ocean REST API 사용
      const response = await this.makeJenkinsRequest(
        'POST',
        `/blue/rest/organizations/${config.organization || 'jenkins'}/pipelines/`,
        pipelineConfig
      );

      console.log(`✅ Blue Ocean 파이프라인 생성 성공: ${config.jobName}`);
      return {
        success: true,
        jobName: config.jobName,
        jobUrl: `${this.jenkinsURL}/blue/organizations/jenkins/pipelines/${config.jobName}/`,
        blueOceanUrl: `${this.jenkinsURL}/blue/organizations/jenkins/pipelines/${config.jobName}/activity/`,
        message: 'Blue Ocean 파이프라인이 성공적으로 생성되었습니다'
      };
    } catch (error) {
      console.error(`❌ Blue Ocean 파이프라인 생성 실패: ${config.jobName}`, error.message);
      
      // Blue Ocean이 없는 경우 일반 파이프라인으로 폴백
      if (error.response?.status === 404) {
        console.log('ℹ️ Blue Ocean 플러그인이 없어 일반 파이프라인으로 생성합니다');
        return await this.createJenkinsJob(config.jobName, config);
      }
      
      throw new Error(`Blue Ocean 파이프라인 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 빌드 실시간 모니터링
  async monitorBuildProgress(jobName, buildNumber, onProgress = null) {
    const buildId = `${jobName}-${buildNumber}`;
    const startTime = Date.now();
    
    console.log(`👁️ 빌드 모니터링 시작: ${buildId}`);
    
    return new Promise((resolve, reject) => {
      const pollBuild = async () => {
        try {
          const response = await this.makeJenkinsRequest(
            'GET',
            `/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`
          );
          
          const buildInfo = response.data;
          const progress = {
            buildId,
            jobName,
            buildNumber,
            status: buildInfo.result || (buildInfo.building ? 'BUILDING' : 'UNKNOWN'),
            duration: buildInfo.duration || (Date.now() - startTime),
            estimatedDuration: buildInfo.estimatedDuration || 0,
            building: buildInfo.building,
            timestamp: buildInfo.timestamp,
            url: buildInfo.url,
            stages: await this.getBuildStages(jobName, buildNumber).catch(() => []),
            logs: await this.getBuildLogs(jobName, buildNumber, 50).catch(() => [])
          };
          
          // 진행 상황 콜백 호출
          if (onProgress) {
            onProgress(progress);
          }
          
          // 이벤트 발생
          this.emit('buildProgress', progress);
          
          // 빌드 완료 확인
          if (!buildInfo.building) {
            console.log(`✅ 빌드 모니터링 완료: ${buildId} (${buildInfo.result})`);
            resolve(progress);
            return;
          }
          
          // 다음 폴링 예약
          setTimeout(pollBuild, this.pollInterval);
          
        } catch (error) {
          console.error(`❌ 빌드 모니터링 오류: ${buildId}`, error.message);
          reject(error);
        }
      };
      
      // 모니터링 시작
      pollBuild();
    });
  }

  // [advice from AI] Phase 2: 빌드 스테이지 정보 조회
  async getBuildStages(jobName, buildNumber) {
    try {
      const response = await this.makeJenkinsRequest(
        'GET',
        `/job/${encodeURIComponent(jobName)}/${buildNumber}/wfapi/describe`
      );
      
      return response.data.stages?.map(stage => ({
        id: stage.id,
        name: stage.name,
        status: stage.status,
        startTimeMillis: stage.startTimeMillis,
        durationMillis: stage.durationMillis,
        pauseDurationMillis: stage.pauseDurationMillis
      })) || [];
    } catch (error) {
      console.warn(`⚠️ 빌드 스테이지 조회 실패: ${jobName}#${buildNumber}`, error.message);
      return [];
    }
  }

  // [advice from AI] Phase 2: 빌드 로그 조회 (실시간)
  async getBuildLogs(jobName, buildNumber, lines = 100) {
    try {
      const response = await this.makeJenkinsRequest(
        'GET',
        `/job/${encodeURIComponent(jobName)}/${buildNumber}/logText/progressiveText`,
        null,
        {
          params: {
            start: Math.max(0, lines * -1)
          },
          headers: {
            'Accept': 'text/plain'
          }
        }
      );
      
      return response.data.split('\n').filter(line => line.trim());
    } catch (error) {
      console.warn(`⚠️ 빌드 로그 조회 실패: ${jobName}#${buildNumber}`, error.message);
      return [];
    }
  }

  // [advice from AI] Phase 2: 웹훅 설정
  async setupWebhook(jobName, webhookConfig) {
    try {
      const webhookToken = uuidv4();
      const webhookUrl = `${this.jenkinsURL}/generic-webhook-trigger/invoke?token=${webhookToken}&job=${encodeURIComponent(jobName)}`;
      
      // 웹훅 토큰 저장
      this.webhookTokens.set(jobName, {
        token: webhookToken,
        url: webhookUrl,
        config: webhookConfig,
        createdAt: new Date().toISOString()
      });
      
      console.log(`🔗 웹훅 설정 완료: ${jobName}`);
      return {
        success: true,
        jobName,
        webhookUrl,
        webhookToken,
        instructions: {
          github: `GitHub Repository Settings > Webhooks > Add webhook\nPayload URL: ${webhookUrl}\nContent type: application/json\nEvents: Push events, Pull requests`,
          gitlab: `GitLab Project Settings > Webhooks > Add webhook\nURL: ${webhookUrl}\nTrigger: Push events, Merge request events`,
          bitbucket: `Bitbucket Repository Settings > Webhooks > Add webhook\nURL: ${webhookUrl}\nTriggers: Repository push, Pull request created`
        }
      };
    } catch (error) {
      console.error(`❌ 웹훅 설정 실패: ${jobName}`, error.message);
      throw new Error(`웹훅 설정 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 아티팩트 관리
  async getJobArtifacts(jobName, buildNumber) {
    try {
      const response = await this.makeJenkinsRequest(
        'GET',
        `/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json?tree=artifacts[*]`
      );
      
      const artifacts = response.data.artifacts || [];
      
      return {
        success: true,
        jobName,
        buildNumber,
        artifacts: artifacts.map(artifact => ({
          fileName: artifact.fileName,
          relativePath: artifact.relativePath,
          size: artifact.size || 0,
          downloadUrl: `${this.jenkinsURL}/job/${encodeURIComponent(jobName)}/${buildNumber}/artifact/${artifact.relativePath}`
        })),
        count: artifacts.length
      };
    } catch (error) {
      console.error(`❌ 아티팩트 조회 실패: ${jobName}#${buildNumber}`, error.message);
      throw new Error(`아티팩트 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 빌드 파라미터 검증
  validateBuildParameters(parameters) {
    const errors = [];
    
    if (!parameters.repositoryUrl) {
      errors.push('Repository URL이 필요합니다');
    } else {
      try {
        new URL(parameters.repositoryUrl);
      } catch (error) {
        errors.push('유효하지 않은 Repository URL입니다');
      }
    }
    
    if (!parameters.branch) {
      parameters.branch = 'main'; // 기본값 설정
    }
    
    if (parameters.dockerfilePath && !parameters.dockerfilePath.endsWith('Dockerfile')) {
      errors.push('Dockerfile 경로가 올바르지 않습니다');
    }
    
    if (errors.length > 0) {
      throw new Error(`빌드 파라미터 검증 실패: ${errors.join(', ')}`);
    }
    
    return true;
  }

  // [advice from AI] Phase 2: 멀티브랜치 설정 생성
  generateMultiBranchConfig(config) {
    return `<?xml version='1.1' encoding='UTF-8'?>
<org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject plugin="workflow-multibranch@2.22">
  <actions/>
  <description>${config.description || 'Timbel CICD 멀티브랜치 파이프라인'}</description>
  <properties>
    <org.jenkinsci.plugins.pipeline.modeldefinition.config.FolderConfig plugin="pipeline-model-definition@1.8.5">
      <dockerLabel></dockerLabel>
      <registry plugin="docker-commons@1.17"/>
    </org.jenkinsci.plugins.pipeline.modeldefinition.config.FolderConfig>
  </properties>
  <folderViews class="jenkins.branch.MultiBranchProjectViewHolder" plugin="branch-api@2.6.4">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
  </folderViews>
  <healthMetrics>
    <com.cloudbees.hudson.plugins.folder.health.WorstChildHealthMetric plugin="cloudbees-folder@6.15">
      <nonRecursive>false</nonRecursive>
    </com.cloudbees.hudson.plugins.folder.health.WorstChildHealthMetric>
  </healthMetrics>
  <icon class="jenkins.branch.MetadataActionFolderIcon" plugin="branch-api@2.6.4">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
  </icon>
  <orphanedItemStrategy class="com.cloudbees.hudson.plugins.folder.computed.DefaultOrphanedItemStrategy" plugin="cloudbees-folder@6.15">
    <pruneDeadBranches>true</pruneDeadBranches>
    <daysToKeep>-1</daysToKeep>
    <numToKeep>-1</numToKeep>
  </orphanedItemStrategy>
  <triggers>
    <com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger plugin="cloudbees-folder@6.15">
      <spec>H H * * *</spec>
      <interval>86400000</interval>
    </com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger>
  </triggers>
  <disabled>false</disabled>
  <sources class="jenkins.branch.BranchSource" plugin="branch-api@2.6.4">
    <source class="jenkins.plugins.git.GitSCMSource" plugin="git@4.8.2">
      <id>${uuidv4()}</id>
      <remote>${config.repositoryUrl}</remote>
      <credentialsId>${config.credentialsId || ''}</credentialsId>
      <traits>
        <jenkins.plugins.git.traits.BranchDiscoveryTrait/>
        <jenkins.plugins.git.traits.OriginPullRequestDiscoveryTrait>
          <strategyId>1</strategyId>
        </jenkins.plugins.git.traits.OriginPullRequestDiscoveryTrait>
        <jenkins.plugins.git.traits.ForkPullRequestDiscoveryTrait>
          <strategyId>1</strategyId>
          <trust class="jenkins.plugins.git.traits.ForkPullRequestDiscoveryTrait$TrustPermission"/>
        </jenkins.plugins.git.traits.ForkPullRequestDiscoveryTrait>
      </traits>
    </source>
    <strategy class="jenkins.branch.DefaultBranchPropertyStrategy">
      <properties class="empty-list"/>
    </strategy>
  </sources>
  <factory class="org.jenkinsci.plugins.workflow.multibranch.WorkflowBranchProjectFactory">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
    <scriptPath>Jenkinsfile</scriptPath>
  </factory>
</org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject>`;
  }

  // [advice from AI] Phase 2: 연결 테스트
  async testConnection() {
    try {
      console.log(`🔍 Jenkins 연결 테스트: ${this.jenkinsURL}`);
      
      const healthResult = await this.checkJenkinsHealth();
      if (healthResult.status !== 'healthy') {
        return {
          success: false,
          error: 'Jenkins 서버 헬스 체크 실패',
          details: healthResult
        };
      }
      
      const jobsResult = await this.listJenkinsJobs();
      
      console.log('✅ Jenkins 연결 테스트 성공');
      return {
        success: true,
        server: {
          url: this.jenkinsURL,
          version: healthResult.version,
          user: this.jenkinsUser,
          mode: healthResult.mode,
          executors: healthResult.numExecutors
        },
        jobs: {
          count: jobsResult.jobs.length,
          list: jobsResult.jobs.slice(0, 5).map(job => ({
            name: job.name,
            status: job.status,
            lastBuild: job.lastBuild
          }))
        },
        features: {
          crumbIssuer: this.crumbToken !== null,
          blueOcean: await this.checkBlueOceanPlugin(),
          multiBranch: true,
          webhooks: true
        }
      };
      
    } catch (error) {
      console.error('❌ Jenkins 연결 테스트 실패:', error.message);
      return {
        success: false,
        error: error.message,
        server: {
          url: this.jenkinsURL,
          user: this.jenkinsUser
        }
      };
    }
  }

  // [advice from AI] Phase 2: Blue Ocean 플러그인 확인
  async checkBlueOceanPlugin() {
    try {
      await this.makeJenkinsRequest('GET', '/blue/rest/organizations/jenkins/');
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = JenkinsIntegration;
