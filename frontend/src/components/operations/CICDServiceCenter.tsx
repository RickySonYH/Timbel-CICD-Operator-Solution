// [advice from AI] CI/CD 및 서비스 관리 통합 센터
// 서비스 설정 + 자동 배포 + CI/CD 파이프라인 통합

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Build as BuildIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as DeployIcon,
  Timeline as PipelineIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';
import ServiceConfiguration from './ServiceConfiguration';
import CICDPipeline from './CICDPipeline';
import AutoDeployment from './AutoDeployment';

// [advice from AI] 서비스 설정 인터페이스
interface ServiceConfig {
  id: string;
  name: string;
  type: string;
  image: string;
  version: string;
  status: 'running' | 'stopped' | 'building' | 'error';
  resources: {
    cpu: string;
    memory: string;
    gpu?: number;
  };
  autoScaling: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
  };
  deployment: {
    strategy: string;
    lastDeployed: string;
    nextScheduled?: string;
  };
}

// [advice from AI] CI/CD 파이프라인 인터페이스  
interface Pipeline {
  id: string;
  name: string;
  repository: string;
  branch: string;
  status: 'active' | 'disabled' | 'building' | 'failed';
  lastRun: {
    status: 'success' | 'failed' | 'running';
    duration: number;
    timestamp: string;
  };
  triggers: string[];
}

