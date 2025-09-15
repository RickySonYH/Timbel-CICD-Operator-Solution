-- [advice from AI] 카탈로그 시스템 기본 데이터 및 권한 시드

-- 1. 기본 권한 생성
INSERT INTO permissions (name, description, resource, action) VALUES
('domains.read', '도메인 조회 권한', 'domains', 'read'),
('domains.write', '도메인 작성 권한', 'domains', 'write'),
('domains.delete', '도메인 삭제 권한', 'domains', 'delete'),
('systems.read', '시스템 조회 권한', 'systems', 'read'),
('systems.write', '시스템 작성 권한', 'systems', 'write'),
('systems.delete', '시스템 삭제 권한', 'systems', 'delete'),
('components.read', '컴포넌트 조회 권한', 'components', 'read'),
('components.write', '컴포넌트 작성 권한', 'components', 'write'),
('components.delete', '컴포넌트 삭제 권한', 'components', 'delete'),
('apis.read', 'API 조회 권한', 'apis', 'read'),
('apis.write', 'API 작성 권한', 'apis', 'write'),
('apis.delete', 'API 삭제 권한', 'apis', 'delete'),
('resources.read', '리소스 조회 권한', 'resources', 'read'),
('resources.write', '리소스 작성 권한', 'resources', 'write'),
('resources.delete', '리소스 삭제 권한', 'resources', 'delete'),
('knowledge.read', '지식 자산 조회 권한', 'knowledge', 'read'),
('knowledge.write', '지식 자산 작성 권한', 'knowledge', 'write'),
('knowledge.delete', '지식 자산 삭제 권한', 'knowledge', 'delete'),
('approval.read', '승인 워크플로우 조회 권한', 'approval', 'read'),
('approval.approve', '승인 권한', 'approval', 'approve'),
('approval.reject', '거부 권한', 'approval', 'reject'),
('diagrams.read', '다이어그램 조회 권한', 'diagrams', 'read'),
('diagrams.write', '다이어그램 작성 권한', 'diagrams', 'write'),
('users.read', '사용자 조회 권한', 'users', 'read'),
('users.write', '사용자 작성 권한', 'users', 'write'),
('users.delete', '사용자 삭제 권한', 'users', 'delete'),
('groups.read', '그룹 조회 권한', 'groups', 'read'),
('groups.write', '그룹 작성 권한', 'groups', 'write'),
('groups.delete', '그룹 삭제 권한', 'groups', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 2. 기본 사용자 그룹 생성
INSERT INTO user_groups (name, description, created_by) VALUES
('관리자', '시스템 전체 관리 권한을 가진 그룹', (SELECT id FROM timbel_users WHERE username = 'admin')),
('개발팀', '개발 관련 작업을 담당하는 그룹', (SELECT id FROM timbel_users WHERE username = 'admin')),
('디자인팀', '디자인 관련 작업을 담당하는 그룹', (SELECT id FROM timbel_users WHERE username = 'admin')),
('QA팀', '품질 보증을 담당하는 그룹', (SELECT id FROM timbel_users WHERE username = 'admin')),
('운영팀', '시스템 운영을 담당하는 그룹', (SELECT id FROM timbel_users WHERE username = 'admin'))
ON CONFLICT (name) DO NOTHING;

-- 3. 사용자를 그룹에 할당
INSERT INTO user_group_memberships (user_id, group_id, role) VALUES
-- 관리자 그룹
((SELECT id FROM timbel_users WHERE username = 'admin'), (SELECT id FROM user_groups WHERE name = '관리자'), 'admin'),
((SELECT id FROM timbel_users WHERE username = 'executive'), (SELECT id FROM user_groups WHERE name = '관리자'), 'admin'),
-- 개발팀
((SELECT id FROM timbel_users WHERE username = 'peuser'), (SELECT id FROM user_groups WHERE name = '개발팀'), 'member'),
-- 디자인팀
((SELECT id FROM timbel_users WHERE username = 'designer'), (SELECT id FROM user_groups WHERE name = '디자인팀'), 'member'),
-- QA팀
((SELECT id FROM timbel_users WHERE username = 'qauser'), (SELECT id FROM user_groups WHERE name = 'QA팀'), 'member'),
-- 운영팀
((SELECT id FROM timbel_users WHERE username = 'opuser'), (SELECT id FROM user_groups WHERE name = '운영팀'), 'member')
ON CONFLICT (user_id, group_id) DO NOTHING;

-- 4. 그룹별 권한 부여
INSERT INTO group_permissions (group_id, permission_id, granted_by) VALUES
-- 관리자 그룹: 모든 권한
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'domains.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'domains.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'domains.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'systems.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'systems.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'systems.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'components.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'components.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'components.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'apis.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'apis.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'apis.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'resources.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'resources.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'resources.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'knowledge.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'knowledge.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'knowledge.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'approval.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'approval.approve'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'approval.reject'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'diagrams.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'diagrams.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'users.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'users.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'users.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'groups.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'groups.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '관리자'), (SELECT id FROM permissions WHERE name = 'groups.delete'), (SELECT id FROM timbel_users WHERE username = 'admin')),

-- 개발팀: 개발 관련 권한
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'domains.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'systems.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'systems.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'components.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'components.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'apis.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'apis.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'resources.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'resources.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'knowledge.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'knowledge.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'approval.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'approval.approve'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'diagrams.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '개발팀'), (SELECT id FROM permissions WHERE name = 'diagrams.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),

