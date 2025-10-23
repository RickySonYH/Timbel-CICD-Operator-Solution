// [advice from AI] GitHub Actions 파이프라인 프로바이더
// GitHub API를 통한 GitHub Actions 워크플로우 관리 및 실행

const BasePipelineProvider = require('../BasePipelineProvider');
const axios = require('axios');
const systemLogger = require('../../../middleware/systemLogger');

class GitHubActionsProvider extends BasePipelineProvider {
  constructor(name, config) {
    super(name, config);
    
    // [advice from AI] GitHub Actions 특화 설정
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.apiUrl = config.apiUrl || 'https://api.github.com';
    
    // [advice from AI] GitHub Actions 기능 설정
    this.addCapability(BasePipelineProvider.CAPABILITIES.ARTIFACTS);
    this.addCapability(BasePipelineProvider.CAPABILITIES.WEBHOOKS);
    this.addCapability(BasePipelineProvider.CAPABILITIES.ENVIRONMENT_VARIABLES);
    this.addCapability(BasePipelineProvider.CAPABILITIES.BRANCH_PIPELINES);
    this.addCapability(BasePipelineProvider.CAPABILITIES.TEMPLATES);
    this.addCapability(BasePipelineProvider.CAPABILITIES.LOG_STREAMING);
    this.addCapability(BasePipelineProvider.CAPABILITIES.STATISTICS);
    this.addCapability(BasePipelineProvider.CAPABILITIES.PARALLEL_EXECUTION);
    this.addCapability(BasePipelineProvider.CAPABILITIES.MATRIX_BUILDS);
    
    // [advice from AI] 메타데이터 설정
    this.setMetadata({
      version: '1.0.0',
      description: 'GitHub Actions CI/CD Pipeline Provider',
      author: 'Timbel Platform',
      supportedFeatures: [
        'Workflow Automation',
        'Matrix Builds',
        'Container Support',
        'Marketplace Actions',
        'Environment Protection',
        'Secrets Management'
      ]
    });

    // [advice from AI] HTTP 클라이언트 설정
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Timbel-CICD-Operator/1.0'
      },
      timeout: 30000
    });
  }

  // [advice from AI] 필수 설정 필드
  getRequiredConfigFields() {
    return ['token', 'owner', 'repo'];
  }

  // [advice from AI] GitHub 연결
  async connect() {
    try {
      systemLogger.info(`GitHub Actions 프로바이더 연결 시도: ${this.owner}/${this.repo}`);
      
      // Repository 접근 권한 확인
      const response = await this.httpClient.get(`/repos/${this.owner}/${this.repo}`);
      
      if (response.status === 200) {
        this.isConnected = true;
        systemLogger.info(`GitHub Actions 연결 성공: ${response.data.full_name}`);
        
        this.emit('provider_connected', {
          provider: this.name,
          repository: response.data.full_name,
          private: response.data.private,
          permissions: response.data.permissions
        });
        
        return true;
      }
      
    } catch (error) {
      this.isConnected = false;
      systemLogger.error(`GitHub Actions 연결 실패: ${error.message}`);
      this.emitError(error, { action: 'connect' });
      throw error;
    }
  }

  // [advice from AI] 연결 테스트
  async testConnection() {
    try {
      const response = await this.httpClient.get(`/repos/${this.owner}/${this.repo}`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // [advice from AI] 워크플로우 생성
  async createPipeline(pipelineConfig) {
    try {
      const {
        name,
        workflowFile = '.github/workflows/ci.yml',
        description = '',
        triggers = ['push', 'pull_request'],
        jobs = {}
      } = pipelineConfig;

      // GitHub Actions 워크플로우 YAML 생성
      const workflowContent = this.generateWorkflowYAML({
        name,
        triggers,
        jobs,
        description
      });

      // 워크플로우 파일을 repository에 추가
      const response = await this.httpClient.put(
        `/repos/${this.owner}/${this.repo}/contents/${workflowFile}`,
        {
          message: `Add ${name} workflow`,
          content: Buffer.from(workflowContent).toString('base64'),
          committer: {
            name: 'Timbel CI/CD Operator',
            email: 'cicd@timbel.net'
          }
        }
      );

      if (response.status === 201) {
        systemLogger.info(`GitHub Actions 워크플로우 생성 완료: ${name}`);
        
        this.emitPipelineEvent('pipeline_created', name, {
          workflowFile,
          sha: response.data.content.sha
        });

        return {
          pipelineId: workflowFile,
          name,
          workflowFile,
          sha: response.data.content.sha,
          status: 'created'
        };
      }

    } catch (error) {
      systemLogger.error(`GitHub Actions 워크플로우 생성 실패: ${error.message}`);
      this.emitError(error, { action: 'createPipeline', pipelineConfig });
      throw error;
    }
  }

  // [advice from AI] 워크플로우 실행
  async executePipeline(pipelineId, parameters = {}) {
    try {
      systemLogger.info(`GitHub Actions 워크플로우 실행: ${pipelineId}`);

      // workflow_dispatch 이벤트로 워크플로우 트리거
      const workflowFile = pipelineId.replace('.github/workflows/', '').replace('.yml', '');
      
      const response = await this.httpClient.post(
        `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowFile}.yml/dispatches`,
        {
          ref: parameters.ref || 'main',
          inputs: parameters.inputs || {}
        }
      );

      if (response.status === 204) {
        // 최근 실행된 워크플로우 조회
        const runsResponse = await this.httpClient.get(
          `/repos/${this.owner}/${this.repo}/actions/workflows/${workflowFile}.yml/runs`,
          { params: { per_page: 1 } }
        );

        const latestRun = runsResponse.data.workflow_runs[0];
        const executionId = `${workflowFile}-${latestRun.id}`;

        this.emitPipelineEvent(BasePipelineProvider.EVENT_TYPES.PIPELINE_STARTED, executionId, {
          workflowId: latestRun.id,
          runNumber: latestRun.run_number,
          parameters
        });

        return {
          pipelineId: executionId,
          workflowId: latestRun.id,
          runNumber: latestRun.run_number,
          status: this.mapGitHubStatus(latestRun.status, latestRun.conclusion),
          htmlUrl: latestRun.html_url
        };
      }

    } catch (error) {
      systemLogger.error(`GitHub Actions 워크플로우 실행 실패: ${error.message}`);
      this.emitError(error, { action: 'executePipeline', pipelineId, parameters });
      throw error;
    }
  }

  // [advice from AI] 워크플로우 상태 조회
  async getPipelineStatus(pipelineId) {
    try {
      const [workflowFile, runId] = pipelineId.split('-');
      
      const response = await this.httpClient.get(
        `/repos/${this.owner}/${this.repo}/actions/runs/${runId}`
      );

      const run = response.data;
      const status = this.mapGitHubStatus(run.status, run.conclusion);

      // 작업(Jobs) 정보 조회
      const jobsResponse = await this.httpClient.get(
        `/repos/${this.owner}/${this.repo}/actions/runs/${runId}/jobs`
      );

      return {
        pipelineId,
        status,
        workflowName: run.name,
        runNumber: run.run_number,
        event: run.event,
        branch: run.head_branch,
        commit: run.head_sha,
        actor: run.actor?.login,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        runStartedAt: run.run_started_at,
        htmlUrl: run.html_url,
        jobs: jobsResponse.data.jobs.map(job => ({
          id: job.id,
          name: job.name,
          status: this.mapGitHubStatus(job.status, job.conclusion),
          startedAt: job.started_at,
          completedAt: job.completed_at,
          htmlUrl: job.html_url,
          steps: job.steps?.map(step => ({
            name: step.name,
            status: this.mapGitHubStatus(step.status, step.conclusion),
            number: step.number,
            startedAt: step.started_at,
            completedAt: step.completed_at
          })) || []
        }))
      };

    } catch (error) {
      systemLogger.error(`GitHub Actions 워크플로우 상태 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 워크플로우 로그 조회
  async getPipelineLogs(pipelineId, options = {}) {
    try {
      const [workflowFile, runId] = pipelineId.split('-');
      const { jobId, stepNumber } = options;

      let endpoint;
      if (jobId && stepNumber) {
        // 특정 스텝 로그
        endpoint = `/repos/${this.owner}/${this.repo}/actions/jobs/${jobId}/logs`;
      } else if (jobId) {
        // 특정 작업 로그
        endpoint = `/repos/${this.owner}/${this.repo}/actions/jobs/${jobId}/logs`;
      } else {
        // 전체 워크플로우 로그
        endpoint = `/repos/${this.owner}/${this.repo}/actions/runs/${runId}/logs`;
      }

      const response = await this.httpClient.get(endpoint, {
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
      });

      return {
        logs: response.data,
        hasMore: false,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      systemLogger.error(`GitHub Actions 워크플로우 로그 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 워크플로우 중단
  async stopPipeline(pipelineId) {
    try {
      const [workflowFile, runId] = pipelineId.split('-');
      
      const response = await this.httpClient.post(
        `/repos/${this.owner}/${this.repo}/actions/runs/${runId}/cancel`
      );

      if (response.status === 202) {
        this.emitPipelineEvent(BasePipelineProvider.EVENT_TYPES.PIPELINE_CANCELLED, pipelineId);
        return { status: BasePipelineProvider.PIPELINE_STATUS.CANCELLED };
      }

    } catch (error) {
      systemLogger.error(`GitHub Actions 워크플로우 중단 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 워크플로우 삭제
  async deletePipeline(pipelineId) {
    try {
      // GitHub Actions에서는 워크플로우 파일 삭제
      const response = await this.httpClient.delete(
        `/repos/${this.owner}/${this.repo}/contents/${pipelineId}`,
        {
          message: `Remove ${pipelineId} workflow`,
          committer: {
            name: 'Timbel CI/CD Operator',
            email: 'cicd@timbel.net'
          }
        }
      );

      if (response.status === 200) {
        systemLogger.info(`GitHub Actions 워크플로우 삭제 완료: ${pipelineId}`);
        return { status: 'deleted' };
      }

    } catch (error) {
      systemLogger.error(`GitHub Actions 워크플로우 삭제 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 아티팩트 조회
  async getArtifacts(pipelineId) {
    try {
      const [workflowFile, runId] = pipelineId.split('-');
      
      const response = await this.httpClient.get(
        `/repos/${this.owner}/${this.repo}/actions/runs/${runId}/artifacts`
      );

      const artifacts = response.data.artifacts || [];
      
      return artifacts.map(artifact => ({
        id: artifact.id,
        name: artifact.name,
        sizeInBytes: artifact.size_in_bytes,
        createdAt: artifact.created_at,
        expiresAt: artifact.expires_at,
        downloadUrl: artifact.archive_download_url
      }));

    } catch (error) {
      systemLogger.error(`GitHub Actions 아티팩트 조회 실패: ${error.message}`);
      return [];
    }
  }

  // [advice from AI] 웹훅 설정
  async setupWebhook(repositoryUrl, webhookConfig) {
    try {
      const { events = ['push', 'pull_request'], secret } = webhookConfig;
      
      // GitHub webhook URL 생성
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/api/github/webhooks`;
      
      const response = await this.httpClient.post(
        `/repos/${this.owner}/${this.repo}/hooks`,
        {
          name: 'web',
          active: true,
          events,
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: secret,
            insecure_ssl: '0'
          }
        }
      );

      return {
        id: response.data.id,
        webhookUrl,
        events,
        active: response.data.active
      };

    } catch (error) {
      systemLogger.error(`GitHub Actions 웹훅 설정 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 환경 변수 설정 (Secrets)
  async setEnvironmentVariables(pipelineId, variables) {
    try {
      // GitHub Repository Secrets 설정
      const results = [];
      
      for (const [key, value] of Object.entries(variables)) {
        try {
          await this.httpClient.put(
            `/repos/${this.owner}/${this.repo}/actions/secrets/${key}`,
            {
              encrypted_value: this.encryptSecret(value),
              key_id: await this.getPublicKeyId()
            }
          );
          results.push({ key, status: 'success' });
        } catch (error) {
          results.push({ key, status: 'failed', error: error.message });
        }
      }

      return results.every(r => r.status === 'success');

    } catch (error) {
      systemLogger.error(`GitHub Actions 환경 변수 설정 실패: ${error.message}`);
      return false;
    }
  }

  // [advice from AI] 프로바이더별 통계
  async getProviderStats(timeRange) {
    try {
      const since = this.getTimeRangeCutoff(timeRange);
      
      const response = await this.httpClient.get(
        `/repos/${this.owner}/${this.repo}/actions/runs`,
        {
          params: {
            per_page: 100,
            created: `>=${since}`
          }
        }
      );
      
      const runs = response.data.workflow_runs || [];
      
      let total = runs.length, success = 0, failed = 0, running = 0;

      for (const run of runs) {
        if (run.status === 'in_progress' || run.status === 'queued') {
          running++;
        } else if (run.conclusion === 'success') {
          success++;
        } else if (run.conclusion === 'failure' || run.conclusion === 'cancelled') {
          failed++;
        }
      }

      return { total, success, failed, running };

    } catch (error) {
      systemLogger.error(`GitHub Actions 통계 조회 실패: ${error.message}`);
      return { total: 0, success: 0, failed: 0, running: 0 };
    }
  }

  // [advice from AI] 상세 헬스 정보
  async getHealthDetails() {
    try {
      const [repoResponse, workflowsResponse] = await Promise.all([
        this.httpClient.get(`/repos/${this.owner}/${this.repo}`),
        this.httpClient.get(`/repos/${this.owner}/${this.repo}/actions/workflows`)
      ]);
      
      return {
        connection: this.isConnected,
        repository: repoResponse.data.full_name,
        private: repoResponse.data.private,
        workflows: workflowsResponse.data.total_count,
        permissions: repoResponse.data.permissions,
        capabilities: Array.from(this.capabilities).length
      };

    } catch (error) {
      return {
        connection: this.isConnected,
        error: error.message,
        capabilities: Array.from(this.capabilities).length
      };
    }
  }

  // [advice from AI] 유틸리티 메서드들

  mapGitHubStatus(status, conclusion) {
    if (status === 'in_progress' || status === 'queued') {
      return BasePipelineProvider.PIPELINE_STATUS.RUNNING;
    }
    
    switch (conclusion) {
      case 'success':
        return BasePipelineProvider.PIPELINE_STATUS.SUCCESS;
      case 'failure':
      case 'timed_out':
        return BasePipelineProvider.PIPELINE_STATUS.FAILED;
      case 'cancelled':
        return BasePipelineProvider.PIPELINE_STATUS.CANCELLED;
      default:
        return BasePipelineProvider.PIPELINE_STATUS.QUEUED;
    }
  }

  generateWorkflowYAML({ name, triggers, jobs, description }) {
    const triggerSection = Array.isArray(triggers) ? triggers : [triggers];
    const triggerYAML = triggerSection.map(t => `  - ${t}`).join('\n');
    
    return `name: ${name}

# ${description}

on:
${triggerYAML}

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
      
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: dist/
`;
  }

  async getPublicKeyId() {
    try {
      const response = await this.httpClient.get(`/repos/${this.owner}/${this.repo}/actions/secrets/public-key`);
      return response.data.key_id;
    } catch (error) {
      throw new Error('Failed to get public key for secrets encryption');
    }
  }

  encryptSecret(secret) {
    // 실제 구현에서는 libsodium을 사용하여 암호화
    // 여기서는 간단히 base64 인코딩만 수행
    return Buffer.from(secret).toString('base64');
  }

  getTimeRangeCutoff(timeRange) {
    const now = new Date();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(now.getTime() - (ranges[timeRange] || ranges['24h']));
    return cutoff.toISOString();
  }
}

module.exports = GitHubActionsProvider;
