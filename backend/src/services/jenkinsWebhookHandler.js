// [advice from AI] Jenkins Webhook 처리 및 빌드 실패 자동 감지 서비스
const { Pool } = require('pg');
const axios = require('axios');

class JenkinsWebhookHandler {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'timbel_knowledge',
      user: process.env.DB_USER || 'timbel_user',
      password: process.env.DB_PASSWORD || 'timbel_password',
    });
    console.log('JenkinsWebhookHandler DB 연결 설정:', {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'timbel_knowledge',
      user: process.env.DB_USER || 'timbel_user'
    });
  }

  // [advice from AI] Jenkins Webhook 이벤트 처리
  async handleWebhookEvent(webhookData) {
    try {
      console.log('Jenkins Webhook 이벤트 수신:', JSON.stringify(webhookData, null, 2));

      const { name: jobName, build } = webhookData;
      
      if (!build) {
        console.log('빌드 정보가 없습니다.');
        return { success: false, message: '빌드 정보가 없습니다.' };
      }

      const { number: buildNumber, phase, status, full_url: buildUrl } = build;

      // [advice from AI] 빌드 완료 이벤트만 처리
      if (phase !== 'COMPLETED') {
        console.log(`빌드 진행 중: ${phase}`);
        return { success: true, message: `빌드 진행 중: ${phase}` };
      }

      // [advice from AI] 빌드 실패 시에만 처리
      if (status !== 'FAILURE') {
        console.log(`빌드 성공: ${status}`);
        return { success: true, message: `빌드 성공: ${status}` };
      }

      console.log(`빌드 실패 감지: ${jobName} #${buildNumber}`);

      // [advice from AI] 빌드 상세 정보 가져오기
      const buildDetails = await this.fetchBuildDetails(jobName, buildNumber);
      
      // [advice from AI] 빌드 실패 정보 저장
      const buildFailure = await this.saveBuildFailure(jobName, buildNumber, buildDetails);
      
      // [advice from AI] 자동 이슈 생성 여부 결정
      const shouldCreateIssue = await this.shouldCreateAutomaticIssue(buildFailure);
      
      if (shouldCreateIssue) {
        await this.createAutomaticIssue(buildFailure);
      }

      return { 
        success: true, 
        message: '빌드 실패 처리 완료',
        buildFailure,
        issueCreated: shouldCreateIssue
      };

    } catch (error) {
      console.error('Jenkins Webhook 처리 오류:', error);
      return { success: false, message: error.message };
    }
  }

  // [advice from AI] Jenkins API에서 빌드 상세 정보 가져오기
  async fetchBuildDetails(jobName, buildNumber) {
    try {
      const jenkinsUrl = process.env.JENKINS_URL || 'http://localhost:8080';
      const jenkinsUser = process.env.JENKINS_USER || 'admin';
      const jenkinsToken = process.env.JENKINS_TOKEN || 'admin123!';

      // [advice from AI] 빌드 정보 API 호출
      const buildInfoUrl = `${jenkinsUrl}/job/${jobName}/${buildNumber}/api/json`;
      const consoleLogUrl = `${jenkinsUrl}/job/${jobName}/${buildNumber}/consoleText`;

      const auth = Buffer.from(`${jenkinsUser}:${jenkinsToken}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      };

      // [advice from AI] 빌드 정보 가져오기
      const buildInfoResponse = await axios.get(buildInfoUrl, { 
        headers,
        timeout: 10000
      });
      const buildInfo = buildInfoResponse.data;

      // [advice from AI] 콘솔 로그 가져오기
      let consoleLog = '';
      try {
        const consoleResponse = await axios.get(consoleLogUrl, { 
          headers,
          timeout: 15000,
          maxContentLength: 1024 * 1024 // 1MB 제한
        });
        consoleLog = consoleResponse.data;
      } catch (logError) {
        console.error('콘솔 로그 가져오기 실패:', logError.message);
        consoleLog = '콘솔 로그를 가져올 수 없습니다.';
      }

      // [advice from AI] Git 정보 추출
      const gitInfo = this.extractGitInfo(buildInfo);
      
      // [advice from AI] 오류 정보 분석
      const errorAnalysis = this.analyzeConsoleLog(consoleLog);

      return {
        buildInfo,
        consoleLog,
        gitInfo,
        errorAnalysis,
        duration: buildInfo.duration || 0,
        timestamp: buildInfo.timestamp || Date.now(),
        logUrl: `${jenkinsUrl}/job/${jobName}/${buildNumber}/console`
      };

    } catch (error) {
      console.error('빌드 상세 정보 가져오기 실패:', error);
      
      // [advice from AI] 기본 정보라도 반환
      return {
        buildInfo: {},
        consoleLog: '빌드 정보를 가져올 수 없습니다.',
        gitInfo: {},
        errorAnalysis: {
          errorType: 'unknown',
          errorStage: 'unknown',
          errorMessage: '빌드 정보를 가져올 수 없습니다.',
          stackTrace: ''
        },
        duration: 0,
        timestamp: Date.now(),
        logUrl: `${process.env.JENKINS_URL || 'http://localhost:8080'}/job/${jobName}/${buildNumber}/console`
      };
    }
  }

  // [advice from AI] Git 정보 추출
  extractGitInfo(buildInfo) {
    try {
      const actions = buildInfo.actions || [];
      const gitAction = actions.find(action => 
        action._class && action._class.includes('GitSCM')
      );

      if (gitAction && gitAction.lastBuiltRevision) {
        const revision = gitAction.lastBuiltRevision;
        return {
          repositoryUrl: gitAction.remoteUrls?.[0] || '',
          branch: revision.branch?.[0]?.name || 'main',
          commitSha: revision.SHA1 || '',
          commitMessage: gitAction.lastBuiltRevision?.branch?.[0]?.SHA1 || ''
        };
      }

      // [advice from AI] 대안적 방법으로 Git 정보 찾기
      const changeSet = buildInfo.changeSet;
      if (changeSet && changeSet.items && changeSet.items.length > 0) {
        const lastChange = changeSet.items[0];
        return {
          repositoryUrl: '',
          branch: 'main',
          commitSha: lastChange.commitId || '',
          commitMessage: lastChange.msg || lastChange.comment || ''
        };
      }

      return {
        repositoryUrl: '',
        branch: 'main',
        commitSha: '',
        commitMessage: ''
      };

    } catch (error) {
      console.error('Git 정보 추출 오류:', error);
      return {
        repositoryUrl: '',
        branch: 'main',
        commitSha: '',
        commitMessage: ''
      };
    }
  }

  // [advice from AI] 콘솔 로그 분석하여 오류 정보 추출
  analyzeConsoleLog(consoleLog) {
    const log = consoleLog.toLowerCase();
    
    let errorType = 'unknown';
    let errorStage = 'unknown';
    let errorMessage = '';
    let stackTrace = '';

    // [advice from AI] 오류 유형 분석
    if (log.includes('compilation failed') || log.includes('compile error')) {
      errorType = 'compilation';
      errorStage = 'compile';
    } else if (log.includes('test') && (log.includes('failed') || log.includes('error'))) {
      errorType = 'test';
      errorStage = 'test';
    } else if (log.includes('npm install') || log.includes('dependency') || log.includes('package')) {
      errorType = 'dependency';
      errorStage = 'install';
    } else if (log.includes('deploy') || log.includes('deployment')) {
      errorType = 'deployment';
      errorStage = 'deploy';
    } else if (log.includes('timeout') || log.includes('timed out')) {
      errorType = 'timeout';
      errorStage = 'timeout';
    }

    // [advice from AI] 오류 메시지 추출
    const errorLines = consoleLog.split('\n').filter(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('failed') ||
      line.toLowerCase().includes('exception')
    );

    if (errorLines.length > 0) {
      errorMessage = errorLines.slice(0, 3).join('\n'); // 처음 3개 오류 라인
      
      // [advice from AI] 스택 트레이스 추출
      const stackLines = consoleLog.split('\n').filter(line =>
        line.trim().startsWith('at ') || 
        line.trim().includes('Exception:') ||
        line.trim().includes('Error:')
      );
      
      if (stackLines.length > 0) {
        stackTrace = stackLines.slice(0, 10).join('\n'); // 처음 10개 스택 라인
      }
    }

    // [advice from AI] 기본 오류 메시지 설정
    if (!errorMessage) {
      errorMessage = `빌드 실패: ${errorType} 단계에서 오류 발생`;
    }

    return {
      errorType,
      errorStage,
      errorMessage: errorMessage.substring(0, 1000), // 1000자 제한
      stackTrace: stackTrace.substring(0, 2000) // 2000자 제한
    };
  }

  // [advice from AI] 빌드 실패 정보 데이터베이스 저장
  async saveBuildFailure(jobName, buildNumber, buildDetails) {
    const client = await this.pool.connect();
    
    try {
      const { gitInfo, errorAnalysis, duration, logUrl } = buildDetails;
      
      // [advice from AI] 프로젝트 ID 찾기 (프로젝트 이름 기반)
      let projectId = null;
      if (gitInfo.repositoryUrl) {
        // Repository URL에서 프로젝트 이름 추출 (예: https://github.com/user/repo-name -> repo-name)
        const repoName = gitInfo.repositoryUrl.split('/').pop().replace('.git', '');
        const projectResult = await client.query(`
          SELECT id FROM projects 
          WHERE name ILIKE $1 OR name ILIKE $2 OR target_system_name ILIKE $1
          LIMIT 1
        `, [`%${repoName}%`, `%${jobName}%`]);
        
        if (projectResult.rows.length > 0) {
          projectId = projectResult.rows[0].id;
        }
      }

      // [advice from AI] 중복 체크
      const existingResult = await client.query(`
        SELECT id FROM build_failures 
        WHERE job_name = $1 AND build_number = $2
      `, [jobName, buildNumber]);

      if (existingResult.rows.length > 0) {
        console.log('이미 등록된 빌드 실패입니다.');
        return existingResult.rows[0];
      }

      // [advice from AI] 새 빌드 실패 저장
      console.log('빌드 실패 저장 파라미터:', {
        jobName,
        buildNumber,
        repositoryUrl: gitInfo.repositoryUrl || '',
        branch: gitInfo.branch || 'main',
        commitSha: gitInfo.commitSha || '',
        commitMessage: gitInfo.commitMessage || '',
        errorType: errorAnalysis.errorType || 'unknown',
        errorStage: errorAnalysis.errorStage || 'unknown',
        errorMessage: errorAnalysis.errorMessage || '',
        stackTrace: errorAnalysis.stackTrace || '',
        logUrl,
        projectId: projectId || null,
        duration
      });
      
      const result = await client.query(`
        INSERT INTO build_failures (
          job_name, build_number, repository_url, branch, commit_sha, commit_message,
          error_type, error_stage, error_message, stack_trace, log_url,
          project_id, duration, failed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
      `, [
        jobName,
        buildNumber,
        gitInfo.repositoryUrl || '',
        gitInfo.branch || 'main',
        gitInfo.commitSha || '',
        gitInfo.commitMessage || '',
        errorAnalysis.errorType || 'unknown',
        errorAnalysis.errorStage || 'unknown',
        errorAnalysis.errorMessage || '',
        errorAnalysis.stackTrace || '',
        logUrl,
        projectId || null, // [advice from AI] UUID 타입이므로 null 명시적 처리
        duration
      ]);

      console.log('빌드 실패 정보 저장 완료:', result.rows[0].id);
      return result.rows[0];

    } finally {
      client.release();
    }
  }

  // [advice from AI] 자동 이슈 생성 여부 결정
  async shouldCreateAutomaticIssue(buildFailure) {
    // [advice from AI] 설정 가능한 조건들
    const autoIssueConditions = {
      // 특정 오류 유형에 대해서만 자동 생성
      enabledErrorTypes: ['compilation', 'test', 'deployment'],
      // 특정 브랜치에 대해서만 자동 생성
      enabledBranches: ['main', 'master', 'develop'],
      // 연속 실패 횟수 임계값
      consecutiveFailureThreshold: 1,
      // 프로젝트별 자동 생성 활성화 여부
      projectAutoIssueEnabled: true
    };

    try {
      // [advice from AI] 오류 유형 체크
      if (!autoIssueConditions.enabledErrorTypes.includes(buildFailure.error_type)) {
        console.log(`자동 이슈 생성 비활성화: 오류 유형 ${buildFailure.error_type}`);
        return false;
      }

      // [advice from AI] 브랜치 체크
      if (!autoIssueConditions.enabledBranches.includes(buildFailure.branch)) {
        console.log(`자동 이슈 생성 비활성화: 브랜치 ${buildFailure.branch}`);
        return false;
      }

      // [advice from AI] 이미 이슈가 생성된 경우 체크
      if (buildFailure.issue_created) {
        console.log('이미 이슈가 생성되었습니다.');
        return false;
      }

      // [advice from AI] 최근 동일한 Job의 연속 실패 횟수 체크
      const client = await this.pool.connect();
      try {
        const recentFailuresResult = await client.query(`
          SELECT COUNT(*) as failure_count
          FROM build_failures
          WHERE job_name = $1 
            AND failed_at >= NOW() - INTERVAL '24 hours'
            AND error_type = $2
        `, [buildFailure.job_name, buildFailure.error_type]);

        const failureCount = parseInt(recentFailuresResult.rows[0].failure_count);
        
        if (failureCount >= autoIssueConditions.consecutiveFailureThreshold) {
          console.log(`자동 이슈 생성 조건 만족: 연속 실패 ${failureCount}회`);
          return true;
        }

        console.log(`자동 이슈 생성 조건 미만족: 연속 실패 ${failureCount}회`);
        return false;

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('자동 이슈 생성 조건 체크 오류:', error);
      return false;
    }
  }

  // [advice from AI] 자동 이슈 생성
  async createAutomaticIssue(buildFailure) {
    try {
      console.log('자동 이슈 생성 시작:', buildFailure.id);

      // [advice from AI] 적절한 PE 찾기
      const assignedPE = await this.findBestPE(buildFailure);
      
      // [advice from AI] 이슈 분석 및 템플릿 생성
      const issueTemplate = this.generateIssueTemplate(buildFailure);
      
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // [advice from AI] 이슈 레포트 생성
        const issueResult = await client.query(`
          INSERT INTO issue_reports (
            build_failure_id, title, description, error_category, severity,
            assigned_to, status, reproduction_steps, suggested_solution,
            created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, $9, NOW(), NOW())
          RETURNING *
        `, [
          buildFailure.id,
          issueTemplate.title,
          issueTemplate.description,
          buildFailure.error_type,
          issueTemplate.severity,
          assignedPE?.pe_id || null,
          JSON.stringify(issueTemplate.reproductionSteps),
          issueTemplate.suggestedSolution,
          1 // 시스템 사용자 ID
        ]);

        const issueId = issueResult.rows[0].id;

        // [advice from AI] 첨부파일 추가
        await client.query(`
          INSERT INTO issue_attachments (
            issue_id, type, url, description, created_at
          ) VALUES ($1, 'log', $2, '빌드 로그', NOW())
        `, [issueId, buildFailure.log_url]);

        // [advice from AI] 빌드 실패 상태 업데이트
        await client.query(`
          UPDATE build_failures 
          SET issue_created = true, updated_at = NOW()
          WHERE id = $1
        `, [buildFailure.id]);

        await client.query('COMMIT');

        console.log('자동 이슈 생성 완료:', issueId);

        // [advice from AI] PE에게 알림 전송
        if (assignedPE) {
          await this.sendPENotification(assignedPE, issueResult.rows[0], buildFailure);
        }

        return issueResult.rows[0];

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('자동 이슈 생성 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 최적 PE 찾기
  async findBestPE(buildFailure) {
    const client = await this.pool.connect();
    
    try {
      // [advice from AI] 프로젝트 기반 PE 찾기 (projects 테이블에 assigned_pe 컬럼이 없으므로 스킵)
      // 현재 projects 테이블에는 assigned_po만 있고 assigned_pe는 없음
      // 대신 워크로드가 가장 적은 PE를 찾아서 할당

      // [advice from AI] 워크로드가 가장 적은 PE 찾기
      const availablePEResult = await client.query(`
        SELECT u.id as pe_id, u.full_name as pe_name, u.email,
               COALESCE(w.total_workload_score, 0) as workload_score
        FROM timbel_users u
        LEFT JOIN pe_workload_tracking w ON u.id = w.pe_id AND w.date = CURRENT_DATE
        WHERE u.role_type = 'pe' AND u.status = 'active'
        ORDER BY w.total_workload_score ASC, RANDOM()
        LIMIT 1
      `);

      return availablePEResult.rows.length > 0 ? availablePEResult.rows[0] : null;

    } finally {
      client.release();
    }
  }

  // [advice from AI] 이슈 템플릿 생성
  generateIssueTemplate(buildFailure) {
    const errorTypeMap = {
      'compilation': { severity: 'high', priority: '높음' },
      'test': { severity: 'medium', priority: '보통' },
      'dependency': { severity: 'medium', priority: '보통' },
      'deployment': { severity: 'critical', priority: '긴급' },
      'timeout': { severity: 'low', priority: '낮음' },
      'unknown': { severity: 'medium', priority: '보통' }
    };

    const config = errorTypeMap[buildFailure.error_type] || errorTypeMap['unknown'];

    const title = `[자동생성] ${buildFailure.job_name} #${buildFailure.build_number} - ${buildFailure.error_type} 실패`;

    const description = `
## 🚨 빌드 실패 자동 감지

**Job**: ${buildFailure.job_name}  
**Build Number**: #${buildFailure.build_number}  
**Repository**: ${buildFailure.repository_url || 'N/A'}  
**Branch**: ${buildFailure.branch}  
**Commit**: ${buildFailure.commit_sha?.substring(0, 7) || 'N/A'}  
**실패 시간**: ${new Date(buildFailure.failed_at).toLocaleString()}  

## 🔍 오류 정보

**단계**: ${buildFailure.error_stage}  
**유형**: ${buildFailure.error_type}  
**우선순위**: ${config.priority}  

### 오류 메시지
\`\`\`
${buildFailure.error_message}
\`\`\`

${buildFailure.stack_trace ? `### 스택 트레이스
\`\`\`
${buildFailure.stack_trace}
\`\`\`` : ''}

## 📋 확인 사항

- [ ] 로컬 환경에서 재현 확인
- [ ] 관련 코드 변경사항 검토  
- [ ] 의존성 및 환경 설정 확인
- [ ] 테스트 케이스 검증

---
*이 이슈는 빌드 실패 시 자동으로 생성되었습니다.*
    `.trim();

    const reproductionSteps = this.generateReproductionSteps(buildFailure);
    const suggestedSolution = this.generateSuggestedSolution(buildFailure);

    return {
      title,
      description,
      severity: config.severity,
      reproductionSteps,
      suggestedSolution
    };
  }

  // [advice from AI] 재현 단계 생성
  generateReproductionSteps(buildFailure) {
    const baseSteps = [
      `1. 레포지토리 클론: git clone ${buildFailure.repository_url || '[REPO_URL]'}`,
      `2. 브랜치 체크아웃: git checkout ${buildFailure.branch}`,
      `3. 커밋 확인: git log --oneline -5`
    ];

    const typeSpecificSteps = {
      'compilation': [
        '4. 의존성 설치: npm install (또는 해당 패키지 매니저)',
        '5. 빌드 실행: npm run build',
        '6. 컴파일 오류 확인'
      ],
      'test': [
        '4. 의존성 설치: npm install',
        '5. 테스트 실행: npm test',
        '6. 실패한 테스트 케이스 확인'
      ],
      'dependency': [
        '4. package.json 또는 requirements.txt 확인',
        '5. 의존성 설치 시도',
        '6. 오류 메시지 분석'
      ],
      'deployment': [
        '4. 배포 환경 설정 확인',
        '5. 배포 스크립트 실행',
        '6. 배포 로그 확인'
      ]
    };

    const specificSteps = typeSpecificSteps[buildFailure.error_type] || [
      '4. 빌드 프로세스 실행',
      '5. 오류 로그 확인',
      '6. 문제점 분석'
    ];

    return [...baseSteps, ...specificSteps];
  }

  // [advice from AI] 해결 방법 제안 생성
  generateSuggestedSolution(buildFailure) {
    const solutionMap = {
      'compilation': '컴파일 오류를 수정하세요. 문법 오류, 타입 오류, 또는 누락된 import 문을 확인하세요.',
      'test': '실패한 테스트 케이스를 분석하고 수정하세요. 테스트 데이터나 모킹 설정을 확인하세요.',
      'dependency': '의존성 버전 충돌을 해결하세요. package-lock.json을 삭제하고 재설치를 시도하세요.',
      'deployment': '배포 환경 설정과 권한을 확인하세요. 네트워크 연결 및 서비스 상태를 점검하세요.',
      'timeout': '빌드 시간을 최적화하거나 타임아웃 설정을 조정하세요. 리소스 사용량을 모니터링하세요.',
      'unknown': '빌드 로그를 자세히 분석하여 근본 원인을 파악하세요.'
    };

    return solutionMap[buildFailure.error_type] || solutionMap['unknown'];
  }

  // [advice from AI] PE 알림 전송
  async sendPENotification(pe, issueReport, buildFailure) {
    try {
      // [advice from AI] 알림 API 호출 (실제 구현에 따라 조정)
      const notificationData = {
        recipientId: pe.pe_id,
        title: `🚨 [긴급] 빌드 실패 이슈 할당`,
        message: `${buildFailure.job_name} #${buildFailure.build_number} 빌드가 실패했습니다.\n\n` +
                `오류 유형: ${buildFailure.error_type}\n` +
                `브랜치: ${buildFailure.branch}\n` +
                `확인 및 수정이 필요합니다.`,
        type: 'build_failure',
        priority: 'high',
        relatedUrl: `/operations/issues/${issueReport.id}`,
        metadata: {
          issueId: issueReport.id,
          buildFailureId: buildFailure.id,
          jobName: buildFailure.job_name,
          buildNumber: buildFailure.build_number
        }
      };

      // [advice from AI] 내부 알림 시스템 호출
      await this.sendInternalNotification(notificationData);

      // [advice from AI] 이메일 알림 (선택사항)
      if (pe.email) {
        await this.sendEmailNotification(pe.email, notificationData);
      }

      console.log(`PE 알림 전송 완료: ${pe.pe_name} (${pe.email})`);

    } catch (error) {
      console.error('PE 알림 전송 실패:', error);
    }
  }

  // [advice from AI] 내부 알림 시스템
  async sendInternalNotification(notificationData) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO unified_messages (
          sender_id, message_type, title, content, priority, status,
          metadata, created_at
        ) VALUES (1, $1, $2, $3, $4, 'active', $5, NOW())
      `, [
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.priority,
        JSON.stringify(notificationData.metadata)
      ]);

      await client.query(`
        INSERT INTO unified_message_recipients (
          message_id, recipient_id, is_read, received_at
        ) VALUES (
          (SELECT id FROM unified_messages ORDER BY created_at DESC LIMIT 1),
          $1, false, NOW()
        )
      `, [notificationData.recipientId]);

    } finally {
      client.release();
    }
  }

  // [advice from AI] 이메일 알림 (선택사항)
  async sendEmailNotification(email, notificationData) {
    // [advice from AI] 실제 이메일 서비스 구현
    console.log(`이메일 알림 전송: ${email}`);
    console.log(`제목: ${notificationData.title}`);
    console.log(`내용: ${notificationData.message}`);
  }
}

module.exports = JenkinsWebhookHandler;
