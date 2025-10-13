#!/bin/bash
# [advice from AI] Kind 클러스터 + ArgoCD + NGINX Ingress 통합 설치 스크립트
# 호스트에 직접 설치하는 방식

set -e

echo "🚀 Timbel CICD Operator Solution - Kubernetes 환경 설치"
echo "============================================================"
echo ""

# 1. Kind 설치 확인 및 설치
echo "📦 1단계: Kind 설치 확인..."
if ! command -v kind &> /dev/null; then
    echo "   Kind가 설치되어 있지 않습니다. 설치를 시작합니다..."
    
    # Kind 다운로드
    curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
    chmod +x ./kind
    
    echo "   ✅ Kind 다운로드 완료 (./kind)"
    export PATH=$PATH:$(pwd)
else
    echo "   ✅ Kind가 이미 설치되어 있습니다."
fi

# 2. kubectl 설치 확인 및 설치
echo ""
echo "📦 2단계: kubectl 설치 확인..."
if ! command -v kubectl &> /dev/null; then
    echo "   kubectl이 설치되어 있지 않습니다. 설치를 시작합니다..."
    
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x ./kubectl
    
    echo "   ✅ kubectl 다운로드 완료 (./kubectl)"
    export PATH=$PATH:$(pwd)
else
    echo "   ✅ kubectl이 이미 설치되어 있습니다."
fi

# 3. 기존 Kind 클러스터 확인 및 삭제
echo ""
echo "🔍 3단계: 기존 Kind 클러스터 확인..."
if kind get clusters 2>/dev/null | grep -q "timbel-cluster"; then
    echo "   기존 timbel-cluster를 삭제합니다..."
    kind delete cluster --name timbel-cluster
    echo "   ✅ 기존 클러스터 삭제 완료"
fi

# 4. Kind 클러스터 생성
echo ""
echo "🏗️  4단계: Kind 클러스터 생성..."
cat <<EOF | kind create cluster --name timbel-cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 8090
    protocol: TCP
  - containerPort: 443
    hostPort: 8443
    protocol: TCP
networking:
  apiServerAddress: "127.0.0.1"
  apiServerPort: 6443
EOF

echo "   ✅ Kind 클러스터 생성 완료"

# 5. 클러스터 확인
echo ""
echo "🔍 5단계: 클러스터 상태 확인..."
kubectl cluster-info --context kind-timbel-cluster
kubectl get nodes

# 6. NGINX Ingress Controller 설치
echo ""
echo "📦 6단계: NGINX Ingress Controller 설치..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/kind/deploy.yaml

echo "   ⏳ Ingress Controller Pod 준비 대기 중..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo "   ✅ NGINX Ingress Controller 설치 완료"

# 7. ArgoCD 설치
echo ""
echo "📦 7단계: ArgoCD 설치..."

# ArgoCD 네임스페이스 생성
kubectl create namespace argocd || true

# ArgoCD 설치
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "   ⏳ ArgoCD Pod 준비 대기 중..."
kubectl wait --namespace argocd \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/name=argocd-server \
  --timeout=120s || echo "   ⚠️  ArgoCD 초기화 중입니다..."

# ArgoCD Server를 NodePort로 노출
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "nodePort": 30080}]}}'

# 8. ArgoCD 초기 비밀번호 가져오기
echo ""
echo "🔑 8단계: ArgoCD 초기 설정..."
sleep 5
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>/dev/null | base64 -d || echo "비밀번호를 아직 가져올 수 없습니다")

# 9. Timbel 서비스용 네임스페이스 생성
echo ""
echo "📦 9단계: Timbel 네임스페이스 생성..."
kubectl create namespace timbel || true

# 10. 설치 완료 정보 출력
echo ""
echo "============================================================"
echo "🎉 설치 완료!"
echo "============================================================"
echo ""
echo "📋 Kubernetes 클러스터 정보:"
echo "   Cluster Name: timbel-cluster"
echo "   Context: kind-timbel-cluster"
echo ""
echo "🌐 서비스 접속 정보:"
echo ""
echo "   🔹 Frontend:   http://localhost:3000"
echo "   🔹 Backend:    http://localhost:3001"
echo "   🔹 Jenkins:    http://localhost:8080"
echo "   🔹 Nexus:      http://localhost:8081"
echo "   🔹 Grafana:    http://localhost:3003"
echo "   🔹 Prometheus: http://localhost:9090"
echo ""
echo "   🔹 ArgoCD UI:  http://localhost:30080"
echo "      Username: admin"
if [ "$ARGOCD_PASSWORD" != "비밀번호를 아직 가져올 수 없습니다" ]; then
    echo "      Password: $ARGOCD_PASSWORD"
else
    echo "      Password: (다음 명령어로 확인)"
    echo "      kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d"
fi
echo ""
echo "   🔹 K8s API:    https://localhost:6443"
echo ""
echo "📝 유용한 명령어:"
echo "   kubectl get nodes"
echo "   kubectl get pods -A"
echo "   kubectl config use-context kind-timbel-cluster"
echo ""
echo "🔧 Kind 클러스터 삭제:"
echo "   kind delete cluster --name timbel-cluster"
echo ""

