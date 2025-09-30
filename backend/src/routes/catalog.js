// [advice from AI] 카탈로그 API - 승인된 지식 자산 조회 및 통계
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timbel_knowledge',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'your_password'
});

// [advice from AI] 카탈로그 통계 조회 - 실제 데이터베이스 연동
router.get('/stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // 승인된 도메인 수
    const domainsResult = await client.query(`
      SELECT COUNT(*) as count FROM domains
    `);
    
    // 승인된 시스템 수
    const systemsResult = await client.query(`
      SELECT COUNT(*) as count FROM systems WHERE approval_status = 'approved'
    `);
    
    // 자산별 통계 (승인된 것만)
    const assetsStats = await client.query(`
      SELECT 
        'code' as type, COUNT(*) as count FROM code_components WHERE status = 'active'
      UNION ALL
      SELECT 
        'design' as type, COUNT(*) as count FROM design_assets WHERE status = 'active'
      UNION ALL
      SELECT 
        'document' as type, COUNT(*) as count FROM documents WHERE status = 'active'
      UNION ALL
      SELECT 
        'catalog' as type, COUNT(*) as count FROM catalog_components WHERE status = 'active'
    `);
    
    // 최근 등록된 자산 (승인된 것만, 시스템 정보 포함)
    const recentAssets = await client.query(`
      SELECT 
        cc.id, cc.name, 'code' as type, cc.created_at,
        COALESCE(s.title, 'Unknown System') as systemName,
        COALESCE(d.name, 'Unknown Domain') as domainName
      FROM code_components cc
      LEFT JOIN systems s ON cc.created_by = s.created_by
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE cc.status = 'active'
      UNION ALL
      SELECT 
        da.id, da.name, 'design' as type, da.created_at,
        COALESCE(s.title, 'Unknown System') as systemName,
        COALESCE(d.name, 'Unknown Domain') as domainName
      FROM design_assets da
      LEFT JOIN systems s ON da.created_by = s.created_by
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE da.status = 'active'
      UNION ALL
      SELECT 
        doc.id, doc.title as name, 'document' as type, doc.created_at,
        COALESCE(s.title, 'Unknown System') as systemName,
        COALESCE(d.name, 'Unknown Domain') as domainName
      FROM documents doc
      LEFT JOIN systems s ON doc.author_id = s.created_by
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE doc.status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // 인기 자산 (사용 횟수 기준, 실제 usage_count 활용)
    const popularAssets = await client.query(`
      SELECT 
        cc.id, cc.name, 'code' as type, cc.usage_count, cc.rating,
        COALESCE(s.title, 'Unknown System') as systemName,
        COALESCE(d.name, 'Unknown Domain') as domainName
      FROM code_components cc
      LEFT JOIN systems s ON cc.created_by = s.created_by
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE cc.status = 'active' AND cc.usage_count > 0
      ORDER BY cc.usage_count DESC, cc.rating DESC NULLS LAST
      LIMIT 10
    `);
    
    client.release();
    
    // 데이터 가공
    const assetsByType = {
      code: 0,
      design: 0,
      document: 0,
      catalog: 0
    };
    
    assetsStats.rows.forEach(row => {
      assetsByType[row.type] = parseInt(row.count);
    });
    
    const totalAssets = Object.values(assetsByType).reduce((sum, count) => sum + count, 0);
    
    const stats = {
      totalDomains: parseInt(domainsResult.rows[0].count),
      totalSystems: parseInt(systemsResult.rows[0].count),
      totalAssets: totalAssets,
      assetsByType: assetsByType,
      recentAssets: recentAssets.rows,
      popularAssets: popularAssets.rows
    };
    
    console.log('카탈로그 통계:', stats); // [advice from AI] 디버깅용 로그
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('카탈로그 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch catalog stats',
      message: error.message
    });
  }
});

// [advice from AI] 통합 검색
router.get('/search', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        message: '검색어는 2글자 이상 입력해주세요.'
      });
    }
    
    const searchTerm = `%${q.trim()}%`;
    const client = await pool.connect();
    
    // 통합 검색 (코드 컴포넌트, 디자인 자산, 문서)
    const searchResults = await client.query(`
      SELECT 
        cc.id, cc.name, cc.title as description, 'code' as type,
        cc.usage_count, cc.created_at as last_used,
        'Unknown System' as systemName, 'Unknown Domain' as domainName,
        '/catalog/code-components' as path
      FROM code_components cc
      WHERE cc.status = 'active' 
        AND (cc.name ILIKE $1 OR cc.title ILIKE $1 OR cc.description ILIKE $1)
      
      UNION ALL
      
      SELECT 
        da.id, da.name, da.description, 'design' as type,
        0 as usage_count, da.created_at as last_used,
        'Unknown System' as systemName, 'Unknown Domain' as domainName,
        '/catalog/design-assets' as path
      FROM design_assets da
      WHERE da.status = 'active'
        AND (da.name ILIKE $1 OR da.description ILIKE $1)
      
      UNION ALL
      
      SELECT 
        d.id, d.title as name, d.content as description, 'document' as type,
        0 as usage_count, d.created_at as last_used,
        'Unknown System' as systemName, 'Unknown Domain' as domainName,
        '/catalog/documents' as path
      FROM documents d
      WHERE d.status = 'active'
        AND (d.title ILIKE $1 OR d.content ILIKE $1)
      
      ORDER BY usage_count DESC, last_used DESC
      LIMIT 50
    `, [searchTerm]);
    
    client.release();
    
    res.json({
      success: true,
      data: searchResults.rows
    });
    
  } catch (error) {
    console.error('통합 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// [advice from AI] 도메인 목록 조회 - 실제 데이터베이스 연동
router.get('/domains', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const domainsResult = await client.query(`
      SELECT 
        d.id, d.name, d.description, d.business_area, d.region,
        d.contact_person, d.contact_email, d.priority_level,
        d.created_at, d.updated_at, d.total_systems, d.active_systems,
        COUNT(s.id) as approved_systems_count,
        u.full_name as created_by_name
      FROM domains d
      LEFT JOIN systems s ON d.id = s.domain_id AND s.approval_status = 'approved'
      LEFT JOIN timbel_users u ON d.created_by = u.id
      GROUP BY d.id, d.name, d.description, d.business_area, d.region,
               d.contact_person, d.contact_email, d.priority_level,
               d.created_at, d.updated_at, d.total_systems, d.active_systems,
               u.full_name
      ORDER BY 
        CASE d.priority_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END, 
        d.name
    `);
    
    client.release();
    
    console.log(`도메인 조회 완료: ${domainsResult.rows.length}개`); // [advice from AI] 디버깅용 로그
    
    res.json({
      success: true,
      data: domainsResult.rows
    });
    
  } catch (error) {
    console.error('도메인 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch domains',
      message: error.message
    });
  }
});

// [advice from AI] 시스템 목록 조회 - 실제 데이터베이스 연동
router.get('/systems', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { domain_id } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT 
        s.id, s.name, s.description, s.version, s.status,
        s.code_quality_score, s.approval_status,
        s.created_at, s.updated_at,
        d.name as domain_name,
        u.full_name as owner_name,
        pc.full_name as primary_contact_name,
        tl.full_name as technical_lead_name,
        bo.full_name as business_owner_name,
        cb.full_name as created_by_name
      FROM systems s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN timbel_users u ON s.owner_id = u.id
      LEFT JOIN timbel_users pc ON s.primary_contact = pc.id
      LEFT JOIN timbel_users tl ON s.technical_lead = tl.id
      LEFT JOIN timbel_users bo ON s.business_owner = bo.id
      LEFT JOIN timbel_users cb ON s.created_by = cb.id
      WHERE s.approval_status = 'approved'
    `;
    
    const params = [];
    
    if (domain_id) {
      query += ' AND s.domain_id = $1';
      params.push(domain_id);
    }
    
    query += ' ORDER BY s.code_quality_score DESC NULLS LAST, s.created_at DESC';
    
    const systemsResult = await client.query(query, params);
    
    client.release();
    
    console.log(`시스템 조회 완료: ${systemsResult.rows.length}개 (domain_id: ${domain_id || 'all'})`); // [advice from AI] 디버깅용 로그
    
    res.json({
      success: true,
      data: systemsResult.rows
    });
    
  } catch (error) {
    console.error('시스템 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch systems',
      message: error.message
    });
  }
});

