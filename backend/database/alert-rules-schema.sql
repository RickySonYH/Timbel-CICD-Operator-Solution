-- [advice from AI] 알림 규칙 엔진 데이터베이스 스키마
-- 임계값 기반 알림 규칙 관리

-- 알림 규칙 테이블
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_type VARCHAR(100) NOT NULL, -- cpu, memory, disk, pod_count, deployment_status, pipeline_status
    threshold_value DECIMAL(10, 2) NOT NULL,
    threshold_operator VARCHAR(20) NOT NULL, -- gt (>), lt (<), gte (>=), lte (<=), eq (=), neq (!=)
    comparison_unit VARCHAR(50), -- percent, count, milliseconds, etc.
    severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- info, warning, critical
    enabled BOOLEAN DEFAULT true,
    cluster_name VARCHAR(255), -- NULL = 모든 클러스터
    namespace VARCHAR(255), -- NULL = 모든 네임스페이스
    resource_name VARCHAR(255), -- 특정 리소스 (파이프라인, 배포 등)
    notification_channels JSONB DEFAULT '[]'::jsonb, -- ['slack', 'email', 'webhook']
    cooldown_minutes INTEGER DEFAULT 15, -- 동일 알림 재전송 대기 시간
    created_by UUID, -- User ID (no FK constraint due to cross-database reference)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0
);

-- 알림 발생 이력 테이블
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metric_value DECIMAL(10, 2),
    threshold_value DECIMAL(10, 2),
    severity VARCHAR(20),
    message TEXT,
    cluster_name VARCHAR(255),
    namespace VARCHAR(255),
    resource_name VARCHAR(255),
    notification_sent BOOLEAN DEFAULT false,
    notification_channels JSONB DEFAULT '[]'::jsonb,
    resolved_at TIMESTAMP,
    resolved_by UUID, -- User ID (no FK constraint due to cross-database reference)
    resolution_note TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 알림 규칙 템플릿 (사전 정의된 규칙)
CREATE TABLE IF NOT EXISTS alert_rule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_type VARCHAR(100) NOT NULL,
    recommended_threshold DECIMAL(10, 2),
    threshold_operator VARCHAR(20),
    severity VARCHAR(20),
    category VARCHAR(50), -- performance, security, availability, cost
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric_type ON alert_rules(metric_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id ON alert_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_resolved ON alert_history(resolved_at);

-- 업데이트 타임스탬프 트리거
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_rules_updated_at();

-- 사전 정의된 알림 규칙 템플릿 삽입
INSERT INTO alert_rule_templates (template_name, description, metric_type, recommended_threshold, threshold_operator, severity, category) VALUES
    ('높은 CPU 사용률', 'CPU 사용률이 80%를 초과하면 알림', 'cpu_usage', 80, 'gt', 'warning', 'performance'),
    ('치명적 CPU 사용률', 'CPU 사용률이 95%를 초과하면 긴급 알림', 'cpu_usage', 95, 'gt', 'critical', 'performance'),
    ('높은 메모리 사용률', '메모리 사용률이 85%를 초과하면 알림', 'memory_usage', 85, 'gt', 'warning', 'performance'),
    ('디스크 공간 부족', '디스크 사용률이 90%를 초과하면 알림', 'disk_usage', 90, 'gt', 'critical', 'availability'),
    ('파이프라인 실패', '파이프라인이 실패하면 즉시 알림', 'pipeline_status', 0, 'eq', 'warning', 'availability'),
    ('배포 실패', '배포가 실패하면 즉시 알림', 'deployment_status', 0, 'eq', 'critical', 'availability'),
    ('Pod 재시작 빈번', 'Pod 재시작이 5회를 초과하면 알림', 'pod_restart_count', 5, 'gt', 'warning', 'availability'),
    ('응답 시간 느림', 'API 응답 시간이 1000ms를 초과하면 알림', 'response_time', 1000, 'gt', 'warning', 'performance'),
    ('에러율 높음', '에러율이 5%를 초과하면 알림', 'error_rate', 5, 'gt', 'warning', 'availability'),
    ('노드 다운', '클러스터 노드가 다운되면 긴급 알림', 'node_status', 0, 'eq', 'critical', 'availability')
ON CONFLICT DO NOTHING;

-- 알림 통계 뷰
CREATE OR REPLACE VIEW alert_statistics AS
SELECT 
    ar.id as rule_id,
    ar.rule_name,
    ar.metric_type,
    ar.severity,
    ar.enabled,
    COUNT(ah.id) as total_triggers,
    COUNT(ah.id) FILTER (WHERE ah.resolved_at IS NOT NULL) as resolved_count,
    COUNT(ah.id) FILTER (WHERE ah.resolved_at IS NULL) as unresolved_count,
    MAX(ah.triggered_at) as last_triggered,
    AVG(EXTRACT(EPOCH FROM (ah.resolved_at - ah.triggered_at))/60) as avg_resolution_time_minutes
FROM alert_rules ar
LEFT JOIN alert_history ah ON ar.id = ah.rule_id
GROUP BY ar.id, ar.rule_name, ar.metric_type, ar.severity, ar.enabled;

COMMENT ON TABLE alert_rules IS '알림 규칙 정의 테이블 - 임계값 및 조건 관리';
COMMENT ON TABLE alert_history IS '알림 발생 이력 테이블 - 모든 알림 기록 추적';
COMMENT ON TABLE alert_rule_templates IS '사전 정의된 알림 규칙 템플릿';
COMMENT ON VIEW alert_statistics IS '알림 규칙별 통계 뷰';

