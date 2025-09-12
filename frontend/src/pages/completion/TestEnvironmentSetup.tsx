// [advice from AI] 테스트 환경 자동 구성 시스템
// Phase 4: 완료 및 인수인계 시스템의 핵심 기능
// 기존 테넌시 생성 솔루션을 활용한 테스트 환경 자동 구성

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Cloud as CloudIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

interface TestEnvironment {
  id: string;
  name: string;
  project_id: string;
  environment_type: 'unit' | 'integration' | 'performance' | 'security' | 'e2e';
  status: 'creating' | 'active' | 'inactive' | 'error' | 'deleting';
  cloud_provider: 'aws' | 'ncp' | 'azure' | 'gcp';
  region: string;
  namespace: string;
  services: string[];
  test_config: TestConfig;
  created_at: string;
  created_by: string;
  deployment_id?: string;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
}

interface TestConfig {
  test_framework: string;
  test_database: string;
  test_data_setup: boolean;
  mock_services: string[];
  performance_requirements: {
    response_time: number;
    throughput: number;
    concurrent_users: number;
  };
  security_requirements: {
    ssl_enabled: boolean;
    authentication_required: boolean;
    data_encryption: boolean;
  };
  monitoring: {
    enabled: boolean;
    metrics_collection: boolean;
    log_aggregation: boolean;
    alerting: boolean;
  };
}

interface TestSuite {
  id: string;
  name: string;
  environment_id: string;
  test_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  test_cases: number;
  passed: number;
  failed: number;
  duration: number;
  last_run: string;
}

