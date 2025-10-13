import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Paper,
  Avatar,
  Tooltip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AutoAwesome as WizardIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] 멀티테넌트 배포 관리 컴포넌트 - ECP-AI K8s Orchestrator 기반
interface Tenant {
  id: string;
  name: string;
  description: string;
  environment: 'development' | 'staging' | 'production';
  status: 'running' | 'stopped' | 'deploying' | 'error' | 'maintenance';
  cloudProvider: 'AWS' | 'Azure' | 'GCP' | 'NCP' | 'On-Premise';
  region: string;
  namespace: string;
  services: Service[];
  resources: ResourceAllocation;
  createdAt: string;
  lastDeployed: string;
  createdBy: string;
  tags: string[];
  monitoring: MonitoringConfig;
}

interface Service {
  id: string;
  name: string;
  type: 'api' | 'web' | 'database' | 'cache' | 'queue' | 'ai' | 'monitoring' | 'storage';
  status: 'running' | 'stopped' | 'deploying' | 'error';
  replicas: number;
  cpu: string;
  memory: string;
  gpu?: string;
  image: string;
  version: string;
  port: number;
  healthCheck: boolean;
  autoScaling: boolean;
  minReplicas: number;
  maxReplicas: number;
}

interface ResourceAllocation {
  totalCpu: string;
  totalMemory: string;
  totalGpu: string;
  totalStorage: string;
  usedCpu: string;
  usedMemory: string;
  usedGpu: string;
  usedStorage: string;
}

interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  alerts: Alert[];
  dashboards: string[];
}

interface Alert {
  id: string;
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'inactive' | 'triggered';
}

