-- [advice from AI] 운영팀 전용 배포 관리 테이블 스키마
-- 레포지토리 기반 직접 배포 시스템을 위한 데이터베이스 스키마

-- 운영팀 배포 실행 테이블
CREATE TABLE IF NOT EXISTS operations_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- [advice from AI] 레포지토리 정보
    repository_url TEXT NOT NULL,
    repository_name VARCHAR(255) NOT NULL,
    repository_owner VARCHAR(255) NOT NULL,
    branch VARCHAR(100) DEFAULT 'main',
    
    -- [advice from AI] 빌드 설정
    dockerfile_path VARCHAR(500) DEFAULT './Dockerfile',
    build_context VARCHAR(500) DEFAULT '.',
    build_args JSONB DEFAULT '{}',
    environment_variables JSONB DEFAULT '{}',
    image_name VARCHAR(500) NOT NULL,
    image_tag VARCHAR(100) DEFAULT 'latest',
    
    -- [advice from AI] 배포 설정
    deployment_environment VARCHAR(50) NOT NULL CHECK (deployment_environment IN ('development', 'staging', 'production')),
    namespace VARCHAR(100) DEFAULT 'default',
    replicas INTEGER DEFAULT 1,
    cpu_request VARCHAR(50) DEFAULT '100m',
    memory_request VARCHAR(50) DEFAULT '128Mi',
    ports_config JSONB DEFAULT '[]',
    
    -- [advice from AI] 실행 상태
    status VARCHAR(30) DEFAULT 'preparing' CHECK (status IN (
        'preparing', 'cloning', 'building', 'pushing', 'deploying', 
        'verification', 'completed', 'failed', 'cancelled'
    )),
    
    -- [advice from AI] 결과 정보
    build_number INTEGER,
    image_url TEXT,
    deployment_url TEXT,
    
    -- [advice from AI] 메타데이터
    requested_by UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- [advice from AI] 운영팀 배포 로그 테이블
CREATE TABLE IF NOT EXISTS operations_deployment_logs (
    id SERIAL PRIMARY KEY,
    deployment_id UUID NOT NULL REFERENCES operations_deployments(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    stage VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error')),
    
    -- [advice from AI] 추가 메타데이터
    details JSONB DEFAULT '{}'
);

-- [advice from AI] 운영팀 배포 메트릭 테이블 (성능 추적용)
CREATE TABLE IF NOT EXISTS operations_deployment_metrics (
    id SERIAL PRIMARY KEY,
    deployment_id UUID NOT NULL REFERENCES operations_deployments(id) ON DELETE CASCADE,
    
    -- [advice from AI] 성능 메트릭
    build_duration_seconds INTEGER,
    push_duration_seconds INTEGER,
    deploy_duration_seconds INTEGER,
    total_duration_seconds INTEGER,
    
    -- [advice from AI] 리소스 사용량
    build_cpu_usage DECIMAL(5,2),
    build_memory_usage_mb INTEGER,
    final_image_size_mb INTEGER,
    
    -- [advice from AI] 배포 결과
    deployment_success BOOLEAN DEFAULT false,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- [advice from AI] 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_operations_deployments_status ON operations_deployments(status);
CREATE INDEX IF NOT EXISTS idx_operations_deployments_environment ON operations_deployments(deployment_environment);
CREATE INDEX IF NOT EXISTS idx_operations_deployments_requested_by ON operations_deployments(requested_by);
CREATE INDEX IF NOT EXISTS idx_operations_deployments_created_at ON operations_deployments(created_at);
CREATE INDEX IF NOT EXISTS idx_operations_deployments_repository ON operations_deployments(repository_owner, repository_name);

CREATE INDEX IF NOT EXISTS idx_operations_deployment_logs_deployment_id ON operations_deployment_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_operations_deployment_logs_timestamp ON operations_deployment_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_operations_deployment_logs_level ON operations_deployment_logs(level);

CREATE INDEX IF NOT EXISTS idx_operations_deployment_metrics_deployment_id ON operations_deployment_metrics(deployment_id);

-- [advice from AI] 배포 완료 시 메트릭 자동 계산 트리거
CREATE OR REPLACE FUNCTION calculate_deployment_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- 배포가 완료되거나 실패했을 때 메트릭 계산
    IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
        INSERT INTO operations_deployment_metrics (
            deployment_id,
            total_duration_seconds,
            deployment_success,
            error_count,
            warning_count
        )
        SELECT 
            NEW.id,
            EXTRACT(EPOCH FROM (NEW.completed_at - NEW.created_at))::INTEGER,
            NEW.status = 'completed',
            (SELECT COUNT(*) FROM operations_deployment_logs WHERE deployment_id = NEW.id AND level = 'error'),
            (SELECT COUNT(*) FROM operations_deployment_logs WHERE deployment_id = NEW.id AND level = 'warning')
        WHERE NOT EXISTS (
            SELECT 1 FROM operations_deployment_metrics WHERE deployment_id = NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [advice from AI] 트리거 생성
DROP TRIGGER IF EXISTS deployment_metrics_trigger ON operations_deployments;
CREATE TRIGGER deployment_metrics_trigger
    AFTER UPDATE ON operations_deployments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_deployment_metrics();

-- [advice from AI] 배포 통계 뷰 생성
CREATE OR REPLACE VIEW operations_deployment_stats AS
SELECT 
    deployment_environment,
    COUNT(*) as total_deployments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_deployments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deployments,
    COUNT(CASE WHEN status IN ('preparing', 'cloning', 'building', 'pushing', 'deploying', 'verification') THEN 1 END) as in_progress_deployments,
    ROUND(AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (completed_at - created_at)) END), 2) as avg_success_duration_seconds,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('day', CURRENT_DATE) THEN 1 END) as today_deployments,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as this_week_deployments
