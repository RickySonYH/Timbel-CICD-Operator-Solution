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
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

const UserInfo: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useJwtAuthStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          {/* [advice from AI] organization 속성 제거 - JWT 사용자 정보에 없음 */}
          {/* {user.organization && (
            <Chip
              label={user.organization.name}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{
                fontSize: '0.75rem',
                height: 18,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )} */}
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
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1, fontSize: '1rem' }} />
          로그아웃
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserInfo;
