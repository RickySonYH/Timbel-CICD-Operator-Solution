-- [advice from AI] 역할별 사용자 계정 복구 스크립트 (수정됨)

-- 기존 계정들 확인 후 누락된 계정들 추가
INSERT INTO timbel_users (
    username, full_name, email, password_hash, role_type, status
) VALUES 
-- PE 계정들
('kim.shinbaek', '김신백', 'kim.shinbaek@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'pe', 'active'),
('lee.gaebal', '이개발', 'lee.gaebal@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'pe', 'active'),
('park.coding', '박코딩', 'park.coding@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'pe', 'active'),
('choi.frontend', '최프론트', 'choi.frontend@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'pe', 'active'),
('jung.backend', '정백엔드', 'jung.backend@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'pe', 'active'),

-- PO 계정들
('kim.project', '김프로젝트', 'kim.project@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'po', 'active'),
('lee.planning', '이기획', 'lee.planning@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'po', 'active'),

-- QA 계정들
('park.quality', '박품질', 'park.quality@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'qa', 'active'),
('choi.test', '최테스트', 'choi.test@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'qa', 'active'),

-- 운영팀 계정들
('kim.operations', '김운영', 'kim.operations@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'operations', 'active'),
('lee.infra', '이인프라', 'lee.infra@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'operations', 'active'),

-- 추가 관리자 계정들
('park.system', '박시스템', 'park.system@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'admin', 'active'),

-- 비즈니스 분석가
('choi.analyst', '최분석', 'choi.analyst@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'analyst', 'active'),

-- 보안 담당자
('jung.security', '정보안', 'jung.security@timbel.com', '$2b$10$rZ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx', 'security', 'active')

ON CONFLICT (email) DO NOTHING;

-- 사용자 통계 확인
SELECT 
    role_type,
    COUNT(*) as count,
    STRING_AGG(full_name, ', ') as members
FROM timbel_users 
WHERE status = 'active'
GROUP BY role_type
ORDER BY role_type;