FROM operations_deployments
GROUP BY deployment_environment;

-- [advice from AI] 샘플 데이터 (개발용)
INSERT INTO operations_deployments (
    repository_url,
    repository_name,
    repository_owner,
    branch,
    dockerfile_path,
    image_name,
    image_tag,
    deployment_environment,
    namespace,
    replicas,
    status,
    requested_by,
    completed_at,
    build_number,
    image_url,
    deployment_url
) VALUES 
(
    'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
    'ecp-ai-k8s-orchestrator',
    'RickySonYH',
    'main',
    './Dockerfile',
    'rickysonh/ecp-ai-k8s-orchestrator',
    'v1.0.0',
    'production',
    'ecp-ai',
    3,
    'completed',
    (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1),
    NOW() - INTERVAL '1 hour',
    42,
    'rickysonh/ecp-ai-k8s-orchestrator:v1.0.0',
    'https://ecp-ai-k8s-orchestrator-production.example.com'
),
(
    'https://github.com/timbel/project-management',
    'project-management',
    'timbel',
    'develop',
    './Dockerfile',
    'timbel/project-management',
    'latest',
    'staging',
    'timbel-staging',
    2,
    'completed',
    (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1),
    NOW() - INTERVAL '30 minutes',
    15,
    'timbel/project-management:latest',
    'https://project-management-staging.example.com'
),
(
    'https://github.com/example/hotfix-service',
    'hotfix-service',
    'example',
    'hotfix/critical-bug',
    './Dockerfile',
    'example/hotfix-service',
    'hotfix-20241226',
    'production',
    'default',
    1,
    'building',
    (SELECT id FROM timbel_users WHERE email = 'admin@timbel.net' LIMIT 1),
    NULL,
    NULL,
    NULL,
    NULL
);

-- [advice from AI] 샘플 로그 데이터
INSERT INTO operations_deployment_logs (deployment_id, timestamp, stage, message, level) VALUES
(
    (SELECT id FROM operations_deployments WHERE repository_name = 'ecp-ai-k8s-orchestrator' LIMIT 1),
    NOW() - INTERVAL '1 hour 5 minutes',
    'preparation',
    '배포 준비 시작',
    'info'
),
(
    (SELECT id FROM operations_deployments WHERE repository_name = 'ecp-ai-k8s-orchestrator' LIMIT 1),
    NOW() - INTERVAL '1 hour 3 minutes',
    'cloning',
    'GitHub 레포지토리 클론 완료',
    'info'
),
(
    (SELECT id FROM operations_deployments WHERE repository_name = 'ecp-ai-k8s-orchestrator' LIMIT 1),
    NOW() - INTERVAL '1 hour',
    'completion',
    '배포가 성공적으로 완료되었습니다',
    'info'
);

-- [advice from AI] 권한 설정
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_deployments TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_deployment_logs TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_deployment_metrics TO timbel_user;
GRANT SELECT ON operations_deployment_stats TO timbel_user;
GRANT USAGE, SELECT ON SEQUENCE operations_deployment_logs_id_seq TO timbel_user;
GRANT USAGE, SELECT ON SEQUENCE operations_deployment_metrics_id_seq TO timbel_user;
