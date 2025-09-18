-- [advice from AI] 실제 프로젝트에서 추출된 재사용 가능한 컴포넌트들
-- 영업처별 솔루션에서 나온 실제 활용 가능한 자산들

-- 국민은행 인터넷뱅킹에서 추출된 재사용 컴포넌트들
INSERT INTO code_components (
    id, name, title, description, type, language, framework, source_code, 
    file_path, complexity_score, line_count, dependencies, 
    created_by, approval_status, status, usage_count, rating
) VALUES 
(
    'c1000000-0000-0000-0000-000000000001',
    'BankingAuthService',
    '금융권 인증 서비스',
    '2차 인증, OTP, 생체인증을 지원하는 금융권 특화 인증 서비스. 금융감독원 보안 기준 준수',
    'service',
    'java',
    'Spring Boot',
    'public class BankingAuthService { /* 금융권 인증 로직 */ }',
    'src/main/java/com/kb/auth/BankingAuthService.java',
    7.5,
    450,
    '{"external": ["spring-security", "otp-lib"], "internal": ["UserService", "SecurityConfig"]}',
    '40000000-0000-0000-0000-000000000001',
    'approved',
    'active',
    15,
    4.8
),
(
    'c1000000-0000-0000-0000-000000000002',
    'TransactionValidator',
    '거래 검증 모듈',
    '실시간 거래 유효성 검증, 한도 체크, 이상거래 탐지. 머신러닝 기반 사기 거래 방지',
    'module',
    'java',
    'Spring Boot',
    'public class TransactionValidator { /* 거래 검증 로직 */ }',
    'src/main/java/com/kb/transaction/TransactionValidator.java',
    8.2,
    380,
    '{"external": ["tensorflow-java", "redis"], "internal": ["RiskEngine", "LimitChecker"]}',
    '40000000-0000-0000-0000-000000000001',
    'approved',
    'active',
    23,
    4.9
),
(
    'c1000000-0000-0000-0000-000000000003',
    'AccountBalanceWidget',
    '계좌잔액 위젯',
    '실시간 계좌잔액 표시 React 컴포넌트. 다중 계좌 지원, 차트 표시, 거래내역 미리보기',
    'component',
    'typescript',
    'React',
    'export const AccountBalanceWidget: React.FC = () => { /* 계좌잔액 UI */ }',
    'src/components/AccountBalanceWidget.tsx',
    5.1,
    220,
    '{"external": ["react", "material-ui", "recharts"], "internal": ["AccountService", "TransactionHistory"]}',
    '40000000-0000-0000-0000-000000000003',
    'approved',
    'active',
    31,
    4.7
)
ON CONFLICT (id) DO NOTHING;

-- 삼성전자 MES에서 추출된 재사용 컴포넌트들
INSERT INTO code_components (
    id, name, title, description, type, language, framework, source_code, 
    file_path, complexity_score, line_count, dependencies, 
    created_by, approval_status, status, usage_count, rating
) VALUES 
(
    'c2000000-0000-0000-0000-000000000001',
    'ProductionLineMonitor',
    '생산라인 모니터링 시스템',
    'IoT 센서 데이터 실시간 수집 및 분석. 이상 상황 자동 감지 및 알림',
    'system',
    'python',
    'FastAPI',
    'class ProductionLineMonitor: # IoT 모니터링 로직',
    'src/monitoring/ProductionLineMonitor.py',
    9.1,
    650,
    '{"external": ["fastapi", "asyncio", "influxdb"], "internal": ["SensorManager", "AlertService"]}',
    '40000000-0000-0000-0000-000000000002',
    'approved',
    'active',
    8,
    4.6
),
(
    'c2000000-0000-0000-0000-000000000002',
    'QualityControlDashboard',
    '품질관리 대시보드',
    '실시간 품질 지표 시각화. 불량률, 수율, 공정 효율성 모니터링',
    'component',
    'javascript',
    'Vue.js',
    'export default { name: "QualityControlDashboard" /* 품질 대시보드 */ }',
    'src/components/QualityControlDashboard.vue',
    6.8,
    340,
    '{"external": ["vue", "vuetify", "chart.js"], "internal": ["QualityService", "MetricsCalculator"]}',
    '40000000-0000-0000-0000-000000000003',
    'approved',
    'active',
    12,
    4.5
)
ON CONFLICT (id) DO NOTHING;

-- 문서 자산 (각 프로젝트별)
INSERT INTO documents (
    id, title, content, category, format, file_path, word_count, 
    author_id, approval_status, status
) VALUES 
(
    'd1000000-0000-0000-0000-000000000001',
    '금융권 보안 가이드라인',
    '금융감독원 보안 기준에 따른 시스템 개발 가이드라인. 암호화, 접근제어, 로깅 등 필수 보안 요구사항',
    'security',
    'md',
    'docs/security/financial-security-guidelines.md',
    1200,
    '50000000-0000-0000-0000-000000000001',
    'approved',
    'active'
),
(
    'd2000000-0000-0000-0000-000000000001',
    '제조업 IoT 연동 가이드',
    '산업용 IoT 센서와 시스템 연동 방법. MQTT, OPC-UA 프로토콜 활용법',
    'technical',
    'md',
    'docs/iot/manufacturing-iot-guide.md',
    800,
    '40000000-0000-0000-0000-000000000002',
    'approved',
    'active'
),
(
    'd3000000-0000-0000-0000-000000000001',
    '유통업 재고 최적화 알고리즘',
    'AI 기반 수요예측 및 재고 최적화 알고리즘 설명서. 머신러닝 모델 학습 및 적용 방법',
    'algorithm',
    'md',
    'docs/ai/inventory-optimization-algorithm.md',
    950,
    '40000000-0000-0000-0000-000000000003',
    'pending',
    'draft'
)
ON CONFLICT (id) DO NOTHING;

-- 디자인 자산 (UI/UX 컴포넌트)
INSERT INTO design_assets (
    id, name, category, description, file_path, file_type, file_size, 
    created_by, approval_status, status, usage_count
) VALUES 
(
    'da100000-0000-0000-0000-000000000001',
    'KB 금융 UI 키트',
    'ui-kit',
    '국민은행 브랜드 가이드라인에 따른 UI 컴포넌트 키트. 버튼, 폼, 차트 등 금융 서비스 특화 컴포넌트',
    'design/kb-financial-ui-kit.figma',
    'figma',
    2500000,
    '40000000-0000-0000-0000-000000000003',
    'approved',
    'active',
    18
),
(
    'da200000-0000-0000-0000-000000000001',
    '삼성 MES 모니터링 대시보드',
    'dashboard',
    '생산라인 실시간 모니터링을 위한 대시보드 디자인. 데이터 시각화, 알람 표시 등',
    'design/samsung-mes-dashboard.sketch',
    'sketch',
    1800000,
    '40000000-0000-0000-0000-000000000002',
    'approved',
    'active',
    7
)
ON CONFLICT (id) DO NOTHING;
