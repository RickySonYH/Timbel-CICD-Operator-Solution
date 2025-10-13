# Timbel CICD Operator Solution - 설치 완료 ✅

## 🎉 설치 완료!

Timbel CICD Operator Solution의 모든 컴포넌트가 성공적으로 설치되었습니다.

---

## 🌐 서비스 접속 정보

### 📱 애플리케이션 서비스
| 서비스 | URL | 설명 |
|--------|-----|------|
| **Frontend** | http://localhost:3000 | 운영센터 메인 UI |
| **Backend API** | http://localhost:3001 | REST API 서버 |
| **Backend Health** | http://localhost:3001/health | 헬스체크 엔드포인트 |

### 🔧 CI/CD 도구
| 서비스 | URL | 계정 정보 |
|--------|-----|-----------|
| **Jenkins** | http://localhost:8080 | 초기 admin 비밀번호는 컨테이너 로그 참조 |
| **Nexus** | http://localhost:8081 | admin / admin123 |
| **ArgoCD** | http://localhost:30080 | admin / `nWaryh-lUdLVp385` |

### 📊 모니터링
| 서비스 | URL | 계정 정보 |
|--------|-----|-----------|
| **Grafana** | http://localhost:3003 | admin / admin |
| **Prometheus** | http://localhost:9090 | 인증 없음 |

### 🗄️ 데이터베이스
| 서비스 | 접속 정보 | 계정 |
|--------|-----------|------|
| **PostgreSQL** | localhost:5432 | timbel_user / timbel_password |
| **Redis** | localhost:6379 | 인증 없음 |

### ☸️ Kubernetes
| 서비스 | 접속 정보 |
|--------|-----------|
| **Kind Cluster** | https://localhost:6443 |
| **Context** | `kind-timbel-cluster` |
| **NGINX Ingress (HTTP)** | http://localhost:8090 |
| **NGINX Ingress (HTTPS)** | https://localhost:8443 |

---

## 🚀 주요 기능

### 1. 운영센터 (Operations Center)
- **배포 자동화 워크플로우**: GitHub 레포지토리 → 빌드 → 이미지 생성 → Kubernetes 배포
- **5단계 배포 프로세스**:
  1. 배포 요청 관리
  2. 파이프라인 설정
  3. 빌드 모니터링
  4. 배포 실행
  5. 성능 모니터링

### 2. 모니터링 대시보드
- 실시간 서비스 모니터링
- 리소스 사용률 추적
- 알림 및 이벤트 관리

### 3. 인프라 관리
- 하드웨어 리소스 계산
- 인프라 설정 및 보안 관리
- 멀티테넌트 환경 지원

### 4. CI/CD 파이프라인
- Jenkins 기반 빌드 자동화
- Nexus 아티팩트 저장소
- ArgoCD GitOps 배포

---

## 📋 유용한 명령어

### Docker Compose 관리
```bash
# 모든 서비스 시작
docker-compose -f docker-compose-localhost.yml up -d

# 특정 서비스 재시작
docker-compose -f docker-compose-localhost.yml restart backend

# 로그 확인
docker-compose -f docker-compose-localhost.yml logs -f backend

# 모든 서비스 중지
docker-compose -f docker-compose-localhost.yml down
```

### Kubernetes 관리
```bash
# 클러스터 컨텍스트 전환
kubectl config use-context kind-timbel-cluster

# 모든 Pod 확인
kubectl get pods -A

# ArgoCD Pod 확인
kubectl get pods -n argocd

# Ingress Controller 확인
kubectl get pods -n ingress-nginx

# 클러스터 정보
kubectl cluster-info

# 노드 상태
kubectl get nodes
```

### ArgoCD 관리
```bash
# ArgoCD 비밀번호 확인
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# ArgoCD CLI 로그인 (선택사항)
argocd login localhost:30080 --username admin --password nWaryh-lUdLVp385 --insecure
```

### Kind 클러스터 관리
```bash
# 클러스터 목록
kind get clusters

# 클러스터 삭제
kind delete cluster --name timbel-cluster

# 클러스터 재생성
./install-kind-argocd.sh
```

---

## 🔑 기본 로그인 계정

### 운영센터 (Frontend)
- **관리자**: admin / 1q2w3e4r
- **운영팀**: operations / 1q2w3e4r
- **배포담당자**: deployer / 1q2w3e4r

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Timbel CICD Operator                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │───▶│   Backend    │───▶│  PostgreSQL  │  │
│  │  (React 18)  │    │  (Node.js)   │    │    Redis     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            CI/CD Pipeline                            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Jenkins  →  Build  →  Nexus  →  ArgoCD  →  K8s   │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        Kind Kubernetes Cluster                       │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • NGINX Ingress Controller                         │    │
│  │  • ArgoCD (GitOps)                                  │    │
│  │  • Application Deployments                          │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Monitoring & Observability                   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • Prometheus (메트릭 수집)                          │    │
│  │  • Grafana (시각화)                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 다음 단계

1. **프론트엔드 접속**: http://localhost:3000
2. **로그인**: admin / 1q2w3e4r
3. **운영센터 메뉴** 탐색
4. **GitHub 레포지토리 연결** 및 빌드/배포 테스트

---

## 🛠️ 트러블슈팅

### 서비스가 시작되지 않는 경우
```bash
# 로그 확인
docker-compose -f docker-compose-localhost.yml logs backend

# 컨테이너 재시작
docker-compose -f docker-compose-localhost.yml restart backend
```

### Kind 클러스터 문제
```bash
# 클러스터 상태 확인
kubectl get nodes

# 클러스터 재생성
kind delete cluster --name timbel-cluster
./install-kind-argocd.sh
```

### 데이터베이스 초기화
```bash
# PostgreSQL 접속
docker exec -it timbel-cicd-operator-solution-postgres-1 psql -U timbel_user -d timbel_cicd_operator

# 스키마 재생성
docker exec -it timbel-cicd-operator-solution-postgres-1 psql -U timbel_user -d timbel_cicd_operator -f /docker-entrypoint-initdb.d/operations-only-schema.sql
```

---

## 📞 문의

- **개발사**: (주)팀벨 (Timeless Label)
- **이메일**: rickyson@timbel.com
- **웹사이트**: https://timbel.com

---

**🎉 Timbel CICD Operator Solution v0.4 - 설치 완료!**

