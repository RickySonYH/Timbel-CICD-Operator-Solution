-- [advice from AI] 프로젝트 삭제 이중 승인 시스템
-- 관리자 → PO 승인 → PE 승인 → 최종 삭제 워크플로우

-- 프로젝트 삭제 승인 요청 테이블
CREATE TABLE project_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 삭제 대상 프로젝트
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL, -- 삭제 후에도 기록 보존용
    
    -- 삭제 요청자 (관리자)
    requested_by UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    request_reason TEXT NOT NULL,
    
    -- 삭제 요청 상태
    deletion_status VARCHAR(50) NOT NULL DEFAULT 'pending_po_approval', 
    -- 'pending_po_approval', 'pending_pe_approval', 'approved', 'rejected', 'cancelled'
    
    -- 승인 관련 정보
    po_approval_required BOOLEAN DEFAULT TRUE,
    pe_approval_required BOOLEAN DEFAULT TRUE,
    
    -- PO 승인 정보
    po_approver_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    po_approval_status VARCHAR(20), -- 'approved', 'rejected', 'pending'
    po_approval_reason TEXT,
    po_approved_at TIMESTAMP WITH TIME ZONE,
    
    -- PE 승인 정보
    pe_approver_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    pe_approval_status VARCHAR(20), -- 'approved', 'rejected', 'pending'
    pe_approval_reason TEXT,
    pe_approved_at TIMESTAMP WITH TIME ZONE,
    
    -- 최종 처리 정보
    final_approved_by UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    final_approved_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 삭제 예정일 (승인 후 실제 삭제까지 유예 기간)
    scheduled_deletion_date TIMESTAMP WITH TIME ZONE,
    
    -- 메타데이터
    deletion_metadata JSONB DEFAULT '{}',
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 삭제된 프로젝트 백업 테이블 (감사 및 복구용)
CREATE TABLE deleted_projects_backup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 원본 프로젝트 정보 (JSON으로 전체 보존)
    original_project_id UUID NOT NULL,
    original_project_data JSONB NOT NULL,
    
    -- 관련 데이터 백업
    project_documents JSONB DEFAULT '[]',
    project_assignments JSONB DEFAULT '[]',
    project_repositories JSONB DEFAULT '[]',
    work_groups JSONB DEFAULT '[]',
    project_approvals JSONB DEFAULT '[]',
    
    -- 삭제 정보
    deletion_request_id UUID NOT NULL REFERENCES project_deletion_requests(id),
    deleted_by UUID NOT NULL REFERENCES timbel_users(id),
    deletion_reason TEXT,
    
    -- 복구 정보
    is_recoverable BOOLEAN DEFAULT TRUE,
    recovery_deadline TIMESTAMP WITH TIME ZONE, -- 복구 가능 기한
    
    -- 타임스탬프
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 삭제 승인 히스토리 테이블
CREATE TABLE project_deletion_approval_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 삭제 요청 정보
    deletion_request_id UUID NOT NULL REFERENCES project_deletion_requests(id) ON DELETE CASCADE,
    
    -- 승인 단계 정보
    approval_step VARCHAR(50) NOT NULL, -- 'po_approval', 'pe_approval', 'final_approval', 'rejection', 'cancellation'
    approver_id UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    approver_role VARCHAR(50) NOT NULL,
    
    -- 승인 결과
    approval_action VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'cancelled'
    approval_reason TEXT,
    
    -- 추가 정보
    approval_conditions TEXT, -- 조건부 승인인 경우
    next_step VARCHAR(50), -- 다음 승인 단계
    
    -- 타임스탬프
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 메타데이터
    action_metadata JSONB DEFAULT '{}'
);

