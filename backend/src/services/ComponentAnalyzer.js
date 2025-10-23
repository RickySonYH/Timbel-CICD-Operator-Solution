const path = require('path');
const fs = require('fs');

/**
 * [advice from AI] 컴포넌트 자동 분석 서비스
 * LLM 없이도 기본적인 코드 분류 및 등록이 가능하도록 구현
 */
class ComponentAnalyzer {
  constructor() {
    this.languagePatterns = {
      javascript: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
      python: ['.py', '.pyw'],
      java: ['.java'],
      csharp: ['.cs'],
      go: ['.go'],
      rust: ['.rs'],
      php: ['.php'],
      ruby: ['.rb'],
      kotlin: ['.kt', '.kts'],
      swift: ['.swift'],
      dart: ['.dart']
    };

    this.frameworkPatterns = {
      react: ['react', 'jsx', 'tsx', 'useState', 'useEffect', 'component'],
      vue: ['vue', 'vuex', 'nuxt'],
      angular: ['angular', '@angular', 'ng-'],
      svelte: ['svelte'],
      nextjs: ['next', 'next.js'],
      nuxt: ['nuxt', 'nuxt.js'],
      express: ['express', 'koa', 'fastify'],
      fastapi: ['fastapi', 'uvicorn'],
      django: ['django', 'flask'],
      spring: ['spring', '@springframework'],
      laravel: ['laravel', 'artisan'],
      rails: ['rails', 'ruby on rails']
    };

    this.componentPatterns = {
      ui: ['button', 'input', 'form', 'modal', 'dialog', 'card', 'table', 'list', 'menu', 'nav', 'header', 'footer', 'sidebar'],
      layout: ['layout', 'container', 'grid', 'flex', 'wrapper', 'section', 'div', 'main', 'aside'],
      business: ['service', 'manager', 'handler', 'controller', 'processor', 'validator', 'calculator', 'converter'],
      utility: ['util', 'helper', 'common', 'shared', 'constant', 'config', 'setting', 'option'],
      data: ['model', 'entity', 'dto', 'vo', 'schema', 'type', 'interface', 'enum'],
      api: ['api', 'endpoint', 'route', 'controller', 'middleware', 'filter', 'interceptor']
    };

    this.fileTypePatterns = {
      component: ['component', 'widget', 'element', 'ui'],
      page: ['page', 'view', 'screen', 'route'],
      service: ['service', 'provider', 'facade', 'repository'],
      utility: ['util', 'helper', 'tool', 'common'],
      config: ['config', 'setting', 'option', 'env', 'constant'],
      test: ['test', 'spec', 'mock', 'stub'],
      doc: ['readme', 'doc', 'guide', 'manual', 'changelog', 'license']
    };
  }