const MultiTenantDeployment: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDialog, setTenantDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deploymentDialog, setDeploymentDialog] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);

  // [advice from AI] PostgreSQL 기반 동적 테넌트 데이터
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // [advice from AI] PostgreSQL에서 테넌트 목록 로드
  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/operations/tenants', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // [advice from AI] PostgreSQL 데이터를 프론트엔드 형식으로 변환
        const convertedTenants = data.data.tenants.map((dbTenant: any) => ({
          id: dbTenant.tenant_id,
          name: dbTenant.tenant_name,
          description: dbTenant.description || '',
          environment: dbTenant.environment as any,
          status: dbTenant.tenant_status === 'active' ? 'running' : 
                  dbTenant.tenant_status === 'creating' ? 'deploying' : 'stopped',
          cloudProvider: dbTenant.cloud_provider.toUpperCase() as any,
          region: dbTenant.region,
          namespace: dbTenant.tenant_id,
          services: [], // 서비스는 별도 API로 로드
          resources: {
            totalCpu: dbTenant.infrastructure_cpu?.toString() || '0',
            totalMemory: dbTenant.infrastructure_memory?.toString() || '0',
            totalStorage: '100',
            usedCpu: dbTenant.total_allocated_cpu?.toString() || '0',
            usedMemory: dbTenant.total_allocated_memory?.toString() || '0',
            usedStorage: '10'
          },
          createdAt: dbTenant.created_at,
          lastDeployed: dbTenant.deployed_at || dbTenant.created_at,
          createdBy: dbTenant.created_by || 'system',
          tags: [dbTenant.environment, dbTenant.cloud_provider],
          monitoring: {
            enabled: dbTenant.monitoring_enabled || false,
            metrics: ['cpu', 'memory', 'network'],
            alerts: [],
            dashboards: ['overview']
          }
        }));

        setTenants(convertedTenants);
        console.log('✅ PostgreSQL에서 테넌트 로드 완료:', convertedTenants.length);
      } else {
        console.error('테넌트 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('테넌트 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadTenants();
  }, []);

  // [advice from AI] 하드코딩된 샘플 데이터 (백업용)
  const [oldSampleTenants] = useState<Tenant[]>([
    {
      id: 'TENANT-001',
      name: '모바일뱅킹-프로덕션',
      description: '모바일뱅킹 서비스 프로덕션 환경',
      environment: 'production',
      status: 'running',
      cloudProvider: 'AWS',
      region: 'ap-northeast-2',
      namespace: 'mobilebanking-prod',
      services: [
        {
          id: 'SVC-001',
          name: 'API Gateway',
          type: 'api',
          status: 'running',
          replicas: 3,
          cpu: '0.5',
          memory: '1Gi',
          image: 'nginx:1.21',
          version: 'v1.2.3',
          port: 80,
          healthCheck: true,
          autoScaling: true,
          minReplicas: 2,
          maxReplicas: 10
        },
        {
          id: 'SVC-002',
          name: 'User Service',
          type: 'api',
          status: 'running',
          replicas: 5,
          cpu: '1',
          memory: '2Gi',
          image: 'user-service:v2.1.0',
          version: 'v2.1.0',
          port: 8080,
          healthCheck: true,
          autoScaling: true,
          minReplicas: 3,
          maxReplicas: 15
        },
        {
          id: 'SVC-003',
          name: 'PostgreSQL',
          type: 'database',
          status: 'running',
          replicas: 1,
          cpu: '2',
          memory: '8Gi',
          image: 'postgres:14',
          version: 'v14.5',
          port: 5432,
          healthCheck: true,
          autoScaling: false,
          minReplicas: 1,
          maxReplicas: 1
        }
      ],
      resources: {
        totalCpu: '10',
        totalMemory: '32Gi',
        totalGpu: '0',
        totalStorage: '500Gi',
        usedCpu: '7.5',
        usedMemory: '24Gi',
        usedGpu: '0',
        usedStorage: '180Gi'
      },
      createdAt: '2024-01-15',
      lastDeployed: '2024-01-20 14:30',
      createdBy: '김운영',
      tags: ['banking', 'production', 'critical'],
      monitoring: {
        enabled: true,
        metrics: ['cpu', 'memory', 'disk', 'network'],
        alerts: [
          {
            id: 'ALERT-001',
            name: 'High CPU Usage',
            condition: 'cpu > 80%',
            severity: 'warning',
            status: 'active'
          },
          {
            id: 'ALERT-002',
            name: 'Memory Exhaustion',
            condition: 'memory > 90%',
            severity: 'critical',
            status: 'active'
          }
        ],
        dashboards: ['overview', 'services', 'infrastructure']
      }
    },
    {
      id: 'TENANT-002',
      name: '이커머스-스테이징',
      description: '이커머스 플랫폼 스테이징 환경',
      environment: 'staging',
      status: 'deploying',
      cloudProvider: 'NCP',
      region: 'KR',
      namespace: 'ecommerce-staging',
      services: [
        {
          id: 'SVC-004',
          name: 'Web Frontend',
          type: 'web',
          status: 'deploying',
          replicas: 2,
          cpu: '0.5',
          memory: '1Gi',
          image: 'ecommerce-web:v1.0.0',
          version: 'v1.0.0',
          port: 3000,
          healthCheck: true,
          autoScaling: true,
          minReplicas: 1,
          maxReplicas: 5
        },
        {
          id: 'SVC-005',
          name: 'Product Service',
          type: 'api',
          status: 'running',
          replicas: 2,
          cpu: '1',
          memory: '2Gi',
          image: 'product-service:v1.5.2',
          version: 'v1.5.2',
          port: 8080,
          healthCheck: true,
          autoScaling: true,
          minReplicas: 1,
          maxReplicas: 8
        }
      ],
      resources: {
        totalCpu: '5',
        totalMemory: '16Gi',
        totalGpu: '0',
        totalStorage: '200Gi',
        usedCpu: '3',
        usedMemory: '8Gi',
        usedGpu: '0',
        usedStorage: '50Gi'
      },
      createdAt: '2024-01-18',
      lastDeployed: '2024-01-20 16:45',
      createdBy: '이개발',
      tags: ['ecommerce', 'staging', 'testing'],
      monitoring: {
        enabled: true,
        metrics: ['cpu', 'memory', 'disk'],
        alerts: [],
        dashboards: ['overview', 'services']
      }
    }
  ]);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    const colors = {
      running: 'success',
      stopped: 'default',
      deploying: 'warning',
      error: 'error',
      maintenance: 'info'
    } as const;
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 환경별 색상
  const getEnvironmentColor = (environment: string) => {
    const colors = {
      development: 'info',
      staging: 'warning',
      production: 'error'
    } as const;
    return colors[environment as keyof typeof colors] || 'default';
  };

  // [advice from AI] 서비스 타입별 아이콘
  const getServiceIcon = (type: string) => {
    const icons = {
      api: null,
      web: null,
      database: null,
      cache: null,
      queue: null,
      ai: null,
      monitoring: null,
      storage: null
    };
    return icons[type as keyof typeof icons] || null;
  };

  // [advice from AI] 리소스 사용률 계산
  const getResourceUsage = (used: string, total: string) => {
    const usedNum = parseFloat(used);
    const totalNum = parseFloat(total);
    return totalNum > 0 ? (usedNum / totalNum) * 100 : 0;
  };

  return (
    <Box>
      {/* [advice from AI] 멀티테넌트 배포 관리 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          멀티테넌트 배포 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 멀티테넌트 환경 배포 및 관리
        </Typography>
      </Box>

      {/* [advice from AI] 테넌트 목록 */}
      <BackstageCard title="테넌트 목록" variant="default">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            배포된 테넌트 ({tenants.length}개)
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/operations/deployment-wizard')}
            sx={{ 
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              color: 'white',
              border: 'none',
              '&:hover': {
                background: 'linear-gradient(45deg, #FE6B8B 60%, #FF8E53 100%)',
                border: 'none'
              }
            }}
          >
            🧙‍♂️ 배포 마법사로 테넌트 생성
          </Button>
        </Box>

        <Grid container spacing={3}>
          {tenants.map((tenant) => (
            <Grid item xs={12} md={6} lg={4} key={tenant.id}>
              <Card 
                variant="outlined"
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 2,
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => setSelectedTenant(tenant)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {tenant.name}
                    </Typography>
                    <Chip 
                      label={tenant.status.toUpperCase()} 
                      color={getStatusColor(tenant.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {tenant.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={tenant.environment.toUpperCase()} 
                      color={getEnvironmentColor(tenant.environment)}
                      size="small"
                      variant="outlined"
                    />
                    <Chip label={tenant.cloudProvider} size="small" variant="outlined" />
                    <Chip label={tenant.region} size="small" variant="outlined" />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      서비스 ({tenant.services.length}개)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {tenant.services.map((service) => (
                        <Chip
                          key={service.id}
                          label={service.name}
                          size="small"
                          color={getStatusColor(service.status)}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      리소스 사용률
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption">CPU</Typography>
                        <Typography variant="caption">
                          {tenant.resources.usedCpu} / {tenant.resources.totalCpu}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getResourceUsage(tenant.resources.usedCpu, tenant.resources.totalCpu)}
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption">Memory</Typography>
                        <Typography variant="caption">
                          {tenant.resources.usedMemory} / {tenant.resources.totalMemory}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getResourceUsage(tenant.resources.usedMemory, tenant.resources.totalMemory)}
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      생성자: {tenant.createdBy}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tenant.lastDeployed}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </BackstageCard>

      {/* [advice from AI] 선택된 테넌트 상세 */}
      {selectedTenant && (
        <BackstageCard title={`${selectedTenant.name} - 상세 정보`} variant="default">
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="서비스 목록" />
            <Tab label="리소스 모니터링" />
            <Tab label="모니터링 설정" />
            <Tab label="배포 로그" />
          </Tabs>

          {/* 서비스 목록 탭 */}
          {activeTab === 0 && (
            <Box sx={{ mt: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>서비스명</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>레플리카</TableCell>
                      <TableCell>리소스</TableCell>
                      <TableCell>버전</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTenant.services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getServiceIcon(service.type)}
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {service.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={service.type.toUpperCase()} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={service.status.toUpperCase()} 
                            color={getStatusColor(service.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {service.replicas}개
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            CPU: {service.cpu}, Memory: {service.memory}
                            {service.gpu && `, GPU: ${service.gpu}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {service.version}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small">
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small">
                              null
                            </IconButton>
                            <IconButton size="small">
                              null
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* 리소스 모니터링 탭 */}
          {activeTab === 1 && (
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      CPU 사용률
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {getResourceUsage(selectedTenant.resources.usedCpu, selectedTenant.resources.totalCpu).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedTenant.resources.usedCpu} / {selectedTenant.resources.totalCpu} Cores
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getResourceUsage(selectedTenant.resources.usedCpu, selectedTenant.resources.totalCpu)}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Memory 사용률
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {getResourceUsage(selectedTenant.resources.usedMemory, selectedTenant.resources.totalMemory).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedTenant.resources.usedMemory} / {selectedTenant.resources.totalMemory}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getResourceUsage(selectedTenant.resources.usedMemory, selectedTenant.resources.totalMemory)}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* 모니터링 설정 탭 */}
          {activeTab === 2 && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>모니터링 설정:</strong> Prometheus, Grafana 기반 모니터링 시스템 설정
                </Typography>
              </Alert>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      활성 알림
                    </Typography>
                    {selectedTenant.monitoring.alerts.map((alert) => (
                      <Box key={alert.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {alert.name}
                          </Typography>
                          <Chip 
                            label={alert.severity.toUpperCase()} 
                            color={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                            size="small"
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          조건: {alert.condition}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      모니터링 메트릭
                    </Typography>
                    <List dense>
                      {selectedTenant.monitoring.metrics.map((metric) => (
                        <ListItem key={metric}>
                          <ListItemIcon>
                            <CheckIcon fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText primary={metric.toUpperCase()} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* 배포 로그 탭 */}
          {activeTab === 3 && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>배포 로그:</strong> 최근 배포 작업의 상세 로그를 확인할 수 있습니다.
                </Typography>
              </Alert>
              
              <Paper sx={{ p: 3, backgroundColor: 'grey.900', color: 'grey.100' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {`[2024-01-20 16:45:23] INFO: Starting deployment for tenant ${selectedTenant.id}
[2024-01-20 16:45:24] INFO: Validating configuration...
[2024-01-20 16:45:25] INFO: Configuration validation successful
[2024-01-20 16:45:26] INFO: Creating namespace ${selectedTenant.namespace}
[2024-01-20 16:45:27] INFO: Deploying services...
[2024-01-20 16:45:30] INFO: Service API Gateway deployed successfully
[2024-01-20 16:45:32] INFO: Service User Service deployed successfully
[2024-01-20 16:45:35] INFO: Service PostgreSQL deployed successfully
[2024-01-20 16:45:36] INFO: All services deployed successfully
[2024-01-20 16:45:37] INFO: Health checks passed
[2024-01-20 16:45:38] INFO: Deployment completed successfully`}
                </Typography>
              </Paper>
            </Box>
          )}
        </BackstageCard>
      )}
    </Box>
  );
};

export default MultiTenantDeployment;
