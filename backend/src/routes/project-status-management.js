// [advice from AI] 프로젝트 상태 관리 및 히스토리 시스템
// 취소, 거부, 복원 등의 상태 변경과 히스토리 추적

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// [advice from AI] 프로젝트 상태 변경 (취소, 거부, 복원 등)
router.post('/change-status', async (req, res) => {
  try {
    const { 
      project_id, 
      action_type, // cancel, reject, restore, suspend, force_approve
      reason, 
      target_status, 
      approval_required = false 
    } = req.body;
    
    const user_id = req.user.id;
    const user_role = req.user.role_type;
    
    if (!project_id || !action_type || !reason) {
      return res.status(400).json({
        success: false,
        message: '프로젝트 ID, 액션 타입, 사유는 필수입니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 현재 프로젝트 상태 확인
      const projectResult = await client.query(`
        SELECT * FROM projects WHERE id = $1
      `, [project_id]);
      
      if (projectResult.rows.length === 0) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }
      
      const project = projectResult.rows[0];
      const currentStatus = project.project_status;
      const currentApprovalStatus = project.approval_status;
      
      // 2. 권한 검증
      const hasPermission = await checkActionPermission(
        client, user_role, action_type, currentStatus, project.created_by, user_id
      );
      
      if (!hasPermission) {
        throw new Error('해당 액션을 수행할 권한이 없습니다.');
      }
      
      // 3. 새로운 상태 결정
      const newStatuses = determineNewStatus(action_type, currentStatus, target_status);
      
      // 4. 프로젝트 제어 액션 기록
      const controlActionResult = await client.query(`
        INSERT INTO project_control_actions (
          project_id, action_type, initiated_by, target_stage, reason, 
          approval_required, status, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [
        project_id, action_type, user_id, currentStatus, reason, 
        approval_required, approval_required ? 'pending' : 'executed'
      ]);
      
      const controlAction = controlActionResult.rows[0];
      
      // 5. 상태 변경 이력 기록
      const statusHistoryResult = await client.query(`
        INSERT INTO project_status_history (
          project_id, from_status, to_status, changed_by, change_reason, 
          change_type, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        project_id, 
        `${currentStatus}/${currentApprovalStatus}`,
        `${newStatuses.project_status}/${newStatuses.approval_status}`,
        user_id, 
        reason,
        getChangeType(action_type, user_role),
        JSON.stringify({
          control_action_id: controlAction.id,
          previous_metadata: project.metadata,
          action_details: { action_type, user_role, timestamp: new Date().toISOString() }
        })
      ]);
      
      // 6. 승인이 필요하지 않은 경우 즉시 프로젝트 상태 업데이트
      if (!approval_required) {
        await client.query(`
          UPDATE projects 
          SET project_status = $1, approval_status = $2, updated_at = NOW(),
              metadata = COALESCE(metadata, '{}') || $3
          WHERE id = $4
        `, [
          newStatuses.project_status,
          newStatuses.approval_status,
          JSON.stringify({
            last_action: {
              type: action_type,
              reason: reason,
              timestamp: new Date().toISOString(),
              by: user_id
            }
          }),
          project_id
        ]);
      }
      
      await client.query('COMMIT');
      
      // 7. 응답 데이터 준비
      const responseData = {
        control_action: controlAction,
        status_history: statusHistoryResult.rows[0],
        previous_status: {
          project_status: currentStatus,
          approval_status: currentApprovalStatus
        },
        new_status: approval_required ? {
          project_status: currentStatus, // 승인 대기 중이므로 변경되지 않음
          approval_status: currentApprovalStatus
        } : newStatuses,
        requires_approval: approval_required
      };
      
      res.json({
        success: true,
        message: approval_required ? 
          '상태 변경 요청이 승인 대기 중입니다.' : 
          '프로젝트 상태가 성공적으로 변경되었습니다.',
        data: responseData
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('프로젝트 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message || '프로젝트 상태 변경에 실패했습니다.'
    });
  }
});

// [advice from AI] 프로젝트 상태 변경 승인/거부
router.post('/approve-status-change', async (req, res) => {
  try {
    const { control_action_id, approval_decision, approval_comment } = req.body;
    const approver_id = req.user.id;
    const approver_role = req.user.role_type;
    
    if (!control_action_id || !approval_decision) {
      return res.status(400).json({
        success: false,
        message: '제어 액션 ID와 승인 결정은 필수입니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 제어 액션 정보 조회
      const actionResult = await client.query(`
        SELECT pca.*, p.project_status, p.approval_status, p.id as project_id
        FROM project_control_actions pca
        JOIN projects p ON pca.project_id = p.id
        WHERE pca.id = $1 AND pca.status = 'pending'
      `, [control_action_id]);
      
      if (actionResult.rows.length === 0) {
        throw new Error('승인 대기 중인 제어 액션을 찾을 수 없습니다.');
      }
      
      const controlAction = actionResult.rows[0];
      
      // 2. 승인 권한 검증
      if (!hasApprovalPermission(approver_role, controlAction.action_type)) {
        throw new Error('해당 액션을 승인할 권한이 없습니다.');
      }
      
      // 3. 제어 액션 상태 업데이트
      await client.query(`
        UPDATE project_control_actions 
        SET status = $1, approved_by = $2, approved_at = NOW(),
            metadata = COALESCE(metadata, '{}') || $3
        WHERE id = $4
      `, [
        approval_decision, // approved, rejected
        approver_id,
        JSON.stringify({
          approval_comment: approval_comment,
          approver_role: approver_role
        }),
        control_action_id
      ]);
      
      // 4. 승인된 경우 프로젝트 상태 실제 변경
      if (approval_decision === 'approved') {
        const newStatuses = determineNewStatus(
          controlAction.action_type, 
          controlAction.project_status,
          null
        );
        
        await client.query(`
          UPDATE projects 
          SET project_status = $1, approval_status = $2, updated_at = NOW()
          WHERE id = $3
        `, [
          newStatuses.project_status,
          newStatuses.approval_status,
          controlAction.project_id
        ]);
        
        // 상태 변경 이력 추가
        await client.query(`
          INSERT INTO project_status_history (
            project_id, from_status, to_status, changed_by, change_reason, 
            change_type, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          controlAction.project_id,
          `${controlAction.project_status}/${controlAction.approval_status}`,
          `${newStatuses.project_status}/${newStatuses.approval_status}`,
          approver_id,
          `${controlAction.action_type} 승인: ${approval_comment || controlAction.reason}`,
          'approved_action',
          JSON.stringify({
            original_control_action_id: control_action_id,
            approver_role: approver_role
          })
        ]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: approval_decision === 'approved' ? 
          '상태 변경이 승인되어 적용되었습니다.' : 
          '상태 변경 요청이 거부되었습니다.',
        data: {
          control_action_id: control_action_id,
          approval_decision: approval_decision,
          approved_by: approver_id
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('상태 변경 승인 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message || '상태 변경 승인 처리에 실패했습니다.'
    });
  }
});

// [advice from AI] 프로젝트 상태 히스토리 조회
router.get('/history/:project_id', async (req, res) => {
  try {
    const { project_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const client = await pool.connect();
    
    try {
      // 1. 상태 변경 이력 조회
      const historyResult = await client.query(`
        SELECT 
          psh.*,
          u.full_name as changed_by_name,
          u.role_type as changed_by_role,
          pca.action_type,
          pca.reason as control_reason,
          pca.status as control_status
        FROM project_status_history psh
        LEFT JOIN timbel_users u ON psh.changed_by = u.id
        LEFT JOIN project_control_actions pca ON 
          (psh.metadata->>'control_action_id')::uuid = pca.id
        WHERE psh.project_id = $1
        ORDER BY psh.created_at DESC
        LIMIT $2 OFFSET $3
      `, [project_id, limit, offset]);
      
      // 2. 총 이력 개수
      const countResult = await client.query(`
        SELECT COUNT(*) as total_count
        FROM project_status_history
        WHERE project_id = $1
      `, [project_id]);
      
      // 3. 현재 프로젝트 정보
      const projectResult = await client.query(`
        SELECT name, project_status, approval_status, created_at, updated_at
        FROM projects WHERE id = $1
      `, [project_id]);
      
      res.json({
        success: true,
        data: {
          project_info: projectResult.rows[0],
          history: historyResult.rows,
          pagination: {
            total_count: parseInt(countResult.rows[0].total_count),
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: parseInt(countResult.rows[0].total_count) > parseInt(offset) + parseInt(limit)
          }
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('프로젝트 히스토리 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '프로젝트 히스토리 조회에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 대기 중인 승인 요청 목록
router.get('/pending-approvals', async (req, res) => {
  try {
    const { user_role } = req.user;
    
    const client = await pool.connect();
    
    try {
      const pendingResult = await client.query(`
        SELECT 
          pca.*,
          p.name as project_name,
          p.project_status,
          p.approval_status,
          u.full_name as initiated_by_name,
          u.role_type as initiated_by_role
        FROM project_control_actions pca
        JOIN projects p ON pca.project_id = p.id
        JOIN timbel_users u ON pca.initiated_by = u.id
        WHERE pca.status = 'pending'
        AND pca.approval_required = true
        ORDER BY pca.created_at DESC
      `);
      
      // 사용자 권한에 따라 필터링
      const filteredActions = pendingResult.rows.filter(action => 
        hasApprovalPermission(user_role, action.action_type)
      );
      
      res.json({
        success: true,
        data: {
          pending_approvals: filteredActions,
          user_role: user_role,
          total_count: filteredActions.length
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('대기 중인 승인 요청 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '대기 중인 승인 요청 조회에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 헬퍼 함수들

// 액션 권한 검증
async function checkActionPermission(client, userRole, actionType, currentStatus, projectCreator, userId) {
  // 최고운영자는 모든 액션 가능
  if (userRole === 'executive') return true;
  
  // 액션 타입별 권한 매트릭스
  const permissions = {
    cancel: ['executive', 'admin', 'po'], // 프로젝트 취소
    reject: ['executive', 'admin', 'po', 'qa'], // 거부
    suspend: ['executive', 'admin', 'po'], // 일시 중지
    restore: ['executive', 'admin', 'po'], // 복원
    force_approve: ['executive'], // 강제 승인
    emergency_stop: ['executive'] // 긴급 중지
  };
  
  const allowedRoles = permissions[actionType] || [];
  
  // 기본 역할 권한 확인
  if (allowedRoles.includes(userRole)) {
    // PO의 경우 자신이 생성했거나 할당된 프로젝트만
    if (userRole === 'po') {
      const projectResult = await client.query(`
        SELECT created_by, assigned_po FROM projects WHERE id = $1
      `, [projectCreator]);
      
      if (projectResult.rows.length > 0) {
        const project = projectResult.rows[0];
        return project.created_by === userId || project.assigned_po === userId;
      }
    }
    return true;
  }
  
  return false;
}

// 승인 권한 검증
function hasApprovalPermission(approverRole, actionType) {
  const approvalPermissions = {
    cancel: ['executive'],
    reject: ['executive', 'admin'],
    suspend: ['executive', 'admin'],
    restore: ['executive', 'admin'],
    force_approve: ['executive'],
    emergency_stop: ['executive']
  };
  
  const allowedRoles = approvalPermissions[actionType] || [];
  return allowedRoles.includes(approverRole);
}

// 새로운 상태 결정
function determineNewStatus(actionType, currentStatus, targetStatus) {
  const statusMappings = {
    cancel: { project_status: 'cancelled', approval_status: 'cancelled' },
    reject: { project_status: 'draft', approval_status: 'rejected' },
    suspend: { project_status: 'suspended', approval_status: 'suspended' },
    restore: { project_status: 'draft', approval_status: 'pending' },
    force_approve: { project_status: 'po_approved', approval_status: 'approved' },
    emergency_stop: { project_status: 'suspended', approval_status: 'emergency_stopped' }
  };
  
  if (targetStatus) {
    // 명시적 타겟 상태가 있는 경우
    const [projectStatus, approvalStatus] = targetStatus.split('/');
    return { project_status: projectStatus, approval_status: approvalStatus };
  }
  
  return statusMappings[actionType] || { project_status: currentStatus, approval_status: 'pending' };
}

// 변경 타입 결정
function getChangeType(actionType, userRole) {
  if (userRole === 'executive') {
    return actionType === 'force_approve' || actionType === 'emergency_stop' ? 'forced' : 'executive';
  }
  
  const emergencyActions = ['emergency_stop', 'force_approve'];
  return emergencyActions.includes(actionType) ? 'emergency' : 'normal';
}

module.exports = router;
