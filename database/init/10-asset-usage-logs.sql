-- [advice from AI] 자산 사용 기록 테이블 생성
-- 카탈로그에서 자산 사용 통계 추적용

CREATE TABLE IF NOT EXISTS asset_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'code', 'design', 'document', 'catalog'
    user_id UUID REFERENCES timbel_users(id),
    action VARCHAR(50) NOT NULL, -- 'view', 'download', 'copy', 'clone', 'use'
    metadata JSONB DEFAULT '{}', -- 추가 정보 (IP, User-Agent 등)
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_asset_usage_logs_asset_id ON asset_usage_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_logs_user_id ON asset_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_usage_logs_action ON asset_usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_asset_usage_logs_created_at ON asset_usage_logs(created_at);

-- 권한 설정
GRANT SELECT, INSERT, UPDATE, DELETE ON asset_usage_logs TO timbel_user;
