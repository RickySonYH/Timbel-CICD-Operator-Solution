// [advice from AI] JWT 토큰 기반 로그인 페이지
// 세션 기반 인증의 문제점을 해결하고 토큰 기반으로 개선

import React, { useState } from 'react';
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
  Container
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';

const LoginJWT: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useJwtAuthStore();
  const [formData, setFormData] = useState({
    loginId: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
        navigate('/operations/tenant-center');
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
            <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
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
              autoFocus
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
