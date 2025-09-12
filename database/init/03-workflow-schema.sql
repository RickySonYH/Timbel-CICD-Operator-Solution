-- [advice from AI] 업무 프로세스 시스템을 위한 데이터베이스 스키마
-- 업무 프로세스 가이드 Phase 1-8에 따른 테이블 설계

-- 프로젝트 관리 테이블
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    customer_company VARCHAR(200),
    requirements TEXT,
    expected_duration INTEGER, -- 예상 기간 (일)
    budget DECIMAL(15,2),
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    status VARCHAR(20) DEFAULT 'planning', -- planning, active, qa, deployment, completed, paused, cancelled
    created_by UUID REFERENCES timbel_users(id),
    assigned_po UUID REFERENCES timbel_users(id), -- 담당 PO
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 프로젝트 마일스톤 테이블 (프로토타입/MVT/DVT)
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    milestone_type VARCHAR(20) NOT NULL, -- prototype, mvt, dvt, production
    target_date DATE NOT NULL,
    actual_completion_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, delayed
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 프로젝트 담당자 배정 테이블
CREATE TABLE project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES timbel_users(id),
    role VARCHAR(50) NOT NULL, -- po, pe, qa, operations, manager
    work_percentage INTEGER DEFAULT 100, -- 업무 비중 (%)
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, removed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 개발 지시서 테이블
CREATE TABLE development_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL, -- 마크다운 형태
    template_type VARCHAR(50), -- requirements, specification, technical
    status VARCHAR(20) DEFAULT 'draft', -- draft, review, approved, distributed
    created_by UUID REFERENCES timbel_users(id),
    assigned_pe UUID REFERENCES timbel_users(id),
    work_percentage INTEGER DEFAULT 100,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    priority VARCHAR(20) DEFAULT 'medium',
    dependencies JSONB, -- 선행작업 의존성
    attachments JSONB, -- 첨부파일 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 지시서 승인 워크플로우 테이블
