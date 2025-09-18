// [advice from AI] 승인 관리 API 라우터

const express = require('express');
const ApprovalService = require('../services/approvalService');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 승인 요청 생성
router.post('/request', jwtAuth.verifyToken, async (req, res) => {
  try {
    const approvalService = new ApprovalService();
    
    const approvalData = {
      title: req.body.title || `시스템 등록 승인: ${req.body.systemName}`,
      description: req.body.description || req.body.reason || '승인 요청',
      type: req.body.type || 'system_registration',
      category: req.body.category || 'system',
      priority: req.body.priority || 'medium',
      requesterId: req.user.userId,
      department_id: req.body.department_id,
      project_id: req.body.project_id,
      due_date: req.body.duration ? new Date(Date.now() + parseInt(req.body.duration) * 24 * 60 * 60 * 1000) : null,
      metadata: req.body.metadata || {},
      approvers: [
        ...(req.body.selectedQA ? [{ user_id: req.body.selectedQA, role: 'qa', order: 1 }] : []),
        ...(req.body.selectedPO ? [{ user_id: req.body.selectedPO, role: 'po', order: 2 }] : []),
        ...(req.body.selectedExecutive ? [{ user_id: req.body.selectedExecutive, role: 'admin', order: 3 }] : [])
      ]
    };

    const result = await approvalService.createApprovalRequest(approvalData);
    
    // [advice from AI] 메신저 알림 전송
    try {
      await approvalService.sendApprovalNotifications(
        result.request_id, 
        'request_created',
        {
          requesterName: req.user.fullName || req.user.username,
          systemName: approvalData.title,
          priority: approvalData.priority
        }
      );
      console.log('✅ 승인 요청 알림 전송 완료');
    } catch (notificationError) {
      console.warn('⚠️ 알림 전송 실패:', notificationError.message);
    }
    
    res.json({
      success: true,
      data: result,
      message: '승인 요청이 성공적으로 생성되고 알림이 전송되었습니다.'
    });

  } catch (error) {
    console.error('승인 요청 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Approval Request Failed',
      message: error.message || '승인 요청 생성 중 오류가 발생했습니다.'
    });
  }
});

// [advice from AI] 승인 대기 목록 조회
router.get('/pending', jwtAuth.verifyToken, async (req, res) => {
  try {
    const approvalService = new ApprovalService();
    const { type, status = 'pending' } = req.query;
    
    const pendingApprovals = await approvalService.getPendingApprovals({
      type,
      status,
      approverId: req.user.userId,
      userRole: req.user.roleType
    });
    
    res.json({
      success: true,
      data: pendingApprovals,
      message: '승인 대기 목록을 조회했습니다.'
    });

  } catch (error) {
    console.error('승인 대기 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Query Failed',
      message: error.message || '승인 대기 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// [advice from AI] 승인 처리 (승인/거부)
router.post('/:requestId/approve', jwtAuth.verifyToken, async (req, res) => {
  try {
    const approvalService = new ApprovalService();
    const { requestId } = req.params;
    const { action, comment } = req.body; // action: 'approve' | 'reject'
    
    const result = await approvalService.processApproval({
      requestId,
      approverId: req.user.userId,
      action,
      comment,
      metadata: req.body.metadata || {}
    });
    
    // [advice from AI] 승인 처리 알림 전송
    try {
      await approvalService.sendApprovalNotifications(
        requestId,
        action === 'approve' ? 'request_approved' : 'request_rejected',
        {
          approverName: req.user.fullName || req.user.username,
          action: action,
          comment: comment
        }
      );
      console.log(`✅ 승인 ${action} 알림 전송 완료`);
    } catch (notificationError) {
      console.warn('⚠️ 알림 전송 실패:', notificationError.message);
    }
    
    res.json({
      success: true,
      data: result,
      message: `승인 요청이 ${action === 'approve' ? '승인' : '거부'}되었고 알림이 전송되었습니다.`
    });

  } catch (error) {
    console.error('승인 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Approval Process Failed',
      message: error.message || '승인 처리 중 오류가 발생했습니다.'
    });
  }
});

// [advice from AI] 사용자별 승인자 목록 조회
router.get('/approvers', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
    
    // PO 목록
    const poResult = await pool.query(`
      SELECT id, username, full_name, email 
      FROM timbel_users 
      WHERE role_type = 'po' AND (is_active = true OR is_active IS NULL)
    `);
    
    // QA/QC 목록
    const qaResult = await pool.query(`
      SELECT id, username, full_name, email 
      FROM timbel_users 
      WHERE role_type = 'qa' AND (is_active = true OR is_active IS NULL)
    `);
    
    // 경영진 목록
    const executiveResult = await pool.query(`
      SELECT id, username, full_name, email 
      FROM timbel_users 
      WHERE role_type IN ('admin', 'executive') AND (is_active = true OR is_active IS NULL)
    `);
    
    res.json({
      success: true,
      data: {
        pos: poResult.rows,
        qas: qaResult.rows,
        executives: executiveResult.rows
      },
      message: '승인자 목록을 조회했습니다.'
    });

  } catch (error) {
    console.error('승인자 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Query Failed',
      message: error.message || '승인자 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// [advice from AI] 메시지 센터용 승인 메시지 조회
router.get('/messages', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { limit = 10, is_read } = req.query;
    const userId = req.user.userId;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
    
    let whereClause = 'WHERE (am.recipient_id = $1 OR am.recipient_id IS NULL)';
    let params = [userId];
    
    if (is_read !== undefined) {
      whereClause += ' AND am.is_read = $2';
      params.push(is_read === 'true');
    }
    
    const query = `
      SELECT 
        am.message_id as id,
        am.message_type as type,
        am.subject as title,
        am.content as message,
        am.priority,
        am.sent_at as created_at,
        am.is_read,
        am.request_id,
        ar.title as request_title,
        u.full_name as sender_name
      FROM approval_messages am
      LEFT JOIN approval_requests ar ON am.request_id = ar.request_id
      LEFT JOIN timbel_users u ON am.sender_id = u.id
      ${whereClause}
      ORDER BY am.sent_at DESC
      LIMIT $${params.length + 1}
    `;
    
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      message: '승인 메시지를 조회했습니다.'
    });

  } catch (error) {
    console.error('승인 메시지 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Query Failed',
      message: error.message || '메시지 조회 중 오류가 발생했습니다.'
    });
  }
});

