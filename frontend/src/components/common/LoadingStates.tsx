// [advice from AI] 프로덕션 레벨 로딩 상태 및 피드백 컴포넌트
// 다양한 로딩 상태, 에러 상태, 빈 상태 처리

import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
  Paper,
  Alert,
  Button,
  Card,
  CardContent,
  Fade,
  Zoom,
  useTheme,
  alpha
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  CloudOff as CloudOffIcon,
  Search as SearchIcon
} from '@mui/icons-material';

// [advice from AI] 로딩 스피너 컴포넌트
interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  variant?: 'circular' | 'linear';
  color?: 'primary' | 'secondary' | 'inherit';
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message,
  variant = 'circular',
  color = 'primary',
  overlay = false
}) => {
  const theme = useTheme();

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3
      }}
    >
      {variant === 'circular' ? (
        <CircularProgress size={size} color={color} />
      ) : (
        <Box sx={{ width: '100%', maxWidth: 300 }}>
          <LinearProgress color={color} />
        </Box>
      )}
      
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: 300 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (overlay) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(2px)',
          zIndex: theme.zIndex.modal,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

// [advice from AI] 스켈레톤 로더 컴포넌트
interface SkeletonLoaderProps {
  type: 'card' | 'list' | 'table' | 'dashboard' | 'form';
  count?: number;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type,
  count = 3,
  height = 'auto',
  animation = 'wave'
}) => {
  const renderCardSkeleton = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={24} animation={animation} />
        <Skeleton variant="text" width="40%" height={16} sx={{ mt: 1 }} animation={animation} />
        <Skeleton variant="rectangular" height={120} sx={{ mt: 2 }} animation={animation} />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Skeleton variant="rectangular" width={80} height={32} animation={animation} />
          <Skeleton variant="rectangular" width={60} height={32} animation={animation} />
        </Box>
      </CardContent>
    </Card>
  );

  const renderListSkeleton = () => (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <Skeleton variant="circular" width={40} height={40} animation={animation} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="70%" height={20} animation={animation} />
          <Skeleton variant="text" width="50%" height={16} animation={animation} />
        </Box>
        <Skeleton variant="rectangular" width={60} height={24} animation={animation} />
      </Box>
    </Box>
  );

  const renderTableSkeleton = () => (
    <Box>
      {/* 테이블 헤더 */}
      <Box sx={{ display: 'flex', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        {[...Array(4)].map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={`${20 + Math.random() * 30}%`}
            height={24}
            animation={animation}
          />
        ))}
      </Box>
      
      {/* 테이블 행들 */}
      {[...Array(count)].map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, p: 2 }}>
          {[...Array(4)].map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={`${15 + Math.random() * 25}%`}
              height={20}
              animation={animation}
            />
          ))}
        </Box>
      ))}
    </Box>
  );

  const renderDashboardSkeleton = () => (
    <Box>
      {/* 상단 메트릭 카드들 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Skeleton variant="text" width="60%" height={16} animation={animation} />
                  <Skeleton variant="text" width="40%" height={32} animation={animation} />
                </Box>
                <Skeleton variant="circular" width={40} height={40} animation={animation} />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* 차트 영역 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} animation={animation} />
            <Skeleton variant="rectangular" height={300} animation={animation} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} animation={animation} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[...Array(5)].map((_, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="circular" width={24} height={24} animation={animation} />
                  <Skeleton variant="text" width="70%" height={20} animation={animation} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  const renderFormSkeleton = () => (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} animation={animation} />
        
        {[...Array(count)].map((_, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Skeleton variant="text" width="20%" height={20} sx={{ mb: 1 }} animation={animation} />
            <Skeleton variant="rectangular" height={56} animation={animation} />
          </Box>
        ))}
        
        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Skeleton variant="rectangular" width={100} height={36} animation={animation} />
          <Skeleton variant="rectangular" width={80} height={36} animation={animation} />
        </Box>
      </CardContent>
    </Card>
  );

  const skeletonMap = {
    card: renderCardSkeleton,
    list: renderListSkeleton,
    table: renderTableSkeleton,
    dashboard: renderDashboardSkeleton,
    form: renderFormSkeleton
  };

  const renderSkeleton = skeletonMap[type];

  return (
    <Box sx={{ height }}>
      {type === 'dashboard' || type === 'form' ? (
        renderSkeleton()
      ) : (
        [...Array(count)].map((_, index) => (
          <React.Fragment key={index}>
            {renderSkeleton()}
          </React.Fragment>
        ))
      )}
    </Box>
  );
};

// [advice from AI] 에러 상태 컴포넌트
interface ErrorStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  severity?: 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = '오류가 발생했습니다',
  message,
  actionLabel = '다시 시도',
  onAction,
  severity = 'error',
  icon,
  compact = false
}) => {
  const defaultIcon = severity === 'error' ? <ErrorIcon /> : 
                     severity === 'warning' ? <CloudOffIcon /> : 
                     <HourglassIcon />;

  if (compact) {
    return (
      <Alert
        severity={severity}
        action={
          onAction && (
            <Button color="inherit" size="small" onClick={onAction}>
              {actionLabel}
            </Button>
          )
        }
      >
        {message}
      </Alert>
    );
  }

  return (
    <Fade in>
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: 'background.paper',
          border: `1px solid ${severity === 'error' ? 'error.light' : 'warning.light'}`
        }}
      >
        <Zoom in>
          <Box sx={{ color: `${severity}.main`, mb: 2, fontSize: 48 }}>
            {icon || defaultIcon}
          </Box>
        </Zoom>
        
        <Typography variant="h6" gutterBottom color="text.primary">
          {title}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
          {message}
        </Typography>
        
        {onAction && (
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onAction}
            color={severity === 'error' ? 'primary' : 'warning'}
          >
            {actionLabel}
          </Button>
        )}
      </Paper>
    </Fade>
  );
};

// [advice from AI] 빈 상태 컴포넌트
interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  illustration?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  illustration,
  compact = false
}) => {
  if (compact) {
    return (
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        {onAction && actionLabel && (
          <Button size="small" onClick={onAction} sx={{ mt: 1 }}>
            {actionLabel}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Fade in>
      <Box
        sx={{
          textAlign: 'center',
          p: 4,
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {illustration ? (
          <Box
            component="img"
            src={illustration}
            alt=""
            sx={{
              width: 200,
              height: 150,
              objectFit: 'contain',
              mb: 3,
              opacity: 0.7
            }}
          />
        ) : (
          <Zoom in>
            <Box sx={{ color: 'text.disabled', mb: 3, fontSize: 64 }}>
              {icon || <SearchIcon />}
            </Box>
          </Zoom>
        )}
        
        <Typography variant="h6" gutterBottom color="text.primary">
          {title}
        </Typography>
        
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 400 }}
        >
          {message}
        </Typography>
        
        {onAction && actionLabel && (
          <Button variant="contained" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Box>
    </Fade>
  );
};

// [advice from AI] 진행률 표시 컴포넌트
interface ProgressIndicatorProps {
  value: number;
  label?: string;
  variant?: 'linear' | 'circular';
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  label,
  variant = 'linear',
  size = 'medium',
  showPercentage = true,
  color = 'primary'
}) => {
  const sizeMap = {
    small: { circular: 32, linear: 4 },
    medium: { circular: 48, linear: 6 },
    large: { circular: 64, linear: 8 }
  };

  if (variant === 'circular') {
    return (
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={value}
          size={sizeMap[size].circular}
          color={color}
        />
        {showPercentage && (
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="caption" component="div" color="text.secondary">
              {`${Math.round(value)}%`}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {showPercentage && (
            <Typography variant="body2" color="text.secondary">
              {`${Math.round(value)}%`}
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant="determinate"
        value={value}
        color={color}
        sx={{ height: sizeMap[size].linear }}
      />
    </Box>
  );
};
