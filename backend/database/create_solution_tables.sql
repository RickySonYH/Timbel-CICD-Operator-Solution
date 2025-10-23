-- [advice from AI] 솔루션 인스턴스 관리를 위한 데이터베이스 테이블

-- 솔루션 타입 테이블
CREATE TABLE IF NOT EXISTS solution_types (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('ci', 'cd', 'artifact', 'webhook', 'monitoring', 'security', 'testing')),
    default_port INTEGER DEFAULT 8080,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 솔루션 인스턴스 테이블
CREATE TABLE IF NOT EXISTS solution_instances (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL REFERENCES solution_types(key),
    name VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'staging', 'development')),
    region VARCHAR(50),
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'warning', 'error', 'unknown')),
    description TEXT,
    credentials JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 기본 솔루션 타입 데이터 삽입
INSERT INTO solution_types (key, name, category, default_port, description) VALUES
('jenkins', 'Jenkins CI', 'ci', 8080, 'Continuous Integration Server'),
('nexus', 'Nexus Repository', 'artifact', 8081, 'Artifact Repository Manager'),
('argocd', 'Argo CD', 'cd', 8080, 'GitOps Continuous Delivery'),
('webhook', 'Webhook Service', 'webhook', 8080, 'Generic Webhook Handler'),
('prometheus', 'Prometheus', 'monitoring', 9090, 'Monitoring and Alerting'),
('grafana', 'Grafana', 'monitoring', 3000, 'Metrics Visualization'),
('sonarqube', 'SonarQube', 'security', 9000, 'Code Quality and Security Analysis'),
('selenium', 'Selenium Grid', 'testing', 4444, 'Automated Testing Framework')
ON CONFLICT (key) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_solution_instances_type ON solution_instances(type);
CREATE INDEX IF NOT EXISTS idx_solution_instances_environment ON solution_instances(environment);
CREATE INDEX IF NOT EXISTS idx_solution_instances_status ON solution_instances(status);
CREATE INDEX IF NOT EXISTS idx_solution_instances_active ON solution_instances(is_active);

-- 기본 솔루션 인스턴스 데이터 삽입 (개발용)
INSERT INTO solution_instances (id, type, name, url, environment, region, status, description, metrics) VALUES
('jenkins-prod-001', 'jenkins', 'Jenkins Production', 'http://jenkins-prod.company.com:8080', 'production', 'US-East', 'healthy', 'Production Jenkins CI Server', '{"jobs": 15, "lastCheck": "2024-01-01T00:00:00Z"}'),
('nexus-prod-001', 'nexus', 'Nexus Production', 'http://nexus-prod.company.com:8081', 'production', 'US-East', 'healthy', 'Production Nexus Repository', '{"repositories": 8, "lastCheck": "2024-01-01T00:00:00Z"}'),
('argocd-prod-001', 'argocd', 'ArgoCD Production', 'http://argocd-prod.company.com:8080', 'production', 'US-East', 'healthy', 'Production ArgoCD GitOps', '{"applications": 12, "lastCheck": "2024-01-01T00:00:00Z"}')
ON CONFLICT (id) DO NOTHING;

-- 권한 설정 (필요한 경우)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON solution_types TO timbel_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON solution_instances TO timbel_user;
-- GRANT USAGE, SELECT ON SEQUENCE solution_types_id_seq TO timbel_user;
