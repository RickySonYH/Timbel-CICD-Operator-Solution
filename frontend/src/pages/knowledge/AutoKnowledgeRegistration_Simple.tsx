// [advice from AI] 간단한 자동 등록 페이지 - React 오류 완전 해결
import React, { useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Stepper, Step, StepLabel, StepContent, Alert, CircularProgress
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

const AutoKnowledgeRegistration: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [sourceRepo, setSourceRepo] = useState({
    type: 'github',
    url: '',
    branch: 'main'
  });
  const [systemInfo, setSystemInfo] = useState({
    name: '',
    description: '',
    category: 'application',
    version: '1.0.0'
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateSourceUrl = (url: string, type: string): boolean => {
    if (type === 'github') {
      return /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/.test(url);
    }
    return false;
  };

  const handleStartExtraction = async () => {
    if (!validateSourceUrl(sourceRepo.url, sourceRepo.type)) {
      setError('유효하지 않은 GitHub URL입니다.');
      return;
    }

    if (!systemInfo.name.trim()) {
      setError('시스템명을 입력해주세요.');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setActiveStep(2);

    try {
      const response = await fetch('http://localhost:3001/api/knowledge-extraction/extract-from-source', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: sourceRepo,
          options: {
            extractCode: true,
            extractDocuments: true,
            extractDesignAssets: true,
            extractCatalogComponents: true,
            generateDiagrams: true,
            mapRelationships: true
          },
          system: systemInfo,
          approvalStrategy: 'system-first'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        setActiveStep(3);
      } else {
        throw new Error(result.message || '추출 실패');
      }

    } catch (err) {
      console.error('자동 추출 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          지식 자산 자동 등록
        </Typography>
        <Typography variant="body1" color="text.secondary">
          GitHub 레포지토리에서 지식 자산을 자동으로 추출하고 등록합니다.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* 1단계: 소스 설정 */}
            <Step>
              <StepLabel>소스 설정</StepLabel>
              <StepContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="GitHub 레포지토리 URL"
                      value={sourceRepo.url}
                      onChange={(e) => setSourceRepo({ ...sourceRepo, url: e.target.value })}
                      placeholder="https://github.com/username/repository"
                      error={sourceRepo.url !== '' && !validateSourceUrl(sourceRepo.url, 'github')}
                      helperText={sourceRepo.url !== '' && !validateSourceUrl(sourceRepo.url, 'github') 
                        ? '유효하지 않은 GitHub URL입니다.' 
                        : 'GitHub 레포지토리 URL을 입력하세요.'}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="브랜치"
                      value={sourceRepo.branch}
                      onChange={(e) => setSourceRepo({ ...sourceRepo, branch: e.target.value })}
                      placeholder="main"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={!validateSourceUrl(sourceRepo.url, 'github')}
                    startIcon={<GitHubIcon />}
                  >
                    다음 단계
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* 2단계: 시스템 정보 */}
            <Step>
              <StepLabel>시스템 정보</StepLabel>
              <StepContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="시스템명"
                      value={systemInfo.name}
                      onChange={(e) => setSystemInfo({ ...systemInfo, name: e.target.value })}
                      placeholder="시스템 이름을 입력하세요"
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="시스템 설명"
                      value={systemInfo.description}
                      onChange={(e) => setSystemInfo({ ...systemInfo, description: e.target.value })}
                      placeholder="시스템에 대한 설명을 입력하세요"
                      multiline
                      rows={3}
                      required
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveStep(0)}
                    sx={{ mr: 2 }}
                  >
                    이전
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleStartExtraction}
                    disabled={!systemInfo.name.trim() || !systemInfo.description.trim()}
                  >
                    추출 시작
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* 3단계: 추출 진행 */}
            <Step>
              <StepLabel>자동 추출</StepLabel>
              <StepContent>
                {isExtracting ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={60} sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      지식 자산 추출 중...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      레포지토리를 분석하고 있습니다. 잠시만 기다려주세요.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      ✅ 자동 추출 완료
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(3)}
                    >
                      결과 확인
                    </Button>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* 4단계: 결과 확인 */}
            <Step>
              <StepLabel>결과 확인</StepLabel>
              <StepContent>
                {success && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    지식 자산 추출이 성공적으로 완료되었습니다!
                  </Alert>
                )}
                
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setActiveStep(0);
                      setSuccess(false);
                      setSourceRepo({ type: 'github', url: '', branch: 'main' });
                      setSystemInfo({ name: '', description: '', category: 'application', version: '1.0.0' });
                    }}
                    sx={{ mr: 2 }}
                  >
                    새로 시작
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => window.location.href = '/admin/approvals/dashboard'}
                    startIcon={<CheckIcon />}
                  >
                    승인 신청으로
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AutoKnowledgeRegistration;
