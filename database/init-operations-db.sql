-- [advice from AI] timbel_cicd_operator 데이터베이스 초기화 스크립트
-- CI/CD 파이프라인, 클러스터 관리, 모니터링, 배포 관리

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jenkins 작업 관리
CREATE TABLE IF NOT EXISTS jenkins_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255),
    repository_url TEXT,
    branch_name VARCHAR(255) DEFAULT 'main',
    build_number INTEGER,
    job_status VARCHAR(50), -- 'pending', 'building', 'success', 'failure', 'aborted'
    build_duration INTEGER, -- seconds
    console_output TEXT,
    artifacts JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Nexus 이미지 푸시 이력
CREATE TABLE IF NOT EXISTS nexus_image_pushes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_name VARCHAR(255) NOT NULL,
    image_tag VARCHAR(255) NOT NULL,
    image_size BIGINT, -- bytes
    repository_name VARCHAR(255),
    pushed_by VARCHAR(255),
    jenkins_build_id UUID REFERENCES jenkins_jobs(id) ON DELETE SET NULL,
    push_status VARCHAR(50), -- 'pushing', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Nexus 태그 작업
CREATE TABLE IF NOT EXISTS nexus_tag_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_name VARCHAR(255) NOT NULL,
    source_tag VARCHAR(255) NOT NULL,
    target_tag VARCHAR(255) NOT NULL,
    operation_type VARCHAR(50), -- 'copy', 'move', 'delete'
    operation_status VARCHAR(50), -- 'pending', 'completed', 'failed'
    performed_by VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Argo CD 애플리케이션
CREATE TABLE IF NOT EXISTS argocd_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255),
    namespace VARCHAR(255),
    cluster_name VARCHAR(255),
    repository_url TEXT,
    target_revision VARCHAR(255) DEFAULT 'HEAD',
    path VARCHAR(255) DEFAULT '.',
    sync_policy VARCHAR(50) DEFAULT 'manual', -- 'manual', 'automatic'
    health_status VARCHAR(50), -- 'Healthy', 'Progressing', 'Degraded', 'Suspended', 'Missing', 'Unknown'
    sync_status VARCHAR(50), -- 'Synced', 'OutOfSync', 'Unknown'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE
);

-- Argo CD 동기화 작업
CREATE TABLE IF NOT EXISTS argocd_sync_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES argocd_applications(id) ON DELETE CASCADE,
    sync_revision VARCHAR(255),
    sync_status VARCHAR(50), -- 'running', 'succeeded', 'failed'
    sync_phase VARCHAR(50), -- 'sync', 'finalize'
    message TEXT,
    started_by VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Argo CD 프로모션
CREATE TABLE IF NOT EXISTS argocd_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_app_id UUID REFERENCES argocd_applications(id) ON DELETE CASCADE,
    target_app_id UUID REFERENCES argocd_applications(id) ON DELETE CASCADE,
    source_environment VARCHAR(50),
    target_environment VARCHAR(50),
    image_tag VARCHAR(255),
    promotion_status VARCHAR(50), -- 'pending', 'in_progress', 'completed', 'failed'
    promoted_by VARCHAR(255),
    approval_required BOOLEAN DEFAULT TRUE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- GitHub 웹훅 설정
CREATE TABLE IF NOT EXISTS github_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_url TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    secret_token VARCHAR(255),
    events JSONB DEFAULT '["push", "pull_request"]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Kubernetes 클러스터
CREATE TABLE IF NOT EXISTS kubernetes_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_name VARCHAR(255) NOT NULL,
    cluster_type VARCHAR(50), -- 'eks', 'gke', 'aks', 'ncp', 'on-premise', 'kind'
    provider VARCHAR(50), -- 'aws', 'gcp', 'azure', 'ncp', 'local'
    endpoint_url TEXT,
    region VARCHAR(100),
    version VARCHAR(50),
    node_count INTEGER,
    status VARCHAR(50), -- 'active', 'inactive', 'creating', 'deleting', 'error'
    config_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_health_check TIMESTAMP WITH TIME ZONE
);

-- 클러스터 네임스페이스
CREATE TABLE IF NOT EXISTS cluster_namespaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES kubernetes_clusters(id) ON DELETE CASCADE,
    namespace_name VARCHAR(255) NOT NULL,
    resource_quota JSONB DEFAULT '{}',
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 클러스터 배포 이력
CREATE TABLE IF NOT EXISTS cluster_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES kubernetes_clusters(id) ON DELETE CASCADE,
    namespace VARCHAR(255),
    application_name VARCHAR(255),
    image_name VARCHAR(255),
    image_tag VARCHAR(255),
    deployment_status VARCHAR(50), -- 'deploying', 'running', 'failed', 'stopped'
    replicas INTEGER DEFAULT 1,
    resources_requested JSONB DEFAULT '{}',
    resources_used JSONB DEFAULT '{}',
    deployed_by VARCHAR(255),
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 배포 작업 이력
CREATE TABLE IF NOT EXISTS operations_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(255) NOT NULL,
    repository_url TEXT,
    branch_name VARCHAR(255) DEFAULT 'main',
    deployment_environment VARCHAR(50), -- 'development', 'staging', 'production'
    deployment_status VARCHAR(50), -- 'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
    deployment_type VARCHAR(50), -- 'manual', 'automated', 'scheduled'
    jenkins_job_id UUID REFERENCES jenkins_jobs(id) ON DELETE SET NULL,
    argocd_app_id UUID REFERENCES argocd_applications(id) ON DELETE SET NULL,
    requested_by VARCHAR(255),
    approved_by VARCHAR(255),
    deployed_by VARCHAR(255),
    rollback_from UUID REFERENCES operations_deployments(id) ON DELETE SET NULL,
    deployment_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 이슈 관리
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_type VARCHAR(50), -- 'build_failure', 'deployment_failure', 'performance', 'security', 'bug'
    severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    project_name VARCHAR(255),
    component VARCHAR(255),
    assigned_to VARCHAR(255),
    reported_by VARCHAR(255),
    jenkins_job_id UUID REFERENCES jenkins_jobs(id) ON DELETE SET NULL,
    deployment_id UUID REFERENCES operations_deployments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 이슈 히스토리
CREATE TABLE IF NOT EXISTS issue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comment TEXT
);

-- Prometheus 메트릭 수집
CREATE TABLE IF NOT EXISTS prometheus_metrics_collection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION,
    labels JSONB DEFAULT '{}',
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_job VARCHAR(255),
    instance VARCHAR(255)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_jenkins_jobs_name ON jenkins_jobs(job_name);
CREATE INDEX IF NOT EXISTS idx_jenkins_jobs_status ON jenkins_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_nexus_pushes_image ON nexus_image_pushes(image_name, image_tag);
CREATE INDEX IF NOT EXISTS idx_argocd_apps_name ON argocd_applications(app_name);
CREATE INDEX IF NOT EXISTS idx_argocd_apps_status ON argocd_applications(health_status, sync_status);
CREATE INDEX IF NOT EXISTS idx_clusters_name ON kubernetes_clusters(cluster_name);
CREATE INDEX IF NOT EXISTS idx_clusters_status ON kubernetes_clusters(status);
CREATE INDEX IF NOT EXISTS idx_deployments_project ON operations_deployments(project_name);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON operations_deployments(deployment_status);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_prometheus_metrics_name ON prometheus_metrics_collection(metric_name);
CREATE INDEX IF NOT EXISTS idx_prometheus_metrics_time ON prometheus_metrics_collection(collected_at);
