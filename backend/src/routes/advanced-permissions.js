// [advice from AI] 고도화된 권한 관리 API - 실제 서비스 수준
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const systemLogger = require('../middleware/systemLogger');

// PostgreSQL 연결 - timbel_knowledge DB (사용자 및 권한 데이터)
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 고급 권한 체크 클래스
class AdvancedPermissionManager {
  
  // 사용자의 효과적인 권한 조회
  static async getUserEffectivePermissions(userId) {
    try {
      const query = `
        SELECT 
          u.id, u.username, u.email, u.full_name, u.role as legacy_role,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'role_name', r.role_name,
                'role_display_name', r.role_display_name,
                'permission_level', r.permission_level,
                'permissions', JSON_BUILD_OBJECT(
                  'can_read_all', r.can_read_all,
                  'can_write_all', r.can_write_all,
                  'can_delete_all', r.can_delete_all,
                  'can_admin_all', r.can_admin_all,
                  'can_manage_users', r.can_manage_users,
                  'can_manage_roles', r.can_manage_roles,
                  'can_view_logs', r.can_view_logs,
                  'can_manage_system', r.can_manage_system,
                  'can_view_monitoring', r.can_view_monitoring,
                  'can_manage_domains', r.can_manage_domains,
                  'can_manage_projects', r.can_manage_projects,
                  'can_manage_systems', r.can_manage_systems,
                  'can_manage_components', r.can_manage_components,
                  'can_manage_documents', r.can_manage_documents,
                  'can_manage_designs', r.can_manage_designs,
                  'can_deploy_services', r.can_deploy_services,
                  'can_manage_pipelines', r.can_manage_pipelines,
                  'can_view_operations', r.can_view_operations,
                  'can_manage_infrastructure', r.can_manage_infrastructure,
                  'can_approve_requests', r.can_approve_requests,
                  'can_submit_requests', r.can_submit_requests
                ),
                'assigned_at', ura.assigned_at,
                'expires_at', ura.expires_at
              )
            ) FILTER (WHERE r.id IS NOT NULL), 
            '[]'::json
          ) as roles
        FROM timbel_users u
        LEFT JOIN user_role_assignments ura ON u.id = ura.user_id 
          AND ura.is_active = true 
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        LEFT JOIN user_roles r ON ura.role_id = r.id 
          AND r.is_active = true
        WHERE u.id = $1 AND u.status = 'active'
        GROUP BY u.id, u.username, u.email, u.full_name, u.role
      `;
      
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // 사용자가 없으면 null 반환
        console.log(`⚠️ 사용자를 찾을 수 없음: ${userId}`);
        return null;
      }
      
      const user = result.rows[0];
      
      // 역할이 없는 경우 기본 권한 제공
      if (!user.roles || user.roles.length === 0) {
        console.log(`ℹ️ 사용자에게 할당된 역할이 없음, 기본 권한 제공: ${userId}`);
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          roles: [],
          effectivePermissions: {
            can_read_all: user.legacy_role === 'admin',
            can_write_all: user.legacy_role === 'admin',
            can_delete_all: user.legacy_role === 'admin',
            can_admin_all: user.legacy_role === 'admin',
            can_manage_users: user.legacy_role === 'admin',
            can_manage_roles: user.legacy_role === 'admin',
            can_view_logs: user.legacy_role === 'admin',
            can_manage_system: user.legacy_role === 'admin',
            can_view_monitoring: true,
            can_manage_domains: user.legacy_role === 'admin',
            can_manage_projects: user.legacy_role === 'admin',
            can_manage_systems: user.legacy_role === 'admin',
            can_manage_components: user.legacy_role === 'admin',
            can_manage_documents: user.legacy_role === 'admin',
            can_manage_designs: user.legacy_role === 'admin',
            can_deploy_services: user.legacy_role === 'admin',
            can_manage_pipelines: user.legacy_role === 'admin',
            can_view_operations: true,
            can_manage_infrastructure: user.legacy_role === 'admin',
            can_approve_requests: user.legacy_role === 'admin',
            can_submit_requests: true
          },
          highestRole: user.legacy_role || 'user',
          lowestPermissionLevel: user.legacy_role === 'admin' ? 0 : 3
        };
      }
      
      // 최고 권한 계산 (가장 낮은 permission_level이 최고 권한)
      const roles = Array.isArray(user.roles) ? user.roles : [];
      const highestPermissionLevel = roles.length > 0 
        ? Math.min(...roles.map(r => r.permission_level))
        : 100;
      
