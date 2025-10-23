-- [advice from AI] 실제 배포 시스템을 위한 데이터베이스 테이블 생성
-- 운영 환경에서 실제로 사용할 배포 관련 테이블들

-- 1. 배포 실행 기록 테이블
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    repository_url TEXT NOT NULL,
    repository_branch VARCHAR(100) DEFAULT 'main',
    
    -- 배포 설정
    environment VARCHAR(50) NOT NULL DEFAULT 'development',
    namespace VARCHAR(100),
    image_name VARCHAR(255),
    image_tag VARCHAR(100) DEFAULT 'latest',
    
    -- Jenkins 관련
    jenkins_job_name VARCHAR(255),
    jenkins_build_number INTEGER,
    jenkins_build_url TEXT,
    
    -- ArgoCD 관련
    argocd_app_name VARCHAR(255),
    argocd_sync_status VARCHAR(50),
    
    -- Nexus 관련
    nexus_image_url TEXT,
    
    -- 배포 상태
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, building, deploying, completed, failed
    progress_percentage INTEGER DEFAULT 0,
    
    -- 리소스 설정
    cpu_request VARCHAR(20) DEFAULT '100m',
    memory_request VARCHAR(20) DEFAULT '128Mi',
    replicas INTEGER DEFAULT 1,
    
    -- 메타데이터
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- 로그 및 오류
    error_message TEXT,
    deployment_logs JSONB DEFAULT '[]'::jsonb
);

-- 2. 배포 단계별 로그 테이블
CREATE TABLE IF NOT EXISTS deployment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL, -- preparation, building, pushing, deploying, verification
    message TEXT NOT NULL,
    level VARCHAR(20) DEFAULT 'info', -- debug, info, warn, error
    timestamp TIMESTAMP DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb
);

-- 3. CI/CD 서버 설정 테이블
CREATE TABLE IF NOT EXISTS cicd_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- jenkins, argocd, nexus
    url TEXT NOT NULL,
    username VARCHAR(100),
    password_encrypted TEXT,
    api_token_encrypted TEXT,
    
    -- 연결 설정
    is_active BOOLEAN DEFAULT true,
    connection_timeout INTEGER DEFAULT 30,
    
    -- 메타데이터
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_health_check TIMESTAMP,
    health_status VARCHAR(20) DEFAULT 'unknown' -- healthy, unhealthy, unknown
);

-- 4. 배포 환경 설정 테이블
CREATE TABLE IF NOT EXISTS deployment_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Kubernetes 설정
    kubernetes_cluster_url TEXT,
    kubernetes_namespace VARCHAR(100),
    kubernetes_config_encrypted TEXT,
    
    -- 기본 리소스 설정
    default_cpu_request VARCHAR(20) DEFAULT '100m',
    default_memory_request VARCHAR(20) DEFAULT '128Mi',
    default_replicas INTEGER DEFAULT 1,
    
    -- 환경별 설정
    auto_scaling_enabled BOOLEAN DEFAULT false,
    monitoring_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. 파이프라인 템플릿 테이블
CREATE TABLE IF NOT EXISTS pipeline_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 템플릿 설정
    template_type VARCHAR(50) NOT NULL, -- nodejs, java, python, docker, etc.
    jenkins_pipeline_script TEXT,
    dockerfile_template TEXT,
    k8s_manifest_template TEXT,
    
    -- 기본 설정
    default_build_args JSONB DEFAULT '{}'::jsonb,
    default_env_vars JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_by ON deployments(created_by);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_timestamp ON deployment_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_cicd_servers_type ON cicd_servers(type);
CREATE INDEX IF NOT EXISTS idx_cicd_servers_active ON cicd_servers(is_active);

-- 기본 데이터 삽입
INSERT INTO deployment_environments (name, display_name, description, kubernetes_namespace) VALUES
('development', '개발 환경', '개발자 테스트 및 개발용 환경', 'dev'),
('staging', '스테이징 환경', '운영 배포 전 최종 검증 환경', 'staging'),
('production', '운영 환경', '실제 서비스 운영 환경', 'prod')
ON CONFLICT (name) DO NOTHING;

INSERT INTO pipeline_templates (name, display_name, description, template_type, jenkins_pipeline_script) VALUES
('nodejs-standard', 'Node.js 표준 파이프라인', 'Node.js 애플리케이션을 위한 표준 CI/CD 파이프라인', 'nodejs', 
'pipeline {
    agent any
    stages {
        stage("Checkout") {
            steps {
                git url: "${REPOSITORY_URL}", branch: "${BRANCH}"
            }
        }
        stage("Build") {
            steps {
                sh "npm ci"
                sh "npm run build"
            }
        }
        stage("Test") {
            steps {
                sh "npm test"
            }
        }
        stage("Docker Build") {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} ."
            }
        }
        stage("Push to Registry") {
            steps {
                sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
            }
        }
    }
}'),
('docker-standard', 'Docker 표준 파이프라인', 'Dockerfile 기반 표준 CI/CD 파이프라인', 'docker',
'pipeline {
    agent any
    stages {
        stage("Checkout") {
            steps {
                git url: "${REPOSITORY_URL}", branch: "${BRANCH}"
            }
        }
        stage("Docker Build") {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} ."
            }
        }
        stage("Push to Registry") {
            steps {
                sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
            }
        }
    }
}')
ON CONFLICT (name) DO NOTHING;

-- 기본 CI/CD 서버 설정 (환경변수로 설정 가능)
INSERT INTO cicd_servers (name, type, url, username) VALUES
('default-jenkins', 'jenkins', COALESCE(NULLIF(current_setting('app.jenkins_url', true), ''), 'http://jenkins:8080'), COALESCE(NULLIF(current_setting('app.jenkins_user', true), ''), 'admin')),
('default-argocd', 'argocd', COALESCE(NULLIF(current_setting('app.argocd_url', true), ''), 'https://argocd:8080'), COALESCE(NULLIF(current_setting('app.argocd_user', true), ''), 'admin')),
('default-nexus', 'nexus', COALESCE(NULLIF(current_setting('app.nexus_url', true), ''), 'http://nexus:8081'), COALESCE(NULLIF(current_setting('app.nexus_user', true), ''), 'admin'))
ON CONFLICT (name) DO NOTHING;

-- 권한 부여
GRANT ALL PRIVILEGES ON deployments TO timbel_user;
GRANT ALL PRIVILEGES ON deployment_logs TO timbel_user;
GRANT ALL PRIVILEGES ON cicd_servers TO timbel_user;
GRANT ALL PRIVILEGES ON deployment_environments TO timbel_user;
GRANT ALL PRIVILEGES ON pipeline_templates TO timbel_user;

COMMENT ON TABLE deployments IS '실제 배포 실행 기록을 저장하는 테이블';
COMMENT ON TABLE deployment_logs IS '배포 과정의 상세 로그를 저장하는 테이블';
COMMENT ON TABLE cicd_servers IS 'Jenkins, ArgoCD, Nexus 등 CI/CD 서버 설정 테이블';
COMMENT ON TABLE deployment_environments IS '배포 환경별 설정을 저장하는 테이블';
COMMENT ON TABLE pipeline_templates IS '재사용 가능한 파이프라인 템플릿을 저장하는 테이블';
