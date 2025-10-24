# 📊 Timbel CICD Operator v1.0.0 - 배포 후 모니터링 가이드

**버전**: v1.0.0  
**작성일**: 2025-10-24  
**대상**: 운영팀, DevOps 엔지니어

---

## 🎯 배포 후 첫 24시간 체크리스트

### ⏰ 배포 직후 (0-1시간)

- [ ] **모든 컨테이너 상태 확인**
  ```bash
  docker-compose ps
  ```
  - 15개 컨테이너 모두 "Up" 상태 확인
  - Health check "healthy" 확인 (backend, frontend, postgres, redis, elasticsearch)

- [ ] **핵심 서비스 Health Check**
  ```bash
  # Backend
  curl http://localhost:3001/health
  
  # Frontend
  curl http://localhost:3000
  
  # Prometheus
  curl http://localhost:9090/-/healthy
  
  # PostgreSQL
  docker exec timbel-cicd-operator-solution-postgres-1 pg_isready -U timbel_user
  ```

- [ ] **주요 API 응답 시간 측정**
  ```bash
  # 로그인 API
  time curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"1q2w3e4r"}'
  
  # Executive Dashboard
  time curl http://localhost:3001/api/knowledge/catalog-stats \
    -H "Authorization: Bearer $TOKEN"
  ```
  - **목표**: 모든 API 응답 < 100ms

- [ ] **데이터베이스 연결 확인**
  ```bash
  docker exec timbel-cicd-operator-solution-postgres-1 psql -U timbel_user -l
  ```

### ⏰ 배포 후 1-6시간

- [ ] **Prometheus 메트릭 수집 상태**
  ```bash
  # Prometheus 타겟 확인
  curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
  ```
  - backend, jenkins, gitlab-ci, harbor: "up" 확인

- [ ] **SLA 메트릭 모니터링**
  - Grafana 대시보드 접속: `http://localhost:3003`
  - SLA Grade 확인
  - Response Time P95 < 1초 확인

- [ ] **에러 로그 모니터링**
  ```bash
  # Backend 에러 로그
  docker-compose logs backend --tail=100 | grep -i "error"
  
  # Nginx 에러 로그
  docker-compose logs nginx --tail=100 | grep -i "error"
  ```

- [ ] **리소스 사용량 확인**
  ```bash
  # 컨테이너별 리소스 사용량
  docker stats --no-stream
  ```
  - CPU 사용량 < 80%
  - 메모리 사용량 < 80%

### ⏰ 배포 후 6-24시간

- [ ] **장기 안정성 모니터링**
  - 메모리 누수 체크
  - CPU 사용량 추이 확인
  - 디스크 사용량 증가율 확인

- [ ] **사용자 피드백 수집**
  - 로그인 성공/실패 비율
  - API 응답 시간 추이
  - 에러 발생 빈도

- [ ] **데이터베이스 백업 확인**
  ```bash
  # 백업 파일 확인
  ls -lh /path/to/backups/
  ```

---

## 📈 주요 모니터링 지표

### 1. 시스템 Health

| 지표 | 정상 범위 | 경고 임계값 | 위험 임계값 |
|------|-----------|-------------|-------------|
| CPU 사용률 | < 70% | 70-85% | > 85% |
| 메모리 사용률 | < 70% | 70-85% | > 85% |
| 디스크 사용률 | < 80% | 80-90% | > 90% |
| 컨테이너 가동률 | 100% | 93-99% | < 93% |

### 2. API 성능

| API | 목표 응답 시간 | 경고 임계값 | 위험 임계값 |
|-----|---------------|-------------|-------------|
| 인증 API | < 50ms | 50-100ms | > 100ms |
| 카탈로그 통계 | < 50ms | 50-100ms | > 100ms |
| Prometheus SLA | < 100ms | 100-200ms | > 200ms |
| 프로젝트 목록 | < 50ms | 50-100ms | > 100ms |

### 3. 데이터베이스

| 지표 | 정상 범위 | 경고 임계값 |
|------|-----------|-------------|
| 연결 수 | < 50 | 50-80 |
| 쿼리 응답 시간 | < 10ms | 10-50ms |
| 트랜잭션/초 | - | 급격한 증가/감소 |

### 4. 에러율

| 지표 | 목표 | 경고 임계값 |
|------|------|-------------|
| HTTP 5xx 에러율 | < 0.1% | > 1% |
| HTTP 4xx 에러율 | < 5% | > 10% |
| 데이터베이스 에러 | 0 | > 0 |

---

## 🚨 알림 설정

### Prometheus Alert Rules

```yaml
groups:
  - name: timbel_alerts
    rules:
      # API 응답 시간
      - alert: HighAPIResponseTime
        expr: http_request_duration_seconds > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 응답 시간이 느립니다"
          
      # 메모리 사용량
      - alert: HighMemoryUsage
        expr: memory_usage_percent > 85
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "메모리 사용량이 높습니다"
          
      # 에러율
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "서버 에러율이 높습니다"
```

### Slack 알림

```bash
# Slack 웹훅 설정
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# 테스트 알림
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"🎉 Timbel CICD Operator v1.0.0 배포 완료!"}'
```

---

## 🔍 모니터링 대시보드

### 1. Grafana 대시보드

**접속**: `http://your-domain:3003`

**기본 계정**:
- Username: `admin`
- Password: `admin` (최초 로그인 시 변경 필요)

**주요 대시보드**:
- **System Overview**: 전체 시스템 상태
- **API Performance**: API 응답 시간 및 처리량
- **Database Metrics**: 데이터베이스 성능
- **Container Resources**: 컨테이너별 리소스 사용량

### 2. Prometheus 대시보드

**접속**: `http://your-domain:9090`

