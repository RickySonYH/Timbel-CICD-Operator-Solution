-- [advice from AI] 디자인 자산 관리 테이블 생성

-- 디자인 자산 카테고리 테이블
CREATE TABLE IF NOT EXISTS design_asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 디자인 자산 테이블
CREATE TABLE IF NOT EXISTS design_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    tags TEXT[], -- 태그 배열
    version VARCHAR(20) DEFAULT '1.0.0',
    license VARCHAR(50) DEFAULT 'MIT',
    file_info JSONB NOT NULL, -- 파일 정보 (원본명, 경로, 크기, MIME 타입 등)
    thumbnail_path VARCHAR(500), -- 썸네일 이미지 경로
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deprecated')),
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 디자인 자산 버전 히스토리 테이블
CREATE TABLE IF NOT EXISTS design_asset_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES design_assets(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    file_info JSONB NOT NULL,
    change_log TEXT,
    creator_id UUID NOT NULL REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_id, version)
);

-- 디자인 자산 사용 통계 테이블
CREATE TABLE IF NOT EXISTS design_asset_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES design_assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES timbel_users(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'download', 'use')),
    project_name VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_design_assets_category ON design_assets(category);
CREATE INDEX IF NOT EXISTS idx_design_assets_creator ON design_assets(creator_id);
CREATE INDEX IF NOT EXISTS idx_design_assets_status ON design_assets(status);
CREATE INDEX IF NOT EXISTS idx_design_assets_tags ON design_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_design_assets_created_at ON design_assets(created_at);
CREATE INDEX IF NOT EXISTS idx_design_asset_versions_asset_id ON design_asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_design_asset_usage_asset_id ON design_asset_usage(asset_id);
CREATE INDEX IF NOT EXISTS idx_design_asset_usage_user_id ON design_asset_usage(user_id);

-- 권한 추가
INSERT INTO permissions (name, description, resource, action) VALUES
('design_assets.read', '디자인 자산 조회', 'design_assets', 'read'),
('design_assets.create', '디자인 자산 생성', 'design_assets', 'create'),
('design_assets.update', '디자인 자산 수정', 'design_assets', 'update'),
('design_assets.delete', '디자인 자산 삭제', 'design_assets', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 기본 카테고리 데이터 삽입
INSERT INTO design_asset_categories (name, description, icon) VALUES
('Icons', '아이콘 및 심볼', 'icon'),
('Illustrations', '일러스트레이션', 'palette'),
('UI Components', 'UI 컴포넌트', 'widgets'),
('Templates', '템플릿', 'description'),
('Brand Assets', '브랜드 자산', 'business'),
('Photography', '사진', 'photo_camera'),
('Vectors', '벡터 그래픽', 'gesture'),
('Mockups', '목업', 'view_in_ar')
ON CONFLICT (name) DO NOTHING;
