import React from 'react';
import { Button, ButtonProps, Tooltip } from '@mui/material';
import { useAdvancedPermissions, EffectivePermissions } from '../../hooks/useAdvancedPermissions';

interface PermissionButtonProps extends Omit<ButtonProps, 'disabled'> {
  // 권한 요구사항
  permissions?: Array<keyof EffectivePermissions>;
  
  // 모든 권한 필요 (AND 연산)
  requireAllPermissions?: Array<keyof EffectivePermissions>;
  
  // 특정 역할 필요
  roles?: string[];
  
  // 권한 레벨 (숫자가 낮을수록 높은 권한)
  permissionLevel?: number;
  
  // 권한이 없을 때 표시할 툴팁 메시지
  noPermissionTooltip?: string;
  
  // 권한이 없을 때 완전히 숨김
  hideIfNoPermission?: boolean;
  
  // 관리자 우회 허용 (기본값: true)
  allowAdminBypass?: boolean;
}

const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  permissions = [],
  requireAllPermissions = [],
  roles = [],
  permissionLevel,
  noPermissionTooltip = '이 기능을 사용할 권한이 없습니다.',
  hideIfNoPermission = false,
  allowAdminBypass = true,
  onClick,
  ...buttonProps
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasPermissionLevel,
    isAdmin,
    loading
  } = useAdvancedPermissions();

  // 로딩 중에는 비활성화
  if (loading) {
    return (
      <Button {...buttonProps} disabled>
        {children}
      </Button>
    );
  }

  // 관리자 우회
  if (allowAdminBypass && isAdmin) {
    return (
      <Button {...buttonProps} onClick={onClick}>
        {children}
      </Button>
    );
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

  // 접근 권한이 없고 숨김 설정인 경우
  if (!hasAccess && hideIfNoPermission) {
    return null;
  }

  // 권한이 없는 경우 비활성화
  if (!hasAccess) {
    return (
      <Tooltip title={noPermissionTooltip} arrow>
        <span>
          <Button 
            {...buttonProps} 
            disabled 
            onClick={undefined}
            sx={{
              ...buttonProps.sx,
              opacity: 0.6,
            }}
          >
            {children}
          </Button>
        </span>
      </Tooltip>
    );
  }

  // 권한이 있는 경우 정상 버튼
  return (
    <Button {...buttonProps} onClick={onClick}>
      {children}
    </Button>
  );
};

export default PermissionButton;
