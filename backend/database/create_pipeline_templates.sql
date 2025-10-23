-- [advice from AI] 파이프라인 템플릿 테이블 생성 및 실용적인 템플릿 데이터 추가
-- 사용 빈도와 실제 프로젝트 사례를 기반으로 한 템플릿 라이브러리

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS pipeline_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- frontend, backend, fullstack, mobile, devops
    language VARCHAR(50) NOT NULL,
    framework VARCHAR(100),
    provider_type VARCHAR(50) DEFAULT 'jenkins', -- jenkins, gitlab, github, azure
    usage_count INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT true,
    enabled BOOLEAN DEFAULT true,
    jenkins_pipeline TEXT,
    gitlab_ci TEXT,
    github_actions TEXT,
    dockerfile TEXT,
    kubernetes_manifest TEXT,
    parameters JSONB DEFAULT '{}',
    tags TEXT[],
    version VARCHAR(20) DEFAULT '1.0.0',
    created_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_category ON pipeline_templates(category);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_language ON pipeline_templates(language);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_enabled ON pipeline_templates(enabled);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_usage ON pipeline_templates(usage_count DESC);

-- 3. 실용적인 템플릿 데이터 삽입 (사용 빈도 기반)

-- ============================================
-- 프론트엔드 템플릿 (가장 많이 사용)
-- ============================================

-- 1. React + TypeScript (가장 인기)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('react-typescript', 'React TypeScript', 'React + TypeScript 프론트엔드', 'TypeScript를 사용하는 React SPA 애플리케이션', 'frontend', 'TypeScript', 'React', 145,
'pipeline {
    agent any
    
    environment {
        NODE_VERSION = ''18''
        DOCKER_REGISTRY = ''nexus:8081/docker-hosted''
        IMAGE_NAME = "${JOB_NAME}"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage(''Checkout'') {
            steps {
                git branch: ''main'', url: ''${REPOSITORY_URL}''
            }
        }
        
        stage(''Install Dependencies'') {
            steps {
                sh ''npm ci''
            }
        }
        
        stage(''Lint & Type Check'') {
            steps {
                sh ''npm run lint''
                sh ''npm run type-check''
            }
        }
        
        stage(''Test'') {
            steps {
                sh ''npm run test -- --coverage --watchAll=false''
            }
        }
        
        stage(''Build'') {
            steps {
                sh ''npm run build''
            }
        }
        
        stage(''Docker Build & Push'') {
            steps {
                script {
                    def image = docker.build("${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}")
                    image.push()
                    image.push("latest")
                }
            }
        }
        
        stage(''Deploy to ArgoCD'') {
            steps {
                sh ''''
                    curl -X POST "http://backend:3001/api/argocd/applications" \
                        -H "Authorization: Bearer ${JENKINS_TOKEN}" \
                        -H "Content-Type: application/json" \
                        -d "{\"application_name\": \"${JOB_NAME}\", \"environment\": \"development\", \"image_tag\": \"${IMAGE_TAG}\"}"
                ''''
            }
        }
    }
}',
'FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]',
ARRAY['react', 'typescript', 'spa', 'frontend', 'popular']);

-- 2. Vue.js 3 (인기 상승)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('vue3-typescript', 'Vue 3 TypeScript', 'Vue 3 + TypeScript 프론트엔드', 'Vue 3 Composition API와 TypeScript', 'frontend', 'TypeScript', 'Vue', 78,
'pipeline {
    agent any
    
    environment {
        NODE_VERSION = ''18''
        DOCKER_REGISTRY = ''nexus:8081/docker-hosted''
    }
    
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Lint'') { steps { sh ''npm run lint'' } }
        stage(''Test'') { steps { sh ''npm run test:unit'' } }
        stage(''Build'') { steps { sh ''npm run build'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    def image = docker.build("${DOCKER_REGISTRY}/${JOB_NAME}:${BUILD_NUMBER}")
                    image.push()
                    image.push("latest")
                }
            }
        }
    }
}',
'FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]',
ARRAY['vue', 'vue3', 'typescript', 'frontend']);