-- 프로젝트 삭제 알림 테이블
CREATE TABLE project_deletion_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 삭제 요청 정보
    deletion_request_id UUID NOT NULL REFERENCES project_deletion_requests(id) ON DELETE CASCADE,
    
    -- 알림 수신자
    recipient_id UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50) NOT NULL,
    
    -- 알림 내용
    notification_type VARCHAR(50) NOT NULL, -- 'deletion_requested', 'approval_required', 'approved', 'rejected', 'deleted'
    notification_title VARCHAR(255) NOT NULL,
    notification_message TEXT NOT NULL,
    
    -- 알림 상태
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_urgent BOOLEAN DEFAULT FALSE,
    
    -- 타임스탬프
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_project_deletion_requests_project_id ON project_deletion_requests(project_id);
CREATE INDEX idx_project_deletion_requests_status ON project_deletion_requests(deletion_status);
CREATE INDEX idx_project_deletion_requests_requested_by ON project_deletion_requests(requested_by);
CREATE INDEX idx_project_deletion_requests_created_at ON project_deletion_requests(created_at DESC);

CREATE INDEX idx_deleted_projects_backup_original_id ON deleted_projects_backup(original_project_id);
CREATE INDEX idx_deleted_projects_backup_deletion_request ON deleted_projects_backup(deletion_request_id);
CREATE INDEX idx_deleted_projects_backup_deleted_at ON deleted_projects_backup(deleted_at DESC);
CREATE INDEX idx_deleted_projects_backup_recoverable ON deleted_projects_backup(is_recoverable);

CREATE INDEX idx_deletion_approval_history_request_id ON project_deletion_approval_history(deletion_request_id);
CREATE INDEX idx_deletion_approval_history_approver ON project_deletion_approval_history(approver_id);
CREATE INDEX idx_deletion_approval_history_step ON project_deletion_approval_history(approval_step);
CREATE INDEX idx_deletion_approval_history_timestamp ON project_deletion_approval_history(action_timestamp DESC);

CREATE INDEX idx_deletion_notifications_request_id ON project_deletion_notifications(deletion_request_id);
CREATE INDEX idx_deletion_notifications_recipient ON project_deletion_notifications(recipient_id);
CREATE INDEX idx_deletion_notifications_type ON project_deletion_notifications(notification_type);
CREATE INDEX idx_deletion_notifications_read ON project_deletion_notifications(is_read);

-- 삭제 승인 현황 뷰
CREATE OR REPLACE VIEW project_deletion_approval_status AS
SELECT 
    pdr.id as deletion_request_id,
    pdr.project_id,
    pdr.project_name,
    pdr.deletion_status,
    
    -- 요청자 정보
    requester.full_name as requested_by_name,
    pdr.request_reason,
    pdr.created_at as requested_at,
    
    -- PO 승인 정보
    pdr.po_approval_required,
    pdr.po_approval_status,
    po_approver.full_name as po_approver_name,
    pdr.po_approval_reason,
    pdr.po_approved_at,
    
    -- PE 승인 정보
    pdr.pe_approval_required,
    pdr.pe_approval_status,
    pe_approver.full_name as pe_approver_name,
    pdr.pe_approval_reason,
    pdr.pe_approved_at,
    
    -- 최종 승인 정보
    final_approver.full_name as final_approved_by_name,
    pdr.final_approved_at,
    pdr.scheduled_deletion_date,
    
    -- 진행률 계산
    CASE 
        WHEN pdr.deletion_status = 'pending_po_approval' THEN 25
        WHEN pdr.deletion_status = 'pending_pe_approval' THEN 50
        WHEN pdr.deletion_status = 'approved' THEN 75
        WHEN pdr.deleted_at IS NOT NULL THEN 100
        WHEN pdr.deletion_status = 'rejected' THEN 0
        ELSE 0
    END as approval_progress_percent,
    
    -- 다음 승인자 정보
    CASE 
        WHEN pdr.deletion_status = 'pending_po_approval' THEN 
            (SELECT full_name FROM timbel_users WHERE id = (SELECT claimed_by_po FROM projects WHERE id = pdr.project_id))
        WHEN pdr.deletion_status = 'pending_pe_approval' THEN 
            (SELECT full_name FROM timbel_users WHERE id = (SELECT assigned_to FROM project_work_assignments WHERE project_id = pdr.project_id LIMIT 1))
        ELSE NULL
    END as next_approver_name,
    
    -- 긴급도 (프로젝트 중요도 기반)
    CASE 
        WHEN p.is_urgent_development = TRUE THEN 'critical'
        WHEN p.urgency_level = 'critical' THEN 'high'
        WHEN p.urgency_level = 'high' THEN 'medium'
        ELSE 'low'
    END as deletion_urgency

