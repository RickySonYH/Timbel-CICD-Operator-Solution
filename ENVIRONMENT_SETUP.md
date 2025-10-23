# 🔧 Timbel CICD Operator Solution - 환경 설정 가이드

## 📋 개요

Phase 2에서 외부 CI/CD 시스템(ArgoCD, Jenkins, Nexus)과의 실제 연동을 위한 환경 변수 설정 가이드입니다.

## 🚀 빠른 시작

### 1. 환경 변수 파일 생성

```bash
# env.template을 .env로 복사
cp env.template .env

# 실제 값으로 수정
nano .env
```

### 2. 필수 설정 항목

#### 🔐 보안 설정
```env
JWT_SECRET=your_unique_jwt_secret_here_change_in_production
API_SECRET_KEY=your_api_secret_key_here
WEBHOOK_SECRET=your_webhook_secret_here
```

#### 🏗️ ArgoCD 연동
```env
ARGOCD_URL=http://argocd.langsa.ai
ARGOCD_USERNAME=admin
ARGOCD_PASSWORD=1q2w3e4r
ARGOCD_TOKEN=your_argocd_token_here
```

#### 🔨 Jenkins 연동
```env
JENKINS_URL=http://jenkins.langsa.ai:8080
JENKINS_USERNAME=admin
JENKINS_PASSWORD=1q2w3e4r
JENKINS_API_TOKEN=your_jenkins_api_token_here
```

#### 📦 Nexus Repository 연동
```env
NEXUS_URL=http://nexus.langsa.ai:8081
NEXUS_USERNAME=admin
NEXUS_PASSWORD=1q2w3e4r
NEXUS_DOCKER_REGISTRY=nexus.langsa.ai:8082
```

## 🔧 상세 설정

### ArgoCD 설정

| 환경 변수 | 기본값 | 설명 |
|-----------|--------|------|
| `ARGOCD_URL` | `http://argocd.langsa.ai` | ArgoCD 서버 URL |
| `ARGOCD_USERNAME` | `admin` | ArgoCD 사용자명 |
| `ARGOCD_PASSWORD` | `1q2w3e4r` | ArgoCD 비밀번호 |
| `ARGOCD_TOKEN` | - | ArgoCD API 토큰 (선택사항) |
| `ARGOCD_NAMESPACE` | `argocd` | ArgoCD 네임스페이스 |
| `ARGOCD_INSECURE` | `true` | HTTPS 인증서 검증 건너뛰기 |

### Jenkins 설정

| 환경 변수 | 기본값 | 설명 |
|-----------|--------|------|
| `JENKINS_URL` | `http://jenkins.langsa.ai:8080` | Jenkins 서버 URL |
| `JENKINS_USERNAME` | `admin` | Jenkins 사용자명 |
| `JENKINS_PASSWORD` | `1q2w3e4r` | Jenkins 비밀번호 |
| `JENKINS_API_TOKEN` | - | Jenkins API 토큰 |
| `JENKINS_BUILD_TIMEOUT` | `1800` | 빌드 타임아웃 (초) |

### Nexus Repository 설정

| 환경 변수 | 기본값 | 설명 |
|-----------|--------|------|
| `NEXUS_URL` | `http://nexus.langsa.ai:8081` | Nexus 서버 URL |
| `NEXUS_USERNAME` | `admin` | Nexus 사용자명 |
| `NEXUS_PASSWORD` | `1q2w3e4r` | Nexus 비밀번호 |
| `NEXUS_DOCKER_REGISTRY` | `nexus.langsa.ai:8082` | Docker Registry URL |

### Kubernetes 설정

| 환경 변수 | 기본값 | 설명 |
|-----------|--------|------|
| `KUBERNETES_NAMESPACE` | `timbel-cicd` | 기본 네임스페이스 |
| `KUBERNETES_CONTEXT` | `kind-timbel-cluster` | kubectl 컨텍스트 |

### 성능 및 리소스 설정

| 환경 변수 | 기본값 | 설명 |
|-----------|--------|------|
| `MAX_CONCURRENT_BUILDS` | `5` | 동시 빌드 최대 개수 |
| `BUILD_TIMEOUT` | `3600` | 빌드 타임아웃 (초) |
| `DEPLOYMENT_TIMEOUT` | `1800` | 배포 타임아웃 (초) |

## 🔐 보안 고려사항

### 1. 비밀번호 변경
```bash
# 기본 비밀번호 변경 필수
ARGOCD_PASSWORD=your_secure_password
JENKINS_PASSWORD=your_secure_password
NEXUS_PASSWORD=your_secure_password
```

### 2. API 토큰 사용 (권장)
```bash
# 비밀번호 대신 API 토큰 사용
ARGOCD_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JENKINS_API_TOKEN=11a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 3. 환경별 설정 분리
```bash
# 개발 환경
cp .env .env.development

# 운영 환경  
cp .env .env.production
```

## 🚀 Docker Compose 실행

### 1. 환경 변수 로드하여 실행
```bash
# .env 파일 자동 로드
docker-compose up -d

# 특정 환경 파일 사용
docker-compose --env-file .env.production up -d
```

### 2. 환경 변수 확인
```bash
# 컨테이너 환경 변수 확인
docker-compose exec backend env | grep ARGOCD
docker-compose exec backend env | grep JENKINS
docker-compose exec backend env | grep NEXUS
```

## 🧪 연결 테스트

### 1. ArgoCD 연결 테스트
```bash
curl -k -X POST "${ARGOCD_URL}/api/v1/session" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1q2w3e4r"}'
```

### 2. Jenkins 연결 테스트
```bash
curl -u admin:1q2w3e4r "${JENKINS_URL}/api/json"
```

### 3. Nexus 연결 테스트
```bash
curl -u admin:1q2w3e4r "${NEXUS_URL}/service/rest/v1/status"
```

## 🔧 트러블슈팅

### 1. 연결 실패시
- 네트워크 연결 확인
- 방화벽 설정 확인
- 인증 정보 확인

### 2. 환경 변수 로드 안됨
```bash
# Docker Compose 재시작
docker-compose down
docker-compose up -d

# 환경 변수 파일 권한 확인
chmod 600 .env
```

### 3. 로그 확인
```bash
# 백엔드 로그 확인
docker-compose logs -f backend

# 특정 서비스 연동 로그 필터링
docker-compose logs backend | grep -i argocd
docker-compose logs backend | grep -i jenkins
docker-compose logs backend | grep -i nexus
```

## 📚 다음 단계

1. ✅ **Task 2.1 완료**: 환경 변수 설정 파일 구성
2. 🔄 **Task 2.2 진행**: ArgoCD 실제 연동 구현
3. 🔄 **Task 2.3 진행**: Jenkins 실제 연동 구현
4. 🔄 **Task 2.4 진행**: Nexus 실제 연동 구현
5. 🔄 **Task 2.5 진행**: 통합 CI/CD 파이프라인 구현

## 🆘 지원

문제가 발생하면 다음을 확인하세요:
1. 환경 변수 설정 확인
2. 네트워크 연결 상태
3. 서비스 상태 및 로그
4. 인증 정보 정확성
