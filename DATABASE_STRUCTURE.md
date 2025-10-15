# 데이터베이스 구조 가이드 - Timbel CI/CD Operator

## **📊 데이터베이스 분리 구조**

### **🎯 데이터베이스 분리 원칙**

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 서버                          │
├─────────────────────────────────────────────────────────────┤
│  📚 timbel_knowledge     │  🚀 timbel_cicd_operator         │
│  (지식자원 관리)         │  (운영센터 관리)                  │
├─────────────────────────┼─────────────────────────────────┤
│  • 사용자 관리           │  • CI/CD 파이프라인              │
│  • 도메인/프로젝트/시스템│  • 클러스터 관리                 │
│  • 지식 자산             │  • 배포 관리                     │
│  • 승인 워크플로우       │  • 모니터링 & 알림               │
└─────────────────────────┴─────────────────────────────────┘
```

---

## **📚 timbel_knowledge 데이터베이스**

### **🔐 사용자 관리**
- **timbel_users**: 전체 사용자 계정 (admin, operator, user)
- **user_sessions**: 로그인 세션 관리

### **🏢 지식자원 카탈로그**
- **domains**: 영업처 정보
- **projects**: 프로젝트 정보
- **systems**: 시스템 정보
- **components**: 코드 컴포넌트
- **knowledge_assets**: 지식 자산
- **apis**: API 정보

### **📋 프로젝트 관련**
- **project_documents**: 프로젝트 문서
- **project_similar_systems**: 유사 시스템
- **project_work_groups**: 작업 그룹
- **project_git_analytics**: Git 분석 데이터

### **✅ 승인 관리**
- **approval_workflows**: 승인 워크플로우

---

## **🚀 timbel_cicd_operator 데이터베이스**

### **🔄 CI/CD 파이프라인**
- **jenkins_jobs**: Jenkins 작업 관리
- **nexus_image_pushes**: Nexus 이미지 푸시 이력
- **nexus_tag_operations**: Nexus 태그 작업
- **argocd_applications**: Argo CD 애플리케이션
- **argocd_sync_operations**: Argo CD 동기화 작업
- **argocd_promotions**: Argo CD 프로모션
- **github_webhooks**: GitHub 웹훅 설정

### **☸️ 클러스터 관리**
- **kubernetes_clusters**: Kubernetes 클러스터 정보
- **cluster_namespaces**: 클러스터 네임스페이스
- **cluster_deployments**: 클러스터 배포 이력

### **📊 모니터링 & 알림**
- **prometheus_metrics_collection**: Prometheus 메트릭
- **prometheus_alert_rules**: Prometheus 알림 규칙
- **prometheus_alerts**: Prometheus 알림
- **sla_calculations**: SLA 계산 결과
- **sla_metrics**: SLA 메트릭
- **sla_alerts**: SLA 알림
- **monitored_servers**: 모니터링 서버 목록
- **monitoring_configurations**: 모니터링 설정

### **🚀 배포 관리**
- **operations_deployments**: 배포 작업 이력
- **operations_pipelines**: 운영 파이프라인
- **operations_build_history**: 빌드 히스토리
- **operations_alerts**: 운영 알림
- **operations_infrastructures**: 인프라 관리
- **operations_infrastructure_nodes**: 인프라 노드
- **operations_tenants**: 테넌트 관리
- **operations_tenant_services**: 테넌트 서비스
- **operations_service_monitoring**: 서비스 모니터링
- **pipeline_template_applications**: 파이프라인 템플릿

### **🐛 이슈 관리**
- **issues**: 이슈 관리
- **issue_history**: 이슈 히스토리
- **issue_notifications**: 이슈 알림

### **📝 로깅**
- **cicd_pipeline_logs**: CI/CD 파이프라인 로그

---

## **🔗 백엔드 API 라우팅 구조**

### **📚 지식자원 관련 API** (`timbel_knowledge` DB 사용)
```javascript
// backend/src/routes/knowledge.js
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/auth', require('./routes/auth')); // 사용자 인증

// 접속 DB: timbel_knowledge
// 테이블: timbel_users, domains, projects, systems, components, etc.
```

### **🚀 운영센터 관련 API** (`timbel_cicd_operator` DB 사용)
```javascript
// backend/src/routes/
app.use('/api/jenkins', require('./routes/jenkins-automation'));
app.use('/api/nexus', require('./routes/nexus-integration'));
app.use('/api/argocd', require('./routes/argocd-integration'));
app.use('/api/prometheus', require('./routes/prometheus-integration'));
app.use('/api/issues', require('./routes/issues-management'));
app.use('/api/clusters', require('./routes/cluster-management'));
app.use('/api/operations', require('./routes/operations-dashboard'));

