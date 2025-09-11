-- [advice from AI] Timbel 운영 센터 PostgreSQL 스키마
-- ECP-AI K8s Orchestrator 호환 테이블 구조

-- ===== 인프라 관리 테이블 =====

-- [advice from AI] 등록된 인프라 정보
CREATE TABLE operations_infrastructures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'kubernetes', 'docker', 'vm', 'bare-metal'
    provider VARCHAR(50) NOT NULL, -- 'aws', 'ncp', 'azure', 'gcp', 'on-premise'
    region VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'maintenance', 'error'
    
    -- [advice from AI] 리소스 정보
    total_cpu INTEGER NOT NULL,
    total_memory INTEGER NOT NULL, -- GB 단위
    total_storage INTEGER NOT NULL, -- GB 단위
    total_gpu INTEGER DEFAULT 0,
    
    -- [advice from AI] 클러스터 정보
    node_count INTEGER DEFAULT 1,
    k8s_version VARCHAR(20),
    
    -- [advice from AI] 네트워크 및 접속 정보
    api_endpoint TEXT,
    dashboard_url TEXT,
    
    -- [advice from AI] 메타데이터
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID, -- 생성한 사용자
    
    CONSTRAINT chk_infrastructure_type CHECK (type IN ('kubernetes', 'docker', 'vm', 'bare-metal')),
    CONSTRAINT chk_infrastructure_provider CHECK (provider IN ('aws', 'ncp', 'azure', 'gcp', 'on-premise')),
    CONSTRAINT chk_infrastructure_status CHECK (status IN ('active', 'inactive', 'maintenance', 'error'))
);

-- [advice from AI] 인프라 노드 정보
CREATE TABLE operations_infrastructure_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infrastructure_id UUID REFERENCES operations_infrastructures(id) ON DELETE CASCADE,
    node_name VARCHAR(200) NOT NULL,
    node_type VARCHAR(50) NOT NULL, -- 'master', 'worker', 'edge'
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'stopped', 'maintenance', 'error'
    
    -- [advice from AI] 노드 리소스
    cpu_cores INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    storage_gb INTEGER NOT NULL,
    gpu_count INTEGER DEFAULT 0,
    
    -- [advice from AI] 시스템 정보
    os_version VARCHAR(100),
    k8s_version VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_node_type CHECK (node_type IN ('master', 'worker', 'edge')),
    CONSTRAINT chk_node_status CHECK (status IN ('running', 'stopped', 'maintenance', 'error'))
);

-- ===== 테넌트 및 배포 관리 테이블 =====

-- [advice from AI] 테넌트 정보
CREATE TABLE operations_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) UNIQUE NOT NULL, -- 사용자 입력 테넌트 ID
    tenant_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- [advice from AI] 환경 설정
    environment VARCHAR(50) NOT NULL, -- 'development', 'staging', 'production'
    cloud_provider VARCHAR(50) NOT NULL, -- 'aws', 'ncp', 'azure', 'gcp'
    region VARCHAR(100) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    
    -- [advice from AI] 배포 모드
    deployment_mode VARCHAR(50) NOT NULL, -- 'auto-calculate', 'custom-specs'
    deployment_strategy VARCHAR(50) DEFAULT 'rolling', -- 'rolling', 'blue-green', 'canary'
    
    -- [advice from AI] 기능 설정
    auto_scaling BOOLEAN DEFAULT true,
    monitoring_enabled BOOLEAN DEFAULT true,
    backup_enabled BOOLEAN DEFAULT true,
    
    -- [advice from AI] 상태 관리
    status VARCHAR(50) DEFAULT 'creating', -- 'creating', 'active', 'inactive', 'error', 'deleting'
    
    -- [advice from AI] 인프라 연동
    infrastructure_id UUID REFERENCES operations_infrastructures(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deployed_at TIMESTAMP,
    created_by UUID, -- 생성한 사용자
    
    CONSTRAINT chk_tenant_environment CHECK (environment IN ('development', 'staging', 'production')),
    CONSTRAINT chk_tenant_provider CHECK (cloud_provider IN ('aws', 'ncp', 'azure', 'gcp')),
    CONSTRAINT chk_tenant_mode CHECK (deployment_mode IN ('auto-calculate', 'custom-specs')),
    CONSTRAINT chk_tenant_strategy CHECK (deployment_strategy IN ('rolling', 'blue-green', 'canary')),
    CONSTRAINT chk_tenant_status CHECK (status IN ('creating', 'active', 'inactive', 'error', 'deleting'))
);

