-- [advice from AI] 테스트용 사용자 계정 생성
-- 비밀번호: 1q2w3e4r (bcrypt 해시)

-- 비밀번호 해시 (1q2w3e4r)
-- $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- 최고관리자 그룹 (2명)
INSERT INTO timbel_users (
    id, username, email, password_hash, full_name, department, position, 
    permission_level, role_type, status, created_at
) VALUES 
(
    '10000000-0000-0000-0000-000000000001',
    'ceo_yoon',
    'ceo@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '윤종후',
    '경영진',
    'CEO',
    0,
    'executive',
    'active',
    NOW()
),
(
    '10000000-0000-0000-0000-000000000002',
    'cto_kim',
    'cto@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '김기술',
    '기술본부',
    'CTO',
    0,
    'executive',
    'active',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 어드민 계정 (2명)
INSERT INTO timbel_users (
    id, username, email, password_hash, full_name, department, position, 
    permission_level, role_type, status, created_at
) VALUES 
(
    '20000000-0000-0000-0000-000000000001',
    'admin_park',
    'admin.park@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '박관리',
    '시스템관리팀',
    '시스템 관리자',
    1,
    'admin',
    'active',
    NOW()
),
(
    '20000000-0000-0000-0000-000000000002',
    'admin_lee',
    'admin.lee@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '이시스템',
    '시스템관리팀',
    '시스템 관리자',
    1,
    'admin',
    'active',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- PO 그룹 계정 (2명)
INSERT INTO timbel_users (
    id, username, email, password_hash, full_name, department, position, 
    permission_level, role_type, status, created_at
) VALUES 
(
    '30000000-0000-0000-0000-000000000001',
    'po_choi',
    'po.choi@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '최프로젝트',
    '프로젝트관리팀',
    'Project Owner',
    2,
    'po',
    'active',
    NOW()
),
(
    '30000000-0000-0000-0000-000000000002',
    'po_jung',
    'po.jung@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '정기획',
    '프로젝트관리팀',
    'Project Owner',
    2,
    'po',
    'active',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- PE 계정 (4명)
INSERT INTO timbel_users (
    id, username, email, password_hash, full_name, department, position, 
    permission_level, role_type, status, created_at
) VALUES 
(
    '40000000-0000-0000-0000-000000000001',
    'pe_kang',
    'pe.kang@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '강개발',
    '개발팀',
    'Project Engineer',
    3,
    'pe',
    'active',
    NOW()
),
(
    '40000000-0000-0000-0000-000000000002',
    'pe_han',
    'pe.han@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '한코딩',
    '개발팀',
    'Project Engineer',
    3,
    'pe',
    'active',
    NOW()
),
(
    '40000000-0000-0000-0000-000000000003',
    'pe_yoo',
    'pe.yoo@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '유프론트',
    '개발팀',
    'Frontend Engineer',
    3,
    'pe',
    'active',
    NOW()
),
(
    '40000000-0000-0000-0000-000000000004',
    'pe_shin',
    'pe.shin@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '신백엔드',
    '개발팀',
    'Backend Engineer',
    3,
    'pe',
    'active',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- QA/QC 계정 (2명)
INSERT INTO timbel_users (
    id, username, email, password_hash, full_name, department, position, 
    permission_level, role_type, status, created_at
) VALUES 
(
    '50000000-0000-0000-0000-000000000001',
    'qa_lim',
    'qa.lim@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '임품질',
    'QA팀',
    'QA Manager',
    3,
    'qa',
    'active',
    NOW()
),
(
    '50000000-0000-0000-0000-000000000002',
    'qc_song',
    'qc.song@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '송검증',
    'QC팀',
    'QC Specialist',
    3,
    'qa',
    'active',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 운영팀 계정 (3명)
INSERT INTO timbel_users (
    id, username, email, password_hash, full_name, department, position, 
    permission_level, role_type, status, created_at
) VALUES 
(
    '60000000-0000-0000-0000-000000000001',
    'ops_nam',
    'ops.nam@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '남운영',
    '운영팀',
    'DevOps Engineer',
    4,
    'ops',
    'active',
    NOW()
),
(
    '60000000-0000-0000-0000-000000000002',
    'ops_oh',
    'ops.oh@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '오인프라',
    '운영팀',
    'Infrastructure Engineer',
    4,
    'ops',
    'active',
    NOW()
),
(
    '60000000-0000-0000-0000-000000000003',
    'ops_moon',
    'ops.moon@timbel.net',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '문모니터',
    '운영팀',
    'Monitoring Specialist',
    4,
    'ops',
    'active',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 권한 설정
GRANT SELECT, INSERT, UPDATE, DELETE ON timbel_users TO timbel_user;
