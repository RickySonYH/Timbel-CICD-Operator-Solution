#!/bin/bash

# [advice from AI] 안정적인 서비스 재빌드 스크립트
# Docker buildx 문제 방지 및 환경변수 영구 적용을 위한 스크립트

set -e  # 에러 발생 시 스크립트 중단

echo "=== 🚀 Timbel 서비스 안정적 재빌드 스크립트 ==="

# Docker 빌드 환경 설정
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

echo "1. 기존 컨테이너 정리..."
docker-compose down --remove-orphans

echo "2. 이미지 캐시 정리..."
docker system prune -f --volumes

echo "3. 프론트엔드 node_modules 볼륨 재생성..."
docker volume rm -f timbel-knowledge-dev_frontend_node_modules 2>/dev/null || true

echo "4. 서비스 빌드 및 시작..."
docker-compose up -d --build --force-recreate

echo "5. 서비스 상태 확인 (60초 대기)..."
sleep 60

echo "6. 최종 상태 점검..."
docker-compose ps

echo "7. 프론트엔드 환경변수 확인..."
docker-compose exec frontend sh -c "echo 'REACT_APP_API_URL='$REACT_APP_API_URL"

echo "8. 연결 테스트..."
echo "- 웹사이트: $(curl -s http://localhost:3000 -w 'HTTP %{http_code}' -o /dev/null)"
echo "- API: $(curl -s http://localhost:3000/api/health -w 'HTTP %{http_code}' -o /dev/null)"

echo ""
echo "✅ 재빌드 완료!"
echo "🌐 접속 주소:"
echo "  - http://localhost:3000"
echo "  - http://rdc.rickyson.com:3000"
echo ""
echo "🔐 로그인 정보:"
echo "  - 이메일: admin@timbel.net"
echo "  - 비밀번호: 1q2w3e4r"