**주요 쿼리**:
```promql
# CPU 사용률
cpu_usage_percent

# 메모리 사용률
memory_usage_percent

# API 응답 시간 (P95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 에러율
rate(http_requests_total{status=~"5.."}[5m])
```

### 3. Executive Dashboard

**접속**: `http://your-domain:3000/executive`

**제공 정보**:
- 전체 시스템 메트릭
- 지식 카탈로그 통계
- 운영 대시보드 통계
- 최근 배포 이력

---

## 🛠️ 문제 해결 가이드

### 문제 1: 컨테이너가 시작되지 않음

**증상**: `docker-compose ps` 실행 시 컨테이너가 "Exit" 상태

**해결 방법**:
```bash
# 로그 확인
docker-compose logs [service-name] --tail=100

# 컨테이너 재시작
docker-compose restart [service-name]

# 전체 재시작
docker-compose down && docker-compose up -d
```

### 문제 2: API 응답이 느림

**증상**: API 응답 시간 > 1초

**해결 방법**:
```bash
# 1. Backend 로그 확인
docker-compose logs backend --tail=100

# 2. 데이터베이스 연결 확인
docker exec timbel-cicd-operator-solution-postgres-1 psql -U timbel_user -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Prometheus 연결 확인
curl http://localhost:9090/-/healthy

# 4. Backend 재시작
docker-compose restart backend nginx
```

### 문제 3: 데이터베이스 연결 오류

**증상**: "database connection error" 로그

**해결 방법**:
```bash
# 1. PostgreSQL 상태 확인
docker-compose ps postgres

# 2. 연결 테스트
docker exec timbel-cicd-operator-solution-postgres-1 pg_isready -U timbel_user

# 3. 데이터베이스 재시작
docker-compose restart postgres

# 4. 연결 풀 초기화를 위해 Backend 재시작
docker-compose restart backend
```

### 문제 4: 프론트엔드 접근 불가

**증상**: `ERR_CONNECTION_REFUSED` 또는 `Invalid Host header`

**해결 방법**:
```bash
# 1. Nginx 상태 확인
docker-compose ps nginx

# 2. Nginx 로그 확인
docker-compose logs nginx --tail=50

# 3. Nginx 재시작
docker-compose restart nginx

# 4. Frontend 재시작
docker-compose restart frontend
```

### 문제 5: Prometheus 메트릭 수집 안됨

**증상**: Grafana 대시보드에 데이터 없음

**해결 방법**:
```bash
# 1. Prometheus 타겟 상태 확인
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# 2. Prometheus 재시작
docker-compose restart prometheus

# 3. 메트릭 exporter 재시작
docker-compose restart jenkins-metrics gitlab-ci-metrics harbor-metrics
```

---

## 📞 긴급 연락처

### 장애 발생 시 체크리스트

1. **즉시 조치**
   - [ ] 장애 범위 파악 (전체 시스템 / 특정 서비스)
   - [ ] 에러 로그 수집
   - [ ] 사용자 영향도 평가

2. **임시 조치**
   - [ ] 문제 서비스 재시작
   - [ ] 필요 시 롤백 준비

3. **복구 후**
   - [ ] 장애 원인 분석
   - [ ] 재발 방지 대책 수립
   - [ ] 문서화

### 롤백 절차

```bash
# 1. 이전 버전으로 체크아웃
git checkout [previous-version-tag]

# 2. 컨테이너 재시작
docker-compose down
docker-compose up -d

# 3. 상태 확인
docker-compose ps
curl http://localhost:3001/health
```

---

## 📊 일일 점검 항목

### 아침 점검 (09:00)

```bash
#!/bin/bash
# daily-morning-check.sh

echo "=== 일일 아침 점검 시작 ==="

# 1. 컨테이너 상태
echo "1. 컨테이너 상태:"
docker-compose ps | grep -v "Up" || echo "✅ 모든 컨테이너 정상"

# 2. 디스크 사용량
echo "2. 디스크 사용량:"
df -h | grep -E "/$|/var"

# 3. 에러 로그 (지난 24시간)
echo "3. 지난 24시간 에러 로그:"
docker-compose logs --since 24h backend | grep -i "error" | wc -l

# 4. API Health Check
echo "4. API Health Check:"
curl -s http://localhost:3001/health | jq '.status'

echo "=== 일일 아침 점검 완료 ==="
```

### 저녁 점검 (18:00)

```bash
#!/bin/bash
# daily-evening-check.sh

echo "=== 일일 저녁 점검 시작 ==="

# 1. 백업 확인
echo "1. 백업 파일 확인:"
ls -lh /path/to/backups/ | tail -5

# 2. 리소스 사용량 추이
echo "2. 리소스 사용량:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}"

# 3. SLA 메트릭 확인
echo "3. SLA 메트릭:"
curl -s "http://localhost:3001/api/prometheus/sla/calculate" \
  -H "Authorization: Bearer $TOKEN" | jq '.sla.grade'

echo "=== 일일 저녁 점검 완료 ==="
```

---

## 🎯 주간 점검 항목

### 매주 월요일

- [ ] 전체 시스템 백업 확인
- [ ] 보안 업데이트 확인
- [ ] 로그 아카이빙 (30일 이상)
- [ ] 디스크 정리 (임시 파일, 오래된 로그)

### 매주 금요일

- [ ] 주간 성능 리포트 생성
- [ ] 사용자 피드백 검토
- [ ] 다음 주 유지보수 계획 수립

---

## 📚 추가 리소스

- **Prometheus 문서**: https://prometheus.io/docs/
- **Grafana 문서**: https://grafana.com/docs/
- **Docker Compose 문서**: https://docs.docker.com/compose/
- **Kubernetes 문서**: https://kubernetes.io/docs/

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025-10-24  
**버전**: v1.0.0

