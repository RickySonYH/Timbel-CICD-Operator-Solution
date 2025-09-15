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
  Container
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

const LoginJWT: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, checkTokenExpiration } = useJwtAuthStore();
  const [formData, setFormData] = useState({
    loginId: '',
    password: ''
  });
  const [error, setError] = useState('');

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
