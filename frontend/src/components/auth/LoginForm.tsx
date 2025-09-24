// [advice from AI] 로그인 폼 컴포넌트

import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  const [sampleAccounts, setSampleAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const { login, isLoading, error, clearError } = useJwtAuthStore();

  // [advice from AI] API URL 결정
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      // 외부 도메인에서는 포트 3001 사용
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };

  // [advice from AI] 샘플 계정 로드
  const loadSampleAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/sample-accounts`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSampleAccounts(result.data);
          console.log('✅ 샘플 계정 로드 완료:', result.data.length, '개');
        }
      }
    } catch (error) {
      console.error('❌ 샘플 계정 로드 실패:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 샘플 계정 로드
  useEffect(() => {
    loadSampleAccounts();
  }, []);

  // [advice from AI] 역할별 계정 예시 데이터 (백업용 - 실제로는 DB에서 로드)
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
  const handleAccountExample = (username: string, password?: string) => {
    setLoginId(username);
    setPassword(password || '1q2w3e4r'); // 기본 비밀번호
  };

  // [advice from AI] 샘플 계정으로 바로 로그인
  const handleSampleLogin = async (account: any) => {
    const defaultPassword = '1q2w3e4r';
    setLoginId(account.username);
    setPassword(defaultPassword);
    
    try {
      await login(account.username, defaultPassword);
    } catch (error) {
      console.error('샘플 계정 로그인 실패:', account.username);
    }
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

            {/* [advice from AI] 샘플 계정 선택 드롭다운 */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                💡 샘플 계정으로 빠른 로그인
              </Typography>
              
              {loadingAccounts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    계정 정보를 로드하는 중...
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>역할별 샘플 계정 선택</InputLabel>
                    <Select
                      value=""
                      onChange={(e) => {
                        const selectedAccount = sampleAccounts.find(acc => acc.username === e.target.value);
                        if (selectedAccount) {
                          handleAccountExample(selectedAccount.username);
                        }
                      }}
                      label="역할별 샘플 계정 선택"
                      disabled={isLoading}
                    >
                      <MenuItem value="">
                        <em>계정을 선택하세요</em>
                      </MenuItem>
                      {sampleAccounts.map((account) => {
                        // 역할별 색상 결정
                        const getRoleColor = (roleType: string) => {
                          switch (roleType) {
                            case 'admin': return 'error';
                            case 'executive': return 'error';
                            case 'po': return 'warning';
                            case 'pe': return 'info';
                            case 'qa': return 'success';
                            default: return 'default';
                          }
                        };

                        // 역할별 한국어 이름
                        const getRoleName = (roleType: string) => {
                          switch (roleType) {
                            case 'admin': return '시스템 관리자';
                            case 'executive': return '최고 관리자';
                            case 'po': return 'PO (Project Owner)';
                            case 'pe': return 'PE (Project Engineer)';
                            case 'qa': return 'QA (Quality Assurance)';
                            default: return roleType.toUpperCase();
                          }
                        };

                        return (
                          <MenuItem key={account.username} value={account.username}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                              <Chip 
                                label={getRoleName(account.role_type)} 
                                color={getRoleColor(account.role_type) as any} 
                                size="small" 
                                sx={{ fontSize: '0.7rem', minWidth: 120 }} 
                              />
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography sx={{ fontWeight: 600 }}>
                                  {account.full_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  @{account.username}
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      if (sampleAccounts.length > 0) {
                        const randomAccount = sampleAccounts[Math.floor(Math.random() * sampleAccounts.length)];
                        handleSampleLogin(randomAccount);
                      }
                    }}
                    disabled={isLoading || sampleAccounts.length === 0}
                    sx={{ mb: 1 }}
                  >
                    🎲 랜덤 계정으로 바로 로그인
                  </Button>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                    총 {sampleAccounts.length}개의 샘플 계정 • 모든 계정 비밀번호: 1q2w3e4r
                  </Typography>
                </Box>
              )}
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  🔒 <strong>보안 안내:</strong> 실제 운영 환경에서는 이런 샘플 계정 기능을 제거하고, 
                  정식 회원가입 및 로그인 프로세스만 사용하세요.
                </Typography>
              </Alert>
            </Box>

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
