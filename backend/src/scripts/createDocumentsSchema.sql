-- [advice from AI] 문서/가이드 관리 테이블 생성

-- 문서 카테고리 테이블
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 문서 테이블
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    content TEXT,
    category VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'document', -- document, guide, tutorial, manual, reference
    tags TEXT[], -- 태그 배열
    version VARCHAR(20) DEFAULT '1.0.0',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    is_public BOOLEAN DEFAULT false,
    file_info JSONB, -- 파일 정보 (원본명, 경로, 크기, MIME 타입 등) - NULL 가능
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 문서 버전 히스토리 테이블
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    content TEXT,
    change_log TEXT,
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, version)
);

-- 문서 사용 통계 테이블
CREATE TABLE IF NOT EXISTS document_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES timbel_users(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'download', 'edit', 'share')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 문서 댓글 테이블
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES timbel_users(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES document_comments(id), -- 대댓글 지원
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 문서 북마크 테이블
CREATE TABLE IF NOT EXISTS document_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_creator ON documents(creator_id);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_usage_document_id ON document_usage(document_id);
CREATE INDEX IF NOT EXISTS idx_document_usage_user_id ON document_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_document_id ON document_bookmarks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_bookmarks_user_id ON document_bookmarks(user_id);

-- 권한 추가
INSERT INTO permissions (name, description, resource, action) VALUES
('documents.read', '문서 조회', 'documents', 'read'),
('documents.create', '문서 생성', 'documents', 'create'),
('documents.update', '문서 수정', 'documents', 'update'),
('documents.delete', '문서 삭제', 'documents', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 기본 카테고리 데이터 삽입
INSERT INTO document_categories (name, description, icon) VALUES
('User Guide', '사용자 가이드 및 매뉴얼', 'book'),
('API Documentation', 'API 문서 및 참조', 'code'),
('Tutorial', '튜토리얼 및 학습 자료', 'school'),
('Technical Specification', '기술 명세서', 'engineering'),
('Process Guide', '프로세스 가이드', 'workflow'),
('Troubleshooting', '문제 해결 가이드', 'bug_report'),
('Release Notes', '릴리스 노트', 'release'),
('FAQ', '자주 묻는 질문', 'help')
ON CONFLICT (name) DO NOTHING;