-- 디자인팀: 디자인 관련 권한
((SELECT id FROM user_groups WHERE name = '디자인팀'), (SELECT id FROM permissions WHERE name = 'domains.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '디자인팀'), (SELECT id FROM permissions WHERE name = 'systems.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '디자인팀'), (SELECT id FROM permissions WHERE name = 'components.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '디자인팀'), (SELECT id FROM permissions WHERE name = 'resources.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '디자인팀'), (SELECT id FROM permissions WHERE name = 'knowledge.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '디자인팀'), (SELECT id FROM permissions WHERE name = 'knowledge.write'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '디자인팀'), (SELECT id FROM permissions WHERE name = 'approval.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),

-- QA팀: 승인 관련 권한
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'domains.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'systems.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'components.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'apis.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'resources.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'knowledge.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'approval.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'approval.approve'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'approval.reject'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = 'QA팀'), (SELECT id FROM permissions WHERE name = 'diagrams.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),

-- 운영팀: 조회 권한
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'domains.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'systems.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'components.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'apis.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'resources.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'knowledge.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'approval.read'), (SELECT id FROM timbel_users WHERE username = 'admin')),
((SELECT id FROM user_groups WHERE name = '운영팀'), (SELECT id FROM permissions WHERE name = 'diagrams.read'), (SELECT id FROM timbel_users WHERE username = 'admin'))
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- 5. 샘플 도메인 데이터
INSERT INTO domains (name, description, owner_id) VALUES
('E-Commerce', '전자상거래 관련 도메인', (SELECT id FROM timbel_users WHERE username = 'admin')),
('Content Management', '콘텐츠 관리 시스템', (SELECT id FROM timbel_users WHERE username = 'admin')),
('User Management', '사용자 관리 시스템', (SELECT id FROM timbel_users WHERE username = 'admin')),
('Analytics', '분석 및 리포팅 시스템', (SELECT id FROM timbel_users WHERE username = 'admin'))
ON CONFLICT (name) DO NOTHING;

-- 6. 샘플 시스템 데이터
INSERT INTO systems (name, description, domain_id, owner_id, version) VALUES
('Product Catalog', '상품 카탈로그 시스템', (SELECT id FROM domains WHERE name = 'E-Commerce'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '1.2.0'),
('Order Management', '주문 관리 시스템', (SELECT id FROM domains WHERE name = 'E-Commerce'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '2.1.0'),
('CMS Core', '핵심 CMS 시스템', (SELECT id FROM domains WHERE name = 'Content Management'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '1.0.0'),
('Auth Service', '인증 서비스', (SELECT id FROM domains WHERE name = 'User Management'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '1.5.0'),
('Dashboard API', '대시보드 API', (SELECT id FROM domains WHERE name = 'Analytics'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '1.0.0')
ON CONFLICT (name) DO NOTHING;

-- 7. 샘플 컴포넌트 데이터
INSERT INTO components (name, description, system_id, owner_id, type, version, repository_url) VALUES
('Product Card', '상품 카드 컴포넌트', (SELECT id FROM systems WHERE name = 'Product Catalog'), (SELECT id FROM timbel_users WHERE username = 'peuser'), 'ui', '1.1.0', 'https://github.com/company/product-card'),
('Order Form', '주문 폼 컴포넌트', (SELECT id FROM systems WHERE name = 'Order Management'), (SELECT id FROM timbel_users WHERE username = 'peuser'), 'ui', '2.0.0', 'https://github.com/company/order-form'),
('Content Editor', '콘텐츠 에디터', (SELECT id FROM systems WHERE name = 'CMS Core'), (SELECT id FROM timbel_users WHERE username = 'peuser'), 'ui', '1.0.0', 'https://github.com/company/content-editor'),
('Login Modal', '로그인 모달', (SELECT id FROM systems WHERE name = 'Auth Service'), (SELECT id FROM timbel_users WHERE username = 'peuser'), 'ui', '1.2.0', 'https://github.com/company/login-modal'),
('Chart Library', '차트 라이브러리', (SELECT id FROM systems WHERE name = 'Dashboard API'), (SELECT id FROM timbel_users WHERE username = 'peuser'), 'library', '3.1.0', 'https://github.com/company/chart-lib');

-- 8. 샘플 API 데이터
INSERT INTO apis (name, description, system_id, owner_id, endpoint, method, version, documentation_url) VALUES
('Get Products', '상품 목록 조회 API', (SELECT id FROM systems WHERE name = 'Product Catalog'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '/api/products', 'GET', '1.2.0', 'https://docs.company.com/api/products'),
('Create Order', '주문 생성 API', (SELECT id FROM systems WHERE name = 'Order Management'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '/api/orders', 'POST', '2.1.0', 'https://docs.company.com/api/orders'),
('Update Content', '콘텐츠 수정 API', (SELECT id FROM systems WHERE name = 'CMS Core'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '/api/content', 'PUT', '1.0.0', 'https://docs.company.com/api/content'),
('Authenticate', '사용자 인증 API', (SELECT id FROM systems WHERE name = 'Auth Service'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '/api/auth', 'POST', '1.5.0', 'https://docs.company.com/api/auth'),
('Get Analytics', '분석 데이터 조회 API', (SELECT id FROM systems WHERE name = 'Dashboard API'), (SELECT id FROM timbel_users WHERE username = 'peuser'), '/api/analytics', 'GET', '1.0.0', 'https://docs.company.com/api/analytics');