FROM project_deletion_requests pdr
LEFT JOIN timbel_users requester ON pdr.requested_by = requester.id
LEFT JOIN timbel_users po_approver ON pdr.po_approver_id = po_approver.id
LEFT JOIN timbel_users pe_approver ON pdr.pe_approver_id = pe_approver.id
LEFT JOIN timbel_users final_approver ON pdr.final_approved_by = final_approver.id
LEFT JOIN projects p ON pdr.project_id = p.id;

-- 내가 승인해야 할 삭제 요청 뷰 (권한별)
CREATE OR REPLACE VIEW my_pending_deletion_approvals AS
SELECT 
    pdas.*,
    -- 내 승인 단계 확인
    CASE 
        WHEN pdas.deletion_status = 'pending_po_approval' 
             AND EXISTS(SELECT 1 FROM projects WHERE id = pdas.project_id AND claimed_by_po = $USER_ID) THEN 'po_approval_required'
        WHEN pdas.deletion_status = 'pending_pe_approval' 
             AND EXISTS(SELECT 1 FROM project_work_assignments WHERE project_id = pdas.project_id AND assigned_to = $USER_ID) THEN 'pe_approval_required'
        ELSE 'no_action_required'
    END as my_approval_action
FROM project_deletion_approval_status pdas
WHERE pdas.deletion_status IN ('pending_po_approval', 'pending_pe_approval');

-- 트리거 함수: 삭제 요청 상태 변경 시 자동 알림
CREATE OR REPLACE FUNCTION notify_deletion_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태가 변경되었을 때만 알림 발송
    IF OLD.deletion_status != NEW.deletion_status THEN
        -- 다음 승인자에게 알림
        IF NEW.deletion_status = 'pending_po_approval' THEN
            INSERT INTO project_deletion_notifications (
                deletion_request_id, recipient_id, recipient_role,
                notification_type, notification_title, notification_message, is_urgent
            )
            SELECT 
                NEW.id,
                p.claimed_by_po,
                'po',
                'approval_required',
                '🗑️ 프로젝트 삭제 승인 요청',
                '"' || NEW.project_name || '" 프로젝트의 삭제 승인이 필요합니다.',
                CASE WHEN p.is_urgent_development = TRUE THEN TRUE ELSE FALSE END
            FROM projects p 
            WHERE p.id = NEW.project_id AND p.claimed_by_po IS NOT NULL;
            
        ELSIF NEW.deletion_status = 'pending_pe_approval' THEN
            INSERT INTO project_deletion_notifications (
                deletion_request_id, recipient_id, recipient_role,
                notification_type, notification_title, notification_message, is_urgent
            )
            SELECT 
                NEW.id,
                pwa.assigned_to,
                'pe',
                'approval_required',
                '🗑️ 프로젝트 삭제 승인 요청',
                '"' || NEW.project_name || '" 프로젝트의 삭제 승인이 필요합니다.',
                CASE WHEN p.is_urgent_development = TRUE THEN TRUE ELSE FALSE END
            FROM project_work_assignments pwa
            JOIN projects p ON pwa.project_id = p.id
            WHERE pwa.project_id = NEW.project_id AND pwa.assignment_status IN ('assigned', 'in_progress');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_notify_deletion_status_change
    AFTER UPDATE ON project_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_deletion_status_change();

