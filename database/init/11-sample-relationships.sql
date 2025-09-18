-- [advice from AI] 실제 비즈니스 시나리오 기반 관계 데이터 생성
-- 영업처 → 시스템 → 컴포넌트 간의 실제 관계 구조

-- 시스템 간 의존관계 (실제 비즈니스 시나리오)
INSERT INTO system_dependencies (
    source_system_id, target_system_id, dependency_type, description, is_critical
) VALUES 
-- 국민은행 인터넷뱅킹 → 삼성전자 MES (보안 토큰 검증)
(
    (SELECT id FROM systems WHERE name = 'kb-internet-banking' LIMIT 1),
    (SELECT id FROM systems WHERE name = 'samsung-mes-system' LIMIT 1),
    'api',
    '인터넷뱅킹에서 제조업체 보안 인증 토큰 검증 API 사용',
    false
),
-- 롯데마트 재고관리 → 삼성전자 MES (생산 일정 조회)
(
    (SELECT id FROM systems WHERE name = 'lotte-inventory-system' LIMIT 1),
    (SELECT id FROM systems WHERE name = 'samsung-mes-system' LIMIT 1),
    'service',
    '재고관리에서 생산 계획 및 일정 정보 실시간 연동',
    true
)
ON CONFLICT (source_system_id, target_system_id, dependency_type) DO NOTHING;

-- 지식 자산 간 관계 (컴포넌트 재사용 관계)
INSERT INTO knowledge_asset_relationships (
    source_type, source_id, target_type, target_id, relationship_type, 
    relationship_strength, auto_detected, confidence_score, metadata
) VALUES 
-- BankingAuthService → TransactionValidator (인증 후 거래 검증)
(
    'code_component', 
    (SELECT id FROM code_components WHERE name = 'BankingAuthService' LIMIT 1),
    'code_component',
    (SELECT id FROM code_components WHERE name = 'TransactionValidator' LIMIT 1),
    'depends_on',
    0.9,
    true,
    0.85,
    '{"description": "인증 완료 후 거래 검증 프로세스로 연결", "usage_pattern": "sequential"}'
),
-- TransactionValidator → AccountBalanceWidget (검증 후 잔액 표시)
(
    'code_component',
    (SELECT id FROM code_components WHERE name = 'TransactionValidator' LIMIT 1),
    'code_component', 
    (SELECT id FROM code_components WHERE name = 'AccountBalanceWidget' LIMIT 1),
    'triggers',
    0.8,
    true,
    0.78,
    '{"description": "거래 검증 후 계좌 잔액 업데이트 트리거", "usage_pattern": "event_driven"}'
),
-- ProductionLineMonitor → QualityControlDashboard (생산 모니터링 → 품질 대시보드)
(
    'code_component',
    (SELECT id FROM code_components WHERE name = 'ProductionLineMonitor' LIMIT 1),
    'code_component',
    (SELECT id FROM code_components WHERE name = 'QualityControlDashboard' LIMIT 1),
    'feeds_data',
    0.95,
    true,
    0.92,
    '{"description": "생산라인 데이터를 품질관리 대시보드로 실시간 전송", "usage_pattern": "data_flow"}'
),
-- 금융권 보안 가이드라인 → BankingAuthService (문서 → 코드 구현)
(
    'document',
    (SELECT id FROM documents WHERE title = '금융권 보안 가이드라인' LIMIT 1),
    'code_component',
    (SELECT id FROM code_components WHERE name = 'BankingAuthService' LIMIT 1),
    'implements',
    0.85,
    false,
    0.90,
    '{"description": "보안 가이드라인을 기반으로 인증 서비스 구현", "usage_pattern": "specification"}'
),
-- 제조업 IoT 연동 가이드 → ProductionLineMonitor (문서 → 코드 구현)
(
    'document',
    (SELECT id FROM documents WHERE title = '제조업 IoT 연동 가이드' LIMIT 1),
    'code_component',
    (SELECT id FROM code_components WHERE name = 'ProductionLineMonitor' LIMIT 1),
    'implements',
    0.88,
    false,
    0.87,
    '{"description": "IoT 연동 가이드를 기반으로 생산라인 모니터링 구현", "usage_pattern": "specification"}'
),
-- KB 금융 UI 키트 → AccountBalanceWidget (디자인 → UI 컴포넌트)
(
    'design_asset',
    (SELECT id FROM design_assets WHERE name = 'KB 금융 UI 키트' LIMIT 1),
    'code_component',
    (SELECT id FROM code_components WHERE name = 'AccountBalanceWidget' LIMIT 1),
    'designs',
    0.92,
    false,
    0.88,
    '{"description": "UI 키트 디자인을 기반으로 계좌잔액 위젯 구현", "usage_pattern": "design_implementation"}'
),
-- 삼성 MES 모니터링 대시보드 → QualityControlDashboard (디자인 → UI 구현)
(
    'design_asset',
    (SELECT id FROM design_assets WHERE name = '삼성 MES 모니터링 대시보드' LIMIT 1),
    'code_component',
    (SELECT id FROM code_components WHERE name = 'QualityControlDashboard' LIMIT 1),
    'designs',
    0.90,
    false,
    0.85,
    '{"description": "MES 대시보드 디자인을 기반으로 품질관리 대시보드 구현", "usage_pattern": "design_implementation"}'
)
ON CONFLICT DO NOTHING;

-- 관계 통계 확인
SELECT 
    'system_dependencies' as table_name,
    COUNT(*) as total_relationships
FROM system_dependencies
UNION ALL
SELECT 
    'knowledge_asset_relationships' as table_name,
    COUNT(*) as total_relationships
FROM knowledge_asset_relationships;
