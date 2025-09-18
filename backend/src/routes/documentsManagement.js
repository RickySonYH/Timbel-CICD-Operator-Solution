// [advice from AI] 문서/가이드 등록 관리 API - 모든 상태 조회용
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] PostgreSQL 연결 풀
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 문서 목록 조회 - 등록 관리용 (모든 상태)
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
      whereConditions.push(`(d.title ILIKE $${paramIndex} OR d.content ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (type) {
      whereConditions.push(`d.category = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`d.approval_status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 정렬 조건
    const [sortField, sortOrder] = sort.split(':');
    const orderBy = `ORDER BY d.${sortField} ${sortOrder.toUpperCase()}`;
    
    // 전체 수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN timbel_users cb ON d.created_by = cb.id
      ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].total);
    
    // 데이터 조회
    const dataQuery = `
      SELECT 
        d.id, d.title, d.content, d.category, d.format, d.version,
        d.tags, d.status, d.is_public, d.view_count,
        d.created_at, d.updated_at,
        cb.full_name as created_by_name,
        cb.email as created_by_email
      FROM documents d
      LEFT JOIN timbel_users cb ON d.author_id = cb.id
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
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN approval_status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
        AVG(view_count) as avg_views
      FROM documents d
      LEFT JOIN timbel_users cb ON d.created_by = cb.id
      ${whereClause.replace('d.', 'd.')}
    `;
    
    const statsResult = await client.query(statsQuery, queryParams.slice(0, -2)); // LIMIT, OFFSET 제외
    
    client.release();
    
    console.log(`문서 등록 관리 조회: ${dataResult.rows.length}개 (전체 ${totalItems}개)`);
    
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
    console.error('문서 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
});

// [advice from AI] 문서 상세 조회
router.get('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    const query = `
      SELECT 
        d.*,
        cb.full_name as created_by_name,
        cb.email as created_by_email,
        s.title as system_title,
        s.description as system_description,
        dom.name as domain_name,
        dom.business_area as domain_business_area
      FROM documents d
      LEFT JOIN timbel_users cb ON d.created_by = cb.id
      LEFT JOIN systems s ON d.system_id = s.id
      LEFT JOIN domains dom ON s.domain_id = dom.id
      WHERE d.id = $1
    `;
    
    const result = await client.query(query, [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('문서 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document details',
      message: error.message
    });
  }
});

module.exports = router;
