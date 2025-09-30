// [advice from AI] 완전한 프로젝트 워크플로우 시뮬레이션 - 프로젝트 생성부터 빌드 실패까지
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 샘플 프로젝트 데이터
const sampleProjects = [
  {
    name: 'ECP-AI K8s Orchestrator',
    description: '멀티테넌트 AI 서비스 배포 시스템 - Kubernetes 오케스트레이션 솔루션',
    target_system_name: 'ecp-ai-k8s-orchestrator',
    project_overview: 'AI 서비스(콜봇, 챗봇, 어드바이저)를 위한 Kubernetes 기반 멀티테넌트 배포 플랫폼 구축',
    repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
    business_priority: 'high',
    expected_duration: 60,
    tech_stack: ['Python', 'TypeScript', 'JavaScript', 'Kubernetes', 'Docker', 'React'],
    pe_id: null, // 나중에 할당
    po_id: null  // 나중에 할당
  },
  {
    name: '실시간 모니터링 대시보드',
    description: 'Kubernetes 클러스터 실시간 모니터링을 위한 웹 대시보드',
    target_system_name: 'k8s-monitoring-dashboard',
    project_overview: 'React + TypeScript 기반 실시간 모니터링 대시보드 구축',
    repository_url: 'https://github.com/timbel-dev/k8s-monitoring',
    business_priority: 'medium',
    expected_duration: 21,
    tech_stack: ['React', 'TypeScript', 'Node.js', 'WebSocket', 'Grafana'],
    pe_id: null,
    po_id: null
  },
  {
    name: 'CI/CD 파이프라인 자동화 도구',
    description: 'Jenkins와 Argo CD를 연동한 완전 자동화 배포 시스템',
    target_system_name: 'cicd-automation-tool',
    project_overview: 'GitOps 기반 완전 자동화 CI/CD 파이프라인 구축',
    repository_url: 'https://github.com/timbel-dev/cicd-automation',
    business_priority: 'high',
    expected_duration: 45,
    tech_stack: ['Jenkins', 'Argo CD', 'Kubernetes', 'Helm', 'Go'],
    pe_id: null,
    po_id: null
  }
];

// [advice from AI] 빌드 실패 시나리오들
const buildFailureScenarios = [
  {
    error_type: 'compilation',
    error_stage: 'build',
    error_message: 'TypeError: Cannot read property \'resources\' of undefined',
    stack_trace: `File "/app/backend/src/orchestrator/tenant_manager.py", line 127
    def calculate_service_resources(service_requirements):
        cpu_cores = service_requirements.resources.cpu  # <-- resources가 undefined
        ^
TypeError: Cannot read property 'resources' of undefined`,
    log_url: 'http://localhost:8080/job/ecp-ai-k8s-orchestrator/22/console',
    failure_reason: 'ECP-AI 서비스 리소스 계산 로직에서 undefined 참조 오류'
  },
  {
    error_type: 'test',
    error_stage: 'test',
    error_message: 'AssertionError: Kubernetes deployment failed',
    stack_trace: `FAILED tests/test_k8s_deployment.py::test_tenant_creation - AssertionError: Expected deployment success, got failure
E       AssertionError: Kubernetes deployment failed for tenant 'test-tenant'
E       Response: {"error": "Namespace creation failed", "details": "insufficient permissions"}
E       
E       tests/test_k8s_deployment.py:45: AssertionError`,
    log_url: 'http://localhost:8080/job/k8s-monitoring-dashboard/8/console',
    failure_reason: 'Kubernetes 네임스페이스 생성 권한 부족으로 인한 배포 실패'
  },
  {
    error_type: 'dependency',
    error_stage: 'install',
    error_message: 'ERROR: Could not find a version that satisfies the requirement kubernetes>=24.2.0',
    stack_trace: `ERROR: Could not find a version that satisfies the requirement kubernetes>=24.2.0 (from versions: 1.0.0, 2.0.0, ..., 23.6.0)
ERROR: No matching distribution found for kubernetes>=24.2.0
WARNING: You are using pip version 21.0.1; however, version 23.2.1 is available.
You should consider upgrading via the '/usr/local/bin/python -m pip install --upgrade pip' command.`,
    log_url: 'http://localhost:8080/job/cicd-automation-tool/3/console',
    failure_reason: 'Kubernetes Python 클라이언트 버전 호환성 문제'
  }
];