-- 안전한 프로젝트 삭제 함수
CREATE OR REPLACE FUNCTION safe_delete_project(
    p_deletion_request_id UUID,
    p_final_approver_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_project_id UUID;
    v_project_data JSONB;
    v_backup_id UUID;
    v_result JSONB;
BEGIN
    -- 1. 삭제 요청 검증
    SELECT project_id INTO v_project_id
    FROM project_deletion_requests
    WHERE id = p_deletion_request_id 
    AND deletion_status = 'approved'
    AND po_approval_status = 'approved'
    AND pe_approval_status = 'approved';
    
    IF v_project_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid deletion request or not fully approved'
        );
    END IF;
    
    -- 2. 프로젝트 데이터 백업
    SELECT jsonb_build_object(
        'project_info', to_jsonb(p.*),
        'documents', (SELECT jsonb_agg(to_jsonb(pd.*)) FROM project_documents pd WHERE pd.project_id = p.id),
        'assignments', (SELECT jsonb_agg(to_jsonb(pwa.*)) FROM project_work_assignments pwa WHERE pwa.project_id = p.id),
        'repositories', (SELECT jsonb_agg(to_jsonb(pr.*)) FROM project_repositories pr WHERE pr.project_id = p.id),
        'work_groups', (SELECT jsonb_agg(to_jsonb(wg.*)) FROM work_groups wg WHERE wg.project_id = p.id),
        'approvals', (SELECT jsonb_agg(to_jsonb(pa.*)) FROM project_approvals pa WHERE pa.project_id = p.id)
    ) INTO v_project_data
    FROM projects p
    WHERE p.id = v_project_id;
    
    -- 3. 백업 테이블에 저장
    INSERT INTO deleted_projects_backup (
        original_project_id, original_project_data, deletion_request_id, deleted_by, deletion_reason,
        project_documents, project_assignments, project_repositories, work_groups, project_approvals,
        recovery_deadline
    ) VALUES (
        v_project_id, 
        v_project_data,
        p_deletion_request_id,
        p_final_approver_id,
        (SELECT request_reason FROM project_deletion_requests WHERE id = p_deletion_request_id),
        v_project_data->'documents',
        v_project_data->'assignments',
        v_project_data->'repositories',
        v_project_data->'work_groups',
        v_project_data->'approvals',
        NOW() + INTERVAL '30 days' -- 30일간 복구 가능
    ) RETURNING id INTO v_backup_id;
    
    -- 4. 관련 데이터 삭제 (CASCADE로 자동 삭제되지만 명시적으로 기록)
    DELETE FROM projects WHERE id = v_project_id;
    
    -- 5. 삭제 요청 완료 처리
    UPDATE project_deletion_requests 
    SET 
        deletion_status = 'completed',
        final_approved_by = p_final_approver_id,
        final_approved_at = NOW(),
        deleted_at = NOW()
    WHERE id = p_deletion_request_id;
    
    -- 6. 시스템 이벤트 기록
    INSERT INTO system_event_stream (
        event_type, event_category, event_severity, title, description,
        project_id, user_id, event_data
    ) VALUES (
        'project_deleted',
        'project',
        'warning',
        '프로젝트 삭제 완료',
        '프로젝트가 이중 승인을 거쳐 안전하게 삭제되었습니다.',
        v_project_id,
        p_final_approver_id,
        jsonb_build_object(
            'deletion_request_id', p_deletion_request_id,
            'backup_id', v_backup_id,
            'recovery_deadline', NOW() + INTERVAL '30 days'
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'backup_id', v_backup_id,
        'deleted_project_id', v_project_id,
        'recovery_deadline', NOW() + INTERVAL '30 days'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE project_deletion_requests IS '프로젝트 삭제 요청 - 이중 승인 워크플로우 관리';
COMMENT ON TABLE deleted_projects_backup IS '삭제된 프로젝트 백업 - 감사 및 복구용 데이터 보존';
COMMENT ON TABLE project_deletion_approval_history IS '삭제 승인 히스토리 - 모든 승인 단계 기록';
COMMENT ON TABLE project_deletion_notifications IS '삭제 관련 알림 - 단계별 승인 요청 및 결과 알림';
COMMENT ON VIEW project_deletion_approval_status IS '삭제 승인 현황 - 전체 삭제 요청의 승인 상태';
COMMENT ON VIEW my_pending_deletion_approvals IS '내 승인 대기 삭제 요청 - 권한별 승인 대기 목록';
COMMENT ON FUNCTION safe_delete_project IS '안전한 프로젝트 삭제 - 백업 후 삭제 및 복구 가능 기간 설정';