CREATE TABLE instruction_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instruction_id UUID REFERENCES development_instructions(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES timbel_users(id),
    status VARCHAR(20) NOT NULL, -- pending, approved, rejected
    feedback TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- GitHub 연동 정보 테이블
CREATE TABLE github_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    repository_url VARCHAR(500) NOT NULL,
    repository_name VARCHAR(200) NOT NULL,
    branch VARCHAR(100) DEFAULT 'main',
    github_token VARCHAR(500), -- 암호화된 토큰
    webhook_secret VARCHAR(500),
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'active', -- active, error, disabled
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 개발 진행률 추적 테이블
CREATE TABLE development_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instruction_id UUID REFERENCES development_instructions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES timbel_users(id),
    progress_percentage INTEGER DEFAULT 0,
    commit_count INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    last_commit_hash VARCHAR(100),
    last_commit_message TEXT,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 주간 보고서 테이블
CREATE TABLE weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES timbel_users(id),
    project_id UUID REFERENCES projects(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    achievements TEXT, -- 주요 성과
    progress_summary TEXT, -- 진행 사항
    issues_challenges TEXT, -- 이슈 및 도전과제
    next_week_plan TEXT, -- 다음 주 계획
    github_stats JSONB, -- GitHub 활동 통계
    attachments JSONB, -- 첨부파일
    status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, reviewed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 완료 보고서 테이블
CREATE TABLE completion_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    instruction_id UUID REFERENCES development_instructions(id),
    report_type VARCHAR(50) NOT NULL, -- handover, completion, qa_ready
    content TEXT NOT NULL,
    deliverables JSONB, -- 산출물 목록
    technical_stack JSONB, -- 사용된 기술 스택
    api_endpoints JSONB, -- API 엔드포인트 목록
    deployment_info JSONB, -- 배포 정보
    known_issues JSONB, -- 알려진 이슈
    recommendations TEXT, -- 권장사항
    created_by UUID REFERENCES timbel_users(id),
    status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 테스트 케이스 테이블
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    instruction_id UUID REFERENCES development_instructions(id),
    test_name VARCHAR(300) NOT NULL,
    test_description TEXT,
    test_type VARCHAR(50) NOT NULL, -- functional, integration, performance, security
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    test_steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, passed, failed, blocked
    created_by UUID REFERENCES timbel_users(id),
    executed_by UUID REFERENCES timbel_users(id),
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 버그 리포트 테이블
CREATE TABLE bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id),
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- critical, high, medium, low
    priority VARCHAR(20) NOT NULL, -- urgent, high, medium, low
    status VARCHAR(20) DEFAULT 'open', -- open, assigned, in_progress, resolved, closed
    reporter_id UUID REFERENCES timbel_users(id),
    assignee_id UUID REFERENCES timbel_users(id),
    component VARCHAR(100),
    version VARCHAR(50),
    environment VARCHAR(50),
    steps_to_reproduce TEXT,
    expected_result TEXT,
    actual_result TEXT,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- CI/CD 파이프라인 테이블
CREATE TABLE cicd_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    pipeline_name VARCHAR(200) NOT NULL,
    pipeline_type VARCHAR(50) NOT NULL, -- build, test, deploy
    environment VARCHAR(50) NOT NULL, -- dev, staging, prod
    deployment_strategy VARCHAR(50) DEFAULT 'rolling', -- rolling, blue_green, canary
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, error
    config JSONB, -- 파이프라인 설정
    last_run_at TIMESTAMP,
    last_status VARCHAR(20), -- success, failed, running
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 테넌시 관리 테이블
CREATE TABLE tenant_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    tenant_name VARCHAR(200) NOT NULL,
    environment VARCHAR(50) NOT NULL, -- dev, staging, prod
    cloud_provider VARCHAR(50), -- aws, azure, gcp, ncp
    region VARCHAR(100),
    namespace VARCHAR(100),
    resource_limits JSONB, -- 리소스 제한
    backup_policy JSONB, -- 백업 정책
    sla_config JSONB, -- SLA 설정
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, maintenance
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 알림 및 이벤트 테이블
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES timbel_users(id),
    project_id UUID REFERENCES projects(id),
    type VARCHAR(50) NOT NULL, -- deadline, milestone, bug, approval, etc.
    title VARCHAR(300) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    status VARCHAR(20) DEFAULT 'unread', -- unread, read, archived
    action_url VARCHAR(500), -- 클릭 시 이동할 URL
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_po ON projects(assigned_po);
CREATE INDEX idx_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_assignments_user ON project_assignments(user_id);
CREATE INDEX idx_instructions_project ON development_instructions(project_id);
CREATE INDEX idx_instructions_pe ON development_instructions(assigned_pe);
CREATE INDEX idx_progress_instruction ON development_progress(instruction_id);
CREATE INDEX idx_reports_user ON weekly_reports(user_id);
CREATE INDEX idx_reports_project ON weekly_reports(project_id);
CREATE INDEX idx_test_cases_project ON test_cases(project_id);
CREATE INDEX idx_bug_reports_project ON bug_reports(project_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- 댓글 및 코멘트 테이블
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- project, instruction, test_case, bug_report
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES timbel_users(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id), -- 대댓글 지원
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 파일 첨부 테이블
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE projects IS '프로젝트 관리 테이블';
COMMENT ON TABLE project_milestones IS '프로젝트 마일스톤 관리 (프로토/MVT/DVT)';
COMMENT ON TABLE project_assignments IS '프로젝트 담당자 배정';
COMMENT ON TABLE development_instructions IS '개발 지시서 관리';
COMMENT ON TABLE instruction_approvals IS '지시서 승인 워크플로우';
COMMENT ON TABLE github_integrations IS 'GitHub 연동 정보';
COMMENT ON TABLE development_progress IS '개발 진행률 추적';
-- ===== Phase 4: 완료 및 인수인계 시스템 - 테스트 환경 자동 구성 =====

-- [advice from AI] 테스트 환경 테이블
CREATE TABLE test_environments (
    id VARCHAR(100) PRIMARY KEY, -- test-{type}-{timestamp} 형식
    name VARCHAR(200) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    environment_type VARCHAR(50) NOT NULL, -- unit, integration, performance, security, e2e
    status VARCHAR(20) DEFAULT 'creating', -- creating, active, inactive, error, deleting
    cloud_provider VARCHAR(50) NOT NULL, -- aws, ncp, azure, gcp
    region VARCHAR(100) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    services JSONB, -- ['app', 'database', 'redis', ...]
    test_config JSONB, -- 테스트 설정 정보
    deployment_id VARCHAR(100), -- ECP-AI 배포 ID
    health_status VARCHAR(20) DEFAULT 'unknown', -- healthy, unhealthy, unknown
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_test_env_type CHECK (environment_type IN ('unit', 'integration', 'performance', 'security', 'e2e')),
    CONSTRAINT chk_test_env_status CHECK (status IN ('creating', 'active', 'inactive', 'error', 'deleting')),
    CONSTRAINT chk_test_env_provider CHECK (cloud_provider IN ('aws', 'ncp', 'azure', 'gcp')),
    CONSTRAINT chk_test_env_health CHECK (health_status IN ('healthy', 'unhealthy', 'unknown'))
);

-- [advice from AI] 테스트 스위트 테이블
CREATE TABLE test_suites (
    id VARCHAR(100) PRIMARY KEY, -- suite-{timestamp} 형식
    name VARCHAR(200) NOT NULL,
    environment_id VARCHAR(100) REFERENCES test_environments(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL, -- unit, integration, performance, security, e2e
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    test_cases INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0, -- 초 단위
    last_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_test_suite_type CHECK (test_type IN ('unit', 'integration', 'performance', 'security', 'e2e')),
    CONSTRAINT chk_test_suite_status CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- [advice from AI] 테스트 케이스 테이블 (기존 테이블과 구분)
CREATE TABLE test_suite_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id VARCHAR(100) REFERENCES test_suites(id) ON DELETE CASCADE,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    test_type VARCHAR(50) NOT NULL, -- functional, performance, security, integration
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, passed, failed, skipped
    execution_time INTEGER, -- 밀리초 단위
    error_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_test_suite_case_type CHECK (test_type IN ('functional', 'performance', 'security', 'integration')),
    CONSTRAINT chk_test_suite_case_priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT chk_test_suite_case_status CHECK (status IN ('pending', 'running', 'passed', 'failed', 'skipped'))
);

-- [advice from AI] 테스트 결과 테이블
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id VARCHAR(100) REFERENCES test_suites(id) ON DELETE CASCADE,
    case_id UUID REFERENCES test_suite_cases(id) ON DELETE CASCADE,
    environment_id VARCHAR(100) REFERENCES test_environments(id) ON DELETE CASCADE,
    execution_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL, -- passed, failed, skipped, error
    duration INTEGER, -- 밀리초 단위
    error_message TEXT,
    stack_trace TEXT,
    screenshots JSONB, -- 스크린샷 URL 배열
    logs JSONB, -- 로그 파일 URL 배열
    metrics JSONB, -- 성능 메트릭 (응답시간, 메모리 사용량 등)
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_test_result_status CHECK (status IN ('passed', 'failed', 'skipped', 'error'))
);

-- [advice from AI] 테스트 환경 모니터링 테이블
CREATE TABLE test_environment_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id VARCHAR(100) REFERENCES test_environments(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- cpu, memory, disk, network, response_time
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- %, MB, ms, etc.
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_metric_type CHECK (metric_type IN ('cpu', 'memory', 'disk', 'network', 'response_time'))
);

-- [advice from AI] 테스트 환경 관련 인덱스
CREATE INDEX idx_test_env_project ON test_environments(project_id);
CREATE INDEX idx_test_env_type ON test_environments(environment_type);
CREATE INDEX idx_test_env_status ON test_environments(status);
CREATE INDEX idx_test_env_health ON test_environments(health_status);
CREATE INDEX idx_test_suites_env ON test_suites(environment_id);
CREATE INDEX idx_test_suites_status ON test_suites(status);
CREATE INDEX idx_test_suite_cases_suite ON test_suite_cases(suite_id);
CREATE INDEX idx_test_suite_cases_status ON test_suite_cases(status);
CREATE INDEX idx_test_results_suite ON test_results(suite_id);
CREATE INDEX idx_test_results_case ON test_results(case_id);
CREATE INDEX idx_test_results_env ON test_results(environment_id);
CREATE INDEX idx_test_metrics_env ON test_environment_metrics(environment_id);
CREATE INDEX idx_test_metrics_type ON test_environment_metrics(metric_type);
CREATE INDEX idx_test_metrics_timestamp ON test_environment_metrics(timestamp);

-- ===== Phase 5: QA/QC 시스템 =====

-- [advice from AI] QA 테스트 케이스 테이블 (기존 test_cases와 구분)
CREATE TABLE qa_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    test_suite_id VARCHAR(100) REFERENCES test_suites(id) ON DELETE CASCADE,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    test_type VARCHAR(50) NOT NULL, -- functional, integration, performance, security, regression
    priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    status VARCHAR(20) DEFAULT 'draft', -- draft, ready, running, passed, failed, blocked
    preconditions TEXT,
    test_steps JSONB, -- 테스트 단계 배열
    expected_result TEXT,
    actual_result TEXT,
    test_data JSONB, -- 테스트 데이터
    environment_requirements JSONB, -- 환경 요구사항
    assigned_to UUID REFERENCES timbel_users(id),
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_qa_test_case_type CHECK (test_type IN ('functional', 'integration', 'performance', 'security', 'regression')),
    CONSTRAINT chk_qa_test_case_priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT chk_qa_test_case_status CHECK (status IN ('draft', 'ready', 'running', 'passed', 'failed', 'blocked'))
);

-- [advice from AI] 버그 관리 테이블
CREATE TABLE bug_reports (
    id VARCHAR(100) PRIMARY KEY, -- BUG-{timestamp} 형식
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES qa_test_cases(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- critical, high, medium, low
    priority VARCHAR(20) NOT NULL, -- urgent, high, medium, low
    status VARCHAR(20) DEFAULT 'open', -- open, assigned, in_progress, resolved, closed, rejected
    bug_type VARCHAR(50) NOT NULL, -- functional, performance, security, ui, compatibility
    environment VARCHAR(100),
    browser VARCHAR(100),
    os VARCHAR(100),
    steps_to_reproduce TEXT,
    expected_result TEXT,
    actual_result TEXT,
    attachments JSONB, -- 스크린샷, 로그 파일 등
    assigned_to UUID REFERENCES timbel_users(id),
    reported_by UUID REFERENCES timbel_users(id),
    resolved_by UUID REFERENCES timbel_users(id),
    resolution TEXT,
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_bug_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT chk_bug_priority CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    CONSTRAINT chk_bug_status CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected')),
    CONSTRAINT chk_bug_type CHECK (bug_type IN ('functional', 'performance', 'security', 'ui', 'compatibility'))
);

-- [advice from AI] 이슈 트래킹 테이블
CREATE TABLE issue_tracking (
    id VARCHAR(100) PRIMARY KEY, -- ISSUE-{timestamp} 형식
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    bug_id VARCHAR(100) REFERENCES bug_reports(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    issue_type VARCHAR(50) NOT NULL, -- bug, enhancement, task, question
    status VARCHAR(20) DEFAULT 'open', -- open, assigned, in_progress, resolved, closed
    priority VARCHAR(20) DEFAULT 'medium', -- urgent, high, medium, low
    labels JSONB, -- ['frontend', 'backend', 'database', 'ui'] 등
    assigned_to UUID REFERENCES timbel_users(id),
    reporter_id UUID REFERENCES timbel_users(id),
    assignee_id UUID REFERENCES timbel_users(id),
    due_date TIMESTAMP,
    resolution TEXT,
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_issue_type CHECK (issue_type IN ('bug', 'enhancement', 'task', 'question')),
    CONSTRAINT chk_issue_status CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    CONSTRAINT chk_issue_priority CHECK (priority IN ('urgent', 'high', 'medium', 'low'))
);

-- [advice from AI] QA 승인 워크플로우 테이블
CREATE TABLE qa_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    test_suite_id VARCHAR(100) REFERENCES test_suites(id) ON DELETE CASCADE,
    approval_type VARCHAR(50) NOT NULL, -- test_approval, release_approval, emergency_approval
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, conditional
    conditions TEXT, -- 조건부 승인 시 조건
    approved_by UUID REFERENCES timbel_users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    comments TEXT,
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_approval_type CHECK (approval_type IN ('test_approval', 'release_approval', 'emergency_approval')),
    CONSTRAINT chk_approval_status CHECK (status IN ('pending', 'approved', 'rejected', 'conditional'))
);

-- [advice from AI] 테스트 실행 로그 테이블
CREATE TABLE test_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id UUID REFERENCES qa_test_cases(id) ON DELETE CASCADE,
    test_suite_id VARCHAR(100) REFERENCES test_suites(id) ON DELETE CASCADE,
    environment_id VARCHAR(100) REFERENCES test_environments(id) ON DELETE CASCADE,
    execution_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL, -- passed, failed, skipped, error
    duration INTEGER, -- 밀리초 단위
    error_message TEXT,
    stack_trace TEXT,
    screenshots JSONB, -- 스크린샷 URL 배열
    logs JSONB, -- 로그 파일 URL 배열
    metrics JSONB, -- 성능 메트릭
    executed_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_execution_status CHECK (status IN ('passed', 'failed', 'skipped', 'error'))
);

-- [advice from AI] QA 관련 인덱스
CREATE INDEX idx_qa_test_cases_project ON qa_test_cases(project_id);
CREATE INDEX idx_qa_test_cases_suite ON qa_test_cases(test_suite_id);
CREATE INDEX idx_qa_test_cases_status ON qa_test_cases(status);
CREATE INDEX idx_qa_test_cases_assigned ON qa_test_cases(assigned_to);
CREATE INDEX idx_bug_reports_project ON bug_reports(project_id);
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_severity ON bug_reports(severity);
CREATE INDEX idx_bug_reports_assigned ON bug_reports(assigned_to);
CREATE INDEX idx_issue_tracking_project ON issue_tracking(project_id);
CREATE INDEX idx_issue_tracking_status ON issue_tracking(status);
CREATE INDEX idx_issue_tracking_type ON issue_tracking(issue_type);
CREATE INDEX idx_issue_tracking_assigned ON issue_tracking(assigned_to);
CREATE INDEX idx_qa_approvals_project ON qa_approvals(project_id);
CREATE INDEX idx_qa_approvals_status ON qa_approvals(status);
CREATE INDEX idx_test_execution_logs_case ON test_execution_logs(test_case_id);
CREATE INDEX idx_test_execution_logs_suite ON test_execution_logs(test_suite_id);
CREATE INDEX idx_test_execution_logs_time ON test_execution_logs(execution_time);

COMMENT ON TABLE weekly_reports IS '주간 보고서';
COMMENT ON TABLE completion_reports IS '완료 보고서';
COMMENT ON TABLE test_cases IS '테스트 케이스 관리';
COMMENT ON TABLE bug_reports IS '버그 리포트 관리';
COMMENT ON TABLE cicd_pipelines IS 'CI/CD 파이프라인 관리';
COMMENT ON TABLE tenant_management IS '테넌시 관리';
COMMENT ON TABLE notifications IS '알림 및 이벤트';
COMMENT ON TABLE comments IS '댓글 및 코멘트';
COMMENT ON TABLE attachments IS '파일 첨부';
COMMENT ON TABLE test_environments IS '테스트 환경 자동 구성';
COMMENT ON TABLE test_suites IS '테스트 스위트 관리';
COMMENT ON TABLE test_suite_cases IS '테스트 스위트 케이스';
COMMENT ON TABLE test_results IS '테스트 실행 결과';
COMMENT ON TABLE test_environment_metrics IS '테스트 환경 모니터링 메트릭';
COMMENT ON TABLE qa_test_cases IS 'QA 테스트 케이스 관리';
COMMENT ON TABLE bug_reports IS '버그 리포트 관리 (Phase 5)';
COMMENT ON TABLE issue_tracking IS '이슈 트래킹 시스템';
COMMENT ON TABLE qa_approvals IS 'QA 승인 워크플로우';
COMMENT ON TABLE test_execution_logs IS '테스트 실행 로그';
