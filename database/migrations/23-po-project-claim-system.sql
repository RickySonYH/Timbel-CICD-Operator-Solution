-- [advice from AI] PO 업무 선점 시스템
-- 여러 PO가 승인된 프로젝트를 선점하고 자기 소속 PE에게 할당하는 시스템

-- PO 프로젝트 선점 테이블
CREATE TABLE project_po_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 프로젝트 및 PO 정보
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    claimed_by_po UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    
    -- 선점 상태
    claim_status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'returned', 'transferred'
    claim_priority INTEGER DEFAULT 1, -- 동시 선점 시 우선순위
    
    -- 선점 정보
    claim_reason TEXT, -- 선점 사유
    estimated_completion_days INTEGER, -- 예상 완료 일수
    
    -- 타임스탬프
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    
    -- 선점 메타데이터
    claim_metadata JSONB DEFAULT '{}',
    
    -- 유니크 제약: 하나의 프로젝트는 하나의 활성 선점만 가능
    CONSTRAINT unique_active_claim UNIQUE(project_id)
);

-- PO 성과 추적 테이블
CREATE TABLE po_performance_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- PO 정보
    po_user_id UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    
    -- 성과 지표 (월별 집계)
    performance_month DATE NOT NULL, -- 해당 월 (YYYY-MM-01 형식)
    
    -- 업무 선점 관련 지표
    projects_claimed INTEGER DEFAULT 0, -- 선점한 프로젝트 수
    projects_completed INTEGER DEFAULT 0, -- 완료한 프로젝트 수
    projects_returned INTEGER DEFAULT 0, -- 반납한 프로젝트 수
    
    -- 처리 속도 지표
    avg_claim_to_pe_assignment_hours DECIMAL(10,2), -- 선점 후 PE 할당까지 평균 시간
    avg_project_completion_days DECIMAL(10,2), -- 프로젝트 완료까지 평균 일수
    
    -- 품질 지표
    pe_satisfaction_score DECIMAL(3,2), -- PE 만족도 (1.0-5.0)
    project_success_rate DECIMAL(5,2), -- 프로젝트 성공률 (%)
    
    -- 협업 지표
    cross_team_collaborations INTEGER DEFAULT 0, -- 타팀 협업 횟수
    knowledge_sharing_contributions INTEGER DEFAULT 0, -- 지식 공유 기여도
    
    -- 메타데이터
    performance_notes TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(po_user_id, performance_month)
);

-- PO 선점 히스토리 테이블
CREATE TABLE po_claim_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 관련 정보
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    po_user_id UUID NOT NULL REFERENCES timbel_users(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES project_po_claims(id) ON DELETE SET NULL,
    
    -- 액션 정보
    action_type VARCHAR(50) NOT NULL, -- 'claimed', 'completed', 'returned', 'transferred', 'pe_assigned'
    action_details TEXT,
    
    -- 관련 데이터
    related_pe_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL, -- PE 할당 시
    transfer_to_po_id UUID REFERENCES timbel_users(id) ON DELETE SET NULL, -- 이관 시
    
    -- 성과 데이터
    processing_time_hours INTEGER, -- 처리 소요 시간
    
    -- 타임스탬프
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 메타데이터
    action_metadata JSONB DEFAULT '{}'
);

-- 프로젝트 테이블에 PO 선점 관련 필드 추가
ALTER TABLE projects 
ADD COLUMN claimed_by_po UUID REFERENCES timbel_users(id) ON DELETE SET NULL,
ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN po_claim_notes TEXT;

-- 인덱스 생성
CREATE INDEX idx_project_po_claims_project_id ON project_po_claims(project_id);
CREATE INDEX idx_project_po_claims_po_id ON project_po_claims(claimed_by_po);
CREATE INDEX idx_project_po_claims_status ON project_po_claims(claim_status);
CREATE INDEX idx_project_po_claims_claimed_at ON project_po_claims(claimed_at DESC);

CREATE INDEX idx_po_performance_tracking_po_id ON po_performance_tracking(po_user_id);
CREATE INDEX idx_po_performance_tracking_month ON po_performance_tracking(performance_month DESC);

CREATE INDEX idx_po_claim_history_project_id ON po_claim_history(project_id);
CREATE INDEX idx_po_claim_history_po_id ON po_claim_history(po_user_id);
CREATE INDEX idx_po_claim_history_action_type ON po_claim_history(action_type);
CREATE INDEX idx_po_claim_history_timestamp ON po_claim_history(action_timestamp DESC);

CREATE INDEX idx_projects_claimed_by_po ON projects(claimed_by_po);
CREATE INDEX idx_projects_claimed_at ON projects(claimed_at DESC);

