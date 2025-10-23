// [advice from AI] 프로덕션 레벨 메뉴 구성 설정
// 역할별 메뉴 최적화, 동적 메뉴 로딩, 접근성 개선

export interface MenuItem {
  id: string;
  text: string;
  path: string;
  icon?: string;
  badge?: string;
  hasSubMenu?: boolean;
  subMenus?: MenuItem[];
  description?: string;
  highlight?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  hideIfNoPermission?: boolean;
  order?: number;
  category?: 'primary' | 'secondary' | 'admin';
  keyboardShortcut?: string;
  ariaLabel?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  requiredPermissions?: string[];
  items: MenuItem[];
}

// [advice from AI] 역할별 메뉴 카테고리 정의
export const menuCategories: MenuCategory[] = [
  {
    id: 'dashboard',
    name: '대시보드',
    icon: 'Dashboard',
    order: 1,
    items: [
      {
        id: 'home',
        text: '홈',
        path: '/',
        icon: 'Home',
        description: '전체 시스템 현황 및 주요 지표',
        ariaLabel: '홈 대시보드로 이동',
        keyboardShortcut: 'Alt+H',
        category: 'primary',
        order: 1
      }
    ]
  },
  {
    id: 'knowledge',
    name: '지식자원',
    icon: 'Library',
    order: 2,
    requiredPermissions: ['can_read_knowledge'],
    items: [
      {
        id: 'knowledge-dashboard',
        text: '지식자원 대시보드',
        path: '/knowledge/dashboard',
        icon: 'Analytics',
        description: '지식자원 통계 및 현황',
        ariaLabel: '지식자원 대시보드',
        category: 'primary',
        order: 1
      },
      {
        id: 'domains',
        text: '도메인 관리',
        path: '/knowledge/domains',
        icon: 'Domain',
        description: '비즈니스 도메인 및 영업처 관리',
        ariaLabel: '도메인 관리 페이지',
        category: 'primary',
        order: 2
      },
      {
        id: 'projects',
        text: '프로젝트 관리',
        path: '/knowledge/projects',
        icon: 'Assignment',
        badge: 'NEW',
        description: '프로젝트 생성, 관리 및 추적',
        ariaLabel: '프로젝트 관리 페이지',
        category: 'primary',
        order: 3
      },
      {
        id: 'systems',
        text: '시스템 관리',
        path: '/knowledge/systems',
        icon: 'Computer',
        description: '시스템 등록 및 자동 발견',
        ariaLabel: '시스템 관리 페이지',
        category: 'primary',
        order: 4
      },
      {
        id: 'code',
        text: '코드 컴포넌트',
        path: '/knowledge/code',
        icon: 'Code',
        description: '재사용 가능한 코드 컴포넌트 라이브러리',
        ariaLabel: '코드 컴포넌트 관리',
        category: 'secondary',
        order: 5
      },
      {
        id: 'design',
        text: '디자인 자산',
        path: '/knowledge/design',
        icon: 'Palette',
        description: 'UI/UX 디자인 자산 및 가이드라인',
        ariaLabel: '디자인 자산 관리',
        category: 'secondary',
        order: 6
      },
      {
        id: 'docs',
        text: '문서/가이드',
        path: '/knowledge/docs',
        icon: 'Description',
        description: '기술 문서 및 사용자 가이드',
        ariaLabel: '문서 및 가이드 관리',
        category: 'secondary',
        order: 7
      }
    ]
  },
  {
    id: 'operations',
    name: '운영센터',
    icon: 'Settings',
    order: 3,
    requiredPermissions: ['can_access_operations'],
    items: [
      // 배포 관리
      {
        id: 'repository-deploy',
        text: '레포지토리 배포',
        path: '/operations/repository-deploy',
        icon: 'Rocket',
        highlight: true,
        description: 'GitHub URL로 즉시 배포 (운영팀 전용)',
        ariaLabel: '레포지토리 직접 배포',
        category: 'primary',
        order: 1,
        requiredRoles: ['operations', 'admin']
      },
      {
        id: 'deployment-history',
        text: '배포 히스토리',
        path: '/operations/deployment-history',
        icon: 'History',
        description: '모든 배포 기록 및 롤백 관리',
        ariaLabel: '배포 히스토리 조회',
        category: 'primary',
        order: 2
      },
      // CI/CD 파이프라인
      {
        id: 'pipeline',
        text: '파이프라인 관리',
        path: '/operations/pipeline',
        icon: 'AccountTree',
        highlight: true,
        description: 'Jenkins + Nexus + ArgoCD 통합 관리',
        ariaLabel: 'CI/CD 파이프라인 관리',
        category: 'primary',
        order: 3
      },
      {
        id: 'infrastructure',
        text: '인프라 관리',
        path: '/operations/infrastructure',
        icon: 'Storage',
        description: 'CI/CD 서버 설정 및 모니터링',
        ariaLabel: '인프라 서버 관리',
        category: 'secondary',
        order: 4
      },
      // 모니터링 & 이슈
      {
        id: 'monitoring',
        text: '종합 모니터링',
        path: '/operations/comprehensive-monitoring',
        icon: 'Monitoring',
        highlight: true,
        description: 'Prometheus + SLA + 실시간 알림',
        ariaLabel: '종합 모니터링 대시보드',
        category: 'primary',
        order: 5
      },
      {
        id: 'issues',
        text: '이슈 관리',
        path: '/operations/issues',
        icon: 'BugReport',
        description: '빌드/배포/성능 이슈 추적',
        ariaLabel: '이슈 관리 시스템',
        category: 'secondary',
        order: 6
      },
      // 클러스터 관리
      {
        id: 'cluster-dashboard',
        text: '클러스터 대시보드',
        path: '/operations/cluster-dashboard',
        icon: 'Hub',
        highlight: true,
        description: '멀티 클러스터 현황 모니터링',
        ariaLabel: '클러스터 대시보드',
        category: 'primary',
        order: 7
      },
      {
        id: 'cluster-management',
        text: '클러스터 관리',
        path: '/operations/cluster-management',
        icon: 'DeviceHub',
        description: 'Kubernetes 클러스터 등록 및 설정',
        ariaLabel: '클러스터 관리',
        category: 'secondary',
        order: 8
      },
      // AI 지원 도구
      {
        id: 'hardware-calculator',
        text: 'AI 하드웨어 계산기',
        path: '/operations/hardware-calculator',
        icon: 'Calculate',
        description: 'ECP-AI 리소스 자동 계산',
        ariaLabel: 'AI 하드웨어 계산기',
        category: 'secondary',
        order: 9
      }
    ]
  },
  {
    id: 'admin',
    name: '시스템 관리',
    icon: 'AdminPanelSettings',
    order: 4,
    requiredPermissions: ['can_access_admin'],
    items: [
      {
        id: 'user-management',
        text: '사용자 관리',
        path: '/admin',
        icon: 'People',
        description: '사용자 계정 및 역할 관리',
        ariaLabel: '사용자 관리',
        category: 'primary',
        order: 1,
        requiredRoles: ['admin']
      },
      {
        id: 'permissions',
        text: '권한 관리',
        path: '/admin/permissions',
        icon: 'Security',
        description: '역할 기반 권한 및 감사 로그 관리',
        ariaLabel: '권한 관리',
        category: 'primary',
        order: 2,
        requiredRoles: ['admin']
      },
      {
        id: 'system-config',
        text: '시스템 설정',
        path: '/admin/system-config',
        icon: 'Settings',
        description: 'CI/CD, 클러스터, 보안 설정',
        ariaLabel: '시스템 설정',
        category: 'primary',
        order: 3,
        requiredRoles: ['admin']
      },
      {
        id: 'system-monitoring',
        text: '시스템 모니터링',
        path: '/admin/monitoring',
        icon: 'Monitoring',
        description: '백엔드 서버 및 DB 상태 모니터링',
        ariaLabel: '시스템 모니터링',
        category: 'primary',
        order: 4,
        requiredRoles: ['admin']
      },
      {
        id: 'logs',
        text: '로그 관리',
        path: '/admin/logs',
        icon: 'Assignment',
        description: '시스템 로그 조회 및 분석',
        ariaLabel: '로그 관리',
        category: 'secondary',
        order: 5,
        requiredRoles: ['admin']
      }
    ]
  },
  {
    id: 'executive',
    name: '최고 관리자',
    icon: 'BusinessCenter',
    order: 5,
    requiredPermissions: ['can_access_executive'],
    items: [
      {
        id: 'executive-dashboard',
        text: '경영 대시보드',
        path: '/executive',
        icon: 'Dashboard',
        description: '전사 현황 및 KPI 모니터링',
        ariaLabel: '경영 대시보드',
        category: 'primary',
        order: 1,
        requiredRoles: ['executive', 'admin']
      }
    ]
  }
];

