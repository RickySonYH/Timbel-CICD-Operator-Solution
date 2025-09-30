-- [advice from AI] 프로젝트 테이블 스키마 수정 - 누락된 컬럼들 추가

-- 1. 긴급 개발 관련 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_urgent_development BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS urgent_reason TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS expected_completion_hours INTEGER;

-- 2. 메타데이터 컬럼 추가 (유사 시스템, 작업 그룹 등을 JSON으로 저장)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. 기존 컬럼들의 기본값 및 제약 조건 정리
ALTER TABLE projects ALTER COLUMN urgency_level SET DEFAULT 'medium';
ALTER TABLE projects ALTER COLUMN project_status SET DEFAULT 'planning';
ALTER TABLE projects ALTER COLUMN approval_status SET DEFAULT 'pending';

-- 4. 컬럼 코멘트 추가 (문서화)
COMMENT ON COLUMN projects.name IS '프로젝트명';
COMMENT ON COLUMN projects.domain_id IS '소속 도메인 ID';
COMMENT ON COLUMN projects.project_overview IS '프로젝트 개요';
COMMENT ON COLUMN projects.target_system_name IS '목표 시스템명';
COMMENT ON COLUMN projects.urgency_level IS '긴급도 (low, medium, high, critical)';
COMMENT ON COLUMN projects.deadline IS '마감일';
COMMENT ON COLUMN projects.project_status IS '프로젝트 상태 (planning, in_progress, development, testing, completed, on_hold, cancelled)';
COMMENT ON COLUMN projects.approval_status IS '승인 상태 (pending, approved, rejected, draft)';
COMMENT ON COLUMN projects.is_urgent_development IS '긴급 개발 여부';
COMMENT ON COLUMN projects.urgent_reason IS '긴급 사유';
COMMENT ON COLUMN projects.expected_completion_hours IS '예상 완료 시간(시간)';
COMMENT ON COLUMN projects.metadata IS '추가 메타데이터 (유사 시스템, 작업 그룹 등을 JSON으로 저장)';
COMMENT ON COLUMN projects.created_by IS '생성자 ID';
COMMENT ON COLUMN projects.created_at IS '생성일시';
COMMENT ON COLUMN projects.updated_at IS '수정일시';

-- 5. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_domain_id ON projects(domain_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_urgency_level ON projects(urgency_level);
CREATE INDEX IF NOT EXISTS idx_projects_project_status ON projects(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_approval_status ON projects(approval_status);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);
CREATE INDEX IF NOT EXISTS idx_projects_is_urgent ON projects(is_urgent_development);

-- 6. 메타데이터 JSON 구조 예시 (참고용 주석)
/*
metadata 컬럼 JSON 구조:
{
  "similar_systems": [
    {
      "id": "uuid",
      "name": "시스템명",
      "description": "설명"
    }
  ],
  "work_groups": [
    {
      "name": "작업그룹명",
      "description": "설명",
      "assigned_pe": "uuid",
      "estimated_hours": 40
    }
  ],
  "documents": [
    {
      "name": "문서명",
      "type": "요구사항서|기능명세서|기술명세서",
      "file_path": "파일경로"
    }
  ]
}
*/
