// [advice from AI] Jenkins 파이프라인 프로바이더
// Jenkins API를 통한 파이프라인 관리 및 실행

const BasePipelineProvider = require('../BasePipelineProvider');
const axios = require('axios');
const systemLogger = require('../../../middleware/systemLogger');

class JenkinsProvider extends BasePipelineProvider {
  constructor(name, config) {
    super(name, config);
    
    // [advice from AI] Jenkins 특화 설정
    this.jenkinsUrl = config.serverUrl;
    this.username = config.username;
    this.apiToken = config.apiToken;
    
    // [advice from AI] Jenkins 기능 설정
    this.addCapability(BasePipelineProvider.CAPABILITIES.ARTIFACTS);
    this.addCapability(BasePipelineProvider.CAPABILITIES.WEBHOOKS);
    this.addCapability(BasePipelineProvider.CAPABILITIES.ENVIRONMENT_VARIABLES);
    this.addCapability(BasePipelineProvider.CAPABILITIES.BRANCH_PIPELINES);
    this.addCapability(BasePipelineProvider.CAPABILITIES.TEMPLATES);
    this.addCapability(BasePipelineProvider.CAPABILITIES.LOG_STREAMING);
    this.addCapability(BasePipelineProvider.CAPABILITIES.STATISTICS);
    this.addCapability(BasePipelineProvider.CAPABILITIES.PARALLEL_EXECUTION);
    
    // [advice from AI] 메타데이터 설정
    this.setMetadata({
      version: '2.0.0',
      description: 'Jenkins CI/CD Pipeline Provider',
      author: 'Timbel Platform',
      supportedFeatures: [
        'Build Pipelines',
        'Test Automation', 
        'Artifact Management',
        'Multi-branch Pipelines',
        'Parallel Execution',
        'Pipeline as Code'
      ]
    });

    // [advice from AI] HTTP 클라이언트 설정
    this.httpClient = axios.create({
      baseURL: this.jenkinsUrl,
      auth: {
        username: this.username,
        password: this.apiToken
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Timbel-CICD-Operator/1.0'
      },
      timeout: 30000
    });
  }

  // [advice from AI] 필수 설정 필드
  getRequiredConfigFields() {
    return ['serverUrl', 'username', 'apiToken'];
  }

  // [advice from AI] Jenkins 연결
  async connect() {
    try {
      systemLogger.info(`Jenkins 프로바이더 연결 시도: ${this.jenkinsUrl}`);
      
      // Jenkins 서버 상태 확인
      const response = await this.httpClient.get('/api/json');
      
      if (response.status === 200) {
        this.isConnected = true;
        systemLogger.info(`Jenkins 연결 성공: ${response.data.version}`);
        
        this.emit('provider_connected', {
          provider: this.name,
          version: response.data.version,
          url: this.jenkinsUrl
        });
        
        return true;
      }
      
    } catch (error) {
      this.isConnected = false;
      systemLogger.error(`Jenkins 연결 실패: ${error.message}`);
      this.emitError(error, { action: 'connect' });
      throw error;
    }
  }

