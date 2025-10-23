-- [advice from AI] 확장 가능한 파이프라인 프로바이더 스키마
-- 다양한 CI/CD 솔루션 지원을 위한 플러그인 아키텍처

-- [advice from AI] 파이프라인 프로바이더 등록 테이블
CREATE TABLE IF NOT EXISTS pipeline_providers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL, -- jenkins, argocd, nexus, github_actions, gitlab_ci, etc.
    display_name VARCHAR(200),
    description TEXT,
    
    -- 연결 설정
    server_url TEXT NOT NULL,
    config JSONB DEFAULT '{}', -- 프로바이더별 설정 (암호화된 자격증명 포함)
    
    -- 상태 정보
    enabled BOOLEAN DEFAULT true,
    connected BOOLEAN DEFAULT false,
    last_health_check TIMESTAMP,
    health_status VARCHAR(20) DEFAULT 'unknown', -- healthy, unhealthy, unknown
    health_details JSONB DEFAULT '{}',
    
    -- 기능 정보
    capabilities JSONB DEFAULT '[]', -- 지원하는 기능 목록
    metadata JSONB DEFAULT '{}', -- 버전, 작성자, 지원 기능 등
    
    -- 통계 정보
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    last_execution_at TIMESTAMP,
    
    -- 관리 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    
    CONSTRAINT chk_provider_type CHECK (provider_type IN (
        'jenkins', 'argocd', 'nexus', 'github_actions', 'gitlab_ci', 
        'azure_devops', 'circleci', 'drone', 'tekton', 'bamboo'
    )),
    CONSTRAINT chk_health_status CHECK (health_status IN ('healthy', 'unhealthy', 'unknown'))
);

-- [advice from AI] 파이프라인 템플릿 테이블
CREATE TABLE IF NOT EXISTS pipeline_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(300),
    description TEXT,
    
    -- 템플릿 분류
    category VARCHAR(50) DEFAULT 'custom', -- build, deploy, test, full_cicd, custom
    language VARCHAR(50), -- java, python, nodejs, dotnet, go, etc.
    framework VARCHAR(50), -- spring, react, angular, django, etc.
    
    -- 프로바이더 정보
    provider_type VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100),
    
    -- 템플릿 내용
    template_config JSONB NOT NULL, -- 파이프라인 설정 템플릿
    parameters JSONB DEFAULT '[]', -- 사용자 입력 파라미터 정의
    
    -- 파일 템플릿 (선택적)
    jenkinsfile TEXT, -- Jenkins용 Jenkinsfile
    gitlab_ci_yml TEXT, -- GitLab CI용 .gitlab-ci.yml
    github_workflow TEXT, -- GitHub Actions용 workflow
    dockerfile TEXT, -- Docker 빌드용
    
    -- 상태 정보
    enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    
    -- 버전 관리
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- 관리 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    
    CONSTRAINT chk_template_category CHECK (category IN (
        'build', 'deploy', 'test', 'full_cicd', 'custom'
    )),
    CONSTRAINT chk_template_provider_type CHECK (provider_type IN (
        'jenkins', 'argocd', 'nexus', 'github_actions', 'gitlab_ci', 
        'azure_devops', 'circleci', 'drone', 'tekton', 'bamboo'
    ))
);

-- [advice from AI] 파이프라인 실행 컨텍스트 확장
ALTER TABLE pipeline_executions 
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES pipeline_templates(id),
ADD COLUMN IF NOT EXISTS execution_context JSONB DEFAULT '{}', -- 실행 컨텍스트 정보
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5, -- 실행 우선순위 (1=highest, 10=lowest)
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- [advice from AI] 파이프라인 실행 단계 테이블
CREATE TABLE IF NOT EXISTS pipeline_execution_stages (
    id BIGSERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES pipeline_executions(id) ON DELETE CASCADE,
    stage_name VARCHAR(200) NOT NULL,
    stage_order INTEGER NOT NULL,
    
    -- 상태 정보
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, success, failed, skipped, cancelled
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- 단계별 정보
    command TEXT,
    environment JSONB DEFAULT '{}',
    artifacts JSONB DEFAULT '[]',
    
    -- 로그 정보
    log_url TEXT,
    log_size BIGINT DEFAULT 0,
    
    -- 에러 정보
    error_message TEXT,
    error_code VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_stage_status CHECK (status IN (
        'pending', 'running', 'success', 'failed', 'skipped', 'cancelled'
    ))
);

-- [advice from AI] 프로바이더별 설정 템플릿 테이블
CREATE TABLE IF NOT EXISTS provider_config_templates (
    id BIGSERIAL PRIMARY KEY,
    provider_type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 설정 템플릿
    config_schema JSONB NOT NULL, -- JSON Schema for validation
    default_config JSONB DEFAULT '{}',
    required_fields JSONB DEFAULT '[]',
    
    -- 상태 정보
    enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(provider_type, name)
);

