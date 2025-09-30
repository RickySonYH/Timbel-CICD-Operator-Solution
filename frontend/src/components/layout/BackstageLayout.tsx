// [advice from AI] 백스테이지IO 스타일의 메인 레이아웃 컴포넌트
// 사이드바, 헤더, 메인 컨텐츠 영역을 포함한 전체 레이아웃 구조

import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  useMediaQuery,
  Collapse,
  Tooltip,
  Button,
  Chip,
  Badge,
  Popover,
  Paper,
  ListItemAvatar,
  Avatar,
  CircularProgress
} from '@mui/material';
// [advice from AI] 메시지 센터 제거로 알림 아이콘 불필요
import { useNavigate, useLocation, Link } from 'react-router-dom';
import UserInfo from './UserInfo';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 백스테이지IO 스타일의 사이드바 너비
const DRAWER_WIDTH = 240;

// [advice from AI] Phase 2: 통합된 네비게이션 메뉴 (지식자원 카탈로그로 명칭 변경)
  const navigationItems = [
    { text: '홈', path: '/' },
    { text: '지식자원 카탈로그', path: '/knowledge', hasSubMenu: true },
  ];

// [advice from AI] Phase 1: 통합된 지식자원 관리 하위 메뉴 (권한 기반 기능 차등 제공 예정)
const knowledgeSubMenus = [
  { text: '대시보드', path: '/knowledge/dashboard' },
  { text: '도메인 (영업처)', path: '/knowledge/domains' },
  { text: '프로젝트 (기획)', path: '/knowledge/projects', badge: 'NEW' },
  { text: '시스템 (솔루션)', path: '/knowledge/systems', hasAutoRegistration: true },
  { text: '코드 컴포넌트', path: '/knowledge/code' },
  { text: '디자인 자산', path: '/knowledge/design' },
  { text: '문서/가이드', path: '/knowledge/docs' }
];

// [advice from AI] 관리자 전용 지식자산 승인 관리 메뉴 (프로젝트 승인은 메시지 센터로 통합)
const adminApprovalSubMenus = [
  { text: '시스템 승인 대기', path: '/admin/approvals/systems-pending', badge: 'NEW' },
  { text: '지식 자산 승인 대기', path: '/admin/approvals/assets-pending', badge: 'NEW' },
  { text: '승인된 자산 관리', path: '/admin/approvals/approved-assets' },
  { text: '승인 히스토리', path: '/admin/approvals/history' }
];


// [advice from AI] 업무 영역 메뉴 (최고관리자 단순화, 아이콘 통일)
const workAreas = [
  { text: '최고 관리자', path: '/executive', hasSubMenu: false, icon: '●' },
  { text: 'PO 업무영역', path: '/po-dashboard', hasSubMenu: true, icon: '▼' }, // 프로젝트 관리, PE 관리, 요구사항 관리
  { text: 'PE 업무영역', path: '/pe-workspace', hasSubMenu: true, icon: '▼' }, // PE 작업 대시보드 및 하위 기능들
  { text: 'QA 센터', path: '/qc-dashboard', hasSubMenu: false, icon: '●' }, // 품질 검증 및 테스트 관리
  { text: '운영 센터', path: '/operations', hasSubMenu: true, icon: '▼' }, // 현재 4개 하위 센터
];

// [advice from AI] PO 대시보드 하위 메뉴 (프로젝트 워크플로우 추가)
const poDashboardSubMenus = [
  { text: 'PO 대시보드', path: '/po-dashboard', highlight: false },
  { text: '프로젝트 워크플로우', path: '/po/workflow', highlight: true, description: '7단계 생명주기 전체 현황' }
];

const peWorkspaceSubMenus = [
  { text: 'PE 대시보드', path: '/pe-workspace', highlight: true }, // 메인 대시보드
  { text: '진행 상황 보고', path: '/pe-workspace/reports', highlight: false }, // 업무 관리와 주간 보고서 통합
];

  // [advice from AI] 운영센터 하위 메뉴 (7단계 프로젝트 생명주기 기반 재구성)
// [advice from AI] 7단계 프로젝트 생명주기에 맞춘 운영센터 메뉴 구조 (프로젝트 워크플로우는 Executive/PO 메뉴로 이동)
const operationsSubMenus = [
  // === 📊 운영 현황 ===
  { text: '📊 운영 대시보드', path: '/operations', highlight: true, description: '배포 요청 접수 및 전체 운영 현황' },
  
  // === ⚙️ 사전 설정 관리 (한 번 설정) ===
  { text: '⚙️ CI/CD 서버 관리', path: '/operations/cicd-management', highlight: true, description: 'Jenkins, Nexus, Argo CD 서버 등록 및 관리' },
  { text: '📋 파이프라인 템플릿', path: '/operations/pipeline-templates', highlight: true, description: '재사용 가능한 빌드/배포 템플릿 관리' },
  
  // === 🚀 배포 실행 (요청 기반 자동 진행) ===
  { text: '🚀 통합 배포 실행 센터', path: '/operations/deployment-center', highlight: true, description: '배포 요청 → 자동 5단계 진행 → 완료 (원스톱)' },
  
  // === 📊 모니터링 & 관리 ===
  { text: '📊 성능 모니터링', path: '/operations/monitoring', highlight: true, description: '배포된 서비스 실시간 성능 추적' },
  { text: '🔍 이슈 관리', path: '/operations/issues', highlight: false, description: '빌드/배포 실패 이슈 관리 및 PE 할당' }
];

