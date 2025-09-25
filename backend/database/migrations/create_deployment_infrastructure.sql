-- 배포 인프라 정보 관리 테이블
CREATE TABLE IF NOT EXISTS deployment_infrastructure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL, -- 'nexus', 'docker_registry', 'jenkins', 'argocd'
    environment VARCHAR(20) NOT NULL, -- 'dev', 'staging', 'production', 'global'
    service_name VARCHAR(100) NOT NULL, -- 사용자 친화적 이름
    service_url VARCHAR(255) NOT NULL,
    admin_username VARCHAR(100),
    admin_password_encrypted TEXT, -- AES 암호화된 비밀번호
    service_accounts JSONB DEFAULT '[]', -- 추가 계정 정보 [{"username": "user", "password_encrypted": "...", "role": "user"}]
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'maintenance', 'error'
    health_check_url VARCHAR(255),
    health_status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'warning', 'error', 'unknown'
    last_health_check TIMESTAMP,
    version VARCHAR(50),
    description TEXT,
    tags JSONB DEFAULT '[]', -- 태그 시스템 ["production", "critical", "monitoring"]
    metadata JSONB DEFAULT '{}', -- 추가 메타데이터
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES timbel_users(id),
    updated_by UUID REFERENCES timbel_users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deployment_infrastructure_service_type ON deployment_infrastructure(service_type);
CREATE INDEX IF NOT EXISTS idx_deployment_infrastructure_environment ON deployment_infrastructure(environment);
CREATE INDEX IF NOT EXISTS idx_deployment_infrastructure_status ON deployment_infrastructure(status);
CREATE INDEX IF NOT EXISTS idx_deployment_infrastructure_health_status ON deployment_infrastructure(health_status);

-- 헬스체크 히스토리 테이블
CREATE TABLE IF NOT EXISTS infrastructure_health_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infrastructure_id UUID REFERENCES deployment_infrastructure(id) ON DELETE CASCADE,
    health_status VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 인프라 변경 이력 테이블
CREATE TABLE IF NOT EXISTS infrastructure_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infrastructure_id UUID REFERENCES deployment_infrastructure(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'health_check'
    changed_fields JSONB, -- 변경된 필드들
    old_values JSONB, -- 이전 값들
    new_values JSONB, -- 새로운 값들
    changed_by UUID REFERENCES timbel_users(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 기본 데이터 삽입 (현재 운영 중인 인프라)
INSERT INTO deployment_infrastructure (
    service_type, environment, service_name, service_url, 
    admin_username, admin_password_encrypted, service_accounts, 
    status, description, tags
) VALUES 
-- Container Registries
('nexus', 'global', 'Nexus Repository Manager', 'https://nexus.langsa.ai', 
 'admin', 'encrypted_timbelNexus0901!', '[]', 
 'active', 'Main artifact repository for container images and packages', 
 '["production", "critical", "container-registry"]'),

('docker_registry', 'global', 'Docker Registry', 'https://docker.langsa.ai', 
 'docker', 'encrypted_timbelDocker0901!', '[]', 
 'active', 'Secondary Docker container registry', 
 '["production", "backup", "container-registry"]'),

-- Jenkins CI/CD
('jenkins', 'global', 'Jenkins CI/CD Server', 'https://jenkins.langsa.ai', 
 'admin', 'encrypted_timbelJenkins0901!', 
 '[{"username": "aicc", "password_encrypted": "encrypted_ZAQ!2wsx", "role": "user"}]', 
 'active', 'Main CI/CD pipeline server', 
 '["production", "critical", "cicd"]'),

-- Argo CD GitOps
('argocd', 'dev', 'Argo CD Development', 'https://dev-ecp-argocd.langsa.ai', 
 'admin', 'encrypted_Lt95YrDQ4pfHR9za', 
 '[{"username": "develop", "password_encrypted": "encrypted_ZAQ!2wsx", "role": "developer"}]', 
 'active', 'Development environment GitOps deployment', 
 '["development", "gitops"]'),

('argocd', 'staging', 'Argo CD Staging', 'https://stg-ecp-argocd.langsa.ai', 
 'admin', 'encrypted_dNFPHhYXTuZMliLG', 
 '[{"username": "develop", "password_encrypted": "encrypted_ZAQ!2wsx", "role": "developer"}]', 
 'active', 'Staging environment GitOps deployment', 
 '["staging", "gitops"]'),

('argocd', 'production', 'Argo CD Production', 'https://ecp-argocd.langsa.ai', 
 'admin', 'encrypted_Z80uxgeqBiPe7DbR', 
 '[{"username": "develop", "password_encrypted": "encrypted_ZAQ!2wsx", "role": "developer"}]', 
 'active', 'Production environment GitOps deployment', 
 '["production", "critical", "gitops"]')

ON CONFLICT DO NOTHING;

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_infrastructure_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_infrastructure_updated_at ON deployment_infrastructure;
CREATE TRIGGER trigger_update_infrastructure_updated_at
    BEFORE UPDATE ON deployment_infrastructure
    FOR EACH ROW
    EXECUTE FUNCTION update_infrastructure_updated_at();

-- 변경 로그 트리거 함수
CREATE OR REPLACE FUNCTION log_infrastructure_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO infrastructure_change_log (
            infrastructure_id, action, new_values, changed_by
        ) VALUES (
            NEW.id, 'created', to_jsonb(NEW), NEW.created_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO infrastructure_change_log (
            infrastructure_id, action, old_values, new_values, changed_by
        ) VALUES (
            NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO infrastructure_change_log (
            infrastructure_id, action, old_values
        ) VALUES (
            OLD.id, 'deleted', to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 변경 로그 트리거
DROP TRIGGER IF EXISTS trigger_log_infrastructure_changes ON deployment_infrastructure;
CREATE TRIGGER trigger_log_infrastructure_changes
    AFTER INSERT OR UPDATE OR DELETE ON deployment_infrastructure
    FOR EACH ROW
    EXECUTE FUNCTION log_infrastructure_changes();
