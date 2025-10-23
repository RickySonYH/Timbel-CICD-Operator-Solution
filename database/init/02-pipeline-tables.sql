-- 파이프라인 실행 테이블
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id SERIAL PRIMARY KEY,
    pipeline_id VARCHAR(255) NOT NULL,
    repository TEXT NOT NULL,
    branch VARCHAR(255) NOT NULL,
    environment VARCHAR(100) NOT NULL,
    parameters JSONB,
    status VARCHAR(50) DEFAULT 'running',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    triggered_by INTEGER REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 파이프라인 설정 테이블
CREATE TABLE IF NOT EXISTS pipeline_configurations (
    id SERIAL PRIMARY KEY,
    pipeline_id VARCHAR(255) UNIQUE NOT NULL,
    stages JSONB,
    triggers JSONB,
    notifications JSONB,
    environments JSONB,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 파이프라인 실행 로그 테이블
CREATE TABLE IF NOT EXISTS pipeline_execution_logs (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES pipeline_executions(id),
    stage_name VARCHAR(255),
    log_level VARCHAR(50),
    message TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_pipeline_id ON pipeline_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_started_at ON pipeline_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_configurations_pipeline_id ON pipeline_configurations(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_logs_execution_id ON pipeline_execution_logs(execution_id);
