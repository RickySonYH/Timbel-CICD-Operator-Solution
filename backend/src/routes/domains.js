// [advice from AI] 도메인 등록 관리 API - 모든 상태의 도메인 조회/관리
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'timbel_knowledge',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password'
});

// [advice from AI] 도메인 목록 조회 - 등록 관리용 (모든 상태)
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const domainsResult = await client.query(`
      SELECT 
        d.id, d.name, d.description, d.status,
        d.created_at, d.updated_at,
        COUNT(s.id) as current_systems_count,
        u.full_name as owner_name
      FROM domains d
      LEFT JOIN systems s ON d.id = s.domain_id
      LEFT JOIN timbel_users u ON d.owner_id = u.id
      GROUP BY d.id, d.name, d.description, d.status,
               d.created_at, d.updated_at, u.full_name
      ORDER BY 
        CASE d.status 
          WHEN 'active' THEN 1 
          WHEN 'inactive' THEN 2 
          ELSE 3 
        END,
        d.name
    `);
    
    client.release();
    
    console.log(`도메인 등록 관리 조회: ${domainsResult.rows.length}개`);
    
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

// [advice from AI] 도메인 생성 - Admin, PO, PE만 가능
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), async (req, res) => {
  try {
    const { name, description, business_area, region, contact_person, contact_email, priority_level } = req.body;
    const userId = req.user.userId;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      INSERT INTO domains (
        name, description, owner_id, status
      ) VALUES ($1, $2, $3, 'active')
      RETURNING *
    `, [name, description, userId]);
    
    client.release();
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '도메인이 생성되었습니다.'
    });
    
  } catch (error) {
    console.error('도메인 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create domain',
      message: error.message
    });
  }
});

// [advice from AI] 개별 도메인 상세 조회 - 연관 데이터 포함
router.get('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    // 도메인 기본 정보
    const domainResult = await client.query(`
      SELECT 
        d.*,
        u1.full_name as created_by_name,
        u2.full_name as approved_by_name
      FROM domains d
      LEFT JOIN timbel_users u1 ON d.created_by = u1.id
      LEFT JOIN timbel_users u2 ON d.approved_by = u2.id
      WHERE d.id = $1
    `, [id]);
    
    if (domainResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }
    
    const domain = domainResult.rows[0];
    
    // [advice from AI] 연관된 시스템 정보
    const systemsResult = await client.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.version,
        s.deployment_status,
        s.lifecycle,
        s.created_at,
        u.full_name as created_by_name
      FROM systems s
      LEFT JOIN timbel_users u ON s.created_by = u.id
      WHERE s.domain_id = $1
      ORDER BY s.created_at DESC
    `, [id]);
    
    // [advice from AI] 연관된 자산 통계
    const assetsStatsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM code_components cc 
         JOIN systems s ON cc.system_id = s.id 
         WHERE s.domain_id = $1) as code_components_count,
        (SELECT COUNT(*) FROM design_assets da 
         JOIN systems s ON da.system_id = s.id 
         WHERE s.domain_id = $1) as design_assets_count,
        (SELECT COUNT(*) FROM documents doc 
         JOIN systems s ON doc.system_id = s.id 
         WHERE s.domain_id = $1) as documents_count
    `, [id]);
    
    client.release();
    
    // [advice from AI] 응답 데이터 구성
    const responseData = {
      ...domain,
      connected_systems: systemsResult.rows,
      assets_stats: assetsStatsResult.rows[0] || {
        code_components_count: 0,
        design_assets_count: 0,
        documents_count: 0
      }
    };
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('도메인 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch domain details',
      message: error.message
    });
  }
});

// [advice from AI] 도메인 수정 - Admin, PO, PE만 가능
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, business_area, region, contact_person, contact_email, priority_level } = req.body;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      UPDATE domains SET 
        name = $1, description = $2, business_area = $3, region = $4,
        contact_person = $5, contact_email = $6, priority_level = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [name, description, business_area, region, contact_person, contact_email, priority_level, id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '도메인이 수정되었습니다.'
    });
    
  } catch (error) {
    console.error('도메인 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update domain',
      message: error.message
    });
  }
});

// [advice from AI] 도메인 삭제 - Admin만 가능
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // [advice from AI] 강제 삭제 옵션 추가
    
    const client = await pool.connect();
    
    // [advice from AI] 연결된 시스템의 상세 정보 조회
    const systemsCheck = await client.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.version,
        s.deployment_status,
        s.lifecycle,
        s.created_at,
        u.full_name as created_by_name
      FROM systems s
      LEFT JOIN timbel_users u ON s.created_by = u.id
      WHERE s.domain_id = $1
      ORDER BY s.created_at DESC
    `, [id]);
    
    const connectedSystems = systemsCheck.rows;
    const systemCount = connectedSystems.length;
    
    if (systemCount > 0 && force !== 'true') {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete domain with associated systems',
        message: '연결된 시스템이 있는 도메인은 삭제할 수 없습니다.',
        systemCount: systemCount,
        connectedSystems: connectedSystems, // [advice from AI] 연결된 시스템 상세 정보
        canForceDelete: true
      });
    }
    
    // [advice from AI] 강제 삭제 시 연결된 시스템의 domain_id를 NULL로 설정
    if (systemCount > 0 && force === 'true') {
      await client.query(`
        UPDATE systems SET domain_id = NULL WHERE domain_id = $1
      `, [id]);
    }
    
    const result = await client.query(`
      DELETE FROM domains WHERE id = $1 RETURNING *
    `, [id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }
    
    res.json({
      success: true,
      message: '도메인이 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('도메인 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete domain',
      message: error.message
    });
  }
});

module.exports = router;
