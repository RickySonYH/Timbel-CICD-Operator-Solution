-- [advice from AI] 파이프라인 실행 이력 추적 테이블
-- 모든 파이프라인 실행을 기록하고 추적

-- 파이프라인 실행 이력 테이블
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    pipeline_id VARCHAR(100) NOT NULL,
    pipeline_name VARCHAR(300),
    template_id BIGINT REFERENCES pipeline_templates(id),
    
    -- 실행 정보
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout')),
    trigger_type VARCHAR(50) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'webhook', 'scheduled', 'api', 'rollback')),
    trigger_by VARCHAR(100),
    trigger_reason TEXT,
    
    -- 소스 정보
    repository_url TEXT,
    branch VARCHAR(200),
    commit_hash VARCHAR(100),
    commit_message TEXT,
    commit_author VARCHAR(200),
    
    -- 타이밍 정보
    started_at TIMESTAMP WITHOUT TIME ZONE,
    finished_at TIMESTAMP WITHOUT TIME ZONE,
    duration_seconds INTEGER,
    queue_time_seconds INTEGER,
    
    -- 빌드 정보
    build_number INTEGER,
    build_url TEXT,
    jenkins_job_name VARCHAR(300),
    
    -- 배포 정보
    deployment_target VARCHAR(100), -- 'development', 'staging', 'production'
    namespace VARCHAR(200),
    cluster_id VARCHAR(100),
    
    -- 아티팩트 정보
    docker_image TEXT,
    docker_tag VARCHAR(100),
    registry_url TEXT,
    
    -- 리소스 사용량
    cpu_usage_avg DECIMAL(10, 2),
    memory_usage_avg_mb INTEGER,
    disk_usage_mb INTEGER,
    
    -- 테스트 결과
    tests_total INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,
    tests_skipped INTEGER DEFAULT 0,
    test_coverage_percent DECIMAL(5, 2),
    
    -- 에러 정보
    error_message TEXT,
    error_stage VARCHAR(100),
    error_log TEXT,
    
    -- 승인 정보
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(50) CHECK (approval_status IN ('pending', 'approved', 'rejected', NULL)),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- 메타데이터
    environment_variables JSONB DEFAULT '{}',
    parameters JSONB DEFAULT '{}',
    tags TEXT[],
    labels JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_pipeline_id ON pipeline_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_trigger_type ON pipeline_executions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_started_at ON pipeline_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_execution_id ON pipeline_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_template_id ON pipeline_executions(template_id);

