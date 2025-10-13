# Timbel CICD Operator Solution v0.8

## 🚀 개요

**Timbel CICD Operator Solution**은 엔터프라이즈급 CI/CD 파이프라인 관리 및 운영 자동화 플랫폼입니다. Jenkins, Nexus, Argo CD를 통합하여 GitHub 레포지토리부터 Kubernetes 배포까지 전체 프로세스를 자동화합니다.

## ✨ v0.8 주요 기능

### 📦 배포 관리 (Deployment Management)

- **배포 요청 처리**: 관리자 요청 승인/거부 및 5단계 자동 진행
- **레포지토리 직접 배포**: GitHub URL 입력으로 즉시 배포 (운영팀 전용)
- **배포 히스토리**: 전체 배포 기록 조회 및 롤백 관리

### 🔧 CI/CD 파이프라인 (Pipeline Management)

- **파이프라인 현황**: Jenkins + Nexus + Argo CD 통합 대시보드
- **파이프라인 구성**: Job 템플릿, 빌드/배포 설정
- **인프라 서버 관리**: CI/CD 서버 설정 및 모니터링

### 📊 모니터링 & 이슈 (Monitoring & Issues)

- **종합 모니터링**: Prometheus 메트릭, SLA 대시보드, 실시간 알림
- **이슈 관리**: 빌드/배포/성능 이슈 자동 추적 및 관리

### 🤖 AI 지원 도구 (AI-Powered Tools)

- **AI 하드웨어 계산기**: ECP-AI 75채널 기반 리소스 자동 계산 및 비용 추정

### 📚 지식자원 카탈로그 (Knowledge Catalog)

- **도메인 관리**: 영업처(도메인) 기반 프로젝트 관리
- **프로젝트 관리**: VoC, 요구사양서 포함 완전한 프로젝트 생성
- **시스템 관리**: 레포지토리 중심 시스템 등록 및 배포 준비도 추적
- **코드/디자인/문서**: 자동 추출 및 카탈로그 등록

### 🔒 보안 & 성능

- **Rate Limiting**: API 호출 제한 (인증 5회/15분, 일반 100회/15분)
- **입력 검증**: XSS 방지, 데이터 마스킹
- **요청 로깅**: 모든 API 호출 추적 및 감사
- **DB 최적화**: 8개 인덱스, 쿼리 최적화
- **API 압축**: Gzip 압축으로 응답 속도 50% 개선

## 🛠️ 기술 스택

### Frontend
- **React 18** - 사용자 인터페이스
- **TypeScript** - 타입 안전성
- **Material-UI v5** - Backstage.io 스타일 디자인
- **Zustand** - 경량 상태 관리
- **React Router v6** - 라우팅

### Backend
- **Node.js 18** - 서버 런타임
- **Express.js 4** - 웹 프레임워크
- **PostgreSQL 15** - 관계형 데이터베이스
- **JWT** - 토큰 기반 인증
- **Compression** - API 응답 압축
- **Helmet** - 보안 강화

### CI/CD Infrastructure
- **Jenkins LTS** (jenkins/jenkins:lts-jdk17) - 빌드 자동화
- **Nexus 3** (sonatype/nexus3:latest) - Docker 레지스트리
- **Argo CD** - GitOps 기반 배포
- **Kubernetes** (Kind v1.27.3) - 컨테이너 오케스트레이션

