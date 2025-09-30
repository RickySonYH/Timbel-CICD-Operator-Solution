// [advice from AI] CI/CD 빌드 과정 실시간 모니터링 API
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyToken, requireRole } = require('../middleware/jwtAuth');

// Jenkins 설정
const JENKINS_URL = process.env.JENKINS_URL || 'http://localhost:8080';
const JENKINS_USER = process.env.JENKINS_USER || 'admin';
const JENKINS_TOKEN = process.env.JENKINS_TOKEN || 'admin123!';

// Nexus 설정
const NEXUS_URL = process.env.NEXUS_URL || 'http://localhost:8081';

// Jenkins API 헬퍼 함수
const makeJenkinsRequest = async (endpoint, method = 'GET', data = null) => {
  try {
    const config = {
      method,
      url: `${JENKINS_URL}${endpoint}`,
      auth: {
        username: JENKINS_USER,
        password: JENKINS_TOKEN
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Jenkins API 오류 (${endpoint}):`, error.message);
    throw error;
  }
};

// 1. Jenkins 전체 상태 조회
router.get('/jenkins/status', verifyToken, async (req, res) => {
  try {
    const status = await makeJenkinsRequest('/api/json');
    
    res.json({
      success: true,
      data: {
        mode: status.mode,
        nodeDescription: status.nodeDescription,
        numExecutors: status.numExecutors,
        useCrumbs: status.useCrumbs,
        version: status.version,
        jobs: status.jobs?.length || 0,
        quietingDown: status.quietingDown,
        slaveAgentPort: status.slaveAgentPort
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Jenkins 상태 조회 실패',
      error: error.message
    });
  }
});

// 2. Jenkins Job 목록 조회
router.get('/jenkins/jobs', verifyToken, async (req, res) => {
  try {
    const data = await makeJenkinsRequest('/api/json');
    
    const jobs = data.jobs?.map(job => ({
      name: job.name,
      url: job.url,
      color: job.color,
      buildable: job.buildable,
      inQueue: job.inQueue,
      keepDependencies: job.keepDependencies,
      nextBuildNumber: job.nextBuildNumber,
      lastBuild: job.lastBuild,
      lastCompletedBuild: job.lastCompletedBuild,
      lastFailedBuild: job.lastFailedBuild,
      lastStableBuild: job.lastStableBuild,
      lastSuccessfulBuild: job.lastSuccessfulBuild,
      lastUnstableBuild: job.lastUnstableBuild,
      lastUnsuccessfulBuild: job.lastUnsuccessfulBuild
    })) || [];

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Jenkins Job 목록 조회 실패',
      error: error.message
    });
  }
});

// 3. 특정 Job의 빌드 히스토리 조회
router.get('/jenkins/jobs/:jobName/builds', verifyToken, async (req, res) => {
  try {
    const { jobName } = req.params;
    const { limit = 10 } = req.query;
    
    const data = await makeJenkinsRequest(`/job/${jobName}/api/json`);
    
    const builds = data.builds?.slice(0, parseInt(limit)).map(build => ({
      number: build.number,
      url: build.url
    })) || [];

    // 각 빌드의 상세 정보 조회
    const buildDetails = await Promise.all(
      builds.map(async (build) => {
        try {
          const buildData = await makeJenkinsRequest(`/job/${jobName}/${build.number}/api/json`);
          return {
            number: buildData.number,
            result: buildData.result,
            building: buildData.building,
            duration: buildData.duration,
            estimatedDuration: buildData.estimatedDuration,
            timestamp: buildData.timestamp,
            url: buildData.url,
            displayName: buildData.displayName,
            fullDisplayName: buildData.fullDisplayName,
            description: buildData.description,
            executor: buildData.executor,
            keepLog: buildData.keepLog,
            queueId: buildData.queueId
          };
        } catch (error) {
          return {
            number: build.number,
            error: '빌드 정보 조회 실패'
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        jobName,
        builds: buildDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Jenkins 빌드 히스토리 조회 실패',
      error: error.message
    });
  }
});

// 4. 특정 빌드의 실시간 로그 조회
router.get('/jenkins/jobs/:jobName/builds/:buildNumber/log', verifyToken, async (req, res) => {
  try {
    const { jobName, buildNumber } = req.params;
    const { start = 0 } = req.query;
    
    const logData = await makeJenkinsRequest(
      `/job/${jobName}/${buildNumber}/logText/progressiveText?start=${start}`
    );

    res.json({
      success: true,
      data: {
        jobName,
        buildNumber: parseInt(buildNumber),
        log: logData,
        hasMore: true // Jenkins에서 더 많은 로그가 있는지 확인하는 로직 추가 가능
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Jenkins 빌드 로그 조회 실패',
      error: error.message
    });
  }
});

// 5. Jenkins Job 빌드 트리거
router.post('/jenkins/jobs/:jobName/build', verifyToken, requireRole(['admin', 'po', 'pe']), async (req, res) => {
  try {
    const { jobName } = req.params;
    const { parameters = {} } = req.body;
    
    // 파라미터가 있는 경우와 없는 경우 구분
    let endpoint = `/job/${jobName}/build`;
    if (Object.keys(parameters).length > 0) {
      endpoint = `/job/${jobName}/buildWithParameters`;
    }

    await makeJenkinsRequest(endpoint, 'POST', parameters);

    res.json({
      success: true,
      message: `Jenkins Job '${jobName}' 빌드가 트리거되었습니다.`,
      data: {
        jobName,
        parameters
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Jenkins 빌드 트리거 실패',
      error: error.message
    });
  }
});

// 6. Nexus 상태 조회
router.get('/nexus/status', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${NEXUS_URL}/service/rest/v1/status`, {
      timeout: 5000
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Nexus 상태 조회 실패',
      error: error.message
    });
  }
});

