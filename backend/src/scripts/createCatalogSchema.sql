-- [advice from AI] 카탈로그 및 지식 관리 시스템 데이터베이스 스키마

-- 1. 도메인 테이블
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    owner_id UUID REFERENCES timbel_users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 시스템 테이블
CREATE TABLE IF NOT EXISTS systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES timbel_users(id),
    status VARCHAR(50) DEFAULT 'active',
    version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 컴포넌트 테이블
CREATE TABLE IF NOT EXISTS components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES timbel_users(id),
    type VARCHAR(100) NOT NULL, -- 'ui', 'service', 'library', 'tool'
    status VARCHAR(50) DEFAULT 'active',
    version VARCHAR(50) DEFAULT '1.0.0',
    repository_url TEXT,
    documentation_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. API 테이블
CREATE TABLE IF NOT EXISTS apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_id UUID REFERENCES systems(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES timbel_users(id),
    endpoint VARCHAR(500),
    method VARCHAR(10), -- GET, POST, PUT, DELETE
    status VARCHAR(50) DEFAULT 'active',
    version VARCHAR(50) DEFAULT '1.0.0',
    documentation_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. 리소스 테이블
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL, -- 'documentation', 'image', 'file', 'template'
    owner_id UUID REFERENCES timbel_users(id),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. 지식 자산 테이블 (디자인, 코드, 문서 등)
CREATE TABLE IF NOT EXISTS knowledge_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'design', 'code', 'document'
    subtype VARCHAR(100), -- 'component', 'icon', 'color', 'api', 'guide'
    owner_id UUID REFERENCES timbel_users(id),
    content JSONB, -- 실제 내용이나 메타데이터
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    tags TEXT[], -- 태그 배열
    version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(50) DEFAULT 'draft', -- draft, pe_review, qa_approval, approved, rejected
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. 승인 워크플로우 테이블
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES knowledge_assets(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, approved, rejected, needs_revision
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. 승인 단계 테이블
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    assigned_to UUID REFERENCES timbel_users(id),
    assigned_role VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped
    comment TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. 승인 댓글 테이블
CREATE TABLE IF NOT EXISTS approval_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE,
    author_id UUID REFERENCES timbel_users(id),
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'comment', -- comment, approval, rejection, revision_request
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. 다이어그램 테이블
CREATE TABLE IF NOT EXISTS diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    asset_id UUID REFERENCES knowledge_assets(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- 'architecture', 'component', 'flow', 'relationship'
    content JSONB, -- 다이어그램 데이터 (Mermaid, D3.js 등)
    is_auto_generated BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'draft', -- draft, reviewed, approved
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. 사용자 그룹 테이블
CREATE TABLE IF NOT EXISTS user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. 사용자-그룹 관계 테이블
CREATE TABLE IF NOT EXISTS user_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES timbel_users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- member, admin
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

-- 13. 권한 테이블
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(255) NOT NULL, -- 'domains', 'systems', 'components', etc.
    action VARCHAR(100) NOT NULL, -- 'read', 'write', 'delete', 'approve'
    created_at TIMESTAMP DEFAULT NOW()
);

-- 14. 그룹 권한 테이블
CREATE TABLE IF NOT EXISTS group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES timbel_users(id),
    UNIQUE(group_id, permission_id)
);

-- 15. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_domains_owner ON domains(owner_id);
CREATE INDEX IF NOT EXISTS idx_systems_domain ON systems(domain_id);
CREATE INDEX IF NOT EXISTS idx_systems_owner ON systems(owner_id);
CREATE INDEX IF NOT EXISTS idx_components_system ON components(system_id);
CREATE INDEX IF NOT EXISTS idx_components_owner ON components(owner_id);
CREATE INDEX IF NOT EXISTS idx_apis_system ON apis(system_id);
CREATE INDEX IF NOT EXISTS idx_apis_owner ON apis(owner_id);
CREATE INDEX IF NOT EXISTS idx_resources_owner ON resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_assets_owner ON knowledge_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_assets_type ON knowledge_assets(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_assets_status ON knowledge_assets(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_asset ON approval_workflows(asset_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow ON approval_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_assigned ON approval_steps(assigned_to);
CREATE INDEX IF NOT EXISTS idx_diagrams_asset ON diagrams(asset_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user ON user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_group ON user_group_memberships(group_id);