### Monitoring & Observability
- **Prometheus** - 메트릭 수집
- **Grafana** - 시각화 대시보드
- **Redis** - 캐싱 및 세션 저장
- **Elasticsearch** - 로그 수집 및 검색

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/RickySonYH/Timbel-CICD-Operator-Solution.git
cd Timbel-CICD-Operator-Solution
```

### 2. 전체 스택 실행

```bash
# Docker Compose로 모든 서비스 실행
docker-compose up -d

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f backend frontend
```

### 3. 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| **Frontend** | http://localhost:3000 | 메인 웹 인터페이스 |
| **Backend API** | http://localhost:3001 | REST API 서버 |
| **Jenkins** | http://localhost:8080 | CI 빌드 서버 |
| **Nexus** | http://localhost:8081 | Docker 레지스트리 |
| **Prometheus** | http://localhost:9090 | 메트릭 수집 |
| **Grafana** | http://localhost:3003 | 모니터링 대시보드 |
| **PostgreSQL** | localhost:5434 | 데이터베이스 |

### 4. 기본 로그인 계정

| 역할 | 아이디 | 비밀번호 |
|------|--------|----------|
| **관리자** | admin | 1q2w3e4r |
| **운영팀** | operations | 1q2w3e4r |
| **배포담당자** | deployer | 1q2w3e4r |

## 📁 프로젝트 구조

```
Timbel-CICD-Operator-Solution/
├── frontend/                           # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                # BackstageLayout (메뉴 구조)
│   │   │   └── auth/                  # 인증 컴포넌트
│   │   ├── pages/
│   │   │   ├── operations/            # 운영센터 페이지들
│   │   │   │   ├── OperationsDashboard.tsx          # 운영 센터 메인
│   │   │   │   ├── PipelineStatusDashboard.tsx      # 파이프라인 현황 (통합)
│   │   │   │   ├── DeploymentRequestManagement.tsx  # 배포 요청 처리
│   │   │   │   ├── DeploymentHistory.tsx            # 배포 히스토리
│   │   │   │   ├── RepositoryDeployment.tsx         # 레포지토리 직접 배포
│   │   │   │   ├── ComprehensiveMonitoring.tsx      # 종합 모니터링
│   │   │   │   ├── ComprehensiveIssuesManagement.tsx # 이슈 관리
│   │   │   │   └── AIHardwareCalculator.tsx         # AI 하드웨어 계산기
│   │   │   ├── knowledge/             # 지식자원 카탈로그
│   │   │   ├── executive/             # 최고 관리자 대시보드
│   │   │   └── admin/                 # 시스템 관리
│   │   ├── store/                     # Zustand 상태 관리
│   │   ├── theme/                     # Backstage.io 스타일 테마
│   │   └── utils/                     # 성능 최적화 유틸리티
│   └── package.json
│
├── backend/                            # Node.js 백엔드
│   ├── src/
│   │   ├── routes/
│   │   │   ├── jenkins-automation.js          # Jenkins Job 생성/관리
│   │   │   ├── nexus-integration.js           # Nexus 이미지 관리
│   │   │   ├── argocd-integration.js          # Argo CD 배포
│   │   │   ├── prometheus-integration.js      # Prometheus 모니터링
│   │   │   ├── deployment-management.js       # 배포 요청/히스토리
│   │   │   ├── issues-management.js           # 이슈 관리
│   │   │   ├── pipeline-templates.js          # 파이프라인 템플릿
│   │   │   ├── knowledge.js                   # 지식자원 카탈로그
│   │   │   └── operations-dashboard.js        # 운영 대시보드
│   │   ├── middleware/
│   │   │   ├── jwtAuth.js                     # JWT 인증
│   │   │   ├── sessionAuth.js                 # 세션 인증
│   │   │   └── securityEnhancement.js         # 보안 강화
│   │   └── index.js                           # 메인 서버
│   └── package.json
│
├── database/                           # 데이터베이스
│   └── operations-only-schema.sql     # 운영센터 전용 스키마
│
├── k8s/                                # Kubernetes 매니페스트
│   ├── ingress/                       # Nginx Ingress 설정
│   └── services.yaml                  # 서비스 정의
│
├── monitoring/                         # 모니터링 설정
│   └── prometheus.yml                 # Prometheus 설정
│
└── docker-compose.yml                  # Docker Compose 설정
```

## 🎯 주요 워크플로우

### 배포 프로세스

```
1. GitHub 레포지토리 입력
   ↓
2. 자동 분석 (언어, 프레임워크, Dockerfile, K8s 매니페스트)
   ↓
3. Jenkins Job 생성 및 빌드
   ↓
4. Docker 이미지 빌드 → Nexus 레지스트리 푸시
   ↓
5. Argo CD 애플리케이션 생성 및 배포
   ↓
6. Kubernetes 클러스터에 배포
   ↓
7. Prometheus 모니터링 시작
```

### 배포 요청 워크플로우

```
관리자: 배포 요청 작성
   ↓
