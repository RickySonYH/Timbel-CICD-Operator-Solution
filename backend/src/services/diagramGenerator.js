// [advice from AI] 다이어그램 생성기 - Mermaid 기반 자동 다이어그램 생성

const DependencyAnalyzer = require('./dependencyAnalyzer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

class DiagramGenerator {
  constructor() {
    // [advice from AI] 데이터베이스 연결
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    // [advice from AI] 모듈 타입별 아이콘 매핑
    this.moduleIcons = {
      'route': '🛣️',
      'component': '🧩',
      'react_component': '⚛️',
      'service': '⚙️',
      'utility': '🔧',
      'store': '📦',
      'middleware': '🔀',
      'router': '🚦',
      'class': '📋',
      'module': '📄'
    };

    // [advice from AI] 다이어그램 색상 팔레트
    this.colorPalette = {
      'route': '#FF6B6B',
      'component': '#4ECDC4',
      'react_component': '#45B7D1',
      'service': '#96CEB4',
      'utility': '#FFEAA7',
      'store': '#DDA0DD',
      'middleware': '#98D8C8',
      'router': '#F7DC6F',
      'class': '#BB8FCE',
      'module': '#85C1E9'
    };
  }

  // [advice from AI] 모든 다이어그램 자동 생성
  async generateAllDiagrams(projectPath) {
    console.log('🎨 자동 다이어그램 생성 시작:', projectPath);
    
    const results = {
      dependencyDiagram: null,
      apiArchitecture: null,
      componentHierarchy: null,
      systemArchitecture: null,
      dataFlow: null,
      errors: []
    };

    try {
      // [advice from AI] 의존성 분석 수행
      const analyzer = new DependencyAnalyzer();
      const dependencyAnalysis = await analyzer.analyzeProject(projectPath);

      // [advice from AI] 1. 의존성 다이어그램 생성
      try {
        results.dependencyDiagram = await this.generateDependencyDiagram(dependencyAnalysis);
        console.log('✅ 의존성 다이어그램 생성 완료');
      } catch (error) {
        console.error('❌ 의존성 다이어그램 생성 실패:', error.message);
        results.errors.push({ type: 'dependency', error: error.message });
      }

      // [advice from AI] 2. API 아키텍처 다이어그램 생성
      try {
        results.apiArchitecture = await this.generateAPIArchitectureDiagram(dependencyAnalysis);
        console.log('✅ API 아키텍처 다이어그램 생성 완료');
      } catch (error) {
        console.error('❌ API 아키텍처 다이어그램 생성 실패:', error.message);
        results.errors.push({ type: 'api_architecture', error: error.message });
      }

      // [advice from AI] 3. 컴포넌트 계층 다이어그램 생성
      try {
        results.componentHierarchy = await this.generateComponentHierarchyDiagram(dependencyAnalysis);
        console.log('✅ 컴포넌트 계층 다이어그램 생성 완료');
      } catch (error) {
        console.error('❌ 컴포넌트 계층 다이어그램 생성 실패:', error.message);
        results.errors.push({ type: 'component_hierarchy', error: error.message });
      }

      // [advice from AI] 4. 시스템 아키텍처 다이어그램 생성
      try {
        results.systemArchitecture = await this.generateSystemArchitectureDiagram(dependencyAnalysis);
        console.log('✅ 시스템 아키텍처 다이어그램 생성 완료');
      } catch (error) {
        console.error('❌ 시스템 아키텍처 다이어그램 생성 실패:', error.message);
        results.errors.push({ type: 'system_architecture', error: error.message });
      }

      // [advice from AI] 5. 데이터 플로우 다이어그램 생성
      try {
        results.dataFlow = await this.generateDataFlowDiagram(dependencyAnalysis);
        console.log('✅ 데이터 플로우 다이어그램 생성 완료');
      } catch (error) {
        console.error('❌ 데이터 플로우 다이어그램 생성 실패:', error.message);
        results.errors.push({ type: 'data_flow', error: error.message });
      }

      console.log('🎉 자동 다이어그램 생성 완료:', {
        성공: Object.values(results).filter(r => r !== null && !Array.isArray(r)).length,
        실패: results.errors.length
      });

      return results;

    } catch (error) {
      console.error('❌ 다이어그램 생성 전체 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 1. 의존성 다이어그램 생성
  async generateDependencyDiagram(dependencyAnalysis) {
    const { modules, dependencies } = dependencyAnalysis;
    
    // [advice from AI] 복잡도가 높은 상위 모듈들만 선택 (가독성을 위해)
    const importantModules = modules
      .filter(m => m.imports.length > 0 || dependencies.some(d => d.target === m.id))
      .slice(0, 30); // 최대 30개 모듈만 표시

    let mermaidCode = 'graph TD\n';
    const nodeIds = new Map();
    let nodeCounter = 0;

    // [advice from AI] 노드 ID 생성 및 노드 정의
    for (const module of importantModules) {
      const nodeId = `N${nodeCounter++}`;
      nodeIds.set(module.id, nodeId);
      
      const icon = this.moduleIcons[module.type] || '📄';
      const displayName = this.getDisplayName(module.name, module.path);
      
      mermaidCode += `    ${nodeId}["${icon} ${displayName}"]\n`;
      
      // [advice from AI] 모듈 타입별 스타일 적용
      const color = this.colorPalette[module.type] || '#85C1E9';
      mermaidCode += `    style ${nodeId} fill:${color}\n`;
    }

    // [advice from AI] 의존성 관계 추가
    for (const dep of dependencies) {
      const sourceId = nodeIds.get(dep.source);
      const targetId = nodeIds.get(dep.target);
      
      if (sourceId && targetId) {
        mermaidCode += `    ${sourceId} --> ${targetId}\n`;
      }
    }

    // [advice from AI] 순환 의존성 강조
    if (dependencyAnalysis.circularDependencies.length > 0) {
      mermaidCode += '\n    %% 순환 의존성 강조\n';
      for (const cycle of dependencyAnalysis.circularDependencies.slice(0, 3)) {
        for (let i = 0; i < cycle.length - 1; i++) {
          const sourceId = nodeIds.get(cycle[i]);
          const targetId = nodeIds.get(cycle[i + 1]);
          if (sourceId && targetId) {
            mermaidCode += `    ${sourceId} -.->|순환| ${targetId}\n`;
          }
        }
      }
    }

    // [advice from AI] 데이터베이스에 저장
    const diagramData = await this.saveDiagramToDatabase({
      name: 'project_dependency_diagram',
      title: '프로젝트 의존성 다이어그램',
      description: `${modules.length}개 모듈 간의 의존성 관계를 시각화한 다이어그램`,
      diagram_type: 'dependency',
      mermaid_code: mermaidCode,
      source_analysis: dependencyAnalysis.statistics,
      nodes_data: importantModules.map(m => ({
        id: nodeIds.get(m.id),
        module: m.id,
        name: m.name,
        type: m.type,
        complexity: m.complexity
      })),
      edges_data: dependencies.filter(d => 
        nodeIds.has(d.source) && nodeIds.has(d.target)
      ).map(d => ({
        source: nodeIds.get(d.source),
        target: nodeIds.get(d.target),
        type: d.type
      })),
      generated_from_paths: modules.map(m => m.path)
    });

    return diagramData;
  }

  // [advice from AI] 2. API 아키텍처 다이어그램 생성
  async generateAPIArchitectureDiagram(dependencyAnalysis) {
    const { modules } = dependencyAnalysis;
    
    // [advice from AI] API 관련 모듈들 필터링
    const apiModules = modules.filter(m => 
      m.type === 'route' || 
      m.path.includes('routes/') || 
      m.path.includes('api/') ||
      m.path.includes('controllers/')
    );

    if (apiModules.length === 0) {
      console.warn('⚠️ API 관련 모듈을 찾을 수 없어 기본 구조로 다이어그램을 생성합니다.');
      // [advice from AI] 기본 다이어그램 생성
      return this.generateBasicArchitectureDiagram(extractedModules);
    }

    let mermaidCode = 'graph TB\n';
    mermaidCode += '    Client[👤 Client]\n';
    mermaidCode += '    Gateway[🚪 API Gateway]\n';
    mermaidCode += '    Auth[🔐 Authentication]\n';
    mermaidCode += '    DB[(🗄️ Database)]\n\n';

    // [advice from AI] API 엔드포인트 그룹화
    const apiGroups = this.groupAPIModules(apiModules);
    let groupCounter = 0;

    for (const [groupName, modules] of apiGroups) {
      const groupId = `Group${groupCounter++}`;
      
      mermaidCode += `    subgraph ${groupId}["📁 ${groupName}"]\n`;
      
      for (const module of modules) {
        const moduleId = this.sanitizeId(module.name);
        const icon = this.moduleIcons[module.type] || '🛣️';
        mermaidCode += `        ${moduleId}["${icon} ${module.name}"]\n`;
      }
      
      mermaidCode += '    end\n\n';
    }

    // [advice from AI] 연결 관계 정의
    mermaidCode += '    Client --> Gateway\n';
    mermaidCode += '    Gateway --> Auth\n';
    
    for (const [groupName, modules] of apiGroups) {
      const firstModuleId = this.sanitizeId(modules[0].name);
      mermaidCode += `    Auth --> ${firstModuleId}\n`;
      
      for (const module of modules) {
        const moduleId = this.sanitizeId(module.name);
        mermaidCode += `    ${moduleId} --> DB\n`;
      }
    }

    // [advice from AI] 스타일 적용
    mermaidCode += '\n    style Client fill:#E3F2FD\n';
    mermaidCode += '    style Gateway fill:#FFF3E0\n';
    mermaidCode += '    style Auth fill:#F3E5F5\n';
    mermaidCode += '    style DB fill:#E8F5E8\n';

    const diagramData = await this.saveDiagramToDatabase({
      name: 'api_architecture_diagram',
      title: 'API 아키텍처 다이어그램',
      description: `${apiModules.length}개 API 모듈의 아키텍처 구조 다이어그램`,
      diagram_type: 'api_architecture',
      mermaid_code: mermaidCode,
      source_analysis: { apiModulesCount: apiModules.length },
      nodes_data: apiModules.map(m => ({
        id: this.sanitizeId(m.name),
        module: m.id,
        name: m.name,
        type: m.type
      })),
      generated_from_paths: apiModules.map(m => m.path)
    });

    return diagramData;
  }

  // [advice from AI] 3. 컴포넌트 계층 다이어그램 생성
  async generateComponentHierarchyDiagram(dependencyAnalysis) {
    const { modules } = dependencyAnalysis;
    
    // [advice from AI] React 컴포넌트 및 UI 컴포넌트 필터링
    const componentModules = modules.filter(m => 
      m.type === 'component' || 
      m.type === 'react_component' || 
      m.path.includes('components/') ||
      m.path.includes('pages/')
    );

    if (componentModules.length === 0) {
      console.warn('⚠️ 컴포넌트 모듈을 찾을 수 없어 기본 구조로 다이어그램을 생성합니다.');
      // [advice from AI] 기본 컴포넌트 다이어그램 생성
      return this.generateBasicComponentDiagram(extractedModules);
    }

    let mermaidCode = 'graph TD\n';
    mermaidCode += '    App[⚛️ App]\n\n';

    // [advice from AI] 컴포넌트 계층 구조 분석
    const hierarchy = this.buildComponentHierarchy(componentModules);
    
    // [advice from AI] 페이지 레벨 컴포넌트
    const pageComponents = componentModules.filter(m => m.path.includes('pages/'));
    const layoutComponents = componentModules.filter(m => m.path.includes('layout/'));
    const uiComponents = componentModules.filter(m => 
      m.path.includes('components/') && !m.path.includes('layout/')
    );

    // [advice from AI] 페이지 컴포넌트 연결
    for (const page of pageComponents) {
      const pageId = this.sanitizeId(page.name);
      const icon = '📄';
      mermaidCode += `    ${pageId}["${icon} ${page.name}"]\n`;
      mermaidCode += `    App --> ${pageId}\n`;
    }

    // [advice from AI] 레이아웃 컴포넌트 연결
    for (const layout of layoutComponents) {
      const layoutId = this.sanitizeId(layout.name);
      const icon = '🏗️';
      mermaidCode += `    ${layoutId}["${icon} ${layout.name}"]\n`;
      mermaidCode += `    App --> ${layoutId}\n`;
    }

    // [advice from AI] UI 컴포넌트 그룹화
    const componentGroups = this.groupComponentsByDirectory(uiComponents);
    
    for (const [groupName, components] of componentGroups) {
      if (components.length > 0) {
        mermaidCode += `\n    subgraph "${groupName}"\n`;
        
        for (const component of components) {
          const compId = this.sanitizeId(component.name);
          const icon = '🧩';
          mermaidCode += `        ${compId}["${icon} ${component.name}"]\n`;
        }
        
        mermaidCode += '    end\n';
        
        // 첫 번째 컴포넌트를 대표로 연결
        if (components.length > 0) {
          const firstCompId = this.sanitizeId(components[0].name);
          if (layoutComponents.length > 0) {
            const firstLayoutId = this.sanitizeId(layoutComponents[0].name);
            mermaidCode += `    ${firstLayoutId} --> ${firstCompId}\n`;
          } else if (pageComponents.length > 0) {
            const firstPageId = this.sanitizeId(pageComponents[0].name);
            mermaidCode += `    ${firstPageId} --> ${firstCompId}\n`;
          }
        }
      }
    }

    const diagramData = await this.saveDiagramToDatabase({
      name: 'component_hierarchy_diagram',
      title: '컴포넌트 계층 다이어그램',
      description: `${componentModules.length}개 컴포넌트의 계층 구조 다이어그램`,
      diagram_type: 'component_hierarchy',
      mermaid_code: mermaidCode,
      source_analysis: { 
        componentCount: componentModules.length,
        pageCount: pageComponents.length,
        layoutCount: layoutComponents.length,
        uiComponentCount: uiComponents.length
      },
      nodes_data: componentModules.map(m => ({
        id: this.sanitizeId(m.name),
        module: m.id,
        name: m.name,
        type: m.type,
        category: m.path.includes('pages/') ? 'page' : 
                  m.path.includes('layout/') ? 'layout' : 'component'
      })),
      generated_from_paths: componentModules.map(m => m.path)
    });

    return diagramData;
  }

  // [advice from AI] 4. 시스템 아키텍처 다이어그램 생성
  async generateSystemArchitectureDiagram(dependencyAnalysis) {
    const { modules } = dependencyAnalysis;
    
    let mermaidCode = 'graph TB\n';
    
    // [advice from AI] 시스템 레이어 정의
    mermaidCode += '    subgraph "Frontend Layer"\n';
    mermaidCode += '        UI[🖥️ User Interface]\n';
    mermaidCode += '        Components[🧩 Components]\n';
    mermaidCode += '        Store[📦 State Management]\n';
    mermaidCode += '    end\n\n';
    
    mermaidCode += '    subgraph "API Layer"\n';
    mermaidCode += '        Gateway[🚪 API Gateway]\n';
    mermaidCode += '        Auth[🔐 Authentication]\n';
    mermaidCode += '        Routes[🛣️ API Routes]\n';
    mermaidCode += '    end\n\n';
    
    mermaidCode += '    subgraph "Business Layer"\n';
    mermaidCode += '        Services[⚙️ Business Services]\n';
    mermaidCode += '        Workflows[🔄 Workflows]\n';
    mermaidCode += '        Validation[✅ Validation]\n';
    mermaidCode += '    end\n\n';
    
    mermaidCode += '    subgraph "Data Layer"\n';
    mermaidCode += '        DB[(🗄️ Database)]\n';
    mermaidCode += '        Cache[⚡ Cache]\n';
    mermaidCode += '        Files[📁 File Storage]\n';
    mermaidCode += '    end\n\n';
    
    // [advice from AI] 레이어 간 연결
    mermaidCode += '    UI --> Components\n';
    mermaidCode += '    Components --> Store\n';
    mermaidCode += '    Store --> Gateway\n';
    mermaidCode += '    Gateway --> Auth\n';
    mermaidCode += '    Auth --> Routes\n';
    mermaidCode += '    Routes --> Services\n';
    mermaidCode += '    Services --> Workflows\n';
    mermaidCode += '    Workflows --> Validation\n';
    mermaidCode += '    Validation --> DB\n';
    mermaidCode += '    Services --> Cache\n';
    mermaidCode += '    Services --> Files\n';

    // [advice from AI] 모듈 통계 분석
    const moduleStats = this.analyzeModuleDistribution(modules);

    const diagramData = await this.saveDiagramToDatabase({
      name: 'system_architecture_diagram',
      title: '시스템 아키텍처 다이어그램',
      description: '전체 시스템의 레이어별 아키텍처 구조 다이어그램',
      diagram_type: 'system_architecture',
      mermaid_code: mermaidCode,
      source_analysis: moduleStats,
      nodes_data: [
        { id: 'UI', name: 'User Interface', layer: 'frontend' },
        { id: 'Components', name: 'Components', layer: 'frontend' },
        { id: 'Store', name: 'State Management', layer: 'frontend' },
        { id: 'Gateway', name: 'API Gateway', layer: 'api' },
        { id: 'Auth', name: 'Authentication', layer: 'api' },
        { id: 'Routes', name: 'API Routes', layer: 'api' },
        { id: 'Services', name: 'Business Services', layer: 'business' },
        { id: 'Workflows', name: 'Workflows', layer: 'business' },
        { id: 'Validation', name: 'Validation', layer: 'business' },
        { id: 'DB', name: 'Database', layer: 'data' },
        { id: 'Cache', name: 'Cache', layer: 'data' },
        { id: 'Files', name: 'File Storage', layer: 'data' }
      ],
      generated_from_paths: modules.map(m => m.path)
    });

    return diagramData;
  }

  // [advice from AI] 5. 데이터 플로우 다이어그램 생성
  async generateDataFlowDiagram(dependencyAnalysis) {
    const { modules } = dependencyAnalysis;
    
    // [advice from AI] 데이터 플로우 관련 모듈 필터링
    const dataModules = modules.filter(m => 
      m.type === 'service' || 
      m.type === 'store' ||
      m.path.includes('services/') ||
      m.path.includes('store/') ||
      m.path.includes('api/')
    );

    let mermaidCode = 'flowchart LR\n';
    mermaidCode += '    User[👤 사용자]\n';
    mermaidCode += '    Frontend[🖥️ 프론트엔드]\n';
    mermaidCode += '    API[🚪 API 서버]\n';
    mermaidCode += '    DB[(🗄️ 데이터베이스)]\n\n';

    // [advice from AI] 데이터 플로우 단계별 연결
    mermaidCode += '    User -->|요청| Frontend\n';
    mermaidCode += '    Frontend -->|API 호출| API\n';
    mermaidCode += '    API -->|데이터 조회/저장| DB\n';
    mermaidCode += '    DB -->|결과 반환| API\n';
    mermaidCode += '    API -->|응답| Frontend\n';
    mermaidCode += '    Frontend -->|화면 업데이트| User\n\n';

    // [advice from AI] 주요 서비스 모듈 추가
    if (dataModules.length > 0) {
      mermaidCode += '    subgraph "주요 서비스"\n';
      
      for (const module of dataModules.slice(0, 5)) { // 상위 5개만 표시
        const moduleId = this.sanitizeId(module.name);
        const icon = this.moduleIcons[module.type] || '⚙️';
        mermaidCode += `        ${moduleId}["${icon} ${module.name}"]\n`;
      }
      
      mermaidCode += '    end\n\n';
      
      // 서비스와 API 연결
      for (const module of dataModules.slice(0, 5)) {
        const moduleId = this.sanitizeId(module.name);
        mermaidCode += `    API --> ${moduleId}\n`;
        mermaidCode += `    ${moduleId} --> DB\n`;
      }
    }

    const diagramData = await this.saveDiagramToDatabase({
      name: 'data_flow_diagram',
      title: '데이터 플로우 다이어그램',
      description: '시스템 내 데이터의 흐름을 시각화한 다이어그램',
      diagram_type: 'data_flow',
      mermaid_code: mermaidCode,
      source_analysis: { dataModulesCount: dataModules.length },
      nodes_data: dataModules.slice(0, 5).map(m => ({
        id: this.sanitizeId(m.name),
        module: m.id,
        name: m.name,
        type: m.type
      })),
      generated_from_paths: dataModules.map(m => m.path)
    });

    return diagramData;
  }

  // [advice from AI] === 유틸리티 메서드들 ===

  getDisplayName(name, path) {
    // 긴 이름을 축약
    if (name.length > 15) {
      return name.substring(0, 12) + '...';
    }
    return name;
  }

  sanitizeId(name) {
    // Mermaid에서 사용 가능한 ID로 변환
    return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
  }

  groupAPIModules(apiModules) {
    const groups = new Map();
    
    for (const module of apiModules) {
      const pathParts = module.path.split('/');
      let groupName = 'API Routes';
      
      // routes 디렉토리 하위의 그룹명 추출
      const routeIndex = pathParts.findIndex(part => part === 'routes');
      if (routeIndex >= 0 && routeIndex < pathParts.length - 1) {
        groupName = pathParts[routeIndex + 1].replace(/\.(js|ts)$/, '');
      }
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName).push(module);
    }
    
    return groups;
  }

  buildComponentHierarchy(componentModules) {
    // 간단한 계층 구조 분석
    const hierarchy = {
      pages: componentModules.filter(m => m.path.includes('pages/')),
      layouts: componentModules.filter(m => m.path.includes('layout/')),
      components: componentModules.filter(m => 
        m.path.includes('components/') && !m.path.includes('layout/')
      )
    };
    
    return hierarchy;
  }

  groupComponentsByDirectory(components) {
    const groups = new Map();
    
    for (const component of components) {
      const pathParts = component.path.split('/');
      let groupName = 'Components';
      
      // components 디렉토리 하위의 그룹명 추출
      const compIndex = pathParts.findIndex(part => part === 'components');
      if (compIndex >= 0 && compIndex < pathParts.length - 1) {
        groupName = pathParts[compIndex + 1];
      }
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName).push(component);
    }
    
    return groups;
  }

  analyzeModuleDistribution(modules) {
    const distribution = {};
    
    for (const module of modules) {
      if (!distribution[module.type]) {
        distribution[module.type] = 0;
      }
      distribution[module.type]++;
    }
    
    return {
      totalModules: modules.length,
      typeDistribution: distribution,
      complexityStats: {
        avgComplexity: modules.reduce((sum, m) => sum + (m.complexity || 0), 0) / modules.length,
        maxComplexity: Math.max(...modules.map(m => m.complexity || 0))
      }
    };
  }

  // [advice from AI] 데이터베이스에 다이어그램 저장
  async saveDiagramToDatabase(diagramData) {
    const client = await this.pool.connect();
    
    try {
      // [advice from AI] 기존 다이어그램 확인 후 삽입 또는 업데이트
      const checkQuery = `SELECT id FROM auto_generated_diagrams WHERE name = $1`;
      const checkResult = await client.query(checkQuery, [diagramData.name]);
      
      let query;
      let params;
      
      if (checkResult.rows.length > 0) {
        // 업데이트
        query = `
          UPDATE auto_generated_diagrams SET
            title = $2,
            description = $3,
            mermaid_code = $4,
            source_analysis = $5,
            nodes_data = $6,
            edges_data = $7,
            generated_from_paths = $8,
            last_generated_at = NOW(),
            updated_at = NOW()
          WHERE name = $1
          RETURNING *
        `;
        params = [
          diagramData.name,
          diagramData.title,
          diagramData.description,
          diagramData.mermaid_code,
          JSON.stringify(diagramData.source_analysis),
          JSON.stringify(diagramData.nodes_data),
          JSON.stringify(diagramData.edges_data || []),
          diagramData.generated_from_paths
        ];
      } else {
        // 삽입
        query = `
          INSERT INTO auto_generated_diagrams (
            name, title, description, diagram_type, mermaid_code,
            source_analysis, nodes_data, edges_data, generated_from_paths,
            last_generated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *
        `;
        params = [
          diagramData.name,
          diagramData.title,
          diagramData.description,
          diagramData.diagram_type,
          diagramData.mermaid_code,
          JSON.stringify(diagramData.source_analysis),
          JSON.stringify(diagramData.nodes_data),
          JSON.stringify(diagramData.edges_data || []),
          diagramData.generated_from_paths
        ];
      }

      const result = await client.query(query, params);

      console.log(`✅ 다이어그램 저장됨: ${diagramData.title}`);
      return result.rows[0];

    } catch (error) {
      console.error('❌ 다이어그램 저장 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 기본 다이어그램 생성 - API 모듈이 없을 때
  generateBasicArchitectureDiagram(extractedModules) {
    console.log('📊 기본 아키텍처 다이어그램 생성 중...');
    
    let mermaidCode = 'graph TB\n';
    mermaidCode += '    Client[클라이언트]\n';
    mermaidCode += '    Frontend[프론트엔드]\n';
    mermaidCode += '    Backend[백엔드]\n';
    mermaidCode += '    Database[데이터베이스]\n\n';
    
    // 기본 연결
    mermaidCode += '    Client --> Frontend\n';
    mermaidCode += '    Frontend --> Backend\n';
    mermaidCode += '    Backend --> Database\n\n';
    
    // 추출된 모듈이 있으면 추가
    if (extractedModules.length > 0) {
      const moduleTypes = {};
      extractedModules.forEach(module => {
        const type = this.detectModuleType(module);
        if (!moduleTypes[type]) moduleTypes[type] = [];
        moduleTypes[type].push(module.name);
      });
      
      Object.keys(moduleTypes).forEach(type => {
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        mermaidCode += `    ${typeName}[${typeName} 모듈]\n`;
        mermaidCode += `    Backend --> ${typeName}\n`;
      });
    }
    
    return {
      name: '기본 시스템 아키텍처',
      type: 'architecture',
      description: '추출된 모듈 정보를 기반으로 생성된 기본 시스템 구조',
      mermaid_code: mermaidCode,
      tags: ['architecture', 'system', 'auto-generated'],
      metadata: {
        generated_at: new Date().toISOString(),
        module_count: extractedModules.length,
        diagram_type: 'basic_architecture'
      }
    };
  }

  // [advice from AI] 기본 컴포넌트 다이어그램 생성
  generateBasicComponentDiagram(extractedModules) {
    console.log('📊 기본 컴포넌트 다이어그램 생성 중...');
    
    let mermaidCode = 'graph TD\n';
    mermaidCode += '    App[애플리케이션]\n';
    mermaidCode += '    Frontend[프론트엔드 레이어]\n';
    mermaidCode += '    Backend[백엔드 레이어]\n';
    mermaidCode += '    Data[데이터 레이어]\n\n';
    
    mermaidCode += '    App --> Frontend\n';
    mermaidCode += '    App --> Backend\n';
    mermaidCode += '    Backend --> Data\n';
    
    return {
      name: '기본 컴포넌트 구조',
      type: 'component_hierarchy',
      description: '시스템의 기본 컴포넌트 계층 구조',
      mermaid_code: mermaidCode,
      tags: ['component', 'hierarchy', 'auto-generated'],
      metadata: {
        generated_at: new Date().toISOString(),
        diagram_type: 'basic_component'
      }
    };
  }

  // [advice from AI] 모듈 타입 감지
  detectModuleType(module) {
    const path = module.path.toLowerCase();
    if (path.includes('service')) return 'service';
    if (path.includes('controller') || path.includes('route')) return 'controller';
    if (path.includes('model') || path.includes('entity')) return 'model';
    if (path.includes('util') || path.includes('helper')) return 'utility';
    if (path.includes('config')) return 'config';
    return 'general';
  }
}

module.exports = DiagramGenerator;
