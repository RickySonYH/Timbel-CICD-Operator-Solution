// [advice from AI] 백스테이지IO 스타일의 메인 레이아웃 컴포넌트 (프로덕션 레벨 개선)
// 사이드바, 헤더, 메인 컨텐츠 영역을 포함한 전체 레이아웃 구조
// 접근성, 성능 최적화, 반응형 디자인, 키보드 네비게이션, 검색 기능 포함

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CircularProgress,
  Fade,
  Zoom,
  alpha,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
  Fab
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandLess,
  ExpandMore,
  ArrowUpward as ArrowUpwardIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import UserInfo from './UserInfo';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import PermissionGuard from '../common/PermissionGuard';
import { useAdvancedPermissions } from '../../hooks/useAdvancedPermissions';
import { checkMenuPermission, getMenuPermissionConfig } from './MenuPermissionConfig';

// [advice from AI] 백스테이지IO 스타일의 사이드바 너비
const DRAWER_WIDTH = 240;

// [advice from AI] 통합된 네비게이션 메뉴 (운영 센터 복구)
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

// [advice from AI] 운영 센터 하위 메뉴 복구
const operationsSubMenus = [
  // === 배포 관리 ===
  { text: '레포지토리 직접 배포', path: '/operations/repository-deploy', highlight: true, description: 'GitHub URL로 즉시 배포 (운영팀 전용)' },
  { text: '배포 히스토리', path: '/operations/deployment-history', highlight: false, description: '모든 배포 기록 및 롤백 관리' },
  
  // === CI/CD 파이프라인 ===
  { text: '파이프라인 관리', path: '/operations/pipeline', highlight: true, description: 'CI/CD 파이프라인 통합 관리 (Jenkins + Nexus + ArgoCD)' },
  { text: 'CI/CD 서버 설정', path: '/operations/infrastructure', highlight: false, description: 'Jenkins, Nexus, ArgoCD 서버 연결 설정' },
  
  // === 모니터링 & 이슈 ===
  { text: '종합 모니터링', path: '/operations/comprehensive-monitoring', highlight: true, description: 'Prometheus + SLA + 실시간 알림' },
  { text: '이슈 관리', path: '/operations/issues', highlight: false, description: '빌드/배포/성능 이슈 추적' },
  
  // === 클러스터 관리 ===
  { text: '클러스터 대시보드', path: '/operations/cluster-dashboard', highlight: true, description: '멀티 클러스터 현황 모니터링' },
  { text: '클러스터 관리', path: '/operations/cluster-management', highlight: false, description: 'Kubernetes 클러스터 등록 및 설정' },
  
  // === AI 지원 도구 ===
  { text: 'AI 하드웨어 계산기', path: '/operations/hardware-calculator', highlight: false, description: 'ECP-AI 리소스 자동 계산' }
];

// [advice from AI] 시스템 관리 하위 메뉴 - 핵심 기능만 유지
const adminSubMenus = [
  { text: '사용자 관리', path: '/admin' },
  { text: '권한 관리', path: '/admin/permissions', description: '역할 기반 권한 및 감사 로그 관리' },
  { text: '시스템 설정', path: '/admin/system-config', description: 'CI/CD, 클러스터, 보안 설정' },
  { text: '시스템 모니터링', path: '/admin/monitoring', description: '백엔드 서버 및 DB 상태 모니터링' },
  { text: '로그 관리', path: '/admin/logs' },
];

