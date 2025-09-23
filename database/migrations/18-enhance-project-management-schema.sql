-- [advice from AI] 프로젝트 관리 시스템 고도화를 위한 스키마 확장
-- 작업 그룹별 PE 할당, 레포지토리 관리, Git 기반 진행률 추적

-- 1. projects 테이블 확장
ALTER TABLE projects ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'medium' 
  CHECK (urgency_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_system_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_overview TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES timbel_users(id);

-- 2. work_groups 테이블 확장
ALTER TABLE work_groups ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;
ALTER TABLE work_groups ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'medium' 
  CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'expert'));
ALTER TABLE work_groups ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE work_groups ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 1;

-- 3. project_work_assignments 테이블 확장
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS pe_estimated_completion_date DATE;
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS pe_estimated_hours INTEGER;
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS pe_notes TEXT;
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS difficulty_feedback VARCHAR(20) 
  CHECK (difficulty_feedback IN ('easier', 'as_expected', 'harder', 'much_harder'));
ALTER TABLE project_work_assignments ADD COLUMN IF NOT EXISTS end_date DATE; -- due_date 대신 사용

-- 4. project_repositories 테이블 생성
CREATE TABLE IF NOT EXISTS project_repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_group_id UUID REFERENCES work_groups(id) ON DELETE CASCADE, -- NULL이면 전체 프로젝트
  assigned_pe UUID NOT NULL REFERENCES timbel_users(id),
  
  -- 레포지토리 정보
  repository_url VARCHAR(500) NOT NULL,
  repository_name VARCHAR(255),
  platform VARCHAR(20) DEFAULT 'github' CHECK (platform IN ('github', 'gitlab', 'bitbucket')),
  access_token_encrypted TEXT, -- 암호화된 토큰 (향후 구현)
  branch_name VARCHAR(100) DEFAULT 'main',
  
  -- 상태 관리
  repository_status VARCHAR(20) DEFAULT 'active' CHECK (repository_status IN ('active', 'archived', 'error')),
  last_sync_at TIMESTAMP,
  sync_error_message TEXT,
  
  -- 메타데이터
  repository_description TEXT,
  is_private BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 유니크 제약: 하나의 작업 그룹당 하나의 레포지토리
  UNIQUE(project_id, work_group_id, assigned_pe)
);

-- 5. project_git_analytics 테이블 생성
CREATE TABLE IF NOT EXISTS project_git_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  
  -- Git 활동 지표
  total_commits INTEGER DEFAULT 0,
  commits_last_7_days INTEGER DEFAULT 0,
  commits_last_30_days INTEGER DEFAULT 0,
  total_lines_added INTEGER DEFAULT 0,
  total_lines_deleted INTEGER DEFAULT 0,
  
  -- 파일 분석
  total_files INTEGER DEFAULT 0,
  code_files INTEGER DEFAULT 0,
  documentation_files INTEGER DEFAULT 0,
  test_files INTEGER DEFAULT 0,
  config_files INTEGER DEFAULT 0,
  
  -- 문서화 품질
  has_readme BOOLEAN DEFAULT FALSE,
  readme_quality_score INTEGER DEFAULT 0 CHECK (readme_quality_score >= 0 AND readme_quality_score <= 100),
  has_changelog BOOLEAN DEFAULT FALSE,
  has_contributing_guide BOOLEAN DEFAULT FALSE,
  
  -- 진행률 및 품질 계산
  activity_score INTEGER DEFAULT 0 CHECK (activity_score >= 0 AND activity_score <= 100),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  code_quality_score INTEGER DEFAULT 0 CHECK (code_quality_score >= 0 AND code_quality_score <= 100),
  documentation_coverage INTEGER DEFAULT 0 CHECK (documentation_coverage >= 0 AND documentation_coverage <= 100),
  
  -- 개발 패턴 분석
  avg_commit_size INTEGER DEFAULT 0, -- 평균 커밋 크기
  commit_frequency_score INTEGER DEFAULT 0 CHECK (commit_frequency_score >= 0 AND commit_frequency_score <= 100),
  last_activity_days_ago INTEGER DEFAULT 0, -- 마지막 활동으로부터 경과일
  
  -- 타임스탬프
  last_commit_date TIMESTAMP,
  last_push_date TIMESTAMP,
  first_commit_date TIMESTAMP,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 유니크 제약: 하나의 레포지토리당 하나의 분석 레코드
  UNIQUE(repository_id)
);