운영팀: 요청 검토 및 승인/거부
   ↓
시스템: 5단계 자동 진행
   - 1단계: 레포지토리 분석
   - 2단계: Jenkins Job 생성
   - 3단계: Docker 빌드 & Nexus 푸시
   - 4단계: Argo CD 애플리케이션 생성
   - 5단계: Kubernetes 배포
   ↓
완료: 배포 결과 확인 및 모니터링
```

## 📋 API 엔드포인트

### 인증 API
- `POST /api/auth/login-jwt` - JWT 로그인
- `POST /api/auth/logout` - 로그아웃

### 배포 관리 API
- `GET /api/operations/deployment-requests` - 배포 요청 목록
- `POST /api/operations/deployment-requests/:id/approve` - 배포 요청 승인
- `POST /api/operations/deployment-requests/:id/reject` - 배포 요청 거부
- `GET /api/operations/deployment-history` - 배포 히스토리
- `POST /api/operations/deployments/:id/rollback` - 배포 롤백

### Jenkins API
- `GET /api/jenkins/jobs` - Jenkins Job 목록
- `POST /api/jenkins/create-job` - Jenkins Job 생성
- `POST /api/jenkins/setup-webhook` - GitHub Webhook 설정

### Nexus API
- `GET /api/nexus/repositories` - Nexus 레포지토리 목록
- `POST /api/nexus/push-image` - Docker 이미지 푸시 기록
- `GET /api/nexus/push-history` - 이미지 푸시 히스토리

### Argo CD API
- `GET /api/argocd/applications` - Argo CD 애플리케이션 목록
- `POST /api/argocd/applications` - 애플리케이션 생성
- `POST /api/argocd/applications/:id/sync` - 동기화 실행
- `POST /api/argocd/applications/:id/promote` - 환경 프로모션

### 모니터링 API
- `GET /api/prometheus/metrics` - Prometheus 메트릭 수집
- `POST /api/prometheus/calculate-sla` - SLA 계산
- `GET /api/prometheus/alert-rules` - 알림 규칙 목록
- `GET /api/prometheus/active-alerts` - 활성 알림

### 이슈 관리 API
- `GET /api/issues/list` - 이슈 목록
- `POST /api/issues/create` - 이슈 생성
- `PUT /api/issues/:id/status` - 이슈 상태 업데이트
- `POST /api/issues/:id/comments` - 댓글 추가

### 지식자원 API
- `GET /api/knowledge/domains` - 도메인(영업처) 목록
- `GET /api/knowledge/projects` - 프로젝트 목록
- `GET /api/knowledge/systems` - 시스템 목록
- `POST /api/knowledge/systems/:id/update-repo-info` - 레포지토리 정보 업데이트

## 🏷️ 버전 히스토리

### v0.8 (2025-10-13) - 운영센터 메뉴 재구성 및 프로세스 최적화

**주요 변경사항:**
- ✅ 프로세스 기반 메뉴 재구성 (4개 그룹 + 10개 메뉴)
- ✅ 파이프라인 현황 통합 대시보드 (Jenkins + Nexus + Argo CD)
- ✅ 배포 요청 처리 시스템 구현
- ✅ 배포 히스토리 및 롤백 관리
- ✅ 성능 최적화 (DB 인덱스 8개, API 압축/캐싱)
- ✅ 보안 강화 (Rate Limiting, 입력 검증, 요청 로깅)
- ✅ 모든 런타임 오류 수정
- ✅ 목데이터 제거 및 친절한 가이드 추가
- ✅ 아이콘 완전 제거, 텍스트 기반 깔끔한 UI

**통계:**
- 파일 변경: 240개
- 코드 추가: 22,326 줄
- 코드 삭제: 106,261 줄
- 순 변경: -83,935 줄 (대규모 코드 정리)

### v0.57 (2025-10-12)
- 통합 배포 실행 센터 완성
- GitHub CI/CD 파이프라인 연동

### v0.5 ~ v0.56
- 초기 운영센터 구현
- 기본 CI/CD 파이프라인

## 🏗️ 아키텍처

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 (관리자/운영팀)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Frontend (React + Material-UI)              │
│         http://localhost:3000 (Nginx Proxy)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│           Backend API (Node.js + Express)                │
│              http://localhost:3001                       │
├─────────────────────────────────────────────────────────┤
│  • JWT 인증 & 권한 관리                                  │
│  • Rate Limiting & 입력 검증                             │
│  • API 압축 & 캐싱                                       │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
         ↓          ↓          ↓          ↓
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Jenkins │ │ Nexus  │ │Argo CD │ │  K8s   │
    │  :8080 │ │  :8081 │ │(GitOps)│ │ :6443  │
    └────────┘ └────────┘ └────────┘ └────────┘
         │          │          │          │
         └──────────┴──────────┴──────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │  Prometheus + Grafana │
         │  실시간 모니터링       │
         └───────────────────────┘
```

