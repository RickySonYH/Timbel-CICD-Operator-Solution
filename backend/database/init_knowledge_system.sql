-- [advice from AI] 프로덕션 레벨 지식자원 시스템 초기화
-- 도메인/프로젝트/시스템 통합 + 컴포넌트/디자인/문서 샘플 데이터

\c timbel_knowledge;

-- ===== 1. 샘플 도메인 데이터 삽입 =====
INSERT INTO domains (id, name, description, owner_id, status, tags, created_at) VALUES
('d1', 'E-Commerce Platform', '전자상거래 플랫폼 도메인', '873cb257-ab7b-470e-8c0d-ca0682188508', 'active', ARRAY['commerce', 'retail', 'payment'], NOW()),
('d2', 'AI & ML Services', '인공지능 및 머신러닝 서비스 도메인', '873cb257-ab7b-470e-8c0d-ca0682188508', 'active', ARRAY['ai', 'ml', 'deep-learning'], NOW()),
('d3', 'Cloud Infrastructure', '클라우드 인프라 관리 도메인', '873cb257-ab7b-470e-8c0d-ca0682188508', 'active', ARRAY['cloud', 'kubernetes', 'devops'], NOW())
ON CONFLICT (id) DO NOTHING;

-- ===== 2. 샘플 프로젝트 데이터 삽입 =====
INSERT INTO projects (id, name, description, domain_id, project_type, status, repository_url, tech_stack, team_size, created_at) VALUES
('p1', 'Shopping Cart Service', '장바구니 마이크로서비스', 'd1', 'microservice', 'active', 'https://github.com/timbel/shopping-cart', ARRAY['Node.js', 'MongoDB', 'Redis'], 5, NOW()),
('p2', 'Payment Gateway', '결제 게이트웨이 시스템', 'd1', 'backend', 'active', 'https://github.com/timbel/payment-gateway', ARRAY['Java', 'Spring Boot', 'PostgreSQL'], 8, NOW()),
('p3', 'Recommendation Engine', '상품 추천 엔진', 'd2', 'ai_ml', 'active', 'https://github.com/timbel/recommendation-engine', ARRAY['Python', 'TensorFlow', 'Kafka'], 6, NOW()),
('p4', 'K8s Orchestrator', 'Kubernetes 오케스트레이터', 'd3', 'infrastructure', 'active', 'https://github.com/timbel/k8s-orchestrator', ARRAY['Go', 'Kubernetes', 'Prometheus'], 10, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===== 3. 샘플 시스템 데이터 삽입 =====
INSERT INTO systems (id, name, description, project_id, system_type, version, endpoints, dependencies, health_status, created_at) VALUES
('s1', 'Cart API', '장바구니 RESTful API', 'p1', 'api', '2.1.0', '{"add": "/api/cart/add", "remove": "/api/cart/remove", "list": "/api/cart/items"}', ARRAY['Redis', 'MongoDB'], 'healthy', NOW()),
('s2', 'Payment Processor', '결제 처리 시스템', 'p2', 'service', '3.0.5', '{"process": "/api/payment/process", "refund": "/api/payment/refund"}', ARRAY['PostgreSQL', 'Kafka'], 'healthy', NOW()),
('s3', 'ML Model Server', '머신러닝 모델 서빙', 'p3', 'ml_service', '1.5.2', '{"predict": "/api/predict", "feedback": "/api/feedback"}', ARRAY['TensorFlow Serving', 'Redis'], 'healthy', NOW())
ON CONFLICT (id) DO NOTHING;

-- ===== 4. 샘플 코드 컴포넌트 삽입 =====
INSERT INTO components (id, name, description, component_type, language, framework, file_path, repository_url, version, author_id, tags, is_reusable, usage_count, created_at) VALUES
('c1', 'UserAuthService', '사용자 인증 서비스 컴포넌트', 'service', 'TypeScript', 'NestJS', '/src/auth/user-auth.service.ts', 'https://github.com/timbel/auth-service', '2.0.0', '873cb257-ab7b-470e-8c0d-ca0682188508', ARRAY['auth', 'jwt', 'security'], true, 45, NOW()),
('c2', 'PaymentValidator', '결제 검증 유틸리티', 'utility', 'Java', 'Spring', '/src/main/java/com/timbel/payment/PaymentValidator.java', 'https://github.com/timbel/payment-gateway', '1.3.0', '873cb257-ab7b-470e-8c0d-ca0682188508', ARRAY['payment', 'validation'], true, 32, NOW()),
('c3', 'ProductCard', '상품 카드 UI 컴포넌트', 'ui_component', 'TypeScript', 'React', '/src/components/ProductCard.tsx', 'https://github.com/timbel/frontend', '1.5.0', '873cb257-ab7b-470e-8c0d-ca0682188508', ARRAY['ui', 'react', 'ecommerce'], true, 67, NOW()),
('c4', 'DatabaseConnection', 'PostgreSQL 연결 풀 관리', 'service', 'Go', 'stdlib', '/internal/database/connection.go', 'https://github.com/timbel/k8s-orchestrator', '2.1.0', '873cb257-ab7b-470e-8c0d-ca0682188508', ARRAY['database', 'postgresql'], true, 28, NOW()),
('c5', 'LoadingSpinner', '로딩 스피너 컴포넌트', 'ui_component', 'TypeScript', 'React', '/src/components/LoadingSpinner.tsx', 'https://github.com/timbel/frontend', '1.0.5', '873cb257-ab7b-470e-8c0d-ca0682188508', ARRAY['ui', 'loading', 'animation'], true, 89, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===== 5. 샘플 지식 자산 (디자인/문서) 삽입 =====
INSERT INTO knowledge_assets (id, title, description, asset_type, category, file_path, file_size, file_type, tags, author_id, is_public, download_count, created_at) VALUES
('ka1', 'Design System Figma', 'Timbel 디자인 시스템 Figma 파일', 'design', 'UI/UX', '/assets/design/timbel-design-system.fig', 15728640, 'figma', ARRAY['design-system', 'figma', 'ui'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 124, NOW()),
('ka2', 'Brand Guidelines', '브랜드 가이드라인 문서', 'document', 'Brand', '/assets/docs/brand-guidelines.pdf', 5242880, 'pdf', ARRAY['brand', 'guidelines', 'design'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 89, NOW()),
('ka3', 'Component Library Storybook', 'React 컴포넌트 라이브러리', 'design', 'Component', '/assets/design/component-library/', 0, 'storybook', ARRAY['react', 'storybook', 'components'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 156, NOW()),
('ka4', 'API Documentation', 'RESTful API 문서', 'guide', 'API', '/assets/docs/api-documentation.md', 204800, 'markdown', ARRAY['api', 'rest', 'documentation'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 234, NOW()),
('ka5', 'Deployment Guide', 'Kubernetes 배포 가이드', 'guide', 'DevOps', '/assets/docs/k8s-deployment-guide.md', 153600, 'markdown', ARRAY['kubernetes', 'deployment', 'devops'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 178, NOW()),
('ka6', 'Architecture Diagram', '시스템 아키텍처 다이어그램', 'design', 'Architecture', '/assets/design/system-architecture.svg', 512000, 'svg', ARRAY['architecture', 'diagram', 'system'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 95, NOW()),
('ka7', 'Security Best Practices', '보안 모범 사례 문서', 'document', 'Security', '/assets/docs/security-best-practices.pdf', 1048576, 'pdf', ARRAY['security', 'best-practices'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 143, NOW()),
('ka8', 'Icon Set', 'SVG 아이콘 세트', 'design', 'Icons', '/assets/design/icons/', 0, 'svg', ARRAY['icons', 'svg', 'ui'], '873cb257-ab7b-470e-8c0d-ca0682188508', true, 267, NOW())
ON CONFLICT (id) DO NOTHING;

-- ===== 6. 통계 확인 쿼리 =====
SELECT 
  '도메인' as category,
  COUNT(*) as count
FROM domains
UNION ALL
SELECT 
  '프로젝트' as category,
  COUNT(*) as count
FROM projects
UNION ALL
SELECT 
  '시스템' as category,
  COUNT(*) as count
FROM systems
UNION ALL
SELECT 
  '코드 컴포넌트' as category,
  COUNT(*) as count
FROM components
UNION ALL
SELECT 
  '디자인 자산' as category,
  COUNT(*) as count
FROM knowledge_assets WHERE asset_type = 'design'
UNION ALL
SELECT 
  '문서/가이드' as category,
  COUNT(*) as count
FROM knowledge_assets WHERE asset_type IN ('document', 'guide', 'api_guide');

-- ===== 완료 메시지 =====
SELECT '✅ 프로덕션 레벨 지식자원 시스템 초기화 완료!' as message;

