# 🔧 컨테이너 안정성 문제 해결 방안

**작성일**: 2025-10-24  
**버전**: v1.0.0  
**문제**: 종료된 컨테이너 (minio, chromadb, argocd) 분석 및 해결

---

## 🔍 문제 분석

### 종료된 컨테이너 현황

| 컨테이너 | Exit Code | 종료 시점 | 상태 | 원인 |
|----------|-----------|-----------|------|------|
| **argocd-1** | 20 | 8일 전 | ❌ 치명적 | Kubernetes 설정 없음 |
| **minio-1** | 255 | 7시간 전 | ⚠️ 정상 종료 | 미사용 서비스 |
| **chromadb-1** | 255 | 7시간 전 | ⚠️ 정상 종료 | 미사용 서비스 (ECP-AI용) |

---

## 📋 상세 분석

### 1. ArgoCD (Exit Code 20) - 치명적 오류

**에러 메시지**:
```
level=fatal msg="invalid configuration: no configuration has been provided, 
try setting KUBERNETES_MASTER environment variable"
```

**원인**:
- ArgoCD는 Kubernetes 클러스터에 연결하려고 시도
- `KUBERNETES_MASTER` 환경 변수 또는 kubeconfig 파일 미설정
- v1.0에서 ArgoCD 기능 사용하지 않음

**영향도**: 없음 (미사용 서비스)

**해결 방법**:
1. **옵션 A (권장)**: docker-compose.yml에서 완전 제거
2. **옵션 B**: 선택적 프로파일로 분리 (`profiles: ["optional"]`)
3. **옵션 C**: Kubernetes 설정 추가 (향후 사용 시)

---

### 2. MinIO (Exit Code 255) - 정상 종료 후 재시작 실패

**로그 분석**:
```
INFO: Formatting 1st pool, 1 set(s), 1 drives per set.
API: http://172.18.0.9:9000
WebUI: http://172.18.0.9:9001
```

**원인**:
- MinIO는 정상 시작되었으나 사용되지 않음
- 시스템 재시작 또는 Docker 재시작 시 자동 재시작 실패
- `restart: unless-stopped` 설정 누락

**영향도**: 없음 (미사용 서비스)

**현재 용도**: 없음 (오브젝트 스토리지용으로 준비했으나 미구현)

---

### 3. ChromaDB (Exit Code 255) - 정상 종료 후 재시작 실패

**로그 분석**:
```
Saving data to: /data
Connect to Chroma at: http://localhost:8000
OpenTelemetry is not enabled
```

**원인**:
- ChromaDB는 정상 시작되었으나 사용되지 않음
- ECP-AI Orchestrator의 벡터 DB용으로 준비
- 현재 v1.0에서 ECP-AI 기능 미사용

**영향도**: 없음 (미사용 서비스)

**향후 계획**: ECP-AI 기능 완성 시 활성화

---

## ✅ 해결 방안

### 방안 1: 불필요한 컨테이너 제거 (권장)

**조치**:
1. 종료된 컨테이너 삭제
2. docker-compose.yml에서 미사용 서비스 제거 또는 주석 처리

**명령어**:
```bash
# 종료된 컨테이너 삭제
docker rm timbel-cicd-operator-solution-argocd-1
docker rm timbel-cicd-operator-solution-minio-1
docker rm timbel-cicd-operator-solution-chromadb-1
docker rm aicc-ops-postgres  # 이전 프로젝트 잔여 컨테이너

# 모든 종료된 컨테이너 일괄 삭제
docker container prune -f
```

**docker-compose.yml 수정**:
```yaml
# MinIO - 오브젝트 스토리지 (선택적)
# minio:
#   image: minio/minio:latest
#   profiles: ["optional"]
#   ...

# ChromaDB - 벡터 DB (ECP-AI용, 선택적)
# chromadb:
#   image: chromadb/chroma:latest
#   profiles: ["optional"]
#   ...
```

---

### 방안 2: 선택적 프로파일로 분리

**docker-compose.yml에 프로파일 추가**:
```yaml
services:
  # 핵심 서비스 (항상 실행)
  backend:
    ...
  
  frontend:
    ...

  # 선택적 서비스 (필요 시에만 실행)
  minio:
    image: minio/minio:latest
    profiles: ["storage"]  # --profile storage로 실행
    ...

  chromadb:
    image: chromadb/chroma:latest
    profiles: ["ai"]  # --profile ai로 실행
    ...
```

