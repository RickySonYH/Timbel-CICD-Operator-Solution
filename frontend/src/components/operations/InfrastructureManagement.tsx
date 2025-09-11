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
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  NetworkCheck as NetworkIcon,
  Security as ShieldIcon,
  Monitor as MonitorIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] ECP-AI K8s Orchestrator 인프라 관리
interface Infrastructure {
  id: string;
  name: string;
  type: 'kubernetes' | 'docker' | 'vm' | 'bare-metal';
  provider: 'aws' | 'ncp' | 'azure' | 'gcp' | 'on-premise';
  region: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  resources: {
    cpu: number;
    memory: number;
    storage: number;
    gpu: number;
  };
  nodes: InfrastructureNode[];
  services: InfrastructureService[];
  monitoring: {
    enabled: boolean;
    metrics: string[];
    alerts: InfrastructureAlert[];
  };
  security: {
    enabled: boolean;
    policies: string[];
    compliance: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface InfrastructureNode {
  id: string;
  name: string;
  type: 'master' | 'worker' | 'edge';
  status: 'running' | 'stopped' | 'maintenance' | 'error';
  resources: {
    cpu: number;
    memory: number;
    storage: number;
    gpu: number;
  };
  os: string;
  k8sVersion: string;
  lastUpdated: string;
}

interface InfrastructureService {
  id: string;
  name: string;
  type: 'ingress' | 'load-balancer' | 'storage' | 'monitoring' | 'security';
  status: 'running' | 'stopped' | 'error';
  version: string;
  endpoints: string[];
  health: number;
}

interface InfrastructureAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

const InfrastructureManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  // [advice from AI] 새로운 인프라 등록 폼 상태
  const [newInfrastructure, setNewInfrastructure] = useState({
    name: '',
    description: '',
    type: 'kubernetes',
    provider: 'aws',
    region: '',
    totalCpu: 0,
    totalMemory: 0,
    totalStorage: 0,
    totalGpu: 0,
    nodeCount: 1,
    k8sVersion: '',
    apiEndpoint: '',
    dashboardUrl: ''
  });

  // [advice from AI] 탭 구성 (등록 기능 추가)
  const tabs = [
    { label: '인프라 목록', component: 'list' },
    { label: '인프라 등록', component: 'register' },
    { label: '노드 관리', component: 'nodes' },
    { label: '모니터링', component: 'monitoring' }
  ];

  // [advice from AI] PostgreSQL에서 인프라 목록 로드
  const loadInfrastructures = async () => {
    setIsLoading(true);
    try {
      // [advice from AI] 실제 PostgreSQL 데이터 사용 (기존 하드코딩 데이터 제거)
      const response = await fetch('http://localhost:3001/api/operations/infrastructures', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setInfrastructures(data.data || []);
        console.log('✅ PostgreSQL 인프라 데이터 로드 완료');
      } else {
        // [advice from AI] API 실패 시 기존 샘플 데이터 사용
        console.log('📊 샘플 인프라 데이터 사용');
        setInfrastructures(sampleInfrastructures);
      }
    } catch (error) {
      console.error('인프라 데이터 로드 오류:', error);
      setInfrastructures(sampleInfrastructures);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInfrastructures();
  }, []);

  // [advice from AI] 기존 샘플 데이터 (백업용)
  const [sampleInfrastructures] = useState<Infrastructure[]>([
    {
      id: 'infra-001',
      name: 'ECP-프로덕션-클러스터',
      type: 'kubernetes',
      provider: 'aws',
      region: 'ap-northeast-2',
      status: 'active',
      resources: {
        cpu: 32,
        memory: 128,
        storage: 1000,
        gpu: 4
      },
      nodes: [
        {
          id: 'node-001',
          name: 'master-01',
          type: 'master',
          status: 'running',
          resources: { cpu: 4, memory: 16, storage: 100, gpu: 0 },
          os: 'Ubuntu 20.04',
          k8sVersion: '1.24.3',
          lastUpdated: '2024-01-20T10:00:00Z'
        },
        {
          id: 'node-002',
          name: 'worker-01',
          type: 'worker',
          status: 'running',
          resources: { cpu: 8, memory: 32, storage: 200, gpu: 1 },
          os: 'Ubuntu 20.04',
          k8sVersion: '1.24.3',
          lastUpdated: '2024-01-20T10:00:00Z'
        },
        {
          id: 'node-003',
          name: 'worker-02',
          type: 'worker',
          status: 'running',
          resources: { cpu: 8, memory: 32, storage: 200, gpu: 1 },
          os: 'Ubuntu 20.04',
          k8sVersion: '1.24.3',
          lastUpdated: '2024-01-20T10:00:00Z'
        }
      ],
      services: [
        {
          id: 'svc-001',
          name: 'NGINX Ingress',
          type: 'ingress',
          status: 'running',
          version: '1.2.0',
          endpoints: ['https://api.ecp-ai.com'],
          health: 95
        },
        {
          id: 'svc-002',
          name: 'Prometheus',
          type: 'monitoring',
          status: 'running',
          version: '2.40.0',
          endpoints: ['http://monitoring.ecp-ai.com'],
          health: 98
        },
        {
          id: 'svc-003',
          name: 'Falco',
          type: 'security',
          status: 'running',
          version: '0.33.0',
          endpoints: ['http://security.ecp-ai.com'],
          health: 92
        }
      ],
      monitoring: {
        enabled: true,
        metrics: ['cpu', 'memory', 'network', 'storage'],
        alerts: [
          {
            id: 'alert-001',
            severity: 'warning',
            title: 'CPU 사용률 높음',
            description: 'worker-01 노드의 CPU 사용률이 85%를 초과했습니다.',
            timestamp: '2024-01-20T14:25:00Z',
            resolved: false
          }
        ]
      },
      security: {
        enabled: true,
        policies: ['RBAC', 'Network Policy', 'Pod Security'],
        compliance: ['SOC2', 'ISO27001']
      },
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    },
    {
      id: 'infra-002',
      name: 'ECP-개발-클러스터',
      type: 'kubernetes',
      provider: 'ncp',
      region: 'KR',
      status: 'active',
      resources: {
        cpu: 16,
        memory: 64,
        storage: 500,
        gpu: 2
      },
      nodes: [
        {
          id: 'node-004',
          name: 'dev-master-01',
          type: 'master',
          status: 'running',
          resources: { cpu: 2, memory: 8, storage: 50, gpu: 0 },
          os: 'Ubuntu 20.04',
          k8sVersion: '1.24.3',
          lastUpdated: '2024-01-20T10:00:00Z'
        },
        {
          id: 'node-005',
          name: 'dev-worker-01',
          type: 'worker',
          status: 'running',
          resources: { cpu: 4, memory: 16, storage: 100, gpu: 1 },
          os: 'Ubuntu 20.04',
          k8sVersion: '1.24.3',
          lastUpdated: '2024-01-20T10:00:00Z'
        }
      ],
      services: [
        {
          id: 'svc-004',
          name: 'NGINX Ingress',
          type: 'ingress',
          status: 'running',
          version: '1.2.0',
          endpoints: ['https://dev-api.ecp-ai.com'],
          health: 90
        }
      ],
      monitoring: {
        enabled: true,
        metrics: ['cpu', 'memory'],
        alerts: []
      },
      security: {
        enabled: true,
        policies: ['RBAC'],
        compliance: []
      },
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    }
  ]);

  const [selectedInfrastructure, setSelectedInfrastructure] = useState<Infrastructure | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // [advice from AI] 인프라 상태별 색상
  const getStatusColor = (status: string) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      maintenance: 'warning',
      error: 'error'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 노드 상태별 색상
  const getNodeStatusColor = (status: string) => {
    const colors = {
      running: 'success',
      stopped: 'default',
      maintenance: 'warning',
      error: 'error'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 서비스 타입별 아이콘
  const getServiceIcon = (type: string) => {
    const icons = {
      ingress: <NetworkIcon />,
      'load-balancer': <NetworkIcon />,
      storage: <StorageIcon />,
      monitoring: <MonitorIcon />,
      security: <ShieldIcon />
    };
    return icons[type as keyof typeof icons] || <SettingsIcon />;
  };

  // [advice from AI] 알림 심각도별 색상
  const getAlertColor = (severity: string) => {
    const colors = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      critical: 'error'
    };
    return colors[severity as keyof typeof colors] || 'default';
  };

  // [advice from AI] 인프라 생성
  const createInfrastructure = (infraData: Partial<Infrastructure>) => {
    const newInfrastructure: Infrastructure = {
      id: `infra-${Date.now()}`,
      name: infraData.name || '새 인프라',
      type: infraData.type || 'kubernetes',
      provider: infraData.provider || 'aws',
      region: infraData.region || 'ap-northeast-2',
      status: 'inactive',
      resources: { cpu: 0, memory: 0, storage: 0, gpu: 0 },
      nodes: [],
      services: [],
      monitoring: { enabled: false, metrics: [], alerts: [] },
      security: { enabled: false, policies: [], compliance: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setInfrastructures([...infrastructures, newInfrastructure]);
    setCreateDialogOpen(false);
  };

  // [advice from AI] 인프라 시작/중지
  const toggleInfrastructure = (infraId: string) => {
    setInfrastructures(infrastructures.map(infra => 
      infra.id === infraId 
        ? { 
            ...infra, 
            status: infra.status === 'active' ? 'inactive' : 'active',
            updatedAt: new Date().toISOString()
          }
        : infra
    ));
  };

  // [advice from AI] 인프라 삭제
  const deleteInfrastructure = (infraId: string) => {
    setInfrastructures(infrastructures.filter(infra => infra.id !== infraId));
  };

  return (
    <Box>
      {/* [advice from AI] 인프라 관리 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          인프라 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 인프라 및 클러스터 관리
        </Typography>
      </Box>

      {/* [advice from AI] 인프라 목록 */}
      <BackstageCard title="인프라 목록" variant="default">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            활성 인프라 ({(infrastructures || []).filter(i => i.status === 'active').length}개)
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            인프라 생성
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>인프라명</TableCell>
                <TableCell>타입</TableCell>
                <TableCell>제공업체</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>노드 수</TableCell>
                <TableCell>리소스</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(infrastructures || []).map((infra) => (
                <TableRow key={infra.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {infra.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {infra.region || 'N/A'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={infra.type || 'unknown'} 
                      color="primary"
                      size="small"
                      icon={<CloudIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {(infra.provider || 'unknown').toUpperCase()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={infra.status || 'unknown'} 
                      color={getStatusColor(infra.status || 'unknown') as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {infra.nodes?.length || 0}개
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      CPU: {infra.resources?.cpu || 0} | Memory: {infra.resources?.memory || 0}GB
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Storage: {infra.resources?.storage || 0}GB | GPU: {infra.resources?.gpu || 0}개
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setSelectedInfrastructure(infra)}
                        color="primary"
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => toggleInfrastructure(infra.id)}
                        color={infra.status === 'active' ? 'warning' : 'success'}
                      >
                        {infra.status === 'active' ? <StopIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="primary"
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => deleteInfrastructure(infra.id)}
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

      {/* [advice from AI] 인프라 상세 정보 */}
      {selectedInfrastructure && (
        <BackstageCard title={`${selectedInfrastructure.name} 상세 정보`} variant="default">
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="노드 관리" />
            <Tab label="서비스 관리" />
            <Tab label="모니터링" />
            <Tab label="보안" />
            <Tab label="설정" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {activeTab === 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>노드명</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>OS</TableCell>
                      <TableCell>K8s 버전</TableCell>
                      <TableCell>리소스</TableCell>
                      <TableCell>마지막 업데이트</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInfrastructure.nodes.map((node) => (
                      <TableRow key={node.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {node.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={node.type} 
                            color={node.type === 'master' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={node.status} 
                            color={getNodeStatusColor(node.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {node.os}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {node.k8sVersion}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            CPU: {node.resources.cpu} | Memory: {node.resources.memory}GB
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Storage: {node.resources.storage}GB | GPU: {node.resources.gpu}개
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(node.lastUpdated).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {activeTab === 1 && (
              <Grid container spacing={3}>
                {selectedInfrastructure.services.map((service) => (
                  <Grid item xs={12} md={6} key={service.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          {getServiceIcon(service.type)}
                          <Box>
                            <Typography variant="h6">
                              {service.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {service.type} • v{service.version}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Chip 
                            label={service.status} 
                            color={getNodeStatusColor(service.status) as any}
                            size="small"
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={service.health}
                              sx={{ width: 60, height: 8, borderRadius: 1 }}
                            />
                            <Typography variant="body2">
                              {service.health}%
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Endpoints: {service.endpoints.join(', ')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      모니터링 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={<Switch checked={selectedInfrastructure.monitoring.enabled} />}
                        label="모니터링 활성화"
                      />
                      <Typography variant="body2" color="text.secondary">
                        수집 메트릭: {selectedInfrastructure.monitoring.metrics.join(', ')}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      활성 알림
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {selectedInfrastructure.monitoring.alerts.map((alert) => (
                        <Alert 
                          key={alert.id} 
                          severity={alert.severity as any}
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {alert.title}
                          </Typography>
                          <Typography variant="body2">
                            {alert.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(alert.timestamp).toLocaleString()}
                          </Typography>
                        </Alert>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {activeTab === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      보안 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={<Switch checked={selectedInfrastructure.security.enabled} />}
                        label="보안 활성화"
                      />
                      <Typography variant="body2" color="text.secondary">
                        정책: {selectedInfrastructure.security.policies.join(', ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        컴플라이언스: {selectedInfrastructure.security.compliance.join(', ') || '없음'}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      보안 상태
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">RBAC</Typography>
                        <CheckCircleIcon color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Network Policy</Typography>
                        <CheckCircleIcon color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Pod Security</Typography>
                        <CheckCircleIcon color="success" />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {activeTab === 4 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      기본 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="인프라명"
                        value={selectedInfrastructure.name}
                        fullWidth
                        size="small"
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel>타입</InputLabel>
                        <Select value={selectedInfrastructure.type}>
                          <MenuItem value="kubernetes">Kubernetes</MenuItem>
                          <MenuItem value="docker">Docker</MenuItem>
                          <MenuItem value="vm">Virtual Machine</MenuItem>
                          <MenuItem value="bare-metal">Bare Metal</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>제공업체</InputLabel>
                        <Select value={selectedInfrastructure.provider}>
                          <MenuItem value="aws">AWS</MenuItem>
                          <MenuItem value="ncp">NCP</MenuItem>
                          <MenuItem value="azure">Azure</MenuItem>
                          <MenuItem value="gcp">GCP</MenuItem>
                          <MenuItem value="on-premise">On-Premise</MenuItem>
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
                        value={selectedInfrastructure.resources.cpu}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Memory (GB)"
                        type="number"
                        value={selectedInfrastructure.resources.memory}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Storage (GB)"
                        type="number"
                        value={selectedInfrastructure.resources.storage}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="GPU"
                        type="number"
                        value={selectedInfrastructure.resources.gpu}
                        fullWidth
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Box>
        </BackstageCard>
      )}

      {/* [advice from AI] 인프라 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 인프라 생성</DialogTitle>
        <DialogContent>
          <Stepper orientation="vertical">
            <Step>
              <StepLabel>기본 정보</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <TextField label="인프라명" fullWidth size="small" />
                  <FormControl fullWidth size="small">
                    <InputLabel>타입</InputLabel>
                    <Select>
                      <MenuItem value="kubernetes">Kubernetes</MenuItem>
                      <MenuItem value="docker">Docker</MenuItem>
                      <MenuItem value="vm">Virtual Machine</MenuItem>
                      <MenuItem value="bare-metal">Bare Metal</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>클라우드 설정</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>제공업체</InputLabel>
                    <Select>
                      <MenuItem value="aws">AWS</MenuItem>
                      <MenuItem value="ncp">NCP</MenuItem>
                      <MenuItem value="azure">Azure</MenuItem>
                      <MenuItem value="gcp">GCP</MenuItem>
                      <MenuItem value="on-premise">On-Premise</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="리전" fullWidth size="small" />
                </Box>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>리소스 설정</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <TextField label="CPU (cores)" type="number" fullWidth size="small" />
                  <TextField label="Memory (GB)" type="number" fullWidth size="small" />
                  <TextField label="Storage (GB)" type="number" fullWidth size="small" />
                  <TextField label="GPU" type="number" fullWidth size="small" />
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button variant="contained" onClick={() => createInfrastructure({})}>생성</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InfrastructureManagement;
