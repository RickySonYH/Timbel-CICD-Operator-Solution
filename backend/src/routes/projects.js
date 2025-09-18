// [advice from AI] 프로젝트 관리 API - 도메인과 시스템 중간 계층

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwtAuth = require('../middleware/jwtAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// [advice from AI] 파일 업로드 설정 (고객사 요구사항, 디자인 요구사항)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/projects');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 허용할 파일 형식
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md', '.ppt', '.pptx', '.xls', '.xlsx'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다.'));
    }
  }
});

// [advice from AI] 프로젝트 목록 조회
router.get('/', jwtAuth.verifyToken, async (req, res) => {
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

// [advice from AI] 개별 프로젝트 상세 조회 - 연관 데이터 포함
router.get('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    // 프로젝트 기본 정보
    const projectResult = await client.query(`
      SELECT 
        p.*,
        d.name as domain_name,
        u1.full_name as created_by_name,
        u2.full_name as approved_by_name
      FROM projects p
      LEFT JOIN domains d ON p.domain_id = d.id
      LEFT JOIN timbel_users u1 ON p.created_by = u1.id
      LEFT JOIN timbel_users u2 ON p.approved_by = u2.id
      WHERE p.id = $1
    `, [id]);
    
    if (projectResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    const project = projectResult.rows[0];
    
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
      WHERE s.project_id = $1
      ORDER BY s.created_at DESC
    `, [id]);
    
    // [advice from AI] 연관된 자산 통계
    const assetsStatsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM code_components cc 
         JOIN systems s ON cc.system_id = s.id 
         WHERE s.project_id = $1) as code_components_count,
        (SELECT COUNT(*) FROM design_assets da 
         JOIN systems s ON da.system_id = s.id 
         WHERE s.project_id = $1) as design_assets_count,
        (SELECT COUNT(*) FROM documents doc 
         JOIN systems s ON doc.system_id = s.id 
         WHERE s.project_id = $1) as documents_count
    `, [id]);
    
    client.release();
    
    // [advice from AI] 응답 데이터 구성
    const responseData = {
      ...project,
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
    console.error('프로젝트 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project details',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 생성 - Admin, PO, PE 가능
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), 
  upload.fields([
    { name: 'client_requirements', maxCount: 1 },
    { name: 'design_requirements', maxCount: 1 }
  ]), 
  async (req, res) => {
  try {
    const { 
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level, 
      deadline,
      design_requirements_json 
    } = req.body;
    
    const userId = req.user.userId;
    
    // [advice from AI] 업로드된 파일 처리
    let clientReqFile = null;
    let designReqFile = null;
    
    if (req.files) {
      if (req.files.client_requirements) {
        const file = req.files.client_requirements[0];
        clientReqFile = {
          path: file.path,
          filename: file.originalname,
          size: file.size
        };
      }
      
      if (req.files.design_requirements) {
        const file = req.files.design_requirements[0];
        designReqFile = {
          path: file.path,
          filename: file.originalname,
          size: file.size
        };
      }
    }
    
    const client = await pool.connect();
    
    const result = await client.query(`
      INSERT INTO projects (
        name, 
        domain_id, 
        project_overview, 
        target_system_name, 
        urgency_level, 
        deadline,
        client_requirements_file_path,
        client_requirements_filename,
        client_requirements_size,
        design_requirements_file_path,
        design_requirements_filename,
        design_requirements,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *
    `, [
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level || 'medium', 
      deadline,
      clientReqFile?.path,
      clientReqFile?.filename,
      clientReqFile?.size,
      designReqFile?.path,
      designReqFile?.filename,
      design_requirements_json ? JSON.parse(design_requirements_json) : {},
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

// [advice from AI] 프로젝트 수정 - Admin, PO, PE 가능
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po', 'pe']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level, 
      deadline,
      project_status 
    } = req.body;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      UPDATE projects 
      SET 
        name = $2, 
        domain_id = $3, 
        project_overview = $4, 
        target_system_name = $5, 
        urgency_level = $6, 
        deadline = $7,
        project_status = $8,
        updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `, [id, name, domain_id, project_overview, target_system_name, urgency_level, deadline, project_status]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '프로젝트가 성공적으로 수정되었습니다.'
    });
    
  } catch (error) {
    console.error('프로젝트 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 삭제 - Admin만 가능
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    
    const client = await pool.connect();
    
    // [advice from AI] 연결된 시스템 확인
    const systemsCheck = await client.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.version
      FROM systems s
      WHERE s.project_id = $1
    `, [id]);
    
    const connectedSystems = systemsCheck.rows;
    const systemCount = connectedSystems.length;
    
    if (systemCount > 0 && force !== 'true') {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete project with associated systems',
        message: '연결된 시스템이 있는 프로젝트는 삭제할 수 없습니다.',
        systemCount: systemCount,
        connectedSystems: connectedSystems,
        canForceDelete: true
      });
    }
    
    // [advice from AI] 강제 삭제 시 연결된 시스템의 project_id를 NULL로 설정
    if (systemCount > 0 && force === 'true') {
      await client.query(`
        UPDATE systems SET project_id = NULL WHERE project_id = $1
      `, [id]);
    }
    
    const result = await client.query(`
      DELETE FROM projects WHERE id = $1 RETURNING *
    `, [id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '프로젝트가 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('프로젝트 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

// [advice from AI] 도메인별 프로젝트 목록 조회
router.get('/domain/:domainId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { domainId } = req.params;
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        p.*,
        COUNT(s.id) as systems_count
      FROM projects p
      LEFT JOIN systems s ON s.project_id = p.id
      WHERE p.domain_id = $1
      GROUP BY p.id
      ORDER BY p.urgency_level, p.deadline
    `, [domainId]);
    
    client.release();
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('도메인별 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects by domain',
      message: error.message
    });
  }
});

module.exports = router;
