// [advice from AI] 코드 컴포넌트 등록 관리 API - 모든 상태 조회용
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] PostgreSQL 연결 풀
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 코드 컴포넌트 목록 조회 - 등록 관리용 (모든 상태)
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const { page = 1, limit = 20, search = '', type = '', status = '', sort = 'created_at:desc' } = req.query;
    const offset = (page - 1) * limit;
    
    // 검색 조건 구성
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(cc.name ILIKE $${paramIndex} OR cc.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (type) {
      whereConditions.push(`cc.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`cc.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 정렬 조건
    const [sortField, sortOrder] = sort.split(':');
    const orderBy = `ORDER BY cc.${sortField} ${sortOrder.toUpperCase()}`;
    
    // 전체 수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM code_components cc
      LEFT JOIN timbel_users cb ON cc.creator_id = cb.id
      ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].total);
    
    // 데이터 조회
    const dataQuery = `
      SELECT 
        cc.id, cc.name, cc.description, cc.type, cc.version,
        cc.language, cc.framework, cc.dependencies,
        cc.file_info, cc.usage_example, cc.source_type, cc.source_url, cc.source_info, cc.download_count,
        cc.status, cc.created_at, cc.updated_at,
        cb.full_name as creator_id_name,
        cb.email as creator_id_email
      FROM code_components cc
      LEFT JOIN timbel_users cb ON cc.creator_id = cb.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const dataResult = await client.query(dataQuery, queryParams);
    
    // 통계 조회
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN cc.status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN cc.status = 'archived' THEN 1 END) as archived,
        COUNT(CASE WHEN cc.status = 'deprecated' THEN 1 END) as deprecated,
        AVG(cc.download_count) as avg_downloads
      FROM code_components cc
      LEFT JOIN timbel_users cb ON cc.creator_id = cb.id
      ${whereClause.replace('cc.', 'cc.')}
    `;
    
    const statsResult = await client.query(statsQuery, queryParams.slice(0, -2)); // LIMIT, OFFSET 제외
    
    client.release();
    
    console.log(`코드 컴포넌트 등록 관리 조회: ${dataResult.rows.length}개 (전체 ${totalItems}개)`);
    
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      },
      stats: statsResult.rows[0]
    });
    
  } catch (error) {
    console.error('코드 컴포넌트 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch code components',
      message: error.message
    });
  }
});

// [advice from AI] 코드 컴포넌트 상세 조회
router.get('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    const query = `
      SELECT 
        cc.*,
        cb.full_name as creator_id_name,
        cb.email as creator_id_email,
        s.title as system_title,
        s.description as system_description,
        d.name as domain_name,
        d.business_area as domain_business_area
      FROM code_components cc
      LEFT JOIN timbel_users cb ON cc.creator_id = cb.id
      LEFT JOIN systems s ON cc.system_id = s.id
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE cc.id = $1
    `;
    
    const result = await client.query(query, [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Code component not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('코드 컴포넌트 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch code component details',
      message: error.message
    });
  }
});

module.exports = router;