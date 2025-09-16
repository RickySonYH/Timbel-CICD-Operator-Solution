// [advice from AI] 승인 및 의사결정 API 라우트
// 협업을 위한 승인 요청, 의사결정, 메시지 관리 API

const express = require('express');
const router = express.Router();
const ApprovalService = require('../services/approvalService');
const ApprovalWorkflowEngine = require('../services/approvalWorkflowEngine');

// [advice from AI] JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = {
      id: user.userId || user.id,
      roleType: user.roleType || 'user',
      permissionLevel: user.permissionLevel || 0
    };
    next();
  });
};

// [advice from AI] 승인 서비스 인스턴스
const approvalService = new ApprovalService();
const workflowEngine = new ApprovalWorkflowEngine();

// [advice from AI] 승인 요청 API

// 승인 요청 목록 조회
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      type = '', 
      priority = '',
      my_requests = false,
      my_approvals = false,
      include_processed = false
    } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT ar.*, u.full_name as requester_name, u.email as requester_email,
             d.name as department_name, p.name as project_name
      FROM approval_requests ar
      JOIN timbel_users u ON ar.requester_id = u.id
      LEFT JOIN departments d ON ar.department_id = d.id
      LEFT JOIN projects p ON ar.project_id = p.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 0;

    // [advice from AI] 내가 요청한 승인만 조회
    if (my_requests === 'true') {
      paramCount++;
      conditions.push(`ar.requester_id = $${paramCount}`);
      params.push(req.user.id);
    }

    // [advice from AI] 승인 처리 목록 조회 (처리된 항목 포함 가능)
    if (my_approvals === 'true') {
      paramCount++;
      if (include_processed === 'true') {
        // 처리된 항목도 포함
        conditions.push(`EXISTS (
          SELECT 1 FROM approval_assignments aa 
          WHERE aa.request_id = ar.request_id 
          AND aa.approver_id = $${paramCount}
        )`);
      } else {
        // 대기 중인 항목만
        conditions.push(`EXISTS (
          SELECT 1 FROM approval_assignments aa 
          WHERE aa.request_id = ar.request_id 
          AND aa.approver_id = $${paramCount} 
          AND aa.status = 'pending'
        )`);
      }
      params.push(req.user.id);
    }

    if (status) {
      paramCount++;
      conditions.push(`ar.status = $${paramCount}`);
      params.push(status);
    }

    if (type) {
      paramCount++;
      conditions.push(`ar.type = $${paramCount}`);
      params.push(type);
    }

    if (priority) {
      paramCount++;
      conditions.push(`ar.priority = $${paramCount}`);
      params.push(priority);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ar.created_at DESC`;

    // [advice from AI] 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM approval_requests ar`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [requestsResult, countResult] = await Promise.all([
      approvalService.pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      approvalService.pool.query(countQuery, params)
    ]);

    res.json({
      success: true,
      data: requestsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get approval requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch approval requests' });
  }
});

// 승인 요청 상세 조회
router.get('/requests/:request_id', authenticateToken, async (req, res) => {
  try {
    const { request_id } = req.params;

    // [advice from AI] 요청 정보 조회
    const requestResult = await approvalService.pool.query(`
      SELECT ar.*, u.full_name as requester_name, u.email as requester_email,
             d.name as department_name, p.name as project_name
      FROM approval_requests ar
      JOIN timbel_users u ON ar.requester_id = u.id
      LEFT JOIN departments d ON ar.department_id = d.id
      LEFT JOIN projects p ON ar.project_id = p.id
      WHERE ar.request_id = $1
    `, [request_id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Approval request not found' });
    }

    // [advice from AI] 승인자 목록 조회
    const approversResult = await approvalService.pool.query(`
      SELECT aa.*, u.full_name, u.email, u.role_type
      FROM approval_assignments aa
      JOIN timbel_users u ON aa.approver_id = u.id
      WHERE aa.request_id = $1
      ORDER BY aa.level
    `, [request_id]);

    // [advice from AI] 댓글 조회
    const commentsResult = await approvalService.pool.query(`
      SELECT ac.*, u.full_name as author_name
      FROM approval_comments ac
      JOIN timbel_users u ON ac.author_id = u.id
      WHERE ac.request_id = $1 AND ac.request_type = 'approval'
      ORDER BY ac.created_at ASC
    `, [request_id]);

    // [advice from AI] 로그 조회
    const logsResult = await approvalService.pool.query(`
      SELECT al.*, u.full_name as actor_name
      FROM approval_logs al
      JOIN timbel_users u ON al.actor_id = u.id
      WHERE al.request_id = $1
      ORDER BY al.created_at DESC
    `, [request_id]);

    res.json({
      success: true,
      data: {
        request: requestResult.rows[0],
        approvers: approversResult.rows,
        comments: commentsResult.rows,
        logs: logsResult.rows
      }
    });

  } catch (error) {
    console.error('Get approval request error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch approval request' });
  }
});