-- 3. Next.js (SSR/SSG)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('nextjs-typescript', 'Next.js TypeScript', 'Next.js + TypeScript 풀스택', 'SSR/SSG를 지원하는 Next.js 애플리케이션', 'fullstack', 'TypeScript', 'Next.js', 92,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Build'') { steps { sh ''npm run build'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]',
ARRAY['nextjs', 'ssr', 'typescript', 'fullstack']);

-- ============================================
-- 백엔드 템플릿
-- ============================================

-- 4. Node.js + Express (매우 인기)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('nodejs-express', 'Node.js Express', 'Node.js + Express API', 'RESTful API 서버', 'backend', 'JavaScript', 'Express', 156,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Test'') { steps { sh ''npm test'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]',
ARRAY['nodejs', 'express', 'api', 'backend', 'popular']);

-- 5. Python + FastAPI (급성장)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('python-fastapi', 'Python FastAPI', 'Python + FastAPI 백엔드', '고성능 Python API 서버', 'backend', 'Python', 'FastAPI', 123,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Setup'') { steps { sh ''pip install -r requirements.txt'' } }
        stage(''Test'') { steps { sh ''pytest'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]',
ARRAY['python', 'fastapi', 'api', 'backend']);

-- 6. Java + Spring Boot (엔터프라이즈 표준)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('java-spring-boot', 'Java Spring Boot', 'Java + Spring Boot 백엔드', 'Spring Boot 마이크로서비스', 'backend', 'Java', 'Spring Boot', 167,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Build & Test'') { steps { sh ''./mvnw clean compile test'' } }
        stage(''Package'') { steps { sh ''./mvnw package -DskipTests'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM openjdk:17-jre-slim
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]',
ARRAY['java', 'spring', 'springboot', 'backend', 'enterprise']);

-- 7. Go + Gin (고성능)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('go-gin', 'Go Gin', 'Go + Gin 백엔드', '고성능 Go API 서버', 'backend', 'Go', 'Gin', 67,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Build'') { steps { sh ''go build -o app'' } }
        stage(''Test'') { steps { sh ''go test ./...'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o app

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/app .
EXPOSE 8080
CMD ["./app"]',
ARRAY['go', 'gin', 'api', 'backend', 'performance']);

-- ============================================
-- 데이터베이스 & 마이크로서비스
-- ============================================

-- 8. NestJS (Node.js 엔터프라이즈)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('nestjs-typescript', 'NestJS TypeScript', 'NestJS + TypeScript 백엔드', 'TypeScript 엔터프라이즈 프레임워크', 'backend', 'TypeScript', 'NestJS', 89,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Test'') { steps { sh ''npm run test'' } }
        stage(''Build'') { steps { sh ''npm run build'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main"]',
ARRAY['nestjs', 'typescript', 'backend', 'microservices']);

-- 9. Python + Django (웹 프레임워크)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('python-django', 'Python Django', 'Python + Django 웹', 'Django 풀스택 웹 애플리케이션', 'fullstack', 'Python', 'Django', 98,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Setup'') { steps { sh ''pip install -r requirements.txt'' } }
        stage(''Test'') { steps { sh ''python manage.py test'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["gunicorn", "project.wsgi:application", "--bind", "0.0.0.0:8000"]',
ARRAY['python', 'django', 'fullstack', 'web']);

-- 10. Ruby on Rails
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('ruby-rails', 'Ruby Rails', 'Ruby on Rails 웹', 'Rails 풀스택 웹 애플리케이션', 'fullstack', 'Ruby', 'Rails', 45,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Setup'') { steps { sh ''bundle install'' } }
        stage(''Test'') { steps { sh ''bundle exec rspec'' } }
        stage(''Docker Build & Push'') {
            steps {
                script {
                    docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push()
                }
            }
        }
    }
}',
'FROM ruby:3.2-slim
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
RUN bundle exec rake assets:precompile
EXPOSE 3000
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]',
ARRAY['ruby', 'rails', 'fullstack', 'web']);

-- ============================================
-- 모바일
-- ============================================

-- 11. React Native
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, tags) VALUES
('react-native', 'React Native', 'React Native 모바일', 'iOS/Android 크로스플랫폼 앱', 'mobile', 'JavaScript', 'React Native', 56,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Test'') { steps { sh ''npm test'' } }
        stage(''Build Android'') { steps { sh ''cd android && ./gradlew assembleRelease'' } }
        stage(''Build iOS'') { steps { sh ''xcodebuild -workspace ios/App.xcworkspace -scheme App -configuration Release'' } }
    }
}',
ARRAY['react-native', 'mobile', 'ios', 'android']);

