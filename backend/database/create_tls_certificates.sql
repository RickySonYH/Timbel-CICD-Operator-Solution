-- [advice from AI] TLS/SSL 인증서 관리 테이블

CREATE TABLE IF NOT EXISTS tls_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('manual', 'letsencrypt', 'self-signed')),
    
    -- 인증서 데이터 (암호화 저장 권장)
    cert_data TEXT NOT NULL,
    key_data TEXT NOT NULL,
    ca_cert TEXT,
    
    -- 메타데이터
    issuer VARCHAR(255),
    subject VARCHAR(255),
    issued_date TIMESTAMP,
    expiry_date TIMESTAMP NOT NULL,
    
    -- 상태
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
    
    -- Kubernetes 연동
    secret_name VARCHAR(255),
    namespace VARCHAR(255) DEFAULT 'default',
    cluster_id UUID REFERENCES kubernetes_clusters(id) ON DELETE CASCADE,
    
    -- 감사 로그
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tls_certificates_domain ON tls_certificates(domain);
CREATE INDEX IF NOT EXISTS idx_tls_certificates_expiry ON tls_certificates(expiry_date);
CREATE INDEX IF NOT EXISTS idx_tls_certificates_cluster ON tls_certificates(cluster_id);
CREATE INDEX IF NOT EXISTS idx_tls_certificates_status ON tls_certificates(status);

-- 만료 임박 인증서 조회를 위한 함수
CREATE OR REPLACE FUNCTION get_expiring_certificates(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
    domain VARCHAR,
    expiry_date TIMESTAMP,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.domain,
        tc.expiry_date,
        EXTRACT(DAY FROM (tc.expiry_date - NOW()))::INTEGER as days_until_expiry
    FROM tls_certificates tc
    WHERE 
        tc.status = 'active' 
        AND tc.expiry_date > NOW()
        AND tc.expiry_date <= NOW() + INTERVAL '1 day' * days_threshold
    ORDER BY tc.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 도메인-인증서 매핑 테이블 (Ingress에서 사용)
CREATE TABLE IF NOT EXISTS ingress_tls_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingress_rule_id UUID REFERENCES ingress_rules(id) ON DELETE CASCADE,
    certificate_id UUID REFERENCES tls_certificates(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ingress_rule_id, certificate_id)
);

CREATE INDEX IF NOT EXISTS idx_ingress_tls_ingress ON ingress_tls_mappings(ingress_rule_id);
CREATE INDEX IF NOT EXISTS idx_ingress_tls_cert ON ingress_tls_mappings(certificate_id);
