// [advice from AI] CI/CD 파이프라인 서비스
// 멀티스테이지 빌드, 테스트 자동화, 배포 자동화 관리

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class CICDPipelineService {
  constructor() {
    // [advice from AI] CI/CD 설정 (Docker 네트워크 내부 연결)
    this.jenkinsURL = process.env.JENKINS_URL || 'http://jenkins:8080';
    this.jenkinsUser = process.env.JENKINS_USER || 'admin';
    this.jenkinsToken = process.env.JENKINS_TOKEN || '';
    this.gitlabURL = process.env.GITLAB_URL || 'https://gitlab.com';
    this.gitlabToken = process.env.GITLAB_TOKEN || '';
    this.dockerRegistry = process.env.DOCKER_REGISTRY || 'registry.timbel.com';
    
    // [advice from AI] 파이프라인 단계 정의
    this.pipelineStages = [
      { name: 'Source Checkout', order: 1, required: true },
      { name: 'Build Dependencies', order: 2, required: true },
      { name: 'Unit Tests', order: 3, required: true },
      { name: 'Code Quality Check', order: 4, required: false },
      { name: 'Build Docker Image', order: 5, required: true },
      { name: 'Integration Tests', order: 6, required: false },
      { name: 'Security Scan', order: 7, required: false },
      { name: 'Push to Registry', order: 8, required: true },
      { name: 'Deploy to Staging', order: 9, required: false },
      { name: 'E2E Tests', order: 10, required: false },
      { name: 'Deploy to Production', order: 11, required: true }
    ];

    // [advice from AI] 배포 전략
    this.deploymentStrategies = [
      'rolling',        // 롤링 업데이트
      'blue-green',     // 블루-그린 배포
      'canary',         // 카나리 배포
      'recreate'        // 재생성 배포
    ];
  }

  // [advice from AI] 파이프라인 생성
  async createPipeline(config) {
    try {
      const {
        pipelineName,
        tenantId,
        repository,
        branch = 'main',
        buildConfig = {},
        testConfig = {},
        deployConfig = {}
      } = config;

      // [advice from AI] 입력 검증
      if (!pipelineName || !tenantId || !repository) {
        throw new Error('파이프라인 이름, 테넌트 ID, 저장소는 필수입니다');
      }

      const pipelineId = uuidv4();
      const pipeline = {
        pipeline_id: pipelineId,
        pipeline_name: pipelineName,
        tenant_id: tenantId,
        repository: {
          url: repository.url,
          branch: branch,
          credentials: repository.credentials || null
        },
        build_config: {
          dockerfile: buildConfig.dockerfile || 'Dockerfile',
          context: buildConfig.context || '.',
          args: buildConfig.args || {},
          target: buildConfig.target || null,
          ...buildConfig
        },
        test_config: {
          unit_tests: testConfig.unitTests !== false,
          integration_tests: testConfig.integrationTests || false,
          e2e_tests: testConfig.e2eTests || false,
          coverage_threshold: testConfig.coverageThreshold || 80,
          ...testConfig
        },
        deploy_config: {
          strategy: deployConfig.strategy || 'rolling',
          auto_deploy: deployConfig.autoDeploy !== false,
          environments: deployConfig.environments || ['staging', 'production'],
          rollback_on_failure: deployConfig.rollbackOnFailure !== false,
          ...deployConfig
        },
        stages: this.pipelineStages.map(stage => ({
          ...stage,
          enabled: stage.required || (buildConfig.stages && buildConfig.stages.includes(stage.name))
        })),
        status: 'created',
        created_at: new Date().toISOString(),
        last_run: null
      };

      console.log('파이프라인 생성:', pipeline);

      // [advice from AI] Mock 응답 (실제 CI/CD 시스템 연동 시 교체)
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockCreatePipeline(pipeline);
      }

      // [advice from AI] 실제 Jenkins/GitLab CI 연동
      const result = await this.createJenkinsPipeline(pipeline);
      
      return {
        success: true,
        data: result,
        message: '파이프라인이 성공적으로 생성되었습니다'
      };

    } catch (error) {
      console.error('파이프라인 생성 오류:', error);
      throw new Error(`파이프라인 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 파이프라인 실행 - 실제 Jenkins/GitLab CI 연동
  async runPipeline(pipelineId, runConfig = {}) {
    try {
      if (!pipelineId) {
        throw new Error('파이프라인 ID는 필수입니다');
      }

      const runId = uuidv4();
      const pipelineRun = {
        run_id: runId,
        pipeline_id: pipelineId,
        trigger: runConfig.trigger || 'manual',
        parameters: runConfig.parameters || {},
        branch: runConfig.branch || 'main',
        commit_hash: runConfig.commitHash || null,
        status: 'running',
        started_at: new Date().toISOString(),
        stages: this.pipelineStages.map((stage, index) => ({
          ...stage,
          status: index === 0 ? 'running' : 'pending',
          started_at: index === 0 ? new Date().toISOString() : null,
          finished_at: null,
          duration: 0,
          logs: []
        }))
      };

      console.log('🚀 파이프라인 실행 요청:', { pipelineId, runConfig });

      // [advice from AI] Jenkins 연결 확인
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        console.warn('⚠️ Jenkins 미연결, Mock 실행 사용');
        return this.mockRunPipeline(pipelineRun);
      }

      // [advice from AI] 실제 Jenkins 파이프라인 실행
      console.log('✅ Jenkins로 실제 파이프라인 실행 시작');
      const result = await this.executeJenkinsPipeline(pipelineId, runConfig);
      
      // 실행 결과와 runId 연결
      result.run_id = runId;
      result.pipeline_id = pipelineId;
      
      return {
        success: true,
        data: result,
        message: 'Jenkins 파이프라인 실행이 시작되었습니다',
        source: 'jenkins'
      };

    } catch (error) {
      console.error('❌ 파이프라인 실행 오류:', error);
      // Fallback to mock on error
      console.warn('⚠️ Jenkins 실행 실패, Mock으로 Fallback');
      const mockResult = this.mockRunPipeline({
        run_id: uuidv4(),
        pipeline_id: pipelineId,
        ...runConfig
      });
      mockResult.fallback = true;
      mockResult.error = error.message;
      return mockResult;
    }
  }

  // [advice from AI] 파이프라인 상태 조회
  async getPipelineStatus(runId) {
    try {
      if (!runId) {
        throw new Error('실행 ID는 필수입니다');
      }

      // [advice from AI] Mock 응답
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockGetPipelineStatus(runId);
      }

      // [advice from AI] 실제 상태 조회
      const result = await this.getJenkinsPipelineStatus(runId);
      
      return {
        success: true,
        data: result,
        message: '파이프라인 상태 조회 성공'
      };

    } catch (error) {
      console.error('파이프라인 상태 조회 오류:', error);
      throw new Error(`파이프라인 상태 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 파이프라인 목록 조회
  async getPipelines(filters = {}) {
    try {
      const {
        tenantId,
        status,
        page = 1,
        limit = 20
      } = filters;

      // [advice from AI] Mock 응답
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockGetPipelines(filters);
      }

      // [advice from AI] 실제 파이프라인 목록 조회
      const result = await this.getJenkinsPipelines(filters);
      
      return {
        success: true,
        data: result,
        message: '파이프라인 목록 조회 성공'
      };

    } catch (error) {
      console.error('파이프라인 목록 조회 오류:', error);
      throw new Error(`파이프라인 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 배포 실행
  async deploy(deploymentConfig) {
    try {
      const {
        pipelineId,
        environment,
        strategy = 'rolling',
        imageTag,
        replicas = 1,
        resources = {}
      } = deploymentConfig;

      if (!pipelineId || !environment || !imageTag) {
        throw new Error('파이프라인 ID, 환경, 이미지 태그는 필수입니다');
      }

      if (!this.deploymentStrategies.includes(strategy)) {
        throw new Error(`지원되지 않는 배포 전략: ${strategy}`);
      }

      const deploymentId = uuidv4();
      const deployment = {
        deployment_id: deploymentId,
        pipeline_id: pipelineId,
        environment: environment,
        strategy: strategy,
        image_tag: imageTag,
        replicas: replicas,
        resources: {
          cpu: resources.cpu || '0.5',
          memory: resources.memory || '1Gi',
          gpu: resources.gpu || 0,
          ...resources
        },
        status: 'deploying',
        started_at: new Date().toISOString(),
        progress: 0
      };

      console.log('배포 실행:', deployment);

      // [advice from AI] Mock 응답
      if (this.jenkinsToken === '' || this.jenkinsURL.includes('mock')) {
        return this.mockDeploy(deployment);
      }

      // [advice from AI] 실제 배포 실행
      const result = await this.executeDeployment(deployment);
      
      return {
        success: true,
        data: result,
        message: '배포가 시작되었습니다'
      };

    } catch (error) {
      console.error('배포 실행 오류:', error);
      throw new Error(`배포 실행 실패: ${error.message}`);
    }
  }

  // [advice from AI] Jenkins 파이프라인 생성 (실제 구현)
  async createJenkinsPipeline(pipeline) {
    const jenkinsfile = this.generateJenkinsfile(pipeline);
    
    // Jenkins API 호출하여 파이프라인 생성
    const response = await axios.post(
      `${this.jenkinsURL}/createItem?name=${pipeline.pipeline_name}`,
      jenkinsfile,
      {
        auth: {
          username: this.jenkinsUser,
          password: this.jenkinsToken
        },
        headers: {
          'Content-Type': 'application/xml'
        }
      }
    );

    return pipeline;
  }

  // [advice from AI] 실제 Jenkins 파이프라인 실행
  async executeJenkinsPipeline(pipelineId, runConfig) {
    try {
      console.log(`🔄 Jenkins 파이프라인 트리거: ${pipelineId}`);
      
      // Jenkins 빌드 파라미터 준비
      const buildParams = {
        BRANCH: runConfig.branch || 'main',
        COMMIT_HASH: runConfig.commitHash || '',
        TRIGGER_USER: runConfig.triggeredBy || 'system',
        ...runConfig.parameters
      };

      // Jenkins buildWithParameters API 호출
      const response = await axios.post(
        `${this.jenkinsURL}/job/${pipelineId}/buildWithParameters`,
        null,
        {
          params: buildParams,
          auth: {
            username: this.jenkinsUser,
            password: this.jenkinsToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      // Jenkins는 Location 헤더에 빌드 큐 URL을 반환
      const queueUrl = response.headers.location;
      console.log(`✅ Jenkins 빌드 큐에 추가됨: ${queueUrl}`);

      // 큐 아이템에서 빌드 번호 추출 (비동기)
      let buildNumber = null;
      if (queueUrl) {
        try {
          const queueItem = await this.getJenkinsQueueItem(queueUrl);
          buildNumber = queueItem.executable?.number;
        } catch (queueError) {
          console.warn('⚠️ 빌드 번호 조회 실패:', queueError.message);
        }
      }

      return {
        status: 'queued',
        queue_url: queueUrl,
        build_number: buildNumber,
        build_url: buildNumber ? `${this.jenkinsURL}/job/${pipelineId}/${buildNumber}/` : null,
        started_at: new Date().toISOString(),
        parameters: buildParams
      };

    } catch (error) {
      console.error('❌ Jenkins 파이프라인 실행 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] Jenkins 큐 아이템 조회
  async getJenkinsQueueItem(queueUrl) {
    try {
      const response = await axios.get(`${queueUrl}api/json`, {
        auth: {
          username: this.jenkinsUser,
          password: this.jenkinsToken
        },
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      throw new Error(`큐 아이템 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Jenkins 파이프라인 상태 조회
  async getJenkinsPipelineStatus(runId) {
    try {
      // runId는 Jenkins 빌드 URL 또는 buildNumber를 포함
      const [pipelineId, buildNumber] = runId.split('/');
      
      const response = await axios.get(
        `${this.jenkinsURL}/job/${pipelineId}/${buildNumber}/api/json`,
        {
          auth: {
            username: this.jenkinsUser,
            password: this.jenkinsToken
          },
          timeout: 5000
        }
      );

      const buildData = response.data;
      
      return {
        run_id: runId,
        pipeline_id: pipelineId,
        build_number: buildNumber,
        status: buildData.result ? buildData.result.toLowerCase() : 'running',
        progress: buildData.duration ? 100 : (buildData.estimatedDuration ? 
          Math.min((Date.now() - buildData.timestamp) / buildData.estimatedDuration * 100, 99) : 0),
        started_at: new Date(buildData.timestamp).toISOString(),
        finished_at: buildData.duration ? new Date(buildData.timestamp + buildData.duration).toISOString() : null,
        duration: buildData.duration,
        url: buildData.url,
        console_url: `${buildData.url}console`
      };

    } catch (error) {
      console.error('❌ Jenkins 상태 조회 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] Jenkins 파이프라인 목록 조회
  async getJenkinsPipelines(filters) {
    try {
      const response = await axios.get(`${this.jenkinsURL}/api/json?tree=jobs[name,url,lastBuild[number,result,timestamp]]`, {
        auth: {
          username: this.jenkinsUser,
          password: this.jenkinsToken
        },
        timeout: 10000
      });

      const jobs = response.data.jobs || [];
      
      // 필터 적용
      let filteredJobs = jobs;
      if (filters.status) {
        filteredJobs = jobs.filter(job => {
          if (!job.lastBuild) return false;
          const status = job.lastBuild.result?.toLowerCase() || 'running';
          return status === filters.status;
        });
      }

      // 페이지네이션
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      return {
        pipelines: filteredJobs.slice(startIndex, endIndex).map(job => ({
          pipeline_id: job.name,
          pipeline_name: job.name,
          url: job.url,
          last_build: job.lastBuild ? {
            number: job.lastBuild.number,
            status: job.lastBuild.result?.toLowerCase() || 'running',
            timestamp: new Date(job.lastBuild.timestamp).toISOString()
          } : null
        })),
        total: filteredJobs.length,
        page,
        limit,
        total_pages: Math.ceil(filteredJobs.length / limit)
      };

    } catch (error) {
      console.error('❌ Jenkins 파이프라인 목록 조회 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] 실제 배포 실행 (Kubernetes via kubectl)
  async executeDeployment(deployment) {
    try {
      console.log(`🚀 배포 실행: ${deployment.deployment_id}`);
      
      // Kubernetes 배포 매니페스트 생성
      const manifest = this.generateK8sManifest(deployment);
      
      // kubectl apply 실행 (exec를 통해)
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      try {
        const { stdout, stderr } = await execPromise(
          `echo '${JSON.stringify(manifest)}' | kubectl apply -f -`
        );
        
        console.log('✅ Kubernetes 배포 성공:', stdout);
        
        return {
          ...deployment,
          status: 'deployed',
          finished_at: new Date().toISOString(),
          kubectl_output: stdout
        };

      } catch (kubectlError) {
        console.error('❌ kubectl 실행 실패:', kubectlError);
        throw kubectlError;
      }

    } catch (error) {
      console.error('❌ 배포 실행 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] Kubernetes 매니페스트 생성
  generateK8sManifest(deployment) {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `${deployment.pipeline_id}-${deployment.environment}`,
        namespace: deployment.environment,
        labels: {
          app: deployment.pipeline_id,
          environment: deployment.environment,
          'deployment-id': deployment.deployment_id
        }
      },
      spec: {
        replicas: deployment.replicas,
        strategy: {
          type: deployment.strategy === 'rolling' ? 'RollingUpdate' : 'Recreate',
          rollingUpdate: deployment.strategy === 'rolling' ? {
            maxSurge: 1,
            maxUnavailable: 0
          } : undefined
        },
        selector: {
          matchLabels: {
            app: deployment.pipeline_id,
            environment: deployment.environment
          }
        },
        template: {
          metadata: {
            labels: {
              app: deployment.pipeline_id,
              environment: deployment.environment
            }
          },
          spec: {
            containers: [{
              name: deployment.pipeline_id,
              image: `${this.dockerRegistry}/${deployment.pipeline_id}:${deployment.image_tag}`,
              resources: {
                requests: {
                  cpu: deployment.resources.cpu,
                  memory: deployment.resources.memory
                },
                limits: {
                  cpu: deployment.resources.cpu,
                  memory: deployment.resources.memory
                }
              }
            }]
          }
        }
      }
    };
  }

  // [advice from AI] Jenkinsfile 생성
  generateJenkinsfile(pipeline) {
    const stages = pipeline.stages
      .filter(stage => stage.enabled)
      .map(stage => {
        switch (stage.name) {
          case 'Source Checkout':
            return `
        stage('${stage.name}') {
            steps {
                git branch: '${pipeline.repository.branch}', url: '${pipeline.repository.url}'
            }
        }`;
          case 'Build Dependencies':
            return `
        stage('${stage.name}') {
            steps {
                sh 'npm install'
            }
        }`;
          case 'Unit Tests':
            return `
        stage('${stage.name}') {
            steps {
                sh 'npm test'
            }
        }`;
          case 'Build Docker Image':
            return `
        stage('${stage.name}') {
            steps {
                script {
                    def image = docker.build("${this.dockerRegistry}/${pipeline.pipeline_name}:${BUILD_NUMBER}")
                }
            }
        }`;
          case 'Push to Registry':
            return `
        stage('${stage.name}') {
            steps {
                script {
                    docker.withRegistry('https://${this.dockerRegistry}') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }`;
          default:
            return `
        stage('${stage.name}') {
            steps {
                echo 'Executing ${stage.name}'
            }
        }`;
        }
      })
      .join('');

    return `
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = '${this.dockerRegistry}'
        TENANT_ID = '${pipeline.tenant_id}'
    }
    
    stages {${stages}
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully'
        }
        failure {
            echo 'Pipeline failed'
        }
    }
}`;
  }

  // [advice from AI] Mock 파이프라인 생성
  mockCreatePipeline(pipeline) {
    console.warn('⚠️ Mock 파이프라인 생성 사용 중 - Jenkins 연결 확인 필요');
    return {
      success: true,
      data: {
        ...pipeline,
        jenkins_job_url: `${this.jenkinsURL}/job/${pipeline.pipeline_name}`,
        webhook_url: `${this.jenkinsURL}/generic-webhook-trigger/invoke?token=${pipeline.pipeline_id}`
      },
      message: 'Mock 파이프라인 생성 완료',
      mock: true,
      warning: 'Jenkins 미연결 상태'
    };
  }

  // [advice from AI] Mock 파이프라인 실행
  mockRunPipeline(pipelineRun) {
    console.warn('⚠️ Mock 파이프라인 실행 사용 중 - 실제 CI/CD 서버 미연결');
    
    // [advice from AI] 단계별 진행 시뮬레이션
    setTimeout(() => {
      pipelineRun.stages[0].status = 'completed';
      pipelineRun.stages[0].finished_at = new Date().toISOString();
      pipelineRun.stages[1].status = 'running';
      pipelineRun.stages[1].started_at = new Date().toISOString();
    }, 2000);

    return {
      success: true,
      data: pipelineRun,
      message: 'Mock 파이프라인 실행 시뮬레이션 (실제 실행 아님)',
      mock: true,
      warning: 'Jenkins/GitLab CI 미연결 상태'
    };
  }

  // [advice from AI] Mock 파이프라인 상태
  mockGetPipelineStatus(runId) {
    const mockStatus = {
      run_id: runId,
      pipeline_id: 'timbel-pipeline-001',
      status: 'running',
      progress: 65,
      current_stage: 'Build Docker Image',
      started_at: '2024-01-20T10:30:00Z',
      estimated_completion: '2024-01-20T10:45:00Z',
      stages: [
        { name: 'Source Checkout', status: 'completed', duration: 15 },
        { name: 'Build Dependencies', status: 'completed', duration: 120 },
        { name: 'Unit Tests', status: 'completed', duration: 45 },
        { name: 'Build Docker Image', status: 'running', duration: 0 },
        { name: 'Push to Registry', status: 'pending', duration: 0 },
        { name: 'Deploy to Production', status: 'pending', duration: 0 }
      ],
      logs: [
        { timestamp: '2024-01-20T10:30:15Z', level: 'INFO', message: 'Source checkout completed' },
        { timestamp: '2024-01-20T10:32:20Z', level: 'INFO', message: 'Dependencies installed successfully' },
        { timestamp: '2024-01-20T10:33:05Z', level: 'INFO', message: 'All tests passed' },
        { timestamp: '2024-01-20T10:33:10Z', level: 'INFO', message: 'Building Docker image...' }
      ]
    };

    return {
      success: true,
      data: mockStatus,
      message: 'Mock 파이프라인 상태 조회 완료'
    };
  }

  // [advice from AI] Mock 파이프라인 목록
  mockGetPipelines(filters) {
    console.warn('⚠️ Mock 파이프라인 목록 사용 중 - Jenkins 연결 확인 필요');
    const mockPipelines = [
      {
        pipeline_id: 'timbel-pipeline-001',
        pipeline_name: 'Timbel Frontend Pipeline',
        tenant_id: 'timbel-prod-001',
        status: 'active',
        last_run: {
          run_id: 'run-001',
          status: 'success',
          started_at: '2024-01-20T10:30:00Z',
          duration: 420
        },
        success_rate: 95.5,
        created_at: '2024-01-15T14:20:00Z'
      },
      {
        pipeline_id: 'timbel-pipeline-002',
        pipeline_name: 'Timbel Backend Pipeline',
        tenant_id: 'timbel-prod-001',
        status: 'active',
        last_run: {
          run_id: 'run-002',
          status: 'running',
          started_at: '2024-01-20T11:15:00Z',
          duration: 0
        },
        success_rate: 92.3,
        created_at: '2024-01-15T14:25:00Z'
      }
    ];

    return {
      success: true,
      data: {
        pipelines: mockPipelines,
        total: mockPipelines.length,
        page: filters.page || 1,
        limit: filters.limit || 20
      },
      message: 'Mock 파이프라인 목록 조회 완료'
    };
  }

  // [advice from AI] Mock 배포
  mockDeploy(deployment) {
    console.warn('⚠️ Mock 배포 사용 중 - Kubernetes 클러스터 연결 확인 필요');
    return {
      success: true,
      data: {
        ...deployment,
        steps: [
          { name: 'Validate Configuration', status: 'completed', progress: 100 },
          { name: 'Pull Docker Image', status: 'completed', progress: 100 },
          { name: 'Rolling Update', status: 'in_progress', progress: 40 },
          { name: 'Health Check', status: 'pending', progress: 0 },
          { name: 'Traffic Switch', status: 'pending', progress: 0 }
        ]
      },
      message: 'Mock 배포 시뮬레이션 (실제 배포 아님)',
      mock: true,
      warning: 'Kubernetes 미연결 상태'
    };
  }
}

module.exports = CICDPipelineService;
