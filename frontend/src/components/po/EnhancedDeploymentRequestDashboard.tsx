// [advice from AI] 개선된 PO 배포 요청 대시보드 - 하드웨어 계산기 통합 + 커스텀 모드
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Grid, Alert, Chip, Card, CardContent,
  Slider, TextField, Divider, LinearProgress, FormControl, InputLabel,
  Select, MenuItem, Switch, FormControlLabel, Stepper, Step, StepLabel,
  StepContent, Accordion, AccordionSummary, AccordionDetails, Dialog,
  DialogTitle, DialogContent, DialogActions, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip
} from '@mui/material';
import {
  Memory as MemoryIcon, Speed as SpeedIcon, Storage as StorageIcon,
  Security as SecurityIcon, Timeline as TimelineIcon, Build as BuildIcon,
  Cloud as CloudIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon, Info as InfoIcon, Refresh as RefreshIcon,
  Settings as SettingsIcon, Assessment as AssessmentIcon,
  Schedule as ScheduleIcon, Business as BusinessIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] 타입 정의
interface ServiceRequirement {
  value: number;
  max: number;
  color: string;
  unit: string;
  description: string;
}

interface CustomResourceConfig {
  cpu: number;
  memory: number;
  storage: number;
  gpu: number;
  networkBandwidth: number;
  instances: number;
  redundancy: boolean;
}

interface DeploymentEnvironment {
  id: string;
  name: string;
  description: string;
  requirements: {
    availability: string;
    security: string;
    performance: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  repository_url: string;
  branch: string;
  status: string;
  completion_percentage: number;
}

interface HardwareCalculationResult {
  channels: number;
  totalServers: number;
  gpu: number;
  cpu: number;
  memory: number;
  storage: number;
  status: 'waiting' | 'calculating' | 'completed' | 'error';
  message?: string;
  costAnalysis?: {
    aws: { monthlyUsd: number; annualUsd: number; };
    ncp: { monthlyKrw: number; annualKrw: number; };
  };
  serverConfigurations?: Array<{
    role: string;
    vcpu: number;
    vram: number;
    quantity: number;
    gpu: string;
  }>;
}

const EnhancedDeploymentRequestDashboard: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  // [advice from AI] 상태 관리
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'channel' | 'custom'>('channel');
  
  // [advice from AI] 채널 기반 서비스 요구사항 (기존 하드웨어 계산기 기반)
  const [serviceRequirements, setServiceRequirements] = useState<{ [key: string]: ServiceRequirement }>({
    callbot: { value: 0, max: 500, color: '#9c27b0', unit: '채널', description: '콜센터 음성봇 동시 처리 채널' },
    chatbot: { value: 0, max: 2000, color: '#ff9800', unit: '사용자', description: '챗봇 동시 접속 사용자' },
    advisor: { value: 0, max: 1000, color: '#4caf50', unit: '상담사', description: 'AI 어드바이저 지원 상담사' },
    stt: { value: 0, max: 500, color: '#2196f3', unit: '채널', description: 'STT 독립 처리 채널' },
    tts: { value: 0, max: 500, color: '#ff9800', unit: '채널', description: 'TTS 독립 처리 채널' },
    ta: { value: 0, max: 3000, color: '#4caf50', unit: '건수', description: '텍스트 분석 처리 건수' },
    qa: { value: 0, max: 2000, color: '#f44336', unit: '건수', description: '품질 평가 처리 건수' }
  });

  // [advice from AI] 커스텀 리소스 설정
  const [customResources, setCustomResources] = useState<CustomResourceConfig>({
    cpu: 0,
    memory: 0,
    storage: 0,
    gpu: 0,
    networkBandwidth: 1,
    instances: 1,
    redundancy: false
  });

  // [advice from AI] 배포 환경 설정
  const [deploymentEnvironments] = useState<DeploymentEnvironment[]>([
    {
      id: 'development',
      name: 'Development',
      description: '개발 및 테스트 환경',
      requirements: {
        availability: '99.0%',
        security: 'Basic',
        performance: 'Standard'
      }
    },
    {
      id: 'staging',
      name: 'Staging',
      description: '사전 운영 환경',
      requirements: {
        availability: '99.5%',
        security: 'Enhanced',
        performance: 'High'
      }
    },
    {
      id: 'production',
      name: 'Production',
      description: '실 운영 환경',
      requirements: {
        availability: '99.9%',
        security: 'Enterprise',
        performance: 'Premium'
      }
    }
  ]);

  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('development');
  
