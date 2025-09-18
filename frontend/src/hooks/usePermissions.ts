// [advice from AI] Phase 2: 권한 기반 기능 차등 제공을 위한 권한 관리 훅
import { useJwtAuthStore } from '../store/jwtAuthStore';

export interface UserPermissions {
  // 개발/등록 권한 (Admin, PO, PE)
  canManageDomains: boolean;
  canManageSystems: boolean;
  canManageCodeComponents: boolean;
  canManageDesignAssets: boolean;
  canManageDocuments: boolean;
  
  // 승인 권한 (Admin, QA)
  canApprove: boolean;
  canViewApprovals: boolean;
  canManageApprovals: boolean;
  
  // 배포/CI/CD 권한 (Admin, Ops)
  canManageDeployment: boolean;
  canManageCICD: boolean;
  canViewDeploymentLogs: boolean;
  canConfigureEnvironments: boolean;
  
  // 조회 권한 (모든 사용자)
  canViewCatalog: boolean;
  canDownloadAssets: boolean;
  canUseAssets: boolean;
  
  // 시스템 관리 권한 (Admin만)
  canViewSystemAdmin: boolean;
  canManageUsers: boolean;
  
  // 자동 등록 권한 (Admin, PO, PE)
  canUseAutoRegistration: boolean;
}

export const usePermissions = (): UserPermissions => {
  const { user } = useJwtAuthStore();
  
  const roleType = user?.roleType || '';
  const permissionLevel = user?.permissionLevel || 999;
  
  // [advice from AI] 관리자 권한 (Executive, Admin)
  const isAdmin = roleType === 'admin' || roleType === 'executive' || permissionLevel === 0;
  
  // [advice from AI] PO 권한 (프로젝트 관리)
  const isPO = roleType === 'po' || permissionLevel === 1;
  
  // [advice from AI] QA 권한 (품질 관리)
  const isQA = roleType === 'qa' || permissionLevel === 3;
  
  // [advice from AI] PE 권한 (개발자)
  const isPE = roleType === 'pe' || permissionLevel === 2;
  
  // [advice from AI] 운영팀 권한
  const isOps = roleType === 'operations' || permissionLevel === 4;
  
  // [advice from AI] 관리 권한이 있는 역할 (Admin, PO, PE) - QA는 승인만
  const canManage = isAdmin || isPO || isPE;
  
  return {
    // 개발/등록 권한 - Admin, PO, PE만 가능
    canManageDomains: canManage,
    canManageSystems: canManage,
    canManageCodeComponents: canManage,
    canManageDesignAssets: canManage,
    canManageDocuments: canManage,
    
    // 승인 권한 - Admin, QA만 가능 (QA는 승인 전문)
    canApprove: isAdmin || isQA,
    canViewApprovals: isAdmin || isPO || isQA || isPE, // PE는 자신의 승인 상태 조회 가능
    canManageApprovals: isAdmin, // 승인 관리는 Admin만
    
    // 배포/CI/CD 권한 - Admin, Ops만 가능 (Ops는 배포 전문)
    canManageDeployment: isAdmin || isOps,
    canManageCICD: isAdmin || isOps,
    canViewDeploymentLogs: isAdmin || isOps,
    canConfigureEnvironments: isAdmin || isOps,
    
    // 조회 권한 - 모든 사용자 가능
    canViewCatalog: true,
    canDownloadAssets: true,
    canUseAssets: true,
    
    // 시스템 관리 권한 - Admin만
    canViewSystemAdmin: isAdmin,
    canManageUsers: isAdmin,
    
    // 자동 등록 권한 - Admin, PO, PE만 가능
    canUseAutoRegistration: canManage
  };
};

// [advice from AI] 권한 기반 컴포넌트 표시 여부 결정 유틸리티
export const useRoleBasedVisibility = () => {
  const permissions = usePermissions();
  const { user } = useJwtAuthStore();
  
  return {
    permissions,
    user,
    
    // 버튼 표시 여부 결정
    showManageButtons: permissions.canManageDomains,
    showApprovalButtons: permissions.canApprove,
    showAdminMenus: permissions.canViewSystemAdmin,
    showAutoRegistration: permissions.canUseAutoRegistration,
    
    // 사용자 정보 표시
    getUserRoleDisplay: () => {
      switch (user?.roleType) {
        case 'executive': return '최고 관리자';
        case 'admin': return '시스템 관리자';
        case 'po': return 'PO (프로젝트 관리자)';
        case 'qa': return 'QA (품질 관리자)';
        case 'pe': return 'PE (개발자)';
        case 'operations': return '운영팀';
        default: return '사용자';
      }
    }
  };
};
