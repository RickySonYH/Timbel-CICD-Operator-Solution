#!/bin/bash
# [advice from AI] Kind Kubernetes 클러스터 설정 스크립트

set -e

echo "🚀 Kind Kubernetes 클러스터 설정 시작..."

# Kind 클러스터가 이미 실행 중인지 확인
if docker ps | grep -q "kindest/node"; then
    echo "✅ Kind 클러스터가 이미 실행 중입니다."
    CLUSTER_NAME=$(docker ps --filter "ancestor=kindest/node:v1.27.3" --format "{{.Names}}" | head -1)
else
    echo "⏳ Kind 클러스터를 찾을 수 없습니다. Docker Compose로 시작해주세요."
    exit 1
fi

# 클러스터 정보 가져오기
echo "📋 클러스터 정보 수집 중..."
CLUSTER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $CLUSTER_NAME)

echo "🔧 Kubeconfig 파일 생성 중..."

# Kubeconfig 파일 생성
cat > /home/rickyson/RickyProject/Timbel-CICD-Operator-Solution/kind-kubeconfig << EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://${CLUSTER_IP}:6443
    insecure-skip-tls-verify: true
  name: kind-cluster
contexts:
- context:
    cluster: kind-cluster
    user: kind-admin
  name: kind-context
current-context: kind-context
users:
- name: kind-admin
  user:
    token: kind-admin-token
EOF

echo "✅ Kubeconfig 파일이 생성되었습니다: kind-kubeconfig"
echo "📍 클러스터 IP: ${CLUSTER_IP}"
echo ""
echo "🎉 Kind 클러스터 설정 완료!"
echo ""
echo "다음 명령어로 ArgoCD 컨테이너들을 재시작하세요:"
echo "  docker-compose -f docker-compose-localhost.yml restart argocd-server argocd-application-controller argocd-repo-server"