### 데이터 흐름

```
GitHub Repository
    ↓ (Webhook)
Jenkins Build
    ↓ (Docker Build)
Nexus Registry
    ↓ (GitOps)
Argo CD
    ↓ (Deploy)
Kubernetes
    ↓ (Metrics)
Prometheus → Grafana
```

## 📊 실제 운영 데이터

### Jenkins Jobs
- **총 4개 Job 생성**
- **시스템**: ECP-AI K8s Orchestrator
- **레포지토리**: https://github.com/RickySonYH/ecp-ai-k8s-orchestrator

### Nexus Images
- **총 6개 이미지 푸시**
- **총 용량**: 1.83GB
- **최신 이미지**: ecp-ai-final:v3.0.0 (117MB)
- **Jenkins 연동**: 빌드 번호 #200, #124, #123

### Argo CD Applications
- **총 6개 애플리케이션 배포**
- **환경별 분포**:
  - Development: 3개 (ecp-ai-dev 네임스페이스)
  - Staging: 1개 (ecp-ai-stg 네임스페이스)
  - Production: 2개 (ecp-ai-final-production, timbel-prod)

## 🔧 개발 가이드

### 로컬 개발 환경

```bash
# 프론트엔드 개발
cd frontend
npm install
npm run dev  # http://localhost:3005

# 백엔드 개발
cd backend
npm install
npm run dev  # http://localhost:3001
```

### 데이터베이스 초기화

```bash
# PostgreSQL 컨테이너 접속
docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator

# 스키마 확인
\dt

# 데이터 확인
SELECT * FROM jenkins_jobs;
SELECT * FROM nexus_image_pushes;
SELECT * FROM argocd_applications;
```

### 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
# 데이터베이스
DB_HOST=postgres
DB_PORT=5432
DB_NAME=timbel_cicd_operator
DB_USER=timbel_user
DB_PASSWORD=timbel_password

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# API 키 (선택사항)
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key

# 서버 설정
PORT=3001
NODE_ENV=development
```

## 🧪 테스트

### 프론트엔드 테스트

```bash
cd frontend
npm run test
```

### 백엔드 API 테스트

```bash
# 로그인 테스트
curl -X POST http://localhost:3001/api/auth/login-jwt \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1q2w3e4r"}'

# Jenkins Job 조회 테스트
curl http://localhost:3001/api/jenkins/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 성능 지표

### API 응답 속도
- **첫 호출**: ~143ms
- **캐시 후**: ~30-60ms (50% 개선)

### 데이터베이스
- **인덱스**: 8개 (성능 최적화)
- **쿼리 최적화**: ANALYZE 적용

### 보안
- **Rate Limiting**: 
  - 인증 API: 5회/15분
  - 일반 API: 100회/15분
- **입력 검증**: XSS 방지, 데이터 마스킹
- **요청 로깅**: 모든 API 호출 추적

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

- **개발사**: (주)팀벨 (Timeless Label)
- **개발자**: RickySon
- **GitHub**: https://github.com/RickySonYH/Timbel-CICD-Operator-Solution
- **이메일**: rickyson@timbel.com

---

**🎉 Timbel CICD Operator Solution v0.8** - 완성도 높은 엔터프라이즈급 CI/CD 플랫폼

**프로세스 기반 메뉴, Jenkins+Nexus+Argo CD 통합, AI 하드웨어 자동 계산, 완벽한 보안 & 성능 최적화!**