// [advice from AI] 컴포넌트 목록 조회 (타입별 필터링 지원)
router.get('/components', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { type, system_id, limit = 50, offset = 0 } = req.query;
    const client = await pool.connect();
    
    let results = [];
    
    // 타입별 또는 전체 컴포넌트 조회
    if (!type || type === 'code') {
      const codeQuery = `
        SELECT 
          cc.id, cc.name, cc.title, cc.description, cc.type, cc.language, cc.framework,
          cc.complexity_score, cc.line_count, cc.usage_count, cc.rating,
          cc.created_at, cc.updated_at, cc.approval_status, 'code' as asset_type,
          u.full_name as created_by_name
        FROM code_components cc
        LEFT JOIN timbel_users u ON cc.created_by = u.id
        WHERE cc.status = 'active'
        ORDER BY 
          CASE cc.approval_status 
            WHEN 'approved' THEN 1 
            WHEN 'pending' THEN 2 
            WHEN 'draft' THEN 3 
            ELSE 4 
          END,
          cc.usage_count DESC, cc.rating DESC
        LIMIT $1 OFFSET $2
      `;
      
      const codeResult = await client.query(codeQuery, [limit, offset]);
      results = results.concat(codeResult.rows);
    }
    
    if (!type || type === 'design') {
      const designQuery = `
        SELECT 
          da.id, da.name, da.name as title, da.description, da.category as type, 
          da.file_type as language, '' as framework,
          0 as complexity_score, 0 as line_count, 0 as usage_count, 0 as rating,
          da.created_at, da.updated_at, da.approval_status, 'design' as asset_type,
          u.full_name as created_by_name
        FROM design_assets da
        LEFT JOIN timbel_users u ON da.created_by = u.id
        WHERE da.status = 'active'
        ORDER BY 
          CASE da.approval_status 
            WHEN 'approved' THEN 1 
            WHEN 'pending' THEN 2 
            WHEN 'draft' THEN 3 
            ELSE 4 
          END,
          da.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const designResult = await client.query(designQuery, [limit, offset]);
      results = results.concat(designResult.rows);
    }
    
    if (!type || type === 'document') {
      const docQuery = `
        SELECT 
          d.id, d.title as name, d.title, d.content as description, d.category as type,
          d.format as language, '' as framework,
          0 as complexity_score, d.word_count as line_count, 0 as usage_count, 0 as rating,
          d.created_at, d.updated_at, d.approval_status, 'document' as asset_type,
          u.full_name as created_by_name
        FROM documents d
        LEFT JOIN timbel_users u ON d.author_id = u.id
        WHERE d.status = 'active'
        ORDER BY 
          CASE d.approval_status 
            WHEN 'approved' THEN 1 
            WHEN 'pending' THEN 2 
            WHEN 'draft' THEN 3 
            ELSE 4 
          END,
          d.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const docResult = await client.query(docQuery, [limit, offset]);
      results = results.concat(docResult.rows);
    }
    
    client.release();
    
    // 정렬 (사용횟수 > 평점 > 생성일)
    results.sort((a, b) => {
      if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    res.json({
      success: true,
      data: results.slice(0, limit)
    });
    
  } catch (error) {
    console.error('컴포넌트 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch components'
    });
  }
});

