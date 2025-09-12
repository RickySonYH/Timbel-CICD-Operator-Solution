// [advice from AI] 프로젝트 관리 API 라우트
// 업무 프로세스 가이드 Phase 1에 따른 프로젝트 관리 시스템

import express from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 데이터베이스 연결 풀 (기존 연결 재사용)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// [advice from AI] 프로젝트 목록 조회
router.get('/', async (req, res) => {
  try {
    const { status, po_id } = req.query;
    
    let query = `
      SELECT 
        p.*,
        u.full_name as po_name,
        COALESCE(
          (SELECT AVG(pr.progress_percentage) 
           FROM development_progress pr 
           JOIN development_instructions di ON pr.instruction_id = di.id 
           WHERE di.project_id = p.id), 0
        ) as progress,
        COALESCE(
          (SELECT ARRAY_AGG(DISTINCT u2.full_name) 
           FROM project_assignments pa 
           JOIN timbel_users u2 ON pa.user_id = u2.id 
           WHERE pa.project_id = p.id), ARRAY[]::text[]
        ) as team,
        COALESCE(
          (SELECT ARRAY_AGG(DISTINCT di.template_type) 
           FROM development_instructions di 
           WHERE di.project_id = p.id), ARRAY[]::text[]
        ) as tags
      FROM projects p
      LEFT JOIN timbel_users u ON p.assigned_po = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    if (status && status !== 'all') {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (po_id) {
      query += ` AND p.assigned_po = $${paramCount}`;
      params.push(po_id);
      paramCount++;
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // 데이터 변환
    const projects = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      progress: Math.round(row.progress || 0),
      team: row.team || [],
      startDate: row.created_at?.split('T')[0],
      endDate: row.expected_duration ? 
        new Date(new Date(row.created_at).getTime() + row.expected_duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
        null,
      priority: row.priority,
      tags: row.tags || [],
      po_name: row.po_name,
      customer_company: row.customer_company,
      budget: row.budget
    }));
    
    res.json(projects);
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    res.status(500).json({ error: '프로젝트 목록 조회 중 오류가 발생했습니다.' });
  }
});

// [advice from AI] 프로젝트 상세 조회
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const projectQuery = `
      SELECT 
        p.*,
        u.full_name as po_name,
        c.name as customer_name
      FROM projects p
      LEFT JOIN timbel_users u ON p.assigned_po = u.id
      LEFT JOIN companies c ON p.customer_company = c.name
      WHERE p.id = $1
    `;
    
    const projectResult = await pool.query(projectQuery, [id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    const project = projectResult.rows[0];
    
    // 마일스톤 조회
    const milestonesQuery = `
      SELECT * FROM project_milestones 
      WHERE project_id = $1 
      ORDER BY target_date ASC
    `;
    const milestonesResult = await pool.query(milestonesQuery, [id]);
    
    // 담당자 조회
    const assignmentsQuery = `
      SELECT 
        pa.*,
        u.full_name,
        u.position,
        u.department
      FROM project_assignments pa
      JOIN timbel_users u ON pa.user_id = u.id
      WHERE pa.project_id = $1 AND pa.status = 'active'
    `;
    const assignmentsResult = await pool.query(assignmentsQuery, [id]);
    
    // 진행률 조회
    const progressQuery = `
      SELECT 
        AVG(pr.progress_percentage) as avg_progress,
        COUNT(DISTINCT di.id) as total_instructions,
        COUNT(CASE WHEN pr.progress_percentage = 100 THEN 1 END) as completed_instructions
      FROM development_instructions di
      LEFT JOIN development_progress pr ON di.id = pr.instruction_id
      WHERE di.project_id = $1
    `;
    const progressResult = await pool.query(progressQuery, [id]);
    
    const projectData = {
      ...project,
      milestones: milestonesResult.rows,
      assignments: assignmentsResult.rows,
      progress: {
        average: Math.round(progressResult.rows[0]?.avg_progress || 0),
        totalInstructions: progressResult.rows[0]?.total_instructions || 0,
        completedInstructions: progressResult.rows[0]?.completed_instructions || 0
      }
    };
    
    res.json(projectData);
  } catch (error) {
    console.error('프로젝트 상세 조회 오류:', error);
    res.status(500).json({ error: '프로젝트 상세 조회 중 오류가 발생했습니다.' });
  }
});

// [advice from AI] 프로젝트 생성
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      customer_company,
      requirements,
      expected_duration,
      budget,
      priority,
      assigned_po,
      milestones
    } = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 프로젝트 생성
      const projectQuery = `
        INSERT INTO projects (
          name, description, customer_company, requirements, 
          expected_duration, budget, priority, assigned_po, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const projectResult = await client.query(projectQuery, [
        name, description, customer_company, requirements,
        expected_duration, budget, priority, assigned_po, req.user.id
      ]);
      
      const projectId = projectResult.rows[0].id;
      
      // 마일스톤 생성
      if (milestones && milestones.length > 0) {
        for (const milestone of milestones) {
          const milestoneQuery = `
            INSERT INTO project_milestones (
              project_id, milestone_type, target_date, description
            ) VALUES ($1, $2, $3, $4)
          `;
          await client.query(milestoneQuery, [
            projectId, milestone.type, milestone.target_date, milestone.description
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: '프로젝트가 성공적으로 생성되었습니다.',
        project: projectResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    res.status(500).json({ error: '프로젝트 생성 중 오류가 발생했습니다.' });
  }
});

// [advice from AI] 프로젝트 수정
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      customer_company,
      requirements,
      expected_duration,
      budget,
      priority,
      status,
      assigned_po
    } = req.body;
    
    const query = `
      UPDATE projects 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        customer_company = COALESCE($3, customer_company),
        requirements = COALESCE($4, requirements),
        expected_duration = COALESCE($5, expected_duration),
        budget = COALESCE($6, budget),
        priority = COALESCE($7, priority),
        status = COALESCE($8, status),
        assigned_po = COALESCE($9, assigned_po),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, description, customer_company, requirements,
      expected_duration, budget, priority, status, assigned_po, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    res.json({
      message: '프로젝트가 성공적으로 수정되었습니다.',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('프로젝트 수정 오류:', error);
    res.status(500).json({ error: '프로젝트 수정 중 오류가 발생했습니다.' });
  }
});

// [advice from AI] 프로젝트 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '프로젝트가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    res.status(500).json({ error: '프로젝트 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
