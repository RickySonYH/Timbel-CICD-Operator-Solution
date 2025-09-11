-- [advice from AI] Timbel 플랫폼 테이블 생성 스크립트
-- 설계서의 스키마를 기반으로 직접 생성

-- 회사 테이블
CREATE TABLE companies (
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
CREATE TABLE timbel_organization (
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

-- 사용자 테이블
CREATE TABLE timbel_users (
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
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- 세션 테이블
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES timbel_users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 카탈로그 도메인 테이블
CREATE TABLE catalog_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    owner_group VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 카탈로그 시스템 테이블  
CREATE TABLE catalog_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    domain_id UUID REFERENCES catalog_domains(id),
    owner_group VARCHAR(100),
    lifecycle VARCHAR(50) DEFAULT 'production',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 카탈로그 컴포넌트 테이블
CREATE TABLE catalog_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    system_id UUID REFERENCES catalog_systems(id),
    owner_group VARCHAR(100),
    lifecycle VARCHAR(50) DEFAULT 'production',
    source_location TEXT,
    deployment_info JSONB,
    performance_metrics JSONB,
    reuse_stats JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

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
);

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
FROM companies WHERE is_main_company = TRUE;

-- Administrator 계정 생성 (비밀번호: 1q2w3e4r)
-- bcrypt hash for "1q2w3e4r" with 12 rounds: $2b$12$K8G4zGq.Xv6rFZjJ8YQN5.xJgFKX9vWzN2QjD5cP8sL1mR7tU9vHm
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
    'active'
FROM companies c, timbel_organization o 
WHERE c.is_main_company = TRUE AND o.name = 'System Administration';

COMMENT ON TABLE companies IS '회사 정보 테이블';
COMMENT ON TABLE timbel_organization IS '조직 구조 테이블 (3단계 리더십)';
COMMENT ON TABLE timbel_users IS '사용자 테이블 (권한 기반)';
COMMENT ON TABLE user_sessions IS 'JWT 세션 관리 테이블';
