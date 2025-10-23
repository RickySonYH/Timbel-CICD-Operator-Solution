-- [advice from AI] 샘플 파이프라인 데이터 추가
-- Jenkins, ArgoCD, Nexus가 실제로 구성되어 있는 경우를 시뮬레이션

-- 1. 파이프라인 제공자 데이터 추가 (이미 있는 경우 무시)
INSERT INTO operations_pipeline_providers (id, name, type, endpoint_url, is_active, created_at) 
VALUES 
  ('jenkins-main', 'Jenkins Main', 'CI', 'http://jenkins:8080', true, NOW()),
  ('argocd-main', 'ArgoCD Main', 'CD', 'http://argocd:8080', true, NOW()),
  ('nexus-main', 'Nexus Repository', 'Registry', 'http://nexus:8081', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. 샘플 파이프라인 데이터 추가
INSERT INTO operations_pipelines (
  id, pipeline_name, pipeline_type, environment, deployment_strategy, 
  status, config, created_at, updated_at
) VALUES 
(
  'pipeline-ecp-ai-orchestrator',
  'ECP-AI Orchestrator Pipeline',
  'full-stack',
  'production',
  'rolling-update',
  'active',
  '{
    "repository_url": "https://github.com/RickySonYH/ecp-ai-k8s-orchestrator",
    "branch": "main",
    "jenkins_job_name": "ecp-ai-orchestrator-pipeline",
    "jenkins_url": "http://jenkins:8080/job/ecp-ai-orchestrator-pipeline",
    "nexus_url": "http://nexus:8081",
    "nexus_repository": "ecp-ai-orchestrator",
    "argocd_url": "http://argocd:8080",
    "argocd_app_name": "ecp-ai-orchestrator",
    "dockerfile_path": "Dockerfile",
    "image_tag": "latest",
    "namespace": "ecp-ai"
  }',
  NOW(),
  NOW()
),
(
  'pipeline-timbel-frontend',
  'Timbel Frontend Pipeline',
  'frontend',
  'production',
  'blue-green',
  'active',
  '{
    "repository_url": "https://github.com/timbel/frontend",
    "branch": "main",
    "jenkins_job_name": "timbel-frontend-pipeline",
    "jenkins_url": "http://jenkins:8080/job/timbel-frontend-pipeline",
    "nexus_url": "http://nexus:8081",
    "nexus_repository": "timbel-frontend",
    "argocd_url": "http://argocd:8080",
    "argocd_app_name": "timbel-frontend",
    "dockerfile_path": "Dockerfile",
    "image_tag": "latest",
    "namespace": "timbel"
  }',
  NOW(),
  NOW()
),
(
  'pipeline-api-gateway',
  'API Gateway Pipeline',
  'backend',
  'staging',
  'canary',
  'active',
  '{
    "repository_url": "https://github.com/company/api-gateway",
    "branch": "develop",
    "jenkins_job_name": "api-gateway-pipeline",
    "jenkins_url": "http://jenkins:8080/job/api-gateway-pipeline",
    "nexus_url": "http://nexus:8081",
    "nexus_repository": "api-gateway",
    "argocd_url": "http://argocd:8080",
    "argocd_app_name": "api-gateway",
    "dockerfile_path": "Dockerfile",
    "image_tag": "develop",
    "namespace": "staging"
  }',
  NOW(),
  NOW()
),
(
  'pipeline-user-service',
  'User Service Pipeline',
  'microservice',
  'development',
  'rolling-update',
  'inactive',
  '{
    "repository_url": "https://github.com/company/user-service",
    "branch": "feature/auth-enhancement",
    "jenkins_job_name": "user-service-pipeline",
    "jenkins_url": "http://jenkins:8080/job/user-service-pipeline",
    "nexus_url": "http://nexus:8081",
    "nexus_repository": "user-service",
    "argocd_url": "http://argocd:8080",
    "argocd_app_name": "user-service",
    "dockerfile_path": "Dockerfile",
    "image_tag": "feature-auth",
    "namespace": "development"
  }',
  NOW(),
  NOW()
),
(
  'pipeline-notification-service',
  'Notification Service Pipeline',
  'microservice',
  'production',
  'rolling-update',
  'active',
  '{
    "repository_url": "https://github.com/company/notification-service",
    "branch": "main",
    "jenkins_job_name": "notification-service-pipeline",
    "jenkins_url": "http://jenkins:8080/job/notification-service-pipeline",
    "nexus_url": "http://nexus:8081",
    "nexus_repository": "notification-service",
    "argocd_url": "http://argocd:8080",
    "argocd_app_name": "notification-service",
    "dockerfile_path": "Dockerfile",
    "image_tag": "latest",
    "namespace": "production"
  }',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW(),
  config = EXCLUDED.config;

