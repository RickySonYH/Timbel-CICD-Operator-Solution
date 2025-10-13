-- [advice from AI] Timbel CICD Operator Solution - 운영센터 전용 데이터베이스 스키마
-- 배포 자동화 및 워크플로우 관리에 집중
-- 생성일: 2025-01-20
-- 목적: 운영센터 관련 테이블만 유지하여 독립적인 솔루션 구성

-- =============================================================================
-- 1. 기본 설정 및 확장 기능
-- =============================================================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 개발 환경 설정
SET timezone = 'Asia/Seoul';

-- 기본 데이터베이스 설정
COMMENT ON DATABASE timbel_cicd_operator IS 'Timbel CICD Operator Solution - 운영센터 전용';

-- =============================================================================
-- 2. 사용자 인증 테이블 (운영센터 접근용)
-- =============================================================================

-- 사용자 테이블 (운영센터 전용)
CREATE TABLE IF NOT EXISTS timbel_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) DEFAULT 'operations',
    permission_level INTEGER DEFAULT 3,
    work_permissions JSONB DEFAULT '{}',
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
-- 3. 운영센터 인프라 관리 테이블
-- =============================================================================

-- 인프라 관리 테이블
CREATE TABLE IF NOT EXISTS operations_infrastructures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cloud_provider VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    cluster_type VARCHAR(50) DEFAULT 'kubernetes',
    status VARCHAR(20) DEFAULT 'active',
    total_nodes INTEGER DEFAULT 0,
    total_cpu_cores INTEGER DEFAULT 0,
    total_memory_gb INTEGER DEFAULT 0,
    total_storage_gb INTEGER DEFAULT 0,
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인프라 노드 테이블
CREATE TABLE IF NOT EXISTS operations_infrastructure_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infrastructure_id UUID REFERENCES operations_infrastructures(id) ON DELETE CASCADE,
    node_name VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    cpu_cores INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    storage_gb INTEGER NOT NULL,
    gpu_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 4. 멀티테넌트 관리 테이블
-- =============================================================================

-- 테넌트 테이블
CREATE TABLE IF NOT EXISTS operations_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) UNIQUE NOT NULL,
    tenant_name VARCHAR(100) NOT NULL,
    description TEXT,
    infrastructure_id UUID REFERENCES operations_infrastructures(id),
    environment VARCHAR(20) DEFAULT 'development',
    cloud_provider VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    deployment_mode VARCHAR(50) DEFAULT 'auto-calculate',
    deployment_strategy VARCHAR(50) DEFAULT 'rolling',
    auto_scaling BOOLEAN DEFAULT true,
    monitoring_enabled BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 테넌트 서비스 테이블
CREATE TABLE IF NOT EXISTS operations_tenant_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    version VARCHAR(50) NOT NULL,
    cpu_cores INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    storage_gb INTEGER NOT NULL,
    replicas INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 5. 배포 관리 테이블
-- =============================================================================

-- 배포 테이블
CREATE TABLE IF NOT EXISTS operations_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_name VARCHAR(100) NOT NULL,
    tenant_id UUID REFERENCES operations_tenants(id),
    project_name VARCHAR(100) NOT NULL,
    repository_url TEXT NOT NULL,
    branch VARCHAR(100) DEFAULT 'main',
    version VARCHAR(50) NOT NULL,
    deployment_strategy VARCHAR(50) DEFAULT 'rolling',
    status VARCHAR(20) DEFAULT 'pending',
    progress_percentage INTEGER DEFAULT 0,
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 6. 모니터링 테이블
-- =============================================================================

-- 서비스 모니터링 테이블
CREATE TABLE IF NOT EXISTS operations_service_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0,
    memory_usage_percent DECIMAL(5,2) DEFAULT 0,
    disk_usage_percent DECIMAL(5,2) DEFAULT 0,
    network_in_bytes BIGINT DEFAULT 0,
    network_out_bytes BIGINT DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    response_time_ms DECIMAL(8,2) DEFAULT 0,
    uptime_percent DECIMAL(5,2) DEFAULT 100,
    status VARCHAR(20) DEFAULT 'healthy',
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS operations_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    acknowledged_by UUID REFERENCES timbel_users(id),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 7. CI/CD 파이프라인 테이블
-- =============================================================================

-- 파이프라인 테이블
CREATE TABLE IF NOT EXISTS operations_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name VARCHAR(100) NOT NULL,
    project_name VARCHAR(100) NOT NULL,
    repository_url TEXT NOT NULL,
    jenkins_job_name VARCHAR(200),
    build_status VARCHAR(20) DEFAULT 'idle',
    last_build_number INTEGER DEFAULT 0,
    last_build_result VARCHAR(20),
    last_build_duration INTEGER,
    last_build_at TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 빌드 히스토리 테이블
CREATE TABLE IF NOT EXISTS operations_build_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES operations_pipelines(id) ON DELETE CASCADE,
    build_number INTEGER NOT NULL,
    build_status VARCHAR(20) NOT NULL,
    build_result VARCHAR(20),
    build_duration INTEGER,
    commit_hash VARCHAR(100),
    commit_message TEXT,
    triggered_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 8. 인덱스 생성
