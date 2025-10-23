-- [advice from AI] timbel_knowledge 데이터베이스 초기화 스크립트
-- 사용자 관리, 지식자원 카탈로그, 승인 워크플로우

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 관리 테이블
CREATE TABLE IF NOT EXISTS timbel_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'operations', 'deployer', 'user'
    department VARCHAR(255),
    position VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 세션 관리
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES timbel_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 도메인 (영업처) 관리
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    company_type VARCHAR(100),
    industry VARCHAR(100),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 프로젝트 관리
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'development', 'testing', 'deployed', 'completed'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    pm_user_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 시스템 관리
CREATE TABLE IF NOT EXISTS systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_type VARCHAR(100),
    technology_stack JSONB DEFAULT '[]',
    repository_url TEXT,
    documentation_url TEXT,
    demo_url TEXT,
    status VARCHAR(50) DEFAULT 'development',
    version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 컴포넌트 관리
CREATE TABLE IF NOT EXISTS components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    component_type VARCHAR(100), -- 'frontend', 'backend', 'database', 'api', 'library'
    technology VARCHAR(100),
    repository_url TEXT,
    documentation TEXT,
    version VARCHAR(50),
    is_reusable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 지식 자산 관리
CREATE TABLE IF NOT EXISTS knowledge_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    asset_type VARCHAR(100), -- 'document', 'code', 'design', 'guide', 'template'
    file_path TEXT,
    file_url TEXT,
    tags JSONB DEFAULT '[]',
    category VARCHAR(100),
    author_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API 정보 관리
CREATE TABLE IF NOT EXISTS apis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    endpoint_url TEXT,
    method VARCHAR(10), -- 'GET', 'POST', 'PUT', 'DELETE'
    request_format JSONB DEFAULT '{}',
    response_format JSONB DEFAULT '{}',
    authentication_required BOOLEAN DEFAULT FALSE,
    rate_limit INTEGER,
    documentation TEXT,
    version VARCHAR(50),
    is_deprecated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 사용자 계정 생성 (비밀번호: 1q2w3e4r)
INSERT INTO timbel_users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@timbel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '시스템 관리자', 'admin'),
('operations', 'operations@timbel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '운영팀', 'operations'),
('deployer', 'deployer@timbel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '배포담당자', 'deployer')
ON CONFLICT (username) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_timbel_users_username ON timbel_users(username);
CREATE INDEX IF NOT EXISTS idx_timbel_users_email ON timbel_users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_domain_id ON projects(domain_id);
CREATE INDEX IF NOT EXISTS idx_systems_project_id ON systems(project_id);
CREATE INDEX IF NOT EXISTS idx_components_system_id ON components(system_id);
CREATE INDEX IF NOT EXISTS idx_apis_system_id ON apis(system_id);
