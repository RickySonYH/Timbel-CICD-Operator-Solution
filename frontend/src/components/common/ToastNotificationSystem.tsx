// [advice from AI] 프로덕션 레벨 토스트 알림 시스템
// 전역 토스트 알림을 관리하는 컴포넌트

import React, { useState, useEffect, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
  Box,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState extends ToastMessage {
  timestamp: number;
  isVisible: boolean;
}

/**
 * 슬라이드 전환 컴포넌트
 */
const SlideTransition = (props: any) => {
  return <Slide {...props} direction="up" />;
};

/**
 * 토스트 알림 시스템 컴포넌트
 */
const ToastNotificationSystem: React.FC = () => {
  const theme = useTheme();
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [activeToast, setActiveToast] = useState<ToastState | null>(null);

  /**
   * 새 토스트 추가
   */
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const newToast: ToastState = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      isVisible: true,
      duration: toast.duration || 5000
    };

    setToasts(prev => [...prev, newToast]);

    // 자동 제거 (persistent가 아닌 경우)
    if (!toast.persistent && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(newToast.id);
      }, newToast.duration);
    }
  }, []);

  /**
   * 토스트 제거
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    if (activeToast?.id === id) {
      setActiveToast(null);
    }
  }, [activeToast]);

  /**
   * 모든 토스트 제거
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
    setActiveToast(null);
  }, []);

  /**
   * 활성 토스트 업데이트
   */
  useEffect(() => {
    if (toasts.length > 0 && !activeToast) {
      const nextToast = toasts[0];
      setActiveToast(nextToast);
    } else if (toasts.length === 0) {
      setActiveToast(null);
    }
  }, [toasts, activeToast]);

  /**
   * 전역 이벤트 리스너 등록
   */
  useEffect(() => {
    const handleShowToast = (event: CustomEvent<Omit<ToastMessage, 'id'>>) => {
      addToast(event.detail);
    };

    const handleClearToasts = () => {
      clearAllToasts();
    };

    window.addEventListener('showToast', handleShowToast as EventListener);
    window.addEventListener('clearToasts', handleClearToasts);

    return () => {
      window.removeEventListener('showToast', handleShowToast as EventListener);
      window.removeEventListener('clearToasts', handleClearToasts);
    };
  }, [addToast, clearAllToasts]);

  /**
   * 토스트 타입별 아이콘 반환
   */
  const getToastIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon fontSize="small" />;
      case 'error':
        return <ErrorIcon fontSize="small" />;
      case 'warning':
        return <WarningIcon fontSize="small" />;
      case 'info':
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  /**
   * 토스트 닫기 핸들러
   */
  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    if (activeToast) {
      removeToast(activeToast.id);
    }
  };

  /**
   * 액션 버튼 클릭 핸들러
   */
  const handleActionClick = () => {
    if (activeToast?.action) {
      activeToast.action.onClick();
      removeToast(activeToast.id);
    }
  };

  if (!activeToast) {
    return null;
  }

  return (
    <>
      {/* 메인 토스트 */}
      <Snackbar
        open={true}
        onClose={handleClose}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbar-root': {
            bottom: { xs: 16, sm: 24 }
          }
        }}
      >
        <Alert
          severity={activeToast.type}
          variant="filled"
          onClose={handleClose}
          icon={getToastIcon(activeToast.type)}
          sx={{
            width: '100%',
            minWidth: 300,
            maxWidth: 500,
            boxShadow: theme.shadows[8],
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* 커스텀 액션 버튼 */}
              {activeToast.action && (
                <IconButton
                  size="small"
                  onClick={handleActionClick}
                  sx={{ 
                    color: 'inherit',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  title={activeToast.action.label}
                >
                  <ScheduleIcon fontSize="small" />
                </IconButton>
              )}
              
              {/* 닫기 버튼 */}
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{ 
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                title="닫기"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          {/* 제목 */}
          {activeToast.title && (
            <AlertTitle sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {activeToast.title}
            </AlertTitle>
          )}
          
          {/* 메시지 */}
          <Box sx={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
            {activeToast.message}
          </Box>
        </Alert>
      </Snackbar>

      {/* 대기 중인 토스트 개수 표시 (2개 이상일 때) */}
      {toasts.length > 1 && (
        <Snackbar
          open={true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            '& .MuiSnackbar-root': {
              bottom: { xs: 80, sm: 88 }
            }
          }}
        >
          <Alert
            severity="info"
            variant="outlined"
            sx={{
              minWidth: 200,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[2]
            }}
          >
            <Box sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
              {toasts.length - 1}개의 알림이 더 있습니다
            </Box>
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

/**
 * 토스트 알림 표시 헬퍼 함수들
 */
export const showToast = {
  success: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('showToast', {
      detail: { message, type: 'success', ...options }
    });
    window.dispatchEvent(event);
  },

  error: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('showToast', {
      detail: { message, type: 'error', ...options }
    });
    window.dispatchEvent(event);
  },

  warning: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('showToast', {
      detail: { message, type: 'warning', ...options }
    });
    window.dispatchEvent(event);
  },

  info: (message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('showToast', {
      detail: { message, type: 'info', ...options }
    });
    window.dispatchEvent(event);
  },

  clear: () => {
    const event = new CustomEvent('clearToasts');
    window.dispatchEvent(event);
  }
};

export default ToastNotificationSystem;
