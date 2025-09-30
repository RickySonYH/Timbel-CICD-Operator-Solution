// [advice from AI] 젠킨스 빌드 실패 이슈 레포트 관리 API
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, requireRole } = require('../middleware/jwtAuth');

// [advice from AI] 데이터베이스 연결 설정
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'timbel_knowledge',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password',
});

// [advice from AI] 빌드 실패 목록 조회
router.get('/build-failures', verifyToken, requireRole(['admin', 'po', 'pe', 'qa']), async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        bf.*,
        p.name as project_name,
        u.full_name as assigned_pe_name
      FROM build_failures bf
      LEFT JOIN projects p ON bf.project_id = p.id
      LEFT JOIN timbel_users u ON bf.assigned_pe = u.id
      ORDER BY bf.failed_at DESC
      LIMIT 50
    `);
    
    client.release();
    
    res.json({
      success: true,
      failures: result.rows
    });
  } catch (error) {
    console.error('빌드 실패 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '빌드 실패 목록을 가져오는 데 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 이슈 레포트 목록 조회
router.get('/issue-reports', verifyToken, requireRole(['admin', 'po', 'pe', 'qa']), async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        ir.*,
        bf.job_name,
        bf.build_number,
        bf.repository_url,
        u1.full_name as assigned_to_name,
        u2.full_name as created_by_name
      FROM issue_reports ir
      LEFT JOIN build_failures bf ON ir.build_failure_id = bf.id
      LEFT JOIN timbel_users u1 ON ir.assigned_to = u1.id
      LEFT JOIN timbel_users u2 ON ir.created_by = u2.id
      ORDER BY ir.created_at DESC
    `);
    
    client.release();
    
    res.json({
      success: true,
      reports: result.rows
    });
  } catch (error) {
    console.error('이슈 레포트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '이슈 레포트 목록을 가져오는 데 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] PE 할당 정보 조회
router.get('/pe-assignments', verifyToken, requireRole(['admin', 'po', 'pe', 'qa']), async (req, res) => {
  try {
    const client = await pool.connect();
    
    // [advice from AI] PE 목록과 현재 워크로드 조회
    const result = await client.query(`
      SELECT 
        u.id as pe_id,
        u.full_name as pe_name,
        u.email,
        COALESCE(workload.current_workload, 0) as current_workload,
        COALESCE(array_agg(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL), '{}') as project_ids,
        '{}' as skill_tags
      FROM timbel_users u
      LEFT JOIN projects p ON p.assigned_po = u.id AND p.project_status IN ('planning', 'in_progress', 'development')
      LEFT JOIN (
        SELECT 
          assigned_to,
          COUNT(*) as current_workload
        FROM issue_reports 
        WHERE status IN ('open', 'in_progress')
        GROUP BY assigned_to
      ) workload ON workload.assigned_to = u.id
      WHERE u.role_type = 'pe' AND u.status = 'active'
      GROUP BY u.id, u.full_name, u.email, workload.current_workload
      ORDER BY workload.current_workload ASC, u.full_name
    `);
    
    client.release();
    
    res.json({
      success: true,
      assignments: result.rows
    });
  } catch (error) {
    console.error('PE 할당 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'PE 할당 정보를 가져오는 데 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 이슈 레포트 생성
router.post('/issue-reports', verifyToken, requireRole(['admin', 'po', 'pe', 'qa']), async (req, res) => {
  try {
    const {
      buildFailureId,
      title,
      description,
      errorCategory,
      severity,
      assignedTo,
      reproductionSteps,
      suggestedSolution,
      attachments
    } = req.body;
    
    const userId = req.user.id;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // [advice from AI] 이슈 레포트 생성
      const issueResult = await client.query(`
        INSERT INTO issue_reports (
          build_failure_id, title, description, error_category, severity,
          assigned_to, status, created_by, reproduction_steps, suggested_solution,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, $9, NOW(), NOW())
        RETURNING *
      `, [
        buildFailureId, title, description, errorCategory, severity,
        assignedTo, userId, JSON.stringify(reproductionSteps), suggestedSolution
      ]);
      
      const issueId = issueResult.rows[0].id;
      
      // [advice from AI] 첨부파일 저장
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          await client.query(`
            INSERT INTO issue_attachments (
              issue_id, type, url, description, created_at
            ) VALUES ($1, $2, $3, $4, NOW())
          `, [issueId, attachment.type, attachment.url, attachment.description]);
        }
      }
      
      // [advice from AI] 빌드 실패 상태 업데이트
      await client.query(`
        UPDATE build_failures 
        SET issue_created = true, updated_at = NOW()
        WHERE id = $1
      `, [buildFailureId]);
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: '이슈 레포트가 성공적으로 생성되었습니다.',
        report: issueResult.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('이슈 레포트 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '이슈 레포트 생성에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 이슈 레포트 상태 업데이트
router.put('/issue-reports/:id/status', verifyToken, requireRole(['admin', 'po', 'pe', 'qa']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, resolutionNotes } = req.body;
    const userId = req.user.id;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      UPDATE issue_reports 
      SET 
        status = $1,
        resolution = $2,
        resolution_notes = $3,
        resolved_by = $4,
        resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, resolution, resolutionNotes, userId, id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '이슈 레포트를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '이슈 상태가 업데이트되었습니다.',
      report: result.rows[0]
    });
    
  } catch (error) {
    console.error('이슈 상태 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '이슈 상태 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 빌드 실패 정보 등록 (Jenkins Webhook용)
router.post('/build-failures', verifyToken, requireRole(['admin', 'system']), async (req, res) => {
  try {
    const {
      jobName,
      buildNumber,
      repositoryUrl,
      branch,
      commitSha,
      commitMessage,
      errorType,
      errorStage,
      errorMessage,
      stackTrace,
      logUrl,
      screenshotUrl,
      projectId,
      duration
    } = req.body;
    
    const client = await pool.connect();
    
    // [advice from AI] 중복 체크
    const existingResult = await client.query(`
      SELECT id FROM build_failures 
      WHERE job_name = $1 AND build_number = $2
    `, [jobName, buildNumber]);
    
    if (existingResult.rows.length > 0) {
      client.release();
      return res.json({
        success: true,
        message: '이미 등록된 빌드 실패입니다.',
        failure: existingResult.rows[0]
      });
    }
    
    // [advice from AI] 새 빌드 실패 등록
    const result = await client.query(`
      INSERT INTO build_failures (
        job_name, build_number, repository_url, branch, commit_sha, commit_message,
        error_type, error_stage, error_message, stack_trace, log_url, screenshot_url,
        project_id, duration, failed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `, [
      jobName, buildNumber, repositoryUrl, branch, commitSha, commitMessage,
      errorType, errorStage, errorMessage, stackTrace, logUrl, screenshotUrl,
      projectId, duration, failedAt
    ]);
    
    client.release();
    
    res.json({
      success: true,
      message: '빌드 실패 정보가 등록되었습니다.',
      failure: result.rows[0]
    });
    
  } catch (error) {
    console.error('빌드 실패 등록 오류:', error);
    res.status(500).json({
      success: false,
      message: '빌드 실패 등록에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 이슈 댓글 추가
router.post('/issue-reports/:id/comments', verifyToken, requireRole(['admin', 'po', 'pe', 'qa']), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;
    
    const client = await pool.connect();
    
    const result = await client.query(`
      INSERT INTO issue_comments (
        issue_id, user_id, comment, created_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [id, userId, comment]);
    
    // [advice from AI] 이슈 업데이트 시간 갱신
    await client.query(`
      UPDATE issue_reports 
      SET updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    client.release();
    
    res.json({
      success: true,
      message: '댓글이 추가되었습니다.',
      comment: result.rows[0]
    });
    
  } catch (error) {
    console.error('댓글 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '댓글 추가에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 이슈 통계 조회
router.get('/statistics', verifyToken, requireRole(['admin', 'po', 'pe', 'qa']), async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        COUNT(CASE WHEN ir.status = 'open' THEN 1 END) as open_issues,
        COUNT(CASE WHEN ir.status = 'in_progress' THEN 1 END) as in_progress_issues,
        COUNT(CASE WHEN ir.status = 'resolved' THEN 1 END) as resolved_issues,
        COUNT(CASE WHEN ir.severity = 'critical' THEN 1 END) as critical_issues,
        COUNT(CASE WHEN ir.severity = 'high' THEN 1 END) as high_issues,
        COUNT(CASE WHEN bf.failed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as failures_24h,
        COUNT(CASE WHEN bf.failed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as failures_7d,
        AVG(CASE WHEN ir.resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (ir.resolved_at - ir.created_at))/3600 
          END) as avg_resolution_hours
      FROM issue_reports ir
      LEFT JOIN build_failures bf ON ir.build_failure_id = bf.id
    `);
    
    client.release();
    
    res.json({
      success: true,
      statistics: result.rows[0]
    });
    
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 정보를 가져오는 데 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