-- [advice from AI] 테넌트 서비스 구성
CREATE TABLE operations_tenant_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    
    -- [advice from AI] 서비스 정보
    service_name VARCHAR(100) NOT NULL, -- 'callbot', 'chatbot', 'advisor', 'stt', 'tts', 'ta', 'qa', 'common'
    service_type VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    
    -- [advice from AI] 채널 및 용량
    channels INTEGER DEFAULT 0, -- 자동 계산 모드용
    max_concurrent INTEGER DEFAULT 0,
    
    -- [advice from AI] 리소스 할당
    cpu_cores DECIMAL(10,2) NOT NULL,
    memory_gb DECIMAL(10,2) NOT NULL,
    gpu_count INTEGER DEFAULT 0,
    storage_gb INTEGER DEFAULT 0,
    replicas INTEGER DEFAULT 1,
    
    -- [advice from AI] 컨테이너 설정
    image_name VARCHAR(500) NOT NULL,
    image_tag VARCHAR(100) DEFAULT 'latest',
    registry_url VARCHAR(500),
    build_source VARCHAR(50) DEFAULT 'pre-built', -- 'pre-built', 'github', 'custom'
    
    -- [advice from AI] 고급 설정 (JSON)
    advanced_settings JSONB DEFAULT '{}',
    environment_variables JSONB DEFAULT '{}',
    health_check_config JSONB DEFAULT '{}',
    
    -- [advice from AI] 상태
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'stopped', 'error'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_service_build_source CHECK (build_source IN ('pre-built', 'github', 'custom')),
    CONSTRAINT chk_service_status CHECK (status IN ('pending', 'running', 'stopped', 'error'))
);

-- [advice from AI] 배포 기록
CREATE TABLE operations_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id VARCHAR(100) UNIQUE NOT NULL, -- 배포 고유 ID
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    
    -- [advice from AI] 배포 설정
    deployment_strategy VARCHAR(50) NOT NULL,
    manifest_count INTEGER DEFAULT 0,
    manifest_files TEXT[], -- 생성된 매니페스트 파일명들
    
    -- [advice from AI] 리소스 요구사항 (JSON)
    resource_requirements JSONB NOT NULL,
    estimated_cost JSONB, -- AWS, NCP 비용 정보
    
    -- [advice from AI] 배포 상태
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'deploying', 'completed', 'failed', 'rollback'
    progress INTEGER DEFAULT 0, -- 0-100%
    current_step VARCHAR(200),
    
    -- [advice from AI] 배포 로그
    deployment_logs TEXT[],
    error_message TEXT,
    
    -- [advice from AI] 타임스탬프
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    CONSTRAINT chk_deployment_strategy CHECK (deployment_strategy IN ('rolling', 'blue-green', 'canary')),
    CONSTRAINT chk_deployment_status CHECK (status IN ('pending', 'deploying', 'completed', 'failed', 'rollback'))
);

-- ===== 모니터링 및 메트릭 테이블 =====

-- [advice from AI] 서비스 모니터링 데이터
CREATE TABLE operations_service_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    
    -- [advice from AI] 상태 정보
    overall_status VARCHAR(50) DEFAULT 'unknown', -- 'healthy', 'warning', 'critical', 'unknown'
    uptime_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- [advice from AI] 성능 메트릭
    response_time_ms INTEGER DEFAULT 0,
    error_rate_percent DECIMAL(5,2) DEFAULT 0.00,
    requests_per_second DECIMAL(10,2) DEFAULT 0.00,
    
    -- [advice from AI] 리소스 사용률
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0.00,
    memory_usage_percent DECIMAL(5,2) DEFAULT 0.00,
    gpu_usage_percent DECIMAL(5,2) DEFAULT 0.00,
    disk_usage_percent DECIMAL(5,2) DEFAULT 0.00,
    network_io_mbps DECIMAL(10,2) DEFAULT 0.00,
    
    -- [advice from AI] 서비스별 특화 메트릭 (JSON)
    service_specific_metrics JSONB DEFAULT '{}',
    
    -- [advice from AI] 헬스체크 정보
    health_check_status JSONB DEFAULT '{}',
    
    recorded_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_monitoring_status CHECK (overall_status IN ('healthy', 'warning', 'critical', 'unknown'))
);

-- [advice from AI] 알림 및 이벤트
CREATE TABLE operations_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- [advice from AI] 알림 정보
    alert_name VARCHAR(200) NOT NULL,
    severity VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    
    -- [advice from AI] 대상 정보
    service_name VARCHAR(100),
    metric_name VARCHAR(100),
    current_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    
    -- [advice from AI] 상태 관리
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved', 'suppressed'
    resolved_at TIMESTAMP,
    resolved_by UUID,
    
    -- [advice from AI] 알림 채널
    notification_channels TEXT[], -- 'slack', 'email', 'webhook'
    webhook_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_alert_severity CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    CONSTRAINT chk_alert_status CHECK (status IN ('active', 'resolved', 'suppressed'))
);

