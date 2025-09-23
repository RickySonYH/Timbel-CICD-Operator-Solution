-- [advice from AI] 작업 거부 및 지식자원 통합을 위한 스키마 확장

-- 1. 작업 거부 추적 테이블
CREATE TABLE IF NOT EXISTS project_work_rejections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES project_work_assignments(id) ON DELETE CASCADE,
  rejected_by UUID NOT NULL REFERENCES timbel_users(id),
  
  -- 거부 정보
  rejection_category VARCHAR(50) NOT NULL 
    CHECK (rejection_category IN ('technical_impossible', 'insufficient_time', 'unclear_requirements', 
                                  'resource_shortage', 'skill_mismatch', 'workload_exceeded', 'other')),
  rejection_reason TEXT NOT NULL,
  rejection_details TEXT,
  
  -- 상태 추적
  rejection_status VARCHAR(20) DEFAULT 'pe_rejected' 
    CHECK (rejection_status IN ('pe_rejected', 'po_reviewing', 'admin_escalated', 'resolved', 'cancelled')),
  
  -- 처리 정보
  po_response TEXT,
  po_decision VARCHAR(20) CHECK (po_decision IN ('modify_project', 'escalate_admin', 'reassign_pe', 'cancel_project')),
  po_responded_at TIMESTAMP,
  po_responded_by UUID REFERENCES timbel_users(id),
  
  admin_response TEXT,
  admin_decision VARCHAR(20) CHECK (admin_decision IN ('approve_rejection', 'modify_project', 'cancel_project')),
  admin_responded_at TIMESTAMP,
  admin_responded_by UUID REFERENCES timbel_users(id),
  
  -- 해결 정보
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES timbel_users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 프로젝트-지식자원 매핑 테이블 (통합 관리)
CREATE TABLE IF NOT EXISTS project_knowledge_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 참조하는 기존 지식자원
  referenced_system_id UUID REFERENCES systems(id),
  referenced_component_id UUID REFERENCES code_components(id),
  referenced_guide_id UUID REFERENCES document_guides(id),
  
  -- 매핑 유형
  mapping_type VARCHAR(20) NOT NULL 
    CHECK (mapping_type IN ('reference', 'enhancement', 'replacement', 'new_creation')),
  
  -- 매핑 설명
  mapping_description TEXT,
  usage_context TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES timbel_users(id)
);

