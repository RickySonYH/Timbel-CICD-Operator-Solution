# Timbel Knowledge Platform v0.4

## 🚀 개요

Timbel Knowledge Platform은 AI 기반 개발 생산성 향상을 위한 멀티테넌트 지식자원 플랫폼입니다. ECP-AI K8s Orchestrator와 연동하여 엔터프라이즈급 운영 센터를 제공합니다.

## ✨ 주요 기능

### 🔐 JWT 토큰 기반 인증 시스템
- 안전한 토큰 기반 인증
- 역할별 권한 관리 (PO, PE, QA, 운영팀, 관리자, 임원)
- 자동 토큰 갱신 및 세션 관리

### 🏢 운영 센터
- 테넌트별 독립적인 AI 서비스 환경
- 8개 기본 서비스 지원:
  - 📞 콜봇 (Callbot)
  - 💬 챗봇 (Chatbot) 
  - 👨‍💼 어드바이저 (Advisor)
  - 🎤 STT (Speech-to-Text)
  - 🔊 TTS (Text-to-Speech)
  - 📊 TA (Text Analytics)
  - ✅ QA (Question Answering)
  - 🔧 공통 서비스 (Common)

### 🎯 ECP-AI K8s Orchestrator 시뮬레이터 연동
- 실제 Kubernetes 환경 시뮬레이션
- 매니페스트 기반 가상 인스턴스 생성
- 실시간 모니터링 및 메트릭 수집
- 하드웨어 리소스 자동 계산

### 📊 실시간 모니터링 대시보드
- 서비스별 상태 모니터링
- 리소스 사용률 추적
- 알림 및 이벤트 관리
- 성능 메트릭 시각화

## 🛠️ 기술 스택

### Frontend
- **React 18** - 사용자 인터페이스
- **TypeScript** - 타입 안전성
- **Material-UI** - 디자인 시스템
- **Zustand** - 상태 관리
- **React Router** - 라우팅

### Backend
- **Node.js** - 서버 런타임
- **Express.js** - 웹 프레임워크
- **PostgreSQL** - 데이터베이스
- **JWT** - 인증 토큰
- **Docker** - 컨테이너화

### DevOps
- **Docker Compose** - 개발 환경
- **ECP-AI K8s Orchestrator** - 시뮬레이터
- **Prometheus** - 모니터링
- **Grafana** - 시각화

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone https://github.com/RickySonYH/Timbel-Knowledge-Dev.git
cd Timbel-Knowledge-Dev
```

### 2. 개발 환경 시작
```bash
# Docker Compose로 전체 스택 실행
docker-compose up -d

# 또는 개별 서비스 실행
docker-compose up -d backend frontend
```

### 3. 서비스 접속
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API 문서**: http://localhost:3001/docs

### 4. 기본 로그인 계정
- **관리자**: admin / 1q2w3e4r
- **운영팀**: opuser / 1q2w3e4r
- **PO**: pouser / 1q2w3e4r
- **PE**: peuser / 1q2w3e4r
- **QA**: qauser / 1q2w3e4r
- **임원**: executive / 1q2w3e4r

## 📁 프로젝트 구조

```
Timbel-Knowledge-Dev/
├── frontend/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/       # 재사용 가능한 컴포넌트
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── store/           # 상태 관리
│   │   └── theme/           # 테마 설정
├── backend/                  # Node.js 백엔드
│   ├── src/
│   │   ├── routes/          # API 라우트
│   │   ├── services/        # 비즈니스 로직
│   │   ├── middleware/      # 미들웨어
│   │   └── database/        # 데이터베이스 스키마
├── database/                 # 데이터베이스 초기화
├── monitoring/               # 모니터링 설정
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
docker-compose exec postgres psql -U postgres -d timbel_platform -f /docker-entrypoint-initdb.d/01-init.sql
```

## 📋 API 문서

### 인증 API
- `POST /api/auth/login-jwt` - JWT 로그인
- `POST /api/auth/logout` - 로그아웃

### 운영 센터 API
- `GET /api/operations/tenants` - 테넌트 목록
- `POST /api/operations/tenants` - 테넌트 생성
- `GET /api/operations/deployments-stats` - 배포 통계

### 시뮬레이터 API
- `POST /api/simulator/deploy` - 매니페스트 배포
- `GET /api/simulator/monitoring` - 모니터링 데이터
- `GET /api/simulator/status` - 시뮬레이터 상태

## 🏷️ 버전 히스토리

### v0.4 (2024-01-20)
- JWT 토큰 기반 인증 시스템 구축
- ECP-AI K8s Orchestrator 시뮬레이터 연동
- 운영 센터 시스템
- 8개 기본 서비스 지원
- 실시간 모니터링 및 대시보드
- TypeScript 타입 안전성 개선
- 런타임 오류 수정 완료

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. LICENSE 파일을 참조하세요.

## 📞 문의

- **개발사**: (주)팀벨 (Timeless Label)
- **이메일**: rickyson@timbel.com
- **웹사이트**: https://timbel.com

---

**🚀 Timbel Knowledge Platform v0.4** - 차세대 엔터프라이즈 AI 플랫폼을 위한 통합 솔루션
