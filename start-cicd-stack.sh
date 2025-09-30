#!/bin/bash
# [advice from AI] Timbel Knowledge CI/CD Stack 통합 시작 스크립트
# Jenkins + Nexus + Argo CD + Gitea 자동 구축 및 설정

set -e

echo "🚀 Timbel Knowledge CI/CD Stack 시작..."
echo "======================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 필수 디렉토리 생성
log_info "필수 디렉토리 생성 중..."
mkdir -p data/jenkins_home
mkdir -p data/nexus_data
mkdir -p data/argocd_data
mkdir -p data/gitea_data
mkdir -p data/gitea-postgres
mkdir -p nginx/ssl

# 권한 설정
log_info "권한 설정 중..."
sudo chown -R 1000:1000 data/jenkins_home
sudo chown -R 200:200 data/nexus_data
sudo chown -R 999:999 data/argocd_data
sudo chown -R 1000:1000 data/gitea_data

# Docker 네트워크 생성 (이미 존재하면 무시)
log_info "Docker 네트워크 생성 중..."
docker network create cicd-network --subnet=172.20.0.0/16 2>/dev/null || true

# 기존 컨테이너 정리
log_info "기존 CI/CD 컨테이너 정리 중..."
docker-compose -f docker-compose-cicd.yml down 2>/dev/null || true

# CI/CD Stack 시작
log_info "CI/CD Stack 시작 중..."
docker-compose -f docker-compose-cicd.yml up -d

# 서비스 시작 대기
log_info "서비스 시작 대기 중..."
sleep 30

# 서비스 상태 확인
log_info "서비스 상태 확인 중..."

services=("jenkins:8080" "nexus:8081" "argocd-server:8083" "gitea:3000")
for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if curl -f -s http://localhost:$port > /dev/null; then
        log_success "$name 서비스 정상 실행 중 (포트: $port)"
    else
        log_warning "$name 서비스 시작 중... (포트: $port)"
    fi
done

echo ""
echo "🎉 CI/CD Stack 구축 완료!"
echo "======================================"
echo ""
echo "📋 접속 정보:"
echo "• Jenkins:    http://localhost:8080"
echo "  - 사용자:   admin / 1q2w3e4r"
echo "  - 개발자:   timbel / timbel123"
echo ""
echo "• Nexus:      http://localhost:8081"
echo "  - 사용자:   admin / admin123"
echo "  - Docker:   localhost:8082"
echo ""
echo "• Argo CD:    http://localhost:8083"
echo "  - 사용자:   admin / (초기 비밀번호는 로그에서 확인)"
echo ""
echo "• Gitea:      http://localhost:3000"
echo "  - 초기 설정 필요"
echo ""
echo "🔧 추가 설정:"
echo "1. Nexus Docker Registry 설정"
echo "2. Argo CD 초기 비밀번호 확인"
echo "3. Gitea 초기 설정 완료"
echo "4. Jenkins와 각 서비스 연동 설정"
echo ""
echo "📝 로그 확인: docker-compose -f docker-compose-cicd.yml logs -f [서비스명]"
echo "🛑 중지: docker-compose -f docker-compose-cicd.yml down"
