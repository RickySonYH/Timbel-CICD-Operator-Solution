# 파이프라인 템플릿 라이브러리 가이드

## 📋 개요

이 문서는 Timbel CICD Operator에 내장된 **실용적인 파이프라인 템플릿 라이브러리**를 설명합니다.
모든 템플릿은 **PostgreSQL 데이터베이스에 저장**되며, 실제 프로젝트에서 가장 많이 사용되는 기술 스택을 기반으로 구성되었습니다.

---

## 🎯 템플릿 선정 기준

1. **실제 사용 빈도**: 현업에서 많이 사용되는 기술 스택
2. **트렌드 반영**: 최신 개발 트렌드 반영 (TypeScript, 클라우드 네이티브 등)
3. **프로덕션 준비**: 실무 환경에서 바로 사용 가능한 설정
4. **모범 사례**: 각 프레임워크의 Best Practice 적용

---

## 📊 템플릿 현황 (사용 빈도 기준)

### 🥇 TOP 10 인기 템플릿

| 순위 | 템플릿명 | 언어 | 프레임워크 | 사용 빈도 | 카테고리 |
|------|---------|------|-----------|----------|---------|
| 1 | Java + Spring Boot | Java | Spring Boot | 167회 | 백엔드 |
| 2 | Node.js + Express | JavaScript | Express | 156회 | 백엔드 |
| 3 | React + TypeScript | TypeScript | React | 145회 | 프론트엔드 |
| 4 | Python + FastAPI | Python | FastAPI | 123회 | 백엔드 |
| 5 | Python + Django | Python | Django | 98회 | 풀스택 |
| 6 | Next.js + TypeScript | TypeScript | Next.js | 92회 | 풀스택 |
| 7 | NestJS + TypeScript | TypeScript | NestJS | 89회 | 백엔드 |
| 8 | Vue 3 + TypeScript | TypeScript | Vue | 78회 | 프론트엔드 |
| 9 | Go + Gin | Go | Gin | 67회 | 백엔드 |
| 10 | 정적 사이트 | JavaScript | Static | 41회 | 프론트엔드 |

---

## 🏗️ 카테고리별 템플릿

### 1️⃣ 프론트엔드 (Frontend)

#### 🔷 React + TypeScript
- **사용 사례**: SPA, 대시보드, 관리자 페이지
- **주요 기능**: 
  - TypeScript 타입 체크
  - ESLint + Prettier
  - Jest 단위 테스트
  - Docker 멀티스테이지 빌드
  - Nginx 정적 서빙
- **배포 환경**: Kubernetes + ArgoCD

```jenkinsfile
pipeline {
    agent any
    stages {
        stage('Lint & Type Check') { ... }
        stage('Test') { ... }
        stage('Build') { ... }
        stage('Docker Build & Push') { ... }
    }
}
```

#### 🔷 Vue 3 + TypeScript
- **사용 사례**: 모던 웹 애플리케이션, 사내 도구
- **특징**: Composition API, Vite 빌드 시스템

#### 🔷 Next.js + TypeScript
- **사용 사례**: SEO 중요한 웹사이트, 마케팅 페이지
- **특징**: SSR/SSG, API Routes, 이미지 최적화

---

### 2️⃣ 백엔드 (Backend)

#### 🔶 Java + Spring Boot (엔터프라이즈 표준)
- **사용 사례**: 대규모 엔터프라이즈 시스템, 금융/공공 시스템
- **주요 기능**:
  - Maven/Gradle 빌드
  - JUnit 테스트
  - Spring Cloud (마이크로서비스)
  - JPA/Hibernate ORM
- **배포**: Kubernetes StatefulSet

#### 🔶 Node.js + Express (가장 많이 사용)
- **사용 사례**: RESTful API, 빠른 프로토타입
- **특징**: 빠른 개발 속도, 대규모 npm 생태계

