-- [advice from AI] 배포 요청서 관리 테이블 스키마
-- 개선된 PO 배포 요청 시스템을 위한 데이터베이스 스키마

-- 배포 요청서 테이블
CREATE TABLE IF NOT EXISTS deployment_requests (
    id SERIAL PRIMARY KEY,
    
    -- [advice from AI] 프로젝트 정보
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    repository_url TEXT,
    branch VARCHAR(100) DEFAULT 'main',
    
    -- [advice from AI] 성능 요구사항 설정
    calculation_mode VARCHAR(20) NOT NULL CHECK (calculation_mode IN ('channel', 'custom')),
    service_requirements JSONB, -- 채널 기반 서비스 요구사항
    custom_resources JSONB, -- 커스텀 리소스 설정
    calculated_resources JSONB, -- 계산된 하드웨어 리소스
    
    -- [advice from AI] 배포 환경
    deployment_environment VARCHAR(50) NOT NULL CHECK (deployment_environment IN ('development', 'staging', 'production')),
    
    -- [advice from AI] 비즈니스 우선순위
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    business_value INTEGER DEFAULT 50 CHECK (business_value >= 1 AND business_value <= 100),
    customer_impact VARCHAR(20) DEFAULT 'medium' CHECK (customer_impact IN ('low', 'medium', 'high')),
    revenue_impact VARCHAR(20) DEFAULT 'medium' CHECK (revenue_impact IN ('low', 'medium', 'high')),
    strategic_importance VARCHAR(20) DEFAULT 'medium' CHECK (strategic_importance IN ('low', 'medium', 'high')),
    
    -- [advice from AI] 배포 일정
    requested_date DATE,
    target_date DATE,
    maintenance_window VARCHAR(50) DEFAULT 'weekend',
    rollback_plan BOOLEAN DEFAULT true,
    
    -- [advice from AI] 요청 및 승인 정보
    requested_by UUID NOT NULL REFERENCES timbel_users(id),
    approved_by UUID REFERENCES timbel_users(id),
    assigned_to UUID REFERENCES timbel_users(id), -- 운영팀 담당자
    
    -- [advice from AI] 상태 관리
    status VARCHAR(30) DEFAULT 'pending_approval' CHECK (status IN (
        'pending_approval', 'approved', 'rejected', 'in_progress', 
        'deployed', 'completed', 'failed', 'cancelled'
    )),
    
    -- [advice from AI] 승인/반려 관련
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejection_reason TEXT,
    
    -- [advice from AI] 추가 정보
    additional_notes TEXT,
    
    -- [advice from AI] 메타데이터
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- [advice from AI] 배포 요청서 히스토리 테이블 (상태 변경 추적)
CREATE TABLE IF NOT EXISTS deployment_request_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES deployment_requests(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID NOT NULL REFERENCES timbel_users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- [advice from AI] 배포 요청서 첨부파일 테이블
CREATE TABLE IF NOT EXISTS deployment_request_attachments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES deployment_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- [advice from AI] 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deployment_requests_status ON deployment_requests(status);
CREATE INDEX IF NOT EXISTS idx_deployment_requests_urgency ON deployment_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_deployment_requests_environment ON deployment_requests(deployment_environment);
CREATE INDEX IF NOT EXISTS idx_deployment_requests_requested_by ON deployment_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_deployment_requests_approved_by ON deployment_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_deployment_requests_assigned_to ON deployment_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deployment_requests_created_at ON deployment_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_deployment_request_history_request_id ON deployment_request_history(request_id);

-- [advice from AI] 상태 변경 히스토리 자동 기록 트리거
CREATE OR REPLACE FUNCTION log_deployment_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태가 변경된 경우에만 히스토리 기록
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO deployment_request_history (
            request_id,
            previous_status,
            new_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.approved_by, -- 승인자 또는 변경자
            CASE 
                WHEN NEW.status = 'approved' THEN NEW.approval_notes
                WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
                ELSE '상태 변경'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [advice from AI] 트리거 생성
DROP TRIGGER IF EXISTS deployment_request_status_change_trigger ON deployment_requests;
CREATE TRIGGER deployment_request_status_change_trigger
    AFTER UPDATE ON deployment_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_deployment_request_status_change();

-- [advice from AI] 샘플 데이터 (개발용)
INSERT INTO deployment_requests (
    project_name,
    repository_url,
    branch,
    calculation_mode,
    service_requirements,
    deployment_environment,
    urgency,
    business_value,
    customer_impact,
    revenue_impact,
    strategic_importance,
    requested_date,
    target_date,
    maintenance_window,
    requested_by,
    status,
    additional_notes
) VALUES 
(
    'ECP-AI K8s Orchestrator',
    'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
    'main',
    'channel',
    '{"callbot": {"value": 100, "max": 500, "color": "#9c27b0", "unit": "채널", "description": "콜센터 음성봇 동시 처리 채널"}, "chatbot": {"value": 500, "max": 2000, "color": "#ff9800", "unit": "사용자", "description": "챗봇 동시 접속 사용자"}}',
    'production',
    'high',
    85,
    'high',
    'high',
    'high',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    'weekend',
    (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1),
    'pending_approval',
    '고객사 요청으로 인한 긴급 배포 필요'
),
(
    'Timbel Project Management Solution',
    'https://github.com/timbel/project-management',
    'develop',
    'custom',
    NULL,
    'staging',
    'medium',
    70,
    'medium',
    'medium',
    'high',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    'weeknight',
    (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1),
    'pending_approval',
    '새로운 기능 테스트를 위한 스테이징 환경 배포'
);

-- [advice from AI] 권한 설정
GRANT SELECT, INSERT, UPDATE, DELETE ON deployment_requests TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployment_request_history TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployment_request_attachments TO timbel_user;
GRANT USAGE, SELECT ON SEQUENCE deployment_requests_id_seq TO timbel_user;
GRANT USAGE, SELECT ON SEQUENCE deployment_request_history_id_seq TO timbel_user;
GRANT USAGE, SELECT ON SEQUENCE deployment_request_attachments_id_seq TO timbel_user;
