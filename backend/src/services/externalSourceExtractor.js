// [advice from AI] 외부 소스 추출기 - GitHub, GitLab, Bitbucket 등에서 지식 자산 자동 추출

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const KnowledgeExtractor = require('./knowledgeExtractor');
const DiagramGenerator = require('./diagramGenerator');
const DocumentationGenerator = require('./documentationGenerator');
const RelationshipMapper = require('./relationshipMapper');

const execAsync = promisify(exec);

class ExternalSourceExtractor {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });

    this.tempDir = path.join(__dirname, '../../temp');
    this.currentProgress = [];
    this.currentExtractionId = null;
  }
  
  // [advice from AI] 추출 ID 생성
  generateExtractionId() {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }
  
  // [advice from AI] 전체 소스코드 저장 - 모든 파일을 데이터베이스에 저장
  async storeCompleteSourceCode(projectPath, extractionId, sourceInfo) {
    const fs = require('fs').promises;
    const crypto = require('crypto');
    
    try {
      // 전체 파일 목록 수집
      const allFiles = await this.getAllFiles(projectPath);
      
      // 시스템 전체 정보 수집
      const systemSnapshot = await this.analyzeSystemStructure(projectPath, sourceInfo);
      
      // 시스템 스냅샷 저장
      await this.pool.query(`
        INSERT INTO system_snapshots (
          extraction_id, system_name, system_description, repository_url, 
          branch_name, total_files, total_size, languages_detected, 
          frameworks_detected, dependencies, project_structure, 
          readme_content, license_info, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        extractionId,
        systemSnapshot.name,
        systemSnapshot.description,
        sourceInfo.url,
        sourceInfo.branch || 'main',
        systemSnapshot.totalFiles,
        systemSnapshot.totalSize,
        JSON.stringify(systemSnapshot.languages),
        JSON.stringify(systemSnapshot.frameworks),
        JSON.stringify(systemSnapshot.dependencies),
        JSON.stringify(systemSnapshot.structure),
        systemSnapshot.readme,
        JSON.stringify(systemSnapshot.license),
        JSON.stringify(systemSnapshot.metadata)
      ]);
      
      // 모든 소스 파일 저장
      let savedFiles = 0;
      for (const filePath of allFiles) {
        try {
          await this.saveSourceFile(projectPath, filePath, extractionId);
          savedFiles++;
          
          // 진행률 업데이트
          if (savedFiles % 10 === 0) {
            const progress = Math.min(90, (savedFiles / allFiles.length) * 100);
            this.updateProgress('source_code_storage', progress, 'running', 
              `소스코드 저장 중... (${savedFiles}/${allFiles.length})`);
          }
        } catch (fileError) {
          console.warn(`파일 저장 실패: ${filePath}`, fileError.message);
        }
      }
      
      this.updateProgress('source_code_storage', 100, 'completed', 
        `전체 소스코드 저장 완료 (${savedFiles}개 파일)`);
      
      console.log(`✅ 전체 소스코드 저장 완료: ${savedFiles}개 파일`);
      
    } catch (error) {
      console.error('❌ 소스코드 저장 실패:', error);
      this.updateProgress('source_code_storage', 0, 'error', `소스코드 저장 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] GitHub 레포지토리 클론 - 브랜치 자동 감지 및 Public/Private 레포 처리
  async cloneGitHubRepository(repoUrl, branch = 'main', accessToken = null) {
    try {
      const repoName = this.extractRepoName(repoUrl);
      const localPath = path.join(this.tempDir, repoName);

      // 임시 디렉토리 생성
      await fs.mkdir(this.tempDir, { recursive: true });

      // 기존 디렉토리 제거
      try {
        await fs.rm(localPath, { recursive: true, force: true });
      } catch (err) {
        // 디렉토리가 없는 경우 무시
      }

      this.updateProgress('repository_clone', 10, 'running', '레포지토리 클론 중...');

      let cloneUrl = repoUrl;
      if (accessToken) {
        // GitHub 토큰을 사용한 인증
        const urlParts = repoUrl.replace('https://github.com/', '').split('/');
        cloneUrl = `https://${accessToken}@github.com/${urlParts[0]}/${urlParts[1]}`;
      }

      // [advice from AI] Public 레포지토리 우선 시도, 실패 시 토큰 요구
      let cloneCommand = `git clone --depth 1 --branch ${branch} ${repoUrl} ${localPath}`;
      
      try {
        await execAsync(cloneCommand);
      } catch (publicError) {
        console.log('Public 레포지토리 클론 실패, 인증이 필요할 수 있습니다:', publicError.message);
        
        if (!accessToken) {
          throw new Error(`레포지토리 접근에 실패했습니다. Private 레포지토리인 경우 GitHub 토큰이 필요합니다. 오류: ${publicError.message}`);
        }
        
        // 토큰을 사용하여 재시도
        cloneCommand = `git clone --depth 1 --branch ${branch} ${cloneUrl} ${localPath}`;
        await execAsync(cloneCommand);
      }

      this.updateProgress('repository_clone', 100, 'completed', '레포지토리 클론 완료');

      return localPath;
    } catch (error) {
      this.updateProgress('repository_clone', 0, 'error', `클론 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] GitHub API를 통한 메타데이터 수집
  async fetchGitHubMetadata(repoUrl, accessToken = null) {
    try {
      this.updateProgress('metadata_fetch', 10, 'running', 'GitHub 메타데이터 수집 중...');

      const [owner, repo] = this.extractOwnerRepo(repoUrl);
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Timbel-Knowledge-Extractor'
      };

      if (accessToken) {
        headers['Authorization'] = `token ${accessToken}`;
      }

      const response = await axios.get(apiUrl, { headers });
      const repoData = response.data;

      // 추가 정보 수집 (언어, 기여자, README 등)
      const [languagesResponse, contributorsResponse, readmeResponse] = await Promise.allSettled([
        axios.get(`${apiUrl}/languages`, { headers }),
        axios.get(`${apiUrl}/contributors`, { headers }),
        axios.get(`${apiUrl}/readme`, { headers })
      ]);

      const metadata = {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        language: repoData.language,
        languages: languagesResponse.status === 'fulfilled' ? languagesResponse.value.data : {},
        contributors: contributorsResponse.status === 'fulfilled' ? contributorsResponse.value.data.length : 0,
        hasReadme: readmeResponse.status === 'fulfilled',
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        topics: repoData.topics || [],
        license: repoData.license?.name || null,
        defaultBranch: repoData.default_branch,
        size: repoData.size,
        openIssues: repoData.open_issues_count
      };

      this.updateProgress('metadata_fetch', 100, 'completed', 'GitHub 메타데이터 수집 완료');

      return metadata;
    } catch (error) {
      this.updateProgress('metadata_fetch', 0, 'error', `메타데이터 수집 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 외부 소스에서 지식 자산 추출
  async extractFromExternalSource(source, options = {}, userId = 'system') {
    try {
      this.currentExtractionId = Date.now().toString();
      this.currentProgress = [];

      console.log('🚀 외부 소스 추출 시작:', { source, options });

      let localPath;
      let metadata = {};

      // 1단계: 소스 다운로드/클론
      switch (source.type) {
        case 'github':
          localPath = await this.cloneGitHubRepository(source.url, source.branch, source.accessToken);
          metadata = await this.fetchGitHubMetadata(source.url, source.accessToken);
          break;
        case 'gitlab':
          localPath = await this.cloneGitLabRepository(source.url, source.branch, source.accessToken);
          break;
        case 'bitbucket':
          localPath = await this.cloneBitbucketRepository(source.url, source.branch, source.accessToken);
          break;
        case 'url':
          localPath = await this.downloadFromUrl(source.url);
          break;
        default:
          throw new Error(`지원하지 않는 소스 타입: ${source.type}`);
      }

      // [advice from AI] 전체 소스코드 저장 및 지식 자산 추출
      this.updateProgress('source_code_storage', 10, 'running', '전체 소스코드 저장 중...');
      
      // 전체 소스코드 저장
      const extractionId = this.generateExtractionId();
      await this.storeCompleteSourceCode(localPath, extractionId, source);
      
      // [advice from AI] 시스템 스냅샷 저장
      await this.storeSystemSnapshot(localPath, extractionId, source, options);
      
      this.updateProgress('knowledge_extraction', 50, 'running', '지식 자산 추출 중...');
      
      // [advice from AI] 기존 KnowledgeExtractor를 사용하여 추출 - 하지만 pending 모드로
      const extractor = new KnowledgeExtractor();
      const extractionResults = await extractor.scanProject(localPath, extractionId, userId);
      extractionResults.extractionId = extractionId;

      // 메타데이터를 추출 결과에 추가
      if (metadata && Object.keys(metadata).length > 0) {
        extractionResults.metadata = metadata;
        extractionResults.sourceInfo = {
          type: source.type,
          url: source.url,
          branch: source.branch || 'main',
          extractedAt: new Date().toISOString()
        };
      }

      this.updateProgress('knowledge_extraction', 100, 'completed', '지식 자산 추출 완료');

      let relationshipResults = null;
      let documentationResults = null;
      let diagramResults = null;

      // 3단계: 관계 매핑 (옵션)
      if (options.mapRelationships) {
        try {
          this.updateProgress('relationship_mapping', 10, 'running', '관계 매핑 중...');
          const mapper = new RelationshipMapper();
          relationshipResults = await mapper.analyzeAllRelationships(extractionResults);
          this.updateProgress('relationship_mapping', 100, 'completed', '관계 매핑 완료');
        } catch (err) {
          this.updateProgress('relationship_mapping', 0, 'error', `관계 매핑 실패: ${err.message}`);
        }
      }

      // 4단계: 자동 문서 생성 (옵션)
      if (options.generateDocumentation) {
        try {
          this.updateProgress('documentation_generation', 10, 'running', '문서 자동 생성 중...');
          const docGenerator = new DocumentationGenerator();
          documentationResults = await docGenerator.generateAllDocumentation(localPath, extractionResults);
          this.updateProgress('documentation_generation', 100, 'completed', '문서 자동 생성 완료');
        } catch (err) {
          this.updateProgress('documentation_generation', 0, 'error', `문서 생성 실패: ${err.message}`);
        }
      }

      // 5단계: 다이어그램 생성 (옵션)
      if (options.generateDiagrams) {
        try {
          this.updateProgress('diagram_generation', 10, 'running', '다이어그램 생성 중...');
          const generator = new DiagramGenerator();
          diagramResults = await generator.generateAllDiagrams(localPath);
          this.updateProgress('diagram_generation', 100, 'completed', '다이어그램 생성 완료');
        } catch (err) {
          this.updateProgress('diagram_generation', 0, 'error', `다이어그램 생성 실패: ${err.message}`);
        }
      }

      // 6단계: 임시 파일 정리
      this.updateProgress('cleanup', 10, 'running', '임시 파일 정리 중...');
      try {
        await fs.rm(localPath, { recursive: true, force: true });
        this.updateProgress('cleanup', 100, 'completed', '임시 파일 정리 완료');
      } catch (err) {
        this.updateProgress('cleanup', 0, 'error', `정리 실패: ${err.message}`);
      }

      // 결과 종합
      const finalResult = {
        success: true,
        summary: {
          codeComponents: extractionResults.codeComponents.length,
          designAssets: extractionResults.designAssets.length,
          documents: extractionResults.documents.length,
          catalogComponents: extractionResults.catalogComponents.length,
          diagrams: diagramResults ? Object.keys(diagramResults).filter(key => 
            diagramResults[key] !== null && key !== 'errors'
          ).length : 0,
          relationships: relationshipResults ? relationshipResults.totalRelationships : 0
        },
        extractionResults,
        relationshipResults,
        documentationResults,
        diagramResults,
        metadata,
        sourceInfo: {
          type: source.type,
          url: source.url,
          branch: source.branch || 'main',
          extractedAt: new Date().toISOString()
        },
        errors: [],
        warnings: []
      };

      // 에러 및 경고 수집
      if (relationshipResults?.errors) {
        finalResult.errors.push(...relationshipResults.errors);
      }
      if (documentationResults?.errors) {
        finalResult.errors.push(...documentationResults.errors);
      }
      if (diagramResults?.errors) {
        finalResult.errors.push(...diagramResults.errors);
      }

      console.log('✅ 외부 소스 추출 완료:', finalResult.summary);

      return finalResult;

    } catch (error) {
      console.error('❌ 외부 소스 추출 실패:', error);
      this.updateProgress('error', 0, 'error', `추출 실패: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        summary: {
          codeComponents: 0,
          designAssets: 0,
          documents: 0,
          catalogComponents: 0,
          diagrams: 0,
          relationships: 0
        },
        errors: [error.message],
        warnings: []
      };
    }
  }

  // [advice from AI] GitLab 레포지토리 클론 (GitHub과 유사)
  async cloneGitLabRepository(repoUrl, branch = 'main', accessToken = null) {
    try {
      const repoName = this.extractRepoName(repoUrl);
      const localPath = path.join(this.tempDir, repoName);

      await fs.mkdir(this.tempDir, { recursive: true });

      try {
        await fs.rm(localPath, { recursive: true, force: true });
      } catch (err) {
        // 디렉토리가 없는 경우 무시
      }

      this.updateProgress('repository_clone', 10, 'running', 'GitLab 레포지토리 클론 중...');

      let cloneUrl = repoUrl;
      if (accessToken) {
        cloneUrl = repoUrl.replace('https://gitlab.com/', `https://oauth2:${accessToken}@gitlab.com/`);
      }

      const cloneCommand = `git clone --depth 1 --branch ${branch} ${cloneUrl} ${localPath}`;
      await execAsync(cloneCommand);

      this.updateProgress('repository_clone', 100, 'completed', 'GitLab 레포지토리 클론 완료');

      return localPath;
    } catch (error) {
      this.updateProgress('repository_clone', 0, 'error', `GitLab 클론 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] Bitbucket 레포지토리 클론
  async cloneBitbucketRepository(repoUrl, branch = 'main', accessToken = null) {
    try {
      const repoName = this.extractRepoName(repoUrl);
      const localPath = path.join(this.tempDir, repoName);

      await fs.mkdir(this.tempDir, { recursive: true });

      try {
        await fs.rm(localPath, { recursive: true, force: true });
      } catch (err) {
        // 디렉토리가 없는 경우 무시
      }

      this.updateProgress('repository_clone', 10, 'running', 'Bitbucket 레포지토리 클론 중...');

      let cloneUrl = repoUrl;
      if (accessToken) {
        cloneUrl = repoUrl.replace('https://bitbucket.org/', `https://x-token-auth:${accessToken}@bitbucket.org/`);
      }

      const cloneCommand = `git clone --depth 1 --branch ${branch} ${cloneUrl} ${localPath}`;
      await execAsync(cloneCommand);

      this.updateProgress('repository_clone', 100, 'completed', 'Bitbucket 레포지토리 클론 완료');

      return localPath;
    } catch (error) {
      this.updateProgress('repository_clone', 0, 'error', `Bitbucket 클론 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 일반 URL에서 다운로드
  async downloadFromUrl(url) {
    try {
      this.updateProgress('url_download', 10, 'running', 'URL에서 다운로드 중...');

      // 간단한 구현 - 실제로는 더 복잡한 로직이 필요할 수 있음
      const fileName = path.basename(url) || 'downloaded_content';
      const localPath = path.join(this.tempDir, fileName);

      await fs.mkdir(this.tempDir, { recursive: true });

      const response = await axios.get(url, { responseType: 'stream' });
      const writer = fs.createWriteStream(localPath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      this.updateProgress('url_download', 100, 'completed', 'URL 다운로드 완료');

      return localPath;
    } catch (error) {
      this.updateProgress('url_download', 0, 'error', `URL 다운로드 실패: ${error.message}`);
      throw error;
    }
  }

  // [advice from AI] 진행 상황 업데이트
  updateProgress(step, progress, status, message, details = null) {
    const existingStep = this.currentProgress.find(p => p.step === step);
    
    if (existingStep) {
      existingStep.progress = progress;
      existingStep.status = status;
      existingStep.message = message;
      existingStep.details = details;
    } else {
      this.currentProgress.push({
        step,
        progress,
        status,
        message,
        details,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📊 진행 상황 - ${step}: ${progress}% (${status}) - ${message}`);
  }

  // [advice from AI] 현재 진행 상황 조회
  getCurrentProgress() {
    return {
      extractionId: this.currentExtractionId,
      steps: this.currentProgress,
      overallProgress: this.calculateOverallProgress()
    };
  }

  // [advice from AI] 전체 진행률 계산
  calculateOverallProgress() {
    if (this.currentProgress.length === 0) return 0;
    
    const totalProgress = this.currentProgress.reduce((sum, step) => sum + step.progress, 0);
    return Math.round(totalProgress / this.currentProgress.length);
  }

  // [advice from AI] 유틸리티 함수들
  extractRepoName(repoUrl) {
    const parts = repoUrl.split('/');
    return parts[parts.length - 1].replace('.git', '');
  }

  extractOwnerRepo(repoUrl) {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    return [match[1], match[2].replace('.git', '')];
  }

  // [advice from AI] 리소스 정리
  async cleanup() {
    try {
      if (this.tempDir) {
        await fs.rm(this.tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('정리 중 오류:', err);
    }
  }
  // [advice from AI] 전체 소스코드 저장 - 모든 파일을 데이터베이스에 저장
  async storeCompleteSourceCode(projectPath, extractionId, sourceInfo) {
    const fs = require('fs').promises;
    const crypto = require('crypto');
    
    try {
      console.log(`💾 전체 소스코드 저장 시작: ${projectPath}`);
      
      // 모든 파일 수집
      const allFiles = await this.getAllFiles(projectPath);
      console.log(`📁 총 ${allFiles.length}개 파일 발견`);
      
      let savedFiles = 0;
      for (const filePath of allFiles) {
        try {
          await this.saveSourceFile(projectPath, filePath, extractionId);
          savedFiles++;
          
          // 진행률 업데이트
          if (savedFiles % 20 === 0 || savedFiles === allFiles.length) {
            const progress = Math.min(90, (savedFiles / allFiles.length) * 100);
            this.updateProgress('source_code_storage', progress, 'running', 
              `소스코드 저장: ${savedFiles}/${allFiles.length} 파일`);
          }
        } catch (fileError) {
          console.warn(`파일 저장 실패: ${filePath} - ${fileError.message}`);
        }
      }
      
      this.updateProgress('source_code_storage', 100, 'completed', 
        `전체 소스코드 저장 완료: ${savedFiles}개 파일`);
      
      console.log(`✅ 전체 소스코드 저장 완료: ${savedFiles}/${allFiles.length} 파일`);
      
    } catch (error) {
      console.error('❌ 소스코드 저장 실패:', error);
      this.updateProgress('source_code_storage', 0, 'error', `소스코드 저장 실패: ${error.message}`);
      throw error;
    }
  }
  
  // [advice from AI] 디렉토리에서 모든 파일 목록 수집
  async getAllFiles(dirPath) {
    const fs = require('fs').promises;
    const files = [];
    
    const scanDirectory = async (currentPath) => {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        const relativePath = path.relative(dirPath, fullPath);
        
        // 제외할 디렉토리/파일
        if (item.name.startsWith('.git') || 
            item.name === 'node_modules' || 
            item.name === '__pycache__' ||
            item.name === '.DS_Store' ||
            item.name.startsWith('._') ||
            item.name.includes(':Zone.Identifier')) {
          continue;
        }
        
        if (item.isDirectory()) {
          await scanDirectory(fullPath);
        } else {
          files.push(relativePath);
        }
      }
    };
    
    await scanDirectory(dirPath);
    return files;
  }
  
  // [advice from AI] 개별 소스 파일 저장 - 단순하게 전체 내용 저장
  async saveSourceFile(projectPath, relativePath, extractionId) {
    const fs = require('fs').promises;
    const crypto = require('crypto');
    
    const fullPath = path.join(projectPath, relativePath);
    const stats = await fs.stat(fullPath);
    
    // 파일 크기 제한 (5MB)
    if (stats.size > 5 * 1024 * 1024) {
      console.warn(`파일 크기 초과로 스킵: ${relativePath}`);
      return;
    }
    
    try {
      // 텍스트 파일로 읽기 시도
      const content = await fs.readFile(fullPath, 'utf8');
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');
      
      // 기본 파일 정보
      const extension = path.extname(relativePath).toLowerCase();
      const language = this.detectLanguage(extension);
      const lineCount = content.split('\n').length;
      
      // 데이터베이스에 저장
      await this.pool.query(`
        INSERT INTO source_code_repository (
          extraction_id, file_path, file_name, file_extension, file_size,
          content, content_hash, language, line_count, char_count, is_binary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        extractionId,
        relativePath,
        path.basename(relativePath),
        extension,
        stats.size,
        content,
        contentHash,
        language,
        lineCount,
        content.length,
        false
      ]);
      
    } catch (readError) {
      // 바이너리 파일 처리
      try {
        const binaryContent = await fs.readFile(fullPath);
        const contentHash = crypto.createHash('sha256').update(binaryContent).digest('hex');
        
        await this.pool.query(`
          INSERT INTO source_code_repository (
            extraction_id, file_path, file_name, file_extension, file_size,
            content_hash, is_binary
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          extractionId,
          relativePath,
          path.basename(relativePath),
          path.extname(relativePath),
          stats.size,
          contentHash,
          true
        ]);
      } catch (binaryError) {
        console.warn(`파일 저장 완전 실패: ${relativePath}`);
      }
    }
  }
  
  // [advice from AI] 파일 확장자로 언어 감지
  detectLanguage(extension) {
    const languageMap = {
      '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
      '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.cs': 'csharp',
      '.php': 'php', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.swift': 'swift',
      '.kt': 'kotlin', '.scala': 'scala', '.sh': 'shell', '.bash': 'shell',
      '.html': 'html', '.css': 'css', '.scss': 'scss', '.sass': 'sass',
      '.json': 'json', '.xml': 'xml', '.yaml': 'yaml', '.yml': 'yaml',
      '.md': 'markdown', '.txt': 'text', '.sql': 'sql'
    };
    return languageMap[extension] || 'unknown';
  }
  
  // [advice from AI] pending 전용 추출 - 정식 테이블에 저장하지 않고 분석만 수행
  async extractToPendingOnly(projectPath, extractionId) {
    const fs = require('fs').promises;
    const KnowledgeExtractor = require('./knowledgeExtractor');
    
    try {
      console.log('🔍 pending 모드로 지식 자산 분석 시작...');
      
      // 파일 분석만 수행 (DB 저장 안함)
      const results = {
        codeComponents: [],
        documents: [],
        designAssets: [],
        catalogComponents: [],
        summary: { codeComponents: 0, documents: 0, designAssets: 0, catalogComponents: 0 }
      };
      
      // 모든 파일 스캔
      const allFiles = await this.getAllFiles(projectPath);
      console.log(`📁 총 ${allFiles.length}개 파일 분석 중...`);
      
      for (const filePath of allFiles) {
        const fullPath = path.join(projectPath, filePath);
        const ext = path.extname(filePath).toLowerCase();
        const content = await this.readFileContent(fullPath);
        
        if (!content) continue;
        
        // 파일 타입별 분류
        if (['.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c'].includes(ext)) {
          results.codeComponents.push({
            id: require('uuid').v4(),
            name: path.basename(filePath, ext),
            file_path: filePath,
            content: content,
            language: this.detectLanguage(ext),
            type: 'code_component'
          });
        } else if (['.md', '.txt', '.rst', '.doc'].includes(ext)) {
          results.documents.push({
            id: require('uuid').v4(),
            title: path.basename(filePath, ext),
            file_path: filePath,
            content: content,
            format: ext.slice(1),
            type: 'document'
          });
        } else if (['.json', '.yaml', '.yml', '.xml'].includes(ext)) {
          results.catalogComponents.push({
            id: require('uuid').v4(),
            name: path.basename(filePath, ext),
            file_path: filePath,
            content: content,
            type: 'catalog_component'
          });
        }
      }
      
      // 요약 정보 생성
      results.summary = {
        codeComponents: results.codeComponents.length,
        documents: results.documents.length,
        designAssets: results.designAssets.length,
        catalogComponents: results.catalogComponents.length
      };
      
      console.log(`✅ pending 분석 완료: 코드 ${results.codeComponents.length}, 문서 ${results.documents.length}, 카탈로그 ${results.catalogComponents.length}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ pending 추출 실패:', error);
      throw error;
    }
  }
  
  // [advice from AI] 파일 내용 안전하게 읽기
  async readFileContent(filePath) {
    const fs = require('fs').promises;
    
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > 1024 * 1024) return null; // 1MB 초과 파일 스킵
      
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      return null; // 읽기 실패 시 스킵
    }
  }

  // [advice from AI] 시스템 스냅샷 저장 - GitHub 스타일 뷰를 위한 메타데이터
  async storeSystemSnapshot(projectPath, extractionId, source, options = {}) {
    try {
      console.log('📸 시스템 스냅샷 저장 시작...');
      
      const fs = require('fs').promises;
      
      // 프로젝트 구조 분석
      const projectStructure = await this.analyzeProjectStructure(projectPath);
      
      // README 파일 찾기 및 읽기
      const readmeContent = await this.findAndReadReadme(projectPath);
      
      // 라이선스 정보 찾기
      const licenseInfo = await this.findLicenseInfo(projectPath);
      
      // 언어 및 프레임워크 감지
      const languagesDetected = await this.detectLanguagesAndFrameworks(projectPath);
      
      // 의존성 분석
      const dependencies = await this.analyzeDependencies(projectPath);
      
      // 총 파일 수 및 크기 계산
      const allFiles = await this.getAllFiles(projectPath);
      let totalSize = 0;
      for (const filePath of allFiles) {
        try {
          const stats = await fs.stat(path.join(projectPath, filePath));
          totalSize += stats.size;
        } catch (e) { /* 무시 */ }
      }
      
      // Git 정보 (가능한 경우)
      let commitHash = null;
      try {
        const { execAsync } = require('./utils');
        const result = await execAsync('git rev-parse HEAD', { cwd: projectPath });
        commitHash = result.stdout.trim();
      } catch (e) { /* Git 정보 없음 */ }
      
      // 시스템 스냅샷 데이터베이스 저장
      await this.pool.query(`
        INSERT INTO system_snapshots (
          extraction_id, system_name, system_description, repository_url, branch_name,
          commit_hash, total_files, total_size, languages_detected, frameworks_detected,
          dependencies, project_structure, readme_content, license_info, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (extraction_id) DO UPDATE SET
          system_name = EXCLUDED.system_name,
          system_description = EXCLUDED.system_description,
          repository_url = EXCLUDED.repository_url,
          branch_name = EXCLUDED.branch_name,
          commit_hash = EXCLUDED.commit_hash,
          total_files = EXCLUDED.total_files,
          total_size = EXCLUDED.total_size,
          languages_detected = EXCLUDED.languages_detected,
          frameworks_detected = EXCLUDED.frameworks_detected,
          dependencies = EXCLUDED.dependencies,
          project_structure = EXCLUDED.project_structure,
          readme_content = EXCLUDED.readme_content,
          license_info = EXCLUDED.license_info,
          metadata = EXCLUDED.metadata
      `, [
        extractionId,
        options.systemName || path.basename(projectPath),
        options.systemDescription || '자동 추출된 시스템',
        source.url,
        source.branch || 'main',
        commitHash,
        allFiles.length,
        totalSize,
        JSON.stringify(languagesDetected),
        JSON.stringify(languagesDetected.frameworks || []),
        JSON.stringify(dependencies),
        JSON.stringify(projectStructure),
        readmeContent,
        JSON.stringify(licenseInfo),
        JSON.stringify({
          extractedAt: new Date().toISOString(),
          sourceType: source.type,
          extractionOptions: options
        })
      ]);
      
      console.log(`✅ 시스템 스냅샷 저장 완료: ${allFiles.length}개 파일, ${this.formatFileSize(totalSize)}`);
      
    } catch (error) {
      console.error('❌ 시스템 스냅샷 저장 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 프로젝트 구조 분석
  async analyzeProjectStructure(projectPath) {
    const fs = require('fs').promises;
    const structure = {};
    
    const scanDirectory = async (currentPath, relativePath = '') => {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      const dirStructure = { files: [], directories: [] };
      
      for (const item of items) {
        if (item.name.startsWith('.git') || item.name === 'node_modules') continue;
        
        const itemPath = path.join(relativePath, item.name);
        
        if (item.isDirectory()) {
          dirStructure.directories.push({
            name: item.name,
            path: itemPath,
            children: await scanDirectory(path.join(currentPath, item.name), itemPath)
          });
        } else {
          const stats = await fs.stat(path.join(currentPath, item.name));
          dirStructure.files.push({
            name: item.name,
            path: itemPath,
            size: stats.size,
            extension: path.extname(item.name),
            lastModified: stats.mtime
          });
        }
      }
      
      return dirStructure;
    };
    
    return await scanDirectory(projectPath);
  }

  // [advice from AI] README 파일 찾기 및 읽기
  async findAndReadReadme(projectPath) {
    const fs = require('fs').promises;
    const readmeFiles = ['README.md', 'README.txt', 'README.rst', 'readme.md', 'Readme.md'];
    
    for (const filename of readmeFiles) {
      try {
        const content = await fs.readFile(path.join(projectPath, filename), 'utf8');
        return content;
      } catch (e) { /* 파일 없음 */ }
    }
    
    return null;
  }

  // [advice from AI] 라이선스 정보 찾기
  async findLicenseInfo(projectPath) {
    const fs = require('fs').promises;
    const licenseFiles = ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'COPYING'];
    
    for (const filename of licenseFiles) {
      try {
        const content = await fs.readFile(path.join(projectPath, filename), 'utf8');
        return { type: 'file', filename, content: content.substring(0, 1000) };
      } catch (e) { /* 파일 없음 */ }
    }
    
    // package.json에서 라이선스 정보 찾기
    try {
      const packageJson = await fs.readFile(path.join(projectPath, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);
      if (pkg.license) {
        return { type: 'package', license: pkg.license };
      }
    } catch (e) { /* package.json 없음 */ }
    
    return null;
  }

  // [advice from AI] 언어 및 프레임워크 감지
  async detectLanguagesAndFrameworks(projectPath) {
    const fs = require('fs').promises;
    const allFiles = await this.getAllFiles(projectPath);
    
    const languages = {};
    const frameworks = [];
    
    // 파일 확장자로 언어 감지
    for (const filePath of allFiles) {
      const ext = path.extname(filePath).toLowerCase();
      const language = this.detectLanguage(ext);
      if (language !== 'unknown') {
        languages[language] = (languages[language] || 0) + 1;
      }
    }
    
    // 프레임워크 감지 (package.json, requirements.txt 등)
    try {
      const packageJson = await fs.readFile(path.join(projectPath, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);
      
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      Object.keys(deps).forEach(dep => {
        if (dep.includes('react')) frameworks.push('React');
        if (dep.includes('vue')) frameworks.push('Vue.js');
        if (dep.includes('angular')) frameworks.push('Angular');
        if (dep.includes('express')) frameworks.push('Express');
        if (dep.includes('django')) frameworks.push('Django');
        if (dep.includes('spring')) frameworks.push('Spring');
      });
    } catch (e) { /* package.json 없음 */ }
    
    try {
      const requirements = await fs.readFile(path.join(projectPath, 'requirements.txt'), 'utf8');
      if (requirements.includes('django')) frameworks.push('Django');
      if (requirements.includes('flask')) frameworks.push('Flask');
      if (requirements.includes('fastapi')) frameworks.push('FastAPI');
    } catch (e) { /* requirements.txt 없음 */ }
    
    return {
      languages: Object.keys(languages).map(lang => ({
        name: lang,
        fileCount: languages[lang],
        percentage: ((languages[lang] / allFiles.length) * 100).toFixed(1)
      })),
      frameworks: [...new Set(frameworks)],
      totalFiles: allFiles.length
    };
  }

  // [advice from AI] 의존성 분석
  async analyzeDependencies(projectPath) {
    const fs = require('fs').promises;
    const dependencies = {
      runtime: [],
      development: [],
      system: []
    };
    
    // package.json 의존성
    try {
      const packageJson = await fs.readFile(path.join(projectPath, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);
      
      if (pkg.dependencies) {
        Object.keys(pkg.dependencies).forEach(dep => {
          dependencies.runtime.push({
            name: dep,
            version: pkg.dependencies[dep],
            type: 'npm'
          });
        });
      }
      
      if (pkg.devDependencies) {
        Object.keys(pkg.devDependencies).forEach(dep => {
          dependencies.development.push({
            name: dep,
            version: pkg.devDependencies[dep],
            type: 'npm'
          });
        });
      }
    } catch (e) { /* package.json 없음 */ }
    
    // requirements.txt 의존성
    try {
      const requirements = await fs.readFile(path.join(projectPath, 'requirements.txt'), 'utf8');
      requirements.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [name, version] = line.split('==');
          dependencies.runtime.push({
            name: name.trim(),
            version: version?.trim() || 'latest',
            type: 'pip'
          });
        }
      });
    } catch (e) { /* requirements.txt 없음 */ }
    
    return dependencies;
  }

  // [advice from AI] 파일 크기 포맷팅
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = ExternalSourceExtractor;
