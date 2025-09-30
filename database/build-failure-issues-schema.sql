-- [advice from AI] 젠킨스 빌드 실패 이슈 레포트 관리 테이블 스키마

-- 빌드 실패 정보 테이블
CREATE TABLE IF NOT EXISTS build_failures (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL,
    build_number INTEGER NOT NULL,
    repository_url TEXT,
    branch VARCHAR(255) DEFAULT 'main',
    commit_sha VARCHAR(255),
    commit_message TEXT,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration INTEGER, -- 빌드 소요 시간 (밀리초)
    
    -- 오류 정보
    error_type VARCHAR(50) DEFAULT 'unknown', -- compilation, test, dependency, deployment, timeout, unknown
    error_stage VARCHAR(100), -- 실패한 빌드 단계
    error_message TEXT,
    stack_trace TEXT,
    
    -- 로그 및 첨부파일
    log_url TEXT,
    screenshot_url TEXT,
    
    -- 프로젝트 연관
    project_id UUID REFERENCES projects(id),
    assigned_pe UUID REFERENCES timbel_users(id),
    
    -- 이슈 생성 여부
    issue_created BOOLEAN DEFAULT FALSE,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(job_name, build_number)
);

-- 이슈 레포트 테이블
CREATE TABLE IF NOT EXISTS issue_reports (
    id SERIAL PRIMARY KEY,
    build_failure_id INTEGER REFERENCES build_failures(id) ON DELETE CASCADE,
    
    -- 기본 정보
    title VARCHAR(500) NOT NULL,
    description TEXT,
    error_category VARCHAR(50), -- compilation, test, dependency, deployment, timeout, unknown
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- 할당 및 상태
    assigned_to UUID REFERENCES timbel_users(id),
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
    
    -- 해결 정보
    resolution VARCHAR(50), -- fixed, duplicate, wont_fix, cannot_reproduce
    resolution_notes TEXT,
    resolved_by UUID REFERENCES timbel_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- 재현 단계 및 해결 방법
    reproduction_steps JSONB, -- 배열 형태로 저장
    suggested_solution TEXT,
    
    -- 메타데이터
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이슈 첨부파일 테이블
CREATE TABLE IF NOT EXISTS issue_attachments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issue_reports(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- screenshot, log, code, document
    url TEXT NOT NULL,
    description TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이슈 댓글 테이블
CREATE TABLE IF NOT EXISTS issue_comments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issue_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES timbel_users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이슈 상태 변경 히스토리 테이블
CREATE TABLE IF NOT EXISTS issue_status_history (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issue_reports(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    changed_by UUID REFERENCES timbel_users(id),
    change_reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PE 워크로드 추적 테이블 (이슈 할당 최적화용)
CREATE TABLE IF NOT EXISTS pe_workload_tracking (
    id SERIAL PRIMARY KEY,
    pe_id UUID REFERENCES timbel_users(id),
    date DATE DEFAULT CURRENT_DATE,
    open_issues INTEGER DEFAULT 0,
    in_progress_issues INTEGER DEFAULT 0,
    resolved_issues INTEGER DEFAULT 0,
    total_workload_score DECIMAL(5,2) DEFAULT 0, -- 심각도 기반 가중치 점수
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(pe_id, date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_build_failures_job_build ON build_failures(job_name, build_number);
CREATE INDEX IF NOT EXISTS idx_build_failures_failed_at ON build_failures(failed_at DESC);
CREATE INDEX IF NOT EXISTS idx_build_failures_project_id ON build_failures(project_id);
CREATE INDEX IF NOT EXISTS idx_build_failures_error_type ON build_failures(error_type);

CREATE INDEX IF NOT EXISTS idx_issue_reports_build_failure_id ON issue_reports(build_failure_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_assigned_to ON issue_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_severity ON issue_reports(severity);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue_id ON issue_attachments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_status_history_issue_id ON issue_status_history(issue_id);

CREATE INDEX IF NOT EXISTS idx_pe_workload_tracking_pe_date ON pe_workload_tracking(pe_id, date);

-- 트리거 함수: 이슈 상태 변경 시 히스토리 기록
CREATE OR REPLACE FUNCTION log_issue_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO issue_status_history (issue_id, from_status, to_status, changed_by, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.assigned_to, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_issue_status_change ON issue_reports;
CREATE TRIGGER trigger_issue_status_change
    AFTER UPDATE ON issue_reports
    FOR EACH ROW
    EXECUTE FUNCTION log_issue_status_change();

-- 트리거 함수: PE 워크로드 자동 업데이트
CREATE OR REPLACE FUNCTION update_pe_workload()
RETURNS TRIGGER AS $$
DECLARE
    target_pe_id INTEGER;
    target_date DATE := CURRENT_DATE;
BEGIN
    -- 새로운 이슈가 할당된 경우
    IF TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL THEN
        target_pe_id := NEW.assigned_to;
    -- 이슈 할당이 변경된 경우
    ELSIF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        -- 이전 PE 워크로드 업데이트
        IF OLD.assigned_to IS NOT NULL THEN
            PERFORM refresh_pe_workload(OLD.assigned_to, target_date);
        END IF;
        -- 새 PE 워크로드 업데이트
        IF NEW.assigned_to IS NOT NULL THEN
            target_pe_id := NEW.assigned_to;
        END IF;
    -- 이슈 상태가 변경된 경우
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.assigned_to IS NOT NULL THEN
        target_pe_id := NEW.assigned_to;
    -- 이슈가 삭제된 경우
    ELSIF TG_OP = 'DELETE' AND OLD.assigned_to IS NOT NULL THEN
        PERFORM refresh_pe_workload(OLD.assigned_to, target_date);
        RETURN OLD;
    END IF;
    
    -- 워크로드 업데이트
    IF target_pe_id IS NOT NULL THEN
        PERFORM refresh_pe_workload(target_pe_id, target_date);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- PE 워크로드 새로고침 함수
CREATE OR REPLACE FUNCTION refresh_pe_workload(pe_id INTEGER, target_date DATE)
RETURNS VOID AS $$
DECLARE
    open_count INTEGER;
    in_progress_count INTEGER;
    resolved_count INTEGER;
    workload_score DECIMAL(5,2);
BEGIN
    -- 현재 이슈 상태별 카운트
    SELECT 
        COUNT(CASE WHEN status = 'open' THEN 1 END),
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END),
        COUNT(CASE WHEN status = 'resolved' AND DATE(resolved_at) = target_date THEN 1 END)
    INTO open_count, in_progress_count, resolved_count
    FROM issue_reports
    WHERE assigned_to = pe_id;
    
    -- 워크로드 점수 계산 (심각도별 가중치 적용)
    SELECT 
        COALESCE(SUM(
            CASE severity
                WHEN 'critical' THEN 4.0
                WHEN 'high' THEN 2.0
                WHEN 'medium' THEN 1.0
                WHEN 'low' THEN 0.5
                ELSE 1.0
            END
        ), 0)
    INTO workload_score
    FROM issue_reports
    WHERE assigned_to = pe_id AND status IN ('open', 'in_progress');
    
    -- 워크로드 정보 업데이트 또는 삽입
    INSERT INTO pe_workload_tracking (
        pe_id, date, open_issues, in_progress_issues, resolved_issues, 
        total_workload_score, updated_at
    ) VALUES (
        pe_id, target_date, open_count, in_progress_count, resolved_count,
        workload_score, NOW()
    )
    ON CONFLICT (pe_id, date)
    DO UPDATE SET
        open_issues = EXCLUDED.open_issues,
        in_progress_issues = EXCLUDED.in_progress_issues,
        resolved_issues = EXCLUDED.resolved_issues,
        total_workload_score = EXCLUDED.total_workload_score,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_pe_workload ON issue_reports;
CREATE TRIGGER trigger_update_pe_workload
    AFTER INSERT OR UPDATE OR DELETE ON issue_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_pe_workload();

-- 샘플 데이터 삽입
INSERT INTO build_failures (
    job_name, build_number, repository_url, branch, commit_sha, commit_message,
    error_type, error_stage, error_message, stack_trace, log_url,
    failed_at, duration
) VALUES 
(
    'ecp-ai-k8s-orchestrator', 1, 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
    'main', 'abc123def456', 'Add new feature for multi-tenant support',
    'compilation', 'compile', 'Compilation failed: undefined variable "config"',
    'Error: config is not defined\n  at /src/config/index.js:15:3',
    'http://localhost:8080/job/ecp-ai-k8s-orchestrator/1/console',
    NOW() - INTERVAL '2 hours', 45000
),
(
    'timbel-frontend', 5, 'https://github.com/company/timbel-frontend',
    'develop', 'def456ghi789', 'Fix authentication bug',
    'test', 'test', 'Test suite failed: 3 tests failing',
    'AssertionError: expected true to be false\n  at /tests/auth.test.js:25:5',
    'http://localhost:8080/job/timbel-frontend/5/console',
    NOW() - INTERVAL '1 hour', 120000
),
(
    'api-gateway', 12, 'https://github.com/company/api-gateway',
    'feature/rate-limiting', 'ghi789jkl012', 'Implement rate limiting',
    'dependency', 'install', 'npm install failed: package not found',
    'npm ERR! 404 Not Found - GET https://registry.npmjs.org/non-existent-package',
    'http://localhost:8080/job/api-gateway/12/console',
    NOW() - INTERVAL '30 minutes', 30000
);

-- 샘플 이슈 레포트 (첫 번째 빌드 실패에 대해)
INSERT INTO issue_reports (
    build_failure_id, title, description, error_category, severity,
    assigned_to, status, reproduction_steps, suggested_solution, created_by
) VALUES (
    1,
    '[빌드 실패] ecp-ai-k8s-orchestrator #1 - compilation',
    '컴파일 단계에서 config 변수가 정의되지 않아 빌드가 실패했습니다.',
    'compilation',
    'high',
    (SELECT id FROM timbel_users WHERE role_type = 'pe' LIMIT 1),
    'open',
    '["1. 해당 브랜치를 로컬에 체크아웃", "2. npm run build 실행", "3. 컴파일 오류 확인"]',
    'config/index.js 파일에서 config 변수를 올바르게 정의하거나 import하세요.',
    (SELECT id FROM timbel_users WHERE role_type = 'admin' LIMIT 1)
);

-- 샘플 첨부파일
INSERT INTO issue_attachments (issue_id, type, url, description) VALUES 
(1, 'log', 'http://localhost:8080/job/ecp-ai-k8s-orchestrator/1/console', '빌드 로그'),
(1, 'screenshot', '/uploads/screenshots/build-failure-1.png', '오류 스크린샷');

-- 샘플 댓글
INSERT INTO issue_comments (issue_id, user_id, comment) VALUES 
(1, (SELECT id FROM timbel_users WHERE role_type = 'pe' LIMIT 1), '확인했습니다. config 파일 누락 문제로 보입니다. 수정 작업 시작하겠습니다.');

COMMENT ON TABLE build_failures IS '젠킨스 빌드 실패 정보';
COMMENT ON TABLE issue_reports IS '빌드 실패 이슈 레포트';
COMMENT ON TABLE issue_attachments IS '이슈 첨부파일';
COMMENT ON TABLE issue_comments IS '이슈 댓글';
COMMENT ON TABLE issue_status_history IS '이슈 상태 변경 히스토리';
COMMENT ON TABLE pe_workload_tracking IS 'PE 워크로드 추적';