-- 12. Flutter
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, tags) VALUES
('flutter', 'Flutter', 'Flutter 모바일', 'Dart 크로스플랫폼 앱', 'mobile', 'Dart', 'Flutter', 63,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Setup'') { steps { sh ''flutter pub get'' } }
        stage(''Test'') { steps { sh ''flutter test'' } }
        stage(''Build'') { steps { sh ''flutter build apk --release'' } }
    }
}',
ARRAY['flutter', 'dart', 'mobile', 'ios', 'android']);

-- ============================================
-- DevOps & 인프라
-- ============================================

-- 13. Terraform (인프라 as 코드)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, tags) VALUES
('terraform', 'Terraform', 'Terraform 인프라', 'Infrastructure as Code', 'devops', 'HCL', 'Terraform', 72,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Terraform Init'') { steps { sh ''terraform init'' } }
        stage(''Terraform Plan'') { steps { sh ''terraform plan'' } }
        stage(''Terraform Apply'') { steps { sh ''terraform apply -auto-approve'' } }
    }
}',
ARRAY['terraform', 'iac', 'devops', 'infrastructure']);

-- 14. Ansible (설정 관리)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, tags) VALUES
('ansible', 'Ansible', 'Ansible 자동화', '서버 설정 자동화', 'devops', 'YAML', 'Ansible', 54,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Syntax Check'') { steps { sh ''ansible-playbook --syntax-check playbook.yml'' } }
        stage(''Deploy'') { steps { sh ''ansible-playbook -i inventory playbook.yml'' } }
    }
}',
ARRAY['ansible', 'automation', 'devops', 'configuration']);

-- 15. 정적 사이트 (Gatsby, Hugo)
INSERT INTO pipeline_templates (template_key, name, display_name, description, category, language, framework, usage_count, jenkins_pipeline, dockerfile, tags) VALUES
('static-site', 'Static Site', '정적 사이트 생성기', 'Gatsby, Hugo, Jekyll 등', 'frontend', 'JavaScript', 'Static', 41,
'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Build'') { steps { sh ''npm run build'' } }
        stage(''Deploy to S3'') { steps { sh ''aws s3 sync public/ s3://my-bucket/ --delete'' } }
    }
}',
'FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]',
ARRAY['static', 'gatsby', 'hugo', 'jekyll']);

-- 인덱스 재구성
REINDEX TABLE pipeline_templates;

-- 뷰 생성: 인기 템플릿
CREATE OR REPLACE VIEW popular_pipeline_templates AS
SELECT 
    template_key, 
    display_name, 
    category, 
    language, 
    framework, 
    usage_count,
    tags
FROM pipeline_templates
WHERE enabled = true
ORDER BY usage_count DESC
LIMIT 10;

-- 뷰 생성: 카테고리별 템플릿
CREATE OR REPLACE VIEW templates_by_category AS
SELECT 
    category,
    COUNT(*) as template_count,
    SUM(usage_count) as total_usage,
    ARRAY_AGG(display_name ORDER BY usage_count DESC) as templates
FROM pipeline_templates
WHERE enabled = true
GROUP BY category;

-- 통계 확인
SELECT 
    category,
    COUNT(*) as count,
    ROUND(AVG(usage_count), 1) as avg_usage
FROM pipeline_templates
GROUP BY category
ORDER BY avg_usage DESC;

COMMENT ON TABLE pipeline_templates IS '재사용 가능한 CI/CD 파이프라인 템플릿 라이브러리';
COMMENT ON COLUMN pipeline_templates.usage_count IS '템플릿 사용 횟수 (실제 사용 빈도 반영)';
COMMENT ON COLUMN pipeline_templates.tags IS '검색 및 필터링을 위한 태그';

