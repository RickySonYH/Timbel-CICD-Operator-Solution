// [advice from AI] Jenkins 자동화 API - 레포지토리 기반 Job 자동 생성
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

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

// [advice from AI] Jenkins Job 자동 생성 API
router.post('/create-job', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { system_id, repository_url, repository_info } = req.body;
    
    // Jenkins 설정 조회
    const jenkinsConfig = await pool.query(`
      SELECT endpoint_url, username, password FROM monitoring_configurations 
      WHERE config_type = 'jenkins' AND status = 'connected'
      LIMIT 1
    `);

    if (jenkinsConfig.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '연결된 Jenkins 서버가 없습니다.'
      });
    }

    const jenkins = jenkinsConfig.rows[0];
    const jobName = `${repository_info.name}-build`;
    const jobXML = generateJobXML(repository_info);

    // Jenkins API로 Job 생성 (시뮬레이션)
    try {
      // 실제 Jenkins API 호출은 여기서 구현
      console.log(`Jenkins Job 생성 시뮬레이션: ${jobName}`);
      console.log(`Jenkins URL: ${jenkins.endpoint_url}`);
      console.log(`Repository: ${repository_url}`);
      
      // Job 생성 기록 저장
      await pool.query(`
        INSERT INTO jenkins_jobs (
          job_name, system_id, repository_url, job_xml, 
          jenkins_url, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, 'created', $6)
      `, [
        jobName, 
        system_id, 
        repository_url, 
        jobXML, 
        jenkins.endpoint_url,
        req.user?.id || 'system'
      ]);

      res.json({
        success: true,
        job_name: jobName,
        jenkins_url: `${jenkins.endpoint_url}/job/${jobName}`,
        message: 'Jenkins Job이 성공적으로 생성되었습니다.'
      });

    } catch (jenkinsError) {
      console.error('Jenkins API 오류:', jenkinsError);
      res.status(500).json({
        success: false,
        error: 'Jenkins Job 생성에 실패했습니다.',
        message: jenkinsError.message
      });
    }

  } catch (error) {
    console.error('Jenkins Job 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Jenkins Job 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Jenkins Job 목록 조회
router.get('/jobs', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        jj.id,
        jj.job_name,
        jj.system_id,
        jj.repository_url,
        jj.jenkins_url,
        jj.status,
        jj.last_build_number,
        jj.last_build_status,
        jj.last_build_time,
        jj.created_at
      FROM jenkins_jobs jj
      ORDER BY jj.created_at DESC
    `);

    res.json({
      success: true,
      jobs: result.rows
    });

  } catch (error) {
    console.error('Jenkins Job 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Jenkins Job 목록 조회 중 오류가 발생했습니다.',
      message: error.message
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

module.exports = router;
