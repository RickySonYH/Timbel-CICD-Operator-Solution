-- [advice from AI] 프로젝트 승인 워크플로우 및 최고관리자 대시보드를 위한 테이블 설계

-- 프로젝트 승인 이력 테이블
CREATE TABLE IF NOT EXISTS project_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 승인자 정보
  approver_id UUID REFERENCES timbel_users(id) NOT NULL,
  approval_action VARCHAR(20) NOT NULL CHECK (approval_action IN ('approved', 'rejected', 'pending_review')),
  
  -- 승인 세부 정보
  approval_comment TEXT, -- 승인/거부 사유
  modifications_made JSONB DEFAULT '{}', -- 승인 시 수정된 내용
  
  -- 타임스탬프
  reviewed_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP, -- 실제 승인된 시간
  
  -- 메타데이터
  approval_metadata JSONB DEFAULT '{}', -- 추가 승인 관련 정보
  
  -- 추적 정보
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 프로젝트 할당 및 분배 테이블 (PO → PE 할당) - 새로운 구조
DROP TABLE IF EXISTS project_work_assignments CASCADE;
CREATE TABLE IF NOT EXISTS project_work_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  work_group_id UUID REFERENCES work_groups(id) ON DELETE CASCADE,
  
  -- 할당 정보
  assigned_by UUID REFERENCES timbel_users(id) NOT NULL, -- PO
  assigned_to UUID REFERENCES timbel_users(id) NOT NULL, -- PE
  
  -- 할당 세부사항
  assignment_type VARCHAR(20) DEFAULT 'development' CHECK (assignment_type IN ('development', 'design', 'testing', 'documentation')),
  estimated_hours INTEGER, -- 예상 작업 시간
  priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  
  -- 상태 관리
  assignment_status VARCHAR(20) DEFAULT 'assigned' CHECK (assignment_status IN ('assigned', 'in_progress', 'review', 'completed', 'cancelled')),
  
  -- 진행률 및 성과
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  actual_hours INTEGER DEFAULT 0, -- 실제 소요 시간
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10), -- 품질 점수
  
  -- 일정 관리
  assigned_at TIMESTAMP DEFAULT NOW(),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP,
  
  -- 피드백 및 코멘트
  assignment_notes TEXT, -- PO의 할당 지시사항
  pe_feedback TEXT, -- PE의 피드백
  
  -- 추적 정보
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 지식 자산 사용 추적 테이블
CREATE TABLE IF NOT EXISTS knowledge_asset_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 자산 정보
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('code_component', 'document', 'design_asset', 'system_template')),
  asset_id UUID NOT NULL, -- 실제 자산의 ID
  asset_name VARCHAR(255) NOT NULL,
  
  -- 사용 정보
  used_by UUID REFERENCES timbel_users(id) NOT NULL,
  used_in_project UUID REFERENCES projects(id),
  used_in_work_group UUID REFERENCES work_groups(id),
  
  -- 사용 맥락
  usage_context VARCHAR(100), -- 'reference', 'copy', 'modify', 'template'
  usage_notes TEXT,
  
  -- 효과 측정
  time_saved_hours DECIMAL(10,2), -- 절약된 시간
  reuse_percentage INTEGER CHECK (reuse_percentage >= 0 AND reuse_percentage <= 100), -- 재사용 비율
  
  -- 타임스탬프
  used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 프로젝트 진행률 스냅샷 테이블 (일별 진행률 추적)
