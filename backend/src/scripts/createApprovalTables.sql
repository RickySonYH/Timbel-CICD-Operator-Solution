-- [advice from AI] 결제 승인 및 의사결정 메시지 시스템을 위한 데이터베이스 테이블 생성 스크립트

-- 승인 요청 테이블
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

-- 승인자 테이블
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 의사결정 요청 테이블
CREATE TABLE IF NOT EXISTS decision_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

-- 메시지 테이블 (승인/의사결정 관련)
CREATE TABLE IF NOT EXISTS approval_messages (
    id SERIAL PRIMARY KEY,
    message_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

-- 알림 설정 테이블 (사용자별)
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
    template_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'purchase', 'budget', 'project', 'policy', 'other')),
    department_id UUID REFERENCES departments(id),
    min_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'KRW',
    workflow_steps JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 승인 워크플로우 단계 테이블
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
    id SERIAL PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES approval_workflow_templates(template_id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(200) NOT NULL,
    approver_type VARCHAR(50) NOT NULL CHECK (approver_type IN ('user', 'role', 'department_head', 'manager', 'custom')),
    approver_config JSONB NOT NULL DEFAULT '{}',
    is_required BOOLEAN DEFAULT true,
    can_skip BOOLEAN DEFAULT false,
    timeout_hours INTEGER DEFAULT 72,
    escalation_config JSONB DEFAULT '{}',
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_due_date ON approval_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_approval_assignments_approver ON approval_assignments(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_assignments_status ON approval_assignments(status);
CREATE INDEX IF NOT EXISTS idx_decision_requests_requester ON decision_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_decision_requests_status ON decision_requests(status);
CREATE INDEX IF NOT EXISTS idx_decision_participants_participant ON decision_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_approval_messages_recipient ON approval_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_approval_messages_request ON approval_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_request ON approval_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_actor ON approval_logs(actor_id);

-- 기본 데이터 삽입
INSERT INTO user_notification_preferences (user_id, notification_type, channel, is_enabled, frequency) 
SELECT id, 'approval_request', 'email', true, 'immediate'
FROM timbel_users 
WHERE role_type = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_notification_preferences (user_id, notification_type, channel, is_enabled, frequency) 
SELECT id, 'approval_response', 'email', true, 'immediate'
FROM timbel_users 
WHERE role_type = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_notification_preferences (user_id, notification_type, channel, is_enabled, frequency) 
SELECT id, 'decision_request', 'email', true, 'immediate'
FROM timbel_users 
WHERE role_type = 'admin'
ON CONFLICT DO NOTHING;

-- 기본 승인 워크플로우 템플릿
INSERT INTO approval_workflow_templates (name, description, type, min_amount, max_amount, workflow_steps, created_by) 
SELECT 
    '기본 결제 승인 워크플로우',
    '일반적인 결제 승인을 위한 기본 워크플로우',
    'payment',
    0,
    1000000,
    '[
        {
            "step_order": 1,
            "step_name": "부서장 승인",
            "approver_type": "department_head",
            "is_required": true,
            "timeout_hours": 24
        },
        {
            "step_order": 2,
            "step_name": "임원 승인",
            "approver_type": "manager",
            "is_required": true,
            "timeout_hours": 48
        }
    ]'::jsonb,
    id
FROM timbel_users 
WHERE role_type = 'admin' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- 댓글 및 토론 테이블
CREATE TABLE IF NOT EXISTS approval_comments (
    id SERIAL PRIMARY KEY,
    comment_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_approval_comments_request ON approval_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_author ON approval_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_approval_comments_parent ON approval_comments(parent_comment_id);