  // [advice from AI] 연결 테스트
  async testConnection() {
    try {
      const response = await this.httpClient.get('/api/json');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // [advice from AI] 파이프라인 생성
  async createPipeline(pipelineConfig) {
    try {
      const {
        name,
        repository,
        branch = 'main',
        jenkinsfile = 'Jenkinsfile',
        description = '',
        parameters = []
      } = pipelineConfig;

      // Multibranch Pipeline 생성
      const config = this.generateMultibranchPipelineConfig({
        repository,
        jenkinsfile,
        description,
        parameters
      });

      const response = await this.httpClient.post(
        `/createItem?name=${encodeURIComponent(name)}&mode=org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject`,
        config,
        {
          headers: { 'Content-Type': 'application/xml' }
        }
      );

      if (response.status === 200) {
        systemLogger.info(`Jenkins 파이프라인 생성 완료: ${name}`);
        
        this.emitPipelineEvent('pipeline_created', name, {
          repository,
          branch,
          jenkinsfile
        });

        return {
          pipelineId: name,
          name,
          repository,
          branch,
          status: 'created'
        };
      }

    } catch (error) {
      systemLogger.error(`Jenkins 파이프라인 생성 실패: ${error.message}`);
      this.emitError(error, { action: 'createPipeline', pipelineConfig });
      throw error;
    }
  }

  // [advice from AI] 파이프라인 실행
  async executePipeline(pipelineId, parameters = {}) {
    try {
      systemLogger.info(`Jenkins 파이프라인 실행: ${pipelineId}`);

      // 파라미터가 있는 경우와 없는 경우 구분
      const hasParameters = Object.keys(parameters).length > 0;
      const endpoint = hasParameters 
        ? `/job/${encodeURIComponent(pipelineId)}/buildWithParameters`
        : `/job/${encodeURIComponent(pipelineId)}/build`;

      const response = await this.httpClient.post(endpoint, hasParameters ? parameters : null);

      if (response.status === 201) {
        // Location 헤더에서 빌드 번호 추출
        const location = response.headers.location;
        const buildNumber = await this.getBuildNumberFromQueue(location);

        const executionId = `${pipelineId}-${buildNumber}`;

        this.emitPipelineEvent(BasePipelineProvider.EVENT_TYPES.PIPELINE_STARTED, executionId, {
          pipelineId,
          buildNumber,
          parameters
        });

        return {
          pipelineId: executionId,
          buildNumber,
          status: BasePipelineProvider.PIPELINE_STATUS.QUEUED,
          queueUrl: location
        };
      }

    } catch (error) {
      systemLogger.error(`Jenkins 파이프라인 실행 실패: ${error.message}`);
      this.emitError(error, { action: 'executePipeline', pipelineId, parameters });
      throw error;
    }
  }

  // [advice from AI] 파이프라인 상태 조회
  async getPipelineStatus(pipelineId) {
    try {
      const [jobName, buildNumber] = pipelineId.split('-');
      
      const response = await this.httpClient.get(
        `/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`
      );

      const build = response.data;
      const status = this.mapJenkinsStatus(build.result, build.building);

      return {
        pipelineId,
        status,
        building: build.building,
        result: build.result,
        duration: build.duration,
        estimatedDuration: build.estimatedDuration,
        timestamp: build.timestamp,
        url: build.url,
        stages: await this.getPipelineStages(jobName, buildNumber)
      };

    } catch (error) {
      systemLogger.error(`Jenkins 파이프라인 상태 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 파이프라인 로그 조회
  async getPipelineLogs(pipelineId, options = {}) {
    try {
      const [jobName, buildNumber] = pipelineId.split('-');
      const { start = 0, html = false } = options;

      const endpoint = html 
        ? `/job/${encodeURIComponent(jobName)}/${buildNumber}/logText/progressiveHtml`
        : `/job/${encodeURIComponent(jobName)}/${buildNumber}/logText/progressiveText`;

      const response = await this.httpClient.get(endpoint, {
        params: { start }
      });

      return {
        logs: response.data,
        hasMore: response.headers['x-more-data'] === 'true',
        nextStart: parseInt(response.headers['x-text-size'] || start),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      systemLogger.error(`Jenkins 파이프라인 로그 조회 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 파이프라인 중단
  async stopPipeline(pipelineId) {
    try {
      const [jobName, buildNumber] = pipelineId.split('-');
      
      const response = await this.httpClient.post(
        `/job/${encodeURIComponent(jobName)}/${buildNumber}/stop`
      );

      if (response.status === 200) {
        this.emitPipelineEvent(BasePipelineProvider.EVENT_TYPES.PIPELINE_CANCELLED, pipelineId);
        return { status: BasePipelineProvider.PIPELINE_STATUS.CANCELLED };
      }

    } catch (error) {
      systemLogger.error(`Jenkins 파이프라인 중단 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 파이프라인 삭제
  async deletePipeline(pipelineId) {
    try {
      const response = await this.httpClient.post(
        `/job/${encodeURIComponent(pipelineId)}/doDelete`
      );

      if (response.status === 200) {
        systemLogger.info(`Jenkins 파이프라인 삭제 완료: ${pipelineId}`);
        return { status: 'deleted' };
      }

    } catch (error) {
      systemLogger.error(`Jenkins 파이프라인 삭제 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 아티팩트 조회
  async getArtifacts(pipelineId) {
    try {
      const [jobName, buildNumber] = pipelineId.split('-');
      
      const response = await this.httpClient.get(
        `/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`
      );

      const artifacts = response.data.artifacts || [];
      
      return artifacts.map(artifact => ({
        fileName: artifact.fileName,
        displayPath: artifact.displayPath,
        relativePath: artifact.relativePath,
        size: artifact.size || 0,
        downloadUrl: `${this.jenkinsUrl}/job/${encodeURIComponent(jobName)}/${buildNumber}/artifact/${artifact.relativePath}`
      }));

    } catch (error) {
      systemLogger.error(`Jenkins 아티팩트 조회 실패: ${error.message}`);
      return [];
    }
  }

  // [advice from AI] 웹훅 설정
  async setupWebhook(repositoryUrl, webhookConfig) {
    try {
      const { events = ['push'], secret } = webhookConfig;
      
      // Jenkins webhook URL 생성
      const webhookUrl = `${this.jenkinsUrl}/github-webhook/`;
      
      return {
        webhookUrl,
        events,
        secret,
        contentType: 'application/json'
      };

    } catch (error) {
      systemLogger.error(`Jenkins 웹훅 설정 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 환경 변수 설정
  async setEnvironmentVariables(pipelineId, variables) {
    try {
      // Jenkins에서는 파이프라인 실행 시 파라미터로 전달
      // 또는 Global Properties에서 설정
      
      const response = await this.httpClient.post(
        `/job/${encodeURIComponent(pipelineId)}/configure`,
        this.generateEnvironmentConfig(variables),
        {
          headers: { 'Content-Type': 'application/xml' }
        }
      );

      return response.status === 200;

    } catch (error) {
      systemLogger.error(`Jenkins 환경 변수 설정 실패: ${error.message}`);
      return false;
    }
  }

  // [advice from AI] 브랜치별 파이프라인 설정
  async configureBranchPipeline(repositoryUrl, branch, config) {
    try {
      // Multibranch Pipeline에서는 자동으로 브랜치별 파이프라인 생성
      const pipelineName = `${config.name}-${branch}`;
      
      return await this.createPipeline({
        ...config,
        name: pipelineName,
        repository: repositoryUrl,
        branch
      });

    } catch (error) {
      systemLogger.error(`Jenkins 브랜치 파이프라인 설정 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 프로바이더별 통계
  async getProviderStats(timeRange) {
    try {
      const response = await this.httpClient.get('/api/json?tree=jobs[name,builds[number,result,timestamp,duration]]');
      
      const jobs = response.data.jobs || [];
      const cutoffTime = this.getTimeRangeCutoff(timeRange);
      
      let total = 0, success = 0, failed = 0, running = 0;

      for (const job of jobs) {
        for (const build of job.builds || []) {
          if (build.timestamp < cutoffTime) continue;
          
          total++;
          
          if (!build.result) {
            running++;
          } else if (build.result === 'SUCCESS') {
            success++;
          } else {
            failed++;
          }
        }
      }

      return { total, success, failed, running };

    } catch (error) {
      systemLogger.error(`Jenkins 통계 조회 실패: ${error.message}`);
      return { total: 0, success: 0, failed: 0, running: 0 };
    }
  }

  // [advice from AI] 상세 헬스 정보
  async getHealthDetails() {
    try {
      const response = await this.httpClient.get('/api/json');
      const systemInfo = await this.httpClient.get('/systemInfo');
      
      return {
        connection: this.isConnected,
        version: response.data.version,
        nodeDescription: response.data.nodeDescription,
        numExecutors: response.data.numExecutors,
        mode: response.data.mode,
        jobs: response.data.jobs?.length || 0,
        quietingDown: response.data.quietingDown,
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

  mapJenkinsStatus(result, building) {
    if (building) {
      return BasePipelineProvider.PIPELINE_STATUS.RUNNING;
    }
    
    switch (result) {
      case 'SUCCESS':
        return BasePipelineProvider.PIPELINE_STATUS.SUCCESS;
      case 'FAILURE':
      case 'UNSTABLE':
        return BasePipelineProvider.PIPELINE_STATUS.FAILED;
      case 'ABORTED':
        return BasePipelineProvider.PIPELINE_STATUS.CANCELLED;
      case null:
        return BasePipelineProvider.PIPELINE_STATUS.QUEUED;
      default:
        return BasePipelineProvider.PIPELINE_STATUS.QUEUED;
    }
  }

  async getBuildNumberFromQueue(queueUrl) {
    try {
      // 큐 URL에서 빌드 정보 추출
      const queueId = queueUrl.match(/queue\/item\/(\d+)/)?.[1];
      if (!queueId) return null;

      // 큐 아이템 상태 확인
      const response = await this.httpClient.get(`/queue/item/${queueId}/api/json`);
      
      if (response.data.executable) {
        return response.data.executable.number;
      }
      
      return null;
    } catch (error) {
      systemLogger.warn(`Jenkins 빌드 번호 추출 실패: ${error.message}`);
      return Date.now(); // 임시 빌드 번호
    }
  }

  async getPipelineStages(jobName, buildNumber) {
    try {
      const response = await this.httpClient.get(
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
      return [];
    }
  }

  generateMultibranchPipelineConfig({ repository, jenkinsfile, description, parameters }) {
    return `<?xml version='1.1' encoding='UTF-8'?>
<org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject plugin="workflow-multibranch">
  <actions/>
  <description>${description}</description>
  <properties>
    <org.jenkinsci.plugins.pipeline.modeldefinition.config.FolderConfig plugin="pipeline-model-definition">
      <dockerLabel></dockerLabel>
      <registry plugin="docker-commons"/>
    </org.jenkinsci.plugins.pipeline.modeldefinition.config.FolderConfig>
  </properties>
  <folderViews class="jenkins.branch.MultiBranchProjectViewHolder" plugin="branch-api">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
  </folderViews>
  <healthMetrics>
    <com.cloudbees.hudson.plugins.folder.health.WorstChildHealthMetric plugin="cloudbees-folder">
      <nonRecursive>false</nonRecursive>
    </com.cloudbees.hudson.plugins.folder.health.WorstChildHealthMetric>
  </healthMetrics>
  <icon class="jenkins.branch.MetadataActionFolderIcon" plugin="branch-api">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
  </icon>
  <orphanedItemStrategy class="com.cloudbees.hudson.plugins.folder.computed.DefaultOrphanedItemStrategy" plugin="cloudbees-folder">
    <pruneDeadBranches>true</pruneDeadBranches>
    <daysToKeep>-1</daysToKeep>
    <numToKeep>-1</numToKeep>
  </orphanedItemStrategy>
  <triggers>
    <com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger plugin="cloudbees-folder">
      <spec>* * * * *</spec>
      <interval>60000</interval>
    </com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger>
  </triggers>
  <disabled>false</disabled>
  <sources class="jenkins.branch.MultiBranchProject$BranchSourceList" plugin="branch-api">
    <data>
      <jenkins.plugins.git.GitSCMSource plugin="git">
        <id>git-source</id>
        <remote>${repository}</remote>
        <credentialsId></credentialsId>
        <traits>
          <jenkins.plugins.git.traits.BranchDiscoveryTrait/>
        </traits>
      </jenkins.plugins.git.GitSCMSource>
    </data>
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
  </sources>
  <factory class="org.jenkinsci.plugins.workflow.multibranch.WorkflowBranchProjectFactory">
    <owner class="org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject" reference="../.."/>
    <scriptPath>${jenkinsfile}</scriptPath>
  </factory>
</org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject>`;
  }

  generateEnvironmentConfig(variables) {
    const envVars = Object.entries(variables).map(([key, value]) => 
      `<hudson.EnvVars_-VarEntry><key>${key}</key><value>${value}</value></hudson.EnvVars_-VarEntry>`
    ).join('');

    return `<hudson.EnvVars plugin="ant">${envVars}</hudson.EnvVars>`;
  }

  getTimeRangeCutoff(timeRange) {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    return now - (ranges[timeRange] || ranges['24h']);
  }
}

module.exports = JenkinsProvider;
