-- [advice from AI] 레포지토리 관리 테이블 스키마

-- 레포지토리 테이블
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url VARCHAR(500) NOT NULL UNIQUE,
    branch VARCHAR(100) DEFAULT 'main',
    
    -- 프로젝트 타입 및 기술 정보
    project_type VARCHAR(50), -- 'frontend', 'backend', 'fullstack', 'mobile', 'desktop', 'library'
    framework VARCHAR(100),   -- 'React', 'Vue.js', 'Express.js', 'Spring Boot', etc.
    language VARCHAR(100),    -- 'JavaScript', 'Python', 'Java', 'Go', etc.
    build_tool VARCHAR(50),   -- 'npm', 'yarn', 'maven', 'gradle', 'pip'
    
    -- 배포 설정 (JSON)
    deployment_config JSONB DEFAULT '{}',
    -- 예시: {
    --   "build_command": "npm run build",
    --   "start_command": "npm start",
    --   "port": 3000,
    --   "health_check_path": "/health",
    --   "environment_variables": [...],
    --   "resource_requirements": {...}
    -- }
    
    -- 기술 스택 정보 (JSON)
    tech_stack JSONB DEFAULT '{}',
    -- 예시: {
    --   "language": ["JavaScript", "TypeScript"],
    --   "framework": ["React", "Express.js"],
    --   "database": ["PostgreSQL", "Redis"],
    --   "tools": ["Docker", "Kubernetes"],
    --   "deployment": ["Jenkins", "GitHub Actions"]
    -- }
    
    -- 자동 감지된 정보 (JSON) - 분석 결과 저장
    auto_detected_info JSONB DEFAULT '{}',
    -- 예시: {
    --   "analysis_timestamp": "2024-01-01T00:00:00Z",
    --   "detected_ports": [3000, 8080],
    --   "detected_databases": ["PostgreSQL"],
    --   "has_dockerfile": true,
    --   "has_docker_compose": false,
    --   "package_info": {...},
    --   "readme_analysis": {...}
    -- }
    
    -- 연결된 프로젝트 (선택사항)
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- 메타데이터
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'inactive', 'archived'
);

-- CI/CD 파이프라인 설정 테이블
CREATE TABLE IF NOT EXISTS repository_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    
    -- 파이프라인 정보
    pipeline_name VARCHAR(255) NOT NULL,
    pipeline_type VARCHAR(50) NOT NULL, -- 'jenkins', 'github_actions', 'gitlab_ci', 'azure_devops'
    
    -- Jenkins 설정
    jenkins_server_id UUID REFERENCES cicd_servers(id),
    jenkins_job_name VARCHAR(255),
    
    -- 빌드 설정
    build_trigger VARCHAR(50) DEFAULT 'push', -- 'push', 'pull_request', 'manual', 'scheduled'
    build_branch VARCHAR(100) DEFAULT 'main',
    build_command TEXT,
    
    -- 배포 설정
    deployment_target VARCHAR(100), -- 'development', 'staging', 'production'
    deployment_strategy VARCHAR(50) DEFAULT 'rolling', -- 'rolling', 'blue_green', 'canary'
    
    -- Kubernetes 설정
    k8s_namespace VARCHAR(100),
    k8s_cluster VARCHAR(100),
    
    -- Docker 설정
    docker_registry VARCHAR(255),
    docker_image_name VARCHAR(255),
    
    -- 환경 변수 및 시크릿
    environment_variables JSONB DEFAULT '{}',
    secrets JSONB DEFAULT '{}',
    
    -- 알림 설정
    notification_config JSONB DEFAULT '{}',
    -- 예시: {
    --   "slack_webhook": "https://hooks.slack.com/...",
    --   "email_recipients": ["dev@company.com"],
    --   "on_success": true,
    --   "on_failure": true
    -- }
    
    -- 메타데이터
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'inactive', 'draft'
);