-- =============================================================================

-- 사용자 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_timbel_users_username ON timbel_users(username);
CREATE INDEX IF NOT EXISTS idx_timbel_users_email ON timbel_users(email);
CREATE INDEX IF NOT EXISTS idx_timbel_users_role_type ON timbel_users(role_type);

-- 세션 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 인프라 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_operations_infrastructures_status ON operations_infrastructures(status);
CREATE INDEX IF NOT EXISTS idx_operations_infrastructure_nodes_infrastructure_id ON operations_infrastructure_nodes(infrastructure_id);

-- 테넌트 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_operations_tenants_tenant_id ON operations_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operations_tenants_status ON operations_tenants(status);
CREATE INDEX IF NOT EXISTS idx_operations_tenant_services_tenant_id ON operations_tenant_services(tenant_id);

-- 배포 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_operations_deployments_tenant_id ON operations_deployments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operations_deployments_status ON operations_deployments(status);

-- 모니터링 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_operations_service_monitoring_tenant_id ON operations_service_monitoring(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operations_alerts_tenant_id ON operations_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operations_alerts_status ON operations_alerts(status);

-- 파이프라인 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_operations_pipelines_project_name ON operations_pipelines(project_name);
CREATE INDEX IF NOT EXISTS idx_operations_pipelines_build_status ON operations_pipelines(build_status);
CREATE INDEX IF NOT EXISTS idx_operations_build_history_pipeline_id ON operations_build_history(pipeline_id);

-- =============================================================================
-- 9. 기본 데이터 삽입
-- =============================================================================

-- 운영센터 기본 사용자 계정
INSERT INTO timbel_users (username, email, password_hash, full_name, role_type, permission_level) VALUES
('admin', 'admin@timbel.com', '$2a$10$rQZ8vQZ8vQZ8vQZ8vQZ8vO8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8v', '시스템 관리자', 'admin', 1),
('operations', 'operations@timbel.com', '$2a$10$rQZ8vQZ8vQZ8vQZ8vQZ8vO8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8v', '운영팀 사용자', 'operations', 3),
('deployer', 'deployer@timbel.com', '$2a$10$rQZ8vQZ8vQZ8vQZ8vQZ8vO8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8v', '배포 담당자', 'operations', 4)
ON CONFLICT (username) DO NOTHING;

-- 기본 인프라 설정
INSERT INTO operations_infrastructures (name, description, cloud_provider, region, cluster_type, status, total_nodes, total_cpu_cores, total_memory_gb, total_storage_gb) VALUES
('Main Cluster', '메인 Kubernetes 클러스터', 'aws', 'ap-northeast-2', 'kubernetes', 'active', 3, 12, 48, 500)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 10. 뷰 생성
-- =============================================================================

-- 테넌트별 서비스 현황 뷰
CREATE OR REPLACE VIEW operations_tenant_services_view AS
SELECT 
    t.tenant_id,
    t.tenant_name,
    t.environment,
    t.status as tenant_status,
    COUNT(ts.id) as total_services,
    SUM(ts.cpu_cores) as total_cpu_cores,
    SUM(ts.memory_gb) as total_memory_gb,
    SUM(ts.storage_gb) as total_storage_gb,
    t.created_at
FROM operations_tenants t
LEFT JOIN operations_tenant_services ts ON t.id = ts.tenant_id
GROUP BY t.id, t.tenant_id, t.tenant_name, t.environment, t.status, t.created_at;

-- 배포 현황 뷰
CREATE OR REPLACE VIEW operations_deployment_status_view AS
SELECT 
    d.id,
    d.deployment_name,
    d.project_name,
    d.status,
    d.progress_percentage,
    t.tenant_name,
    u.full_name as created_by_name,
    d.created_at,
    d.updated_at
FROM operations_deployments d
LEFT JOIN operations_tenants t ON d.tenant_id = t.id
LEFT JOIN timbel_users u ON d.created_by = u.id;

-- 모니터링 현황 뷰
CREATE OR REPLACE VIEW operations_monitoring_status_view AS
SELECT 
    t.tenant_name,
    sm.service_name,
    sm.status,
    sm.cpu_usage_percent,
    sm.memory_usage_percent,
    sm.disk_usage_percent,
    sm.response_time_ms,
    sm.uptime_percent,
    sm.last_updated
FROM operations_service_monitoring sm
JOIN operations_tenants t ON sm.tenant_id = t.id;

-- =============================================================================
-- 11. 권한 설정
-- =============================================================================

-- 운영센터 사용자 권한 부여
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO timbel_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO timbel_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO timbel_user;

-- 뷰 권한 부여
GRANT SELECT ON operations_tenant_services_view TO timbel_user;
GRANT SELECT ON operations_deployment_status_view TO timbel_user;
GRANT SELECT ON operations_monitoring_status_view TO timbel_user;

COMMENT ON DATABASE timbel_cicd_operator IS 'Timbel CICD Operator Solution - 운영센터 전용 데이터베이스 (배포 자동화 및 워크플로우 관리)';
