// [advice from AI] 백스테이지IO 스타일의 카드 컴포넌트
// 백스테이지IO의 카드 디자인을 Material-UI v5와 호환되도록 구현

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Box,
  IconButton,
  Chip,
  useTheme,
  SxProps,
  Theme,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

interface BackstageCardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  tags?: string[];
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'outlined' | 'elevated';
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps<Theme>;
}

const BackstageCard: React.FC<BackstageCardProps> = ({
  title,
  subtitle,
  children,
  actions,
  tags = [],
  onClick,
  href,
  variant = 'default',
  size = 'medium',
  sx,
}) => {
  const theme = useTheme();

  // [advice from AI] 카드 크기별 스타일 정의
  const sizeStyles = {
    small: {
      minHeight: 120,
      padding: theme.spacing(1.5),
    },
    medium: {
      minHeight: 160,
      padding: theme.spacing(2),
    },
    large: {
      minHeight: 200,
      padding: theme.spacing(3),
    },
  };

  // [advice from AI] 카드 variant별 스타일 정의
  const variantStyles = {
    default: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      border: `1px solid ${theme.palette.divider}`,
    },
    outlined: {
      boxShadow: 'none',
      border: `1px solid ${theme.palette.divider}`,
    },
    elevated: {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
      border: 'none',
    },
  };

  const cardStyle = {
    ...sizeStyles[size],
    ...variantStyles[variant],
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    cursor: onClick || href ? 'pointer' : 'default',
    transition: 'all 0.2s ease-in-out',
    '&:hover': (onClick || href) ? {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    } : {},
    ...sx,
  };

  const handleClick = () => {
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Card
      sx={cardStyle}
      onClick={handleClick}
    >
      {/* [advice from AI] 카드 헤더 영역 */}
      {(title || subtitle || tags.length > 0) && (
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                component="h3"
                sx={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  flexGrow: 1,
                }}
              >
                {title}
              </Typography>
              {href && (
                <OpenInNewIcon 
                  sx={{ 
                    fontSize: '1rem', 
                    color: theme.palette.text.secondary 
                  }} 
                />
              )}
            </Box>
          }
          subheader={
            subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.875rem',
                  mt: 0.5,
                }}
              >
                {subtitle}
              </Typography>
            )
          }
          action={
            <IconButton size="small" sx={{ color: theme.palette.text.secondary }}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          }
          sx={{
            pb: tags.length > 0 ? 1 : 2,
            '& .MuiCardHeader-content': {
              overflow: 'hidden',
            },
          }}
        />
      )}

      {/* [advice from AI] 태그 영역 */}
      {tags.length > 0 && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.75rem',
                  height: 20,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* [advice from AI] 카드 컨텐츠 영역 */}
      {children && (
        <CardContent
          sx={{
            pt: tags.length > 0 ? 0 : (title || subtitle ? 0 : 2),
            pb: actions ? 1 : 2,
            '&:last-child': {
              pb: actions ? 1 : 2,
            },
          }}
        >
          {children}
        </CardContent>
      )}

      {/* [advice from AI] 카드 액션 영역 */}
      {actions && (
        <CardActions
          sx={{
            pt: 0,
            px: 2,
            pb: 2,
            justifyContent: 'flex-end',
          }}
        >
          {actions}
        </CardActions>
      )}
    </Card>
  );
};

export default BackstageCard;
