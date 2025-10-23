-- [advice from AI] 실용적인 파이프라인 템플릿 데이터 삽입 (기존 테이블 구조 사용)
-- 사용 빈도와 실제 프로젝트 사례 기반

-- 기존 데이터 정리 (선택사항)
-- TRUNCATE pipeline_templates RESTART IDENTITY CASCADE;

-- ============================================
-- 프론트엔드 템플릿 (가장 많이 사용)
-- ============================================

-- 1. React + TypeScript (가장 인기) 
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework, 
    provider_type, jenkinsfile, dockerfile, usage_count, is_default, enabled
) VALUES (
    'react-typescript',
    'React + TypeScript 프론트엔드',
    'TypeScript를 사용하는 React SPA 애플리케이션. 최신 프론트엔드 개발 표준.',
    'full_cicd',
    'TypeScript',
    'React',
    'jenkins',
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
            steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' }
        }
        stage(''Install'') {
            steps { sh ''npm ci'' }
        }
        stage(''Lint & Type Check'') {
            steps {
                sh ''npm run lint''
                sh ''npm run type-check''
            }
        }
        stage(''Test'') {
            steps { sh ''npm run test -- --coverage'' }
        }
        stage(''Build'') {
            steps { sh ''npm run build'' }
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
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]',
    145,
    true,
    true
) ON CONFLICT (name) DO UPDATE SET
    usage_count = EXCLUDED.usage_count,
    updated_at = now();

-- 2. Vue.js 3 
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, enabled
) VALUES (
    'vue3-typescript',
    'Vue 3 + TypeScript 프론트엔드',
    'Vue 3 Composition API와 TypeScript를 사용하는 모던 SPA',
    'full_cicd',
    'TypeScript',
    'Vue',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Lint'') { steps { sh ''npm run lint'' } }
        stage(''Test'') { steps { sh ''npm run test:unit'' } }
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

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80',
    78,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 3. Next.js (SSR/SSG)
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, enabled
) VALUES (
    'nextjs-typescript',
    'Next.js + TypeScript 풀스택',
    'SSR/SSG를 지원하는 Next.js 프레임워크. SEO 최적화.',
    'full_cicd',
    'TypeScript',
    'Next.js',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Build'') { steps { sh ''npm run build'' } }
        stage(''Docker Build & Push'') {
            steps { script { docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push() } }
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
    92,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- ============================================
-- 백엔드 템플릿
-- ============================================

-- 4. Node.js + Express
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, is_default, enabled
) VALUES (
    'nodejs-express',
    'Node.js + Express API',
    'Express 프레임워크를 사용하는 RESTful API 서버',
    'full_cicd',
    'JavaScript',
    'Express',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Test'') { steps { sh ''npm test'' } }
        stage(''Docker Build & Push'') {
            steps { script { docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push() } }
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
    156,
    true,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 5. Python + FastAPI
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, is_default, enabled
) VALUES (
    'python-fastapi',
    'Python + FastAPI 백엔드',
    '고성능 Python API 서버. 자동 문서 생성 지원.',
    'full_cicd',
    'Python',
    'FastAPI',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Setup'') { steps { sh ''pip install -r requirements.txt'' } }
        stage(''Test'') { steps { sh ''pytest'' } }
        stage(''Docker Build & Push'') {
            steps { script { docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push() } }
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
    123,
    true,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 6. Java + Spring Boot
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, is_default, enabled
) VALUES (
    'java-spring-boot',
    'Java + Spring Boot 백엔드',
    'Spring Boot 마이크로서비스. 엔터프라이즈급 애플리케이션.',
    'full_cicd',
    'Java',
    'Spring Boot',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Build & Test'') { steps { sh ''./mvnw clean compile test'' } }
        stage(''Package'') { steps { sh ''./mvnw package -DskipTests'' } }
        stage(''Docker Build & Push'') {
            steps { script { docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push() } }
        }
    }
}',
    'FROM openjdk:17-jre-slim
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]',
    167,
    true,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 7. Go + Gin
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, enabled
) VALUES (
    'go-gin',
    'Go + Gin 백엔드',
    '초고성능 Go API 서버. 빠른 실행속도.',
    'full_cicd',
    'Go',
    'Gin',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Build'') { steps { sh ''go build -o app'' } }
        stage(''Test'') { steps { sh ''go test ./...'' } }
        stage(''Docker Build & Push'') {
            steps { script { docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push() } }
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
    67,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 8. NestJS
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, enabled
) VALUES (
    'nestjs-typescript',
    'NestJS + TypeScript 백엔드',
    'TypeScript 엔터프라이즈 프레임워크. 모듈화된 아키텍처.',
    'full_cicd',
    'TypeScript',
    'NestJS',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Test'') { steps { sh ''npm run test'' } }
        stage(''Build'') { steps { sh ''npm run build'' } }
        stage(''Docker Build & Push'') {
            steps { script { docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push() } }
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
    89,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 9. Python + Django
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, enabled
) VALUES (
    'python-django',
    'Python + Django 웹',
    'Django 풀스택 웹 프레임워크. 관리자 페이지 내장.',
    'full_cicd',
    'Python',
    'Django',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Setup'') { steps { sh ''pip install -r requirements.txt'' } }
        stage(''Test'') { steps { sh ''python manage.py test'' } }
        stage(''Docker Build & Push'') {
            steps { script { docker.build("nexus:8081/docker-hosted/${JOB_NAME}:${BUILD_NUMBER}").push() } }
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
    98,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 10. 정적 사이트 (Gatsby, Hugo)
INSERT INTO pipeline_templates (
    name, display_name, description, category, language, framework,
    provider_type, jenkinsfile, dockerfile, usage_count, enabled
) VALUES (
    'static-site',
    '정적 사이트 생성기',
    'Gatsby, Hugo, Jekyll 등 정적 사이트 생성기',
    'build',
    'JavaScript',
    'Static',
    'jenkins',
    'pipeline {
    agent any
    stages {
        stage(''Checkout'') { steps { git branch: ''main'', url: ''${REPOSITORY_URL}'' } }
        stage(''Install'') { steps { sh ''npm ci'' } }
        stage(''Build'') { steps { sh ''npm run build'' } }
        stage(''Deploy'') { steps { sh ''aws s3 sync public/ s3://my-bucket/'' } }
    }
}',
    'FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
EXPOSE 80',
    41,
    true
) ON CONFLICT (name) DO UPDATE SET usage_count = EXCLUDED.usage_count;

-- 통계 조회
SELECT 
    category,
    COUNT(*) as template_count,
    SUM(usage_count) as total_usage,
    ROUND(AVG(usage_count), 1) as avg_usage,
    STRING_AGG(display_name, ', ' ORDER BY usage_count DESC) as top_templates
FROM pipeline_templates
WHERE enabled = true
GROUP BY category
ORDER BY total_usage DESC;

-- 가장 인기 있는 템플릿 TOP 10
SELECT 
    display_name,
    language,
    framework,
    category,
    usage_count,
    CASE WHEN is_default THEN '⭐' ELSE '' END as default_mark
FROM pipeline_templates
WHERE enabled = true
ORDER BY usage_count DESC
LIMIT 10;

COMMENT ON COLUMN pipeline_templates.usage_count IS '실제 프로젝트에서의 사용 빈도를 반영한 카운트';

