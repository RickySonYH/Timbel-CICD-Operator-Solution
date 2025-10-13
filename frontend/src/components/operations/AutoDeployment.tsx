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
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  PlayArrow as DeployIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] ECP-AI K8s Orchestrator 자동 배포 시스템
interface Deployment {
  id: string;
  name: string;
  tenantId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  services: DeploymentService[];
  manifest: string;
  logs: DeploymentLog[];
  progress: number;
  currentStep: string;
}

interface DeploymentService {
  id: string;
  name: string;
  type: string;
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
  status: 'pending' | 'deploying' | 'running' | 'failed';
}

interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  service?: string;
}

interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  logs: string[];
}

const AutoDeployment: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([
    {
      id: 'deploy-001',
      name: 'ECP-메인-배포-v1.2.0',
      tenantId: 'tenant-001',
      status: 'completed',
      createdAt: '2024-01-20T10:00:00Z',
      startedAt: '2024-01-20T10:05:00Z',
      completedAt: '2024-01-20T10:15:00Z',
      duration: 600,
      services: [
        {
          id: 'svc-001',
          name: '콜봇-서비스',
          type: '콜봇',
          image: 'ecp-ai/callbot:v1.2.0',
          registry: 'harbor.ecp-ai.com',
          resources: { cpu: 0.5, memory: 1, gpu: 0, storage: 10 },
          autoScaling: { minReplicas: 2, maxReplicas: 10, targetCpu: 70, targetMemory: 80 },
          environment: { STT_ENDPOINT: 'http://stt-service:8080' },
          healthCheck: { healthPath: '/health', readyPath: '/ready', port: 8080 },
          status: 'running'
        }
      ],
      manifest: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: callbot-service\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: callbot\n  template:\n    metadata:\n      labels:\n        app: callbot\n    spec:\n      containers:\n      - name: callbot\n        image: harbor.ecp-ai.com/ecp-ai/callbot:v1.2.0\n        ports:\n        - containerPort: 8080\n        resources:\n          requests:\n            cpu: 0.5\n            memory: 1Gi\n          limits:\n            cpu: 1\n            memory: 2Gi',
      logs: [
        { timestamp: '2024-01-20T10:05:00Z', level: 'info', message: '배포 시작', service: 'system' },
        { timestamp: '2024-01-20T10:05:30Z', level: 'info', message: '네임스페이스 생성 완료', service: 'system' },
        { timestamp: '2024-01-20T10:06:00Z', level: 'info', message: '매니페스트 생성 완료', service: 'system' },
        { timestamp: '2024-01-20T10:07:00Z', level: 'info', message: '이미지 풀 시작', service: 'callbot-service' },
        { timestamp: '2024-01-20T10:10:00Z', level: 'success', message: '이미지 풀 완료', service: 'callbot-service' },
        { timestamp: '2024-01-20T10:11:00Z', level: 'info', message: '서비스 배포 시작', service: 'callbot-service' },
        { timestamp: '2024-01-20T10:13:00Z', level: 'info', message: '헬스 체크 시작', service: 'callbot-service' },
        { timestamp: '2024-01-20T10:15:00Z', level: 'success', message: '배포 완료', service: 'system' }
      ],
      progress: 100,
      currentStep: '배포 완료'
    },
    {
      id: 'deploy-002',
      name: 'ECP-개발-배포-v1.1.5',
      tenantId: 'tenant-002',
      status: 'running',
      createdAt: '2024-01-20T14:00:00Z',
      startedAt: '2024-01-20T14:05:00Z',
      services: [
        {
          id: 'svc-002',
          name: 'TTS-서비스',
          type: 'TTS',
          image: 'ecp-ai/tts:v1.1.5',
          registry: 'harbor.ecp-ai.com',
          resources: { cpu: 1, memory: 2, gpu: 1, storage: 25 },
          autoScaling: { minReplicas: 1, maxReplicas: 5, targetCpu: 80, targetMemory: 85 },
          environment: { MODEL_PATH: '/models/tts' },
          healthCheck: { healthPath: '/health', readyPath: '/ready', port: 8080 },
          status: 'deploying'
        }
      ],
      manifest: '',
      logs: [
        { timestamp: '2024-01-20T14:05:00Z', level: 'info', message: '배포 시작', service: 'system' },
        { timestamp: '2024-01-20T14:05:30Z', level: 'info', message: '네임스페이스 생성 완료', service: 'system' },
        { timestamp: '2024-01-20T14:06:00Z', level: 'info', message: '매니페스트 생성 완료', service: 'system' },
        { timestamp: '2024-01-20T14:07:00Z', level: 'info', message: '이미지 풀 시작', service: 'tts-service' }
      ],
      progress: 60,
      currentStep: '이미지 풀 중...'
    }
  ]);

  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // [advice from AI] 배포 상태별 색상
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'default',
      running: 'warning',
      completed: 'success',
      failed: 'error',
      cancelled: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 로그 레벨별 색상
  const getLogColor = (level: string) => {
    const colors = {
      info: 'primary',
      warning: 'warning',
      error: 'error',
      success: 'success'
    };
    return colors[level as keyof typeof colors] || 'default';
  };

  // [advice from AI] 배포 시작
  const startDeployment = async (deploymentId: string) => {
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) return null;

    // [advice from AI] 배포 상태 업데이트
    setDeployments(deployments.map(d => 
      d.id === deploymentId 
        ? { 
            ...d, 
            status: 'running', 
            startedAt: new Date().toISOString(),
            progress: 0,
            currentStep: '배포 준비 중...'
          }
        : d
    ));

    // [advice from AI] 배포 시뮬레이션
    const steps = [
      { name: '네임스페이스 생성', duration: 2000 },
      { name: '매니페스트 생성', duration: 3000 },
      { name: '이미지 풀', duration: 10000 },
      { name: '서비스 배포', duration: 5000 },
      { name: '헬스 체크', duration: 3000 }
    ];

    let currentProgress = 0;
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
      currentProgress = ((i + 1) / steps.length) * 100;
      
      setDeployments(deployments.map(d => 
        d.id === deploymentId 
          ? { 
              ...d, 
              progress: currentProgress,
              currentStep: steps[i].name,
              logs: [
                ...d.logs,
                { 
                  timestamp: new Date().toISOString(), 
                  level: 'info', 
                  message: `${steps[i].name} 완료`,
                  service: 'system'
                }
              ]
            }
          : d
      ));
    }

    // [advice from AI] 배포 완료
    setDeployments(deployments.map(d => 
      d.id === deploymentId 
        ? { 
            ...d, 
            status: 'completed',
            completedAt: new Date().toISOString(),
            progress: 100,
            currentStep: '배포 완료',
            logs: [
              ...d.logs,
              { 
                timestamp: new Date().toISOString(), 
                level: 'success', 
                message: '배포 완료',
                service: 'system'
              }
            ]
          }
        : d
    ));
  };

  // [advice from AI] 배포 중지
  const stopDeployment = (deploymentId: string) => {
    setDeployments(deployments.map(d => 
      d.id === deploymentId 
        ? { 
            ...d, 
            status: 'cancelled',
            completedAt: new Date().toISOString(),
            logs: [
              ...d.logs,
              { 
                timestamp: new Date().toISOString(), 
                level: 'warning', 
                message: '배포 중지됨',
                service: 'system'
              }
            ]
          }
        : d
    ));
  };

  // [advice from AI] 배포 삭제
  const deleteDeployment = (deploymentId: string) => {
    setDeployments(deployments.filter(d => d.id !== deploymentId));
  };

  return (
    <Box>
      {/* [advice from AI] 자동 배포 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          자동 배포 시스템
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 자동 배포 및 CI/CD 파이프라인
        </Typography>
      </Box>

      {/* [advice from AI] 배포 목록 */}
      <BackstageCard title="배포 목록" variant="default">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            활성 배포 ({deployments.filter(d => d.status === 'running').length}개)
          </Typography>
          <Button
            variant="contained"
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            새 배포 시작
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>배포명</TableCell>
                <TableCell>테넌시</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>진행률</TableCell>
                <TableCell>서비스 수</TableCell>
                <TableCell>시작 시간</TableCell>
                <TableCell>소요 시간</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {deployment.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {deployment.currentStep}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {deployment.tenantId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={deployment.status} 
                      color={getStatusColor(deployment.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={deployment.progress}
                        sx={{ width: 60, height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="body2">
                        {deployment.progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{deployment.services.length}개</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {deployment.startedAt ? new Date(deployment.startedAt).toLocaleTimeString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {deployment.duration ? `${deployment.duration}초` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setSelectedDeployment(deployment)}
                        color="primary"
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                      {deployment.status === 'pending' && (
                        <IconButton 
                          size="small" 
                          onClick={() => startDeployment(deployment.id)}
                          color="success"
                        >
                          null
                        </IconButton>
                      )}
                      {deployment.status === 'running' && (
                        <IconButton 
                          size="small" 
                          onClick={() => stopDeployment(deployment.id)}
                          color="warning"
                        >
                          null
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        onClick={() => deleteDeployment(deployment.id)}
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

      {/* [advice from AI] 배포 상세 정보 */}
      {selectedDeployment && (
        <BackstageCard title={`${selectedDeployment.name} 상세 정보`} variant="default">
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="서비스 목록" />
            <Tab label="매니페스트" />
            <Tab label="로그" />
            <Tab label="진행 상황" />
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedDeployment.services.map((service) => (
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
                          <Chip 
                            label={service.status} 
                            color={getStatusColor(service.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {activeTab === 1 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Kubernetes 매니페스트
                </Typography>
                <Box sx={{ 
                  backgroundColor: '#1e1e1e', 
                  color: '#ffffff', 
                  p: 2, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                  maxHeight: 400
                }}>
                  <pre>{selectedDeployment.manifest}</pre>
                </Box>
              </Paper>
            )}

            {activeTab === 2 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  배포 로그
                </Typography>
                <Box sx={{ 
                  backgroundColor: '#f5f5f5', 
                  p: 2, 
                  borderRadius: 1,
                  maxHeight: 400,
                  overflow: 'auto'
                }}>
                  {selectedDeployment.logs.map((log, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100 }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Typography>
                      <Chip 
                        label={log.level} 
                        color={getLogColor(log.level) as any}
                        size="small"
                        sx={{ minWidth: 60 }}
                      />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}

            {activeTab === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      배포 진행률
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedDeployment.progress}
                      sx={{ height: 20, borderRadius: 1, mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {selectedDeployment.currentStep}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      배포 통계
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">시작 시간:</Typography>
                        <Typography variant="body2">
                          {selectedDeployment.startedAt ? new Date(selectedDeployment.startedAt).toLocaleString() : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">완료 시간:</Typography>
                        <Typography variant="body2">
                          {selectedDeployment.completedAt ? new Date(selectedDeployment.completedAt).toLocaleString() : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">소요 시간:</Typography>
                        <Typography variant="body2">
                          {selectedDeployment.duration ? `${selectedDeployment.duration}초` : '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Box>
        </BackstageCard>
      )}

      {/* [advice from AI] 새 배포 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 배포 생성</DialogTitle>
        <DialogContent>
          <Stepper orientation="vertical">
            <Step>
              <StepLabel>배포 정보</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <TextField label="배포명" fullWidth size="small" />
                  <FormControl fullWidth size="small">
                    <InputLabel>테넌시 선택</InputLabel>
                    <Select>
                      <MenuItem value="tenant-001">ECP-메인-테넌시</MenuItem>
                      <MenuItem value="tenant-002">ECP-개발-테넌시</MenuItem>
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
            <Step>
              <StepLabel>배포 설정</StepLabel>
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
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button variant="contained" onClick={() => setCreateDialogOpen(false)}>배포 시작</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutoDeployment;
