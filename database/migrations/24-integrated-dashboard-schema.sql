-- [advice from AI] 통합 홈 대시보드 데이터베이스 스키마
-- 전체 업무 흐름, PO/PE 성과, 이벤트, CI/CD, 운영 서버 현황을 한눈에 볼 수 있는 시스템

-- 실시간 이벤트 스트림 테이블
CREATE TABLE system_event_stream (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 이벤트 기본 정보
    event_type VARCHAR(100) NOT NULL, -- 'project_created', 'project_approved', 'po_claimed', 'pe_assigned', 'work_started', 'cicd_triggered', 'deployment_completed' 등
    event_category VARCHAR(50) NOT NULL, -- 'project', 'workflow', 'cicd', 'infrastructure', 'performance'
    event_severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical', 'success'
    
    -- 이벤트 내용
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 관련 엔티티
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES project_work_assignments(id) ON DELETE CASCADE,
    
    -- CI/CD 관련
    pipeline_id VARCHAR(255), -- GitHub Actions run ID, Jenkins build ID 등
    deployment_id VARCHAR(255),
    repository_url TEXT,
    
    -- 인프라 관련
    server_name VARCHAR(255),
    service_name VARCHAR(255),
    
    -- 이벤트 메타데이터
    event_data JSONB DEFAULT '{}',
    
    -- 타임스탬프
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- 상태
    is_processed BOOLEAN DEFAULT FALSE,
    requires_action BOOLEAN DEFAULT FALSE,
    action_taken_by UUID REFERENCES timbel_users(id) ON DELETE SET NULL
);

-- CI/CD 파이프라인 실행 추적 테이블
CREATE TABLE cicd_pipeline_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 파이프라인 정보
    pipeline_name VARCHAR(255) NOT NULL,
    pipeline_type VARCHAR(50) NOT NULL, -- 'github_actions', 'jenkins', 'gitlab_ci', 'custom'
    repository_url TEXT NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    
    -- 실행 정보
    execution_id VARCHAR(255) NOT NULL, -- 외부 시스템의 실행 ID
    trigger_type VARCHAR(50) NOT NULL, -- 'push', 'pull_request', 'manual', 'scheduled'
    triggered_by VARCHAR(255), -- 사용자명 또는 시스템
    
    -- 상태
    execution_status VARCHAR(50) NOT NULL, -- 'pending', 'running', 'success', 'failure', 'cancelled'
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- 결과
    exit_code INTEGER,
    error_message TEXT,
    build_artifacts JSONB DEFAULT '[]',
    test_results JSONB DEFAULT '{}',
    
    -- 배포 정보
    deployment_environment VARCHAR(100), -- 'development', 'staging', 'production'
    deployment_url TEXT,
    
    -- 관련 프로젝트
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- 메타데이터
    pipeline_config JSONB DEFAULT '{}',
    execution_logs TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 운영 서버 상태 모니터링 테이블
CREATE TABLE infrastructure_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 서버 정보
    server_name VARCHAR(255) NOT NULL,
    server_type VARCHAR(100) NOT NULL, -- 'web', 'api', 'database', 'cache', 'load_balancer', 'kubernetes_node'
    environment VARCHAR(50) NOT NULL, -- 'development', 'staging', 'production'
    
    -- 서비스 정보
    service_name VARCHAR(255),
    service_version VARCHAR(100),
    service_port INTEGER,
    
    -- 상태 정보
    status VARCHAR(50) NOT NULL, -- 'healthy', 'warning', 'critical', 'down', 'maintenance'
    health_check_url TEXT,
    last_health_check TIMESTAMP WITH TIME ZONE,
    
    -- 리소스 사용률
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_percent DECIMAL(5,2),
    disk_usage_percent DECIMAL(5,2),
    network_in_mbps DECIMAL(10,2),
    network_out_mbps DECIMAL(10,2),
    
    -- 성능 지표
    response_time_ms INTEGER,
    requests_per_second DECIMAL(10,2),
    error_rate_percent DECIMAL(5,2),
    
    -- 용량 정보
    total_memory_gb DECIMAL(10,2),
    total_disk_gb DECIMAL(10,2),
    available_disk_gb DECIMAL(10,2),
    
    -- 컨테이너/K8s 정보
    container_count INTEGER DEFAULT 0,
    pod_count INTEGER DEFAULT 0,
    replica_count INTEGER DEFAULT 0,
    
    -- 메타데이터
    monitoring_data JSONB DEFAULT '{}',
    alert_thresholds JSONB DEFAULT '{}',
    
    -- 타임스탬프
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 알림 상태
    alert_sent BOOLEAN DEFAULT FALSE,
    last_alert_sent TIMESTAMP WITH TIME ZONE
);

