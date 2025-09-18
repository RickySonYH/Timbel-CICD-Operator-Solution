-- [advice from AI] 프로젝트 테이블 생성 - 도메인과 시스템 중간 개념
-- 프로젝트는 특정 도메인에 속하며, 여러 시스템을 포함할 수 있음

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 기본 정보
  name VARCHAR(255) NOT NULL,
  domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
  project_overview TEXT,
  target_system_name VARCHAR(255), -- 향후 개발 후 솔루션명이 됨
  
  -- 고객 정보
  client_requirements_file_path TEXT, -- 고객사 요구사항 파일 경로
  client_requirements_filename VARCHAR(255), -- 원본 파일명
  client_requirements_size INTEGER, -- 파일 크기
  
  -- 디자인 요구사항 (솔루션 기획서 형태)
  design_requirements JSONB DEFAULT '{}', -- 구조화된 디자인 요구사항
  design_requirements_file_path TEXT, -- 디자인 요구사항 파일 경로
  design_requirements_filename VARCHAR(255),
  
  -- 프로젝트 관리
  deadline DATE, -- 기한
  urgency_level VARCHAR(20) DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')), -- 긴급도
  
  -- 상태 관리
  project_status VARCHAR(20) DEFAULT 'planning' CHECK (project_status IN ('planning', 'in_progress', 'development', 'testing', 'completed', 'on_hold', 'cancelled')),
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'draft')),
  
  -- 연관 정보
  approved_by UUID REFERENCES timbel_users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  
  -- 추적 정보
  created_by UUID REFERENCES timbel_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 통계 (캐시용)
  total_systems INTEGER DEFAULT 0,
  total_assets INTEGER DEFAULT 0
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_projects_domain_id ON projects(domain_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_approval_status ON projects(approval_status);
CREATE INDEX IF NOT EXISTS idx_projects_urgency ON projects(urgency_level);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- systems 테이블에 project_id 컬럼 추가
ALTER TABLE systems ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- systems 테이블 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_systems_project_id ON systems(project_id);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_projects_updated_at ON projects;
CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- 프로젝트 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 프로젝트의 시스템 수 업데이트
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE projects 
        SET total_systems = (
            SELECT COUNT(*) FROM systems WHERE project_id = NEW.project_id
        )
        WHERE id = NEW.project_id AND NEW.project_id IS NOT NULL;
    END IF;
    
    -- 삭제 시
    IF TG_OP = 'DELETE' THEN
        UPDATE projects 
        SET total_systems = (
            SELECT COUNT(*) FROM systems WHERE project_id = OLD.project_id
        )
        WHERE id = OLD.project_id AND OLD.project_id IS NOT NULL;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 시스템 변경 시 프로젝트 통계 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_project_stats ON systems;
CREATE TRIGGER trigger_update_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON systems
    FOR EACH ROW
    EXECUTE FUNCTION update_project_stats();

-- 샘플 데이터 삽입
INSERT INTO projects (name, domain_id, project_overview, target_system_name, urgency_level, deadline, created_by) 
SELECT 
    'ERP 현대화 프로젝트',
    d.id,
    '기존 레거시 ERP 시스템을 최신 기술 스택으로 현대화하여 업무 효율성을 높이고 사용자 경험을 개선하는 프로젝트',
    'ModernERP v2.0',
    'high',
    CURRENT_DATE + INTERVAL '6 months',
    u.id
FROM domains d, timbel_users u 
WHERE d.name = '제조업' AND u.username = 'admin'
LIMIT 1;

INSERT INTO projects (name, domain_id, project_overview, target_system_name, urgency_level, deadline, created_by) 
SELECT 
    '모바일 뱅킹 앱 개발',
    d.id,
    '차세대 모바일 뱅킹 서비스 개발로 고객 편의성 향상 및 디지털 전환 가속화',
    'SmartBank Mobile v1.0',
    'critical',
    CURRENT_DATE + INTERVAL '3 months',
    u.id
FROM domains d, timbel_users u 
WHERE d.name = '금융서비스' AND u.username = 'po_jung'
LIMIT 1;

-- 기존 시스템들을 프로젝트에 연결
UPDATE systems 
SET project_id = (
    SELECT p.id FROM projects p 
    JOIN domains d ON p.domain_id = d.id 
    WHERE d.name = '제조업' 
    LIMIT 1
)
WHERE domain_id = (SELECT id FROM domains WHERE name = '제조업');

COMMENT ON TABLE projects IS '프로젝트 관리 테이블 - 도메인과 시스템 중간 계층';
COMMENT ON COLUMN projects.target_system_name IS '향후 개발 완료 후 솔루션명이 되는 시스템명';
COMMENT ON COLUMN projects.client_requirements_file_path IS '고객사 요구사항 파일 업로드 경로';
COMMENT ON COLUMN projects.design_requirements IS '솔루션 기획서 형태의 디자인 요구사항';
