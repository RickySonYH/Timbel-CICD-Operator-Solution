-- [advice from AI] 실시간 파이프라인 모니터링 스키마
-- 파이프라인 실행, 스테이지 추적, 로그 관리

-- [advice from AI] 파이프라인 실행 테이블
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'cicd_pipeline', -- cicd_pipeline, deployment_only, test_only
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    repository_url TEXT,
    branch VARCHAR(100) DEFAULT 'main',
    environment VARCHAR(50) DEFAULT 'development', -- development, staging, production
    user_id UUID REFERENCES timbel_users(id),
    
    -- 상태 정보
    status VARCHAR(20) DEFAULT 'queued', -- queued, running, completed, failed, cancelled, paused
    current_stage VARCHAR(50),
    current_stage_index INTEGER DEFAULT -1,
    
    -- 설정 및 메타데이터
    stages_config JSONB, -- 스테이지 정보 및 상태
    config JSONB, -- 파이프라인 설정
    metrics JSONB, -- 성능 메트릭
    
    -- 시간 정보
    queued_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 실패 정보
    failure_reason TEXT,
    failure_stage VARCHAR(50),
    
    -- 롤백 정보
    rollback_enabled BOOLEAN DEFAULT true,
    rollback_pipeline_id VARCHAR(100),
    restarted_from VARCHAR(100),
    
    CONSTRAINT chk_pipeline_status CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'paused')),
    CONSTRAINT chk_pipeline_environment CHECK (environment IN ('development', 'staging', 'production'))
);

-- [advice from AI] 파이프라인 로그 테이블
CREATE TABLE IF NOT EXISTS pipeline_logs (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    level VARCHAR(10) DEFAULT 'info', -- debug, info, warn, error, fatal
    message TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'pipeline', -- pipeline, jenkins, argocd, nexus
    metadata JSONB,
    
    CONSTRAINT chk_log_level CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal'))
);

-- [advice from AI] 파이프라인 메트릭 테이블
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_id VARCHAR(50),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(20),
    collected_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- [advice from AI] 파이프라인 알림 테이블
