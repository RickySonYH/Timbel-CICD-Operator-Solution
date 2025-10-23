# Changelog

All notable changes to Timbel CICD Operator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.60.0] - 2025-10-23 (Beta Release)

### 🎉 Major Features

#### 파이프라인 템플릿 시스템
- **데이터베이스 기반 템플릿 라이브러리 구축**
  - PostgreSQL에 10개의 실용적인 템플릿 저장
  - 실제 사용 빈도 반영 (총 1,056회)
  - Java Spring Boot, Node.js Express, React TypeScript 등
- **템플릿 관리 API**
  - `GET /api/pipeline-templates/templates` - 목록 조회 (필터링 지원)
  - `GET /api/pipeline-templates/templates/:id` - 상세 조회
  - 카테고리, 언어, 검색어 기반 필터링
- **상세 문서**
  - `PIPELINE_TEMPLATES_GUIDE.md` 추가

#### 사용자 관리 시스템 개선
- **완전한 CRUD 기능**
  - 사용자 생성, 수정, 삭제, 상태 변경
  - 역할 기반 권한 관리 (상세 보기, 편집, 삭제)
  - 사용자 등록 승인/거부 워크플로우
- **UI/UX 개선**
  - 활성/비활성 토글 스위치
  - Optimistic UI 업데이트
  - 관리자 계정 보호 기능
  - 대기 중인 승인 요청 섹션

#### 솔루션 인스턴스 관리
- **통합 CI/CD 도구 관리**
  - Jenkins, ArgoCD, Nexus, GitLab 등 16가지 도구 지원
  - 인증 정보 관리 (비밀번호 표시/숨김)
  - 연결 테스트 기능
- **동적 인스턴스 관리**
  - DB 기반 솔루션 타입 및 인스턴스
  - 실시간 상태 모니터링

#### Kubernetes 관리
- **클러스터 통합**
  - KIND 클러스터 자동 감지 및 등록
  - `kubectl` 기반 실제 Health Check
  - Namespace 목록 조회