  // [advice from AI] 비즈니스 우선순위 설정
  const [businessPriority, setBusinessPriority] = useState({
    urgency: 'medium', // low, medium, high, critical
    businessValue: 50, // 1-100
    customerImpact: 'medium', // low, medium, high
    revenueImpact: 'medium', // low, medium, high
    strategicImportance: 'medium' // low, medium, high
  });

  // [advice from AI] 하드웨어 계산 결과
  const [calculationResult, setCalculationResult] = useState<HardwareCalculationResult>({
    channels: 0,
    totalServers: 0,
    gpu: 0,
    cpu: 0,
    memory: 0,
    storage: 0,
    status: 'waiting'
  });

  // [advice from AI] 배포 일정
  const [deploymentSchedule, setDeploymentSchedule] = useState({
    requestedDate: '',
    targetDate: '',
    maintenanceWindow: 'weekend',
    rollbackPlan: true
  });

  // [advice from AI] 완성된 프로젝트 목록 로드
  const fetchCompletedProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // [advice from AI] 완료된 프로젝트만 필터링
        const completedProjects = data.projects?.filter((project: Project) => 
          project.status === 'completed' && project.completion_percentage >= 90
        ) || [];
        setProjects(completedProjects);
      }
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCompletedProjects();
  }, [fetchCompletedProjects]);

  // [advice from AI] 하드웨어 리소스 계산 (기존 계산기 API 활용)
  const calculateHardwareResources = useCallback(async () => {
    if (calculationMode === 'custom') {
      // [advice from AI] 커스텀 모드는 직접 설정된 값 사용
      setCalculationResult({
        channels: Object.values(serviceRequirements).reduce((sum, req) => sum + req.value, 0),
        totalServers: customResources.instances,
        gpu: customResources.gpu,
        cpu: customResources.cpu,
        memory: customResources.memory,
        storage: customResources.storage,
        status: 'completed'
      });
      return;
    }

    // [advice from AI] 채널 기반 모드는 기존 API 사용
    setCalculationResult(prev => ({ ...prev, status: 'calculating' }));

    try {
      const requestData = {
        requirements: {
          callbot: serviceRequirements.callbot.value,
          chatbot: serviceRequirements.chatbot.value,
          advisor: serviceRequirements.advisor.value,
          stt: serviceRequirements.stt.value,
          tts: serviceRequirements.tts.value,
          ta: serviceRequirements.ta.value,
          qa: serviceRequirements.qa.value
        },
        gpu_type: "auto"
      };

      const response = await fetch('/api/operations/calculate-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const resources = data.resources || {};
          const totalChannels = Object.values(serviceRequirements).reduce((sum, req) => sum + req.value, 0);
          
          setCalculationResult({
            channels: totalChannels,
            totalServers: data.server_config_table?.reduce((sum: number, server: any) => sum + server.quantity, 0) || 0,
            gpu: resources.gpu?.total || 0,
            cpu: Math.ceil(resources.cpu?.total || 0),
            memory: Math.round(resources.actual_memory_gb || 0),
            storage: Math.round((data.server_config_table?.reduce((sum: number, server: any) => 
              sum + (server.instance_storage_gb * server.quantity), 0) || 0) / 1024),
            status: 'completed',
            costAnalysis: {
              aws: {
                monthlyUsd: data.aws_cost_analysis?.total_monthly_cost_usd || 0,
                annualUsd: data.aws_cost_analysis?.total_annual_cost_usd || 0
              },
              ncp: {
                monthlyKrw: data.ncp_cost_analysis?.total_monthly_cost_krw || 0,
                annualKrw: data.ncp_cost_analysis?.total_annual_cost_krw || 0
              }
            },
            serverConfigurations: data.server_config_table?.map((server: any) => ({
              role: server.role,
              vcpu: server.cpu_cores,
              vram: server.ram_gb,
              quantity: server.quantity,
              gpu: server.gpu_type || '-'
            })) || []
          });
        }
      }
    } catch (error) {
      console.error('하드웨어 계산 실패:', error);
      setCalculationResult(prev => ({ 
        ...prev, 
        status: 'error', 
        message: '하드웨어 계산 중 오류가 발생했습니다.' 
      }));
    }
  }, [calculationMode, serviceRequirements, customResources]);

  // [advice from AI] 서비스 요구사항 변경 핸들러
  const handleServiceRequirementChange = (service: string, value: number) => {
    setServiceRequirements(prev => ({
      ...prev,
      [service]: { ...prev[service], value }
    }));
  };

  // [advice from AI] 커스텀 리소스 변경 핸들러
  const handleCustomResourceChange = (field: keyof CustomResourceConfig, value: number | boolean) => {
    setCustomResources(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // [advice from AI] 실시간 계산 트리거
  useEffect(() => {
    const hasInput = calculationMode === 'custom' ? 
      Object.values(customResources).some(v => typeof v === 'number' && v > 0) :
      Object.values(serviceRequirements).some(req => req.value > 0);
    
    if (hasInput) {
      calculateHardwareResources();
    } else {
      setCalculationResult(prev => ({ ...prev, status: 'waiting' }));
    }
  }, [serviceRequirements, customResources, calculationMode, calculateHardwareResources]);

  // [advice from AI] 서비스 슬라이더 컴포넌트
  const ServiceSlider = ({ 
    label, 
    service,
    requirement
  }: { 
    label: string; 
    service: string;
    requirement: ServiceRequirement;
  }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}: {requirement.value} {requirement.unit}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        {requirement.description}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Slider
          value={requirement.value}
          onChange={(_, newValue) => handleServiceRequirementChange(service, newValue as number)}
          min={0}
          max={requirement.max}
          step={1}
          sx={{
            flex: 1,
            color: requirement.color,
            '& .MuiSlider-thumb': { backgroundColor: requirement.color },
            '& .MuiSlider-track': { backgroundColor: requirement.color },
            '& .MuiSlider-rail': { backgroundColor: requirement.color + '30' }
          }}
        />
        <TextField
          value={requirement.value}
          onChange={(e) => handleServiceRequirementChange(service, Number(e.target.value))}
          size="small"
          sx={{ width: 80 }}
          inputProps={{ min: 0, max: requirement.max }}
        />
      </Box>
    </Box>
  );

  // [advice from AI] 단계별 컨텐츠
  const steps = [
    {
      label: '프로젝트 선택',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>완성된 프로젝트 선택</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            배포할 완성된 프로젝트를 선택하세요. 완료율 90% 이상의 프로젝트만 표시됩니다.
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {projects.map((project) => (
                <Grid item xs={12} md={6} key={project.id}>
                  <Card 
                    variant={selectedProject?.id === project.id ? "elevation" : "outlined"}
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedProject?.id === project.id ? 2 : 1,
                      borderColor: selectedProject?.id === project.id ? 'primary.main' : 'divider'
                    }}
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{project.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {project.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={`완료율: ${project.completion_percentage}%`}
                          color="success"
                          size="small"
                        />
                        <Chip 
                          label={project.status}
                          color="primary"
                          size="small"
                        />
                      </Box>
                      {project.repository_url && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Repository: {project.repository_url}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )
    },
    {
      label: '성능 요구사항',
      content: (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">성능 요구사항 설정</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={calculationMode === 'custom'}
                  onChange={(e) => setCalculationMode(e.target.checked ? 'custom' : 'channel')}
                />
              }
              label="커스텀 모드"
            />
          </Box>

          {calculationMode === 'channel' ? (
            // [advice from AI] 채널 기반 모드
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <BackstageCard title="메인 서비스" variant="default">
                  <ServiceSlider
                    label="콜봇"
                    service="callbot"
                    requirement={serviceRequirements.callbot}
                  />
                  <ServiceSlider
                    label="챗봇"
                    service="chatbot"
                    requirement={serviceRequirements.chatbot}
                  />
                  <ServiceSlider
                    label="어드바이저"
                    service="advisor"
                    requirement={serviceRequirements.advisor}
                  />
                </BackstageCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <BackstageCard title="지원 서비스" variant="default">
                  <ServiceSlider
                    label="STT"
                    service="stt"
                    requirement={serviceRequirements.stt}
                  />
                  <ServiceSlider
                    label="TTS"
                    service="tts"
                    requirement={serviceRequirements.tts}
                  />
                  <ServiceSlider
                    label="TA"
                    service="ta"
                    requirement={serviceRequirements.ta}
                  />
                  <ServiceSlider
                    label="QA"
                    service="qa"
                    requirement={serviceRequirements.qa}
                  />
                </BackstageCard>
              </Grid>
            </Grid>
          ) : (
            // [advice from AI] 커스텀 모드
            <BackstageCard title="커스텀 리소스 설정" variant="default">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                직접 하드웨어 리소스를 설정합니다. 담당자가 수동으로 메모리, CPU 등의 사양을 입력할 수 있습니다.
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="CPU (코어)"
                    type="number"
                    value={customResources.cpu}
                    onChange={(e) => handleCustomResourceChange('cpu', Number(e.target.value))}
                    inputProps={{ min: 0, max: 1000 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="메모리 (GB)"
                    type="number"
                    value={customResources.memory}
                    onChange={(e) => handleCustomResourceChange('memory', Number(e.target.value))}
                    inputProps={{ min: 0, max: 10000 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="스토리지 (GB)"
                    type="number"
                    value={customResources.storage}
                    onChange={(e) => handleCustomResourceChange('storage', Number(e.target.value))}
                    inputProps={{ min: 0, max: 100000 }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="GPU (개수)"
                    type="number"
                    value={customResources.gpu}
                    onChange={(e) => handleCustomResourceChange('gpu', Number(e.target.value))}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="네트워크 대역폭 (Gbps)"
                    type="number"
                    value={customResources.networkBandwidth}
                    onChange={(e) => handleCustomResourceChange('networkBandwidth', Number(e.target.value))}
                    inputProps={{ min: 1, max: 100 }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="인스턴스 수"
                    type="number"
                    value={customResources.instances}
                    onChange={(e) => handleCustomResourceChange('instances', Number(e.target.value))}
                    inputProps={{ min: 1, max: 100 }}
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={customResources.redundancy}
                        onChange={(e) => handleCustomResourceChange('redundancy', e.target.checked)}
                      />
                    }
                    label="이중화 구성"
                  />
                </Grid>
              </Grid>
            </BackstageCard>
          )}

          {/* [advice from AI] 실시간 계산 결과 */}
          <Box sx={{ mt: 4 }}>
            <BackstageCard title="실시간 리소스 계산 결과" variant="default">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  계산 결과
                </Typography>
                <Chip 
                  label={
                    calculationResult.status === 'waiting' ? '대기 중' :
                    calculationResult.status === 'calculating' ? '계산 중' :
                    calculationResult.status === 'completed' ? '완료' : '오류'
                  }
                  color={
                    calculationResult.status === 'waiting' ? 'default' :
                    calculationResult.status === 'calculating' ? 'warning' :
                    calculationResult.status === 'completed' ? 'success' : 'error'
                  }
                />
              </Box>

              {calculationResult.status === 'calculating' && (
                <LinearProgress sx={{ mb: 3 }} />
              )}

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {calculationResult.cpu}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">CPU 코어</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {calculationResult.memory}GB
                      </Typography>
                      <Typography variant="body2" color="text.secondary">메모리</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {calculationResult.gpu}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">GPU</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {calculationResult.totalServers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">서버 대수</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* [advice from AI] 비용 분석 */}
              {calculationResult.costAnalysis && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>예상 비용</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="primary">AWS</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            ${calculationResult.costAnalysis.aws.monthlyUsd.toLocaleString()}/월
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            연간: ${calculationResult.costAnalysis.aws.annualUsd.toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="success.main">NCP</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            ₩{calculationResult.costAnalysis.ncp.monthlyKrw.toLocaleString()}/월
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            연간: ₩{calculationResult.costAnalysis.ncp.annualKrw.toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </BackstageCard>
          </Box>
        </Box>
      )
    },
    {
      label: '배포 환경',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>배포 환경 선택</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            배포할 환경을 선택하세요. 각 환경별로 다른 요구사항이 적용됩니다.
          </Typography>
          
          <Grid container spacing={2}>
            {deploymentEnvironments.map((env) => (
              <Grid item xs={12} md={4} key={env.id}>
                <Card 
                  variant={selectedEnvironment === env.id ? "elevation" : "outlined"}
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedEnvironment === env.id ? 2 : 1,
                    borderColor: selectedEnvironment === env.id ? 'primary.main' : 'divider'
                  }}
                  onClick={() => setSelectedEnvironment(env.id)}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{env.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {env.description}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>가용성:</strong> {env.requirements.availability}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>보안:</strong> {env.requirements.security}
                    </Typography>
                    <Typography variant="body2">
                      <strong>성능:</strong> {env.requirements.performance}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )
    },
    {
      label: '비즈니스 우선순위',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>비즈니스 우선순위 설정</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            프로젝트의 비즈니스 가치와 우선순위를 설정하세요.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>긴급도</InputLabel>
                <Select
                  value={businessPriority.urgency}
                  label="긴급도"
                  onChange={(e) => setBusinessPriority(prev => ({ ...prev, urgency: e.target.value }))}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="critical">긴급</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>고객 영향도</InputLabel>
                <Select
                  value={businessPriority.customerImpact}
                  label="고객 영향도"
                  onChange={(e) => setBusinessPriority(prev => ({ ...prev, customerImpact: e.target.value }))}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>매출 영향도</InputLabel>
                <Select
                  value={businessPriority.revenueImpact}
                  label="매출 영향도"
                  onChange={(e) => setBusinessPriority(prev => ({ ...prev, revenueImpact: e.target.value }))}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                비즈니스 가치 점수: {businessPriority.businessValue}
              </Typography>
              <Slider
                value={businessPriority.businessValue}
                onChange={(_, value) => setBusinessPriority(prev => ({ ...prev, businessValue: value as number }))}
                min={1}
                max={100}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
                sx={{ mb: 4 }}
              />

              <FormControl fullWidth>
                <InputLabel>전략적 중요도</InputLabel>
                <Select
                  value={businessPriority.strategicImportance}
                  label="전략적 중요도"
                  onChange={(e) => setBusinessPriority(prev => ({ ...prev, strategicImportance: e.target.value }))}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: '배포 일정',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>배포 일정 설정</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            배포 일정과 관련 설정을 입력하세요.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="요청 일자"
                type="date"
                value={deploymentSchedule.requestedDate}
                onChange={(e) => setDeploymentSchedule(prev => ({ ...prev, requestedDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 3 }}
              />
              
              <TextField
                fullWidth
                label="목표 배포 일자"
                type="date"
                value={deploymentSchedule.targetDate}
                onChange={(e) => setDeploymentSchedule(prev => ({ ...prev, targetDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 3 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>점검 시간대</InputLabel>
                <Select
                  value={deploymentSchedule.maintenanceWindow}
                  label="점검 시간대"
                  onChange={(e) => setDeploymentSchedule(prev => ({ ...prev, maintenanceWindow: e.target.value }))}
                >
                  <MenuItem value="weekend">주말</MenuItem>
                  <MenuItem value="weeknight">평일 야간</MenuItem>
                  <MenuItem value="business">업무 시간</MenuItem>
                  <MenuItem value="custom">사용자 정의</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={deploymentSchedule.rollbackPlan}
                    onChange={(e) => setDeploymentSchedule(prev => ({ ...prev, rollbackPlan: e.target.checked }))}
                  />
                }
                label="롤백 계획 포함"
              />
            </Grid>
          </Grid>
        </Box>
      )
    }
  ];

  // [advice from AI] 배포 요청서 제출
  const handleSubmitRequest = async () => {
    if (!selectedProject) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        repository_url: selectedProject.repository_url,
        branch: selectedProject.branch || 'main',
        
        // [advice from AI] 성능 요구사항
        calculation_mode: calculationMode,
        service_requirements: calculationMode === 'channel' ? serviceRequirements : null,
        custom_resources: calculationMode === 'custom' ? customResources : null,
        calculated_resources: calculationResult,
        
        // [advice from AI] 배포 환경
        deployment_environment: selectedEnvironment,
        
        // [advice from AI] 비즈니스 우선순위
        business_priority: businessPriority,
        
        // [advice from AI] 배포 일정
        deployment_schedule: deploymentSchedule,
        
        // [advice from AI] 요청 메타데이터
        requested_at: new Date().toISOString(),
        status: 'pending_approval'
      };

      const response = await fetch('/api/deployment-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        alert('배포 요청서가 성공적으로 제출되었습니다!');
        // [advice from AI] 초기화 또는 리다이렉트
        setActiveStep(0);
        setSelectedProject(null);
      } else {
        throw new Error('배포 요청서 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('배포 요청서 제출 실패:', error);
      alert('배포 요청서 제출 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          배포 요청서 작성
        </Typography>
        <Typography variant="body1" color="text.secondary">
          완성된 프로젝트의 배포를 요청합니다. 하드웨어 계산기를 통해 최적의 리소스를 산정하세요.
        </Typography>
      </Box>

      {/* [advice from AI] 단계별 진행 */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              {step.content}
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (index === steps.length - 1) {
                      handleSubmitRequest();
                    } else {
                      setActiveStep(index + 1);
                    }
                  }}
                  disabled={
                    (index === 0 && !selectedProject) ||
                    (index === 1 && calculationResult.status !== 'completed') ||
                    loading
                  }
                  sx={{ mr: 1 }}
                >
                  {index === steps.length - 1 ? '배포 요청서 제출' : '다음'}
                </Button>
                {index > 0 && (
                  <Button onClick={() => setActiveStep(index - 1)}>
                    이전
                  </Button>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* [advice from AI] 완료 메시지 */}
      {activeStep === steps.length && (
        <Paper square elevation={0} sx={{ p: 3 }}>
          <Typography>모든 단계가 완료되었습니다!</Typography>
          <Button onClick={() => setActiveStep(0)} sx={{ mt: 1, mr: 1 }}>
            다시 시작
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default EnhancedDeploymentRequestDashboard;
