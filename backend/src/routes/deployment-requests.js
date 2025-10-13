const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] PostgreSQL 연결 풀 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 배포 요청 목록 조회 (운영센터용)
router.get('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 배포 요청 목록 조회 시작');

    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // [advice from AI] 배포 요청 목록 조회 (system_registrations 기반)
    const deploymentRequestsQuery = `
      SELECT 
        sr.id,
        sr.project_id,
        sr.po_decision,
        sr.admin_decision,
        sr.deployment_priority,
        sr.target_environment,
        sr.registration_notes,
        sr.created_at,
        sr.updated_at,
        sr.po_decided_at,
        sr.admin_decided_at,
        p.name as project_name,
        p.target_system_name,
        p.project_overview,
        p.project_status,
        po.full_name as po_name,
        po.email as po_email,
        admin_user.full_name as admin_name,
        -- QA 정보
        qr.quality_score,
        qr.approval_status as qa_status,
        qr.approved_at as qa_approved_at,
        -- 프로젝트 완료 보고서 정보
        pcr.completion_rate,
        pcr.repository_url,
        pcr.deployment_notes as pcr_notes,
        -- 현재 처리 상태 계산
        CASE 
          WHEN sr.admin_decision IS NOT NULL THEN 
            CASE sr.admin_decision 
              WHEN 'approve' THEN 'completed'
              WHEN 'reject' THEN 'rejected'
              ELSE 'unknown'
            END
          WHEN sr.po_decision = 'approve' THEN 'pending_operations'
          WHEN sr.po_decision = 'reject' THEN 'rejected_by_po'
          ELSE 'pending_po_decision'
        END as current_status,
        -- 우선순위 점수 계산
        CASE sr.deployment_priority
          WHEN 'high' THEN 3
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END as priority_score
      FROM system_registrations sr
      JOIN projects p ON sr.project_id = p.id
      LEFT JOIN timbel_users po ON sr.decided_by = po.id
        LEFT JOIN timbel_users admin_user ON sr.decided_by = admin_user.id
      LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
      LEFT JOIN project_completion_reports pcr ON p.id = pcr.project_id
      WHERE 1=1
        ${status ? 'AND sr.po_decision = $1' : ''}
        ${priority ? `AND sr.deployment_priority = $${status ? 2 : 1}` : ''}
      ORDER BY 
        priority_score DESC,
        sr.created_at ASC
      LIMIT $${(status ? 1 : 0) + (priority ? 1 : 0) + 1} 
      OFFSET $${(status ? 1 : 0) + (priority ? 1 : 0) + 2}
    `;

    const params = [];
    if (status) params.push(status);
    if (priority) params.push(priority);
    params.push(limit, offset);

    const deploymentRequestsResult = await client.query(deploymentRequestsQuery, params);
    const deploymentRequests = deploymentRequestsResult.rows;

    // [advice from AI] 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM system_registrations sr
      WHERE 1=1
        ${status ? 'AND sr.po_decision = $1' : ''}
        ${priority ? `AND sr.deployment_priority = $${status ? 2 : 1}` : ''}
    `;

    const countParams = [];
    if (status) countParams.push(status);
    if (priority) countParams.push(priority);

    const countResult = await client.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // [advice from AI] 상태별 통계
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN sr.admin_decision IS NULL AND sr.po_decision = 'approve' THEN 1 END) as pending_operations,
        COUNT(CASE WHEN sr.admin_decision = 'approve' THEN 1 END) as completed,
        COUNT(CASE WHEN sr.admin_decision = 'reject' OR sr.po_decision = 'reject' THEN 1 END) as rejected,
        COUNT(CASE WHEN sr.po_decision IS NULL THEN 1 END) as pending_po_decision,
        COUNT(CASE WHEN sr.deployment_priority = 'high' AND sr.admin_decision IS NULL THEN 1 END) as high_priority_pending,
        AVG(EXTRACT(EPOCH FROM (sr.admin_decided_at - sr.created_at))/86400) as avg_processing_days
      FROM system_registrations sr
      WHERE sr.created_at >= NOW() - INTERVAL '3 months'
    `;

    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];

    const response = {
      success: true,
      data: {
        requests: deploymentRequests.map(req => ({
          id: req.id,
          project_id: req.project_id,
          project_name: req.project_name,
          target_system_name: req.target_system_name,
          project_overview: req.project_overview,
          current_status: req.current_status,
          deployment_priority: req.deployment_priority,
          target_environment: req.target_environment,
          po_name: req.po_name,
          po_email: req.po_email,
          admin_name: req.admin_name,
          quality_score: req.quality_score,
          qa_status: req.qa_status,
          completion_rate: req.completion_rate,
          repository_url: req.repository_url,
          registration_notes: req.registration_notes,
          created_at: req.created_at,
          po_decided_at: req.po_decided_at,
          admin_decided_at: req.admin_decided_at,
          days_pending: req.admin_decided_at ? 0 : 
            Math.floor((new Date() - new Date(req.created_at)) / (1000 * 60 * 60 * 24))
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: parseInt(limit)
        },
        statistics: {
          pending_operations: parseInt(stats.pending_operations) || 0,
          completed: parseInt(stats.completed) || 0,
          rejected: parseInt(stats.rejected) || 0,
          pending_po_decision: parseInt(stats.pending_po_decision) || 0,
          high_priority_pending: parseInt(stats.high_priority_pending) || 0,
          avg_processing_days: parseFloat(stats.avg_processing_days) || 0
        }
      }
    };

    console.log('✅ 배포 요청 목록 조회 완료:', {
      total_requests: totalCount,
      pending_operations: response.data.statistics.pending_operations
    });

    res.json(response);

  } catch (error) {
    console.error('❌ 배포 요청 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배포 요청 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 특정 배포 요청 상세 조회
router.get('/:requestId', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  const client = await pool.connect();
  const { requestId } = req.params;
  
  try {
    console.log('🔍 배포 요청 상세 조회 시작:', requestId);

    // [advice from AI] 배포 요청 상세 정보
    const requestDetailQuery = `
      SELECT 
        sr.*,
        p.name as project_name,
        p.target_system_name,
        p.project_overview,
        p.project_status,
        p.created_at as project_created_at,
        po.full_name as po_name,
        po.email as po_email,
        admin_user.full_name as admin_name,
        admin_user.email as admin_email,
        -- QA 정보
        qr.quality_score,
        qr.approval_status as qa_status,
        qr.approved_at as qa_approved_at,
        qr.review_notes as qa_notes,
        qa_user.full_name as qa_reviewer_name,
        -- 프로젝트 완료 보고서
        pcr.completion_rate,
        pcr.repository_url,
        pcr.deployment_notes as pcr_notes,
        pcr.technical_specifications,
        pcr.performance_metrics,
        -- PE 정보
        pe.full_name as pe_name,
        pe.email as pe_email
      FROM system_registrations sr
      JOIN projects p ON sr.project_id = p.id
      LEFT JOIN timbel_users po ON sr.decided_by = po.id
        LEFT JOIN timbel_users admin_user ON sr.decided_by = admin_user.id
      LEFT JOIN timbel_users pe ON p.assigned_pe = pe.id
      LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
      LEFT JOIN timbel_users qa_user ON qr.reviewed_by = qa_user.id
      LEFT JOIN project_completion_reports pcr ON p.id = pcr.project_id
      WHERE sr.id = $1
    `;

    const requestDetailResult = await client.query(requestDetailQuery, [requestId]);
    
    if (requestDetailResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '배포 요청을 찾을 수 없습니다.'
      });
    }

    const requestDetail = requestDetailResult.rows[0];

    // [advice from AI] 배포 히스토리 조회
    const historyQuery = `
      SELECT 
        'po_decision' as action_type,
        sr.po_decided_at as action_date,
        po.full_name as actor_name,
        sr.po_decision as action_result,
        sr.registration_notes as notes
      FROM system_registrations sr
      LEFT JOIN timbel_users po ON sr.decided_by = po.id
      WHERE sr.id = $1 AND sr.po_decided_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'admin_decision' as action_type,
        sr.admin_decided_at as action_date,
        admin_user.full_name as actor_name,
        sr.admin_decision as action_result,
        sr.admin_notes as notes
      FROM system_registrations sr
        LEFT JOIN timbel_users admin_user ON sr.decided_by = admin_user.id
      WHERE sr.id = $1 AND sr.admin_decided_at IS NOT NULL
      
      ORDER BY action_date ASC
    `;

    const historyResult = await client.query(historyQuery, [requestId]);
    const history = historyResult.rows;

    // [advice from AI] 관련 인프라 정보 조회 (배포 환경에 따른)
    const infraQuery = `
      SELECT 
        di.service_name,
        di.service_type,
        di.endpoint_url,
        di.status,
        di.environment
      FROM deployment_infrastructure di
      WHERE di.environment = $1 OR di.environment = 'all'
      ORDER BY di.service_type, di.service_name
    `;

    const infraResult = await client.query(infraQuery, [requestDetail.target_environment || 'production']);
    const infrastructure = infraResult.rows;

    const response = {
      success: true,
      data: {
        request: {
          id: requestDetail.id,
          project_id: requestDetail.project_id,
          project_name: requestDetail.project_name,
          target_system_name: requestDetail.target_system_name,
          project_overview: requestDetail.project_overview,
          deployment_priority: requestDetail.deployment_priority,
          target_environment: requestDetail.target_environment,
          registration_notes: requestDetail.registration_notes,
          po_decision: requestDetail.po_decision,
          admin_decision: requestDetail.admin_decision,
          created_at: requestDetail.created_at,
          po_decided_at: requestDetail.po_decided_at,
          admin_decided_at: requestDetail.admin_decided_at,
          current_status: requestDetail.admin_decision ? 
            (requestDetail.admin_decision === 'approve' ? 'completed' : 'rejected') :
            (requestDetail.po_decision === 'approve' ? 'pending_operations' : 'pending_po_decision')
        },
        project: {
          name: requestDetail.project_name,
          target_system_name: requestDetail.target_system_name,
          overview: requestDetail.project_overview,
          status: requestDetail.project_status,
          created_at: requestDetail.project_created_at,
          repository_url: requestDetail.repository_url,
          completion_rate: requestDetail.completion_rate
        },
        stakeholders: {
          po: {
            name: requestDetail.po_name,
            email: requestDetail.po_email
          },
          pe: {
            name: requestDetail.pe_name,
            email: requestDetail.pe_email
          },
          admin: {
            name: requestDetail.admin_name,
            email: requestDetail.admin_email
          }
        },
        quality_assurance: {
          quality_score: requestDetail.quality_score,
          status: requestDetail.qa_status,
          approved_at: requestDetail.qa_approved_at,
          reviewer_name: requestDetail.qa_reviewer_name,
          notes: requestDetail.qa_notes
        },
        technical_details: {
          repository_url: requestDetail.repository_url,
          technical_specifications: requestDetail.technical_specifications,
          performance_metrics: requestDetail.performance_metrics,
          deployment_notes: requestDetail.pcr_notes
        },
        history: history.map(h => ({
          action_type: h.action_type,
          action_date: h.action_date,
          actor_name: h.actor_name,
          action_result: h.action_result,
          notes: h.notes
        })),
        infrastructure: infrastructure.map(infra => ({
          service_name: infra.service_name,
          service_type: infra.service_type,
          endpoint_url: infra.endpoint_url,
          status: infra.status,
          environment: infra.environment
        }))
      }
    };

    console.log('✅ 배포 요청 상세 조회 완료:', {
      request_id: requestId,
      project_name: requestDetail.project_name,
      current_status: response.data.request.current_status
    });

    res.json(response);

  } catch (error) {
    console.error('❌ 배포 요청 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배포 요청 상세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 운영센터 배포 승인/반려 처리
router.put('/:requestId/decision', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  const client = await pool.connect();
  const { requestId } = req.params;
  const { decision, notes, deployment_config } = req.body;
  const userId = req.user.userId;
  
  try {
    console.log('🔄 운영센터 배포 결정 처리 시작:', { requestId, decision });

    await client.query('BEGIN');

    // [advice from AI] 배포 요청 존재 확인
    const checkQuery = `
      SELECT sr.*, p.name as project_name
      FROM system_registrations sr
      JOIN projects p ON sr.project_id = p.id
      WHERE sr.id = $1 AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL
    `;

    const checkResult = await client.query(checkQuery, [requestId]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: '처리 가능한 배포 요청을 찾을 수 없습니다.'
      });
    }

    const request = checkResult.rows[0];

    // [advice from AI] 배포 결정 업데이트
    const updateQuery = `
      UPDATE system_registrations 
      SET 
        admin_decision = $1,
        admin_decided_by = $2,
        admin_decided_at = NOW(),
        admin_notes = $3,
        deployment_config = $4,
        updated_at = NOW()
      WHERE id = $5
    `;

    await client.query(updateQuery, [
      decision,
      userId,
      notes || (decision === 'approve' ? '배포 승인' : '배포 반려'),
      deployment_config ? JSON.stringify(deployment_config) : null,
      requestId
    ]);

    // [advice from AI] 승인된 경우 배포 파이프라인 트리거 준비
    if (decision === 'approve') {
      // 실제 CI/CD 파이프라인 트리거 로직은 여기에 추가
      console.log('🚀 배포 파이프라인 트리거 준비:', {
        project_name: request.project_name,
        target_environment: request.target_environment
      });
    }

    await client.query('COMMIT');

    console.log('✅ 운영센터 배포 결정 처리 완료:', { requestId, decision });

    res.json({
      success: true,
      message: `배포 요청이 ${decision === 'approve' ? '승인' : '반려'}되었습니다.`,
      data: {
        request_id: requestId,
        decision: decision,
        processed_at: new Date().toISOString(),
        project_name: request.project_name
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 운영센터 배포 결정 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '배포 결정 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 배포 요청 우선순위 변경
router.put('/:requestId/priority', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  const client = await pool.connect();
  const { requestId } = req.params;
  const { priority, reason } = req.body;
  
  try {
    console.log('🔄 배포 요청 우선순위 변경:', { requestId, priority });

    // [advice from AI] 우선순위 유효성 검사
    if (!['high', 'normal', 'low'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 우선순위입니다. (high, normal, low 중 선택)'
      });
    }

    const updateQuery = `
      UPDATE system_registrations 
      SET 
        deployment_priority = $1,
        priority_change_reason = $2,
        updated_at = NOW()
      WHERE id = $3 AND admin_decision IS NULL
    `;

    const result = await client.query(updateQuery, [priority, reason, requestId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '처리 가능한 배포 요청을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 배포 요청 우선순위 변경 완료:', { requestId, priority });

    res.json({
      success: true,
      message: '배포 요청 우선순위가 변경되었습니다.',
      data: {
        request_id: requestId,
        new_priority: priority,
        reason: reason
      }
    });

  } catch (error) {
    console.error('❌ 배포 요청 우선순위 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '우선순위 변경 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// [advice from AI] 배포 대시보드 통계
router.get('/dashboard/stats', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 배포 대시보드 통계 조회 시작');

    // [advice from AI] 전체 배포 통계
    const overallStatsQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN sr.admin_decision = 'approve' THEN 1 END) as completed_deployments,
        COUNT(CASE WHEN sr.admin_decision IS NULL AND sr.po_decision = 'approve' THEN 1 END) as pending_operations,
        COUNT(CASE WHEN sr.admin_decision = 'reject' OR sr.po_decision = 'reject' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN sr.deployment_priority = 'high' AND sr.admin_decision IS NULL THEN 1 END) as high_priority_pending,
        AVG(EXTRACT(EPOCH FROM (sr.admin_decided_at - sr.created_at))/86400) as avg_processing_days,
        COUNT(CASE WHEN sr.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as requests_this_week,
        COUNT(CASE WHEN sr.admin_decided_at >= NOW() - INTERVAL '7 days' AND sr.admin_decision = 'approve' THEN 1 END) as deployments_this_week
      FROM system_registrations sr
      WHERE sr.created_at >= NOW() - INTERVAL '3 months'
    `;

    const overallStatsResult = await client.query(overallStatsQuery);
    const overallStats = overallStatsResult.rows[0];

    // [advice from AI] 환경별 배포 통계
    const environmentStatsQuery = `
      SELECT 
        sr.target_environment,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN sr.admin_decision = 'approve' THEN 1 END) as completed,
        COUNT(CASE WHEN sr.admin_decision IS NULL AND sr.po_decision = 'approve' THEN 1 END) as pending,
        AVG(EXTRACT(EPOCH FROM (sr.admin_decided_at - sr.created_at))/86400) as avg_processing_days
      FROM system_registrations sr
      WHERE sr.created_at >= NOW() - INTERVAL '1 month'
      GROUP BY sr.target_environment
      ORDER BY total_requests DESC
    `;

    const environmentStatsResult = await client.query(environmentStatsQuery);
    const environmentStats = environmentStatsResult.rows;

    // [advice from AI] 최근 배포 활동
    const recentActivityQuery = `
      SELECT 
        sr.id,
        p.name as project_name,
        sr.deployment_priority,
        sr.target_environment,
        sr.admin_decision,
        sr.admin_decided_at,
        admin_user.full_name as admin_name,
        EXTRACT(EPOCH FROM (sr.admin_decided_at - sr.created_at))/86400 as processing_days
      FROM system_registrations sr
      JOIN projects p ON sr.project_id = p.id
        LEFT JOIN timbel_users admin_user ON sr.decided_by = admin_user.id
      WHERE sr.admin_decided_at IS NOT NULL
        AND sr.admin_decided_at >= NOW() - INTERVAL '7 days'
      ORDER BY sr.admin_decided_at DESC
      LIMIT 10
    `;

    const recentActivityResult = await client.query(recentActivityQuery);
    const recentActivity = recentActivityResult.rows;

    const response = {
      success: true,
      data: {
        overview: {
          total_requests: parseInt(overallStats.total_requests) || 0,
          completed_deployments: parseInt(overallStats.completed_deployments) || 0,
          pending_operations: parseInt(overallStats.pending_operations) || 0,
          rejected_requests: parseInt(overallStats.rejected_requests) || 0,
          high_priority_pending: parseInt(overallStats.high_priority_pending) || 0,
          avg_processing_days: parseFloat(overallStats.avg_processing_days) || 0,
          requests_this_week: parseInt(overallStats.requests_this_week) || 0,
          deployments_this_week: parseInt(overallStats.deployments_this_week) || 0,
          success_rate: overallStats.total_requests > 0 ? 
            ((parseInt(overallStats.completed_deployments) / parseInt(overallStats.total_requests)) * 100).toFixed(1) : '0.0'
        },
        environment_breakdown: environmentStats.map(env => ({
          environment: env.target_environment || 'production',
          total_requests: parseInt(env.total_requests),
          completed: parseInt(env.completed),
          pending: parseInt(env.pending),
          avg_processing_days: parseFloat(env.avg_processing_days) || 0,
          success_rate: env.total_requests > 0 ? 
            ((parseInt(env.completed) / parseInt(env.total_requests)) * 100).toFixed(1) : '0.0'
        })),
        recent_activity: recentActivity.map(activity => ({
          request_id: activity.id,
          project_name: activity.project_name,
          priority: activity.deployment_priority,
          environment: activity.target_environment,
          decision: activity.admin_decision,
          decided_at: activity.admin_decided_at,
          admin_name: activity.admin_name,
          processing_days: parseFloat(activity.processing_days) || 0
        }))
      }
    };

    console.log('✅ 배포 대시보드 통계 조회 완료:', {
      total_requests: response.data.overview.total_requests,
      pending_operations: response.data.overview.pending_operations
    });

    res.json(response);

  } catch (error) {
    console.error('❌ 배포 대시보드 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배포 대시보드 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;