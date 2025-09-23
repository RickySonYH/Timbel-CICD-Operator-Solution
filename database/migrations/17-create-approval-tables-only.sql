-- [advice from AI] 승인 워크플로우 핵심 테이블만 생성

-- 프로젝트 승인 이력 테이블
CREATE TABLE IF NOT EXISTS project_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 승인자 정보
  approver_id UUID REFERENCES timbel_users(id) NOT NULL,
  approval_action VARCHAR(20) NOT NULL CHECK (approval_action IN ('approved', 'rejected', 'pending_review')),
  
  -- 승인 세부 정보
  approval_comment TEXT,
  modifications_made JSONB DEFAULT '{}',
  
  -- 타임스탬프
  reviewed_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  
  -- 추적 정보
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 프로젝트 할당 및 분배 테이블 (PO → PE 할당)
CREATE TABLE IF NOT EXISTS project_work_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  work_group_id UUID REFERENCES work_groups(id) ON DELETE CASCADE,
  
  -- 할당 정보
  assigned_by UUID REFERENCES timbel_users(id) NOT NULL, -- PO
  assigned_to UUID REFERENCES timbel_users(id) NOT NULL, -- PE
  
  -- 할당 세부사항
  assignment_type VARCHAR(20) DEFAULT 'development' CHECK (assignment_type IN ('development', 'design', 'testing', 'documentation')),
  estimated_hours INTEGER,
  priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  
  -- 상태 관리
  assignment_status VARCHAR(20) DEFAULT 'assigned' CHECK (assignment_status IN ('assigned', 'in_progress', 'review', 'completed', 'cancelled')),
  
  -- 진행률 및 성과
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  actual_hours INTEGER DEFAULT 0,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  
  -- 일정 관리
  assigned_at TIMESTAMP DEFAULT NOW(),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP,
  
  -- 피드백
  assignment_notes TEXT,
  pe_feedback TEXT,
  
  -- 추적 정보
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 지식 자산 사용 추적 테이블
CREATE TABLE IF NOT EXISTS knowledge_asset_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 자산 정보
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('code_component', 'document', 'design_asset', 'system_template')),
  asset_id UUID NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  
  -- 사용 정보
  used_by UUID REFERENCES timbel_users(id) NOT NULL,
  used_in_project UUID REFERENCES projects(id),
  used_in_work_group UUID REFERENCES work_groups(id),
  
  -- 사용 맥락
  usage_context VARCHAR(100),
  usage_notes TEXT,
  
  -- 효과 측정
  time_saved_hours DECIMAL(10,2),
  reuse_percentage INTEGER CHECK (reuse_percentage >= 0 AND reuse_percentage <= 100),
  
  -- 타임스탬프
  used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_approvals_project_id ON project_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_project_approvals_approver ON project_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_project_approvals_status ON project_approvals(approval_action);

CREATE INDEX IF NOT EXISTS idx_project_work_assignments_project_id ON project_work_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_work_assignments_assigned_to ON project_work_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_work_assignments_status ON project_work_assignments(assignment_status);

CREATE INDEX IF NOT EXISTS idx_knowledge_usage_asset ON knowledge_asset_usage(asset_type, asset_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_usage_user ON knowledge_asset_usage(used_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_usage_project ON knowledge_asset_usage(used_in_project);

-- 트리거 생성
DROP TRIGGER IF EXISTS update_project_approvals_updated_at ON project_approvals;
CREATE TRIGGER update_project_approvals_updated_at
    BEFORE UPDATE ON project_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_work_assignments_updated_at ON project_work_assignments;
CREATE TRIGGER update_project_work_assignments_updated_at
    BEFORE UPDATE ON project_work_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 자동 알림 트리거 함수 (기존 notifications 테이블 구조에 맞게)
CREATE OR REPLACE FUNCTION notify_project_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- 프로젝트 승인 시 PO에게 알림
  IF NEW.approval_action = 'approved' AND (OLD.approval_action IS NULL OR OLD.approval_action != 'approved') THEN
    INSERT INTO notifications (
      user_id, 
      project_id,
      type, 
      title, 
      message, 
      priority,
      action_url
    )
    SELECT 
      u.id,
      NEW.project_id,
      'project_approved',
      '프로젝트 승인 완료',
      CONCAT('프로젝트 "', p.name, '"가 승인되었습니다. PE 할당을 진행해주세요.'),
      'high',
      CONCAT('/knowledge/projects')
    FROM projects p, timbel_users u 
    WHERE p.id = NEW.project_id 
    AND u.role_type = 'po';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 승인 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_project_approval ON project_approvals;
CREATE TRIGGER trigger_notify_project_approval
    AFTER UPDATE ON project_approvals
    FOR EACH ROW
    EXECUTE FUNCTION notify_project_approval();

-- 프로젝트 생성 시 최고관리자 알림 트리거 함수
CREATE OR REPLACE FUNCTION notify_project_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 프로젝트 생성 시 최고관리자(admin, executive)에게 알림
  INSERT INTO notifications (
    user_id, 
    project_id,
    type, 
    title, 
    message, 
    priority,
    action_url
  )
  SELECT 
    u.id,
    NEW.id,
    'project_created',
    '새 프로젝트 승인 요청',
    CONCAT('새 프로젝트 "', NEW.name, '"의 승인이 필요합니다.'),
    'high',
    CONCAT('/admin/approvals')
  FROM timbel_users u 
  WHERE u.role_type IN ('admin', 'executive');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 생성 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_project_creation ON projects;
CREATE TRIGGER trigger_notify_project_creation
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION notify_project_creation();

-- 코멘트 추가
COMMENT ON TABLE project_approvals IS '프로젝트 승인 이력 및 워크플로우 관리';
COMMENT ON TABLE project_work_assignments IS 'PO가 PE에게 프로젝트/작업그룹 할당 및 진행 관리';
COMMENT ON TABLE knowledge_asset_usage IS '지식 자산 사용 추적 및 효과 측정';
