import React, { useState } from 'react';
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
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] 서비스별 고급 설정 컴포넌트 - ECP-AI K8s 8개 서비스 설정
interface ServiceConfig {
  id: string;
  name: string;
  type: '콜봇' | '챗봇' | '어드바이저' | 'STT' | 'TTS' | 'TA' | 'QA' | '모니터링';
  status: 'running' | 'stopped' | 'deploying' | 'error';
  replicas: number;
  resources: {
    cpu: number;
    memory: number;
    gpu: number;
    storage: number;
  };
  scaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCpu: number;
    targetMemory: number;
  };
  networking: {
    port: number;
    protocol: 'HTTP' | 'HTTPS' | 'gRPC' | 'WebSocket';
    loadBalancer: boolean;
    ingress: boolean;
  };
  healthCheck: {
    enabled: boolean;
    path: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  security: {
    enabled: boolean;
    ssl: boolean;
    authentication: boolean;
    authorization: boolean;
  };
  environment: {
    variables: { [key: string]: string };
    secrets: string[];
  };
  volumes: {
    name: string;
    type: 'configMap' | 'secret' | 'persistentVolume' | 'emptyDir';
    mountPath: string;
  }[];
  lastModified: string;
  modifiedBy: string;
}

const ServiceConfiguration: React.FC = () => {
  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null);
  const [configDialog, setConfigDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ServiceConfig | null>(null);

  // [advice from AI] ECP-AI K8s 8개 서비스 설정 데이터
  const [services] = useState<ServiceConfig[]>([
    {
      id: 'SVC-001',
      name: '콜봇 서비스',
      type: '콜봇',
      status: 'running',
      replicas: 3,
      resources: {
        cpu: 0.5,
        memory: 1,
        gpu: 0,
        storage: 10
      },
      scaling: {
        minReplicas: 2,
        maxReplicas: 10,
        targetCpu: 70,
        targetMemory: 80
      },
      networking: {
        port: 8080,
        protocol: 'HTTP',
        loadBalancer: true,
        ingress: true
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        interval: 30,
        timeout: 10,
        retries: 3
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: true,
        authorization: false
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'info',
          'MAX_CONNECTIONS': '1000'
        },
        secrets: ['database-password', 'api-key']
      },
      volumes: [
        {
          name: 'config-volume',
          type: 'configMap',
          mountPath: '/app/config'
        }
      ],
      lastModified: '2024-01-20 14:30',
      modifiedBy: '김운영'
    },
    {
      id: 'SVC-002',
      name: '챗봇 서비스',
      type: '챗봇',
      status: 'running',
      replicas: 5,
      resources: {
        cpu: 0.2,
        memory: 0.5,
        gpu: 0,
        storage: 5
      },
      scaling: {
        minReplicas: 3,
        maxReplicas: 15,
        targetCpu: 60,
        targetMemory: 70
      },
      networking: {
        port: 3000,
        protocol: 'HTTP',
        loadBalancer: true,
        ingress: true
      },
      healthCheck: {
        enabled: true,
        path: '/api/health',
        interval: 30,
        timeout: 5,
        retries: 3
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: true,
        authorization: true
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'info'
        },
        secrets: ['openai-api-key', 'database-url']
      },
      volumes: [],
      lastModified: '2024-01-20 13:45',
      modifiedBy: '이개발'
    },
    {
      id: 'SVC-003',
      name: '어드바이저 서비스',
      type: '어드바이저',
      status: 'running',
      replicas: 2,
      resources: {
        cpu: 1,
        memory: 2,
        gpu: 0,
        storage: 20
      },
      scaling: {
        minReplicas: 1,
        maxReplicas: 8,
        targetCpu: 80,
        targetMemory: 85
      },
      networking: {
        port: 8080,
        protocol: 'gRPC',
        loadBalancer: true,
        ingress: false
      },
      healthCheck: {
        enabled: true,
        path: '/grpc.health.v1.Health/Check',
        interval: 60,
        timeout: 15,
        retries: 2
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: true,
        authorization: true
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'debug'
        },
        secrets: ['ml-model-path', 'database-credentials']
      },
      volumes: [
        {
          name: 'model-volume',
          type: 'persistentVolume',
          mountPath: '/app/models'
        }
      ],
      lastModified: '2024-01-20 12:15',
      modifiedBy: '박AI'
    },
    {
      id: 'SVC-004',
      name: 'STT 서비스',
      type: 'STT',
      status: 'running',
      replicas: 4,
      resources: {
        cpu: 0.5,
        memory: 1,
        gpu: 0,
        storage: 15
      },
      scaling: {
        minReplicas: 2,
        maxReplicas: 12,
        targetCpu: 75,
        targetMemory: 80
      },
      networking: {
        port: 8080,
        protocol: 'HTTP',
        loadBalancer: true,
        ingress: true
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        interval: 30,
        timeout: 10,
        retries: 3
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: true,
        authorization: false
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'info'
        },
        secrets: ['stt-api-key', 'audio-storage-path']
      },
      volumes: [
        {
          name: 'audio-storage',
          type: 'persistentVolume',
          mountPath: '/app/audio'
        }
      ],
      lastModified: '2024-01-20 11:30',
      modifiedBy: '김음성'
    },
    {
      id: 'SVC-005',
      name: 'TTS 서비스',
      type: 'TTS',
      status: 'running',
      replicas: 2,
      resources: {
        cpu: 1,
        memory: 2,
        gpu: 1,
        storage: 25
      },
      scaling: {
        minReplicas: 1,
        maxReplicas: 6,
        targetCpu: 85,
        targetMemory: 90
      },
      networking: {
        port: 8080,
        protocol: 'HTTP',
        loadBalancer: true,
        ingress: true
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        interval: 30,
        timeout: 15,
        retries: 2
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: true,
        authorization: false
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'info',
          'GPU_ENABLED': 'true'
        },
        secrets: ['tts-api-key', 'voice-model-path']
      },
      volumes: [
        {
          name: 'voice-models',
          type: 'persistentVolume',
          mountPath: '/app/models'
        }
      ],
      lastModified: '2024-01-20 10:45',
      modifiedBy: '이음성'
    },
    {
      id: 'SVC-006',
      name: 'TA 서비스',
      type: 'TA',
      status: 'running',
      replicas: 3,
      resources: {
        cpu: 0.2,
        memory: 0.5,
        gpu: 0,
        storage: 8
      },
      scaling: {
        minReplicas: 2,
        maxReplicas: 10,
        targetCpu: 50,
        targetMemory: 60
      },
      networking: {
        port: 8080,
        protocol: 'HTTP',
        loadBalancer: true,
        ingress: true
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        interval: 30,
        timeout: 5,
        retries: 3
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: true,
        authorization: true
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'info'
        },
        secrets: ['ta-api-key']
      },
      volumes: [],
      lastModified: '2024-01-20 09:20',
      modifiedBy: '박분석'
    },
    {
      id: 'SVC-007',
      name: 'QA 서비스',
      type: 'QA',
      status: 'running',
      replicas: 2,
      resources: {
        cpu: 0.1,
        memory: 0.25,
        gpu: 0,
        storage: 5
      },
      scaling: {
        minReplicas: 1,
        maxReplicas: 8,
        targetCpu: 40,
        targetMemory: 50
      },
      networking: {
        port: 8080,
        protocol: 'HTTP',
        loadBalancer: true,
        ingress: true
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        interval: 30,
        timeout: 5,
        retries: 3
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: true,
        authorization: true
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'info'
        },
        secrets: ['qa-api-key']
      },
      volumes: [],
      lastModified: '2024-01-20 08:15',
      modifiedBy: '김품질'
    },
    {
      id: 'SVC-008',
      name: '모니터링 서비스',
      type: '모니터링',
      status: 'running',
      replicas: 1,
      resources: {
        cpu: 0.5,
        memory: 1,
        gpu: 0,
        storage: 50
      },
      scaling: {
        minReplicas: 1,
        maxReplicas: 3,
        targetCpu: 60,
        targetMemory: 70
      },
      networking: {
        port: 9090,
        protocol: 'HTTP',
        loadBalancer: false,
        ingress: true
      },
      healthCheck: {
        enabled: true,
        path: '/-/healthy',
        interval: 30,
        timeout: 10,
        retries: 3
      },
      security: {
        enabled: true,
        ssl: true,
        authentication: false,
        authorization: false
      },
      environment: {
        variables: {
          'NODE_ENV': 'production',
          'LOG_LEVEL': 'info'
        },
        secrets: ['monitoring-config']
      },
      volumes: [
        {
          name: 'monitoring-data',
          type: 'persistentVolume',
          mountPath: '/prometheus'
        }
      ],
      lastModified: '2024-01-20 07:30',
      modifiedBy: '이모니터링'
    }
  ]);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    const colors = {
      running: 'success',
      stopped: 'default',
      deploying: 'warning',
      error: 'error'
    } as const;
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 서비스 타입별 아이콘
  const getServiceIcon = (type: string) => {
    const icons = {
      '콜봇': <SpeedIcon />,
      '챗봇': <SpeedIcon />,
      '어드바이저': <SecurityIcon />,
      'STT': <MemoryIcon />,
      'TTS': <MemoryIcon />,
      'TA': <StorageIcon />,
      'QA': <CheckIcon />,
      '모니터링': <InfoIcon />
    };
    return icons[type as keyof typeof icons] || <SettingsIcon />;
  };

  return (
    <Box>
      {/* [advice from AI] 서비스 설정 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          서비스별 고급 설정
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s 8개 서비스의 리소스, 스케일링, 네트워킹, 보안 설정 관리
        </Typography>
      </Box>

      {/* [advice from AI] 서비스 목록 */}
      <BackstageCard title="서비스 목록" variant="default">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>서비스명</TableCell>
                <TableCell>타입</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>레플리카</TableCell>
                <TableCell>리소스</TableCell>
                <TableCell>스케일링</TableCell>
                <TableCell>네트워킹</TableCell>
                <TableCell>보안</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((service) => (
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
                    <Chip label={service.type} size="small" variant="outlined" />
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
                      CPU: {service.resources.cpu} | Memory: {service.resources.memory}GB
                      {service.resources.gpu > 0 && ` | GPU: ${service.resources.gpu}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {service.scaling.minReplicas}-{service.scaling.maxReplicas}개
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {service.networking.protocol}:{service.networking.port}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {service.security.ssl && <CheckIcon fontSize="small" color="success" />}
                      {service.security.authentication && <SecurityIcon fontSize="small" color="primary" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedService(service);
                          setConfigDialog(true);
                        }}
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => setEditingConfig(service)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </BackstageCard>

      {/* [advice from AI] 서비스 상세 설정 다이얼로그 */}
      <Dialog 
        open={configDialog} 
        onClose={() => setConfigDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedService?.name} - 상세 설정
        </DialogTitle>
        <DialogContent>
          {selectedService && (
            <Box>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                {/* 리소스 설정 */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      리소스 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          CPU: {selectedService.resources.cpu} Cores
                        </Typography>
                        <Slider
                          value={selectedService.resources.cpu}
                          min={0.1}
                          max={4}
                          step={0.1}
                          disabled
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Memory: {selectedService.resources.memory} GB
                        </Typography>
                        <Slider
                          value={selectedService.resources.memory}
                          min={0.25}
                          max={8}
                          step={0.25}
                          disabled
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      {selectedService.resources.gpu > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            GPU: {selectedService.resources.gpu} 개
                          </Typography>
                          <Slider
                            value={selectedService.resources.gpu}
                            min={0}
                            max={2}
                            step={1}
                            disabled
                            sx={{ width: '100%' }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* 스케일링 설정 */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      스케일링 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          최소 레플리카: {selectedService.scaling.minReplicas}개
                        </Typography>
                        <Slider
                          value={selectedService.scaling.minReplicas}
                          min={1}
                          max={5}
                          step={1}
                          disabled
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          최대 레플리카: {selectedService.scaling.maxReplicas}개
                        </Typography>
                        <Slider
                          value={selectedService.scaling.maxReplicas}
                          min={5}
                          max={20}
                          step={1}
                          disabled
                          sx={{ width: '100%' }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          CPU 임계값: {selectedService.scaling.targetCpu}%
                        </Typography>
                        <Slider
                          value={selectedService.scaling.targetCpu}
                          min={30}
                          max={90}
                          step={5}
                          disabled
                          sx={{ width: '100%' }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* 네트워킹 설정 */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      네트워킹 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="body2">
                        <strong>포트:</strong> {selectedService.networking.port}
                      </Typography>
                      <Typography variant="body2">
                        <strong>프로토콜:</strong> {selectedService.networking.protocol}
                      </Typography>
                      <FormControlLabel
                        control={<Switch checked={selectedService.networking.loadBalancer} disabled />}
                        label="로드 밸런서"
                      />
                      <FormControlLabel
                        control={<Switch checked={selectedService.networking.ingress} disabled />}
                        label="Ingress"
                      />
                    </Box>
                  </Paper>
                </Grid>

                {/* 보안 설정 */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      보안 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={<Switch checked={selectedService.security.enabled} disabled />}
                        label="보안 활성화"
                      />
                      <FormControlLabel
                        control={<Switch checked={selectedService.security.ssl} disabled />}
                        label="SSL/TLS"
                      />
                      <FormControlLabel
                        control={<Switch checked={selectedService.security.authentication} disabled />}
                        label="인증"
                      />
                      <FormControlLabel
                        control={<Switch checked={selectedService.security.authorization} disabled />}
                        label="권한 부여"
                      />
                    </Box>
                  </Paper>
                </Grid>

                {/* 환경 변수 */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      환경 변수
                    </Typography>
                    <List dense>
                      {Object.entries(selectedService.environment.variables).map(([key, value]) => (
                        <ListItem key={key}>
                          <ListItemText 
                            primary={key}
                            secondary={value}
                            primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                            secondaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog(false)}>
            닫기
          </Button>
          <Button variant="contained" startIcon={<EditIcon />}>
            편집
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceConfiguration;
