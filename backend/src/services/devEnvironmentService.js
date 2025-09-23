// [advice from AI] 개발 환경 자동 설정 서비스

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

class DevEnvironmentService {
  constructor() {
    // [advice from AI] 개발 환경 설정 기본 경로
    this.baseProjectPath = process.env.DEV_PROJECTS_PATH || '/home/rickyson/dev-projects';
    this.templatePath = process.env.DEV_TEMPLATE_PATH || '/home/rickyson/project-templates';
    this.gitlabUrl = process.env.GITLAB_URL || 'http://rdc.rickyson.com:8929';
    this.gitlabToken = process.env.GITLAB_TOKEN || 'glpat-your-token-here';
  }

  // [advice from AI] 프로젝트 개발 환경 초기화
  async initializeProjectEnvironment(projectData, peAssignments) {
    try {
      console.log('🚀 프로젝트 개발 환경 초기화 시작:', projectData.name);

      const results = {
        project_id: projectData.id,
        project_name: projectData.name,
        repositories: [],
        development_setup: {},
        pe_access_granted: []
      };

      // 1. 프로젝트 디렉토리 생성
      const projectDir = await this.createProjectDirectory(projectData);
      results.development_setup.project_directory = projectDir;

      // 2. 각 작업 그룹별 레포지토리 생성
      for (const assignment of peAssignments) {
        const repoResult = await this.createWorkGroupRepository(
          projectData,
          assignment,
          projectDir
        );
        results.repositories.push(repoResult);
      }

      // 3. 공통 개발 환경 설정
      const commonSetup = await this.setupCommonDevelopmentEnvironment(projectData, projectDir);
      results.development_setup = { ...results.development_setup, ...commonSetup };

      // 4. PE별 접근 권한 설정
      for (const assignment of peAssignments) {
        const accessResult = await this.grantPEAccess(
          projectData,
          assignment,
          results.repositories
        );
        results.pe_access_granted.push(accessResult);
      }

      console.log('✅ 프로젝트 개발 환경 초기화 완료:', projectData.name);
      return results;

    } catch (error) {
      console.error('❌ 프로젝트 개발 환경 초기화 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 프로젝트 디렉토리 생성
  async createProjectDirectory(projectData) {
    try {
      const sanitizedName = projectData.name.replace(/[^a-zA-Z0-9가-힣\-_]/g, '_');
      const projectDir = path.join(this.baseProjectPath, `${sanitizedName}_${projectData.id.substring(0, 8)}`);

      // 디렉토리 생성
      await fs.mkdir(projectDir, { recursive: true });
      console.log('📁 프로젝트 디렉토리 생성:', projectDir);

      // 기본 구조 생성
      const subdirs = ['frontend', 'backend', 'database', 'docs', 'config', 'scripts'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(projectDir, subdir), { recursive: true });
      }

      // README.md 생성
      const readmeContent = this.generateProjectReadme(projectData);
      await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent, 'utf8');

      return projectDir;

    } catch (error) {
      console.error('❌ 프로젝트 디렉토리 생성 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 작업 그룹별 개발 환경 준비 (레포지토리 템플릿 생성)
  async createWorkGroupRepository(projectData, assignment, projectDir) {
    try {
      const workGroupName = assignment.work_group_name || 'main';
      const peName = assignment.pe_name || 'developer';
      
      console.log('🔧 작업 그룹 개발 환경 준비:', workGroupName, '→', peName);

      // 레포지토리 이름 생성
      const repoName = `${projectData.name.replace(/[^a-zA-Z0-9가-힣\-_]/g, '_')}_${workGroupName}`;
      
      // 레포지토리 템플릿 준비
      const repositoryTemplate = await this.prepareRepositoryTemplate(repoName, projectData);

      // 로컬 개발 환경 디렉토리 생성
      const repoDir = path.join(projectDir, workGroupName);
      await this.initializeLocalEnvironment(repoDir, repoName, projectData);

      // 프로젝트 템플릿 적용
      await this.applyProjectTemplate(repoDir, workGroupName, projectData);

      return {
        work_group_name: workGroupName,
        repository_name: repoName,
        repository_template: repositoryTemplate,
        local_path: repoDir,
        assigned_pe: peName,
        setup_status: 'template_ready',
        repository_url: null, // PE가 나중에 등록
        clone_url: null       // PE가 나중에 등록
      };

    } catch (error) {
      console.error('❌ 작업 그룹 개발 환경 준비 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 레포지토리 템플릿 준비 (PE가 직접 생성할 수 있도록)
  async prepareRepositoryTemplate(repoName, projectData) {
    try {
      console.log('📋 레포지토리 템플릿 준비:', repoName);
      
      // 레포지토리 정보는 나중에 PE가 등록할 수 있도록 템플릿만 준비
      const repositoryTemplate = {
        suggested_name: repoName,
        template_ready: true,
        setup_instructions: this.generateSetupInstructions(repoName, projectData),
        recommended_platforms: [
          {
            name: 'GitHub',
            url: 'https://github.com',
            instructions: 'GitHub에서 새 리포지토리를 생성하고 아래 명령어로 연동하세요.'
          },
          {
            name: 'GitLab (Self-hosted)',
            url: this.gitlabUrl,
            instructions: 'GitLab에서 새 프로젝트를 생성하고 아래 명령어로 연동하세요.'
          }
        ]
      };

      return repositoryTemplate;

    } catch (error) {
      console.error('❌ 레포지토리 템플릿 준비 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 로컬 개발 환경 초기화 (Git 설정은 나중에)
  async initializeLocalEnvironment(repoDir, repoName, projectData) {
    try {
      await fs.mkdir(repoDir, { recursive: true });
      
      // 기본 Git 설정 파일만 생성 (실제 remote는 PE가 설정)
      const gitSetupScript = this.generateGitSetupScript(repoName);
      await fs.writeFile(path.join(repoDir, 'setup-git.sh'), gitSetupScript, 'utf8');
      
      // Git 초기화만 실행 (remote는 나중에 설정)
      await execAsync(`cd "${repoDir}" && git init`);
      await execAsync(`cd "${repoDir}" && git checkout -b main`);
      
      console.log('📦 로컬 개발 환경 초기화 완료:', repoDir);

    } catch (error) {
      console.error('❌ 로컬 개발 환경 초기화 실패:', error);
      // 오류가 발생해도 계속 진행 (개발자가 수동으로 설정 가능)
    }
  }

  // [advice from AI] Git 설정 스크립트 생성
  generateGitSetupScript(repoName) {
    return `#!/bin/bash
# Git 레포지토리 연동 스크립트
# PE가 레포지토리를 생성한 후 이 스크립트를 실행하세요

echo "🔧 Git 레포지토리 연동을 시작합니다..."
echo "추천 레포지토리 이름: ${repoName}"
echo ""

# 사용자에게 레포지토리 URL 입력 요청
read -p "생성한 레포지토리 URL을 입력하세요 (예: https://github.com/username/${repoName}.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
  echo "❌ 레포지토리 URL이 입력되지 않았습니다."
  exit 1
fi

# Remote 설정
echo "🔗 Remote 저장소 연결 중..."
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

# 초기 커밋 및 푸시
echo "📤 초기 코드 업로드 중..."
git add .
git commit -m "Initial project setup

- 프로젝트 템플릿 적용
- 개발 환경 설정 완료
- 자동 생성된 설정 파일들 포함
"

git push -u origin main

echo "✅ Git 레포지토리 연동이 완료되었습니다!"
echo "🌐 레포지토리 URL: $REPO_URL"
echo ""
echo "다음 단계:"
echo "1. 팀원들과 레포지토리 공유"
echo "2. 개발 환경 설정: npm install 또는 docker-compose up"
echo "3. 프로젝트 관리 시스템에 레포지토리 URL 등록"
`;
  }

  // [advice from AI] 설정 지침 생성
  generateSetupInstructions(repoName, projectData) {
    return {
      step1: {
        title: "1. 레포지토리 생성",
        description: "선호하는 Git 플랫폼에서 새 레포지토리를 생성하세요",
        details: [
          `추천 레포지토리 이름: ${repoName}`,
          "Private 또는 Public 설정 (프로젝트 정책에 따라)",
          "README.md 생성하지 않음 (이미 템플릿에 포함됨)"
        ]
      },
      step2: {
        title: "2. 로컬 환경 연동",
        description: "생성된 템플릿 디렉토리에서 Git 연동을 실행하세요",
        commands: [
          "cd <프로젝트_디렉토리>",
          "chmod +x setup-git.sh",
          "./setup-git.sh"
        ]
      },
      step3: {
        title: "3. 개발 환경 설정",
        description: "프로젝트 의존성 설치 및 환경 설정",
        commands: [
          "npm install  # 또는 yarn install",
          "cp .env.example .env",
          "# .env 파일 편집 후 저장",
          "docker-compose up -d  # 선택사항"
        ]
      },
      step4: {
        title: "4. 시스템 등록",
        description: "프로젝트 관리 시스템에 레포지토리 정보를 등록하세요",
        details: [
          "PO 대시보드 → 프로젝트 상세 → 레포지토리 등록",
          "레포지토리 URL과 접근 권한 설정",
          "팀원 초대 및 권한 부여"
        ]
      }
    };
  }

  // [advice from AI] 프로젝트 템플릿 적용
  async applyProjectTemplate(repoDir, workGroupName, projectData) {
    try {
      console.log('📋 프로젝트 템플릿 적용:', workGroupName);

      // 작업 그룹 유형에 따른 템플릿 선택
      let templateType = 'general';
      if (workGroupName.includes('frontend') || workGroupName.includes('프론트')) {
        templateType = 'frontend';
      } else if (workGroupName.includes('backend') || workGroupName.includes('백엔드')) {
        templateType = 'backend';
      } else if (workGroupName.includes('database') || workGroupName.includes('DB')) {
        templateType = 'database';
      }

      // 템플릿 파일 생성
      const templateFiles = this.getTemplateFiles(templateType, projectData);
      
      for (const [filePath, content] of Object.entries(templateFiles)) {
        const fullPath = path.join(repoDir, filePath);
        const dir = path.dirname(fullPath);
        
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
      }

      console.log('✅ 프로젝트 템플릿 적용 완료');

    } catch (error) {
      console.error('❌ 프로젝트 템플릿 적용 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 공통 개발 환경 설정
  async setupCommonDevelopmentEnvironment(projectData, projectDir) {
    try {
      console.log('⚙️ 공통 개발 환경 설정');

      const setup = {};

      // Docker 환경 설정
      const dockerConfig = await this.createDockerConfiguration(projectData, projectDir);
      setup.docker = dockerConfig;

      // CI/CD 파이프라인 설정
      const cicdConfig = await this.createCICDConfiguration(projectData, projectDir);
      setup.cicd = cicdConfig;

      // 환경 변수 템플릿 생성
      const envConfig = await this.createEnvironmentConfiguration(projectData, projectDir);
      setup.environment = envConfig;

      return setup;

    } catch (error) {
      console.error('❌ 공통 개발 환경 설정 실패:', error);
      throw error;
    }
  }

  // [advice from AI] PE 접근 권한 부여
  async grantPEAccess(projectData, assignment, repositories) {
    try {
      console.log('🔐 PE 접근 권한 부여:', assignment.pe_name);

      const accessResult = {
        pe_id: assignment.assigned_to,
        pe_name: assignment.pe_name,
        work_group_name: assignment.work_group_name,
        granted_permissions: [],
        development_tools: []
      };

      // GitLab 프로젝트 멤버 추가 (실제 환경에서는 GitLab API 사용)
      const relevantRepo = repositories.find(repo => 
        repo.work_group_name === assignment.work_group_name
      );

      if (relevantRepo) {
        // GitLab 멤버 권한 부여 시뮬레이션
        accessResult.granted_permissions.push({
          type: 'gitlab_repository',
          resource: relevantRepo.repository_name,
          permission: 'developer',
          granted_at: new Date().toISOString()
        });
      }

      // 개발 도구 접근 권한 설정
      const devTools = [
        'docker_registry',
        'development_database',
        'staging_environment',
        'monitoring_tools'
      ];

      for (const tool of devTools) {
        accessResult.development_tools.push({
          tool_name: tool,
          access_level: 'read_write',
          granted_at: new Date().toISOString()
        });
      }

      return accessResult;

    } catch (error) {
      console.error('❌ PE 접근 권한 부여 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 프로젝트 README 생성
  generateProjectReadme(projectData) {
    return `# ${projectData.name}

## 프로젝트 개요
${projectData.project_overview || '프로젝트 개요를 입력해주세요.'}

## 기술 스택
- Frontend: React, TypeScript
- Backend: Node.js, Express
- Database: PostgreSQL
- DevOps: Docker, GitLab CI/CD

## 개발 환경 설정

### 1. 저장소 클론
\`\`\`bash
git clone <repository-url>
cd ${projectData.name.replace(/[^a-zA-Z0-9가-힣\-_]/g, '_')}
\`\`\`

### 2. 의존성 설치
\`\`\`bash
npm install
\`\`\`

### 3. 환경 변수 설정
\`\`\`bash
cp .env.example .env
# .env 파일을 프로젝트에 맞게 수정
\`\`\`

### 4. 개발 서버 실행
\`\`\`bash
npm run dev
\`\`\`

## 프로젝트 구조
\`\`\`
${projectData.name.replace(/[^a-zA-Z0-9가-힣\-_]/g, '_')}/
├── frontend/          # 프론트엔드 코드
├── backend/           # 백엔드 API 코드
├── database/          # 데이터베이스 스키마 및 마이그레이션
├── docs/              # 프로젝트 문서
├── config/            # 설정 파일들
└── scripts/           # 유틸리티 스크립트
\`\`\`

## 기여 가이드라인
1. 새로운 기능 개발 시 feature 브랜치 생성
2. 코드 리뷰 후 main 브랜치에 병합
3. 커밋 메시지는 명확하고 간결하게 작성

## 연락처
- 프로젝트 생성일: ${new Date().toLocaleDateString('ko-KR')}
- 긴급도: ${projectData.urgency_level || 'medium'}
- 마감일: ${projectData.deadline ? new Date(projectData.deadline).toLocaleDateString('ko-KR') : '미정'}
`;
  }

  // [advice from AI] 템플릿 파일 생성
  getTemplateFiles(templateType, projectData) {
    const baseFiles = {
      '.gitignore': `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`,
      'package.json': JSON.stringify({
        name: projectData.name.replace(/[^a-zA-Z0-9가-힣\-_]/g, '_').toLowerCase(),
        version: '1.0.0',
        description: projectData.project_overview || '',
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          dev: 'nodemon index.js',
          test: 'jest',
          build: 'npm run build'
        },
        dependencies: {},
        devDependencies: {
          nodemon: '^2.0.0',
          jest: '^29.0.0'
        }
      }, null, 2),
      '.env.example': `# 환경 변수 템플릿
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-jwt-secret-key
`
    };

    // 템플릿 타입별 추가 파일
    if (templateType === 'frontend') {
      baseFiles['src/App.js'] = `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${projectData.name}</h1>
        <p>프론트엔드 개발을 시작하세요!</p>
      </header>
    </div>
  );
}

export default App;`;
    } else if (templateType === 'backend') {
      baseFiles['src/index.js'] = `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트
app.get('/', (req, res) => {
  res.json({ 
    message: '${projectData.name} API 서버가 실행 중입니다!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(\`서버가 포트 \${PORT}에서 실행 중입니다.\`);
});`;
    }

    return baseFiles;
  }

  // [advice from AI] Docker 설정 생성
  async createDockerConfiguration(projectData, projectDir) {
    try {
      const dockerCompose = `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: ${projectData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}
      POSTGRES_USER: developer
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;

      await fs.writeFile(path.join(projectDir, 'docker-compose.yml'), dockerCompose, 'utf8');
      
      return {
        docker_compose_created: true,
        services: ['app', 'db'],
        ports: ['3000', '5432']
      };

    } catch (error) {
      console.error('❌ Docker 설정 생성 실패:', error);
      return { docker_compose_created: false, error: error.message };
    }
  }

  // [advice from AI] CI/CD 설정 생성
  async createCICDConfiguration(projectData, projectDir) {
    try {
      const gitlabCI = `stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:\${NODE_VERSION}
  script:
    - npm install
    - npm run test
  only:
    - merge_requests
    - main

build:
  stage: build
  image: node:\${NODE_VERSION}
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/
  only:
    - main

deploy_staging:
  stage: deploy
  script:
    - echo "Deploying to staging environment"
    - # 실제 배포 스크립트 추가
  environment:
    name: staging
  only:
    - main
`;

      await fs.writeFile(path.join(projectDir, '.gitlab-ci.yml'), gitlabCI, 'utf8');
      
      return {
        gitlab_ci_created: true,
        stages: ['test', 'build', 'deploy'],
        environments: ['staging']
      };

    } catch (error) {
      console.error('❌ CI/CD 설정 생성 실패:', error);
      return { gitlab_ci_created: false, error: error.message };
    }
  }

  // [advice from AI] 환경 변수 설정 생성
  async createEnvironmentConfiguration(projectData, projectDir) {
    try {
      const envConfig = {
        development: {
          NODE_ENV: 'development',
          PORT: 3000,
          DATABASE_URL: 'postgresql://developer:password@localhost:5432/' + 
                       projectData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          JWT_SECRET: 'dev-jwt-secret-' + projectData.id.substring(0, 8),
          CORS_ORIGIN: 'http://localhost:3000'
        },
        staging: {
          NODE_ENV: 'staging',
          PORT: 3001,
          DATABASE_URL: '${STAGING_DATABASE_URL}',
          JWT_SECRET: '${STAGING_JWT_SECRET}',
          CORS_ORIGIN: '${STAGING_FRONTEND_URL}'
        },
        production: {
          NODE_ENV: 'production',
          PORT: '${PORT}',
          DATABASE_URL: '${DATABASE_URL}',
          JWT_SECRET: '${JWT_SECRET}',
          CORS_ORIGIN: '${FRONTEND_URL}'
        }
      };

      await fs.writeFile(
        path.join(projectDir, 'config', 'environments.json'), 
        JSON.stringify(envConfig, null, 2), 
        'utf8'
      );
      
      return {
        environment_config_created: true,
        environments: Object.keys(envConfig)
      };

    } catch (error) {
      console.error('❌ 환경 변수 설정 생성 실패:', error);
      return { environment_config_created: false, error: error.message };
    }
  }
}

module.exports = DevEnvironmentService;