-- 업무 플로우 단계별 추적 테이블
CREATE TABLE workflow_stage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 프로젝트 정보
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 플로우 단계
    stage_name VARCHAR(100) NOT NULL, -- 'created', 'pending_approval', 'approved', 'po_claimed', 'pe_assigned', 'work_started', 'in_progress', 'completed'
    stage_status VARCHAR(50) NOT NULL, -- 'entered', 'in_progress', 'completed', 'skipped', 'failed'
    
    -- 단계별 담당자
    responsible_user_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
    responsible_role VARCHAR(50), -- 'admin', 'po', 'pe'
    
    -- 시간 추적
    stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stage_completed_at TIMESTAMP WITH TIME ZONE,
    stage_duration_hours DECIMAL(10,2),
    
    -- 단계별 메타데이터
    stage_data JSONB DEFAULT '{}',
    stage_notes TEXT,
    
    -- 다음 단계 정보
    next_stage VARCHAR(100),
    next_responsible_role VARCHAR(50)
);

-- 개인별 업무 성과 집계 뷰 (PO/PE 통합)
CREATE OR REPLACE VIEW individual_performance_dashboard AS
SELECT 
    u.id as user_id,
    u.full_name as user_name,
    u.role_type,
    u.department_id,
    d.name as department_name,
    
    -- 현재 활성 업무
    COUNT(CASE 
        WHEN u.role_type = 'po' AND ppc.claim_status = 'active' THEN 1
        WHEN u.role_type = 'pe' AND pwa.assignment_status IN ('assigned', 'in_progress') THEN 1
    END) as active_workload,
    
    -- 이번 달 완료 업무
    COUNT(CASE 
        WHEN u.role_type = 'po' AND ppc.claim_status = 'completed' 
             AND ppc.completed_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1
        WHEN u.role_type = 'pe' AND pwa.assignment_status = 'completed' 
             AND pwa.completed_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1
    END) as monthly_completed,
    
    -- 전체 누적 완료 업무
    COUNT(CASE 
        WHEN u.role_type = 'po' AND ppc.claim_status = 'completed' THEN 1
        WHEN u.role_type = 'pe' AND pwa.assignment_status = 'completed' THEN 1
    END) as total_completed,
    
    -- 평균 처리 시간 (일)
    AVG(CASE 
        WHEN u.role_type = 'po' AND ppc.claim_status = 'completed' THEN 
            EXTRACT(EPOCH FROM (ppc.completed_at - ppc.claimed_at)) / 86400
        WHEN u.role_type = 'pe' AND pwa.assignment_status = 'completed' THEN 
            EXTRACT(EPOCH FROM (pwa.completed_at - pwa.assigned_at)) / 86400
    END) as avg_completion_days,
    
    -- 성공률 (완료 / 전체 할당)
    CASE 
        WHEN COUNT(CASE WHEN u.role_type = 'po' THEN ppc.id WHEN u.role_type = 'pe' THEN pwa.id END) > 0 THEN
            ROUND(
                COUNT(CASE 
                    WHEN u.role_type = 'po' AND ppc.claim_status = 'completed' THEN 1
                    WHEN u.role_type = 'pe' AND pwa.assignment_status = 'completed' THEN 1
                END) * 100.0 / 
                COUNT(CASE WHEN u.role_type = 'po' THEN ppc.id WHEN u.role_type = 'pe' THEN pwa.id END), 2
            )
        ELSE 0
    END as success_rate_percent,
    
    -- 최근 활동 시간
    GREATEST(
        MAX(ppc.claimed_at),
        MAX(pwa.assigned_at),
        MAX(pwa.updated_at)
    ) as last_activity_at

