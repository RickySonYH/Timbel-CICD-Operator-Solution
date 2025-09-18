// [advice from AI] 관계 시각화 API - 실제 데이터베이스 연동
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timbel_db',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'your_password'
});

// [advice from AI] 전체 관계 네트워크 조회 - D3.js 시각화용 데이터
router.get('/network', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // 노드 데이터 수집 (승인된 자산들)
    const nodesQuery = `
      -- 코드 컴포넌트 노드
      SELECT 
        cc.id, cc.name, cc.title, 'code_component' as type, 
        cc.approval_status, cc.usage_count, cc.rating,
        'primary' as color, 20 as size
      FROM code_components cc
      WHERE cc.approval_status = 'approved'
      
      UNION ALL
      
      -- 디자인 자산 노드
      SELECT 
        da.id, da.name, da.name as title, 'design_asset' as type,
        da.approval_status, 0 as usage_count, 0 as rating,
        'secondary' as color, 15 as size
      FROM design_assets da
      WHERE da.approval_status = 'approved'
      
      UNION ALL
      
      -- 문서 노드
      SELECT 
        d.id, d.title as name, d.title, 'document' as type,
        d.approval_status, 0 as usage_count, 0 as rating,
        'info' as color, 12 as size
      FROM documents d
      WHERE d.approval_status = 'approved'
      
      UNION ALL
      
      -- 시스템 노드
      SELECT 
        s.id, s.name, s.title, 'system' as type,
        s.approval_status, 0 as usage_count, 0 as rating,
        'success' as color, 25 as size
      FROM systems s
      WHERE s.approval_status = 'approved'
    `;
    
    const nodesResult = await client.query(nodesQuery);
    
    // 엣지 데이터 수집 (관계)
    const edgesQuery = `
      -- 지식 자산 간 관계
      SELECT 
        kar.source_id, kar.target_id, kar.relationship_type as type,
        kar.relationship_strength as strength, kar.confidence_score,
        kar.metadata,
        'knowledge_relationship' as category
      FROM knowledge_asset_relationships kar
      
      UNION ALL
      
      -- 시스템 간 의존관계
      SELECT 
        sd.source_system_id as source_id, sd.target_system_id as target_id,
        sd.dependency_type as type, 
        CASE WHEN sd.is_critical THEN 1.0 ELSE 0.7 END as strength,
        0.9 as confidence_score,
        jsonb_build_object('description', sd.description, 'is_critical', sd.is_critical) as metadata,
        'system_dependency' as category
      FROM system_dependencies sd
    `;
    
    const edgesResult = await client.query(edgesQuery);
    
    client.release();
    
    // D3.js 형식으로 데이터 변환
    const nodes = nodesResult.rows.map(node => ({
      id: node.id,
      name: node.name,
      title: node.title,
      type: node.type,
      approval_status: node.approval_status,
      usage_count: node.usage_count || 0,
      rating: node.rating || 0,
      color: node.color,
      size: node.size,
      group: getNodeGroup(node.type)
    }));
    
    const links = edgesResult.rows.map(edge => ({
      source: edge.source_id,
      target: edge.target_id,
      type: edge.type,
      strength: edge.strength || 0.5,
      confidence: edge.confidence_score || 0.5,
      metadata: edge.metadata || {},
      category: edge.category,
      strokeWidth: Math.max(1, (edge.strength || 0.5) * 5)
    }));
    
    const networkData = {
      nodes: nodes,
      links: links,
      stats: {
        totalNodes: nodes.length,
        totalLinks: links.length,
        nodeTypes: {
          code_component: nodes.filter(n => n.type === 'code_component').length,
          design_asset: nodes.filter(n => n.type === 'design_asset').length,
          document: nodes.filter(n => n.type === 'document').length,
          system: nodes.filter(n => n.type === 'system').length
        },
        linkTypes: {
          knowledge_relationship: links.filter(l => l.category === 'knowledge_relationship').length,
          system_dependency: links.filter(l => l.category === 'system_dependency').length
        }
      }
    };
    
    console.log(`관계 네트워크 생성: ${nodes.length}개 노드, ${links.length}개 링크`);
    
    res.json({
      success: true,
      data: networkData
    });
    
  } catch (error) {
    console.error('관계 네트워크 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch relationship network',
      message: error.message
    });
  }
});

// [advice from AI] 특정 자산의 관계 조회
router.get('/asset/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    // 해당 자산과 연결된 모든 관계 조회
    const relationshipsQuery = `
      SELECT 
        kar.source_id, kar.target_id, kar.relationship_type,
        kar.relationship_strength, kar.confidence_score, kar.metadata,
        -- 소스 자산 정보
        COALESCE(cc1.name, da1.name, d1.title, s1.title) as source_name,
        kar.source_type,
        -- 타겟 자산 정보  
        COALESCE(cc2.name, da2.name, d2.title, s2.title) as target_name,
        kar.target_type
      FROM knowledge_asset_relationships kar
      LEFT JOIN code_components cc1 ON kar.source_type = 'code_component' AND kar.source_id = cc1.id
      LEFT JOIN design_assets da1 ON kar.source_type = 'design_asset' AND kar.source_id = da1.id
      LEFT JOIN documents d1 ON kar.source_type = 'document' AND kar.source_id = d1.id
      LEFT JOIN systems s1 ON kar.source_type = 'system' AND kar.source_id = s1.id
      LEFT JOIN code_components cc2 ON kar.target_type = 'code_component' AND kar.target_id = cc2.id
      LEFT JOIN design_assets da2 ON kar.target_type = 'design_asset' AND kar.target_id = da2.id
      LEFT JOIN documents d2 ON kar.target_type = 'document' AND kar.target_id = d2.id
      LEFT JOIN systems s2 ON kar.target_type = 'system' AND kar.target_id = s2.id
      WHERE kar.source_id = $1 OR kar.target_id = $1
    `;
    
    const relationshipsResult = await client.query(relationshipsQuery, [id]);
    
    client.release();
    
    res.json({
      success: true,
      data: {
        assetId: id,
        relationships: relationshipsResult.rows
      }
    });
    
  } catch (error) {
    console.error('자산 관계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch asset relationships',
      message: error.message
    });
  }
});

// [advice from AI] 관계 통계 조회
router.get('/stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const statsQuery = `
      SELECT 
        'knowledge_relationships' as category,
        kar.relationship_type as type,
        COUNT(*) as count,
        AVG(kar.relationship_strength) as avg_strength
      FROM knowledge_asset_relationships kar
      GROUP BY kar.relationship_type
      
      UNION ALL
      
      SELECT 
        'system_dependencies' as category,
        sd.dependency_type as type,
        COUNT(*) as count,
        AVG(CASE WHEN sd.is_critical THEN 1.0 ELSE 0.7 END) as avg_strength
      FROM system_dependencies sd
      GROUP BY sd.dependency_type
      
      ORDER BY category, count DESC
    `;
    
    const statsResult = await client.query(statsQuery);
    
    client.release();
    
    res.json({
      success: true,
      data: statsResult.rows
    });
    
  } catch (error) {
    console.error('관계 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch relationship stats'
    });
  }
});

// [advice from AI] 노드 그룹 결정 함수
function getNodeGroup(type) {
  const groups = {
    'system': 1,
    'code_component': 2,
    'design_asset': 3,
    'document': 4
  };
  return groups[type] || 5;
}

module.exports = router;
