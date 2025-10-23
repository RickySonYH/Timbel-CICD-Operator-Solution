-- [advice from AI] 기본 샘플 데이터 생성
-- 시스템 테스트를 위한 최소한의 데이터

-- 기본 도메인(영업처) 생성
INSERT INTO domains (name, description, company_type, industry, contact_person, contact_email) VALUES
('삼성전자', 'IT 솔루션 개발', '대기업', 'IT/전자', '김삼성', 'samsung@example.com'),
('LG전자', 'AI 플랫폼 구축', '대기업', 'IT/전자', '이엘지', 'lg@example.com'),
('네이버', '클라우드 서비스 개발', '대기업', 'IT/인터넷', '박네이버', 'naver@example.com'),
('카카오', '메신저 플랫폼 개발', '대기업', 'IT/인터넷', '최카카오', 'kakao@example.com'),
('스타트업A', '핀테크 솔루션', '중소기업', '금융', '김스타트', 'startup@example.com')
ON CONFLICT (name) DO NOTHING;

-- 기본 프로젝트 생성
INSERT INTO projects (name, description, domain_id, project_status, approval_status, urgency_level, deadline, created_by) VALUES
(
  'ECP-AI 음성인식 플랫폼', 
  '75채널 동시 처리 가능한 음성인식 AI 플랫폼 개발',
  (SELECT id FROM domains WHERE name = '삼성전자' LIMIT 1),
  'development',
  'approved',
  'high',
  '2025-12-31',
  (SELECT id FROM timbel_users WHERE role = 'admin' LIMIT 1)
),
(
  'IoT 디바이스 관리 시스템',
  '스마트홈 IoT 디바이스 통합 관리 플랫폼',
  (SELECT id FROM domains WHERE name = 'LG전자' LIMIT 1),
  'planning',
  'pending',
  'medium',
  '2025-11-30',
  (SELECT id FROM timbel_users WHERE role = 'admin' LIMIT 1)
),
(
  '클라우드 모니터링 대시보드',
  '실시간 클라우드 리소스 모니터링 및 알림 시스템',
  (SELECT id FROM domains WHERE name = '네이버' LIMIT 1),
  'in_progress',
  'approved',
  'medium',
  '2025-10-31',
  (SELECT id FROM timbel_users WHERE role = 'operations' LIMIT 1)
)
ON CONFLICT (name) DO NOTHING;

-- 기본 시스템 생성
INSERT INTO systems (name, description, project_id, technology_stack, repository_url, status) VALUES
(
  'ECP-AI Core Engine',
  '음성인식 및 자연어처리 핵심 엔진',
  (SELECT id FROM projects WHERE name = 'ECP-AI 음성인식 플랫폼' LIMIT 1),
  '["Python", "TensorFlow", "FastAPI", "Redis", "PostgreSQL"]',
  'https://github.com/timbel/ecp-ai-core',
  'development'
),
(
  'IoT Device Manager',
  'IoT 디바이스 연결 및 상태 관리 시스템',
  (SELECT id FROM projects WHERE name = 'IoT 디바이스 관리 시스템' LIMIT 1),
  '["Node.js", "React", "MongoDB", "MQTT", "Docker"]',
  'https://github.com/timbel/iot-manager',
  'planning'
),
(
  'Cloud Monitor Dashboard',
  '클라우드 리소스 실시간 모니터링 웹 대시보드',
  (SELECT id FROM projects WHERE name = '클라우드 모니터링 대시보드' LIMIT 1),
  '["React", "TypeScript", "Material-UI", "Prometheus", "Grafana"]',
  'https://github.com/timbel/cloud-monitor',
  'development'
)
ON CONFLICT (name) DO NOTHING;

-- 기본 지식 자산 생성
INSERT INTO knowledge_assets (title, description, asset_type, category, author_id) VALUES
(
  'AI 음성인식 아키텍처 가이드',
  '음성인식 시스템 설계 및 구현 가이드라인',
  'document',
  'architecture',
  (SELECT id FROM timbel_users WHERE role = 'admin' LIMIT 1)
),
(
  'React 컴포넌트 라이브러리',
  '재사용 가능한 UI 컴포넌트 모음',
  'code',
  'frontend',
  (SELECT id FROM timbel_users WHERE role = 'operations' LIMIT 1)
),
(
  'API 설계 템플릿',
  'RESTful API 설계 표준 템플릿',
  'template',
  'backend',
  (SELECT id FROM timbel_users WHERE role = 'deployer' LIMIT 1)
)
ON CONFLICT (title) DO NOTHING;

-- 시스템 이벤트 스트림 샘플 데이터
INSERT INTO system_event_stream (event_type, event_category, title, description, project_id, user_id, event_severity) VALUES
(
  'project_created',
  'project',
  '새 프로젝트 생성',
  'ECP-AI 음성인식 플랫폼 프로젝트가 생성되었습니다.',
  (SELECT id FROM projects WHERE name = 'ECP-AI 음성인식 플랫폼' LIMIT 1),
  (SELECT id FROM timbel_users WHERE role = 'admin' LIMIT 1),
  'info'
),
(
  'project_approved',
  'workflow',
  '프로젝트 승인 완료',
  'ECP-AI 음성인식 플랫폼 프로젝트가 승인되었습니다.',
  (SELECT id FROM projects WHERE name = 'ECP-AI 음성인식 플랫폼' LIMIT 1),
  (SELECT id FROM timbel_users WHERE role = 'admin' LIMIT 1),
  'success'
),
(
  'system_deployment',
  'cicd',
  '시스템 배포 완료',
  'Cloud Monitor Dashboard가 개발 환경에 배포되었습니다.',
  (SELECT id FROM projects WHERE name = '클라우드 모니터링 대시보드' LIMIT 1),
  (SELECT id FROM timbel_users WHERE role = 'deployer' LIMIT 1),
  'success'
)
ON CONFLICT DO NOTHING;
