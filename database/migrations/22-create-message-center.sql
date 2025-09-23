-- [advice from AI] 권한별 메시지 센터 시스템
-- 단계별 이벤트를 권한에 따라 표시하는 통합 알림 시스템

-- 메시지 센터 메인 테이블
CREATE TABLE message_center (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 메시지 기본 정보
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error', 'urgent'
    
    -- 이벤트 분류
    event_category VARCHAR(100) NOT NULL, -- 'project_created', 'project_approved', 'work_started', 'status_changed' 등
    event_source VARCHAR(50) NOT NULL, -- 'system', 'user', 'automation'
    
    -- 관련 엔티티 정보
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    related_user_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES project_work_assignments(id) ON DELETE CASCADE,
    
    -- 추가 데이터 (JSON 형태로 유연하게 저장)
    metadata JSONB,
    
    -- 우선순위 및 상태
    priority INTEGER DEFAULT 1, -- 1: 낮음, 2: 보통, 3: 높음, 4: 긴급
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- 만료일 (선택사항)
    
    -- 생성자 정보
    created_by UUID REFERENCES timbel_users(id) ON DELETE SET NULL
);

-- 메시지 수신자 테이블 (다대다 관계)
CREATE TABLE message_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES message_center(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    
    -- 수신자별 상태
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE, -- 개별 삭제
    
    -- 알림 설정
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(message_id, recipient_user_id)
);

-- 메시지 액션 로그 테이블
CREATE TABLE message_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES message_center(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    
    action_type VARCHAR(50) NOT NULL, -- 'read', 'starred', 'archived', 'deleted', 'clicked'
    action_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_message_center_project_id ON message_center(project_id);
CREATE INDEX idx_message_center_event_category ON message_center(event_category);
CREATE INDEX idx_message_center_created_at ON message_center(created_at DESC);
CREATE INDEX idx_message_center_priority ON message_center(priority DESC);

CREATE INDEX idx_message_recipients_user_id ON message_recipients(recipient_user_id);
CREATE INDEX idx_message_recipients_message_id ON message_recipients(message_id);
CREATE INDEX idx_message_recipients_is_read ON message_recipients(is_read);
CREATE INDEX idx_message_recipients_created_at ON message_recipients(created_at DESC);

CREATE INDEX idx_message_actions_message_id ON message_actions(message_id);
CREATE INDEX idx_message_actions_user_id ON message_actions(user_id);
CREATE INDEX idx_message_actions_created_at ON message_actions(created_at DESC);

-- 권한별 메시지 뷰
CREATE OR REPLACE VIEW user_messages AS
SELECT 
    mc.id,
    mc.title,
    mc.message,
    mc.message_type,
    mc.event_category,
    mc.event_source,
    mc.project_id,
    mc.related_user_id,
    mc.assignment_id,
    mc.metadata,
    mc.priority,
    mc.created_at,
    mc.expires_at,
    mc.created_by,
    
    -- 수신자 정보
    mr.recipient_user_id,
    mr.is_read,
    mr.read_at,
    mr.is_starred,
    mr.is_deleted,
    mr.notification_sent,
    
    -- 관련 프로젝트 정보
    p.project_name,
    p.project_status,
    
    -- 관련 사용자 정보
    creator.full_name as creator_name,
    recipient.full_name as recipient_name,
    recipient.role_type as recipient_role
    
FROM message_center mc
JOIN message_recipients mr ON mc.id = mr.message_id
LEFT JOIN projects p ON mc.project_id = p.id
LEFT JOIN timbel_users creator ON mc.created_by = creator.id
LEFT JOIN timbel_users recipient ON mr.recipient_user_id = recipient.id
WHERE mr.is_deleted = FALSE
  AND (mc.expires_at IS NULL OR mc.expires_at > NOW());

COMMENT ON TABLE message_center IS '메시지 센터 - 시스템 전체의 이벤트 및 알림 메시지';
COMMENT ON TABLE message_recipients IS '메시지 수신자 - 메시지별 수신자 및 읽기 상태 관리';
COMMENT ON TABLE message_actions IS '메시지 액션 로그 - 사용자의 메시지 관련 액션 추적';
COMMENT ON VIEW user_messages IS '사용자별 메시지 뷰 - 권한 및 상태 필터링된 메시지 목록';
