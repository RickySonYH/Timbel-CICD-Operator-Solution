// [advice from AI] 로그인 폼 컴포넌트

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import RegisterForm from './RegisterForm';

const LoginForm: React.FC = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const { login, isLoading, error, clearError } = useJwtAuthStore();

  // [advice from AI] 역할별 계정 예시 데이터
  const roleAccounts = [
    {
      role: '시스템 관리자 (admin)',
      username: 'admin',
      email: 'admin@timbel.net',
      password: '1q2w3e4r',
      color: 'error' as const,
    },
    {
      role: '최고 관리자 (executive)',
      username: 'executive',
      email: 'executive@timbel.com',
      password: '1q2w3e4r',
      color: 'error' as const,
    },
    {
      role: 'PO (프로젝트 오너)',
      username: 'pouser',
      email: 'po@timbel.com',
      password: '1q2w3e4r',
      color: 'warning' as const,
    },
    {
      role: 'PE (프로젝트 엔지니어)',
      username: 'peuser',
      email: 'pe@timbel.com',
      password: '1q2w3e4r',
      color: 'info' as const,
    },
    {
      role: 'QA/QC',
      username: 'qauser',
      email: 'qa@timbel.com',
      password: '1q2w3e4r',
      color: 'success' as const,
    },
    {
      role: '운영팀',
      username: 'opuser',
      email: 'operations@timbel.com',
      password: '1q2w3e4r',
      color: 'secondary' as const,
    },
  ];

  // [advice from AI] 계정 예시 클릭 핸들러
  const handleAccountExample = (username: string, password: string) => {
    setLoginId(username);
    setPassword(password);
  };

  // 회원가입 폼 표시
  if (showRegister) {
    return <RegisterForm onBack={() => setShowRegister(false)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await login(loginId, password);
    } catch (error) {
      // 에러는 이미 store에서 처리됨
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h3" align="center" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              Timbel
            </Typography>
            <Typography variant="subtitle2" align="center" color="textSecondary" gutterBottom>
              Timeless Label
            </Typography>
            <Typography variant="h6" align="center" color="primary" gutterBottom sx={{ mb: 3 }}>
              지식자원 관리 플랫폼
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="UserID / E-Mail"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                margin="normal"
                placeholder="사용자명 또는 이메일을 입력하세요"
                required
                disabled={isLoading}
                InputProps={{
                  startAdornment: loginId.includes('@') ? <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} /> : <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                placeholder="비밀번호를 입력하세요"
                required
                disabled={isLoading}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading || !loginId || !password}
                sx={{ mt: 3, mb: 2 }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  '로그인'
                )}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => setShowRegister(true)}
                disabled={isLoading}
                sx={{ mb: 2 }}
              >
                회원가입 신청
              </Button>
            </Box>

            {/* [advice from AI] 역할별 계정 예시 아코디언 */}
            <Accordion sx={{ mt: 3, boxShadow: 1 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  backgroundColor: 'grey.50',
                  '&:hover': { backgroundColor: 'grey.100' }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  💡 역할별 계정 예시 (클릭하여 펼치기)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    각 역할별 계정으로 로그인하여 해당 대시보드에 접근할 수 있습니다.
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {roleAccounts.map((account) => (
                      <Grid item xs={12} sm={6} key={account.username}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            cursor: 'pointer',
                            '&:hover': { 
                              backgroundColor: 'action.hover',
                              borderColor: 'primary.main'
                            }
                          }}
                          onClick={() => handleAccountExample(account.username, account.password)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip 
                              label={account.role} 
                              color={account.color}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                              {account.username}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                              {account.email}
                            </Typography>
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            비밀번호: {account.password}
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>사용 방법:</strong> 위의 계정 카드를 클릭하면 자동으로 로그인 정보가 입력됩니다.
                    </Typography>
                  </Alert>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
              💡 Administrator 계정이 필요한 경우 시스템 관리자에게 문의하세요
            </Typography>
            <Typography variant="caption" align="center" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
              (주)팀벨 | 서울 강남구 강남대로 94길 66 | 02-584-8181
            </Typography>
            <Typography variant="caption" align="center" color="textSecondary" sx={{ display: 'block' }}>
              sales@timbel.net | 사업자 등록번호: 206-81-58545
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginForm;
