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
  Collapse,
  Tooltip,
  Button
} from '@mui/material';
// [advice from AI] 접기/펼치기 아이콘만 복원
import { ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import UserInfo from './UserInfo';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import MessageCenter from '../notifications/MessageCenter';

// [advice from AI] 백스테이지IO 스타일의 사이드바 너비
const DRAWER_WIDTH = 240;

// [advice from AI] PO-PE-QA-운영팀 구조 기반 네비게이션 메뉴
const navigationItems = [
  { text: '홈', path: '/' },
  { text: '지식자원 카탈로그', path: '/catalog', hasSubMenu: true },
  { text: '프로젝트 관리', path: '/projects' },
  { text: 'VibeStudio', path: '/vibe-studio' },
];

// [advice from AI] 카탈로그 하위 메뉴 구조 (첨부 이미지 기반)
const catalogSubMenus = [
  { text: '대시보드', path: '/catalog/dashboard' },
  { text: 'Domains', path: '/catalog/domains' },
  { text: 'Systems', path: '/catalog/systems' },
  { text: 'Components', path: '/catalog/components' },
  { text: 'APIs', path: '/catalog/apis' },
  { text: 'Resources', path: '/catalog/resources' }
];

// [advice from AI] 지식 등록 및 관리 하위 메뉴
const knowledgeSubMenus = [
  { text: '대시보드', path: '/knowledge/dashboard' },
  { text: '디자인 자산 등록', path: '/knowledge/design' },
  { text: '코드/컴포넌트 등록', path: '/knowledge/code' },
  { text: '문서/가이드 등록', path: '/knowledge/docs' },
  { text: '지식 검색 및 관리', path: '/knowledge/search' },
  { text: '승인 워크플로우', path: '/knowledge/approval' },
  { text: '다이어그램 관리', path: '/knowledge/diagrams' }
];


// [advice from AI] 역할별 대시보드 메뉴 (하위 메뉴 포함)
const roleDashboards = [
  { text: '최고 관리자', path: '/executive', hasSubMenu: false },
  { text: 'PO 대시보드', path: '/po-dashboard', hasSubMenu: false }, // 향후 프로젝트 관리, PE 관리, 요구사항 관리 등
  { text: 'PE 작업공간', path: '/pe-workspace', hasSubMenu: true }, // 개발도구, 지식자원 활용, 산출물 관리 등
  { text: 'QA/QC 센터', path: '/qa-center', hasSubMenu: false }, // 향후 테스트 계획, 품질 검사, 결함 관리 등
  { text: '운영 센터', path: '/operations', hasSubMenu: true }, // 현재 4개 하위 센터
];

// [advice from AI] PE 작업공간 하위 메뉴
const peWorkspaceSubMenus = [
  { text: 'PE 대시보드', path: '/pe-workspace/dashboard', highlight: false },
  { text: '업무 관리', path: '/pe-workspace/tasks', highlight: false },
  { text: '주간 보고서', path: '/pe-workspace/reports', highlight: false },
  { text: '지식 관리', path: '/pe-workspace/knowledge', highlight: false },
  { text: '코드 등록', path: '/pe-workspace/code-registration', highlight: false },
];

// [advice from AI] 운영센터 하위 메뉴 (모든 센터 하이라이트 적용)
const operationsSubMenus = [
  { text: '테넌트 관리 센터', path: '/operations/tenant-center', highlight: true },
  { text: 'CI/CD 및 서비스 관리', path: '/operations/cicd-services', highlight: true },
  { text: '모니터링', path: '/operations/monitoring', highlight: true },
  { text: '인프라 관리', path: '/operations/infrastructure', highlight: true },
];

// [advice from AI] 시스템 관리 하위 메뉴
const adminSubMenus = [
  { text: '대시보드', path: '/admin' },
  { text: '권한 관리', path: '/admin/permissions' },
  { text: '시스템 설정', path: '/admin/settings' },
  { text: '보안 설정', path: '/admin/security' },
  { text: 'API 키 관리', path: '/admin/api-keys' },
  { text: '알림 설정', path: '/admin/notifications' },
  { text: '로그 관리', path: '/admin/logs' },
  { text: '백업 및 복원', path: '/admin/backup' },
  { text: '사용자 관리', path: '/admin/users' },
  { text: '그룹 관리', path: '/admin/groups' },
  { text: '분석', path: '/admin/analytics' },
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
  const [peWorkspaceOpen, setPeWorkspaceOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { user } = useJwtAuthStore();

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
    '/qa-center': { 
      roles: ['admin', 'executive', 'po', 'qa'], 
      level: 3, 
      description: 'QA/QC 전용 기능입니다.' 
    },
    '/operations': { 
      roles: ['admin', 'executive', 'operations'], 
      level: 4, 
      description: '운영팀 전용 기능입니다.' 
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
    return menuInfo.roles.includes(user.roleType || '');
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
        {navigationItems.map((item) => {
          // [advice from AI] 메인 메뉴는 모든 사용자가 접근 가능하도록 설정
          const hasAccess = true; // 메인 메뉴는 기본적으로 모든 사용자 접근 가능
          
          // [advice from AI] 카탈로그는 하위 메뉴가 있음
          if (item.path === '/catalog' && item.hasSubMenu) {
            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      if (catalogOpen) {
                        setCatalogOpen(false);
                      } else {
                        setCatalogOpen(true);
                        handleNavigation(item.path);
                      }
                    }}
                    selected={location.pathname === item.path || location.pathname.startsWith('/catalog/')}
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
                        fontWeight: location.pathname === item.path || location.pathname.startsWith('/catalog/') ? 600 : 400,
                      }}
                      sx={{ pl: 1 }}
                    />
                    {catalogOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={catalogOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {catalogSubMenus.map((subItem) => {
                      const hasSubAccess = canAccess(subItem.path);
                      const subAccessInfo = getMenuAccessInfo(subItem.path);
                      
                      return (
                        <ListItem key={subItem.text} disablePadding>
                          <Tooltip 
                            title={hasSubAccess ? '' : subAccessInfo.description}
                            placement="right"
                            arrow
                          >
                            <span>
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
                            </span>
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
          // [advice from AI] 메뉴 접근 권한 확인
          const hasAccess = canAccess(item.path);
          const accessInfo = getMenuAccessInfo(item.path);
          
          // [advice from AI] PE 작업공간은 하위 메뉴가 있음
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
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: location.pathname === item.path || location.pathname.startsWith('/pe-workspace/') ? 600 : 400,
                          }}
                          sx={{ pl: 1 }}
                        />
                        {peWorkspaceOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                    {operationsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: location.pathname === item.path ? 600 : 400,
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
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setKnowledgeOpen(!knowledgeOpen)}
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
              primary="지식 등록 및 관리"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: location.pathname === '/knowledge' || location.pathname.startsWith('/knowledge/') ? 600 : 400,
              }}
            />
            {knowledgeOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                    title={hasSubAccess ? '' : `접근 권한 없음: ${subAccessInfo.description}`}
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
            {adminOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
          
          {/* [advice from AI] 메시지 센터 */}
          <MessageCenter />
          
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