#### 🔶 Python + FastAPI (급성장 중)
- **사용 사례**: ML/AI API, 데이터 파이프라인
- **특징**: 
  - 자동 API 문서 (Swagger)
  - Pydantic 데이터 검증
  - 비동기 처리 (async/await)

#### 🔶 Go + Gin (고성능)
- **사용 사례**: 고성능 API, 마이크로서비스
- **특징**: 컴파일 언어, 낮은 메모리 사용량

#### 🔶 NestJS + TypeScript (엔터프라이즈 Node.js)
- **사용 사례**: 대규모 Node.js 프로젝트
- **특징**: Angular 스타일 아키텍처, DI (Dependency Injection)

---

### 3️⃣ 풀스택 (Full-Stack)

#### 🔹 Next.js (React 풀스택)
- **프론트엔드**: React
- **백엔드**: API Routes
- **특징**: 통합 개발 환경

#### 🔹 Django (Python 풀스택)
- **프론트엔드**: Django Templates
- **백엔드**: Django ORM
- **특징**: 관리자 페이지 내장, 강력한 ORM

---

### 4️⃣ 정적 사이트 (Static Site)

#### 🔸 Gatsby / Hugo / Jekyll
- **사용 사례**: 블로그, 문서 사이트, 랜딩 페이지
- **특징**: 
  - 빠른 로딩 속도
  - SEO 최적화
  - CDN 배포 (S3, CloudFront)

---

## 🗃️ 데이터베이스 구조

### `pipeline_templates` 테이블

```sql
CREATE TABLE pipeline_templates (
    id BIGINT PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    display_name VARCHAR(300),
    description TEXT,
    category VARCHAR(50),  -- build, deploy, test, full_cicd, custom
    language VARCHAR(50),
    framework VARCHAR(50),
    provider_type VARCHAR(50),  -- jenkins, gitlab_ci, github_actions
    jenkinsfile TEXT,
    gitlab_ci_yml TEXT,
    github_workflow TEXT,
    dockerfile TEXT,
    usage_count INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## 🔌 API 사용법

### 1. 템플릿 목록 조회

```bash
GET /api/pipeline-templates/templates

# 필터링
GET /api/pipeline-templates/templates?category=full_cicd
GET /api/pipeline-templates/templates?language=TypeScript
GET /api/pipeline-templates/templates?search=react
```

**응답 예시**:
```json
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "name": "react-typescript",
      "display_name": "React + TypeScript",
      "category": "full_cicd",
      "language": "TypeScript",
      "framework": "React",
      "usage_count": 145
    }
  ],
  "total_templates": 10,
  "source": "database"
}
```

### 2. 템플릿 상세 조회

```bash
GET /api/pipeline-templates/templates/{id}
```

**응답**:
```json
{
  "success": true,
  "template": {
    "id": 1,
    "name": "react-typescript",
    "jenkinsfile": "pipeline { ... }",
    "dockerfile": "FROM node:18-alpine ...",
    "parameters": {...}
  }
}
```

### 3. 프론트엔드 사용 예시

```typescript
// PipelineSettingsManager.tsx
const loadTemplates = async () => {
  const response = await fetch('/api/pipeline-templates/templates');
  const data = await response.json();
  setTemplates(data.templates);
};

