-- [advice from AI] 기본 인프라 정보 등록 SQL (올바른 테이블 구조 기반)
-- 이미지에 있는 인프라 정보들을 데이터베이스에 직접 등록

-- 기존 데이터 삭제 (중복 방지)
DELETE FROM deployment_infrastructure WHERE service_url IN (
  'https://nexus.langsa.ai',
  'https://docker.langsa.ai', 
  'https://jenkins.langsa.ai',
  'https://dev-ecp-argocd.langsa.ai',
  'https://stg-ecp-argocd.langsa.ai',
  'https://ecp-argocd.langsa.ai'
);

-- Nexus Repository 등록
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment, 
  admin_username, admin_password_encrypted, description, health_status, created_at
) VALUES (
  'Nexus Repository',
  'nexus',
  'https://nexus.langsa.ai',
  'production',
  'admin',
  'timbelNexus0901!',
  'Container Registry 및 Artifact Repository',
  'healthy',
  NOW()
);

-- Docker Registry 등록
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, description, health_status, created_at
) VALUES (
  'Docker Registry',
  'docker_registry', 
  'https://docker.langsa.ai',
  'production',
  'docker',
  'timbelDocker0901!',
  'Docker Container Registry',
  'healthy',
  NOW()
);

-- Jenkins Admin 등록
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, description, health_status, created_at
) VALUES (
  'Jenkins Admin',
  'jenkins',
  'https://jenkins.langsa.ai',
  'production',
  'admin', 
  'timbelJenkins0901!',
  'CI/CD 빌드 서버 (관리자)',
  'healthy',
  NOW()
);

-- Jenkins AICC 등록 (service_accounts 사용)
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, service_accounts, description, health_status, created_at
) VALUES (
  'Jenkins AICC',
  'jenkins',
  'https://jenkins.langsa.ai',
  'production',
  'admin',
  'timbelJenkins0901!',
  '[{"username": "aicc", "password": "ZAQ!2wsx", "role": "developer"}]'::jsonb,
  'CI/CD 빌드 서버 (AICC 전용)',
  'healthy',
  NOW()
);

-- Argo CD Development Admin 등록
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, description, health_status, created_at
) VALUES (
  'Argo CD Development',
  'argocd',
  'https://dev-ecp-argocd.langsa.ai',
  'development',
  'admin',
  'Lt95YrDQ4pfHR9za',
  'GitOps 배포 관리 (개발 환경)',
  'healthy',
  NOW()
);

-- Argo CD Development Developer 등록 (service_accounts 사용)
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, service_accounts, description, health_status, created_at
) VALUES (
  'Argo CD Development (Multi-User)',
  'argocd',
  'https://dev-ecp-argocd.langsa.ai',
  'development',
  'admin',
  'Lt95YrDQ4pfHR9za',
  '[{"username": "develop", "password": "ZAQ!2wsx", "role": "developer"}]'::jsonb,
  'GitOps 배포 관리 (개발자 계정 포함)',
  'healthy',
  NOW()
);

-- Argo CD Staging Admin 등록
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, description, health_status, created_at
) VALUES (
  'Argo CD Staging',
  'argocd',
  'https://stg-ecp-argocd.langsa.ai',
  'staging',
  'admin',
  'dNFPHhYXTuZMIiLG',
  'GitOps 배포 관리 (스테이징 환경)',
  'healthy',
  NOW()
);

-- Argo CD Staging Developer 등록 (service_accounts 사용)
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, service_accounts, description, health_status, created_at
) VALUES (
  'Argo CD Staging (Multi-User)',
  'argocd',
  'https://stg-ecp-argocd.langsa.ai',
  'staging',
  'admin',
  'dNFPHhYXTuZMIiLG',
  '[{"username": "develop", "password": "ZAQ!2wsx", "role": "developer"}]'::jsonb,
  'GitOps 배포 관리 (스테이징 개발자 포함)',
  'healthy',
  NOW()
);

-- Argo CD Production Admin 등록
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, description, health_status, created_at
) VALUES (
  'Argo CD Production',
  'argocd',
  'https://ecp-argocd.langsa.ai',
  'production',
  'admin',
  'Z80uxgeqBiPe7DbR',
  'GitOps 배포 관리 (운영 환경)',
  'healthy',
  NOW()
);

-- Argo CD Production Developer 등록 (service_accounts 사용)
INSERT INTO deployment_infrastructure (
  service_name, service_type, service_url, environment,
  admin_username, admin_password_encrypted, service_accounts, description, health_status, created_at
) VALUES (
  'Argo CD Production (Multi-User)',
  'argocd',
  'https://ecp-argocd.langsa.ai',
  'production',
  'admin',
  'Z80uxgeqBiPe7DbR',
  '[{"username": "develop", "password": "ZAQ!2wsx", "role": "developer"}]'::jsonb,
  'GitOps 배포 관리 (운영 개발자 포함)',
  'healthy',
  NOW()
);

-- 등록 결과 확인
SELECT 
  service_name,
  service_type,
  service_url,
  environment,
  admin_username,
  health_status,
  created_at
FROM deployment_infrastructure 
WHERE service_url IN (
  'https://nexus.langsa.ai',
  'https://docker.langsa.ai',
  'https://jenkins.langsa.ai', 
  'https://dev-ecp-argocd.langsa.ai',
  'https://stg-ecp-argocd.langsa.ai',
  'https://ecp-argocd.langsa.ai'
)
ORDER BY service_type, environment, service_name;