CREATE TABLE IF NOT EXISTS project_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 진행률 정보
  overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
  development_progress INTEGER DEFAULT 0 CHECK (development_progress >= 0 AND development_progress <= 100),
  testing_progress INTEGER DEFAULT 0 CHECK (testing_progress >= 0 AND testing_progress <= 100),
  documentation_progress INTEGER DEFAULT 0 CHECK (documentation_progress >= 0 AND documentation_progress <= 100),
  
  -- 품질 지표
  code_quality_score INTEGER CHECK (code_quality_score >= 1 AND code_quality_score <= 10),
  test_coverage_percentage INTEGER CHECK (test_coverage_percentage >= 0 AND test_coverage_percentage <= 100),
  
  -- 리소스 사용량
  total_hours_spent DECIMAL(10,2) DEFAULT 0,
  budget_used_percentage INTEGER DEFAULT 0 CHECK (budget_used_percentage >= 0 AND budget_used_percentage <= 100),
  
  -- 이슈 및 위험도
  open_issues_count INTEGER DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- 스냅샷 정보
  snapshot_date DATE DEFAULT CURRENT_DATE,
  snapshot_type VARCHAR(20) DEFAULT 'daily' CHECK (snapshot_type IN ('daily', 'weekly', 'milestone')),
  
  -- 자동 계산 필드
  is_on_schedule BOOLEAN DEFAULT TRUE,
  days_behind_schedule INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 알림 시스템 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 수신자 정보
  recipient_id UUID REFERENCES timbel_users(id) NOT NULL,
  recipient_role VARCHAR(20), -- 'admin', 'po', 'pe' 등
  
  -- 알림 내용
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('project_created', 'project_approved', 'project_rejected', 'project_assigned', 'deadline_approaching', 'milestone_completed')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- 관련 엔티티
  related_project_id UUID REFERENCES projects(id),
  related_assignment_id UUID REFERENCES project_work_assignments(id),
  
  -- 상태 관리
  is_read BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  
  -- 액션 정보
  action_url VARCHAR(500), -- 클릭시 이동할 URL
  action_label VARCHAR(100), -- 버튼 라벨
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  expires_at TIMESTAMP -- 알림 만료 시간
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

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_project ON project_progress_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_date ON project_progress_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- 트리거 함수: updated_at 자동 업데이트
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

-- 자동 알림 트리거 함수
CREATE OR REPLACE FUNCTION notify_project_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- 프로젝트 승인 시 PO에게 알림
  IF NEW.approval_action = 'approved' AND OLD.approval_action != 'approved' THEN
    INSERT INTO notifications (
      recipient_id, 
      notification_type, 
      title, 
      message, 
      related_project_id,
      action_url
    )
    SELECT 
      u.id,
      'project_approved',
      '프로젝트 승인 완료',
      CONCAT('프로젝트 "', p.name, '"가 승인되었습니다. PE 할당을 진행해주세요.'),
      NEW.project_id,
      CONCAT('/projects/', NEW.project_id, '/assignments')
    FROM projects p, timbel_users u 
    WHERE p.id = NEW.project_id 
    AND u.roleType = 'po';
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
    recipient_id, 
    notification_type, 
    title, 
    message, 
    related_project_id,
    action_url,
    is_urgent
  )
  SELECT 
    u.id,
    'project_created',
    '새 프로젝트 승인 요청',
    CONCAT('새 프로젝트 "', NEW.name, '"의 승인이 필요합니다.'),
    NEW.id,
    CONCAT('/admin/approvals/', NEW.id),
    TRUE
  FROM timbel_users u 
  WHERE u.roleType IN ('admin', 'executive');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 생성 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_project_creation ON projects;
CREATE TRIGGER trigger_notify_project_creation
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION notify_project_creation();

-- 뷰: 프로젝트 상세 현황 (대시보드용)
CREATE OR REPLACE VIEW project_dashboard_view AS
SELECT 
  p.id,
  p.name,
  p.domain_id,
  d.name as domain_name,
  p.project_status,
  p.approval_status,
  p.urgency_level,
  p.deadline,
  p.created_at,
  p.updated_at,
  
  -- 승인 정보
  pa.approval_action as latest_approval_action,
  pa.approved_at,
  pa.approval_comment,
  approver.full_name as approver_name,
  
  -- 할당 통계
  COUNT(DISTINCT pra.id) as total_assignments,
  COUNT(DISTINCT CASE WHEN pra.assignment_status = 'completed' THEN pra.id END) as completed_assignments,
  ROUND(AVG(CASE WHEN pra.assignment_status = 'completed' THEN pra.progress_percentage END), 2) as avg_progress,
  
  -- 문서 및 자산 통계
  COUNT(DISTINCT pd.id) as document_count,
  COUNT(DISTINCT wg.id) as work_group_count,
  
  -- 지식 자산 사용 통계
  COUNT(DISTINCT kau.id) as knowledge_assets_used,
  SUM(COALESCE(kau.time_saved_hours, 0)) as total_time_saved,
  
  -- 최신 진행률 정보
  latest_progress.overall_progress,
  latest_progress.risk_level,
  latest_progress.is_on_schedule,
  latest_progress.days_behind_schedule
  
FROM projects p
LEFT JOIN domains d ON p.domain_id = d.id
LEFT JOIN project_approvals pa ON p.id = pa.project_id AND pa.id = (
  SELECT id FROM project_approvals WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1
)
LEFT JOIN timbel_users approver ON pa.approver_id = approver.id
LEFT JOIN project_work_assignments pra ON p.id = pra.project_id
LEFT JOIN project_documents pd ON p.id = pd.project_id
LEFT JOIN work_groups wg ON p.id = wg.project_id
LEFT JOIN knowledge_asset_usage kau ON p.id = kau.used_in_project
LEFT JOIN LATERAL (
  SELECT 
    overall_progress, 
    risk_level, 
    is_on_schedule, 
    days_behind_schedule
  FROM project_progress_snapshots 
  WHERE project_id = p.id 
  ORDER BY snapshot_date DESC 
  LIMIT 1
) latest_progress ON TRUE

