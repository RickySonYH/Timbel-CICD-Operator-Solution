#!/bin/bash
# [advice from AI] Timbel Knowledge CI/CD 스택 완전 자동 설치 스크립트
# 한 번의 실행으로 모든 CI/CD 도구 설치 및 설정

set -e

echo "🚀 Timbel Knowledge CI/CD 스택 완전 자동 설치"
echo "=================================================="
echo "📋 설치될 구성요소:"
echo "   🔧 Jenkins CI/CD Server"
echo "   📦 Nexus Repository Manager"
echo "   🚀 Argo CD GitOps Platform"
echo "   📂 Gitea Git Server"
echo "   🐳 Docker Registry"
echo "   🌐 Nginx Reverse Proxy"
echo ""

# 시스템 요구사항 확인
echo "🔍 시스템 요구사항 확인 중..."

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되지 않았습니다. Docker를 먼저 설치해주세요."
    exit 1
fi

# Docker Compose 설치 확인
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose가 설치되지 않았습니다. Docker Compose를 먼저 설치해주세요."
    exit 1
fi

# 메모리 확인 (최소 8GB 권장)
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 8 ]; then
    echo "⚠️  경고: 시스템 메모리가 ${TOTAL_MEM}GB입니다. 최소 8GB를 권장합니다."
    read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ 시스템 요구사항 확인 완료"

# 기존 서비스 정리
echo "🧹 기존 CI/CD 서비스 정리 중..."
docker-compose -f docker-compose-cicd-simple.yml down --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose-cicd-complete.yml down --remove-orphans 2>/dev/null || true

# 필수 디렉토리 생성
echo "📁 필수 디렉토리 생성 중..."
mkdir -p data/{jenkins_home,nexus_data,argocd_data,gitea_data,gitea_postgres_data}
mkdir -p nginx/ssl
mkdir -p scripts
mkdir -p nexus/init-scripts

# 권한 설정
echo "🔐 디렉토리 권한 설정 중..."
if [ "$EUID" -eq 0 ]; then
    # root로 실행 중인 경우
    chown -R 1000:1000 data/jenkins_home data/gitea_data
    chown -R 200:200 data/nexus_data
    chown -R 999:999 data/argocd_data
    chown -R 999:999 data/gitea_postgres_data
else
    # 일반 사용자로 실행 중인 경우 sudo 사용
    echo "관리자 권한이 필요합니다. sudo 비밀번호를 입력해주세요."
    sudo chown -R 1000:1000 data/jenkins_home data/gitea_data
    sudo chown -R 200:200 data/nexus_data
    sudo chown -R 999:999 data/argocd_data data/gitea_postgres_data
fi

# Docker 네트워크 생성
echo "🌐 Docker 네트워크 생성 중..."
docker network create cicd-network --subnet=172.20.0.0/16 2>/dev/null || echo "네트워크가 이미 존재합니다."

# CI/CD 스택 시작
echo "🚀 CI/CD 스택 시작 중..."
echo "   이 과정은 5-10분 정도 소요될 수 있습니다..."

docker-compose -f docker-compose-cicd-complete.yml up -d

# 서비스 시작 대기
echo "⏳ 서비스 시작 대기 중..."
echo "   모든 서비스가 완전히 시작될 때까지 기다리는 중..."

# 서비스별 헬스체크
services=("jenkins:8080" "nexus:8081" "gitea:3010" "argocd-server:8084")
service_names=("Jenkins" "Nexus" "Gitea" "Argo CD")

for i in "${!services[@]}"; do
    service="${services[$i]}"
    name="${service_names[$i]}"
    
    echo "   🔍 $name 서비스 확인 중..."
    
    # 최대 10분 대기
    timeout=600
    elapsed=0
    interval=15
    
    while [ $elapsed -lt $timeout ]; do
        if docker exec timbel-jenkins curl -s -f "http://localhost:8080/login" > /dev/null 2>&1 && [ "$name" = "Jenkins" ]; then
            echo "   ✅ $name 준비 완료!"
            break
        elif docker exec timbel-nexus curl -s -f "http://localhost:8081/service/rest/v1/status" > /dev/null 2>&1 && [ "$name" = "Nexus" ]; then
            echo "   ✅ $name 준비 완료!"
            break
        elif docker exec timbel-gitea curl -s -f "http://localhost:3000/api/v1/version" > /dev/null 2>&1 && [ "$name" = "Gitea" ]; then
            echo "   ✅ $name 준비 완료!"
            break
        elif docker exec timbel-argocd-server curl -s -f "http://localhost:8080/healthz" > /dev/null 2>&1 && [ "$name" = "Argo CD" ]; then
            echo "   ✅ $name 준비 완료!"
            break
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        echo "   ⏳ $name 대기 중... (${elapsed}s/${timeout}s)"
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "   ⚠️  $name 서비스 시작 시간 초과. 수동으로 확인해주세요."
    fi
done

# 자동 설정 실행
echo "🔧 서비스 자동 설정 실행 중..."
if [ -f "./scripts/setup-cicd.sh" ]; then
    docker run --rm --network cicd-network \
        -v "$(pwd)/scripts:/scripts" \
        alpine/curl:latest /scripts/setup-cicd.sh
else
    echo "⚠️  자동 설정 스크립트를 찾을 수 없습니다. 수동 설정이 필요할 수 있습니다."
fi

# 설치 완료 메시지
echo ""
echo "🎉 Timbel Knowledge CI/CD 스택 설치 완료!"
echo "=================================================="
echo ""
echo "📋 서비스 접속 정보:"
echo "   🔧 Jenkins:     http://localhost:8080"
echo "   📦 Nexus:       http://localhost:8081"
echo "   🚀 Argo CD:     http://localhost:8084"
echo "   📂 Gitea:       http://localhost:3010"
echo "   🐳 Registry:    localhost:8082"
echo "   🌐 통합 대시보드: http://localhost"
echo ""
echo "🔐 기본 계정 정보:"
echo "   사용자명: admin"
echo "   비밀번호: admin123!"
echo ""
echo "📊 서비스 상태 확인:"
echo "   docker-compose -f docker-compose-cicd-complete.yml ps"
echo ""
echo "🔄 서비스 재시작:"
echo "   docker-compose -f docker-compose-cicd-complete.yml restart"
echo ""
echo "🛑 서비스 중지:"
echo "   docker-compose -f docker-compose-cicd-complete.yml down"
echo ""
echo "✅ 설치가 완료되었습니다!"
echo "   웹 브라우저에서 http://localhost 를 방문하여 시작하세요."
