# 🚀 Timbel CICD Operator - 배포 가이드

## 📋 목차
- [시스템 요구사항](#시스템-요구사항)
- [사전 준비사항](#사전-준비사항)
- [개발 환경 배포](#개발-환경-배포)
- [스테이징 환경 배포](#스테이징-환경-배포)
- [프로덕션 환경 배포](#프로덕션-환경-배포)
- [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
- [SSL/TLS 설정](#ssltls-설정)
- [모니터링 설정](#모니터링-설정)
- [백업 및 복구](#백업-및-복구)
- [트러블슈팅](#트러블슈팅)

---

## 💻 시스템 요구사항

### 최소 요구사항 (개발 환경)
```yaml
Hardware:
  CPU: 4 Core (Intel/AMD x64)
  Memory: 8GB RAM
  Storage: 50GB SSD
  Network: 1Gbps

Software:
  OS: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
  Docker: 24.0+
  Docker Compose: 2.20+
  Git: 2.30+
```

### 권장 요구사항 (프로덕션 환경)
```yaml
Hardware:
  CPU: 16 Core (Intel/AMD x64)
  Memory: 32GB RAM
  Storage: 500GB SSD (NVMe)
  Network: 10Gbps

Software:
  OS: Ubuntu 22.04 LTS / RHEL 9
  Docker: 24.0+
  Docker Compose: 2.20+
  Git: 2.40+
  
Load Balancer:
  Nginx: 1.24+
  
Monitoring:
  Prometheus: 2.45+
  Grafana: 10.0+
```

### 네트워크 포트
```yaml
# 필수 포트
Frontend: 3000
Backend: 3001
PostgreSQL: 5432
Redis: 6379

# 외부 서비스 포트
Jenkins: 8080, 50000
Nexus: 8081
ArgoCD: 8080, 8443

# 모니터링 포트
Prometheus: 9090
Grafana: 3030
Kibana: 5601
Elasticsearch: 9200, 9300
```

---

## 🔧 사전 준비사항

### 1. Docker 및 Docker Compose 설치
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker --version
docker-compose --version
```

### 2. Git 저장소 클론
```bash
# 프로젝트 클론
git clone https://github.com/timbel/timbel-cicd-operator.git
cd timbel-cicd-operator

# 권한 설정
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### 3. 환경 변수 설정
```bash
# 환경 변수 파일 생성
cp .env.template .env

# 환경 변수 편집
nano .env
```

### 4. 환경 변수 예시
```bash
# .env 파일 내용
# 데이터베이스 설정
DB_HOST=postgres
DB_PORT=5432
DB_USER=timbel_user
DB_PASSWORD=your_secure_password_here
DB_NAME=timbel_cicd_operator

# Redis 설정
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# JWT 설정
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 외부 서비스 URL
JENKINS_URL=http://jenkins:8080
JENKINS_USERNAME=admin
JENKINS_PASSWORD=admin

ARGOCD_URL=https://argocd.company.com
ARGOCD_USERNAME=admin
ARGOCD_PASSWORD=admin

NEXUS_URL=http://nexus:8081
NEXUS_USERNAME=admin
NEXUS_PASSWORD=admin123

# 이메일 설정 (선택사항)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# 모니터링 설정
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_ADMIN_PASSWORD=admin

# 보안 설정
SESSION_SECRET=your_session_secret_here
ENCRYPTION_KEY=your_encryption_key_here
```

---

## 🏗️ 개발 환경 배포

### 1. 기본 배포
```bash
# 프로젝트 디렉토리로 이동
cd timbel-cicd-operator

# 개발 환경 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 2. 개별 서비스 시작
```bash
# 데이터베이스만 시작
docker-compose up -d postgres redis

# 백엔드만 시작
docker-compose up -d backend

# 프론트엔드만 시작
docker-compose up -d frontend

# 모든 서비스 상태 확인
docker-compose ps
```

### 3. 데이터베이스 초기화
```bash
# 데이터베이스 마이그레이션 실행
docker-compose exec backend npm run migrate

# 초기 데이터 삽입
docker-compose exec backend npm run seed

# 관리자 계정 생성
docker-compose exec backend npm run create-admin
```

### 4. 접속 확인
```bash
# 서비스 접속 URL
Frontend: http://localhost:3000
Backend API: http://localhost:3001
API Documentation: http://localhost:3001/api-docs

# 기본 관리자 계정
Username: admin
Password: 1q2w3e4r
```

---

## 🎭 스테이징 환경 배포

### 1. 스테이징 환경 설정
```bash
# 스테이징 환경 변수 설정
cp .env.template .env.staging

# 스테이징 전용 설정 편집
nano .env.staging
```

### 2. 스테이징 Docker Compose
```yaml
# docker-compose.staging.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.staging.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.staging
    environment:
      - NODE_ENV=staging
    env_file:
      - .env.staging
    volumes:
      - backend_logs:/app/logs
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.staging
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=https://api-staging.timbel.net
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: timbel_cicd_operator_staging
    env_file:
      - .env.staging
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_staging_data:/data
    restart: unless-stopped

volumes:
  postgres_staging_data:
  redis_staging_data:
  backend_logs:
```

### 3. 스테이징 배포 실행
```bash
# 스테이징 환경 배포
docker-compose -f docker-compose.staging.yml up -d

# 헬스 체크
curl -f http://localhost/health || echo "Health check failed"

# 로그 모니터링
docker-compose -f docker-compose.staging.yml logs -f --tail=100
```

---

## 🏭 프로덕션 환경 배포

### 1. 프로덕션 환경 준비
```bash
# 프로덕션 서버에서 실행
sudo mkdir -p /opt/timbel
cd /opt/timbel

# 프로젝트 클론
sudo git clone https://github.com/timbel/timbel-cicd-operator.git .
sudo chown -R $USER:$USER .

# 프로덕션 환경 변수 설정
cp .env.template .env.production
nano .env.production
```

### 2. 프로덕션 배포
```bash
# 프로덕션 환경 배포
docker-compose -f docker-compose.prod.yml up -d

# 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 로그 확인
docker-compose -f docker-compose.prod.yml logs --tail=50
```

### 3. 로드 밸런서 설정
```nginx
# /etc/nginx/sites-available/timbel.conf
upstream backend_cluster {
    least_conn;
    server backend-1:3001 max_fails=3 fail_timeout=30s;
    server backend-2:3001 max_fails=3 fail_timeout=30s;
    server backend-3:3001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name timbel.net www.timbel.net;
    
    # HTTP to HTTPS redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name timbel.net www.timbel.net;
    
    # SSL 설정
    ssl_certificate /etc/nginx/ssl/timbel.crt;
    ssl_certificate_key /etc/nginx/ssl/timbel.key;
    
    # 프론트엔드
    location / {
        root /var/www/timbel;
        try_files $uri $uri/ /index.html;
    }
    
    # API 프록시
    location /api/ {
        proxy_pass http://backend_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. 시스템 서비스 등록
```bash
# systemd 서비스 파일 생성
sudo tee /etc/systemd/system/timbel.service > /dev/null <<EOF
[Unit]
Description=Timbel CICD Operator
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/timbel
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# 서비스 활성화
sudo systemctl daemon-reload
sudo systemctl enable timbel
sudo systemctl start timbel
```

---

## 🗄️ 데이터베이스 마이그레이션

### 1. 마이그레이션 스크립트 실행
```bash
# 개발 환경
docker-compose exec backend npm run migrate

# 프로덕션 환경
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# 특정 마이그레이션 실행
docker-compose exec backend npm run migrate -- --to 20240101000000
```

### 2. 수동 마이그레이션
```bash
# PostgreSQL 컨테이너 접속
docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator

# 마이그레이션 SQL 실행
\i /docker-entrypoint-initdb.d/migrations/01-initial-schema.sql
\i /docker-entrypoint-initdb.d/migrations/02-add-indexes.sql
```

### 3. 데이터 백업 및 복원
```bash
# 데이터베이스 백업
docker-compose exec postgres pg_dump -U timbel_user timbel_cicd_operator > backup.sql

# 데이터베이스 복원
docker-compose exec -T postgres psql -U timbel_user timbel_cicd_operator < backup.sql

# 자동 백업 스크립트
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U timbel_user timbel_cicd_operator > "backup_${DATE}.sql"
# 7일 이상 된 백업 파일 삭제
find . -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x backup.sh

# crontab에 등록 (매일 새벽 2시)
echo "0 2 * * * /opt/timbel/backup.sh" | crontab -
```

---

## 🔒 SSL/TLS 설정

### 1. Let's Encrypt 인증서 발급
```bash
# Certbot 설치
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d timbel.net -d www.timbel.net

# 자동 갱신 설정
sudo crontab -e
# 다음 라인 추가:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 자체 서명 인증서 (개발용)
```bash
# SSL 디렉토리 생성
mkdir -p ssl

# 개인키 생성
openssl genrsa -out ssl/timbel.key 2048

# CSR 생성
openssl req -new -key ssl/timbel.key -out ssl/timbel.csr \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=Timbel/CN=localhost"

# 자체 서명 인증서 생성
openssl x509 -req -days 365 -in ssl/timbel.csr \
  -signkey ssl/timbel.key -out ssl/timbel.crt

# 권한 설정
chmod 600 ssl/timbel.key
chmod 644 ssl/timbel.crt
```

---

## 📊 모니터링 설정

### 1. Prometheus 설정
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'timbel-backend'
    static_configs:
      - targets: ['backend-1:3001', 'backend-2:3001', 'backend-3:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:8080']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 2. Grafana 대시보드 설정
```bash
# Grafana 대시보드 자동 프로비저닝
mkdir -p monitoring/grafana-dashboards

# 대시보드 JSON 파일 복사
cp dashboards/*.json monitoring/grafana-dashboards/

# Grafana 설정 파일
cat > monitoring/grafana.ini << 'EOF'
[server]
http_port = 3000
domain = grafana.timbel.net

[security]
admin_user = admin
admin_password = ${GRAFANA_ADMIN_PASSWORD}

[auth]
disable_login_form = false

[provisioning]
datasources = /etc/grafana/provisioning/datasources
dashboards = /etc/grafana/provisioning/dashboards
EOF
```

### 3. 알림 설정
```yaml
# monitoring/alert_rules.yml
groups:
  - name: timbel_alerts
    rules:
      - alert: HighCPUUsage
        expr: cpu_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for more than 5 minutes"

      - alert: HighMemoryUsage
        expr: memory_usage_percent > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"

      - alert: DatabaseConnectionFailure
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failure"

      - alert: HighAPIErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High API error rate"
```

---

## 💾 백업 및 복구

### 1. 자동 백업 스크립트
```bash
#!/bin/bash
# backup-full.sh

set -e

# 설정
BACKUP_DIR="/opt/backups/timbel"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 백업 디렉토리 생성
mkdir -p "${BACKUP_DIR}"

echo "🔄 백업 시작: ${DATE}"

# 1. 데이터베이스 백업
echo "📊 데이터베이스 백업 중..."
docker-compose exec -T postgres pg_dump -U timbel_user timbel_cicd_operator | gzip > "${BACKUP_DIR}/db_${DATE}.sql.gz"
docker-compose exec -T postgres pg_dump -U timbel_user timbel_knowledge | gzip > "${BACKUP_DIR}/db_knowledge_${DATE}.sql.gz"

# 2. Redis 백업
echo "🗄️ Redis 백업 중..."
docker-compose exec redis redis-cli --rdb /tmp/dump.rdb
docker cp $(docker-compose ps -q redis):/tmp/dump.rdb "${BACKUP_DIR}/redis_${DATE}.rdb"

# 3. 설정 파일 백업
echo "⚙️ 설정 파일 백업 중..."
tar -czf "${BACKUP_DIR}/configs_${DATE}.tar.gz" \
  .env* \
  nginx/ \
  monitoring/ \
  ssl/

# 4. 업로드 파일 백업
echo "📁 업로드 파일 백업 중..."
if [ -d "backend/uploads" ]; then
  tar -czf "${BACKUP_DIR}/uploads_${DATE}.tar.gz" backend/uploads/
fi

# 5. 오래된 백업 파일 정리
echo "🗑️ 오래된 백업 파일 정리 중..."
find "${BACKUP_DIR}" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "*.rdb" -mtime +${RETENTION_DAYS} -delete

# 6. 백업 크기 확인
echo "📊 백업 완료:"
ls -lh "${BACKUP_DIR}"/*${DATE}*

echo "✅ 백업 완료: ${DATE}"
```

### 2. 복구 스크립트
```bash
#!/bin/bash
# restore.sh

set -e

if [ $# -ne 1 ]; then
  echo "사용법: $0 <백업_날짜>"
  echo "예시: $0 20240101_120000"
  exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/opt/backups/timbel"

echo "🔄 복구 시작: ${BACKUP_DATE}"

# 1. 서비스 중지
echo "⏸️ 서비스 중지 중..."
docker-compose down

# 2. 데이터베이스 복구
echo "📊 데이터베이스 복구 중..."
docker-compose up -d postgres redis
sleep 30

# 기존 데이터베이스 삭제 및 재생성
docker-compose exec postgres dropdb -U timbel_user --if-exists timbel_cicd_operator
docker-compose exec postgres createdb -U timbel_user timbel_cicd_operator

docker-compose exec postgres dropdb -U timbel_user --if-exists timbel_knowledge
docker-compose exec postgres createdb -U timbel_user timbel_knowledge

# 백업 데이터 복원
gunzip -c "${BACKUP_DIR}/db_${BACKUP_DATE}.sql.gz" | docker-compose exec -T postgres psql -U timbel_user timbel_cicd_operator
gunzip -c "${BACKUP_DIR}/db_knowledge_${BACKUP_DATE}.sql.gz" | docker-compose exec -T postgres psql -U timbel_user timbel_knowledge

# 3. Redis 복구
echo "🗄️ Redis 복구 중..."
docker cp "${BACKUP_DIR}/redis_${BACKUP_DATE}.rdb" $(docker-compose ps -q redis):/data/dump.rdb
docker-compose restart redis

# 4. 설정 파일 복구
echo "⚙️ 설정 파일 복구 중..."
tar -xzf "${BACKUP_DIR}/configs_${BACKUP_DATE}.tar.gz"

# 5. 업로드 파일 복구
echo "📁 업로드 파일 복구 중..."
if [ -f "${BACKUP_DIR}/uploads_${BACKUP_DATE}.tar.gz" ]; then
  tar -xzf "${BACKUP_DIR}/uploads_${BACKUP_DATE}.tar.gz"
fi

# 6. 서비스 재시작
echo "🚀 서비스 재시작 중..."
docker-compose up -d

echo "✅ 복구 완료: ${BACKUP_DATE}"
```

---

## 🔧 트러블슈팅

### 1. 일반적인 문제 및 해결방법

#### 포트 충돌 문제
```bash
# 포트 사용 중인 프로세스 확인
sudo netstat -tulpn | grep :3000
sudo lsof -i :3000

# 프로세스 종료
sudo kill -9 <PID>

# Docker 포트 매핑 변경
# docker-compose.yml에서 포트 변경
ports:
  - "3001:3000"  # 호스트:컨테이너
```

#### 데이터베이스 연결 실패
```bash
# PostgreSQL 컨테이너 상태 확인
docker-compose ps postgres
docker-compose logs postgres

# 데이터베이스 연결 테스트
docker-compose exec postgres psql -U timbel_user -d timbel_cicd_operator -c "SELECT 1;"

# 연결 설정 확인
docker-compose exec backend env | grep DB_
```

#### 메모리 부족 문제
```bash
# 시스템 메모리 확인
free -h
docker stats

# 컨테이너별 메모리 사용량 확인
docker-compose exec backend ps aux --sort=-%mem | head

# 메모리 제한 설정
# docker-compose.yml에 추가:
deploy:
  resources:
    limits:
      memory: 1G
```

### 2. 로그 분석

#### 백엔드 로그 확인
```bash
# 실시간 로그
docker-compose logs -f backend

# 특정 시간대 로그
docker-compose logs --since="2024-01-01T10:00:00" --until="2024-01-01T11:00:00" backend

# 에러 로그만 필터링
docker-compose logs backend | grep -i error
```

#### 프론트엔드 로그 확인
```bash
# 빌드 로그
docker-compose logs frontend

# Nginx 액세스 로그
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Nginx 에러 로그
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

### 3. 성능 문제 진단

#### 데이터베이스 성능
```sql
-- 느린 쿼리 확인
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- 활성 연결 확인
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- 인덱스 사용률 확인
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'your_table_name';
```

#### API 성능 모니터링
```bash
# API 응답 시간 측정
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3001/api/health"

# curl-format.txt 내용:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

### 4. 재시작 및 복구 절차

#### 안전한 재시작
```bash
# 1. 헬스 체크
curl -f http://localhost:3001/health

# 2. 그레이스풀 셧다운
docker-compose stop

# 3. 컨테이너 상태 확인
docker-compose ps

# 4. 재시작
docker-compose up -d

# 5. 서비스 복구 확인
sleep 30
curl -f http://localhost:3001/health
```

#### 긴급 복구
```bash
# 1. 모든 컨테이너 강제 중지
docker-compose kill

# 2. 컨테이너 및 네트워크 정리
docker-compose down --remove-orphans

# 3. 볼륨 확인 (주의: 데이터 삭제 위험)
docker volume ls

# 4. 이미지 재빌드
docker-compose build --no-cache

# 5. 서비스 재시작
docker-compose up -d
```

---

## 📞 지원 및 문의

### 기술 지원
- **📧 이메일**: support@timbel.net
- **📞 전화**: +82-2-1234-5678
- **💬 슬랙**: #timbel-support
- **🐛 이슈 트래킹**: https://github.com/timbel/timbel-cicd-operator/issues

### 긴급 상황 대응
- **🚨 24/7 긴급 핫라인**: +82-10-1234-5678
- **📱 온콜 엔지니어**: oncall@timbel.net
- **⚡ 상태 페이지**: https://status.timbel.net

---

**📅 문서 버전**: v1.0  
**📅 최종 수정일**: 2024-01-01  
**👤 작성자**: Timbel DevOps Team  
**📧 문의**: devops@timbel.net
