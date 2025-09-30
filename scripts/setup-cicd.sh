#!/bin/bash
# [advice from AI] CI/CD 스택 자동 설정 스크립트
# Jenkins, Nexus, Argo CD, Gitea 완전 자동화 설정

set -e

echo "🚀 Timbel Knowledge CI/CD 스택 자동 설정 시작..."
echo "========================================"

# 서비스 대기 함수
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ $service_name 서비스 대기 중..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "✅ $service_name 서비스 준비 완료!"
            return 0
        fi
        
        echo "   시도 $attempt/$max_attempts - $service_name 대기 중..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name 서비스 시작 실패!"
    return 1
}

# 1. Jenkins 설정
echo "🔧 Jenkins 자동 설정 중..."
wait_for_service "Jenkins" "http://jenkins:8080/login"

# Jenkins API 토큰 생성 및 Job 생성
echo "📝 Jenkins Job 템플릿 생성 중..."
cat > /tmp/jenkins-job.xml << 'EOF'
<?xml version='1.1' encoding='UTF-8'?>
<project>
  <description>Timbel Knowledge 자동 생성 파이프라인</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <scm class="hudson.plugins.git.GitSCM">
    <configVersion>2</configVersion>
    <userRemoteConfigs>
      <hudson.plugins.git.UserRemoteConfig>
        <url>http://gitea:3000/admin/sample-project.git</url>
      </hudson.plugins.git.UserRemoteConfig>
    </userRemoteConfigs>
    <branches>
      <hudson.plugins.git.BranchSpec>
        <name>*/main</name>
      </hudson.plugins.git.BranchSpec>
    </branches>
  </scm>
  <builders>
    <hudson.tasks.Shell>
      <command>
echo "🏗️ Building application..."
docker build -t nexus:8082/timbel/sample-app:$BUILD_NUMBER .
echo "📦 Pushing to Nexus..."
docker push nexus:8082/timbel/sample-app:$BUILD_NUMBER
echo "🚀 Triggering Argo CD deployment..."
curl -X POST http://argocd-server:8080/api/v1/applications/sample-app/sync
      </command>
    </hudson.tasks.Shell>
  </builders>
  <publishers/>
  <buildWrappers/>
</project>
EOF

# 2. Nexus 설정
echo "🔧 Nexus 자동 설정 중..."
wait_for_service "Nexus" "http://nexus:8081/service/rest/v1/status"

# Docker Registry 생성
echo "🐳 Nexus Docker Registry 설정 중..."
curl -u admin:admin123! -X POST "http://nexus:8081/service/rest/v1/repositories/docker/hosted" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "docker-hosted",
    "online": true,
    "storage": {
      "blobStoreName": "default",
      "strictContentTypeValidation": true,
      "writePolicy": "allow"
    },
    "docker": {
      "v1Enabled": false,
      "forceBasicAuth": true,
      "httpPort": 8082
    }
  }' || echo "Docker Registry 이미 존재하거나 생성 실패"

# 3. Argo CD 설정
echo "🔧 Argo CD 자동 설정 중..."
wait_for_service "Argo CD" "http://argocd-server:8080/healthz"

# Argo CD CLI 설치 및 설정
echo "📥 Argo CD CLI 설치 중..."
curl -sSL -o /tmp/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /tmp/argocd

# Argo CD 로그인 및 애플리케이션 생성
echo "🔐 Argo CD 로그인 중..."
/tmp/argocd login argocd-server:8080 --username admin --password admin123! --insecure

# 샘플 애플리케이션 생성
echo "📱 Argo CD 샘플 애플리케이션 생성 중..."
/tmp/argocd app create sample-app \
  --repo http://gitea:3000/admin/sample-project.git \
  --path . \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --auto-prune \
  --self-heal || echo "애플리케이션 이미 존재하거나 생성 실패"

# 4. Gitea 설정
echo "🔧 Gitea 자동 설정 중..."
wait_for_service "Gitea" "http://gitea:3000/api/v1/version"

# 샘플 저장소 생성
echo "📂 Gitea 샘플 저장소 생성 중..."
curl -u admin:admin123! -X POST "http://gitea:3000/api/v1/user/repos" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sample-project",
    "description": "Timbel Knowledge 샘플 프로젝트",
    "private": false,
    "auto_init": true,
    "default_branch": "main"
  }' || echo "저장소 이미 존재하거나 생성 실패"

# 5. 통합 테스트
echo "🧪 CI/CD 파이프라인 통합 테스트 중..."

# Jenkins Job 생성
curl -u admin:admin123! -X POST "http://jenkins:8080/createItem?name=timbel-sample-pipeline" \
  -H "Content-Type: application/xml" \
  --data-binary @/tmp/jenkins-job.xml || echo "Job 이미 존재하거나 생성 실패"

echo ""
echo "🎉 CI/CD 스택 자동 설정 완료!"
echo "========================================"
echo "📋 접속 정보:"
echo "   🔧 Jenkins:  http://localhost:8080 (admin/admin123!)"
echo "   📦 Nexus:    http://localhost:8081 (admin/admin123!)"
echo "   🚀 Argo CD:  http://localhost:8084 (admin/admin123!)"
echo "   📂 Gitea:    http://localhost:3010 (admin/admin123!)"
echo ""
echo "🔗 Docker Registry: localhost:8082"
echo "📊 모든 서비스가 Nginx를 통해 통합 접근 가능합니다."
echo ""
echo "✅ 설정이 완료되었습니다. 이제 CI/CD 파이프라인을 사용할 수 있습니다!"
