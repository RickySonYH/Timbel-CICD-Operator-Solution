// [advice from AI] 프로젝트 관리 API - 간단한 버전 (multer 없이)

const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// [advice from AI] PostgreSQL 연결 (domains.js와 동일한 방식)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timbel_db',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// [advice from AI] 프로젝트 목록 조회 (임시로 인증 없이)
router.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    
    const projectsResult = await client.query(`
      SELECT 
        p.*,
        d.name as domain_name,
        u1.full_name as created_by_name,
        u2.full_name as approved_by_name,
        COUNT(s.id) as connected_systems_count
      FROM projects p
      LEFT JOIN domains d ON p.domain_id = d.id
      LEFT JOIN timbel_users u1 ON p.created_by = u1.id
      LEFT JOIN timbel_users u2 ON p.approved_by = u2.id
      LEFT JOIN systems s ON s.project_id = p.id
      GROUP BY p.id, d.name, u1.full_name, u2.full_name
      ORDER BY 
        CASE p.urgency_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        p.deadline ASC,
        p.created_at DESC
    `);
    
    client.release();
    
    console.log(`프로젝트 목록 조회: ${projectsResult.rows.length}개`);
    
    res.json({
      success: true,
      data: projectsResult.rows
    });
    
  } catch (error) {
    console.error('프로젝트 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 생성 (임시로 인증 없이)
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level, 
      deadline
    } = req.body;
    
    const userId = 'e512d6df-0396-4806-9c86-ff16ce312993'; // 임시로 admin 사용자 ID
    
    const client = await pool.connect();
    
    const result = await client.query(`
      INSERT INTO projects (
        name, 
        domain_id, 
        project_overview, 
        target_system_name, 
        urgency_level, 
        deadline,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `, [
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level || 'medium', 
      deadline,
      userId
    ]);
    
    client.release();
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '프로젝트가 성공적으로 생성되었습니다.'
    });
    
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      message: error.message
    });
  }
});

module.exports = router;