FROM timbel_users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN project_po_claims ppc ON u.id = ppc.claimed_by_po
LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
WHERE u.role_type IN ('po', 'pe')
GROUP BY u.id, u.full_name, u.role_type, u.department_id, d.name;

-- 전체 업무 흐름 현황 뷰
CREATE OR REPLACE VIEW workflow_overview_dashboard AS
SELECT 
    -- 전체 프로젝트 현황
    COUNT(*) as total_projects,
    
    -- 단계별 프로젝트 수
    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending_approval,
    COUNT(CASE WHEN approval_status = 'approved' AND claimed_by_po IS NULL THEN 1 END) as available_for_claim,
    COUNT(CASE WHEN claimed_by_po IS NOT NULL AND project_status = 'planning' THEN 1 END) as po_claimed,
    COUNT(CASE WHEN project_status IN ('in_progress', 'development') THEN 1 END) as pe_working,
    COUNT(CASE WHEN project_status = 'completed' THEN 1 END) as completed,
    
    -- 긴급 프로젝트
    COUNT(CASE WHEN is_urgent_development = TRUE AND project_status NOT IN ('completed', 'cancelled') THEN 1 END) as urgent_active,
    
    -- 지연 위험 프로젝트
    COUNT(CASE WHEN deadline < CURRENT_DATE AND project_status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue,
    
    -- 이번 주 생성/완료
    COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as this_week_created,
    COUNT(CASE WHEN project_status = 'completed' AND updated_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as this_week_completed,
    
    -- 평균 처리 시간
    AVG(CASE 
        WHEN project_status = 'completed' AND claimed_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (updated_at - claimed_at)) / 86400
    END) as avg_po_to_completion_days,
    
    -- 현재 시간
    NOW() as last_updated

FROM projects;

-- CI/CD 파이프라인 현황 뷰
CREATE OR REPLACE VIEW cicd_pipeline_dashboard AS
SELECT 
    -- 전체 실행 통계
    COUNT(*) as total_executions,
    COUNT(CASE WHEN execution_status = 'running' THEN 1 END) as running_pipelines,
    COUNT(CASE WHEN execution_status = 'pending' THEN 1 END) as pending_pipelines,
    
    -- 성공/실패 통계 (최근 24시간)
    COUNT(CASE 
        WHEN execution_status = 'success' 
        AND start_time >= NOW() - INTERVAL '24 hours' THEN 1 
    END) as success_24h,
    COUNT(CASE 
        WHEN execution_status = 'failure' 
        AND start_time >= NOW() - INTERVAL '24 hours' THEN 1 
    END) as failure_24h,
    
    -- 성공률 (최근 7일)
    CASE 
        WHEN COUNT(CASE WHEN start_time >= NOW() - INTERVAL '7 days' THEN 1 END) > 0 THEN
            ROUND(
                COUNT(CASE 
                    WHEN execution_status = 'success' 
                    AND start_time >= NOW() - INTERVAL '7 days' THEN 1 
                END) * 100.0 / 
                COUNT(CASE WHEN start_time >= NOW() - INTERVAL '7 days' THEN 1 END), 2
            )
        ELSE 0
    END as success_rate_7d,
    
    -- 평균 실행 시간
    AVG(CASE 
        WHEN execution_status IN ('success', 'failure') 
        AND duration_seconds IS NOT NULL THEN duration_seconds 
    END) as avg_duration_seconds,
    
    -- 환경별 배포 현황
    COUNT(CASE WHEN deployment_environment = 'development' AND execution_status = 'success' THEN 1 END) as dev_deployments,
    COUNT(CASE WHEN deployment_environment = 'staging' AND execution_status = 'success' THEN 1 END) as staging_deployments,
    COUNT(CASE WHEN deployment_environment = 'production' AND execution_status = 'success' THEN 1 END) as prod_deployments,
    
    -- 최근 실행 시간
    MAX(start_time) as last_execution_time,
    
    NOW() as last_updated

FROM cicd_pipeline_executions
WHERE start_time >= NOW() - INTERVAL '30 days'; -- 최근 30일 데이터만

-- 인프라 서비스 현황 뷰
CREATE OR REPLACE VIEW infrastructure_dashboard AS
SELECT 
    -- 전체 서버/서비스 현황
    COUNT(DISTINCT server_name) as total_servers,
    COUNT(DISTINCT service_name) as total_services,
    
    -- 상태별 서버 수
    COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_servers,
    COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_servers,
    COUNT(CASE WHEN status = 'critical' THEN 1 END) as critical_servers,
    COUNT(CASE WHEN status = 'down' THEN 1 END) as down_servers,
    
    -- 환경별 현황
    COUNT(CASE WHEN environment = 'production' AND status = 'healthy' THEN 1 END) as prod_healthy,
    COUNT(CASE WHEN environment = 'production' AND status != 'healthy' THEN 1 END) as prod_issues,
    COUNT(CASE WHEN environment = 'staging' AND status = 'healthy' THEN 1 END) as staging_healthy,
    COUNT(CASE WHEN environment = 'development' AND status = 'healthy' THEN 1 END) as dev_healthy,
    
    -- 리소스 사용률 평균
    AVG(cpu_usage_percent) as avg_cpu_usage,
    AVG(memory_usage_percent) as avg_memory_usage,
    AVG(disk_usage_percent) as avg_disk_usage,
    
    -- 성능 지표
    AVG(response_time_ms) as avg_response_time,
    SUM(requests_per_second) as total_requests_per_second,
    AVG(error_rate_percent) as avg_error_rate,
    
    -- 용량 정보
    SUM(total_memory_gb) as total_memory_gb,
    SUM(total_disk_gb) as total_disk_gb,
    SUM(available_disk_gb) as available_disk_gb,
    
    -- 컨테이너/K8s 현황
    SUM(container_count) as total_containers,
    SUM(pod_count) as total_pods,
    
    -- 최근 업데이트 시간
    MAX(recorded_at) as last_monitoring_update,
    NOW() as dashboard_updated

FROM infrastructure_monitoring
WHERE recorded_at >= NOW() - INTERVAL '5 minutes' -- 최근 5분 데이터만 (실시간)
GROUP BY environment
ORDER BY 
    CASE environment 
        WHEN 'production' THEN 1 
        WHEN 'staging' THEN 2 
        WHEN 'development' THEN 3 
    END;

-- 실시간 대시보드 종합 뷰
CREATE OR REPLACE VIEW integrated_dashboard_overview AS
SELECT 
    -- 업무 흐름 현황
    (SELECT json_build_object(
        'total_projects', total_projects,
        'pending_approval', pending_approval,
        'available_for_claim', available_for_claim,
        'po_claimed', po_claimed,
        'pe_working', pe_working,
        'completed', completed,
        'urgent_active', urgent_active,
        'overdue', overdue,
        'this_week_created', this_week_created,
        'this_week_completed', this_week_completed,
        'avg_po_to_completion_days', ROUND(avg_po_to_completion_days, 1)
    ) FROM workflow_overview_dashboard LIMIT 1) as workflow_stats,
    
    -- CI/CD 현황
    (SELECT json_build_object(
        'total_executions', total_executions,
        'running_pipelines', running_pipelines,
        'pending_pipelines', pending_pipelines,
        'success_24h', success_24h,
        'failure_24h', failure_24h,
        'success_rate_7d', success_rate_7d,
        'avg_duration_minutes', ROUND(avg_duration_seconds / 60.0, 1),
        'dev_deployments', dev_deployments,
        'staging_deployments', staging_deployments,
        'prod_deployments', prod_deployments,
        'last_execution_time', last_execution_time
    ) FROM cicd_pipeline_dashboard LIMIT 1) as cicd_stats,
    
    -- 인프라 현황 (프로덕션)
    (SELECT json_build_object(
        'total_servers', total_servers,
        'healthy_servers', healthy_servers,
        'warning_servers', warning_servers,
        'critical_servers', critical_servers,
        'down_servers', down_servers,
        'avg_cpu_usage', ROUND(avg_cpu_usage, 1),
        'avg_memory_usage', ROUND(avg_memory_usage, 1),
        'avg_response_time', avg_response_time,
        'total_requests_per_second', ROUND(total_requests_per_second, 1),
        'total_containers', total_containers
    ) FROM infrastructure_dashboard WHERE environment = 'production' LIMIT 1) as infrastructure_stats,
    
    -- 최근 이벤트 (최신 10개)
    (SELECT json_agg(
        json_build_object(
            'id', id,
            'event_type', event_type,
            'title', title,
            'description', description,
            'event_severity', event_severity,
            'event_timestamp', event_timestamp,
            'user_name', (SELECT full_name FROM timbel_users WHERE id = user_id),
            'project_name', (SELECT name FROM projects WHERE id = project_id)
        ) ORDER BY event_timestamp DESC
    ) FROM (
        SELECT * FROM system_event_stream 
        ORDER BY event_timestamp DESC 
        LIMIT 10
    ) recent_events) as recent_events,
    
    NOW() as dashboard_generated_at;

-- 인덱스 생성
CREATE INDEX idx_system_event_stream_event_type ON system_event_stream(event_type);
CREATE INDEX idx_system_event_stream_category ON system_event_stream(event_category);
CREATE INDEX idx_system_event_stream_timestamp ON system_event_stream(event_timestamp DESC);
CREATE INDEX idx_system_event_stream_project_id ON system_event_stream(project_id);
CREATE INDEX idx_system_event_stream_user_id ON system_event_stream(user_id);

CREATE INDEX idx_cicd_pipeline_executions_status ON cicd_pipeline_executions(execution_status);
CREATE INDEX idx_cicd_pipeline_executions_start_time ON cicd_pipeline_executions(start_time DESC);
CREATE INDEX idx_cicd_pipeline_executions_project_id ON cicd_pipeline_executions(project_id);
CREATE INDEX idx_cicd_pipeline_executions_repository ON cicd_pipeline_executions(repository_url);

CREATE INDEX idx_infrastructure_monitoring_server_name ON infrastructure_monitoring(server_name);
CREATE INDEX idx_infrastructure_monitoring_status ON infrastructure_monitoring(status);
CREATE INDEX idx_infrastructure_monitoring_environment ON infrastructure_monitoring(environment);
CREATE INDEX idx_infrastructure_monitoring_recorded_at ON infrastructure_monitoring(recorded_at DESC);

CREATE INDEX idx_workflow_stage_tracking_project_id ON workflow_stage_tracking(project_id);
CREATE INDEX idx_workflow_stage_tracking_stage_name ON workflow_stage_tracking(stage_name);
CREATE INDEX idx_workflow_stage_tracking_user_id ON workflow_stage_tracking(responsible_user_id);
CREATE INDEX idx_workflow_stage_tracking_entered_at ON workflow_stage_tracking(stage_entered_at DESC);

COMMENT ON TABLE system_event_stream IS '시스템 전체 이벤트 스트림 - 모든 업무 이벤트의 실시간 로그';
COMMENT ON TABLE cicd_pipeline_executions IS 'CI/CD 파이프라인 실행 추적 - 빌드, 테스트, 배포 현황';
COMMENT ON TABLE infrastructure_monitoring IS '인프라 모니터링 - 서버, 서비스, 리소스 상태 추적';
COMMENT ON TABLE workflow_stage_tracking IS '업무 플로우 단계별 추적 - 프로젝트 생명주기 전체 추적';
COMMENT ON VIEW individual_performance_dashboard IS '개인별 업무 성과 대시보드 - PO/PE 성과 지표';
COMMENT ON VIEW workflow_overview_dashboard IS '전체 업무 흐름 현황 - 프로젝트 단계별 통계';
COMMENT ON VIEW cicd_pipeline_dashboard IS 'CI/CD 파이프라인 현황 - 빌드/배포 통계';
COMMENT ON VIEW infrastructure_dashboard IS '인프라 현황 대시보드 - 서버/서비스 상태 요약';
COMMENT ON VIEW integrated_dashboard_overview IS '통합 대시보드 종합 뷰 - 모든 시스템 현황 통합';
