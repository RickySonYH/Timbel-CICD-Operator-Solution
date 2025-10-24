-- [advice from AI] 감사 로그 시스템
-- 모든 사용자 액션 추적 및 보안 감사

-- 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    log_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- 사용자 정보
    user_id VARCHAR(100),
    username VARCHAR(200),
    user_email VARCHAR(300),
    user_role VARCHAR(100),
    
    -- 액션 정보
    action VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('create', 'read', 'update', 'delete', 'execute', 'approve', 'reject', 'login', 'logout', 'access', 'download', 'upload')),
    resource_type VARCHAR(100),
    resource_id VARCHAR(200),
    resource_name VARCHAR(300),
    
    -- 상세 정보
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    changes JSONB,
    
    -- 요청 정보
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_url TEXT,
    request_body JSONB,
    
    -- 응답 정보
    status_code INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- 메타데이터
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    category VARCHAR(50) CHECK (category IN ('authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security', 'compliance')),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- 타임스탬프
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- 인덱스 최적화를 위한 파티셔닝 키
    year_month INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM created_at) * 100 + EXTRACT(MONTH FROM created_at)) STORED
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_year_month ON audit_logs(year_month);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);

-- 로그인 이력 테이블
CREATE TABLE IF NOT EXISTS login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    username VARCHAR(200),
    
    -- 로그인 정보
    login_type VARCHAR(50) CHECK (login_type IN ('password', 'oauth', 'sso', 'api_key', 'token')),
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    
    -- 세션 정보
    session_id VARCHAR(200),
    token_id VARCHAR(200),
    
    -- 요청 정보
    ip_address VARCHAR(50),
    user_agent TEXT,
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    
    -- 보안 정보
    is_suspicious BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success);
CREATE INDEX IF NOT EXISTS idx_login_history_ip_address ON login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_suspicious ON login_history(is_suspicious);

-- 보안 이벤트 테이블
CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- 이벤트 정보
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    
    -- 관련 정보
    user_id VARCHAR(100),
    ip_address VARCHAR(50),
    resource_type VARCHAR(100),
    resource_id VARCHAR(200),
    
    -- 탐지 정보
    detection_method VARCHAR(100),
    threat_level INTEGER DEFAULT 0,
    
    -- 조치 정보
    action_taken TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    assigned_to VARCHAR(100),
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_status ON security_events(status);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);

-- 뷰: 최근 감사 로그 (성능 최적화)
CREATE OR REPLACE VIEW recent_audit_logs AS
SELECT 
    id,
    log_id,
    user_id,
    username,
    action,
    action_type,
    resource_type,
    resource_id,
    description,
    severity,
    category,
    success,
    ip_address,
    created_at
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 뷰: 사용자별 액션 통계
CREATE OR REPLACE VIEW user_action_statistics AS
SELECT 
    user_id,
    username,
    COUNT(*) AS total_actions,
    COUNT(*) FILTER (WHERE success = TRUE) AS successful_actions,
    COUNT(*) FILTER (WHERE success = FALSE) AS failed_actions,
    COUNT(DISTINCT action) AS unique_actions,
    MAX(created_at) AS last_action_at,
    ARRAY_AGG(DISTINCT action) AS actions_performed
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, username;

-- 뷰: 보안 이벤트 요약
CREATE OR REPLACE VIEW security_event_summary AS
SELECT 
    event_type,
    severity,
    COUNT(*) AS event_count,
    COUNT(*) FILTER (WHERE status = 'open') AS open_count,
    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
    MAX(created_at) AS last_occurrence
FROM security_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type, severity
ORDER BY 
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    event_count DESC;

