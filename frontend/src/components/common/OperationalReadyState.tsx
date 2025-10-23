// [advice from AI] 운영 준비 상태 컴포넌트 - 데이터 없을 때 친절한 안내
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface OperationalReadyStateProps {
  title: string;
  description: string;
  suggestions: {
    title: string;
    description: string;
    actionText: string;
    actionPath: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

const OperationalReadyState: React.FC<OperationalReadyStateProps> = ({
  title,
  description,
  suggestions
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '';
    }
  };

  return (
    <Box sx={{ py: 6, px: 3 }}>
      <Card 
        sx={{ 
          maxWidth: 800,
          margin: '0 auto',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 2
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* [advice from AI] 헤더 섹션 */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: theme.palette.primary.light,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <Typography
                variant="h4"
                sx={{ 
                  color: theme.palette.primary.contrastText,
                  fontWeight: 500 
                }}
              >
                🚀
              </Typography>
            </Box>

            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {title}
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}
            >
              {description}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* [advice from AI] 시작 가이드 */}
          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 500, mb: 3 }}
            >
              시작하기 권장 순서
            </Typography>

            <Grid container spacing={2}>
              {suggestions.map((suggestion, index) => (
                <Grid item xs={12} key={index}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      border: `1px solid ${getPriorityColor(suggestion.priority)}20`,
                      backgroundColor: `${getPriorityColor(suggestion.priority)}05`,
                      '&:hover': {
                        backgroundColor: `${getPriorityColor(suggestion.priority)}10`,
                        borderColor: `${getPriorityColor(suggestion.priority)}40`
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, mr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                backgroundColor: getPriorityColor(suggestion.priority),
                                color: 'white',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                mr: 2
                              }}
                            >
                              {index + 1}단계
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: getPriorityColor(suggestion.priority),
                                fontWeight: 500
                              }}
                            >
                              우선순위: {getPriorityText(suggestion.priority)}
                            </Typography>
                          </Box>
                          
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 500, mb: 1 }}
                          >
                            {suggestion.title}
                          </Typography>
                          
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ lineHeight: 1.5 }}
                          >
                            {suggestion.description}
                          </Typography>
                        </Box>

                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => navigate(suggestion.actionPath)}
                          sx={{
                            backgroundColor: getPriorityColor(suggestion.priority),
                            '&:hover': {
                              backgroundColor: getPriorityColor(suggestion.priority),
                              filter: 'brightness(0.9)'
                            },
                            textTransform: 'none',
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {suggestion.actionText}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* [advice from AI] 도움말 섹션 */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              시스템 설정이나 사용법에 대한 도움이 필요하시면
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/admin/system-config')}
              sx={{ textTransform: 'none' }}
            >
              시스템 설정 센터 바로가기
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OperationalReadyState;