-- 승인된 프로젝트 공용 풀 뷰 (모든 PO가 볼 수 있는 선점 가능한 프로젝트)
CREATE OR REPLACE VIEW po_available_projects AS
SELECT 
    p.id,
    p.name as project_name,
    p.project_overview,
    p.urgency_level,
    p.deadline,
    p.approved_at,
    p.is_urgent_development,
    p.urgent_reason,
    p.expected_completion_hours,
    
    -- 생성자 정보
    creator.full_name as created_by_name,
    creator.department_id as creator_department_id,
    
    -- 선점 정보
    p.claimed_by_po,
    p.claimed_at,
    p.po_claim_notes,
    claiming_po.full_name as claiming_po_name,
    
    -- 프로젝트 복잡도 지표
    (SELECT COUNT(*) FROM project_documents WHERE project_id = p.id) as document_count,
    (SELECT COUNT(*) FROM work_groups WHERE project_id = p.id) as work_group_count,
    
    -- 선점 가능 여부
    CASE 
        WHEN p.claimed_by_po IS NULL THEN TRUE
        ELSE FALSE
    END as is_claimable,
    
    -- 긴급도 점수 (선점 우선순위 계산용)
    CASE 
        WHEN p.is_urgent_development = TRUE THEN 100
        WHEN p.urgency_level = 'critical' THEN 80
        WHEN p.urgency_level = 'high' THEN 60
        WHEN p.urgency_level = 'medium' THEN 40
        WHEN p.urgency_level = 'low' THEN 20
        ELSE 30
    END + 
    CASE 
        WHEN p.deadline < CURRENT_DATE + INTERVAL '7 days' THEN 20
        WHEN p.deadline < CURRENT_DATE + INTERVAL '14 days' THEN 10
        ELSE 0
    END as urgency_score

FROM projects p
LEFT JOIN timbel_users creator ON p.created_by = creator.id
LEFT JOIN timbel_users claiming_po ON p.claimed_by_po = claiming_po.id
WHERE p.approval_status = 'approved' 
  AND p.project_status = 'planning';

-- PO 성과 요약 뷰
CREATE OR REPLACE VIEW po_performance_summary AS
SELECT 
    u.id as po_user_id,
    u.full_name as po_name,
    u.department_id,
    
    -- 현재 활성 선점
    COUNT(CASE WHEN ppc.claim_status = 'active' THEN 1 END) as active_claims,
    
    -- 월별 성과 (최근 3개월)
    COALESCE(recent_performance.projects_claimed, 0) as recent_projects_claimed,
    COALESCE(recent_performance.projects_completed, 0) as recent_projects_completed,
    COALESCE(recent_performance.avg_completion_days, 0) as avg_completion_days,
    COALESCE(recent_performance.success_rate, 0) as success_rate,
    
    -- 전체 누적 성과
    COUNT(pch.id) as total_actions,
    COUNT(CASE WHEN pch.action_type = 'completed' THEN 1 END) as total_completed,
    
    -- 평균 처리 시간
    AVG(CASE WHEN pch.action_type = 'completed' THEN pch.processing_time_hours END) as avg_processing_hours

FROM timbel_users u
LEFT JOIN project_po_claims ppc ON u.id = ppc.claimed_by_po
LEFT JOIN po_claim_history pch ON u.id = pch.po_user_id
LEFT JOIN (
    SELECT 
        po_user_id,
        SUM(projects_claimed) as projects_claimed,
        SUM(projects_completed) as projects_completed,
        AVG(avg_project_completion_days) as avg_completion_days,
        AVG(project_success_rate) as success_rate
    FROM po_performance_tracking 
    WHERE performance_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
    GROUP BY po_user_id
) recent_performance ON u.id = recent_performance.po_user_id
WHERE u.role_type = 'po'
GROUP BY u.id, u.full_name, u.department_id, recent_performance.projects_claimed, 
         recent_performance.projects_completed, recent_performance.avg_completion_days, 
         recent_performance.success_rate;

COMMENT ON TABLE project_po_claims IS 'PO 프로젝트 선점 관리 - 승인된 프로젝트를 PO가 선점하여 담당';
COMMENT ON TABLE po_performance_tracking IS 'PO 성과 추적 - 월별 업무 선점 및 처리 성과 지표';
COMMENT ON TABLE po_claim_history IS 'PO 선점 히스토리 - 모든 선점 관련 액션 기록';
COMMENT ON VIEW po_available_projects IS '선점 가능한 프로젝트 목록 - 모든 PO가 볼 수 있는 승인된 프로젝트';
COMMENT ON VIEW po_performance_summary IS 'PO 성과 요약 - 선점 및 처리 성과 종합 지표';
