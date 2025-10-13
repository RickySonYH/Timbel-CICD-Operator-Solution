-- [advice from AI] timbel_cicd_operator 데이터베이스용 사용자 테이블 및 운영 데이터

-- UUID 확장 활성화 (이미 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블 업데이트 (운영센터용)
ALTER TABLE timbel_users ADD COLUMN IF NOT EXISTS permission_level INTEGER DEFAULT 4;
ALTER TABLE timbel_users ADD COLUMN IF NOT EXISTS work_permissions JSONB DEFAULT '{}';

-- 기존 사용자 데이터 업데이트
UPDATE timbel_users SET 
    permission_level = 0, 
    work_permissions = '{"role": "admin", "access": ["all"]}'
WHERE role_type = 'admin';

UPDATE timbel_users SET 
    permission_level = 4, 
    work_permissions = '{"role": "operations", "access": ["deployments", "monitoring", "infrastructure"]}'
WHERE role_type = 'operations';

-- 비밀번호 해시 업데이트 (1q2w3e4r)
UPDATE timbel_users SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- 샘플 배포 데이터 (operations_deployments 테이블용)
INSERT INTO operations_deployments (
    id, project_name, status, progress, environment, 
    tenant_id, created_at, updated_at
) VALUES 
(uuid_generate_v4(), 'Timbel Frontend v2.1', 'running', 65, 'production', 
 (SELECT id FROM operations_tenants LIMIT 1), NOW() - INTERVAL '2 hours', NOW()),
(uuid_generate_v4(), 'Backend API v1.8', 'completed', 100, 'production', 
 (SELECT id FROM operations_tenants LIMIT 1), NOW() - INTERVAL '1 day', NOW()),
(uuid_generate_v4(), 'Monitoring Service', 'pending', 0, 'staging', 
 (SELECT id FROM operations_tenants LIMIT 1), NOW() - INTERVAL '30 minutes', NOW()),
(uuid_generate_v4(), 'Payment Gateway', 'failed', 45, 'production', 
 (SELECT id FROM operations_tenants LIMIT 1), NOW() - INTERVAL '3 hours', NOW())
ON CONFLICT DO NOTHING;

-- 샘플 테넌트 데이터 (없다면 생성)
INSERT INTO operations_tenants (
    id, name, description, status, created_at
) VALUES 
(uuid_generate_v4(), 'Production Tenant', '운영 환경 테넌트', 'active', NOW()),
(uuid_generate_v4(), 'Staging Tenant', '스테이징 환경 테넌트', 'active', NOW()),
(uuid_generate_v4(), 'Development Tenant', '개발 환경 테넌트', 'active', NOW())
ON CONFLICT DO NOTHING;

-- 샘플 인프라 데이터
INSERT INTO operations_infrastructures (
    id, name, type, status, health_status, created_at
) VALUES 
(uuid_generate_v4(), 'Jenkins CI/CD Server', 'ci_cd', 'active', 'healthy', NOW()),
(uuid_generate_v4(), 'Nexus Repository', 'repository', 'active', 'healthy', NOW()),
(uuid_generate_v4(), 'ArgoCD Deployment', 'deployment', 'active', 'warning', NOW()),
(uuid_generate_v4(), 'Kubernetes Cluster', 'container', 'active', 'healthy', NOW()),
(uuid_generate_v4(), 'Database Cluster', 'database', 'maintenance', 'critical', NOW())
ON CONFLICT DO NOTHING;
