import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  Chip,
  Card,
  CardContent,
  Slider,
  TextField,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  Cloud as CloudIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] ECP-AI K8s 하드웨어 계산기 - 슬라이더 기반 입력
// [advice from AI] RDC API 응답 타입 정의
interface RDCAPIResponse {
  success: boolean;
  message: string;
  resources: {
    actual_memory_gb: number;
    gpu: {
      tts: number;
      nlp: number;
      aicm: number;
      total: number;
    };
    cpu: {
      stt: number;
      ta: number;
      qa: number;
      infrastructure: number;
      total: number;
    };
    stt_breakdown: {
      callbot: number;
      advisor: number;
      standalone: number;
    };
    nlp_breakdown: {
      callbot: number;
      chatbot: number;
      advisor: number;
      ta: number;
    };
    aicm_breakdown: {
      callbot: number;
      chatbot: number;
      advisor: number;
    };
  };
  server_config_table: Array<{
    role: string;
    cpu_cores: number;
    ram_gb: number;
    quantity: number;
    ebs_gb: string;
    instance_storage_gb: number;
    nas: string;
    gpu_type: string;
    gpu_ram_gb: string;
    gpu_quantity: string;
  }>;
  hardware_specification: {
    gpu_servers: Array<any>;
    cpu_servers: Array<any>;
    infrastructure_servers: Array<any>;
  };
  aws_cost_analysis: {
    total_monthly_cost_usd: number;
    total_annual_cost_usd: number;
    breakdown: any;
    instance_breakdown: Array<{
      server_role: string;
      total_monthly_cost: number;
      quantity: number;
      aws_instance: {
        instance_type: string;
        vcpu: number;
        memory_gb: number;
        gpu_count?: number;
        gpu_type?: string;
      };
    }>;
  };
  ncp_cost_analysis: {
    total_monthly_cost_krw: number;
    total_annual_cost_krw: number;
    breakdown: any;
    instance_breakdown: Array<{
      server_role: string;
      total_monthly_cost: number;
      quantity: number;
      ncp_instance: {
        instance_type: string;
        vcpu: number;
        memory_gb: number;
        gpu_count?: number;
        gpu_type?: string;
      };
    }>;
  };
}

interface ServiceInput {
  value: number;
  max: number;
  color: string;
}

interface ServerConfiguration {
  role: string;
  vcpu: number;
  vram: number;
  quantity: number;
  vdiskEbs: number;
  vdiskInstance: number;
  nas: string;
  gpu: string;
  gpuRam: number;
  gpuQuantity: number;
}

interface CalculationResult {
  channels: number;
  users: number;
  gpu: number;
  cpu: number;
  memory: number;
  storage: number;
  status: 'waiting' | 'calculating' | 'completed' | 'error';
  message?: string;
  // [advice from AI] 상세 서버 구성 정보
  serverConfigurations?: ServerConfiguration[];
  totalServers?: number;
  totalMemory?: number;
  totalStorage?: number;
  gpuRequirements?: {
    ttsGpu: number;
    nlpGpu: number;
    aicmGpu: number;
    totalGpu: number;
    totalVram: number;
  };
  cpuRequirements?: {
    sttCpu: number;
    taCpu: number;
    qaCpu: number;
    dbServerCpu: number;
    infrastructureCpu: number;
    totalCpu: number;
  };
  memoryRequirements?: {
    totalMemory: number;
  };
  // [advice from AI] 비용 분석 정보 추가
  costAnalysis?: {
    aws: {
      monthlyUsd: number;
      annualUsd: number;
      breakdown: Array<{
        role: string;
        cost: number;
        instanceType: string;
        quantity: number;
      }>;
    };
    ncp: {
      monthlyKrw: number;
      annualKrw: number;
      breakdown: Array<{
        role: string;
        cost: number;
        instanceType: string;
        quantity: number;
      }>;
    };
  };
}

