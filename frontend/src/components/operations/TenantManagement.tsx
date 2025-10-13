import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
  Alert,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as DeployIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] ECP-AI K8s Orchestrator 멀티테넌트 관리 시스템
interface Tenant {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'deploying' | 'error';
  createdAt: string;
  updatedAt: string;
  services: ServiceConfig[];
  resources: {
    cpu: number;
    memory: number;
    gpu: number;
    storage: number;
  };
  cloudProvider: string;
  region: string;
  namespace: string;
  replicas: number;
  healthScore: number;
}

interface ServiceConfig {
  id: string;
  name: string;
  type: '콜봇' | '챗봇' | '어드바이저' | 'STT' | 'TTS' | 'TA' | 'QA' | '모니터링';
  image: string;
  registry: string;
  resources: {
    cpu: number;
    memory: number;
    gpu: number;
    storage: number;
  };
  autoScaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCpu: number;
    targetMemory: number;
  };
  environment: { [key: string]: string };
  healthCheck: {
    healthPath: string;
    readyPath: string;
    port: number;
  };
  status: 'running' | 'stopped' | 'deploying' | 'error';
}

interface DeploymentProgress {
  tenantId: string;
  step: number;
  totalSteps: number;
  currentStep: string;
  progress: number;
  logs: string[];
  status: 'running' | 'completed' | 'failed';
}

