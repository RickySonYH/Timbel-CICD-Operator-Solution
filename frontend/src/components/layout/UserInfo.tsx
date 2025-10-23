// [advice from AI] 백스테이지IO 스타일의 사용자 정보 표시 컴포넌트
// 헤더에 사용자 정보와 로그아웃 버튼을 표시

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useTheme,
  Divider,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import SimpleTokenDisplay from '../auth/SimpleTokenDisplay';
import { useSimpleTokenNotifications } from '../../hooks/useSimpleTokenNotifications';
import { useTokenTimer } from '../../hooks/useTokenTimer';

const UserInfo: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useJwtAuthStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // [advice from AI] 안전한 토큰 알림 시스템 활성화
  useSimpleTokenNotifications({
    enable10MinWarning: true,
    enable5MinWarning: true,
    enable1MinWarning: true,
    useBrowserNotification: true
  });

  // [advice from AI] 토큰 갱신 기능
  const { refreshToken, isRefreshing, canRefresh } = useTokenTimer();

  // [advice from AI] 브라우저 알림 상태 관리
  const [notificationPermission, setNotificationPermission] = React.useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // [advice from AI] 알림 권한 상태 실시간 업데이트
  React.useEffect(() => {
    const updatePermission = () => {
      if (typeof Notification !== 'undefined') {
        setNotificationPermission(Notification.permission);
      }
    };

    // 페이지 포커스 시 권한 상태 확인
    window.addEventListener('focus', updatePermission);
    
    return () => {
      window.removeEventListener('focus', updatePermission);
    };
  }, []);

  // [advice from AI] 역할별 표시 텍스트 (PO-PE-QA-운영팀 구조 + admin)
  const getRoleText = (roleType?: string, level?: number) => {
    if (roleType) {
      switch (roleType) {
        case 'admin': return '시스템 관리자';
        case 'executive': return '최고 관리자';
        case 'po': return 'PO (프로젝트 오너)';
        case 'pe': return 'PE (프로젝트 엔지니어)';
        case 'qa': return 'QA/QC';
        case 'operations': return '운영팀';
        default: return '사용자';
      }
    }
    
    // 기존 레벨 기반 (하위 호환성)
    switch (level) {
      case 0: return 'Administrator';
      case 1: return 'Leader';
      case 2: return 'Member';
      default: return 'User';
    }
  };

  // [advice from AI] 역할별 색상
  const getRoleColor = (roleType?: string, level?: number) => {
    if (roleType) {
      switch (roleType) {
        case 'admin': return 'error';
        case 'executive': return 'error';
        case 'po': return 'warning';
        case 'pe': return 'info';
        case 'qa': return 'success';
        case 'operations': return 'secondary';
        default: return 'default';
      }
    }
    
    // 기존 레벨 기반 (하위 호환성)
    switch (level) {
      case 0: return 'error';
      case 1: return 'warning';
      case 2: return 'success';
      default: return 'default';
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  // [advice from AI] 토큰 갱신 핸들러
  const handleRefreshToken = async () => {
    if (canRefresh && !isRefreshing) {
      const success = await refreshToken();
      if (success) {
        // 토스트 알림
        const event = new CustomEvent('showToast', {
          detail: { 
            message: '세션이 성공적으로 연장되었습니다!',
            type: 'success',
            duration: 3000,
            title: '세션 연장 완료'
          }
        });
        window.dispatchEvent(event);
      } else {
        // 실패 알림
        const event = new CustomEvent('showToast', {
          detail: { 
            message: '세션 연장에 실패했습니다. 다시 로그인해 주세요.',
            type: 'error',
            duration: 5000,
            title: '세션 연장 실패'
          }
        });
        window.dispatchEvent(event);
      }
    }
    handleMenuClose();
  };

  // [advice from AI] 브라우저 알림 권한 요청 핸들러
  const handleNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      // 토스트 알림
      const event = new CustomEvent('showToast', {
        detail: { 
          message: '이 브라우저는 알림을 지원하지 않습니다.',
          type: 'warning',
          duration: 3000,
          title: '알림 미지원'
        }
      });
      window.dispatchEvent(event);
      handleMenuClose();
      return;
    }

    if (Notification.permission === 'granted') {
      // 이미 허용된 경우
      const event = new CustomEvent('showToast', {
        detail: { 
          message: '브라우저 알림이 이미 활성화되어 있습니다.',
          type: 'info',
          duration: 3000,
          title: '알림 활성화됨'
        }
      });
      window.dispatchEvent(event);
    } else {
      // 권한 요청
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        const event = new CustomEvent('showToast', {
          detail: { 
            message: '브라우저 알림이 활성화되었습니다!',
            type: 'success',
            duration: 3000,
            title: '알림 활성화'
          }
        });
        window.dispatchEvent(event);
      } else {
        const event = new CustomEvent('showToast', {
          detail: { 
            message: '브라우저 알림이 거부되었습니다. 토스트 알림만 사용됩니다.',
            type: 'info',
            duration: 4000,
            title: '알림 거부됨'
          }
        });
        window.dispatchEvent(event);
      }
    }
    
    handleMenuClose();
  };

  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* [advice from AI] 사용자 아바타 */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: theme.palette.primary.main,
          fontSize: '0.875rem',
        }}
      >
        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
      </Avatar>

      {/* [advice from AI] 사용자 정보 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: theme.palette.text.primary,
            fontSize: '0.875rem',
            lineHeight: 1.2,
          }}
        >
          {user.fullName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={getRoleText(user.roleType, user.permissionLevel)}
            size="small"
            color={getRoleColor(user.roleType, user.permissionLevel)}
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 18,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
          
          {/* [advice from AI] 안전한 토큰 시간 표시 */}
          <SimpleTokenDisplay 
            showTooltip={true}
          />
        </Box>
      </Box>

      {/* [advice from AI] 사용자 메뉴 */}
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{
          color: theme.palette.text.secondary,
          '&:hover': {
            color: theme.palette.text.primary,
          },
        }}
      >
        <AccountCircleIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 160,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <SettingsIcon sx={{ mr: 1, fontSize: '1rem' }} />
          설정
        </MenuItem>
        
        {/* [advice from AI] 브라우저 알림 설정 메뉴 항목 */}
        <MenuItem 
          onClick={handleNotificationPermission}
          sx={{
            color: notificationPermission === 'granted' 
              ? theme.palette.success.main 
              : theme.palette.text.secondary
          }}
        >
          {notificationPermission === 'granted' ? (
            <NotificationsIcon sx={{ mr: 1, fontSize: '1rem', color: 'inherit' }} />
          ) : (
            <NotificationsOffIcon sx={{ mr: 1, fontSize: '1rem', color: 'inherit' }} />
          )}
          {notificationPermission === 'granted' ? '알림 활성화됨' : '브라우저 알림 설정'}
        </MenuItem>
        
        <Divider />
        
        {/* [advice from AI] 토큰 갱신 메뉴 항목 */}
        <MenuItem 
          onClick={handleRefreshToken} 
          disabled={!canRefresh || isRefreshing}
          sx={{
            color: canRefresh ? theme.palette.primary.main : theme.palette.text.disabled
          }}
        >
          <RefreshIcon 
            sx={{ 
              mr: 1, 
              fontSize: '1rem',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }} 
          />
          {isRefreshing ? '세션 연장 중...' : '세션 연장'}
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1, fontSize: '1rem' }} />
          로그아웃
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserInfo;
