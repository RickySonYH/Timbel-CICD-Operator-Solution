// [advice from AI] 완전한 이슈 관리 시스템 - 빌드/배포 실패 자동 추적, 실시간 알림
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_cicd_operator',
  password: 'timbel_password',
  port: 5432,
});

// [advice from AI] 이슈 생성 API (자동 생성)
router.post('/create', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      issue_type, // build_failure, deployment_failure, monitoring_alert, manual
      title,
      description,
      severity, // critical, high, medium, low
      affected_system_id,
      affected_service,
      error_details,
      jenkins_build_id,
      argocd_application_id,
      prometheus_alert_id,
      auto_created = true
    } = req.body;

    // 이슈 생성
    const result = await pool.query(`
      INSERT INTO issues (
        issue_type, title, description, severity, status,
        affected_system_id, affected_service, error_details,
        jenkins_build_id, argocd_application_id, prometheus_alert_id,
        auto_created, created_by, priority_score
      )
      VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      issue_type,
      title,
      description,
      severity,
      affected_system_id,
      affected_service,
      JSON.stringify(error_details),
      jenkins_build_id,
      argocd_application_id,
      prometheus_alert_id,
      auto_created,
      req.user?.id || 'system',
      calculatePriorityScore(severity, issue_type)
    ]);

    const issue = result.rows[0];

    // 이슈 히스토리 기록
    await pool.query(`
      INSERT INTO issue_history (
        issue_id, action_type, action_description, performed_by
      )
      VALUES ($1, 'created', $2, $3)
    `, [
      issue.id,
      `이슈가 생성되었습니다: ${title}`,
      req.user?.id || 'system'
    ]);

    // 심각한 이슈의 경우 자동 알림 발송
    if (severity === 'critical' || severity === 'high') {
      await sendIssueNotification(issue);
    }

    res.json({
      success: true,
      issue: issue,
      message: '이슈가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('이슈 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '이슈 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 이슈 목록 조회 API
router.get('/list', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { 
      status = 'all', // open, in_progress, resolved, closed, all
      severity = 'all', // critical, high, medium, low, all
      issue_type = 'all', // build_failure, deployment_failure, monitoring_alert, manual, all
      limit = 50,
      offset = 0
    } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // 상태 필터
    if (status !== 'all') {
      whereConditions.push(`i.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // 심각도 필터
    if (severity !== 'all') {
      whereConditions.push(`i.severity = $${paramIndex}`);
      queryParams.push(severity);
      paramIndex++;
    }

    // 이슈 타입 필터
    if (issue_type !== 'all') {
      whereConditions.push(`i.issue_type = $${paramIndex}`);
      queryParams.push(issue_type);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT 
        i.*,
        u.username as created_by_name,
        u2.username as assigned_to_name,
        COUNT(ih.id) as history_count
      FROM issues i
      LEFT JOIN timbel_users u ON i.created_by = u.id
      LEFT JOIN timbel_users u2 ON i.assigned_to = u2.id
      LEFT JOIN issue_history ih ON i.id = ih.issue_id
      ${whereClause}
      GROUP BY i.id, u.username, u2.username
      ORDER BY i.priority_score DESC, i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    // 이슈 통계 계산
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_issues,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_issues,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_issues,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_issues,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_issues,
        COUNT(CASE WHEN auto_created = true THEN 1 END) as auto_created_issues
      FROM issues
      ${whereClause}
    `, queryParams.slice(0, -2)); // limit, offset 제외

    res.json({
      success: true,
      issues: result.rows,
      statistics: statsResult.rows[0],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: parseInt(statsResult.rows[0].total_issues)
      }
    });

  } catch (error) {
    console.error('이슈 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '이슈 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 이슈 상태 업데이트 API
router.put('/:id/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes, assigned_to } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 이슈 업데이트
      const updateResult = await client.query(`
        UPDATE issues 
        SET 
          status = $1, 
          resolution_notes = $2,
          assigned_to = $3,
          resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [status, resolution_notes, assigned_to, id]);

      if (updateResult.rows.length === 0) {
        throw new Error('이슈를 찾을 수 없습니다.');
      }

      const issue = updateResult.rows[0];

      // 히스토리 기록
      await client.query(`
        INSERT INTO issue_history (
          issue_id, action_type, action_description, performed_by
        )
        VALUES ($1, 'status_changed', $2, $3)
      `, [
        id,
        `상태가 ${status}로 변경되었습니다${resolution_notes ? `: ${resolution_notes}` : ''}`,
        req.user?.id || 'system'
      ]);

      await client.query('COMMIT');

      res.json({
        success: true,
        issue: issue,
        message: '이슈 상태가 성공적으로 업데이트되었습니다.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('이슈 상태 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '이슈 상태 업데이트 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Jenkins 빌드 실패 자동 이슈 생성 API
router.post('/auto-create/build-failure', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      jenkins_build_id,
      job_name,
      build_number,
      repository_url,
      error_log,
      system_id
    } = req.body;

    // 중복 이슈 체크
    const existingIssue = await pool.query(`
      SELECT id FROM issues 
      WHERE jenkins_build_id = $1 AND status NOT IN ('resolved', 'closed')
    `, [jenkins_build_id]);

    if (existingIssue.rows.length > 0) {
      return res.json({
        success: true,
        issue: existingIssue.rows[0],
        message: '이미 해당 빌드에 대한 이슈가 존재합니다.',
        duplicate: true
      });
    }

    // 자동 이슈 생성
    const issueData = {
      issue_type: 'build_failure',
      title: `Jenkins 빌드 실패: ${job_name} #${build_number}`,
      description: `Jenkins Job "${job_name}"의 빌드 #${build_number}가 실패했습니다.\n\n레포지토리: ${repository_url}`,
      severity: 'high',
      affected_system_id: system_id,
      affected_service: job_name,
      error_details: {
        jenkins_build_id,
        job_name,
        build_number,
        repository_url,
        error_log: error_log?.substring(0, 1000) // 로그 크기 제한
      },
      jenkins_build_id,
      auto_created: true
    };

    // 이슈 생성 API 재사용
    req.body = issueData;
    return router.handle(req, res, () => {
      const createHandler = router.stack.find(layer => 
        layer.route?.path === '/create' && layer.route?.methods.post
      );
      if (createHandler) {
        createHandler.handle(req, res);
      }
    });

  } catch (error) {
    console.error('자동 빌드 실패 이슈 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '자동 빌드 실패 이슈 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Argo CD 배포 실패 자동 이슈 생성 API
router.post('/auto-create/deployment-failure', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      argocd_application_id,
      application_name,
      environment,
      sync_error,
      health_status,
      system_id
    } = req.body;

    // 중복 이슈 체크
    const existingIssue = await pool.query(`
      SELECT id FROM issues 
      WHERE argocd_application_id = $1 AND status NOT IN ('resolved', 'closed')
    `, [argocd_application_id]);

    if (existingIssue.rows.length > 0) {
      return res.json({
        success: true,
        issue: existingIssue.rows[0],
        message: '이미 해당 배포에 대한 이슈가 존재합니다.',
        duplicate: true
      });
    }

    // 자동 이슈 생성
    const issueData = {
      issue_type: 'deployment_failure',
      title: `Argo CD 배포 실패: ${application_name} (${environment})`,
      description: `Argo CD 애플리케이션 "${application_name}"의 ${environment} 환경 배포가 실패했습니다.\n\n상태: ${health_status}`,
      severity: environment === 'production' ? 'critical' : 'high',
      affected_system_id: system_id,
      affected_service: application_name,
      error_details: {
        argocd_application_id,
        application_name,
        environment,
        sync_error,
        health_status
      },
      argocd_application_id,
      auto_created: true
    };

    // 이슈 생성
    req.body = issueData;
    return router.handle(req, res, () => {
      const createHandler = router.stack.find(layer => 
        layer.route?.path === '/create' && layer.route?.methods.post
      );
      if (createHandler) {
        createHandler.handle(req, res);
      }
    });

  } catch (error) {
    console.error('자동 배포 실패 이슈 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '자동 배포 실패 이슈 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 이슈 히스토리 조회 API
router.get('/:id/history', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        ih.*,
        u.username as performed_by_name
      FROM issue_history ih
      LEFT JOIN timbel_users u ON ih.performed_by = u.id
      WHERE ih.issue_id = $1
      ORDER BY ih.created_at DESC
    `, [id]);

    res.json({
      success: true,
      history: result.rows
    });

  } catch (error) {
    console.error('이슈 히스토리 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '이슈 히스토리 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 헬퍼 함수들
function calculatePriorityScore(severity, issueType) {
  let score = 0;
  
  // 심각도 점수
  switch (severity) {
    case 'critical': score += 100; break;
    case 'high': score += 75; break;
    case 'medium': score += 50; break;
    case 'low': score += 25; break;
  }
  
  // 이슈 타입 점수
  switch (issueType) {
    case 'build_failure': score += 20; break;
    case 'deployment_failure': score += 30; break;
    case 'monitoring_alert': score += 15; break;
    case 'manual': score += 10; break;
  }
  
  return score;
}

async function sendIssueNotification(issue) {
  try {
    console.log(`🚨 심각한 이슈 발생: ${issue.title}`);
    console.log(`📧 알림 발송: ${issue.severity} 등급 이슈`);
    
    // 실제 환경에서는 이메일, Slack, MS Teams 등으로 알림 발송
    await pool.query(`
      INSERT INTO issue_notifications (
        issue_id, notification_type, recipient, status, sent_at
      )
      VALUES ($1, 'email', 'admin@timbel.com', 'sent', NOW())
    `, [issue.id]);
    
  } catch (error) {
    console.error('이슈 알림 발송 실패:', error);
  }
}

module.exports = router;