-- 6. project_progress_milestones 테이블 생성
CREATE TABLE IF NOT EXISTS project_progress_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_assignment_id UUID NOT NULL REFERENCES project_work_assignments(id) ON DELETE CASCADE,
  
  -- 마일스톤 정보
  milestone_name VARCHAR(255) NOT NULL,
  milestone_type VARCHAR(50) DEFAULT 'development' 
    CHECK (milestone_type IN ('planning', 'development', 'testing', 'documentation', 'deployment', 'review')),
  target_date DATE,
  completion_date DATE,
  
  -- 진행 상태
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  
  -- 상세 정보
  description TEXT,
  pe_notes TEXT,
  po_feedback TEXT,
  deliverables TEXT[], -- 산출물 목록
  
  -- 중요도 및 우선순위
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5), -- 1: 최고, 5: 최저
  weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 10), -- 전체 진행률 계산 시 가중치
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. project_schedule_tracking 테이블 생성 (일정 추적)
CREATE TABLE IF NOT EXISTS project_schedule_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_assignment_id UUID NOT NULL REFERENCES project_work_assignments(id) ON DELETE CASCADE,
  
  -- 일정 정보
  original_estimated_hours INTEGER,
  current_estimated_hours INTEGER,
  actual_hours_logged INTEGER DEFAULT 0,
  
  -- 날짜 추적
  planned_start_date DATE,
  actual_start_date DATE,
  planned_end_date DATE,
  current_estimated_end_date DATE,
  actual_end_date DATE,
  
  -- 상태 및 지연 분석
  schedule_status VARCHAR(20) DEFAULT 'on_track' 
    CHECK (schedule_status IN ('ahead', 'on_track', 'at_risk', 'delayed', 'critical')),
  delay_days INTEGER DEFAULT 0,
  delay_reason TEXT,
  
  -- 진행률 추적
  planned_progress_percentage INTEGER DEFAULT 0 CHECK (planned_progress_percentage >= 0 AND planned_progress_percentage <= 100),
  actual_progress_percentage INTEGER DEFAULT 0 CHECK (actual_progress_percentage >= 0 AND actual_progress_percentage <= 100),
  
  -- 업데이트 정보
  last_updated_by UUID REFERENCES timbel_users(id),
  update_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_repositories_project_id ON project_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_repositories_assigned_pe ON project_repositories(assigned_pe);
CREATE INDEX IF NOT EXISTS idx_project_repositories_status ON project_repositories(repository_status);

CREATE INDEX IF NOT EXISTS idx_project_git_analytics_project_id ON project_git_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_git_analytics_repository_id ON project_git_analytics(repository_id);
CREATE INDEX IF NOT EXISTS idx_project_git_analytics_last_commit ON project_git_analytics(last_commit_date);

CREATE INDEX IF NOT EXISTS idx_project_progress_milestones_project_id ON project_progress_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_progress_milestones_assignment_id ON project_progress_milestones(work_assignment_id);
CREATE INDEX IF NOT EXISTS idx_project_progress_milestones_status ON project_progress_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_progress_milestones_target_date ON project_progress_milestones(target_date);

CREATE INDEX IF NOT EXISTS idx_project_schedule_tracking_project_id ON project_schedule_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_project_schedule_tracking_assignment_id ON project_schedule_tracking(work_assignment_id);
CREATE INDEX IF NOT EXISTS idx_project_schedule_tracking_status ON project_schedule_tracking(schedule_status);

-- 트리거 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 없는 경우에만 생성
DROP TRIGGER IF EXISTS update_project_repositories_updated_at ON project_repositories;
CREATE TRIGGER update_project_repositories_updated_at
    BEFORE UPDATE ON project_repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_git_analytics_updated_at ON project_git_analytics;
CREATE TRIGGER update_project_git_analytics_updated_at
    BEFORE UPDATE ON project_git_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_progress_milestones_updated_at ON project_progress_milestones;
CREATE TRIGGER update_project_progress_milestones_updated_at
    BEFORE UPDATE ON project_progress_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_schedule_tracking_updated_at ON project_schedule_tracking;
CREATE TRIGGER update_project_schedule_tracking_updated_at
    BEFORE UPDATE ON project_schedule_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 뷰 생성: 통합 프로젝트 현황 뷰
CREATE OR REPLACE VIEW project_comprehensive_status AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.urgency_level,
    p.deadline,
    p.project_status,
    p.approval_status,
    
    -- 작업 할당 정보
    pwa.id as assignment_id,
    pwa.assigned_to as pe_id,
    pe_user.full_name as pe_name,
    pwa.assignment_status,
    pwa.progress_percentage as assignment_progress,
    pwa.pe_estimated_completion_date,
    pwa.pe_estimated_hours,
    
    -- 작업 그룹 정보
    wg.id as work_group_id,
    wg.name as work_group_name,
    wg.difficulty_level,
    
    -- 레포지토리 정보
    pr.id as repository_id,
    pr.repository_url,
    pr.repository_status,
    pr.last_sync_at,
    
    -- Git 분석 정보
    pga.total_commits,
    pga.commits_last_7_days,
    pga.activity_score,
    pga.progress_percentage as git_progress,
    pga.last_commit_date,
    pga.documentation_coverage,
    
    -- 일정 추적 정보
    pst.schedule_status,
    pst.delay_days,
    pst.actual_hours_logged,
    pst.current_estimated_end_date
    
FROM projects p
LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
LEFT JOIN timbel_users pe_user ON pwa.assigned_to = pe_user.id
LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
LEFT JOIN project_repositories pr ON p.id = pr.project_id AND pwa.assigned_to = pr.assigned_pe
LEFT JOIN project_git_analytics pga ON pr.id = pga.repository_id
LEFT JOIN project_schedule_tracking pst ON pwa.id = pst.work_assignment_id;

-- 코멘트 추가
COMMENT ON TABLE project_repositories IS '프로젝트별 레포지토리 관리 - 작업 그룹별 독립적 레포지토리 설정';
COMMENT ON TABLE project_git_analytics IS 'Git 활동 분석 및 자동 진행률 계산';
COMMENT ON TABLE project_progress_milestones IS 'PE 주도적 마일스톤 관리 및 진행 추적';
COMMENT ON TABLE project_schedule_tracking IS '상세 일정 추적 및 지연 분석';
COMMENT ON VIEW project_comprehensive_status IS '프로젝트 종합 현황 통합 뷰';