**실행 방법**:
```bash
# 기본 서비스만 실행
docker-compose up -d

# 스토리지 서비스 포함
docker-compose --profile storage up -d

# AI 서비스 포함
docker-compose --profile ai up -d

# 모든 서비스 실행
docker-compose --profile storage --profile ai up -d
```

---

### 방안 3: 자동 재시작 설정 추가

**현재 문제**:
- 일부 서비스에 `restart: unless-stopped` 설정 누락
- 시스템 재시작 시 자동으로 재시작되지 않음

**해결**:
```yaml
services:
  backend:
    restart: unless-stopped  # ✅ 이미 설정됨
    ...

  minio:
    restart: unless-stopped  # ⚠️ 추가 필요
    ...

  chromadb:
    restart: unless-stopped  # ⚠️ 추가 필요
    ...
```

---

## 🎯 권장 조치 (즉시 적용)

### 1단계: 불필요한 컨테이너 정리

```bash
cd /home/rickyson/CICD-OP/Timbel-CICD-Operator-Solution

# 종료된 컨테이너 삭제
docker container prune -f

# 확인
docker ps -a --filter "status=exited"
```

### 2단계: docker-compose.yml 최적화

**MinIO와 ChromaDB를 선택적 서비스로 변경**:
```yaml
  # MinIO - Object Storage (optional)
  minio:
    image: minio/minio:latest
    profiles: ["storage"]
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=timbel_access
      - MINIO_ROOT_PASSWORD=timbel_secret
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - timbel-network

  # ChromaDB - Vector Database for ECP-AI (optional)
  chromadb:
    image: chromadb/chroma:latest
    profiles: ["ai"]
    restart: unless-stopped
    ports:
      - "8100:8000"
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
    volumes:
      - chromadb_data:/chroma/chroma
    networks:
      - timbel-network
```

### 3단계: v1.0 프로덕션 환경 확인

```bash
# 핵심 서비스만 실행 (권장)
docker-compose up -d

# 실행 중인 컨테이너 확인
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
```

---

## 📊 안정성 개선 결과

### 적용 전
- ✅ 실행 중: 15개 컨테이너
- ❌ 종료됨: 4개 컨테이너
- **안정성**: 78.9% (15/19)

### 적용 후 (예상)
- ✅ 실행 중: 15개 컨테이너 (핵심 서비스)
- ❌ 종료됨: 0개
- **안정성**: 100% (15/15)

---

## 🔍 장기 모니터링 방안

### 1. Health Check 강화

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 2. 컨테이너 모니터링 스크립트

```bash
#!/bin/bash
# monitor-containers.sh

echo "=== 컨테이너 상태 점검 ==="

# 종료된 컨테이너 확인
EXITED=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | wc -l)

if [ $EXITED -gt 0 ]; then
  echo "⚠️  경고: ${EXITED}개 컨테이너가 종료되었습니다"
  docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
  
  # Slack 알림 (선택적)
  # curl -X POST $SLACK_WEBHOOK_URL ...
else
  echo "✅ 모든 컨테이너 정상 실행 중"
fi
```

### 3. Cron Job 등록

```bash
# 매 시간 컨테이너 상태 점검
0 * * * * /path/to/monitor-containers.sh >> /var/log/container-monitor.log 2>&1
```

---

## 📝 결론

### 핵심 원인
1. **ArgoCD**: Kubernetes 설정 없이 실행 시도 → 반복 실패
2. **MinIO/ChromaDB**: 정상 실행되었으나 미사용 → 시스템 리소스 낭비

### 권장 조치
1. ✅ **즉시**: 종료된 컨테이너 삭제 (`docker container prune`)
2. ✅ **단기**: docker-compose.yml에서 미사용 서비스를 프로파일로 분리
3. ✅ **장기**: 컨테이너 Health Check 및 모니터링 강화

### 안정성 평가
- **현재**: 핵심 15개 컨테이너는 **100% 안정적** ✅
- **개선**: 불필요한 컨테이너 제거로 **리소스 절약** 및 **관리 단순화**

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025-10-24  
**관련 문서**: 
- `V1.0_FINAL_SYSTEM_CHECK_REPORT.md`
- `POST_DEPLOYMENT_MONITORING_GUIDE.md`

