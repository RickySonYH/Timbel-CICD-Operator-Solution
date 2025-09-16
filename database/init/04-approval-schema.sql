-- [advice from AI] 승인 체계 데이터베이스 스키마
-- 개발/배포/QC 승인 워크플로우를 위한 테이블 구조

-- departments 테이블 (부서 정보)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- projects 테이블이 이미 있으므로 컬럼 추가만
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='department_id') THEN
        ALTER TABLE projects ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;
END $$;

-- 승인 요청 테이블
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('code_component', 'solution_deployment', 'prototype_qc', 'release_approval', 'bug_fix', 'architecture_change')),
    qc_stage VARCHAR(50) CHECK (qc_stage IN ('prototype_review', 'bug_verification', 'final_approval')),
    category VARCHAR(100),
    component_id UUID,
    component_name VARCHAR(200),
    version VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
    requester_id UUID NOT NULL REFERENCES timbel_users(id),
    department_id UUID REFERENCES departments(id),
    project_id UUID REFERENCES projects(id),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 승인자 할당 테이블
CREATE TABLE IF NOT EXISTS approval_assignments (
    id SERIAL PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES approval_requests(request_id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES timbel_users(id),
    level INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    assigned_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    response_comment TEXT,
    response_metadata JSONB DEFAULT '{}',
    timeout_hours INTEGER DEFAULT 24,
    escalation_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 의사결정 요청 테이블
CREATE TABLE IF NOT EXISTS decision_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('policy', 'strategy', 'budget', 'resource', 'technical', 'other')),
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'voting', 'decided', 'cancelled', 'expired')),
    requester_id UUID NOT NULL REFERENCES timbel_users(id),
    department_id UUID REFERENCES departments(id),
    project_id UUID REFERENCES projects(id),
    due_date TIMESTAMP,
    voting_deadline TIMESTAMP,
    decision_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 의사결정 참여자 테이블
CREATE TABLE IF NOT EXISTS decision_participants (
    id SERIAL PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES decision_requests(request_id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES timbel_users(id),
    role VARCHAR(20) DEFAULT 'voter' CHECK (role IN ('voter', 'advisor', 'observer', 'decision_maker')),
    invited_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'voted')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 의사결정 투표 테이블
CREATE TABLE IF NOT EXISTS decision_votes (
    id SERIAL PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES decision_requests(request_id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES timbel_users(id),
    vote VARCHAR(20) NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain', 'conditional')),
    vote_comment TEXT,
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
    voted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(request_id, participant_id)
);

-- 승인/의사결정 메시지 테이블
CREATE TABLE IF NOT EXISTS approval_messages (
    id SERIAL PRIMARY KEY,
    message_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    request_id UUID, -- approval_requests 또는 decision_requests의 request_id
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('approval', 'decision')),
    sender_id UUID NOT NULL REFERENCES timbel_users(id),
    recipient_id UUID REFERENCES timbel_users(id),
    subject VARCHAR(500),
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('request', 'response', 'reminder', 'escalation', 'notification', 'comment')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 승인 댓글 테이블
CREATE TABLE IF NOT EXISTS approval_comments (
    id SERIAL PRIMARY KEY,
    comment_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('approval', 'decision')),
    author_id UUID NOT NULL REFERENCES timbel_users(id),
    parent_comment_id UUID REFERENCES approval_comments(comment_id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 승인 로그 테이블
CREATE TABLE IF NOT EXISTS approval_logs (
    id SERIAL PRIMARY KEY,
    request_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'assigned', 'approved', 'rejected', 'escalated', 'cancelled', 'expired', 'commented')),
    actor_id UUID NOT NULL REFERENCES timbel_users(id),
    target_id UUID REFERENCES timbel_users(id),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 알림 설정 테이블
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES timbel_users(id),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'push', 'in_app', 'sms')),
    is_enabled BOOLEAN DEFAULT true,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notification_type, channel)
);

