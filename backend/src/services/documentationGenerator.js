// [advice from AI] 자동 문서 생성기 - 코드 분석 기반 마크다운 문서 자동 생성

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class DocumentationGenerator {
  constructor() {
    // [advice from AI] 데이터베이스 연결
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });
  }

  // [advice from AI] 전체 프로젝트 문서 자동 생성
  async generateAllDocumentation(projectPath, codeAnalysisData) {
    console.log('📝 자동 문서 생성 시작:', projectPath);
    
    const results = {
      apiDocumentation: null,
      componentDocumentation: null,
      serviceDocumentation: null,
      architectureDocumentation: null,
      readmeDocumentation: null,
      errors: []
    };

    try {
      // [advice from AI] 1. API 문서 생성
      try {
        results.apiDocumentation = await this.generateAPIDocumentation(codeAnalysisData);
        console.log('✅ API 문서 생성 완료');
      } catch (error) {
        console.error('❌ API 문서 생성 실패:', error.message);
        results.errors.push({ type: 'api_docs', error: error.message });
      }

      // [advice from AI] 2. 컴포넌트 문서 생성
      try {
        results.componentDocumentation = await this.generateComponentDocumentation(codeAnalysisData);
        console.log('✅ 컴포넌트 문서 생성 완료');
      } catch (error) {
        console.error('❌ 컴포넌트 문서 생성 실패:', error.message);
        results.errors.push({ type: 'component_docs', error: error.message });
      }

      // [advice from AI] 3. 서비스 문서 생성
      try {
        results.serviceDocumentation = await this.generateServiceDocumentation(codeAnalysisData);
        console.log('✅ 서비스 문서 생성 완료');
      } catch (error) {
        console.error('❌ 서비스 문서 생성 실패:', error.message);
        results.errors.push({ type: 'service_docs', error: error.message });
      }

      // [advice from AI] 4. 아키텍처 문서 생성
      try {
        results.architectureDocumentation = await this.generateArchitectureDocumentation(codeAnalysisData);
        console.log('✅ 아키텍처 문서 생성 완료');
      } catch (error) {
        console.error('❌ 아키텍처 문서 생성 실패:', error.message);
        results.errors.push({ type: 'architecture_docs', error: error.message });
      }

      // [advice from AI] 5. 프로젝트 README 생성
      try {
        results.readmeDocumentation = await this.generateProjectReadme(codeAnalysisData);
        console.log('✅ 프로젝트 README 생성 완료');
      } catch (error) {
        console.error('❌ README 생성 실패:', error.message);
        results.errors.push({ type: 'readme', error: error.message });
      }

      console.log('🎉 자동 문서 생성 완료:', {
        성공: Object.values(results).filter(r => r !== null && !Array.isArray(r)).length,
        실패: results.errors.length
      });

      return results;

    } catch (error) {
      console.error('❌ 문서 생성 전체 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 1. API 문서 생성
  async generateAPIDocumentation(codeAnalysisData) {
    const { codeComponents, catalogComponents } = codeAnalysisData;
    
    // [advice from AI] API 관련 컴포넌트 필터링
    const apiComponents = [...codeComponents, ...catalogComponents].filter(component =>
      component.type === 'API Route' ||
      component.file_path.includes('routes/') ||
      (component.api_endpoints && component.api_endpoints.length > 0)
    );

    if (apiComponents.length === 0) {
      console.warn('⚠️ API 관련 컴포넌트를 찾을 수 없어 기본 API 문서를 생성합니다.');
      return this.generateBasicApiDocumentation(extractedModules);
    }

    let documentation = '# API 문서\n\n';
    documentation += '> 자동 생성된 API 문서입니다.\n\n';
    documentation += `**생성일**: ${new Date().toLocaleString('ko-KR')}\n`;
    documentation += `**총 API 모듈**: ${apiComponents.length}개\n\n`;

    // [advice from AI] 목차 생성
    documentation += '## 📋 목차\n\n';
    for (const component of apiComponents) {
      const sectionName = this.getSectionName(component.name);
      documentation += `- [${sectionName}](#${sectionName.toLowerCase().replace(/\s+/g, '-')})\n`;
    }
    documentation += '\n---\n\n';

    // [advice from AI] 각 API 모듈별 문서 생성
    for (const component of apiComponents) {
      documentation += await this.generateAPIModuleDoc(component);
      documentation += '\n---\n\n';
    }

    // [advice from AI] 데이터베이스에 저장
    const docData = await this.saveDocumentToDatabase({
      title: 'API 문서 (자동 생성)',
      content: documentation,
      category: 'api_doc',
      format: 'markdown',
      tags: ['api', 'auto-generated', 'documentation'],
      file_path: 'auto-generated/api-documentation.md',
      word_count: documentation.split(/\s+/).length,
      auto_generated: true,
      source_components: apiComponents.map(c => c.id)
    });

    return docData;
  }

  // [advice from AI] API 모듈별 상세 문서 생성
  async generateAPIModuleDoc(component) {
    const sectionName = this.getSectionName(component.name);
    let doc = `## ${sectionName}\n\n`;
    
    // [advice from AI] 기본 정보
    doc += `**파일 경로**: \`${component.file_path}\`\n`;
    doc += `**타입**: ${component.type}\n`;
    doc += `**언어**: ${component.language || 'JavaScript'}\n`;
    doc += `**복잡도**: ${component.complexity_score || 0}/10\n\n`;

    if (component.description) {
      doc += `**설명**: ${component.description}\n\n`;
    }

    // [advice from AI] API 엔드포인트 문서화
    if (component.api_endpoints && component.api_endpoints.length > 0) {
      doc += '### 🛣️ API 엔드포인트\n\n';
      
      for (const endpoint of component.api_endpoints) {
        doc += `#### \`${endpoint.method} ${endpoint.path}\`\n\n`;
        
        // [advice from AI] 엔드포인트 설명 추출 시도
        const endpointDesc = this.extractEndpointDescription(component.source_code, endpoint);
        if (endpointDesc) {
          doc += `**설명**: ${endpointDesc}\n\n`;
        }

        // [advice from AI] 파라미터 분석
        const parameters = this.extractEndpointParameters(component.source_code, endpoint);
        if (parameters.length > 0) {
          doc += '**파라미터**:\n';
          for (const param of parameters) {
            doc += `- \`${param.name}\` (${param.type}): ${param.description || '설명 없음'}\n`;
          }
          doc += '\n';
        }

        // [advice from AI] 응답 예시
        doc += '**응답 예시**:\n```json\n';
        doc += this.generateResponseExample(endpoint);
        doc += '\n```\n\n';
      }
    }

    // [advice from AI] 함수 문서화
    if (component.functions_list && component.functions_list.length > 0) {
      doc += '### ⚙️ 주요 함수\n\n';
      
      for (const func of component.functions_list.slice(0, 5)) { // 상위 5개만
        doc += `#### \`${func.name}()\`\n\n`;
        
        // JSDoc에서 함수 설명 추출
        const funcDesc = this.extractFunctionDescription(component.jsdoc_comments, func.name);
        if (funcDesc) {
          doc += `**설명**: ${funcDesc}\n\n`;
        }
        
        doc += `**타입**: ${func.type}\n`;
        doc += `**라인**: ${func.line || '알 수 없음'}\n\n`;
      }
    }

    // [advice from AI] 의존성 정보
    if (component.imports_list && component.imports_list.length > 0) {
      doc += '### 📦 의존성\n\n';
      
      const localDeps = component.imports_list.filter(imp => imp.isLocal);
      const externalDeps = component.imports_list.filter(imp => imp.isNodeModule);
      
      if (localDeps.length > 0) {
        doc += '**로컬 모듈**:\n';
        for (const dep of localDeps) {
          doc += `- \`${dep.module}\`\n`;
        }
        doc += '\n';
      }
      
      if (externalDeps.length > 0) {
        doc += '**외부 패키지**:\n';
        for (const dep of externalDeps) {
          doc += `- \`${dep.module}\`\n`;
        }
        doc += '\n';
      }
    }

    return doc;
  }

  // [advice from AI] 2. 컴포넌트 문서 생성
  async generateComponentDocumentation(codeAnalysisData) {
    const { codeComponents } = codeAnalysisData;
    
    // [advice from AI] React 컴포넌트 필터링
    const reactComponents = codeComponents.filter(component =>
      component.type === 'React Component' ||
      component.type === 'UI Component' ||
      component.file_path.includes('components/') ||
      (component.source_code && component.source_code.includes('React.FC'))
    );

    if (reactComponents.length === 0) {
      console.warn('⚠️ React 컴포넌트를 찾을 수 없어 기본 컴포넌트 문서를 생성합니다.');
      return this.generateBasicComponentDocumentation(extractedModules);
    }

    let documentation = '# 컴포넌트 문서\n\n';
    documentation += '> 자동 생성된 React 컴포넌트 문서입니다.\n\n';
    documentation += `**생성일**: ${new Date().toLocaleString('ko-KR')}\n`;
    documentation += `**총 컴포넌트**: ${reactComponents.length}개\n\n`;

    // [advice from AI] 컴포넌트별 그룹화
    const componentGroups = this.groupComponentsByPath(reactComponents);

    for (const [groupName, components] of componentGroups) {
      documentation += `## 📁 ${groupName}\n\n`;
      
      for (const component of components) {
        documentation += await this.generateComponentDoc(component);
        documentation += '\n---\n\n';
      }
    }

    // [advice from AI] 데이터베이스에 저장
    const docData = await this.saveDocumentToDatabase({
      title: '컴포넌트 문서 (자동 생성)',
      content: documentation,
      category: 'guide',
      format: 'markdown',
      tags: ['components', 'react', 'auto-generated', 'documentation'],
      file_path: 'auto-generated/component-documentation.md',
      word_count: documentation.split(/\s+/).length,
      auto_generated: true,
      source_components: reactComponents.map(c => c.id)
    });

    return docData;
  }

  // [advice from AI] 개별 컴포넌트 문서 생성
  async generateComponentDoc(component) {
    let doc = `### ${component.name}\n\n`;
    
    // [advice from AI] 기본 정보
    doc += `**파일**: \`${component.file_path}\`\n`;
    doc += `**타입**: ${component.type}\n`;
    doc += `**라인 수**: ${component.line_count || 0}\n`;
    doc += `**복잡도**: ${component.complexity_score || 0}/10\n\n`;

    if (component.description) {
      doc += `**설명**: ${component.description}\n\n`;
    }

    // [advice from AI] Props 분석 (TypeScript 인터페이스에서 추출)
    const props = this.extractComponentProps(component);
    if (props.length > 0) {
      doc += '#### 📋 Props\n\n';
      doc += '| 이름 | 타입 | 필수 | 기본값 | 설명 |\n';
      doc += '|------|------|------|--------|------|\n';
      
      for (const prop of props) {
        doc += `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? '✅' : '❌'} | \`${prop.defaultValue || '-'}\` | ${prop.description || '-'} |\n`;
      }
      doc += '\n';
    }

    // [advice from AI] 사용 예시 생성
    doc += '#### 💡 사용 예시\n\n';
    doc += '```tsx\n';
    doc += this.generateComponentUsageExample(component, props);
    doc += '\n```\n\n';

    // [advice from AI] 의존성
    if (component.imports_list && component.imports_list.length > 0) {
      const reactDeps = component.imports_list.filter(imp => 
        imp.module.includes('react') || imp.module.includes('@mui') || imp.isLocal
      );
      
      if (reactDeps.length > 0) {
        doc += '#### 📦 의존성\n\n';
        for (const dep of reactDeps) {
          doc += `- \`${dep.module}\`\n`;
        }
        doc += '\n';
      }
    }

    return doc;
  }

  // [advice from AI] 3. 서비스 문서 생성
  async generateServiceDocumentation(codeAnalysisData) {
    const { codeComponents } = codeAnalysisData;
    
    // [advice from AI] 서비스 모듈 필터링
    const serviceComponents = codeComponents.filter(component =>
      component.type === 'Service' ||
      component.file_path.includes('services/') ||
      component.file_path.includes('middleware/')
    );

    if (serviceComponents.length === 0) {
      console.warn('⚠️ 서비스 모듈을 찾을 수 없어 기본 서비스 문서를 생성합니다.');
      return this.generateBasicServiceDocumentation(extractedModules);
    }

    let documentation = '# 서비스 문서\n\n';
    documentation += '> 자동 생성된 서비스 및 미들웨어 문서입니다.\n\n';
    documentation += `**생성일**: ${new Date().toLocaleString('ko-KR')}\n`;
    documentation += `**총 서비스**: ${serviceComponents.length}개\n\n`;

    for (const service of serviceComponents) {
      documentation += await this.generateServiceDoc(service);
      documentation += '\n---\n\n';
    }

    // [advice from AI] 데이터베이스에 저장
    const docData = await this.saveDocumentToDatabase({
      title: '서비스 문서 (자동 생성)',
      content: documentation,
      category: 'guide',
      format: 'markdown',
      tags: ['services', 'middleware', 'auto-generated', 'documentation'],
      file_path: 'auto-generated/service-documentation.md',
      word_count: documentation.split(/\s+/).length,
      auto_generated: true,
      source_components: serviceComponents.map(c => c.id)
    });

    return docData;
  }

  // [advice from AI] 개별 서비스 문서 생성
  async generateServiceDoc(service) {
    let doc = `## ${service.name}\n\n`;
    
    doc += `**파일**: \`${service.file_path}\`\n`;
    doc += `**타입**: ${service.type}\n`;
    doc += `**언어**: ${service.language || 'JavaScript'}\n\n`;

    if (service.description) {
      doc += `**설명**: ${service.description}\n\n`;
    }

    // [advice from AI] 클래스 메서드 문서화
    if (service.classes_list && service.classes_list.length > 0) {
      for (const cls of service.classes_list) {
        doc += `### 📋 클래스: ${cls.name}\n\n`;
        
        if (cls.extends) {
          doc += `**상속**: \`${cls.extends}\`\n\n`;
        }

        // 클래스 메서드 추출
        const methods = this.extractClassMethods(service.source_code, cls.name);
        if (methods.length > 0) {
          doc += '#### 메서드\n\n';
          for (const method of methods) {
            doc += `##### \`${method.name}(${method.parameters.join(', ')})\`\n\n`;
            if (method.description) {
              doc += `${method.description}\n\n`;
            }
            if (method.parameters.length > 0) {
              doc += '**파라미터**:\n';
              for (const param of method.parameters) {
                doc += `- \`${param}\`\n`;
              }
              doc += '\n';
            }
          }
        }
      }
    }

    // [advice from AI] 일반 함수 문서화
    if (service.functions_list && service.functions_list.length > 0) {
      doc += '### ⚙️ 함수들\n\n';
      
      for (const func of service.functions_list) {
        doc += `#### \`${func.name}()\`\n\n`;
        doc += `**타입**: ${func.type}\n`;
        doc += `**라인**: ${func.line || '알 수 없음'}\n\n`;
        
        // JSDoc에서 함수 설명 추출
        const funcDesc = this.extractFunctionDescription(service.jsdoc_comments, func.name);
        if (funcDesc) {
          doc += `**설명**: ${funcDesc}\n\n`;
        }
      }
    }

    return doc;
  }

  // [advice from AI] 4. 아키텍처 문서 생성
  async generateArchitectureDocumentation(codeAnalysisData) {
    const { codeComponents, designAssets, documents, catalogComponents } = codeAnalysisData;
    
    let documentation = '# 시스템 아키텍처 문서\n\n';
    documentation += '> 자동 생성된 시스템 아키텍처 문서입니다.\n\n';
    documentation += `**생성일**: ${new Date().toLocaleString('ko-KR')}\n\n`;

    // [advice from AI] 프로젝트 개요
    documentation += '## 📊 프로젝트 개요\n\n';
    documentation += `- **총 코드 컴포넌트**: ${codeComponents.length}개\n`;
    documentation += `- **디자인 자산**: ${designAssets.length}개\n`;
    documentation += `- **문서**: ${documents.length}개\n`;
    documentation += `- **카탈로그 항목**: ${catalogComponents.length}개\n\n`;

    // [advice from AI] 기술 스택 분석
    documentation += '## 🛠️ 기술 스택\n\n';
    const techStack = this.analyzeTechStack(codeComponents);
    
    documentation += '### 프론트엔드\n';
    for (const tech of techStack.frontend) {
      documentation += `- ${tech}\n`;
    }
    
    documentation += '\n### 백엔드\n';
    for (const tech of techStack.backend) {
      documentation += `- ${tech}\n`;
    }

    documentation += '\n### 데이터베이스\n';
    for (const tech of techStack.database) {
      documentation += `- ${tech}\n`;
    }

    // [advice from AI] 디렉토리 구조
    documentation += '\n## 📁 디렉토리 구조\n\n';
    documentation += '```\n';
    documentation += this.generateDirectoryStructure(codeComponents);
    documentation += '\n```\n\n';

    // [advice from AI] 아키텍처 패턴
    documentation += '## 🏗️ 아키텍처 패턴\n\n';
    documentation += this.analyzeArchitecturePatterns(codeComponents);

    // [advice from AI] 데이터베이스에 저장
    const docData = await this.saveDocumentToDatabase({
      title: '시스템 아키텍처 문서 (자동 생성)',
      content: documentation,
      category: 'specification',
      format: 'markdown',
      tags: ['architecture', 'system', 'auto-generated', 'documentation'],
      file_path: 'auto-generated/architecture-documentation.md',
      word_count: documentation.split(/\s+/).length,
      auto_generated: true,
      source_components: codeComponents.map(c => c.id)
    });

    return docData;
  }

  // [advice from AI] 5. 프로젝트 README 생성
  async generateProjectReadme(codeAnalysisData) {
    const { codeComponents, designAssets, documents, catalogComponents } = codeAnalysisData;
    
    let readme = '# Timbel Knowledge Platform\n\n';
    readme += '> 자동 생성된 프로젝트 README입니다.\n\n';
    
    // [advice from AI] 프로젝트 소개
    readme += '## 🚀 프로젝트 소개\n\n';
    readme += 'Timbel Knowledge Platform은 지식 자원 관리 및 승인 워크플로우 시스템입니다.\n\n';

    // [advice from AI] 주요 기능
    readme += '## ✨ 주요 기능\n\n';
    const features = this.extractMainFeatures(codeComponents);
    for (const feature of features) {
      readme += `- ${feature}\n`;
    }
    readme += '\n';

    // [advice from AI] 기술 스택
    const techStack = this.analyzeTechStack(codeComponents);
    readme += '## 🛠️ 기술 스택\n\n';
    readme += '### Frontend\n';
    for (const tech of techStack.frontend) {
      readme += `- ${tech}\n`;
    }
    readme += '\n### Backend\n';
    for (const tech of techStack.backend) {
      readme += `- ${tech}\n`;
    }
    readme += '\n';

    // [advice from AI] 시작하기
    readme += '## 🏃‍♂️ 시작하기\n\n';
    readme += '### 필수 조건\n';
    readme += '- Node.js 18+\n';
    readme += '- PostgreSQL 13+\n';
    readme += '- Redis\n';
    readme += '- Docker (선택사항)\n\n';

    readme += '### 설치 및 실행\n\n';
    readme += '```bash\n';
    readme += '# 의존성 설치\n';
    readme += 'cd backend && npm install\n';
    readme += 'cd ../frontend && npm install\n\n';
    readme += '# 서버 시작\n';
    readme += 'cd ../backend && ./start-server.sh\n';
    readme += 'cd ../frontend && npm start\n';
    readme += '```\n\n';

    // [advice from AI] API 엔드포인트 요약
    const apiEndpoints = this.extractAllAPIEndpoints(codeComponents);
    if (apiEndpoints.length > 0) {
      readme += '## 🛣️ 주요 API 엔드포인트\n\n';
      
      const groupedEndpoints = this.groupEndpointsByCategory(apiEndpoints);
      for (const [category, endpoints] of groupedEndpoints) {
        readme += `### ${category}\n`;
        for (const endpoint of endpoints.slice(0, 5)) { // 상위 5개만
          readme += `- \`${endpoint.method} ${endpoint.path}\`\n`;
        }
        readme += '\n';
      }
    }

    // [advice from AI] 프로젝트 통계
    readme += '## 📊 프로젝트 통계\n\n';
    readme += `- **총 코드 파일**: ${codeComponents.length}개\n`;
    readme += `- **총 라인 수**: ${codeComponents.reduce((sum, c) => sum + (c.line_count || 0), 0).toLocaleString()}줄\n`;
    readme += `- **평균 복잡도**: ${(codeComponents.reduce((sum, c) => sum + (c.complexity_score || 0), 0) / codeComponents.length).toFixed(1)}/10\n`;
    readme += `- **API 엔드포인트**: ${apiEndpoints.length}개\n`;
    readme += `- **디자인 자산**: ${designAssets.length}개\n`;
    readme += `- **문서**: ${documents.length}개\n\n`;

    // [advice from AI] 데이터베이스에 저장
    const docData = await this.saveDocumentToDatabase({
      title: 'Project README (자동 생성)',
      content: readme,
      category: 'guide',
      format: 'markdown',
      tags: ['readme', 'project', 'auto-generated', 'documentation'],
      file_path: 'auto-generated/README.md',
      word_count: readme.split(/\s+/).length,
      auto_generated: true,
      source_components: codeComponents.map(c => c.id)
    });

    return docData;
  }

  // [advice from AI] === 유틸리티 메서드들 ===

  getSectionName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  }

  extractEndpointDescription(sourceCode, endpoint) {
    // 엔드포인트 위의 주석에서 설명 추출
    const lines = sourceCode.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(endpoint.path)) {
        // 위쪽 라인들에서 주석 찾기
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          const line = lines[j].trim();
          if (line.startsWith('//') && !line.includes('[advice from AI]')) {
            return line.replace('//', '').trim();
          }
        }
        break;
      }
    }
    return null;
  }

  extractEndpointParameters(sourceCode, endpoint) {
    // req.body, req.params, req.query에서 파라미터 추출
    const parameters = [];
    const lines = sourceCode.split('\n');
    
    for (const line of lines) {
      if (line.includes(endpoint.path)) {
        // 해당 엔드포인트 함수 내에서 파라미터 추출
        const bodyMatch = line.match(/req\.body\.(\w+)/g);
        const paramsMatch = line.match(/req\.params\.(\w+)/g);
        const queryMatch = line.match(/req\.query\.(\w+)/g);
        
        if (bodyMatch) {
          bodyMatch.forEach(match => {
            const paramName = match.replace('req.body.', '');
            parameters.push({ name: paramName, type: 'body', description: '' });
          });
        }
        
        if (paramsMatch) {
          paramsMatch.forEach(match => {
            const paramName = match.replace('req.params.', '');
            parameters.push({ name: paramName, type: 'path', description: '' });
          });
        }
        
        if (queryMatch) {
          queryMatch.forEach(match => {
            const paramName = match.replace('req.query.', '');
            parameters.push({ name: paramName, type: 'query', description: '' });
          });
        }
      }
    }
    
    return parameters;
  }

  generateResponseExample(endpoint) {
    // 기본 응답 예시 생성
    return JSON.stringify({
      success: true,
      data: {},
      message: "요청이 성공적으로 처리되었습니다."
    }, null, 2);
  }

  extractComponentProps(component) {
    const props = [];
    
    // TypeScript 인터페이스에서 Props 추출
    if (component.interfaces_list) {
      for (const interfaceItem of component.interfaces_list) {
        if (interfaceItem.name.includes('Props')) {
          // 인터페이스 정의에서 프로퍼티 추출
          const propsText = this.extractInterfaceProperties(component.source_code, interfaceItem.name);
          props.push(...this.parseInterfaceProperties(propsText));
        }
      }
    }
    
    return props;
  }

  extractInterfaceProperties(sourceCode, interfaceName) {
    const interfaceRegex = new RegExp(`interface\\s+${interfaceName}\\s*{([^}]+)}`, 's');
    const match = sourceCode.match(interfaceRegex);
    return match ? match[1] : '';
  }

  parseInterfaceProperties(propsText) {
    const props = [];
    const lines = propsText.split('\n');
    
    for (const line of lines) {
      const propMatch = line.match(/(\w+)(\?)?:\s*([^;]+)/);
      if (propMatch) {
        props.push({
          name: propMatch[1],
          required: !propMatch[2], // ? 가 없으면 필수
          type: propMatch[3].trim(),
          description: '',
          defaultValue: null
        });
      }
    }
    
    return props;
  }

  generateComponentUsageExample(component, props) {
    let example = `import ${component.name} from './${component.name}';\n\n`;
    example += `function Example() {\n`;
    example += `  return (\n`;
    example += `    <${component.name}`;
    
    // Props 예시 추가
    if (props.length > 0) {
      example += '\n';
      for (const prop of props.slice(0, 3)) { // 상위 3개만
        const exampleValue = this.generatePropExampleValue(prop.type);
        example += `      ${prop.name}={${exampleValue}}\n`;
      }
      example += '    ';
    }
    
    example += ` />\n`;
    example += `  );\n`;
    example += `}`;
    
    return example;
  }

  generatePropExampleValue(type) {
    if (type.includes('string')) return '"example"';
    if (type.includes('number')) return '42';
    if (type.includes('boolean')) return 'true';
    if (type.includes('function') || type.includes('=>')) return '() => {}';
    if (type.includes('[]')) return '[]';
    if (type.includes('{}') || type.includes('object')) return '{}';
    return '"value"';
  }

  groupComponentsByPath(components) {
    const groups = new Map();
    
    for (const component of components) {
      const pathParts = component.file_path.split('/');
      let groupName = 'Components';
      
      // components 디렉토리 하위 그룹 추출
      const compIndex = pathParts.findIndex(part => part === 'components');
      if (compIndex >= 0 && compIndex < pathParts.length - 1) {
        groupName = pathParts[compIndex + 1];
      } else if (pathParts.includes('pages')) {
        groupName = 'Pages';
      }
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName).push(component);
    }
    
    return groups;
  }

  extractFunctionDescription(jsdocComments, functionName) {
    if (!jsdocComments || typeof jsdocComments !== 'object') return null;
    
    for (const [position, comment] of Object.entries(jsdocComments)) {
      if (comment.description && comment.description.includes(functionName)) {
        return comment.description;
      }
    }
    
    return null;
  }

  extractClassMethods(sourceCode, className) {
    const methods = [];
    
    // 클래스 내부 메서드 추출
    const classRegex = new RegExp(`class\\s+${className}[^{]*{([^}]+)}`, 's');
    const classMatch = sourceCode.match(classRegex);
    
    if (classMatch) {
      const classBody = classMatch[1];
      const methodRegex = /(\w+)\s*\([^)]*\)\s*{/g;
      let match;
      
      while ((match = methodRegex.exec(classBody)) !== null) {
        methods.push({
          name: match[1],
          parameters: this.extractMethodParameters(match[0]),
          description: ''
        });
      }
    }
    
    return methods;
  }

  extractMethodParameters(methodSignature) {
    const paramMatch = methodSignature.match(/\(([^)]*)\)/);
    if (paramMatch && paramMatch[1].trim()) {
      return paramMatch[1].split(',').map(param => param.trim());
    }
    return [];
  }

  analyzeTechStack(codeComponents) {
    const frontend = new Set();
    const backend = new Set();
    const database = new Set();

    for (const component of codeComponents) {
      if (component.imports_list) {
        for (const imp of component.imports_list) {
          const module = imp.module;
          
          // Frontend 기술
          if (module.includes('react')) frontend.add('React');
          if (module.includes('@mui')) frontend.add('Material-UI');
          if (module.includes('typescript')) frontend.add('TypeScript');
          if (module.includes('axios')) frontend.add('Axios');
          
          // Backend 기술
          if (module.includes('express')) backend.add('Express.js');
          if (module.includes('jsonwebtoken')) backend.add('JWT');
          if (module.includes('bcrypt')) backend.add('bcrypt');
          if (module.includes('multer')) backend.add('Multer');
          
          // Database 기술
          if (module.includes('pg')) database.add('PostgreSQL');
          if (module.includes('redis')) database.add('Redis');
        }
      }
    }

    return {
      frontend: Array.from(frontend),
      backend: Array.from(backend),
      database: Array.from(database)
    };
  }

  generateDirectoryStructure(codeComponents) {
    const structure = new Map();
    
    for (const component of codeComponents) {
      const pathParts = component.file_path.split('/');
      let currentLevel = structure;
      
      for (const part of pathParts) {
        if (!currentLevel.has(part)) {
          currentLevel.set(part, new Map());
        }
        currentLevel = currentLevel.get(part);
      }
    }
    
    return this.renderDirectoryTree(structure, 0);
  }

  renderDirectoryTree(structure, level) {
    let result = '';
    const indent = '  '.repeat(level);
    
    for (const [name, children] of structure) {
      result += `${indent}${level === 0 ? '📁' : '├──'} ${name}\n`;
      if (children.size > 0) {
        result += this.renderDirectoryTree(children, level + 1);
      }
    }
    
    return result;
  }

  analyzeArchitecturePatterns(codeComponents) {
    let patterns = '';
    
    // MVC 패턴 확인
    const hasControllers = codeComponents.some(c => c.file_path.includes('controller'));
    const hasModels = codeComponents.some(c => c.file_path.includes('model'));
    const hasViews = codeComponents.some(c => c.file_path.includes('view') || c.file_path.includes('page'));
    
    if (hasControllers && hasModels && hasViews) {
      patterns += '- **MVC (Model-View-Controller)**: 전통적인 MVC 패턴을 사용합니다.\n';
    }

    // 컴포넌트 기반 아키텍처
    const hasComponents = codeComponents.some(c => c.file_path.includes('components/'));
    if (hasComponents) {
      patterns += '- **컴포넌트 기반 아키텍처**: 재사용 가능한 컴포넌트로 구성되어 있습니다.\n';
    }

    // 서비스 레이어
    const hasServices = codeComponents.some(c => c.file_path.includes('services/'));
    if (hasServices) {
      patterns += '- **서비스 레이어**: 비즈니스 로직이 서비스 레이어로 분리되어 있습니다.\n';
    }

    // 미들웨어 패턴
    const hasMiddleware = codeComponents.some(c => c.file_path.includes('middleware/'));
    if (hasMiddleware) {
      patterns += '- **미들웨어 패턴**: Express 미들웨어를 통한 횡단 관심사 처리를 사용합니다.\n';
    }

    return patterns || '- 특별한 아키텍처 패턴이 감지되지 않았습니다.\n';
  }

  extractMainFeatures(codeComponents) {
    const features = [];
    
    // 파일 경로 기반 기능 추출
    const pathFeatures = new Set();
    
    for (const component of codeComponents) {
      const path = component.file_path.toLowerCase();
      
      if (path.includes('auth')) pathFeatures.add('🔐 사용자 인증 및 권한 관리');
      if (path.includes('approval')) pathFeatures.add('✅ 승인 워크플로우 시스템');
      if (path.includes('monitoring')) pathFeatures.add('📊 시스템 모니터링');
      if (path.includes('catalog')) pathFeatures.add('📚 지식 카탈로그 관리');
      if (path.includes('operation')) pathFeatures.add('⚙️ 운영 관리 도구');
      if (path.includes('qa')) pathFeatures.add('🧪 QA/테스트 관리');
      if (path.includes('notification')) pathFeatures.add('🔔 알림 시스템');
      if (path.includes('admin')) pathFeatures.add('👑 관리자 도구');
    }
    
    return Array.from(pathFeatures);
  }

  extractAllAPIEndpoints(codeComponents) {
    const allEndpoints = [];
    
    for (const component of codeComponents) {
      if (component.api_endpoints) {
        for (const endpoint of component.api_endpoints) {
          allEndpoints.push({
            ...endpoint,
            source: component.name,
            file: component.file_path
          });
        }
      }
    }
    
    return allEndpoints;
  }

  groupEndpointsByCategory(endpoints) {
    const groups = new Map();
    
    for (const endpoint of endpoints) {
      let category = 'General';
      
      if (endpoint.path.includes('/auth')) category = 'Authentication';
      else if (endpoint.path.includes('/approval')) category = 'Approvals';
      else if (endpoint.path.includes('/monitoring')) category = 'Monitoring';
      else if (endpoint.path.includes('/catalog')) category = 'Catalog';
      else if (endpoint.path.includes('/operation')) category = 'Operations';
      else if (endpoint.path.includes('/qa')) category = 'QA/Testing';
      else if (endpoint.path.includes('/admin')) category = 'Administration';
      
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push(endpoint);
    }
    
    return groups;
  }

  // [advice from AI] 데이터베이스에 문서 저장
  async saveDocumentToDatabase(docData) {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO documents (
          id, title, content, category, format, tags, file_path,
          word_count, status, is_public, last_scanned_at, scan_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          word_count = EXCLUDED.word_count,
          last_scanned_at = EXCLUDED.last_scanned_at,
          scan_metadata = EXCLUDED.scan_metadata,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await client.query(query, [
        require('uuid').v4(),
        docData.title,
        docData.content,
        docData.category,
        docData.format,
        JSON.stringify(docData.tags),
        docData.file_path,
        docData.word_count,
        'published',
        true,
        JSON.stringify({
          auto_generated: docData.auto_generated,
          source_components: docData.source_components,
          generator_version: '1.0.0',
          generated_at: new Date().toISOString()
        })
      ]);

      console.log(`✅ 문서 저장됨: ${docData.title}`);
      return result.rows[0];

    } catch (error) {
      console.error('❌ 문서 저장 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 기본 API 문서 생성
  generateBasicApiDocumentation(extractedModules) {
    console.log('📊 기본 API 문서 생성 중...');
    
    let documentation = '# API 문서\n\n';
    documentation += '> 시스템 분석을 통해 생성된 기본 API 문서입니다.\n\n';
    documentation += `**생성일**: ${new Date().toLocaleString('ko-KR')}\n`;
    documentation += `**분석된 모듈**: ${extractedModules.length}개\n\n`;
    
    documentation += '## 개요\n\n';
    documentation += '이 시스템은 다음과 같은 구조를 가지고 있습니다:\n\n';
    
    const fileTypes = {};
    extractedModules.forEach(module => {
      const ext = module.file_path.split('.').pop();
      if (!fileTypes[ext]) fileTypes[ext] = 0;
      fileTypes[ext]++;
    });
    
    Object.keys(fileTypes).forEach(ext => {
      documentation += `- **${ext}** 파일: ${fileTypes[ext]}개\n`;
    });
    
    return {
      title: 'API 문서',
      content: documentation,
      category: 'api',
      format: 'md',
      tags: ['api', 'documentation', 'auto-generated']
    };
  }

  // [advice from AI] 기본 컴포넌트 문서 생성
  generateBasicComponentDocumentation(extractedModules) {
    console.log('📊 기본 컴포넌트 문서 생성 중...');
    
    let documentation = '# 컴포넌트 문서\n\n';
    documentation += '> 시스템 분석을 통해 생성된 기본 컴포넌트 문서입니다.\n\n';
    documentation += `**생성일**: ${new Date().toLocaleString('ko-KR')}\n`;
    documentation += `**분석된 모듈**: ${extractedModules.length}개\n\n`;
    
    return {
      title: '컴포넌트 문서',
      content: documentation,
      category: 'component',
      format: 'md',
      tags: ['component', 'documentation', 'auto-generated']
    };
  }

  // [advice from AI] 기본 서비스 문서 생성
  generateBasicServiceDocumentation(extractedModules) {
    console.log('📊 기본 서비스 문서 생성 중...');
    
    let documentation = '# 서비스 문서\n\n';
    documentation += '> 시스템 분석을 통해 생성된 기본 서비스 문서입니다.\n\n';
    documentation += `**생성일**: ${new Date().toLocaleString('ko-KR')}\n`;
    documentation += `**분석된 모듈**: ${extractedModules.length}개\n\n`;
    
    return {
      title: '서비스 문서',
      content: documentation,
      category: 'service',
      format: 'md',
      tags: ['service', 'documentation', 'auto-generated']
    };
  }
}

module.exports = DocumentationGenerator;
