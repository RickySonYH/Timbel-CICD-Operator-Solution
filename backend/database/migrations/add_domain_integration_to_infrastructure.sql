-- 배포 인프라에 도메인 연동 기능 추가

-- 1. deployment_infrastructure 테이블에 도메인 연동 컬럼 추가
ALTER TABLE deployment_infrastructure 
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id),
ADD COLUMN IF NOT EXISTS customer_info JSONB DEFAULT '{}', -- 고객사 정보
ADD COLUMN IF NOT EXISTS deployment_config JSONB DEFAULT '{}', -- 배포 설정
ADD COLUMN IF NOT EXISTS access_permissions JSONB DEFAULT '[]'; -- 접근 권한

-- 2. 도메인별 인프라 매핑 테이블 생성
CREATE TABLE IF NOT EXISTS domain_infrastructure_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    infrastructure_id UUID REFERENCES deployment_infrastructure(id) ON DELETE CASCADE,
    deployment_priority INTEGER DEFAULT 1, -- 배포 우선순위 (1=높음, 5=낮음)
    environment_mapping JSONB DEFAULT '{}', -- 환경별 매핑 {"dev": "dev", "staging": "staging", "production": "production"}
    resource_limits JSONB DEFAULT '{}', -- 리소스 제한 {"cpu": "2", "memory": "4Gi", "storage": "10Gi"}
    network_config JSONB DEFAULT '{}', -- 네트워크 설정
    security_config JSONB DEFAULT '{}', -- 보안 설정
    is_default BOOLEAN DEFAULT false, -- 기본 인프라 여부
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES timbel_users(id),
    updated_by UUID REFERENCES timbel_users(id),
    
    -- 유니크 제약조건: 도메인당 환경별로 하나의 기본 인프라만 허용
    UNIQUE(domain_id, infrastructure_id)
);