-- 빌드 히스토리 테이블
CREATE TABLE IF NOT EXISTS build_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES repository_pipelines(id) ON DELETE SET NULL,
    
    -- 빌드 정보
    build_number INTEGER NOT NULL,
    build_status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'success', 'failure', 'cancelled'
    build_trigger VARCHAR(50), -- 'push', 'pull_request', 'manual', 'scheduled'
    
    -- Git 정보
    commit_hash VARCHAR(40),
    commit_message TEXT,
    branch VARCHAR(100),
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    
    -- Jenkins 정보
    jenkins_job_name VARCHAR(255),
    jenkins_build_number INTEGER,
    jenkins_build_url VARCHAR(500),
    
    -- 빌드 결과
    build_duration_seconds INTEGER,
    build_log TEXT,
    test_results JSONB DEFAULT '{}',
    
    -- 배포 정보
    deployed_to VARCHAR(100),
    deployment_status VARCHAR(20), -- 'pending', 'deploying', 'deployed', 'failed', 'rolled_back'
    deployment_url VARCHAR(500),
    
    -- 메타데이터
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 레포지토리 웹훅 테이블
CREATE TABLE IF NOT EXISTS repository_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    
    -- 웹훅 정보
    webhook_type VARCHAR(50) NOT NULL, -- 'github', 'gitlab', 'bitbucket'
    webhook_url VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(255),
    
    -- 이벤트 설정
    events JSONB DEFAULT '[]', -- ['push', 'pull_request', 'release', 'issues']
    
    -- 상태
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    -- 메타데이터
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_repositories_project_id ON repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_repositories_created_by ON repositories(created_by);
CREATE INDEX IF NOT EXISTS idx_repositories_status ON repositories(status);
CREATE INDEX IF NOT EXISTS idx_repositories_project_type ON repositories(project_type);
CREATE INDEX IF NOT EXISTS idx_repositories_language ON repositories(language);

CREATE INDEX IF NOT EXISTS idx_repository_pipelines_repository_id ON repository_pipelines(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_pipelines_jenkins_server_id ON repository_pipelines(jenkins_server_id);
CREATE INDEX IF NOT EXISTS idx_repository_pipelines_status ON repository_pipelines(status);

CREATE INDEX IF NOT EXISTS idx_build_history_repository_id ON build_history(repository_id);
CREATE INDEX IF NOT EXISTS idx_build_history_pipeline_id ON build_history(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_build_history_status ON build_history(build_status);
CREATE INDEX IF NOT EXISTS idx_build_history_created_at ON build_history(created_at);

CREATE INDEX IF NOT EXISTS idx_repository_webhooks_repository_id ON repository_webhooks(repository_id);
CREATE INDEX IF NOT EXISTS idx_repository_webhooks_active ON repository_webhooks(is_active);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_repositories_updated_at ON repositories;
CREATE TRIGGER update_repositories_updated_at
    BEFORE UPDATE ON repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repository_pipelines_updated_at ON repository_pipelines;
CREATE TRIGGER update_repository_pipelines_updated_at
    BEFORE UPDATE ON repository_pipelines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repository_webhooks_updated_at ON repository_webhooks;
CREATE TRIGGER update_repository_webhooks_updated_at
    BEFORE UPDATE ON repository_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 (개발용)
INSERT INTO repositories (
    name, description, repository_url, branch,
    project_type, framework, language, build_tool,
    deployment_config, tech_stack, auto_detected_info
) VALUES (
    'ECP AI K8s Orchestrator',
    'AI 기반 Kubernetes 오케스트레이션 시스템',
    'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
    'main',
    'fullstack',
    'FastAPI + React',
    'Python + JavaScript',
    'pip + npm',
    '{
        "build_command": "docker build -t ecp-ai-orchestrator .",
        "start_command": "uvicorn main:app --host 0.0.0.0 --port 8000",
        "port": 8000,
        "health_check_path": "/health",
        "environment_variables": [
            {"name": "DATABASE_URL", "required": true},
            {"name": "REDIS_URL", "required": true},
            {"name": "JWT_SECRET", "required": true}
        ],
        "resource_requirements": {
            "cpu": "1000m",
            "memory": "2Gi",
            "storage": "10Gi"
        }
    }',
    '{
        "language": ["Python", "JavaScript", "TypeScript"],
        "framework": ["FastAPI", "React", "SQLAlchemy"],
        "database": ["PostgreSQL", "Redis"],
        "tools": ["Docker", "Kubernetes", "Prometheus"],
        "deployment": ["Docker", "Kubernetes", "Helm"]
    }',
    '{
        "analysis_timestamp": "2024-01-01T00:00:00Z",
        "detected_ports": [8000, 3000],
        "detected_databases": ["PostgreSQL", "Redis"],
        "has_dockerfile": true,
        "has_docker_compose": true,
        "has_kubernetes": true,
        "has_jenkinsfile": false,
        "package_info": {
            "backend": {
                "name": "ecp-ai-orchestrator",
                "version": "1.0.0",
                "dependencies": ["fastapi", "sqlalchemy", "redis", "kubernetes"]
            },
            "frontend": {
                "name": "ecp-frontend",
                "version": "1.0.0",
                "dependencies": ["react", "typescript", "material-ui", "axios"]
            }
        },
        "readme_analysis": {
            "has_installation_guide": true,
            "has_usage_guide": true,
            "has_deployment_guide": true,
            "detected_ports": [8000],
            "detected_env_vars": ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"]
        }
    }'
) ON CONFLICT (repository_url) DO NOTHING;