interface BackstageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const BackstageLayout: React.FC<BackstageLayoutProps> = ({ 
  children, 
  title = "Timbel CICD Operator Solution" 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  // [advice from AI] 기존 상태 + 프로덕션 레벨 개선 상태
  const [mobileOpen, setMobileOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  
  // [advice from AI] 프로덕션 레벨 개선 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'warning' | 'info'
  });
  
  const { user, token } = useJwtAuthStore();
  
  // [advice from AI] 고도화된 권한 시스템 사용
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionLevel,
    hasRole,
    isAdmin,
    loading: permissionsLoading
  } = useAdvancedPermissions();

  // [advice from AI] 메뉴 접근 권한 확인 함수
  const canAccess = (menuPath: string) => {
    // 권한 로딩 중이면 기본적으로 접근 허용
    if (permissionsLoading) {
      return true;
    }
    
    // 필요한 함수들이 모두 정의되어 있는지 확인
    if (!hasPermission || !hasAnyPermission || !hasAllPermissions || !hasPermissionLevel || !hasRole) {
      console.warn('권한 함수들이 아직 준비되지 않았습니다');
      return true; // 안전하게 접근 허용
    }
    
    return checkMenuPermission(
      menuPath, 
      hasPermission, 
      hasAnyPermission, 
      hasAllPermissions, 
      hasPermissionLevel, 
      hasRole, 
      isAdmin
    );
  };

  // [advice from AI] 메뉴 접근 정보 가져오기 (새로운 권한 시스템)
  const getMenuAccessInfo = (menuPath: string) => {
    return getMenuPermissionConfig(menuPath);
  };

  // [advice from AI] 프로덕션 레벨 개선: 스크롤 이벤트 처리
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // [advice from AI] 프로덕션 레벨 개선: 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + M: 모바일 메뉴 토글
      if (event.altKey && event.key === 'm' && isMobile) {
        event.preventDefault();
        handleDrawerToggle();
      }
      
      // Ctrl + K: 검색 포커스
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('[data-testid="menu-search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Escape: 모바일 메뉴 닫기
      if (event.key === 'Escape' && mobileOpen) {
        handleDrawerToggle();
      }
      
      // Alt + H: 홈으로 이동
      if (event.altKey && event.key === 'h') {
        event.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, mobileOpen, navigate]);

  // [advice from AI] 프로덕션 레벨 개선: 유틸리티 함수들
  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);
  }, [mobileOpen]);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const showNotificationMessage = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  }, []);

  const handleNotificationClose = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // [advice from AI] 네비게이션 아이템 클릭 핸들러
  const handleNavigation = (path: string) => {
    console.log('🔗 네비게이션 시도:', path, '현재 경로:', location.pathname);
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // [advice from AI] 현재 경로 확인 함수
  const isCurrentPath = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // [advice from AI] 현재 페이지 정보 추출 (메모이제이션)
  const currentPageInfo = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const pageName = pathSegments[pathSegments.length - 1] || 'home';
    
    const pageTitles: Record<string, string> = {
      'home': '홈 대시보드',
      'dashboard': '대시보드',
      'knowledge': '지식자원 카탈로그',
      'operations': '운영센터',
      'admin': '시스템 관리',
      'executive': '최고 관리자',
      'domains': '도메인 관리',
      'projects': '프로젝트 관리',
      'systems': '시스템 관리',
      'code': '코드 컴포넌트',
      'design': '디자인 자산',
      'docs': '문서/가이드'
    };

    return {
      name: pageName,
      title: pageTitles[pageName] || pageName,
      breadcrumbs: pathSegments
    };
  }, [location.pathname]);

  // [advice from AI] 경로 변경 감지 및 로깅
  useEffect(() => {
    console.log('📍 현재 경로 변경됨:', location.pathname);
  }, [location.pathname]);

  // [advice from AI] 백스테이지IO 스타일의 사이드바 컴포넌트 (프로덕션 레벨 개선)
  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* [advice from AI] 백스테이지IO 스타일의 로고 영역 (배경색 제거) */}
      <Box 
        sx={{ 
          p: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700,
            fontSize: isMobile ? '1.1rem' : '1.25rem',
            color: theme.palette.primary.main
          }}
        >
          Timbel
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.75rem',
            mt: 0.5,
            color: theme.palette.text.secondary
          }}
        >
          CICD Operator Solution
        </Typography>
        
        {/* 모바일에서 닫기 버튼 */}
        {isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8
            }}
            aria-label="메뉴 닫기"
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* [advice from AI] 프로덕션 레벨 개선: 메뉴 검색 영역 */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <TextField
          fullWidth
          size="small"
          placeholder="메뉴 검색... (Ctrl+K)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="menu-search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  aria-label="검색어 지우기"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              '&:hover': {
                backgroundColor: theme.palette.background.paper
              }
            }
          }}
        />
      </Box>

      {/* [advice from AI] 메인 네비게이션 메뉴 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
      <List sx={{ pt: 1 }}>
        {navigationItems.map((item) => {
            // [advice from AI] 고도화된 권한 기반 메뉴 접근 권한 확인
            const hasAccess = item.path === '/' ? true : canAccess(item.path);
          const accessInfo = getMenuAccessInfo(item.path);
          
            // [advice from AI] 권한이 없고 숨김 설정인 메뉴는 렌더링하지 않음
            if (!hasAccess && accessInfo.hideIfNoPermission) {
              return null;
            }
            
            // [advice from AI] 지식자원 카탈로그 하위 메뉴 처리 - 권한 기반
          if (item.path === '/knowledge' && item.hasSubMenu) {
            return (
                <PermissionGuard 
                  key={item.text}
                  permissions={['can_read_all']} 
                  hideIfNoPermission={true}
                >
                  <React.Fragment>
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
                        selected={isCurrentPath(item.path)}
                        sx={{
                          mx: 1,
                          borderRadius: 1,
                          '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
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
                            fontWeight: isCurrentPath(item.path) ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {knowledgeOpen ? <ExpandLess /> : <ExpandMore />}
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
                                    selected={hasSubAccess && isCurrentPath(subItem.path)}
                                disabled={!hasSubAccess}
                                sx={{
                                  mx: 1,
                                  ml: 3,
                                  borderRadius: 1,
                                  backgroundColor: 'transparent',
                                  opacity: hasSubAccess ? 1 : 0.5,
                                  '&.Mui-selected': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
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
                                        fontWeight: isCurrentPath(subItem.path) ? 600 : 400,
                                  }}
                                  sx={{ pl: 1 }}
                                />
                                    {subItem.badge && (
                                      <Chip
                                        label={subItem.badge}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ height: 16, fontSize: '0.6rem' }}
                                      />
                                    )}
                              </ListItemButton>
                            </Box>
                          </Tooltip>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
                </PermissionGuard>
              );
            }

            // [advice from AI] 운영센터 하위 메뉴 처리 - 권한 기반
          if (item.path === '/operations' && item.hasSubMenu) {
            return (
                <PermissionGuard 
                  key={item.text}
                  permissions={['can_view_operations']} 
                  hideIfNoPermission={true}
                >
                  <React.Fragment>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => {
                          if (operationsOpen) {
                            setOperationsOpen(false);
                          } else {
                            setOperationsOpen(true);
                            handleNavigation(item.path);
                          }
                        }}
                        selected={isCurrentPath(item.path)}
                        sx={{
                          mx: 1,
                          borderRadius: 1,
                          '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
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
                            fontWeight: isCurrentPath(item.path) ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {operationsOpen ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                      </ListItemButton>
                </ListItem>
                    <Collapse in={operationsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                        {operationsSubMenus.map((subItem) => {
                          const hasSubAccess = canAccess(subItem.path);
                          
                          return (
                      <ListItem key={subItem.text} disablePadding>
                        <Tooltip 
                                title={hasSubAccess ? subItem.description : '권한이 없습니다'}
                          placement="right"
                          arrow
                        >
                          <Box component="span" sx={{ width: '100%' }}>
                            <ListItemButton
                                    onClick={() => hasSubAccess && handleNavigation(subItem.path)}
                                    selected={hasSubAccess && isCurrentPath(subItem.path)}
                                    disabled={!hasSubAccess}
                              sx={{
                                mx: 1,
                                ml: 3,
                                borderRadius: 1,
                                backgroundColor: 'transparent',
                                      opacity: hasSubAccess ? 1 : 0.5,
                                '&.Mui-selected': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
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
                                        fontWeight: isCurrentPath(subItem.path) ? 600 : 400,
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
                </PermissionGuard>
            );
          }
          
            // [advice from AI] 시스템 관리 하위 메뉴 처리 - 권한 기반
          if (item.path === '/admin' && item.hasSubMenu) {
            return (
                <PermissionGuard 
                  key={item.text}
                  permissions={['can_manage_users', 'can_manage_system']} 
                  hideIfNoPermission={true}
                >
                  <React.Fragment>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => {
                          if (adminOpen) {
                            setAdminOpen(false);
                          } else {
                            setAdminOpen(true);
                            handleNavigation(item.path);
                          }
                        }}
                        selected={isCurrentPath(item.path)}
                        sx={{
                          mx: 1,
                          borderRadius: 1,
                          '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
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
                            fontWeight: isCurrentPath(item.path) ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {adminOpen ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                      </ListItemButton>
                </ListItem>
                    <Collapse in={adminOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {adminSubMenus.map((subItem) => {
                      const hasSubAccess = canAccess(subItem.path);
                          
                      return (
                        <ListItem key={subItem.text} disablePadding>
                          <Tooltip 
                                title={hasSubAccess ? subItem.description || '' : '권한이 없습니다'}
                            placement="right"
                            arrow
                          >
                            <Box component="span" sx={{ width: '100%' }}>
                              <ListItemButton
                                onClick={() => hasSubAccess && handleNavigation(subItem.path)}
                                    selected={hasSubAccess && isCurrentPath(subItem.path)}
                                disabled={!hasSubAccess}
                                sx={{
                                  mx: 1,
                                  ml: 3,
                                  borderRadius: 1,
                                  backgroundColor: 'transparent',
                                  opacity: hasSubAccess ? 1 : 0.5,
                                  '&.Mui-selected': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
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
                                        fontWeight: isCurrentPath(subItem.path) ? 600 : 400,
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
                </PermissionGuard>
            );
          }

            // [advice from AI] 일반 메뉴 아이템
          return (
            <ListItem key={item.text} disablePadding>
              <Tooltip 
                  title={hasAccess ? '' : accessInfo.description}
                placement="right"
                arrow
                  componentsProps={{
                    tooltip: { sx: { display: hasAccess ? 'none' : 'block' } }
                  }}
              >
                <Box component="span" sx={{ width: '100%' }}>
                  <ListItemButton
                    onClick={() => hasAccess && handleNavigation(item.path)}
                      selected={hasAccess && isCurrentPath(item.path)}
                    disabled={!hasAccess}
                    sx={{
                      mx: 1,
                      borderRadius: 1,
                      opacity: hasAccess ? 1 : 0.5,
                      '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
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
                          fontWeight: isCurrentPath(item.path) ? 600 : 400,
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
      </Box>

      {/* [advice from AI] 키보드 단축키 도움말 (데스크톱만) */}
      {!isMobile && (
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            단축키: Ctrl+K (검색), Alt+H (홈)
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* [advice from AI] 백스테이지IO 스타일의 AppBar (프로덕션 레벨 개선) */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1]
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="메뉴 열기"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              {currentPageInfo.title}
          </Typography>
            {currentPageInfo.breadcrumbs.length > 1 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {currentPageInfo.breadcrumbs.join(' > ')}
              </Typography>
            )}
          </Box>
          
          <UserInfo />
        </Toolbar>
      </AppBar>

      {/* [advice from AI] 네비게이션 드로어 (프로덕션 레벨 개선) */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="메인 네비게이션"
      >
        {/* 모바일 드로어 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true // 성능 최적화
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundImage: 'none'
            }
          }}
        >
          {drawer}
        </Drawer>

        {/* 데스크톱 드로어 */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundImage: 'none'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* [advice from AI] 메인 컨텐츠 영역 (프로덕션 레벨 개선) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default
        }}
      >
        {/* 헤더 높이만큼 여백 */}
        <Box sx={{ height: '64px' }} />
        
        {/* 페이지 컨텐츠 */}
        <Box
          sx={{
            p: { xs: 1, sm: 2, md: 3 },
            maxWidth: '100%',
            overflow: 'hidden'
        }}
      >
        {children}
        </Box>
      </Box>

      {/* [advice from AI] 프로덕션 레벨 개선: 맨 위로 가기 FAB */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="medium"
          onClick={handleScrollToTop}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: theme.zIndex.speedDial
          }}
          aria-label="맨 위로 가기"
        >
          <ArrowUpwardIcon />
        </Fab>
      </Zoom>

      {/* [advice from AI] 프로덕션 레벨 개선: 알림 스낵바 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ bottom: { xs: 90, sm: 24 } }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* [advice from AI] 프로덕션 레벨 개선: 키보드 단축키 도움말 (데스크톱만) */}
      {!isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 8,
            left: 8,
            zIndex: 1,
            opacity: 0.6,
            '&:hover': { opacity: 1 }
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            단축키: Ctrl+K (검색), Alt+H (홈), Alt+M (메뉴)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BackstageLayout;