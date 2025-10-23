-- [advice from AI] 솔루션 관리 시스템 데이터베이스 스키마

-- 솔루션 타입 테이블
CREATE TABLE IF NOT EXISTS solution_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'ci', 'cd', 'artifact', 'monitoring', 'webhook'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 솔루션 테이블
CREATE TABLE IF NOT EXISTS solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    type_id UUID NOT NULL REFERENCES solution_types(id),
    
    -- 솔루션 설정
    config JSONB DEFAULT '{}',
    -- 예시: {
    --   "endpoints": {
    --     "status": "/api/jenkins/status",
    --     "config": "/api/jenkins/config", 
    --     "monitor": "/api/jenkins/monitor"
    --   },
    --   "authentication": {
    --     "type": "basic",
    --     "username": "admin",
    --     "password": "encrypted_password"
    --   },
    --   "settings": {
    --     "timeout": 30000,
    --     "retry_count": 3,
    --     "health_check_interval": 60000
    --   }
    -- }
    
    -- 상태 정보
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'maintenance')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'warning', 'error', 'unknown')),
    
    -- 메트릭 정보 (JSON)
    metrics JSONB DEFAULT '{}',
    -- 예시: {
    --   "total": 0,
    --   "active": 0,
    --   "failed": 0,
    --   "last_update": "2024-01-01T00:00:00Z"
    -- }
    
    -- 메타데이터
    version VARCHAR(50) DEFAULT '1.0.0',
    is_enabled BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- 연결된 프로젝트 (선택사항)
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- 생성자 정보
    created_by UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 솔루션 메트릭 히스토리 테이블
CREATE TABLE IF NOT EXISTS solution_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    metrics JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 솔루션 상태 변경 로그 테이블
CREATE TABLE IF NOT EXISTS solution_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES timbel_users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 솔루션 플러그인 테이블 (확장 가능한 솔루션 지원)
CREATE TABLE IF NOT EXISTS solution_plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- 플러그인 설정 스키마
    config_schema JSONB DEFAULT '{}',
    metrics_schema JSONB DEFAULT '{}',
    
    -- 플러그인 파일 정보
    plugin_file_path VARCHAR(500),
    plugin_file_hash VARCHAR(64),
    
    -- 상태
    is_active BOOLEAN DEFAULT true,
    is_installed BOOLEAN DEFAULT false,
    
    -- 메타데이터
    created_by UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 솔루션과 플러그인 연결 테이블
CREATE TABLE IF NOT EXISTS solution_plugin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    plugin_id UUID NOT NULL REFERENCES solution_plugins(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(solution_id, plugin_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_solutions_type_id ON solutions(type_id);
CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status);
CREATE INDEX IF NOT EXISTS idx_solutions_is_enabled ON solutions(is_enabled);
CREATE INDEX IF NOT EXISTS idx_solutions_is_visible ON solutions(is_visible);
CREATE INDEX IF NOT EXISTS idx_solutions_project_id ON solutions(project_id);
CREATE INDEX IF NOT EXISTS idx_solutions_created_by ON solutions(created_by);

CREATE INDEX IF NOT EXISTS idx_solution_metrics_history_solution_id ON solution_metrics_history(solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_metrics_history_recorded_at ON solution_metrics_history(recorded_at);

CREATE INDEX IF NOT EXISTS idx_solution_status_logs_solution_id ON solution_status_logs(solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_status_logs_changed_at ON solution_status_logs(changed_at);

-- 기본 솔루션 타입 데이터 삽입
INSERT INTO solution_types (name, display_name, description, icon, color) VALUES
('ci', 'CI/CD', '지속적 통합 및 배포', 'BuildIcon', '#d33833'),
('cd', '배포', '지속적 배포 및 GitOps', 'CloudUploadIcon', '#2196f3'),
('artifact', '아티팩트', '아티팩트 저장소 관리', 'StorageIcon', '#4caf50'),
('monitoring', '모니터링', '시스템 모니터링 및 로깅', 'AssessmentIcon', '#ff9800'),
('webhook', '웹훅', 'Git 이벤트 기반 자동화', 'WebhookIcon', '#9c27b0'),
('security', '보안', '보안 스캔 및 정책 관리', 'SecurityIcon', '#f44336'),
('testing', '테스팅', '자동화된 테스트 실행', 'BugReportIcon', '#795548'),
('notification', '알림', '알림 및 메시징', 'NotificationsIcon', '#607d8b')
ON CONFLICT (name) DO NOTHING;

-- 기본 솔루션 데이터 삽입 (시스템 관리자용)
INSERT INTO solutions (name, display_name, description, type_id, config, status, is_enabled, is_visible, created_by) 
SELECT 
    'jenkins',
    'Jenkins CI',
    '지속적 통합 및 빌드 자동화',
    st.id,
    '{"endpoints": {"status": "/api/jenkins/status", "config": "/api/jenkins/config", "monitor": "/api/jenkins/monitor"}, "authentication": {"type": "basic"}, "settings": {"timeout": 30000, "retry_count": 3}}'::jsonb,
    'active',
    true,
    true,
    (SELECT id FROM timbel_users WHERE username = 'admin' LIMIT 1)
FROM solution_types st WHERE st.name = 'ci'
ON CONFLICT DO NOTHING;

INSERT INTO solutions (name, display_name, description, type_id, config, status, is_enabled, is_visible, created_by) 
SELECT 
    'nexus',
    'Nexus Repository',
    '아티팩트 저장소 관리',
    st.id,
    '{"endpoints": {"status": "/api/nexus/status", "config": "/api/nexus/config", "monitor": "/api/nexus/monitor"}, "authentication": {"type": "basic"}, "settings": {"timeout": 30000, "retry_count": 3}}'::jsonb,
    'active',
    true,
    true,
    (SELECT id FROM timbel_users WHERE username = 'admin' LIMIT 1)
FROM solution_types st WHERE st.name = 'artifact'
ON CONFLICT DO NOTHING;

INSERT INTO solutions (name, display_name, description, type_id, config, status, is_enabled, is_visible, created_by) 
SELECT 
    'argocd',
    'ArgoCD',
    '지속적 배포 및 GitOps',
    st.id,
    '{"endpoints": {"status": "/api/argocd/status", "config": "/api/argocd/config", "monitor": "/api/argocd/monitor"}, "authentication": {"type": "token"}, "settings": {"timeout": 30000, "retry_count": 3}}'::jsonb,
    'active',
    true,
    true,
    (SELECT id FROM timbel_users WHERE username = 'admin' LIMIT 1)
FROM solution_types st WHERE st.name = 'cd'
ON CONFLICT DO NOTHING;

INSERT INTO solutions (name, display_name, description, type_id, config, status, is_enabled, is_visible, created_by) 
SELECT 
    'webhooks',
    'GitHub Webhooks',
    'Git 이벤트 기반 자동화',
    st.id,
    '{"endpoints": {"status": "/api/webhooks/status", "config": "/api/webhooks/config", "monitor": "/api/webhooks/monitor"}, "authentication": {"type": "token"}, "settings": {"timeout": 30000, "retry_count": 3}}'::jsonb,
    'active',
    true,
    true,
    (SELECT id FROM timbel_users WHERE username = 'admin' LIMIT 1)
FROM solution_types st WHERE st.name = 'webhook'
ON CONFLICT DO NOTHING;
