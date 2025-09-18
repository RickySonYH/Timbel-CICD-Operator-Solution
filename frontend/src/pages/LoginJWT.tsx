// [advice from AI] JWT 토큰 기반 로그인 페이지
// 세션 기반 인증의 문제점을 해결하고 토큰 기반으로 개선

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJwtAuthStore } from '../store/jwtAuthStore';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

// [advice from AI] 샘플 계정 데이터 - 실제 DB와 일치하는 테스트 계정
const SAMPLE_ACCOUNTS = [
  // Executive 계정
  { loginId: 'ceo_yoon', password: '1q2w3e4r', name: '윤종후 (CEO)', role: 'Executive', color: '#e91e63' },
  { loginId: 'cto_kim', password: '1q2w3e4r', name: '김기술 (CTO)', role: 'Executive', color: '#e91e63' },
  
  // Admin 계정
  { loginId: 'admin', password: '1q2w3e4r', name: '시스템 관리자', role: 'Admin', color: '#f44336' },
  { loginId: 'admin_park', password: '1q2w3e4r', name: '박관리 (시스템관리)', role: 'Admin', color: '#f44336' },
  { loginId: 'admin_lee', password: '1q2w3e4r', name: '이시스템 (시스템관리)', role: 'Admin', color: '#f44336' },
  { loginId: 'executive', password: '1q2w3e4r', name: '최고 관리자 (Executive)', role: 'Admin', color: '#f44336' },
  
  // PO 계정
  { loginId: 'pouser', password: '1q2w3e4r', name: 'PO 사용자', role: 'PO', color: '#ff9800' },
  { loginId: 'rickyson', password: '1q2w3e4r', name: 'RickySon', role: 'PO', color: '#ff9800' },
  { loginId: 'po_jung', password: '1q2w3e4r', name: '정기획 (Project Owner)', role: 'PO', color: '#ff9800' },
  { loginId: 'po_choi', password: '1q2w3e4r', name: '최프로젝트 (Project Owner)', role: 'PO', color: '#ff9800' },
  
  // PE 계정
  { loginId: 'peuser', password: '1q2w3e4r', name: 'PE 사용자', role: 'PE', color: '#4caf50' },
  { loginId: 'pe_kang', password: '1q2w3e4r', name: '강개발 (Project Engineer)', role: 'PE', color: '#4caf50' },
  { loginId: 'pe_shin', password: '1q2w3e4r', name: '신백엔드 (Backend Engineer)', role: 'PE', color: '#4caf50' },
  { loginId: 'pe_yoo', password: '1q2w3e4r', name: '유프론트 (Frontend Engineer)', role: 'PE', color: '#4caf50' },
  { loginId: 'pe_han', password: '1q2w3e4r', name: '한코딩 (Project Engineer)', role: 'PE', color: '#4caf50' },
  
  // QA 계정
  { loginId: 'qauser', password: '1q2w3e4r', name: 'QA 사용자', role: 'QA', color: '#2196f3' },
  { loginId: 'qa_lim', password: '1q2w3e4r', name: '임품질 (QA Manager)', role: 'QA', color: '#2196f3' },
  { loginId: 'qc_song', password: '1q2w3e4r', name: '송검증 (QC Specialist)', role: 'QA', color: '#2196f3' },
  
  // Ops 계정
  { loginId: 'opuser', password: '1q2w3e4r', name: '운영 관리자', role: 'Ops', color: '#9c27b0' },
  { loginId: 'ops_nam', password: '1q2w3e4r', name: '남운영 (DevOps Engineer)', role: 'Ops', color: '#9c27b0' },
  { loginId: 'ops_moon', password: '1q2w3e4r', name: '문모니터 (Monitoring Specialist)', role: 'Ops', color: '#9c27b0' },
  { loginId: 'ops_oh', password: '1q2w3e4r', name: '오인프라 (Infrastructure Engineer)', role: 'Ops', color: '#9c27b0' }
];