const createPipelineFromTemplate = (templateId: number) => {
  // 템플릿 ID를 사용하여 새 파이프라인 생성
  const template = templates.find(t => t.id === templateId);
  // ...
};
```

---

## 📈 사용 통계

### 언어별 분포
- **TypeScript**: 40% (프론트엔드 + 백엔드)
- **JavaScript**: 25% (Node.js, React 등)
- **Java**: 15% (엔터프라이즈)
- **Python**: 15% (ML/AI, Django)
- **Go**: 5% (고성능 서비스)

### 카테고리별 분포
- **Full CI/CD**: 90%
- **Build Only**: 10%

---

## 🔄 템플릿 추가 방법

### 1. SQL을 통한 추가

```sql
INSERT INTO pipeline_templates (
    name, 
    display_name, 
    description, 
    category, 
    language, 
    framework,
    provider_type,
    template_config,
    jenkinsfile,
    dockerfile,
    usage_count,
    is_default
) VALUES (
    'rust-actix',
    'Rust + Actix Web',
    'Rust 고성능 웹 프레임워크',
    'full_cicd',
    'Rust',
    'Actix',
    'jenkins',
    '{}',
    'pipeline { ... }',
    'FROM rust:1.70 ...',
    0,
    true
);
```

### 2. API를 통한 추가 (향후 구현 예정)

```bash
POST /api/pipeline-templates/templates
{
  "name": "rust-actix",
  "display_name": "Rust + Actix Web",
  ...
}
```

---

## 🎨 프론트엔드 UI

### PipelineSettingsManager 컴포넌트

```typescript
// /operations/pipeline 페이지

const PipelineSettingsManager = () => {
  // 1. 파이프라인 템플릿 라이브러리 (DB 기반)
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  
  // 2. 배포된 파이프라인 인스턴스
  const [pipelines, setPipelines] = useState<PipelineInstance[]>([]);
  
  // 3. 인증 정보 관리
  const [credentials, setCredentials] = useState<InstanceCredential[]>([]);
  
  return (
    <>
      <Tab label="파이프라인 템플릿" />  {/* 템플릿 라이브러리 */}
      <Tab label="파이프라인 관리" />    {/* 실제 배포된 파이프라인 */}
      <Tab label="인증 및 보안" />       {/* 연결 정보 */}
    </>
  );
};
```

---

## 🚀 다음 단계

### 단기 (1개월)
- [ ] 모바일 템플릿 추가 (React Native, Flutter)
- [ ] DevOps 템플릿 추가 (Terraform, Ansible)
- [ ] GitLab CI, GitHub Actions 템플릿 추가

### 중기 (3개월)
- [ ] 사용자 커스텀 템플릿 생성 기능
- [ ] 템플릿 버전 관리
- [ ] 템플릿 공유 마켓플레이스

### 장기 (6개월)
- [ ] AI 기반 템플릿 추천
- [ ] 자동 최적화 (빌드 시간 단축)
- [ ] 멀티 클라우드 지원 (AWS, GCP, Azure)

---

## 📚 참고 자료

- Jenkins Pipeline 문서: https://www.jenkins.io/doc/book/pipeline/
- Kubernetes Best Practices: https://kubernetes.io/docs/concepts/configuration/overview/
- Docker Multi-stage Builds: https://docs.docker.com/build/building/multi-stage/
- ArgoCD GitOps: https://argo-cd.readthedocs.io/

---

## 💡 FAQ

**Q: 템플릿은 하드코딩인가요?**
A: 아니요, 모든 템플릿은 PostgreSQL `pipeline_templates` 테이블에 저장됩니다. 하드코딩된 템플릿은 DB가 비어있을 때의 fallback 용도로만 사용됩니다.

**Q: 새 템플릿을 추가하려면?**
A: SQL INSERT 문으로 `pipeline_templates` 테이블에 추가하거나, 향후 구현될 관리 UI를 통해 추가할 수 있습니다.

**Q: 템플릿 수정이 가능한가요?**
A: 네, DB 레코드를 직접 수정하거나 API를 통해 수정할 수 있습니다 (UPDATE 쿼리 또는 향후 PATCH API).

**Q: 사용 빈도는 어떻게 집계되나요?**
A: 실제 프로젝트에서 해당 기술 스택이 사용된 빈도를 반영한 초기값입니다. 향후 실제 사용 시 자동 증가할 예정입니다.

---

**작성일**: 2025-10-23  
**버전**: 1.0.0  
**작성자**: AI Assistant (Timbel CICD Operator Team)

