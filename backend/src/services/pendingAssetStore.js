// [advice from AI] 추출된 자산을 pending_knowledge_assets 테이블에 저장하는 서비스

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class PendingAssetStore {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
  }

  // [advice from AI] 추출된 자산들을 pending 테이블에 저장
  async storePendingKnowledgeAssets(extractedAssets, approvalRequestId, extractionId, systemInfo = {}, sourceInfo = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log(`💾 pending 자산 저장 시작: ${extractedAssets.length}개 자산`);
      
      let savedCount = 0;
      
      for (const asset of extractedAssets) {
        try {
          // [advice from AI] 자산 타입별 데이터 정리
          const assetData = this.prepareAssetData(asset);
          
          await client.query(`
            INSERT INTO pending_knowledge_assets (
              id, extraction_id, approval_request_id, asset_type, asset_data, 
              system_info, source_info, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          `, [
            uuidv4(),
            extractionId,
            approvalRequestId,
            this.mapAssetType(asset.type || asset.assetType),
            JSON.stringify(assetData),
            JSON.stringify(systemInfo),
            JSON.stringify(sourceInfo),
            'pending'
          ]);
          
          savedCount++;
          
        } catch (assetError) {
          console.warn(`자산 저장 실패: ${asset.name || asset.title}`, assetError.message);
        }
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ pending 자산 저장 완료: ${savedCount}/${extractedAssets.length}개`);
      
      return {
        success: true,
        savedCount: savedCount,
        totalAssets: extractedAssets.length
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ pending 자산 저장 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 자산 데이터 준비 및 정리
  prepareAssetData(asset) {
    // 공통 필드 추출
    const baseData = {
      id: asset.id || uuidv4(),
      name: asset.name || asset.title || 'Unknown Asset',
      description: asset.description || '',
      file_path: asset.file_path || asset.path || '',
      created_at: asset.created_at || new Date().toISOString(),
      updated_at: asset.updated_at || new Date().toISOString()
    };

    // 자산 타입별 특화 데이터
    switch (asset.type || asset.assetType) {
      case 'code_component':
      case 'code':
        return {
          ...baseData,
          language: asset.language || '',
          content: asset.content || asset.source_code || '',
          dependencies: asset.dependencies || {},
          complexity_score: asset.complexity_score || 0,
          line_count: asset.line_count || 0,
          functions: asset.functions || [],
          classes: asset.classes || [],
          imports: asset.imports || [],
          exports: asset.exports || []
        };

      case 'document':
        return {
          ...baseData,
          content: asset.content || '',
          format: asset.format || 'md',
          word_count: asset.word_count || 0,
          headings: asset.headings_structure || [],
          links: asset.links_list || [],
          code_blocks: asset.code_blocks || []
        };

      case 'design_asset':
      case 'design':
        return {
          ...baseData,
          file_type: asset.file_type || asset.type || '',
          file_size: asset.file_size || asset.size || 0,
          dimensions: asset.dimensions || {},
          color_palette: asset.color_palette || [],
          design_system: asset.design_system || ''
        };

      case 'catalog_component':
      case 'catalog':
        return {
          ...baseData,
          category: asset.category || '',
          tags: asset.tags || [],
          usage_count: asset.usage_count || 0,
          version: asset.version || '1.0.0',
          api_endpoints: asset.api_endpoints || [],
          schema: asset.schema || {}
        };

      default:
        return baseData;
    }
  }

  // [advice from AI] 자산 타입 매핑
  mapAssetType(type) {
    const typeMap = {
      'code': 'code_component',
      'design': 'design_asset',
      'document': 'document',
      'catalog': 'catalog_component'
    };
    
    return typeMap[type] || type || 'catalog_component';
  }

  // [advice from AI] pending 자산을 정식 테이블로 이동 (승인 완료 시)
  async movePendingAssetsToMain(approvalRequestId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log(`🔄 승인 완료 자산 이동 시작: ${approvalRequestId}`);
      
      // pending 자산들 조회
      const pendingResult = await client.query(`
        SELECT * FROM pending_knowledge_assets 
        WHERE approval_request_id = $1 AND status = 'pending'
      `, [approvalRequestId]);
      
      const pendingAssets = pendingResult.rows;
      let movedCount = 0;
      
      for (const asset of pendingAssets) {
        try {
          const assetData = JSON.parse(asset.asset_data);
          
          // 자산 타입별로 정식 테이블에 삽입
          switch (asset.asset_type) {
            case 'code_component':
              await this.insertCodeComponent(client, assetData);
              break;
            case 'design_asset':
              await this.insertDesignAsset(client, assetData);
              break;
            case 'document':
              await this.insertDocument(client, assetData);
              break;
            case 'catalog_component':
              await this.insertCatalogComponent(client, assetData);
              break;
          }
          
          // pending 자산 상태를 승인됨으로 업데이트
          await client.query(`
            UPDATE pending_knowledge_assets 
            SET status = 'approved', updated_at = NOW() 
            WHERE id = $1
          `, [asset.id]);
          
          movedCount++;
          
        } catch (assetError) {
          console.warn(`자산 이동 실패: ${asset.id}`, assetError.message);
        }
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ 자산 이동 완료: ${movedCount}/${pendingAssets.length}개`);
      
      return {
        success: true,
        movedCount: movedCount,
        totalAssets: pendingAssets.length
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ 자산 이동 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 코드 컴포넌트 삽입
  async insertCodeComponent(client, assetData) {
    return await client.query(`
      INSERT INTO code_components (
        id, name, description, content, language, file_path, 
        dependencies, complexity_score, line_count, 
        creator_id, approval_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        content = EXCLUDED.content,
        updated_at = NOW()
    `, [
      assetData.id,
      assetData.name,
      assetData.description,
      assetData.content,
      assetData.language,
      assetData.file_path,
      JSON.stringify(assetData.dependencies || {}),
      assetData.complexity_score || 0,
      assetData.line_count || 0,
      assetData.creator_id || null,
      'approved',
      'active'
    ]);
  }

  // [advice from AI] 문서 삽입
  async insertDocument(client, assetData) {
    return await client.query(`
      INSERT INTO documents (
        id, title, content, format, file_path, word_count,
        headings_structure, links_list, code_blocks,
        author_id, approval_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    `, [
      assetData.id,
      assetData.name,
      assetData.content,
      assetData.format || 'md',
      assetData.file_path,
      assetData.word_count || 0,
      JSON.stringify(assetData.headings || []),
      JSON.stringify(assetData.links || []),
      JSON.stringify(assetData.code_blocks || []),
      assetData.author_id || null,
      'approved',
      'active'
    ]);
  }

  // [advice from AI] 디자인 자산 삽입
  async insertDesignAsset(client, assetData) {
    return await client.query(`
      INSERT INTO design_assets (
        id, name, description, file_path, file_type, file_size,
        creator_id, approval_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = NOW()
    `, [
      assetData.id,
      assetData.name,
      assetData.description,
      assetData.file_path,
      assetData.file_type,
      assetData.file_size || 0,
      assetData.creator_id || null,
      'approved',
      'active'
    ]);
  }

  // [advice from AI] 카탈로그 컴포넌트 삽입
  async insertCatalogComponent(client, assetData) {
    return await client.query(`
      INSERT INTO catalog_components (
        id, name, description, category, tags, version,
        created_by, approval_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = NOW()
    `, [
      assetData.id,
      assetData.name,
      assetData.description,
      assetData.category || 'general',
      assetData.tags || [],
      assetData.version || '1.0.0',
      assetData.created_by || null,
      'approved',
      'active'
    ]);
  }
}

// [advice from AI] 단일 함수로 export (기존 코드와의 호환성)
async function storePendingKnowledgeAssets(extractedAssets, approvalRequestId, extractionId, systemInfo = {}, sourceInfo = {}) {
  const store = new PendingAssetStore();
  return await store.storePendingKnowledgeAssets(extractedAssets, approvalRequestId, extractionId, systemInfo, sourceInfo);
}

module.exports = {
  PendingAssetStore,
  storePendingKnowledgeAssets
};
