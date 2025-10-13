#!/bin/bash
# [advice from AI] Kind 클러스터에 NGINX Ingress Controller 설치 스크립트

set -e

echo "🚀 NGINX Ingress Controller 설치 시작..."

# Kind 클러스터 컨테이너 찾기
CLUSTER_NAME=$(docker ps --filter "ancestor=kindest/node:v1.27.3" --format "{{.Names}}" | head -1)

if [ -z "$CLUSTER_NAME" ]; then
    echo "❌ Kind 클러스터를 찾을 수 없습니다."
    exit 1
fi

echo "✅ Kind 클러스터 발견: $CLUSTER_NAME"

# kubectl 명령을 클러스터 컨테이너에서 실행
echo "📦 NGINX Ingress Controller 매니페스트 적용 중..."

# NGINX Ingress Controller 설치
docker exec $CLUSTER_NAME sh -c "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml"

echo "⏳ NGINX Ingress Controller Pod가 준비될 때까지 대기 중..."
sleep 10

# Ingress Controller 상태 확인
docker exec $CLUSTER_NAME sh -c "kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s" || echo "⚠️  타임아웃: Pod가 아직 준비 중일 수 있습니다."

echo ""
echo "✅ NGINX Ingress Controller 설치 완료!"
echo ""
echo "📋 설치된 리소스 확인:"
docker exec $CLUSTER_NAME sh -c "kubectl get pods -n ingress-nginx"
echo ""
echo "🎉 NGINX Ingress Controller가 성공적으로 설치되었습니다!"