-- 승인 워크플로우 템플릿 테이블
CREATE TABLE IF NOT EXISTS approval_workflow_templates (
    id SERIAL PRIMARY KEY,
    template_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('code_component', 'solution_deployment', 'prototype_qc', 'release_approval', 'bug_fix', 'architecture_change')),
    department_id UUID REFERENCES departments(id),
    workflow_steps JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_priority ON approval_requests(priority);
CREATE INDEX IF NOT EXISTS idx_approval_requests_due_date ON approval_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_approval_assignments_approver ON approval_assignments(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_assignments_status ON approval_assignments(status);
CREATE INDEX IF NOT EXISTS idx_approval_assignments_request ON approval_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_decision_requests_requester ON decision_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_decision_requests_status ON decision_requests(status);
CREATE INDEX IF NOT EXISTS idx_decision_participants_participant ON decision_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_decision_participants_request ON decision_participants(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_messages_recipient ON approval_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_approval_messages_request ON approval_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_messages_sender ON approval_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_request ON approval_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_author ON approval_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_request ON approval_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_actor ON approval_logs(actor_id);

-- 기본 부서 데이터 삽입
INSERT INTO departments (name, description) VALUES 
('개발팀', '소프트웨어 개발 및 코드 관리'),
('QA팀', '품질 보증 및 테스트'),
('운영팀', '시스템 운영 및 인프라 관리'),
('기획팀', '프로젝트 기획 및 관리'),
('경영진', '최고 관리자 및 의사결정')
ON CONFLICT (name) DO NOTHING;

-- 기본 사용자 알림 설정
INSERT INTO user_notification_preferences (user_id, notification_type, channel, is_enabled, frequency) 
SELECT id, 'approval_request', 'email', true, 'immediate'
FROM timbel_users 
ON CONFLICT (user_id, notification_type, channel) DO NOTHING;

INSERT INTO user_notification_preferences (user_id, notification_type, channel, is_enabled, frequency) 
SELECT id, 'approval_response', 'email', true, 'immediate'
FROM timbel_users 
ON CONFLICT (user_id, notification_type, channel) DO NOTHING;

INSERT INTO user_notification_preferences (user_id, notification_type, channel, is_enabled, frequency) 
SELECT id, 'decision_request', 'email', true, 'immediate'
FROM timbel_users 
ON CONFLICT (user_id, notification_type, channel) DO NOTHING;

-- 기본 승인 워크플로우 템플릿
INSERT INTO approval_workflow_templates (name, description, type, workflow_steps, created_by) 
SELECT 
    '코드 컴포넌트 승인 워크플로우',
    'PE가 개발한 코드 컴포넌트의 승인을 위한 기본 워크플로우',
    'code_component',
    '[
        {
            "step_order": 1,
            "step_name": "PE 리드 검토",
            "approver_type": "pe_lead",
            "is_required": true,
            "timeout_hours": 24
        }
    ]'::jsonb,
    id
FROM timbel_users 
WHERE role_type = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO approval_workflow_templates (name, description, type, workflow_steps, created_by) 
SELECT 
    '솔루션 배포 승인 워크플로우',
    '솔루션 배포를 위한 다단계 승인 워크플로우',
    'solution_deployment',
    '[
        {
            "step_order": 1,
            "step_name": "PE 리드 검토",
            "approver_type": "pe_lead",
            "is_required": true,
            "timeout_hours": 24
        },
        {
            "step_order": 2,
            "step_name": "QA 매니저 승인",
            "approver_type": "qa_manager",
            "is_required": true,
            "timeout_hours": 48
        },
        {
            "step_order": 3,
            "step_name": "운영팀 승인",
            "approver_type": "ops_manager",
            "is_required": true,
            "timeout_hours": 24
        }
    ]'::jsonb,
    id
