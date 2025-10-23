// [advice from AI] 레포지토리 분석 서비스
const GitServiceFactory = require('./GitServiceFactory');

class RepositoryAnalyzer {
  constructor() {
    this.factory = new GitServiceFactory();
  }

  /**
   * 레포지토리 전체 분석
   * @param {string} url - 레포지토리 URL
   * @param {string} branch - 브랜치명 (기본: main)
   * @param {string} token - 액세스 토큰 (선택사항)
   * @returns {Promise<Object>} - 분석 결과
   */
  async analyzeRepository(url, branch = 'main', token = null) {
    try {
      console.log('🔍 레포지토리 분석 시작:', url);
      
      // URL 정규화
      const normalizedUrl = this.factory.normalizeUrl(url);
      
      // Git 서비스 감지 및 파싱
      const { service, type } = this.factory.detectAndCreateService(normalizedUrl);
      const repositoryInfo = service.parseUrl(normalizedUrl);
      repositoryInfo.branch = branch;

      console.log('📋 레포지토리 정보:', repositoryInfo);

      // 병렬로 데이터 수집
      const [
        repositoryData,
        readmeContent,
        languageStats,
        dependencies
      ] = await Promise.allSettled([
        service.getRepositoryInfo(repositoryInfo, token),
        service.getReadmeContent(repositoryInfo, token),
        service.getLanguageStats(repositoryInfo, token),
        service.getDependencies(repositoryInfo, token)
      ]);

      // 결과 처리
      const result = {
        service: type,
        repositoryInfo,
        repository: repositoryData.status === 'fulfilled' ? repositoryData.value : null,
        readme: this._analyzeReadme(readmeContent.status === 'fulfilled' ? readmeContent.value : ''),
        codeAnalysis: {
          languages: languageStats.status === 'fulfilled' ? languageStats.value : [],
          dependencies: dependencies.status === 'fulfilled' ? dependencies.value : [],
          frameworks: [],
          architecture: 'Unknown'
        },
        suggestedSystem: null,
        errors: []
      };

      // 에러 수집
      [repositoryData, readmeContent, languageStats, dependencies].forEach((promise, index) => {
        if (promise.status === 'rejected') {
          const errorNames = ['repository', 'readme', 'languageStats', 'dependencies'];
          result.errors.push({
            type: errorNames[index],
            error: promise.reason.message
          });
        }
      });

      // 프레임워크 추출
      result.codeAnalysis.frameworks = this._extractFrameworks(
        result.codeAnalysis.languages,
        result.codeAnalysis.dependencies
      );

      // 아키텍처 추론
      result.codeAnalysis.architecture = this._inferArchitecture(
        result.codeAnalysis.languages,
        result.codeAnalysis.dependencies,
        result.codeAnalysis.frameworks
      );

      // 시스템 정보 추론
      result.suggestedSystem = this._suggestSystemInfo(
        result.repository,
        result.readme,
        result.codeAnalysis
      );

      console.log('✅ 레포지토리 분석 완료');
      return result;

    } catch (error) {
      console.error('❌ 레포지토리 분석 실패:', error);
      throw new Error(`레포지토리 분석에 실패했습니다: ${error.message}`);
    }
  }

  /**
   * README 분석
   * @private
   */
  _analyzeReadme(content) {
    if (!content) {
      return {
        content: '',
        summary: 'README 파일이 없습니다.',
        hasReadme: false
      };
    }

    // README 요약 생성 (첫 200자)
    const summary = content.length > 200 
      ? content.substring(0, 200) + '...'
      : content;

    // 주요 키워드 추출
    const keywords = this._extractKeywords(content);

    return {
      content,
      summary,
      hasReadme: true,
      keywords,
      length: content.length
    };
  }

