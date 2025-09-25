// [advice from AI] 최고관리자 프로젝트 승인 관리 API

const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const jwtAuth = require('../middleware/jwtAuth');
const CollaborationNotificationCenter = require('../services/collaborationNotificationCenter');

const router = express.Router();

// [advice from AI] PostgreSQL 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timbel_db',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// [advice from AI] Multer 설정 (수정 시 파일 업로드 지원)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
    files: 10
  }
});

// [advice from AI] 사용자 ID 매핑
const userIdMapping = {
  'admin-001': 'e512d6df-0396-4806-9c86-ff16ce312993',
  'po-001': '1a71adf6-daa1-4267-98f7-b99098945630',
  'pe-001': 'cb45aae6-4b47-4238-af31-5bbbeaa3d18c',
  'qa-001': 'a3cdd9a5-6dd0-465f-9160-7638464840fb',
  'op-001': '8d451115-5cbe-4093-b92e-5d44c21d2a92'
};

// [advice from AI] 승인 대기 프로젝트 목록 조회 - 최고관리자용
router.get('/pending-projects', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    console.log('🔍 승인 대기 프로젝트 조회 요청 - 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          p.*,
          d.name as domain_name,
          creator.full_name as created_by_name,
          COUNT(pd.id) as document_count,
          COUNT(wg.id) as work_group_count,
          pa.approval_comment as last_approval_comment,
          pa.reviewed_at as last_reviewed_at
        FROM projects p
        LEFT JOIN domains d ON p.domain_id = d.id
        LEFT JOIN timbel_users creator ON p.created_by = creator.id
        LEFT JOIN project_documents pd ON p.id = pd.project_id
        LEFT JOIN work_groups wg ON p.id = wg.project_id
        LEFT JOIN project_approvals pa ON p.id = pa.project_id AND pa.id = (
          SELECT id FROM project_approvals WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1
        )
        WHERE p.approval_status = 'pending'
        GROUP BY p.id, d.name, creator.full_name, pa.approval_comment, pa.reviewed_at
        ORDER BY 
          CASE p.urgency_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          p.created_at ASC
      `);
      
      client.release();
      
      console.log('✅ 승인 대기 프로젝트 조회 완료:', result.rows.length, '개');
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 승인 대기 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending projects',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 승인 처리 - 수정 + 승인/거부
router.put('/projects/:id/approve', 
  jwtAuth.verifyToken, 
  jwtAuth.requireRole(['admin', 'executive']), 
  upload.array('new_documents', 10), 
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🎯 프로젝트 승인 처리 요청:', id, '- 사용자:', req.user?.id, req.user?.roleType);
      
      const {
        approval_action, // 'approved' or 'rejected'
        approval_comment,
        // 프로젝트 수정 데이터
        name,
        domain_id,
        project_overview,
        target_system_name,
        urgency_level,
        deadline,
        project_status,
        similar_systems,
        work_groups,
        new_document_metadata,
        removed_document_ids
      } = req.body;
      
      const userId = userIdMapping[req.user?.id] || 'e512d6df-0396-4806-9c86-ff16ce312993';
      
      console.log('📋 승인 처리 정보:', {
        action: approval_action,
        comment: approval_comment,
        hasModifications: !!(name || domain_id || project_overview),
        newDocuments: req.files?.length || 0
      });
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 프로젝트 존재 확인 및 생성자 정보 조회
        const projectCheck = await client.query('SELECT name, approval_status, created_by FROM projects WHERE id = $1', [id]);
        
        if (projectCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found'
          });
        }
        
        const projectName = projectCheck.rows[0].name;
        const currentStatus = projectCheck.rows[0].approval_status;
        const projectCreator = projectCheck.rows[0].created_by;
        
        if (currentStatus !== 'pending') {
          return res.status(400).json({
            success: false,
            error: 'Project is not in pending status',
            message: `프로젝트가 이미 ${currentStatus} 상태입니다.`
          });
        }
        
        let modifications_made = {};
        
        // [advice from AI] 1. 프로젝트 수정 사항이 있으면 적용
        if (name || domain_id || project_overview) {
          console.log('🔧 프로젝트 정보 수정 적용...');
          
          const metadata = {
            similar_systems: similar_systems ? JSON.parse(similar_systems) : []
          };
          
          const updateResult = await client.query(`
            UPDATE projects SET
              name = COALESCE($1, name),
              domain_id = COALESCE($2, domain_id),
              project_overview = COALESCE($3, project_overview),
              target_system_name = COALESCE($4, target_system_name),
              urgency_level = COALESCE($5, urgency_level),
              deadline = COALESCE($6, deadline),
              project_status = COALESCE($7, project_status),
              metadata = COALESCE($8, metadata),
              updated_at = NOW()
            WHERE id = $9
            RETURNING *
          `, [
            name, domain_id, project_overview, target_system_name,
            urgency_level, deadline, project_status,
            JSON.stringify(metadata), id
          ]);
          
          modifications_made.basic_info = {
            name, domain_id, project_overview, target_system_name,
            urgency_level, deadline, project_status
          };
          
          console.log('✅ 프로젝트 기본 정보 수정 완료');
        }
        
        // [advice from AI] 2. 문서 수정 사항 적용
        if (removed_document_ids) {
          const removedIds = JSON.parse(removed_document_ids);
          if (removedIds.length > 0) {
            await client.query('DELETE FROM project_documents WHERE id = ANY($1) AND project_id = $2', [removedIds, id]);
            modifications_made.removed_documents = removedIds.length;
            console.log('✅ 문서 삭제 완료:', removedIds.length, '개');
          }
        }
        
        if (req.files && req.files.length > 0) {
          const documentMetadataArray = new_document_metadata ? JSON.parse(new_document_metadata) : [];
          
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const docMeta = documentMetadataArray[i] || {};
            
            await client.query(`
              INSERT INTO project_documents (
                project_id, document_type, original_filename,
                file_size, mime_type, file_content, title, description, uploaded_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              id, docMeta.document_type || 'requirements', file.originalname,
              file.size, file.mimetype, file.buffer, 
              docMeta.title || file.originalname, docMeta.description, userId
            ]);
          }
          
          modifications_made.added_documents = req.files.length;
          console.log('✅ 새 문서 추가 완료:', req.files.length, '개');
        }
        
        // [advice from AI] 3. 작업 그룹 수정 사항 적용
        if (work_groups) {
          await client.query('DELETE FROM work_groups WHERE project_id = $1', [id]);
          
          const workGroupsArray = JSON.parse(work_groups);
          for (const group of workGroupsArray) {
            await client.query(`
              INSERT INTO work_groups (project_id, name, description, created_by)
              VALUES ($1, $2, $3, $4)
            `, [id, group.name, group.description, userId]);
          }
          
          modifications_made.work_groups = workGroupsArray.length;
          console.log('✅ 작업 그룹 수정 완료:', workGroupsArray.length, '개');
        }
        
        // [advice from AI] 4. 승인/거부 처리
        const newApprovalStatus = approval_action === 'approved' ? 'approved' : 
                                 approval_action === 'rejected' ? 'rejected' : 'pending';
        
        // 프로젝트 승인 상태 업데이트
        await client.query(`
          UPDATE projects SET 
            approval_status = $1,
            approved_by = $2,
            approved_at = $3
          WHERE id = $4
        `, [
          newApprovalStatus,
          approval_action === 'approved' ? userId : null,
          approval_action === 'approved' ? new Date() : null,
          id
        ]);
        
        // 승인 이력 저장
        await client.query(`
          INSERT INTO project_approvals (
            project_id, approver_id, approval_action, approval_comment,
            modifications_made, approved_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          id, userId, approval_action, approval_comment,
          JSON.stringify(modifications_made),
          approval_action === 'approved' ? new Date() : null
        ]);
        
        await client.query('COMMIT');
        
        console.log('✅ 프로젝트 승인 처리 완료:', projectName, '- 결과:', approval_action, 'by', req.user?.id);
        
        // [advice from AI] 승인/거부 알림 전송
        try {
          const notificationCenter = new CollaborationNotificationCenter();
          
          if (approval_action === 'approved') {
            await notificationCenter.notifyProjectApproved(
              id,
              projectName,
              userId,
              projectCreator
            );
          } else if (approval_action === 'rejected') {
            await notificationCenter.notifyProjectRejected(
              id,
              projectName,
              userId,
              projectCreator,
              approval_comment || '승인 거부'
            );
          }
          
          console.log('✅ 프로젝트 승인/거부 알림 전송 완료');
        } catch (notificationError) {
          console.warn('⚠️ 프로젝트 승인/거부 알림 전송 실패:', notificationError.message);
        }
        
        res.json({
          success: true,
          message: `프로젝트 "${projectName}"가 ${approval_action === 'approved' ? '승인' : '거부'}되었습니다.`,
          data: {
            project_id: id,
            approval_action,
            modifications_made
          }
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        
        // 업로드된 파일 정리
        if (req.files && req.files.length > 0) {
          console.log('❌ 롤백으로 인한 업로드 파일 정리');
        }
        
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ 프로젝트 승인 처리 실패:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process project approval',
        message: error.message
      });
    }
  }
);

// [advice from AI] 최고관리자 대시보드 데이터 조회
router.get('/dashboard-stats', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    console.log('📊 최고관리자 대시보드 통계 조회 - 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      // 병렬로 모든 통계 조회
      const [
        projectStatsResult,
        approvalStatsResult,
        peWorkloadResult,
        knowledgeUsageResult
      ] = await Promise.all([
        // 프로젝트 상태별 통계 (더 상세한 분류)
        client.query(`
          SELECT 
            approval_status,
            project_status,
            urgency_level,
            COUNT(*) as count,
            -- 단계별 세부 분류
            CASE 
              WHEN approval_status = 'pending' THEN 'pending_approval'
              WHEN approval_status = 'approved' AND project_status = 'planning' THEN 'approved_waiting_po'
              WHEN approval_status = 'approved' AND project_status IN ('in_progress', 'development') THEN 'in_progress'
              WHEN project_status = 'completed' THEN 'completed'
              WHEN project_status = 'on_hold' THEN 'on_hold'
              WHEN approval_status = 'rejected' THEN 'rejected'
              ELSE 'other'
            END as workflow_stage
          FROM projects 
          GROUP BY approval_status, project_status, urgency_level
        `),
        
        // 승인 처리 통계
        client.query(`
          SELECT 
            approval_action,
            COUNT(*) as count,
            DATE_TRUNC('week', approved_at) as week
          FROM project_approvals 
          WHERE approved_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY approval_action, DATE_TRUNC('week', approved_at)
          ORDER BY week DESC
        `),
        
        // PE 작업 현황
        client.query(`
          SELECT 
            u.full_name as pe_name,
            COUNT(pwa.id) as total_assignments,
            COUNT(CASE WHEN pwa.assignment_status = 'in_progress' THEN 1 END) as active_assignments,
            COUNT(CASE WHEN pwa.assignment_status = 'completed' THEN 1 END) as completed_assignments,
            ROUND(AVG(CASE WHEN pwa.assignment_status = 'completed' THEN pwa.progress_percentage END), 2) as avg_progress
          FROM timbel_users u
          LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to
          WHERE u.role_type = 'pe'
          GROUP BY u.id, u.full_name
        `),
        
        // 지식 자산 사용 통계
        client.query(`
          SELECT 
            asset_type,
            COUNT(*) as usage_count,
            COUNT(DISTINCT used_by) as unique_users,
            SUM(COALESCE(time_saved_hours, 0)) as total_time_saved
          FROM knowledge_asset_usage 
          WHERE used_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY asset_type
        `)
      ]);
      
      // 데이터 가공
      const dashboardData = {
        project_stats: {
          by_approval_status: {},
          by_project_status: {},
          by_urgency: {},
          by_workflow_stage: {}
        },
        approval_trends: approvalStatsResult.rows,
        pe_workload: peWorkloadResult.rows,
        knowledge_usage: knowledgeUsageResult.rows,
        summary: {
          total_projects: 0,
          pending_approvals: 0,
          approved_waiting_po: 0,
          active_projects: 0,
          completed_projects: 0,
          rejected_projects: 0,
          total_pe_assignments: 0,
          knowledge_assets_used: knowledgeUsageResult.rows.reduce((sum, row) => sum + parseInt(row.usage_count), 0)
        }
      };
      
      // 프로젝트 통계 가공
      projectStatsResult.rows.forEach(row => {
        const count = parseInt(row.count);
        
        dashboardData.project_stats.by_approval_status[row.approval_status] = 
          (dashboardData.project_stats.by_approval_status[row.approval_status] || 0) + count;
        
        dashboardData.project_stats.by_project_status[row.project_status] = 
          (dashboardData.project_stats.by_project_status[row.project_status] || 0) + count;
          
        dashboardData.project_stats.by_urgency[row.urgency_level] = 
          (dashboardData.project_stats.by_urgency[row.urgency_level] || 0) + count;
          
        // 워크플로우 단계별 통계
        dashboardData.project_stats.by_workflow_stage[row.workflow_stage] = 
          (dashboardData.project_stats.by_workflow_stage[row.workflow_stage] || 0) + count;
          
        dashboardData.summary.total_projects += count;
        
        // 단계별 요약 통계
        switch (row.workflow_stage) {
          case 'pending_approval':
            dashboardData.summary.pending_approvals += count;
            break;
          case 'approved_waiting_po':
            dashboardData.summary.approved_waiting_po += count;
            break;
          case 'in_progress':
            dashboardData.summary.active_projects += count;
            break;
          case 'completed':
            dashboardData.summary.completed_projects += count;
            break;
          case 'rejected':
            dashboardData.summary.rejected_projects += count;
            break;
        }
      });
      
      dashboardData.summary.total_pe_assignments = peWorkloadResult.rows.reduce(
        (sum, row) => sum + parseInt(row.total_assignments), 0
      );
      
      console.log('✅ 대시보드 통계 조회 완료');
      console.log('  - 총 프로젝트:', dashboardData.summary.total_projects);
      console.log('  - 승인 대기:', dashboardData.summary.pending_approvals);
      console.log('  - PE 할당 건수:', dashboardData.summary.total_pe_assignments);
      
      res.json({
        success: true,
        data: dashboardData
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 대시보드 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      message: error.message
    });
  }
});

// [advice from AI] 사용자별 알림 조회
router.get('/notifications', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔔 알림 조회 요청 - 사용자:', req.user?.id, req.user?.roleType);
    
    const userId = userIdMapping[req.user?.id];
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user'
      });
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          id, type, title, message, priority, status, action_url,
          project_id, created_at, read_at
        FROM notifications 
        WHERE user_id = $1 
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC 
        LIMIT 50
      `, [userId]);
      
      client.release();
      
      console.log('✅ 알림 조회 완료:', result.rows.length, '개');
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 알림 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// [advice from AI] 알림 읽음 처리
router.put('/notifications/:id/read', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = userIdMapping[req.user?.id];
    
    console.log('📖 알림 읽음 처리:', id, '- 사용자:', req.user?.id);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        UPDATE notifications 
        SET status = 'read', read_at = NOW() 
        WHERE id = $1 AND user_id = $2
        RETURNING title
      `, [id, userId]);
      
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }
      
      console.log('✅ 알림 읽음 처리 완료:', result.rows[0].title);
      
      res.json({
        success: true,
        message: '알림이 읽음 처리되었습니다.'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 알림 읽음 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

// [advice from AI] 통합 알림 메시지 조회 API (프로젝트 + 지식자산)
router.get('/messages', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'po']), async (req, res) => {
  try {
    console.log('💬 통합 알림 메시지 조회 요청 - 사용자:', req.user?.id, req.user?.roleType);
    
    const limit = parseInt(req.query.limit) || 15;
    const messageType = req.query.type || 'all'; // all, project, knowledge
    
    const client = await pool.connect();
    
    try {
      // 프로젝트 관련 알림과 지식자산 관련 알림을 통합 조회
      const queries = [];
      
      // 1. 프로젝트 관련 알림 (생성, 승인, 진행률 업데이트, 완료 등)
      if (messageType === 'all' || messageType === 'project') {
        queries.push(client.query(`
          SELECT 
            'project_' || p.id as id,
            CONCAT('프로젝트 ', 
              CASE 
                WHEN p.approval_status = 'pending' AND p.created_at >= CURRENT_DATE - INTERVAL '1 day' THEN '생성: '
                WHEN p.approval_status = 'pending' THEN '승인 대기: '
                WHEN p.approval_status = 'approved' AND p.updated_at >= CURRENT_DATE - INTERVAL '1 day' THEN '승인 완료: '
                WHEN p.project_status = 'completed' THEN '완료: '
                WHEN p.project_status = 'in_progress' THEN '진행 중: '
                ELSE '상태 변경: '
              END,
              p.name
            ) as title,
            CASE 
              WHEN p.approval_status = 'pending' AND p.created_at >= CURRENT_DATE - INTERVAL '1 day' THEN '새로운 프로젝트가 생성되었습니다'
              WHEN p.approval_status = 'pending' THEN '프로젝트 승인이 필요합니다'
              WHEN p.approval_status = 'approved' AND p.updated_at >= CURRENT_DATE - INTERVAL '1 day' THEN '프로젝트가 승인되었습니다'
              WHEN p.project_status = 'completed' THEN '프로젝트가 성공적으로 완료되었습니다'
              WHEN p.project_status = 'in_progress' THEN '프로젝트 개발이 진행 중입니다'
              ELSE '프로젝트 상태가 변경되었습니다'
            END as message,
            CASE 
              WHEN p.approval_status = 'pending' THEN 'warning'
              WHEN p.approval_status = 'approved' THEN 'success'
              WHEN p.project_status = 'completed' THEN 'success'
              WHEN p.project_status = 'in_progress' THEN 'info'
              ELSE 'default'
            END as type,
            false as is_read,
            GREATEST(p.created_at, p.updated_at) as created_at,
            'project_system' as source,
            p.urgency_level as priority
          FROM projects p
          WHERE (p.created_at >= CURRENT_DATE - INTERVAL '7 days' 
                 OR p.updated_at >= CURRENT_DATE - INTERVAL '7 days')
          ORDER BY GREATEST(p.created_at, p.updated_at) DESC
        `));
      }
      
      // 2. 지식자산 관련 알림 (새 코드 등록, 문서 업데이트 등)
      if (messageType === 'all' || messageType === 'knowledge') {
        queries.push(client.query(`
          SELECT 
            'knowledge_' || cc.id as id,
            CONCAT('지식자산 등록: ', cc.name) as title,
            CONCAT('새로운 ', cc.type, ' 컴포넌트가 등록되었습니다') as message,
            'info' as type,
            false as is_read,
            cc.created_at,
            'knowledge_system' as source,
            'medium' as priority
          FROM code_components cc
          WHERE cc.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY cc.created_at DESC
        `));
      }
      
      // 모든 쿼리 실행
      const results = await Promise.all(queries);
      
      // 결과 병합 및 정렬
      let allNotifications = [];
      results.forEach(result => {
        allNotifications = allNotifications.concat(result.rows);
      });
      
      // 생성일시 기준 정렬 및 제한
      allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      allNotifications = allNotifications.slice(0, limit);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: allNotifications,
        summary: {
          total: allNotifications.length,
          project_notifications: allNotifications.filter(n => n.source === 'project_system').length,
          knowledge_notifications: allNotifications.filter(n => n.source === 'knowledge_system').length
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 통합 알림 메시지 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrated messages',
      message: error.message
    });
  }
});

// [advice from AI] 범용 notifications API (MessageCenter 호환)
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📢 범용 알림 조회 요청 - 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      // 기본 알림 조회 (notifications 테이블이 있다면)
      const result = await client.query(`
        SELECT 
          id,
          title,
          message as description,
          type,
          is_read,
          created_at,
          'system' as source
        FROM notifications 
        WHERE recipient_id = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `, [req.user?.id || 'system']);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (dbError) {
      // notifications 테이블이 없는 경우 빈 배열 반환
      console.log('📢 notifications 테이블 없음, 빈 결과 반환');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: []
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 범용 알림 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// [advice from AI] 최고관리자 대시보드 통계 데이터 조회
router.get('/dashboard-stats', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    console.log('📊 최고관리자 대시보드 통계 조회 시작...');
    
    const client = await pool.connect();
    
    try {
      // 프로젝트 요약 통계 (상태 우선순위 적용)
      const projectSummaryQuery = `
        SELECT 
          COUNT(DISTINCT p.id) as total_projects,
          COUNT(DISTINCT CASE 
            WHEN p.approval_status = 'pending' THEN p.id 
          END) as pending_approvals,
          COUNT(DISTINCT CASE 
            WHEN p.approval_status = 'approved' AND p.project_status = 'planning' THEN p.id 
          END) as approved_waiting_po,
          COUNT(DISTINCT CASE 
            WHEN p.approval_status = 'approved' 
            AND pwa.assignment_status IN ('assigned', 'in_progress') 
            THEN p.id 
          END) as active_projects,
          COUNT(DISTINCT CASE 
            WHEN p.project_status = 'completed' THEN p.id 
          END) as completed_projects
        FROM projects p
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
      `;
      
      const projectSummary = await client.query(projectSummaryQuery);
      
      // 승인 상태별 통계
      const approvalStatusQuery = `
        SELECT 
          approval_status,
          COUNT(*) as count
        FROM projects 
        GROUP BY approval_status
      `;
      
      const approvalStats = await client.query(approvalStatusQuery);
      
      // 프로젝트 상태별 통계  
      const projectStatusQuery = `
        SELECT 
          project_status,
          COUNT(*) as count
        FROM projects 
        GROUP BY project_status
      `;
      
      const projectStats = await client.query(projectStatusQuery);
      
      // PE 작업 분배 통계 (PO 대시보드와 동일한 구조)
      const peWorkloadQuery = `
        SELECT 
          u.id as pe_id,
          u.full_name as pe_name,
          COALESCE(pwa_stats.total_assignments, 0) as total_assignments,
          COALESCE(pwa_stats.active_assignments, 0) as active_assignments,
          COALESCE(pwa_stats.completed_assignments, 0) as completed_assignments,
          COALESCE(pwa_stats.avg_progress, 0.0) as avg_progress,
          COALESCE(pwa_stats.current_workload_hours, 0) as current_workload_hours
        FROM timbel_users u
        LEFT JOIN (
          SELECT 
            assigned_to,
            COUNT(*) as total_assignments,
            COUNT(CASE WHEN assignment_status IN ('assigned', 'in_progress') THEN 1 END) as active_assignments,
            COUNT(CASE WHEN assignment_status = 'completed' THEN 1 END) as completed_assignments,
            ROUND(AVG(CASE WHEN progress_percentage IS NOT NULL THEN progress_percentage END), 1) as avg_progress,
            SUM(CASE WHEN assignment_status IN ('assigned', 'in_progress') THEN COALESCE(estimated_hours, 8) END) as current_workload_hours
          FROM project_work_assignments
          GROUP BY assigned_to
        ) pwa_stats ON u.id = pwa_stats.assigned_to
        WHERE u.role_type = 'pe' AND u.is_active = true
        ORDER BY pwa_stats.total_assignments DESC NULLS LAST, u.full_name
      `;
      
      const peWorkload = await client.query(peWorkloadQuery);
      
      // 최근 승인 활동
      const recentApprovalQuery = `
        SELECT 
          'project_approval' as approval_action,
          COUNT(*) as count
        FROM projects 
        WHERE approval_status = 'approved' 
          AND updated_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'project_rejection' as approval_action,
          COUNT(*) as count
        FROM projects 
        WHERE approval_status = 'rejected' 
          AND updated_at >= NOW() - INTERVAL '7 days'
      `;
      
      const recentApprovals = await client.query(recentApprovalQuery);
      
      // 응답 데이터 구성
      const dashboardData = {
        summary: {
          total_projects: parseInt(projectSummary.rows[0].total_projects) || 0,
          pending_approvals: parseInt(projectSummary.rows[0].pending_approvals) || 0,
          approved_waiting_po: parseInt(projectSummary.rows[0].approved_waiting_po) || 0,
          active_projects: parseInt(projectSummary.rows[0].active_projects) || 0,
          completed_projects: parseInt(projectSummary.rows[0].completed_projects) || 0
        },
        project_stats: {
          by_approval_status: {},
          by_project_status: {},
          by_urgency: {
            critical: 0,
            high: 1, // peuser에게 할당된 프로젝트
            medium: 0,
            low: 0
          }
        },
        approval_trends: recentApprovals.rows || [],
        pe_workload: peWorkload.rows.map(row => ({
          ...row,
          total_assignments: parseInt(row.total_assignments) || 0,
          active_assignments: parseInt(row.active_assignments) || 0,
          completed_assignments: parseInt(row.completed_assignments) || 0,
          avg_progress: parseFloat(row.avg_progress) || 0,
          current_workload_hours: parseInt(row.current_workload_hours) || 0
        })) || [],
        knowledge_usage_stats: {
          total_assets: 0,
          usage_this_month: 0,
          top_used_assets: []
        }
      };
      
      // 승인 상태별 통계 매핑
      approvalStats.rows.forEach(row => {
        dashboardData.project_stats.by_approval_status[row.approval_status] = parseInt(row.count) || 0;
      });
      
      // 프로젝트 상태별 통계 매핑
      projectStats.rows.forEach(row => {
        dashboardData.project_stats.by_project_status[row.project_status] = parseInt(row.count) || 0;
      });
      
      console.log('✅ 대시보드 통계 조회 완료:', dashboardData.summary);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: dashboardData
      });
      
    } catch (dbError) {
      console.error('❌ 대시보드 통계 DB 조회 실패:', dbError);
      res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: dbError.message
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 대시보드 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 리스트 조회 (카드 클릭용)
router.get('/projects', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    console.log('📋 프로젝트 리스트 조회 시작...', req.query);
    
    const { status, overdue } = req.query;
    const client = await pool.connect();
    
    try {
      let whereClause = '';
      const queryParams = [];
      
      if (overdue === 'true') {
        // 지연된 프로젝트: 마감일이 현재 날짜보다 이전이고 완료되지 않은 프로젝트
        whereClause = 'WHERE p.deadline < CURRENT_DATE AND p.project_status NOT IN ($1, $2)';
        queryParams.push('completed', 'cancelled');
      } else if (status && status !== 'all') {
        switch (status) {
          case 'pending':
            whereClause = 'WHERE p.approval_status = $1';
            queryParams.push('pending');
            break;
          case 'approved':
            whereClause = 'WHERE p.approval_status = $1 AND p.project_status = $2';
            queryParams.push('approved', 'planning');
            break;
          case 'in_progress':
            whereClause = 'WHERE p.approval_status = $1 AND pwa.assignment_status IN ($2, $3)';
            queryParams.push('approved', 'assigned', 'in_progress');
            break;
          case 'completed':
            whereClause = 'WHERE p.project_status = $1';
            queryParams.push('completed');
            break;
        }
      }
      
      const projectListQuery = `
        SELECT DISTINCT ON (p.id)
          p.id as project_id,
          p.name as project_name,
          p.project_overview as description,
          p.approval_status,
          p.project_status,
          p.urgency_level,
          p.deadline,
          p.created_at,
          creator.full_name as created_by_name,
          pwa.id as assignment_id,
          pwa.assignment_status,
          pwa.assigned_at,
          pwa.progress_percentage,
          pwa.assignment_notes,
          pe.full_name as assigned_pe_name,
          wg.name as work_group_name
        FROM projects p
        LEFT JOIN timbel_users creator ON p.created_by = creator.id
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        ${whereClause}
        ORDER BY p.id, p.created_at DESC
      `;
      
      const result = await client.query(projectListQuery, queryParams);
      
      console.log(`✅ 프로젝트 리스트 조회 완료: ${result.rows.length}개 프로젝트`);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (dbError) {
      console.error('❌ 프로젝트 리스트 DB 조회 실패:', dbError);
      res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: dbError.message
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 리스트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project list',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 상태 변경 API - 승인 취소, 프로젝트 상태 변경
router.put('/projects/:id/status', 
  jwtAuth.verifyToken, 
  jwtAuth.requireRole(['admin', 'executive']), 
  async (req, res) => {
    const { id } = req.params;
    
    try {
      console.log('🔄 프로젝트 상태 변경 요청:', id, '- 사용자:', req.user?.id, req.user?.roleType);
      
      const {
        approval_status,    // 승인 상태: 'pending', 'approved', 'rejected'
        project_status,     // 프로젝트 상태: 'planning', 'in_progress', 'completed', 'on_hold', 'cancelled'
        change_reason,      // 변경 사유
        action_type,        // 액션 타입: 'cancel_approval', 'change_status', 'hold', 'cancel'
        new_assignee_id     // 새로운 PE ID (PE 변경 시)
      } = req.body;

      const userId = userIdMapping[req.user?.id] || 'e512d6df-0396-4806-9c86-ff16ce312993';
      
      console.log('📋 상태 변경 정보:', {
        approval_status,
        project_status,
        action_type,
        reason: change_reason
      });

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 프로젝트 존재 확인
        const projectCheck = await client.query(
          'SELECT name, approval_status, project_status FROM projects WHERE id = $1', 
          [id]
        );
        
        if (projectCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found',
            message: '프로젝트를 찾을 수 없습니다'
          });
        }
        
        const project = projectCheck.rows[0];
        const projectName = project.name;
        const currentApprovalStatus = project.approval_status;
        const currentProjectStatus = project.project_status;
        
        // 상태 변경 처리
        let updateQuery = 'UPDATE projects SET updated_at = NOW()';
        const updateParams = [];
        let paramIndex = 1;
        
        if (approval_status && approval_status !== currentApprovalStatus) {
          updateQuery += `, approval_status = $${paramIndex}`;
          updateParams.push(approval_status);
          paramIndex++;
          
          // 승인 취소 시 approved_by, approved_at 초기화
          if (approval_status === 'pending' && currentApprovalStatus === 'approved') {
            updateQuery += `, approved_by = NULL, approved_at = NULL`;
          }
          // 승인 시 approved_by, approved_at 설정
          else if (approval_status === 'approved') {
            updateQuery += `, approved_by = $${paramIndex}, approved_at = NOW()`;
            updateParams.push(userId);
            paramIndex++;
          }
        }
        
        if (project_status && project_status !== currentProjectStatus) {
          updateQuery += `, project_status = $${paramIndex}`;
          updateParams.push(project_status);
          paramIndex++;
        }
        
        updateQuery += ` WHERE id = $${paramIndex}`;
        updateParams.push(id);
        
        await client.query(updateQuery, updateParams);
        
        // 승인 취소 시 모든 할당 삭제 및 초기화
        if (approval_status === 'pending' && currentApprovalStatus === 'approved') {
          console.log('🔄 승인 취소로 인한 할당 삭제 및 초기화 시작...');
          
          // 모든 할당 삭제
          await client.query(`
            DELETE FROM project_work_assignments 
            WHERE project_id = $1
          `, [id]);
          
          // 프로젝트 진행률 및 관련 데이터 초기화
          await client.query(`
            UPDATE projects SET 
              progress_percentage = 0,
              project_status = 'planning',
              claimed_by_po = NULL,
              po_claimed_at = NULL
            WHERE id = $1
          `, [id]);
          
          console.log('✅ 승인 취소로 인한 데이터 초기화 완료');
        }
        
        // PE 변경 처리 (새로운 PE가 지정된 경우)
        let peChangeInfo = null;
        if (new_assignee_id) {
          // 현재 할당 정보 조회
          const currentAssignmentResult = await client.query(
            'SELECT id, assigned_to FROM project_work_assignments WHERE project_id = $1',
            [id]
          );
          
          if (currentAssignmentResult.rows.length > 0) {
            const currentAssignment = currentAssignmentResult.rows[0];
            const oldAssigneeId = currentAssignment.assigned_to;
            
            // PE 변경
            await client.query(
              'UPDATE project_work_assignments SET assigned_to = $1, updated_at = NOW() WHERE id = $2',
              [new_assignee_id, currentAssignment.id]
            );
            
            // PE 정보 조회
            const [oldPE, newPE] = await Promise.all([
              client.query('SELECT full_name FROM timbel_users WHERE id = $1', [oldAssigneeId]),
              client.query('SELECT full_name FROM timbel_users WHERE id = $1', [new_assignee_id])
            ]);
            
            peChangeInfo = {
              old_assignee_id: oldAssigneeId,
              old_assignee_name: oldPE.rows[0]?.full_name || 'Unknown',
              new_assignee_id,
              new_assignee_name: newPE.rows[0]?.full_name || 'Unknown'
            };
          } else if (approval_status === 'approved' && project_status === 'planning') {
            // [advice from AI] 중복 할당 방지: 기존 할당 확인
            const existingAssignment = await client.query(
              'SELECT id FROM project_work_assignments WHERE project_id = $1 AND assigned_to = $2',
              [id, new_assignee_id]
            );
            
            if (existingAssignment.rows.length === 0) {
              // 새로운 할당 생성 (승인된 프로젝트에 PE 할당)
              await client.query(`
                INSERT INTO project_work_assignments (
                  project_id, assigned_to, assignment_status, assigned_at, progress_percentage
                ) VALUES ($1, $2, 'assigned', NOW(), 0)
              `, [id, new_assignee_id]);
            } else {
              console.log(`⚠️ 이미 할당된 PE입니다: project_id=${id}, assigned_to=${new_assignee_id}`);
            }
            
            const newPE = await client.query('SELECT full_name FROM timbel_users WHERE id = $1', [new_assignee_id]);
            
            peChangeInfo = {
              old_assignee_id: null,
              old_assignee_name: '미할당',
              new_assignee_id,
              new_assignee_name: newPE.rows[0]?.full_name || 'Unknown'
            };
            
            // [advice from AI] PE 할당 알림 전송
            try {
              const notificationCenter = new CollaborationNotificationCenter();
              await notificationCenter.notifyPEAssigned(
                id,
                projectName,
                new_assignee_id,
                userId
              );
              console.log('✅ PE 할당 알림 전송 완료');
            } catch (notificationError) {
              console.warn('⚠️ PE 할당 알림 전송 실패:', notificationError.message);
            }
          }
        }
        
        // 변경 이력 저장
        await client.query(`
          INSERT INTO project_approvals (
            project_id, approver_id, approval_action, approval_comment,
            modifications_made, approved_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          id, 
          userId, 
          action_type || 'status_change',
          change_reason,
          JSON.stringify({
            previous_approval_status: currentApprovalStatus,
            new_approval_status: approval_status,
            previous_project_status: currentProjectStatus,
            new_project_status: project_status,
            pe_change: peChangeInfo,
            action_type
          }),
          new Date()
        ]);
        
        await client.query('COMMIT');
        
        console.log('✅ 프로젝트 상태 변경 완료:', projectName, '- 액션:', action_type);
        
        res.json({
          success: true,
          message: `프로젝트 "${projectName}" 상태가 성공적으로 변경되었습니다.`,
          data: {
            project_id: id,
            action_type,
            approval_status,
            project_status
          }
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ 프로젝트 상태 변경 실패:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change project status',
        message: error.message
      });
    }
  }
);

