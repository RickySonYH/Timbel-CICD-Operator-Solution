-- [advice from AI] 멀티 테넌시 스키마
-- 테넌트 격리, 리소스 할당, 권한 관리

-- 테넌트 테이블
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  plan VARCHAR(50) DEFAULT 'basic', -- basic, pro, enterprise
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 5,
  max_deployments_per_day INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 10,
  custom_domain VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 테넌트 사용자 매핑
CREATE TABLE IF NOT EXISTS tenant_users (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- timbel_users 테이블의 user_id
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, viewer
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, user_id)
);

-- 테넌트 리소스 사용량
CREATE TABLE IF NOT EXISTS tenant_resource_usage (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL, -- cpu, memory, storage, api_calls
  used_amount NUMERIC(10, 2) DEFAULT 0,
  allocated_amount NUMERIC(10, 2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'GB', -- GB, cores, count
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 테넌트 설정
CREATE TABLE IF NOT EXISTS tenant_settings (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, setting_key)
);

-- 테넌트 API 키
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  permissions TEXT[], -- ['read', 'write', 'admin']
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

-- 테넌트 감사 로그
CREATE TABLE IF NOT EXISTS tenant_audit_logs (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_resource_usage_tenant ON tenant_resource_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_resource_usage_recorded ON tenant_resource_usage(recorded_at);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_key ON tenant_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant ON tenant_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_created ON tenant_audit_logs(created_at);

-- 기본 테넌트 생성 (데모용)
INSERT INTO tenants (name, display_name, description, plan, max_users, max_projects, max_deployments_per_day, max_storage_gb)
VALUES 
  ('default', 'Default Organization', 'Default tenant for initial setup', 'enterprise', 100, 50, 1000, 100),
  ('demo', 'Demo Organization', 'Demo tenant for testing', 'pro', 20, 10, 100, 20)
ON CONFLICT (name) DO NOTHING;