// [advice from AI] 메뉴 접근성 설정
export const accessibilityConfig = {
  keyboardNavigation: true,
  screenReaderSupport: true,
  highContrastMode: false,
  reducedMotion: false,
  focusVisible: true
};

// [advice from AI] 메뉴 성능 최적화 설정
export const performanceConfig = {
  lazyLoadSubMenus: true,
  cacheMenuPermissions: true,
  debounceSearch: 300,
  virtualScrolling: false // 메뉴 아이템이 많을 경우 활성화
};

// [advice from AI] 메뉴 필터링 유틸리티 함수
export const filterMenusByRole = (
  categories: MenuCategory[],
  userRoles: string[],
  userPermissions: string[]
): MenuCategory[] => {
  return categories
    .filter(category => {
      // 카테고리 레벨 권한 확인
      if (category.requiredPermissions) {
        return category.requiredPermissions.some(permission => 
          userPermissions.includes(permission)
        );
      }
      return true;
    })
    .map(category => ({
      ...category,
      items: category.items.filter(item => {
        // 아이템 레벨 권한 확인
        let hasPermission = true;
        let hasRole = true;

        if (item.requiredPermissions) {
          hasPermission = item.requiredPermissions.some(permission =>
            userPermissions.includes(permission)
          );
        }

        if (item.requiredRoles) {
          hasRole = item.requiredRoles.some(role =>
            userRoles.includes(role)
          );
        }

        return hasPermission && hasRole;
      }).sort((a, b) => (a.order || 0) - (b.order || 0))
    }))
    .filter(category => category.items.length > 0)
    .sort((a, b) => a.order - b.order);
};

