-- [advice from AI] 도메인 및 시스템 관리 테이블 스키마
-- 승인 전후 상태를 관리하기 위한 테이블들

-- UUID 확장 활성화 (이미 있을 수 있지만 안전하게)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 도메인 (영업처/사업 영역) 테이블
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    business_area VARCHAR(100), -- 사업 영역 (예: 금융, 제조, 유통 등)
    region VARCHAR(100), -- 지역 (예: 서울, 부산, 해외 등)
    contact_person VARCHAR(100), -- 담당자
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    
    -- 승인 관리
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'draft')),
    approved_by UUID REFERENCES timbel_users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- 시스템 관리
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 통계
    total_systems INTEGER DEFAULT 0,
    active_systems INTEGER DEFAULT 0
);

-- 시스템 (프로젝트) 테이블
CREATE TABLE IF NOT EXISTS systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
    
    -- 기본 정보
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',
    category VARCHAR(100) DEFAULT 'application', -- application, service, library, tool 등
    
    -- 기술 정보
    tech_stack TEXT[], -- ['React', 'Node.js', 'PostgreSQL']
    programming_languages TEXT[], -- ['JavaScript', 'Python', 'SQL']
    frameworks TEXT[], -- ['Express', 'React', 'Material-UI']
    databases TEXT[], -- ['PostgreSQL', 'Redis']
    
    -- 소스 정보
    source_type VARCHAR(50), -- github, gitlab, bitbucket, internal
    source_url TEXT,
    source_branch VARCHAR(100) DEFAULT 'main',
    repository_size BIGINT, -- bytes
    
    -- 라이프사이클
    lifecycle VARCHAR(50) DEFAULT 'development' CHECK (lifecycle IN ('planning', 'development', 'testing', 'production', 'maintenance', 'deprecated')),
    deployment_status VARCHAR(50) DEFAULT 'not_deployed' CHECK (deployment_status IN ('not_deployed', 'staging', 'production', 'retired')),
    
    -- 담당자 정보
    owner_group VARCHAR(100), -- 소유 팀/그룹
    primary_contact UUID REFERENCES timbel_users(id),
    technical_lead UUID REFERENCES timbel_users(id),
    business_owner UUID REFERENCES timbel_users(id),
    
    -- 승인 관리
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'draft')),
    approval_request_id UUID REFERENCES approval_requests(request_id),
    approved_by UUID REFERENCES timbel_users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- 추출 정보 (자동 등록 시)
    extraction_id UUID, -- 자동 추출 시 생성되는 ID
    extracted_at TIMESTAMP,
    extraction_metadata JSONB DEFAULT '{}',
    
    -- 자산 통계
    total_code_components INTEGER DEFAULT 0,
    total_design_assets INTEGER DEFAULT 0,
    total_documents INTEGER DEFAULT 0,
    total_catalog_components INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    
    -- 품질 지표
    code_quality_score DECIMAL(3,2), -- 0.00 ~ 10.00
    documentation_coverage DECIMAL(5,2), -- 0.00 ~ 100.00
    test_coverage DECIMAL(5,2), -- 0.00 ~ 100.00
    security_score DECIMAL(3,2), -- 0.00 ~ 10.00
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- 시스템 관리
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP,
    
    -- 제약 조건
    UNIQUE(name, domain_id) -- 같은 도메인 내에서 시스템명 중복 방지
);

-- 시스템 종속성 테이블 (시스템 간 의존관계)
CREATE TABLE IF NOT EXISTS system_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    target_system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL, -- api, database, service, library
    description TEXT,
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_system_id, target_system_id, dependency_type)
);

-- 시스템 환경 설정 테이블
CREATE TABLE IF NOT EXISTS system_environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    environment_name VARCHAR(50) NOT NULL, -- development, staging, production
    url TEXT,
    database_config JSONB DEFAULT '{}',
    api_endpoints JSONB DEFAULT '{}',
    deployment_config JSONB DEFAULT '{}',
    health_check_url TEXT,
    last_deployed_at TIMESTAMP,
    deployed_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(system_id, environment_name)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_domains_approval_status ON domains(approval_status);
CREATE INDEX IF NOT EXISTS idx_domains_business_area ON domains(business_area);
CREATE INDEX IF NOT EXISTS idx_domains_created_at ON domains(created_at);

CREATE INDEX IF NOT EXISTS idx_systems_domain_id ON systems(domain_id);
CREATE INDEX IF NOT EXISTS idx_systems_approval_status ON systems(approval_status);
CREATE INDEX IF NOT EXISTS idx_systems_lifecycle ON systems(lifecycle);
CREATE INDEX IF NOT EXISTS idx_systems_category ON systems(category);
CREATE INDEX IF NOT EXISTS idx_systems_created_at ON systems(created_at);
CREATE INDEX IF NOT EXISTS idx_systems_extraction_id ON systems(extraction_id);
CREATE INDEX IF NOT EXISTS idx_systems_approval_request_id ON systems(approval_request_id);

CREATE INDEX IF NOT EXISTS idx_system_dependencies_source ON system_dependencies(source_system_id);
CREATE INDEX IF NOT EXISTS idx_system_dependencies_target ON system_dependencies(target_system_id);

CREATE INDEX IF NOT EXISTS idx_system_environments_system_id ON system_environments(system_id);
CREATE INDEX IF NOT EXISTS idx_system_environments_name ON system_environments(environment_name);

