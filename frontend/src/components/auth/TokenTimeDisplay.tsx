// [advice from AI] 프로덕션 레벨 토큰 시간 표시 컴포넌트
// JWT 토큰의 남은 시간을 시각적으로 표시하고 상태에 따라 다른 스타일 적용

import React, { memo } from 'react';
import {
  Chip,
  Tooltip,
  Box,
  LinearProgress,
  Typography,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useTokenTimer, TokenTimeInfo } from '../../hooks/useTokenTimer';

export interface TokenTimeDisplayProps {
  /** 컴팩트 모드 여부 (기본: false) */
  compact?: boolean;
  /** 진행률 바 표시 여부 (기본: true) */
  showProgress?: boolean;
  /** 갱신 버튼 표시 여부 (기본: true) */
  showRefreshButton?: boolean;
  /** 툴팁 표시 여부 (기본: true) */
  showTooltip?: boolean;
  /** 커스텀 클래스명 */
  className?: string;
  /** 커스텀 스타일 */
  sx?: any;
  /** 클릭 이벤트 핸들러 */
  onClick?: () => void;
}

/**
 * 토큰 상태에 따른 색상 반환
 */
const getStatusColor = (status: TokenTimeInfo['timeStatus'], theme: any) => {
  switch (status) {
    case 'safe':
      return {
        color: theme.palette.success.main,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        borderColor: theme.palette.success.main
      };
    case 'warning':
      return {
        color: theme.palette.warning.main,
        backgroundColor: alpha(theme.palette.warning.main, 0.1),
        borderColor: theme.palette.warning.main
      };
    case 'danger':
      return {
        color: theme.palette.error.main,
        backgroundColor: alpha(theme.palette.error.main, 0.1),
        borderColor: theme.palette.error.main
      };
    case 'critical':
      return {
        color: theme.palette.error.dark,
        backgroundColor: alpha(theme.palette.error.dark, 0.2),
        borderColor: theme.palette.error.dark
      };
    case 'expired':
      return {
        color: theme.palette.grey[600],
        backgroundColor: alpha(theme.palette.grey[600], 0.1),
        borderColor: theme.palette.grey[600]
      };
    default:
      return {
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        borderColor: theme.palette.primary.main
      };
  }
};

/**
 * 토큰 상태에 따른 아이콘 반환
 */
const getStatusIcon = (status: TokenTimeInfo['timeStatus'], isCritical: boolean) => {
  if (status === 'expired') {
    return <ErrorIcon fontSize="small" />;
  }
  if (status === 'critical' || isCritical) {
    return <WarningIcon fontSize="small" />;
  }
  if (status === 'danger') {
    return <WarningIcon fontSize="small" />;
  }
  if (status === 'safe') {
    return <CheckCircleIcon fontSize="small" />;
  }
  return <ScheduleIcon fontSize="small" />;
};

/**
 * 상세 툴팁 내용 생성
 */
const getTooltipContent = (tokenInfo: TokenTimeInfo): string => {
  const expirationDate = new Date(tokenInfo.expirationTime);
  const issuedDate = new Date(tokenInfo.issuedTime);
  
  return `
발급 시간: ${issuedDate.toLocaleString()}
만료 시간: ${expirationDate.toLocaleString()}
남은 시간: ${tokenInfo.formattedTime}
진행률: ${tokenInfo.progressPercentage.toFixed(1)}%
상태: ${getStatusText(tokenInfo.timeStatus)}
  `.trim();
};

/**
 * 상태 텍스트 반환
 */
const getStatusText = (status: TokenTimeInfo['timeStatus']): string => {
  switch (status) {
    case 'safe': return '안전';
    case 'warning': return '주의';
    case 'danger': return '위험';
    case 'critical': return '긴급';
    case 'expired': return '만료됨';
    default: return '알 수 없음';
  }
};

/**
 * 토큰 시간 표시 컴포넌트
 */
