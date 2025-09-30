// [advice from AI] 지식 자산 관계 매핑기 - Backstage.io 스타일 자산 간 연결고리 자동 탐지

const { Pool } = require('pg');
const path = require('path');

class RelationshipMapper {
  constructor() {
    // [advice from AI] 데이터베이스 연결
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5434,
    });

    // [advice from AI] 관계 타입 정의 (Backstage.io 기반)
    this.relationshipTypes = {
      // 구현 관계
      IMPLEMENTS: 'implements', // API가 인터페이스를 구현
      DOCUMENTS: 'documents', // 문서가 API/컴포넌트를 설명
      USES: 'uses', // 컴포넌트가 다른 컴포넌트를 사용
      DEPENDS_ON: 'depends_on', // 모듈 의존성
      
      // 소유 관계
      OWNED_BY: 'owned_by', // 자산이 팀/사용자에 속함
      MAINTAINED_BY: 'maintained_by', // 유지보수 담당
      
      // 구조 관계
      PART_OF: 'part_of', // 시스템/프로젝트의 일부
      CONTAINS: 'contains', // 상위가 하위를 포함
      
      // 참조 관계
      REFERENCES: 'references', // 문서가 코드를 참조
      ILLUSTRATED_BY: 'illustrated_by', // 디자인으로 설명됨
      TESTED_BY: 'tested_by', // 테스트로 검증됨
      
      // 워크플로우 관계
      TRIGGERS: 'triggers', // 이벤트 트리거
      PROCESSES: 'processes', // 데이터 처리
      APPROVES: 'approves' // 승인 관계
    };
  }

  // [advice from AI] 전체 관계 매핑 분석
  async analyzeAllRelationships(extractedData) {
    console.log('🔗 지식 자산 관계 매핑 시작');
    
    const relationshipResults = {
      codeToCodeRelationships: [],
      codeToDocumentRelationships: [],
      codeToDesignRelationships: [],
      documentToDesignRelationships: [],
      ownershipRelationships: [],
      projectRelationships: [],
      tagRelationships: [],
      totalRelationships: 0,
      confidence: {
        high: 0, // > 0.8
        medium: 0, // 0.5 - 0.8
        low: 0 // < 0.5
      }
    };

    try {
      // [advice from AI] 1. 코드 간 의존성 관계 분석
      relationshipResults.codeToCodeRelationships = await this.analyzeCodeDependencies(extractedData);
      
      // [advice from AI] 2. 코드-문서 관계 분석
      relationshipResults.codeToDocumentRelationships = await this.analyzeCodeDocumentRelationships(extractedData);
      
      // [advice from AI] 3. 코드-디자인 관계 분석
      relationshipResults.codeToDesignRelationships = await this.analyzeCodeDesignRelationships(extractedData);
      
      // [advice from AI] 4. 문서-디자인 관계 분석
      relationshipResults.documentToDesignRelationships = await this.analyzeDocumentDesignRelationships(extractedData);
      
      // [advice from AI] 5. 소유권 관계 분석
      relationshipResults.ownershipRelationships = await this.analyzeOwnershipRelationships(extractedData);
      
      // [advice from AI] 6. 프로젝트/시스템 관계 분석
      relationshipResults.projectRelationships = await this.analyzeProjectRelationships(extractedData);
      
      // [advice from AI] 7. 태그 기반 관계 분석
      relationshipResults.tagRelationships = await this.analyzeTagRelationships(extractedData);

      // [advice from AI] 통계 계산
      const allRelationships = [
        ...relationshipResults.codeToCodeRelationships,
        ...relationshipResults.codeToDocumentRelationships,
        ...relationshipResults.codeToDesignRelationships,
        ...relationshipResults.documentToDesignRelationships,
        ...relationshipResults.ownershipRelationships,
        ...relationshipResults.projectRelationships,
        ...relationshipResults.tagRelationships
      ];

      relationshipResults.totalRelationships = allRelationships.length;
      
      // 신뢰도별 분류
      for (const rel of allRelationships) {
        if (rel.confidence_score > 0.8) relationshipResults.confidence.high++;
        else if (rel.confidence_score > 0.5) relationshipResults.confidence.medium++;
        else relationshipResults.confidence.low++;
      }

      // [advice from AI] 데이터베이스에 저장
      await this.saveRelationshipsToDatabase(allRelationships);

      console.log('✅ 관계 매핑 완료:', {
        총관계: relationshipResults.totalRelationships,
        고신뢰도: relationshipResults.confidence.high,
        중신뢰도: relationshipResults.confidence.medium,
        저신뢰도: relationshipResults.confidence.low
      });

      return relationshipResults;

    } catch (error) {
      console.error('❌ 관계 매핑 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 1. 코드 간 의존성 관계 분석
  async analyzeCodeDependencies(extractedData) {
    const { codeComponents, catalogComponents } = extractedData;
    const allComponents = [...codeComponents, ...catalogComponents];
    const relationships = [];

    for (const component of allComponents) {
      if (component.imports_list) {
        for (const importInfo of component.imports_list) {
          if (importInfo.isLocal) {
            // 로컬 모듈 의존성 찾기
            const targetComponent = this.findComponentByPath(allComponents, importInfo.module, component.file_path);
            
            if (targetComponent) {
              relationships.push({
                source_type: 'code_component',
                source_id: component.id,
                target_type: 'code_component',
                target_id: targetComponent.id,
                relationship_type: this.relationshipTypes.DEPENDS_ON,
                confidence_score: 0.95, // 코드 의존성은 매우 확실
                metadata: {
                  import_path: importInfo.module,
                  import_type: importInfo.type || 'es6',
                  detected_method: 'import_analysis'
                }
              });
            }
          }
        }
      }
    }

    return relationships;
  }

  // [advice from AI] 2. 코드-문서 관계 분석
  async analyzeCodeDocumentRelationships(extractedData) {
    const { codeComponents, catalogComponents, documents } = extractedData;
    const allComponents = [...codeComponents, ...catalogComponents];
    const relationships = [];

    for (const doc of documents) {
      for (const component of allComponents) {
        const confidence = this.calculateDocumentCodeConfidence(doc, component);
        
        if (confidence > 0.3) { // 30% 이상 신뢰도
          relationships.push({
            source_type: 'document',
            source_id: doc.id,
            target_type: 'code_component',
            target_id: component.id,
            relationship_type: this.relationshipTypes.DOCUMENTS,
            confidence_score: confidence,
            metadata: {
              matching_factors: this.getDocumentCodeMatchingFactors(doc, component),
              detected_method: 'content_analysis'
            }
          });
        }
      }
    }

    return relationships;
  }

  // [advice from AI] 3. 코드-디자인 관계 분석
  async analyzeCodeDesignRelationships(extractedData) {
    const { codeComponents, catalogComponents, designAssets } = extractedData;
    const allComponents = [...codeComponents, ...catalogComponents];
    const relationships = [];

    for (const asset of designAssets) {
      for (const component of allComponents) {
        const confidence = this.calculateCodeDesignConfidence(component, asset);
        
        if (confidence > 0.4) { // 40% 이상 신뢰도
          relationships.push({
            source_type: 'code_component',
            source_id: component.id,
            target_type: 'design_asset',
            target_id: asset.id,
            relationship_type: this.relationshipTypes.USES,
            confidence_score: confidence,
            metadata: {
              matching_factors: this.getCodeDesignMatchingFactors(component, asset),
              detected_method: 'filename_and_path_analysis'
            }
          });
        }
      }
    }

    return relationships;
  }

  // [advice from AI] 4. 문서-디자인 관계 분석
  async analyzeDocumentDesignRelationships(extractedData) {
    const { documents, designAssets } = extractedData;
    const relationships = [];

    for (const doc of documents) {
      // 문서 내 이미지 참조 분석
      if (doc.images_list) {
        for (const imageRef of doc.images_list) {
          const matchingAsset = this.findAssetByImageReference(designAssets, imageRef);
          
          if (matchingAsset) {
            relationships.push({
              source_type: 'document',
              source_id: doc.id,
              target_type: 'design_asset',
              target_id: matchingAsset.id,
              relationship_type: this.relationshipTypes.ILLUSTRATED_BY,
              confidence_score: 0.9, // 이미지 참조는 매우 확실
              metadata: {
                image_reference: imageRef,
                detected_method: 'image_reference_analysis'
              }
            });
          }
        }
      }

      // 파일명 기반 관계 분석
      for (const asset of designAssets) {
        const confidence = this.calculateDocumentDesignConfidence(doc, asset);
        
        if (confidence > 0.5) {
          relationships.push({
            source_type: 'document',
            source_id: doc.id,
            target_type: 'design_asset',
            target_id: asset.id,
            relationship_type: this.relationshipTypes.REFERENCES,
            confidence_score: confidence,
            metadata: {
              matching_factors: this.getDocumentDesignMatchingFactors(doc, asset),
              detected_method: 'filename_similarity_analysis'
            }
          });
        }
      }
    }

    return relationships;
  }

  // [advice from AI] 5. 소유권 관계 분석
  async analyzeOwnershipRelationships(extractedData) {
    const { codeComponents, catalogComponents, designAssets, documents } = extractedData;
    const allAssets = [
      ...codeComponents.map(c => ({ ...c, asset_type: 'code_component' })),
      ...catalogComponents.map(c => ({ ...c, asset_type: 'catalog_component' })),
      ...designAssets.map(c => ({ ...c, asset_type: 'design_asset' })),
      ...documents.map(c => ({ ...c, asset_type: 'document' }))
    ];
    
    const relationships = [];

    for (const asset of allAssets) {
      // [advice from AI] 파일 경로 기반 팀 소유권 추정
      const ownerInfo = this.estimateOwnershipFromPath(asset.file_path);
      
      if (ownerInfo.team) {
        relationships.push({
          source_type: asset.asset_type,
          source_id: asset.id,
          target_type: 'team',
          target_id: ownerInfo.team,
          relationship_type: this.relationshipTypes.OWNED_BY,
          confidence_score: ownerInfo.confidence,
          metadata: {
            estimation_method: 'file_path_analysis',
            path_indicators: ownerInfo.indicators
          }
        });
      }

      // [advice from AI] 도메인 관계 추정
      const domainInfo = this.estimateDomainFromPath(asset.file_path);
      
      if (domainInfo.domain) {
        relationships.push({
          source_type: asset.asset_type,
          source_id: asset.id,
          target_type: 'domain',
          target_id: domainInfo.domain,
          relationship_type: this.relationshipTypes.PART_OF,
          confidence_score: domainInfo.confidence,
          metadata: {
            domain_estimation: domainInfo,
            detected_method: 'domain_path_analysis'
          }
        });
      }
    }

    return relationships;
  }

  // [advice from AI] 6. 프로젝트/시스템 관계 분석
  async analyzeProjectRelationships(extractedData) {
    const { codeComponents, catalogComponents, designAssets, documents } = extractedData;
    const allAssets = [
      ...codeComponents.map(c => ({ ...c, asset_type: 'code_component' })),
      ...catalogComponents.map(c => ({ ...c, asset_type: 'catalog_component' })),
      ...designAssets.map(c => ({ ...c, asset_type: 'design_asset' })),
      ...documents.map(c => ({ ...c, asset_type: 'document' }))
    ];
    
    const relationships = [];

    for (const asset of allAssets) {
      // [advice from AI] 시스템 분류
      const systemInfo = this.classifyBySystem(asset.file_path);
      
      relationships.push({
        source_type: asset.asset_type,
        source_id: asset.id,
        target_type: 'system',
        target_id: systemInfo.system,
        relationship_type: this.relationshipTypes.PART_OF,
        confidence_score: systemInfo.confidence,
        metadata: {
          system_classification: systemInfo,
          lifecycle_stage: this.estimateLifecycleStage(asset),
          detected_method: 'system_classification'
        }
      });
    }

    return relationships;
  }

  // [advice from AI] 7. 태그 기반 관계 분석
  async analyzeTagRelationships(extractedData) {
    const { codeComponents, catalogComponents, designAssets, documents } = extractedData;
    const relationships = [];

    // [advice from AI] 모든 자산에 대해 자동 태그 생성
    const allAssets = [
      ...codeComponents.map(c => ({ ...c, asset_type: 'code_component' })),
      ...catalogComponents.map(c => ({ ...c, asset_type: 'catalog_component' })),
      ...designAssets.map(c => ({ ...c, asset_type: 'design_asset' })),
      ...documents.map(c => ({ ...c, asset_type: 'document' }))
    ];

    for (const asset of allAssets) {
      const autoTags = this.generateAutoTags(asset);
      
      for (const tag of autoTags) {
        relationships.push({
          source_type: asset.asset_type,
          source_id: asset.id,
          target_type: 'tag',
          target_id: tag.value,
          relationship_type: 'tagged_with',
          confidence_score: tag.confidence,
          metadata: {
            tag_type: tag.type,
            generation_method: tag.method,
            detected_method: 'auto_tagging'
          }
        });
      }
    }

    return relationships;
  }

  // [advice from AI] === 관계 분석 유틸리티 메서드들 ===

  findComponentByPath(components, importPath, fromPath) {
    const fromDir = path.dirname(fromPath);
    
    try {
      // 상대 경로 해석
      let resolvedPath = path.resolve(fromDir, importPath);
      resolvedPath = path.relative(process.cwd(), resolvedPath);
      
      // 정확한 경로 매치
      let found = components.find(c => c.file_path === resolvedPath);
      if (found) return found;
      
      // 확장자 추가 시도
      const extensions = ['.js', '.ts', '.tsx', '.jsx'];
      for (const ext of extensions) {
        const withExt = resolvedPath + ext;
        found = components.find(c => c.file_path === withExt);
        if (found) return found;
      }
      
      // index 파일 시도
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, 'index' + ext);
        found = components.find(c => c.file_path === indexPath);
        if (found) return found;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  calculateDocumentCodeConfidence(doc, component) {
    let confidence = 0;
    const factors = [];

    // [advice from AI] 파일명 유사도
    const docName = path.basename(doc.file_path, path.extname(doc.file_path)).toLowerCase();
    const compName = component.name.toLowerCase();
    
    if (docName.includes(compName) || compName.includes(docName)) {
      confidence += 0.4;
      factors.push('filename_similarity');
    }

    // [advice from AI] 경로 유사도
    const docPath = doc.file_path.toLowerCase();
    const compPath = component.file_path.toLowerCase();
    const commonPathParts = this.getCommonPathParts(docPath, compPath);
    
    if (commonPathParts.length > 1) {
      confidence += 0.3 * (commonPathParts.length / Math.max(docPath.split('/').length, compPath.split('/').length));
      factors.push('path_similarity');
    }

    // [advice from AI] 내용 기반 매칭
    if (doc.content && component.name) {
      const contentLower = doc.content.toLowerCase();
      const componentNameLower = component.name.toLowerCase();
      
      if (contentLower.includes(componentNameLower)) {
        confidence += 0.3;
        factors.push('content_reference');
      }
    }

    // [advice from AI] API 엔드포인트 매칭
    if (component.api_endpoints && component.api_endpoints.length > 0) {
      for (const endpoint of component.api_endpoints) {
        if (doc.content && doc.content.includes(endpoint.path)) {
          confidence += 0.2;
          factors.push('api_endpoint_reference');
          break;
        }
      }
    }

    return Math.min(confidence, 1.0);
  }

  calculateCodeDesignConfidence(component, asset) {
    let confidence = 0;

    // [advice from AI] 파일명 매칭
    const compName = component.name.toLowerCase();
    const assetName = asset.name.toLowerCase();
    
    if (compName.includes(assetName) || assetName.includes(compName)) {
      confidence += 0.5;
    }

    // [advice from AI] 경로 유사도
    const compPath = component.file_path.toLowerCase();
    const assetPath = asset.file_path.toLowerCase();
    const commonParts = this.getCommonPathParts(compPath, assetPath);
    
    if (commonParts.length > 0) {
      confidence += 0.3;
    }

    // [advice from AI] 소스 코드에서 자산 참조 확인
    if (component.source_code && asset.file_path) {
      const assetFileName = path.basename(asset.file_path);
      if (component.source_code.includes(assetFileName)) {
        confidence += 0.4;
      }
    }

    return Math.min(confidence, 1.0);
  }

  calculateDocumentDesignConfidence(doc, asset) {
    let confidence = 0;

    // [advice from AI] 이미지 참조 확인
    if (doc.images_list) {
      for (const imageRef of doc.images_list) {
        if (imageRef.src.includes(asset.name) || asset.file_path.includes(imageRef.src)) {
          confidence += 0.6;
          break;
        }
      }
    }

    // [advice from AI] 파일명 유사도
    const docName = path.basename(doc.file_path, path.extname(doc.file_path)).toLowerCase();
    const assetName = asset.name.toLowerCase();
    
    if (docName.includes(assetName) || assetName.includes(docName)) {
      confidence += 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  estimateOwnershipFromPath(filePath) {
    const pathLower = filePath.toLowerCase();
    const pathParts = filePath.split('/');

    // [advice from AI] 경로 기반 팀 추정
    if (pathLower.includes('admin')) {
      return { team: 'admin-team', confidence: 0.8, indicators: ['admin_path'] };
    }
    if (pathLower.includes('auth')) {
      return { team: 'security-team', confidence: 0.7, indicators: ['auth_path'] };
    }
    if (pathLower.includes('approval')) {
      return { team: 'workflow-team', confidence: 0.8, indicators: ['approval_path'] };
    }
    if (pathLower.includes('monitoring') || pathLower.includes('operation')) {
      return { team: 'devops-team', confidence: 0.8, indicators: ['ops_path'] };
    }
    if (pathLower.includes('qa') || pathLower.includes('test')) {
      return { team: 'qa-team', confidence: 0.8, indicators: ['qa_path'] };
    }
    if (pathLower.includes('frontend') || pathLower.includes('component')) {
      return { team: 'frontend-team', confidence: 0.7, indicators: ['frontend_path'] };
    }
    if (pathLower.includes('backend') || pathLower.includes('api') || pathLower.includes('route')) {
      return { team: 'backend-team', confidence: 0.7, indicators: ['backend_path'] };
    }

    return { team: 'unknown-team', confidence: 0.1, indicators: ['no_clear_indicators'] };
  }

  estimateDomainFromPath(filePath) {
    const pathLower = filePath.toLowerCase();

    if (pathLower.includes('auth') || pathLower.includes('security')) {
      return { domain: 'authentication', confidence: 0.9 };
    }
    if (pathLower.includes('approval') || pathLower.includes('workflow')) {
      return { domain: 'workflow', confidence: 0.9 };
    }
    if (pathLower.includes('catalog') || pathLower.includes('knowledge')) {
      return { domain: 'knowledge-management', confidence: 0.8 };
    }
    if (pathLower.includes('monitoring') || pathLower.includes('metric')) {
      return { domain: 'monitoring', confidence: 0.8 };
    }
    if (pathLower.includes('operation') || pathLower.includes('deploy')) {
      return { domain: 'operations', confidence: 0.8 };
    }
    if (pathLower.includes('qa') || pathLower.includes('test')) {
      return { domain: 'quality-assurance', confidence: 0.8 };
    }

    return { domain: 'general', confidence: 0.3 };
  }

  classifyBySystem(filePath) {
    const pathLower = filePath.toLowerCase();

    if (pathLower.includes('frontend') || pathLower.includes('components') || pathLower.includes('pages')) {
      return { system: 'frontend-system', confidence: 0.9 };
    }
    if (pathLower.includes('backend') || pathLower.includes('routes') || pathLower.includes('services')) {
      return { system: 'backend-system', confidence: 0.9 };
    }
    if (pathLower.includes('database') || pathLower.includes('migration')) {
      return { system: 'database-system', confidence: 0.8 };
    }
    if (pathLower.includes('docs') || pathLower.includes('documentation')) {
      return { system: 'documentation-system', confidence: 0.8 };
    }

    return { system: 'unknown-system', confidence: 0.2 };
  }

  estimateLifecycleStage(asset) {
    // [advice from AI] 파일 경로와 내용 기반 생명주기 단계 추정
    const pathLower = asset.file_path.toLowerCase();
    
    if (pathLower.includes('draft') || pathLower.includes('wip')) return 'development';
    if (pathLower.includes('test') || pathLower.includes('spec')) return 'testing';
    if (pathLower.includes('deprecated') || pathLower.includes('old')) return 'deprecated';
    
    // 기본값: 활성
    return 'active';
  }

  generateAutoTags(asset) {
    const tags = [];

    // [advice from AI] 경로 기반 태그
    const pathParts = asset.file_path.split('/').filter(part => 
      part !== 'src' && part !== 'components' && part.length > 2
    );
    
    for (const part of pathParts) {
      tags.push({
        value: part,
        type: 'path',
        confidence: 0.7,
        method: 'path_analysis'
      });
    }

    // [advice from AI] 타입 기반 태그
    if (asset.type) {
      tags.push({
        value: asset.type.toLowerCase().replace(/\s+/g, '-'),
        type: 'component_type',
        confidence: 0.9,
        method: 'type_analysis'
      });
    }

    // [advice from AI] 언어 기반 태그
    if (asset.language) {
      tags.push({
        value: asset.language,
        type: 'technology',
        confidence: 0.95,
        method: 'language_detection'
      });
    }

    // [advice from AI] 프레임워크 기반 태그
    if (asset.framework) {
      tags.push({
        value: asset.framework.toLowerCase(),
        type: 'technology',
        confidence: 0.9,
        method: 'framework_detection'
      });
    }

    return tags;
  }

  // [advice from AI] === 헬퍼 메서드들 ===

  getCommonPathParts(path1, path2) {
    const parts1 = path1.split('/');
    const parts2 = path2.split('/');
    const common = [];

    const minLength = Math.min(parts1.length, parts2.length);
    for (let i = 0; i < minLength; i++) {
      if (parts1[i] === parts2[i]) {
        common.push(parts1[i]);
      } else {
        break;
      }
    }

    return common;
  }

  getDocumentCodeMatchingFactors(doc, component) {
    const factors = [];
    
    if (doc.title && component.name && doc.title.toLowerCase().includes(component.name.toLowerCase())) {
      factors.push('title_contains_component_name');
    }
    
    if (doc.content && component.name && doc.content.includes(component.name)) {
      factors.push('content_mentions_component');
    }
    
    return factors;
  }

  getCodeDesignMatchingFactors(component, asset) {
    const factors = [];
    
    if (component.source_code && asset.name && component.source_code.includes(asset.name)) {
      factors.push('code_references_asset');
    }
    
    const compPath = component.file_path.split('/');
    const assetPath = asset.file_path.split('/');
    const commonParts = this.getCommonPathParts(component.file_path, asset.file_path);
    
    if (commonParts.length > 1) {
      factors.push('similar_directory_structure');
    }
    
    return factors;
  }

  getDocumentDesignMatchingFactors(doc, asset) {
    const factors = [];
    
    if (doc.images_list && doc.images_list.some(img => img.src.includes(asset.name))) {
      factors.push('document_references_image');
    }
    
    return factors;
  }

  findAssetByImageReference(designAssets, imageRef) {
    return designAssets.find(asset => 
      imageRef.src.includes(asset.name) || 
      asset.file_path.includes(imageRef.src) ||
      asset.name.toLowerCase().includes(path.basename(imageRef.src, path.extname(imageRef.src)).toLowerCase())
    );
  }

  // [advice from AI] 데이터베이스에 관계 저장
  async saveRelationshipsToDatabase(relationships) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // [advice from AI] 기존 자동 탐지 관계 삭제
      await client.query('DELETE FROM knowledge_asset_relationships WHERE auto_detected = true');

      // [advice from AI] 새로운 관계 삽입
      for (const rel of relationships) {
        const query = `
          INSERT INTO knowledge_asset_relationships (
            source_type, source_id, target_type, target_id,
            relationship_type, relationship_strength, confidence_score,
            auto_detected, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        // [advice from AI] UUID 검증 및 변환
        const isValidUUID = (str) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        };

        // UUID가 아닌 경우 스킵
        if (!isValidUUID(rel.source_id) || !isValidUUID(rel.target_id)) {
          console.warn(`⚠️ 유효하지 않은 UUID 스킵: ${rel.source_id} → ${rel.target_id}`);
          continue;
        }

        await client.query(query, [
          rel.source_type,
          rel.source_id,
          rel.target_type,
          rel.target_id,
          rel.relationship_type,
          rel.relationship_strength || 1.0,
          rel.confidence_score,
          true,
          JSON.stringify(rel.metadata)
        ]);
      }

      await client.query('COMMIT');
      console.log(`✅ ${relationships.length}개 관계 저장 완료`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ 관계 저장 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = RelationshipMapper;
