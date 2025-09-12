// [advice from AI] 백스테이지IO 스타일의 메인 레이아웃 컴포넌트
// 사이드바, 헤더, 메인 컨텐츠 영역을 포함한 전체 레이아웃 구조

import React, { useState } from 'react';
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
  Divider,
  useTheme,
  useMediaQuery,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import UserInfo from './UserInfo';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 백스테이지IO 스타일의 사이드바 너비
const DRAWER_WIDTH = 240;

// [advice from AI] PO-PE-QA-운영팀 구조 기반 네비게이션 메뉴
const navigationItems = [
  { text: '홈', path: '/' },
  { text: '지식자원 카탈로그', path: '/catalog' },
  { text: '프로젝트 관리', path: '/projects' },
  { text: 'VibeStudio', path: '/vibe-studio' },
];

// [advice from AI] 역할별 대시보드 메뉴 (향후 하위 메뉴 확장 준비)
const roleDashboards = [
  { text: '최고 관리자', path: '/executive', hasSubMenu: false },
  { text: 'PO 대시보드', path: '/po-dashboard', hasSubMenu: false }, // 향후 프로젝트 관리, PE 관리, 요구사항 관리 등
  { text: 'PE 작업공간', path: '/pe-workspace', hasSubMenu: false }, // 향후 개발도구, 지식자원 활용, 산출물 관리 등
  { text: 'QA/QC 센터', path: '/qa-center', hasSubMenu: false }, // 향후 테스트 계획, 품질 검사, 결함 관리 등
  { text: '운영 센터', path: '/operations', hasSubMenu: true }, // 현재 4개 하위 센터
];

// [advice from AI] 운영센터 하위 메뉴 (모든 센터 하이라이트 적용)
const operationsSubMenus = [
  { text: '테넌트 관리 센터', path: '/operations/tenant-center', highlight: true },
  { text: 'CI/CD 및 서비스 관리', path: '/operations/cicd-services', highlight: true },
  { text: '모니터링', path: '/operations/monitoring', highlight: true },
  { text: '인프라 관리', path: '/operations/infrastructure', highlight: true },
];

const userMenuItems = [
  { text: '프로필', path: '/profile' },
  { text: '설정', path: '/settings' },
];

interface BackstageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const BackstageLayout: React.FC<BackstageLayoutProps> = ({ 
  children, 
  title = "Timbel 지식자원 플랫폼" 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const { user } = useJwtAuthStore();

  // [advice from AI] 역할별 대시보드 자동 리다이렉트
  useEffect(() => {
    if (user && location.pathname === '/') {
      const roleDashboardMap: { [key: string]: string } = {
        'admin': '/executive',        // admin도 최고 관리자 대시보드
        'executive': '/executive',
        'po': '/po-dashboard',
        'pe': '/pe-workspace',
        'qa': '/qa-center',
        'operations': '/operations'
      };

      const dashboardPath = roleDashboardMap[user.roleType || ''];
      if (dashboardPath) {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  // [advice from AI] 역할별 접근 권한 확인
  const hasAccess = (requiredRoles: string[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.roleType || '');
  };

  // [advice from AI] 모바일에서 사이드바 토글
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // [advice from AI] 네비게이션 아이템 클릭 핸들러
  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

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
          지식자원 플랫폼
        </Typography>
      </Box>

      {/* [advice from AI] 메인 네비게이션 메뉴 */}
      <List sx={{ pt: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
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
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
                sx={{ pl: 1 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1 }} />

      {/* [advice from AI] 역할별 대시보드 메뉴 */}
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
          역할별 대시보드
        </Typography>
      </Box>
      
      <List>
        {roleDashboards.map((item) => {
          // [advice from AI] 역할별 접근 권한 확인
          const accessRoles = {
            '/executive': ['admin', 'executive'],
            '/po-dashboard': ['admin', 'executive', 'po'],
            '/pe-workspace': ['admin', 'executive', 'po', 'pe'],
            '/qa-center': ['admin', 'executive', 'po', 'qa'],
            '/operations': ['admin', 'executive', 'operations']
          };
          
          const canAccess = hasAccess(accessRoles[item.path as keyof typeof accessRoles] || []);
          
          if (!canAccess) return null;
          
          // [advice from AI] 운영센터는 하위 메뉴가 있음
          if (item.path === '/operations') {
            return (
              <React.Fragment key={item.text}>
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
                    selected={location.pathname === item.path || location.pathname.startsWith('/operations/')}
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
                        fontWeight: location.pathname === item.path || location.pathname.startsWith('/operations/') ? 600 : 400,
                      }}
                      sx={{ pl: 1 }}
                    />
                    {operationsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={operationsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {operationsSubMenus.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <ListItemButton
                          onClick={() => handleNavigation(subItem.path)}
                          selected={
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
                          }
                          sx={{
                            mx: 1,
                            ml: 3,
                            borderRadius: 1,
                            // [advice from AI] 기본 상태는 투명, 호버/선택 시에만 색상 적용
                            backgroundColor: 'transparent',
                            '&.Mui-selected': {
                              backgroundColor: theme.palette.primary.light + '20',
                              '& .MuiListItemText-primary': {
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                              },
                            },
                            '&:hover': {
                              backgroundColor: (subItem as any).highlight ? '#e3f2fd' : theme.palette.action.hover,
                              '& .MuiListItemText-primary': {
                                color: (subItem as any).highlight ? '#1976d2' : 'inherit',
                                fontWeight: (subItem as any).highlight ? 600 : 'inherit',
                              },
                            },
                            // [advice from AI] 선택된 상태에서 호버 시
                            '&.Mui-selected:hover': {
                              backgroundColor: (subItem as any).highlight ? '#1976d2' : theme.palette.primary.light + '30',
                              '& .MuiListItemText-primary': {
                                color: (subItem as any).highlight ? 'white' : theme.palette.primary.main,
                                fontWeight: 600,
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
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
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

      {/* [advice from AI] 사용자 메뉴 */}
      <List>
        {userMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
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
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
                sx={{ pl: 1 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
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
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          
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
