-- 모든 사용자 계정 비밀번호를 1q2w3e4r로 통일 설정
-- bcrypt 해시: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

UPDATE timbel_users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE id IS NOT NULL;

-- 업데이트된 계정 수 확인
SELECT COUNT(*) as updated_accounts FROM timbel_users;

-- 각 역할별 계정 수 확인
SELECT role_type, COUNT(*) as count 
FROM timbel_users 
GROUP BY role_type 
ORDER BY role_type;

-- 모든 계정 목록 확인 (비밀번호 제외)
SELECT id, email, full_name, role_type, status, created_at 
FROM timbel_users 
ORDER BY role_type, full_name;