const TestEnvironmentSetup: React.FC = () => {
  const [environments, setEnvironments] = useState<TestEnvironment[]>([]);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  // 다이얼로그 상태
  const [envDialog, setEnvDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [viewingEnv, setViewingEnv] = useState<TestEnvironment | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<TestEnvironment | null>(null);
  
  // 폼 상태
  const [envFormData, setEnvFormData] = useState({
    name: '',
    project_id: '',
    environment_type: 'integration' as 'unit' | 'integration' | 'performance' | 'security' | 'e2e',
    cloud_provider: 'aws' as 'aws' | 'ncp' | 'azure' | 'gcp',
    region: 'ap-northeast-2',
    services: [] as string[],
    test_config: {
      test_framework: 'jest',
      test_database: 'postgresql',
      test_data_setup: true,
      mock_services: [] as string[],
      performance_requirements: {
        response_time: 1000,
        throughput: 100,
        concurrent_users: 50
      },
      security_requirements: {
        ssl_enabled: true,
        authentication_required: true,
        data_encryption: true
      },
      monitoring: {
        enabled: true,
        metrics_collection: true,
        log_aggregation: true,
        alerting: true
      }
    }
  });

  // [advice from AI] 테스트 환경 타입별 기본 설정 템플릿
  const environmentTemplates = {
    unit: {
      name: 'Unit Test Environment',
      services: ['app', 'database'],
      test_framework: 'jest',
      test_database: 'sqlite',
      performance_requirements: {
        response_time: 100,
        throughput: 1000,
        concurrent_users: 10
      }
    },
    integration: {
      name: 'Integration Test Environment',
      services: ['app', 'database', 'redis', 'elasticsearch'],
      test_framework: 'jest',
      test_database: 'postgresql',
      performance_requirements: {
        response_time: 500,
        throughput: 500,
        concurrent_users: 25
      }
    },
    performance: {
      name: 'Performance Test Environment',
      services: ['app', 'database', 'redis', 'elasticsearch', 'monitoring'],
      test_framework: 'k6',
      test_database: 'postgresql',
      performance_requirements: {
        response_time: 2000,
        throughput: 100,
        concurrent_users: 100
      }
    },
    security: {
      name: 'Security Test Environment',
      services: ['app', 'database', 'security-scanner'],
      test_framework: 'owasp-zap',
      test_database: 'postgresql',
      performance_requirements: {
        response_time: 1000,
        throughput: 200,
        concurrent_users: 50
      }
    },
    e2e: {
      name: 'End-to-End Test Environment',
      services: ['app', 'database', 'redis', 'elasticsearch', 'frontend'],
      test_framework: 'cypress',
      test_database: 'postgresql',
      performance_requirements: {
        response_time: 3000,
        throughput: 50,
        concurrent_users: 20
      }
    }
  };

  // [advice from AI] 데이터 로드 함수들
  const loadEnvironments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/operations/test-environments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnvironments(data);
      }
    } catch (error) {
      console.error('테스트 환경 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTestSuites = async () => {
    try {
      const response = await fetch('/api/operations/test-suites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestSuites(data);
      }
    } catch (error) {
      console.error('테스트 스위트 데이터 로드 중 오류:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadEnvironments(),
        loadTestSuites()
      ]);
    };
    loadData();
  }, []);

  // [advice from AI] 필터링된 환경 목록
  const filteredEnvironments = environments.filter(env => {
    const matchesStatus = filterStatus === 'all' || env.status === filterStatus;
    const matchesType = filterType === 'all' || env.environment_type === filterType;
    
    return matchesStatus && matchesType;
  });

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'creating': return 'info';
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      case 'deleting': return 'warning';
      default: return 'default';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      case 'unknown': return 'warning';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'unit': return <CheckCircleIcon />;
      case 'integration': return <InfoIcon />;
      case 'performance': return <SpeedIcon />;
      case 'security': return <SecurityIcon />;
      case 'e2e': return <PlayIcon />;
      default: return <CloudIcon />;
    }
  };

  // [advice from AI] 테스트 환경 생성
  const handleCreateEnvironment = async () => {
    try {
      const response = await fetch('/api/operations/test-environments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envFormData)
      });
      
      if (response.ok) {
        await loadEnvironments();
        setEnvDialog(false);
        setEnvFormData({
          name: '',
          project_id: '',
          environment_type: 'integration',
          cloud_provider: 'aws',
          region: 'ap-northeast-2',
          services: [],
          test_config: {
            test_framework: 'jest',
            test_database: 'postgresql',
            test_data_setup: true,
            mock_services: [],
            performance_requirements: {
              response_time: 1000,
              throughput: 100,
              concurrent_users: 50
            },
            security_requirements: {
              ssl_enabled: true,
              authentication_required: true,
              data_encryption: true
            },
            monitoring: {
              enabled: true,
              metrics_collection: true,
              log_aggregation: true,
              alerting: true
            }
          }
        });
      } else {
        console.error('테스트 환경 생성 실패');
      }
    } catch (error) {
      console.error('테스트 환경 생성 중 오류:', error);
    }
  };

  // [advice from AI] 테스트 환경 시작/중지
  const handleEnvironmentAction = async (envId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await fetch(`/api/operations/test-environments/${envId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await loadEnvironments();
      }
    } catch (error) {
      console.error('환경 액션 실행 중 오류:', error);
    }
  };

  // [advice from AI] 테스트 실행
  const handleRunTests = async (envId: string) => {
    try {
      const response = await fetch(`/api/operations/test-environments/${envId}/run-tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await loadTestSuites();
      }
    } catch (error) {
      console.error('테스트 실행 중 오류:', error);
    }
  };

  // [advice from AI] 환경 상세 보기
  const handleViewEnvironment = (env: TestEnvironment) => {
    setViewingEnv(env);
  };

  // [advice from AI] 템플릿 적용
  const handleApplyTemplate = (type: keyof typeof environmentTemplates) => {
    const template = environmentTemplates[type];
    setEnvFormData(prev => ({
      ...prev,
      name: template.name,
      services: template.services,
      test_config: {
        ...prev.test_config,
        test_framework: template.test_framework,
        test_database: template.test_database,
        performance_requirements: template.performance_requirements
      }
    }));
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <CloudIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          테스트 환경 자동 구성
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlayIcon />}
          onClick={() => setEnvDialog(true)}
          sx={{ bgcolor: 'primary.main' }}
        >
          새 테스트 환경 생성
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CloudIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    전체 환경
                  </Typography>
                  <Typography variant="h5">
                    {environments.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    활성 환경
                  </Typography>
                  <Typography variant="h5">
                    {environments.filter(e => e.status === 'active').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PlayIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    실행 중인 테스트
                  </Typography>
                  <Typography variant="h5">
                    {testSuites.filter(t => t.status === 'running').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    오류 환경
                  </Typography>
                  <Typography variant="h5">
                    {environments.filter(e => e.status === 'error').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="상태"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="creating">생성 중</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="error">오류</MenuItem>
                <MenuItem value="deleting">삭제 중</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>타입</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="타입"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="unit">Unit Test</MenuItem>
                <MenuItem value="integration">Integration Test</MenuItem>
                <MenuItem value="performance">Performance Test</MenuItem>
                <MenuItem value="security">Security Test</MenuItem>
                <MenuItem value="e2e">E2E Test</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 탭 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="테스트 환경" />
          <Tab label="테스트 실행" />
          <Tab label="모니터링" />
        </Tabs>
      </Box>

      {/* 테스트 환경 탭 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {filteredEnvironments.map((env) => (
            <Grid item xs={12} md={6} lg={4} key={env.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      {getTypeIcon(env.environment_type)}
                      <Box sx={{ ml: 2, flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {env.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {env.cloud_provider} • {env.region}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip
                            label={env.environment_type}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={env.status}
                            color={getStatusColor(env.status)}
                            size="small"
                          />
                          <Chip
                            label={env.health_status}
                            color={getHealthColor(env.health_status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Tooltip title="상세 보기">
                      <IconButton
                        size="small"
                        onClick={() => handleViewEnvironment(env)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Typography variant="body2" gutterBottom>
                    서비스: {env.services.join(', ')}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    생성일: {new Date(env.created_at).toLocaleDateString()}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    {env.status === 'active' && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PlayIcon />}
                          onClick={() => handleRunTests(env.id)}
                        >
                          테스트 실행
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<StopIcon />}
                          onClick={() => handleEnvironmentAction(env.id, 'stop')}
                        >
                          중지
                        </Button>
                      </>
                    )}
                    {env.status === 'inactive' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PlayIcon />}
                        onClick={() => handleEnvironmentAction(env.id, 'start')}
                      >
                        시작
                      </Button>
                    )}
                    {env.status === 'error' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => handleEnvironmentAction(env.id, 'restart')}
                      >
                        재시작
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 테스트 실행 탭 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  테스트 실행 현황
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>테스트 스위트</TableCell>
                        <TableCell>환경</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>테스트 케이스</TableCell>
                        <TableCell>통과율</TableCell>
                        <TableCell>실행 시간</TableCell>
                        <TableCell>마지막 실행</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testSuites.map((suite) => (
                        <TableRow key={suite.id}>
                          <TableCell>{suite.name}</TableCell>
                          <TableCell>
                            {environments.find(e => e.id === suite.environment_id)?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={suite.status}
                              color={getStatusColor(suite.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{suite.test_cases}</TableCell>
                          <TableCell>
                            {suite.test_cases > 0 ? 
                              Math.round((suite.passed / suite.test_cases) * 100) : 0}%
                          </TableCell>
                          <TableCell>{suite.duration}초</TableCell>
                          <TableCell>
                            {new Date(suite.last_run).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PlayIcon />}
                              onClick={() => handleRunTests(suite.environment_id)}
                            >
                              실행
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 모니터링 탭 */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  환경 모니터링
                </Typography>
                <Alert severity="info">
                  모니터링 대시보드는 Grafana와 연동되어 실시간 메트릭을 제공합니다.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 테스트 환경 생성 다이얼로그 */}
      <Dialog
        open={envDialog}
        onClose={() => setEnvDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          새 테스트 환경 생성
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="환경 이름"
                value={envFormData.name}
                onChange={(e) => setEnvFormData({ ...envFormData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>환경 타입</InputLabel>
                <Select
                  value={envFormData.environment_type}
                  onChange={(e) => {
                    const type = e.target.value as keyof typeof environmentTemplates;
                    setEnvFormData({ ...envFormData, environment_type: type });
                    handleApplyTemplate(type);
                  }}
                  label="환경 타입"
                >
                  <MenuItem value="unit">Unit Test</MenuItem>
                  <MenuItem value="integration">Integration Test</MenuItem>
                  <MenuItem value="performance">Performance Test</MenuItem>
                  <MenuItem value="security">Security Test</MenuItem>
                  <MenuItem value="e2e">E2E Test</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>클라우드 프로바이더</InputLabel>
                <Select
                  value={envFormData.cloud_provider}
                  onChange={(e) => setEnvFormData({ ...envFormData, cloud_provider: e.target.value as any })}
                  label="클라우드 프로바이더"
                >
                  <MenuItem value="aws">AWS</MenuItem>
                  <MenuItem value="ncp">NCP</MenuItem>
                  <MenuItem value="azure">Azure</MenuItem>
                  <MenuItem value="gcp">GCP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="리전"
                value={envFormData.region}
                onChange={(e) => setEnvFormData({ ...envFormData, region: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                서비스 구성
              </Typography>
              <FormGroup row>
                {['app', 'database', 'redis', 'elasticsearch', 'frontend', 'monitoring'].map((service) => (
                  <FormControlLabel
                    key={service}
                    control={
                      <Checkbox
                        checked={envFormData.services.includes(service)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEnvFormData({
                              ...envFormData,
                              services: [...envFormData.services, service]
                            });
                          } else {
                            setEnvFormData({
                              ...envFormData,
                              services: envFormData.services.filter(s => s !== service)
                            });
                          }
                        }}
                      />
                    }
                    label={service}
                  />
                ))}
              </FormGroup>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                테스트 설정
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>테스트 프레임워크</InputLabel>
                <Select
                  value={envFormData.test_config.test_framework}
                  onChange={(e) => setEnvFormData({
                    ...envFormData,
                    test_config: {
                      ...envFormData.test_config,
                      test_framework: e.target.value
                    }
                  })}
                  label="테스트 프레임워크"
                >
                  <MenuItem value="jest">Jest</MenuItem>
                  <MenuItem value="mocha">Mocha</MenuItem>
                  <MenuItem value="k6">K6</MenuItem>
                  <MenuItem value="cypress">Cypress</MenuItem>
                  <MenuItem value="selenium">Selenium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>테스트 데이터베이스</InputLabel>
                <Select
                  value={envFormData.test_config.test_database}
                  onChange={(e) => setEnvFormData({
                    ...envFormData,
                    test_config: {
                      ...envFormData.test_config,
                      test_database: e.target.value
                    }
                  })}
                  label="테스트 데이터베이스"
                >
                  <MenuItem value="sqlite">SQLite</MenuItem>
                  <MenuItem value="postgresql">PostgreSQL</MenuItem>
                  <MenuItem value="mysql">MySQL</MenuItem>
                  <MenuItem value="mongodb">MongoDB</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnvDialog(false)}>
            취소
          </Button>
          <Button onClick={handleCreateEnvironment} variant="contained">
            생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* 환경 상세 보기 다이얼로그 */}
      <Dialog
        open={!!viewingEnv}
        onClose={() => setViewingEnv(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {viewingEnv?.name}
        </DialogTitle>
        <DialogContent>
          {viewingEnv && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">상태</Typography>
                  <Chip
                    label={viewingEnv.status}
                    color={getStatusColor(viewingEnv.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">헬스 상태</Typography>
                  <Chip
                    label={viewingEnv.health_status}
                    color={getHealthColor(viewingEnv.health_status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">클라우드 프로바이더</Typography>
                  <Typography>{viewingEnv.cloud_provider}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">리전</Typography>
                  <Typography>{viewingEnv.region}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                서비스 구성
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {viewingEnv.services.map((service) => (
                  <Chip key={service} label={service} size="small" />
                ))}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>
                테스트 설정
              </Typography>
              <Typography variant="body2">
                프레임워크: {viewingEnv.test_config.test_framework}
              </Typography>
              <Typography variant="body2">
                데이터베이스: {viewingEnv.test_config.test_database}
              </Typography>
              <Typography variant="body2">
                테스트 데이터 설정: {viewingEnv.test_config.test_data_setup ? '예' : '아니오'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingEnv(null)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestEnvironmentSetup;