FROM timbel_users 
WHERE role_type = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO approval_workflow_templates (name, description, type, workflow_steps, created_by) 
SELECT 
    '출시 승인 워크플로우',
    '최종 출시를 위한 승인 워크플로우',
    'release_approval',
    '[
        {
            "step_order": 1,
            "step_name": "QA 매니저 최종 검토",
            "approver_type": "qa_manager",
            "is_required": true,
            "timeout_hours": 24
        },
        {
            "step_order": 2,
            "step_name": "PO 승인",
            "approver_type": "po",
            "is_required": true,
            "timeout_hours": 48
        },
        {
            "step_order": 3,
            "step_name": "운영팀 배포 승인",
            "approver_type": "ops_manager",
            "is_required": true,
            "timeout_hours": 24
        }
    ]'::jsonb,
    id
FROM timbel_users 
WHERE role_type = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- 테스트용 샘플 데이터 생성
-- 테스트 승인 요청들
INSERT INTO approval_requests (
    title, description, type, component_name, version, priority, 
    requester_id, department_id, due_date
) 
SELECT 
    '테스트 컴포넌트 v1.0 배포 승인',
    'React 테스트 컴포넌트의 프로덕션 배포를 위한 승인 요청입니다.',
    'code_component',
    'TestComponent',
    '1.0.0',
    'medium',
    u.id,
    d.id,
    NOW() + INTERVAL '3 days'
FROM timbel_users u, departments d
WHERE u.username = 'peuser' AND d.name = '개발팀'
ON CONFLICT DO NOTHING;

INSERT INTO approval_requests (
    title, description, type, component_name, version, priority, 
    requester_id, department_id, due_date
) 
SELECT 
    '사용자 인증 시스템 아키텍처 변경',
    'JWT 토큰 기반 인증 시스템으로의 아키텍처 변경 승인 요청입니다.',
    'architecture_change',
    'AuthSystem',
    '2.0.0',
    'urgent',
    u.id,
    d.id,
    NOW() + INTERVAL '7 days'
FROM timbel_users u, departments d
WHERE u.username = 'admin' AND d.name = '개발팀'
ON CONFLICT DO NOTHING;

INSERT INTO approval_requests (
    title, description, type, priority, 
    requester_id, department_id, due_date
) 
SELECT 
    '버그 수정 v1.1.1 배포',
    '긴급 보안 버그 수정 사항의 즉시 배포 승인 요청입니다.',
    'bug_fix',
    'high',
    u.id,
    d.id,
    NOW() + INTERVAL '1 day'
FROM timbel_users u, departments d
WHERE u.username = 'qauser' AND d.name = 'QA팀'
ON CONFLICT DO NOTHING;

-- 테스트용 승인자 할당
-- 첫 번째 요청 (TestComponent)의 승인자 할당
INSERT INTO approval_assignments (request_id, approver_id, level, timeout_hours)
SELECT 
    ar.request_id,
    u.id,
    1,
    24
FROM approval_requests ar, timbel_users u
WHERE ar.title = '테스트 컴포넌트 v1.0 배포 승인' 
AND u.username = 'qauser'
ON CONFLICT DO NOTHING;

-- 두 번째 요청 (AuthSystem)의 다단계 승인자 할당
INSERT INTO approval_assignments (request_id, approver_id, level, timeout_hours)
SELECT 
    ar.request_id,
    u.id,
    1,
    48
FROM approval_requests ar, timbel_users u
WHERE ar.title = '사용자 인증 시스템 아키텍처 변경' 
AND u.username = 'peuser'
ON CONFLICT DO NOTHING;

INSERT INTO approval_assignments (request_id, approver_id, level, timeout_hours)
SELECT 
    ar.request_id,
    u.id,
    2,
    48
FROM approval_requests ar, timbel_users u
WHERE ar.title = '사용자 인증 시스템 아키텍처 변경' 
AND u.username = 'pouser'
ON CONFLICT DO NOTHING;

-- 세 번째 요청 (Bug Fix)의 승인자 할당
INSERT INTO approval_assignments (request_id, approver_id, level, timeout_hours)
SELECT 
    ar.request_id,
    u.id,
    1,
    12
FROM approval_requests ar, timbel_users u
WHERE ar.title = '버그 수정 v1.1.1 배포' 
AND u.username = 'admin'
ON CONFLICT DO NOTHING;

