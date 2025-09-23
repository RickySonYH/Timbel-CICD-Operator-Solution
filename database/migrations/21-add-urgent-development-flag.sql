-- [advice from AI] 긴급 개발 프로젝트 플래그 추가
-- 프로젝트 테이블에 긴급 개발 여부 컬럼 추가

ALTER TABLE projects 
ADD COLUMN is_urgent_development BOOLEAN DEFAULT FALSE;

-- 긴급 개발 프로젝트 인덱스 추가 (빠른 조회를 위해)
CREATE INDEX idx_projects_urgent_development ON projects(is_urgent_development);

-- 긴급 개발 프로젝트 처리 이력을 위한 테이블 생성
CREATE TABLE urgent_development_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES timbel_users(id),
    urgent_reason TEXT NOT NULL,
    expected_completion_hours INTEGER,
    actual_completion_hours INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 긴급 개발 관련 메타데이터
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT check_completion_hours CHECK (
        actual_completion_hours IS NULL OR actual_completion_hours >= 0
    ),
    CONSTRAINT check_expected_hours CHECK (
        expected_completion_hours > 0
    )
);

-- 인덱스 추가
CREATE INDEX idx_urgent_logs_project_id ON urgent_development_logs(project_id);
CREATE INDEX idx_urgent_logs_status ON urgent_development_logs(status);
CREATE INDEX idx_urgent_logs_created_at ON urgent_development_logs(created_at);

-- 댓글
COMMENT ON TABLE urgent_development_logs IS '긴급 개발 프로젝트 처리 이력';
COMMENT ON COLUMN projects.is_urgent_development IS '긴급 개발 프로젝트 여부';
COMMENT ON COLUMN urgent_development_logs.urgent_reason IS '긴급 개발 사유';
COMMENT ON COLUMN urgent_development_logs.expected_completion_hours IS '예상 완료 시간 (시간)';
COMMENT ON COLUMN urgent_development_logs.actual_completion_hours IS '실제 완료 시간 (시간)';
