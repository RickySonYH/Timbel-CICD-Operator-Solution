-- [advice from AI] 관리자 기능을 위한 데이터베이스 테이블 생성 스크립트

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES timbel_users(id)
);

-- 알림 템플릿 테이블
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'system', 'both')),
    subject VARCHAR(500),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES timbel_users(id)
);

-- 알림 규칙 테이블
CREATE TABLE IF NOT EXISTS notification_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    event VARCHAR(100) NOT NULL,
    condition TEXT,
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    recipients JSONB NOT NULL DEFAULT '[]',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES timbel_users(id)
);

-- 알림 로그 테이블
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'system')),
    recipient VARCHAR(200) NOT NULL,
    subject VARCHAR(500),
    content TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    sent_at TIMESTAMP DEFAULT NOW(),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- 시스템 로그 테이블
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    source VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 백업 파일 테이블
CREATE TABLE IF NOT EXISTS backup_files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('full', 'incremental', 'differential')),
    description TEXT,
    file_path VARCHAR(500),
    size BIGINT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id)
);

-- 복원 작업 테이블
CREATE TABLE IF NOT EXISTS restore_operations (
    id SERIAL PRIMARY KEY,
    backup_id INTEGER REFERENCES backup_files(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    started_by UUID REFERENCES timbel_users(id),
    error_message TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_backup_files_status ON backup_files(status);
CREATE INDEX IF NOT EXISTS idx_backup_files_created_at ON backup_files(created_at);

-- 기본 데이터 삽입
INSERT INTO system_settings (key, settings) VALUES 
('email_notifications', '{"enabled": false, "smtpHost": "", "smtpPort": 587, "smtpUser": "", "smtpPassword": "", "fromEmail": "", "fromName": "", "useTLS": true, "useSSL": false}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, settings) VALUES 
('system_notifications', '{"enabled": true, "browserPush": true, "inAppNotification": true, "soundEnabled": true, "desktopNotification": true}')
ON CONFLICT (key) DO NOTHING;

-- [advice from AI] JWT 보안 설정 추가
INSERT INTO system_settings (key, settings) VALUES 
('jwt_security', '{"expiresIn": "30m", "issuer": "timbel-platform", "audience": "timbel-users", "algorithm": "HS256", "refreshTokenExpiresIn": "7d"}')
ON CONFLICT (key) DO NOTHING;

-- 기본 알림 템플릿 삽입
INSERT INTO notification_templates (name, type, subject, content, is_active) VALUES 
('사용자 로그인 알림', 'email', '로그인 알림', '안녕하세요 {{username}}님, {{date}}에 로그인하셨습니다.', true),
('시스템 오류 알림', 'both', '시스템 오류 발생', '시스템에서 오류가 발생했습니다: {{error_message}}', true),
('백업 완료 알림', 'email', '백업 완료', '백업이 성공적으로 완료되었습니다. 백업 파일: {{backup_name}}', true)
ON CONFLICT DO NOTHING;

-- 기본 알림 규칙 삽입
INSERT INTO notification_rules (name, event, condition, actions, recipients, priority, is_active) VALUES 
('로그인 알림 규칙', 'user_login', 'true', '["send_email", "log_event"]', '["admin@example.com"]', 'low', true),
('시스템 오류 알림 규칙', 'system_error', 'error_level >= "high"', '["send_email", "send_system_notification"]', '["admin@example.com", "ops@example.com"]', 'urgent', true),
('백업 완료 알림 규칙', 'backup_completed', 'true', '["send_email"]', '["admin@example.com"]', 'medium', true)
ON CONFLICT DO NOTHING;

-- 보안 정책 테이블
CREATE TABLE IF NOT EXISTS security_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('password', 'access', 'data', 'network')),
    rules JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES timbel_users(id)
);

-- 보안 이벤트 테이블
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    resolved BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

-- 보안 감사 테이블
CREATE TABLE IF NOT EXISTS security_audits (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('passed', 'failed', 'warning')),
    details TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    performed_by UUID REFERENCES timbel_users(id)
);

-- 보안 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audits_type ON security_audits(type);
CREATE INDEX IF NOT EXISTS idx_security_audits_result ON security_audits(result);
CREATE INDEX IF NOT EXISTS idx_security_audits_timestamp ON security_audits(timestamp);

-- 기본 보안 정책 삽입
INSERT INTO security_policies (name, type, rules, is_active, priority) VALUES 
('비밀번호 정책', 'password', '["최소 8자 이상", "대소문자, 숫자, 특수문자 포함", "연속된 문자 금지", "개인정보 포함 금지"]', true, 1),
('접근 제어 정책', 'access', '["관리자 권한 필요", "IP 화이트리스트 검증", "시간 제한 적용", "지역 제한 적용"]', true, 2),
('데이터 보호 정책', 'data', '["민감 데이터 암호화", "데이터 백업 필수", "접근 로그 기록", "데이터 보존 정책 준수"]', true, 3),
('네트워크 보안 정책', 'network', '["HTTPS 필수", "방화벽 설정", "DDoS 방어", "네트워크 모니터링"]', true, 4)
ON CONFLICT DO NOTHING;

-- API 키 테이블
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    key VARCHAR(255) UNIQUE NOT NULL,
    masked_key VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('read', 'write', 'admin')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'revoked')),
    permissions JSONB DEFAULT '[]',
    rate_limit JSONB NOT NULL DEFAULT '{"requests": 1000, "period": "hour"}',
    expires_at TIMESTAMP,
    last_used TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES timbel_users(id)
);

-- API 사용 로그 테이블
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id),
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

-- API 키 템플릿 테이블
CREATE TABLE IF NOT EXISTS api_key_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('read', 'write', 'admin')),
    permissions JSONB DEFAULT '[]',
    rate_limit JSONB NOT NULL DEFAULT '{"requests": 1000, "period": "hour"}',
    expires_in_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES timbel_users(id)
);

-- API 키 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_type ON api_keys(type);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);

-- 기본 API 키 템플릿 삽입
INSERT INTO api_key_templates (name, description, type, permissions, rate_limit, expires_in_days) VALUES 
('읽기 전용 키', '데이터 조회만 가능한 API 키', 'read', '["read:users", "read:projects", "read:documents"]', '{"requests": 1000, "period": "hour"}', 365),
('쓰기 키', '데이터 생성 및 수정이 가능한 API 키', 'write', '["read:users", "read:projects", "read:documents", "write:users", "write:projects", "write:documents"]', '{"requests": 500, "period": "hour"}', 90),
('관리자 키', '모든 권한을 가진 관리자 API 키', 'admin', '["read:*", "write:*", "delete:*", "admin:*"]', '{"requests": 2000, "period": "hour"}', 30)
ON CONFLICT DO NOTHING;
