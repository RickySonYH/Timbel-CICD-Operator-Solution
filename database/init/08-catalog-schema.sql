-- [advice from AI] Phase 8: 지식 자산 관리 (Backstage.io 기반) 카탈로그 스키마
-- Backstage.io 스타일의 카탈로그 시스템을 위한 데이터베이스 구조

-- 1. 카탈로그 엔티티 기본 정보 테이블
CREATE TABLE IF NOT EXISTS catalog_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind VARCHAR(50) NOT NULL, -- domain, system, component, api, resource, group, user
    name VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL DEFAULT 'default',
    title VARCHAR(255),
    description TEXT,
    owner VARCHAR(100) NOT NULL,
    lifecycle VARCHAR(50) DEFAULT 'production', -- production, experimental, deprecated
    tags JSONB DEFAULT '[]'::jsonb,
    annotations JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    spec JSONB DEFAULT '{}'::jsonb,
    status JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id),
    updated_by UUID REFERENCES timbel_users(id),
    UNIQUE(kind, namespace, name)
);

-- 2. 카탈로그 관계 테이블 (Relations)
CREATE TABLE IF NOT EXISTS catalog_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL, -- ownerOf, hasPart, dependsOn, consumesApi, providesApi, etc.
    reverse_relation_type VARCHAR(100), -- ownedBy, partOf, dependencyOf, apiConsumedBy, apiProvidedBy, etc.
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id),
    UNIQUE(source_entity_id, target_entity_id, relation_type)
);

-- 3. API 정의 테이블
CREATE TABLE IF NOT EXISTS catalog_apis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
    api_type VARCHAR(50) NOT NULL, -- openapi, graphql, grpc, asyncapi, trpc
    definition JSONB NOT NULL, -- OpenAPI spec, GraphQL schema, etc.
    version VARCHAR(50) DEFAULT '1.0.0',
    base_url VARCHAR(500),
    authentication JSONB DEFAULT '{}'::jsonb,
    rate_limits JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id),
    updated_by UUID REFERENCES timbel_users(id)
);

-- 4. CI/CD 파이프라인 테이블
CREATE TABLE IF NOT EXISTS catalog_cicd_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
    pipeline_name VARCHAR(255) NOT NULL,
    pipeline_type VARCHAR(50) NOT NULL, -- build, test, deploy, release
    status VARCHAR(50) DEFAULT 'idle', -- idle, running, success, failed, cancelled
    configuration JSONB NOT NULL, -- Pipeline configuration
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(50),
    last_run_duration INTEGER, -- seconds
    webhook_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id),
    updated_by UUID REFERENCES timbel_users(id)
);

-- 5. CI/CD 실행 로그 테이블
CREATE TABLE IF NOT EXISTS catalog_cicd_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES catalog_cicd_pipelines(id) ON DELETE CASCADE,
    run_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL, -- running, success, failed, cancelled
    trigger_type VARCHAR(50) NOT NULL, -- manual, webhook, schedule, api
    trigger_by UUID REFERENCES timbel_users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- seconds
    logs TEXT,
    artifacts JSONB DEFAULT '[]'::jsonb,
    environment VARCHAR(100),
    version VARCHAR(100),
    commit_hash VARCHAR(100),
    branch VARCHAR(100),
    pull_request_number INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. 문서 테이블
CREATE TABLE IF NOT EXISTS catalog_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL, -- techdocs, api-docs, user-guide, architecture
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(50) DEFAULT 'markdown', -- markdown, html, asciidoc
    version VARCHAR(50) DEFAULT '1.0.0',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id),
    updated_by UUID REFERENCES timbel_users(id)
);

-- 7. Kubernetes 리소스 테이블
CREATE TABLE IF NOT EXISTS catalog_kubernetes_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
    cluster_name VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- deployment, service, configmap, secret, etc.
    resource_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'unknown', -- running, stopped, error, unknown
    configuration JSONB NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES timbel_users(id),
    updated_by UUID REFERENCES timbel_users(id)
);

-- 8. 카탈로그 검색 인덱스 테이블
CREATE TABLE IF NOT EXISTS catalog_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
    search_text TEXT NOT NULL, -- Full text search content
    tags TEXT[], -- Array of tags for filtering
    kind VARCHAR(50) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    owner VARCHAR(100) NOT NULL,
    lifecycle VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_catalog_entities_kind ON catalog_entities(kind);