CREATE TABLE IF NOT EXISTS pipeline_alerts (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- timeout, failure, completion, warning
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    channels JSONB, -- ['slack', 'email', 'webhook']
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_alert_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- [advice from AI] 파이프라인 아티팩트 테이블
CREATE TABLE IF NOT EXISTS pipeline_artifacts (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_id VARCHAR(50),
    artifact_name VARCHAR(200) NOT NULL,
    artifact_type VARCHAR(50) NOT NULL, -- docker_image, jar, zip, report, log
    artifact_path TEXT,
    artifact_url TEXT,
    file_size BIGINT,
    checksum VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- [advice from AI] 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_project ON pipeline_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_user ON pipeline_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_created ON pipeline_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_environment ON pipeline_executions(environment);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_pipeline ON pipeline_logs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_timestamp ON pipeline_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_level ON pipeline_logs(level);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_stage ON pipeline_logs(stage_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_pipeline ON pipeline_metrics(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_collected ON pipeline_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_name ON pipeline_metrics(metric_name);

CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_pipeline ON pipeline_alerts(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_severity ON pipeline_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_created ON pipeline_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_artifacts_pipeline ON pipeline_artifacts(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_artifacts_type ON pipeline_artifacts(artifact_type);

-- [advice from AI] 파티션 테이블 (로그 데이터 관리)
-- 월별 파티션으로 로그 테이블 분할 (PostgreSQL 10+)
-- CREATE TABLE pipeline_logs_y2024m01 PARTITION OF pipeline_logs
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- [advice from AI] 뷰 생성 - 활성 파이프라인 요약
CREATE OR REPLACE VIEW active_pipelines_summary AS
SELECT 
    pe.id,
    pe.type,
    pe.project_id,
    p.name as project_name,
    pe.environment,
    pe.status,
    pe.current_stage,
    pe.queued_at,
    pe.started_at,
    EXTRACT(EPOCH FROM (COALESCE(pe.completed_at, NOW()) - pe.started_at))/60 as duration_minutes,
    EXTRACT(EPOCH FROM (NOW() - pe.queued_at))/60 as queue_time_minutes,
    pe.metrics->>'totalDuration' as total_duration,
    CASE 
        WHEN pe.status = 'running' AND pe.started_at < NOW() - INTERVAL '30 minutes' THEN true
        ELSE false
    END as is_long_running,
    CASE 
        WHEN pe.status = 'queued' AND pe.queued_at < NOW() - INTERVAL '10 minutes' THEN true
        ELSE false
    END as is_long_queued
FROM pipeline_executions pe
LEFT JOIN projects p ON pe.project_id = p.id
WHERE pe.status IN ('queued', 'running', 'paused');

-- [advice from AI] 뷰 생성 - 파이프라인 성능 통계
CREATE OR REPLACE VIEW pipeline_performance_stats AS
SELECT 
    pe.environment,
    pe.type,
    COUNT(*) as total_pipelines,
    COUNT(*) FILTER (WHERE pe.status = 'completed') as successful_pipelines,
    COUNT(*) FILTER (WHERE pe.status = 'failed') as failed_pipelines,
    ROUND(
        COUNT(*) FILTER (WHERE pe.status = 'completed') * 100.0 / COUNT(*), 2
    ) as success_rate,
    AVG(EXTRACT(EPOCH FROM (pe.completed_at - pe.started_at))/60) FILTER (WHERE pe.status = 'completed') as avg_duration_minutes,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (pe.completed_at - pe.started_at))/60) FILTER (WHERE pe.status = 'completed') as median_duration_minutes,
    AVG(EXTRACT(EPOCH FROM (pe.started_at - pe.queued_at))/60) as avg_queue_time_minutes
FROM pipeline_executions pe
WHERE pe.created_at >= NOW() - INTERVAL '30 days'
GROUP BY pe.environment, pe.type;

-- [advice from AI] 함수 생성 - 파이프라인 정리
CREATE OR REPLACE FUNCTION cleanup_old_pipeline_data(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- 오래된 완료/실패 파이프라인 삭제
    DELETE FROM pipeline_executions
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 오래된 로그 삭제
    DELETE FROM pipeline_logs
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    
    -- 오래된 메트릭 삭제 (더 긴 보존 기간)
    DELETE FROM pipeline_metrics
    WHERE collected_at < NOW() - ((retention_days * 2) || ' days')::INTERVAL;
    
    -- 만료된 아티팩트 삭제
    DELETE FROM pipeline_artifacts
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- [advice from AI] 트리거 생성 - 자동 updated_at 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pipeline_executions_updated_at
    BEFORE UPDATE ON pipeline_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- [advice from AI] 초기 데이터 삽입 (예시)
-- 파이프라인 타입별 기본 설정
INSERT INTO pipeline_executions (
    id, type, project_id, repository_url, branch, environment, user_id,
    status, stages_config, config
) VALUES (
    'demo_pipeline_001',
    'cicd_pipeline',
    (SELECT id FROM projects LIMIT 1),
    'https://github.com/example/demo-app',
    'main',
    'development',
    (SELECT id FROM timbel_users WHERE role_type = 'admin' LIMIT 1),
    'completed',
    '[
        {"id": "source_checkout", "name": "소스 체크아웃", "status": "completed", "duration": 15000},
        {"id": "unit_test", "name": "단위 테스트", "status": "completed", "duration": 45000},
        {"id": "build_artifact", "name": "아티팩트 빌드", "status": "completed", "duration": 120000},
        {"id": "deploy_staging", "name": "스테이징 배포", "status": "completed", "duration": 60000}
    ]'::jsonb,
    '{"environment": "development", "branch": "main", "autoRollback": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE pipeline_executions IS '파이프라인 실행 정보 및 상태 추적';
COMMENT ON TABLE pipeline_logs IS '파이프라인 실행 중 생성되는 로그';
COMMENT ON TABLE pipeline_metrics IS '파이프라인 성능 메트릭';
COMMENT ON TABLE pipeline_alerts IS '파이프라인 관련 알림';
COMMENT ON TABLE pipeline_artifacts IS '파이프라인에서 생성된 아티팩트';

COMMENT ON VIEW active_pipelines_summary IS '현재 활성 상태인 파이프라인 요약 정보';
COMMENT ON VIEW pipeline_performance_stats IS '파이프라인 성능 통계 (최근 30일)';

COMMENT ON FUNCTION cleanup_old_pipeline_data(INTEGER) IS '지정된 기간보다 오래된 파이프라인 데이터 정리';
COMMENT ON FUNCTION update_updated_at_column() IS 'updated_at 컬럼 자동 업데이트 트리거 함수';