-- 파이프라인 스테이지 실행 이력
CREATE TABLE IF NOT EXISTS pipeline_stage_executions (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL REFERENCES pipeline_executions(execution_id) ON DELETE CASCADE,
    stage_name VARCHAR(200) NOT NULL,
    stage_order INTEGER NOT NULL,
    
    -- 스테이지 상태
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped', 'cancelled')),
    
    -- 타이밍
    started_at TIMESTAMP WITHOUT TIME ZONE,
    finished_at TIMESTAMP WITHOUT TIME ZONE,
    duration_seconds INTEGER,
    
    -- 로그 및 아티팩트
    log_content TEXT,
    log_url TEXT,
    artifacts JSONB DEFAULT '[]',
    
    -- 에러 정보
    error_message TEXT,
    exit_code INTEGER,
    
    -- 리소스 사용량
    cpu_usage_avg DECIMAL(10, 2),
    memory_usage_avg_mb INTEGER,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stage_executions_execution_id ON pipeline_stage_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_stage_executions_status ON pipeline_stage_executions(status);
CREATE INDEX IF NOT EXISTS idx_stage_executions_stage_order ON pipeline_stage_executions(stage_order);

-- 파이프라인 아티팩트 추적
CREATE TABLE IF NOT EXISTS pipeline_artifacts (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL REFERENCES pipeline_executions(execution_id) ON DELETE CASCADE,
    stage_id BIGINT REFERENCES pipeline_stage_executions(id) ON DELETE SET NULL,
    
    -- 아티팩트 정보
    artifact_type VARCHAR(50) NOT NULL CHECK (artifact_type IN ('docker_image', 'binary', 'package', 'report', 'log', 'test_result', 'coverage_report', 'manifest')),
    artifact_name VARCHAR(300) NOT NULL,
    artifact_path TEXT,
    artifact_url TEXT,
    
    -- 메타데이터
    size_bytes BIGINT,
    checksum VARCHAR(100),
    mime_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    
    -- 보관 정보
    retention_days INTEGER DEFAULT 30,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_artifacts_execution_id ON pipeline_artifacts(execution_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_artifact_type ON pipeline_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_expires_at ON pipeline_artifacts(expires_at);

-- 파이프라인 메트릭 추적
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL REFERENCES pipeline_executions(execution_id) ON DELETE CASCADE,
    
    -- 메트릭 정보
    metric_name VARCHAR(200) NOT NULL,
    metric_value DECIMAL(20, 4),
    metric_unit VARCHAR(50),
    metric_type VARCHAR(50) CHECK (metric_type IN ('gauge', 'counter', 'histogram', 'summary')),
    
    -- 태그
    tags JSONB DEFAULT '{}',
    
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_metrics_execution_id ON pipeline_metrics(execution_id);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON pipeline_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON pipeline_metrics(recorded_at DESC);

-- 파이프라인 알림 이력
CREATE TABLE IF NOT EXISTS pipeline_notifications (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL REFERENCES pipeline_executions(execution_id) ON DELETE CASCADE,
    
    -- 알림 정보
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'slack', 'webhook', 'sms', 'teams')),
    recipient TEXT NOT NULL,
    subject VARCHAR(500),
    message TEXT,
    
    -- 전송 정보
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_execution_id ON pipeline_notifications(execution_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON pipeline_notifications(status);

-- 뷰: 파이프라인 실행 요약
CREATE OR REPLACE VIEW pipeline_execution_summary AS
SELECT 
    pe.id,
    pe.execution_id,
    pe.pipeline_id,
    pe.pipeline_name,
    pe.status,
    pe.trigger_type,
    pe.trigger_by,
    pe.started_at,
    pe.finished_at,
    pe.duration_seconds,
    pe.deployment_target,
    pe.docker_image,
    pe.docker_tag,
    pe.commit_hash,
    pe.branch,
    pe.tests_total,
    pe.tests_passed,
    pe.tests_failed,
    -- 스테이지 통계
    COUNT(DISTINCT pse.id) AS total_stages,
    COUNT(DISTINCT CASE WHEN pse.status = 'success' THEN pse.id END) AS successful_stages,
    COUNT(DISTINCT CASE WHEN pse.status = 'failed' THEN pse.id END) AS failed_stages,
    -- 아티팩트 통계
    COUNT(DISTINCT pa.id) AS total_artifacts,
    SUM(pa.size_bytes) AS total_artifacts_size
FROM pipeline_executions pe
LEFT JOIN pipeline_stage_executions pse ON pe.execution_id = pse.execution_id
LEFT JOIN pipeline_artifacts pa ON pe.execution_id = pa.execution_id
GROUP BY pe.id;

-- 함수: 파이프라인 실행 통계
CREATE OR REPLACE FUNCTION get_pipeline_statistics(
    p_pipeline_id VARCHAR DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    pipeline_id VARCHAR,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    success_rate DECIMAL,
    avg_duration_seconds DECIMAL,
    total_duration_hours DECIMAL,
    last_execution_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.pipeline_id,
        COUNT(*) AS total_executions,
        COUNT(*) FILTER (WHERE pe.status = 'success') AS successful_executions,
        COUNT(*) FILTER (WHERE pe.status = 'failed') AS failed_executions,
        ROUND(
            (COUNT(*) FILTER (WHERE pe.status = 'success')::DECIMAL / NULLIF(COUNT(*), 0) * 100), 
            2
        ) AS success_rate,
        ROUND(AVG(pe.duration_seconds), 2) AS avg_duration_seconds,
        ROUND(SUM(pe.duration_seconds) / 3600.0, 2) AS total_duration_hours,
        MAX(pe.started_at) AS last_execution_at
    FROM pipeline_executions pe
    WHERE 
        (p_pipeline_id IS NULL OR pe.pipeline_id = p_pipeline_id)
        AND pe.started_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY pe.pipeline_id;
END;
$$ LANGUAGE plpgsql;

-- 함수: 느린 파이프라인 탐지
CREATE OR REPLACE FUNCTION detect_slow_pipelines(
    p_threshold_seconds INTEGER DEFAULT 300,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    pipeline_id VARCHAR,
    pipeline_name VARCHAR,
    avg_duration_seconds DECIMAL,
    max_duration_seconds INTEGER,
    execution_count BIGINT,
    last_slow_execution_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.pipeline_id,
        pe.pipeline_name,
        ROUND(AVG(pe.duration_seconds), 2) AS avg_duration_seconds,
        MAX(pe.duration_seconds) AS max_duration_seconds,
        COUNT(*) AS execution_count,
        (SELECT execution_id FROM pipeline_executions 
         WHERE pipeline_id = pe.pipeline_id 
         ORDER BY duration_seconds DESC LIMIT 1) AS last_slow_execution_id
    FROM pipeline_executions pe
    WHERE 
        pe.duration_seconds > p_threshold_seconds
        AND pe.started_at >= NOW() - (p_days || ' days')::INTERVAL
        AND pe.status IN ('success', 'failed')
    GROUP BY pe.pipeline_id, pe.pipeline_name
    ORDER BY avg_duration_seconds DESC;
END;
$$ LANGUAGE plpgsql;

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_pipeline_execution_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- duration 자동 계산
    IF NEW.finished_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pipeline_execution_timestamp
    BEFORE UPDATE ON pipeline_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_execution_timestamp();

CREATE TRIGGER trigger_update_stage_execution_timestamp
    BEFORE UPDATE ON pipeline_stage_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_execution_timestamp();

-- 샘플 데이터 (테스트용)
-- 실제 운영에서는 이 부분을 제거하거나 주석 처리하세요
COMMENT ON TABLE pipeline_executions IS '파이프라인 실행 이력 추적 - 모든 파이프라인 실행을 기록';
COMMENT ON TABLE pipeline_stage_executions IS '파이프라인 스테이지별 실행 이력';
COMMENT ON TABLE pipeline_artifacts IS '파이프라인 실행으로 생성된 아티팩트 추적';
COMMENT ON TABLE pipeline_metrics IS '파이프라인 실행 메트릭 기록';
COMMENT ON TABLE pipeline_notifications IS '파이프라인 관련 알림 전송 이력';

