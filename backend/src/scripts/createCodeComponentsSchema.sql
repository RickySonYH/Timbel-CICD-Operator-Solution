-- [advice from AI] 코드 컴포넌트 관리 테이블 생성

-- 코드 컴포넌트 타입 테이블
CREATE TABLE IF NOT EXISTS code_component_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 코드 컴포넌트 테이블
CREATE TABLE IF NOT EXISTS code_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- component, library, snippet, template
    language VARCHAR(50) NOT NULL, -- javascript, typescript, python, java, etc.
    framework VARCHAR(100), -- react, vue, angular, express, django, etc.
    dependencies JSONB, -- 의존성 정보 (배열 형태)
    usage_example TEXT, -- 사용 예제 코드
    version VARCHAR(20) DEFAULT '1.0.0',
    file_info JSONB, -- 파일 정보 (원본명, 경로, 크기, MIME 타입 등) - NULL 가능
    source_type VARCHAR(20) DEFAULT 'upload' CHECK (source_type IN ('upload', 'github', 'gitlab', 'bitbucket', 'npm', 'url')), -- 소스 타입
    source_url VARCHAR(500), -- 외부 저장소 URL 또는 패키지 URL
    source_info JSONB, -- 외부 저장소 정보 (브랜치, 커밋 해시, 태그 등)
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deprecated')),
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 코드 컴포넌트 버전 히스토리 테이블
CREATE TABLE IF NOT EXISTS code_component_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES code_components(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    file_info JSONB NOT NULL,
    change_log TEXT,
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(component_id, version)
);

-- 코드 컴포넌트 사용 통계 테이블
CREATE TABLE IF NOT EXISTS code_component_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES code_components(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES timbel_users(id),
    project_name VARCHAR(200),
    action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'download', 'use', 'fork')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 코드 컴포넌트 의존성 테이블
CREATE TABLE IF NOT EXISTS code_component_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES code_components(id) ON DELETE CASCADE,
    dependency_name VARCHAR(200) NOT NULL,
    dependency_version VARCHAR(50),
    dependency_type VARCHAR(50) DEFAULT 'npm', -- npm, pip, maven, gradle, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_code_components_type ON code_components(type);
CREATE INDEX IF NOT EXISTS idx_code_components_language ON code_components(language);
CREATE INDEX IF NOT EXISTS idx_code_components_framework ON code_components(framework);
CREATE INDEX IF NOT EXISTS idx_code_components_creator ON code_components(creator_id);
CREATE INDEX IF NOT EXISTS idx_code_components_status ON code_components(status);
CREATE INDEX IF NOT EXISTS idx_code_components_created_at ON code_components(created_at);
CREATE INDEX IF NOT EXISTS idx_code_component_versions_component_id ON code_component_versions(component_id);
CREATE INDEX IF NOT EXISTS idx_code_component_usage_component_id ON code_component_usage(component_id);
CREATE INDEX IF NOT EXISTS idx_code_component_usage_user_id ON code_component_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_code_component_dependencies_component_id ON code_component_dependencies(component_id);

-- 권한 추가
INSERT INTO permissions (name, description, resource, action) VALUES
('code_components.read', '코드 컴포넌트 조회', 'code_components', 'read'),
('code_components.create', '코드 컴포넌트 생성', 'code_components', 'create'),
('code_components.update', '코드 컴포넌트 수정', 'code_components', 'update'),
('code_components.delete', '코드 컴포넌트 삭제', 'code_components', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 기본 컴포넌트 타입 데이터 삽입
INSERT INTO code_component_types (name, description, icon) VALUES
('Component', '재사용 가능한 UI 컴포넌트', 'widgets'),
('Library', '라이브러리 및 패키지', 'library_books'),
('Snippet', '코드 스니펫', 'code'),
('Template', '프로젝트 템플릿', 'description'),
('Utility', '유틸리티 함수', 'build'),
('Hook', 'React/Vue Hook', 'link'),
('Service', '서비스 클래스/모듈', 'business'),
('Middleware', '미들웨어', 'settings')
ON CONFLICT (name) DO NOTHING;
