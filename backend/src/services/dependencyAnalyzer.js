// [advice from AI] 의존성 분석기 - 코드베이스의 모듈 간 의존 관계 분석

const fs = require('fs').promises;
const path = require('path');

class DependencyAnalyzer {
  constructor() {
    this.dependencyGraph = new Map();
    this.moduleRegistry = new Map();
    this.circularDependencies = [];
  }

  // [advice from AI] 전체 프로젝트 의존성 분석
  async analyzeProject(projectPath) {
    console.log('🔍 의존성 분석 시작:', projectPath);
    
    // 초기화
    this.dependencyGraph.clear();
    this.moduleRegistry.clear();
    this.circularDependencies = [];

    const analysisResult = {
      modules: [],
      dependencies: [],
      circularDependencies: [],
      statistics: {
        totalModules: 0,
        totalDependencies: 0,
        maxDepth: 0,
        orphanModules: 0
      }
    };

    try {
      // [advice from AI] 모든 코드 파일 스캔
      await this.scanDirectory(projectPath);
      
      // [advice from AI] 의존성 그래프 구축
      this.buildDependencyGraph();
      
      // [advice from AI] 순환 의존성 탐지
      this.detectCircularDependencies();
      
      // [advice from AI] 결과 정리
      analysisResult.modules = Array.from(this.moduleRegistry.values());
      analysisResult.dependencies = this.getDependencyList();
      analysisResult.circularDependencies = this.circularDependencies;
      analysisResult.statistics = this.calculateStatistics();

      console.log('✅ 의존성 분석 완료:', analysisResult.statistics);
      return analysisResult;

    } catch (error) {
      console.error('❌ 의존성 분석 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 디렉토리 재귀 스캔
  async scanDirectory(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // 제외 디렉토리
          const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
          if (!excludeDirs.includes(item.name)) {
            await this.scanDirectory(itemPath);
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (['.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
            await this.analyzeFile(itemPath);
          }
        }
      }
    } catch (error) {
      console.error(`디렉토리 스캔 실패: ${dirPath}`, error.message);
    }
  }

  // [advice from AI] 파일 분석
  async analyzeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      const moduleInfo = {
        id: relativePath,
        name: path.basename(filePath, path.extname(filePath)),
        path: relativePath,
        fullPath: filePath,
        type: this.determineModuleType(filePath, content),
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        functions: this.extractFunctions(content),
        classes: this.extractClasses(content),
        size: content.length,
        complexity: this.calculateComplexity(content)
      };

      this.moduleRegistry.set(relativePath, moduleInfo);

    } catch (error) {
      console.error(`파일 분석 실패: ${filePath}`, error.message);
    }
  }

  // [advice from AI] 모듈 타입 결정
  determineModuleType(filePath, content) {
    if (filePath.includes('routes/')) return 'route';
    if (filePath.includes('components/')) return 'component';
    if (filePath.includes('services/')) return 'service';
    if (filePath.includes('utils/') || filePath.includes('helpers/')) return 'utility';
    if (filePath.includes('store/') || filePath.includes('stores/')) return 'store';
    if (filePath.includes('middleware/')) return 'middleware';
    if (content.includes('React.FC') || content.includes('function Component')) return 'react_component';
    if (content.includes('router.')) return 'router';
    if (content.includes('export default class')) return 'class';
    return 'module';
  }

  // [advice from AI] import 문 추출
  extractImports(content) {
    const imports = [];
    
    // ES6 import 문
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const modulePath = match[1];
      imports.push({
        module: modulePath,
        isLocal: modulePath.startsWith('./') || modulePath.startsWith('../'),
        isAbsolute: modulePath.startsWith('/'),
        isNodeModule: !modulePath.startsWith('./') && !modulePath.startsWith('../') && !modulePath.startsWith('/'),
        line: this.getLineNumber(content, match.index)
      });
    }

