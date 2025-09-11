// [advice from AI] 역할별 계정 로그인 테스트 페이지
// 개발 및 테스트용 페이지

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';
import BackstageCard from '../components/layout/BackstageCard';

const TestLogin: React.FC = () => {
  const { login, user, logout } = useAuthStore();
  const [testResult, setTestResult] = useState<string>('');

  // [advice from AI] 역할별 계정 테스트 데이터
  const testAccounts = [
    {
      role: '시스템 관리자 (admin)',
      username: 'admin',
      password: '1q2w3e4r',
      color: 'error' as const,
    },
    {
      role: '최고 관리자 (executive)',
      username: 'executive',
      password: '1q2w3e4r',
      color: 'error' as const,
    },
    {
      role: 'PO (프로젝트 오너)',
      username: 'pouser',
      password: '1q2w3e4r',
      color: 'warning' as const,
    },
    {
      role: 'PE (프로젝트 엔지니어)',
      username: 'peuser',
      password: '1q2w3e4r',
      color: 'info' as const,
    },
    {
      role: 'QA/QC',
      username: 'qauser',
      password: '1q2w3e4r',
      color: 'success' as const,
    },
    {
      role: '운영팀',
      username: 'opuser',
      password: '1q2w3e4r',
      color: 'secondary' as const,
    },
  ];

  // [advice from AI] 테스트 로그인 핸들러
  const handleTestLogin = async (username: string, password: string, role: string) => {
    try {
      await login(username, password);
      setTestResult(`✅ ${role} 계정으로 로그인 성공!`);
    } catch (error: any) {
      setTestResult(`❌ ${role} 계정 로그인 실패: ${error.message}`);
    }
  };

  // [advice from AI] 로그아웃 핸들러
  const handleLogout = () => {
    logout();
    setTestResult('로그아웃되었습니다.');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        역할별 계정 로그인 테스트
      </Typography>

      {/* [advice from AI] 현재 로그인 상태 */}
      {user && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>현재 로그인된 사용자:</strong> {user.fullName} ({user.roleType})
          </Typography>
        </Alert>
      )}

      {/* [advice from AI] 테스트 결과 */}
      {testResult && (
        <Alert severity={testResult.includes('성공') ? 'success' : 'error'} sx={{ mb: 3 }}>
          {testResult}
        </Alert>
      )}

      {/* [advice from AI] 테스트 계정 목록 */}
      <BackstageCard title="테스트 계정 목록" variant="default">
        <Grid container spacing={2}>
          {testAccounts.map((account) => (
            <Grid item xs={12} sm={6} md={4} key={account.username}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%',
                  '&:hover': { 
                    boxShadow: 2,
                    borderColor: 'primary.main'
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip 
                      label={account.role} 
                      color={account.color}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    <strong>사용자명:</strong> {account.username}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    <strong>비밀번호:</strong> {account.password}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleTestLogin(account.username, account.password, account.role)}
                    disabled={user?.username === account.username}
                  >
                    {user?.username === account.username ? '현재 로그인됨' : '로그인 테스트'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </BackstageCard>

      {/* [advice from AI] 로그아웃 버튼 */}
      {user && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            sx={{ minWidth: 120 }}
          >
            로그아웃
          </Button>
        </Box>
      )}

      {/* [advice from AI] 사용 방법 안내 */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          사용 방법
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          1. 위의 계정 카드에서 "로그인 테스트" 버튼을 클릭하세요
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          2. 로그인 성공 시 해당 역할의 대시보드로 자동 리다이렉트됩니다
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          3. 각 역할별로 다른 메뉴와 기능에 접근할 수 있습니다
        </Typography>
        <Typography variant="body2" color="text.secondary">
          4. 로그아웃 후 다른 계정으로 테스트할 수 있습니다
        </Typography>
      </Paper>
    </Box>
  );
};

export default TestLogin;