// [advice from AI] 메뉴 검색 유틸리티
export const searchMenuItems = (
  categories: MenuCategory[],
  searchTerm: string
): MenuItem[] => {
  const results: MenuItem[] = [];
  
  categories.forEach(category => {
    category.items.forEach(item => {
      if (
        item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        results.push(item);
      }
    });
  });

  return results.sort((a, b) => {
    // 정확한 매치가 우선
    const aExact = a.text.toLowerCase() === searchTerm.toLowerCase();
    const bExact = b.text.toLowerCase() === searchTerm.toLowerCase();
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // 시작 매치가 다음 우선
    const aStarts = a.text.toLowerCase().startsWith(searchTerm.toLowerCase());
    const bStarts = b.text.toLowerCase().startsWith(searchTerm.toLowerCase());
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    // 알파벳 순서
    return a.text.localeCompare(b.text);
  });
};

// [advice from AI] 키보드 단축키 매핑
export const keyboardShortcuts: Record<string, string> = {
  'Alt+H': '/',
  'Alt+K': '/knowledge',
  'Alt+O': '/operations',
  'Alt+A': '/admin',
  'Alt+E': '/executive',
  'Ctrl+K': 'search', // 메뉴 검색 활성화
  'Escape': 'close-menu' // 모바일에서 메뉴 닫기
};
