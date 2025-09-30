-- [advice from AI] 자동 설치된 CI/CD 인프라 정보 등록
-- Timbel Knowledge 시스템에 CI/CD 스택 정보 자동 등록

-- 기존 CI/CD 관련 인프라 정보 삭제 (중복 방지)
DELETE FROM deployment_infrastructure 
WHERE service_name IN ('Jenkins CI/CD', 'Nexus Repository', 'Argo CD GitOps', 'Gitea Git Server', 'Docker Registry');

-- Jenkins CI/CD Server 등록
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment, 
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Jenkins CI/CD',
    'ci_cd',
    'development',
    'http://localhost:8080',
    'admin',
    'admin123!',
    '{"jenkins_user": "admin", "api_token": "auto_generated"}',
    '자동 설치된 Jenkins CI/CD 서버 - 지속적 통합 및 배포',
    '["cicd", "jenkins", "automation", "pipeline"]',
    NOW(),
    NOW()
);

-- Nexus Repository Manager 등록
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Nexus Repository',
    'artifact_repository',
    'development',
    'http://localhost:8081',
    'admin',
    'admin123!',
    '{"nexus_user": "admin", "docker_registry": "localhost:8082"}',
    '자동 설치된 Nexus Repository Manager - 아티팩트 및 Docker 이미지 저장소',
    '["repository", "nexus", "docker", "artifacts"]',
    NOW(),
    NOW()
);

-- Argo CD GitOps Platform 등록
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Argo CD GitOps',
    'deployment_platform',
    'development',
    'http://localhost:8084',
    'admin',
    'admin123!',
    '{"argocd_user": "admin", "cli_access": true}',
    '자동 설치된 Argo CD GitOps 플랫폼 - 선언적 배포 관리',
    '["gitops", "argocd", "kubernetes", "deployment"]',
    NOW(),
    NOW()
);

-- Gitea Git Server 등록
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Gitea Git Server',
    'source_control',
    'development',
    'http://localhost:3010',
    'admin',
    'admin123!',
    '{"gitea_user": "admin", "api_access": true}',
    '자동 설치된 Gitea Git 서버 - 소스 코드 저장소',
    '["git", "gitea", "source_control", "repository"]',
    NOW(),
    NOW()
);

-- Docker Registry 등록
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Docker Registry',
    'container_registry',
    'development',
    'http://localhost:8082',
    'admin',
    'admin123!',
    '{"registry_user": "admin", "push_access": true, "pull_access": true}',
    '자동 설치된 Docker Registry - 컨테이너 이미지 저장소 (Nexus 기반)',
    '["docker", "registry", "containers", "images"]',
    NOW(),
    NOW()
);

-- 설치 완료 로그
INSERT INTO deployment_infrastructure (
    id, service_name, service_type, environment,
    service_url, admin_username, admin_password_encrypted,
    service_accounts, description, tags, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CI/CD Stack Dashboard',
    'monitoring',
    'development',
    'http://localhost',
    'system',
    'N/A',
    '{"dashboard_access": true, "integrated_view": true}',
    'CI/CD 스택 통합 대시보드 - 모든 서비스 통합 접근점',
    '["dashboard", "integration", "cicd", "monitoring"]',
    NOW(),
    NOW()
);

-- 등록 결과 확인
SELECT 
    service_name,
    service_type,
    service_url,
    admin_username,
    description,
    created_at
FROM deployment_infrastructure 
WHERE service_name LIKE '%Jenkins%' 
   OR service_name LIKE '%Nexus%' 
   OR service_name LIKE '%Argo%' 
   OR service_name LIKE '%Gitea%' 
   OR service_name LIKE '%Docker%'
   OR service_name LIKE '%CI/CD%'
ORDER BY created_at DESC;
