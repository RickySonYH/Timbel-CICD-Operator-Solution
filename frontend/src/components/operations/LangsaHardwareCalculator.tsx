// [advice from AI] 랭사 AICC 솔루션 하드웨어 계산기 - 배포 마법사 통합용
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Slider, TextField, FormControl,
  InputLabel, Select, MenuItem, Button, Alert, CircularProgress, Divider,
  Accordion, AccordionSummary, AccordionDetails, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

// [advice from AI] 랭사 AICC 솔루션 타입 정의
interface LangsaService {
  callbot: number;      // 콜봇 채널 수
  chatbot: number;      // 챗봇 채널 수
  advisor: number;      // 어드바이저 채널 수
  stt: number;          // STT 동시 처리 수
  tts: number;          // TTS 동시 처리 수
  ta: number;           // TA (Text Analytics) 처리 수
  qa: number;           // QA (Quality Assurance) 처리 수
}

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
    role: string;
    cpu_cores: number;
    ram_gb: number;
    quantity: number;
    gpu_type?: string;
  }>;
}

interface LangsaHardwareCalculatorProps {
  onResourceCalculated: (resources: { 
    cpu_cores: number; 
    memory_gb: number; 
    storage_gb: number; 
    gpu_specs: Array<{
      id: string;
      name: string;
      vram_gb: number;
      quantity: number;
      use_case: string;
      price_per_hour_usd: number;
    }>;
  }) => void;
  initialServices?: Partial<LangsaService>;
}

// [advice from AI] 클라우드 제공사별 인스턴스 추천 함수들
const getAWSInstance = (cpu: number, memory: number, gpu: number) => {
  if (gpu > 0) {
    if (cpu >= 16) return 'p3.2xlarge (V100 1개)';
    if (cpu >= 8) return 'p2.xlarge (K80 1개)';
    return 'g4dn.xlarge (T4 1개)';
  }
  if (cpu >= 32) return 'c5.8xlarge';
  if (cpu >= 16) return 'c5.4xlarge';
  if (cpu >= 8) return 'c5.2xlarge';
  if (cpu >= 4) return 'c5.xlarge';
  return 'c5.large';
};

const getNCPInstance = (cpu: number, memory: number, gpu: number) => {
  if (gpu > 0) {
    if (cpu >= 16) return 'GPU-V100-2 (V100 2개)';
    if (cpu >= 8) return 'GPU-V100-1 (V100 1개)';
    return 'GPU-T4-1 (T4 1개)';
  }
  if (cpu >= 32) return 'vCPU 32GB, 메모리 64GB';
  if (cpu >= 16) return 'vCPU 16GB, 메모리 32GB';
  if (cpu >= 8) return 'vCPU 8GB, 메모리 16GB';
  if (cpu >= 4) return 'vCPU 4GB, 메모리 8GB';
  return 'vCPU 2GB, 메모리 4GB';
};

const getKTInstance = (cpu: number, memory: number, gpu: number) => {
  if (gpu > 0) {
    if (cpu >= 16) return 'GPU Premium (V100)';
    return 'GPU Standard (T4)';
  }
  if (cpu >= 32) return 'Premium-32C64G';
  if (cpu >= 16) return 'Premium-16C32G';
  if (cpu >= 8) return 'Standard-8C16G';
  if (cpu >= 4) return 'Standard-4C8G';
  return 'Basic-2C4G';
};

const getAWSCost = (cpu: number, memory: number) => {
  const baseCost = cpu * 50 + memory * 10; // 대략적인 계산
  return Math.round(baseCost);
};

const getNCPCost = (cpu: number, memory: number) => {
  const baseCost = cpu * 45000 + memory * 8000; // 원화 기준
  return Math.round(baseCost);
};

const getKTCost = (cpu: number, memory: number) => {
  const baseCost = cpu * 48000 + memory * 9000; // 원화 기준
  return Math.round(baseCost);
};

