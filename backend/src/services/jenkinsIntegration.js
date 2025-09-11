// [advice from AI] Jenkins 서버 연동 서비스
// CI/CD 이미지 빌드, 파이프라인 관리, GitHub 연동

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class JenkinsIntegration {
  constructor() {
    // [advice from AI] Jenkins 서버 설정
    this.jenkinsURL = process.env.JENKINS_URL || 'http://localhost:8080';
    this.jenkinsUser = process.env.JENKINS_USER || 'admin';
    this.jenkinsToken = process.env.JENKINS_TOKEN || '';
    this.jenkinsTimeout = parseInt(process.env.JENKINS_TIMEOUT || '30000');
    
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
}

module.exports = JenkinsIntegration;
