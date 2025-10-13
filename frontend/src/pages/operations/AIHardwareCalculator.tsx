// [advice from AI] AI 하드웨어 자동 계산기 - ECP-AI 채널별 리소스 계산 및 인스턴스 ID 자동 생성
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 하드웨어 계산 결과 타입
interface HardwareResult {
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  gpu_count: number;
  estimated_cost: {
    aws_monthly_usd: number;
    ncp_monthly_krw: number;
  };
  server_breakdown: Array<{
    service: string;
    cpu: number;
    memory: number;
    gpu: number;
    instance_id: string;
  }>;
}

// [advice from AI] ECP-AI 서비스 채널 설정
interface ServiceChannels {
  callbot: number;    // 콜봇 채널
  chatbot: number;    // 챗봇 채널  
  advisor: number;    // 어드바이저 채널
  stt: number;        // 음성인식 채널
  tts: number;        // 음성합성 채널
  ta: number;         // 텍스트 분석 채널
  qa: number;         // 질의응답 채널
}

const AIHardwareCalculator: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  // 서비스 채널 설정
  const [serviceChannels, setServiceChannels] = useState<ServiceChannels>({
    callbot: 10,
    chatbot: 20,
    advisor: 5,
    stt: 15,
    tts: 10,
    ta: 10,
    qa: 5
  });

  // 계산 결과
  const [hardwareResult, setHardwareResult] = useState<HardwareResult | null>(null);
  
  // 프리셋 설정
  const [selectedPreset, setSelectedPreset] = useState('standard');
  
  const presets = {
    minimal: {
      name: '최소 구성 (개발/테스트)',
      description: '개발 및 테스트 환경용 최소 리소스',
      channels: { callbot: 2, chatbot: 5, advisor: 1, stt: 3, tts: 2, ta: 2, qa: 1 }
    },
    standard: {
      name: '표준 구성 (중소기업)',
      description: '중소기업 운영 환경용 표준 리소스',
      channels: { callbot: 10, chatbot: 20, advisor: 5, stt: 15, tts: 10, ta: 10, qa: 5 }
    },
    enterprise: {
      name: '엔터프라이즈 구성 (대기업)',
      description: '대기업 운영 환경용 고성능 리소스',
      channels: { callbot: 50, chatbot: 100, advisor: 20, stt: 80, tts: 60, ta: 40, qa: 30 }
    },
    custom: {
      name: '사용자 정의',
      description: '직접 채널 수를 설정',
      channels: serviceChannels
    }
  };

  // [advice from AI] 하드웨어 리소스 계산
  const calculateHardware = async () => {
    try {
      setCalculating(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/operations/calculate-resources', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requirements: serviceChannels,
          gpu_type: 'auto',
          solution_type: 'langsa_aicc'
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.resources) {
        const result: HardwareResult = {
          cpu_cores: Math.ceil(data.resources.cpu?.total || 0),
          memory_gb: Math.ceil(data.resources.actual_memory_gb || 0),
          storage_gb: Math.ceil((data.resources.storage?.yearly_tb || 1) * 1024),
          gpu_count: Math.ceil(data.resources.gpu?.total || 0),
          estimated_cost: {
            aws_monthly_usd: data.aws_cost_analysis?.total_monthly_cost_usd || 0,
            ncp_monthly_krw: data.ncp_cost_analysis?.total_monthly_cost_krw || 0
          },
          server_breakdown: (data.server_config_table || []).map((server: any, index: number) => ({
            service: server.service || `AI-Service-${index + 1}`,
            cpu: server.cpu || 0,
            memory: server.memory || 0,
            gpu: server.gpu || 0,
            instance_id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 8)}` // 자동 ID 생성
          }))
        };

        setHardwareResult(result);
        
      } else {
        throw new Error(data.message || '계산 결과를 받을 수 없습니다.');
      }

    } catch (error) {
      console.error('하드웨어 계산 실패:', error);
      alert('하드웨어 계산에 실패했습니다.');
    } finally {
      setCalculating(false);
    }
  };

  // [advice from AI] 프리셋 변경 처리
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setServiceChannels(presets[preset].channels);
    }
  };

  // [advice from AI] 채널 수 변경 처리
  const handleChannelChange = (service: keyof ServiceChannels, value: number) => {
    setServiceChannels(prev => ({
      ...prev,
      [service]: Math.max(0, value)
    }));
    setSelectedPreset('custom');
  };

  // [advice from AI] 총 채널 수 계산
  const totalChannels = Object.values(serviceChannels).reduce((sum, val) => sum + val, 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        AI 하드웨어 자동 계산기
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        ECP-AI 서비스 채널별 하드웨어 리소스 자동 계산 및 인스턴스 ID 생성
      </Typography>

      <Grid container spacing={4}>
        {/* [advice from AI] 좌측: 설정 패널 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="서비스 채널 설정" />
            <CardContent>
              {/* 프리셋 선택 */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>프리셋 선택</InputLabel>
                <Select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                >
                  {Object.entries(presets).map(([key, preset]) => (
                    <MenuItem key={key} value={key}>
                      {preset.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {presets[selectedPreset]?.description}
              </Typography>

              {/* 채널별 설정 */}
              <Grid container spacing={2}>
                {Object.entries(serviceChannels).map(([service, count]) => (
                  <Grid item xs={6} key={service}>
                    <TextField
                      label={`${service.toUpperCase()} 채널`}
                      type="number"
                      size="small"
                      fullWidth
                      value={count}
                      onChange={(e) => handleChannelChange(
                        service as keyof ServiceChannels, 
                        parseInt(e.target.value) || 0
                      )}
                      InputProps={{ inputProps: { min: 0, max: 1000 } }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                총 {totalChannels}개 채널 설정됨
              </Alert>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={calculateHardware}
                disabled={calculating || totalChannels === 0}
                sx={{ mt: 3 }}
              >
                {calculating ? '계산 중...' : '하드웨어 리소스 계산'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 우측: 계산 결과 */}
        <Grid item xs={12} md={6}>
          {hardwareResult ? (
            <Card>
              <CardHeader title="계산 결과" />
              <CardContent>
                {/* 총 리소스 요약 */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {hardwareResult.cpu_cores}
                      </Typography>
                      <Typography variant="body2">CPU 코어</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {hardwareResult.memory_gb}GB
                      </Typography>
                      <Typography variant="body2">메모리</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {hardwareResult.storage_gb}GB
                      </Typography>
                      <Typography variant="body2">스토리지</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="secondary.main">
                        {hardwareResult.gpu_count}
                      </Typography>
                      <Typography variant="body2">GPU</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* 비용 추정 */}
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>예상 월 비용:</strong><br/>
                  AWS: ${hardwareResult.estimated_cost.aws_monthly_usd.toLocaleString()}<br/>
                  NCP: ₩{hardwareResult.estimated_cost.ncp_monthly_krw.toLocaleString()}
                </Alert>

                {/* 서비스별 상세 */}
                {hardwareResult.server_breakdown.length > 0 && (
                  <Accordion>
                    <AccordionSummary>
                      <Typography variant="subtitle1">
                        서비스별 상세 리소스 ({hardwareResult.server_breakdown.length}개 인스턴스)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>서비스</TableCell>
                              <TableCell>CPU</TableCell>
                              <TableCell>메모리</TableCell>
                              <TableCell>GPU</TableCell>
                              <TableCell>인스턴스 ID</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {hardwareResult.server_breakdown.map((server, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Chip 
                                    label={server.service}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>{server.cpu} 코어</TableCell>
                                <TableCell>{server.memory}GB</TableCell>
                                <TableCell>{server.gpu > 0 ? `${server.gpu}개` : '-'}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {server.instance_id}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* 배포 액션 */}
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => navigate('/operations/repository-deploy', {
                      state: { 
                        hardwareResult,
                        serviceChannels,
                        repositoryUrl: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator'
                      }
                    })}
                  >
                    이 설정으로 배포
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setHardwareResult(null)}
                  >
                    다시 계산
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box textAlign="center" sx={{ py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    하드웨어 리소스 계산 결과
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    좌측에서 서비스 채널을 설정하고 "계산" 버튼을 눌러주세요.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* [advice from AI] 하단: ECP-AI 서비스 설명 */}
      <Card sx={{ mt: 4 }}>
        <CardHeader title="ECP-AI 서비스 채널 설명" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>핵심 AI 서비스</Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" paragraph><strong>CallBot:</strong> 음성 통화 기반 AI 상담 서비스</Typography>
                <Typography variant="body2" paragraph><strong>ChatBot:</strong> 텍스트 기반 AI 챗봇 서비스</Typography>
                <Typography variant="body2" paragraph><strong>Advisor:</strong> AI 전문가 상담 서비스</Typography>
                <Typography variant="body2" paragraph><strong>STT:</strong> 음성을 텍스트로 변환하는 서비스</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>지원 AI 서비스</Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" paragraph><strong>TTS:</strong> 텍스트를 음성으로 변환하는 서비스</Typography>
                <Typography variant="body2" paragraph><strong>TA:</strong> 텍스트 분석 및 감정 분석 서비스</Typography>
                <Typography variant="body2" paragraph><strong>QA:</strong> 질의응답 및 FAQ 처리 서비스</Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Alert severity="info">
            <strong>자동 계산 기능:</strong><br/>
            • 채널별 동시 처리 용량 기반 CPU/메모리/GPU 자동 계산<br/>
            • 서비스별 인스턴스 ID 자동 생성 (ai-timestamp-random)<br/>
            • AWS/NCP 클라우드 비용 자동 추정<br/>
            • Kubernetes 리소스 스펙 자동 생성
          </Alert>
        </CardContent>
      </Card>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canManageDeployment && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          AI 하드웨어 계산기에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default AIHardwareCalculator;