  /**
   * 레포지토리에서 컴포넌트 자동 분석
   * @param {Object} repositoryData - 레포지토리 데이터
   * @param {Object} options - 분석 옵션
   * @returns {Promise<Object>} - 분석 결과
   */
  async analyzeComponents(repositoryData, options = {}) {
    try {
      console.log('🔍 컴포넌트 분석 시작:', repositoryData.url);

      const {
        includeCodeComponents = true,
        includeDesignAssets = true,
        includeDocuments = true,
        minReusabilityScore = 70
      } = options;

      const analysisResult = {
        components: [],
        designAssets: [],
        documents: [],
        summary: {
          totalFiles: 0,
          analyzedFiles: 0,
          componentsFound: 0,
          designAssetsFound: 0,
          documentsFound: 0
        }
      };

      // 파일 구조 분석
      const fileStructure = await this.analyzeFileStructure(repositoryData);
      
      // 각 파일 타입별 분석
      if (includeCodeComponents) {
        analysisResult.components = await this.analyzeCodeComponents(fileStructure, repositoryData);
      }

      if (includeDesignAssets) {
        analysisResult.designAssets = await this.analyzeDesignAssets(fileStructure, repositoryData);
      }

      if (includeDocuments) {
        analysisResult.documents = await this.analyzeDocuments(fileStructure, repositoryData);
      }

      // 요약 정보 업데이트
      analysisResult.summary = this.calculateSummary(analysisResult);

      // 재사용성 점수 필터링
      analysisResult.components = analysisResult.components.filter(
        comp => comp.reusabilityScore >= minReusabilityScore
      );

      console.log('✅ 컴포넌트 분석 완료:', analysisResult.summary);
      return analysisResult;

    } catch (error) {
      console.error('❌ 컴포넌트 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 파일 구조 분석
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {Promise<Array>} - 파일 구조 정보
   */
  async analyzeFileStructure(repositoryData) {
    // 실제 구현에서는 Git API를 통해 파일 목록을 가져옴
    // 여기서는 시뮬레이션 데이터를 사용
    return this.simulateFileStructure(repositoryData);
  }

  /**
   * 파일 구조 시뮬레이션 (실제 구현에서는 Git API 사용)
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {Array} - 파일 구조 정보
   */
  simulateFileStructure(repositoryData) {
    const repoName = this.extractRepoName(repositoryData.url);
    
    // 일반적인 프로젝트 구조 시뮬레이션
    const commonStructures = {
      react: [
        'src/components/Button/Button.tsx',
        'src/components/Input/Input.tsx',
        'src/components/Modal/Modal.tsx',
        'src/components/Layout/Header.tsx',
        'src/components/Layout/Footer.tsx',
        'src/components/Layout/Sidebar.tsx',
        'src/components/Form/LoginForm.tsx',
        'src/components/Form/RegisterForm.tsx',
        'src/components/Table/DataTable.tsx',
        'src/components/Card/ProductCard.tsx',
        'src/utils/helpers.ts',
        'src/utils/constants.ts',
        'src/services/api.ts',
        'src/services/auth.ts',
        'src/hooks/useAuth.ts',
        'src/hooks/useApi.ts',
        'src/types/index.ts',
        'src/styles/components.css',
        'README.md',
        'package.json',
        'tsconfig.json'
      ],
      vue: [
        'src/components/BaseButton.vue',
        'src/components/BaseInput.vue',
        'src/components/BaseModal.vue',
        'src/components/Layout/AppHeader.vue',
        'src/components/Layout/AppFooter.vue',
        'src/components/Layout/AppSidebar.vue',
        'src/components/Form/LoginForm.vue',
        'src/components/Table/DataTable.vue',
        'src/utils/helpers.js',
        'src/utils/constants.js',
        'src/services/api.js',
        'src/composables/useAuth.js',
        'src/types/index.ts',
        'README.md',
        'package.json',
        'vue.config.js'
      ],
      python: [
        'src/components/button.py',
        'src/components/input.py',
        'src/components/modal.py',
        'src/components/layout/header.py',
        'src/components/layout/footer.py',
        'src/components/form/login_form.py',
        'src/components/table/data_table.py',
        'src/utils/helpers.py',
        'src/utils/constants.py',
        'src/services/api.py',
        'src/services/auth.py',
        'src/models/user.py',
        'src/models/product.py',
        'src/types/__init__.py',
        'README.md',
        'requirements.txt',
        'setup.py'
      ]
    };

    // 프로젝트 타입 감지
    const projectType = this.detectProjectType(repositoryData);
    return commonStructures[projectType] || commonStructures.react;
  }

  /**
   * 코드 컴포넌트 분석
   * @param {Array} fileStructure - 파일 구조
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {Promise<Array>} - 컴포넌트 분석 결과
   */
  async analyzeCodeComponents(fileStructure, repositoryData) {
    const components = [];

    for (const filePath of fileStructure) {
      const analysis = this.analyzeFile(filePath, repositoryData);
      
      if (analysis.type === 'component') {
        components.push({
          id: this.generateId(filePath),
          name: analysis.name,
          description: analysis.description,
          type: analysis.componentType,
          language: analysis.language,
          framework: analysis.framework,
          filePath: filePath,
          reusabilityScore: analysis.reusabilityScore,
          complexity: analysis.complexity,
          dependencies: analysis.dependencies,
          props: analysis.props,
          methods: analysis.methods,
          size: analysis.size,
          lastModified: new Date().toISOString(),
          tags: analysis.tags
        });
      }
    }

    return components;
  }

  /**
   * 개별 파일 분석
   * @param {string} filePath - 파일 경로
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {Object} - 파일 분석 결과
   */
  analyzeFile(filePath, repositoryData) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath);
    const dirName = path.dirname(filePath);
    
    // 언어 감지
    const language = this.detectLanguage(extension);
    
    // 프레임워크 감지
    const framework = this.detectFramework(filePath, repositoryData);
    
    // 파일 타입 감지
    const fileType = this.detectFileType(filePath, fileName);
    
    // 컴포넌트 타입 감지
    const componentType = this.detectComponentType(filePath, fileName);
    
    // 재사용성 점수 계산
    const reusabilityScore = this.calculateReusabilityScore(filePath, fileName, componentType);
    
    // 복잡도 분석
    const complexity = this.analyzeComplexity(filePath, fileName);
    
    // 의존성 분석
    const dependencies = this.analyzeDependencies(filePath, fileName, framework);
    
    // Props/Methods 분석
    const { props, methods } = this.analyzeComponentInterface(filePath, fileName, language);
    
    // 태그 생성
    const tags = this.generateTags(filePath, fileName, componentType, language, framework);

    return {
      type: fileType,
      name: this.generateComponentName(fileName, componentType),
      description: this.generateDescription(fileName, componentType, language),
      componentType,
      language,
      framework,
      reusabilityScore,
      complexity,
      dependencies,
      props,
      methods,
      size: this.estimateFileSize(filePath),
      tags
    };
  }

  /**
   * 언어 감지
   * @param {string} extension - 파일 확장자
   * @returns {string} - 언어명
   */
  detectLanguage(extension) {
    for (const [language, extensions] of Object.entries(this.languagePatterns)) {
      if (extensions.includes(extension)) {
        return language;
      }
    }
    return 'unknown';
  }

  /**
   * 프레임워크 감지
   * @param {string} filePath - 파일 경로
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {string} - 프레임워크명
   */
  detectFramework(filePath, repositoryData) {
    const fileName = path.basename(filePath).toLowerCase();
    
    for (const [framework, patterns] of Object.entries(this.frameworkPatterns)) {
      if (patterns.some(pattern => fileName.includes(pattern) || filePath.includes(pattern))) {
        return framework;
      }
    }
    
    return 'vanilla';
  }

  /**
   * 파일 타입 감지
   * @param {string} filePath - 파일 경로
   * @param {string} fileName - 파일명
   * @returns {string} - 파일 타입
   */
  detectFileType(filePath, fileName) {
    const lowerPath = filePath.toLowerCase();
    const lowerName = fileName.toLowerCase();
    
    for (const [type, patterns] of Object.entries(this.fileTypePatterns)) {
      if (patterns.some(pattern => lowerPath.includes(pattern) || lowerName.includes(pattern))) {
        return type;
      }
    }
    
    return 'other';
  }

  /**
   * 컴포넌트 타입 감지
   * @param {string} filePath - 파일 경로
   * @param {string} fileName - 파일명
   * @returns {string} - 컴포넌트 타입
   */
  detectComponentType(filePath, fileName) {
    const lowerPath = filePath.toLowerCase();
    const lowerName = fileName.toLowerCase();
    
    for (const [type, patterns] of Object.entries(this.componentPatterns)) {
      if (patterns.some(pattern => lowerPath.includes(pattern) || lowerName.includes(pattern))) {
        return type;
      }
    }
    
    return 'generic';
  }

  /**
   * 재사용성 점수 계산
   * @param {string} filePath - 파일 경로
   * @param {string} fileName - 파일명
   * @param {string} componentType - 컴포넌트 타입
   * @returns {number} - 재사용성 점수 (0-100)
   */
  calculateReusabilityScore(filePath, fileName, componentType) {
    let score = 50; // 기본 점수
    
    // 컴포넌트 타입별 점수
    const typeScores = {
      ui: 90,
      utility: 85,
      layout: 80,
      business: 60,
      data: 70,
      api: 65,
      generic: 50
    };
    
    score = typeScores[componentType] || score;
    
    // 파일명 패턴 분석
    if (fileName.includes('base') || fileName.includes('common') || fileName.includes('shared')) {
      score += 15;
    }
    
    if (fileName.includes('button') || fileName.includes('input') || fileName.includes('modal')) {
      score += 10;
    }
    
    // 디렉토리 구조 분석
    if (filePath.includes('components') || filePath.includes('ui') || filePath.includes('widgets')) {
      score += 10;
    }
    
    if (filePath.includes('utils') || filePath.includes('helpers') || filePath.includes('common')) {
      score += 15;
    }
    
    // 최대 100점으로 제한
    return Math.min(score, 100);
  }

  /**
   * 복잡도 분석
   * @param {string} filePath - 파일 경로
   * @param {string} fileName - 파일명
   * @returns {string} - 복잡도 레벨
   */
  analyzeComplexity(filePath, fileName) {
    // 파일 크기 기반 복잡도 추정
    const estimatedSize = this.estimateFileSize(filePath);
    
    if (estimatedSize < 100) return 'low';
    if (estimatedSize < 500) return 'medium';
    if (estimatedSize < 1000) return 'high';
    return 'very-high';
  }

  /**
   * 의존성 분석
   * @param {string} filePath - 파일 경로
   * @param {string} fileName - 파일명
   * @param {string} framework - 프레임워크
   * @returns {Array} - 의존성 목록
   */
  analyzeDependencies(filePath, fileName, framework) {
    const dependencies = [];
    
    // 프레임워크별 기본 의존성
    const frameworkDeps = {
      react: ['react', 'react-dom'],
      vue: ['vue'],
      angular: ['@angular/core'],
      express: ['express'],
      fastapi: ['fastapi', 'uvicorn'],
      django: ['django'],
      spring: ['spring-boot-starter'],
      laravel: ['laravel/framework'],
      rails: ['rails']
    };
    
    if (frameworkDeps[framework]) {
      dependencies.push(...frameworkDeps[framework]);
    }
    
    // 파일명 기반 의존성 추정
    if (fileName.includes('form')) {
      dependencies.push('form-validation');
    }
    
    if (fileName.includes('table') || fileName.includes('grid')) {
      dependencies.push('data-table');
    }
    
    if (fileName.includes('chart') || fileName.includes('graph')) {
      dependencies.push('chart-library');
    }
    
    return [...new Set(dependencies)]; // 중복 제거
  }

  /**
   * 컴포넌트 인터페이스 분석
   * @param {string} filePath - 파일 경로
   * @param {string} fileName - 파일명
   * @param {string} language - 언어
   * @returns {Object} - Props와 Methods
   */
  analyzeComponentInterface(filePath, fileName, language) {
    const props = [];
    const methods = [];
    
    // 파일명 기반 기본 Props 추정
    if (fileName.includes('button')) {
      props.push('text', 'onClick', 'disabled', 'variant', 'size');
      methods.push('handleClick');
    }
    
    if (fileName.includes('input')) {
      props.push('value', 'onChange', 'placeholder', 'type', 'required');
      methods.push('handleChange', 'validate');
    }
    
    if (fileName.includes('modal')) {
      props.push('isOpen', 'onClose', 'title', 'children');
      methods.push('handleClose', 'handleBackdropClick');
    }
    
    if (fileName.includes('form')) {
      props.push('onSubmit', 'initialValues', 'validationSchema');
      methods.push('handleSubmit', 'handleReset', 'validate');
    }
    
    if (fileName.includes('table')) {
      props.push('data', 'columns', 'onRowClick', 'pagination');
      methods.push('handleRowClick', 'handleSort', 'handlePageChange');
    }
    
    return { props, methods };
  }

  /**
   * 태그 생성
   * @param {string} filePath - 파일 경로
   * @param {string} fileName - 파일명
   * @param {string} componentType - 컴포넌트 타입
   * @param {string} language - 언어
   * @param {string} framework - 프레임워크
   * @returns {Array} - 태그 목록
   */
  generateTags(filePath, fileName, componentType, language, framework) {
    const tags = [componentType, language, framework];
    
    // 파일명 기반 태그
    if (fileName.includes('base') || fileName.includes('common')) {
      tags.push('reusable', 'base-component');
    }
    
    if (fileName.includes('form')) {
      tags.push('form', 'input');
    }
    
    if (fileName.includes('table') || fileName.includes('grid')) {
      tags.push('data-display', 'table');
    }
    
    if (fileName.includes('modal') || fileName.includes('dialog')) {
      tags.push('overlay', 'modal');
    }
    
    if (fileName.includes('button')) {
      tags.push('interaction', 'button');
    }
    
    // 디렉토리 기반 태그
    if (filePath.includes('layout')) {
      tags.push('layout', 'structure');
    }
    
    if (filePath.includes('ui')) {
      tags.push('ui', 'interface');
    }
    
    return [...new Set(tags)]; // 중복 제거
  }

  /**
   * 컴포넌트명 생성
   * @param {string} fileName - 파일명
   * @param {string} componentType - 컴포넌트 타입
   * @returns {string} - 컴포넌트명
   */
  generateComponentName(fileName, componentType) {
    const baseName = path.basename(fileName, path.extname(fileName));
    
    // 파일명을 컴포넌트명으로 변환
    const componentName = baseName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    return componentName || 'Component';
  }

  /**
   * 설명 생성
   * @param {string} fileName - 파일명
   * @param {string} componentType - 컴포넌트 타입
   * @param {string} language - 언어
   * @returns {string} - 설명
   */
  generateDescription(fileName, componentType, language) {
    const baseName = path.basename(fileName, path.extname(fileName));
    
    const descriptions = {
      ui: `${baseName} UI component`,
      layout: `${baseName} layout component`,
      business: `${baseName} business logic component`,
      utility: `${baseName} utility function`,
      data: `${baseName} data model`,
      api: `${baseName} API service`,
      generic: `${baseName} component`
    };
    
    return descriptions[componentType] || descriptions.generic;
  }

  /**
   * 파일 크기 추정
   * @param {string} filePath - 파일 경로
   * @returns {number} - 추정 파일 크기 (라인 수)
   */
  estimateFileSize(filePath) {
    // 파일명과 경로 기반 크기 추정
    const fileName = path.basename(filePath);
    
    if (fileName.includes('button') || fileName.includes('input')) {
      return 50; // 작은 컴포넌트
    }
    
    if (fileName.includes('form') || fileName.includes('table')) {
      return 200; // 중간 크기 컴포넌트
    }
    
    if (fileName.includes('layout') || fileName.includes('page')) {
      return 300; // 큰 컴포넌트
    }
    
    return 100; // 기본 크기
  }

  /**
   * 디자인 자산 분석
   * @param {Array} fileStructure - 파일 구조
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {Promise<Array>} - 디자인 자산 분석 결과
   */
  async analyzeDesignAssets(fileStructure, repositoryData) {
    const designAssets = [];
    
    for (const filePath of fileStructure) {
      const extension = path.extname(filePath).toLowerCase();
      
      if (['.css', '.scss', '.sass', '.less', '.styl'].includes(extension)) {
        designAssets.push({
          id: this.generateId(filePath),
          title: path.basename(filePath),
          assetType: 'stylesheet',
          designTool: 'css',
          fileFormat: extension.substring(1),
          description: `Stylesheet for ${path.basename(filePath)}`,
          filePath: filePath,
          size: this.estimateFileSize(filePath),
          tags: ['css', 'stylesheet', 'styling']
        });
      }
      
      if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extension)) {
        designAssets.push({
          id: this.generateId(filePath),
          title: path.basename(filePath),
          assetType: 'image',
          designTool: 'unknown',
          fileFormat: extension.substring(1),
          description: `Image asset: ${path.basename(filePath)}`,
          filePath: filePath,
          size: this.estimateFileSize(filePath),
          tags: ['image', 'asset', 'media']
        });
      }
    }
    