GROUP BY 
  p.id, p.name, p.domain_id, d.name, p.project_status, p.approval_status, 
  p.urgency_level, p.deadline, p.created_at, p.updated_at,
  pa.approval_action, pa.approved_at, pa.approval_comment, approver.full_name,
  latest_progress.overall_progress, latest_progress.risk_level, 
  latest_progress.is_on_schedule, latest_progress.days_behind_schedule;

-- 뷰: PE 작업 현황 (대시보드용)
CREATE OR REPLACE VIEW pe_workload_view AS
SELECT 
  u.id as pe_id,
  u.full_name as pe_name,
  u.email as pe_email,
  
  -- 할당된 작업 통계
  COUNT(pa.id) as total_assignments,
  COUNT(CASE WHEN pa.assignment_status = 'in_progress' THEN 1 END) as active_assignments,
  COUNT(CASE WHEN pa.assignment_status = 'completed' THEN 1 END) as completed_assignments,
  
  -- 성과 지표
  ROUND(AVG(CASE WHEN pa.assignment_status = 'completed' THEN pa.quality_score END), 2) as avg_quality_score,
  SUM(COALESCE(pa.actual_hours, 0)) as total_hours_worked,
  ROUND(AVG(CASE WHEN pa.assignment_status = 'completed' THEN pa.progress_percentage END), 2) as avg_completion_rate,
  
  -- 일정 준수율
  COUNT(CASE WHEN pa.assignment_status = 'completed' AND pa.completed_at <= pa.due_date THEN 1 END) as on_time_completions,
  COUNT(CASE WHEN pa.assignment_status = 'completed' THEN 1 END) as total_completions,
  
  -- 현재 업무량
  SUM(CASE WHEN pa.assignment_status IN ('assigned', 'in_progress') THEN COALESCE(pa.estimated_hours, 0) END) as current_workload_hours
  
FROM timbel_users u
LEFT JOIN project_work_assignments pa ON u.id = pa.assigned_to
WHERE u.roleType = 'pe'
GROUP BY u.id, u.full_name, u.email;

-- 뷰: 지식 자산 활용 통계 (대시보드용)
CREATE OR REPLACE VIEW knowledge_usage_stats_view AS
SELECT 
  kau.asset_type,
  kau.asset_name,
  COUNT(*) as usage_count,
  COUNT(DISTINCT kau.used_by) as unique_users,
  COUNT(DISTINCT kau.used_in_project) as projects_used_in,
  SUM(COALESCE(kau.time_saved_hours, 0)) as total_time_saved,
  ROUND(AVG(COALESCE(kau.reuse_percentage, 0)), 2) as avg_reuse_percentage,
  MAX(kau.used_at) as last_used_at,
  
  -- 트렌드 계산 (최근 30일 vs 이전 30일)
  COUNT(CASE WHEN kau.used_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_usage,
  COUNT(CASE WHEN kau.used_at >= CURRENT_DATE - INTERVAL '60 days' AND kau.used_at < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as previous_usage
  
FROM knowledge_asset_usage kau
GROUP BY kau.asset_type, kau.asset_name
ORDER BY usage_count DESC;

-- 코멘트 추가
COMMENT ON TABLE project_approvals IS '프로젝트 승인 이력 및 워크플로우 관리';
COMMENT ON TABLE project_work_assignments IS 'PO가 PE에게 프로젝트/작업그룹 할당 및 진행 관리';
COMMENT ON TABLE knowledge_asset_usage IS '지식 자산 사용 추적 및 효과 측정';
COMMENT ON TABLE project_progress_snapshots IS '프로젝트 진행률 일별 스냅샷 (대시보드 차트용)';
COMMENT ON TABLE notifications IS '시스템 알림 관리 (승인, 할당, 마감일 등)';

COMMENT ON VIEW project_dashboard_view IS '최고관리자 대시보드용 프로젝트 통합 현황';
COMMENT ON VIEW pe_workload_view IS 'PE별 작업 현황 및 성과 지표';
COMMENT ON VIEW knowledge_usage_stats_view IS '지식 자산 활용 통계 및 트렌드';
