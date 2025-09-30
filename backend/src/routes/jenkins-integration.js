// [advice from AI] Jenkins 실제 연동 API - ECP-AI K8s Orchestrator 파이프라인 테스트용
const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] Jenkins 설정 (로컬 Jenkins 사용)
const JENKINS_CONFIG = {
  url: process.env.JENKINS_URL || 'http://localhost:8080',
  username: process.env.JENKINS_USERNAME || 'admin',
  password: process.env.JENKINS_PASSWORD || '1q2w3e4r',
  crumbUrl: '/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,":",//crumb)'
};

// [advice from AI] Jenkins 인증 헤더 생성
const getJenkinsAuth = () => {
  const auth = Buffer.from(`${JENKINS_CONFIG.username}:${JENKINS_CONFIG.password}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/xml'
  };
};

// [advice from AI] CSRF 토큰 획득
const getCrumbToken = async () => {
  try {
    const response = await axios.get(`${JENKINS_CONFIG.url}${JENKINS_CONFIG.crumbUrl}`, {
      headers: getJenkinsAuth(),
      timeout: 10000
    });
    
    const crumbData = response.data.split(':');
    return {
      field: crumbData[0],
      value: crumbData[1]
    };
  } catch (error) {
    console.log('⚠️ CSRF 토큰 획득 실패, 토큰 없이 진행:', error.message);
    return null;
  }
};

// [advice from AI] Jenkins Job XML 템플릿 생성
const generateJobXML = (config) => {
  return `<?xml version='1.1' encoding='UTF-8'?>
<project>
  <actions/>
  <description>ECP-AI K8s Orchestrator 자동 생성 Job - ${config.project_name}</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <hudson.plugins.jira.JiraProjectProperty plugin="jira@3.7"/>
  </properties>
  <scm class="hudson.plugins.git.GitSCM" plugin="git@4.8.3">
    <configVersion>2</configVersion>
    <userRemoteConfigs>
      <hudson.plugins.git.UserRemoteConfig>
        <url>${config.repository_url}</url>
      </hudson.plugins.git.UserRemoteConfig>
    </userRemoteConfigs>
    <branches>
      <hudson.plugins.git.BranchSpec>
        <name>*/${config.build_branch}</name>
      </hudson.plugins.git.BranchSpec>
    </branches>
    <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
    <submoduleCfg class="empty-list"/>
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
      <command>#!/bin/bash
echo "🚀 ECP-AI K8s Orchestrator 빌드 시작"
echo "프로젝트: ${config.project_name}"
echo "브랜치: ${config.build_branch}"
echo "대상 환경: ${config.target_environment}"

# Docker 이미지 빌드
if [ -f "Dockerfile" ]; then
    echo "📦 Docker 이미지 빌드 중..."
    docker build -t ${config.docker_registry}/${config.jenkins_job_name}:$BUILD_NUMBER .
    
    # Nexus로 이미지 푸시
    echo "📤 Nexus로 이미지 푸시 중..."
    docker push ${config.docker_registry}/${config.jenkins_job_name}:$BUILD_NUMBER
    
    echo "✅ 빌드 완료: ${config.docker_registry}/${config.jenkins_job_name}:$BUILD_NUMBER"
else
    echo "⚠️ Dockerfile을 찾을 수 없습니다."
    exit 1
fi

# Kubernetes 매니페스트 업데이트 (GitOps)
echo "🔄 Kubernetes 매니페스트 업데이트 중..."
if [ -f "k8s/deployment.yaml" ]; then
    sed -i "s|image:.*|image: ${config.docker_registry}/${config.jenkins_job_name}:$BUILD_NUMBER|g" k8s/deployment.yaml
    echo "✅ 매니페스트 업데이트 완료"
else
    echo "⚠️ k8s/deployment.yaml을 찾을 수 없습니다."
fi

echo "🎉 빌드 프로세스 완료"</command>
    </hudson.tasks.Shell>
  </builders>
  <publishers>
    <hudson.tasks.ArtifactArchiver>
      <artifacts>**/*</artifacts>
      <allowEmptyArchive>false</allowEmptyArchive>
      <onlyIfSuccessful>false</onlyIfSuccessful>
      <fingerprint>false</fingerprint>
      <defaultExcludes>true</defaultExcludes>
      <caseSensitive>true</caseSensitive>
      <followSymlinks>false</followSymlinks>
    </hudson.tasks.ArtifactArchiver>
  </publishers>
  <buildWrappers/>
</project>`;
};

// [advice from AI] Jenkins Job 생성 API
router.post('/create-job', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    console.log('🔨 Jenkins Job 생성 요청:', req.body);
    
    const {
      project_name,
      jenkins_job_name,
      repository_url,
      build_branch = 'main',
      docker_registry = 'nexus.langsa.ai',
      target_environment = 'production'
    } = req.body;

    if (!project_name || !jenkins_job_name || !repository_url) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다: project_name, jenkins_job_name, repository_url'
      });
    }

    // CSRF 토큰 획득
    const crumb = await getCrumbToken();
    
    // Job XML 생성
    const jobXML = generateJobXML({
      project_name,
      jenkins_job_name,
      repository_url,
      build_branch,
      docker_registry,
      target_environment
    });

    // Jenkins Job 생성 요청
    const headers = {
      ...getJenkinsAuth(),
      'Content-Type': 'application/xml'
    };
    
    if (crumb) {
      headers[crumb.field] = crumb.value;
    }

    const createJobUrl = `${JENKINS_CONFIG.url}/createItem?name=${jenkins_job_name}`;
    
    console.log('📡 Jenkins Job 생성 요청 URL:', createJobUrl);
    
    const response = await axios.post(createJobUrl, jobXML, {
      headers,
      timeout: 30000
    });

    console.log('✅ Jenkins Job 생성 성공:', jenkins_job_name);

    res.json({
      success: true,
      message: 'Jenkins Job이 성공적으로 생성되었습니다.',
      data: {
        job_name: jenkins_job_name,
        job_url: `${JENKINS_CONFIG.url}/job/${jenkins_job_name}`,
        project_name,
        repository_url,
        build_branch,
        docker_registry
      }
    });

  } catch (error) {
    console.error('❌ Jenkins Job 생성 실패:', error.message);
    
    let errorMessage = 'Jenkins Job 생성에 실패했습니다.';
    if (error.response) {
      console.error('Jenkins 응답 상태:', error.response.status);
      console.error('Jenkins 응답 데이터:', error.response.data);
      
      if (error.response.status === 400) {
        errorMessage = 'Job 이름이 이미 존재하거나 잘못된 설정입니다.';
      } else if (error.response.status === 401) {
        errorMessage = 'Jenkins 인증에 실패했습니다.';
      } else if (error.response.status === 403) {
        errorMessage = 'Jenkins 접근 권한이 없습니다.';
      }
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

// [advice from AI] Jenkins Job 빌드 트리거 API
router.post('/trigger-build', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    console.log('🚀 Jenkins 빌드 트리거 요청:', req.body);
    
    const { jenkins_job_name } = req.body;

    if (!jenkins_job_name) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다: jenkins_job_name'
      });
    }

    // CSRF 토큰 획득
    const crumb = await getCrumbToken();
    
    const headers = {
      ...getJenkinsAuth()
    };
    
    if (crumb) {
      headers[crumb.field] = crumb.value;
    }

    const buildUrl = `${JENKINS_CONFIG.url}/job/${jenkins_job_name}/build`;
    
    console.log('📡 Jenkins 빌드 트리거 URL:', buildUrl);
    
    const response = await axios.post(buildUrl, '', {
      headers,
      timeout: 10000
    });

    console.log('✅ Jenkins 빌드 트리거 성공:', jenkins_job_name);

    res.json({
      success: true,
      message: 'Jenkins 빌드가 성공적으로 트리거되었습니다.',
      data: {
        job_name: jenkins_job_name,
        build_url: `${JENKINS_CONFIG.url}/job/${jenkins_job_name}`,
        triggered_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Jenkins 빌드 트리거 실패:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Jenkins 빌드 트리거에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] Jenkins Job 상태 조회 API
router.get('/job-status/:jobName', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { jobName } = req.params;
    
    console.log('📊 Jenkins Job 상태 조회:', jobName);
    
    const statusUrl = `${JENKINS_CONFIG.url}/job/${jobName}/api/json`;
    
    const response = await axios.get(statusUrl, {
      headers: getJenkinsAuth(),
      timeout: 10000
    });

    const jobData = response.data;
    
    res.json({
      success: true,
      data: {
        name: jobData.name,
        url: jobData.url,
        buildable: jobData.buildable,
        color: jobData.color,
        lastBuild: jobData.lastBuild,
        lastCompletedBuild: jobData.lastCompletedBuild,
        lastFailedBuild: jobData.lastFailedBuild,
        lastSuccessfulBuild: jobData.lastSuccessfulBuild,
        nextBuildNumber: jobData.nextBuildNumber
      }
    });

  } catch (error) {
    console.error('❌ Jenkins Job 상태 조회 실패:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Jenkins Job 상태 조회에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