-- 함수: 감사 로그 검색
CREATE OR REPLACE FUNCTION search_audit_logs(
    p_user_id VARCHAR DEFAULT NULL,
    p_action VARCHAR DEFAULT NULL,
    p_resource_type VARCHAR DEFAULT NULL,
    p_from_date TIMESTAMP DEFAULT NULL,
    p_to_date TIMESTAMP DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id BIGINT,
    log_id VARCHAR,
    user_id VARCHAR,
    username VARCHAR,
    action VARCHAR,
    action_type VARCHAR,
    resource_type VARCHAR,
    resource_id VARCHAR,
    description TEXT,
    severity VARCHAR,
    success BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.log_id,
        al.user_id,
        al.username,
        al.action,
        al.action_type,
        al.resource_type,
        al.resource_id,
        al.description,
        al.severity,
        al.success,
        al.created_at
    FROM audit_logs al
    WHERE 
        (p_user_id IS NULL OR al.user_id = p_user_id)
        AND (p_action IS NULL OR al.action = p_action)
        AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
        AND (p_from_date IS NULL OR al.created_at >= p_from_date)
        AND (p_to_date IS NULL OR al.created_at <= p_to_date)
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 함수: 의심스러운 활동 탐지
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    p_user_id VARCHAR,
    p_time_window_minutes INTEGER DEFAULT 5,
    p_threshold INTEGER DEFAULT 50
)
RETURNS TABLE (
    is_suspicious BOOLEAN,
    action_count BIGINT,
    unique_ips BIGINT,
    failed_attempts BIGINT,
    risk_score INTEGER
) AS $$
DECLARE
    v_action_count BIGINT;
    v_unique_ips BIGINT;
    v_failed_attempts BIGINT;
    v_risk_score INTEGER := 0;
BEGIN
    -- 최근 시간 내 액션 수
    SELECT COUNT(*) INTO v_action_count
    FROM audit_logs
    WHERE user_id = p_user_id
        AND created_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
    
    -- 고유 IP 수
    SELECT COUNT(DISTINCT ip_address) INTO v_unique_ips
    FROM audit_logs
    WHERE user_id = p_user_id
        AND created_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
    
    -- 실패한 시도 수
    SELECT COUNT(*) INTO v_failed_attempts
    FROM audit_logs
    WHERE user_id = p_user_id
        AND success = FALSE
        AND created_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
    
    -- 위험 점수 계산
    IF v_action_count > p_threshold THEN
        v_risk_score := v_risk_score + 30;
    END IF;
    
    IF v_unique_ips > 3 THEN
        v_risk_score := v_risk_score + 40;
    END IF;
    
    IF v_failed_attempts > 5 THEN
        v_risk_score := v_risk_score + 30;
    END IF;
    
    RETURN QUERY
    SELECT 
        (v_risk_score > 50)::BOOLEAN,
        v_action_count,
        v_unique_ips,
        v_failed_attempts,
        v_risk_score;
END;
$$ LANGUAGE plpgsql;

-- 함수: 로그 보관 정책 (오래된 로그 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    deleted_count BIGINT
) AS $$
DECLARE
    v_deleted_count BIGINT;
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
        AND severity NOT IN ('error', 'critical');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 보안 이벤트 자동 생성
CREATE OR REPLACE FUNCTION auto_create_security_event()
RETURNS TRIGGER AS $$
BEGIN
    -- 실패한 로그인 시도가 5회 이상인 경우
    IF NEW.action = 'login' AND NEW.success = FALSE THEN
        DECLARE
            v_failed_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO v_failed_count
            FROM audit_logs
            WHERE user_id = NEW.user_id
                AND action = 'login'
                AND success = FALSE
                AND created_at >= NOW() - INTERVAL '10 minutes';
            
            IF v_failed_count >= 5 THEN
                INSERT INTO security_events (
                    event_id,
                    event_type,
                    severity,
                    description,
                    user_id,
                    ip_address,
                    detection_method,
                    threat_level
                ) VALUES (
                    'sec-' || gen_random_uuid(),
                    'multiple_failed_logins',
                    'high',
                    '10분 이내 5회 이상 로그인 실패',
                    NEW.user_id,
                    NEW.ip_address,
                    'automatic',
                    70
                );
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_security_event
    AFTER INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_security_event();

-- 코멘트
COMMENT ON TABLE audit_logs IS '감사 로그 - 모든 사용자 액션 추적';
COMMENT ON TABLE login_history IS '로그인 이력';
COMMENT ON TABLE security_events IS '보안 이벤트 추적';

