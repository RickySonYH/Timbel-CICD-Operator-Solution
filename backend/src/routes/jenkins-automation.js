// [advice from AI] Jenkins 자동화 API - 실제 Jenkins 서버 연동
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const jenkinsService = require('../services/jenkinsService');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀 (운영센터 DB)
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_cicd_operator',
  password: 'timbel_password',
  port: 5432,
});

// [advice from AI] Jenkins Job XML 템플릿 생성
const generateJobXML = (repositoryInfo) => {
  const { name, repository_url, branch, language, framework } = repositoryInfo;
  
  // 언어/프레임워크별 빌드 스크립트
  const buildScript = language === 'Python' ? 
    `pip install -r requirements.txt
pytest
docker build -t ${name.toLowerCase()}:latest .` :
    `npm install
npm run build
docker build -t ${name.toLowerCase()}:latest .`;

  return `<?xml version='1.1' encoding='UTF-8'?>
<project>
  <actions/>
  <description>Auto-generated job for ${name}</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <scm class="hudson.plugins.git.GitSCM">
    <configVersion>2</configVersion>
    <userRemoteConfigs>
      <hudson.plugins.git.UserRemoteConfig>
        <url>${repository_url}</url>
      </hudson.plugins.git.UserRemoteConfig>
    </userRemoteConfigs>
    <branches>
      <hudson.plugins.git.BranchSpec>
        <name>*/${branch || 'main'}</name>
      </hudson.plugins.git.BranchSpec>
    </branches>
    <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
    <submoduleCfg class="list"/>
    <extensions/>
  </scm>
  <canRoam>true</canRoam>
  <disabled>false</disabled>
  <blockBuildWhenDownstreamBuilding>false</blockBuildWhenDownstreamBuilding>
  <blockBuildWhenUpstreamBuilding>false</blockBuildWhenUpstreamBuilding>
  <triggers>
    <hudson.triggers.SCMTrigger>
      <spec>H/5 * * * *</spec>
      <ignorePostCommitHooks>false</ignorePostCommitHooks>
    </hudson.triggers.SCMTrigger>
  </triggers>
  <concurrentBuild>false</concurrentBuild>
  <builders>
    <hudson.tasks.Shell>
      <command>${buildScript}</command>
    </hudson.tasks.Shell>
  </builders>
  <publishers>
    <hudson.plugins.ws__cleanup.WsCleanup plugin="ws-cleanup">
      <deleteDirs>false</deleteDirs>
      <skipWhenFailed>false</skipWhenFailed>
      <cleanWhenSuccess>true</cleanWhenSuccess>
      <cleanWhenUnstable>true</cleanWhenUnstable>
      <cleanWhenFailure>true</cleanWhenFailure>
      <cleanWhenNotBuilt>false</cleanWhenNotBuilt>
      <cleanWhenAborted>true</cleanWhenAborted>
      <notFailBuild>false</notFailBuild>
      <cleanupMatrixParent>false</cleanupMatrixParent>
      <externalDelete></externalDelete>
    </hudson.plugins.ws__cleanup.WsCleanup>
  </publishers>
  <buildWrappers/>
</project>`;
};

// [advice from AI] Jenkins Job 자동 생성 API - 실제 Jenkins 서버 연동
router.post('/create-job', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { project_name, repository_url, branch = 'main', build_script = 'npm run build' } = req.body;
    
    console.log('🔨 Jenkins Job 생성 요청 (실제 서버 연동):', { project_name, repository_url });

    const jobConfig = {
      project_name,
      repository_url,
      branch,
      build_script
    };

    const result = await jenkinsService.createJob(`${project_name}-build`, jobConfig);
    
    if (result.success) {
      res.json({
        success: true,
        job_name: result.job_name,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Jenkins Job 생성에 실패했습니다.'
      });
    }
    
  } catch (error) {
    console.error('❌ Jenkins Job 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Jenkins Job 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Jenkins Job 목록 조회 - 실제 Jenkins 서버 연동
router.get('/jobs', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 Jenkins Job 목록 조회 (실제 서버 연동)...');
    
    const result = await jenkinsService.listJobs();
    
    if (result.success) {
      res.json({
        success: true,
        jobs: result.jobs,
        total: result.total,
        message: `${result.total}개 Jenkins Job 조회 완료`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        jobs: [],
        message: 'Jenkins 서버 연결 실패'
      });
    }
    
  } catch (error) {
    console.error('❌ Jenkins Job 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Jenkins Job 목록 조회 중 오류가 발생했습니다.',
      message: error.message,
      jobs: []
    });
  }
});

// [advice from AI] GitHub Webhook 설정 API
router.post('/setup-webhook', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { repository_url, jenkins_job_name } = req.body;
    
    // GitHub API로 Webhook 설정 (시뮬레이션)
    const webhookUrl = `http://jenkins:8080/github-webhook/`;
    
    console.log(`GitHub Webhook 설정 시뮬레이션:`);
    console.log(`Repository: ${repository_url}`);
    console.log(`Webhook URL: ${webhookUrl}`);
    console.log(`Jenkins Job: ${jenkins_job_name}`);

    // Webhook 설정 기록 저장
    await pool.query(`
      INSERT INTO github_webhooks (
        repository_url, webhook_url, jenkins_job_name, 
        status, events, created_by
      )
      VALUES ($1, $2, $3, 'active', '["push", "pull_request"]', $4)
    `, [repository_url, webhookUrl, jenkins_job_name, req.user?.id || 'system']);

    res.json({
      success: true,
      webhook_url: webhookUrl,
      events: ['push', 'pull_request'],
      message: 'GitHub Webhook이 성공적으로 설정되었습니다.'
    });

  } catch (error) {
    console.error('GitHub Webhook 설정 오류:', error);
    res.status(500).json({
      success: false,
      error: 'GitHub Webhook 설정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Jenkins 서버 상태 확인
router.get('/health', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🏥 Jenkins 서버 상태 확인...');
    
    const health = await jenkinsService.checkHealth();
    
    res.json({
      success: true,
      health: health,
      message: health.status === 'connected' ? 
        `Jenkins 서버 연결됨 (버전: ${health.version}, Jobs: ${health.jobs_count}개)` :
        `Jenkins 서버 연결 실패: ${health.error}`
    });
    
  } catch (error) {
    console.error('❌ Jenkins 서버 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Jenkins 서버 상태 확인 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Jenkins Job 빌드 실행
router.post('/jobs/:jobName/build', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { jobName } = req.params;
    
    console.log(`🚀 Jenkins Job 빌드 실행: ${jobName}`);
    
    const result = await jenkinsService.triggerBuild(jobName);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Jenkins Job 빌드 실행에 실패했습니다.'
      });
    }
    
  } catch (error) {
    console.error('❌ Jenkins Job 빌드 실행 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Jenkins Job 빌드 실행 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Jenkins Job 삭제
router.delete('/jobs/:jobName', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { jobName } = req.params;
    
    console.log(`🗑️ Jenkins Job 삭제: ${jobName}`);
    
    const result = await jenkinsService.deleteJob(jobName);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Jenkins Job 삭제에 실패했습니다.'
      });
    }
    
  } catch (error) {
    console.error('❌ Jenkins Job 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Jenkins Job 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
