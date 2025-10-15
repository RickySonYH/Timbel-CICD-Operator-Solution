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

// [advice from AI] 통합된 네비게이션 메뉴 (승인 관리 제거)
const navigationItems = [
  { text: '홈', path: '/' },
  { text: '최고 관리자', path: '/executive', hasSubMenu: false },
  { text: '지식자원 카탈로그', path: '/knowledge', hasSubMenu: true },
  { text: '운영 센터', path: '/operations', hasSubMenu: true },
  { text: '시스템 관리', path: '/admin', hasSubMenu: true },
];

// [advice from AI] 지식자원 카탈로그 하위 메뉴 (괄호 제거, 순수한 이름만)
const knowledgeSubMenus = [
  { text: '대시보드', path: '/knowledge/dashboard' },
  { text: '도메인', path: '/knowledge/domains' },
  { text: '프로젝트', path: '/knowledge/projects', badge: 'NEW' },
  { text: '시스템', path: '/knowledge/systems', hasAutoRegistration: true },
  { text: '코드 컴포넌트', path: '/knowledge/code' },
  { text: '디자인 자산', path: '/knowledge/design' },
  { text: '문서/가이드', path: '/knowledge/docs' }
];

// [advice from AI] 승인 관리 메뉴 제거 (지식자원에서 직접 생성 구조로 변경)


// [advice from AI] 업무 영역 메뉴 삭제됨 - 지식자원 카탈로그로 통합

// [advice from AI] PO, PE 관련 하위 메뉴 삭제됨

// [advice from AI] 운영센터 하위 메뉴 (재구성: 프로세스 기반)
const operationsSubMenus = [
  // === 운영 센터 메인 ===
  { text: '운영 센터', path: '/operations', highlight: true, description: '전체 운영 현황 대시보드' },
  
  // === 배포 관리 ===
  { text: '배포 요청 처리', path: '/operations/deployment-requests', highlight: true, description: '관리자 요청 승인 및 5단계 자동 진행' },
  { text: '레포지토리 직접 배포', path: '/operations/repository-deploy', highlight: true, description: 'GitHub URL로 즉시 배포 (운영팀 전용)' },
  { text: '배포 히스토리', path: '/operations/deployment-history', highlight: false, description: '모든 배포 기록 및 롤백 관리' },
  
  // === CI/CD 파이프라인 ===
  { text: '파이프라인 현황', path: '/operations/pipeline-status', highlight: true, description: 'Jenkins + Nexus + Argo CD 통합 대시보드' },
  { text: '파이프라인 구성', path: '/operations/pipeline-config', highlight: false, description: 'Job 템플릿 및 빌드 설정' },
  { text: '인프라 서버 관리', path: '/operations/infrastructure', highlight: false, description: 'CI/CD 서버 설정 및 모니터링' },
  
  // === 모니터링 & 이슈 ===
  { text: '종합 모니터링', path: '/operations/comprehensive-monitoring', highlight: true, description: 'Prometheus + SLA + 실시간 알림' },
  { text: '이슈 관리', path: '/operations/issues', highlight: false, description: '빌드/배포/성능 이슈 추적' },
  
  // === 클러스터 관리 ===
  { text: '클러스터 대시보드', path: '/operations/cluster-dashboard', highlight: true, description: '멀티 클러스터 현황 모니터링' },
  { text: '클러스터 관리', path: '/operations/cluster-management', highlight: false, description: 'Kubernetes 클러스터 등록 및 설정' },
  
  // === AI 지원 도구 ===
  { text: 'AI 하드웨어 계산기', path: '/operations/hardware-calculator', highlight: false, description: 'ECP-AI 리소스 자동 계산' }
];

