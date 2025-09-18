-- [advice from AI] 실제 존재하는 데이터 기반 관계 생성

-- 시스템 간 의존관계 (실제 존재하는 시스템)
INSERT INTO system_dependencies (
    source_system_id, target_system_id, dependency_type, description, is_critical
) VALUES 
-- 핵심 뱅킹 시스템 → 생산관리 시스템 (데이터 연동)
(
    '82bf6f20-4018-4172-a6b8-52f96d1ea11c', -- core-banking-system
    'ad6925a8-e7d0-44fd-b9ff-d2f01987870f', -- production-management
    'api',
    '뱅킹 시스템에서 생산관리 시스템 API를 통한 제조업체 결제 정보 연동',
    false
)
ON CONFLICT (source_system_id, target_system_id, dependency_type) DO NOTHING;

-- 지식 자산 간 관계 (실제 존재하는 컴포넌트)
INSERT INTO knowledge_asset_relationships (
    source_type, source_id, target_type, target_id, relationship_type, 
    relationship_strength, auto_detected, confidence_score, metadata
) VALUES 
-- BankingAuthService → TransactionValidator (인증 후 거래 검증)
(
    'code_component', 
    'c1000000-0000-0000-0000-000000000001', -- BankingAuthService
    'code_component',
    'c1000000-0000-0000-0000-000000000002', -- TransactionValidator
    'depends_on',
    0.9,
    true,
    0.85,
    '{"description": "인증 완료 후 거래 검증 프로세스로 연결", "usage_pattern": "sequential"}'
),
-- TransactionValidator → AccountBalanceWidget (검증 후 잔액 표시)
(
    'code_component',
    'c1000000-0000-0000-0000-000000000002', -- TransactionValidator
    'code_component', 
    'c1000000-0000-0000-0000-000000000003', -- AccountBalanceWidget
    'triggers',
    0.8,
    true,
    0.78,
    '{"description": "거래 검증 후 계좌 잔액 업데이트 트리거", "usage_pattern": "event_driven"}'
),
-- ProductionLineMonitor → QualityControlDashboard (생산 모니터링 → 품질 대시보드)
(
    'code_component',
    'c2000000-0000-0000-0000-000000000001', -- ProductionLineMonitor
    'code_component',
    'c2000000-0000-0000-0000-000000000002', -- QualityControlDashboard
    'feeds_data',
    0.95,
    true,
    0.92,
    '{"description": "생산라인 데이터를 품질관리 대시보드로 실시간 전송", "usage_pattern": "data_flow"}'
),
-- 금융권 보안 가이드라인 → BankingAuthService (문서 → 코드 구현)
(
    'document',
    'd1000000-0000-0000-0000-000000000001', -- 금융권 보안 가이드라인
    'code_component',
    'c1000000-0000-0000-0000-000000000001', -- BankingAuthService
    'implements',
    0.85,
    false,
    0.90,
    '{"description": "보안 가이드라인을 기반으로 인증 서비스 구현", "usage_pattern": "specification"}'
),
-- 제조업 IoT 연동 가이드 → ProductionLineMonitor (문서 → 코드 구현)
(
    'document',
    'd2000000-0000-0000-0000-000000000001', -- 제조업 IoT 연동 가이드
    'code_component',
    'c2000000-0000-0000-0000-000000000001', -- ProductionLineMonitor
    'implements',
    0.88,
    false,
    0.87,
    '{"description": "IoT 연동 가이드를 기반으로 생산라인 모니터링 구현", "usage_pattern": "specification"}'
),
-- UI Kit → AccountBalanceWidget (디자인 → UI 컴포넌트)
(
    'design_asset',
    '66666666-6666-6666-6666-666666666666', -- UI Kit
    'code_component',
    'c1000000-0000-0000-0000-000000000003', -- AccountBalanceWidget
    'designs',
    0.92,
    false,
    0.88,
    '{"description": "UI 키트 디자인을 기반으로 계좌잔액 위젯 구현", "usage_pattern": "design_implementation"}'
),
-- Logo Design → QualityControlDashboard (디자인 → UI 구현)
(
    'design_asset',
    '55555555-5555-5555-5555-555555555555', -- Logo Design
    'code_component',
    'c2000000-0000-0000-0000-000000000002', -- QualityControlDashboard
    'designs',
    0.75,
    false,
    0.70,
    '{"description": "로고 디자인을 품질관리 대시보드에 적용", "usage_pattern": "branding"}'
)
ON CONFLICT DO NOTHING;
