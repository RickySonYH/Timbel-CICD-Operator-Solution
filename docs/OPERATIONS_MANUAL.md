# 🛠️ Timbel CICD Operator - 운영 매뉴얼

## 📋 목차
- [일상 운영 작업](#일상-운영-작업)
- [모니터링 및 알림](#모니터링-및-알림)
- [성능 관리](#성능-관리)
- [보안 관리](#보안-관리)
- [백업 및 복구](#백업-및-복구)
- [장애 대응](#장애-대응)
- [용량 계획](#용량-계획)
- [업데이트 및 패치](#업데이트-및-패치)
- [운영 체크리스트](#운영-체크리스트)

---

## 📅 일상 운영 작업

### 🌅 일일 점검 작업 (매일 09:00)

#### 1. 시스템 상태 확인
```bash
#!/bin/bash
# daily-health-check.sh

echo "🔍 일일 시스템 점검 시작 - $(date)"

# 1. 컨테이너 상태 확인
echo "📦 컨테이너 상태:"
docker-compose ps

# 2. 시스템 리소스 확인
echo "💻 시스템 리소스:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% 사용"
echo "메모리: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "디스크: $(df -h / | awk 'NR==2{printf "%s", $5}')"

# 3. 데이터베이스 연결 테스트
echo "🗄️ 데이터베이스 상태:"
docker-compose exec -T postgres pg_isready -U timbel_user && echo "PostgreSQL: ✅ 정상" || echo "PostgreSQL: ❌ 오류"
docker-compose exec -T redis redis-cli ping && echo "Redis: ✅ 정상" || echo "Redis: ❌ 오류"

# 4. API 헬스 체크
echo "🌐 API 상태:"
curl -s -f http://localhost:3001/health > /dev/null && echo "Backend API: ✅ 정상" || echo "Backend API: ❌ 오류"
curl -s -f http://localhost:3000 > /dev/null && echo "Frontend: ✅ 정상" || echo "Frontend: ❌ 오류"

# 5. 로그 에러 확인 (최근 24시간)
echo "📋 최근 에러 로그:"
docker-compose logs --since="24h" 2>&1 | grep -i error | tail -5

echo "✅ 일일 점검 완료 - $(date)"
```

#### 2. 로그 로테이션 확인
```bash
# 로그 크기 확인
du -sh /var/lib/docker/containers/*/

# 큰 로그 파일 찾기
find /var/lib/docker/containers -name "*.log" -size +100M -ls

# 로그 로테이션 설정 확인
cat /etc/logrotate.d/docker
```

#### 3. 백업 상태 확인
```bash
# 최근 백업 파일 확인
ls -la /opt/backups/timbel/ | head -10

# 백업 크기 추이 확인
du -sh /opt/backups/timbel/db_* | tail -7
```

### 📊 주간 점검 작업 (매주 월요일 10:00)

#### 1. 성능 리포트 생성
```bash
#!/bin/bash
# weekly-performance-report.sh

REPORT_DATE=$(date +%Y%m%d)
REPORT_FILE="/opt/reports/weekly_report_${REPORT_DATE}.txt"

mkdir -p /opt/reports

echo "📊 주간 성능 리포트 - $(date)" > $REPORT_FILE
echo "=======================================" >> $REPORT_FILE

# 1. 평균 응답 시간
echo "🚀 API 평균 응답 시간 (지난 7일):" >> $REPORT_FILE
curl -s "http://localhost:9090/api/v1/query?query=avg_over_time(http_request_duration_seconds[7d])" | jq -r '.data.result[0].value[1]' >> $REPORT_FILE

# 2. 에러율
echo "❌ API 에러율 (지난 7일):" >> $REPORT_FILE
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[7d])" | jq -r '.data.result[0].value[1]' >> $REPORT_FILE

# 3. 처리량
echo "📈 일일 평균 요청 수:" >> $REPORT_FILE
curl -s "http://localhost:9090/api/v1/query?query=avg_over_time(rate(http_requests_total[1d])[7d:1d])" | jq -r '.data.result[0].value[1]' >> $REPORT_FILE

# 4. 리소스 사용률
echo "💻 평균 CPU 사용률:" >> $REPORT_FILE
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" >> $REPORT_FILE

echo "📧 리포트 발송..."
mail -s "Timbel 주간 성능 리포트" operations@timbel.net < $REPORT_FILE
```

#### 2. 보안 점검
```bash
# 1. 실패한 로그인 시도 확인
docker-compose logs backend | grep -i "login.*fail" | wc -l

# 2. 의심스러운 IP 활동 확인
docker-compose logs nginx | awk '{print $1}' | sort | uniq -c | sort -nr | head -10

# 3. SSL 인증서 만료일 확인
openssl x509 -in ssl/timbel.crt -noout -dates

# 4. 취약점 스캔 (선택사항)
# docker run --rm -v $(pwd):/target clair-scanner --ip $(hostname -I | awk '{print $1}') target/
```

### 🗓️ 월간 점검 작업 (매월 첫째 주)

#### 1. 용량 계획 검토
```bash
# 데이터베이스 크기 증가 추이
docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY bytes DESC;
"

# 로그 파일 크기 증가 추이
find /var/lib/docker/containers -name "*.log" -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr
```

#### 2. 성능 최적화 검토
```bash
# 느린 쿼리 분석
docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator -c "
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"

# 인덱스 효율성 검토
docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator -c "
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE n_distinct > 100
ORDER BY n_distinct DESC;
"
```

---

## 📊 모니터링 및 알림

### 🎯 핵심 성능 지표 (KPI)

#### 1. 시스템 가용성
```yaml
목표 지표:
  - 시스템 가동률: > 99.5%
  - API 응답 시간: < 500ms (95 percentile)
  - 데이터베이스 응답 시간: < 100ms
  - 에러율: < 0.1%

모니터링 도구:
  - Prometheus + Grafana
  - Uptime 모니터링
  - 로그 분석 (ELK Stack)
```

#### 2. 비즈니스 메트릭
```yaml
주요 지표:
  - 일일 활성 사용자 수 (DAU)
  - 파이프라인 실행 성공률
  - 배포 성공률
  - 평균 배포 시간

측정 방법:
  - 사용자 세션 추적
  - 파이프라인 실행 로그 분석
  - 배포 결과 통계
```

### 🚨 알림 설정

#### 1. 긴급 알림 (Critical)
```yaml
CPU 사용률 > 90% (5분 지속):
  - 알림 채널: SMS + Email + Slack
  - 대상: 온콜 엔지니어, DevOps 팀장
  - 자동 조치: 스케일 아웃 트리거

메모리 사용률 > 95% (3분 지속):
  - 알림 채널: SMS + Email + Slack
  - 대상: 온콜 엔지니어
  - 자동 조치: 메모리 정리 스크립트 실행

데이터베이스 연결 실패:
  - 알림 채널: SMS + Email + Slack
  - 대상: DBA, DevOps 팀
  - 자동 조치: 헬스 체크 및 재시작 시도

API 에러율 > 5% (2분 지속):
  - 알림 채널: Email + Slack
  - 대상: 개발팀, DevOps 팀
  - 자동 조치: 로그 수집 및 분석
```

#### 2. 경고 알림 (Warning)
```yaml
디스크 사용률 > 80%:
  - 알림 채널: Email + Slack
  - 대상: DevOps 팀
  - 조치: 디스크 정리 계획 수립

API 응답 시간 > 1초 (10분 지속):
  - 알림 채널: Slack
  - 대상: 개발팀
  - 조치: 성능 분석 및 최적화 검토

SSL 인증서 만료 30일 전:
  - 알림 채널: Email
  - 대상: DevOps 팀
  - 조치: 인증서 갱신 계획
```

### 📈 대시보드 구성

#### 1. 운영 대시보드 (Operations Dashboard)
```yaml
패널 구성:
  - 시스템 개요 (가동률, 버전 정보)
  - 리소스 사용률 (CPU, 메모리, 디스크)
  - 네트워크 트래픽
  - 컨테이너 상태
  - 최근 알림 현황

새로고침 주기: 30초
접근 권한: DevOps 팀, 관리자
```

#### 2. 애플리케이션 대시보드 (Application Dashboard)
```yaml
패널 구성:
  - API 요청 수 및 응답 시간
  - 에러율 및 상태 코드 분포
  - 데이터베이스 성능 지표
  - 캐시 히트율
  - 사용자 활동 통계

새로고침 주기: 1분
접근 권한: 개발팀, DevOps 팀, 관리자
```

---

## ⚡ 성능 관리

### 🔧 성능 최적화 작업

#### 1. 데이터베이스 최적화
```sql
-- 주간 VACUUM 작업 (매주 일요일 02:00)
-- cron: 0 2 * * 0
VACUUM ANALYZE;

-- 통계 정보 업데이트
UPDATE pg_stat_statements_info SET dealloc = 0;

-- 인덱스 재구성 (필요시)
REINDEX INDEX CONCURRENTLY idx_projects_created_at;
REINDEX INDEX CONCURRENTLY idx_users_email;
```

#### 2. 캐시 최적화
```bash
# Redis 메모리 사용량 확인
docker-compose exec redis redis-cli info memory

# 캐시 히트율 확인
docker-compose exec redis redis-cli info stats | grep keyspace

# 만료된 키 정리
docker-compose exec redis redis-cli --scan --pattern "expired:*" | xargs docker-compose exec redis redis-cli del
```

#### 3. 로그 최적화
```bash
# 로그 레벨 조정 (운영환경에서는 INFO 이상만)
# docker-compose.yml 환경 변수 수정:
# LOG_LEVEL=info

# 로그 로테이션 설정 확인
cat > /etc/logrotate.d/timbel << 'EOF'
/opt/timbel/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 root root
    postrotate
        docker-compose restart backend
    endscript
}
EOF
```

### 📊 용량 계획

#### 1. 데이터 증가 예측
```bash
#!/bin/bash
# capacity-planning.sh

# 데이터베이스 크기 추이 (최근 30일)
echo "📊 데이터베이스 크기 추이:"
for i in {30..1}; do
    date_check=$(date -d "$i days ago" +%Y-%m-%d)
    size=$(docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator -t -c "
        SELECT pg_size_pretty(pg_database_size('timbel_cicd_operator'));
    " 2>/dev/null || echo "N/A")
    echo "$date_check: $size"
done

# 일일 증가율 계산
echo "📈 예상 월간 증가량:"
current_size=$(docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator -t -c "
    SELECT pg_database_size('timbel_cicd_operator');
" | tr -d ' ')

# 간단한 선형 증가 모델 (실제로는 더 복잡한 분석 필요)
monthly_growth=$(echo "$current_size * 0.1" | bc)
echo "예상 월간 증가: $(echo $monthly_growth | numfmt --to=iec-i --suffix=B)"
```

#### 2. 리소스 사용량 추이
```bash
# CPU 사용량 추이 (Prometheus 쿼리)
curl -s "http://localhost:9090/api/v1/query_range?query=avg(cpu_usage_percent)&start=$(date -d '7 days ago' +%s)&end=$(date +%s)&step=3600" | jq '.data.result[0].values'

# 메모리 사용량 추이
curl -s "http://localhost:9090/api/v1/query_range?query=avg(memory_usage_percent)&start=$(date -d '7 days ago' +%s)&end=$(date +%s)&step=3600" | jq '.data.result[0].values'
```

---

## 🛡️ 보안 관리

### 🔐 보안 점검 체크리스트

#### 1. 접근 통제 확인
```bash
# 1. 관리자 계정 확인
docker-compose exec postgres psql -U timbel_user -d timbel_knowledge -c "
SELECT username, role, permission_level, created_at 
FROM timbel_users 
WHERE role = 'admin' 
ORDER BY created_at;
"

# 2. 최근 로그인 실패 시도 확인
docker-compose logs backend | grep -i "login.*fail" | tail -20

# 3. 의심스러운 API 호출 확인
docker-compose logs nginx | awk '$9 ~ /^[45]/ {print $1, $7, $9}' | sort | uniq -c | sort -nr | head -10
```

#### 2. 보안 업데이트 확인
```bash
# Docker 이미지 취약점 스캔
docker scout cves timbel-cicd-operator-solution-backend:latest

# 시스템 패키지 업데이트 확인
apt list --upgradable | grep -i security

# SSL/TLS 설정 확인
nmap --script ssl-enum-ciphers -p 443 localhost
```

#### 3. 백업 암호화 확인
```bash
# 백업 파일 암호화 상태 확인
file /opt/backups/timbel/*.gz

# 암호화된 백업 생성 (필요시)
gpg --cipher-algo AES256 --compress-algo 1 --s2k-cipher-algo AES256 --s2k-digest-algo SHA512 --s2k-mode 3 --s2k-count 65011712 --symmetric backup.sql
```

### 🔒 보안 강화 조치

#### 1. 방화벽 설정 확인
```bash
# UFW 상태 확인
sudo ufw status verbose

# 필수 포트만 허용
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow from 10.0.0.0/8 to any port 3001  # Backend (내부 네트워크만)
sudo ufw enable
```

#### 2. 로그 모니터링 강화
```bash
# 실패한 로그인 시도 모니터링
cat > /opt/scripts/security-monitor.sh << 'EOF'
#!/bin/bash
FAILED_LOGINS=$(docker-compose logs --since="1h" backend | grep -c "login.*fail")
if [ $FAILED_LOGINS -gt 10 ]; then
    echo "⚠️ 의심스러운 로그인 시도 감지: $FAILED_LOGINS 회" | mail -s "보안 알림" security@timbel.net
fi

# IP 차단 (실패한 로그인 시도가 많은 IP)
docker-compose logs --since="1h" backend | grep "login.*fail" | grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | sort | uniq -c | while read count ip; do
    if [ $count -gt 5 ]; then
        sudo ufw insert 1 deny from $ip
        echo "🚫 IP 차단: $ip ($count 회 실패)" | mail -s "IP 차단 알림" security@timbel.net
    fi
done
EOF

chmod +x /opt/scripts/security-monitor.sh

# cron에 등록 (매시간 실행)
echo "0 * * * * /opt/scripts/security-monitor.sh" | crontab -
```

---

## 💾 백업 및 복구

### 📅 백업 스케줄

#### 1. 자동 백업 설정
```bash
# crontab 설정
crontab -e

# 다음 라인들 추가:
# 매일 새벽 2시 - 전체 백업
0 2 * * * /opt/timbel/scripts/backup-full.sh >> /var/log/timbel-backup.log 2>&1

# 매 4시간 - 증분 백업
0 */4 * * * /opt/timbel/scripts/backup-incremental.sh >> /var/log/timbel-backup.log 2>&1

# 매주 일요일 새벽 1시 - 아카이브 백업
0 1 * * 0 /opt/timbel/scripts/backup-archive.sh >> /var/log/timbel-backup.log 2>&1
```

#### 2. 증분 백업 스크립트
```bash
#!/bin/bash
# backup-incremental.sh

BACKUP_DIR="/opt/backups/timbel/incremental"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# PostgreSQL WAL 백업
docker-compose exec postgres pg_basebackup -U timbel_user -D "/tmp/backup_$TIMESTAMP" -Ft -z -P
docker cp $(docker-compose ps -q postgres):/tmp/backup_$TIMESTAMP.tar.gz "$BACKUP_DIR/"

# Redis AOF 백업
docker-compose exec redis redis-cli BGREWRITEAOF
sleep 5
docker cp $(docker-compose ps -q redis):/data/appendonly.aof "$BACKUP_DIR/redis_$TIMESTAMP.aof"

echo "✅ 증분 백업 완료: $TIMESTAMP"
```

### 🔄 복구 테스트

#### 1. 월간 복구 테스트 (매월 둘째 주 토요일)
```bash
#!/bin/bash
# recovery-test.sh

TEST_ENV_DIR="/opt/test-recovery"
LATEST_BACKUP=$(ls -t /opt/backups/timbel/db_*.sql.gz | head -1)

echo "🧪 복구 테스트 시작 - $(date)"
echo "사용할 백업: $LATEST_BACKUP"

# 1. 테스트 환경 준비
mkdir -p "$TEST_ENV_DIR"
cd "$TEST_ENV_DIR"

# 2. 테스트용 docker-compose.yml 생성
cat > docker-compose.test.yml << 'EOF'
version: '3.8'
services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: timbel_test
      POSTGRES_USER: timbel_test
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data

volumes:
  postgres_test_data:
EOF

# 3. 테스트 데이터베이스 시작
docker-compose -f docker-compose.test.yml up -d postgres-test
sleep 30

# 4. 백업 복원
gunzip -c "$LATEST_BACKUP" | docker-compose -f docker-compose.test.yml exec -T postgres-test psql -U timbel_test -d timbel_test

# 5. 데이터 무결성 검증
RECORD_COUNT=$(docker-compose -f docker-compose.test.yml exec postgres-test psql -U timbel_test -d timbel_test -t -c "SELECT COUNT(*) FROM projects;" | tr -d ' ')
echo "복원된 프로젝트 수: $RECORD_COUNT"

# 6. 정리
docker-compose -f docker-compose.test.yml down -v
cd /opt/timbel

if [ "$RECORD_COUNT" -gt 0 ]; then
    echo "✅ 복구 테스트 성공 - $(date)"
else
    echo "❌ 복구 테스트 실패 - $(date)" | mail -s "백업 복구 테스트 실패" operations@timbel.net
fi
```

---

## 🚨 장애 대응

### 📋 장애 대응 절차

#### 1. 장애 감지 및 초기 대응 (0-5분)
```yaml
1. 장애 확인:
   - 모니터링 알림 확인
   - 서비스 상태 점검
   - 사용자 신고 접수

2. 초기 대응:
   - 장애 레벨 판정 (P0-P4)
   - 온콜 엔지니어 호출
   - 상황실 개설 (P0-P1)

3. 커뮤니케이션:
   - 내부 팀 알림 (Slack)
   - 상태 페이지 업데이트
   - 고객 공지 (필요시)
```

#### 2. 장애 분석 및 해결 (5-30분)
```yaml
1. 로그 분석:
   - 에러 로그 수집
   - 성능 메트릭 확인
   - 최근 변경사항 검토

2. 원인 파악:
   - 시스템 리소스 확인
   - 외부 의존성 확인
   - 코드 변경사항 검토

3. 임시 해결:
   - 서비스 재시작
   - 트래픽 우회
   - 롤백 실행
```

#### 3. 복구 및 사후 처리 (30분-2시간)
```yaml
1. 근본 원인 해결:
   - 코드 수정
   - 설정 변경
   - 인프라 조정

2. 복구 확인:
   - 기능 테스트
   - 성능 검증
   - 모니터링 확인

3. 사후 처리:
   - 장애 보고서 작성
   - 재발 방지 계획
   - 프로세스 개선
```

### 🔧 일반적인 장애 대응 스크립트

#### 1. 서비스 재시작 스크립트
```bash
#!/bin/bash
# emergency-restart.sh

echo "🚨 긴급 서비스 재시작 시작 - $(date)"

# 1. 현재 상태 백업
docker-compose ps > /tmp/service_status_$(date +%Y%m%d_%H%M%S).txt

# 2. 그레이스풀 셧다운 시도
timeout 60 docker-compose stop || {
    echo "⚠️ 정상 종료 실패, 강제 종료 실행"
    docker-compose kill
}

# 3. 컨테이너 정리
docker-compose down --remove-orphans

# 4. 서비스 재시작
docker-compose up -d

# 5. 헬스 체크
sleep 30
for i in {1..10}; do
    if curl -sf http://localhost:3001/health > /dev/null; then
        echo "✅ 서비스 복구 완료 - $(date)"
        exit 0
    fi
    echo "⏳ 헬스 체크 시도 $i/10..."
    sleep 10
done

echo "❌ 서비스 복구 실패 - $(date)"
exit 1
```

#### 2. 데이터베이스 복구 스크립트
```bash
#!/bin/bash
# db-recovery.sh

echo "🗄️ 데이터베이스 복구 시작 - $(date)"

# 1. 데이터베이스 연결 테스트
if docker-compose exec postgres pg_isready -U timbel_user; then
    echo "✅ 데이터베이스 연결 정상"
    exit 0
fi

# 2. PostgreSQL 재시작
echo "🔄 PostgreSQL 재시작 중..."
docker-compose restart postgres
sleep 30

# 3. 연결 재테스트
if docker-compose exec postgres pg_isready -U timbel_user; then
    echo "✅ PostgreSQL 복구 완료"
else
    echo "❌ PostgreSQL 복구 실패, 백업에서 복원 필요"
    
    # 4. 최신 백업에서 복원
    LATEST_BACKUP=$(ls -t /opt/backups/timbel/db_*.sql.gz | head -1)
    echo "📦 백업 파일 사용: $LATEST_BACKUP"
    
    docker-compose stop postgres
    docker volume rm timbel-cicd-operator-solution_postgres_data
    docker-compose up -d postgres
    sleep 30
    
    gunzip -c "$LATEST_BACKUP" | docker-compose exec -T postgres psql -U timbel_user -d timbel_cicd_operator
    echo "✅ 백업에서 복원 완료"
fi
```

### 📊 장애 레벨 정의

| 레벨 | 정의 | 대응 시간 | 에스컬레이션 |
|------|------|-----------|--------------|
| **P0** | 전체 서비스 중단 | 15분 이내 | CTO, CEO |
| **P1** | 핵심 기능 장애 | 1시간 이내 | 개발팀장, DevOps 팀장 |
| **P2** | 부분 기능 장애 | 4시간 이내 | 담당 개발자 |
| **P3** | 성능 저하 | 24시간 이내 | 담당팀 |
| **P4** | 경미한 문제 | 72시간 이내 | 일반 처리 |

---

## 🔄 업데이트 및 패치

### 📦 정기 업데이트 절차

#### 1. 보안 패치 (매월 둘째 주 화요일 02:00)
```bash
#!/bin/bash
# security-update.sh

echo "🔒 보안 패치 시작 - $(date)"

# 1. 시스템 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Docker 이미지 업데이트
docker-compose pull

# 3. 서비스 재시작 (롤링 업데이트)
for service in backend-1 backend-2 backend-3; do
    echo "🔄 $service 업데이트 중..."
    docker-compose up -d --no-deps $service
    sleep 60
    
    # 헬스 체크
    if ! curl -sf http://localhost:3001/health > /dev/null; then
        echo "❌ $service 업데이트 실패, 롤백 실행"
        docker-compose restart $service
        exit 1
    fi
done

echo "✅ 보안 패치 완료 - $(date)"
```

#### 2. 애플리케이션 업데이트
```bash
#!/bin/bash
# app-update.sh

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "사용법: $0 <version>"
    exit 1
fi

echo "🚀 애플리케이션 업데이트 시작 - v$VERSION"

# 1. 백업 생성
./backup-full.sh

# 2. 코드 업데이트
git fetch origin
git checkout "v$VERSION"

# 3. 데이터베이스 마이그레이션
docker-compose exec backend npm run migrate

# 4. 이미지 빌드
docker-compose build

# 5. 롤링 업데이트
for service in backend-1 backend-2 backend-3; do
    docker-compose up -d --no-deps $service
    sleep 60
    
    if ! curl -sf http://localhost:3001/health > /dev/null; then
        echo "❌ 업데이트 실패, 롤백 실행"
        git checkout main
        docker-compose build
        docker-compose up -d
        exit 1
    fi
done

# 6. 프론트엔드 업데이트
docker-compose up -d --no-deps frontend

echo "✅ 애플리케이션 업데이트 완료 - v$VERSION"
```

---

## ✅ 운영 체크리스트

### 📅 일일 체크리스트
- [ ] 시스템 상태 확인 (컨테이너, 리소스)
- [ ] 데이터베이스 연결 테스트
- [ ] API 헬스 체크
- [ ] 에러 로그 확인
- [ ] 백업 상태 확인
- [ ] 모니터링 알림 검토

### 📅 주간 체크리스트
- [ ] 성능 리포트 생성 및 검토
- [ ] 보안 로그 분석
- [ ] 용량 사용량 검토
- [ ] 느린 쿼리 분석
- [ ] SSL 인증서 상태 확인
- [ ] 백업 무결성 테스트

### 📅 월간 체크리스트
- [ ] 복구 테스트 실행
- [ ] 용량 계획 업데이트
- [ ] 보안 취약점 스캔
- [ ] 성능 최적화 검토
- [ ] 장애 대응 절차 점검
- [ ] 문서 업데이트

### 📅 분기별 체크리스트
- [ ] 재해 복구 훈련
- [ ] 보안 감사
- [ ] 아키텍처 검토
- [ ] 용량 계획 재평가
- [ ] 모니터링 체계 개선
- [ ] 팀 교육 및 훈련

---

## 📞 연락처 및 에스컬레이션

### 🚨 긴급 연락처
- **온콜 엔지니어**: +82-10-1234-5678
- **DevOps 팀장**: +82-10-2345-6789
- **개발팀장**: +82-10-3456-7890
- **CTO**: +82-10-4567-8901

### 💬 커뮤니케이션 채널
- **Slack**: #timbel-operations
- **이메일**: operations@timbel.net
- **상태 페이지**: https://status.timbel.net
- **문서**: https://docs.timbel.net

---

**📅 문서 버전**: v1.0  
**📅 최종 수정일**: 2024-01-01  
**👤 작성자**: Timbel Operations Team  
**📧 문의**: operations@timbel.net