const TokenTimeDisplay: React.FC<TokenTimeDisplayProps> = memo(({
  compact = false,
  showProgress = true,
  showRefreshButton = true,
  showTooltip = true,
  className,
  sx,
  onClick
}) => {
  const theme = useTheme();
  const { tokenInfo, refreshToken, isRefreshing, canRefresh } = useTokenTimer({
    updateInterval: 1000,
    warningThreshold: 30,
    dangerThreshold: 10,
    criticalThreshold: 5,
    autoRefresh: false
  });

  // 토큰 정보가 없으면 렌더링하지 않음
  if (!tokenInfo) {
    return null;
  }

  const statusColors = getStatusColor(tokenInfo.timeStatus, theme);
  const statusIcon = getStatusIcon(tokenInfo.timeStatus, tokenInfo.isCritical);
  const tooltipContent = showTooltip ? getTooltipContent(tokenInfo) : '';

  /**
   * 갱신 버튼 클릭 핸들러
   */
  const handleRefreshClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (canRefresh && !isRefreshing) {
      refreshToken();
    }
  };

  /**
   * 메인 컴포넌트 클릭 핸들러
   */
  const handleMainClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // 컴팩트 모드 렌더링
  if (compact) {
    const chipComponent = (
      <Chip
        icon={statusIcon}
        label={tokenInfo.formattedTime}
        size="small"
        variant="outlined"
        className={className}
        onClick={handleMainClick}
        sx={{
          color: statusColors.color,
          backgroundColor: statusColors.backgroundColor,
          borderColor: statusColors.borderColor,
          fontSize: '0.75rem',
          height: 24,
          cursor: onClick ? 'pointer' : 'default',
          // 깜빡임 효과 (critical 상태)
          animation: tokenInfo.isCritical ? 'pulse 1s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.7 },
            '100%': { opacity: 1 }
          },
          ...sx
        }}
      />
    );

    return showTooltip ? (
      <Tooltip title={tooltipContent} arrow placement="bottom">
        {chipComponent}
      </Tooltip>
    ) : chipComponent;
  }

  // 일반 모드 렌더링
  const mainComponent = (
    <Box
      className={className}
      onClick={handleMainClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '4px 8px',
        borderRadius: 1,
        border: `1px solid ${statusColors.borderColor}`,
        backgroundColor: statusColors.backgroundColor,
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 120,
        // 깜빡임 효과 (critical 상태)
        animation: tokenInfo.isCritical ? 'pulse 1s infinite' : 'none',
        '@keyframes pulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.7 },
          '100%': { opacity: 1 }
        },
        ...sx
      }}
    >
      {/* 상태 아이콘 */}
      <Box sx={{ color: statusColors.color }}>
        {statusIcon}
      </Box>

      {/* 시간 정보 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            color: statusColors.color,
            fontWeight: 500,
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {tokenInfo.formattedTime}
        </Typography>
        
        {/* 진행률 바 */}
        {showProgress && (
          <LinearProgress
            variant="determinate"
            value={100 - tokenInfo.progressPercentage}
            sx={{
              height: 3,
              borderRadius: 1.5,
              mt: 0.5,
              backgroundColor: alpha(statusColors.color, 0.2),
              '& .MuiLinearProgress-bar': {
                backgroundColor: statusColors.color,
                borderRadius: 1.5
              }
            }}
          />
        )}
      </Box>

      {/* 갱신 버튼 */}
      {showRefreshButton && canRefresh && (
        <IconButton
          size="small"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          sx={{
            color: statusColors.color,
            padding: '2px',
            '&:hover': {
              backgroundColor: alpha(statusColors.color, 0.1)
            }
          }}
        >
          <RefreshIcon 
            fontSize="small" 
            sx={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }}
          />
        </IconButton>
      )}
    </Box>
  );

  return showTooltip ? (
    <Tooltip title={tooltipContent} arrow placement="bottom">
      {mainComponent}
    </Tooltip>
  ) : mainComponent;
});

TokenTimeDisplay.displayName = 'TokenTimeDisplay';

export default TokenTimeDisplay;