-- [advice from AI] 파이프라인 실행 통계 뷰
CREATE OR REPLACE VIEW pipeline_provider_stats AS
SELECT 
    pp.name as provider_name,
    pp.provider_type,
    pp.enabled,
    pp.connected,
    COUNT(pe.id) as total_executions,
    COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) as completed_executions,
    COUNT(CASE WHEN pe.status = 'failed' THEN 1 END) as failed_executions,
    COUNT(CASE WHEN pe.status = 'running' THEN 1 END) as running_executions,
    ROUND(
        COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN pe.status IN ('completed', 'failed') THEN 1 END), 0), 2
    ) as success_rate,
    AVG(EXTRACT(EPOCH FROM (pe.completed_at - pe.started_at))) as avg_duration_seconds,
    MAX(pe.created_at) as last_execution_at
FROM pipeline_providers pp
LEFT JOIN pipeline_executions pe ON pp.name = pe.provider_name
GROUP BY pp.name, pp.provider_type, pp.enabled, pp.connected;

-- [advice from AI] 템플릿 사용 통계 뷰
CREATE OR REPLACE VIEW pipeline_template_usage AS
SELECT 
    pt.id as template_id,
    pt.name as template_name,
    pt.category,
    pt.provider_type,
    pt.language,
    pt.framework,
    COUNT(pe.id) as usage_count,
    COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) as successful_uses,
    COUNT(CASE WHEN pe.status = 'failed' THEN 1 END) as failed_uses,
    ROUND(
        COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(pe.id), 0), 2
    ) as success_rate,
    MAX(pe.created_at) as last_used_at
FROM pipeline_templates pt
LEFT JOIN pipeline_executions pe ON pt.id = pe.template_id
GROUP BY pt.id, pt.name, pt.category, pt.provider_type, pt.language, pt.framework;

-- [advice from AI] 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pipeline_providers_type ON pipeline_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_providers_enabled ON pipeline_providers(enabled);
CREATE INDEX IF NOT EXISTS idx_pipeline_providers_connected ON pipeline_providers(connected);
CREATE INDEX IF NOT EXISTS idx_pipeline_providers_health ON pipeline_providers(health_status);

