import { useState, useEffect, useCallback } from 'react';
import { useJwtAuthStore } from '../store/jwtAuthStore';

interface EffectivePermissions {
  can_read_all: boolean;
  can_write_all: boolean;
  can_delete_all: boolean;
  can_admin_all: boolean;
  can_manage_users: boolean;
  can_manage_roles: boolean;
  can_view_logs: boolean;
  can_manage_system: boolean;
  can_view_monitoring: boolean;
  can_manage_domains: boolean;
  can_manage_projects: boolean;
  can_manage_systems: boolean;
  can_manage_components: boolean;
  can_manage_documents: boolean;
  can_manage_designs: boolean;
  can_deploy_services: boolean;
  can_manage_pipelines: boolean;
  can_view_operations: boolean;
  can_manage_infrastructure: boolean;
  can_approve_requests: boolean;
  can_submit_requests: boolean;
}

interface UserRole {
  role_name: string;
  role_display_name: string;
  permission_level: number;
  permissions: EffectivePermissions;
  assigned_at: string;
  expires_at?: string;
}

interface UserPermissionData {
  id: string;
  username: string;
  email: string;
  full_name: string;
  legacy_role: string;
  roles: UserRole[];
  highest_permission_level: number;
  effective_permissions: EffectivePermissions;
  roles_count: number;
}

export const useAdvancedPermissions = () => {
  const [permissions, setPermissions] = useState<EffectivePermissions | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, user } = useJwtAuthStore();

  const loadUserPermissions = useCallback(async () => {
    if (!token || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // [advice from AI] 프록시를 통해 같은 origin에서 요청하여 CORS 문제 방지
      const response = await fetch(`/api/admin/permissions/users/${user.id}/permissions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const userData: UserPermissionData = data.data;
          setPermissions(userData.effective_permissions);
          setUserRoles(userData.roles);
        } else {
          throw new Error(data.message || '권한 정보 로드 실패');
        }
      } else if (response.status === 403) {
        // 권한이 없는 경우 기본 권한으로 설정
        const defaultPermissions = {
          can_read_all: true,
          can_write_all: false,
          can_delete_all: false,
          can_admin_all: false,
          can_manage_users: false,
          can_manage_roles: false,
          can_view_logs: false,
          can_manage_system: false,
          can_view_monitoring: false,
          can_manage_domains: false,
          can_manage_projects: false,
          can_manage_systems: false,
          can_manage_components: false,
          can_manage_documents: false,
          can_manage_designs: false,
          can_deploy_services: false,
          can_manage_pipelines: false,
          can_view_operations: true,
          can_manage_infrastructure: false,
          can_approve_requests: false,
          can_submit_requests: true,
        };
        
        setPermissions(defaultPermissions);
        
        // 기본 역할 설정
        setUserRoles([{
          role_name: 'user',
          role_display_name: '일반 사용자',
          permission_level: 50, // 낮은 권한 레벨
          permissions: defaultPermissions,
          assigned_at: new Date().toISOString()
        }]);
      } else {
        throw new Error('권한 정보 조회 실패');
      }
    } catch (err) {
      console.error('권한 로드 오류:', err);
      setError(err instanceof Error ? err.message : '권한 로드 중 오류 발생');
      
      // 오류 시 최소 권한으로 설정
      const fallbackPermissions = {
        can_read_all: true,
        can_write_all: false,
        can_delete_all: false,
        can_admin_all: false,
        can_manage_users: false,
        can_manage_roles: false,
        can_view_logs: false,
        can_manage_system: false,
        can_view_monitoring: false,
        can_manage_domains: false,
        can_manage_projects: false,
        can_manage_systems: false,
        can_manage_components: false,
        can_manage_documents: false,
        can_manage_designs: false,
        can_deploy_services: false,
        can_manage_pipelines: false,
        can_view_operations: true,
        can_manage_infrastructure: false,
        can_approve_requests: false,
        can_submit_requests: true,
      };
      
      setPermissions(fallbackPermissions);
      
      // 기본 역할 설정 (오류 시에도)
      setUserRoles([{
        role_name: 'guest',
        role_display_name: '게스트',
        permission_level: 100, // 매우 낮은 권한 레벨
        permissions: fallbackPermissions,
        assigned_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  // 특정 권한 체크 함수
  const hasPermission = useCallback((permissionKey: keyof EffectivePermissions): boolean => {
    if (!permissions) return false;
    
    // 관리자는 모든 권한 허용
    if (permissions.can_admin_all) return true;
    
    return permissions[permissionKey] || false;
  }, [permissions]);

  // 여러 권한 중 하나라도 있는지 체크 (OR 연산)
  const hasAnyPermission = useCallback((permissionKeys: Array<keyof EffectivePermissions>): boolean => {
    return permissionKeys.some(key => hasPermission(key));
  }, [hasPermission]);

  // 모든 권한이 있는지 체크 (AND 연산)
  const hasAllPermissions = useCallback((permissionKeys: Array<keyof EffectivePermissions>): boolean => {
    return permissionKeys.every(key => hasPermission(key));
  }, [hasPermission]);

  // 권한 레벨 체크 (숫자가 낮을수록 높은 권한)
  const hasPermissionLevel = useCallback((requiredLevel: number): boolean => {
    if (!userRoles.length) return false;
    const highestLevel = Math.min(...userRoles.map(role => role.permission_level));
    return highestLevel <= requiredLevel;
  }, [userRoles]);

  // 특정 역할 보유 여부 체크
  const hasRole = useCallback((roleName: string): boolean => {
    return userRoles.some(role => role.role_name === roleName);
  }, [userRoles]);

  // 권한별 편의 함수들
  const canManageKnowledge = hasAnyPermission([
    'can_manage_domains', 'can_manage_projects', 'can_manage_systems', 
    'can_manage_components', 'can_manage_documents', 'can_manage_designs'
  ]);

  const canManageOperations = hasAnyPermission([
    'can_deploy_services', 'can_manage_pipelines', 'can_manage_infrastructure'
  ]);

  const canManageSystem = hasAnyPermission([
    'can_manage_users', 'can_manage_roles', 'can_manage_system', 'can_view_logs'
  ]);

  const isAdmin = hasPermission('can_admin_all');
  const isSystemAdmin = hasAnyPermission(['can_admin_all', 'can_manage_system']);
  const isOperationsAdmin = hasAnyPermission(['can_admin_all', 'can_deploy_services', 'can_manage_pipelines']);

  return {
    // 데이터
    permissions,
    userRoles,
    loading,
    error,
    
    // 함수
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionLevel,
    hasRole,
    refreshPermissions: loadUserPermissions,
    
    // 편의 속성
    canManageKnowledge,
    canManageOperations,
    canManageSystem,
    isAdmin,
    isSystemAdmin,
    isOperationsAdmin,
  };
};

export type { EffectivePermissions, UserRole, UserPermissionData };
