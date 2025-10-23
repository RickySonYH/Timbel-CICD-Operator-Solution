import { EffectivePermissions } from '../../hooks/useAdvancedPermissions';

// [advice from AI] 고도화된 권한 시스템 기반 메뉴 접근 제어 설정
export interface MenuPermissionConfig {
  // 필요한 권한들 중 하나라도 있으면 접근 허용 (OR 연산)
  permissions?: Array<keyof EffectivePermissions>;
  
  // 모든 권한이 있어야 접근 허용 (AND 연산)
  requireAllPermissions?: Array<keyof EffectivePermissions>;
  
  // 특정 역할 필요
  roles?: string[];
  
  // 권한 레벨 (숫자가 낮을수록 높은 권한)
  permissionLevel?: number;
  
  // 설명
  description: string;
  
  // 권한이 없을 때 완전히 숨김
  hideIfNoPermission?: boolean;
  
  // 관리자 우회 허용
  allowAdminBypass?: boolean;
}

// [advice from AI] 메뉴별 권한 설정 매핑
export const menuPermissionMap: { [path: string]: MenuPermissionConfig } = {
  
  // ===== 최고 관리자 =====
  '/executive': {
    permissionLevel: 10,
    description: '최고 관리자 또는 시스템 관리자 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  
  // ===== 지식자원 카탈로그 =====
  '/knowledge': {
    permissions: ['can_read_all'],
    description: '지식자원에 대한 읽기 권한이 필요합니다.',
    hideIfNoPermission: false
  },
  '/knowledge/dashboard': {
    permissions: ['can_read_all'],
    description: '지식자원 대시보드 조회 권한이 필요합니다.'
  },
  '/knowledge/domains': {
    permissions: ['can_read_all', 'can_manage_domains'],
    description: '도메인 조회 권한이 필요합니다.'
  },
  '/knowledge/projects': {
    permissions: ['can_read_all', 'can_manage_projects'],
    description: '프로젝트 조회 권한이 필요합니다.'
  },
  '/knowledge/systems': {
    permissions: ['can_read_all', 'can_manage_systems'],
    description: '시스템 조회 권한이 필요합니다.'
  },
  '/knowledge/code': {
    permissions: ['can_read_all', 'can_manage_components'],
    description: '코드 컴포넌트 조회 권한이 필요합니다.'
  },
  '/knowledge/design': {
    permissions: ['can_read_all', 'can_manage_designs'],
    description: '디자인 자산 조회 권한이 필요합니다.'
  },
  '/knowledge/docs': {
    permissions: ['can_read_all', 'can_manage_documents'],
    description: '문서/가이드 조회 권한이 필요합니다.'
  },
  
  // ===== 운영 센터 =====
  '/operations': {
    permissions: ['can_view_operations'],
    description: '운영 센터 접근 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/operations/repository-deploy': {
    permissions: ['can_deploy_services'],
    description: '서비스 배포 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/operations/deployment-history': {
    permissions: ['can_view_operations'],
    description: '운영 현황 조회 권한이 필요합니다.'
  },
  '/operations/pipeline': {
    permissions: ['can_manage_pipelines', 'can_view_operations'],
    description: '파이프라인 관리 또는 조회 권한이 필요합니다.'
  },
  '/operations/infrastructure': {
    permissions: ['can_manage_infrastructure'],
    description: '인프라 관리 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/operations/comprehensive-monitoring': {
    permissions: ['can_view_operations', 'can_view_monitoring'],
    description: '모니터링 조회 권한이 필요합니다.'
  },
  '/operations/issues': {
    permissions: ['can_view_operations'],
    description: '운영 이슈 조회 권한이 필요합니다.'
  },
  '/operations/cluster-dashboard': {
    permissions: ['can_view_operations', 'can_manage_infrastructure'],
    description: '클러스터 조회 권한이 필요합니다.'
  },
  '/operations/cluster-management': {
    permissions: ['can_manage_infrastructure'],
    description: '클러스터 관리 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/operations/hardware-calculator': {
    permissions: ['can_view_operations'],
    description: '하드웨어 계산기 사용 권한이 필요합니다.'
  },
  
  // ===== 시스템 관리 =====
  '/admin': {
    permissions: ['can_manage_users', 'can_manage_system'],
    description: '시스템 관리 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/admin/permissions': {
    permissions: ['can_manage_roles', 'can_manage_users'],
    description: '권한 관리 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/admin/system-config': {
    permissions: ['can_manage_system'],
    description: '시스템 설정 관리 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/admin/monitoring': {
    permissions: ['can_view_monitoring', 'can_manage_system'],
    description: '시스템 모니터링 권한이 필요합니다.',
    hideIfNoPermission: true
  },
  '/admin/logs': {
    permissions: ['can_view_logs', 'can_manage_system'],
    description: '로그 조회 권한이 필요합니다.',
    hideIfNoPermission: true
  }
};

// [advice from AI] 권한 상속 및 계층 구조를 고려한 메뉴 권한 체크 헬퍼 함수
export const checkMenuPermission = (
  menuPath: string,
  hasPermission: (permission: keyof EffectivePermissions) => boolean,
  hasAnyPermission: (permissions: Array<keyof EffectivePermissions>) => boolean,
  hasAllPermissions: (permissions: Array<keyof EffectivePermissions>) => boolean,
  hasPermissionLevel: (level: number) => boolean,
  hasRole: (role: string) => boolean,
  isAdmin: boolean
): boolean => {
  const config = menuPermissionMap[menuPath];
  
  // 매핑되지 않은 메뉴는 기본적으로 접근 허용
  if (!config) return true;
  
  // 관리자 우회 (기본값: true)
  if ((config.allowAdminBypass !== false) && isAdmin) return true;
  
  let hasAccess = true;
  
  // 권한 상속 체크: 상위 메뉴 권한이 있으면 하위 메뉴 자동 접근
  const parentMenuAccess = checkParentMenuAccess(
    menuPath, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    hasPermissionLevel, 
    hasRole, 
    isAdmin
  );
  
  // 상위 메뉴 권한이 있으면 하위 메뉴 접근 허용 (권한 상속)
  if (parentMenuAccess) {
    return true;
  }
  
  // 특정 권한들 중 하나라도 있어야 함 (OR 연산)
  if (config.permissions && config.permissions.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(config.permissions);
  }
  
  // 모든 권한이 있어야 함 (AND 연산)
  if (config.requireAllPermissions && config.requireAllPermissions.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(config.requireAllPermissions);
  }
  
  // 특정 역할이 있어야 함
  if (config.roles && config.roles.length > 0) {
    hasAccess = hasAccess && config.roles.some(role => hasRole(role));
  }
  
  // 권한 레벨 체크 (낮은 숫자 = 높은 권한)
  if (config.permissionLevel !== undefined) {
    if (typeof hasPermissionLevel === 'function') {
      hasAccess = hasAccess && hasPermissionLevel(config.permissionLevel);
    } else {
      console.warn('hasPermissionLevel is not a function', { config, hasPermissionLevel });
      hasAccess = false; // 함수가 없으면 접근 거부
    }
  }
  
  return hasAccess;
};

// [advice from AI] 상위 메뉴 권한 상속 체크 함수
export const checkParentMenuAccess = (
  menuPath: string,
  hasPermission: (permission: keyof EffectivePermissions) => boolean,
  hasAnyPermission: (permissions: Array<keyof EffectivePermissions>) => boolean,
  hasAllPermissions: (permissions: Array<keyof EffectivePermissions>) => boolean,
  hasPermissionLevel: (level: number) => boolean,
  hasRole: (role: string) => boolean,
  isAdmin: boolean
): boolean => {
  // 권한 상속 매핑 테이블
  const parentPermissionMap: { [childPath: string]: string } = {
    // 지식자원 카탈로그 하위 메뉴들
    '/knowledge/dashboard': '/knowledge',
    '/knowledge/domains': '/knowledge',
    '/knowledge/projects': '/knowledge',
    '/knowledge/systems': '/knowledge',
    '/knowledge/code': '/knowledge',
    '/knowledge/design': '/knowledge',
    '/knowledge/docs': '/knowledge',
    
    // 운영 센터 하위 메뉴들
    '/operations/repository-deploy': '/operations',
    '/operations/deployment-history': '/operations',
    '/operations/pipeline': '/operations',
    '/operations/infrastructure': '/operations',
    '/operations/comprehensive-monitoring': '/operations',
    '/operations/issues': '/operations',
    '/operations/cluster-dashboard': '/operations',
    '/operations/cluster-management': '/operations',
    '/operations/hardware-calculator': '/operations',
    
    // 시스템 관리 하위 메뉴들
    '/admin/permissions': '/admin',
    '/admin/system-config': '/admin',
    '/admin/monitoring': '/admin',
    '/admin/logs': '/admin'
  };
  
  const parentPath = parentPermissionMap[menuPath];
  if (!parentPath) return false;
  
  const parentConfig = menuPermissionMap[parentPath];
  if (!parentConfig) return false;
  
  // 관리자는 모든 상위 메뉴에 접근 가능
  if ((parentConfig.allowAdminBypass !== false) && isAdmin) return true;
  
  let parentHasAccess = true;
  
  // 상위 메뉴의 권한 체크
  if (parentConfig.permissions && parentConfig.permissions.length > 0) {
    parentHasAccess = parentHasAccess && hasAnyPermission(parentConfig.permissions);
  }
  
  if (parentConfig.requireAllPermissions && parentConfig.requireAllPermissions.length > 0) {
    parentHasAccess = parentHasAccess && hasAllPermissions(parentConfig.requireAllPermissions);
  }
  
  if (parentConfig.roles && parentConfig.roles.length > 0) {
    parentHasAccess = parentHasAccess && parentConfig.roles.some(role => hasRole(role));
  }
  
  if (parentConfig.permissionLevel !== undefined) {
    if (typeof hasPermissionLevel === 'function') {
      parentHasAccess = parentHasAccess && hasPermissionLevel(parentConfig.permissionLevel);
    } else {
      console.warn('hasPermissionLevel is not a function in parent check', { parentConfig, hasPermissionLevel });
      parentHasAccess = false;
    }
  }
  
  return parentHasAccess;
};

// [advice from AI] 메뉴 설정 정보 가져오기
export const getMenuPermissionConfig = (menuPath: string): MenuPermissionConfig => {
  return menuPermissionMap[menuPath] || {
    description: '권한 설정이 없는 메뉴입니다.',
    hideIfNoPermission: false
  };
};
