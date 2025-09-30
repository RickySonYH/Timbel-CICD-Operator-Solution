// [advice from AI] 레포지토리 자동 분석 서비스
const axios = require('axios');
const path = require('path');

class RepositoryAnalyzer {
  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN; // GitHub Personal Access Token
  }

  // [advice from AI] GitHub 레포지토리 정보 분석
  async analyzeRepository(repositoryUrl) {
    try {
      console.log('🔍 레포지토리 분석 시작:', repositoryUrl);
      
      const repoInfo = this.parseGitHubUrl(repositoryUrl);
      if (!repoInfo) {
        throw new Error('유효하지 않은 GitHub URL입니다.');
      }

      // 기본 레포지토리 정보 가져오기
      const basicInfo = await this.getBasicRepoInfo(repoInfo.owner, repoInfo.repo);
      
      // 파일 구조 분석
      const fileStructure = await this.analyzeFileStructure(repoInfo.owner, repoInfo.repo);
      
      // README 분석
      const readmeAnalysis = await this.analyzeReadme(repoInfo.owner, repoInfo.repo);
      
      // package.json 분석 (Node.js 프로젝트인 경우)
      const packageInfo = await this.analyzePackageJson(repoInfo.owner, repoInfo.repo);
      
      // Dockerfile 분석
      const dockerInfo = await this.analyzeDockerfile(repoInfo.owner, repoInfo.repo);
      
      // 기술 스택 추론
      const techStack = this.inferTechStack(fileStructure, packageInfo, dockerInfo);
      
      // 배포 설정 추론
      const deploymentConfig = this.inferDeploymentConfig(fileStructure, packageInfo, dockerInfo, readmeAnalysis);

      const analysis = {
        basic: basicInfo,
        techStack,
        deploymentConfig,
        readme: readmeAnalysis,
        fileStructure,
        packageInfo,
        dockerInfo,
        autoDetected: {
          projectType: this.detectProjectType(fileStructure, packageInfo),
          buildTool: this.detectBuildTool(fileStructure, packageInfo),
          framework: this.detectFramework(fileStructure, packageInfo),
          database: this.detectDatabase(fileStructure, packageInfo, readmeAnalysis),
          ports: this.detectPorts(packageInfo, dockerInfo, readmeAnalysis),
          environment: this.detectEnvironmentVars(packageInfo, dockerInfo, readmeAnalysis)
        }
      };

      console.log('✅ 레포지토리 분석 완료:', analysis);
      return analysis;

    } catch (error) {
      console.error('❌ 레포지토리 분석 실패:', error);
      throw error;
    }
  }

  // [advice from AI] GitHub URL 파싱
  parseGitHubUrl(url) {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /github\.com\/([^\/]+)\/([^\/]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', '')
        };
      }
    }
    return null;
  }

  // [advice from AI] 기본 레포지토리 정보
  async getBasicRepoInfo(owner, repo) {
    try {
      const headers = {};
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      }

      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      
      return {
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        language: response.data.language,
        topics: response.data.topics || [],
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        license: response.data.license?.name,
        defaultBranch: response.data.default_branch,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        size: response.data.size,
        isPrivate: response.data.private
      };
    } catch (error) {
      console.warn('기본 레포지토리 정보 가져오기 실패:', error.message);
      return null;
    }
  }

  // [advice from AI] 파일 구조 분석
  async analyzeFileStructure(owner, repo) {
    try {
      const headers = {};
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      }

      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
      
      const files = response.data.map(item => ({
        name: item.name,
        type: item.type,
        path: item.path,
        size: item.size
      }));

      return {
        rootFiles: files,
        hasDockerfile: files.some(f => f.name === 'Dockerfile'),
        hasPackageJson: files.some(f => f.name === 'package.json'),
        hasRequirementsTxt: files.some(f => f.name === 'requirements.txt'),
        hasPomXml: files.some(f => f.name === 'pom.xml'),
        hasGradleBuild: files.some(f => f.name.includes('build.gradle')),
        hasDockerCompose: files.some(f => f.name.includes('docker-compose')),
        hasKubernetesFiles: files.some(f => f.name.includes('k8s') || f.name.includes('kubernetes')),
        hasJenkinsfile: files.some(f => f.name === 'Jenkinsfile'),
        hasGithubActions: files.some(f => f.name === '.github')
      };
    } catch (error) {
      console.warn('파일 구조 분석 실패:', error.message);
      return {};
    }
  }

  // [advice from AI] README 분석
  async analyzeReadme(owner, repo) {
    try {
      const headers = {};
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      }

      const readmeFiles = ['README.md', 'README.rst', 'README.txt', 'readme.md'];
      
      for (const filename of readmeFiles) {
        try {
          const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, { headers });
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          
          return {
            filename,
            content,
            analysis: {
              ports: this.extractPorts(content),
              environment: this.extractEnvironmentVars(content),
              dependencies: this.extractDependencies(content),
              installation: this.extractInstallationSteps(content),
              usage: this.extractUsageInfo(content),
              deployment: this.extractDeploymentInfo(content)
            }
          };
        } catch (err) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('README 분석 실패:', error.message);
      return null;
    }
  }

  // [advice from AI] package.json 분석
  async analyzePackageJson(owner, repo) {
    try {
      const headers = {};
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      }

      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers });
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const packageJson = JSON.parse(content);
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        main: packageJson.main,
        scripts: packageJson.scripts || {},
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        engines: packageJson.engines || {},
        author: packageJson.author,
        license: packageJson.license,
        repository: packageJson.repository,
        keywords: packageJson.keywords || []
      };
    } catch (error) {
      console.warn('package.json 분석 실패:', error.message);
      return null;
    }
  }

  // [advice from AI] Dockerfile 분석
  async analyzeDockerfile(owner, repo) {
    try {
      const headers = {};
      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`;
      }

      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/Dockerfile`, { headers });
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      
      return {
        content,
        baseImage: this.extractBaseImage(content),
        exposedPorts: this.extractExposedPorts(content),
        workdir: this.extractWorkdir(content),
        entrypoint: this.extractEntrypoint(content),
        cmd: this.extractCmd(content),
        env: this.extractDockerEnv(content)
      };
    } catch (error) {
      console.warn('Dockerfile 분석 실패:', error.message);
      return null;
    }
  }

  // [advice from AI] 기술 스택 추론
  inferTechStack(fileStructure, packageInfo, dockerInfo) {
    const stack = {
      language: [],
      framework: [],
      database: [],
      tools: [],
      deployment: []
    };

    // 언어 감지
    if (fileStructure.hasPackageJson || packageInfo) {
      stack.language.push('JavaScript/Node.js');
    }
    if (fileStructure.hasRequirementsTxt) {
      stack.language.push('Python');
    }
    if (fileStructure.hasPomXml) {
      stack.language.push('Java');
    }
    if (fileStructure.hasGradleBuild) {
      stack.language.push('Java/Kotlin');
    }

    // 프레임워크 감지
    if (packageInfo?.dependencies) {
      const deps = Object.keys(packageInfo.dependencies);
      if (deps.includes('react')) stack.framework.push('React');
      if (deps.includes('vue')) stack.framework.push('Vue.js');
      if (deps.includes('angular')) stack.framework.push('Angular');
      if (deps.includes('express')) stack.framework.push('Express.js');
      if (deps.includes('fastify')) stack.framework.push('Fastify');
      if (deps.includes('koa')) stack.framework.push('Koa.js');
      if (deps.includes('next')) stack.framework.push('Next.js');
      if (deps.includes('nuxt')) stack.framework.push('Nuxt.js');
    }

    // 데이터베이스 감지
    if (packageInfo?.dependencies) {
      const deps = Object.keys(packageInfo.dependencies);
      if (deps.includes('pg') || deps.includes('postgres')) stack.database.push('PostgreSQL');
      if (deps.includes('mysql') || deps.includes('mysql2')) stack.database.push('MySQL');
      if (deps.includes('mongodb') || deps.includes('mongoose')) stack.database.push('MongoDB');
      if (deps.includes('redis')) stack.database.push('Redis');
      if (deps.includes('sqlite3')) stack.database.push('SQLite');
    }

    // 배포 도구 감지
    if (fileStructure.hasDockerfile) stack.deployment.push('Docker');
    if (fileStructure.hasDockerCompose) stack.deployment.push('Docker Compose');
    if (fileStructure.hasKubernetesFiles) stack.deployment.push('Kubernetes');
    if (fileStructure.hasJenkinsfile) stack.deployment.push('Jenkins');
    if (fileStructure.hasGithubActions) stack.deployment.push('GitHub Actions');

    return stack;
  }

  // [advice from AI] 배포 설정 추론
  inferDeploymentConfig(fileStructure, packageInfo, dockerInfo, readmeAnalysis) {
    const config = {
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      port: 3000,
      environment: 'production',
      healthCheckPath: '/health',
      resourceRequirements: {
        cpu: '500m',
        memory: '512Mi'
      }
    };

    // package.json 스크립트 기반 명령어 추론
    if (packageInfo?.scripts) {
      if (packageInfo.scripts.build) {
        config.buildCommand = 'npm run build';
      }
      if (packageInfo.scripts.start) {
        config.startCommand = 'npm start';
      }
      if (packageInfo.scripts.dev) {
        config.devCommand = 'npm run dev';
      }
    }

    // 포트 추론
    if (dockerInfo?.exposedPorts?.length > 0) {
      config.port = parseInt(dockerInfo.exposedPorts[0]);
    } else if (readmeAnalysis?.analysis?.ports?.length > 0) {
      config.port = parseInt(readmeAnalysis.analysis.ports[0]);
    }

    // 환경 변수 추론
    if (readmeAnalysis?.analysis?.environment) {
      config.environmentVariables = readmeAnalysis.analysis.environment;
    }

    return config;
  }

  // [advice from AI] 프로젝트 타입 감지
  detectProjectType(fileStructure, packageInfo) {
    if (packageInfo?.dependencies) {
      const deps = Object.keys(packageInfo.dependencies);
      if (deps.includes('react') || deps.includes('vue') || deps.includes('angular')) {
        return 'frontend';
      }
      if (deps.includes('express') || deps.includes('fastify') || deps.includes('koa')) {
        return 'backend';
      }
    }
    
    if (fileStructure.hasPackageJson) return 'nodejs';
    if (fileStructure.hasRequirementsTxt) return 'python';
    if (fileStructure.hasPomXml) return 'java';
    
    return 'unknown';
  }

  // [advice from AI] 빌드 도구 감지
  detectBuildTool(fileStructure, packageInfo) {
    if (packageInfo?.scripts?.build) return 'npm';
    if (fileStructure.hasGradleBuild) return 'gradle';
    if (fileStructure.hasPomXml) return 'maven';
    return 'unknown';
  }

  // [advice from AI] 프레임워크 감지
  detectFramework(fileStructure, packageInfo) {
    if (packageInfo?.dependencies) {
      const deps = Object.keys(packageInfo.dependencies);
      if (deps.includes('react')) return 'React';
      if (deps.includes('vue')) return 'Vue.js';
      if (deps.includes('angular')) return 'Angular';
      if (deps.includes('express')) return 'Express.js';
      if (deps.includes('next')) return 'Next.js';
    }
    return 'unknown';
  }

  // [advice from AI] 데이터베이스 감지
  detectDatabase(fileStructure, packageInfo, readmeAnalysis) {
    const databases = [];
    
    if (packageInfo?.dependencies) {
      const deps = Object.keys(packageInfo.dependencies);
      if (deps.includes('pg')) databases.push('PostgreSQL');
      if (deps.includes('mysql2')) databases.push('MySQL');
      if (deps.includes('mongoose')) databases.push('MongoDB');
      if (deps.includes('redis')) databases.push('Redis');
    }
    
    if (readmeAnalysis?.content) {
      const content = readmeAnalysis.content.toLowerCase();
      if (content.includes('postgresql') || content.includes('postgres')) databases.push('PostgreSQL');
      if (content.includes('mysql')) databases.push('MySQL');
      if (content.includes('mongodb') || content.includes('mongo')) databases.push('MongoDB');
      if (content.includes('redis')) databases.push('Redis');
    }
    
    return [...new Set(databases)];
  }

  // [advice from AI] 포트 감지
  detectPorts(packageInfo, dockerInfo, readmeAnalysis) {
    const ports = [];
    
    if (dockerInfo?.exposedPorts) {
      ports.push(...dockerInfo.exposedPorts.map(p => parseInt(p)));
    }
    
    if (readmeAnalysis?.analysis?.ports) {
      ports.push(...readmeAnalysis.analysis.ports.map(p => parseInt(p)));
    }
    
    // 기본 포트 추론
    if (ports.length === 0) {
      if (packageInfo?.dependencies?.express) ports.push(3000);
      if (packageInfo?.dependencies?.react) ports.push(3000);
      if (packageInfo?.dependencies?.vue) ports.push(8080);
    }
    
    return [...new Set(ports)];
  }

  // [advice from AI] 환경 변수 감지
  detectEnvironmentVars(packageInfo, dockerInfo, readmeAnalysis) {
    const envVars = [];
    
    if (readmeAnalysis?.analysis?.environment) {
      envVars.push(...readmeAnalysis.analysis.environment);
    }
    
    if (dockerInfo?.env) {
      envVars.push(...dockerInfo.env);
    }
    
    return [...new Set(envVars)];
  }

  // [advice from AI] 텍스트에서 포트 추출
  extractPorts(text) {
    const portRegex = /(?:port|PORT|Port)[\s:=]+(\d{4,5})/g;
    const matches = [];
    let match;
    
    while ((match = portRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  }

  // [advice from AI] 환경 변수 추출
  extractEnvironmentVars(text) {
    const envRegex = /([A-Z_][A-Z0-9_]*)\s*=\s*['"']?([^'"'\n\r]+)['"']?/g;
    const matches = [];
    let match;
    
    while ((match = envRegex.exec(text)) !== null) {
      matches.push({
        name: match[1],
        example: match[2]
      });
    }
    
    return matches;
  }

  // [advice from AI] 의존성 추출
  extractDependencies(text) {
    const deps = [];
    
    // npm install 명령어에서 추출
    const npmRegex = /npm install\s+([\w\-@\/\s]+)/g;
    let match;
    while ((match = npmRegex.exec(text)) !== null) {
      deps.push(...match[1].split(/\s+/).filter(dep => dep.trim()));
    }
    
    return deps;
  }

  // [advice from AI] 설치 단계 추출
  extractInstallationSteps(text) {
    const steps = [];
    const lines = text.split('\n');
    
    let inInstallSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('install') || line.toLowerCase().includes('setup')) {
        inInstallSection = true;
      }
      
      if (inInstallSection && (line.startsWith('1.') || line.startsWith('-') || line.startsWith('*'))) {
        steps.push(line.trim());
      }
      
      if (line.startsWith('#') && steps.length > 0) {
        break;
      }
    }
    
    return steps;
  }

  // [advice from AI] 사용법 정보 추출
  extractUsageInfo(text) {
    const usageRegex = /(?:usage|Usage|USAGE|how to use|How to Use)([\s\S]*?)(?:\n#{1,3}|\n\n|$)/i;
    const match = text.match(usageRegex);
    return match ? match[1].trim() : null;
  }

  // [advice from AI] 배포 정보 추출
  extractDeploymentInfo(text) {
    const deployRegex = /(?:deploy|Deploy|DEPLOY|deployment|Deployment)([\s\S]*?)(?:\n#{1,3}|\n\n|$)/i;
    const match = text.match(deployRegex);
    return match ? match[1].trim() : null;
  }

  // [advice from AI] Dockerfile에서 베이스 이미지 추출
  extractBaseImage(dockerfileContent) {
    const match = dockerfileContent.match(/FROM\s+([^\s\n]+)/i);
    return match ? match[1] : null;
  }

  // [advice from AI] Dockerfile에서 노출 포트 추출
  extractExposedPorts(dockerfileContent) {
    const matches = dockerfileContent.match(/EXPOSE\s+(\d+)/gi);
    return matches ? matches.map(m => m.match(/\d+/)[0]) : [];
  }

  // [advice from AI] Dockerfile에서 작업 디렉토리 추출
  extractWorkdir(dockerfileContent) {
    const match = dockerfileContent.match(/WORKDIR\s+([^\s\n]+)/i);
    return match ? match[1] : null;
  }

  // [advice from AI] Dockerfile에서 엔트리포인트 추출
  extractEntrypoint(dockerfileContent) {
    const match = dockerfileContent.match(/ENTRYPOINT\s+\[(.*?)\]/i);
    return match ? JSON.parse(`[${match[1]}]`) : null;
  }

  // [advice from AI] Dockerfile에서 CMD 추출
  extractCmd(dockerfileContent) {
    const match = dockerfileContent.match(/CMD\s+\[(.*?)\]/i);
    return match ? JSON.parse(`[${match[1]}]`) : null;
  }

  // [advice from AI] Dockerfile에서 환경 변수 추출
  extractDockerEnv(dockerfileContent) {
    const matches = dockerfileContent.match(/ENV\s+([A-Z_][A-Z0-9_]*)\s*=?\s*([^\n\r]+)/gi);
    return matches ? matches.map(m => {
      const parts = m.replace(/^ENV\s+/i, '').split(/\s*=\s*/);
      return {
        name: parts[0],
        value: parts[1] || ''
      };
    }) : [];
  }
}

module.exports = RepositoryAnalyzer;