// 7. Nexus Repository 목록 조회
router.get('/nexus/repositories', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${NEXUS_URL}/service/rest/v1/repositories`, {
      timeout: 10000
    });

    const repositories = response.data.map(repo => ({
      name: repo.name,
      format: repo.format,
      type: repo.type,
      url: repo.url,
      online: repo.online,
      storage: repo.storage,
      cleanup: repo.cleanup,
      proxy: repo.proxy,
      negativeCache: repo.negativeCache,
      httpClient: repo.httpClient,
      routingRule: repo.routingRule
    }));

    res.json({
      success: true,
      data: repositories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Nexus Repository 목록 조회 실패',
      error: error.message
    });
  }
});

// 8. 통합 CI/CD 파이프라인 상태 조회
router.get('/pipeline/status', verifyToken, async (req, res) => {
  try {
    // Jenkins 상태
    let jenkinsStatus = null;
    try {
      const jenkinsData = await makeJenkinsRequest('/api/json');
      jenkinsStatus = {
        online: true,
        mode: jenkinsData.mode,
        jobs: jenkinsData.jobs?.length || 0,
        version: jenkinsData.version
      };
    } catch (error) {
      jenkinsStatus = {
        online: false,
        error: error.message
      };
    }

    // Nexus 상태
    let nexusStatus = null;
    try {
      const nexusResponse = await axios.get(`${NEXUS_URL}/service/rest/v1/status`, {
        timeout: 5000
      });
      nexusStatus = {
        online: true,
        ...nexusResponse.data
      };
    } catch (error) {
      nexusStatus = {
        online: false,
        error: error.message
      };
    }

    res.json({
      success: true,
      data: {
        jenkins: jenkinsStatus,
        nexus: nexusStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '통합 파이프라인 상태 조회 실패',
      error: error.message
    });
  }
});

// 9. ECP-AI 프로젝트 전용 빌드 모니터링
router.get('/ecp-ai/build-status', verifyToken, async (req, res) => {
  try {
    const jobName = 'ecp-ai-local-test';
    
    // Job 존재 여부 확인
    let jobExists = false;
    let jobData = null;
    
    try {
      jobData = await makeJenkinsRequest(`/job/${jobName}/api/json`);
      jobExists = true;
    } catch (error) {
      jobExists = false;
    }

    if (!jobExists) {
      return res.json({
        success: true,
        data: {
          jobExists: false,
          message: 'ECP-AI 테스트 Job이 생성되지 않았습니다.'
        }
      });
    }

    // 최근 빌드 정보
    const lastBuild = jobData.lastBuild;
    let buildDetails = null;
    
    if (lastBuild) {
      try {
        buildDetails = await makeJenkinsRequest(`/job/${jobName}/${lastBuild.number}/api/json`);
      } catch (error) {
        buildDetails = { error: '빌드 정보 조회 실패' };
      }
    }

    res.json({
      success: true,
      data: {
        jobExists: true,
        jobName,
        lastBuild: buildDetails,
        nextBuildNumber: jobData.nextBuildNumber,
        inQueue: jobData.inQueue,
        buildable: jobData.buildable
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ECP-AI 빌드 상태 조회 실패',
      error: error.message
    });
  }
});

module.exports = router;
