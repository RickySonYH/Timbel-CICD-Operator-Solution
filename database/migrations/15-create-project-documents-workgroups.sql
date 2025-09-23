-- [advice from AI] 프로젝트 문서 및 작업 그룹 테이블 생성

-- 프로젝트 문서 테이블 - DB 직접 저장 방식
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 문서 정보
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('voc', 'requirements', 'design')),
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- [advice from AI] 파일 내용 직접 저장 (BYTEA 필드)
  file_content BYTEA NOT NULL,
  
  -- 메타데이터
  title VARCHAR(255), -- 사용자가 지정하는 문서 제목
  description TEXT,
  
  -- 추적 정보
  uploaded_by UUID REFERENCES timbel_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 제약 조건: 50MB 제한
  CONSTRAINT file_size_limit CHECK (file_size <= 52428800) -- 50MB = 50 * 1024 * 1024
);

-- 작업 그룹 테이블
CREATE TABLE IF NOT EXISTS work_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 기본 정보
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- 할당 정보
  assigned_pe UUID REFERENCES timbel_users(id), -- PE 할당 (선택사항)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'on_hold')),
  
  -- 우선순위 및 정렬
  order_index INTEGER DEFAULT 0,
  
  -- 추적 정보
  created_by UUID REFERENCES timbel_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_work_groups_project_id ON work_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_work_groups_assigned_pe ON work_groups(assigned_pe);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_project_documents_updated_at ON project_documents;
CREATE TRIGGER update_project_documents_updated_at
    BEFORE UPDATE ON project_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_groups_updated_at ON work_groups;
CREATE TRIGGER update_work_groups_updated_at
    BEFORE UPDATE ON work_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 코멘트 추가
COMMENT ON TABLE project_documents IS '프로젝트 관련 문서 (VoC, 요구사양서, 디자인 기획서 등) - DB 직접 저장';
COMMENT ON COLUMN project_documents.document_type IS 'voc: 고객 VoC 문서, requirements: 요구사양서, design: 디자인 기획서';
COMMENT ON COLUMN project_documents.file_content IS '파일 내용을 BYTEA로 직접 저장 (최대 50MB)';
COMMENT ON COLUMN project_documents.file_size IS '파일 크기 (바이트), 50MB 제한';
COMMENT ON TABLE work_groups IS '프로젝트 작업 그룹 (대형 프로젝트를 세부 시스템으로 분할)';
COMMENT ON COLUMN work_groups.assigned_pe IS 'PE(Project Engineer) 할당, NULL이면 미할당';

-- 샘플 데이터 (테스트용)
-- INSERT INTO project_documents (project_id, document_type, original_filename, stored_filename, file_path, title, uploaded_by)
-- VALUES 
--   ('프로젝트_ID', 'voc', 'customer_feedback.pdf', 'doc_001.pdf', '/uploads/documents/doc_001.pdf', '고객 피드백 분석서', '사용자_ID');

-- INSERT INTO work_groups (project_id, name, description, created_by)
-- VALUES 
--   ('프로젝트_ID', '콜봇 시스템', '고객 상담을 위한 챗봇 시스템 개발', '사용자_ID'),
--   ('프로젝트_ID', '어드바이저 시스템', '전문가 상담 매칭 시스템 개발', '사용자_ID');