const CICDServiceCenter: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [serviceConfigs, setServiceConfigs] = useState<ServiceConfig[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // [advice from AI] 탭 구성 (등록 기능 추가)
  const tabs = [
    { label: '서비스 목록',  component: 'services' },
    { label: '서비스 등록',  component: 'register' },
    { label: 'CI/CD 파이프라인',  component: 'cicd' },
    { label: '자동 배포',  component: 'autodeploy' },
    { label: '이미지 관리',  component: 'images' }
  ];

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    setIsLoading(true);
    try {
      // [advice from AI] 서비스 설정 로드
      const servicesResponse = await fetch('http://localhost:3001/api/operations/services', {
        credentials: 'include'
      });

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        
        // [advice from AI] Mock 서비스 설정 데이터
        const mockServices: ServiceConfig[] = [
          {
            id: 'callbot-service',
            name: '콜봇 서비스',
            type: 'callbot',
            image: 'ecp-ai/callbot:latest',
            version: 'v1.2.0',
            status: 'running',
            resources: { cpu: '0.5', memory: '1Gi', gpu: 0 },
            autoScaling: { enabled: true, minReplicas: 2, maxReplicas: 10 },
            deployment: { 
              strategy: 'rolling', 
              lastDeployed: '2024-01-20T14:30:00Z',
              nextScheduled: '2024-01-21T02:00:00Z'
            }
          },
          {
            id: 'chatbot-service',
            name: '챗봇 서비스',
            type: 'chatbot', 
            image: 'ecp-ai/chatbot:latest',
            version: 'v1.1.8',
            status: 'running',
            resources: { cpu: '0.2', memory: '512Mi', gpu: 0 },
            autoScaling: { enabled: true, minReplicas: 3, maxReplicas: 15 },
            deployment: { 
              strategy: 'blue-green', 
              lastDeployed: '2024-01-20T12:15:00Z'
            }
          },
          {
            id: 'advisor-service',
            name: '어드바이저 서비스',
            type: 'advisor',
            image: 'ecp-ai/advisor:latest', 
            version: 'v2.0.1',
            status: 'running',
            resources: { cpu: '1.0', memory: '2Gi', gpu: 1 },
            autoScaling: { enabled: true, minReplicas: 1, maxReplicas: 5 },
            deployment: { 
              strategy: 'canary', 
              lastDeployed: '2024-01-20T16:45:00Z'
            }
          }
        ];

        setServiceConfigs(mockServices);
      }

      // [advice from AI] CI/CD 파이프라인 로드
      const pipelinesResponse = await fetch('http://localhost:3001/api/operations/pipelines', {
        credentials: 'include'
      });

      if (pipelinesResponse.ok) {
        const pipelinesData = await pipelinesResponse.json();
        
        // [advice from AI] Mock 파이프라인 데이터
        const mockPipelines: Pipeline[] = [
          {
            id: 'pipeline-callbot',
            name: '콜봇 서비스 파이프라인',
            repository: 'https://github.com/ecp-ai/callbot-service',
            branch: 'main',
            status: 'active',
            lastRun: {
              status: 'success',
              duration: 420,
              timestamp: '2024-01-20T14:30:00Z'
            },
            triggers: ['push', 'webhook']
          },
          {
            id: 'pipeline-chatbot',
            name: '챗봇 서비스 파이프라인',
            repository: 'https://github.com/ecp-ai/chatbot-service',
            branch: 'main',
            status: 'active',
            lastRun: {
              status: 'running',
              duration: 0,
              timestamp: '2024-01-20T16:15:00Z'
            },
            triggers: ['push', 'schedule']
          }
        ];

        setPipelines(mockPipelines);
      }

      console.log('✅ CI/CD 서비스 센터 데이터 로드 완료');

    } catch (error) {
      console.error('CI/CD 서비스 센터 데이터 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // [advice from AI] 1탭: 서비스 설정
  const renderServiceSettings = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        서비스 설정 관리
      </Typography>
      
      <Grid container spacing={3}>
        {serviceConfigs.map((service) => (
          <Grid item xs={12} md={6} lg={4} key={service.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{service.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {service.image}
                    </Typography>
                  </Box>
                  <Chip 
                    label={service.status}
                    color={service.status === 'running' ? 'success' : 
                           service.status === 'building' ? 'warning' : 'error'}
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption">리소스 설정</Typography>
                  <Typography variant="body2">
                    CPU: {service.resources.cpu} | Memory: {service.resources.memory}
                    {service.resources.gpu && service.resources.gpu > 0 && ` | GPU: ${service.resources.gpu}`}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption">오토 스케일링</Typography>
                  <Typography variant="body2">
                    {service.autoScaling.enabled ? 
                      `활성 (${service.autoScaling.minReplicas}-${service.autoScaling.maxReplicas} 복제본)` : 
                      '비활성'
                    }
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton size="small">
                      
                    </IconButton>
                    <IconButton size="small">
                      {service.status === 'running' ? null : null}
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    v{service.version}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // [advice from AI] 2탭: CI/CD 파이프라인
  const renderCICDPipelines = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          CI/CD 파이프라인 ({pipelines.length}개)
        </Typography>
        <Button variant="contained">
          새 파이프라인
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>파이프라인 이름</TableCell>
              <TableCell>저장소</TableCell>
              <TableCell>브랜치</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>마지막 실행</TableCell>
              <TableCell>액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pipelines.map((pipeline) => (
              <TableRow key={pipeline.id}>
                <TableCell>
                  <Typography variant="subtitle2">{pipeline.name}</Typography>
                </TableCell>
                <TableCell>{pipeline.repository}</TableCell>
                <TableCell>
                  <Chip label={pipeline.branch} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={pipeline.status}
                    color={pipeline.status === 'active' ? 'success' : 
                           pipeline.status === 'building' ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Chip 
                      label={pipeline.lastRun.status}
                      color={pipeline.lastRun.status === 'success' ? 'success' : 
                             pipeline.lastRun.status === 'running' ? 'warning' : 'error'}
                      size="small"
                    />
                    <Typography variant="caption" display="block">
                      {new Date(pipeline.lastRun.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton size="small">
                      
                    </IconButton>
                    <IconButton size="small">
                      
                    </IconButton>
                    <IconButton size="small" color="error">
                      
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // [advice from AI] 3탭: 자동 배포
  const renderAutoDeployment = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        자동 배포 스케줄 관리
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                배포 스케줄
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined">스케줄 추가</Button>
                <Button variant="outlined">정책 설정</Button>
                <Button variant="outlined">알림 설정</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                배포 통계
              </Typography>
              <Typography variant="body2">
                오늘 배포: 3건 (성공 2, 실패 1)
              </Typography>
              <Typography variant="body2">
                이번 주 배포: 15건 (성공률 93.3%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // [advice from AI] 4탭: 빌드 관리
  const renderBuildManagement = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        빌드 관리
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Jenkins 연동을 통한 이미지 빌드 및 레지스트리 관리
      </Alert>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 빌드 현황
              </Typography>
              <Typography variant="body2">
                진행 중인 빌드: 1개
              </Typography>
              <Typography variant="body2">
                대기 중인 빌드: 0개
              </Typography>
              <Typography variant="body2">
                성공한 빌드: 12개 (오늘)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: return renderServiceSettings();
      case 1: return renderCICDPipelines();
      case 2: return renderAutoDeployment();
      case 3: return renderBuildManagement();
      default: return renderServiceSettings();
    }
  };

  return (
    <BackstageCard title="CI/CD 및 서비스 관리 센터" subtitle="서비스 설정, 자동 배포, CI/CD 파이프라인 통합 관리">
      <Box>
        {/* 탭 네비게이션 */}
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index}
              label={tab.label}
            />
          ))}
        </Tabs>

        {/* 탭 컨텐츠 */}
        <Box sx={{ minHeight: '600px' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderTabContent()
          )}
        </Box>
      </Box>
    </BackstageCard>
  );
};

export default CICDServiceCenter;
