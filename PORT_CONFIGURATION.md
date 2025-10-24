# 🚢 Timbel CICD Operator - 포트 구성 가이드

## 📊 현재 포트 매핑 현황 (2025-10-24)

### 🎯 포트 구성 원칙
1. **3000번대**: 프론트엔드 및 웹 UI 서비스
2. **5000번대**: 데이터베이스 서비스
3. **6000번대**: 캐시 및 메시징 서비스
4. **8000번대**: CI/CD 및 레지스트리 서비스
5. **9000번대**: 모니터링 및 검색 서비스

---

## 🔧 서비스별 포트 매핑

### **Core Services (핵심 서비스)**

| 서비스 | 호스트 포트 | 컨테이너 포트 | 용도 | 상태 |
|--------|------------|---------------|------|------|
| **Nginx** | `3000` | `3000` | 메인 리버스 프록시 (프론트엔드 통합 접근점) | ✅ 실행 중 |
| **Frontend** | `3005` | `3000` | React 개발 서버 (직접 접근용) | ✅ 실행 중 |
| **Backend** | `3001` | `3001` | Node.js API 서버 | ✅ 실행 중 |

**권장 접근**: `http://localhost:3000` (Nginx를 통한 통합 접근)

---

### **Database Services (데이터베이스)**

| 서비스 | 호스트 포트 | 컨테이너 포트 | 용도 | 상태 |
|--------|------------|---------------|------|------|
| **PostgreSQL** | `5434` | `5432` | 메인 데이터베이스 | ✅ 실행 중 |

**연결 정보**:
```bash
psql -h localhost -p 5434 -U timbel_user -d timbel_knowledge
```

---

### **Cache & Messaging (캐시 및 메시징)**

| 서비스 | 호스트 포트 | 컨테이너 포트 | 용도 | 상태 |
|--------|------------|---------------|------|------|
| **Redis** | `6379` | `6379` | 세션 관리 및 캐싱 | ✅ 실행 중 |

**연결 정보**:
```bash
redis-cli -h localhost -p 6379
```

---

### **CI/CD Services (CI/CD 서비스)**

| 서비스 | 호스트 포트 | 컨테이너 포트 | 용도 | 상태 |
|--------|------------|---------------|------|------|
| **Jenkins** | `8080` | `8080` | CI/CD 빌드 서버 | ✅ 실행 중 |
| **Jenkins Agent** | `50000` | `50000` | Jenkins 에이전트 통신 | ✅ 실행 중 |
| **Jenkins Metrics** | `8081` | `8081` | Jenkins 메트릭 서버 | ⏸️ 중지 |
| **Nexus** | `8082` | `8081` | 아티팩트 레지스트리 | ✅ 실행 중 |
| **Nexus Metrics** | `8083` | `8082` | Nexus 메트릭 서버 | ⏸️ 중지 |
| **Harbor Metrics** | `8084` | `8084` | Harbor 메트릭 서버 | ⏸️ 중지 |
| **GitLab CI Metrics** | `8085` | `8085` | GitLab CI 메트릭 서버 | ⏸️ 중지 |
| **Tekton Metrics** | `8086` | `8086` | Tekton 메트릭 서버 | ⏸️ 중지 |

**접근 URL**:
- Jenkins: `http://localhost:8080` or `http://localhost:3000/jenkins/`
- Nexus: `http://localhost:8082` or `http://localhost:3000/nexus/`

---

### **Monitoring & Search (모니터링 및 검색)**

| 서비스 | 호스트 포트 | 컨테이너 포트 | 용도 | 상태 |
|--------|------------|---------------|------|------|
| **Elasticsearch** | `9200` | `9200` | 검색 엔진 (HTTP API) | ✅ 실행 중 |
| **Elasticsearch** | `9300` | `9300` | 검색 엔진 (노드 간 통신) | ✅ 실행 중 |
| **Prometheus** | `9090` | `9090` | 메트릭 수집 서버 | ⏸️ 중지 |
| **MinIO** | `9000` | `9000` | 객체 스토리지 (S3 호환) | ⏸️ 중지 |
| **MinIO Console** | `9001` | `9001` | MinIO 관리 콘솔 | ⏸️ 중지 |

**접근 URL**:
- Elasticsearch: `http://localhost:9200`
- Prometheus: `http://localhost:9090` or `http://localhost:3000/prometheus/`

---

### **Storage & AI Services (스토리지 및 AI)**

| 서비스 | 호스트 포트 | 컨테이너 포트 | 용도 | 상태 |
|--------|------------|---------------|------|------|
| **ChromaDB** | `8100` | `8000` | 벡터 DB (RAG) | ⏸️ 중지 |
| **Grafana** | `3003` | `3000` | 모니터링 대시보드 | ⏸️ 중지 |