-- ===== CI/CD 및 Jenkins 연동 테이블 =====

-- [advice from AI] Jenkins 빌드 파이프라인
CREATE TABLE operations_build_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id VARCHAR(100) UNIQUE NOT NULL,
    pipeline_name VARCHAR(200) NOT NULL,
    tenant_id UUID REFERENCES operations_tenants(id) ON DELETE CASCADE,
    
    -- [advice from AI] 소스 정보
    github_repository_url TEXT,
    branch_name VARCHAR(100) DEFAULT 'main',
    dockerfile_path VARCHAR(500) DEFAULT 'Dockerfile',
    build_context VARCHAR(500) DEFAULT '.',
    
    -- [advice from AI] 이미지 정보
    target_registry VARCHAR(500) NOT NULL,
    image_name VARCHAR(500) NOT NULL,
    image_tag VARCHAR(100) DEFAULT 'latest',
    
    -- [advice from AI] Jenkins 설정
    jenkins_job_url TEXT,
    webhook_url TEXT,
    
    -- [advice from AI] 빌드 설정 (JSON)
    build_args JSONB DEFAULT '{}',
    
    -- [advice from AI] 상태
    status VARCHAR(50) DEFAULT 'created', -- 'created', 'active', 'disabled', 'error'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_pipeline_status CHECK (status IN ('created', 'active', 'disabled', 'error'))
);

-- [advice from AI] 빌드 실행 기록
CREATE TABLE operations_build_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id VARCHAR(100) UNIQUE NOT NULL,
    pipeline_id UUID REFERENCES operations_build_pipelines(id) ON DELETE CASCADE,
    
    -- [advice from AI] 빌드 정보
    build_number INTEGER,
    trigger_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'webhook', 'schedule'
    triggered_by VARCHAR(100),
    
    -- [advice from AI] 빌드 상태
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'building', 'success', 'failed', 'cancelled'
    progress INTEGER DEFAULT 0, -- 0-100%
    
    -- [advice from AI] 시간 정보
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    
    -- [advice from AI] 빌드 결과
    build_logs TEXT,
    error_message TEXT,
    built_image_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_build_trigger CHECK (trigger_type IN ('manual', 'webhook', 'schedule')),
    CONSTRAINT chk_build_status CHECK (status IN ('queued', 'building', 'success', 'failed', 'cancelled'))
);

-- ===== 인덱스 생성 =====

-- [advice from AI] 성능 최적화 인덱스
CREATE INDEX idx_tenants_status ON operations_tenants(status);
CREATE INDEX idx_tenants_provider ON operations_tenants(cloud_provider);
CREATE INDEX idx_tenants_environment ON operations_tenants(environment);
CREATE INDEX idx_tenants_created_at ON operations_tenants(created_at DESC);

CREATE INDEX idx_services_tenant ON operations_tenant_services(tenant_id);
CREATE INDEX idx_services_name ON operations_tenant_services(service_name);
CREATE INDEX idx_services_status ON operations_tenant_services(status);

CREATE INDEX idx_deployments_tenant ON operations_deployments(tenant_id);
CREATE INDEX idx_deployments_status ON operations_deployments(status);
CREATE INDEX idx_deployments_created_at ON operations_deployments(created_at DESC);

CREATE INDEX idx_monitoring_tenant ON operations_service_monitoring(tenant_id);
CREATE INDEX idx_monitoring_service ON operations_service_monitoring(service_name);
CREATE INDEX idx_monitoring_recorded_at ON operations_service_monitoring(recorded_at DESC);

CREATE INDEX idx_alerts_tenant ON operations_alerts(tenant_id);
CREATE INDEX idx_alerts_severity ON operations_alerts(severity);
CREATE INDEX idx_alerts_status ON operations_alerts(status);
CREATE INDEX idx_alerts_created_at ON operations_alerts(created_at DESC);

CREATE INDEX idx_infrastructures_status ON operations_infrastructures(status);
CREATE INDEX idx_infrastructures_provider ON operations_infrastructures(provider);

CREATE INDEX idx_pipelines_tenant ON operations_build_pipelines(tenant_id);
CREATE INDEX idx_pipelines_status ON operations_build_pipelines(status);

CREATE INDEX idx_builds_pipeline ON operations_build_executions(pipeline_id);
CREATE INDEX idx_builds_status ON operations_build_executions(status);
CREATE INDEX idx_builds_created_at ON operations_build_executions(created_at DESC);

-- ===== 샘플 데이터 삽입 =====