// [advice from AI] 메시지 센터 통계 조회
router.get('/dashboard/stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
    
    // [advice from AI] 내가 요청한 승인 통계
    const myRequestsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM approval_requests 
      WHERE requester_id = $1
    `, [userId]);
    
    // [advice from AI] 내가 승인해야 할 통계
    const myApprovalsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN aa.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN aa.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN aa.status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM approval_assignments aa
      WHERE aa.approver_id = $1
    `, [userId]);
    
    // [advice from AI] 읽지 않은 메시지 수
    const unreadMessagesResult = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM approval_messages
      WHERE (recipient_id = $1 OR recipient_id IS NULL) AND is_read = false
    `, [userId]);
    
    res.json({
      success: true,
      data: {
        my_requests: myRequestsResult.rows[0],
        my_approvals: myApprovalsResult.rows[0],
        my_decisions: { total: '0', open: '0', voting: '0', decided: '0' }, // 임시
        unread_messages: parseInt(unreadMessagesResult.rows[0].unread_count)
      },
      message: '승인 대시보드 통계를 조회했습니다.'
    });

  } catch (error) {
    console.error('승인 대시보드 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Query Failed',
      message: error.message || '통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// [advice from AI] 승인 요청 목록 조회 (실제 데이터 기반)
router.get('/requests', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { my_approvals, my_requests, status, limit = 20, offset = 0 } = req.query;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });

    let query = '';
    let params = [];
    let paramIndex = 1;

    if (my_approvals === 'true') {
      // [advice from AI] 내가 승인해야 할 요청들 (자산 유형별 통계 포함)
      query = `
        SELECT DISTINCT 
          ar.request_id,
          ar.title,
          ar.type,
          ar.priority,
          ar.status as request_status,
          ar.description,
          ar.metadata,
          ar.created_at,
          ar.due_date,
          u.full_name as requester_name,
          aa.level as approval_level,
          aa.status as my_approval_status,
          aa.assigned_at,
          aa.timeout_hours,
          -- [advice from AI] pending_knowledge_assets에서 자산 유형별 통계
          COALESCE(pka_stats.code_components, 0) as code_components_count,
          COALESCE(pka_stats.documents, 0) as documents_count,
          COALESCE(pka_stats.design_assets, 0) as design_assets_count,
          COALESCE(pka_stats.catalog_components, 0) as catalog_components_count,
          COALESCE(pka_stats.total_assets, 0) as total_assets_count
        FROM approval_requests ar
        JOIN approval_assignments aa ON ar.request_id = aa.request_id
        JOIN timbel_users u ON ar.requester_id = u.id
        LEFT JOIN (
          SELECT 
            approval_request_id,
            COUNT(CASE WHEN asset_type = 'code_component' THEN 1 END) as code_components,
            COUNT(CASE WHEN asset_type = 'document' THEN 1 END) as documents,
            COUNT(CASE WHEN asset_type = 'design_asset' THEN 1 END) as design_assets,
            COUNT(CASE WHEN asset_type = 'catalog_component' THEN 1 END) as catalog_components,
            COUNT(*) as total_assets
          FROM pending_knowledge_assets
          WHERE approval_request_id IS NOT NULL
          GROUP BY approval_request_id
        ) pka_stats ON ar.request_id = pka_stats.approval_request_id
        WHERE aa.approver_id = $${paramIndex++}
      `;
      params.push(userId);

      if (status) {
        query += ` AND aa.status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` ORDER BY ar.created_at DESC, aa.level ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(parseInt(limit), parseInt(offset));

    } else if (my_requests === 'true') {
      // [advice from AI] 내가 요청한 승인들
      query = `
        SELECT 
          ar.request_id,
          ar.title,
          ar.type,
          ar.priority,
          ar.status,
          ar.description,
          ar.created_at,
          ar.due_date,
          u.full_name as requester_name,
          COUNT(aa.id) as total_approvers,
          COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN aa.status = 'rejected' THEN 1 END) as rejected_count
        FROM approval_requests ar
        JOIN timbel_users u ON ar.requester_id = u.id
        LEFT JOIN approval_assignments aa ON ar.request_id = aa.request_id
        WHERE ar.requester_id = $${paramIndex++}
      `;
      params.push(userId);

      if (status) {
        query += ` AND ar.status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` 
        GROUP BY ar.request_id, ar.title, ar.type, ar.priority, ar.status, ar.description, ar.created_at, ar.due_date, u.full_name
        ORDER BY ar.created_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(parseInt(limit), parseInt(offset));

    } else {
      // [advice from AI] 전체 승인 요청 (관리자용)
      query = `
        SELECT 
          ar.request_id,
          ar.title,
          ar.type,
          ar.priority,
          ar.status,
          ar.description,
          ar.created_at,
          ar.due_date,
          u.full_name as requester_name,
          COUNT(aa.id) as total_approvers,
          COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_count
        FROM approval_requests ar
        JOIN timbel_users u ON ar.requester_id = u.id
        LEFT JOIN approval_assignments aa ON ar.request_id = aa.request_id
        WHERE 1=1
      `;

      if (status) {
        query += ` AND ar.status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` 
        GROUP BY ar.request_id, ar.title, ar.type, ar.priority, ar.status, ar.description, ar.created_at, ar.due_date, u.full_name
        ORDER BY ar.created_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(parseInt(limit), parseInt(offset));
    }

    console.log('승인 요청 목록 쿼리:', { query, params, userId, queryParams: req.query });

    const result = await pool.query(query, params);
    
    console.log(`승인 요청 목록 조회 결과: ${result.rows.length}개 항목`);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      query_params: { my_approvals, my_requests, status, limit, offset },
      message: '승인 요청 목록을 조회했습니다.'
    });

  } catch (error) {
    console.error('승인 요청 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Approval Requests Failed',
      message: '승인 요청 목록 조회에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 지식 자산 승인 대기 목록 조회 (pending_knowledge_assets 기반)
router.get('/pending-assets', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { asset_type, system_id, status = 'pending', limit = 50, offset = 0 } = req.query;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });

    // [advice from AI] 승인된 시스템의 pending 자산들만 조회
    let query = `
      SELECT 
        pka.id,
        pka.asset_type,
        pka.asset_data,
        pka.system_info,
        pka.source_info,
        pka.status,
        pka.created_at,
        ar.request_id as approval_request_id,
        ar.title as system_title,
        ar.status as system_approval_status,
        ss.system_name,
        ss.repository_url,
        ss.branch_name,
        u.full_name as requester_name
      FROM pending_knowledge_assets pka
      LEFT JOIN approval_requests ar ON pka.approval_request_id = ar.request_id
      LEFT JOIN system_snapshots ss ON pka.extraction_id = ss.extraction_id
      LEFT JOIN timbel_users u ON ar.requester_id = u.id
      WHERE pka.status = $1
        AND ar.status = 'approved' -- 시스템이 승인된 경우만
    `;
    
    let params = [status];
    let paramIndex = 2;

    if (asset_type) {
      query += ` AND pka.asset_type = $${paramIndex++}`;
      params.push(asset_type);
    }

    if (system_id) {
      query += ` AND ar.request_id = $${paramIndex++}`;
      params.push(system_id);
    }

    query += ` ORDER BY pka.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('지식 자산 승인 대기 목록 쿼리:', { query, params });

    const result = await pool.query(query, params);
    
    // [advice from AI] 자산 데이터 파싱 및 구조화
    const assets = result.rows.map(row => {
      const assetData = typeof row.asset_data === 'string' ? JSON.parse(row.asset_data) : row.asset_data;
      const systemInfo = typeof row.system_info === 'string' ? JSON.parse(row.system_info) : row.system_info;
      
      return {
        id: row.id,
        name: assetData.name || assetData.title || 'Unknown Asset',
        type: row.asset_type,
        description: assetData.description || assetData.content?.substring(0, 200) || '',
        file_path: assetData.file_path || '',
        language: assetData.language || '',
        size: assetData.file_size || assetData.size || 0,
        systemName: row.system_name || systemInfo?.name || 'Unknown System',
        systemId: row.approval_request_id,
        requester_name: row.requester_name,
        created_at: row.created_at,
        metadata: assetData
      };
    });

    // [advice from AI] 시스템별 그룹화
    const systemGroups = {};
    assets.forEach(asset => {
      if (!systemGroups[asset.systemId]) {
        systemGroups[asset.systemId] = {
          systemId: asset.systemId,
          systemName: asset.systemName,
          assets: []
        };
      }
      systemGroups[asset.systemId].assets.push(asset);
    });

    res.json({
      success: true,
      data: {
        assets: assets,
        systemGroups: Object.values(systemGroups),
        totalAssets: assets.length
      },
      query_params: { asset_type, system_id, status, limit, offset },
      message: '지식 자산 승인 대기 목록을 조회했습니다.'
    });

  } catch (error) {
    console.error('지식 자산 승인 대기 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Pending Assets Failed',
      message: '지식 자산 승인 대기 목록 조회에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 승인된 자산 목록 조회 (카탈로그 뷰용)
router.get('/approved-assets', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { asset_type, system_id, search, limit = 50, offset = 0 } = req.query;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });

    // [advice from AI] 승인 완료된 자산들을 각 테이블에서 조회
    const queries = [];
    
    if (!asset_type || asset_type === 'code_component') {
      queries.push(`
        SELECT 
          'code_component' as asset_type,
          cc.id,
          cc.name,
          cc.description,
          cc.file_path,
          cc.language,
          cc.complexity_score,
          cc.line_count,
          cc.created_at,
          cc.updated_at,
          cc.approval_status,
          u.full_name as created_by_name,
          'active' as status
        FROM code_components cc
        LEFT JOIN timbel_users u ON cc.created_by = u.id
        WHERE cc.approval_status = 'approved'
        ${search ? `AND (cc.name ILIKE '%${search}%' OR cc.description ILIKE '%${search}%')` : ''}
      `);
    }

    if (!asset_type || asset_type === 'design_asset') {
      queries.push(`
        SELECT 
          'design_asset' as asset_type,
          da.id,
          da.name,
          da.description,
          da.file_path,
          da.file_type as language,
          0 as complexity_score,
          da.file_size as line_count,
          da.created_at,
          da.updated_at,
          da.approval_status,
          u.full_name as created_by_name,
          'active' as status
        FROM design_assets da
        LEFT JOIN timbel_users u ON da.created_by = u.id
        WHERE da.approval_status = 'approved'
        ${search ? `AND (da.name ILIKE '%${search}%' OR da.description ILIKE '%${search}%')` : ''}
      `);
    }

    if (!asset_type || asset_type === 'document') {
      queries.push(`
        SELECT 
          'document' as asset_type,
          d.id,
          d.title as name,
          d.content as description,
          d.file_path,
          d.format as language,
          0 as complexity_score,
          d.word_count as line_count,
          d.created_at,
          d.updated_at,
          d.approval_status,
          u.full_name as created_by_name,
          'active' as status
        FROM documents d
        LEFT JOIN timbel_users u ON d.created_by = u.id
        WHERE d.approval_status = 'approved'
        ${search ? `AND (d.title ILIKE '%${search}%' OR d.content ILIKE '%${search}%')` : ''}
      `);
    }

    if (!asset_type || asset_type === 'catalog_component') {
      queries.push(`
        SELECT 
          'catalog_component' as asset_type,
          cc.id,
          cc.name,
          cc.description,
          cc.file_path,
          cc.type as language,
          0 as complexity_score,
          0 as line_count,
          cc.created_at,
          cc.updated_at,
          cc.approval_status,
          u.full_name as created_by_name,
          'active' as status
        FROM catalog_components cc
        LEFT JOIN timbel_users u ON cc.created_by = u.id
        WHERE cc.approval_status = 'approved'
        ${search ? `AND (cc.name ILIKE '%${search}%' OR cc.description ILIKE '%${search}%')` : ''}
      `);
    }

    // [advice from AI] UNION으로 모든 자산 타입 통합 조회
    const unionQuery = queries.join(' UNION ALL ') + ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    console.log('승인된 자산 목록 쿼리:', { unionQuery, filters: { asset_type, system_id, search } });

    const result = await pool.query(unionQuery);
    
    // [advice from AI] 통계 정보 계산
    const statsQuery = `
      SELECT 
        'code_component' as type, COUNT(*) as count FROM code_components WHERE approval_status = 'approved'
      UNION ALL
      SELECT 
        'design_asset' as type, COUNT(*) as count FROM design_assets WHERE approval_status = 'approved'
      UNION ALL
      SELECT 
        'document' as type, COUNT(*) as count FROM documents WHERE approval_status = 'approved'
      UNION ALL
      SELECT 
        'catalog_component' as type, COUNT(*) as count FROM catalog_components WHERE approval_status = 'approved'
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.type] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        assets: result.rows,
        stats: stats,
        totalAssets: result.rows.length
      },
      query_params: { asset_type, system_id, search, limit, offset },
      message: '승인된 자산 목록을 조회했습니다.'
    });

  } catch (error) {
    console.error('승인된 자산 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Approved Assets Failed',
      message: '승인된 자산 목록 조회에 실패했습니다.',
      details: error.message
    });
  }
});

// [advice from AI] 소유자별 미승인 항목 조회
router.get('/my-items', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { status = 'draft', type } = req.query;
    const ownerId = req.user.userId;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
    
    let items = [];
    
    // [advice from AI] 각 테이블에서 소유자의 미승인 항목 수집
    
    // 시스템 항목
    if (!type || type === 'system') {
      const systemQuery = `
        SELECT 
          s.id, 'system' as type, s.system_name as name, s.system_description as description,
          s.created_at, 'draft' as status, s.extraction_id,
          COALESCE(ar.status, 'draft') as approval_status
        FROM system_snapshots s
        LEFT JOIN approval_requests ar ON ar.metadata->>'extractionId' = s.extraction_id::text
        WHERE s.extraction_id IN (
          SELECT DISTINCT extraction_id FROM pending_knowledge_assets 
          WHERE system_info->>'requestedBy' = $1
        )
        ${status !== 'all' ? 'AND (ar.status = $2 OR (ar.status IS NULL AND $2 = \'draft\'))' : ''}
      `;
      
      const systemResult = await pool.query(
        systemQuery, 
        status !== 'all' ? [req.user.email, status] : [req.user.email]
      );
      items.push(...systemResult.rows);
    }
    
    // 코드 컴포넌트
    if (!type || type === 'component') {
      const componentQuery = `
        SELECT 
          cc.id, 'component' as type, cc.name, cc.description,
          cc.created_at, 'draft' as status, cc.created_by as owner_id
        FROM code_components cc
        WHERE cc.created_by = $1 AND cc.approval_status IS NULL
        ${status !== 'all' ? 'AND cc.status = $2' : ''}
      `;
      
      const componentResult = await pool.query(
        componentQuery,
        status !== 'all' ? [ownerId, status] : [ownerId]
      );
      items.push(...componentResult.rows);
    }
    
    // 디자인 자산
    if (!type || type === 'design') {
      const designQuery = `
        SELECT 
          da.id, 'design' as type, da.name, da.description,
          da.created_at, 'draft' as status, da.created_by as owner_id
        FROM design_assets da
        WHERE da.created_by = $1 AND da.approval_status IS NULL
        ${status !== 'all' ? 'AND da.status = $2' : ''}
      `;
      
      const designResult = await pool.query(
        designQuery,
        status !== 'all' ? [ownerId, status] : [ownerId]
      );
      items.push(...designResult.rows);
    }
    
    // 문서
    if (!type || type === 'document') {
      const documentQuery = `
        SELECT 
          d.id, 'document' as type, d.title as name, d.content as description,
          d.created_at, 'draft' as status, d.author_id as owner_id
        FROM documents d
        WHERE d.author_id = $1 AND d.approval_status IS NULL
        ${status !== 'all' ? 'AND d.status = $2' : ''}
      `;
      
      const documentResult = await pool.query(
        documentQuery,
        status !== 'all' ? [ownerId, status] : [ownerId]
      );
      items.push(...documentResult.rows);
    }
    
    // 생성일 기준 정렬
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    res.json({
      success: true,
      data: items,
      message: `소유자별 ${status} 항목을 조회했습니다.`
    });

  } catch (error) {
    console.error('소유자별 미승인 항목 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Query Failed',
      message: error.message || '소유자별 항목 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;