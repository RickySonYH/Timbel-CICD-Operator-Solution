-- [advice from AI] 실제 프로젝트 시나리오 기반 샘플 데이터
-- 영업처 → 솔루션 → 재사용 컴포넌트 체계

-- 도메인 (영업처) 데이터
INSERT INTO domains (id, name, description, business_area, region, contact_person, contact_email, priority_level, approval_status, created_by) VALUES 
('d1000000-0000-0000-0000-000000000001', '국민은행', '개인/법인 뱅킹 서비스 및 디지털 금융 플랫폼', '금융', '서울', '김은행', 'banking@kb.co.kr', 'critical', 'approved', '10000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000002', '삼성전자', '반도체 및 전자제품 생산관리 시스템', '제조', '수원', '이제조', 'manufacturing@samsung.com', 'high', 'approved', '10000000-0000-0000-0000-000000000001'),
('d1000000-0000-0000-0000-000000000003', '롯데마트', '유통 및 물류 통합관리 시스템', '유통', '전국', '박유통', 'retail@lotte.co.kr', 'high', 'approved', '10000000-0000-0000-0000-000000000002'),
('d1000000-0000-0000-0000-000000000004', '서울대병원', '병원정보시스템 및 의료기기 연동', '의료', '서울', '최의료', 'his@snuh.org', 'critical', 'pending', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 시스템 (솔루션) 데이터
INSERT INTO systems (
    id, domain_id, name, title, description, version, category,
    tech_stack, programming_languages, frameworks, databases,
    source_type, source_url, source_branch, lifecycle, deployment_status,
    owner_group, primary_contact, technical_lead, business_owner,
    approval_status, created_by, total_code_components, total_documents, total_design_assets,
    code_quality_score, documentation_coverage, test_coverage, security_score
) VALUES 
-- 국민은행 - 인터넷뱅킹 시스템 (완성됨)
(
    's1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'kb-internet-banking',
    '국민은행 인터넷뱅킹 시스템',
    '개인고객 대상 온라인 뱅킹 서비스. 계좌조회, 이체, 대출신청, 투자상품 가입 등 종합 금융서비스 제공',
    '2.5.1',
    'application',
    ARRAY['Spring Boot', 'React', 'PostgreSQL', 'Redis', 'Kafka'],
    ARRAY['Java', 'JavaScript', 'TypeScript', 'SQL'],
    ARRAY['Spring Boot', 'Spring Security', 'React', 'Material-UI'],
    ARRAY['PostgreSQL', 'Redis', 'InfluxDB'],
    'github',
    'https://github.com/kb-bank/internet-banking',
    'main',
    'production',
    'production',
    'Digital Banking Team',
    '30000000-0000-0000-0000-000000000001', -- PO
    '40000000-0000-0000-0000-000000000001', -- PE 리더
    '30000000-0000-0000-0000-000000000001', -- Business Owner
    'approved',
    '30000000-0000-0000-0000-000000000001',
    45, 12, 8, -- 자산 개수
    8.5, 85.0, 78.0, 9.2 -- 품질 지표
),
-- 삼성전자 - MES 시스템 (QC 승인 완료)
(
    's1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000002',
    'samsung-mes-system',
    '삼성전자 생산관리시스템 (MES)',
    '반도체 생산라인 실시간 모니터링 및 품질관리. IoT 센서 연동, 예측 분석, 자동 품질검사',
    '1.8.0',
    'application',
    ARRAY['Node.js', 'Vue.js', 'MongoDB', 'InfluxDB', 'Grafana'],
    ARRAY['JavaScript', 'Python', 'C++', 'SQL'],
    ARRAY['Express', 'Vue.js', 'Vuetify', 'TensorFlow'],
    ARRAY['MongoDB', 'InfluxDB', 'TimescaleDB'],
    'gitlab',
    'https://gitlab.samsung.com/mes/production-system',
    'develop',
    'testing',
    'staging',
    'Manufacturing Engineering Team',
    '30000000-0000-0000-0000-000000000002', -- PO
    '40000000-0000-0000-0000-000000000002', -- PE 리더
    '30000000-0000-0000-0000-000000000002', -- Business Owner
    'approved',
    '30000000-0000-0000-0000-000000000002',
    38, 15, 6, -- 자산 개수
    7.8, 92.0, 85.0, 8.9 -- 품질 지표
),
-- 롯데마트 - 재고관리 시스템 (개발 중)
(
    's1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000003',
    'lotte-inventory-system',
    '롯데마트 통합재고관리시스템',
    '전국 매장 실시간 재고관리, 자동발주, 공급망 최적화. AI 기반 수요예측 및 재고 최적화',
    '1.2.0',
    'application',
    ARRAY['Python', 'Django', 'PostgreSQL', 'Celery', 'TensorFlow'],
    ARRAY['Python', 'JavaScript', 'SQL'],
    ARRAY['Django', 'Django REST', 'Bootstrap', 'Chart.js'],
    ARRAY['PostgreSQL', 'Redis', 'Elasticsearch'],
    'github',
    'https://github.com/lotte-retail/inventory-system',
    'develop',
    'development',
    'not_deployed',
    'Retail IT Team',
    '30000000-0000-0000-0000-000000000001', -- PO
    '40000000-0000-0000-0000-000000000003', -- PE 리더
    '30000000-0000-0000-0000-000000000001', -- Business Owner
    'pending',
    '40000000-0000-0000-0000-000000000003',
    25, 8, 4, -- 자산 개수
    6.5, 65.0, 45.0, 7.1 -- 품질 지표
),
-- 서울대병원 - HIS 시스템 (계획 단계)
(
    's1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000004',
    'snuh-his-system',
    '서울대병원 통합의료정보시스템',
    '환자정보관리, 진료기록, 처방전 관리, 의료기기 연동. HL7 FHIR 표준 준수',
    '0.5.0',
    'application',
    ARRAY['Java', 'Spring Boot', 'Oracle', 'Apache Kafka'],
    ARRAY['Java', 'JavaScript', 'SQL', 'XML'],
    ARRAY['Spring Boot', 'Spring Security', 'Thymeleaf'],
    ARRAY['Oracle', 'Redis'],
    'internal',
    'https://internal.snuh.org/his-system',
    'main',
    'planning',
    'not_deployed',
    'Medical IT Team',
    '30000000-0000-0000-0000-000000000002', -- PO
    '40000000-0000-0000-0000-000000000004', -- PE 리더
    '30000000-0000-0000-0000-000000000002', -- Business Owner
    'draft',
    '40000000-0000-0000-0000-000000000004',
    0, 5, 2, -- 자산 개수
    0.0, 30.0, 0.0, 5.0 -- 품질 지표
)
ON CONFLICT (id) DO NOTHING;

-- 시스템 환경 설정
INSERT INTO system_environments (system_id, environment_name, url, health_check_url, deployed_by) VALUES
-- 국민은행 인터넷뱅킹 (프로덕션 운영 중)
('s1000000-0000-0000-0000-000000000001', 'production', 'https://banking.kbstar.com', 'https://banking.kbstar.com/health', '60000000-0000-0000-0000-000000000001'),
('s1000000-0000-0000-0000-000000000001', 'staging', 'https://staging-banking.kb.co.kr', 'https://staging-banking.kb.co.kr/health', '60000000-0000-0000-0000-000000000001'),
-- 삼성전자 MES (스테이징 테스트 중)
('s1000000-0000-0000-0000-000000000002', 'staging', 'https://staging-mes.samsung.com', 'https://staging-mes.samsung.com/health', '60000000-0000-0000-0000-000000000002'),
('s1000000-0000-0000-0000-000000000002', 'development', 'https://dev-mes.samsung.com', 'https://dev-mes.samsung.com/health', '60000000-0000-0000-0000-000000000002'),
-- 롯데마트 재고관리 (개발 중)
('s1000000-0000-0000-0000-000000000003', 'development', 'https://dev-inventory.lotte.co.kr', 'https://dev-inventory.lotte.co.kr/health', '60000000-0000-0000-0000-000000000003')
ON CONFLICT (system_id, environment_name) DO NOTHING;

-- 시스템 간 의존관계
INSERT INTO system_dependencies (source_system_id, target_system_id, dependency_type, description, is_critical) VALUES
('s1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000002', 'api', '인터넷뱅킹에서 MES 생산 데이터 조회 API 사용', false),
('s1000000-0000-0000-0000-000000000003', 's1000000-0000-0000-0000-000000000002', 'service', '재고관리에서 생산계획 정보 연동', true)
ON CONFLICT (source_system_id, target_system_id, dependency_type) DO NOTHING;