  /**
   * 키워드 추출
   * @private
   */
  _extractKeywords(text) {
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 프레임워크 추출
   * @private
   */
  _extractFrameworks(languages, dependencies) {
    const frameworks = new Set();
    
    // 언어별 주요 프레임워크
    const frameworkMap = {
      'JavaScript': ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js'],
      'TypeScript': ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js'],
      'Python': ['Django', 'Flask', 'FastAPI', 'TensorFlow', 'PyTorch'],
      'Java': ['Spring', 'Spring Boot', 'Hibernate', 'Maven'],
      'C#': ['.NET', 'ASP.NET', 'Entity Framework'],
      'PHP': ['Laravel', 'Symfony', 'CodeIgniter'],
      'Ruby': ['Rails', 'Sinatra'],
      'Go': ['Gin', 'Echo', 'Fiber'],
      'Rust': ['Actix', 'Rocket', 'Warp']
    };

    // 언어 기반 프레임워크 추출
    languages.forEach(({ language }) => {
      const languageFrameworks = frameworkMap[language] || [];
      languageFrameworks.forEach(fw => frameworks.add(fw));
    });

    // 의존성 기반 프레임워크 추출
    dependencies.forEach(dep => {
      if (dep.type === 'npm') {
        Object.keys({ ...dep.dependencies, ...dep.devDependencies }).forEach(pkg => {
          const packageFrameworks = {
            'react': 'React',
            'vue': 'Vue',
            'angular': 'Angular',
            'express': 'Express',
            'next': 'Next.js',
            'django': 'Django',
            'flask': 'Flask',
            'spring-boot': 'Spring Boot'
          };
          
          const framework = packageFrameworks[pkg.toLowerCase()];
          if (framework) {
            frameworks.add(framework);
          }
        });
      }
    });

    return Array.from(frameworks);
  }

  /**
   * 아키텍처 추론
   * @private
   */
  _inferArchitecture(languages, dependencies, frameworks) {
    // 프레임워크 기반 아키텍처 추론
    if (frameworks.includes('React') || frameworks.includes('Vue') || frameworks.includes('Angular')) {
      return 'Frontend Web Application';
    }
    
    if (frameworks.includes('Express') || frameworks.includes('Django') || frameworks.includes('Flask')) {
      return 'Backend API Service';
    }
    
    if (frameworks.includes('Next.js')) {
      return 'Full-stack Web Application';
    }
    
    if (frameworks.includes('Spring Boot')) {
      return 'Enterprise Backend Service';
    }
    
    // 언어 기반 추론
    const primaryLanguage = languages[0]?.language;
    switch (primaryLanguage) {
      case 'JavaScript':
      case 'TypeScript':
        return 'Web Application';
      case 'Python':
        return 'Data/API Service';
      case 'Java':
        return 'Enterprise Application';
      case 'C#':
        return '.NET Application';
      default:
        return 'Application';
    }
  }

  /**
   * 시스템 정보 추론
   * @private
   */
  _suggestSystemInfo(repository, readme, codeAnalysis) {
    if (!repository) {
      return {
        name: 'Unknown System',
        description: '시스템 정보를 분석할 수 없습니다.',
        category: 'unknown',
        techStack: []
      };
    }

    // 시스템명 추론
    const suggestedName = this._suggestSystemName(repository.name, readme.content);
    
    // 설명 추론
    const suggestedDescription = this._suggestDescription(repository.description, readme.summary);
    
    // 카테고리 추론
    const suggestedCategory = this._suggestCategory(codeAnalysis.architecture, codeAnalysis.frameworks);
    
    // 기술 스택 구성
    const techStack = [
      ...codeAnalysis.languages.slice(0, 3).map(l => l.language),
      ...codeAnalysis.frameworks.slice(0, 3)
    ].filter((item, index, arr) => arr.indexOf(item) === index);

    return {
      name: suggestedName,
      description: suggestedDescription,
      category: suggestedCategory,
      techStack,
      suggestedTags: readme.keywords?.slice(0, 5) || []
    };
  }

  /**
   * 시스템명 추론
   * @private
   */
  _suggestSystemName(repoName, readmeContent) {
    // README에서 프로젝트명 추출 시도
    if (readmeContent) {
      const titleMatch = readmeContent.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1].length < 50) {
        return titleMatch[1].trim();
      }
    }
    
    // 레포지토리명을 기반으로 시스템명 생성
    return repoName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * 설명 추론
   * @private
   */
  _suggestDescription(repoDescription, readmeSummary) {
    if (repoDescription) {
      return repoDescription;
    }
    
    if (readmeSummary && readmeSummary !== 'README 파일이 없습니다.') {
      return readmeSummary;
    }
    
    return '시스템에 대한 상세한 설명이 필요합니다.';
  }

  /**
   * 카테고리 추론
   * @private
   */
  _suggestCategory(architecture, frameworks) {
    const categoryMap = {
      'Frontend Web Application': 'frontend',
      'Backend API Service': 'backend',
      'Full-stack Web Application': 'fullstack',
      'Enterprise Backend Service': 'enterprise',
      'Web Application': 'web',
      'Data/API Service': 'data',
      'Enterprise Application': 'enterprise',
      '.NET Application': 'enterprise',
      'Application': 'general'
    };
    
    return categoryMap[architecture] || 'general';
  }
}

module.exports = RepositoryAnalyzer;