// [advice from AI] 시스템 관리 하위 메뉴
const adminSubMenus = [
  { text: '대시보드', path: '/admin' },
  { text: '회원 리스트', path: '/admin/members' },
  { text: '권한 설정', path: '/admin/permissions', hasSubMenu: true },
  { text: '시스템 설정', path: '/admin/settings' },
  { text: '보안 설정', path: '/admin/security' },
  { text: 'API 키 관리', path: '/admin/api-keys' },
  { text: '알림 설정', path: '/admin/notifications' },
  { text: '로그 관리', path: '/admin/logs' },
  { text: '백업 및 복원', path: '/admin/backup' },
  { text: '분석', path: '/admin/analytics' },
];

// [advice from AI] 권한 설정 하위 메뉴
const permissionsSubMenus = [
  { text: '사용자 관리', path: '/admin/permissions/users' },
  { text: '그룹 관리', path: '/admin/permissions/groups' },
  { text: '역할 배정', path: '/admin/permissions/roles' },
  { text: '권한 매트릭스', path: '/admin/permissions/matrix' }
];


interface BackstageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const BackstageLayout: React.FC<BackstageLayoutProps> = ({ 
  children, 
  title = "Timbel Project Management Solution" 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [executiveOpen, setExecutiveOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [peWorkspaceOpen, setPeWorkspaceOpen] = useState(false);
  const [poDashboardOpen, setPoDashboardOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
// [advice from AI] toolsOpen 상태 제거 (운영센터로 통합됨)
  const { user, token } = useJwtAuthStore();
  
  // [advice from AI] 메시지 센터 제거로 알림 관련 상태 불필요

  // [advice from AI] API URL 생성 함수
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      } else {
        return `http://${hostname}:3001`;
      }
    }
    return 'http://localhost:3001';
  };

  // [advice from AI] 메시지 센터 제거로 알림 관련 함수들 불필요

  // [advice from AI] 메시지 센터 제거로 알림 로드 useEffect 불필요

  // [advice from AI] 역할별 대시보드 자동 리다이렉트 - 비활성화 (홈 화면을 통합 모니터링으로 설정)
  // useEffect(() => {
  //   if (user && location.pathname === '/') {
  //     const roleDashboardMap: { [key: string]: string } = {
  //       'admin': '/executive',        // admin도 최고 관리자 대시보드
  //       'executive': '/executive',
  //       'po': '/po-dashboard',
  //       'pe': '/pe-workspace',
  //       'qa': '/qa-center',
  //       'operations': '/operations'
  //     };

  //     const dashboardPath = roleDashboardMap[user.roleType || ''];
  //     if (dashboardPath) {
  //       navigate(dashboardPath, { replace: true });
  //     }
  //   }
  // }, [user, location.pathname, navigate]);

  // [advice from AI] 권한별 메뉴 접근 매핑 테이블
  const menuAccessMap: { [key: string]: { roles: string[]; level: number; description: string } } = {
    '/executive': { 
      roles: ['admin', 'executive'], 
      level: 0, 
      description: '최고 관리자 전용 기능입니다.' 
    },
    '/executive/workflow': { 
      roles: ['admin', 'executive'], 
      level: 0, 
      description: '프로젝트 워크플로우는 최고 관리자 전용 기능입니다.' 
    },
    '/executive/strategic-analysis': { 
      roles: ['admin', 'executive'], 
      level: 0, 
      description: '전략 분석은 최고 관리자 전용 기능입니다.' 
    },
    '/executive/performance-reports': { 
      roles: ['admin', 'executive'], 
      level: 0, 
      description: '성과 리포트는 최고 관리자 전용 기능입니다.' 
    },
    '/po/workflow': { 
      roles: ['admin', 'executive', 'po'], 
      level: 1, 
      description: '프로젝트 워크플로우는 PO가 확인할 수 있습니다.' 
    },
    '/po-dashboard': { 
      roles: ['admin', 'executive', 'po'], 
      level: 1, 
      description: 'PO(프로젝트 오너) 전용 기능입니다.' 
    },
    '/pe-workspace': { 
      roles: ['admin', 'executive', 'po', 'pe'], 
      level: 2, 
      description: 'PE(프로젝트 엔지니어) 전용 기능입니다.' 
    },
    '/qc-dashboard': { 
      roles: ['admin', 'executive', 'qa'], 
      level: 3, 
      description: 'QC/QA 전용 기능입니다.' 
    },
    '/operations': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '운영팀 전용 기능입니다.' 
    },
    '/operations/cicd': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: 'CI/CD 파이프라인 관리는 운영팀 전용 기능입니다.' 
    },
    '/operations/infrastructure': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '인프라 관리는 운영팀 전용 기능입니다.' 
    },
    '/operations/multi-tenant': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '멀티테넌트 관리는 운영팀 전용 기능입니다.' 
    },
    '/operations/auto-deploy': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '자동배포 관리는 운영팀 전용 기능입니다.' 
    },
    '/operations/deployment': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '배포 관리는 운영팀 전용 기능입니다.' 
    },
    '/operations/hardware-calc': { 
      roles: ['admin', 'executive', 'operations', 'po', 'pe'], 
      level: 3, 
      description: '하드웨어 계산기는 프로젝트 관련 역할이 사용할 수 있습니다.' 
    },
    '/operations/service-config': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '서비스 설정은 운영팀 전용 기능입니다.' 
    },
    // === 운영 현황 및 전체 관리 ===
    '/operations/workflow': { 
      roles: ['admin', 'executive', 'po'], 
      level: 2, 
      description: '프로젝트 워크플로우는 최고운영자와 PO가 확인할 수 있습니다.' 
    },
    
    // === 6단계 → 7단계: 배포 요청 접수 및 처리 ===
    '/operations/deployment-requests': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '배포 요청 접수는 운영팀 전용 기능입니다.' 
    },
    '/operations/deployment-approval': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '배포 승인 처리는 운영팀 전용 기능입니다.' 
    },
    '/operations/cicd-servers': { 
      roles: ['admin', 'operations'], 
      level: 3, 
      description: 'CI/CD 서버 관리는 관리자 및 운영팀 전용 기능입니다.' 
    },
    
    // === 7단계: 실제 배포 실행 프로세스 ===
    '/operations/repositories': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '레포지토리 준비는 운영팀 전용 기능입니다.' 
    },
    '/operations/build-pipeline': { 
      roles: ['admin', 'executive', 'operations', 'pe'], 
      level: 3, 
      description: '빌드 파이프라인은 운영팀과 PE가 사용할 수 있습니다.' 
    },
    '/operations/image-registry': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '이미지 레지스트리는 운영팀 전용 기능입니다.' 
    },
    '/operations/deployment-execution': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '배포 실행은 운영팀 전용 기능입니다.' 
    },
    
    // === 배포 후 운영 및 모니터링 ===
    '/operations/environments': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '환경별 운영은 운영팀 전용 기능입니다.' 
    },
    '/operations/monitoring': { 
      roles: ['admin', 'executive', 'operations', 'pe'], 
      level: 2, 
      description: '시스템 모니터링은 운영팀과 PE가 확인할 수 있습니다.' 
    },
    '/operations/incident-response': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '장애 대응은 운영팀 전용 기능입니다.' 
    },
    '/operations/build-issues': { 
      roles: ['admin', 'executive', 'operations', 'pe'], 
      level: 3, 
      description: '빌드 이슈 관리는 운영팀과 PE가 사용할 수 있습니다.' 
    },
    '/catalog/knowledge/design': { 
      roles: ['admin', 'executive', 'designer', 'pe'], 
      level: 2, 
      description: '디자인 자산 등록은 디자이너, PE, 관리자만 가능합니다.' 
    },
    '/catalog/knowledge/code': { 
      roles: ['admin', 'executive', 'pe'], 
      level: 2, 
      description: '코드/컴포넌트 등록은 PE, 관리자만 가능합니다.' 
    },
    '/catalog/knowledge/docs': { 
      roles: ['admin', 'executive', 'po', 'pe', 'qa', 'designer', 'operations'], 
      level: 5, 
      description: '문서/가이드 등록은 모든 사용자가 가능합니다.' 
    },
    '/catalog/knowledge/approval': { 
      roles: ['admin', 'executive', 'po', 'qa'], 
      level: 3, 
      description: '승인 워크플로우는 PO, QA, 관리자만 접근 가능합니다.' 
    },
    '/catalog/knowledge/diagrams': { 
      roles: ['admin', 'executive', 'pe', 'qa'], 
      level: 3, 
      description: '다이어그램 관리는 PE, QA, 관리자만 가능합니다.' 
    }
  };

  // [advice from AI] 메뉴 접근 권한 확인 (활성화 여부)
  const canAccess = (menuPath: string) => {
    if (!user) return false;
    
    const menuInfo = menuAccessMap[menuPath];
    if (!menuInfo) return true; // 매핑되지 않은 메뉴는 기본적으로 접근 가능
    
    const hasAccess = menuInfo.roles.includes(user.roleType || '');
    
    // [advice from AI] PO 대시보드 접근 시 디버깅 로그
    if (menuPath === '/po-dashboard') {
      console.log('🔍 PO 대시보드 접근 권한 확인:', {
        menuPath,
        userRoleType: user.roleType,
        allowedRoles: menuInfo.roles,
        hasAccess,
        user: user
      });
    }
    
    return hasAccess;
  };

  // [advice from AI] 메뉴 접근 정보 가져오기
  const getMenuAccessInfo = (menuPath: string) => {
    return menuAccessMap[menuPath] || { roles: [], level: 999, description: '' };
  };

  // [advice from AI] 모바일에서 사이드바 토글
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // [advice from AI] 네비게이션 아이템 클릭 핸들러
  const handleNavigation = (path: string) => {
    console.log('🔗 네비게이션 시도:', path, '현재 경로:', location.pathname);
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // [advice from AI] 경로 변경 감지 디버깅
  useEffect(() => {
    console.log('📍 현재 경로 변경됨:', location.pathname);
  }, [location.pathname]);

  // [advice from AI] 백스테이지IO 스타일의 사이드바 컴포넌트
  const drawer = (
    <Box>
      {/* [advice from AI] 백스테이지IO 스타일의 로고 영역 */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600,
            color: theme.palette.primary.main,
            fontSize: '1.1rem'
          }}
        >
          Timbel
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
            mt: 0.5
          }}
        >
          Project Management Solution
        </Typography>
      </Box>

      {/* [advice from AI] 메인 네비게이션 메뉴 */}
      <List sx={{ pt: 1 }}>
        {navigationItems.map((item) => {
          // [advice from AI] 메인 메뉴는 모든 사용자가 접근 가능하도록 설정
          const hasAccess = true; // 메인 메뉴는 기본적으로 모든 사용자 접근 가능
          
          // [advice from AI] Phase 1: 지식자원 관리는 하위 메뉴가 있음
          if (item.path === '/knowledge' && item.hasSubMenu) {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      if (knowledgeOpen) {
                        setKnowledgeOpen(false);
                      } else {
                        setKnowledgeOpen(true);
                        handleNavigation(item.path);
                      }
                    }}
                    selected={location.pathname === item.path || location.pathname.startsWith('/knowledge/')}
                    sx={{
                      mx: 1,
                      borderRadius: 1,
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.primary.light + '20',
                        '& .MuiListItemText-primary': {
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                        },
                      },
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: location.pathname === item.path || location.pathname.startsWith('/knowledge/') ? 600 : 400,
                      }}
                      sx={{ pl: 1 }}
                    />
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {knowledgeOpen ? '−' : '+'}
                    </Box>
                  </ListItemButton>
                </ListItem>
                <Collapse in={knowledgeOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {knowledgeSubMenus.map((subItem) => {
                      const hasSubAccess = canAccess(subItem.path);
                      const subAccessInfo = getMenuAccessInfo(subItem.path);
                      
                      return (
                        <ListItem key={subItem.text} disablePadding>
                          <Tooltip 
                            title={hasSubAccess ? '' : subAccessInfo.description}
                            placement="right"
                            arrow
                            componentsProps={{
                              tooltip: { sx: { display: hasSubAccess ? 'none' : 'block' } }
                            }}
                          >
                            <Box component="span" sx={{ width: '100%' }}>
                              <ListItemButton
                                onClick={() => hasSubAccess && handleNavigation(subItem.path)}
                                selected={hasSubAccess && location.pathname === subItem.path}
                                disabled={!hasSubAccess}
                                sx={{
                                  mx: 1,
                                  ml: 3,
                                  borderRadius: 1,
                                  backgroundColor: 'transparent',
                                  opacity: hasSubAccess ? 1 : 0.5,
                                  '&.Mui-selected': {
                                    backgroundColor: theme.palette.primary.light + '20',
                                    '& .MuiListItemText-primary': {
                                      color: theme.palette.primary.main,
                                      fontWeight: 600,
                                    },
                                  },
                                  '&:hover': {
                                    backgroundColor: hasSubAccess ? theme.palette.action.hover : 'transparent',
                                  },
                                  '&.Mui-disabled': {
                                    '& .MuiListItemText-primary': {
                                      color: theme.palette.text.disabled,
                                    },
                                  },
                                }}
                              >
                                <ListItemText 
                                  primary={subItem.text}
                                  primaryTypographyProps={{
                                    fontSize: '0.8rem',
                                    fontWeight: location.pathname === subItem.path ? 600 : 400,
                                  }}
                                  sx={{ pl: 1 }}
                                />
                              </ListItemButton>
                            </Box>
                          </Tooltip>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
                
                {/* [advice from AI] 지식 등록 및 관리 하위 메뉴 - 제거됨 (독립 메뉴로 이동) */}
              </React.Fragment>
            );
          }


          
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => hasAccess && handleNavigation(item.path)}
                selected={hasAccess && location.pathname === item.path}
                disabled={!hasAccess}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  opacity: hasAccess ? 1 : 0.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.light + '20',
                    '& .MuiListItemText-primary': {
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    },
                  },
                  '&:hover': {
                    backgroundColor: hasAccess ? theme.palette.action.hover : 'transparent',
                  },
                  '&.Mui-disabled': {
                    '& .MuiListItemText-primary': {
                      color: theme.palette.text.disabled,
                    },
                  },
                }}
              >
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: location.pathname === item.path ? 600 : 400,
                }}
                sx={{ pl: 1 }}
              />
            </ListItemButton>
          </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* [advice from AI] 업무 영역 메뉴 */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography 
          variant="overline" 
          sx={{ 
            fontSize: '0.7rem',
            fontWeight: 600,
            color: theme.palette.text.secondary,
            letterSpacing: '0.5px'
          }}
        >
          업무 영역
        </Typography>
      </Box>
      
      <List>
        {workAreas.map((item) => {
          // [advice from AI] 메뉴 접근 권한 확인
          const hasAccess = canAccess(item.path);
          const accessInfo = getMenuAccessInfo(item.path);
          
          // [advice from AI] Executive 대시보드는 단일 메뉴로 변경
          if (item.path === '/executive') {
            return (
              <ListItem key={item.text} disablePadding>
                <Tooltip 
                  title={hasAccess ? '' : accessInfo.description}
                  placement="right"
                  arrow
                >
                  <span>
                    <ListItemButton
                      component={Link}
                      to={item.path}
                      onClick={() => {
                        if (!hasAccess) return;
                        // [advice from AI] 다른 메뉴들 모두 닫기
                        setPoDashboardOpen(false);
                        setPeWorkspaceOpen(false);
                        setOperationsOpen(false);
                        setExecutiveOpen(false);
                      }}
                      sx={{
                        minHeight: 48,
                        justifyContent: 'flex-start',
                        px: 2.5,
                        opacity: hasAccess ? 1 : 0.5,
                        cursor: hasAccess ? 'pointer' : 'not-allowed',
                        backgroundColor: location.pathname === item.path ? 'action.selected' : 'transparent',
                        '&:hover': {
                          backgroundColor: hasAccess ? 'action.hover' : 'transparent'
                        }
                      }}
                      disabled={!hasAccess}
                    >
                      <ListItemIcon sx={{ minWidth: 24, mr: 1 }}>
                        <span style={{ fontSize: '12px' }}>{item.icon}</span>
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text} 
                        sx={{ 
                          '& .MuiListItemText-primary': {
                            fontSize: '0.875rem',
                            fontWeight: 500
                          }
                        }}
                      />
                    </ListItemButton>
                  </span>
                </Tooltip>
              </ListItem>
            );
          }

          // [advice from AI] PO 대시보드는 하위 메뉴가 있음
          if (item.path === '/po-dashboard') {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={hasAccess ? '' : accessInfo.description}
                    placement="right"
                    arrow
                  >
                    <span>
                      <ListItemButton
                        onClick={() => {
                          if (!hasAccess) return;
                          // [advice from AI] 다른 메뉴들 모두 닫기
                          setPeWorkspaceOpen(false);
                          setOperationsOpen(false);
                          
                          if (poDashboardOpen) {
                            setPoDashboardOpen(false);
                          } else {
                            setPoDashboardOpen(true);
                            handleNavigation(item.path);
                          }
                        }}
                        selected={hasAccess && (location.pathname === item.path || location.pathname.startsWith('/po/'))}
                        disabled={!hasAccess}
                        sx={{
                          mx: 1,
                          borderRadius: 1,
                          backgroundColor: hasAccess && (location.pathname === item.path || location.pathname.startsWith('/po/')) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                          '&:hover': {
                            backgroundColor: hasAccess ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                          },
                          '&.Mui-disabled': {
                            opacity: 0.6,
                          },
                        }}
                      >
                        <ListItemText 
                          primary={item.text}
                          sx={{
                            pl: 1,
                            '& .MuiListItemText-primary': {
                              fontSize: '0.875rem',
                              fontWeight: location.pathname === item.path || location.pathname.startsWith('/po/') ? 600 : 400,
                            }
                          }}
                    />
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {poDashboardOpen ? '−' : '+'}
                    </Box>
                      </ListItemButton>
                    </span>
                  </Tooltip>
                </ListItem>
                <Collapse in={poDashboardOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {poDashboardSubMenus.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <Tooltip 
                          title={hasAccess ? '' : accessInfo.description}
                          placement="right"
                          arrow
                        >
                          <span>
                            <ListItemButton
                              onClick={() => hasAccess && handleNavigation(subItem.path)}
                              selected={hasAccess && location.pathname === subItem.path}
                              disabled={!hasAccess}
                              sx={{
                                pl: 4,
                                mx: 1,
                                borderRadius: 1,
                                backgroundColor: hasAccess && location.pathname === subItem.path ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                                '&:hover': {
                                  backgroundColor: hasAccess ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                                },
                                '&.Mui-disabled': {
                                  opacity: 0.6,
                                },
                              }}
                            >
                              <ListItemText 
                                primary={subItem.text}
                                sx={{
                                  '& .MuiListItemText-primary': {
                                    fontSize: '0.875rem',
                                    fontWeight: location.pathname === subItem.path ? 600 : 400,
                                    color: subItem.highlight ? 'primary.main' : 'text.primary'
                                  }
                                }}
                              />
                              {subItem.highlight && (
                                <Chip 
                                  label="NEW" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ 
                                    height: 20, 
                                    fontSize: '0.625rem',
                                    '& .MuiChip-label': {
                                      px: 1
                                    }
                                  }} 
                                />
                              )}
                            </ListItemButton>
                          </span>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }
          
          // [advice from AI] PE 대시보드는 하위 메뉴가 있음
          if (item.path === '/pe-workspace') {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={hasAccess ? '' : accessInfo.description}
                    placement="right"
                    arrow
                  >
                    <span>
                      <ListItemButton
                        onClick={() => {
                          if (!hasAccess) return; // 권한이 없으면 클릭 무시
                          // [advice from AI] 다른 메뉴들 모두 닫기
                          setPoDashboardOpen(false);
                          setOperationsOpen(false);
                          
                          if (peWorkspaceOpen) {
                            setPeWorkspaceOpen(false);
                          } else {
                            setPeWorkspaceOpen(true);
                            handleNavigation(item.path);
                          }
                        }}
                        selected={hasAccess && (location.pathname === item.path || location.pathname.startsWith('/pe-workspace/'))}
                        disabled={!hasAccess}
                        sx={{
                          mx: 1,
                          borderRadius: 1,
                          opacity: hasAccess ? 1 : 0.5,
                          '&.Mui-selected': {
                            backgroundColor: theme.palette.primary.light + '20',
                            '& .MuiListItemText-primary': {
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                            },
                          },
                          '&:hover': {
                            backgroundColor: hasAccess ? theme.palette.action.hover : 'transparent',
                          },
                          '&.Mui-disabled': {
                            '& .MuiListItemText-primary': {
                              color: theme.palette.text.disabled,
                            },
                          },
                        }}
                      >
                        <ListItemText 
                          primary={item.text}
                          sx={{
                            pl: 1,
                            '& .MuiListItemText-primary': {
                              fontSize: '0.875rem',
                              fontWeight: location.pathname === item.path || location.pathname.startsWith('/pe-workspace/') ? 600 : 400,
                            }
                          }}
                    />
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {peWorkspaceOpen ? '−' : '+'}
                    </Box>
                      </ListItemButton>
                    </span>
                  </Tooltip>
                </ListItem>
                <Collapse in={peWorkspaceOpen && hasAccess} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {peWorkspaceSubMenus.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <Tooltip 
                          title={hasAccess ? '' : accessInfo.description}
                          placement="right"
                          arrow
                        >
                          <span>
                            <ListItemButton
                              onClick={() => hasAccess && handleNavigation(subItem.path)}
                              selected={hasAccess && location.pathname === subItem.path}
                              disabled={!hasAccess}
                              sx={{
                                mx: 1,
                                ml: 3,
                                borderRadius: 1,
                                backgroundColor: 'transparent',
                                opacity: hasAccess ? 1 : 0.5,
                                '&.Mui-selected': {
                                  backgroundColor: theme.palette.primary.light + '20',
                                  '& .MuiListItemText-primary': {
                                    color: theme.palette.primary.main,
                                    fontWeight: 600,
                                  },
                                },
                                '&:hover': {
                                  backgroundColor: hasAccess ? theme.palette.action.hover : 'transparent',
                                },
                                '&.Mui-disabled': {
                                  '& .MuiListItemText-primary': {
                                    color: theme.palette.text.disabled,
                                  },
                                },
                              }}
                            >
                              <ListItemText 
                                primary={subItem.text}
                                primaryTypographyProps={{
                                  fontSize: '0.8rem',
                                  fontWeight: location.pathname === subItem.path ? 600 : 400,
                                }}
                                sx={{ pl: 1 }}
                              />
                            </ListItemButton>
                          </span>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }
          
          // [advice from AI] 운영센터는 하위 메뉴가 있음
          if (item.path === '/operations') {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={hasAccess ? '' : accessInfo.description}
                    placement="right"
                    arrow
                  >
                    <span>
                  <ListItemButton
                    onClick={() => {
                          if (!hasAccess) return; // 권한이 없으면 클릭 무시
                          // [advice from AI] 다른 메뉴들 모두 닫기
                          setPoDashboardOpen(false);
                          setPeWorkspaceOpen(false);
                          
                      if (operationsOpen) {
                        setOperationsOpen(false);
                      } else {
                        setOperationsOpen(true);
                        handleNavigation(item.path);
                      }
                    }}
                        selected={hasAccess && (location.pathname === item.path || location.pathname.startsWith('/operations/'))}
                        disabled={!hasAccess}
                    sx={{
                      mx: 1,
                      borderRadius: 1,
                          opacity: hasAccess ? 1 : 0.5,
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.primary.light + '20',
                        '& .MuiListItemText-primary': {
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                        },
                      },
                      '&:hover': {
                            backgroundColor: hasAccess ? theme.palette.action.hover : 'transparent',
                          },
                          '&.Mui-disabled': {
                            '& .MuiListItemText-primary': {
                              color: theme.palette.text.disabled,
                            },
                      },
                    }}
                  >
                    <ListItemText 
                      primary={item.text}
                      sx={{
                        pl: 1,
                        '& .MuiListItemText-primary': {
                          fontSize: '0.875rem',
                          fontWeight: location.pathname === item.path || location.pathname.startsWith('/operations/') ? 600 : 400,
                        }
                      }}
                    />
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {operationsOpen ? '−' : '+'}
                    </Box>
                  </ListItemButton>
                    </span>
                  </Tooltip>
                </ListItem>
                <Collapse in={operationsOpen && hasAccess} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {operationsSubMenus.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <Tooltip 
                          title={hasAccess ? '' : accessInfo.description}
                          placement="right"
                          arrow
                        >
                          <span>
                        <ListItemButton
                              onClick={() => hasAccess && handleNavigation(subItem.path)}
                              selected={hasAccess && (
                            location.pathname === subItem.path || 
                            (subItem.path === '/operations/tenant-center' && (
                              location.pathname.startsWith('/operations/tenant-center') ||
                              location.pathname === '/operations/deployment-wizard' ||
                              location.pathname === '/operations/multi-tenant' ||
                              location.pathname === '/operations/tenant-mgmt' ||
                              location.pathname === '/operations/hardware-calc'
                            )) ||
                            (subItem.path === '/operations/cicd-services' && (
                              location.pathname.startsWith('/operations/cicd-services') ||
                              location.pathname === '/operations/service-config' ||
                              location.pathname === '/operations/auto-deploy' ||
                              location.pathname === '/operations/cicd'
                            )) ||
                            (subItem.path === '/operations/monitoring' && location.pathname.startsWith('/operations/monitoring')) ||
                            (subItem.path === '/operations/infrastructure' && location.pathname.startsWith('/operations/infrastructure'))
                              )}
                              disabled={!hasAccess}
                          sx={{
                            mx: 1,
                            ml: 3,
                            borderRadius: 1,
                            backgroundColor: 'transparent',
                                opacity: hasAccess ? 1 : 0.5,
                            '&.Mui-selected': {
                              backgroundColor: theme.palette.primary.light + '20',
                              '& .MuiListItemText-primary': {
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                              },
                            },
                            '&:hover': {
                                  backgroundColor: hasAccess ? 
                                    ((subItem as any).highlight ? '#e3f2fd' : theme.palette.action.hover) : 
                                    'transparent',
                              '& .MuiListItemText-primary': {
                                    color: hasAccess && (subItem as any).highlight ? '#1976d2' : 'inherit',
                                    fontWeight: hasAccess && (subItem as any).highlight ? 600 : 'inherit',
                              },
                            },
                                '&.Mui-disabled': {
                              '& .MuiListItemText-primary': {
                                    color: theme.palette.text.disabled,
                              },
                            },
                          }}
                        >
                          <ListItemText 
                            primary={subItem.text}
                            primaryTypographyProps={{
                              fontSize: '0.8rem',
                              fontWeight: location.pathname === subItem.path ? 600 : 400,
                            }}
                            sx={{ pl: 1 }}
                          />
                        </ListItemButton>
                          </span>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem key={item.text} disablePadding>
              <Tooltip 
                title={hasAccess ? '' : accessInfo.description}
                placement="right"
                arrow
              >
                <span>
              <ListItemButton
                    onClick={() => hasAccess && handleNavigation(item.path)}
                    selected={hasAccess && location.pathname === item.path}
                    disabled={!hasAccess}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                      opacity: hasAccess ? 1 : 0.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.light + '20',
                    '& .MuiListItemText-primary': {
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    },
                  },
                  '&:hover': {
                        backgroundColor: hasAccess ? theme.palette.action.hover : 'transparent',
                      },
                      '&.Mui-disabled': {
                        '& .MuiListItemText-primary': {
                          color: theme.palette.text.disabled,
                        },
                  },
                }}
              >
                <ListItemText 
                  primary={item.text}
                  sx={{
                    pl: 1,
                    '& .MuiListItemText-primary': {
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === item.path ? 600 : 400,
                    }
                  }}
                />
              </ListItemButton>
                </span>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* [advice from AI] 관리 설정 메뉴 - 지식 등록 관리와 시스템 설정 통합 */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography 
          variant="overline" 
          sx={{ 
            fontSize: '0.7rem',
            fontWeight: 600,
            color: theme.palette.text.secondary,
            letterSpacing: '0.5px'
          }}
        >
          관리 설정
        </Typography>
      </Box>
      
      <List>
        {/* [advice from AI] 승인 관리 메뉴 (관리자 전용) */}
        {(user?.roleType === 'admin' || user?.roleType === 'executive') && (
          <>
            <ListItem disablePadding sx={{ mt: 1 }}>
              <ListItemButton
                onClick={() => setApprovalOpen(!approvalOpen)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.warning.light + '20',
                    '& .MuiListItemText-primary': {
                      color: theme.palette.warning.main,
                      fontWeight: 600,
                    },
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText 
                  primary="승인 관리"
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: location.pathname.startsWith('/admin/approvals') ? 600 : 400,
                  }}
                />
                <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {approvalOpen ? '−' : '+'}
                </Box>
              </ListItemButton>
            </ListItem>
            <Collapse in={approvalOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {adminApprovalSubMenus.map((subItem) => (
                  <ListItem key={subItem.path} disablePadding>
                    <Tooltip
                      title={`승인 관리: ${subItem.text}`}
                      placement="right"
                      arrow
                    >
                      <span style={{ width: '100%' }}>
                        <ListItemButton
                          onClick={() => navigate(subItem.path)}
                          selected={location.pathname === subItem.path}
                          sx={{
                            pl: 4,
                            mx: 1,
                            borderRadius: 1,
                            '&.Mui-selected': {
                              backgroundColor: theme.palette.warning.light + '20',
                              '& .MuiListItemText-primary': {
                                color: theme.palette.warning.main,
                                fontWeight: 600,
                              },
                            },
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <ListItemText 
                            primary={subItem.text}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: location.pathname === subItem.path ? 600 : 400,
                            }}
                            sx={{ pl: 1 }}
                          />
                          {(subItem as any).badge && (
                            <Chip
                              label={(subItem as any).badge}
                              size="small"
                              color="warning"
                              sx={{
                                height: '16px',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                mr: 1,
                                '& .MuiChip-label': {
                                  px: 0.5
                                }
                              }}
                            />
                          )}
                        </ListItemButton>
                      </span>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}

        {/* [advice from AI] 시스템 관리 메뉴 - 지식 등록 관리와 통합 */}
        <ListItem disablePadding sx={{ mt: 1 }}>
          <ListItemButton
            onClick={() => setAdminOpen(!adminOpen)}
            sx={{
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.light + '20',
                '& .MuiListItemText-primary': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                },
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemText 
              primary="시스템 관리"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: location.pathname === '/admin' || location.pathname.startsWith('/admin/') ? 600 : 400,
              }}
            />
            <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {adminOpen ? '−' : '+'}
            </Box>
          </ListItemButton>
        </ListItem>
        <Collapse in={adminOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {adminSubMenus.map((subItem) => {
              const hasSubAccess = canAccess(subItem.path);
              const subAccessInfo = getMenuAccessInfo(subItem.path);
              
              return (
                <ListItem key={subItem.text} disablePadding>
                  <Tooltip 
                    title={hasSubAccess ? '' : `접근 권한 없음: ${subAccessInfo}`}
                    placement="right"
                    arrow
                  >
                    <span style={{ width: '100%' }}>
                      <ListItemButton
                        onClick={() => hasSubAccess && handleNavigation(subItem.path)}
                        selected={hasSubAccess && location.pathname === subItem.path}
                        disabled={!hasSubAccess}
                        sx={{
                          pl: 4,
                          borderRadius: 1,
                          opacity: hasSubAccess ? 1 : 0.5,
                          '&.Mui-selected': {
                            backgroundColor: theme.palette.primary.light + '20',
                            '& .MuiListItemText-primary': {
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                            },
                          },
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <ListItemText 
                          primary={subItem.text}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: hasSubAccess && location.pathname === subItem.path ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                      </ListItemButton>
                    </span>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        </Collapse>
      </List>

    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* [advice from AI] 백스테이지IO 스타일의 AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: '#ffffff',
          color: theme.palette.text.primary,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          <Button
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            메뉴
          </Button>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          
          {/* [advice from AI] 메시지 센터 제거됨 */}
          
          {/* [advice from AI] 사용자 정보 표시 */}
          <UserInfo />
        </Toolbar>
      </AppBar>

      {/* [advice from AI] 백스테이지IO 스타일의 사이드바 */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* 모바일 사이드바 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // 모바일 성능 최적화
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundColor: '#ffffff',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* 데스크톱 사이드바 */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundColor: '#ffffff',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* [advice from AI] 메인 컨텐츠 영역 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px', // AppBar 높이만큼 마진
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>

    </Box>
  );
};

export default BackstageLayout;
