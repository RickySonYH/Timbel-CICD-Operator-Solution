-- [advice from AI] 시스템 배포 정보 필드 추가
-- 납품 구조와 CI/CD 배포를 위한 목적지 정보

-- 시스템 테이블에 배포 관련 필드 추가
ALTER TABLE systems ADD COLUMN IF NOT EXISTS client_company VARCHAR(255);
ALTER TABLE systems ADD COLUMN IF NOT EXISTS client_department VARCHAR(255);
ALTER TABLE systems ADD COLUMN IF NOT EXISTS client_contact_person VARCHAR(255);
ALTER TABLE systems ADD COLUMN IF NOT EXISTS client_contact_email VARCHAR(255);
ALTER TABLE systems ADD COLUMN IF NOT EXISTS deployment_target JSONB DEFAULT '{}';
ALTER TABLE systems ADD COLUMN IF NOT EXISTS deployment_environments JSONB DEFAULT '[]';
ALTER TABLE systems ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'development';
ALTER TABLE systems ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE systems ADD COLUMN IF NOT EXISTS maintenance_contact VARCHAR(255);
ALTER TABLE systems ADD COLUMN IF NOT EXISTS sla_requirements JSONB DEFAULT '{}';

-- 배포 환경 정보를 위한 별도 테이블 (이미 존재하는 system_environments 확장)
CREATE TABLE IF NOT EXISTS system_deployment_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
    environment_name VARCHAR(50) NOT NULL, -- 'dev', 'staging', 'production'
    deployment_type VARCHAR(50) NOT NULL, -- 'docker', 'kubernetes', 'vm', 'cloud'
    target_server VARCHAR(255),
    target_port INTEGER,
    target_domain VARCHAR(255),
    database_config JSONB DEFAULT '{}',
    environment_variables JSONB DEFAULT '{}',
    resource_requirements JSONB DEFAULT '{}',
    backup_config JSONB DEFAULT '{}',
    monitoring_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(system_id, environment_name)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_systems_client_company ON systems(client_company);
CREATE INDEX IF NOT EXISTS idx_systems_delivery_status ON systems(delivery_status);
CREATE INDEX IF NOT EXISTS idx_systems_delivery_date ON systems(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deployment_configs_system_id ON system_deployment_configs(system_id);
CREATE INDEX IF NOT EXISTS idx_deployment_configs_environment ON system_deployment_configs(environment_name);

-- 배송 상태 체크 제약조건 추가
ALTER TABLE systems ADD CONSTRAINT IF NOT EXISTS systems_delivery_status_check 
CHECK (delivery_status IN ('development', 'testing', 'staging', 'delivered', 'maintenance', 'retired'));

-- 배포 타입 체크 제약조건 추가
ALTER TABLE system_deployment_configs ADD CONSTRAINT IF NOT EXISTS deployment_configs_type_check 
CHECK (deployment_type IN ('docker', 'kubernetes', 'vm', 'cloud', 'on-premise'));

-- 환경 이름 체크 제약조건 추가
ALTER TABLE system_deployment_configs ADD CONSTRAINT IF NOT EXISTS deployment_configs_env_check 
CHECK (environment_name IN ('dev', 'test', 'staging', 'production', 'demo'));

-- 샘플 배포 설정 데이터 (기존 시스템들에 대해)
INSERT INTO system_deployment_configs (system_id, environment_name, deployment_type, target_domain, target_port, resource_requirements)
SELECT 
    s.id,
    'production',
    'docker',
    CASE 
        WHEN d.name = '국민은행' THEN 'kb-internal.co.kr'
        WHEN d.name = '삼성전자' THEN 'samsung-internal.com'
        WHEN d.name = '롯데마트' THEN 'lotte-systems.co.kr'
        ELSE 'client-system.local'
    END,
    CASE 
        WHEN s.category = 'web_application' THEN 80
        WHEN s.category = 'api_service' THEN 8080
        ELSE 3000
    END,
    jsonb_build_object(
        'cpu', '2 cores',
        'memory', '4GB',
        'storage', '20GB',
        'replicas', 2
    )
FROM systems s
LEFT JOIN domains d ON s.domain_id = d.id
WHERE s.approval_status = 'approved'
ON CONFLICT (system_id, environment_name) DO NOTHING;

COMMENT ON COLUMN systems.client_company IS '납품 고객사 이름';
COMMENT ON COLUMN systems.client_department IS '고객사 담당 부서';
COMMENT ON COLUMN systems.deployment_target IS '배포 대상 정보 (서버, 클라우드 등)';
COMMENT ON COLUMN systems.deployment_environments IS '배포 환경별 설정 정보';
COMMENT ON COLUMN systems.delivery_status IS '납품 상태 (development, testing, staging, delivered, maintenance, retired)';
COMMENT ON COLUMN systems.delivery_date IS '납품 예정일/완료일';
COMMENT ON COLUMN systems.sla_requirements IS 'SLA 요구사항 (가용성, 성능 등)';

COMMENT ON TABLE system_deployment_configs IS '시스템별 배포 환경 설정 정보';