CREATE INDEX IF NOT EXISTS idx_pipeline_templates_category ON pipeline_templates(category);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_provider ON pipeline_templates(provider_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_language ON pipeline_templates(language);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_enabled ON pipeline_templates(enabled);

CREATE INDEX IF NOT EXISTS idx_pipeline_executions_provider ON pipeline_executions(provider_name);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_template ON pipeline_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_priority ON pipeline_executions(priority);

CREATE INDEX IF NOT EXISTS idx_pipeline_execution_stages_execution ON pipeline_execution_stages(execution_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_stages_status ON pipeline_execution_stages(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_execution_stages_order ON pipeline_execution_stages(execution_id, stage_order);

-- [advice from AI] 업데이트 트리거
CREATE TRIGGER update_pipeline_providers_updated_at
    BEFORE UPDATE ON pipeline_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_templates_updated_at
    BEFORE UPDATE ON pipeline_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- [advice from AI] 기본 프로바이더 데이터 삽입
INSERT INTO pipeline_providers (name, provider_type, display_name, description, server_url, config, enabled) VALUES
('jenkins-default', 'jenkins', 'Jenkins (Default)', 'Default Jenkins CI/CD Server', 
 COALESCE(NULLIF(current_setting('app.jenkins_url', true), ''), 'http://jenkins:8080'), 
 jsonb_build_object(
   'username', COALESCE(NULLIF(current_setting('app.jenkins_username', true), ''), 'admin'),
   'apiToken', COALESCE(NULLIF(current_setting('app.jenkins_token', true), ''), ''),
   'timeout', 30000
 ), true),
 
('argocd-default', 'argocd', 'Argo CD (Default)', 'Default Argo CD Deployment Server', 
 COALESCE(NULLIF(current_setting('app.argocd_url', true), ''), 'http://argocd:8080'), 
 jsonb_build_object(
   'username', COALESCE(NULLIF(current_setting('app.argocd_username', true), ''), 'admin'),
   'password', COALESCE(NULLIF(current_setting('app.argocd_password', true), ''), ''),
   'timeout', 30000
 ), true),
 
('nexus-default', 'nexus', 'Nexus Repository (Default)', 'Default Nexus Artifact Repository', 
 COALESCE(NULLIF(current_setting('app.nexus_url', true), ''), 'http://nexus:8081'), 
 jsonb_build_object(
   'username', COALESCE(NULLIF(current_setting('app.nexus_username', true), ''), 'admin'),
   'password', COALESCE(NULLIF(current_setting('app.nexus_password', true), ''), ''),
   'timeout', 30000
 ), true)
ON CONFLICT (name) DO NOTHING;

-- [advice from AI] 기본 파이프라인 템플릿 삽입
INSERT INTO pipeline_templates (name, display_name, description, category, language, provider_type, template_config, parameters) VALUES
('java-maven-build', 'Java Maven Build', 'Standard Java project build with Maven', 'build', 'java', 'jenkins',
 jsonb_build_object(
   'stages', jsonb_build_array(
     jsonb_build_object('name', 'Checkout', 'command', 'git checkout'),
     jsonb_build_object('name', 'Build', 'command', 'mvn clean compile'),
     jsonb_build_object('name', 'Test', 'command', 'mvn test'),
     jsonb_build_object('name', 'Package', 'command', 'mvn package')
   )
 ),
 jsonb_build_array(
   jsonb_build_object('name', 'MAVEN_GOALS', 'type', 'string', 'default', 'clean package', 'description', 'Maven goals to execute'),
   jsonb_build_object('name', 'JAVA_VERSION', 'type', 'choice', 'choices', jsonb_build_array('8', '11', '17', '21'), 'default', '11')
 )),

('nodejs-build', 'Node.js Build', 'Standard Node.js project build and test', 'build', 'nodejs', 'jenkins',
 jsonb_build_object(
   'stages', jsonb_build_array(
     jsonb_build_object('name', 'Checkout', 'command', 'git checkout'),
     jsonb_build_object('name', 'Install', 'command', 'npm install'),
     jsonb_build_object('name', 'Test', 'command', 'npm test'),
     jsonb_build_object('name', 'Build', 'command', 'npm run build')
   )
 ),
 jsonb_build_array(
   jsonb_build_object('name', 'NODE_VERSION', 'type', 'choice', 'choices', jsonb_build_array('16', '18', '20'), 'default', '18'),
   jsonb_build_object('name', 'BUILD_COMMAND', 'type', 'string', 'default', 'npm run build', 'description', 'Build command to execute')
 )),

('docker-build-push', 'Docker Build & Push', 'Build Docker image and push to registry', 'build', 'docker', 'jenkins',
 jsonb_build_object(
   'stages', jsonb_build_array(
     jsonb_build_object('name', 'Checkout', 'command', 'git checkout'),
     jsonb_build_object('name', 'Build Image', 'command', 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .'),
     jsonb_build_object('name', 'Push Image', 'command', 'docker push ${IMAGE_NAME}:${BUILD_NUMBER}')
   )
 ),
 jsonb_build_array(
   jsonb_build_object('name', 'IMAGE_NAME', 'type', 'string', 'required', true, 'description', 'Docker image name'),
   jsonb_build_object('name', 'REGISTRY_URL', 'type', 'string', 'default', 'docker.io', 'description', 'Docker registry URL')
 ))
ON CONFLICT (name) DO NOTHING;

-- [advice from AI] 프로바이더 설정 템플릿 삽입
INSERT INTO provider_config_templates (provider_type, name, description, config_schema, default_config, required_fields) VALUES
('jenkins', 'basic-auth', 'Basic Authentication with Username and API Token',
 jsonb_build_object(
   'type', 'object',
   'properties', jsonb_build_object(
     'serverUrl', jsonb_build_object('type', 'string', 'format', 'uri'),
     'username', jsonb_build_object('type', 'string'),
     'apiToken', jsonb_build_object('type', 'string'),
     'timeout', jsonb_build_object('type', 'integer', 'minimum', 1000)
   )
 ),
 jsonb_build_object('timeout', 30000),
 jsonb_build_array('serverUrl', 'username', 'apiToken')),

('github_actions', 'token-auth', 'GitHub Personal Access Token Authentication',
 jsonb_build_object(
   'type', 'object',
   'properties', jsonb_build_object(
     'token', jsonb_build_object('type', 'string'),
     'owner', jsonb_build_object('type', 'string'),
     'repo', jsonb_build_object('type', 'string')
   )
 ),
 jsonb_build_object(),
 jsonb_build_array('token', 'owner', 'repo'))
ON CONFLICT (provider_type, name) DO NOTHING;

COMMENT ON TABLE pipeline_providers IS '파이프라인 프로바이더 등록 및 관리';
COMMENT ON TABLE pipeline_templates IS '재사용 가능한 파이프라인 템플릿';
COMMENT ON TABLE pipeline_execution_stages IS '파이프라인 실행 단계별 상세 정보';
COMMENT ON TABLE provider_config_templates IS '프로바이더별 설정 템플릿';
