-- [advice from AI] Timbel Knowledge 통합 데이터베이스 초기화 스크립트
-- 모든 테이블과 데이터를 하나의 timbel_knowledge 데이터베이스로 통합
-- 생성일: 2025-09-26
-- 목적: 데이터베이스 분리 문제 해결 및 단일 DB 구조로 통합

-- =============================================================================
-- 1. 기본 설정 및 확장 기능
-- =============================================================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 개발 환경 설정
SET timezone = 'Asia/Seoul';

-- 기본 데이터베이스 설정
COMMENT ON DATABASE timbel_knowledge IS 'Timbel 지식자원 플랫폼 통합 데이터베이스';

-- 기본 스키마 생성
CREATE SCHEMA IF NOT EXISTS timbel_catalog;
CREATE SCHEMA IF NOT EXISTS timbel_auth;
CREATE SCHEMA IF NOT EXISTS timbel_analytics;

COMMENT ON SCHEMA timbel_catalog IS '카탈로그 시스템 (Domain → System → Component)';
COMMENT ON SCHEMA timbel_auth IS '인증 및 조직 관리 시스템';  
COMMENT ON SCHEMA timbel_analytics IS '성과 분석 및 ROI 추적 시스템';

-- 권한 부여
GRANT ALL PRIVILEGES ON SCHEMA timbel_catalog TO timbel_user;
GRANT ALL PRIVILEGES ON SCHEMA timbel_auth TO timbel_user;
GRANT ALL PRIVILEGES ON SCHEMA timbel_analytics TO timbel_user;

-- =============================================================================
-- 2. 기본 테이블 생성 (회사, 조직, 사용자)
-- =============================================================================

-- 회사 테이블
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    business_number VARCHAR(50),
    is_main_company BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 조직 테이블
CREATE TABLE IF NOT EXISTS timbel_organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    structure_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES timbel_organization(id),
    permission_level INTEGER NOT NULL,
    team_capacity INTEGER,
    work_scope JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 테이블 (통합된 모든 필요 컬럼 포함)
CREATE TABLE IF NOT EXISTS timbel_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    position VARCHAR(50),
    permission_level INTEGER DEFAULT 3,
    org_structure_id UUID REFERENCES timbel_organization(id),
    leadership_type VARCHAR(50),
    work_permissions JSONB DEFAULT '{}',
    team_assignment JSONB DEFAULT '{}',
    approval_info JSONB DEFAULT '{}',
    role_type VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 세션 테이블
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES timbel_users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 3. 도메인 및 시스템 관리 테이블
-- =============================================================================

-- 도메인 테이블 (통합)
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES timbel_users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 시스템 테이블 (모든 필요 컬럼 포함)
CREATE TABLE IF NOT EXISTS systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    domain_id UUID REFERENCES domains(id),
    owner_id UUID REFERENCES timbel_users(id),
    project_id UUID,
    primary_contact UUID REFERENCES timbel_users(id),
    technical_lead UUID REFERENCES timbel_users(id),
    business_owner UUID REFERENCES timbel_users(id),
    created_by UUID REFERENCES timbel_users(id),
    status VARCHAR(50) DEFAULT 'active',
    version VARCHAR(50) DEFAULT '1.0.0',
    approval_status VARCHAR(50) DEFAULT 'pending',
    code_quality_score NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 4. 프로젝트 관리 테이블
-- =============================================================================

-- 프로젝트 테이블 (모든 필요 컬럼 포함)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    domain_id UUID REFERENCES domains(id),
    status VARCHAR(50) DEFAULT 'planning',
    customer_company VARCHAR(200),
    start_date DATE,
    end_date DATE,
    assigned_po UUID REFERENCES timbel_users(id),
    approved_by UUID REFERENCES timbel_users(id),
    created_by UUID REFERENCES timbel_users(id),
    approval_status VARCHAR(20) DEFAULT 'pending',
    project_status VARCHAR(20) DEFAULT 'planning',
    urgency_level VARCHAR(20) DEFAULT 'medium',
    deadline DATE,
    target_system_name VARCHAR(255),
    project_overview TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- systems 테이블에 project_id 외래키 제약조건 추가
ALTER TABLE systems ADD CONSTRAINT fk_systems_project_id 
FOREIGN KEY (project_id) REFERENCES projects(id);

-- =============================================================================
-- 5. 지식자원 관리 테이블
-- =============================================================================