    // CommonJS require 문
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const modulePath = match[1];
      imports.push({
        module: modulePath,
        isLocal: modulePath.startsWith('./') || modulePath.startsWith('../'),
        isAbsolute: modulePath.startsWith('/'),
        isNodeModule: !modulePath.startsWith('./') && !modulePath.startsWith('../') && !modulePath.startsWith('/'),
        line: this.getLineNumber(content, match.index),
        type: 'require'
      });
    }

    return imports;
  }

  // [advice from AI] export 문 추출
  extractExports(content) {
    const exports = [];
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    let match;
    
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'named',
        line: this.getLineNumber(content, match.index)
      });
    }

    // Default export
    const defaultExportRegex = /export\s+default\s+(?:class\s+(\w+)|function\s+(\w+)|(\w+))/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      const name = match[1] || match[2] || match[3];
      exports.push({
        name: name,
        type: 'default',
        line: this.getLineNumber(content, match.index)
      });
    }

    // Export destructuring
    const exportDestructuringRegex = /export\s+\{\s*([^}]+)\s*\}/g;
    while ((match = exportDestructuringRegex.exec(content)) !== null) {
      const items = match[1].split(',').map(item => item.trim());
      items.forEach(item => {
        const [original, alias] = item.split(' as ').map(s => s.trim());
        exports.push({
          name: alias || original,
          original: original !== (alias || original) ? original : undefined,
          type: 'destructured',
          line: this.getLineNumber(content, match.index)
        });
      });
    }

    return exports;
  }

  // [advice from AI] 함수 추출
  extractFunctions(content) {
    const functions = [];
    
    // Function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'function',
        line: this.getLineNumber(content, match.index)
      });
    }

    // Arrow functions
    const arrowFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'arrow',
        line: this.getLineNumber(content, match.index)
      });
    }

    return functions;
  }

  // [advice from AI] 클래스 추출
  extractClasses(content) {
    const classes = [];
    const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        extends: match[2] || null,
        line: this.getLineNumber(content, match.index)
      });
    }

    return classes;
  }

  // [advice from AI] 복잡도 계산
  calculateComplexity(content) {
    const complexityIndicators = ['if ', 'for ', 'while ', 'switch ', 'catch ', '? ', '&&', '||'];
    let complexity = 1;
    
    for (const indicator of complexityIndicators) {
      const matches = content.match(new RegExp(indicator, 'g'));
      if (matches) complexity += matches.length;
    }
    
    return complexity;
  }

  // [advice from AI] 라인 번호 계산
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  // [advice from AI] 의존성 그래프 구축
  buildDependencyGraph() {
    for (const [modulePath, moduleInfo] of this.moduleRegistry) {
      const dependencies = [];
      
      for (const importInfo of moduleInfo.imports) {
        if (importInfo.isLocal) {
          const resolvedPath = this.resolvePath(modulePath, importInfo.module);
          if (resolvedPath && this.moduleRegistry.has(resolvedPath)) {
            dependencies.push({
              target: resolvedPath,
              type: importInfo.type || 'import',
              module: importInfo.module
            });
          }
        }
      }
      
      this.dependencyGraph.set(modulePath, dependencies);
    }
  }

  // [advice from AI] 경로 해석
  resolvePath(fromPath, importPath) {
    try {
      const fromDir = path.dirname(fromPath);
      let resolvedPath = path.resolve(fromDir, importPath);
      
      // 확장자가 없으면 추가 시도
      if (!path.extname(resolvedPath)) {
        const extensions = ['.js', '.ts', '.tsx', '.jsx'];
        for (const ext of extensions) {
          const withExt = resolvedPath + ext;
          const relativeWithExt = path.relative(process.cwd(), withExt);
          if (this.moduleRegistry.has(relativeWithExt)) {
            return relativeWithExt;
          }
        }
        
        // index 파일 시도
        for (const ext of extensions) {
          const indexPath = path.join(resolvedPath, 'index' + ext);
          const relativeIndexPath = path.relative(process.cwd(), indexPath);
          if (this.moduleRegistry.has(relativeIndexPath)) {
            return relativeIndexPath;
          }
        }
      }
      
      return path.relative(process.cwd(), resolvedPath);
    } catch (error) {
      return null;
    }
  }

  // [advice from AI] 순환 의존성 탐지
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        // 순환 의존성 발견
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat([node]);
        cycles.push(cycle);
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = this.dependencyGraph.get(node) || [];
      for (const dep of dependencies) {
        dfs(dep.target, [...path]);
      }

      recursionStack.delete(node);
    };

    for (const node of this.moduleRegistry.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    this.circularDependencies = cycles;
  }

  // [advice from AI] 의존성 목록 생성
  getDependencyList() {
    const dependencies = [];
    
    for (const [source, deps] of this.dependencyGraph) {
      for (const dep of deps) {
        dependencies.push({
          source: source,
          target: dep.target,
          type: dep.type,
          module: dep.module
        });
      }
    }
    
    return dependencies;
  }

  // [advice from AI] 통계 계산
  calculateStatistics() {
    const totalModules = this.moduleRegistry.size;
    const totalDependencies = this.getDependencyList().length;
    
    // 최대 깊이 계산
    let maxDepth = 0;
    const calculateDepth = (node, visited = new Set()) => {
      if (visited.has(node)) return 0;
      visited.add(node);
      
      const deps = this.dependencyGraph.get(node) || [];
      let depth = 0;
      for (const dep of deps) {
        depth = Math.max(depth, 1 + calculateDepth(dep.target, new Set(visited)));
      }
      return depth;
    };

    for (const node of this.moduleRegistry.keys()) {
      maxDepth = Math.max(maxDepth, calculateDepth(node));
    }

    // 고아 모듈 (의존성이 없는 모듈) 계산
    const orphanModules = Array.from(this.moduleRegistry.keys()).filter(
      node => (this.dependencyGraph.get(node) || []).length === 0
    ).length;

    return {
      totalModules,
      totalDependencies,
      maxDepth,
      orphanModules,
      circularDependenciesCount: this.circularDependencies.length
    };
  }

  // [advice from AI] 모듈별 의존성 통계
  getModuleStatistics() {
    const stats = [];
    
    for (const [modulePath, moduleInfo] of this.moduleRegistry) {
      const dependencies = this.dependencyGraph.get(modulePath) || [];
      const dependents = this.getDependentModules(modulePath);
      
      stats.push({
        module: modulePath,
        name: moduleInfo.name,
        type: moduleInfo.type,
        dependencyCount: dependencies.length,
        dependentCount: dependents.length,
        complexity: moduleInfo.complexity,
        size: moduleInfo.size,
        functionsCount: moduleInfo.functions.length,
        classesCount: moduleInfo.classes.length
      });
    }
    
    return stats.sort((a, b) => b.dependentCount - a.dependentCount);
  }

  // [advice from AI] 특정 모듈에 의존하는 모듈들 찾기
  getDependentModules(targetModule) {
    const dependents = [];
    
    for (const [source, dependencies] of this.dependencyGraph) {
      if (dependencies.some(dep => dep.target === targetModule)) {
        dependents.push(source);
      }
    }
    
    return dependents;
  }

  // [advice from AI] 의존성 트리 생성 (특정 모듈 기준)
  getDependencyTree(rootModule, maxDepth = 5) {
    const visited = new Set();
    
    const buildTree = (module, depth = 0) => {
      if (depth >= maxDepth || visited.has(module) || !this.moduleRegistry.has(module)) {
        return null;
      }
      
      visited.add(module);
      const moduleInfo = this.moduleRegistry.get(module);
      const dependencies = this.dependencyGraph.get(module) || [];
      
      return {
        module: module,
        name: moduleInfo.name,
        type: moduleInfo.type,
        depth: depth,
        children: dependencies
          .map(dep => buildTree(dep.target, depth + 1))
          .filter(child => child !== null)
      };
    };
    
    return buildTree(rootModule);
  }
}

module.exports = DependencyAnalyzer;
