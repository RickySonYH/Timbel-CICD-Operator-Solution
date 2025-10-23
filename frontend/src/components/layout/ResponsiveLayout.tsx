// [advice from AI] 프로덕션 레벨 반응형 레이아웃 컴포넌트
// 모바일, 태블릿, 데스크톱 대응, 접근성 개선, 성능 최적화

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
  Backdrop,
  LinearProgress,
  Alert,
  Snackbar,
  Fab,
  Zoom,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  Brightness4,
  Brightness7,
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import EnhancedNavigation from './EnhancedNavigation';
import UserInfo from './UserInfo';

// [advice from AI] 레이아웃 설정 상수
const DRAWER_WIDTH = 280;
const MOBILE_DRAWER_WIDTH = 280;
const COMPACT_DRAWER_WIDTH = 64;
const HEADER_HEIGHT = 64;
const MOBILE_HEADER_HEIGHT = 56;

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface LayoutState {
  mobileOpen: boolean;
  isCompactMode: boolean;
  showScrollTop: boolean;
  isFullscreen: boolean;
  isDarkMode: boolean;
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  };
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  title = "Timbel CICD Operator Solution" 
}) => {
  const theme = useTheme();
  const location = useLocation();
  const { user, isAuthenticated } = useJwtAuthStore();
  
  // [advice from AI] 반응형 브레이크포인트
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));

  // [advice from AI] 레이아웃 상태 관리
  const [layoutState, setLayoutState] = useState<LayoutState>({
    mobileOpen: false,
    isCompactMode: false,
    showScrollTop: false,
    isFullscreen: false,
    isDarkMode: false,
    notification: {
      open: false,
      message: '',
      severity: 'info'
    }
  });

  // [advice from AI] 현재 페이지 정보 추출
  const currentPageInfo = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const pageName = pathSegments[pathSegments.length - 1] || 'home';
    
    // 페이지별 제목 매핑
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
      'docs': '문서/가이드',
      'monitoring': '모니터링',
      'deployment-history': '배포 히스토리',
      'pipeline': '파이프라인 관리'
    };

    return {
      name: pageName,
      title: pageTitles[pageName] || pageName,
      breadcrumbs: pathSegments
    };
  }, [location.pathname]);

  // [advice from AI] 스크롤 이벤트 처리
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setLayoutState(prev => ({
        ...prev,
        showScrollTop: scrollTop > 400
      }));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // [advice from AI] 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + M: 모바일 메뉴 토글
      if (event.altKey && event.key === 'm' && isMobile) {
        event.preventDefault();
        handleDrawerToggle();
      }
      
      // F11: 전체화면 토글
      if (event.key === 'F11') {
        event.preventDefault();
        handleFullscreenToggle();
      }
      
      // Escape: 모바일 메뉴 닫기
      if (event.key === 'Escape' && layoutState.mobileOpen) {
        handleDrawerClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, layoutState.mobileOpen]);

  // [advice from AI] 드로어 제어 함수들
  const handleDrawerToggle = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      mobileOpen: !prev.mobileOpen
    }));
  }, []);

  const handleDrawerClose = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      mobileOpen: false
    }));
  }, []);

  const handleCompactModeToggle = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      isCompactMode: !prev.isCompactMode
    }));
  }, []);

  // [advice from AI] 전체화면 토글
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setLayoutState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setLayoutState(prev => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  // [advice from AI] 맨 위로 스크롤
  const handleScrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // [advice from AI] 알림 표시
  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setLayoutState(prev => ({
      ...prev,
      notification: {
        open: true,
        message,
        severity
      }
    }));
  }, []);

  // [advice from AI] 알림 닫기
  const handleNotificationClose = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      notification: {
        ...prev.notification,
        open: false
      }
    }));
  }, []);

  // [advice from AI] 드로어 너비 계산
  const drawerWidth = useMemo(() => {
    if (isMobile) return MOBILE_DRAWER_WIDTH;
    if (layoutState.isCompactMode) return COMPACT_DRAWER_WIDTH;
    return DRAWER_WIDTH;
  }, [isMobile, layoutState.isCompactMode]);

  // [advice from AI] 헤더 높이 계산
  const headerHeight = isMobile ? MOBILE_HEADER_HEIGHT : HEADER_HEIGHT;

  // [advice from AI] 드로어 컨텐츠
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* [advice from AI] 로고 및 제목 영역 */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        {!layoutState.isCompactMode && (
          <>
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
          </>
        )}
        
        {/* 모바일에서 닫기 버튼 */}
        {isMobile && (
          <IconButton
            onClick={handleDrawerClose}
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

      {/* [advice from AI] 네비게이션 영역 */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <EnhancedNavigation
          onItemClick={handleDrawerClose}
          isMobile={isMobile}
          onMobileClose={handleDrawerClose}
        />
      </Box>

      {/* [advice from AI] 사용자 정보 영역 */}
      {!layoutState.isCompactMode && (
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.background.paper, 0.8)
          }}
        >
          <UserInfo compact={isMobile} />
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* [advice from AI] 앱바 */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          height: headerHeight,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1]
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${headerHeight}px !important`,
            px: { xs: 1, sm: 2 }
          }}
        >
          {/* 모바일 메뉴 버튼 */}
          <IconButton
            color="inherit"
            aria-label="메뉴 열기"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* 페이지 제목 */}
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

          {/* 툴바 액션 버튼들 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 컴팩트 모드 토글 (데스크톱만) */}
            {isDesktop && (
              <IconButton
                onClick={handleCompactModeToggle}
                aria-label={`${layoutState.isCompactMode ? '확장' : '축소'} 모드`}
                sx={{ display: { xs: 'none', lg: 'flex' } }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* 전체화면 토글 */}
            <IconButton
              onClick={handleFullscreenToggle}
              aria-label={`전체화면 ${layoutState.isFullscreen ? '해제' : '설정'}`}
            >
              {layoutState.isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>

            {/* 사용자 정보 (컴팩트 모드나 모바일에서만) */}
            {(layoutState.isCompactMode || isMobile) && (
              <UserInfo compact />
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* [advice from AI] 네비게이션 드로어 */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="메인 네비게이션"
      >
        {/* 모바일 드로어 */}
        <Drawer
          variant="temporary"
          open={layoutState.mobileOpen}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true // 성능 최적화
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: MOBILE_DRAWER_WIDTH,
              backgroundImage: 'none'
            }
          }}
        >
          {drawerContent}
        </Drawer>

        {/* 데스크톱 드로어 */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              }),
              backgroundImage: 'none'
            }
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* [advice from AI] 메인 컨텐츠 영역 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default
        }}
      >
        {/* 헤더 높이만큼 여백 */}
        <Toolbar sx={{ minHeight: `${headerHeight}px !important` }} />
        
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

      {/* [advice from AI] 맨 위로 가기 FAB */}
      <Zoom in={layoutState.showScrollTop}>
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

      {/* [advice from AI] 알림 스낵바 */}
      <Snackbar
        open={layoutState.notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={layoutState.notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {layoutState.notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ResponsiveLayout;