      // 통합 권한 계산 (OR 연산 - 하나라도 true면 true)
      const effectivePermissions = roles.reduce((acc, role) => {
        const perms = role.permissions;
        Object.keys(perms).forEach(key => {
          acc[key] = acc[key] || perms[key];
        });
        return acc;
      }, {});
      
      return {
        ...user,
        highest_permission_level: highestPermissionLevel,
        effective_permissions: effectivePermissions,
        roles_count: roles.length
      };
      
    } catch (error) {
      console.error('사용자 권한 조회 실패:', error);
      throw error;
    }
  }
  
  // 특정 권한 체크
  static async checkUserPermission(userId, permissionKey) {
    try {
      const userPerms = await this.getUserEffectivePermissions(userId);
      
      if (!userPerms) {
        return false;
      }
      
      // 관리자는 모든 권한 허용
      if (userPerms.effective_permissions.can_admin_all) {
        return true;
      }
      
      // 특정 권한 체크
      return userPerms.effective_permissions[permissionKey] || false;
      
    } catch (error) {
      console.error('권한 체크 실패:', error);
      return false;
    }
  }
  
  // 권한 감사 로그 기록
  static async logPermissionAction(actionType, targetUserId, performedBy, details = {}) {
    try {
      const query = `
        INSERT INTO permission_audit_logs (
          action_type, target_user_id, performed_by, performed_by_ip,
          resource_type, resource_id, permission_key, result, reason, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const result = await pool.query(query, [
        actionType,
        targetUserId,
        performedBy,
        details.ip || null,
        details.resourceType || null,
        details.resourceId || null,
        details.permissionKey || null,
        details.result || 'success',
        details.reason || null,
        JSON.stringify(details.metadata || {})
      ]);
      
      return result.rows[0].id;
      
    } catch (error) {
      console.error('권한 감사 로그 기록 실패:', error);
      throw error;
    }
  }
}

// ===== API 엔드포인트들 =====

// [advice from AI] 새 역할 생성
router.post('/roles', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 역할 관리 권한 체크
    const hasPermission = await AdvancedPermissionManager.checkUserPermission(
      req.user.id, 
      'can_manage_roles'
    );
    
    if (!hasPermission) {
      await AdvancedPermissionManager.logPermissionAction(
        'access_denied',
        req.user.id,
        req.user.id,
        {
          ip: req.ip,
          permissionKey: 'can_manage_roles',
          result: 'denied',
          reason: 'Insufficient permissions to create roles'
        }
      );
      
      return res.status(403).json({
        success: false,
        message: '역할 생성 권한이 없습니다.'
      });
    }
    
    console.log('🔐 새 역할 생성 시작...', req.body);
    
    const {
      role_name,
      role_display_name,
      description,
      permission_level = 1,
      can_read_all = false,
      can_write_all = false,
      can_delete_all = false,
      can_admin_all = false,
      can_manage_users = false,
      can_manage_roles = false,
      can_view_logs = false,
      can_manage_system = false,
      can_view_monitoring = false,
      can_manage_domains = false,
      can_manage_projects = false,
      can_manage_systems = false,
      can_manage_components = false,
      can_manage_documents = false,
      can_manage_designs = false,
      can_deploy_services = false,
      can_manage_pipelines = false,
      can_view_operations = false,
      can_manage_infrastructure = false,
      can_approve_requests = false,
      can_submit_requests = false
    } = req.body;
    
    // 필수 필드 검증
    if (!role_name || !role_display_name) {
      return res.status(400).json({
        success: false,
        message: '역할 코드와 표시명은 필수입니다.'
      });
    }
    
    // 역할 코드 중복 체크
    const existingRole = await pool.query(
      'SELECT id FROM user_roles WHERE role_name = $1',
      [role_name]
    );
    
    if (existingRole.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 역할 코드입니다.'
      });
    }
    
    // 새 역할 생성
    const insertQuery = `
      INSERT INTO user_roles (
        role_name, role_display_name, description, permission_level,
        can_read_all, can_write_all, can_delete_all, can_admin_all,
        can_manage_users, can_manage_roles, can_view_logs, can_manage_system,
        can_view_monitoring, can_manage_domains, can_manage_projects, can_manage_systems,
        can_manage_components, can_manage_documents, can_manage_designs, can_deploy_services,
        can_manage_pipelines, can_view_operations, can_manage_infrastructure,
        can_approve_requests, can_submit_requests, is_active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, true, NOW()
      ) RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      role_name, role_display_name, description, permission_level,
      can_read_all, can_write_all, can_delete_all, can_admin_all,
      can_manage_users, can_manage_roles, can_view_logs, can_manage_system,
      can_view_monitoring, can_manage_domains, can_manage_projects, can_manage_systems,
      can_manage_components, can_manage_documents, can_manage_designs, can_deploy_services,
      can_manage_pipelines, can_view_operations, can_manage_infrastructure,
      can_approve_requests, can_submit_requests
    ]);
    
    const newRole = result.rows[0];
    
    await AdvancedPermissionManager.logPermissionAction(
      'role_created',
      null,
      req.user.id,
      {
        ip: req.ip,
        result: 'success',
        metadata: { 
          role_id: newRole.id, 
          role_name: newRole.role_name,
          permission_level: newRole.permission_level
        }
      }
    );
    
    console.log(`✅ 새 역할 생성 완료: ${newRole.role_name} (ID: ${newRole.id})`);
    
    res.json({
      success: true,
      data: newRole,
      message: '새 역할이 성공적으로 생성되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 역할 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '역할 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 모든 역할 목록 조회
router.get('/roles', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 역할 관리 권한 체크
    const hasPermission = await AdvancedPermissionManager.checkUserPermission(
      req.user.id, 
      'can_manage_roles'
    );
    
    if (!hasPermission) {
      await AdvancedPermissionManager.logPermissionAction(
        'access_denied',
        req.user.id,
        req.user.id,
        {
          ip: req.ip,
          permissionKey: 'can_manage_roles',
          result: 'denied',
          reason: 'Insufficient permissions to view roles'
        }
      );
      
      return res.status(403).json({
        success: false,
        message: '역할 조회 권한이 없습니다.'
      });
    }
    
    console.log('🔐 역할 목록 조회 시작...');
    
    const query = `
      SELECT 
        r.*,
        COUNT(ura.user_id) as assigned_users_count
      FROM user_roles r
      LEFT JOIN user_role_assignments ura ON r.id = ura.role_id 
        AND ura.is_active = true
      WHERE r.is_active = true
      GROUP BY r.id
      ORDER BY r.permission_level, r.role_name
    `;
    
    const result = await pool.query(query);
    
    await AdvancedPermissionManager.logPermissionAction(
      'roles_viewed',
      null,
      req.user.id,
      {
        ip: req.ip,
        result: 'success',
        metadata: { roles_count: result.rows.length }
      }
    );
    
    console.log(`✅ 역할 목록 조회 완료: ${result.rows.length}개`);
    
    res.json({
      success: true,
      data: result.rows,
      message: '역할 목록을 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    console.error('❌ 역할 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '역할 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 사용자별 권한 조회
router.get('/users/:userId/permissions', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 자신의 권한이거나 사용자 관리 권한이 있어야 함
    const canViewOthers = await AdvancedPermissionManager.checkUserPermission(
      req.user.id, 
      'can_manage_users'
    );
    
    if (userId !== req.user.id && !canViewOthers) {
      return res.status(403).json({
        success: false,
        message: '다른 사용자의 권한을 조회할 권한이 없습니다.'
      });
    }
    
    console.log(`🔍 사용자 권한 조회: ${userId}`);
    
    const userPermissions = await AdvancedPermissionManager.getUserEffectivePermissions(userId);
    
    if (!userPermissions) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }
    
    await AdvancedPermissionManager.logPermissionAction(
      'user_permissions_viewed',
      userId,
      req.user.id,
      {
        ip: req.ip,
        result: 'success'
      }
    );
    
    console.log('✅ 사용자 권한 조회 완료');
    
    res.json({
      success: true,
      data: userPermissions,
      message: '사용자 권한을 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    console.error('❌ 사용자 권한 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 권한 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 사용자에게 역할 할당
router.post('/users/:userId/roles', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleIds, reason } = req.body;
    
    // 사용자 관리 권한 체크
    const hasPermission = await AdvancedPermissionManager.checkUserPermission(
      req.user.id, 
      'can_manage_users'
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '사용자 역할 관리 권한이 없습니다.'
      });
    }
    
    console.log(`🔐 사용자 역할 할당: ${userId}, 역할: ${roleIds}`);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 기존 역할 할당 비활성화
      await client.query(`
        UPDATE user_role_assignments 
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);
      
      // 새 역할들 할당
      const assignmentPromises = roleIds.map(roleId => 
        client.query(`
          INSERT INTO user_role_assignments (
            user_id, role_id, assigned_by, is_active
          ) VALUES ($1, $2, $3, true)
          ON CONFLICT (user_id, role_id) 
          DO UPDATE SET is_active = true, assigned_at = NOW(), assigned_by = $3
        `, [userId, roleId, req.user.id])
      );
      
      await Promise.all(assignmentPromises);
      
      await client.query('COMMIT');
      
      // 감사 로그 기록
      await AdvancedPermissionManager.logPermissionAction(
        'roles_assigned',
        userId,
        req.user.id,
        {
          ip: req.ip,
          result: 'success',
          reason: reason,
          metadata: { assigned_roles: roleIds }
        }
      );
      
      console.log('✅ 사용자 역할 할당 완료');
      
      res.json({
        success: true,
        message: '사용자 역할이 성공적으로 할당되었습니다.'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 사용자 역할 할당 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 역할 할당 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 권한 감사 로그 조회
router.get('/audit-logs', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 시스템 관리 권한 체크
    const hasPermission = await AdvancedPermissionManager.checkUserPermission(
      req.user.id, 
      'can_manage_system'
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '권한 감사 로그 조회 권한이 없습니다.'
      });
    }
    
    const { 
      page = 1, 
      limit = 50, 
      action_type, 
      target_user_id, 
      start_date, 
      end_date 
    } = req.query;
    
    console.log('📋 권한 감사 로그 조회 시작...');
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (action_type) {
      whereConditions.push(`action_type = $${paramIndex}`);
      queryParams.push(action_type);
      paramIndex++;
    }
    
    if (target_user_id) {
      whereConditions.push(`target_user_id = $${paramIndex}`);
      queryParams.push(target_user_id);
      paramIndex++;
    }
    
    if (start_date) {
      whereConditions.push(`timestamp >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      whereConditions.push(`timestamp <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);
    
    const query = `
      SELECT 
        pal.*,
        tu.username as target_username,
        tu.full_name as target_full_name,
        pu.username as performed_by_username,
        pu.full_name as performed_by_full_name
      FROM permission_audit_logs pal
      LEFT JOIN timbel_users tu ON pal.target_user_id = tu.id
      LEFT JOIN timbel_users pu ON pal.performed_by = pu.id
      ${whereClause}
      ORDER BY pal.timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await pool.query(query, queryParams);
    
    // 전체 카운트 조회
    const countQuery = `
      SELECT COUNT(*) as total_count 
      FROM permission_audit_logs pal
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].total_count);
    
    console.log(`✅ 권한 감사 로그 조회 완료: ${result.rows.length}개`);
    
    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_count: totalCount,
          total_pages: Math.ceil(totalCount / limit)
        }
      },
      message: '권한 감사 로그를 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    console.error('❌ 권한 감사 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '권한 감사 로그 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 권한 체크 미들웨어 (새로운 고급 버전)
router.checkAdvancedPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }
      
      const hasPermission = await AdvancedPermissionManager.checkUserPermission(
        req.user.id, 
        permissionKey
      );
      
      if (!hasPermission) {
        await AdvancedPermissionManager.logPermissionAction(
          'access_denied',
          req.user.id,
          req.user.id,
          {
            ip: req.ip,
            permissionKey: permissionKey,
            result: 'denied',
            reason: `Missing permission: ${permissionKey}`
          }
        );
        
        return res.status(403).json({
          success: false,
          message: `권한이 부족합니다. 필요한 권한: ${permissionKey}`
        });
      }
      
      // 권한 사용 로그 기록
      await AdvancedPermissionManager.logPermissionAction(
        'permission_used',
        req.user.id,
        req.user.id,
        {
          ip: req.ip,
          permissionKey: permissionKey,
          result: 'success'
        }
      );
      
      next();
      
    } catch (error) {
      console.error('권한 체크 오류:', error);
      res.status(500).json({
        success: false,
        message: '권한 체크 중 오류가 발생했습니다.'
      });
    }
  };
};

// [advice from AI] 라우터와 권한 체크 미들웨어를 함께 내보내기
module.exports = router;
module.exports.checkAdvancedPermission = router.checkAdvancedPermission;
