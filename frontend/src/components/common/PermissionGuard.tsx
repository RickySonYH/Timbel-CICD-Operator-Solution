import React from 'react';
import { useAdvancedPermissions, EffectivePermissions } from '../../hooks/useAdvancedPermissions';
import { CircularProgress, Alert, Box } from '@mui/material';

interface PermissionGuardProps {
  children: React.ReactNode;
  
  // 권한 요구사항 (OR 연산 - 하나라도 있으면 허용)
  permissions?: Array<keyof EffectivePermissions>;
  
  // 모든 권한 필요 (AND 연산 - 모두 있어야 허용)
  requireAllPermissions?: Array<keyof EffectivePermissions>;
  
  // 특정 역할 필요
  roles?: string[];
  
  // 권한 레벨 (숫자가 낮을수록 높은 권한)
  permissionLevel?: number;
  
  // 권한이 없을 때 표시할 내용
  fallback?: React.ReactNode;
  
  // 권한이 없을 때 완전히 숨김 (fallback 무시)
  hideIfNoPermission?: boolean;
  
  // 로딩 중일 때 표시할 내용
  loadingComponent?: React.ReactNode;
  
  // 관리자 우회 허용 (기본값: true)
  allowAdminBypass?: boolean;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permissions = [],
  requireAllPermissions = [],
  roles = [],
  permissionLevel,
  fallback,
  hideIfNoPermission = false,
  loadingComponent,
  allowAdminBypass = true,
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasPermissionLevel,
    isAdmin,
    loading,
    error
  } = useAdvancedPermissions();

  // 로딩 중
  if (loading) {
    return (
      <>
        {loadingComponent || (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </>
    );
  }

  // 오류 발생
  if (error && !hideIfNoPermission) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        권한 정보를 불러올 수 없습니다: {error}
      </Alert>
    );
  }

  // 관리자 우회
  if (allowAdminBypass && isAdmin) {
    return <>{children}</>;
  }

  // 권한 체크
  let hasAccess = true;

  // 특정 권한들 중 하나라도 있어야 함 (OR 연산)
  if (permissions.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(permissions);
  }

  // 모든 권한이 있어야 함 (AND 연산)
  if (requireAllPermissions.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(requireAllPermissions);
  }

  // 특정 역할이 있어야 함
  if (roles.length > 0) {
    hasAccess = hasAccess && roles.some(role => hasRole(role));
  }

  // 권한 레벨 체크
  if (permissionLevel !== undefined) {
    hasAccess = hasAccess && hasPermissionLevel(permissionLevel);
  }

  // 접근 권한이 없는 경우
  if (!hasAccess) {
    if (hideIfNoPermission) {
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        이 기능을 사용할 권한이 없습니다.
      </Alert>
    );
  }

  // 권한이 있는 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};

export default PermissionGuard;