// [advice from AI] 시스템 관리 하위 메뉴 (지식자원 카탈로그 하위로 이동)
const adminSubMenus = [
  { text: '대시보드', path: '/admin' },
  { text: '회원 리스트', path: '/admin/members' },
  { text: '권한 설정', path: '/admin/permissions', hasSubMenu: true },
  { text: '시스템 설정', path: '/admin/system-config', description: 'CI/CD, 클러스터, 보안 설정' },
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
  const [operationsOpen, setOperationsOpen] = useState(false);
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
    '/admin/approvals': {
      roles: ['admin', 'executive'],
      level: 0,
      description: '승인 관리는 관리자 전용 기능입니다.'
    },
    '/admin': {
      roles: ['admin', 'executive'],
      level: 0,
      description: '시스템 관리는 관리자 전용 기능입니다.'
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
    // [advice from AI] PO, PE, QA 관련 권한 매핑 삭제됨
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
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '하드웨어 계산기는 운영팀 전용 기능입니다.' 
    },
    '/operations/service-config': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '서비스 설정은 운영팀 전용 기능입니다.' 
    },
    // === 운영 현황 및 전체 관리 ===
    '/operations/workflow': { 
      roles: ['admin', 'executive'], 
      level: 2, 
      description: '프로젝트 워크플로우는 최고관리자 전용 기능입니다.' 
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
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '빌드 파이프라인은 운영팀 전용 기능입니다.' 
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
      roles: ['admin', 'executive', 'operations'], 
      level: 2, 
      description: '시스템 모니터링은 운영팀 전용 기능입니다.' 
    },
    '/operations/incident-response': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '장애 대응은 운영팀 전용 기능입니다.' 
    },
    '/operations/build-issues': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 3, 
      description: '빌드 이슈 관리는 운영팀 전용 기능입니다.' 
    },
    '/catalog/knowledge/design': { 
      roles: ['admin', 'executive', 'designer'], 
      level: 2, 
      description: '디자인 자산 등록은 디자이너, 관리자만 가능합니다.' 
    },
    '/catalog/knowledge/code': { 
      roles: ['admin', 'executive'], 
      level: 2, 
      description: '코드/컴포넌트 등록은 관리자만 가능합니다.' 
    },
    '/catalog/knowledge/docs': { 
      roles: ['admin', 'executive', 'designer', 'operations'], 
      level: 5, 
      description: '문서/가이드 등록은 모든 사용자가 가능합니다.' 
    },
    '/catalog/knowledge/approval': { 
      roles: ['admin', 'executive'], 
      level: 3, 
      description: '승인 워크플로우는 관리자만 접근 가능합니다.' 
    },
    '/catalog/knowledge/diagrams': { 
      roles: ['admin', 'executive'], 
      level: 3, 
      description: '다이어그램 관리는 관리자만 가능합니다.' 
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
          // [advice from AI] 메뉴 접근 권한 확인
          const hasAccess = item.path === '/' || item.path === '/knowledge' ? true : canAccess(item.path);
          const accessInfo = getMenuAccessInfo(item.path);
          
          // [advice from AI] 지식자원 카탈로그 하위 메뉴 처리
          if (item.path === '/knowledge' && item.hasSubMenu) {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={hasAccess ? '' : accessInfo.description}
                    placement="right"
                    arrow
                  >
                    <Box component="span" sx={{ width: '100%' }}>
                      <ListItemButton
                        onClick={() => {
                          if (!hasAccess) return;
                          if (knowledgeOpen) {
                            setKnowledgeOpen(false);
                          } else {
                            setKnowledgeOpen(true);
                            handleNavigation(item.path);
                          }
                        }}
                        selected={hasAccess && (location.pathname === item.path || location.pathname.startsWith('/knowledge/'))}
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
                            fontWeight: location.pathname === item.path || location.pathname.startsWith('/knowledge/') ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {knowledgeOpen ? '−' : '+'}
                        </Box>
                      </ListItemButton>
                    </Box>
                  </Tooltip>
                </ListItem>
                <Collapse in={knowledgeOpen && hasAccess} timeout="auto" unmountOnExit>
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
                                onClick={() => {
                                  if (!hasSubAccess) return;
                                  handleNavigation(subItem.path);
                                }}
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
                
              </React.Fragment>
            );
          }


          
          // [advice from AI] 최고관리자 메뉴 (단순 링크)
          if (item.path === '/executive') {
            return (
              <ListItem key={item.text} disablePadding>
                <Tooltip 
                  title={hasAccess ? '' : '접근 권한 없음'}
                  placement="right"
                  arrow
                >
                  <Box component="span" sx={{ width: '100%' }}>
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
                  </Box>
                </Tooltip>
              </ListItem>
            );
          }
          
          // [advice from AI] 운영센터 메뉴 (하위 메뉴 있음)
          if (item.path === '/operations' && item.hasSubMenu) {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={hasAccess ? '' : '접근 권한 없음'}
                    placement="right"
                    arrow
                  >
                    <Box component="span" sx={{ width: '100%' }}>
                      <ListItemButton
                        onClick={() => {
                          if (!hasAccess) return;
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
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: location.pathname === item.path || location.pathname.startsWith('/operations/') ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {operationsOpen ? '−' : '+'}
                        </Box>
                      </ListItemButton>
                    </Box>
                  </Tooltip>
                </ListItem>
                <Collapse in={operationsOpen && hasAccess} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {operationsSubMenus.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <Tooltip 
                          title={hasAccess ? '' : '접근 권한 없음'}
                          placement="right"
                          arrow
                        >
                          <Box component="span" sx={{ width: '100%' }}>
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
                          </Box>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }
          
          // [advice from AI] 승인관리 메뉴 (하위 메뉴 있음)
          if (item.path === '/admin/approvals' && item.hasSubMenu) {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={hasAccess ? '' : '접근 권한 없음'}
                    placement="right"
                    arrow
                  >
                    <Box component="span" sx={{ width: '100%' }}>
                      <ListItemButton
                        onClick={() => {
                          if (!hasAccess) return;
                          setApprovalOpen(!approvalOpen);
                        }}
                        selected={hasAccess && location.pathname.startsWith('/admin/approvals')}
                        disabled={!hasAccess}
                        sx={{
                          mx: 1,
                          borderRadius: 1,
                          opacity: hasAccess ? 1 : 0.5,
                          '&.Mui-selected': {
                            backgroundColor: theme.palette.warning.light + '20',
                            '& .MuiListItemText-primary': {
                              color: theme.palette.warning.main,
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
                            fontWeight: location.pathname.startsWith('/admin/approvals') ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {approvalOpen ? '−' : '+'}
                        </Box>
                      </ListItemButton>
                    </Box>
                  </Tooltip>
                </ListItem>
                <Collapse in={approvalOpen && hasAccess} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {adminApprovalSubMenus.map((subItem) => (
                      <ListItem key={subItem.path} disablePadding>
                        <Tooltip 
                          title={hasAccess ? '' : '접근 권한 없음'}
                          placement="right"
                          arrow
                        >
                          <Box component="span" sx={{ width: '100%' }}>
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
                                  backgroundColor: theme.palette.warning.light + '20',
                                  '& .MuiListItemText-primary': {
                                    color: theme.palette.warning.main,
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
                          </Box>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }
          
          // [advice from AI] 시스템관리 메뉴 (하위 메뉴 있음)
          if (item.path === '/admin' && item.hasSubMenu) {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={hasAccess ? '' : '접근 권한 없음'}
                    placement="right"
                    arrow
                  >
                    <Box component="span" sx={{ width: '100%' }}>
                      <ListItemButton
                        onClick={() => {
                          if (!hasAccess) return;
                          if (adminOpen) {
                            setAdminOpen(false);
                          } else {
                            setAdminOpen(true);
                            handleNavigation(item.path);
                          }
                        }}
                        selected={hasAccess && (location.pathname === item.path || location.pathname.startsWith('/admin/') && !location.pathname.startsWith('/admin/approvals'))}
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
                            fontWeight: (location.pathname === item.path || (location.pathname.startsWith('/admin/') && !location.pathname.startsWith('/admin/approvals'))) ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {adminOpen ? '−' : '+'}
                        </Box>
                      </ListItemButton>
                    </Box>
                  </Tooltip>
                </ListItem>
                <Collapse in={adminOpen && hasAccess} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {adminSubMenus.map((subItem) => {
                      const hasSubAccess = canAccess(subItem.path);
                      return (
                        <ListItem key={subItem.text} disablePadding>
                          <Tooltip 
                            title={hasSubAccess ? '' : '접근 권한 없음'}
                            placement="right"
                            arrow
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
              </React.Fragment>
            );
          }

          return (
            <ListItem key={item.text} disablePadding>
              <Tooltip 
                title={hasAccess ? '' : '접근 권한 없음'}
                placement="right"
                arrow
              >
                <Box component="span" sx={{ width: '100%' }}>
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
                </Box>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>


      {/* [advice from AI] 관리 설정 영역 삭제됨 - 지식자원 카탈로그로 통합 */}

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