- **Ingress & TLS 관리**
  - Ingress 규칙 생성 및 관리
  - cert-manager 통합 (Let's Encrypt)
  - 인증서 만료 모니터링

### ✨ New Features

#### Backend
- `backend/src/routes/pipeline-templates.js` - DB 기반 템플릿 API
- `backend/src/routes/solution-instances.js` - 솔루션 인스턴스 CRUD
- `backend/src/routes/ingress-management.js` - Ingress 관리
- `backend/src/routes/advanced-permissions.js` - 고급 권한 관리
- `backend/src/services/kubernetesService.js` - Kubernetes API 통합
- `backend/src/services/certificateMonitoringService.js` - TLS 모니터링
- `backend/src/utils/detect-kind-cluster.js` - KIND 자동 감지

#### Frontend
- `frontend/src/pages/operations/PipelineSettingsManager.tsx` - 통합 파이프라인 관리
- `frontend/src/components/operations/DomainSSLManager.tsx` - 도메인/SSL 관리
- `frontend/src/components/operations/SolutionInstanceManager.tsx` - 솔루션 관리
- `frontend/src/pages/admin/PermissionManagement.tsx` - 역할 관리 UI
- `frontend/src/hooks/useAdvancedPermissions.ts` - 권한 관리 훅

#### Database
- `backend/database/create_pipeline_templates.sql` - 템플릿 스키마
- `backend/database/insert_practical_templates.sql` - 실용 템플릿 데이터
- `backend/database/create_tls_certificates.sql` - TLS 인증서 테이블
- `backend/database/create_solution_tables.sql` - 솔루션 테이블

### 🔧 Improvements

#### Performance
- Optimistic UI 업데이트로 응답성 개선
- API 프록시 설정으로 CORS 이슈 해결
- DB 인덱스 최적화 (category, language, usage_count)

#### Security
- 관리자 계정 보호 (삭제/비활성화 방지)
- 비밀번호 표시/숨김 토글
- JWT 토큰 기반 인증 강화

#### UI/UX
- 토글 스위치로 직관적인 상태 변경
- 빈 상태 대신 안내 메시지 표시
- 일관된 Material-UI 디자인
- Backstage.io 스타일 유지

### 🐛 Bug Fixes

- **사용자 관리**
  - ✅ 사용자 상태 변경 404 에러 해결
  - ✅ 관리자 계정 inactive 상태 수정
  - ✅ 권한 조회 실패 (CORS) 해결
  - ✅ UI 즉시 반영 안되는 문제 해결

- **클러스터 관리**
  - ✅ Health Check 500 에러 해결
  - ✅ Namespace 조회 실패 해결
  - ✅ `is_connected` 컬럼 미존재 에러 수정

- **데이터베이스**
  - ✅ `timbel_users` 테이블 참조 수정
  - ✅ `template_config` NOT NULL 제약조건 해결
  - ✅ UNIQUE 제약조건 추가

### 📚 Documentation

- ✅ `PIPELINE_TEMPLATES_GUIDE.md` - 템플릿 라이브러리 가이드
- ✅ `CHANGELOG.md` - 변경 이력
- 기존 문서 업데이트:
  - `DATABASE_STRUCTURE.md`
  - `PRODUCTION_TRANSITION_REPORT.md`
  - `MENU_ROUTE_ANALYSIS.md`

### 🗑️ Removed

#### Deprecated Components (정리 완료)
- `frontend/src/pages/operations/IntegratedDeploymentCenter.tsx`
- `frontend/src/pages/operations/PipelineStatusDashboard.tsx`
- `frontend/src/pages/operations/PerformanceMonitoringCenter.tsx`
- `frontend/src/pages/operations/PipelineConfigCenter.tsx`
- `frontend/src/pages/operations/NexusManagement.tsx`
- `frontend/src/pages/operations/DeploymentExecutionCenter.tsx`
- `frontend/src/pages/operations/BuildMonitoringCenter.tsx`
- `backend/src/routes/deployment-requests.js`
- `backend/src/services/advancedApprovalEngine.js`

### 🔄 Database Schema Changes

```sql
-- 새 테이블
- pipeline_templates (템플릿 라이브러리)
- solution_types (솔루션 타입)
- solution_instances (솔루션 인스턴스)
- tls_certificates (TLS 인증서)
- ingress_tls_mappings (Ingress-TLS 매핑)

-- 변경사항
- pipeline_templates: template_key 제거, id(bigint) 사용
- pipeline_templates: UNIQUE 제약조건 추가 (name)
```

### 📊 Statistics

- **총 템플릿**: 11개 (사용 빈도: 1,056회)
- **지원 언어**: TypeScript, JavaScript, Python, Java, Go
- **지원 프레임워크**: React, Vue, Next.js, Express, FastAPI, Spring Boot, Django, NestJS, Gin
- **통합 도구**: Jenkins, ArgoCD, Nexus, GitLab, GitHub Actions, Harbor 등 16가지

### 🚀 Deployment

```bash
# 버전 업데이트
npm version 0.60.0

# Docker 재빌드
docker-compose down
docker-compose build
docker-compose up -d

# 데이터베이스 마이그레이션
psql -U timbel_user -d timbel_cicd_operator < backend/database/insert_practical_templates.sql
```

### 🔮 Next Steps (v0.70.0 예정)

- [ ] 모바일 템플릿 추가 (React Native, Flutter)
- [ ] DevOps 템플릿 추가 (Terraform, Ansible)
- [ ] 사용자 커스텀 템플릿 생성 기능
- [ ] 파이프라인 실행 이력 추적
- [ ] 실시간 로그 스트리밍
- [ ] 알림 시스템 통합 (Slack, Email)

---

## [0.56.0] - 2025-10-20

### Added
- 운영 대시보드 최적화
- 실시간 메트릭 수집
- 배포 모니터링 강화

### Changed
- 프론트엔드 성능 개선
- API 응답 시간 단축

---

## [0.55.0] - 2025-10-15

### Added
- 초기 CI/CD 통합 기능
- Jenkins 연동
- ArgoCD 연동
- Nexus 연동

### Changed
- UI/UX 전면 개편
- Backstage.io 스타일 적용

---

**Legend**:
- 🎉 Major Features: 주요 기능
- ✨ New Features: 새 기능
- 🔧 Improvements: 개선사항
- 🐛 Bug Fixes: 버그 수정
- 📚 Documentation: 문서
- 🗑️ Removed: 제거
- 🔄 Database: 데이터베이스 변경
- 🚀 Deployment: 배포 가이드