CREATE INDEX IF NOT EXISTS idx_catalog_entities_namespace ON catalog_entities(namespace);
CREATE INDEX IF NOT EXISTS idx_catalog_entities_owner ON catalog_entities(owner);
CREATE INDEX IF NOT EXISTS idx_catalog_entities_lifecycle ON catalog_entities(lifecycle);
CREATE INDEX IF NOT EXISTS idx_catalog_entities_tags ON catalog_entities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_catalog_entities_annotations ON catalog_entities USING GIN(annotations);

CREATE INDEX IF NOT EXISTS idx_catalog_relations_source ON catalog_relations(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_relations_target ON catalog_relations(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_relations_type ON catalog_relations(relation_type);

CREATE INDEX IF NOT EXISTS idx_catalog_apis_entity ON catalog_apis(entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_apis_type ON catalog_apis(api_type);

CREATE INDEX IF NOT EXISTS idx_catalog_cicd_pipelines_entity ON catalog_cicd_pipelines(entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_cicd_pipelines_status ON catalog_cicd_pipelines(status);

CREATE INDEX IF NOT EXISTS idx_catalog_cicd_runs_pipeline ON catalog_cicd_runs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_catalog_cicd_runs_status ON catalog_cicd_runs(status);
CREATE INDEX IF NOT EXISTS idx_catalog_cicd_runs_started_at ON catalog_cicd_runs(started_at);

CREATE INDEX IF NOT EXISTS idx_catalog_docs_entity ON catalog_docs(entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_docs_type ON catalog_docs(doc_type);
CREATE INDEX IF NOT EXISTS idx_catalog_docs_published ON catalog_docs(is_published);

CREATE INDEX IF NOT EXISTS idx_catalog_k8s_entity ON catalog_kubernetes_resources(entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_k8s_cluster ON catalog_kubernetes_resources(cluster_name);
CREATE INDEX IF NOT EXISTS idx_catalog_k8s_status ON catalog_kubernetes_resources(status);

CREATE INDEX IF NOT EXISTS idx_catalog_search_entity ON catalog_search_index(entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_search_text ON catalog_search_index USING GIN(to_tsvector('english', search_text));
CREATE INDEX IF NOT EXISTS idx_catalog_search_tags ON catalog_search_index USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_catalog_search_kind ON catalog_search_index(kind);
CREATE INDEX IF NOT EXISTS idx_catalog_search_owner ON catalog_search_index(owner);
CREATE INDEX IF NOT EXISTS idx_catalog_search_lifecycle ON catalog_search_index(lifecycle);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_catalog_entities_updated_at
    BEFORE UPDATE ON catalog_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

CREATE TRIGGER trigger_catalog_apis_updated_at
    BEFORE UPDATE ON catalog_apis
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

CREATE TRIGGER trigger_catalog_cicd_pipelines_updated_at
    BEFORE UPDATE ON catalog_cicd_pipelines
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

CREATE TRIGGER trigger_catalog_docs_updated_at
    BEFORE UPDATE ON catalog_docs
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

CREATE TRIGGER trigger_catalog_kubernetes_resources_updated_at
    BEFORE UPDATE ON catalog_kubernetes_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

CREATE TRIGGER trigger_catalog_search_index_updated_at
    BEFORE UPDATE ON catalog_search_index
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_updated_at();

-- 검색 인덱스 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_catalog_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- 기존 인덱스 삭제
    DELETE FROM catalog_search_index WHERE entity_id = NEW.id;
    
    -- 새 인덱스 생성
    INSERT INTO catalog_search_index (
        entity_id, search_text, tags, kind, namespace, owner, lifecycle
    ) VALUES (
        NEW.id,
        COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.name, ''),
        ARRAY(SELECT jsonb_array_elements_text(NEW.tags)),
        NEW.kind,
        NEW.namespace,
        NEW.owner,
        NEW.lifecycle
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 검색 인덱스 트리거
CREATE TRIGGER trigger_catalog_entities_search_index
    AFTER INSERT OR UPDATE ON catalog_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_search_index();

-- 초기 데이터 삽입 (예시)
INSERT INTO catalog_entities (kind, name, namespace, title, description, owner, lifecycle, tags, spec) VALUES
('domain', 'audio', 'default', 'Audio Domain', 'Everything related to audio', 'ACME Corp', 'production', '["audio", "media"]', '{"type": "domain"}'),
('domain', 'artists', 'default', 'Artists Domain', 'Everything related to artists', 'team-a', 'production', '["artists", "music"]', '{"type": "domain"}'),
('system', 'artist-engagement-portal', 'default', 'Artist Engagement Portal', 'Everything related to artists', 'team-a', 'production', '["portal", "artists"]', '{"type": "service", "domain": "artists"}'),
('system', 'audio-playback', 'default', 'Audio Playback System', 'Audio playback system', 'Team C', 'production', '["audio", "playback"]', '{"type": "feature-set", "domain": "audio"}'),
('component', 'artist-lookup', 'default', 'Artist Lookup Service', 'Artist Lookup', 'team-a', 'experimental', '["java", "data"]', '{"type": "service", "system": "artist-engagement-portal"}'),
('component', 'www-artist', 'default', 'Artist Website', 'Artist main website', 'team-a', 'production', '["website"]', '{"type": "website", "system": "artist-engagement-portal"}'),
('api', 'spotify', 'default', 'Spotify API', 'The Spotify web API', 'team-a', 'production', '["spotify", "rest"]', '{"type": "openapi"}'),
('resource', 'artists-db', 'default', 'Artists Database', 'Stores artist details', 'team-a', 'production', '[]', '{"type": "database", "system": "artist-engagement-portal"}');

-- 관계 데이터 삽입 (그룹과 사용자 엔티티 추가 후)
INSERT INTO catalog_relations (source_entity_id, target_entity_id, relation_type, reverse_relation_type) 
SELECT 
    (SELECT id FROM catalog_entities WHERE name = 'ACME Corp' AND kind = 'group'),
    (SELECT id FROM catalog_entities WHERE name = 'audio' AND kind = 'domain'),
    'ownerOf', 'ownedBy'
UNION ALL
SELECT 
    (SELECT id FROM catalog_entities WHERE name = 'team-a' AND kind = 'group'),
    (SELECT id FROM catalog_entities WHERE name = 'artists' AND kind = 'domain'),
    'ownerOf', 'ownedBy'
UNION ALL
SELECT 
    (SELECT id FROM catalog_entities WHERE name = 'artists' AND kind = 'domain'),
    (SELECT id FROM catalog_entities WHERE name = 'artist-engagement-portal' AND kind = 'system'),
    'hasPart', 'partOf'
UNION ALL
SELECT 
    (SELECT id FROM catalog_entities WHERE name = 'artist-engagement-portal' AND kind = 'system'),
    (SELECT id FROM catalog_entities WHERE name = 'artist-lookup' AND kind = 'component'),
    'hasPart', 'partOf'
UNION ALL
SELECT 
    (SELECT id FROM catalog_entities WHERE name = 'artist-lookup' AND kind = 'component'),
    (SELECT id FROM catalog_entities WHERE name = 'artists-db' AND kind = 'resource'),
    'dependsOn', 'dependencyOf';

-- 그룹과 사용자 엔티티 추가
INSERT INTO catalog_entities (kind, name, namespace, title, description, owner, lifecycle, tags, spec) VALUES
('group', 'ACME Corp', 'default', 'ACME Corporation', 'Main organization', 'admin', 'production', '["organization"]', '{"type": "organization"}'),
('group', 'team-a', 'default', 'Team A', 'Development team A', 'admin', 'production', '["team", "development"]', '{"type": "team"}'),
('group', 'Team B', 'default', 'Team B', 'Development team B', 'admin', 'production', '["team", "development"]', '{"type": "team"}'),
('group', 'Team C', 'default', 'Team C', 'Development team C', 'admin', 'production', '["team", "development"]', '{"type": "team"}'),
('user', 'admin', 'default', 'Administrator', 'System administrator', 'admin', 'production', '["admin"]', '{"type": "user", "email": "admin@company.com"}'),
('user', 'team-a', 'default', 'Team A User', 'Team A member', 'admin', 'production', '["team-a"]', '{"type": "user", "email": "team-a@company.com"}');
