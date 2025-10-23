-- [advice from AI] 실시간 파이프라인 모니터링 스키마 업데이트
-- 기존 테이블을 보존하면서 필요한 컬럼 추가

-- [advice from AI] pipeline_executions 테이블 확장
ALTER TABLE pipeline_executions 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'cicd_pipeline',
ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS current_stage_index INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS stages_config JSONB,
ADD COLUMN IF NOT EXISTS config JSONB,
ADD COLUMN IF NOT EXISTS metrics JSONB,
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS failure_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS rollback_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rollback_pipeline_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS restarted_from VARCHAR(100),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- [advice from AI] 파이프라인 로그 테이블 (기존 pipeline_execution_logs와 호환)
CREATE TABLE IF NOT EXISTS pipeline_logs (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) NOT NULL,
    execution_id INTEGER REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    level VARCHAR(10) DEFAULT 'info', -- debug, info, warn, error, fatal
    source VARCHAR(50), -- jenkins, argocd, nexus, kubectl, docker
    message TEXT NOT NULL,
    raw_log TEXT,
    metadata JSONB,
    
    CONSTRAINT chk_log_level CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal'))
);

-- [advice from AI] 파이프라인 메트릭 테이블
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) NOT NULL,
    execution_id INTEGER REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(20),
    stage_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    
    UNIQUE(pipeline_id, metric_name, stage_id, timestamp)
);

-- [advice from AI] 파이프라인 알림 테이블
CREATE TABLE IF NOT EXISTS pipeline_alerts (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) NOT NULL,
    execution_id INTEGER REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- error, warning, info, success
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    message TEXT,
    stage_id VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    metadata JSONB,
    
    CONSTRAINT chk_alert_type CHECK (alert_type IN ('error', 'warning', 'info', 'success')),
    CONSTRAINT chk_alert_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- [advice from AI] 파이프라인 아티팩트 테이블
CREATE TABLE IF NOT EXISTS pipeline_artifacts (
    id BIGSERIAL PRIMARY KEY,
    pipeline_id VARCHAR(100) NOT NULL,
    execution_id INTEGER REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL, -- docker_image, helm_chart, binary, report
    name VARCHAR(255) NOT NULL,
    version VARCHAR(100),
    file_path TEXT,
    download_url TEXT,
    size_bytes BIGINT,
    checksum VARCHAR(128),
    stage_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    
    CONSTRAINT chk_artifact_type CHECK (artifact_type IN ('docker_image', 'helm_chart', 'binary', 'report', 'log', 'config'))
);

-- [advice from AI] 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_execution_id ON pipeline_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_pipeline_id ON pipeline_logs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_timestamp ON pipeline_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_level ON pipeline_logs(level);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_execution_id ON pipeline_metrics(execution_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_pipeline_id ON pipeline_metrics(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_timestamp ON pipeline_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_execution_id ON pipeline_alerts(execution_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_pipeline_id ON pipeline_alerts(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_timestamp ON pipeline_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_severity ON pipeline_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_pipeline_artifacts_execution_id ON pipeline_artifacts(execution_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_artifacts_pipeline_id ON pipeline_artifacts(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_artifacts_type ON pipeline_artifacts(artifact_type);

-- [advice from AI] 업데이트 트리거 함수 (이미 존재할 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [advice from AI] 업데이트 트리거 추가
DROP TRIGGER IF EXISTS update_pipeline_executions_updated_at ON pipeline_executions;
CREATE TRIGGER update_pipeline_executions_updated_at
    BEFORE UPDATE ON pipeline_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- [advice from AI] 집계 뷰 생성
CREATE OR REPLACE VIEW pipeline_execution_summary AS
SELECT 
    pe.id,
    pe.pipeline_id,
    pe.repository,
    pe.branch,
    pe.environment,
    pe.status,
    pe.type,
    pe.current_stage,
    pe.started_at,
    pe.completed_at,
    pe.created_at,
    pe.updated_at,
    pe.failure_reason,
    EXTRACT(EPOCH FROM (COALESCE(pe.completed_at, NOW()) - pe.started_at)) as duration_seconds,
    (SELECT COUNT(*) FROM pipeline_logs pl WHERE pl.execution_id = pe.id AND pl.level = 'error') as error_count,
    (SELECT COUNT(*) FROM pipeline_logs pl WHERE pl.execution_id = pe.id AND pl.level = 'warn') as warning_count,
    (SELECT COUNT(*) FROM pipeline_artifacts pa WHERE pa.execution_id = pe.id) as artifact_count,
    (SELECT COUNT(*) FROM pipeline_alerts pal WHERE pal.execution_id = pe.id AND pal.resolved = false) as active_alert_count
FROM pipeline_executions pe;

-- [advice from AI] 최근 파이프라인 활동 뷰
CREATE OR REPLACE VIEW recent_pipeline_activity AS
SELECT 
    pe.pipeline_id,
    pe.repository,
    pe.branch,
    pe.environment,
    pe.status,
    pe.started_at,
    pe.completed_at,
    pe.failure_reason,
    ROW_NUMBER() OVER (PARTITION BY pe.pipeline_id ORDER BY pe.started_at DESC) as rn
FROM pipeline_executions pe
WHERE pe.started_at >= NOW() - INTERVAL '7 days';

-- [advice from AI] 파이프라인 성능 통계 뷰
CREATE OR REPLACE VIEW pipeline_performance_stats AS
SELECT 
    pe.pipeline_id,
    pe.repository,
    pe.environment,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN pe.status = 'failed' THEN 1 END) as failed_executions,
    ROUND(
        COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2
    ) as success_rate,
    AVG(EXTRACT(EPOCH FROM (pe.completed_at - pe.started_at))) as avg_duration_seconds,
    MIN(pe.started_at) as first_execution,
    MAX(pe.started_at) as last_execution
FROM pipeline_executions pe
WHERE pe.started_at IS NOT NULL
GROUP BY pe.pipeline_id, pe.repository, pe.environment;

COMMENT ON TABLE pipeline_logs IS '파이프라인 실행 로그 - 실시간 로그 스트리밍';
COMMENT ON TABLE pipeline_metrics IS '파이프라인 성능 메트릭 - CPU, 메모리, 네트워크 등';
COMMENT ON TABLE pipeline_alerts IS '파이프라인 알림 - 오류, 경고, 성공 알림';
COMMENT ON TABLE pipeline_artifacts IS '파이프라인 아티팩트 - 빌드 결과물, 로그 파일 등';