-- 테스트 의사결정 요청
INSERT INTO decision_requests (
    title, description, type, priority, 
    requester_id, department_id, 
    voting_deadline, decision_deadline
) 
SELECT 
    '새 프로젝트 기술 스택 선택',
    'React vs Vue.js vs Angular 중 새 프로젝트에서 사용할 프론트엔드 프레임워크를 결정해주세요.',
    'technical',
    'high',
    u.id,
    d.id,
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '7 days'
FROM timbel_users u, departments d
WHERE u.username = 'pouser' AND d.name = '기획팀'
ON CONFLICT DO NOTHING;

-- 의사결정 참여자 할당
INSERT INTO decision_participants (request_id, participant_id, role)
SELECT 
    dr.request_id,
    u.id,
    'voter'
FROM decision_requests dr, timbel_users u
WHERE dr.title = '새 프로젝트 기술 스택 선택' 
AND u.username IN ('peuser', 'qauser')
ON CONFLICT DO NOTHING;

INSERT INTO decision_participants (request_id, participant_id, role)
SELECT 
    dr.request_id,
    u.id,
    'decision_maker'
FROM decision_requests dr, timbel_users u
WHERE dr.title = '새 프로젝트 기술 스택 선택' 
AND u.username = 'admin'
ON CONFLICT DO NOTHING;

-- 테스트 메시지들
INSERT INTO approval_messages (
    request_id, request_type, sender_id, recipient_id, 
    subject, content, message_type, priority
)
SELECT 
    ar.request_id,
    'approval',
    sender.id,
    recipient.id,
    '새로운 승인 요청이 있습니다',
    ar.title || '에 대한 승인을 요청드립니다. 검토 후 승인/거부 처리해주세요.',
    'request',
    'medium'
FROM approval_requests ar, 
     timbel_users sender, 
     timbel_users recipient
WHERE ar.title = '테스트 컴포넌트 v1.0 배포 승인'
AND sender.username = 'peuser'
AND recipient.username = 'qauser'
ON CONFLICT DO NOTHING;

-- 권한별 부서 할당 (사용자 테이블 업데이트)
UPDATE timbel_users SET department_id = (SELECT id FROM departments WHERE name = '경영진') 
WHERE role_type IN ('admin', 'executive');

UPDATE timbel_users SET department_id = (SELECT id FROM departments WHERE name = '기획팀') 
WHERE role_type = 'po';

UPDATE timbel_users SET department_id = (SELECT id FROM departments WHERE name = '개발팀') 
WHERE role_type = 'pe';

UPDATE timbel_users SET department_id = (SELECT id FROM departments WHERE name = 'QA팀') 
WHERE role_type = 'qa';

UPDATE timbel_users SET department_id = (SELECT id FROM departments WHERE name = '운영팀') 
WHERE role_type = 'operations';

-- 댓글 및 로그 추가
COMMENT ON TABLE approval_requests IS '승인 요청 정보를 저장하는 테이블';
COMMENT ON TABLE approval_assignments IS '승인자 할당 및 응답 정보를 저장하는 테이블';
COMMENT ON TABLE decision_requests IS '의사결정 요청 정보를 저장하는 테이블';
COMMENT ON TABLE decision_participants IS '의사결정 참여자 정보를 저장하는 테이블';
COMMENT ON TABLE decision_votes IS '의사결정 투표 결과를 저장하는 테이블';
COMMENT ON TABLE approval_messages IS '승인/의사결정 관련 메시지를 저장하는 테이블';
COMMENT ON TABLE approval_comments IS '승인/의사결정에 대한 댓글을 저장하는 테이블';
COMMENT ON TABLE approval_logs IS '승인 관련 모든 활동을 로깅하는 테이블';
COMMENT ON TABLE user_notification_preferences IS '사용자별 알림 설정을 저장하는 테이블';
COMMENT ON TABLE approval_workflow_templates IS '승인 워크플로우 템플릿을 저장하는 테이블';
