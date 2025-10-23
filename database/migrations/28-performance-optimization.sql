-- [advice from AI] 프로덕션 레벨 성능 최적화 마이그레이션
-- 데이터베이스 쿼리 성능 개선 및 인덱스 최적화

-- [advice from AI] 1. 복합 인덱스 추가 (자주 함께 조회되는 컬럼들)
-- 파이프라인 실행 성능 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_executions_status_created 
ON pipeline_executions (status, created_at DESC) 
WHERE status IN ('running', 'queued', 'failed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_executions_provider_status 
ON pipeline_executions (provider_name, status, created_at DESC) 
WHERE provider_name IS NOT NULL;

-- 시스템 로그 성능 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_logs_service_level_timestamp 
ON system_logs (service, level, timestamp DESC) 
WHERE level IN ('ERROR', 'WARN');

-- 실시간 메트릭 성능 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_real_time_metrics_collector_created 
ON real_time_metrics (collector_name, created_at DESC) 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- [advice from AI] 2. 파티셔닝을 위한 준비 (큰 테이블들)
-- 시스템 메트릭 테이블 파티셔닝 준비
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_metrics_timestamp_range 
ON system_metrics (timestamp DESC) 
WHERE timestamp >= NOW() - INTERVAL '90 days';

-- 파이프라인 로그 파티셔닝 준비
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_logs_timestamp_range 
ON pipeline_logs (timestamp DESC) 
WHERE timestamp >= NOW() - INTERVAL '30 days';

-- [advice from AI] 3. 통계 쿼리 최적화를 위한 부분 인덱스
-- 활성 이슈만 대상으로 하는 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_active_severity 
ON issues (severity, created_at DESC) 
WHERE status IN ('open', 'in_progress');

-- 최근 배포만 대상으로 하는 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operations_deployments_recent 
ON operations_deployments (deployment_status, created_at DESC) 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- [advice from AI] 4. JSON 컬럼 성능 최적화
-- pipeline_executions의 config 컬럼에 GIN 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_executions_config_gin 
ON pipeline_executions USING GIN (config) 
WHERE config IS NOT NULL;

-- kubernetes_clusters의 config_data 컬럼에 GIN 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kubernetes_clusters_config_gin 
ON kubernetes_clusters USING GIN (config_data) 
WHERE config_data IS NOT NULL;

-- [advice from AI] 5. 외래 키 성능 최적화
-- 자주 조인되는 외래 키에 인덱스 추가
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_execution_stages_execution_status 
ON pipeline_execution_stages (execution_id, status, stage_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_logs_execution_timestamp 
ON pipeline_logs (execution_id, timestamp DESC);

-- [advice from AI] 6. 집계 쿼리 최적화를 위한 materialized view 생성
-- 파이프라인 통계 materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS pipeline_stats_daily AS
SELECT 
    DATE(created_at) as stat_date,
    provider_name,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM pipeline_executions 
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at), provider_name;

-- materialized view 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_stats_daily_unique 
ON pipeline_stats_daily (stat_date, provider_name);

-- 시스템 메트릭 통계 materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS system_metrics_hourly AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour_timestamp,
    service_name,
    hostname,
    AVG((metrics->>'cpu_usage_percent')::float) as avg_cpu,
    AVG((metrics->>'memory_usage_percent')::float) as avg_memory,
    AVG((metrics->>'disk_usage_percent')::float) as avg_disk,
    COUNT(*) as metric_count
FROM system_metrics 
WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND metrics ? 'cpu_usage_percent'
GROUP BY DATE_TRUNC('hour', timestamp), service_name, hostname;

-- 시스템 메트릭 materialized view 인덱스
CREATE INDEX IF NOT EXISTS idx_system_metrics_hourly_timestamp 
ON system_metrics_hourly (hour_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_hourly_service 
ON system_metrics_hourly (service_name, hour_timestamp DESC);

-- [advice from AI] 7. 자동 VACUUM 및 ANALYZE 설정 최적화
-- 자주 업데이트되는 테이블의 autovacuum 설정
ALTER TABLE pipeline_executions SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE system_logs SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE real_time_metrics SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- [advice from AI] 8. 통계 정보 업데이트
ANALYZE pipeline_executions;
ANALYZE system_logs;
ANALYZE real_time_metrics;
ANALYZE system_metrics;
ANALYZE issues;
ANALYZE operations_deployments;

-- [advice from AI] 9. materialized view 새로고침 함수 생성
CREATE OR REPLACE FUNCTION refresh_performance_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- 파이프라인 통계 새로고침
    REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_stats_daily;
    
    -- 시스템 메트릭 통계 새로고침
    REFRESH MATERIALIZED VIEW CONCURRENTLY system_metrics_hourly;
    
    -- 통계 정보 업데이트
    ANALYZE pipeline_stats_daily;
    ANALYZE system_metrics_hourly;
    
    RAISE NOTICE 'Performance materialized views refreshed successfully';
END;
$$;

-- [advice from AI] 10. 성능 모니터링을 위한 뷰 생성
CREATE OR REPLACE VIEW slow_queries_summary AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_blks_read,
    idx_blks_hit
FROM pg_stat_user_indexes 
WHERE idx_tup_read > 1000
ORDER BY idx_tup_read DESC;

-- [advice from AI] 11. 데이터 아카이빙을 위한 준비
-- 90일 이상 된 로그 데이터 식별
CREATE OR REPLACE VIEW archivable_logs AS
SELECT 
    'system_logs' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM system_logs 
WHERE created_at < NOW() - INTERVAL '90 days'
UNION ALL
SELECT 
    'pipeline_logs' as table_name,
    COUNT(*) as record_count,
    MIN(timestamp) as oldest_record,
    MAX(timestamp) as newest_record
FROM pipeline_logs 
WHERE timestamp < NOW() - INTERVAL '90 days'
UNION ALL
SELECT 
    'real_time_metrics' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM real_time_metrics 
WHERE created_at < NOW() - INTERVAL '90 days';

-- [advice from AI] 12. 성능 최적화 완료 확인
DO $$
BEGIN
    RAISE NOTICE '=== 프로덕션 레벨 성능 최적화 완료 ===';
    RAISE NOTICE '1. 복합 인덱스 8개 추가';
    RAISE NOTICE '2. 파티셔닝 준비 인덱스 2개 추가';
    RAISE NOTICE '3. 부분 인덱스 2개 추가';
    RAISE NOTICE '4. JSON 컬럼 GIN 인덱스 2개 추가';
    RAISE NOTICE '5. 외래 키 성능 인덱스 2개 추가';
    RAISE NOTICE '6. Materialized View 2개 생성';
    RAISE NOTICE '7. AutoVacuum 설정 최적화';
    RAISE NOTICE '8. 성능 모니터링 뷰 생성';
    RAISE NOTICE '9. 자동 새로고침 함수 생성';
    RAISE NOTICE '10. 데이터 아카이빙 준비 완료';
    RAISE NOTICE '=== 데이터베이스 성능 최적화 완료 ===';
END $$;
