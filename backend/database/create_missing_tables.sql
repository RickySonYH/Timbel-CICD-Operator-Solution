-- [advice from AI] 누락된 테이블 생성

-- operations_pipeline_providers 테이블 생성
CREATE TABLE IF NOT EXISTS operations_pipeline_providers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'CI', 'CD', 'Registry'
    endpoint_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- operations_pipelines 테이블 생성
CREATE TABLE IF NOT EXISTS operations_pipelines (
    id VARCHAR(255) PRIMARY KEY,
    pipeline_name VARCHAR(255) NOT NULL,
    pipeline_type VARCHAR(100) NOT NULL, -- 'frontend', 'backend', 'full-stack', 'microservice'
    environment VARCHAR(100) NOT NULL, -- 'development', 'staging', 'production'
    deployment_strategy VARCHAR(100) NOT NULL, -- 'rolling-update', 'blue-green', 'canary'
    status VARCHAR(50) NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'running', 'failed'
    last_status VARCHAR(50), -- 마지막 실행 상태
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- operations_pipeline_stages 테이블 생성
CREATE TABLE IF NOT EXISTS operations_pipeline_stages (
    id VARCHAR(255) PRIMARY KEY,
    pipeline_id VARCHAR(255) NOT NULL REFERENCES operations_pipelines(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- operations_pipeline_steps 테이블 생성 (이미 있을 수 있음)
CREATE TABLE IF NOT EXISTS operations_pipeline_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id VARCHAR(255) NOT NULL REFERENCES operations_pipeline_stages(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,
    command TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    output TEXT,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pipeline_providers_type ON operations_pipeline_providers(type);
CREATE INDEX IF NOT EXISTS idx_pipeline_providers_active ON operations_pipeline_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_pipelines_type ON operations_pipelines(pipeline_type);
CREATE INDEX IF NOT EXISTS idx_pipelines_environment ON operations_pipelines(environment);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON operations_pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON operations_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_status ON operations_pipeline_stages(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_stage_id ON operations_pipeline_steps(stage_id);

-- 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_pipeline_providers TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_pipelines TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_pipeline_stages TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_pipeline_steps TO timbel_user;

-- 코멘트 추가
COMMENT ON TABLE operations_pipeline_providers IS 'CI/CD 파이프라인 제공자 정보 (Jenkins, ArgoCD, Nexus 등)';
COMMENT ON TABLE operations_pipelines IS 'CI/CD 파이프라인 설정 정보';
COMMENT ON TABLE operations_pipeline_stages IS '파이프라인 스테이지 정보 (Build, Test, Deploy 등)';
COMMENT ON TABLE operations_pipeline_steps IS '파이프라인 스테이지의 세부 단계 정보';