// 승인 요청 생성
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      requester_id: req.user.id
    };

    const result = await approvalService.createApprovalRequest(requestData);
    res.status(201).json(result);

  } catch (error) {
    console.error('Create approval request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 승인 응답
router.post('/requests/:request_id/respond', authenticateToken, async (req, res) => {
  try {
    const { request_id } = req.params;
    const responseData = {
      ...req.body,
      approver_id: req.user.id
    };

    const result = await approvalService.respondToApproval(request_id, req.user.id, responseData);
    res.json(result);

  } catch (error) {
    console.error('Respond to approval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// [advice from AI] 의사결정 요청 API

// 의사결정 요청 목록 조회
router.get('/decisions', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      type = '', 
      priority = '',
      my_requests = false,
      my_participations = false
    } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT dr.*, u.full_name as requester_name, u.email as requester_email,
             d.name as department_name, p.name as project_name
      FROM decision_requests dr
      JOIN timbel_users u ON dr.requester_id = u.id
      LEFT JOIN departments d ON dr.department_id = d.id
      LEFT JOIN projects p ON dr.project_id = p.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 0;

    // [advice from AI] 내가 요청한 의사결정만 조회
    if (my_requests === 'true') {
      paramCount++;
      conditions.push(`dr.requester_id = $${paramCount}`);
      params.push(req.user.id);
    }

    // [advice from AI] 내가 참여하는 의사결정만 조회
    if (my_participations === 'true') {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM decision_participants dp 
        WHERE dp.request_id = dr.request_id 
        AND dp.participant_id = $${paramCount}
      )`);
      params.push(req.user.id);
    }

    if (status) {
      paramCount++;
      conditions.push(`dr.status = $${paramCount}`);
      params.push(status);
    }

    if (type) {
      paramCount++;
      conditions.push(`dr.type = $${paramCount}`);
      params.push(type);
    }

    if (priority) {
      paramCount++;
      conditions.push(`dr.priority = $${paramCount}`);
      params.push(priority);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY dr.created_at DESC`;

    // [advice from AI] 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM decision_requests dr`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [decisionsResult, countResult] = await Promise.all([
      approvalService.pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      approvalService.pool.query(countQuery, params)
    ]);

    res.json({
      success: true,
      data: decisionsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get decision requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch decision requests' });
  }
});

// 의사결정 요청 상세 조회
router.get('/decisions/:request_id', authenticateToken, async (req, res) => {
  try {
    const { request_id } = req.params;

    // [advice from AI] 요청 정보 조회
    const requestResult = await approvalService.pool.query(`
      SELECT dr.*, u.full_name as requester_name, u.email as requester_email,
             d.name as department_name, p.name as project_name
      FROM decision_requests dr
      JOIN timbel_users u ON dr.requester_id = u.id
      LEFT JOIN departments d ON dr.department_id = d.id
      LEFT JOIN projects p ON dr.project_id = p.id
      WHERE dr.request_id = $1
    `, [request_id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Decision request not found' });
    }

    // [advice from AI] 참여자 목록 조회
    const participantsResult = await approvalService.pool.query(`
      SELECT dp.*, u.full_name, u.email, u.role_type
      FROM decision_participants dp
      JOIN timbel_users u ON dp.participant_id = u.id
      WHERE dp.request_id = $1
      ORDER BY dp.role, dp.invited_at
    `, [request_id]);

    // [advice from AI] 투표 결과 조회
    const votesResult = await approvalService.pool.query(`
      SELECT dv.*, u.full_name as voter_name
      FROM decision_votes dv
      JOIN timbel_users u ON dv.participant_id = u.id
      WHERE dv.request_id = $1
      ORDER BY dv.voted_at
    `, [request_id]);

    // [advice from AI] 댓글 조회
    const commentsResult = await approvalService.pool.query(`
      SELECT ac.*, u.full_name as author_name
      FROM approval_comments ac
      JOIN timbel_users u ON ac.author_id = u.id
      WHERE ac.request_id = $1 AND ac.request_type = 'decision'
      ORDER BY ac.created_at ASC
    `, [request_id]);

    res.json({
      success: true,
      data: {
        request: requestResult.rows[0],
        participants: participantsResult.rows,
        votes: votesResult.rows,
        comments: commentsResult.rows
      }
    });

  } catch (error) {
    console.error('Get decision request error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch decision request' });
  }
});

// 의사결정 요청 생성
router.post('/decisions', authenticateToken, async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      requester_id: req.user.id
    };

    const result = await approvalService.createDecisionRequest(requestData);
    res.status(201).json(result);

  } catch (error) {
    console.error('Create decision request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 의사결정 투표
router.post('/decisions/:request_id/vote', authenticateToken, async (req, res) => {
  try {
    const { request_id } = req.params;
    const voteData = {
      ...req.body,
      participant_id: req.user.id
    };

    const result = await approvalService.voteOnDecision(request_id, req.user.id, voteData);
    res.json(result);

  } catch (error) {
    console.error('Vote on decision error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// [advice from AI] 메시지 API

// 메시지 목록 조회
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      request_id = '',
      request_type = '',
      is_read = ''
    } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT am.*, u.full_name as sender_name, u.email as sender_email
      FROM approval_messages am
      JOIN timbel_users u ON am.sender_id = u.id
      WHERE am.recipient_id = $1
    `;

    const params = [req.user.id];
    let paramCount = 1;

    if (request_id) {
      paramCount++;
      query += ` AND am.request_id = $${paramCount}`;
      params.push(request_id);
    }

    if (request_type) {
      paramCount++;
      query += ` AND am.request_type = $${paramCount}`;
      params.push(request_type);
    }

    if (is_read !== '') {
      paramCount++;
      query += ` AND am.is_read = $${paramCount}`;
      params.push(is_read === 'true');
    }

    query += ` ORDER BY am.sent_at DESC`;

    // [advice from AI] 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as total FROM approval_messages am WHERE am.recipient_id = $1`;
    const countParams = [req.user.id];
    let countParamCount = 1;

    if (request_id) {
      countParamCount++;
      countQuery += ` AND am.request_id = $${countParamCount}`;
      countParams.push(request_id);
    }

    if (request_type) {
      countParamCount++;
      countQuery += ` AND am.request_type = $${countParamCount}`;
      countParams.push(request_type);
    }

    if (is_read !== '') {
      countParamCount++;
      countQuery += ` AND am.is_read = $${countParamCount}`;
      countParams.push(is_read === 'true');
    }

    const [messagesResult, countResult] = await Promise.all([
      approvalService.pool.query(query + ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, [...params, limit, offset]),
      approvalService.pool.query(countQuery, countParams)
    ]);

    res.json({
      success: true,
      data: messagesResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// 메시지 전송
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const messageData = {
      ...req.body,
      sender_id: req.user.id
    };

    const result = await approvalService.sendMessage(messageData);
    res.status(201).json(result);

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 메시지 읽음 처리
router.put('/messages/:message_id/read', authenticateToken, async (req, res) => {
  try {
    const { message_id } = req.params;

    const result = await approvalService.pool.query(`
      UPDATE approval_messages 
      SET is_read = true, read_at = NOW()
      WHERE message_id = $1 AND recipient_id = $2
      RETURNING id, message_id, read_at
    `, [message_id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// [advice from AI] 댓글 API

// 댓글 추가
router.post('/comments', authenticateToken, async (req, res) => {
  try {
    const { request_id, request_type, content, parent_comment_id, is_internal = false } = req.body;

    const result = await approvalService.pool.query(`
      INSERT INTO approval_comments (
        request_id, request_type, author_id, parent_comment_id, content, is_internal
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, comment_id, created_at
    `, [request_id, request_type, req.user.id, parent_comment_id, content, is_internal]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// [advice from AI] 대시보드 통계 API

// 승인 대시보드 통계
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // [advice from AI] 내가 요청한 승인 통계
    const myRequestsStats = await approvalService.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM approval_requests 
      WHERE requester_id = $1
    `, [userId]);

    // [advice from AI] 내가 승인해야 할 요청 통계
    const myApprovalsStats = await approvalService.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN aa.status = 'rejected' THEN 1 END) as rejected
      FROM approval_assignments aa
      WHERE aa.approver_id = $1
    `, [userId]);

    // [advice from AI] 내가 참여하는 의사결정 통계
    const myDecisionsStats = await approvalService.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN dr.status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN dr.status = 'voting' THEN 1 END) as voting,
        COUNT(CASE WHEN dr.status = 'decided' THEN 1 END) as decided
      FROM decision_requests dr
      JOIN decision_participants dp ON dr.request_id = dp.request_id
      WHERE dp.participant_id = $1
    `, [userId]);

    // [advice from AI] 읽지 않은 메시지 수
    const unreadMessages = await approvalService.pool.query(`
      SELECT COUNT(*) as count
      FROM approval_messages 
      WHERE recipient_id = $1 AND is_read = false
    `, [userId]);

    res.json({
      success: true,
      data: {
        my_requests: myRequestsStats.rows[0],
        my_approvals: myApprovalsStats.rows[0],
        my_decisions: myDecisionsStats.rows[0],
        unread_messages: parseInt(unreadMessages.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// [advice from AI] 워크플로우 API

// 워크플로우 생성 (테스트용)
router.post('/workflow/create', authenticateToken, async (req, res) => {
  try {
    const workflowData = {
      ...req.body,
      requester_id: req.user.id
    };

    const result = await workflowEngine.createApprovalWorkflow(workflowData);
    res.json(result);

  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 워크플로우 템플릿 목록 조회
router.get('/workflow/templates', authenticateToken, async (req, res) => {
  try {
    const { type = '', department_id = '' } = req.query;

    let query = `
      SELECT awt.*, u.full_name as created_by_name, d.name as department_name
      FROM approval_workflow_templates awt
      LEFT JOIN timbel_users u ON awt.created_by = u.id
      LEFT JOIN departments d ON awt.department_id = d.id
      WHERE awt.is_active = true
    `;

    const params = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      query += ` AND awt.type = $${paramCount}`;
      params.push(type);
    }

    if (department_id) {
      paramCount++;
      query += ` AND awt.department_id = $${paramCount}`;
      params.push(department_id);
    }

    query += ` ORDER BY awt.created_at DESC`;

    const result = await workflowEngine.pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get workflow templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflow templates' });
  }
});

// 워크플로우 템플릿 생성
router.post('/workflow/templates', authenticateToken, async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      created_by: req.user.id
    };

    const result = await workflowEngine.createWorkflowTemplate(templateData);
    res.status(201).json(result);

  } catch (error) {
    console.error('Create workflow template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 워크플로우 템플릿 상세 조회
router.get('/workflow/templates/:template_id', authenticateToken, async (req, res) => {
  try {
    const { template_id } = req.params;

    const result = await workflowEngine.pool.query(`
      SELECT awt.*, u.full_name as created_by_name, d.name as department_name
      FROM approval_workflow_templates awt
      LEFT JOIN timbel_users u ON awt.created_by = u.id
      LEFT JOIN departments d ON awt.department_id = d.id
      WHERE awt.template_id = $1
    `, [template_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow template not found' });
    }

    // [advice from AI] 워크플로우 단계 조회
    const stepsResult = await workflowEngine.pool.query(`
      SELECT * FROM approval_workflow_steps
      WHERE template_id = $1
      ORDER BY step_order
    `, [template_id]);

    res.json({
      success: true,
      data: {
        template: result.rows[0],
        steps: stepsResult.rows
      }
    });

  } catch (error) {
    console.error('Get workflow template error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflow template' });
  }
});

// [advice from AI] 권한 레벨 정보 조회
router.get('/permission-levels', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: workflowEngine.permissionLevels
    });

  } catch (error) {
    console.error('Get permission levels error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permission levels' });
  }
});

// [advice from AI] 금액별 승인 규칙 조회
router.get('/approval-rules', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        amountThresholds: workflowEngine.amountThresholds,
        projectTypeRules: workflowEngine.projectTypeRules
      }
    });

  } catch (error) {
    console.error('Get approval rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch approval rules' });
  }
});

// [advice from AI] 승인 현황 통계
router.get('/workflow/stats', authenticateToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let timeFilter = '';
    if (period === '7d') {
      timeFilter = "created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      timeFilter = "created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === '90d') {
      timeFilter = "created_at >= NOW() - INTERVAL '90 days'";
    }

    // [advice from AI] 승인 요청 통계
    const requestStats = await approvalService.pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        AVG(CASE WHEN status = 'approved' THEN 
          EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 
        END) as avg_approval_hours
      FROM approval_requests
      ${timeFilter ? `WHERE ${timeFilter}` : ''}
    `);

    // [advice from AI] 승인자별 통계
    const approverStats = await approvalService.pool.query(`
      SELECT 
        u.full_name,
        u.role_type,
        u.permission_level,
        COUNT(aa.id) as total_assignments,
        COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_assignments,
        COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved_assignments,
        COUNT(CASE WHEN aa.status = 'rejected' THEN 1 END) as rejected_assignments,
        AVG(CASE WHEN aa.status != 'pending' THEN 
          EXTRACT(EPOCH FROM (aa.responded_at - aa.assigned_at)) / 3600 
        END) as avg_response_hours
      FROM approval_assignments aa
      JOIN timbel_users u ON aa.approver_id = u.id
      ${timeFilter ? `WHERE aa.assigned_at >= NOW() - INTERVAL '${period.replace('d', ' days')}'` : ''}
      GROUP BY u.id, u.full_name, u.role_type, u.permission_level
      ORDER BY total_assignments DESC
    `);

    // [advice from AI] 부서별 통계
    const departmentStats = await approvalService.pool.query(`
      SELECT 
        d.name as department_name,
        COUNT(ar.id) as total_requests,
        COUNT(CASE WHEN ar.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN ar.status = 'approved' THEN 1 END) as approved_requests,
        AVG(ar.amount) as avg_amount
      FROM approval_requests ar
      LEFT JOIN departments d ON ar.department_id = d.id
      ${timeFilter ? `WHERE ar.created_at >= NOW() - INTERVAL '${period.replace('d', ' days')}'` : ''}
      GROUP BY d.id, d.name
      ORDER BY total_requests DESC
    `);

    res.json({
      success: true,
      data: {
        request_stats: requestStats.rows[0],
        approver_stats: approverStats.rows,
        department_stats: departmentStats.rows,
        period: period
      }
    });

  } catch (error) {
    console.error('Get workflow stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflow stats' });
  }
});

// [advice from AI] 승인 요청 상세 정보 조회
router.get('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await approvalService.getRequestDetail(requestId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('승인 요청 상세 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '승인 요청 상세 정보를 불러올 수 없습니다.' 
    });
  }
});

// [advice from AI] 승인 요청 응답 처리
router.post('/requests/:requestId/respond', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, comment, metadata } = req.body;
    const approverId = req.user.id;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효한 액션을 제공해주세요 (approve 또는 reject)' 
      });
    }
    
    const result = await approvalService.respondToRequest(
      requestId, 
      approverId, 
      action, 
      comment, 
      metadata
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('승인 응답 처리 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '승인 응답 처리 중 오류가 발생했습니다.' 
    });
  }
});

// [advice from AI] 댓글 추가
router.post('/comments', authenticateToken, async (req, res) => {
  try {
    const { request_id, content, is_internal = false } = req.body;
    const authorId = req.user.id;
    
    if (!request_id || !content) {
      return res.status(400).json({ 
        success: false, 
        error: '요청 ID와 댓글 내용은 필수입니다.' 
      });
    }
    
    const result = await approvalService.addComment(
      request_id, 
      authorId, 
      content, 
      is_internal
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('댓글 추가 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 추가 중 오류가 발생했습니다.' 
    });
  }
});

// [advice from AI] 승인 워크플로우 전체 현황 조회
router.get('/workflow/overview', authenticateToken, async (req, res) => {
  try {
    const result = await approvalService.getWorkflowOverview();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('워크플로우 전체 현황 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '워크플로우 현황을 불러올 수 없습니다.' 
    });
  }
});

// [advice from AI] 특정 승인 요청의 흐름 조회
router.get('/workflow/flow/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await approvalService.getRequestFlow(requestId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('승인 요청 흐름 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '승인 흐름을 불러올 수 없습니다.' 
    });
  }
});

// [advice from AI] 팀/부서별 승인 현황 조회
router.get('/team/stats', authenticateToken, async (req, res) => {
  try {
    const result = await approvalService.getTeamApprovalStats();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('팀 승인 현황 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '팀 승인 현황을 불러올 수 없습니다.' 
    });
  }
});

// [advice from AI] 승인/반려 결정 취소
router.post('/requests/:requestId/cancel', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const cancelerId = req.user.userId;
    
    console.log('🔄 승인 결정 취소 요청:', {
      requestId,
      cancelerId,
      reason
    });
    
    const result = await approvalService.cancelApprovalDecision(requestId, cancelerId, reason);
    
    res.json(result);
  } catch (error) {
    console.error('승인 결정 취소 실패:', error);
    res.status(400).json({
      success: false,
      error: 'Cancel Failed',
      message: error.message
    });
  }
});

module.exports = router;
