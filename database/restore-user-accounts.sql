-- [advice from AI] 역할별 사용자 계정 복구 스크립트

-- 기존 계정들 확인 후 누락된 계정들 추가
INSERT INTO timbel_users (
    id, username, full_name, email, password_hash, role_type, status, 
    created_at, updated_at
) VALUES 
-- PE 계정들
(
    gen_random_uuid(), '김신백', 'kim.shinbaek@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'pe', 'active', '개발팀', 'Senior PE', '010-1234-5678', 
    '2023-01-15', NOW(), NOW()
),
(
    gen_random_uuid(), '이개발', 'lee.gaebal@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'pe', 'active', '개발팀', 'PE', '010-2345-6789', 
    '2023-02-01', NOW(), NOW()
),
(
    gen_random_uuid(), '박코딩', 'park.coding@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'pe', 'active', '개발팀', 'Junior PE', '010-3456-7890', 
    '2023-03-01', NOW(), NOW()
),
(
    gen_random_uuid(), '최프론트', 'choi.frontend@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'pe', 'active', '개발팀', 'Frontend PE', '010-4567-8901', 
    '2023-03-15', NOW(), NOW()
),
(
    gen_random_uuid(), '정백엔드', 'jung.backend@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'pe', 'active', '개발팀', 'Backend PE', '010-5678-9012', 
    '2023-04-01', NOW(), NOW()
),

-- PO 계정들
(
    gen_random_uuid(), '김프로젝트', 'kim.project@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'po', 'active', '기획팀', 'Senior PO', '010-6789-0123', 
    '2022-11-01', NOW(), NOW()
),
(
    gen_random_uuid(), '이기획', 'lee.planning@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'po', 'active', '기획팀', 'PO', '010-7890-1234', 
    '2023-01-01', NOW(), NOW()
),

-- QA 계정들
(
    gen_random_uuid(), '박품질', 'park.quality@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'qa', 'active', '품질관리팀', 'Senior QA', '010-8901-2345', 
    '2022-12-01', NOW(), NOW()
),
(
    gen_random_uuid(), '최테스트', 'choi.test@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'qa', 'active', '품질관리팀', 'QA', '010-9012-3456', 
    '2023-02-15', NOW(), NOW()
),

-- 운영팀 계정들
(
    gen_random_uuid(), '김운영', 'kim.operations@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'operations', 'active', '운영팀', 'Senior Operations', '010-0123-4567', 
    '2022-10-01', NOW(), NOW()
),
(
    gen_random_uuid(), '이인프라', 'lee.infra@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'operations', 'active', '운영팀', 'Infrastructure', '010-1234-5670', 
    '2023-01-10', NOW(), NOW()
),

-- 추가 관리자 계정들
(
    gen_random_uuid(), '박시스템', 'park.system@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'admin', 'active', '시스템관리팀', 'System Admin', '010-2345-6701', 
    '2022-09-01', NOW(), NOW()
),

-- 비즈니스 분석가
(
    gen_random_uuid(), '최분석', 'choi.analyst@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'analyst', 'active', '전략기획팀', 'Business Analyst', '010-3456-7012', 
    '2023-01-20', NOW(), NOW()
),

-- 보안 담당자
(
    gen_random_uuid(), '정보안', 'jung.security@timbel.com', 
    '$2b$10$rZ8qNxQxQxQxQxQxQxQxQeJ8qNxQxQxQxQxQxQxQxQxQxQxQxQxQx', 
    'security', 'active', '보안팀', 'Security Officer', '010-4567-8023', 
    '2022-11-15', NOW(), NOW()
)

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