async function createCompleteWorkflowSimulation() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 완전한 프로젝트 워크플로우 시뮬레이션 시작...\n');
    
    // [advice from AI] 1. 사용자 정보 조회 (PE, PO, QC, Admin)
    console.log('👥 사용자 정보 조회 중...');
    const usersResult = await client.query(`
      SELECT id, full_name, role_type 
      FROM timbel_users 
      WHERE role_type IN ('pe', 'po', 'qa', 'admin')
      ORDER BY role_type
    `);
    
    const users = usersResult.rows;
    const peUsers = users.filter(u => u.role_type === 'pe');
    const poUsers = users.filter(u => u.role_type === 'po');
    const qaUsers = users.filter(u => u.role_type === 'qa');
    const adminUsers = users.filter(u => u.role_type === 'admin');
    
    console.log(`   PE: ${peUsers.length}명, PO: ${poUsers.length}명, QA: ${qaUsers.length}명, Admin: ${adminUsers.length}명\n`);
    
    if (peUsers.length === 0 || poUsers.length === 0) {
      throw new Error('PE 또는 PO 사용자가 없습니다. 먼저 사용자를 생성해주세요.');
    }
    
    // [advice from AI] 2. 각 샘플 프로젝트에 대해 정확한 워크플로우 실행
    // 워크플로우: 프로젝트 생성 → 최고운영자 승인 → PO할당 → PE할당 → QA → PO 배포 요청 → 운영
    for (let i = 0; i < sampleProjects.length; i++) {
      const project = sampleProjects[i];
      const scenario = buildFailureScenarios[i];
      
      console.log(`📋 프로젝트 ${i + 1}: ${project.name}`);
      console.log(`   설명: ${project.description}`);
      
      // 사용자 할당 (나중에 단계별로 할당)
      const assignedPE = peUsers[Math.floor(Math.random() * peUsers.length)];
      const assignedPO = poUsers[Math.floor(Math.random() * poUsers.length)];
      const assignedQA = qaUsers.length > 0 ? qaUsers[Math.floor(Math.random() * qaUsers.length)] : null;
      const assignedAdmin = adminUsers.length > 0 ? adminUsers[Math.floor(Math.random() * adminUsers.length)] : null;
      
      // [advice from AI] STEP 1: 프로젝트 생성 (초기 상태: pending)
      const projectId = uuidv4();
      await client.query(`
        INSERT INTO projects (
          id, name, description, target_system_name, project_overview,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'planning', NOW(), NOW())
      `, [
        projectId, project.name, project.description, project.target_system_name,
        project.project_overview
      ]);
      
      console.log(`   ✅ STEP 1: 프로젝트 생성 완료 (상태: pending_approval)`);
      
      // [advice from AI] STEP 2: 최고운영자 승인
      if (assignedAdmin) {
        await client.query(`
          INSERT INTO project_approvals (
            id, project_id, approver_id, approval_action, approval_comment,
            approved_at, created_at, updated_at
          ) VALUES ($1, $2, $3, 'approved', $4, NOW(), NOW(), NOW())
        `, [
          uuidv4(), projectId, assignedAdmin.id,
          '프로젝트 승인 - PO 및 PE 할당 진행 가능'
        ]);
        
        // 프로젝트 상태 업데이트
        await client.query(`
          UPDATE projects SET status = 'active', assigned_po = $1, updated_at = NOW() WHERE id = $2
        `, [assignedPO.id, projectId]);
        
        console.log(`   ✅ STEP 2: 최고운영자 승인 완료 (${assignedAdmin.full_name})`);
      }
      
      // [advice from AI] STEP 3: PO 할당 (이미 위에서 처리됨)
      console.log(`   ✅ STEP 3: PO 할당 완료 (${assignedPO.full_name})`);
      
      // [advice from AI] STEP 4: PE 할당 (PO가 할당)
      const workGroupId = uuidv4();
      await client.query(`
        INSERT INTO work_groups (
          id, project_id, name, description, estimated_hours,
          status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'in_progress', $6, NOW(), NOW())
      `, [
        workGroupId, projectId, '메인 개발 작업', 
        `${project.name} 핵심 기능 개발`, project.expected_duration * 8,
        assignedPO.id
      ]);
      
      const assignmentId = uuidv4();
      await client.query(`
        INSERT INTO project_work_assignments (
          id, project_id, work_group_id, assigned_to, assigned_by,
          assignment_type, estimated_hours, assignment_status,
          assigned_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'development', $6, 'in_progress', NOW(), NOW(), NOW())
      `, [
        assignmentId, projectId, workGroupId, assignedPE.id, assignedPO.id, project.expected_duration * 8
      ]);
      
      // 프로젝트 상태를 진행중으로 업데이트
      await client.query(`
        UPDATE projects SET status = 'in_progress', updated_at = NOW() WHERE id = $1
      `, [projectId]);
      
      console.log(`   ✅ STEP 4: PE 할당 완료 (${assignedPE.full_name})`);
      
      // [advice from AI] PE 작업 완료 시뮬레이션 (며칠 후)
      const workStartDate = new Date();
      workStartDate.setDate(workStartDate.getDate() - Math.floor(Math.random() * 10) - 5);
      
      // [advice from AI] PE 작업 완료 및 레포지토리 등록
      const repoId = uuidv4();
      await client.query(`
        INSERT INTO project_repositories (
          id, project_id, work_group_id, assigned_pe, repository_url, 
          repository_name, platform, branch_name, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'github', 'main', NOW(), NOW())
      `, [
        repoId, projectId, workGroupId, assignedPE.id, project.repository_url, 
        project.target_system_name
      ]);
      
      // PE 작업 완료 보고서 제출
      const completionReportId = uuidv4();
      await client.query(`
        INSERT INTO project_completion_reports (
          id, project_id, assignment_id, submitted_by, repository_url,
          project_summary, technical_details, implemented_features,
          known_issues, deployment_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `, [
        completionReportId, projectId, assignmentId, assignedPE.id, project.repository_url,
        `${project.name} 개발 완료`, 
        `${project.tech_stack.join(', ')} 기술 스택을 사용하여 구현`,
        JSON.stringify(['API 엔드포인트', '데이터베이스 스키마', '인증 시스템', '로깅']),
        JSON.stringify(['성능 최적화 필요', '에러 핸들링 개선 필요']),
        'Docker 컨테이너화 완료, Kubernetes 배포 준비됨'
      ]);
      
      // 프로젝트 상태를 완료로 업데이트
      await client.query(`
        UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1
      `, [projectId]);
      
      console.log(`   ✅ PE 작업 완료 및 보고서 제출`);
      
      // [advice from AI] STEP 5: QA 검증
      if (assignedQA) {
        const qaRequestId = uuidv4();
        await client.query(`
          INSERT INTO qc_qa_requests (
            id, project_id, completion_report_id, requested_by, assigned_to,
            request_status, priority_level, quality_score, approval_status,
            approved_by, approved_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'completed', 'normal', $6, 'approved', $7, NOW(), NOW(), NOW())
        `, [
          qaRequestId, projectId, completionReportId, assignedPE.id, assignedQA.id,
          75 + Math.floor(Math.random() * 20), // 75-95 품질 점수
          assignedQA.id
        ]);
        
        console.log(`   ✅ STEP 5: QA 검증 완료 (${assignedQA.full_name})`);
      }
      
      // [advice from AI] STEP 6: PO 배포 요청 (system_registrations 테이블 사용)
      const systemRegistrationResult = await client.query(`
        INSERT INTO system_registrations (
          project_id, po_decision, deployment_priority,
          target_environment, registration_notes, decided_by,
          created_at, updated_at
        ) VALUES ($1, 'approve', $2, 'production', $3, $4, NOW(), NOW())
        RETURNING id
      `, [
        projectId, 
        project.business_priority === 'high' ? 'high' : 'normal',
        `${project.name} 프로덕션 배포 요청 - 비즈니스 우선순위: ${project.business_priority}`,
        assignedPO.id
      ]);
      
      const systemRegistrationId = systemRegistrationResult.rows[0].id;
      
      console.log(`   ✅ STEP 6: PO 배포 요청 완료 (${assignedPO.full_name})`);
      
      // [advice from AI] STEP 7: 운영팀 배포 진행 (Jenkins 빌드 시작)
      console.log(`   🚀 STEP 7: 운영팀 배포 진행 시작...`);
      
      // Jenkins 빌드 실패 시뮬레이션
      const jobName = `${project.target_system_name}-build`;
      const buildNumber = Math.floor(Math.random() * 50) + 1;
      
      const buildFailureResult = await client.query(`
        INSERT INTO build_failures (
          job_name, build_number, repository_url, branch,
          commit_sha, commit_message, failed_at, duration,
          error_type, error_stage, error_message, stack_trace,
          log_url, project_id, assigned_pe, issue_created,
          created_at, updated_at
        ) VALUES ($1, $2, $3, 'main', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW(), NOW())
        RETURNING id
      `, [
        jobName, buildNumber, project.repository_url,
        'abc' + Math.random().toString(36).substring(2, 10), // 랜덤 commit SHA
        `Fix ${scenario.error_type} issue in ${scenario.error_stage}`,
        new Date(Date.now() - Math.floor(Math.random() * 3600000)), // 1시간 이내 실패
        Math.floor(Math.random() * 300000) + 60000, // 1-5분 빌드 시간
        scenario.error_type, scenario.error_stage, scenario.error_message,
        scenario.stack_trace, scenario.log_url, projectId, assignedPE.id
      ]);
      
      const buildFailureId = buildFailureResult.rows[0].id;
      
      console.log(`   ❌ Jenkins 빌드 실패 발생! (${scenario.error_type} 오류)`);
      
      // 시스템 등록 상태를 실패로 업데이트 (관리자 거부로 처리)
      await client.query(`
        UPDATE system_registrations SET admin_decision = 'reject', updated_at = NOW() WHERE id = $1
      `, [systemRegistrationId]);
      
      // 자동 이슈 레포트 생성
      const issueReportResult = await client.query(`
        INSERT INTO issue_reports (
          build_failure_id, assigned_to, title, description,
          error_category, severity, reproduction_steps,
          suggested_solution, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, NOW(), NOW())
        RETURNING id
      `, [
        buildFailureId, assignedPE.id,
        `[${scenario.error_type.toUpperCase()}] ${project.name} 배포 실패`,
        `${project.name} 프로젝트의 배포 과정에서 Jenkins 빌드가 ${scenario.error_stage} 단계에서 실패했습니다.\n\n오류 내용: ${scenario.error_message}\n\n실패 원인: ${scenario.failure_reason}\n\n시스템 등록 ID: ${systemRegistrationId}`,
        scenario.error_type, scenario.error_type === 'compilation' ? 'high' : 'medium',
        JSON.stringify([
          '1. 배포 요청 승인 확인',
          '2. Jenkins 빌드 시작',
          '3. 레포지토리 클론',
          '4. 의존성 설치',
          `5. ${scenario.error_stage} 단계에서 실패`,
          '6. 빌드 중단'
        ]),
        `${scenario.failure_reason}을 해결하기 위해 다음 사항을 확인해주세요:\n- 코드 문법 및 로직 검토\n- 의존성 버전 호환성 확인\n- 환경 설정 및 변수 점검\n- 테스트 케이스 검증\n\n해결 후 배포 재요청 필요`,
        adminUsers[0].id
      ]);
      
      const issueReportId = issueReportResult.rows[0].id;
      
      console.log(`   📋 자동 이슈 레포트 생성 완료 (담당 PE: ${assignedPE.full_name})`);
      console.log(`   🔗 빌드 로그: ${scenario.log_url}`);
      console.log(`   📊 워크플로우 완료: 프로젝트 생성 → 승인 → PO할당 → PE할당 → QA → 배포요청 → 빌드실패 → 이슈생성\n`);
    }
    
    await client.query('COMMIT');
    
    console.log('🎉 완전한 워크플로우 시뮬레이션 완료!');
    console.log('\n📊 생성된 데이터:');
    console.log(`   - 프로젝트: ${sampleProjects.length}개`);
    console.log(`   - 빌드 실패: ${sampleProjects.length}개`);
    console.log(`   - 이슈 레포트: ${sampleProjects.length}개`);
    console.log(`   - 완료 보고서: ${sampleProjects.length}개`);
    console.log(`   - QC/QA 검증: ${qaUsers.length > 0 ? sampleProjects.length : 0}개`);
    console.log(`   - 관리자 승인: ${adminUsers.length > 0 ? sampleProjects.length : 0}개`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 워크플로우 시뮬레이션 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
createCompleteWorkflowSimulation()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
