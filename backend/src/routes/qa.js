const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] PostgreSQL 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] JWT 사용자 ID를 UUID로 매핑
const userIdMapping = {
  'admin-001': 'e512d6df-0396-4806-9c86-ff16ce312993',
  'po-001': '1a71adf6-daa1-4267-98f7-b99098945630',
  'pe-001': 'cb45aae6-4b47-4238-af31-5bbbeaa3d18c',
  'qa-001': 'a3cdd9a5-6dd0-465f-9160-7638464840fb',
  'op-001': '8d451115-5cbe-4093-b92e-5d44c21d2a92'
};

// ===== QA 테스트 케이스 관리 API =====

// [advice from AI] QA 테스트 케이스 목록 조회
router.get('/test-cases', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { project_id, test_suite_id, status, test_type } = req.query;
    
    let query = `
      SELECT 
        qtc.*,
        p.name as project_name,
        ts.name as test_suite_name,
        u1.full_name as assignee_name,
        u2.full_name as created_by_name
      FROM qa_test_cases qtc
      LEFT JOIN projects p ON qtc.project_id = p.id
      LEFT JOIN test_suites ts ON qtc.test_suite_id = ts.id
      LEFT JOIN timbel_users u1 ON qtc.assigned_to = u1.id
      LEFT JOIN timbel_users u2 ON qtc.created_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (project_id) {
      query += ` AND qtc.project_id = $${paramCount}`;
      params.push(project_id);
      paramCount++;
    }
    
    if (test_suite_id) {
      query += ` AND qtc.test_suite_id = $${paramCount}`;
      params.push(test_suite_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND qtc.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (test_type) {
      query += ` AND qtc.test_type = $${paramCount}`;
      params.push(test_type);
      paramCount++;
    }
    
    query += ` ORDER BY qtc.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        test_cases: result.rows
      }
    });
  } catch (error) {
    console.error('QA 테스트 케이스 목록 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'QA 테스트 케이스 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] QA 테스트 케이스 생성
router.post('/test-cases', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      project_id,
      test_suite_id,
      name,
      description,
      test_type,
      priority,
      preconditions,
      test_steps,
      expected_result,
      test_data,
      environment_requirements,
      assigned_to
    } = req.body;

    if (!name || !test_type) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '테스트 케이스 이름과 타입은 필수입니다'
      });
    }

    const createdBy = userIdMapping[req.user?.id] || 'a3cdd9a5-6dd0-465f-9160-7638464840fb'; // QA 기본 사용자

    const result = await pool.query(`
      INSERT INTO qa_test_cases (
        project_id, test_suite_id, name, description, test_type, priority,
        preconditions, test_steps, expected_result, test_data, environment_requirements,
        assigned_to, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [
      project_id || null,
      test_suite_id || null,
      name,
      description || '',
      test_type,
      priority || 'medium',
      preconditions || '',
      JSON.stringify(test_steps || []),
      expected_result || '',
      JSON.stringify(test_data || {}),
      JSON.stringify(environment_requirements || {}),
      assigned_to || null,
      createdBy
    ]);

    res.status(201).json({
      success: true,
      message: 'QA 테스트 케이스가 성공적으로 생성되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('QA 테스트 케이스 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'QA 테스트 케이스 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] QA 테스트 케이스 업데이트
router.put('/test-cases/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      test_type,
      priority,
      status,
      preconditions,
      test_steps,
      expected_result,
      actual_result,
      test_data,
      environment_requirements,
      assigned_to
    } = req.body;

    const result = await pool.query(`
      UPDATE qa_test_cases 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        test_type = COALESCE($3, test_type),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        preconditions = COALESCE($6, preconditions),
        test_steps = COALESCE($7, test_steps),
        expected_result = COALESCE($8, expected_result),
        actual_result = COALESCE($9, actual_result),
        test_data = COALESCE($10, test_data),
        environment_requirements = COALESCE($11, environment_requirements),
        assigned_to = COALESCE($12, assigned_to),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      name,
      description,
      test_type,
      priority,
      status,
      preconditions,
      test_steps ? JSON.stringify(test_steps) : null,
      expected_result,
      actual_result,
      test_data ? JSON.stringify(test_data) : null,
      environment_requirements ? JSON.stringify(environment_requirements) : null,
      assigned_to,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '테스트 케이스를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: 'QA 테스트 케이스가 성공적으로 업데이트되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('QA 테스트 케이스 업데이트 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'QA 테스트 케이스 업데이트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// ===== 버그 관리 API =====

// [advice from AI] 버그 리포트 목록 조회
router.get('/bug-reports', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { project_id, status, severity, priority, bug_type } = req.query;
    
    let query = `
      SELECT 
        br.*,
        p.name as project_name,
        qtc.name as test_case_name,
        u1.full_name as assignee_name,
        u2.full_name as reported_by_name
      FROM bug_reports br
      LEFT JOIN projects p ON br.project_id = p.id
      LEFT JOIN qa_test_cases qtc ON br.test_case_id = qtc.id
      LEFT JOIN timbel_users u1 ON br.assignee_id = u1.id
      LEFT JOIN timbel_users u2 ON br.reporter_id = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (project_id) {
      query += ` AND br.project_id = $${paramCount}`;
      params.push(project_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND br.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (severity) {
      query += ` AND br.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }
    
    if (priority) {
      query += ` AND br.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }
    
    if (bug_type) {
      query += ` AND br.bug_type = $${paramCount}`;
      params.push(bug_type);
      paramCount++;
    }
    
    query += ` ORDER BY br.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        bug_reports: result.rows
      }
    });
  } catch (error) {
    console.error('버그 리포트 목록 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '버그 리포트 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 버그 리포트 생성
router.post('/bug-reports', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      project_id,
      test_case_id,
      title,
      description,
      severity,
      priority,
      component,
      environment,
      version,
      steps_to_reproduce,
      expected_result,
      actual_result,
      attachments,
      assigned_to: assignee_id
    } = req.body;

    if (!title || !description || !severity || !priority) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '제목, 설명, 심각도, 우선순위는 필수입니다'
      });
    }

    const bugId = `BUG-${Date.now()}`;
    const reportedBy = userIdMapping[req.user?.id] || 'a3cdd9a5-6dd0-465f-9160-7638464840fb'; // QA 기본 사용자

    // [advice from AI] 동적으로 INSERT 쿼리 생성
    const fields = [];
    const values = [];
    const params = [];
    let paramCount = 1;

    // 필수 필드들
    if (project_id) { fields.push('project_id'); values.push(`$${paramCount++}`); params.push(project_id); }
    if (test_case_id) { fields.push('test_case_id'); values.push(`$${paramCount++}`); params.push(test_case_id); }
    if (title) { fields.push('title'); values.push(`$${paramCount++}`); params.push(title); }
    if (description) { fields.push('description'); values.push(`$${paramCount++}`); params.push(description); }
    if (severity) { fields.push('severity'); values.push(`$${paramCount++}`); params.push(severity); }
    if (priority) { fields.push('priority'); values.push(`$${paramCount++}`); params.push(priority); }
    if (component) { fields.push('component'); values.push(`$${paramCount++}`); params.push(component); }
    if (environment) { fields.push('environment'); values.push(`$${paramCount++}`); params.push(environment); }
    if (version) { fields.push('version'); values.push(`$${paramCount++}`); params.push(version); }
    if (steps_to_reproduce) { fields.push('steps_to_reproduce'); values.push(`$${paramCount++}`); params.push(steps_to_reproduce); }
    if (expected_result) { fields.push('expected_result'); values.push(`$${paramCount++}`); params.push(expected_result); }
    if (actual_result) { fields.push('actual_result'); values.push(`$${paramCount++}`); params.push(actual_result); }
    if (attachments) { fields.push('attachments'); values.push(`$${paramCount++}`); params.push(JSON.stringify(attachments)); }
    if (assignee_id) { fields.push('assignee_id'); values.push(`$${paramCount++}`); params.push(assignee_id); }
    if (reportedBy) { fields.push('reporter_id'); values.push(`$${paramCount++}`); params.push(reportedBy); }

    const query = `
      INSERT INTO bug_reports (${fields.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.status(201).json({
      success: true,
      message: '버그 리포트가 성공적으로 생성되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('버그 리포트 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '버그 리포트 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 버그 리포트 업데이트
router.put('/bug-reports/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      severity,
      priority,
      status,
      bug_type,
      environment,
      browser,
      os,
      steps_to_reproduce,
      expected_result,
      actual_result,
      attachments,
      assignee_id,
      resolution
    } = req.body;

    const result = await pool.query(`
      UPDATE bug_reports 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        severity = COALESCE($3, severity),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        bug_type = COALESCE($6, bug_type),
        environment = COALESCE($7, environment),
        browser = COALESCE($8, browser),
        os = COALESCE($9, os),
        steps_to_reproduce = COALESCE($10, steps_to_reproduce),
        expected_result = COALESCE($11, expected_result),
        actual_result = COALESCE($12, actual_result),
        attachments = COALESCE($13, attachments),
        assignee_id = COALESCE($14, assignee_id),
        resolution = COALESCE($15, resolution),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      title,
      description,
      severity,
      priority,
      status,
      bug_type,
      environment,
      browser,
      os,
      steps_to_reproduce,
      expected_result,
      actual_result,
      attachments ? JSON.stringify(attachments) : null,
      assignee_id,
      resolution,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '버그 리포트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '버그 리포트가 성공적으로 업데이트되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('버그 리포트 업데이트 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '버그 리포트 업데이트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// ===== 이슈 트래킹 API =====

// [advice from AI] 이슈 목록 조회
router.get('/issues', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { project_id, status, issue_type, priority, assigned_to } = req.query;
    
    let query = `
      SELECT 
        it.*,
        p.name as project_name,
        br.title as bug_title,
        u1.full_name as assignee_name,
        u2.full_name as reporter_name,
        u3.full_name as assignee_name
      FROM issue_tracking it
      LEFT JOIN projects p ON it.project_id = p.id
      LEFT JOIN bug_reports br ON it.bug_id = br.id
      LEFT JOIN timbel_users u1 ON it.assigned_to = u1.id
      LEFT JOIN timbel_users u2 ON it.reporter_id = u2.id
      LEFT JOIN timbel_users u3 ON it.assignee_id = u3.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (project_id) {
      query += ` AND it.project_id = $${paramCount}`;
      params.push(project_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND it.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (issue_type) {
      query += ` AND it.issue_type = $${paramCount}`;
      params.push(issue_type);
      paramCount++;
    }
    
    if (priority) {
      query += ` AND it.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }
    
    if (assigned_to) {
      query += ` AND it.assigned_to = $${paramCount}`;
      params.push(assigned_to);
      paramCount++;
    }
    
    query += ` ORDER BY it.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        issues: result.rows
      }
    });
  } catch (error) {
    console.error('이슈 목록 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '이슈 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 이슈 생성
router.post('/issues', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      project_id,
      bug_id,
      title,
      description,
      issue_type,
      priority,
      labels,
      assigned_to,
      due_date
    } = req.body;

    if (!title || !description || !issue_type) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '제목, 설명, 이슈 타입은 필수입니다'
      });
    }

    const reporterId = userIdMapping[req.user?.id] || 'a3cdd9a5-6dd0-465f-9160-7638464840fb'; // QA 기본 사용자

    const result = await pool.query(`
      INSERT INTO issue_tracking (
        project_id, bug_id, title, description, issue_type, priority,
        labels, assigned_to, reporter_id, assignee_id, due_date,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      project_id || null,
      bug_id || null,
      title,
      description,
      issue_type,
      priority || 'medium',
      JSON.stringify(labels || []),
      assigned_to || null,
      reporterId,
      assigned_to || null,
      due_date || null
    ]);

    res.status(201).json({
      success: true,
      message: '이슈가 성공적으로 생성되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('이슈 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '이슈 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// ===== QA 승인 워크플로우 API =====

// [advice from AI] QA 승인 목록 조회
router.get('/approvals', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { project_id, status, approval_type } = req.query;
    
    let query = `
      SELECT 
        qa.*,
        p.name as project_name,
        ts.name as test_suite_name,
        u1.full_name as approved_by_name,
        u2.full_name as created_by_name
      FROM qa_approvals qa
      LEFT JOIN projects p ON qa.project_id = p.id
      LEFT JOIN test_suites ts ON qa.test_suite_id = ts.id
      LEFT JOIN timbel_users u1 ON qa.approved_by = u1.id
      LEFT JOIN timbel_users u2 ON qa.created_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (project_id) {
      query += ` AND qa.project_id = $${paramCount}`;
      params.push(project_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND qa.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (approval_type) {
      query += ` AND qa.approval_type = $${paramCount}`;
      params.push(approval_type);
      paramCount++;
    }
    
    query += ` ORDER BY qa.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        approvals: result.rows
      }
    });
  } catch (error) {
    console.error('QA 승인 목록 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'QA 승인 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] QA 승인 처리
router.post('/approvals', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      project_id,
      test_suite_id,
      approval_type,
      conditions,
      comments
    } = req.body;

    if (!project_id || !approval_type) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '프로젝트 ID와 승인 타입은 필수입니다'
      });
    }

    const createdBy = userIdMapping[req.user?.id] || 'a3cdd9a5-6dd0-465f-9160-7638464840fb'; // QA 기본 사용자

    const result = await pool.query(`
      INSERT INTO qa_approvals (
        project_id, test_suite_id, approval_type, conditions, comments,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      project_id,
      test_suite_id || null,
      approval_type,
      conditions || '',
      comments || '',
      createdBy
    ]);

    res.status(201).json({
      success: true,
      message: 'QA 승인 요청이 성공적으로 생성되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('QA 승인 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'QA 승인 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] QA 승인 처리 (승인/거부)
router.put('/approvals/:id/process', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, conditions, rejection_reason, comments } = req.body;

    if (!status || !['approved', 'rejected', 'conditional'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '유효한 승인 상태를 입력해주세요 (approved, rejected, conditional)'
      });
    }

    const approvedBy = userIdMapping[req.user?.id] || 'a3cdd9a5-6dd0-465f-9160-7638464840fb';

    const result = await pool.query(`
      UPDATE qa_approvals 
      SET 
        status = $1,
        conditions = COALESCE($2, conditions),
        rejection_reason = COALESCE($3, rejection_reason),
        comments = COALESCE($4, comments),
        approved_by = $5,
        approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [status, conditions, rejection_reason, comments, approvedBy, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'QA 승인을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: `QA 승인이 ${status === 'approved' ? '승인' : status === 'rejected' ? '거부' : '조건부 승인'}되었습니다.`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('QA 승인 처리 중 오류:', error);
    res.status(500).json({
      success: false,
      error: 'QA 승인 처리 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// ===== 테스트 실행 로그 API =====

// [advice from AI] 테스트 실행 로그 조회
router.get('/execution-logs', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { test_case_id, test_suite_id, environment_id, status } = req.query;
    
    let query = `
      SELECT 
        tel.*,
        qtc.name as test_case_name,
        ts.name as test_suite_name,
        te.name as environment_name,
        u.full_name as executed_by_name
      FROM test_execution_logs tel
      LEFT JOIN qa_test_cases qtc ON tel.test_case_id = qtc.id
      LEFT JOIN test_suites ts ON tel.test_suite_id = ts.id
      LEFT JOIN test_environments te ON tel.environment_id = te.id
      LEFT JOIN timbel_users u ON tel.executed_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (test_case_id) {
      query += ` AND tel.test_case_id = $${paramCount}`;
      params.push(test_case_id);
      paramCount++;
    }
    
    if (test_suite_id) {
      query += ` AND tel.test_suite_id = $${paramCount}`;
      params.push(test_suite_id);
      paramCount++;
    }
    
    if (environment_id) {
      query += ` AND tel.environment_id = $${paramCount}`;
      params.push(environment_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND tel.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY tel.execution_time DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        execution_logs: result.rows
      }
    });
  } catch (error) {
    console.error('테스트 실행 로그 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '테스트 실행 로그 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 테스트 실행 로그 생성
router.post('/execution-logs', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      test_case_id,
      test_suite_id,
      environment_id,
      execution_time,
      status,
      duration,
      error_message,
      stack_trace,
      screenshots,
      logs,
      metrics
    } = req.body;

    if (!test_case_id || !execution_time || !status) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: '테스트 케이스 ID, 실행 시간, 상태는 필수입니다'
      });
    }

    const executedBy = userIdMapping[req.user?.id] || 'a3cdd9a5-6dd0-465f-9160-7638464840fb';

    const result = await pool.query(`
      INSERT INTO test_execution_logs (
        test_case_id, test_suite_id, environment_id, execution_time, status,
        duration, error_message, stack_trace, screenshots, logs, metrics,
        executed_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `, [
      test_case_id,
      test_suite_id || null,
      environment_id || null,
      execution_time,
      status,
      duration || null,
      error_message || '',
      stack_trace || '',
      JSON.stringify(screenshots || []),
      JSON.stringify(logs || []),
      JSON.stringify(metrics || {}),
      executedBy
    ]);

    res.status(201).json({
      success: true,
      message: '테스트 실행 로그가 성공적으로 생성되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('테스트 실행 로그 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '테스트 실행 로그 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
