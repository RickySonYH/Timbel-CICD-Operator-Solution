#!/bin/bash
# [advice from AI] Timbel 도커 환경 시작 스크립트

# 색상 설정
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🐳 Timbel 지식자원 플랫폼 도커 환경 시작"
echo "=============================================="

# 1. 도커 상태 확인
log_info "도커 데몬 상태 확인 중..."
if ! docker info > /dev/null 2>&1; then
    log_error "도커 데몬이 실행되지 않고 있습니다."
    log_info "도커를 시작하려면 다음 명령을 실행하세요:"
    echo "sudo systemctl start docker"
    exit 1
fi
log_success "도커 데몬 실행 중"

# 2. 기존 컨테이너 정리
log_info "기존 컨테이너 상태 확인 중..."
if docker-compose ps -q > /dev/null 2>&1; then
    log_info "기존 컨테이너 정리 중..."
    docker-compose down > /dev/null 2>&1
fi

# 3. 최신 이미지로 서비스 시작
log_info "서비스 시작 중..."
docker-compose up -d

# 4. 서비스 시작 대기
log_info "서비스 초기화 대기 중 (60초)..."
sleep 60

# 5. 헬스체크
log_info "서비스 상태 확인 중..."

# 백엔드 헬스체크
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    log_success "✅ 백엔드 서비스 (포트 3001)"
else
    log_warning "⚠️ 백엔드 서비스 응답 없음"
fi

# 프론트엔드 헬스체크
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    log_success "✅ 프론트엔드 서비스 (포트 3000)"
else
    log_warning "⚠️ 프론트엔드 서비스 응답 없음"
fi

# 데이터베이스 헬스체크
if docker-compose exec -T postgres pg_isready -U timbel_user > /dev/null 2>&1; then
    log_success "✅ PostgreSQL 데이터베이스 (포트 5434)"
else
    log_warning "⚠️ PostgreSQL 데이터베이스 응답 없음"
fi

# Redis 헬스체크
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    log_success "✅ Redis 캐시 (포트 6379)"
else
    log_warning "⚠️ Redis 캐시 응답 없음"
fi

# Elasticsearch 헬스체크
if curl -s -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    log_success "✅ Elasticsearch 검색엔진 (포트 9200)"
else
    log_warning "⚠️ Elasticsearch 검색엔진 응답 없음"
fi

echo ""
log_info "=== 🌐 접속 정보 ==="
echo "프론트엔드:    http://localhost:3000"
echo "백엔드 API:    http://localhost:3001"
echo "Grafana:      http://localhost:3003 (admin/timbel_admin)"
echo "Prometheus:   http://localhost:9090"
echo "MinIO:        http://localhost:9001 (timbel_access/timbel_secret)"
echo "ChromaDB:     http://localhost:8100"

echo ""
log_info "=== 📊 컨테이너 상태 ==="
docker-compose ps

echo ""
log_success "🎉 Timbel 플랫폼이 성공적으로 시작되었습니다!"
log_info "모니터링: ./docker-monitor.sh status"
log_info "중지: docker-compose down"