-- 트리거 함수: 시스템 통계 업데이트
CREATE OR REPLACE FUNCTION update_domain_system_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'systems' THEN
        -- 도메인의 시스템 통계 업데이트
        IF NEW.domain_id IS NOT NULL THEN
            UPDATE domains SET 
                total_systems = (
                    SELECT COUNT(*) FROM systems WHERE domain_id = NEW.domain_id
                ),
                active_systems = (
                    SELECT COUNT(*) FROM systems 
                    WHERE domain_id = NEW.domain_id 
                    AND lifecycle IN ('development', 'testing', 'production')
                ),
                updated_at = NOW()
            WHERE id = NEW.domain_id;
        END IF;
        
        -- 이전 도메인의 통계도 업데이트 (도메인 변경 시)
        IF TG_OP = 'UPDATE' AND OLD.domain_id IS NOT NULL AND OLD.domain_id != COALESCE(NEW.domain_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
            UPDATE domains SET 
                total_systems = (
                    SELECT COUNT(*) FROM systems WHERE domain_id = OLD.domain_id
                ),
                active_systems = (
                    SELECT COUNT(*) FROM systems 
                    WHERE domain_id = OLD.domain_id 
                    AND lifecycle IN ('development', 'testing', 'production')
                ),
                updated_at = NOW()
            WHERE id = OLD.domain_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_domain_system_stats ON systems;
CREATE TRIGGER trigger_update_domain_system_stats
    AFTER INSERT OR UPDATE OR DELETE ON systems
    FOR EACH ROW EXECUTE FUNCTION update_domain_system_stats();

-- 샘플 데이터 삽입
INSERT INTO domains (name, description, business_area, region, contact_person, contact_email, priority_level, approval_status, created_by) 
VALUES 
    ('금융서비스', '은행, 보험, 증권 관련 시스템', '금융', '서울', '김금융', 'finance@timbel.com', 'high', 'approved', 
     (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1)),
    ('제조업', '생산관리, 품질관리, 공급망 관리 시스템', '제조', '경기', '박제조', 'manufacturing@timbel.com', 'high', 'approved',
     (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1)),
    ('유통/물류', '재고관리, 배송, 고객관리 시스템', '유통', '전국', '이유통', 'retail@timbel.com', 'medium', 'pending',
     (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1)),
    ('헬스케어', '병원정보시스템, 의료기기 연동', '의료', '서울', '최의료', 'healthcare@timbel.com', 'critical', 'draft',
     (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- 샘플 시스템 데이터 삽입
INSERT INTO systems (
    domain_id, name, title, description, version, category, 
    tech_stack, programming_languages, frameworks, databases,
    source_type, source_url, lifecycle, owner_group, 
    approval_status, created_by
) VALUES 
    (
        (SELECT id FROM domains WHERE name = '금융서비스' LIMIT 1),
        'core-banking-system', 
        '핵심 뱅킹 시스템',
        '계좌관리, 거래처리, 대출관리를 담당하는 핵심 시스템',
        '2.1.0',
        'application',
        ARRAY['Spring Boot', 'React', 'PostgreSQL', 'Redis'],
        ARRAY['Java', 'JavaScript', 'SQL'],
        ARRAY['Spring Boot', 'React', 'Material-UI'],
        ARRAY['PostgreSQL', 'Redis'],
        'github',
        'https://github.com/company/core-banking-system',
        'production',
        'Banking Team',
        'approved',
        (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1)
    ),
    (
        (SELECT id FROM domains WHERE name = '제조업' LIMIT 1),
        'production-management', 
        '생산관리 시스템',
        '생산계획, 작업지시, 품질관리를 통합한 MES 시스템',
        '1.5.2',
        'application',
        ARRAY['Node.js', 'Vue.js', 'MongoDB', 'InfluxDB'],
        ARRAY['JavaScript', 'Python', 'SQL'],
        ARRAY['Express', 'Vue.js', 'Vuetify'],
        ARRAY['MongoDB', 'InfluxDB'],
        'gitlab',
        'https://gitlab.com/company/production-management',
        'production',
        'Manufacturing Team',
        'approved',
        (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1)
    ),
    (
        (SELECT id FROM domains WHERE name = '유통/물류' LIMIT 1),
        'inventory-system', 
        '재고관리 시스템',
        '실시간 재고추적, 자동발주, 창고관리 시스템',
        '1.0.0',
        'application',
        ARRAY['Python', 'Django', 'PostgreSQL', 'Celery'],
        ARRAY['Python', 'JavaScript', 'SQL'],
        ARRAY['Django', 'Bootstrap'],
        ARRAY['PostgreSQL', 'Redis'],
        'github',
        'https://github.com/company/inventory-system',
        'development',
        'Logistics Team',
        'pending',
        (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1)
    )
ON CONFLICT (name, domain_id) DO NOTHING;

-- 시스템 환경 설정 샘플 데이터
INSERT INTO system_environments (system_id, environment_name, url, health_check_url)
SELECT 
    s.id,
    env.name,
    CASE 
        WHEN env.name = 'development' THEN 'https://dev-' || s.name || '.timbel.com'
        WHEN env.name = 'staging' THEN 'https://staging-' || s.name || '.timbel.com'
        WHEN env.name = 'production' THEN 'https://' || s.name || '.timbel.com'
    END,
    CASE 
        WHEN env.name = 'development' THEN 'https://dev-' || s.name || '.timbel.com/health'
        WHEN env.name = 'staging' THEN 'https://staging-' || s.name || '.timbel.com/health'
        WHEN env.name = 'production' THEN 'https://' || s.name || '.timbel.com/health'
    END
FROM systems s
CROSS JOIN (VALUES ('development'), ('staging'), ('production')) AS env(name)
WHERE s.approval_status = 'approved'
ON CONFLICT (system_id, environment_name) DO NOTHING;

-- 권한 설정
GRANT SELECT, INSERT, UPDATE, DELETE ON domains TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON systems TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_dependencies TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_environments TO timbel_user;

-- 시퀀스 권한 (필요한 경우)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO timbel_user;
