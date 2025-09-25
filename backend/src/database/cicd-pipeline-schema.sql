-- [advice from AI] CI/CD 파이프라인 관리 데이터베이스 스키마
-- GitHub → Jenkins → Nexus → Argo CD 전체 파이프라인 정보 저장

-- CI/CD 파이프라인 테이블
CREATE TABLE IF NOT EXISTS cicd_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name VARCHAR(255) NOT NULL,
    repository_url TEXT NOT NULL,
    branch VARCHAR(100) DEFAULT 'main',
    jenkins_job_name VARCHAR(255) UNIQUE NOT NULL,
    build_number INTEGER,
    build_status VARCHAR(20) DEFAULT 'pending' CHECK (build_status IN ('pending', 'running', 'success', 'failed')),
    image_tag VARCHAR(255),
    deployment_status VARCHAR(20) DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deploying', 'deployed', 'failed')),
    dockerfile_path VARCHAR(500) DEFAULT 'Dockerfile',
    deployment_environment VARCHAR(50) DEFAULT 'development' CHECK (deployment_environment IN ('development', 'staging', 'production')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- 인덱스
    CONSTRAINT unique_project_branch UNIQUE (project_name, branch)
);

-- 파이프라인 빌드 히스토리 테이블
CREATE TABLE IF NOT EXISTS cicd_build_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES cicd_pipelines(id) ON DELETE CASCADE,
    build_number INTEGER NOT NULL,
    build_status VARCHAR(20) NOT NULL CHECK (build_status IN ('pending', 'running', 'success', 'failed')),
    build_duration INTEGER, -- 빌드 소요 시간 (초)
    commit_hash VARCHAR(40),
    commit_message TEXT,
    commit_author VARCHAR(255),
    image_tag VARCHAR(255),
    build_logs TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 인덱스
    CONSTRAINT unique_pipeline_build UNIQUE (pipeline_id, build_number)
);

-- 파이프라인 배포 히스토리 테이블
CREATE TABLE IF NOT EXISTS cicd_deployment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES cicd_pipelines(id) ON DELETE CASCADE,
    build_id UUID REFERENCES cicd_build_history(id) ON DELETE CASCADE,
    deployment_environment VARCHAR(50) NOT NULL,
    deployment_status VARCHAR(20) NOT NULL CHECK (deployment_status IN ('pending', 'deploying', 'deployed', 'failed', 'rolled_back')),
    image_tag VARCHAR(255) NOT NULL,
    argocd_app_name VARCHAR(255),
    deployment_config JSONB, -- Helm values, 리소스 설정 등
    deployment_logs TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deployed_by UUID REFERENCES users(id)
);

-- CI/CD 설정 테이블 (암호화된 설정 저장)
CREATE TABLE IF NOT EXISTS cicd_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('jenkins', 'nexus', 'argocd', 'github')),
    service_url TEXT NOT NULL,
    username VARCHAR(255),
    encrypted_token TEXT, -- 암호화된 토큰/비밀번호
    additional_config JSONB, -- 추가 설정 정보
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- 인덱스
    CONSTRAINT unique_service_type UNIQUE (service_type)
);

-- 파이프라인 웹훅 이벤트 로그 테이블
CREATE TABLE IF NOT EXISTS cicd_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES cicd_pipelines(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'github_push', 'jenkins_build_complete', 'argocd_deploy_complete' 등
    event_source VARCHAR(50) NOT NULL, -- 'github', 'jenkins', 'argocd' 등
    event_data JSONB NOT NULL, -- 웹훅 페이로드
    processed BOOLEAN DEFAULT false,
    processing_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cicd_pipelines_status ON cicd_pipelines(build_status, deployment_status);
CREATE INDEX IF NOT EXISTS idx_cicd_pipelines_updated ON cicd_pipelines(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cicd_build_history_pipeline ON cicd_build_history(pipeline_id, build_number DESC);
CREATE INDEX IF NOT EXISTS idx_cicd_deployment_history_pipeline ON cicd_deployment_history(pipeline_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cicd_webhook_events_pipeline ON cicd_webhook_events(pipeline_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cicd_webhook_events_processed ON cicd_webhook_events(processed, created_at);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_cicd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_cicd_pipelines_updated_at ON cicd_pipelines;
CREATE TRIGGER trigger_cicd_pipelines_updated_at
    BEFORE UPDATE ON cicd_pipelines
    FOR EACH ROW
    EXECUTE FUNCTION update_cicd_updated_at();

DROP TRIGGER IF EXISTS trigger_cicd_configurations_updated_at ON cicd_configurations;
CREATE TRIGGER trigger_cicd_configurations_updated_at
    BEFORE UPDATE ON cicd_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_cicd_updated_at();

-- 샘플 데이터 (개발용)
INSERT INTO cicd_pipelines (
    project_name, 
    repository_url, 
    branch, 
    jenkins_job_name, 
    build_status, 
    deployment_status,
    deployment_environment
) VALUES 
(
    'Sample Web App',
    'https://github.com/example/sample-web-app',
    'main',
    'sample-web-app-main',
    'success',
    'deployed',
    'development'
),
(
    'API Service',
    'https://github.com/example/api-service',
    'develop',
    'api-service-develop',
    'running',
    'pending',
    'staging'
),
(
    'Mobile Backend',
    'https://github.com/example/mobile-backend',
    'main',
    'mobile-backend-main',
    'failed',
    'failed',
    'production'
)
ON CONFLICT (project_name, branch) DO NOTHING;

-- 권한 설정
GRANT SELECT, INSERT, UPDATE, DELETE ON cicd_pipelines TO timbel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON cicd_build_history TO timbel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON cicd_deployment_history TO timbel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON cicd_configurations TO timbel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON cicd_webhook_events TO timbel_app;

-- 뷰 생성: 파이프라인 상세 정보
CREATE OR REPLACE VIEW cicd_pipeline_details AS
SELECT 
    p.*,
    bh.build_number as latest_build_number,
    bh.build_duration as latest_build_duration,
    bh.commit_hash as latest_commit_hash,
    bh.commit_message as latest_commit_message,
    bh.commit_author as latest_commit_author,
    dh.deployment_environment as latest_deployment_env,
    dh.argocd_app_name as latest_argocd_app,
    u.username as created_by_username
FROM cicd_pipelines p
LEFT JOIN users u ON p.created_by = u.id
LEFT JOIN LATERAL (
    SELECT * FROM cicd_build_history 
    WHERE pipeline_id = p.id 
    ORDER BY build_number DESC 
    LIMIT 1
) bh ON true
LEFT JOIN LATERAL (
    SELECT * FROM cicd_deployment_history 
    WHERE pipeline_id = p.id 
    ORDER BY created_at DESC 
    LIMIT 1
) dh ON true;

GRANT SELECT ON cicd_pipeline_details TO timbel_app;
