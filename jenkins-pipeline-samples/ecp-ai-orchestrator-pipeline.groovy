pipeline {
    agent any
    
    environment {
        NEXUS_URL = 'http://nexus.rdc.rickyson.com:8081'
        NEXUS_REPOSITORY = 'maven-releases'
        NEXUS_CREDENTIALS = 'nexus-credentials'
        ARGOCD_URL = 'http://argocd.rdc.rickyson.com:8081'
        ARGOCD_CREDENTIALS = 'argocd-credentials'
        DOCKER_REGISTRY = 'nexus.rdc.rickyson.com:8081'
        PROJECT_NAME = 'ecp-ai-orchestrator'
        GROUP_ID = 'com.ecpai.orchestrator'
        ARTIFACT_ID = 'ecp-ai-orchestrator'
    }
    
    parameters {
        string(name: 'VERSION', defaultValue: '1.2.3', description: '배포할 버전')
        choice(name: 'TARGET_ENV', choices: ['staging', 'production'], description: '배포 환경')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: '테스트 건너뛰기')
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo "📦 소스 코드 체크아웃..."
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Build & Test') {
            parallel {
                stage('Unit Tests') {
                    when {
                        not { params.SKIP_TESTS }
                    }
                    steps {
                        echo "🧪 단위 테스트 실행..."
                        sh '''
                            mvn clean test -Dmaven.test.failure.ignore=true
                        '''
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'target/surefire-reports/*.xml'
                            publishCoverage adapters: [jacocoAdapter('target/site/jacoco/jacoco.xml')]
                        }
                    }
                }
                
                stage('Code Quality') {
                    steps {
                        echo "🔍 코드 품질 검사..."
                        sh '''
                            mvn sonar:sonar \
                                -Dsonar.projectKey=ecp-ai-orchestrator \
                                -Dsonar.host.url=http://sonar.rdc.rickyson.com:9000 \
                                -Dsonar.login=${SONAR_TOKEN}
                        '''
                    }
                }
            }
        }
        
        stage('Package') {
            steps {
                echo "📦 애플리케이션 패키징..."
                sh '''
                    mvn clean package -DskipTests=${SKIP_TESTS} \
                        -Dversion=${VERSION} \
                        -Dbuild.number=${BUILD_NUMBER} \
                        -Dgit.commit=${GIT_COMMIT_SHORT}
                '''
            }
            post {
                success {
                    archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                echo "🐳 Docker 이미지 빌드..."
                script {
                    def imageTag = "${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}-${BUILD_NUMBER}"
                    def imageTagLatest = "${DOCKER_REGISTRY}/${PROJECT_NAME}:latest"
                    
                    sh """
                        docker build -t ${imageTag} -t ${imageTagLatest} .
                    """
                    
                    env.DOCKER_IMAGE = imageTag
                }
            }
        }
        
        stage('Push to Nexus') {
            steps {
                echo "📤 Nexus에 아티팩트 업로드..."
                script {
                    withCredentials([usernamePassword(credentialsId: NEXUS_CREDENTIALS, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                        sh '''
                            mvn deploy:deploy-file \
                                -DgroupId=${GROUP_ID} \
                                -DartifactId=${ARTIFACT_ID} \
                                -Dversion=${VERSION} \
                                -Dpackaging=jar \
                                -Dfile=target/${ARTIFACT_ID}-${VERSION}.jar \
                                -DrepositoryId=nexus-releases \
                                -Durl=${NEXUS_URL}/repository/${NEXUS_REPOSITORY}
                        '''
                    }
                }
            }
        }
        
        stage('Push Docker Image') {
            steps {
                echo "🐳 Docker 이미지를 레지스트리에 푸시..."
                script {
                    withCredentials([usernamePassword(credentialsId: NEXUS_CREDENTIALS, usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                        sh """
                            docker login ${DOCKER_REGISTRY} -u ${NEXUS_USER} -p ${NEXUS_PASS}
                            docker push ${DOCKER_IMAGE}
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                anyOf {
                    params.TARGET_ENV == 'staging'
                    params.TARGET_ENV == 'production'
                }
            }
            steps {
                echo "🚀 Staging 환경에 배포..."
                script {
                    withCredentials([usernamePassword(credentialsId: ARGOCD_CREDENTIALS, usernameVariable: 'ARGOCD_USER', passwordVariable: 'ARGOCD_PASS')]) {
                        sh """
                            # ArgoCD 애플리케이션 동기화
                            argocd app sync ecp-ai-staging \
                                --server ${ARGOCD_URL} \
                                --username ${ARGOCD_USER} \
                                --password ${ARGOCD_PASS} \
                                --insecure
                            
                            # 배포 상태 확인
                            argocd app wait ecp-ai-staging \
                                --server ${ARGOCD_URL} \
                                --username ${ARGOCD_USER} \
                                --password ${ARGOCD_PASS} \
                                --timeout 300
                        """
                    }
                }
            }
        }
        
        stage('Integration Tests') {
            when {
                params.TARGET_ENV == 'staging'
            }
            steps {
                echo "🧪 통합 테스트 실행..."
                sh '''
                    # Staging 환경에서 통합 테스트 실행
                    mvn verify -Pintegration-tests \
                        -Dtest.environment=staging \
                        -Dapp.url=http://ecp-ai-staging.rdc.rickyson.com
                '''
            }
        }
        
        stage('Deploy to Production') {
            when {
                params.TARGET_ENV == 'production'
            }
            steps {
                echo "🚀 Production 환경에 배포..."
                script {
                    withCredentials([usernamePassword(credentialsId: ARGOCD_CREDENTIALS, usernameVariable: 'ARGOCD_USER', passwordVariable: 'ARGOCD_PASS')]) {
                        sh """
                            # ArgoCD 애플리케이션 동기화
                            argocd app sync ecp-ai-production \
                                --server ${ARGOCD_URL} \
                                --username ${ARGOCD_USER} \
                                --password ${ARGOCD_PASS} \
                                --insecure
                            
                            # 배포 상태 확인
                            argocd app wait ecp-ai-production \
                                --server ${ARGOCD_URL} \
                                --username ${ARGOCD_USER} \
                                --password ${ARGOCD_PASS} \
                                --timeout 600
                        """
                    }
                }
            }
        }
        
        stage('Health Check') {
            steps {
                echo "🏥 헬스 체크 실행..."
                script {
                    def targetUrl = params.TARGET_ENV == 'production' ? 
                        'http://ecp-ai-production.rdc.rickyson.com' : 
                        'http://ecp-ai-staging.rdc.rickyson.com'
                    
                    sh """
                        # 헬스 체크 실행
                        curl -f ${targetUrl}/health || exit 1
                        
                        # 메트릭 확인
                        curl -f ${targetUrl}/metrics || exit 1
                    """
                }
            }
        }
    }
    
    post {
        always {
            echo "📊 파이프라인 실행 완료"
            cleanWs()
        }
        
        success {
            echo "✅ 배포 성공!"
            script {
                def message = """
                🎉 ECP-AI Orchestrator 배포 성공!
                
                📋 배포 정보:
                • 버전: ${params.VERSION}
                • 환경: ${params.TARGET_ENV}
                • 빌드 번호: ${BUILD_NUMBER}
                • Git 커밋: ${env.GIT_COMMIT_SHORT}
                • Docker 이미지: ${env.DOCKER_IMAGE}
                
                🔗 링크:
                • Jenkins: ${BUILD_URL}
                • ArgoCD: ${ARGOCD_URL}
                • Nexus: ${NEXUS_URL}
                """
                
                // Slack 알림 (선택사항)
                // slackSend channel: '#deployments', message: message
            }
        }
        
        failure {
            echo "❌ 배포 실패!"
            script {
                def message = """
                🚨 ECP-AI Orchestrator 배포 실패!
                
                📋 배포 정보:
                • 버전: ${params.VERSION}
                • 환경: ${params.TARGET_ENV}
                • 빌드 번호: ${BUILD_NUMBER}
                • 실패 단계: ${env.STAGE_NAME}
                
                🔗 링크:
                • Jenkins: ${BUILD_URL}
                """
                
                // Slack 알림 (선택사항)
                // slackSend channel: '#deployments', message: message, color: 'danger'
            }
        }
    }
}
