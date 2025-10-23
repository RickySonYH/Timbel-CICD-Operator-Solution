// [advice from AI] 프로덕션 레벨 토큰 갱신 확인 다이얼로그
// 토큰 만료 임박 시 사용자에게 갱신 여부를 확인하는 다이얼로그

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  ExitToApp as ExitToAppIcon
} from '@mui/icons-material';
import { useTokenTimer } from '../../hooks/useTokenTimer';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { showToast } from '../common/ToastNotificationSystem';

export interface TokenRefreshDialogProps {
  /** 다이얼로그 표시 여부 */
  open: boolean;
  /** 다이얼로그 닫기 핸들러 */
  onClose: () => void;
  /** 자동 갱신 모드 여부 */
  autoRefreshMode?: boolean;
  /** 강제 표시 모드 (닫기 버튼 숨김) */
  forceShow?: boolean;
}

/**
 * 토큰 갱신 확인 다이얼로그 컴포넌트
 */
const TokenRefreshDialog: React.FC<TokenRefreshDialogProps> = ({
  open,
  onClose,
  autoRefreshMode = false,
  forceShow = false
}) => {
  const theme = useTheme();
  const { logout } = useJwtAuthStore();
  const { tokenInfo, refreshToken, isRefreshing } = useTokenTimer();
  
  const [countdown, setCountdown] = useState(30); // 30초 카운트다운
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(10); // 10초 자동 갱신 카운트다운

  /**
   * 토큰 갱신 처리
   */
  const handleRefresh = useCallback(async () => {
    try {
      const success = await refreshToken();
      if (success) {
        showToast.success('세션이 성공적으로 연장되었습니다!', {
          title: '세션 연장 완료',
          duration: 3000
        });
        onClose();
      } else {
        showToast.error('세션 연장에 실패했습니다. 다시 로그인해 주세요.', {
          title: '세션 연장 실패',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('토큰 갱신 오류:', error);
      showToast.error('세션 연장 중 오류가 발생했습니다.', {
        title: '오류 발생',
        duration: 5000
      });
    }
  }, [refreshToken, onClose]);

  /**
   * 로그아웃 처리
   */
  const handleLogout = useCallback(() => {
    logout();
    onClose();
    showToast.info('로그아웃되었습니다.', {
      title: '로그아웃',
      duration: 3000
    });
  }, [logout, onClose]);

  /**
   * 다이얼로그 닫기 (강제 모드가 아닐 때만)
   */
  const handleClose = useCallback(() => {
    if (!forceShow) {
      onClose();
    }
  }, [forceShow, onClose]);

  /**
   * 카운트다운 타이머
   */
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 카운트다운 완료 시 자동 로그아웃
          handleLogout();
          return 0;
        }
        return prev - 1;
      });

      if (autoRefreshMode) {
        setAutoRefreshCountdown(prev => {
          if (prev <= 1) {
            // 자동 갱신 실행
            handleRefresh();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, autoRefreshMode, handleRefresh, handleLogout]);

  /**
   * 다이얼로그가 열릴 때 카운트다운 초기화
   */
  useEffect(() => {
    if (open) {
      setCountdown(30);
      setAutoRefreshCountdown(10);
    }
  }, [open]);

  if (!tokenInfo) {
    return null;
  }

  const remainingMinutes = Math.floor(tokenInfo.remainingTime / (1000 * 60));
  const remainingSeconds = Math.floor((tokenInfo.remainingTime % (1000 * 60)) / 1000);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={forceShow}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[8],
          border: `2px solid ${theme.palette.warning.main}`,
          backgroundColor: theme.palette.background.paper
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1,
        backgroundColor: alpha(theme.palette.warning.main, 0.1),
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <WarningIcon color="warning" />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          세션 만료 임박
        </Typography>
        
        {!forceShow && (
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* 현재 토큰 상태 */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700, mb: 1 }}>
            {remainingMinutes}분 {remainingSeconds}초
          </Typography>
          <Typography variant="body1" color="text.secondary">
            후 세션이 자동으로 만료됩니다
          </Typography>
        </Box>

        {/* 진행률 바 */}
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={100 - tokenInfo.progressPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.warning.main, 0.2),
              '& .MuiLinearProgress-bar': {
                backgroundColor: theme.palette.warning.main,
                borderRadius: 4
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              세션 시작
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tokenInfo.progressPercentage.toFixed(1)}% 경과
            </Typography>
            <Typography variant="caption" color="text.secondary">
              세션 만료
            </Typography>
          </Box>
        </Box>

        {/* 자동 갱신 모드 안내 */}
        {autoRefreshMode && autoRefreshCountdown > 0 && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
          }}>
            <Typography variant="body2" color="info.main" sx={{ fontWeight: 500, mb: 1 }}>
              자동 세션 연장
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {autoRefreshCountdown}초 후 자동으로 세션이 연장됩니다.
            </Typography>
          </Box>
        )}

        {/* 카운트다운 경고 */}
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          borderRadius: 1,
          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`
        }}>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 500, mb: 1 }}>
            ⚠️ 자동 로그아웃 경고
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {countdown}초 후 응답이 없으면 보안을 위해 자동으로 로그아웃됩니다.
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          작업 중인 내용이 있다면 먼저 저장하신 후 세션을 연장해 주세요.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        gap: 1,
        backgroundColor: alpha(theme.palette.grey[100], 0.5),
        borderTop: `1px solid ${theme.palette.divider}`
      }}>
        {/* 로그아웃 버튼 */}
        <Button
          onClick={handleLogout}
          startIcon={<ExitToAppIcon />}
          variant="outlined"
          color="inherit"
          disabled={isRefreshing}
        >
          로그아웃
        </Button>

        <Box sx={{ flex: 1 }} />

        {/* 나중에 알림 버튼 (강제 모드가 아닐 때만) */}
        {!forceShow && (
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={isRefreshing}
          >
            나중에 알림
          </Button>
        )}

        {/* 세션 연장 버튼 */}
        <Button
          onClick={handleRefresh}
          startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
          variant="contained"
          color="warning"
          disabled={isRefreshing}
          sx={{ minWidth: 120 }}
        >
          {isRefreshing ? '연장 중...' : '세션 연장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TokenRefreshDialog;
