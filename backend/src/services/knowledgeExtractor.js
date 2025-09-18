// [advice from AI] 지식 추출 엔진 - 프로젝트 코드베이스 자동 스캔 및 분석

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class KnowledgeExtractor {
  constructor() {
    // [advice from AI] 데이터베이스 연결
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    // [advice from AI] 기본 소유자 정보 (RickySon)
    this.defaultOwner = {
      id: 'f47920c1-69e1-44f2-8c7b-85b4e74af4d1', // RickySon의 UUID
      name: 'RickySon',
      email: 'rickyson@timbel.net',
      role: 'po',
      team: 'po_team'
    };

    // [advice from AI] 스캔 대상 파일 확장자
    this.fileExtensions = {
      code: ['.js', '.ts', '.tsx', '.jsx', '.vue', '.py', '.java', '.go'],
      docs: ['.md', '.txt', '.rst', '.adoc'],
      assets: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'],
      config: ['.json', '.yaml', '.yml', '.toml', '.xml']
    };

    // [advice from AI] 제외할 디렉토리 (강화된 필터링)
    this.excludeDirs = [
      'node_modules', '.git', 'dist', 'build', '.next', 
      'coverage', '.nyc_output', 'logs', 'tmp', 'uploads',
      '.vscode', '.idea', 'out', 'target', 'bin', 'obj',
      '.cache', '.parcel-cache', '.webpack', '.rollup.cache'
    ];

    // [advice from AI] 제외할 파일 패턴
    this.excludeFilePatterns = [
      /\.min\.(js|css)$/,        // 압축된 파일
      /\.bundle\.(js|css)$/,     // 번들 파일
      /\.chunk\.(js|css)$/,      // 청크 파일
      /\.map$/,                  // 소스맵 파일
      /\.lock$/,                 // 락 파일
      /\.log$/,                  // 로그 파일
      /\.cache$/,                // 캐시 파일
      /node_modules/,            // node_modules 경로
      /\.git\//,                 // git 경로
      /dist\//,                  // 빌드 결과물
      /build\//,                 // 빌드 결과물
      /uploads\//,               // 업로드 파일
      /test-results\//,          // 테스트 결과
      /\.d\.ts$/                 // TypeScript 정의 파일 (생성된 것들)
    ];

    // [advice from AI] 스캔할 소스 디렉토리만 명시적으로 지정
    this.sourceDirs = [
      'backend/src',
      'frontend/src',
      'docs',
      '.'  // 루트의 README, package.json 등
    ];
  }

  // [advice from AI] 전체 프로젝트 스캔 시작
  async scanProject(projectPath) {
    console.log('🔍 프로젝트 지식 추출 시작:', projectPath);
    
    const scanResults = {
      codeComponents: [],
      designAssets: [],
      documents: [],
      catalogComponents: [],
      scanSummary: {
        totalFiles: 0,
        processedFiles: 0,
        errors: [],
        startTime: new Date(),
        endTime: null
      }
    };

    try {
      // [advice from AI] 지정된 소스 디렉토리만 스캔
      for (const sourceDir of this.sourceDirs) {
        const fullPath = path.join(projectPath, sourceDir);
        
        try {
          const stats = await require('fs').promises.stat(fullPath);
          if (stats.isDirectory()) {
            console.log(`📁 스캔 중: ${sourceDir}`);
            if (sourceDir === '.') {
              // 루트 디렉토리는 특별 처리 (하위 디렉토리 제외)
              await this.scanRootDirectory(fullPath, scanResults);
            } else {
              await this.scanDirectory(fullPath, scanResults);
            }
          }
        } catch (error) {
          console.log(`⚠️ 디렉토리 없음: ${sourceDir}`);
        }
      }
      
      scanResults.scanSummary.endTime = new Date();
      console.log('✅ 스캔 완료:', scanResults.scanSummary);

      // [advice from AI] 데이터베이스에 결과 저장
      await this.saveToDatabase(scanResults);

      return scanResults;
    } catch (error) {
      console.error('❌ 스캔 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 루트 디렉토리 스캔 (하위 디렉토리 제외)
  async scanRootDirectory(dirPath, scanResults) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        if (item.isFile()) {
          const itemPath = path.join(dirPath, item.name);
          const relativePath = path.relative(process.cwd(), itemPath);
          
          // [advice from AI] 파일 패턴 체크
          if (this.shouldIncludeFile(relativePath)) {
            scanResults.scanSummary.totalFiles++;
            await this.analyzeFile(itemPath, scanResults);
            scanResults.scanSummary.processedFiles++;
          }
        }
        // 루트에서는 디렉토리는 스캔하지 않음 (sourceDirs에서 명시적으로 지정된 것만)
      }
    } catch (error) {
      console.error(`루트 디렉토리 스캔 실패: ${dirPath}`, error.message);
      scanResults.scanSummary.errors.push({
        path: dirPath,
        error: error.message,
        type: 'root_directory_scan'
      });
    }
  }

  // [advice from AI] 디렉토리 재귀 스캔
  async scanDirectory(dirPath, scanResults) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // [advice from AI] 제외 디렉토리 체크
          if (!this.excludeDirs.includes(item.name)) {
            await this.scanDirectory(itemPath, scanResults);
          }
        } else if (item.isFile()) {
          const relativePath = path.relative(process.cwd(), itemPath);
          
          // [advice from AI] 파일 패턴 체크
          if (this.shouldIncludeFile(relativePath)) {
            scanResults.scanSummary.totalFiles++;
            await this.analyzeFile(itemPath, scanResults);
            scanResults.scanSummary.processedFiles++;
          }
        }
      }
    } catch (error) {
      console.error(`디렉토리 스캔 실패: ${dirPath}`, error.message);
      scanResults.scanSummary.errors.push({
        path: dirPath,
        error: error.message,
        type: 'directory_scan'
      });
    }
  }

  // [advice from AI] 파일 포함 여부 검사
  shouldIncludeFile(relativePath) {
    // [advice from AI] 제외 패턴 체크
    for (const pattern of this.excludeFilePatterns) {
      if (pattern.test(relativePath)) {
        return false;
      }
    }

    // [advice from AI] 루트 레벨 파일 중 중요한 것만 포함
    if (!relativePath.includes('/')) {
      const fileName = path.basename(relativePath).toLowerCase();
      const allowedRootFiles = [
        'readme.md', 'changelog.md', 'license.md', 'contributing.md',
        'package.json', 'tsconfig.json', 'webpack.config.js', 
        'babel.config.js', 'eslint.config.js', '.eslintrc.js',
        'craco.config.js', 'docker-compose.yml', 'dockerfile',
        '개발계획서.md', '바이브_코딩_가이드.md', 'release_notes'
      ];
      
      return allowedRootFiles.some(allowed => fileName.includes(allowed.toLowerCase()));
    }

    // [advice from AI] 소스 디렉토리 내 파일은 확장자로 판단
    const ext = path.extname(relativePath).toLowerCase();
    const allExtensions = [
      ...this.fileExtensions.code,
      ...this.fileExtensions.docs,
      ...this.fileExtensions.assets,
      ...this.fileExtensions.config
    ];

    return allExtensions.includes(ext);
  }

  // [advice from AI] 파일 분석
  async analyzeFile(filePath, scanResults) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const relativePath = path.relative(process.cwd(), filePath);

      // [advice from AI] 파일 타입별 분석
      if (this.fileExtensions.code.includes(ext)) {
        await this.analyzeCodeFile(filePath, relativePath, scanResults);
      } else if (this.fileExtensions.docs.includes(ext)) {
        await this.analyzeDocumentFile(filePath, relativePath, scanResults);
      } else if (this.fileExtensions.assets.includes(ext)) {
        await this.analyzeAssetFile(filePath, relativePath, scanResults);
      } else if (this.fileExtensions.config.includes(ext)) {
        await this.analyzeConfigFile(filePath, relativePath, scanResults);
      }
    } catch (error) {
      console.error(`파일 분석 실패: ${filePath}`, error.message);
      scanResults.scanSummary.errors.push({
        path: filePath,
        error: error.message,
        type: 'file_analysis'
      });
    }
  }

  // [advice from AI] 코드 파일 분석
  async analyzeCodeFile(filePath, relativePath, scanResults) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      const analysis = {
        id: require('uuid').v4(),
        name: path.basename(filePath, path.extname(filePath)),
        title: this.generateTitle(filePath),
        description: this.extractDescription(content),
        type: this.determineComponentType(filePath, content),
        language: this.detectLanguage(filePath),
        framework: this.detectFramework(content),
        file_path: relativePath,
        line_count: content.split('\n').length,
        complexity_score: this.calculateComplexity(content),
        dependencies_count: this.extractDependencies(content).length,
        exports_list: this.extractExports(content),
        imports_list: this.extractImports(content),
        functions_list: this.extractFunctions(content),
        classes_list: this.extractClasses(content),
        interfaces_list: this.extractInterfaces(content),
        api_endpoints: this.extractAPIEndpoints(content),
        jsdoc_comments: this.extractJSDocComments(content),
        typescript_types: this.extractTypeScriptTypes(content),
        source_code: content.length > 50000 ? content.substring(0, 50000) + '...' : content,
        file_info: {
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime
        },
        creator_id: this.defaultOwner.id, // RickySon 소유자 설정
        department_id: null, // 나중에 부서 매핑
        last_scanned_at: new Date(),
        scan_metadata: {
          scanner_version: '1.0.0',
          scan_type: 'full',
          file_hash: require('crypto').createHash('md5').update(content).digest('hex'),
          owner: this.defaultOwner.name,
          owner_team: this.defaultOwner.team
        }
      };

      // [advice from AI] API 라우트 파일인지 확인
      if (relativePath.includes('routes/') || analysis.api_endpoints.length > 0) {
        // [advice from AI] 고유한 이름 생성 (중복 방지)
        analysis.name = `${analysis.name}_${path.dirname(analysis.file_path).replace(/[\/\\]/g, '_')}`;
        scanResults.catalogComponents.push(analysis);
      } else {
        scanResults.codeComponents.push(analysis);
      }

    } catch (error) {
      throw new Error(`코드 파일 분석 실패: ${error.message}`);
    }
  }

  // [advice from AI] 문서 파일 분석
  async analyzeDocumentFile(filePath, relativePath, scanResults) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      const analysis = {
        id: require('uuid').v4(),
        title: this.generateDocumentTitle(filePath, content),
        content: content,
        category: this.determineDocumentCategory(filePath),
        format: path.extname(filePath).substring(1),
        tags: this.extractDocumentTags(content),
        file_path: relativePath,
        word_count: content.split(/\s+/).length,
        readability_score: this.calculateReadabilityScore(content),
        headings_structure: this.extractHeadings(content),
        links_list: this.extractLinks(content),
        code_blocks: this.extractCodeBlocks(content),
        images_list: this.extractImageReferences(content),
        author_id: this.defaultOwner.id, // RickySon 소유자 설정
        department_id: null,
        status: 'published',
        is_public: true,
        last_scanned_at: new Date(),
        scan_metadata: {
          scanner_version: '1.0.0',
          scan_type: 'full',
          file_hash: require('crypto').createHash('md5').update(content).digest('hex'),
          file_stats: {
            size: stats.size,
            modified: stats.mtime
          },
          owner: this.defaultOwner.name,
          owner_team: this.defaultOwner.team
        }
      };

      scanResults.documents.push(analysis);

    } catch (error) {
      throw new Error(`문서 파일 분석 실패: ${error.message}`);
    }
  }

  // [advice from AI] 디자인 자산 파일 분석
  async analyzeAssetFile(filePath, relativePath, scanResults) {
    try {
      const stats = await fs.stat(filePath);

      const analysis = {
        id: require('uuid').v4(),
        name: path.basename(filePath, path.extname(filePath)),
        title: this.generateAssetTitle(filePath),
        description: this.generateAssetDescription(filePath),
        category: this.determineAssetCategory(filePath),
        file_type: path.extname(filePath).substring(1),
        file_path: relativePath,
        file_size: stats.size,
        file_size_bytes: stats.size,
        dimensions: await this.getImageDimensions(filePath),
        image_dimensions: await this.getImageDimensions(filePath),
        color_analysis: await this.analyzeColors(filePath),
        usage_locations: [], // 나중에 참조 분석으로 채움
        related_components: [],
        tags: this.generateAssetTags(filePath),
        creator_id: this.defaultOwner.id, // RickySon 소유자 설정
        department_id: null,
        status: 'active',
        is_public: true,
        last_scanned_at: new Date(),
        scan_metadata: {
          scanner_version: '1.0.0',
          scan_type: 'full',
          file_stats: {
            size: stats.size,
            modified: stats.mtime
          },
          owner: this.defaultOwner.name,
          owner_team: this.defaultOwner.team
        }
      };

      scanResults.designAssets.push(analysis);

    } catch (error) {
      throw new Error(`디자인 자산 분석 실패: ${error.message}`);
    }
  }

  // [advice from AI] 설정 파일 분석 (카탈로그 컴포넌트로 처리)
  async analyzeConfigFile(filePath, relativePath, scanResults) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      const analysis = {
        id: require('uuid').v4(),
        name: path.basename(filePath),
        title: `Configuration: ${path.basename(filePath)}`,
        description: `Configuration file for ${this.detectConfigPurpose(filePath, content)}`,
        type: 'Configuration',
        file_path: relativePath,
        complexity_analysis: {
          config_keys: this.extractConfigKeys(content, filePath),
          nesting_level: this.calculateConfigComplexity(content)
        },
        last_scanned_at: new Date(),
        scan_metadata: {
          scanner_version: '1.0.0',
          scan_type: 'config',
          file_type: path.extname(filePath),
          file_size: stats.size
        }
      };

      scanResults.catalogComponents.push(analysis);

    } catch (error) {
      throw new Error(`설정 파일 분석 실패: ${error.message}`);
    }
  }

  // [advice from AI] 데이터베이스 저장
  async saveToDatabase(scanResults) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // [advice from AI] 코드 컴포넌트 저장
      for (const component of scanResults.codeComponents) {
        await this.saveCodeComponent(client, component);
      }

      // [advice from AI] 디자인 자산 저장
      for (const asset of scanResults.designAssets) {
        await this.saveDesignAsset(client, asset);
      }

      // [advice from AI] 문서 저장
      for (const doc of scanResults.documents) {
        await this.saveDocument(client, doc);
      }

      // [advice from AI] 카탈로그 컴포넌트 저장
      for (const catalog of scanResults.catalogComponents) {
        await this.saveCatalogComponent(client, catalog);
      }

      await client.query('COMMIT');
      console.log('✅ 데이터베이스 저장 완료');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ 데이터베이스 저장 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 코드 컴포넌트 저장
  async saveCodeComponent(client, component, userId = null) {
    // [advice from AI] 중복 검사
    const isDuplicate = await this.checkDuplicateCodeComponent(client, component);
    if (isDuplicate) {
      console.log(`⚠️ 중복 코드 컴포넌트 스킵: ${component.name}`);
      return null;
    }
    
    // [advice from AI] 생성자 설정
    component.created_by = userId;
    component.approval_status = 'draft';

    const query = `
      INSERT INTO code_components (
        id, name, title, description, type, language, framework,
        source_code, file_info, documentation, examples, dependencies,
        props_schema, creator_id, department_id, version, status,
        usage_count, rating, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        source_code = EXCLUDED.source_code,
        file_info = EXCLUDED.file_info,
        creator_id = EXCLUDED.creator_id,
        updated_at = NOW()
    `;

    await client.query(query, [
      component.id, component.name, component.title, component.description,
      component.type, component.language, component.framework, component.source_code,
      JSON.stringify({
        file_path: component.file_path,
        line_count: component.line_count,
        complexity_score: component.complexity_score,
        scan_metadata: component.scan_metadata
      }), // file_info
      `자동 생성된 ${component.type} 문서`, // documentation
      JSON.stringify(component.examples || []), // examples
      JSON.stringify({
        imports: component.imports_list,
        exports: component.exports_list,
        functions: component.functions_list,
        classes: component.classes_list,
        api_endpoints: component.api_endpoints
      }), // dependencies
      JSON.stringify(component.typescript_types || {}), // props_schema
      component.creator_id, component.department_id, 
      component.version || '1.0.0', component.status || 'active',
      0, 0.0 // usage_count, rating
    ]);
  }

  // [advice from AI] 디자인 자산 저장
  async saveDesignAsset(client, asset) {
    // [advice from AI] 중복 검사
    const isDuplicate = await this.checkDuplicateDesignAsset(client, asset);
    if (isDuplicate) {
      console.log(`⚠️ 중복 디자인 자산 스킵: ${asset.name}`);
      return null;
    }

    const query = `
      INSERT INTO design_assets (
        id, name, title, description, category, file_type, file_path,
        file_size, file_size_bytes, dimensions, image_dimensions,
        color_analysis, usage_locations, related_components, tags,
        creator_id, department_id, status, is_public, last_scanned_at, scan_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        file_size = EXCLUDED.file_size,
        creator_id = EXCLUDED.creator_id,
        last_scanned_at = EXCLUDED.last_scanned_at,
        scan_metadata = EXCLUDED.scan_metadata
    `;

    await client.query(query, [
      asset.id, asset.name, asset.title, asset.description, asset.category,
      asset.file_type, asset.file_path, asset.file_size, asset.file_size_bytes,
      asset.dimensions, asset.image_dimensions, JSON.stringify(asset.color_analysis),
      JSON.stringify(asset.usage_locations), JSON.stringify(asset.related_components),
      asset.tags, asset.creator_id, asset.department_id, asset.status, asset.is_public,
      asset.last_scanned_at, JSON.stringify(asset.scan_metadata)
    ]);
  }

  // [advice from AI] UTF-8 유효성 검사 함수
  isValidUtf8(str) {
    if (!str) return true;
    
    // NULL 바이트 검사
    if (str.includes('\0')) {
      return false;
    }
    
    return true; // 기본적으로 유효하다고 가정
  }
  
  // [advice from AI] 문자열 정리 함수
  sanitizeString(str) {
    if (!str) return str;
    
    // NULL 바이트 제거
    let cleaned = str.replace(/\0/g, '');
    
    // 기타 제어 문자 제거 (탭, 줄바꿈 제외)
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    return cleaned;
  }

  // [advice from AI] 문서 저장
  async saveDocument(client, doc) {
    // [advice from AI] 중복 검사
    const isDuplicate = await this.checkDuplicateDocument(client, doc);
    if (isDuplicate) {
      console.log(`⚠️ 중복 문서 스킵: ${doc.title}`);
      return null;
    }

    // [advice from AI] UTF-8 유효성 검사 및 문자열 정리
    const sanitizedDoc = {
      ...doc,
      title: this.sanitizeString(doc.title),
      content: this.sanitizeString(doc.content),
      category: this.sanitizeString(doc.category),
      format: this.sanitizeString(doc.format),
      file_path: this.sanitizeString(doc.file_path)
    };
    
    // 정리 후에도 유효하지 않으면 스킵
    if (!this.isValidUtf8(sanitizedDoc.content) || !this.isValidUtf8(sanitizedDoc.title)) {
      console.warn(`⚠️ UTF-8 인코딩 문제로 문서 스킵: ${doc.file_path}`);
      return null;
    }

    const query = `
      INSERT INTO documents (
        id, title, content, category, format, tags, file_path,
        word_count, readability_score, headings_structure, links_list,
        code_blocks, images_list, author_id, department_id, status, is_public, last_scanned_at, scan_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        word_count = EXCLUDED.word_count,
        author_id = EXCLUDED.author_id,
        last_scanned_at = EXCLUDED.last_scanned_at,
        scan_metadata = EXCLUDED.scan_metadata
    `;

    try {
      await client.query(query, [
        sanitizedDoc.id, sanitizedDoc.title, sanitizedDoc.content, sanitizedDoc.category, sanitizedDoc.format,
        sanitizedDoc.tags, sanitizedDoc.file_path, sanitizedDoc.word_count, sanitizedDoc.readability_score,
        JSON.stringify(sanitizedDoc.headings_structure), JSON.stringify(sanitizedDoc.links_list),
        JSON.stringify(sanitizedDoc.code_blocks), JSON.stringify(sanitizedDoc.images_list),
        sanitizedDoc.author_id, sanitizedDoc.department_id, sanitizedDoc.status, sanitizedDoc.is_public, 
        sanitizedDoc.last_scanned_at, JSON.stringify(sanitizedDoc.scan_metadata)
      ]);
    } catch (error) {
      console.error(`❌ 문서 저장 실패: ${sanitizedDoc.file_path}`, error.message);
      // UTF-8 오류인 경우 스킵하고 계속 진행
      if (error.code === '22021') {
        console.warn(`⚠️ UTF-8 인코딩 오류로 문서 스킵: ${sanitizedDoc.file_path}`);
        return null;
      }
      throw error; // 다른 오류는 재발생
    }
  }

  // [advice from AI] 카탈로그 컴포넌트 저장
  async saveCatalogComponent(client, catalog) {
    // [advice from AI] 중복 검사
    const isDuplicate = await this.checkDuplicateCatalogComponent(client, catalog);
    if (isDuplicate) {
      console.log(`⚠️ 중복 카탈로그 컴포넌트 스킵: ${catalog.name}`);
      return null;
    }

    const query = `
      INSERT INTO catalog_components (
        id, name, title, description, type, owner_group, lifecycle,
        source_location, deployment_info, performance_metrics, reuse_stats,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        source_location = EXCLUDED.source_location,
        updated_at = NOW()
    `;

    await client.query(query, [
      catalog.id, 
      catalog.name, 
      catalog.title, 
      catalog.description,
      catalog.type, 
      this.defaultOwner.team, // owner_group
      'active', // lifecycle
      catalog.file_path, // source_location
      JSON.stringify({
        file_path: catalog.file_path,
        complexity: catalog.complexity_score,
        api_endpoints: catalog.api_endpoints
      }), // deployment_info
      JSON.stringify({
        line_count: catalog.line_count,
        functions_count: catalog.functions_list?.length || 0
      }), // performance_metrics
      JSON.stringify({
        usage_count: 0,
        satisfaction_rate: 0.0
      }) // reuse_stats
    ]);
  }

  // [advice from AI] === 분석 유틸리티 메서드들 ===

  generateTitle(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/([A-Z])/g, ' $1');
  }

  extractDescription(content) {
    // JSDoc 주석에서 설명 추출
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/);
    if (jsdocMatch) return jsdocMatch[1];

    // 첫 번째 주석에서 설명 추출
    const commentMatch = content.match(/\/\/\s*(.+)/);
    if (commentMatch) return commentMatch[1];

    // 파일 경로 기반 설명 생성
    return `Component from ${path.dirname(filePath)}`;
  }

  determineComponentType(filePath, content) {
    // [advice from AI] 경로 기반 타입 분류 (더 정확하게)
    const pathLower = filePath.toLowerCase();
    
    // 백엔드 타입들
    if (pathLower.includes('routes/')) return 'API Route';
    if (pathLower.includes('services/')) return 'Service Module';
    if (pathLower.includes('middleware/')) return 'Middleware';
    if (pathLower.includes('utils/') || pathLower.includes('helpers/')) return 'Utility';
    if (pathLower.includes('models/')) return 'Data Model';
    if (pathLower.includes('controllers/')) return 'Controller';
    
    // 프론트엔드 타입들
    if (pathLower.includes('pages/')) return 'Page Component';
    if (pathLower.includes('components/')) return 'UI Component';
    if (pathLower.includes('store/') || pathLower.includes('stores/')) return 'State Store';
    if (pathLower.includes('hooks/')) return 'React Hook';
    
    // 내용 기반 분류
    if (content.includes('React.FC') || content.includes('function Component')) return 'React Component';
    if (content.includes('router.get') || content.includes('router.post')) return 'API Router';
    if (content.includes('class ') && content.includes('constructor')) return 'Class Module';
    if (content.includes('export default class')) return 'Service Class';
    if (content.includes('export const') && content.includes('=>')) return 'Function Module';
    
    // 파일명 기반 분류
    const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
    if (fileName.includes('test') || fileName.includes('spec')) return 'Test Module';
    if (fileName.includes('config')) return 'Configuration';
    if (fileName.includes('type') || fileName.includes('interface')) return 'Type Definition';
    
    return 'Module';
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath);
    const langMap = {
      '.js': 'javascript',
      '.ts': 'typescript', 
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go'
    };
    return langMap[ext] || 'unknown';
  }

  detectFramework(content) {
    if (content.includes('import React') || content.includes('from \'react\'')) return 'React';
    if (content.includes('import Vue') || content.includes('from \'vue\'')) return 'Vue';
    if (content.includes('express')) return 'Express';
    if (content.includes('fastify')) return 'Fastify';
    return null;
  }

  calculateComplexity(content) {
    // 간단한 복잡도 계산 (if, for, while, switch 문 개수)
    const complexityIndicators = ['if ', 'for ', 'while ', 'switch ', 'catch ', '\\? '];
    let complexity = 1; // 기본 복잡도
    
    for (const indicator of complexityIndicators) {
      const matches = content.match(new RegExp(indicator, 'g'));
      if (matches) complexity += matches.length;
    }
    
    return Math.min(complexity / 10, 10); // 0-10 스케일로 정규화
  }

  extractDependencies(content) {
    const imports = [];
    const importRegex = /import.*from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(const|function|class|interface|type)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push({
        type: match[1],
        name: match[2]
      });
    }
    
    return exports;
  }

  extractImports(content) {
    return this.extractDependencies(content).map(dep => ({
      module: dep,
      isLocal: dep.startsWith('./') || dep.startsWith('../')
    }));
  }

  extractFunctions(content) {
    const functions = [];
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
    const arrowFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'function'
      });
    }
    
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'arrow_function'
      });
    }
    
    return functions;
  }

  extractClasses(content) {
    const classes = [];
    const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        extends: match[2] || null
      });
    }
    
    return classes;
  }

  extractInterfaces(content) {
    const interfaces = [];
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push({
        name: match[1],
        extends: match[2] ? match[2].trim().split(',').map(s => s.trim()) : []
      });
    }
    
    return interfaces;
  }

  extractAPIEndpoints(content) {
    const endpoints = [];
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
    
    return endpoints;
  }

  extractJSDocComments(content) {
    const comments = {};
    const jsdocRegex = /\/\*\*\s*\n([\s\S]*?)\*\//g;
    let match;
    
    while ((match = jsdocRegex.exec(content)) !== null) {
      const comment = match[1];
      const descMatch = comment.match(/\*\s*(.+?)(?:\n|$)/);
      if (descMatch) {
        comments[match.index] = {
          description: descMatch[1],
          tags: this.parseJSDocTags(comment)
        };
      }
    }
    
    return comments;
  }

  parseJSDocTags(comment) {
    const tags = {};
    const tagRegex = /\*\s*@(\w+)\s*(.+?)(?=\n\s*\*\s*@|\n\s*\*\/|\n\s*\*\s*$)/g;
    let match;
    
    while ((match = tagRegex.exec(comment)) !== null) {
      tags[match[1]] = match[2].trim();
    }
    
    return tags;
  }

  extractTypeScriptTypes(content) {
    const types = [];
    const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=\s*([^;]+)/g;
    let match;
    
    while ((match = typeRegex.exec(content)) !== null) {
      types.push({
        name: match[1],
        definition: match[2].trim()
      });
    }
    
    return types;
  }

  // [advice from AI] 중복 검사 메서드들
  async checkDuplicateCodeComponent(client, component) {
    // [advice from AI] 더 정확한 중복 검사 - 이름과 파일 경로 모두 확인
    const query = `
      SELECT id FROM code_components
      WHERE (name = $1 AND (file_info->>'file_path' = $2 OR file_info->>'file_path' IS NULL))
         OR (file_info->>'file_path' = $2 AND $2 IS NOT NULL AND $2 != '')
    `;
    const result = await client.query(query, [component.name, component.file_path]);
    
    if (result.rows.length > 0) {
      console.log(`🔍 중복 발견: ${component.name} (${component.file_path})`);
      return true;
    }
    return false;
  }

  async checkDuplicateDesignAsset(client, asset) {
    // [advice from AI] 파일 경로와 이름 모두 확인하여 정확한 중복 검사
    const query = `
      SELECT id FROM design_assets 
      WHERE (name = $1 AND (file_path = $2 OR file_path IS NULL))
         OR (file_path = $2 AND $2 IS NOT NULL AND $2 != '')
    `;
    const result = await client.query(query, [asset.name, asset.file_path]);
    
    if (result.rows.length > 0) {
      console.log(`🔍 중복 디자인 자산 발견: ${asset.name} (${asset.file_path})`);
      return true;
    }
    return false;
  }

  async checkDuplicateDocument(client, doc) {
    const query = `
      SELECT id FROM documents 
      WHERE title = $1 OR file_path = $2
    `;
    const result = await client.query(query, [doc.title, doc.file_path]);
    return result.rows.length > 0;
  }

  async checkDuplicateCatalogComponent(client, catalog) {
    const query = `
      SELECT id FROM catalog_components 
      WHERE name = $1
    `;
    const result = await client.query(query, [catalog.name]);
    return result.rows.length > 0;
  }

  // [advice from AI] 문서 분석 메서드들
  generateDocumentTitle(filePath, content) {
    // 마크다운 H1 제목 추출
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1];
    
    // 파일명 기반 제목 생성
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/[-_]/g, ' ');
  }

  determineDocumentCategory(filePath) {
    if (filePath.includes('README')) return 'guide';
    if (filePath.includes('api') || filePath.includes('API')) return 'api_doc';
    if (filePath.includes('tutorial')) return 'tutorial';
    if (filePath.includes('spec')) return 'specification';
    return 'guide';
  }

  extractDocumentTags(content) {
    const tags = [];
    
    // 마크다운 태그 추출 (예: <!-- tags: react, component -->)
    const tagMatch = content.match(/<!--\s*tags:\s*(.+?)\s*-->/i);
    if (tagMatch) {
      tags.push(...tagMatch[1].split(',').map(tag => tag.trim()));
    }
    
    // 제목에서 키워드 추출
    const headings = content.match(/^#+\s+(.+)$/gm);
    if (headings) {
      headings.forEach(heading => {
        const words = heading.replace(/^#+\s+/, '').toLowerCase().split(/\s+/);
        tags.push(...words.filter(word => word.length > 3));
      });
    }
    
    return [...new Set(tags)]; // 중복 제거
  }

  calculateReadabilityScore(content) {
    // 간단한 가독성 점수 계산 (문장 길이, 단어 복잡도 기반)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.trim().length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // 0-10 스케일로 정규화 (낮을수록 읽기 쉬움)
    const score = Math.max(0, 10 - (avgWordsPerSentence / 5 + avgCharsPerWord / 2));
    return Math.round(score * 100) / 100;
  }

  extractHeadings(content) {
    const headings = [];
    const headingRegex = /^(#+)\s+(.+)$/gm;
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2],
        position: match.index
      });
    }
    
    return headings;
  }

  extractLinks(content) {
    const links = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        position: match.index
      });
    }
    
    return links;
  }

  extractCodeBlocks(content) {
    const codeBlocks = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2],
        position: match.index
      });
    }
    
    return codeBlocks;
  }

  extractImageReferences(content) {
    const images = [];
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      images.push({
        alt: match[1],
        src: match[2],
        position: match.index
      });
    }
    
    return images;
  }

  // [advice from AI] 디자인 자산 분석 메서드들
  generateAssetTitle(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/[-_]/g, ' ');
  }

  generateAssetDescription(filePath) {
    const category = this.determineAssetCategory(filePath);
    const fileName = path.basename(filePath);
    return `${category} asset: ${fileName}`;
  }

  determineAssetCategory(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('logo')) return 'logo';
    if (fileName.includes('icon')) return 'icon';
    if (fileName.includes('button')) return 'button';
    if (fileName.includes('background')) return 'background';
    if (path.extname(filePath) === '.svg') return 'vector';
    
    return 'image';
  }

  generateAssetTags(filePath) {
    const tags = [];
    const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
    const pathParts = filePath.split(path.sep);
    
    // 경로에서 태그 추출
    tags.push(...pathParts.filter(part => 
      !['src', 'assets', 'images', 'icons'].includes(part.toLowerCase()) && 
      part.length > 2
    ));
    
    // 파일명에서 태그 추출
    tags.push(...fileName.split(/[-_]/).filter(part => part.length > 2));
    
    return [...new Set(tags)];
  }

  async getImageDimensions(filePath) {
    try {
      // 실제 이미지 파일이라면 dimensions를 분석할 수 있지만,
      // 여기서는 간단히 파일 확장자 기반으로 추정
      const ext = path.extname(filePath).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        return 'unknown'; // 실제 구현시에는 이미지 라이브러리 사용
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async analyzeColors(filePath) {
    // 실제 구현시에는 이미지 색상 분석 라이브러리 사용
    // 여기서는 기본값 반환
    return {
      dominant_colors: [],
      color_count: 0,
      has_transparency: false
    };
  }

  // [advice from AI] 설정 파일 분석 메서드들
  detectConfigPurpose(filePath, content) {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('package.json')) return 'Node.js package configuration';
    if (fileName.includes('tsconfig')) return 'TypeScript configuration';
    if (fileName.includes('webpack')) return 'Webpack build configuration';
    if (fileName.includes('babel')) return 'Babel transpilation configuration';
    if (fileName.includes('eslint')) return 'ESLint code quality configuration';
    if (fileName.includes('docker')) return 'Docker container configuration';
    
    return 'Application configuration';
  }

  extractConfigKeys(content, filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.json') {
        const config = JSON.parse(content);
        return this.flattenObjectKeys(config);
      } else if (ext === '.yaml' || ext === '.yml') {
        // YAML 파싱은 라이브러리 필요, 여기서는 기본 처리
        const lines = content.split('\n');
        return lines
          .filter(line => line.includes(':') && !line.trim().startsWith('#'))
          .map(line => line.split(':')[0].trim())
          .filter(key => key.length > 0);
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  flattenObjectKeys(obj, prefix = '') {
    const keys = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys.push(...this.flattenObjectKeys(obj[key], fullKey));
        }
      }
    }
    
    return keys;
  }

  calculateConfigComplexity(content) {
    // 중첩 레벨 계산
    const lines = content.split('\n');
    let maxIndent = 0;
    
    for (const line of lines) {
      const indent = line.length - line.trimLeft().length;
      maxIndent = Math.max(maxIndent, indent);
    }
    
    return Math.floor(maxIndent / 2); // 들여쓰기 2칸을 1레벨로 계산
  }
}

module.exports = KnowledgeExtractor;