-- 문서 테이블 (모든 필요 컬럼 포함)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    content TEXT,
    category VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'document',
    tags TEXT[],
    version VARCHAR(20) DEFAULT '1.0.0',
    status VARCHAR(20) DEFAULT 'draft',
    is_public BOOLEAN DEFAULT false,
    file_info JSONB,
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 코드 컴포넌트 테이블 (모든 필요 컬럼 포함)
CREATE TABLE IF NOT EXISTS code_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    title VARCHAR(300),
    description TEXT,
    type VARCHAR(50) NOT NULL,
    language VARCHAR(50) NOT NULL,
    framework VARCHAR(100),
    dependencies JSONB,
    source_code TEXT,
    documentation TEXT,
    examples TEXT,
    props_schema JSONB,
    usage_example TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    file_info JSONB,
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    status VARCHAR(20) DEFAULT 'active',
    download_count INTEGER DEFAULT 0,
    complexity_score NUMERIC(5,2) DEFAULT 0.0,
    rating NUMERIC(3,2) DEFAULT 0.0,
    source_type VARCHAR(20) DEFAULT 'upload',
    source_url VARCHAR(500),
    source_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 6. 기본 데이터 삽입
-- =============================================================================

-- 팀벨 메인 회사 생성
INSERT INTO companies (name, business_name, address, phone, email, business_number, is_main_company) 
VALUES (
    '팀벨',
    '(주)팀벨 Timeless Label',
    '서울 강남구 강남대로 94길 66, 신동빌딩 3-5층',
    '02-584-8181',
    'sales@timbel.net',
    '206-81-58545',
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Administrator 조직 생성
INSERT INTO timbel_organization (company_id, structure_type, name, description, permission_level, team_capacity, work_scope)
SELECT 
    id,
    'leadership',
    'System Administration',
    'Timbel 플랫폼 최상위 관리 조직',
    0,
    1,
    '{"responsibilities": ["전체 시스템 관리", "사용자 승인", "권한 설정", "조직 관리"]}'::jsonb
FROM companies WHERE is_main_company = TRUE
ON CONFLICT DO NOTHING;

-- Administrator 계정 생성 (비밀번호: 1q2w3e4r)
INSERT INTO timbel_users (
    company_id, 
    username, 
    email, 
    password_hash, 
    full_name, 
    department, 
    position, 
    permission_level, 
    org_structure_id, 
    leadership_type,
    role_type,
    status
)
SELECT 
    c.id,
    'admin',
    'admin@timbel.net',
    '$2b$12$K8G4zGq.Xv6rFZjJ8YQN5.xJgFKX9vWzN2QjD5cP8sL1mR7tU9vHm',
    '시스템 관리자',
    '시스템 운영팀',
    '최고 관리자',
    0,
    o.id,
    'super_admin',
    'admin',
    'active'
FROM companies c, timbel_organization o 
WHERE c.is_main_company = TRUE AND o.name = 'System Administration'
ON CONFLICT (username) DO NOTHING;

-- =============================================================================
-- 7. 인덱스 생성
-- =============================================================================

-- 성능 최적화를 위한 인덱스들
CREATE INDEX IF NOT EXISTS idx_systems_domain ON systems(domain_id);
CREATE INDEX IF NOT EXISTS idx_systems_owner ON systems(owner_id);
CREATE INDEX IF NOT EXISTS idx_systems_project ON systems(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_po ON projects(assigned_po);
CREATE INDEX IF NOT EXISTS idx_documents_creator ON documents(creator_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_code_components_creator ON code_components(creator_id);
CREATE INDEX IF NOT EXISTS idx_code_components_type ON code_components(type);
CREATE INDEX IF NOT EXISTS idx_code_components_language ON code_components(language);

-- =============================================================================
-- 8. 테이블 코멘트
-- =============================================================================

COMMENT ON TABLE companies IS '회사 정보 테이블';
COMMENT ON TABLE timbel_organization IS '조직 구조 테이블 (3단계 리더십)';
COMMENT ON TABLE timbel_users IS '사용자 테이블 (권한 기반, 통합된 모든 필드 포함)';
COMMENT ON TABLE user_sessions IS 'JWT 세션 관리 테이블';
COMMENT ON TABLE domains IS '도메인 관리 테이블';
COMMENT ON TABLE systems IS '시스템 관리 테이블 (모든 분석 필드 포함)';
COMMENT ON TABLE projects IS '프로젝트 관리 테이블 (모든 분석 필드 포함)';
COMMENT ON TABLE documents IS '문서 관리 테이블';
COMMENT ON TABLE code_components IS '코드 컴포넌트 관리 테이블 (모든 분석 필드 포함)';

-- =============================================================================
-- 9. 완료 메시지
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Timbel Knowledge 통합 데이터베이스 초기화 완료!';
    RAISE NOTICE '📊 생성된 주요 테이블:';
    RAISE NOTICE '   - companies, timbel_organization, timbel_users';
    RAISE NOTICE '   - domains, systems, projects';
    RAISE NOTICE '   - documents, code_components';
    RAISE NOTICE '🔧 모든 분석 도구와 API 호환성을 위한 컬럼들이 포함되었습니다.';
    RAISE NOTICE '🎯 단일 데이터베이스 구조로 통합 완료!';
END $$;