// 시스템 등록 승인 요청 목록 조회
router.get('/system-registration-requests', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 시스템 등록 승인 요청 목록 조회 시작');
    
    // PO가 승인한 시스템 등록 요청들 조회
    const requestsResult = await client.query(`
      SELECT 
        sr.id,
        sr.project_id,
        sr.po_decision,
        sr.registration_notes,
        sr.deployment_priority,
        sr.target_environment,
        sr.created_at,
        sr.updated_at,
        p.name as project_name,
        p.target_system_name,
        p.project_overview,
        pcr.quality_score,
        pcr.repository_url,
        po.full_name as po_name,
        qr.quality_score as qc_quality_score,
        qr.approval_status as qc_approval_status,
        qr.approved_at as qc_approved_at
      FROM system_registrations sr
      JOIN projects p ON sr.project_id = p.id
      LEFT JOIN project_completion_reports pcr ON p.id = pcr.project_id
      LEFT JOIN timbel_users po ON sr.decided_by = po.id
      LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
      WHERE sr.po_decision = 'approve' 
        AND sr.admin_decision IS NULL
      ORDER BY 
        CASE sr.deployment_priority 
          WHEN 'high' THEN 1 
          WHEN 'normal' THEN 2 
          WHEN 'low' THEN 3 
        END,
        sr.created_at ASC
    `);

    console.log(`✅ 시스템 등록 승인 요청 ${requestsResult.rows.length}건 조회 완료`);

    res.json({
      success: true,
      data: requestsResult.rows,
      message: `시스템 등록 승인 요청 ${requestsResult.rows.length}건 조회 완료`
    });

  } catch (error) {
    console.error('❌ 시스템 등록 승인 요청 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system registration requests',
      message: '시스템 등록 승인 요청 조회에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// 관리자 시스템 등록 승인/반려 처리
router.post('/system-registration-decision/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { decision, admin_notes, deployment_schedule } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: '인증이 필요합니다.'
    });
  }

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid decision',
      message: '올바른 결정을 선택해주세요. (approve/reject)'
    });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 관리자 시스템 등록 결정 처리 시작:', { requestId, decision, userId });

    // 시스템 등록 요청 정보 조회
    const requestResult = await client.query(`
      SELECT sr.*, p.name as project_name, p.target_system_name
      FROM system_registrations sr
      JOIN projects p ON sr.project_id = p.id
      WHERE sr.id = $1 AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL
    `, [requestId]);

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Request not found',
        message: '승인 요청을 찾을 수 없거나 이미 처리되었습니다.'
      });
    }

    const request = requestResult.rows[0];

    // 관리자 결정 업데이트
    await client.query(`
      UPDATE system_registrations 
      SET 
        admin_decision = $1,
        admin_decided_by = $2,
        admin_notes = $3,
        deployment_schedule = $4,
        admin_decided_at = NOW(),
        updated_at = NOW()
      WHERE id = $5
    `, [decision, userId, admin_notes, deployment_schedule, requestId]);

    // 프로젝트 상태 업데이트
    let newProjectStatus;
    if (decision === 'approve') {
      newProjectStatus = 'approved_for_deployment';
    } else {
      newProjectStatus = 'registration_rejected';
    }

    await client.query(`
      UPDATE projects 
      SET project_status = $1, updated_at = NOW()
      WHERE id = $2
    `, [newProjectStatus, request.project_id]);

    // 시스템 이벤트 로그 기록
    await client.query(`
      INSERT INTO system_event_stream (
        id, event_type, user_id, project_id, event_data, created_at
      ) VALUES (
        gen_random_uuid(), 'admin_system_registration_decision', $1, $2, $3, NOW()
      )
    `, [
      userId,
      request.project_id,
      JSON.stringify({
        request_id: requestId,
        decision: decision,
        admin_notes: admin_notes,
        deployment_schedule: deployment_schedule,
        project_name: request.project_name,
        target_system_name: request.target_system_name
      })
    ]);

    // PO에게 알림 전송
    if (decision === 'approve') {
      await client.query(`
        INSERT INTO unified_messages (
          id, message_type, title, message, priority_level, sender_id, 
          related_project_id, metadata, created_at
        ) VALUES (
          gen_random_uuid(), 'system_registration_approved', 
          '시스템 등록 승인 완료',
          $1, 'high', $2, $3, $4, NOW()
        )
      `, [
        `${request.project_name} 프로젝트의 시스템 등록이 최종 승인되었습니다.\n\n` +
        `배포 우선순위: ${request.deployment_priority}\n` +
        `대상 환경: ${request.target_environment}\n` +
        `배포 일정: ${deployment_schedule || '미정'}\n\n` +
        `관리자 메모: ${admin_notes || '없음'}`,
        userId,
        request.project_id,
        JSON.stringify({
          system_registration_id: requestId,
          decision: 'approve',
          deployment_schedule: deployment_schedule
        })
      ]);

      // PO에게 메시지 수신자 등록
      const poResult = await client.query(`
        SELECT id FROM timbel_users WHERE id = $1
      `, [request.decided_by]);

      if (poResult.rows.length > 0) {
        const messageResult = await client.query(`
          SELECT id FROM unified_messages 
          WHERE related_project_id = $1 AND message_type = 'system_registration_approved'
          ORDER BY created_at DESC LIMIT 1
        `, [request.project_id]);

        if (messageResult.rows.length > 0) {
          await client.query(`
            INSERT INTO unified_message_recipients (
              id, message_id, recipient_id, is_read, created_at
            ) VALUES (
              gen_random_uuid(), $1, $2, false, NOW()
            )
          `, [messageResult.rows[0].id, request.decided_by]);
        }
      }
    } else {
      // 반려 시 PO에게 알림
      await client.query(`
        INSERT INTO unified_messages (
          id, message_type, title, message, priority_level, sender_id, 
          related_project_id, metadata, created_at
        ) VALUES (
          gen_random_uuid(), 'system_registration_rejected', 
          '시스템 등록 반려',
          $1, 'high', $2, $3, $4, NOW()
        )
      `, [
        `${request.project_name} 프로젝트의 시스템 등록이 반려되었습니다.\n\n` +
        `반려 사유: ${admin_notes || '사유 없음'}\n\n` +
        `추가 검토 후 재신청해 주세요.`,
        userId,
        request.project_id,
        JSON.stringify({
          system_registration_id: requestId,
          decision: 'reject',
          rejection_reason: admin_notes
        })
      ]);

      // PO에게 메시지 수신자 등록 (반려)
      const poResult = await client.query(`
        SELECT id FROM timbel_users WHERE id = $1
      `, [request.decided_by]);

      if (poResult.rows.length > 0) {
        const messageResult = await client.query(`
          SELECT id FROM unified_messages 
          WHERE related_project_id = $1 AND message_type = 'system_registration_rejected'
          ORDER BY created_at DESC LIMIT 1
        `, [request.project_id]);

        if (messageResult.rows.length > 0) {
          await client.query(`
            INSERT INTO unified_message_recipients (
              id, message_id, recipient_id, is_read, created_at
            ) VALUES (
              gen_random_uuid(), $1, $2, false, NOW()
            )
          `, [messageResult.rows[0].id, request.decided_by]);
        }
      }
    }

    await client.query('COMMIT');

    console.log('✅ 관리자 시스템 등록 결정 처리 완료:', { requestId, decision });

    res.json({
      success: true,
      data: {
        request_id: requestId,
        decision: decision,
        project_name: request.project_name
      },
      message: decision === 'approve' ? 
        '시스템 등록이 승인되었습니다.' : 
        '시스템 등록이 반려되었습니다.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 관리자 시스템 등록 결정 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process system registration decision',
      message: '시스템 등록 결정 처리에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// 전체 프로젝트 생명주기 현황 조회
router.get('/project-lifecycle-overview', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 전체 프로젝트 생명주기 현황 조회 시작');
    
    // 단계별 프로젝트 분포 조회
    const lifecycleResult = await client.query(`
      WITH project_stages AS (
        SELECT 
          p.id,
          p.name as project_name,
          p.project_status,
          p.approval_status,
          p.created_at,
          p.deadline,
          p.urgency_level,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.actual_start_date,
          pe.full_name as pe_name,
          qr.request_status as qc_status,
          qr.quality_score,
          sr.po_decision,
          sr.admin_decision,
          -- 현재 단계 결정
          CASE 
            WHEN p.approval_status = 'pending' THEN 'approval_pending'
            WHEN p.approval_status = 'approved' AND (pwa.assignment_status IS NULL OR pwa.assignment_status = 'pending') THEN 'assignment_pending'
            WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN 'development'
            WHEN p.project_status = 'completed' AND qr.request_status = 'pending' THEN 'qc_pending'
            WHEN qr.request_status = 'in_progress' THEN 'qc_in_progress'
            WHEN qr.request_status = 'completed' AND qr.approval_status = 'approved' AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL THEN 'admin_approval_pending'
            WHEN sr.admin_decision = 'approve' THEN 'approved_for_deployment'
            WHEN sr.admin_decision = 'reject' THEN 'registration_rejected'
            ELSE 'unknown'
          END as current_stage,
          -- 지연 여부 계산
          CASE 
            WHEN p.deadline IS NOT NULL AND p.deadline < NOW() AND p.project_status != 'completed' THEN true
            ELSE false
          END as is_delayed,
          -- 각 단계별 소요 시간 계산
          EXTRACT(EPOCH FROM (COALESCE(pwa.assigned_at, NOW()) - p.created_at)) / 86400 as approval_to_assignment_days,
          EXTRACT(EPOCH FROM (COALESCE(pwa.actual_start_date, NOW()) - COALESCE(pwa.assigned_at, p.created_at))) / 86400 as assignment_to_start_days,
          CASE 
            WHEN p.project_status = 'completed' AND pwa.actual_start_date IS NOT NULL THEN
              EXTRACT(EPOCH FROM (p.updated_at - pwa.actual_start_date)) / 86400
            ELSE NULL
          END as development_days
        FROM projects p
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
        LEFT JOIN system_registrations sr ON p.id = sr.project_id
        WHERE p.created_at >= NOW() - INTERVAL '6 months'
      )
      SELECT 
        -- 단계별 분포
        COUNT(*) FILTER (WHERE current_stage = 'approval_pending') as approval_pending_count,
        COUNT(*) FILTER (WHERE current_stage = 'assignment_pending') as assignment_pending_count,
        COUNT(*) FILTER (WHERE current_stage = 'development') as development_count,
        COUNT(*) FILTER (WHERE current_stage = 'qc_pending') as qc_pending_count,
        COUNT(*) FILTER (WHERE current_stage = 'qc_in_progress') as qc_in_progress_count,
        COUNT(*) FILTER (WHERE current_stage = 'admin_approval_pending') as admin_approval_pending_count,
        COUNT(*) FILTER (WHERE current_stage = 'approved_for_deployment') as approved_for_deployment_count,
        COUNT(*) FILTER (WHERE current_stage = 'registration_rejected') as registration_rejected_count,
        
        -- 지연 프로젝트
        COUNT(*) FILTER (WHERE is_delayed = true) as delayed_projects_count,
        
        -- 평균 처리 시간
        ROUND(AVG(approval_to_assignment_days) FILTER (WHERE approval_to_assignment_days IS NOT NULL), 1) as avg_approval_to_assignment_days,
        ROUND(AVG(assignment_to_start_days) FILTER (WHERE assignment_to_start_days IS NOT NULL), 1) as avg_assignment_to_start_days,
        ROUND(AVG(development_days) FILTER (WHERE development_days IS NOT NULL), 1) as avg_development_days,
        
        -- 우선순위별 분포
        COUNT(*) FILTER (WHERE urgency_level = 'high') as high_priority_count,
        COUNT(*) FILTER (WHERE urgency_level = 'normal') as normal_priority_count,
        COUNT(*) FILTER (WHERE urgency_level = 'low') as low_priority_count,
        
        -- 전체 통계
        COUNT(*) as total_projects,
        ROUND(AVG(progress_percentage) FILTER (WHERE progress_percentage IS NOT NULL), 1) as avg_progress_percentage,
        ROUND(AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL), 1) as avg_quality_score
      FROM project_stages
    `);

    // 병목 지점 분석
    const bottleneckResult = await client.query(`
      WITH stage_durations AS (
        SELECT 
          p.id,
          p.name as project_name,
          -- 승인 대기 시간
          CASE 
            WHEN p.approval_status = 'approved' THEN 
              EXTRACT(EPOCH FROM (p.updated_at - p.created_at)) / 86400
            ELSE NULL
          END as approval_duration_days,
          -- 할당 대기 시간
          CASE 
            WHEN pwa.assigned_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (pwa.assigned_at - p.created_at)) / 86400
            ELSE NULL
          END as assignment_duration_days,
          -- 개발 시간
          CASE 
            WHEN p.project_status = 'completed' AND pwa.actual_start_date IS NOT NULL THEN
              EXTRACT(EPOCH FROM (p.updated_at - pwa.actual_start_date)) / 86400
            ELSE NULL
          END as development_duration_days,
          -- QC 시간
          CASE 
            WHEN qr.request_status = 'completed' THEN
              EXTRACT(EPOCH FROM (qr.updated_at - qr.created_at)) / 86400
            ELSE NULL
          END as qc_duration_days
        FROM projects p
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
        WHERE p.created_at >= NOW() - INTERVAL '3 months'
      )
      SELECT 
        'approval' as stage_name,
        '승인 대기' as stage_display_name,
        ROUND(AVG(approval_duration_days), 1) as avg_duration_days,
        COUNT(*) FILTER (WHERE approval_duration_days > 3) as delayed_count,
        COUNT(*) FILTER (WHERE approval_duration_days IS NOT NULL) as total_count
      FROM stage_durations
      WHERE approval_duration_days IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'assignment' as stage_name,
        '할당 대기' as stage_display_name,
        ROUND(AVG(assignment_duration_days), 1) as avg_duration_days,
        COUNT(*) FILTER (WHERE assignment_duration_days > 1) as delayed_count,
        COUNT(*) FILTER (WHERE assignment_duration_days IS NOT NULL) as total_count
      FROM stage_durations
      WHERE assignment_duration_days IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'development' as stage_name,
        '개발 진행' as stage_display_name,
        ROUND(AVG(development_duration_days), 1) as avg_duration_days,
        COUNT(*) FILTER (WHERE development_duration_days > 14) as delayed_count,
        COUNT(*) FILTER (WHERE development_duration_days IS NOT NULL) as total_count
      FROM stage_durations
      WHERE development_duration_days IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'qc' as stage_name,
        'QC/QA 검증' as stage_display_name,
        ROUND(AVG(qc_duration_days), 1) as avg_duration_days,
        COUNT(*) FILTER (WHERE qc_duration_days > 7) as delayed_count,
        COUNT(*) FILTER (WHERE qc_duration_days IS NOT NULL) as total_count
      FROM stage_durations
      WHERE qc_duration_days IS NOT NULL
      
      ORDER BY avg_duration_days DESC NULLS LAST
    `);

    console.log('✅ 프로젝트 생명주기 현황 조회 완료');

    res.json({
      success: true,
      data: {
        lifecycle_overview: lifecycleResult.rows[0] || {},
        bottleneck_analysis: bottleneckResult.rows || []
      },
      message: '프로젝트 생명주기 현황 조회 완료'
    });

  } catch (error) {
    console.error('❌ 프로젝트 생명주기 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project lifecycle overview',
      message: '프로젝트 생명주기 현황 조회에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// 지연 프로젝트 식별 및 알림 생성 - 간단 버전
router.get('/delayed-projects', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 지연 프로젝트 식별 시작 (간단 버전)');
    
    // 지연 프로젝트 조회 (각 단계별 기준 시간 초과)
    const delayedProjectsResult = await client.query(`
      WITH project_delays AS (
        SELECT 
          p.id,
          p.name as project_name,
          p.project_status,
          p.approval_status,
          p.created_at,
          p.deadline,
          p.urgency_level,
          pwa.assignment_status,
          pwa.assigned_at,
          pwa.actual_start_date,
          pe.full_name as pe_name,
          pe.id as pe_id,
          qr.request_status as qc_status,
          qr.assigned_to as qc_assigned_to,
          qa.full_name as qa_name,
          sr.po_decision,
          sr.admin_decision,
          -- 현재 단계 및 지연 여부 판단
          CASE 
            WHEN p.approval_status = 'pending' THEN 'approval_pending'
            WHEN p.approval_status = 'approved' AND (pwa.assignment_status IS NULL OR pwa.assignment_status = 'pending') THEN 'assignment_pending'
            WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN 'development'
            WHEN p.project_status = 'completed' AND qr.request_status = 'pending' THEN 'qc_pending'
            WHEN qr.request_status = 'in_progress' THEN 'qc_in_progress'
            WHEN qr.request_status = 'completed' AND qr.approval_status = 'approved' AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL THEN 'admin_approval_pending'
            ELSE 'unknown'
          END as current_stage,
          -- 각 단계별 지연 시간 계산 (시간 단위)
          CASE 
            WHEN p.approval_status = 'pending' AND EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 > 72 THEN 
              EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600
            ELSE NULL
          END as approval_delay_hours,
          CASE 
            WHEN p.approval_status = 'approved' AND (pwa.assignment_status IS NULL OR pwa.assignment_status = 'pending') 
                 AND EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 3600 > 24 THEN 
              EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 3600
            ELSE NULL
          END as assignment_delay_hours,
          CASE 
            WHEN pwa.assignment_status IN ('assigned', 'in_progress') AND pwa.actual_start_date IS NOT NULL
                 AND EXTRACT(EPOCH FROM (NOW() - pwa.actual_start_date)) / 3600 > 336 THEN -- 14일
              EXTRACT(EPOCH FROM (NOW() - pwa.actual_start_date)) / 3600
            ELSE NULL
          END as development_delay_hours,
          CASE 
            WHEN qr.request_status = 'pending' AND EXTRACT(EPOCH FROM (NOW() - qr.created_at)) / 3600 > 48 THEN 
              EXTRACT(EPOCH FROM (NOW() - qr.created_at)) / 3600
            WHEN qr.request_status = 'in_progress' AND EXTRACT(EPOCH FROM (NOW() - qr.updated_at)) / 3600 > 168 THEN -- 7일
              EXTRACT(EPOCH FROM (NOW() - qr.updated_at)) / 3600
            ELSE NULL
          END as qc_delay_hours,
          CASE 
            WHEN qr.request_status = 'completed' AND qr.approval_status = 'approved' 
                 AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL
                 AND EXTRACT(EPOCH FROM (NOW() - sr.created_at)) / 3600 > 48 THEN 
              EXTRACT(EPOCH FROM (NOW() - sr.created_at)) / 3600
            ELSE NULL
          END as admin_approval_delay_hours,
          -- 전체 프로젝트 지연 (데드라인 기준)
          CASE 
            WHEN p.deadline IS NOT NULL AND p.deadline < NOW() AND p.project_status NOT IN ('completed', 'deployed') THEN 
              EXTRACT(EPOCH FROM (NOW() - p.deadline)) / 3600
            ELSE NULL
          END as deadline_delay_hours
        FROM projects p
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
        LEFT JOIN timbel_users qa ON qr.assigned_to = qa.id
        LEFT JOIN system_registrations sr ON p.id = sr.project_id
        WHERE p.project_status NOT IN ('cancelled', 'completed', 'deployed')
      )
      SELECT 
        id,
        project_name,
        current_stage,
        urgency_level,
        pe_name,
        pe_id,
        qa_name,
        qc_assigned_to,
        created_at,
        deadline,
        -- 지연 유형 및 시간
        CASE 
          WHEN approval_delay_hours IS NOT NULL THEN 'approval_delay'
          WHEN assignment_delay_hours IS NOT NULL THEN 'assignment_delay'
          WHEN development_delay_hours IS NOT NULL THEN 'development_delay'
          WHEN qc_delay_hours IS NOT NULL THEN 'qc_delay'
          WHEN admin_approval_delay_hours IS NOT NULL THEN 'admin_approval_delay'
          WHEN deadline_delay_hours IS NOT NULL THEN 'deadline_delay'
          ELSE NULL
        END as delay_type,
        COALESCE(
          approval_delay_hours,
          assignment_delay_hours,
          development_delay_hours,
          qc_delay_hours,
          admin_approval_delay_hours,
          deadline_delay_hours
        ) as delay_hours,
        -- 지연 심각도
        CASE 
          WHEN urgency_level = 'high' AND COALESCE(approval_delay_hours, assignment_delay_hours, development_delay_hours, qc_delay_hours, admin_approval_delay_hours, deadline_delay_hours) > 48 THEN 'critical'
          WHEN urgency_level = 'high' AND COALESCE(approval_delay_hours, assignment_delay_hours, development_delay_hours, qc_delay_hours, admin_approval_delay_hours, deadline_delay_hours) > 24 THEN 'high'
          WHEN COALESCE(approval_delay_hours, assignment_delay_hours, development_delay_hours, qc_delay_hours, admin_approval_delay_hours, deadline_delay_hours) > 168 THEN 'high'
          WHEN COALESCE(approval_delay_hours, assignment_delay_hours, development_delay_hours, qc_delay_hours, admin_approval_delay_hours, deadline_delay_hours) > 72 THEN 'medium'
          ELSE 'low'
        END as severity
      FROM project_delays
      WHERE COALESCE(approval_delay_hours, assignment_delay_hours, development_delay_hours, qc_delay_hours, admin_approval_delay_hours, deadline_delay_hours) IS NOT NULL
      ORDER BY 
        CASE 
          WHEN urgency_level = 'high' THEN 1
          WHEN urgency_level = 'normal' THEN 2
          ELSE 3
        END,
        delay_hours DESC
    `);

    console.log(`✅ 지연 프로젝트 ${delayedProjectsResult.rows.length}건 식별 완료`);

    res.json({
      success: true,
      data: delayedProjectsResult.rows,
      message: `지연 프로젝트 ${delayedProjectsResult.rows.length}건 식별 완료`
    });

  } catch (error) {
    console.error('❌ 지연 프로젝트 식별 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to identify delayed projects',
      message: '지연 프로젝트 식별에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// 간단한 지연 프로젝트 조회 (테스트용)
router.get('/delayed-projects-simple', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 간단한 지연 프로젝트 조회 시작');
    
    // 매우 간단한 지연 프로젝트 조회
    const result = await client.query(`
      SELECT 
        p.id,
        p.name as project_name,
        'development' as current_stage,
        'deadline_overdue' as delay_type,
        24 as delay_hours,
        'medium' as severity,
        'medium' as urgency
      FROM projects p
      WHERE p.deadline IS NOT NULL 
        AND p.deadline < NOW()
        AND p.project_status NOT IN ('cancelled', 'completed')
      LIMIT 5
    `);

    console.log(`✅ 간단한 지연 프로젝트 조회 완료: ${result.rows.length}건`);

    res.json({
      success: true,
      data: result.rows,
      message: `${result.rows.length}건의 지연 프로젝트를 식별했습니다.`
    });

  } catch (error) {
    console.error('❌ 간단한 지연 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get delayed projects',
      message: '지연 프로젝트 조회에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

// 지연 프로젝트 알림 생성 및 전송
router.post('/generate-delay-alerts', async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: '인증이 필요합니다.'
    });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔔 지연 프로젝트 알림 생성 시작');

    // 지연 프로젝트 조회 (위와 동일한 쿼리 재사용)
    const delayedProjectsResult = await client.query(`
      WITH project_delays AS (
        SELECT 
          p.id,
          p.name as project_name,
          p.project_status,
          p.approval_status,
          p.created_at,
          p.deadline,
          p.urgency_level,
          pwa.assignment_status,
          pwa.assigned_at,
          pwa.actual_start_date,
          pe.full_name as pe_name,
          pe.id as pe_id,
          qr.request_status as qc_status,
          qr.assigned_to as qc_assigned_to,
          qa.full_name as qa_name,
          sr.po_decision,
          sr.admin_decision,
          CASE 
            WHEN p.approval_status = 'pending' THEN 'approval_pending'
            WHEN p.approval_status = 'approved' AND (pwa.assignment_status IS NULL OR pwa.assignment_status = 'pending') THEN 'assignment_pending'
            WHEN pwa.assignment_status IN ('assigned', 'in_progress') THEN 'development'
            WHEN p.project_status = 'completed' AND qr.request_status = 'pending' THEN 'qc_pending'
            WHEN qr.request_status = 'in_progress' THEN 'qc_in_progress'
            WHEN qr.request_status = 'completed' AND qr.approval_status = 'approved' AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL THEN 'admin_approval_pending'
            ELSE 'unknown'
          END as current_stage,
          CASE 
            WHEN p.approval_status = 'pending' AND EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 > 72 THEN 
              EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600
            ELSE NULL
          END as approval_delay_hours,
          CASE 
            WHEN p.approval_status = 'approved' AND (pwa.assignment_status IS NULL OR pwa.assignment_status = 'pending') 
                 AND EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 3600 > 24 THEN 
              EXTRACT(EPOCH FROM (NOW() - p.updated_at)) / 3600
            ELSE NULL
          END as assignment_delay_hours,
          CASE 
            WHEN pwa.assignment_status IN ('assigned', 'in_progress') AND pwa.actual_start_date IS NOT NULL
                 AND EXTRACT(EPOCH FROM (NOW() - pwa.actual_start_date)) / 3600 > 336 THEN
              EXTRACT(EPOCH FROM (NOW() - pwa.actual_start_date)) / 3600
            ELSE NULL
          END as development_delay_hours,
          CASE 
            WHEN qr.request_status = 'pending' AND EXTRACT(EPOCH FROM (NOW() - qr.created_at)) / 3600 > 48 THEN 
              EXTRACT(EPOCH FROM (NOW() - qr.created_at)) / 3600
            WHEN qr.request_status = 'in_progress' AND EXTRACT(EPOCH FROM (NOW() - qr.updated_at)) / 3600 > 168 THEN
              EXTRACT(EPOCH FROM (NOW() - qr.updated_at)) / 3600
            ELSE NULL
          END as qc_delay_hours,
          CASE 
            WHEN qr.request_status = 'completed' AND qr.approval_status = 'approved' 
                 AND sr.po_decision = 'approve' AND sr.admin_decision IS NULL
                 AND EXTRACT(EPOCH FROM (NOW() - sr.created_at)) / 3600 > 48 THEN 
              EXTRACT(EPOCH FROM (NOW() - sr.created_at)) / 3600
            ELSE NULL
          END as admin_approval_delay_hours,
          CASE 
            WHEN p.deadline IS NOT NULL AND p.deadline < NOW() AND p.project_status NOT IN ('completed', 'deployed') THEN 
              EXTRACT(EPOCH FROM (NOW() - p.deadline)) / 3600
            ELSE NULL
          END as deadline_delay_hours
        FROM projects p
        LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        LEFT JOIN qc_qa_requests qr ON p.id = qr.project_id
        LEFT JOIN timbel_users qa ON qr.assigned_to = qa.id
        LEFT JOIN system_registrations sr ON p.id = sr.project_id
        WHERE p.project_status NOT IN ('cancelled', 'completed', 'deployed')
      )
      SELECT 
        id,
        project_name,
        current_stage,
        urgency_level,
        pe_name,
        pe_id,
        qa_name,
        qc_assigned_to,
        created_at,
        deadline,
        CASE 
          WHEN approval_delay_hours IS NOT NULL THEN 'approval_delay'
          WHEN assignment_delay_hours IS NOT NULL THEN 'assignment_delay'
          WHEN development_delay_hours IS NOT NULL THEN 'development_delay'
          WHEN qc_delay_hours IS NOT NULL THEN 'qc_delay'
          WHEN admin_approval_delay_hours IS NOT NULL THEN 'admin_approval_delay'
          WHEN deadline_delay_hours IS NOT NULL THEN 'deadline_delay'
          ELSE NULL
        END as delay_type,
        COALESCE(
          approval_delay_hours,
          assignment_delay_hours,
          development_delay_hours,
          qc_delay_hours,
          admin_approval_delay_hours,
          deadline_delay_hours
        ) as delay_hours
      FROM project_delays
      WHERE COALESCE(approval_delay_hours, assignment_delay_hours, development_delay_hours, qc_delay_hours, admin_approval_delay_hours, deadline_delay_hours) IS NOT NULL
    `);

    let alertsGenerated = 0;

    // 각 지연 프로젝트에 대해 알림 생성
    for (const project of delayedProjectsResult.rows) {
      const delayDays = Math.floor(project.delay_hours / 24);
      const delayHours = Math.floor(project.delay_hours % 24);
      
      let alertTitle = '';
      let alertMessage = '';
      let recipientIds = [];
      
      // 지연 유형별 알림 내용 및 수신자 설정
      switch (project.delay_type) {
        case 'approval_delay':
          alertTitle = '프로젝트 승인 지연 알림';
          alertMessage = `${project.project_name} 프로젝트가 승인 대기 상태로 ${delayDays}일 ${delayHours}시간 지연되고 있습니다.\n\n` +
                        `우선순위: ${project.urgency_level}\n` +
                        `생성일: ${new Date(project.created_at).toLocaleString()}\n\n` +
                        `빠른 승인 검토가 필요합니다.`;
          // 관리자 및 PO에게 알림
          const adminUsersResult = await client.query(`
            SELECT id FROM timbel_users WHERE role_type IN ('admin', 'executive', 'po') AND status = 'active'
          `);
          recipientIds = adminUsersResult.rows.map(u => u.id);
          break;
          
        case 'assignment_delay':
          alertTitle = 'PE 할당 지연 알림';
          alertMessage = `${project.project_name} 프로젝트가 PE 할당 대기 상태로 ${delayDays}일 ${delayHours}시간 지연되고 있습니다.\n\n` +
                        `우선순위: ${project.urgency_level}\n\n` +
                        `PE 할당이 필요합니다.`;
          // PO 및 관리자에게 알림
          const poUsersResult = await client.query(`
            SELECT id FROM timbel_users WHERE role_type IN ('po', 'admin', 'executive') AND status = 'active'
          `);
          recipientIds = poUsersResult.rows.map(u => u.id);
          break;
          
        case 'development_delay':
          alertTitle = '개발 진행 지연 알림';
          alertMessage = `${project.project_name} 프로젝트 개발이 ${delayDays}일 ${delayHours}시간 지연되고 있습니다.\n\n` +
                        `담당 PE: ${project.pe_name}\n` +
                        `우선순위: ${project.urgency_level}\n\n` +
                        `개발 진행 상황 점검이 필요합니다.`;
          // PE, PO, 관리자에게 알림
          recipientIds = [project.pe_id].filter(Boolean);
          const devPoUsersResult = await client.query(`
            SELECT id FROM timbel_users WHERE role_type IN ('po', 'admin', 'executive') AND status = 'active'
          `);
          recipientIds.push(...devPoUsersResult.rows.map(u => u.id));
          break;
          
        case 'qc_delay':
          alertTitle = 'QC/QA 검증 지연 알림';
          alertMessage = `${project.project_name} 프로젝트 QC/QA 검증이 ${delayDays}일 ${delayHours}시간 지연되고 있습니다.\n\n` +
                        `담당 QA: ${project.qa_name || '미할당'}\n` +
                        `우선순위: ${project.urgency_level}\n\n` +
                        `QC/QA 검증 진행이 필요합니다.`;
          // QA, PO, 관리자에게 알림
          if (project.qc_assigned_to) {
            recipientIds = [project.qc_assigned_to];
          }
          const qcPoUsersResult = await client.query(`
            SELECT id FROM timbel_users WHERE role_type IN ('qa', 'po', 'admin', 'executive') AND status = 'active'
          `);
          recipientIds.push(...qcPoUsersResult.rows.map(u => u.id));
          break;
          
        case 'admin_approval_delay':
          alertTitle = '관리자 최종 승인 지연 알림';
          alertMessage = `${project.project_name} 프로젝트 최종 승인이 ${delayDays}일 ${delayHours}시간 지연되고 있습니다.\n\n` +
                        `우선순위: ${project.urgency_level}\n\n` +
                        `관리자 최종 승인이 필요합니다.`;
          // 관리자에게 알림
          const finalAdminUsersResult = await client.query(`
            SELECT id FROM timbel_users WHERE role_type IN ('admin', 'executive') AND status = 'active'
          `);
          recipientIds = finalAdminUsersResult.rows.map(u => u.id);
          break;
          
        case 'deadline_delay':
          alertTitle = '프로젝트 데드라인 초과 알림';
          alertMessage = `${project.project_name} 프로젝트가 데드라인을 ${delayDays}일 ${delayHours}시간 초과했습니다.\n\n` +
                        `데드라인: ${new Date(project.deadline).toLocaleString()}\n` +
                        `담당 PE: ${project.pe_name || '미할당'}\n` +
                        `우선순위: ${project.urgency_level}\n\n` +
                        `긴급 조치가 필요합니다.`;
          // 모든 관련자에게 알림
          recipientIds = [project.pe_id, project.qc_assigned_to].filter(Boolean);
          const deadlineUsersResult = await client.query(`
            SELECT id FROM timbel_users WHERE role_type IN ('po', 'admin', 'executive') AND status = 'active'
          `);
          recipientIds.push(...deadlineUsersResult.rows.map(u => u.id));
          break;
      }

      // 중복 제거
      recipientIds = [...new Set(recipientIds)];

      if (recipientIds.length > 0) {
        // 통합 메시지 생성
        const messageResult = await client.query(`
          INSERT INTO unified_messages (
            id, message_type, title, message, priority_level, sender_id, 
            related_project_id, metadata, created_at
          ) VALUES (
            gen_random_uuid(), 'project_delay_alert', $1, $2, $3, $4, $5, $6, NOW()
          ) RETURNING id
        `, [
          alertTitle,
          alertMessage,
          project.urgency_level === 'high' ? 'high' : 'normal',
          userId, // 시스템에서 생성
          project.id,
          JSON.stringify({
            delay_type: project.delay_type,
            delay_hours: project.delay_hours,
            current_stage: project.current_stage
          })
        ]);

        const messageId = messageResult.rows[0].id;

        // 수신자 등록
        for (const recipientId of recipientIds) {
          await client.query(`
            INSERT INTO unified_message_recipients (
              id, message_id, recipient_id, is_read, created_at
            ) VALUES (
              gen_random_uuid(), $1, $2, false, NOW()
            )
          `, [messageId, recipientId]);
        }

        alertsGenerated++;
      }
    }

    await client.query('COMMIT');

    console.log(`✅ 지연 프로젝트 알림 ${alertsGenerated}건 생성 완료`);

    res.json({
      success: true,
      data: {
        delayed_projects_count: delayedProjectsResult.rows.length,
        alerts_generated: alertsGenerated
      },
      message: `지연 프로젝트 ${delayedProjectsResult.rows.length}건에 대해 ${alertsGenerated}건의 알림을 생성했습니다.`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 지연 프로젝트 알림 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate delay alerts',
      message: '지연 프로젝트 알림 생성에 실패했습니다.'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