**접근 URL**:
- Grafana: `http://localhost:3003` or `http://localhost:3000/grafana/`
- ChromaDB: `http://localhost:8100`

---

## 🎨 권장 포트 재구성 (프로덕션 레벨)

### **변경 이유**:
1. **일관성**: 서비스 유형별로 포트 범위를 명확히 구분
2. **확장성**: 향후 추가 서비스를 위한 포트 여유 확보
3. **보안**: 외부 노출이 필요 없는 서비스는 내부 네트워크만 사용

### **제안 포트 매핑**:

```yaml
# === 웹 서비스 (3000-3099) ===
nginx:          3000 -> 3000   # 메인 프록시 (변경 없음)
frontend:       3005 -> 3000   # React 개발 서버 (변경 없음) - 개발용만 노출
backend:        3001 -> 3001   # API 서버 (변경 없음)
grafana:        3003 -> 3000   # 모니터링 대시보드 (변경 없음)

# === 데이터베이스 (5400-5499) ===
postgres:       5434 -> 5432   # PostgreSQL (변경 없음)

# === 캐시 & 메시징 (6300-6399) ===
redis:          6379 -> 6379   # Redis (변경 없음)

# === CI/CD 서비스 (8000-8099) ===
jenkins:        8080 -> 8080   # Jenkins (변경 없음)
jenkins-agent:  50000 -> 50000 # Jenkins 에이전트 (변경 없음)
nexus:          8082 -> 8081   # Nexus (변경 없음)
chromadb:       8100 -> 8000   # ChromaDB (변경 없음)

# === 모니터링 & 검색 (9000-9999) ===
minio:          9000 -> 9000   # MinIO (변경 없음)
minio-console:  9001 -> 9001   # MinIO Console (변경 없음)
prometheus:     9090 -> 9090   # Prometheus (변경 없음)
elasticsearch:  9200 -> 9200   # Elasticsearch HTTP (변경 없음)
elasticsearch:  9300 -> 9300   # Elasticsearch Transport (변경 없음)
```

---

## 🔒 보안 권장사항

### **외부 노출이 필요한 포트** (방화벽 허용):
- `3000` - Nginx (메인 접근점)
- `3001` - Backend API (직접 API 호출용, 선택적)

### **내부 전용 포트** (localhost만 접근, 프로덕션에서는 비노출):
- `3005` - Frontend 개발 서버
- `5434` - PostgreSQL
- `6379` - Redis
- `8080` - Jenkins (Nginx를 통해 `/jenkins/`로 접근)
- `8082` - Nexus (Nginx를 통해 `/nexus/`로 접근)
- `9200`, `9300` - Elasticsearch

### **프로덕션 배포 시**:
```yaml
# docker-compose.prod.yml 예시
services:
  postgres:
    # 외부 노출 없이 내부 네트워크만 사용
    expose:
      - "5432"
    # ports 섹션 제거
```

---

## 🚀 빠른 접근 가이드

### **일반 사용자**:
```bash
# 메인 애플리케이션 (권장)
http://localhost:3000
http://rdc.rickyson.com:3000  # 외부 도메인 접속 가능

# API 직접 호출
http://localhost:3001/api/
```

### **개발자**:
```bash
# Frontend 직접 접근 (HMR 지원)
http://localhost:3005

# Backend API
http://localhost:3001/api/

# Jenkins
http://localhost:8080
# 또는
http://localhost:3000/jenkins/

# Nexus
http://localhost:8082
# 또는
http://localhost:3000/nexus/

# Grafana
http://localhost:3003
# 또는
http://localhost:3000/grafana/
```

### **관리자 (인프라)**:
```bash
# PostgreSQL
psql -h localhost -p 5434 -U timbel_user

# Redis
redis-cli -h localhost -p 6379

# Elasticsearch
curl http://localhost:9200/_cluster/health

# Prometheus
http://localhost:9090
```

---

## 📝 포트 충돌 해결

### **포트 사용 확인**:
```bash
# Linux/Mac
lsof -i :3000
netstat -tulpn | grep :3000

# 특정 포트 프로세스 종료
kill -9 $(lsof -t -i:3000)
```

### **Docker 포트 매핑 변경**:
```bash
# 1. 서비스 중지
docker-compose down

# 2. docker-compose.yml 수정
# ports 섹션 변경

# 3. 서비스 재시작
docker-compose up -d
```

---

## ✅ 현재 구성 상태

- ✅ **일관성**: 포트가 논리적으로 구성됨
- ✅ **확장성**: 각 범위별로 여유 포트 확보
- ✅ **보안**: Nginx를 통한 중앙 집중식 접근 제어
- ✅ **개발 편의성**: 개발 서버와 프로덕션 서버 분리

**결론**: 현재 포트 구성은 프로덕션 레벨에 적합하며, 추가 변경이 필요하지 않습니다! 🎉