const HardwareCalculator: React.FC = () => {
  // [advice from AI] 메인 서비스 슬라이더 상태
  const [mainServices, setMainServices] = useState<{ [key: string]: ServiceInput }>({
    callbot: { value: 0, max: 500, color: '#9c27b0' },
    chatbot: { value: 0, max: 2000, color: '#ff9800' },
    advisor: { value: 0, max: 1000, color: '#4caf50' }
  });

  // [advice from AI] 지원 서비스 슬라이더 상태
  const [supportServices, setSupportServices] = useState<{ [key: string]: ServiceInput }>({
    stt: { value: 0, max: 500, color: '#2196f3' },
    tts: { value: 0, max: 500, color: '#ff9800' },
    ta: { value: 0, max: 3000, color: '#4caf50' },
    qa: { value: 0, max: 2000, color: '#f44336' }
  });

  // [advice from AI] 계산 결과 상태
  const [result, setResult] = useState<CalculationResult>({
    channels: 0,
    users: 0,
    gpu: 0,
    cpu: 0,
    memory: 0,
    storage: 0,
    status: 'waiting'
  });

  // [advice from AI] 상세보기 상태
  const [showDetails, setShowDetails] = useState(false);

  // [advice from AI] 슬라이더 값 변경 핸들러
  const handleMainServiceChange = (service: string, value: number) => {
    setMainServices(prev => ({
      ...prev,
      [service]: { ...prev[service], value }
    }));
  };

  const handleSupportServiceChange = (service: string, value: number) => {
    setSupportServices(prev => ({
      ...prev,
      [service]: { ...prev[service], value }
    }));
  };

  // [advice from AI] RDC API 호출 함수 - 실제 JSON 응답 처리
  const calculateHardware = async () => {
    setResult(prev => ({ ...prev, status: 'calculating' }));

    try {
      // [advice from AI] API 가이드에 따른 올바른 요청 데이터 구성
      const requestData = {
        requirements: {
          callbot: mainServices.callbot.value,
          chatbot: mainServices.chatbot.value,
          advisor: mainServices.advisor.value,
          stt: supportServices.stt.value,
          tts: supportServices.tts.value,
          ta: supportServices.ta.value,
          qa: supportServices.qa.value
        },
        gpu_type: "auto"
      };

      console.log('RDC API 호출:', requestData);

      // [advice from AI] 직접 API URL 사용 (개발 환경)
      const apiUrl = 'http://localhost:3001';
      console.log('API URL:', apiUrl);
      console.log('Request Data:', requestData);
      
      const response = await fetch(`${apiUrl}/api/operations/calculate-resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
      }

      const data: RDCAPIResponse = await response.json();
      console.log('RDC API 응답:', data);
      console.log('응답 상태:', response.status, response.statusText);

      if (data.success) {
        // [advice from AI] API 응답에서 필요한 데이터 추출
        const resources = data.resources || {};
        const serverConfigTable = data.server_config_table || [];
        
        // [advice from AI] 서버 구성 정보 생성 (실제 API 응답 구조 사용)
        const serverConfigurations: ServerConfiguration[] = serverConfigTable.map((server) => ({
          role: server.role,
          vcpu: server.cpu_cores,
          vram: server.ram_gb,
          quantity: server.quantity,
          vdiskEbs: server.ebs_gb === '-' ? 0 : parseInt(server.ebs_gb) || 0,
          vdiskInstance: server.instance_storage_gb || 0,
          nas: server.nas || '-',
          gpu: server.gpu_type || '-',
          gpuRam: server.gpu_ram_gb === '-' ? 0 : parseInt(server.gpu_ram_gb) || 0,
          gpuQuantity: server.gpu_quantity === '-' ? 0 : parseInt(server.gpu_quantity) || 0
        }));

        // [advice from AI] 총계 계산
        const totalServers = serverConfigurations.reduce((sum, server) => sum + server.quantity, 0);
        const totalMemory = serverConfigurations.reduce((sum, server) => sum + (server.vram * server.quantity), 0);
        const totalStorage = serverConfigurations.reduce((sum, server) => sum + (server.vdiskInstance * server.quantity), 0);
        const totalGpu = serverConfigurations.reduce((sum, server) => sum + (server.gpuQuantity * server.quantity), 0);

        // [advice from AI] GPU 요구사항 계산 (실제 API 데이터 사용)
        const gpuRequirements = {
          ttsGpu: resources.gpu?.tts || 0,
          nlpGpu: resources.gpu?.nlp || 0,
          aicmGpu: resources.gpu?.aicm || 0,
          totalGpu: resources.gpu?.total || totalGpu,
          totalVram: totalGpu * 16 // T4 기준
        };

        // [advice from AI] CPU 요구사항 계산 (실제 API 데이터 사용)
        const cpuRequirements = {
          sttCpu: resources.cpu?.stt || 0,
          taCpu: resources.cpu?.ta || 0,
          qaCpu: resources.cpu?.qa || 0,
          dbServerCpu: resources.cpu?.infrastructure || 0,
          infrastructureCpu: resources.cpu?.infrastructure || 0,
          totalCpu: Math.ceil(resources.cpu?.total || 0) // [advice from AI] 소수점 올림 처리
        };

        // [advice from AI] 채널 및 전체 서버 수 계산 (모든 서비스 합산)
        const totalChannels = mainServices.callbot.value + mainServices.chatbot.value + 
                             mainServices.advisor.value + supportServices.stt.value + 
                             supportServices.tts.value + supportServices.ta.value + 
                             supportServices.qa.value;
        const totalServersFromAPI = serverConfigurations.reduce((sum, server) => sum + server.quantity, 0);

        // [advice from AI] 비용 분석 데이터 추출
        const costAnalysis = {
          aws: {
            monthlyUsd: data.aws_cost_analysis?.total_monthly_cost_usd || 0,
            annualUsd: data.aws_cost_analysis?.total_annual_cost_usd || 0,
            breakdown: (data.aws_cost_analysis?.instance_breakdown || []).map((item: any) => ({
              role: item.server_role,
              cost: item.total_monthly_cost,
              instanceType: item.aws_instance?.instance_type || '',
              quantity: item.quantity
            }))
          },
          ncp: {
            monthlyKrw: data.ncp_cost_analysis?.total_monthly_cost_krw || 0,
            annualKrw: data.ncp_cost_analysis?.total_annual_cost_krw || 0,
            breakdown: (data.ncp_cost_analysis?.instance_breakdown || []).map((item: any) => ({
              role: item.server_role,
              cost: item.total_monthly_cost,
              instanceType: item.ncp_instance?.instance_type || '',
              quantity: item.quantity
            }))
          }
        };

        setResult({
          channels: totalChannels,
          users: totalServersFromAPI, // 전체 서버 대수로 변경
          gpu: totalGpu,
          cpu: Math.ceil(cpuRequirements.totalCpu), // [advice from AI] 소수점 올림 처리
          memory: Math.round(resources.actual_memory_gb || totalMemory),
          storage: Math.round(totalStorage / 1024), // GB로 변환
          status: 'completed',
          serverConfigurations,
          totalServers: totalServersFromAPI,
          totalMemory: Math.round(resources.actual_memory_gb || totalMemory),
          totalStorage: Math.round(totalStorage / 1024), // GB로 변환
          gpuRequirements,
          cpuRequirements,
          memoryRequirements: {
            totalMemory: Math.round(resources.actual_memory_gb || totalMemory)
          },
          costAnalysis
        });
      } else {
        throw new Error(data.message || 'API 계산 실패');
      }

    } catch (error) {
      console.error('하드웨어 계산 API 호출 실패:', error);
      
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      setResult({
        channels: 0,
        users: 0,
        gpu: 0,
        cpu: 0,
        memory: 0,
        storage: 0,
        status: 'error',
        message: `API 연결 실패: ${errorMessage}`
      });
    }
  };

  // [advice from AI] 실시간 계산 (슬라이더 변경 시)
  useEffect(() => {
    const hasInput = Object.values(mainServices).some(s => s.value > 0) || 
                     Object.values(supportServices).some(s => s.value > 0);
    
    if (hasInput) {
      calculateHardware();
    } else {
      setResult(prev => ({ ...prev, status: 'waiting' }));
    }
  }, [mainServices, supportServices]);

  // [advice from AI] 슬라이더 컴포넌트
  const ServiceSlider = ({ 
    label, 
    value, 
    max, 
    color, 
    onChange 
  }: { 
    label: string; 
    value: number; 
    max: number; 
    color: string; 
    onChange: (value: number) => void;
  }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}: {value}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Slider
          value={value}
          onChange={(_, newValue) => onChange(newValue as number)}
          min={0}
          max={max}
          step={1}
          sx={{
            flex: 1,
            color: color,
            '& .MuiSlider-thumb': {
              backgroundColor: color,
            },
            '& .MuiSlider-track': {
              backgroundColor: color,
            },
            '& .MuiSlider-rail': {
              backgroundColor: color + '30',
            }
          }}
        />
        <TextField
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          size="small"
          sx={{ width: 80 }}
          inputProps={{ min: 0, max: max }}
        />
      </Box>
    </Box>
  );

  return (
    <Box>
      {/* [advice from AI] 하드웨어 계산기 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          ECP-AI K8s 하드웨어 계산기
        </Typography>
        <Typography variant="body1" color="text.secondary">
          서비스 사용량에 따른 하드웨어 리소스 자동 계산
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* [advice from AI] 메인 서비스 패널 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="메인 서비스" variant="default">
            <ServiceSlider
              label="콜봇 (채널)"
              value={mainServices.callbot.value}
              max={mainServices.callbot.max}
              color={mainServices.callbot.color}
              onChange={(value) => handleMainServiceChange('callbot', value)}
            />
            <ServiceSlider
              label="챗봇 (사용자)"
              value={mainServices.chatbot.value}
              max={mainServices.chatbot.max}
              color={mainServices.chatbot.color}
              onChange={(value) => handleMainServiceChange('chatbot', value)}
            />
            <ServiceSlider
              label="어드바이저 (상담사)"
              value={mainServices.advisor.value}
              max={mainServices.advisor.max}
              color={mainServices.advisor.color}
              onChange={(value) => handleMainServiceChange('advisor', value)}
            />
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 지원 서비스 패널 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="지원 서비스" variant="default">
            <ServiceSlider
              label="STT (독립 채널)"
              value={supportServices.stt.value}
              max={supportServices.stt.max}
              color={supportServices.stt.color}
              onChange={(value) => handleSupportServiceChange('stt', value)}
            />
            <ServiceSlider
              label="TTS (독립 채널)"
              value={supportServices.tts.value}
              max={supportServices.tts.max}
              color={supportServices.tts.color}
              onChange={(value) => handleSupportServiceChange('tts', value)}
            />
            <ServiceSlider
              label="TA (분석 건수)"
              value={supportServices.ta.value}
              max={supportServices.ta.max}
              color={supportServices.ta.color}
              onChange={(value) => handleSupportServiceChange('ta', value)}
            />
            <ServiceSlider
              label="QA (평가 건수)"
              value={supportServices.qa.value}
              max={supportServices.qa.max}
              color={supportServices.qa.color}
              onChange={(value) => handleSupportServiceChange('qa', value)}
            />
          </BackstageCard>
        </Grid>
      </Grid>

      {/* [advice from AI] 실시간 계산 결과 */}
      <Box sx={{ mt: 4 }}>
        <BackstageCard title="실시간 예상 계산 (실제 가중치 기반)" variant="default">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              실시간 예상 계산 (실제 가중치 기반)
            </Typography>
            <Chip 
              label={
                result.status === 'waiting' ? '대기 중' :
                result.status === 'calculating' ? '계산 중' :
                result.status === 'completed' ? '완료' : '오류'
              }
              color={
                result.status === 'waiting' ? 'default' :
                result.status === 'calculating' ? 'warning' :
                result.status === 'completed' ? 'success' : 'error'
              }
            />
          </Box>

          {result.status === 'calculating' && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                rdc.rickyson.com API에서 리소스를 계산하고 있습니다...
              </Typography>
            </Box>
          )}

          {result.message && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {result.message}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            메인서비스 또는 지원서비스를 선택하시면 실시간으로 필요한 리소스가 계산됩니다.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {result.channels}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    채널
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {result.users}대
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 서버
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {result.gpu}개
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    GPU
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                    {result.cpu}코어
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CPU
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                null
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    메모리
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {result.memory}GB
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                null
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    스토리지
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {result.storage}GB
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* [advice from AI] 상세보기 버튼 */}
          {result.status === 'completed' && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                onClick={() => setShowDetails(!showDetails)}
                startIcon={showDetails ? null : null}
                sx={{ minWidth: 200 }}
              >
                {showDetails ? '상세보기 닫기' : '상세 하드웨어 구성 보기'}
              </Button>
            </Box>
          )}

          {/* [advice from AI] 상세 하드웨어 구성 (상세보기 버튼 클릭 시) */}
          {showDetails && result.serverConfigurations && result.serverConfigurations.length > 0 && (
            <Box sx={{ mt: 4 }}>
              {/* [advice from AI] 권장 하드웨어 구성 */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'primary.main' }}>
                권장 하드웨어 구성
              </Typography>

              {/* [advice from AI] AI 처리 서버 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  AI 처리 서버
                </Typography>
                <Grid container spacing={2}>
                  {result.serverConfigurations.filter(server => server.gpu !== '-').map((server, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {server.role}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            GPU: {server.gpu} {server.gpuQuantity}개, CPU: {server.vcpu}코어, RAM: {server.vram}GB
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            스토리지: {server.vdiskInstance}GB, 수량: {server.quantity}대
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* [advice from AI] 음성/텍스트 처리 서버 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  음성/텍스트 처리 서버
                </Typography>
                <Grid container spacing={2}>
                  {result.serverConfigurations.filter(server => 
                    server.role.includes('STT') || server.role.includes('TA') || server.role.includes('QA')
                  ).map((server, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {server.role}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            CPU: {server.vcpu}코어, RAM: {server.vram}GB
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            스토리지: {server.vdiskInstance}GB, 수량: {server.quantity}대
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* [advice from AI] 공통 서비스 서버 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  공통 서비스 서버
                </Typography>
                <Grid container spacing={2}>
                  {result.serverConfigurations.filter(server => 
                    server.role.includes('Nginx') || server.role.includes('API Gateway') || 
                    server.role.includes('PostgreSQL') || server.role.includes('VectorDB') || 
                    server.role.includes('Auth') || server.role.includes('NAS')
                  ).map((server, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {server.role}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            CPU: {server.vcpu}코어, RAM: {server.vram}GB
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            스토리지: {server.vdiskInstance}GB, 수량: {server.quantity}대
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* [advice from AI] 네트워크 요구사항 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  네트워크 요구사항
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      10 Gbps
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* [advice from AI] 인프라 참고사항 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  인프라 참고사항
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body1" color="text.secondary">
                      이중화 구성 권장, 모니터링 시스템 필수
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* [advice from AI] 시스템 요약 */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  시스템 요약
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {result.totalServers}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          총 서버
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {result.totalMemory}GB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          총 메모리
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                          {result.totalStorage}GB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          총 스토리지
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                          {result.gpu}개
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          총 GPU
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* [advice from AI] 비용 분석 섹션 */}
              {result.costAnalysis && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                    💰 클라우드별 비용 분석
                  </Typography>
                  <Grid container spacing={3}>
                    {/* AWS 비용 */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#ff9900' }}>
                            🌐 AWS 비용
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              ${result.costAnalysis.aws.monthlyUsd.toLocaleString()}/월
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              연간: ${result.costAnalysis.aws.annualUsd.toLocaleString()}
                            </Typography>
                          </Box>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            주요 비용 항목:
                          </Typography>
                          {result.costAnalysis.aws.breakdown.slice(0, 3).map((item, index) => (
                            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {item.role} ({item.instanceType})
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ${item.cost.toLocaleString()}
                              </Typography>
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* NCP 비용 */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#00c73c' }}>
                            🇰🇷 NCP 비용
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                              ₩{result.costAnalysis.ncp.monthlyKrw.toLocaleString()}/월
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              연간: ₩{result.costAnalysis.ncp.annualKrw.toLocaleString()}
                            </Typography>
                          </Box>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            주요 비용 항목:
                          </Typography>
                          {result.costAnalysis.ncp.breakdown.slice(0, 3).map((item, index) => (
                            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {item.role} ({item.instanceType})
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ₩{item.cost.toLocaleString()}
                              </Typography>
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* [advice from AI] 서버 구성 상세 테이블 */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                서버 구성 상세
              </Typography>
              <Paper sx={{ overflow: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>서버 역할</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>vCPU (Core)</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>vRAM (GB)</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>수량 (서버)</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>vDisk (EBS/GB)</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>vDisk (인스턴스 스토리지/GB)</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>NAS</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>GPU</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>GPU RAM(GB)</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'grey.100' }}>수량</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.serverConfigurations.map((server, index) => (
                      <TableRow key={index}>
                        <TableCell>{server.role}</TableCell>
                        <TableCell>{server.vcpu}</TableCell>
                        <TableCell>{server.vram}</TableCell>
                        <TableCell>{server.quantity}</TableCell>
                        <TableCell>{server.vdiskEbs}</TableCell>
                        <TableCell>{server.vdiskInstance}</TableCell>
                        <TableCell>{server.nas}</TableCell>
                        <TableCell>{server.gpu}</TableCell>
                        <TableCell>{server.gpuRam}</TableCell>
                        <TableCell>{server.gpuQuantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}
        </BackstageCard>
      </Box>
    </Box>
  );
};

export default HardwareCalculator;