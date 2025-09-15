# Changelog

## [0.55.0] - 2025-01-15

### Added
- 관리자 기능 페이지 구현
  - 권한 관리 (PermissionManagement)
  - 시스템 설정 (SystemSettings)
  - 보안 설정 (SecuritySettings)
  - API 키 관리 (ApiKeyManagement)
  - 알림 설정 (NotificationSettings)
  - 로그 관리 (LogManagement)
  - 백업 및 복원 (BackupRestore)
- 지식자원 카탈로그 시스템
  - 카탈로그 대시보드
  - 도메인 관리 (DomainsPage)
  - 시스템 관리 (SystemsPage)
  - 컴포넌트 관리 (ComponentsPage)
  - API 관리 (APIsPage)
  - 리소스 관리 (ResourcesPage)
- 지식 등록 및 관리 시스템
  - 지식 대시보드 (KnowledgeDashboard)
  - 디자인 자산 등록
  - 코드/컴포넌트 등록
  - 문서/가이드 등록
- JWT 인증 시스템
  - 토큰 기반 인증
  - 자동 로그아웃 (30분 만료)
  - 권한별 접근 제어
- 통합 모니터링 센터
  - 홈 화면을 통합 모니터링으로 설정
  - Phase별 모니터링 기능
- 백엔드 API 구현
  - 관리자 API 엔드포인트
  - 지식자원 CRUD API
  - 인증 및 권한 관리 API

### Changed
- 전체 UI에서 아이콘 사용 최소화
- 네비게이션 구조 개선
- 시스템 관리 메뉴를 하단으로 이동
- 실제 데이터베이스 연동으로 목업 데이터 제거

### Fixed
- 403 Forbidden 에러 해결 (토큰 접근 방식 통일)
- API 응답 구조 파싱 오류 수정
- Docker 환경에서 프론트엔드-백엔드 통신 문제 해결

### Security
- JWT 토큰 만료 시간 30분으로 설정
- 자동 로그아웃 주기 10분으로 설정
- CORS 설정 개선

### Technical Details
- Frontend: React 18.2.0, Material-UI 5.14.20, Zustand 4.4.7
- Backend: Node.js, Express 4.18.2, PostgreSQL
- Authentication: JWT, bcrypt
- Container: Docker, Docker Compose
