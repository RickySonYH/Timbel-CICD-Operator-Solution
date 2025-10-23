// [advice from AI] 안전한 간단 토큰 시간 표시 컴포넌트
// 무한 루프 없이 기본적인 토큰 남은 시간만 표시

import React, { memo } from 'react';
import { Chip, Tooltip, useTheme, alpha } from '@mui/material';
import { Schedule as ScheduleIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useTokenTimer } from '../../hooks/useTokenTimer';

export interface SimpleTokenDisplayProps {
  /** 툴팁 표시 여부 (기본: true) */
  showTooltip?: boolean;
  /** 커스텀 스타일 */
  sx?: any;
}

/**
 * 간단한 토큰 시간 표시 컴포넌트 (안전 버전)
 */
const SimpleTokenDisplay: React.FC<SimpleTokenDisplayProps> = memo(({
  showTooltip = true,
  sx
}) => {
  const theme = useTheme();
  const { tokenInfo } = useTokenTimer({
    updateInterval: 5000, // 5초마다 업데이트
    criticalThreshold: 5   // 5분 미만일 때 경고
  });

  // 토큰 정보가 없으면 렌더링하지 않음
  if (!tokenInfo) {
    return null;
  }

  const isWarning = tokenInfo.remainingTime < 10 * 60 * 1000; // 10분 미만
  const isCritical = tokenInfo.remainingTime < 5 * 60 * 1000; // 5분 미만

  // 색상 결정
  const chipColor = isCritical ? 'error' : isWarning ? 'warning' : 'success';
  const backgroundColor = isCritical 
    ? alpha(theme.palette.error.main, 0.1)
    : isWarning 
    ? alpha(theme.palette.warning.main, 0.1)
    : alpha(theme.palette.success.main, 0.1);

  const borderColor = isCritical 
    ? theme.palette.error.main
    : isWarning 
    ? theme.palette.warning.main
    : theme.palette.success.main;

  // 아이콘 결정
  const icon = (isWarning || isCritical) ? <WarningIcon fontSize="small" /> : <ScheduleIcon fontSize="small" />;

  // 툴팁 내용
  const tooltipContent = showTooltip ? `
토큰 만료까지: ${tokenInfo.formattedTime}
만료 시간: ${new Date(tokenInfo.expirationTime).toLocaleString()}
상태: ${isCritical ? '긴급' : isWarning ? '주의' : '안전'}
  `.trim() : '';

  const chipComponent = (
    <Chip
      icon={icon}
      label={tokenInfo.formattedTime}
      size="small"
      color={chipColor}
      variant="outlined"
      sx={{
        fontSize: '0.75rem',
        height: 20,
        backgroundColor,
        borderColor,
        // 깜빡임 효과 (긴급 상태)
        animation: isCritical ? 'pulse 2s infinite' : 'none',
        '@keyframes pulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.7 },
          '100%': { opacity: 1 }
        },
        '& .MuiChip-label': {
          px: 1,
          fontWeight: isCritical ? 600 : 500,
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
});

SimpleTokenDisplay.displayName = 'SimpleTokenDisplay';

export default SimpleTokenDisplay;