const LangsaHardwareCalculator: React.FC<LangsaHardwareCalculatorProps> = ({
  onResourceCalculated,
  initialServices = {}
}) => {
  // [advice from AI] 랭사 서비스 요구사항 상태
  const [services, setServices] = useState<LangsaService>({
    callbot: initialServices.callbot || 0,
    chatbot: initialServices.chatbot || 0,
    advisor: initialServices.advisor || 0,
    stt: initialServices.stt || 0,
    tts: initialServices.tts || 0,
    ta: initialServices.ta || 0,
    qa: initialServices.qa || 0
  });

  const [calculationMode, setCalculationMode] = useState<'standard' | 'enterprise' | 'custom'>('standard');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HardwareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] 랭사 솔루션별 서비스 설정
  const serviceConfigs = {
    // 기본 AICC 솔루션
    standard: {
      name: '기본 AICC',
      description: '콜센터 기본 AI 솔루션',
      defaultChannels: { callbot: 10, chatbot: 5, advisor: 2, stt: 15, tts: 10, ta: 5, qa: 2 }
    },
    // 엔터프라이즈 AICC 솔루션
    enterprise: {
      name: '엔터프라이즈 AICC',
      description: '대규모 콜센터 AI 솔루션',
      defaultChannels: { callbot: 50, chatbot: 30, advisor: 10, stt: 80, tts: 60, ta: 20, qa: 10 }
    },
    // 커스텀 설정
    custom: {
      name: '커스텀 설정',
      description: '사용자 정의 채널 설정',
      defaultChannels: services
    }
  };

  // [advice from AI] 서비스 값 변경 핸들러
  const handleServiceChange = (serviceType: keyof LangsaService, value: number) => {
    setServices(prev => ({
      ...prev,
      [serviceType]: Math.max(0, value)
    }));
  };

  // [advice from AI] 계산 모드 변경 시 기본값 설정
  const handleModeChange = (mode: 'standard' | 'enterprise' | 'custom') => {
    setCalculationMode(mode);
    if (mode !== 'custom') {
      setServices(serviceConfigs[mode].defaultChannels);
    }
  };

  // [advice from AI] 하드웨어 리소스 계산
  const calculateResources = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔧 랭사 하드웨어 계산 시작:', services);

      const response = await fetch('/api/operations/calculate-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: services,
          gpu_type: 'auto',
          solution_type: 'langsa_aicc'
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.resources) {
        const calculatedResult: HardwareResult = {
          cpu_cores: Math.ceil(data.resources.cpu?.total || 0),
          memory_gb: Math.ceil(data.resources.actual_memory_gb || 0),
          storage_gb: Math.ceil((data.resources.storage?.yearly_tb || 1) * 1024),
          gpu_count: Math.ceil(data.resources.gpu?.total || 0),
          estimated_cost: {
            aws_monthly_usd: data.aws_cost_analysis?.total_monthly_cost_usd || 0,
            ncp_monthly_krw: data.ncp_cost_analysis?.total_monthly_cost_krw || 0
          },
          server_breakdown: data.server_config_table || []
        };

        setResult(calculatedResult);

        // [advice from AI] 부모 컴포넌트에 결과 전달 (GPU 사양 포함)
        onResourceCalculated({
          cpu_cores: calculatedResult.cpu_cores,
          memory_gb: calculatedResult.memory_gb,
          storage_gb: calculatedResult.storage_gb,
          gpu_specs: calculatedResult.gpu_specs || []
        });

        console.log('✅ 하드웨어 계산 완료:', calculatedResult);

      } else {
        throw new Error(data.message || '계산 결과를 받을 수 없습니다.');
      }

    } catch (err) {
      console.error('❌ 하드웨어 계산 실패:', err);
      setError(err instanceof Error ? err.message : '하드웨어 계산에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 총 채널 수 계산
  const totalChannels = services.callbot + services.chatbot + services.advisor;
  const totalProcessing = services.stt + services.tts + services.ta + services.qa;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        🤖 랭사 AICC 솔루션 하드웨어 계산기
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        랭사의 AICC 솔루션 구성에 맞춰 필요한 하드웨어 리소스를 자동 계산합니다.
      </Alert>

      {/* 솔루션 타입 선택 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            솔루션 타입 선택
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(serviceConfigs).map(([key, config]) => (
              <Grid item xs={12} md={4} key={key}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: calculationMode === key ? 2 : 1,
                    borderColor: calculationMode === key ? 'primary.main' : 'grey.300'
                  }}
                  onClick={() => handleModeChange(key as any)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="subtitle2">{config.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {config.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* 서비스 채널 설정 */}
      <Card sx={{ mb: 3, border: 2, borderColor: 'primary.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="subtitle2">
              📊 서비스 채널 설정 (필수 입력)
            </Typography>
            <Chip 
              label={`총 ${totalChannels}채널 + ${totalProcessing}처리`} 
              color="primary" 
              size="small"
            />
          </Box>
          
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>채널 수를 입력하세요!</strong> 프로젝트에 필요한 각 서비스의 동시 처리 채널 수를 입력하면 최적의 하드웨어 리소스를 계산합니다.
            </Typography>
          </Alert>
          
          <Grid container spacing={3}>
            {/* 고객 대화 서비스 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                🎯 고객 대화 서비스
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="콜봇 채널"
                value={services.callbot}
                onChange={(e) => handleServiceChange('callbot', parseInt(e.target.value) || 0)}
                helperText="음성 통화 AI 채널 수"
                inputProps={{ min: 0, max: 1000 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="챗봇 채널"
                value={services.chatbot}
                onChange={(e) => handleServiceChange('chatbot', parseInt(e.target.value) || 0)}
                helperText="텍스트 채팅 AI 채널 수"
                inputProps={{ min: 0, max: 1000 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="어드바이저 채널"
                value={services.advisor}
                onChange={(e) => handleServiceChange('advisor', parseInt(e.target.value) || 0)}
                helperText="상담원 지원 AI 채널 수"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            {/* AI 처리 서비스 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                🧠 AI 처리 서비스
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="STT 동시 처리"
                value={services.stt}
                onChange={(e) => handleServiceChange('stt', parseInt(e.target.value) || 0)}
                helperText="음성→텍스트 변환"
                inputProps={{ min: 0, max: 500 }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="TTS 동시 처리"
                value={services.tts}
                onChange={(e) => handleServiceChange('tts', parseInt(e.target.value) || 0)}
                helperText="텍스트→음성 변환"
                inputProps={{ min: 0, max: 500 }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="TA 처리량"
                value={services.ta}
                onChange={(e) => handleServiceChange('ta', parseInt(e.target.value) || 0)}
                helperText="텍스트 분석"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="QA 처리량"
                value={services.qa}
                onChange={(e) => handleServiceChange('qa', parseInt(e.target.value) || 0)}
                helperText="품질 분석"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 계산 버튼 */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={calculateResources}
          disabled={loading || totalChannels === 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? '계산 중...' : '하드웨어 리소스 계산'}
        </Button>
      </Box>

      {/* 에러 표시 */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* 계산 결과 */}
      {result && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 계산 결과
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary">{result.cpu_cores}</Typography>
                  <Typography variant="caption">CPU 코어</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.50', borderRadius: 1 }}>
                  <Typography variant="h4" color="secondary">{result.memory_gb}</Typography>
                  <Typography variant="caption">메모리 (GB)</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                  <Typography variant="h4" color="success.main">{result.storage_gb}</Typography>
                  <Typography variant="caption">스토리지 (GB)</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                  <Typography variant="h4" color="warning.main">{result.gpu_count}</Typography>
                  <Typography variant="caption">GPU 개수</Typography>
                </Box>
              </Grid>
            </Grid>

            {/* 클라우드 제공사별 인스턴스 추천 */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              ☁️ 클라우드 제공사별 추천 인스턴스
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'orange.50' }}>
                  <Typography variant="subtitle2" color="orange.main" gutterBottom>
                    🟠 AWS (Amazon Web Services)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>추천:</strong> {getAWSInstance(result.cpu_cores, result.memory_gb, result.gpu_count || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    예상 비용: ${getAWSCost(result.cpu_cores, result.memory_gb)}/월
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'green.50' }}>
                  <Typography variant="subtitle2" color="green.main" gutterBottom>
                    🟢 NCP (Naver Cloud Platform)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>추천:</strong> {getNCPInstance(result.cpu_cores, result.memory_gb, result.gpu_count || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    예상 비용: ₩{getNCPCost(result.cpu_cores, result.memory_gb).toLocaleString()}/월
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'blue.50' }}>
                  <Typography variant="subtitle2" color="blue.main" gutterBottom>
                    🔵 KT Cloud
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>추천:</strong> {getKTInstance(result.cpu_cores, result.memory_gb, result.gpu_count || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    예상 비용: ₩{getKTCost(result.cpu_cores, result.memory_gb).toLocaleString()}/월
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* 서버 구성 상세 */}
            {result.server_breakdown.length > 0 && (
              <Accordion>
                <AccordionSummary>
                  <Typography variant="subtitle2">서버 구성 상세</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>역할</TableCell>
                          <TableCell align="right">CPU</TableCell>
                          <TableCell align="right">메모리(GB)</TableCell>
                          <TableCell align="right">수량</TableCell>
                          <TableCell>GPU</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.server_breakdown.map((server, index) => (
                          <TableRow key={index}>
                            <TableCell>{server.role}</TableCell>
                            <TableCell align="right">{server.cpu_cores}</TableCell>
                            <TableCell align="right">{server.ram_gb}</TableCell>
                            <TableCell align="right">{server.quantity}</TableCell>
                            <TableCell>{server.gpu_type || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}

            {/* 비용 추정 */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>💰 월간 예상 비용</Typography>
              <Typography variant="body2">
                AWS: ${result.estimated_cost.aws_monthly_usd.toLocaleString()}/월<br/>
                NCP: ₩{result.estimated_cost.ncp_monthly_krw.toLocaleString()}/월
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default LangsaHardwareCalculator;