-- 3. 프로젝트 완료 후 지식자원 등록 추적
CREATE TABLE IF NOT EXISTS project_completion_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 완료 상태
  completion_status VARCHAR(20) DEFAULT 'in_progress' 
    CHECK (completion_status IN ('in_progress', 'completed', 'reviewing', 'registering', 'registered')),
  
  -- 등록할 지식자원 정보
  target_registration_type VARCHAR(20) 
    CHECK (target_registration_type IN ('system', 'component', 'guide', 'mixed')),
  
  -- 시스템 등록 데이터
  system_registration_data JSONB,
  created_system_id UUID REFERENCES systems(id),
  
  -- 컴포넌트 등록 데이터
  component_registration_data JSONB,
  created_component_id UUID REFERENCES code_components(id),
  
  -- 가이드 등록 데이터
  guide_registration_data JSONB,
  created_guide_id UUID REFERENCES document_guides(id),
  
  -- 등록 진행 정보
  registration_progress INTEGER DEFAULT 0 CHECK (registration_progress >= 0 AND registration_progress <= 100),
  registration_notes TEXT,
  
  -- 승인 정보
  approved_for_registration BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES timbel_users(id),
  approved_at TIMESTAMP,
  
  -- 완료 정보
  registered_at TIMESTAMP,
  registered_by UUID REFERENCES timbel_users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. 통합 알림 시스템 확장
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_category VARCHAR(50) DEFAULT 'general'
  CHECK (notification_category IN ('general', 'project', 'approval', 'rejection', 'completion', 'knowledge_registration'));

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_project_id UUID REFERENCES projects(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_assignment_id UUID REFERENCES project_work_assignments(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_rejection_id UUID REFERENCES project_work_rejections(id);

-- 5. 작업 할당 상태 확장
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0;
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS last_rejected_at TIMESTAMP;
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS assignment_history JSONB DEFAULT '[]';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_work_rejections_project_id ON project_work_rejections(project_id);
CREATE INDEX IF NOT EXISTS idx_project_work_rejections_assignment_id ON project_work_rejections(assignment_id);
CREATE INDEX IF NOT EXISTS idx_project_work_rejections_status ON project_work_rejections(rejection_status);
CREATE INDEX IF NOT EXISTS idx_project_work_rejections_rejected_by ON project_work_rejections(rejected_by);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_mapping_project_id ON project_knowledge_mapping(project_id);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_mapping_type ON project_knowledge_mapping(mapping_type);

CREATE INDEX IF NOT EXISTS idx_project_completion_registry_project_id ON project_completion_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_project_completion_registry_status ON project_completion_registry(completion_status);

CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(notification_category);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(related_project_id);

-- 트리거 생성
DROP TRIGGER IF EXISTS update_project_work_rejections_updated_at ON project_work_rejections;
CREATE TRIGGER update_project_work_rejections_updated_at
    BEFORE UPDATE ON project_work_rejections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_completion_registry_updated_at ON project_completion_registry;
CREATE TRIGGER update_project_completion_registry_updated_at
    BEFORE UPDATE ON project_completion_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 뷰 생성: 거부 현황 통합 뷰
CREATE OR REPLACE VIEW project_rejection_status_view AS
SELECT 
    pwr.id as rejection_id,
    pwr.project_id,
    p.name as project_name,
    pwr.assignment_id,
    pwa.assigned_to as pe_id,
    pe_user.full_name as pe_name,
    
    -- 거부 정보
    pwr.rejection_category,
    pwr.rejection_reason,
    pwr.rejection_details,
    pwr.rejection_status,
    pwr.created_at as rejected_at,
    
    -- PO 처리 정보
    pwr.po_response,
    pwr.po_decision,
    pwr.po_responded_at,
    po_user.full_name as po_responder_name,
    
    -- Admin 처리 정보
    pwr.admin_response,
    pwr.admin_decision,
    pwr.admin_responded_at,
    admin_user.full_name as admin_responder_name,
    
    -- 프로젝트 정보
    p.urgency_level,
    p.deadline,
    p.project_status,
    p.approval_status
    
FROM project_work_rejections pwr
JOIN projects p ON pwr.project_id = p.id
JOIN project_work_assignments pwa ON pwr.assignment_id = pwa.id
JOIN timbel_users pe_user ON pwa.assigned_to = pe_user.id
LEFT JOIN timbel_users po_user ON pwr.po_responded_by = po_user.id
LEFT JOIN timbel_users admin_user ON pwr.admin_responded_by = admin_user.id;

-- 뷰 생성: 프로젝트 완료 및 등록 현황
CREATE OR REPLACE VIEW project_completion_overview AS
SELECT 
    pcr.id as registry_id,
    pcr.project_id,
    p.name as project_name,
    p.project_status,
    pcr.completion_status,
    pcr.target_registration_type,
    pcr.registration_progress,
    pcr.approved_for_registration,
    pcr.approved_by,
    approver.full_name as approver_name,
    pcr.approved_at,
    pcr.registered_at,
    
    -- 생성된 지식자원 정보
    pcr.created_system_id,
    s.name as created_system_name,
    pcr.created_component_id,
    cc.name as created_component_name,
    pcr.created_guide_id,
    dg.title as created_guide_title,
    
    -- 프로젝트 정보
    p.created_by as project_creator,
    creator.full_name as project_creator_name,
    p.created_at as project_created_at
    
FROM project_completion_registry pcr
JOIN projects p ON pcr.project_id = p.id
LEFT JOIN timbel_users approver ON pcr.approved_by = approver.id
LEFT JOIN timbel_users creator ON p.created_by = creator.id
LEFT JOIN systems s ON pcr.created_system_id = s.id
LEFT JOIN code_components cc ON pcr.created_component_id = cc.id
LEFT JOIN document_guides dg ON pcr.created_guide_id = dg.id;

-- 함수: 작업 거부 처리 자동화
CREATE OR REPLACE FUNCTION handle_work_rejection() 
RETURNS TRIGGER AS $$
BEGIN
    -- 할당 상태를 거부됨으로 변경
    UPDATE project_work_assignments 
    SET 
        assignment_status = 'rejected',
        rejection_count = rejection_count + 1,
        last_rejected_at = NOW(),
        assignment_history = assignment_history || jsonb_build_object(
            'action', 'rejected',
            'timestamp', NOW(),
            'rejection_id', NEW.id,
            'reason', NEW.rejection_reason
        )
    WHERE id = NEW.assignment_id;
    
    -- PO에게 알림 생성
    INSERT INTO notifications (
        recipient_id, 
        title, 
        message, 
        notification_type,
        notification_category,
        related_project_id,
        related_assignment_id,
        related_rejection_id,
        is_read
    )
    SELECT 
        p.created_by, -- PO (프로젝트 생성자)
        '작업 거부 알림',
        pe.full_name || '님이 "' || proj.name || '" 프로젝트 작업을 거부했습니다. 재검토가 필요합니다.',
        'warning',
        'rejection',
        NEW.project_id,
        NEW.assignment_id,
        NEW.id,
        FALSE
    FROM projects proj
    JOIN project_work_assignments pwa ON pwa.id = NEW.assignment_id
    JOIN timbel_users pe ON pwa.assigned_to = pe.id
    JOIN projects p ON p.id = NEW.project_id
    WHERE proj.id = NEW.project_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 연결
DROP TRIGGER IF EXISTS trigger_handle_work_rejection ON project_work_rejections;
CREATE TRIGGER trigger_handle_work_rejection
    AFTER INSERT ON project_work_rejections
    FOR EACH ROW
    EXECUTE FUNCTION handle_work_rejection();

-- 코멘트 추가
COMMENT ON TABLE project_work_rejections IS 'PE 작업 거부 및 역방향 보고 추적';
COMMENT ON TABLE project_knowledge_mapping IS '프로젝트와 지식자원 간 매핑 관계';
COMMENT ON TABLE project_completion_registry IS '프로젝트 완료 후 지식자원 등록 추적';
COMMENT ON VIEW project_rejection_status_view IS '거부 현황 통합 조회 뷰';
COMMENT ON VIEW project_completion_overview IS '프로젝트 완료 및 지식자원 등록 현황 뷰';
