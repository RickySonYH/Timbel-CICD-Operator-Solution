-- [advice from AI] 고급 성능 최적화 마이그레이션
-- 로딩 속도 개선을 위한 추가 인덱스 및 최적화

-- 1. 자주 사용되는 쿼리를 위한 복합 인덱스 생성
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_created_at 
ON projects (project_status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_status_severity_created 
ON issues (status, severity, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timbel_users_active_lookup 
ON timbel_users (username, email, role) WHERE role IS NOT NULL;

-- 2. 외래키 관련 인덱스 (조인 성능 향상)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_assignments_project_user 
ON project_assignments (project_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_development_progress_instruction 
ON development_progress (instruction_id, progress_percentage);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qc_qa_requests_project_status 
ON qc_qa_requests (project_id, approval_status);

-- 3. 대시보드 쿼리 최적화를 위한 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_executions_status_created 
ON pipeline_executions (status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operations_deployments_status_date 
ON operations_deployments (deployment_status, created_at DESC);

-- 4. 통계 쿼리 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jenkins_jobs_status_updated 
ON jenkins_jobs (job_status, updated_at DESC);

-- 5. 자주 검색되는 필드에 대한 GIN 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_name_search 
ON projects USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- 6. 부분 인덱스 (조건부 인덱스로 크기 최적화)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_projects_only 
ON projects (created_at DESC) WHERE project_status IN ('in_progress', 'planning');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_open_issues_only 
ON issues (created_at DESC, severity) WHERE status IN ('open', 'in_progress');

-- 7. 구체화된 뷰 생성 (대시보드 성능 향상)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_cache AS
SELECT 
    'projects' as metric_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN project_status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN project_status = 'in_progress' THEN 1 END) as active_count,
    AVG(EXTRACT(DAY FROM (NOW() - created_at))) as avg_duration_days,
    NOW() as last_updated
FROM projects
UNION ALL
SELECT 
    'deployments' as metric_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN deployment_status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN deployment_status = 'running' THEN 1 END) as active_count,
    AVG(EXTRACT(MINUTE FROM (completed_at - started_at))) as avg_duration_days,
    NOW() as last_updated
FROM operations_deployments
WHERE created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'pipelines' as metric_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as active_count,
    AVG(EXTRACT(MINUTE FROM (completed_at - started_at))) as avg_duration_days,
    NOW() as last_updated
FROM pipeline_executions
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_cache_type 
ON dashboard_metrics_cache (metric_type);

-- 8. 구체화된 뷰 자동 새로고침 함수
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics() 
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW dashboard_metrics_cache;
    -- 로그 기록
    INSERT INTO system_logs (level, message, created_at) 
    VALUES ('INFO', 'Dashboard metrics cache refreshed', NOW());
END;
$$ LANGUAGE plpgsql;

-- 9. 테이블 통계 업데이트
ANALYZE projects;
ANALYZE issues;
ANALYZE timbel_users;
ANALYZE pipeline_executions;
ANALYZE operations_deployments;
ANALYZE jenkins_jobs;

-- 10. 자동 VACUUM 설정 최적화
ALTER TABLE projects SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE issues SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE pipeline_executions SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- 11. 연결 풀 최적화를 위한 설정 확인 뷰
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    datname,
    numbackends as active_connections,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit,
    ROUND((blks_hit::float / (blks_hit + blks_read) * 100), 2) as cache_hit_ratio
FROM pg_stat_database 
WHERE datname IN ('timbel_knowledge', 'timbel_cicd_operator');

-- 12. 느린 쿼리 모니터링 뷰
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    ROUND((total_exec_time/sum(total_exec_time) OVER())*100, 2) as percentage
FROM pg_stat_statements 
WHERE mean_exec_time > 100 -- 100ms 이상인 쿼리
ORDER BY mean_exec_time DESC;

-- 마이그레이션 완료 로그
INSERT INTO system_logs (level, message, created_at) 
VALUES ('INFO', 'Advanced performance optimization migration completed', NOW());

COMMIT;