-- 3. 고객사별 배포 히스토리 테이블
CREATE TABLE IF NOT EXISTS customer_deployment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    infrastructure_id UUID REFERENCES deployment_infrastructure(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    deployment_type VARCHAR(50) NOT NULL, -- 'initial', 'update', 'rollback', 'hotfix'
    deployment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
    source_version VARCHAR(100),
    target_version VARCHAR(100),
    deployment_config JSONB DEFAULT '{}',
    deployment_logs JSONB DEFAULT '[]',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    deployed_by UUID REFERENCES timbel_users(id),
    approved_by UUID REFERENCES timbel_users(id),
    rollback_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_deployment_infrastructure_domain_id ON deployment_infrastructure(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_infrastructure_mapping_domain_id ON domain_infrastructure_mapping(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_infrastructure_mapping_infrastructure_id ON domain_infrastructure_mapping(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_domain_infrastructure_mapping_is_default ON domain_infrastructure_mapping(domain_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_customer_deployment_history_domain_id ON customer_deployment_history(domain_id);
CREATE INDEX IF NOT EXISTS idx_customer_deployment_history_infrastructure_id ON customer_deployment_history(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_customer_deployment_history_project_id ON customer_deployment_history(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_deployment_history_status ON customer_deployment_history(deployment_status);

-- 5. 트리거 함수 - 도메인 매핑 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_domain_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_domain_mapping_updated_at ON domain_infrastructure_mapping;
CREATE TRIGGER trigger_update_domain_mapping_updated_at
    BEFORE UPDATE ON domain_infrastructure_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_mapping_updated_at();

-- 7. 기본 도메인 매핑 데이터 삽입 (예시)
-- 기존 인프라에 대해 기본 도메인 연결 (실제 도메인 ID는 조회 후 설정)
INSERT INTO domain_infrastructure_mapping (
    domain_id, 
    infrastructure_id, 
    deployment_priority, 
    environment_mapping,
    resource_limits,
    is_default,
    created_by
)
SELECT 
    d.id as domain_id,
    di.id as infrastructure_id,
    CASE 
        WHEN di.environment = 'production' THEN 1
        WHEN di.environment = 'staging' THEN 2
        WHEN di.environment = 'dev' THEN 3
        ELSE 4
    END as deployment_priority,
    jsonb_build_object(
        'dev', 'dev',
        'staging', 'staging', 
        'production', 'production'
    ) as environment_mapping,
    jsonb_build_object(
        'cpu', CASE di.service_type 
            WHEN 'jenkins' THEN '4'
            WHEN 'argocd' THEN '2' 
            WHEN 'nexus' THEN '2'
            ELSE '1'
        END,
        'memory', CASE di.service_type
            WHEN 'jenkins' THEN '8Gi'
            WHEN 'argocd' THEN '4Gi'
            WHEN 'nexus' THEN '4Gi' 
            ELSE '2Gi'
        END,
        'storage', CASE di.service_type
            WHEN 'nexus' THEN '100Gi'
            WHEN 'jenkins' THEN '50Gi'
            ELSE '10Gi'
        END
    ) as resource_limits,
    true as is_default,
    (SELECT id FROM timbel_users WHERE role_type = 'admin' LIMIT 1) as created_by
FROM domains d
CROSS JOIN deployment_infrastructure di
WHERE d.name IN ('ECP-AI', 'Timbel Platform', 'Default') -- 기본 도메인들
AND di.status = 'active'
ON CONFLICT (domain_id, infrastructure_id) DO NOTHING;

-- 8. 뷰 생성 - 도메인별 인프라 현황
CREATE OR REPLACE VIEW domain_infrastructure_overview AS
SELECT 
    d.id as domain_id,
    d.name as domain_name,
    d.description as domain_description,
    di.id as infrastructure_id,
    di.service_type,
    di.service_name,
    di.environment,
    di.service_url,
    di.health_status,
    di.status as infrastructure_status,
    dim.deployment_priority,
    dim.is_default,
    dim.resource_limits,
    dim.environment_mapping,
    dim.is_active as mapping_active,
    COUNT(cdh.id) as deployment_count,
    MAX(cdh.completed_at) as last_deployment_date
FROM domains d
LEFT JOIN domain_infrastructure_mapping dim ON d.id = dim.domain_id
LEFT JOIN deployment_infrastructure di ON dim.infrastructure_id = di.id
LEFT JOIN customer_deployment_history cdh ON d.id = cdh.domain_id AND di.id = cdh.infrastructure_id
WHERE dim.is_active = true OR dim.is_active IS NULL
GROUP BY 
    d.id, d.name, d.description,
    di.id, di.service_type, di.service_name, di.environment, di.service_url, di.health_status, di.status,
    dim.deployment_priority, dim.is_default, dim.resource_limits, dim.environment_mapping, dim.is_active
ORDER BY d.name, dim.deployment_priority, di.environment;

-- 9. 함수 생성 - 도메인별 추천 인프라 조회
CREATE OR REPLACE FUNCTION get_recommended_infrastructure_for_domain(
    p_domain_id UUID,
    p_environment VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    infrastructure_id UUID,
    service_type VARCHAR,
    service_name VARCHAR,
    environment VARCHAR,
    deployment_priority INTEGER,
    resource_limits JSONB,
    health_status VARCHAR,
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        di.id as infrastructure_id,
        di.service_type,
        di.service_name,
        di.environment,
        COALESCE(dim.deployment_priority, 999) as deployment_priority,
        COALESCE(dim.resource_limits, '{}'::jsonb) as resource_limits,
        di.health_status,
        CASE 
            WHEN dim.is_default = true THEN '기본 인프라'
            WHEN di.health_status = 'healthy' THEN '정상 상태'
            WHEN dim.deployment_priority <= 2 THEN '높은 우선순위'
            ELSE '사용 가능'
        END as recommendation_reason
    FROM deployment_infrastructure di
    LEFT JOIN domain_infrastructure_mapping dim ON di.id = dim.infrastructure_id AND dim.domain_id = p_domain_id
    WHERE di.status = 'active'
    AND (p_environment IS NULL OR di.environment = p_environment OR di.environment = 'global')
    AND (dim.is_active = true OR dim.is_active IS NULL)
    ORDER BY 
        CASE WHEN dim.is_default = true THEN 0 ELSE 1 END,
        COALESCE(dim.deployment_priority, 999),
        di.health_status = 'healthy' DESC,
        di.service_name;
END;
$$ LANGUAGE plpgsql;

-- 10. 권한 설정 함수
CREATE OR REPLACE FUNCTION check_domain_infrastructure_access(
    p_user_id UUID,
    p_domain_id UUID,
    p_infrastructure_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR;
    has_access BOOLEAN := false;
BEGIN
    -- 사용자 역할 조회
    SELECT role_type INTO user_role 
    FROM timbel_users 
    WHERE id = p_user_id;
    
    -- 관리자는 모든 접근 권한
    IF user_role IN ('admin', 'executive') THEN
        RETURN true;
    END IF;
    
    -- 도메인별 접근 권한 확인
    SELECT EXISTS(
        SELECT 1 
        FROM domain_infrastructure_mapping dim
        JOIN deployment_infrastructure di ON dim.infrastructure_id = di.id
        WHERE dim.domain_id = p_domain_id 
        AND dim.infrastructure_id = p_infrastructure_id
        AND dim.is_active = true
        AND (
            di.access_permissions IS NULL 
            OR di.access_permissions = '[]'::jsonb
            OR di.access_permissions ? user_role
            OR di.access_permissions ? p_user_id::text
        )
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE domain_infrastructure_mapping IS '도메인별 인프라 매핑 - 고객사별 배포 인프라 연결';
COMMENT ON TABLE customer_deployment_history IS '고객사별 배포 히스토리 - 도메인별 배포 이력 추적';
COMMENT ON VIEW domain_infrastructure_overview IS '도메인별 인프라 현황 - 통합 조회용 뷰';
COMMENT ON FUNCTION get_recommended_infrastructure_for_domain IS '도메인별 추천 인프라 조회 함수';
COMMENT ON FUNCTION check_domain_infrastructure_access IS '도메인-인프라 접근 권한 확인 함수';