-- 3. 샘플 파이프라인 스테이지 추가
INSERT INTO operations_pipeline_stages (
  id, pipeline_id, stage_name, stage_order, status, config, created_at
) VALUES 
-- ECP-AI Orchestrator 파이프라인 스테이지
('stage-ecp-build', 'pipeline-ecp-ai-orchestrator', 'Build', 1, 'completed', '{"duration": 120, "last_run": "2024-01-15T10:30:00Z"}', NOW()),
('stage-ecp-test', 'pipeline-ecp-ai-orchestrator', 'Test', 2, 'completed', '{"duration": 90, "last_run": "2024-01-15T10:32:00Z"}', NOW()),
('stage-ecp-deploy', 'pipeline-ecp-ai-orchestrator', 'Deploy', 3, 'completed', '{"duration": 180, "last_run": "2024-01-15T10:35:00Z"}', NOW()),

-- Timbel Frontend 파이프라인 스테이지
('stage-frontend-build', 'pipeline-timbel-frontend', 'Build', 1, 'running', '{"duration": 60, "last_run": "2024-01-15T11:00:00Z"}', NOW()),
('stage-frontend-test', 'pipeline-timbel-frontend', 'Test', 2, 'pending', '{"duration": 45, "last_run": "2024-01-14T15:30:00Z"}', NOW()),
('stage-frontend-deploy', 'pipeline-timbel-frontend', 'Deploy', 3, 'pending', '{"duration": 90, "last_run": "2024-01-14T15:32:00Z"}', NOW())

ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  config = EXCLUDED.config;

-- 4. 샘플 배포 기록 추가 (UUID 생성을 위해 gen_random_uuid() 사용)
INSERT INTO deployments (
  deployment_name, project_name, repository_url, repository_branch,
  status, progress_percentage, environment, image_tag, jenkins_job_name,
  argocd_app_name, created_at
) VALUES 
(
  'ECP-AI Orchestrator v1.2.0',
  'ECP-AI Orchestrator',
  'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
  'main',
  'completed',
  100,
  'production',
  'v1.2.0',
  'ecp-ai-orchestrator-pipeline',
  'ecp-ai-orchestrator',
  NOW() - INTERVAL '2 hours'
),
(
  'Timbel Frontend v2.1.0',
  'Timbel Frontend',
  'https://github.com/timbel/frontend',
  'main',
  'running',
  75,
  'production',
  'v2.1.0',
  'timbel-frontend-pipeline',
  'timbel-frontend',
  NOW() - INTERVAL '30 minutes'
),
(
  'API Gateway v1.5.0',
  'API Gateway',
  'https://github.com/company/api-gateway',
  'develop',
  'completed',
  100,
  'staging',
  'v1.5.0',
  'api-gateway-pipeline',
  'api-gateway',
  NOW() - INTERVAL '1 day'
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON operations_pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipelines_environment ON operations_pipelines(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at);

-- 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_pipelines TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON operations_pipeline_stages TO timbel_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployments TO timbel_user;

COMMENT ON TABLE operations_pipelines IS '실제 CI/CD 파이프라인 정보를 저장하는 테이블';
COMMENT ON TABLE operations_pipeline_stages IS '파이프라인의 각 스테이지 정보를 저장하는 테이블';
COMMENT ON TABLE deployments IS '배포 실행 기록을 저장하는 테이블';
