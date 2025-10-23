// [advice from AI] 데이터가 없을 때 표시하는 Empty State 컴포넌트
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionPath?: string;
  onActionClick?: () => void;
  secondaryActionText?: string;
  secondaryActionPath?: string;
  onSecondaryActionClick?: () => void;
  showCreateButton?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText = "새로 만들기",
  actionPath,
  onActionClick,
  secondaryActionText,
  secondaryActionPath,
  onSecondaryActionClick,
  showCreateButton = true
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        textAlign: 'center',
        py: 6,
        px: 3
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 500,
          width: '100%',
          boxShadow: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <CardContent sx={{ py: 4, px: 3 }}>
          {/* [advice from AI] 심플한 일러스트 (텍스트 기반) */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.palette.grey[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              border: `2px dashed ${theme.palette.grey[300]}`
            }}
          >
            <Typography
              variant="h4"
              color="text.secondary"
              sx={{ fontWeight: 300 }}
            >
              ∅
            </Typography>
          </Box>

          {/* [advice from AI] 제목 */}
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 500,
              color: theme.palette.text.primary,
              mb: 2
            }}
          >
            {title}
          </Typography>

          {/* [advice from AI] 설명 */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              lineHeight: 1.6,
              maxWidth: 400,
              margin: '0 auto 32px auto'
            }}
          >
            {description}
          </Typography>

          {/* [advice from AI] 액션 버튼들 */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {showCreateButton && (actionPath || onActionClick) && (
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  if (onActionClick) {
                    onActionClick();
                  } else if (actionPath) {
                    navigate(actionPath);
                  }
                }}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {actionText}
              </Button>
            )}

            {(secondaryActionText && (secondaryActionPath || onSecondaryActionClick)) && (
              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  if (onSecondaryActionClick) {
                    onSecondaryActionClick();
                  } else if (secondaryActionPath) {
                    navigate(secondaryActionPath);
                  }
                }}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {secondaryActionText}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmptyState;