const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: 'tenant-001',
      name: 'ECP-메인-테넌시',
      description: 'ECP-AI K8s 메인 테넌시',
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      services: [
        {
          id: 'svc-001',
          name: '콜봇-서비스',
          type: '콜봇',
          image: 'ecp-ai/callbot:latest',
          registry: 'harbor.ecp-ai.com',
          resources: { cpu: 0.5, memory: 1, gpu: 0, storage: 10 },
          autoScaling: { minReplicas: 2, maxReplicas: 10, targetCpu: 70, targetMemory: 80 },
          environment: { STT_ENDPOINT: 'http://stt-service:8080', TTS_ENDPOINT: 'http://tts-service:8080' },
          healthCheck: { healthPath: '/health', readyPath: '/ready', port: 8080 },
          status: 'running'
        },
        {
          id: 'svc-002',
          name: '챗봇-서비스',
          type: '챗봇',
          image: 'ecp-ai/chatbot:latest',
          registry: 'harbor.ecp-ai.com',
          resources: { cpu: 0.2, memory: 0.5, gpu: 0, storage: 5 },
          autoScaling: { minReplicas: 3, maxReplicas: 15, targetCpu: 60, targetMemory: 70 },
          environment: { NLP_ENDPOINT: 'http://nlp-service:8080', CHAT_HISTORY_SIZE: '1000' },
          healthCheck: { healthPath: '/health', readyPath: '/ready', port: 8080 },
          status: 'running'
        }
      ],
      resources: { cpu: 2.5, memory: 5, gpu: 0, storage: 50 },
      cloudProvider: 'AWS',
      region: 'ap-northeast-2',
      namespace: 'ecp-main',
      replicas: 5,
      healthScore: 95
    },
    {
      id: 'tenant-002',
      name: 'ECP-개발-테넌시',
      description: 'ECP-AI K8s 개발 환경 테넌시',
      status: 'active',
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-19T16:45:00Z',
      services: [
        {
          id: 'svc-003',
          name: 'TTS-서비스',
          type: 'TTS',
          image: 'ecp-ai/tts:dev',
          registry: 'harbor.ecp-ai.com',
          resources: { cpu: 1, memory: 2, gpu: 1, storage: 25 },
          autoScaling: { minReplicas: 1, maxReplicas: 5, targetCpu: 80, targetMemory: 85 },
          environment: { MODEL_PATH: '/models/tts', VOICE_TYPE: 'female', SPEED: '1.0' },
          healthCheck: { healthPath: '/health', readyPath: '/ready', port: 8080 },
          status: 'running'
        }
      ],
      resources: { cpu: 1.5, memory: 3, gpu: 1, storage: 30 },
      cloudProvider: 'NCP',
      region: 'KR',
      namespace: 'ecp-dev',
      replicas: 2,
      healthScore: 88
    }
  ]);

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // [advice from AI] 테넌시 상태별 색상
  const getStatusColor = (status: string) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      deploying: 'warning',
      error: 'error'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 서비스 상태별 아이콘
  const getServiceIcon = (status: string) => {
    const icons = {
      running: null,
      stopped: null,
      deploying: null,
      error: null
    };
    return icons[status as keyof typeof icons] || null;
  };

  // [advice from AI] 테넌시 생성
  const createTenant = (tenantData: Partial<Tenant>) => {
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: tenantData.name || '새 테넌시',
      description: tenantData.description || '',
      status: 'inactive',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      services: [],
      resources: { cpu: 0, memory: 0, gpu: 0, storage: 0 },
      cloudProvider: tenantData.cloudProvider || 'AWS',
      region: tenantData.region || 'ap-northeast-2',
      namespace: tenantData.namespace || `tenant-${Date.now()}`,
      replicas: 0,
      healthScore: 0
    };
    setTenants([...tenants, newTenant]);
    setCreateDialogOpen(false);
  };

  // [advice from AI] 테넌시 배포
  const deployTenant = async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return null;

    setDeploymentProgress({
      tenantId,
      step: 0,
      totalSteps: 5,
      currentStep: '배포 준비 중...',
      progress: 0,
      logs: ['테넌시 배포를 시작합니다...'],
      status: 'running'
    });

    setDeployDialogOpen(true);

    // [advice from AI] 배포 시뮬레이션
    const steps = [
      'Kubernetes 네임스페이스 생성',
      '서비스 매니페스트 생성',
      '컨테이너 이미지 풀',
      '서비스 배포 실행',
      '헬스 체크 및 검증'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDeploymentProgress(prev => prev ? {
        ...prev,
        step: i + 1,
        currentStep: steps[i],
        progress: ((i + 1) / steps.length) * 100,
        logs: [...prev.logs, `✅ ${steps[i]} 완료`],
        status: i === steps.length - 1 ? 'completed' : 'running'
      } : null);
    }

    // [advice from AI] 테넌시 상태 업데이트
    setTenants(tenants.map(t => 
      t.id === tenantId 
        ? { ...t, status: 'active', updatedAt: new Date().toISOString() }
        : t
    ));
  };

  // [advice from AI] 테넌시 중지
  const stopTenant = (tenantId: string) => {
    setTenants(tenants.map(t => 
      t.id === tenantId 
        ? { ...t, status: 'inactive', updatedAt: new Date().toISOString() }
        : t
    ));
  };

  // [advice from AI] 테넌시 삭제
  const deleteTenant = (tenantId: string) => {
    setTenants(tenants.filter(t => t.id !== tenantId));
  };

  return (
    <Box>
      {/* [advice from AI] 테넌시 관리 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          멀티테넌트 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 멀티테넌트 배포 및 관리
        </Typography>
      </Box>

      {/* [advice from AI] 테넌시 목록 */}
      <BackstageCard title="테넌시 목록" variant="default">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            활성 테넌시 ({tenants.filter(t => t.status === 'active').length}개)
          </Typography>
          <Button
            variant="contained"
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            테넌시 생성
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>테넌시명</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>서비스 수</TableCell>
                <TableCell>리소스</TableCell>
                <TableCell>클라우드</TableCell>
                <TableCell>헬스 점수</TableCell>
                <TableCell>생성일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {tenant.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tenant.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={tenant.status} 
                      color={getStatusColor(tenant.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{tenant.services.length}개</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      CPU: {tenant.resources.cpu} | Memory: {tenant.resources.memory}GB
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      GPU: {tenant.resources.gpu} | Storage: {tenant.resources.storage}GB
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {tenant.cloudProvider} ({tenant.region})
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={tenant.healthScore}
                        sx={{ width: 60, height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="body2">
                        {tenant.healthScore}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setSelectedTenant(tenant)}
                        color="primary"
                      >
                        null
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => deployTenant(tenant.id)}
                        color="success"
                        disabled={tenant.status === 'deploying'}
                      >
                        null
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => stopTenant(tenant.id)}
                        color="warning"
                        disabled={tenant.status === 'inactive'}
                      >
                        null
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => deleteTenant(tenant.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </BackstageCard>

      {/* [advice from AI] 테넌시 상세 정보 */}
      {selectedTenant && (
        <BackstageCard title={`${selectedTenant.name} 상세 정보`} variant="default">
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="서비스 목록" />
            <Tab label="리소스 모니터링" />
            <Tab label="설정" />
            <Tab label="로그" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {activeTab === 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>서비스명</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>이미지</TableCell>
                      <TableCell>리소스</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTenant.services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {service.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={service.type} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {service.registry}/{service.image}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            CPU: {service.resources.cpu} | Memory: {service.resources.memory}GB
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getServiceIcon(service.status)}
                            <Typography variant="body2">
                              {service.status}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="primary">
                            null
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {activeTab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      CPU 사용률
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={75}
                      sx={{ height: 20, borderRadius: 1, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      75% (1.875 / 2.5 cores)
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      메모리 사용률
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={60}
                      sx={{ height: 20, borderRadius: 1, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      60% (3 / 5 GB)
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      네트워크 트래픽
                    </Typography>
                    <Typography variant="h4" color="primary">
                      1.2 GB/s
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      인바운드: 800 MB/s | 아웃바운드: 400 MB/s
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      응답 시간
                    </Typography>
                    <Typography variant="h4" color="success">
                      120ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      평균 응답 시간 (P95: 250ms)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      기본 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="테넌시명"
                        value={selectedTenant.name}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="설명"
                        value={selectedTenant.description}
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel>클라우드 제공업체</InputLabel>
                        <Select value={selectedTenant.cloudProvider}>
                          <MenuItem value="AWS">AWS</MenuItem>
                          <MenuItem value="NCP">NCP</MenuItem>
                          <MenuItem value="Azure">Azure</MenuItem>
                          <MenuItem value="GCP">GCP</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      리소스 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="CPU (cores)"
                        type="number"
                        value={selectedTenant.resources.cpu}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Memory (GB)"
                        type="number"
                        value={selectedTenant.resources.memory}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="GPU"
                        type="number"
                        value={selectedTenant.resources.gpu}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Storage (GB)"
                        type="number"
                        value={selectedTenant.resources.storage}
                        fullWidth
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {activeTab === 3 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  실시간 로그
                </Typography>
                <Box sx={{ 
                  backgroundColor: '#1e1e1e', 
                  color: '#ffffff', 
                  p: 2, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  height: 300,
                  overflow: 'auto'
                }}>
                  <div>2024-01-20 14:30:15 [INFO] 테넌시 배포 시작</div>
                  <div>2024-01-20 14:30:16 [INFO] Kubernetes 네임스페이스 생성 완료</div>
                  <div>2024-01-20 14:30:18 [INFO] 서비스 매니페스트 생성 완료</div>
                  <div>2024-01-20 14:30:20 [INFO] 컨테이너 이미지 풀 시작</div>
                  <div>2024-01-20 14:30:25 [INFO] 이미지 풀 완료</div>
                  <div>2024-01-20 14:30:26 [INFO] 서비스 배포 실행</div>
                  <div>2024-01-20 14:30:30 [INFO] 헬스 체크 시작</div>
                  <div>2024-01-20 14:30:35 [INFO] 모든 서비스 정상 동작 확인</div>
                  <div>2024-01-20 14:30:36 [SUCCESS] 테넌시 배포 완료</div>
                </Box>
              </Paper>
            )}
          </Box>
        </BackstageCard>
      )}

      {/* [advice from AI] 테넌시 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 테넌시 생성</DialogTitle>
        <DialogContent>
          <Stepper orientation="vertical">
            <Step>
              <StepLabel>기본 정보</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <TextField label="테넌시명" fullWidth size="small" />
                  <TextField label="설명" fullWidth multiline rows={3} size="small" />
                </Box>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>클라우드 설정</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>클라우드 제공업체</InputLabel>
                    <Select>
                      <MenuItem value="AWS">AWS</MenuItem>
                      <MenuItem value="NCP">NCP</MenuItem>
                      <MenuItem value="Azure">Azure</MenuItem>
                      <MenuItem value="GCP">GCP</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>리전</InputLabel>
                    <Select>
                      <MenuItem value="ap-northeast-2">Asia Pacific (Seoul)</MenuItem>
                      <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
                      <MenuItem value="eu-west-1">Europe (Ireland)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>서비스 선택</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <Typography variant="body2">배포할 서비스를 선택하세요:</Typography>
                  {['콜봇', '챗봇', '어드바이저', 'STT', 'TTS', 'TA', 'QA', '모니터링'].map(service => (
                    <Box key={service} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input type="checkbox" />
                      <Typography variant="body2">{service}</Typography>
                    </Box>
                  ))}
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button variant="contained" onClick={() => createTenant({})}>생성</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 배포 진행 다이얼로그 */}
      <Dialog open={deployDialogOpen} onClose={() => setDeployDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>테넌시 배포 진행</DialogTitle>
        <DialogContent>
          {deploymentProgress && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">
                  {deploymentProgress.currentStep}
                </Typography>
                <Typography variant="body2">
                  {deploymentProgress.step} / {deploymentProgress.totalSteps}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={deploymentProgress.progress}
                sx={{ height: 8, borderRadius: 1, mb: 2 }}
              />
              <Box sx={{ 
                backgroundColor: '#f5f5f5', 
                p: 2, 
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                {deploymentProgress.logs.map((log, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {log}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeployDialogOpen(false)}
            disabled={deploymentProgress?.status === 'running'}
          >
            {deploymentProgress?.status === 'completed' ? '완료' : '닫기'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantManagement;
