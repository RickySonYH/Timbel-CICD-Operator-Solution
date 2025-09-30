// [advice from AI] Jenkins Webhook 수신 및 처리 라우트
const express = require('express');
const router = express.Router();
const JenkinsWebhookHandler = require('../services/jenkinsWebhookHandler');

// [advice from AI] Webhook 핸들러 인스턴스 생성
const webhookHandler = new JenkinsWebhookHandler();

// [advice from AI] Jenkins Webhook 수신 엔드포인트
router.post('/jenkins-build', async (req, res) => {
  try {
    console.log('Jenkins Webhook 수신:', req.headers);
    console.log('Webhook 데이터:', JSON.stringify(req.body, null, 2));

    // [advice from AI] Jenkins에서 보내는 기본적인 인증 체크 (선택사항)
    const jenkinsSignature = req.headers['x-jenkins-signature'];
    if (process.env.JENKINS_WEBHOOK_SECRET && jenkinsSignature) {
      // [advice from AI] 서명 검증 로직 (보안 강화)
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JENKINS_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (jenkinsSignature !== `sha256=${expectedSignature}`) {
        console.error('Jenkins Webhook 서명 검증 실패');
        return res.status(401).json({
          success: false,
          message: '인증 실패'
        });
      }
    }

    // [advice from AI] Webhook 이벤트 처리
    const result = await webhookHandler.handleWebhookEvent(req.body);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          buildFailureId: result.buildFailure?.id,
          issueCreated: result.issueCreated
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Jenkins Webhook 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '웹훅 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] GitHub Webhook 수신 엔드포인트 (향후 확장용)
router.post('/github-push', async (req, res) => {
  try {
    console.log('GitHub Webhook 수신:', req.headers);
    
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    
    // [advice from AI] GitHub 서명 검증 (선택사항)
    if (process.env.GITHUB_WEBHOOK_SECRET && signature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== `sha256=${expectedSignature}`) {
        console.error('GitHub Webhook 서명 검증 실패');
        return res.status(401).json({
          success: false,
          message: '인증 실패'
        });
      }
    }

    // [advice from AI] Push 이벤트만 처리
    if (event === 'push') {
      const { repository, ref, commits } = req.body;
      
      console.log(`GitHub Push 이벤트: ${repository.full_name}, 브랜치: ${ref}`);
      console.log(`커밋 수: ${commits.length}`);
      
      // [advice from AI] 향후 자동 빌드 트리거 로직 추가 가능
      // 예: Jenkins Job 자동 실행, 빌드 상태 업데이트 등
      
      res.json({
        success: true,
        message: 'GitHub Push 이벤트 처리 완료',
        data: {
          repository: repository.full_name,
          branch: ref,
          commitCount: commits.length
        }
      });
    } else {
      res.json({
        success: true,
        message: `GitHub ${event} 이벤트 수신 (처리 안함)`
      });
    }

  } catch (error) {
    console.error('GitHub Webhook 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: 'GitHub 웹훅 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 수동 빌드 실패 등록 (테스트용)
router.post('/manual-build-failure', async (req, res) => {
  try {
    const {
      jobName,
      buildNumber,
      repositoryUrl,
      branch = 'main',
      commitSha = '',
      commitMessage = '',
      errorType = 'unknown',
      errorStage = 'unknown',
      errorMessage = '수동 등록된 빌드 실패',
      stackTrace = '',
      logUrl = '',
      projectId = null
    } = req.body;

    if (!jobName || !buildNumber) {
      return res.status(400).json({
        success: false,
        message: 'jobName과 buildNumber는 필수입니다.'
      });
    }

    // [advice from AI] 수동 빌드 실패 데이터 생성
    const mockWebhookData = {
      name: jobName,
      build: {
        number: buildNumber,
        phase: 'COMPLETED',
        status: 'FAILURE',
        full_url: `http://localhost:8080/job/${jobName}/${buildNumber}/`
      }
    };

    // [advice from AI] 빌드 상세 정보 모킹
    const mockBuildDetails = {
      buildInfo: {},
      consoleLog: `Build failed with error: ${errorMessage}`,
      gitInfo: {
        repositoryUrl: repositoryUrl || '',
        branch: branch,
        commitSha: commitSha,
        commitMessage: commitMessage
      },
      errorAnalysis: {
        errorType: errorType,
        errorStage: errorStage,
        errorMessage: errorMessage,
        stackTrace: stackTrace
      },
      duration: 30000,
      timestamp: Date.now(),
      logUrl: logUrl || `http://localhost:8080/job/${jobName}/${buildNumber}/console`
    };

    // [advice from AI] 직접 빌드 실패 저장
    const buildFailure = await webhookHandler.saveBuildFailure(jobName, buildNumber, mockBuildDetails);
    
    // [advice from AI] 자동 이슈 생성 일시적으로 비활성화 (UUID 문제 해결 후 활성화 예정)
    // const shouldCreateIssue = await webhookHandler.shouldCreateAutomaticIssue(buildFailure);
    
    let issueReport = null;
    // if (shouldCreateIssue) {
    //   issueReport = await webhookHandler.createAutomaticIssue(buildFailure);
    // }

    res.json({
      success: true,
      message: '수동 빌드 실패 등록 완료',
      data: {
        buildFailure,
        issueReport,
        issueCreated: false // 일시적으로 비활성화
      }
    });

  } catch (error) {
    console.error('수동 빌드 실패 등록 오류:', error);
    res.status(500).json({
      success: false,
      message: '수동 빌드 실패 등록 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] Webhook 상태 확인
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Jenkins Webhook 서비스가 정상 작동 중입니다.',
    endpoints: [
      'POST /webhooks/jenkins-build - Jenkins 빌드 완료 웹훅',
      'POST /webhooks/github-push - GitHub Push 이벤트 웹훅',
      'POST /webhooks/manual-build-failure - 수동 빌드 실패 등록',
      'GET /webhooks/status - 웹훅 서비스 상태 확인'
    ],
    timestamp: new Date().toISOString()
  });
});

// [advice from AI] 최근 Webhook 이벤트 로그 조회 (디버깅용)
router.get('/recent-events', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'timbel_knowledge',
      user: process.env.DB_USER || 'timbel_user',
      password: process.env.DB_PASSWORD || 'timbel_password',
    });

    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        bf.id,
        bf.job_name,
        bf.build_number,
        bf.error_type,
        bf.failed_at,
        bf.issue_created,
        ir.id as issue_id,
        ir.title as issue_title,
        ir.status as issue_status
      FROM build_failures bf
      LEFT JOIN issue_reports ir ON bf.id = ir.build_failure_id
      ORDER BY bf.failed_at DESC
      LIMIT 20
    `);
    
    client.release();

    res.json({
      success: true,
      events: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('최근 이벤트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '최근 이벤트 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
