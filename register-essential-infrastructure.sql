-- [advice from AI] 필수 배포 인프라 정보 등록
-- 외부 서비스 4개 + 자체 호스팅 서비스 3개

-- 1. 외부 서비스 - Nexus Repository Manager
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Nexus Repository Manager',
    'nexus',
    'production',
    'https://nexus.langsa.ai',
    'admin',
    'timbelNexus0901!',
    '{"nexus_user": "admin", "docker_registry": true, "maven_repository": true}',
    'Main artifact repository for container images and packages',
    '["nexus", "repository", "artifacts", "docker", "maven"]',
    NOW(),
    NOW()
);

-- 2. 외부 서비스 - Docker Registry
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Docker Registry',
    'docker_registry',
    'production',
    'https://docker.langsa.ai',
    'docker',
    'timbelDocker0901!',
    '{"registry_user": "docker", "push_access": true, "pull_access": true}',
    'Docker container registry for ECP-AI platform',
    '["docker", "registry", "containers", "images"]',
    NOW(),
    NOW()
);

-- 3. 외부 서비스 - Jenkins CI/CD Server
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Jenkins CI/CD Server',
    'jenkins',
    'production',
    'https://jenkins.langsa.ai',
    'admin',
    'admin123!',
    '{"jenkins_user": "admin", "api_token": "timbelJenkins0901!"}',
    'Main CI/CD pipeline server for automated builds and deployments',
    '["jenkins", "cicd", "automation", "pipeline"]',
    NOW(),
    NOW()
);

-- 4. 외부 서비스 - Argo CD Development
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Argo CD Development',
    'argocd',
    'development',
    'https://dev-ecp-argocd.langsa.ai',
    'admin',
    'admin123!',
    '{"argocd_user": "admin", "cli_access": true, "environment": "development"}',
    'GitOps deployment management for development environment',
    '["argocd", "gitops", "kubernetes", "development"]',
    NOW(),
    NOW()
);

-- 5. 자체 호스팅 - Jenkins CI/CD (Local)
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Jenkins CI/CD (Self-Hosted)',
    'ci_cd',
    'development',
    'http://localhost:8080',
    'admin',
    'admin123!',
    '{"jenkins_user": "admin", "self_hosted": true, "docker_enabled": true}',
    '자체 호스팅 Jenkins CI/CD 서버 - 개발 및 테스트용',
    '["jenkins", "cicd", "self-hosted", "development"]',
    NOW(),
    NOW()
);

-- 6. 자체 호스팅 - Nexus Repository (Local)
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Nexus Repository (Self-Hosted)',
    'artifact_repository',
    'development',
    'http://localhost:8081',
    'admin',
    'admin123!',
    '{"nexus_user": "admin", "docker_registry": "localhost:8082", "self_hosted": true}',
    '자체 호스팅 Nexus Repository Manager - 아티팩트 및 Docker 이미지 저장소',
    '["nexus", "repository", "self-hosted", "docker", "artifacts"]',
    NOW(),
    NOW()
);

-- 7. 자체 호스팅 - Argo CD (Local)
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Argo CD (Self-Hosted)',
    'deployment_platform',
    'development',
    'http://localhost:8084',
    'admin',
    'admin123!',
    '{"argocd_user": "admin", "self_hosted": true, "insecure": true}',
    '자체 호스팅 Argo CD GitOps 플랫폼 - 선언적 배포 관리',
    '["argocd", "gitops", "self-hosted", "kubernetes"]',
    NOW(),
    NOW()
);

-- 등록 결과 확인
SELECT 
    service_name,
    service_type,
    environment,
    service_url,
    admin_username,
    description,
    created_at
FROM deployment_infrastructure 
ORDER BY 
    CASE WHEN service_url LIKE 'https://%' THEN 1 ELSE 2 END,
    service_name;