// [advice from AI] 자산 사용 기록 - 실제 데이터베이스 연동
router.post('/assets/:id/use', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, asset_type } = req.body; // 'view', 'download', 'copy', 'clone', 'use'
    const userId = req.user.userId;
    
    const client = await pool.connect();
    
    // 자산 타입 자동 감지 (asset_type이 없는 경우)
    let detectedType = asset_type;
    if (!detectedType) {
      const typeCheck = await client.query(`
        SELECT 'code' as type FROM code_components WHERE id = $1
        UNION ALL
        SELECT 'design' as type FROM design_assets WHERE id = $1
        UNION ALL
        SELECT 'document' as type FROM documents WHERE id = $1
        UNION ALL
        SELECT 'catalog' as type FROM catalog_components WHERE id = $1
        LIMIT 1
      `, [id]);
      
      if (typeCheck.rows.length > 0) {
        detectedType = typeCheck.rows[0].type;
      }
    }
    
    // 사용 기록 저장
    await client.query(`
      INSERT INTO asset_usage_logs (asset_id, asset_type, user_id, action, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      id, 
      detectedType || 'unknown', 
      userId, 
      action, 
      JSON.stringify({
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      })
    ]);
    
    // 타입별 usage_count 증가
    if (detectedType === 'code') {
      await client.query(`
        UPDATE code_components 
        SET usage_count = COALESCE(usage_count, 0) + 1, updated_at = NOW()
        WHERE id = $1 AND approval_status = 'approved'
    `, [id]);
    }
    
    client.release();
    
    console.log(`자산 사용 기록: ${detectedType} ${id} - ${action} by ${userId}`); // [advice from AI] 디버깅용 로그
    
    res.json({
      success: true,
      message: '사용 기록이 저장되었습니다.',
      data: {
        asset_id: id,
        asset_type: detectedType,
        action: action
      }
    });
    
  } catch (error) {
    console.error('자산 사용 기록 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record asset usage',
      message: error.message
    });
  }
});

module.exports = router;