const LoginJWT: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, checkTokenExpiration } = useJwtAuthStore();
  const [formData, setFormData] = useState({
    loginId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [selectedSampleAccount, setSelectedSampleAccount] = useState('');

  // [advice from AI] 컴포넌트 마운트 시 토큰 만료 확인
  useEffect(() => {
    const checkToken = () => {
      if (checkTokenExpiration()) {
        setError('세션이 만료되었습니다. 다시 로그인해주세요.');
      }
    };

    checkToken();
  }, [checkTokenExpiration]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // [advice from AI] 샘플 계정 선택 핸들러
  const handleSampleAccountSelect = (accountId: string) => {
    const account = SAMPLE_ACCOUNTS.find(acc => acc.loginId === accountId);
    if (account) {
      setFormData({
        loginId: account.loginId,
        password: account.password
      });
      setSelectedSampleAccount(accountId);
      setError('');
    }
  };

  // [advice from AI] 샘플 계정 자동 로그인
  const handleQuickLogin = async (account: typeof SAMPLE_ACCOUNTS[0]) => {
    setError('');
    const success = await login(account.loginId, account.password);
    if (success) {
      navigate('/knowledge');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.loginId || !formData.password) {
      setError('사용자명과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      const success = await login(formData.loginId, formData.password);
      
      if (success) {
        console.log('✅ JWT 로그인 성공');
        navigate('/knowledge');
      } else {
        setError('로그인에 실패했습니다. 사용자명과 비밀번호를 확인해주세요.');
      }
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {/* [advice from AI] 아이콘 제거 - 텍스트 기반으로 변경 */}
            <Typography variant="h4" component="h1" gutterBottom>
              Timbel 플랫폼 로그인
            </Typography>
            <Typography variant="body2" color="text.secondary">
              JWT 토큰 기반 인증
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* [advice from AI] 샘플 계정 선택 드롭다운 */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', fontWeight: 600 }}>
              🧪 테스트 계정 선택
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>역할별 샘플 계정</InputLabel>
              <Select
                value={selectedSampleAccount}
                onChange={(e) => handleSampleAccountSelect(e.target.value)}
                label="역할별 샘플 계정"
              >
                <MenuItem value="">
                  <em>직접 입력</em>
                </MenuItem>
                
                {/* Executive */}
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Executive
                </Typography>
                {SAMPLE_ACCOUNTS.filter(acc => acc.role === 'Executive').map((account) => (
                  <MenuItem key={account.loginId} value={account.loginId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={account.role} 
                        size="small" 
                        sx={{ bgcolor: account.color, color: 'white', fontSize: '0.7rem' }} 
                      />
                      {account.name}
                    </Box>
                  </MenuItem>
                ))}
                
                {/* Admin */}
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Admin
                </Typography>
                {SAMPLE_ACCOUNTS.filter(acc => acc.role === 'Admin').map((account) => (
                  <MenuItem key={account.loginId} value={account.loginId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={account.role} 
                        size="small" 
                        sx={{ bgcolor: account.color, color: 'white', fontSize: '0.7rem' }} 
                      />
                      {account.name}
                    </Box>
                  </MenuItem>
                ))}
                
                {/* PO */}
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Project Owner
                </Typography>
                {SAMPLE_ACCOUNTS.filter(acc => acc.role === 'PO').map((account) => (
                  <MenuItem key={account.loginId} value={account.loginId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={account.role} 
                        size="small" 
                        sx={{ bgcolor: account.color, color: 'white', fontSize: '0.7rem' }} 
                      />
                      {account.name}
                    </Box>
                  </MenuItem>
                ))}
                
                {/* PE */}
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Project Engineer
                </Typography>
                {SAMPLE_ACCOUNTS.filter(acc => acc.role === 'PE').map((account) => (
                  <MenuItem key={account.loginId} value={account.loginId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={account.role} 
                        size="small" 
                        sx={{ bgcolor: account.color, color: 'white', fontSize: '0.7rem' }} 
                      />
                      {account.name}
                    </Box>
                  </MenuItem>
                ))}
                
                {/* QA */}
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Quality Assurance
                </Typography>
                {SAMPLE_ACCOUNTS.filter(acc => acc.role === 'QA').map((account) => (
                  <MenuItem key={account.loginId} value={account.loginId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={account.role} 
                        size="small" 
                        sx={{ bgcolor: account.color, color: 'white', fontSize: '0.7rem' }} 
                      />
                      {account.name}
                    </Box>
                  </MenuItem>
                ))}
                
                {/* Ops */}
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  Operations
                </Typography>
                {SAMPLE_ACCOUNTS.filter(acc => acc.role === 'Ops').map((account) => (
                  <MenuItem key={account.loginId} value={account.loginId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={account.role} 
                        size="small" 
                        sx={{ bgcolor: account.color, color: 'white', fontSize: '0.7rem' }} 
                      />
                      {account.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedSampleAccount && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const account = SAMPLE_ACCOUNTS.find(acc => acc.loginId === selectedSampleAccount);
                    if (account) handleQuickLogin(account);
                  }}
                  disabled={isLoading}
                >
                  빠른 로그인
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedSampleAccount('');
                    setFormData({ loginId: '', password: '' });
                  }}
                >
                  초기화
                </Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              또는 직접 입력
            </Typography>
          </Divider>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="사용자명 또는 이메일"
              name="loginId"
              value={formData.loginId}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="username"
              autoFocus={!selectedSampleAccount}
            />
            
            <TextField
              fullWidth
              label="비밀번호"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '로그인'
              )}
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              테스트 계정: opuser / 1q2w3e4r
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginJWT;