    return designAssets;
  }

  /**
   * 문서 분석
   * @param {Array} fileStructure - 파일 구조
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {Promise<Array>} - 문서 분석 결과
   */
  async analyzeDocuments(fileStructure, repositoryData) {
    const documents = [];
    
    for (const filePath of fileStructure) {
      const fileName = path.basename(filePath).toLowerCase();
      
      if (fileName.includes('readme') || fileName.includes('doc') || fileName.includes('guide')) {
        documents.push({
          id: this.generateId(filePath),
          title: path.basename(filePath),
          docType: 'documentation',
          category: 'guide',
          description: `Documentation: ${path.basename(filePath)}`,
          filePath: filePath,
          size: this.estimateFileSize(filePath),
          tags: ['documentation', 'guide', 'manual']
        });
      }
      
      if (fileName.includes('changelog') || fileName.includes('history')) {
        documents.push({
          id: this.generateId(filePath),
          title: path.basename(filePath),
          docType: 'changelog',
          category: 'version',
          description: `Changelog: ${path.basename(filePath)}`,
          filePath: filePath,
          size: this.estimateFileSize(filePath),
          tags: ['changelog', 'version', 'history']
        });
      }
      
      if (fileName.includes('license')) {
        documents.push({
          id: this.generateId(filePath),
          title: path.basename(filePath),
          docType: 'license',
          category: 'legal',
          description: `License: ${path.basename(filePath)}`,
          filePath: filePath,
          size: this.estimateFileSize(filePath),
          tags: ['license', 'legal', 'terms']
        });
      }
    }
    
    return documents;
  }

  /**
   * 요약 정보 계산
   * @param {Object} analysisResult - 분석 결과
   * @returns {Object} - 요약 정보
   */
  calculateSummary(analysisResult) {
    return {
      totalFiles: analysisResult.components.length + analysisResult.designAssets.length + analysisResult.documents.length,
      analyzedFiles: analysisResult.components.length + analysisResult.designAssets.length + analysisResult.documents.length,
      componentsFound: analysisResult.components.length,
      designAssetsFound: analysisResult.designAssets.length,
      documentsFound: analysisResult.documents.length,
      averageReusabilityScore: analysisResult.components.length > 0 
        ? Math.round(analysisResult.components.reduce((sum, comp) => sum + comp.reusabilityScore, 0) / analysisResult.components.length)
        : 0
    };
  }

  /**
   * 프로젝트 타입 감지
   * @param {Object} repositoryData - 레포지토리 데이터
   * @returns {string} - 프로젝트 타입
   */
  detectProjectType(repositoryData) {
    const url = repositoryData.url.toLowerCase();
    
    if (url.includes('react') || url.includes('next')) return 'react';
    if (url.includes('vue') || url.includes('nuxt')) return 'vue';
    if (url.includes('angular')) return 'angular';
    if (url.includes('python') || url.includes('django') || url.includes('flask')) return 'python';
    if (url.includes('java') || url.includes('spring')) return 'java';
    if (url.includes('csharp') || url.includes('dotnet')) return 'csharp';
    
    return 'react'; // 기본값
  }

  /**
   * 레포지토리명 추출
   * @param {string} url - 레포지토리 URL
   * @returns {string} - 레포지토리명
   */
  extractRepoName(url) {
    const parts = url.split('/');
    return parts[parts.length - 1].replace('.git', '');
  }

  /**
   * 고유 ID 생성
   * @param {string} filePath - 파일 경로
   * @returns {string} - 고유 ID
   */
  generateId(filePath) {
    return Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
}

module.exports = ComponentAnalyzer;
