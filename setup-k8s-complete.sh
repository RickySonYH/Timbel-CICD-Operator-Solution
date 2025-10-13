#!/bin/bash
# [advice from AI] Kind 클러스터 + NGINX Ingress 통합 설치 스크립트

set -e

echo "🚀 Kubernetes 환경 설정 시작..."

# Kind 클러스터 컨테이너 확인
CLUSTER_NAME=$(docker ps --filter "ancestor=kindest/node:v1.27.3" --format "{{.Names}}" | head -1)

if [ -z "$CLUSTER_NAME" ]; then
    echo "❌ Kind 클러스터를 찾을 수 없습니다. Docker Compose로 먼저 시작해주세요:"
    echo "   docker-compose -f docker-compose-localhost.yml up -d"
    exit 1
fi

echo "✅ Kind 클러스터 발견: $CLUSTER_NAME"
echo ""

# 클러스터가 준비될 때까지 대기
echo "⏳ 클러스터 초기화 대기 중 (최대 2분)..."
RETRY=0
MAX_RETRY=24
while [ $RETRY -lt $MAX_RETRY ]; do
    if docker exec $CLUSTER_NAME kubectl get nodes >/dev/null 2>&1; then
        echo "✅ 클러스터가 준비되었습니다!"
        break
    fi
    RETRY=$((RETRY+1))
    echo "   시도 $RETRY/$MAX_RETRY..."
    sleep 5
done

if [ $RETRY -eq $MAX_RETRY ]; then
    echo "❌ 클러스터 초기화 시간 초과"
    exit 1
fi

echo ""
echo "📦 NGINX Ingress Controller 설치 중..."

# NGINX Ingress Controller 설치
docker exec $CLUSTER_NAME kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/kind/deploy.yaml

echo "⏳ NGINX Ingress Controller Pod 준비 대기 중..."
docker exec $CLUSTER_NAME kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s || echo "⚠️  타임아웃: Pod가 아직 준비 중일 수 있습니다."

echo ""
echo "📋 Ingress Controller 상태:"
docker exec $CLUSTER_NAME kubectl get pods -n ingress-nginx
echo ""

echo "🔧 Timbel 서비스 설정 적용 중..."

# Kubernetes 매니페스트를 클러스터에 복사하고 적용
docker cp /home/rickyson/RickyProject/Timbel-CICD-Operator-Solution/k8s $CLUSTER_NAME:/tmp/

# Services 생성
echo "   - Services 생성..."
docker exec $CLUSTER_NAME kubectl apply -f /tmp/k8s/services.yaml

# Ingress 생성
echo "   - Ingress 생성..."
docker exec $CLUSTER_NAME kubectl apply -f /tmp/k8s/ingress/timbel-ingress.yaml

echo ""
echo "📊 생성된 리소스 확인:"
echo ""
echo "Services:"
docker exec $CLUSTER_NAME kubectl get services
echo ""
echo "Ingress:"
docker exec $CLUSTER_NAME kubectl get ingress
echo ""

echo "✅ Kubernetes 환경 설정 완료!"
echo ""
echo "🌐 접속 정보:"
echo "   Frontend:   http://localhost/"
echo "   Backend:    http://localhost/api"
echo "   Jenkins:    http://localhost/jenkins"
echo "   Nexus:      http://localhost/nexus"
echo "   ArgoCD:     http://localhost/argocd"
echo "   Grafana:    http://localhost/grafana"
echo "   Prometheus: http://localhost/prometheus"
echo ""
echo "🎉 모든 설정이 완료되었습니다!"

