# 모니터링 API 테스트 가이드

## ✅ Task 1 완료: 모니터링 시스템 Prometheus 실제 연동

### 구현 내용
1. ✅ Mock 메서드를 실제 Prometheus 연동으로 교체
2. ✅ Fallback 메커니즘 구현 (Prometheus 연결 실패 시)
3. ✅ Grafana 대시보드 생성 API 연동
4. ✅ 실제 메트릭 수집 메서드 구현
5. ✅ 단위 테스트 작성 (198줄)

---

## 🧪 백엔드 테스트

###1. 메트릭 수집 API 테스트

```bash
# 테스트용 JWT 토큰 획득 (admin 계정)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"

# 메트릭 수집 API 호출
curl -X GET "http://localhost:3001/api/operations/monitoring/tenants/test-tenant/metrics?timeRange=1h" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

**예상 응답** (Prometheus 미연결 시):
```json
{
  "success": true,
  "data": {
    "tenant_id": "test-tenant",
    "time_range": "1h",
    "collected_at": "2025-10-24T00:45:00.000Z",
    "metrics": {
      "cpu_usage": [...],
      "memory_usage": [...],
      "disk_usage": [...],
      "request_count": [...],
      "response_time": [...],
      "error_rate": [...]
    },
    "source": "mock"
  },
  "message": "Mock 메트릭 수집 (Prometheus 미연결)",
  "source": "mock",
  "mock": true
}
```

**예상 응답** (Prometheus 연결 성공 시):
```json
{
  "success": true,
  "data": {
    "tenant_id": "test-tenant",
    "time_range": "1h",
    "collected_at": "2025-10-24T00:45:00.000Z",
    "metrics": {
      "cpu_usage": [
        { "timestamp": "2025-10-24T00:00:00.000Z", "value": 75.5 },
        { "timestamp": "2025-10-24T00:15:00.000Z", "value": 80.2 }
      ],
      ...
    },
    "source": "prometheus"
  },
  "message": "Prometheus에서 메트릭 수집 완료",
  "source": "prometheus"
}
```

### 2. 백엔드 로그 확인

```bash
# Prometheus 연동 관련 로그 확인
docker-compose logs backend | grep -i "prometheus\|메트릭"

# Mock 사용 경고 확인
docker-compose logs backend | grep "⚠️"
```

### 3. 단위 테스트 실행

```bash
# Jest 테스트 실행
cd /home/rickyson/CICD-OP/Timbel-CICD-Operator-Solution/backend
npm test tests/monitoringService.test.js
```

---

## 🎯 프론트엔드 테스트 (다음 단계)

### 1. 모니터링 대시보드 페이지 확인

```
URL: http://rdc.rickyson.com:3000/operations/monitoring
```

**확인 사항**:
- [ ] 메트릭 데이터가 정상적으로 표시되는지
- [ ] 데이터 소스 표시 (Prometheus 또는 Mock)
- [ ] 시간 범위 선택 기능
- [ ] 자동 새로고침 기능

### 2. 대시보드 컴포넌트 업데이트

파일: `frontend/src/pages/operations/ComprehensiveMonitoring.tsx`

**필요 작업**:
- [ ] API 호출 시 `source` 확인
- [ ] Mock 데이터 사용 시 경고 표시
- [ ] 실시간 업데이트 구현

---

## 📊 테스트 결과

### 백엔드 테스트 결과
- ✅ `queryPrometheusRange`: Prometheus 쿼리 성공 테스트
- ✅ `queryPrometheusRange`: 연결 실패 시 Fallback 테스트
- ✅ `collectMetricsFromPrometheus`: 메트릭 수집 성공
- ✅ `collectMetricsFromPrometheus`: Fallback 동작 확인
- ✅ `formatMetricData`: 데이터 포맷팅
- ✅ `calculateStep`: 쿼리 간격 계산
- ✅ `createGrafanaDashboard`: Grafana 연동
- ✅ `mockCollectMetrics`: 경고 로그 포함

### 프론트엔드 테스트 결과
- ⏳ (다음 단계 진행 예정)

---

## 🔍 확인된 동작

### 1. Graceful Degradation
- Prometheus 연결 실패 시 자동으로 Mock 데이터로 전환
- 경고 로그 출력: `⚠️ Mock 메트릭 수집 사용 중`
- 응답에 `source: "mock"` 및 `mock: true` 플래그 포함

### 2. 실제 Prometheus 연동
- PromQL 쿼리 자동 생성
- 시간 범위별 적절한 간격 계산
- CPU, 메모리, 디스크, 요청, 응답 시간, 에러율 메트릭 수집

### 3. Grafana 대시보드 생성
- Grafana API 토큰 확인
- 대시보드 자동 생성
- 실패 시 Fallback으로 설정만 저장

---

## 🚀 다음 단계

### 1. 프론트엔드 연동 (현재 진행 중)
- [ ] 모니터링 페이지 업데이트
- [ ] 데이터 소스 표시 UI 추가
- [ ] 실시간 새로고침 구현

### 2. Prometheus 실제 연결 설정
```bash
# docker-compose.yml에 Prometheus 환경변수 추가
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
GRAFANA_TOKEN=your-grafana-api-token
```

### 3. 통합 테스트
- [ ] 전체 워크플로우 테스트
- [ ] 성능 테스트
- [ ] 에러 처리 테스트

---

## 📝 변경된 파일

### 백엔드
1. ✅ `backend/src/services/monitoringService.js`
   - 실제 Prometheus 연동 메서드 추가 (300+ 줄)
   - Mock 메서드를 Fallback으로 전환
   
2. ✅ `backend/src/routes/operations.js`
   - API 라우트 업데이트
   - `collectMetricsFromPrometheus` 호출

3. ✅ `backend/tests/monitoringService.test.js` (신규)
   - 198줄의 단위 테스트

### 프론트엔드
- ⏳ (다음 단계 진행 예정)

---

**테스트 작성일**: 2025-10-24  
**상태**: ✅ 백엔드 완료, ⏳ 프론트엔드 진행 중