// 접속 DB: timbel_cicd_operator
// 테이블: jenkins_jobs, nexus_*, argocd_*, kubernetes_clusters, etc.
```

---

## **⚠️ 주의사항 및 해결 방안**

### **🔄 Cross-Database 조인 문제**
**문제**: 서로 다른 DB의 테이블을 조인할 수 없음
```sql
-- ❌ 불가능
SELECT p.name, od.status 
FROM timbel_knowledge.projects p 
JOIN timbel_cicd_operator.operations_deployments od ON p.id = od.project_id
```

**해결 방안**:
```javascript
// ✅ 애플리케이션 레벨에서 데이터 통합
const [projectsRes, deploymentsRes] = await Promise.all([
  knowledgeDB.query('SELECT * FROM projects'),
  operationsDB.query('SELECT * FROM operations_deployments')
]);

// 메모리에서 조인
const integratedData = projects.map(project => ({
  ...project,
  deployment: deployments.find(d => d.project_name === project.name)
}));
```

### **🔐 인증 문제 해결**
**문제**: 사용자 테이블이 `timbel_knowledge` DB에 있음
```javascript
// ✅ auth.js에서 올바른 DB 연결 확인
const knowledgePool = new Pool({
  database: 'timbel_knowledge'  // 사용자 인증용
});

const operationsPool = new Pool({
  database: 'timbel_cicd_operator'  // 운영센터용
});
```

### **📊 통계 API 통합**
```javascript
// ✅ 대시보드에서 두 DB 데이터 통합
const loadExecutiveMetrics = async () => {
  const [knowledgeStats, operationsStats, clusterStats] = await Promise.all([
    fetch('/api/knowledge/catalog-stats'),    // timbel_knowledge
    fetch('/api/operations/dashboard-stats'), // timbel_cicd_operator  
    fetch('/api/clusters/clusters/statistics') // timbel_cicd_operator
  ]);
};
```

---

## **🛠️ 향후 개발 가이드라인**

### **1. 새 기능 추가 시 DB 선택 기준**

#### **📚 timbel_knowledge에 추가해야 하는 경우:**
- ✅ 사용자/권한 관련
- ✅ 도메인/프로젝트/시스템 정보
- ✅ 지식 자산 (코드, 문서, 디자인)
- ✅ 승인 워크플로우

#### **🚀 timbel_cicd_operator에 추가해야 하는 경우:**
- ✅ CI/CD 파이프라인 관련
- ✅ 클러스터/배포 관련
- ✅ 모니터링/알림 관련
- ✅ 운영 로그/이벤트

### **2. API 라우트 명명 규칙**

```javascript
// 지식자원 관련
/api/knowledge/*     → timbel_knowledge DB
/api/auth/*          → timbel_knowledge DB (timbel_users)

// 운영센터 관련  
/api/jenkins/*       → timbel_cicd_operator DB
/api/nexus/*         → timbel_cicd_operator DB
/api/argocd/*        → timbel_cicd_operator DB
/api/clusters/*      → timbel_cicd_operator DB
/api/operations/*    → timbel_cicd_operator DB
/api/prometheus/*    → timbel_cicd_operator DB
/api/issues/*        → timbel_cicd_operator DB
```

### **3. 데이터 통합 패턴**

```javascript
// ✅ 권장 패턴: 병렬 조회 후 애플리케이션 레벨 통합
const loadIntegratedData = async () => {
  const [knowledgeData, operationsData] = await Promise.all([
    fetchFromKnowledgeDB(),
    fetchFromOperationsDB()
  ]);
  
  return mergeData(knowledgeData, operationsData);
};
```

### **4. 환경 변수 설정**

```javascript
// backend/src/config/database.js
const knowledgePool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_knowledge',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password'
});

const operationsPool = new Pool({
  host: process.env.DB_HOST || 'postgres', 
  database: 'timbel_cicd_operator',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password'
});
```

---

## **🔧 현재 백엔드 라우트 수정 필요사항**

### **인증 관련 수정 필요:**
```javascript
// backend/src/routes/auth.js
// ❌ 현재: 잘못된 DB 참조
// ✅ 수정 필요: timbel_knowledge DB의 timbel_users 테이블 사용
```

### **크로스 DB 조회가 필요한 API:**
```javascript
// backend/src/routes/operations-dashboard.js
// 프로젝트 정보(knowledge) + 배포 현황(operations) 통합 필요

// backend/src/routes/executive-dashboard.js  
// 모든 DB 통계 통합 필요
```

---

## **📋 즉시 수정 필요한 항목**

1. **인증 API**: `timbel_users` 테이블 참조 수정
2. **대시보드 API**: Cross-DB 데이터 통합 로직 추가  
3. **환경 설정**: DB 연결 풀 분리
4. **에러 핸들링**: DB별 에러 처리 분리

---

## **✅ 향후 개발 체크리스트**

새 기능 개발 시 다음을 확인하세요:

- [ ] 어느 DB에 저장할지 결정 (지식자원 vs 운영센터)
- [ ] 올바른 DB 연결 풀 사용
- [ ] Cross-DB 조회 필요 시 애플리케이션 레벨 통합
- [ ] API 라우트 명명 규칙 준수
- [ ] 테이블명 중복 방지 (두 DB 모두 확인)

이 문서를 참고하여 향후 개발하시면 혼란을 방지할 수 있습니다! 🎯
