// [advice from AI] 팀벨 회원가입 폼 - 일반적인 회사 가입 양식

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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  department: string;
  position: string;
  phoneNumber: string;
  reason: string;
}

// 팀벨 기본 부서 목록
const DEPARTMENTS = [
  '경영진',
  '기술개발팀', 
  '비즈니스개발팀',
  '품질보증팀',
  '마케팅팀',
  '영업팀',
  '고객지원팀',
  '기타'
];

// 기본 직책 목록  
const POSITIONS = [
  'CEO/대표',
  'CTO/기술이사',
  'VP/부사장', 
  '팀장/리더',
  '시니어 개발자',
  '개발자',
  '주니어 개발자',
  '기획자',
  '디자이너',
  '마케터',
  '영업담당자',
  '기타'
];

interface RegisterFormProps {
  onBack: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    position: '',
    phoneNumber: '',
    reason: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: keyof RegisterFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          department: formData.department,
          position: formData.position,
          phoneNumber: formData.phoneNumber,
          reason: formData.reason
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다');
      }

      setSuccess(data.message);
      
      // 3초 후 로그인 폼으로 이동
      setTimeout(() => {
        onBack();
      }, 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        py={2}
      >
        <Card sx={{ width: '100%', maxWidth: 600 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" align="center" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              Timbel 회원가입
            </Typography>
            <Typography variant="subtitle2" align="center" color="textSecondary" gutterBottom>
              (주)팀벨 Timeless Label
            </Typography>
            <Typography variant="body2" align="center" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
              프로젝트 관리 솔루션 이용 신청서
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
                <br />
                <Typography variant="caption">
                  3초 후 로그인 페이지로 이동합니다...
                </Typography>
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                {/* 기본 계정 정보 */}
                <Grid item xs={12}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    📝 계정 정보
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="사용자명 *"
                    value={formData.username}
                    onChange={handleChange('username')}
                    helperText="영문, 숫자, 언더스코어만 사용 (3-20자)"
                    required
                    disabled={isLoading}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="이메일 *"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    required
                    disabled={isLoading}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="비밀번호 *"
                    type="password"
                    value={formData.password}
                    onChange={handleChange('password')}
                    helperText="8자 이상, 대소문자, 숫자, 특수문자 포함"
                    required
                    disabled={isLoading}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="비밀번호 확인 *"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    required
                    disabled={isLoading}
                  />
                </Grid>

                {/* 개인 정보 */}
                <Grid item xs={12}>
                  <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
                    👤 개인 정보
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="이름 *"
                    value={formData.fullName}
                    onChange={handleChange('fullName')}
                    required
                    disabled={isLoading}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="휴대폰 번호"
                    value={formData.phoneNumber}
                    onChange={handleChange('phoneNumber')}
                    placeholder="010-1234-5678"
                    disabled={isLoading}
                  />
                </Grid>

                {/* 팀벨 소속 정보 */}
                <Grid item xs={12}>
                  <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
                    🏢 (주)팀벨 소속 정보
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    소속 회사: (주)팀벨 Timeless Label (자동 설정)
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required disabled={isLoading}>
                    <InputLabel>부서 *</InputLabel>
                    <Select
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      label="부서 *"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required disabled={isLoading}>
                    <InputLabel>직책 *</InputLabel>
                    <Select
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      label="직책 *"
                    >
                      {POSITIONS.map((pos) => (
                        <MenuItem key={pos} value={pos}>
                          {pos}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 신청 사유 */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="플랫폼 이용 목적"
                    multiline
                    rows={3}
                    value={formData.reason}
                    onChange={handleChange('reason')}
                    placeholder="Timbel 프로젝트 관리 솔루션을 어떤 용도로 사용하고 싶으신지 간단히 작성해 주세요."
                    disabled={isLoading}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onBack}
                  disabled={isLoading}
                  sx={{ flex: 1 }}
                >
                  로그인으로 돌아가기
                </Button>
                
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isLoading || !formData.username || !formData.email || !formData.password || !formData.fullName || !formData.department || !formData.position || formData.password !== formData.confirmPassword}
                  sx={{ flex: 1 }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    '가입 신청'
                  )}
                </Button>
              </Box>
            </Box>

            <Typography variant="caption" align="center" color="textSecondary" sx={{ mt: 3, display: 'block' }}>
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

export default RegisterForm;