-- [advice from AI] 샘플 인프라 데이터
INSERT INTO operations_infrastructures (name, description, type, provider, region, status, total_cpu, total_memory, total_storage, total_gpu, node_count, k8s_version, api_endpoint, dashboard_url) VALUES
('ECP-프로덕션-클러스터', 'AWS EKS 기반 프로덕션 클러스터', 'kubernetes', 'aws', 'ap-northeast-2', 'active', 32, 128, 1000, 4, 3, '1.24.3', 'https://api.ecp-prod.aws.timbel.com', 'https://dashboard.ecp-prod.aws.timbel.com'),
('ECP-개발-클러스터', 'NCP NKS 기반 개발/테스트 클러스터', 'kubernetes', 'ncp', 'KR-1', 'active', 16, 64, 500, 2, 2, '1.23.8', 'https://api.ecp-dev.ncp.timbel.com', 'https://dashboard.ecp-dev.ncp.timbel.com'),
('ECP-스테이징-클러스터', 'Azure AKS 기반 스테이징 클러스터', 'kubernetes', 'azure', 'koreacentral', 'maintenance', 24, 96, 750, 3, 3, '1.24.1', 'https://api.ecp-staging.azure.timbel.com', 'https://dashboard.ecp-staging.azure.timbel.com');

-- [advice from AI] 샘플 테넌트 데이터
INSERT INTO operations_tenants (tenant_id, tenant_name, description, environment, cloud_provider, region, namespace, deployment_mode, status, infrastructure_id) VALUES
('timbel-prod-001', 'Timbel Production', 'Timbel 운영 환경 테넌트', 'production', 'aws', 'ap-northeast-2', 'timbel-prod', 'auto-calculate', 'active', (SELECT id FROM operations_infrastructures WHERE name = 'ECP-프로덕션-클러스터')),
('timbel-dev-001', 'Timbel Development', 'Timbel 개발 환경 테넌트', 'development', 'ncp', 'KR-1', 'timbel-dev', 'custom-specs', 'active', (SELECT id FROM operations_infrastructures WHERE name = 'ECP-개발-클러스터'));

-- [advice from AI] 샘플 서비스 데이터
INSERT INTO operations_tenant_services (tenant_id, service_name, service_type, display_name, channels, cpu_cores, memory_gb, gpu_count, image_name, advanced_settings, status) VALUES
((SELECT id FROM operations_tenants WHERE tenant_id = 'timbel-prod-001'), 'callbot', 'callbot', '📞 콜봇 서비스', 10, 0.5, 1.0, 0, 'ecp-ai/callbot', '{"sttEndpoint": "http://stt-service:8080", "ttsEndpoint": "http://tts-service:8080", "maxConcurrentCalls": 100}', 'running'),
((SELECT id FROM operations_tenants WHERE tenant_id = 'timbel-prod-001'), 'chatbot', 'chatbot', '💬 챗봇 서비스', 20, 0.2, 0.5, 0, 'ecp-ai/chatbot', '{"nlpEndpoint": "http://nlp-service:8080", "chatHistorySize": 1000, "maxSessions": 500}', 'running'),
((SELECT id FROM operations_tenants WHERE tenant_id = 'timbel-prod-001'), 'advisor', 'advisor', '👨‍💼 어드바이저 서비스', 5, 1.0, 2.0, 1, 'ecp-ai/advisor', '{"hybridMode": true, "expertHandoffThreshold": 0.7, "knowledgeBase": "vector-db"}', 'running');

-- [advice from AI] 뷰 생성 (조인 쿼리 최적화)
CREATE VIEW view_tenant_summary AS
SELECT 
    t.id,
    t.tenant_id,
    t.tenant_name,
    t.description,
    t.environment,
    t.cloud_provider,
    t.region,
    t.status as tenant_status,
    t.deployment_mode,
    t.auto_scaling,
    t.monitoring_enabled,
    i.name as infrastructure_name,
    i.provider as infrastructure_provider,
    i.total_cpu as infrastructure_cpu,
    i.total_memory as infrastructure_memory,
    COUNT(s.id) as service_count,
    SUM(s.cpu_cores) as total_allocated_cpu,
    SUM(s.memory_gb) as total_allocated_memory,
    SUM(s.gpu_count) as total_allocated_gpu,
    t.created_at,
    t.deployed_at
FROM operations_tenants t
LEFT JOIN operations_infrastructures i ON t.infrastructure_id = i.id
LEFT JOIN operations_tenant_services s ON t.id = s.tenant_id
GROUP BY t.id, i.id;

-- [advice from AI] 배포 통계 뷰
CREATE VIEW view_deployment_stats AS
SELECT 
    COUNT(*) as total_deployments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_deployments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deployments,
    COUNT(CASE WHEN status = 'deploying' THEN 1 END) as active_deployments,
    AVG(CASE WHEN completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (completed_at - started_at)) END) as avg_deployment_time_seconds,
    COUNT(DISTINCT tenant_id) as unique_tenants
FROM operations_deployments;
