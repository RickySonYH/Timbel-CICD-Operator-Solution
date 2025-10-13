# Timbel CICD Operator Solution v0.4

## 🚀 개요

Timbel CICD Operator Solution은 **배포 자동화 및 워크플로우 관리**에 특화된 운영센터 전용 솔루션입니다. ECP-AI K8s Orchestrator와 연동하여 엔터프라이즈급 CI/CD 파이프라인을 제공합니다.

## ✨ 주요 기능

### 🔐 JWT 토큰 기반 인증 시스템

* 안전한 토큰 기반 인증
* 운영팀 및 관리자 권한 관리
* 자동 토큰 갱신 및 세션 관리

### 🏢 운영센터 (5단계 워크플로우)

* **1단계**: 배포 요청 관리 (Deployment Request Management)
* **2단계**: 파이프라인 설정 (Pipeline Configuration)  
* **3단계**: 빌드 모니터링 (Build Monitoring)
* **4단계**: 배포 실행 (Deployment Execution)
* **5단계**: 성능 모니터링 (Performance Monitoring)

### 🎯 ECP-AI K8s Orchestrator 연동

* 실제 Kubernetes 환경 시뮬레이션
* 매니페스트 기반 가상 인스턴스 생성
* 실시간 모니터링 및 메트릭 수집
* 하드웨어 리소스 자동 계산

### 📊 실시간 모니터링 대시보드

* 서비스별 상태 모니터링
* 리소스 사용률 추적
* 알림 및 이벤트 관리
* 성능 메트릭 시각화

### 🏗️ 멀티테넌트 관리

* 테넌트별 독립적인 배포 환경
* 자동 리소스 할당 및 관리
* 환경별 설정 분리

## 🛠️ 기술 스택

### Frontend

* **React 18** - 사용자 인터페이스
* **TypeScript** - 타입 안전성
* **Material-UI** - 디자인 시스템
* **Zustand** - 상태 관리
* **React Router** - 라우팅

### Backend

* **Node.js** - 서버 런타임
* **Express.js** - 웹 프레임워크
* **PostgreSQL** - 데이터베이스
* **JWT** - 인증 토큰
* **Docker** - 컨테이너화

### DevOps

* **Docker Compose** - 개발 환경
* **ECP-AI K8s Orchestrator** - 시뮬레이터
* **Prometheus** - 모니터링
* **Grafana** - 시각화

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/RickySonYH/Timbel-CICD-Operator-Solution.git
cd Timbel-CICD-Operator-Solution
```

### 2. 개발 환경 시작

```bash
# Docker Compose로 전체 스택 실행
docker-compose up -d

# 또는 개별 서비스 실행
docker-compose up -d backend frontend
```

### 3. 서비스 접속

* **Frontend**: http://localhost:3000
* **Backend API**: http://localhost:3001
* **API 문서**: http://localhost:3001/docs

### 4. 기본 로그인 계정

* **관리자**: admin / 1q2w3e4r
* **운영팀**: operations / 1q2w3e4r
* **배포담당자**: deployer / 1q2w3e4r

## 📁 프로젝트 구조

```
Timbel-CICD-Operator-Solution/
├── frontend/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   └── operations/   # 운영센터 컴포넌트들
│   │   ├── pages/
│   │   │   └── operations/   # 운영센터 페이지들
│   │   ├── store/           # 상태 관리
│   │   └── theme/           # 테마 설정
├── backend/                  # Node.js 백엔드
│   ├── src/
│   │   ├── routes/
│   │   │   ├── operations.js # 운영센터 API 라우트
│   │   │   └── ...          # 기타 운영센터 관련 라우트
│   │   ├── services/        # 비즈니스 로직
│   │   ├── middleware/      # 미들웨어
│   │   └── database/        # 데이터베이스 스키마
├── database/                 # 데이터베이스 초기화
│   └── operations-only-schema.sql  # 운영센터 전용 스키마
└── docker-compose.yml        # Docker Compose 설정
```

## 🔧 개발 가이드

### 프론트엔드 개발

```bash
cd frontend
npm install
npm run dev
```

### 백엔드 개발

```bash
cd backend
npm install
npm run dev
```

### 데이터베이스 초기화

```bash
# PostgreSQL 컨테이너에서 스키마 실행
docker-compose exec postgres psql -U postgres -d timbel_cicd_operator -f /docker-entrypoint-initdb.d/operations-only-schema.sql
```

## 📋 API 문서

### 인증 API

* `POST /api/auth/login-jwt` - JWT 로그인
* `POST /api/auth/logout` - 로그아웃

### 운영센터 API

* `GET /api/operations/tenants` - 테넌트 목록
* `POST /api/operations/tenants` - 테넌트 생성
* `GET /api/operations/deployments-stats` - 배포 통계

### 시뮬레이터 API

* `POST /api/operations/simulator/deploy` - 매니페스트 배포
* `GET /api/operations/simulator/monitoring` - 모니터링 데이터
* `GET /api/operations/simulator/status` - 시뮬레이터 상태

## 🏷️ 버전 히스토리

### v0.4 (2025-01-20)

* 운영센터 전용 솔루션으로 분리
* 5단계 배포 워크플로우 구현
* ECP-AI K8s Orchestrator 연동
* 멀티테넌트 관리 시스템
* 실시간 모니터링 및 대시보드
* TypeScript 타입 안전성 개선
* 독립적인 데이터베이스 스키마

## 🎯 주요 특징

### 배포 자동화
- 5단계 워크플로우 기반 자동 배포
- ECP-AI K8s Orchestrator 연동
- 매니페스트 자동 생성 및 배포

### 워크플로우 관리
- 단계별 진행 상황 추적
- 실시간 상태 모니터링
- 자동 롤백 및 복구

### 멀티테넌트 지원
- 테넌트별 독립 환경
- 리소스 자동 할당
- 환경별 설정 분리

### 모니터링 및 알림
- 실시간 메트릭 수집
- 자동 알림 시스템
- 성능 분석 및 리포트

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. LICENSE 파일을 참조하세요.

## 📞 문의

* **개발사**: (주)팀벨 (Timeless Label)
* **이메일**: rickyson@timbel.com
* **웹사이트**: https://timbel.com

---

**🚀 Timbel CICD Operator Solution v0.4** - 차세대 엔터프라이즈 CI/CD 플랫폼을 위한 통합 솔루션