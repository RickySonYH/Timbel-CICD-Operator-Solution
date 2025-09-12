import React, { useState, useEffect } from 'react';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Divider,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] ECP-AI K8s Orchestrator 모니터링 대시보드
interface MetricData {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'healthy' | 'warning' | 'critical';
}

interface ServiceStatus {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'degraded' | 'error';
  uptime: number;
  responseTime: number;
  errorRate: number;
  requests: number;
  lastCheck: string;
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  service: string;
  resolved: boolean;
}

const MonitoringDashboard: React.FC = () => {
  const { getAuthHeaders } = useJwtAuthStore();
  
  // [advice from AI] 모니터링 데이터 상태
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // [advice from AI] 실시간 갱신 설정
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // 초 단위
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [isGeneratingData, setIsGeneratingData] = useState<boolean>(false);
  
  // [advice from AI] 상세 모니터링 데이터 상태
  const [detailedData, setDetailedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // [advice from AI] 모니터링 소스 설정 상태
  const [monitoringSources, setMonitoringSources] = useState<any[]>([]);
  const [showSourceSettings, setShowSourceSettings] = useState<boolean>(false);
  const [newSource, setNewSource] = useState<any>({
    sourceType: 'prometheus',
    name: '',
    endpoint: '',
    credentials: {},
    settings: {},
    isActive: true
  });

  // [advice from AI] 모니터링 데이터 로드
  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      
      // [advice from AI] 1. 테넌트 목록 로드
      const tenantsResponse = await fetch('http://localhost:3001/api/operations/tenants', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (tenantsResponse.ok) {
        const tenantsData = await tenantsResponse.json();
        setTenants(tenantsData.data.tenants);
      }

      // [advice from AI] 2. 모니터링 대시보드 데이터 로드
      const monitoringResponse = await fetch('http://localhost:3001/api/operations/monitoring/dashboard/overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (monitoringResponse.ok) {
        const monitoringData = await monitoringResponse.json();
        setDashboardData(monitoringData.data);
        
        // [advice from AI] 메트릭 데이터 변환
        const convertedMetrics: MetricData[] = [
          {
            name: 'CPU 사용률',
            value: monitoringData.data.metrics?.totalCpuUsage || 0,
            unit: '%',
            trend: 'stable' as const,
            threshold: { warning: 80, critical: 90 },
            status: (monitoringData.data.metrics?.totalCpuUsage || 0) > 90 ? 'critical' as const : 
                   (monitoringData.data.metrics?.totalCpuUsage || 0) > 80 ? 'warning' as const : 'healthy' as const
          },
          {
            name: '메모리 사용률',
            value: monitoringData.data.metrics?.totalMemoryUsage || 0,
            unit: '%',
            trend: 'stable' as const,
            threshold: { warning: 85, critical: 95 },
            status: (monitoringData.data.metrics?.totalMemoryUsage || 0) > 95 ? 'critical' as const : 
                   (monitoringData.data.metrics?.totalMemoryUsage || 0) > 85 ? 'warning' as const : 'healthy' as const
          },
          {
            name: '네트워크 트래픽',
            value: (monitoringData.data.metrics?.totalNetworkTraffic || 0) / 1000,
            unit: 'GB/s',
            trend: 'stable' as const,
            threshold: { warning: 2.0, critical: 3.0 },
            status: 'healthy' as const
          },
          {
            name: '디스크 사용률',
            value: monitoringData.data.metrics?.disk_usage || 0,
            unit: '%',
            trend: 'stable' as const,
            threshold: { warning: 80, critical: 90 },
            status: (monitoringData.data.metrics?.disk_usage || 0) > 90 ? 'critical' as const : 
                   (monitoringData.data.metrics?.disk_usage || 0) > 80 ? 'warning' as const : 'healthy' as const
          },
          {
            name: '응답 시간',
            value: monitoringData.data.metrics?.averageResponseTime || 0,
            unit: 'ms',
            trend: 'stable' as const,
            threshold: { warning: 500, critical: 1000 },
            status: (monitoringData.data.metrics?.averageResponseTime || 0) > 1000 ? 'critical' as const : 
                   (monitoringData.data.metrics?.averageResponseTime || 0) > 500 ? 'warning' as const : 'healthy' as const
          },
          {
            name: '에러율',
            value: monitoringData.data.metrics?.errorRate || 0,
            unit: '%',
            trend: 'stable' as const,
            threshold: { warning: 2.0, critical: 5.0 },
            status: (monitoringData.data.metrics?.errorRate || 0) > 5.0 ? 'critical' as const : 
                   (monitoringData.data.metrics?.errorRate || 0) > 2.0 ? 'warning' as const : 'healthy' as const
          }
        ];
        
        setMetrics(convertedMetrics);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('모니터링 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 테넌트별 모니터링 데이터 생성
  const generateTenantMonitoringData = async (tenantId: string) => {
    try {
      setIsGeneratingData(true);
      const authHeaders = getAuthHeaders();
      
      const response = await fetch('http://localhost:3001/api/operations/monitoring/generate-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ tenantId })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('모니터링 데이터 생성 완료:', result);
        // 데이터 생성 후 전체 데이터 다시 로드
        await loadMonitoringData();
      }
    } catch (error) {
      console.error('모니터링 데이터 생성 실패:', error);
    } finally {
      setIsGeneratingData(false);
    }
  };

  // [advice from AI] 모든 활성 테넌트에 대해 모니터링 데이터 자동 생성
  const generateAllTenantsData = async () => {
    try {
      setIsGeneratingData(true);
      const activeTenants = tenants.filter(t => t.tenant_status === 'active');
      
      for (const tenant of activeTenants) {
        await generateTenantMonitoringData(tenant.tenant_id);
        // 각 테넌트 간 0.5초 간격
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('전체 테넌트 데이터 생성 실패:', error);
    } finally {
      setIsGeneratingData(false);
    }
  };

  // [advice from AI] 상세 모니터링 데이터 로드
  const loadDetailedMonitoringData = async (tenantId: string, type: string = 'all') => {
    try {
      const authHeaders = getAuthHeaders();
      
      const response = await fetch(`http://localhost:3001/api/operations/monitoring/${tenantId}/detailed?type=${type}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (response.ok) {
        const result = await response.json();
        setDetailedData(result.data.detailedData);
        console.log('상세 모니터링 데이터 로드 완료:', result.data);
      }
    } catch (error) {
      console.error('상세 모니터링 데이터 로드 실패:', error);
    }
  };

  // [advice from AI] 모니터링 소스 설정 로드
  const loadMonitoringSources = async () => {
    try {
      const authHeaders = getAuthHeaders();
      
      const response = await fetch('http://localhost:3001/api/operations/monitoring/sources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (response.ok) {
        const result = await response.json();
        setMonitoringSources(result.data || []);
        console.log('모니터링 소스 설정 로드 완료:', result.data);
      }
    } catch (error) {
      console.error('모니터링 소스 설정 로드 실패:', error);
    }
  };

  // [advice from AI] 모니터링 소스 저장
  const saveMonitoringSource = async (sourceData: any) => {
    try {
      const authHeaders = getAuthHeaders();
      
      const response = await fetch('http://localhost:3001/api/operations/monitoring/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(sourceData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('모니터링 소스 저장 완료:', result.data);
        await loadMonitoringSources();
        setShowSourceSettings(false);
        setNewSource({
          sourceType: 'prometheus',
          name: '',
          endpoint: '',
          credentials: {},
          settings: {},
          isActive: true
        });
      }
    } catch (error) {
      console.error('모니터링 소스 저장 실패:', error);
    }
  };

  // [advice from AI] 모니터링 소스 연결 테스트
  const testMonitoringSource = async (sourceId: string) => {
    try {
      const authHeaders = getAuthHeaders();
      
      const response = await fetch(`http://localhost:3001/api/operations/monitoring/sources/${sourceId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('모니터링 소스 연결 테스트 결과:', result.data);
        return result;
      }
    } catch (error) {
      console.error('모니터링 소스 연결 테스트 실패:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMonitoringData();
    loadMonitoringSources();
  }, []);

  // [advice from AI] 자동 갱신 설정
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      loadMonitoringData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, isAutoRefresh]);

  // [advice from AI] 1초마다 자동 데이터 생성
  useEffect(() => {
    const dataGenerationInterval = setInterval(() => {
      if (isGeneratingData) return; // 이미 생성 중이면 스킵
      generateAllTenantsData();
    }, 1000);

    return () => clearInterval(dataGenerationInterval);
  }, [isGeneratingData]);

  // [advice from AI] 탭 변경 시 상세 데이터 로드
  useEffect(() => {
    if (selectedTenant !== 'all' && selectedTenant) {
      const tabTypes = ['resources', 'network', 'logs', 'performance'];
      const type = tabTypes[activeTab] || 'all';
      loadDetailedMonitoringData(selectedTenant, type);
    }
  }, [activeTab, selectedTenant]);

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      id: 'svc-001',
      name: '콜봇-서비스',
      type: '콜봇',
      status: 'running',
      uptime: 99.9,
      responseTime: 150,
      errorRate: 0.2,
      requests: 1250,
      lastCheck: '2024-01-20T14:30:00Z'
    },
    {
      id: 'svc-002',
      name: '챗봇-서비스',
      type: '챗봇',
      status: 'running',
      uptime: 99.8,
      responseTime: 200,
      errorRate: 0.3,
      requests: 2100,
      lastCheck: '2024-01-20T14:30:00Z'
    },
    {
      id: 'svc-003',
      name: 'TTS-서비스',
      type: 'TTS',
      status: 'degraded',
      uptime: 98.5,
      responseTime: 800,
      errorRate: 1.2,
      requests: 450,
      lastCheck: '2024-01-20T14:30:00Z'
    },
    {
      id: 'svc-004',
      name: 'STT-서비스',
      type: 'STT',
      status: 'error',
      uptime: 95.0,
      responseTime: 2000,
      errorRate: 5.5,
      requests: 320,
      lastCheck: '2024-01-20T14:30:00Z'
    }
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alert-001',
      severity: 'error',
      title: 'STT 서비스 응답 시간 초과',
      description: 'STT 서비스의 평균 응답 시간이 2초를 초과했습니다.',
      timestamp: '2024-01-20T14:25:00Z',
      service: 'STT-서비스',
      resolved: false
    },
    {
      id: 'alert-002',
      severity: 'warning',
      title: 'TTS 서비스 에러율 증가',
      description: 'TTS 서비스의 에러율이 1%를 초과했습니다.',
      timestamp: '2024-01-20T14:20:00Z',
      service: 'TTS-서비스',
      resolved: false
    },
    {
      id: 'alert-003',
      severity: 'info',
      title: '콜봇 서비스 배포 완료',
      description: '콜봇 서비스 v1.2.0 배포가 성공적으로 완료되었습니다.',
      timestamp: '2024-01-20T14:15:00Z',
      service: '콜봇-서비스',
      resolved: true
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // [advice from AI] 메트릭 상태별 색상
  const getMetricColor = (status: string) => {
    const colors = {
      healthy: 'success',
      warning: 'warning',
      critical: 'error'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 서비스 상태별 색상
  const getServiceStatusColor = (status: string) => {
    const colors = {
      running: 'success',
      stopped: 'default',
      degraded: 'warning',
      error: 'error'
    };
    return colors[status as keyof typeof colors] || 'default';
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

  // [advice from AI] 트렌드 아이콘
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="error" fontSize="small" />;
      case 'down':
        return <TrendingDownIcon color="success" fontSize="small" />;
      default:
        return <TrendingUpIcon color="disabled" fontSize="small" />;
    }
  };

  // [advice from AI] 데이터 새로고침
  const refreshData = async () => {
    setIsRefreshing(true);
    // [advice from AI] 실제 환경에서는 API 호출
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  // [advice from AI] 자동 새로고침 (30초마다)
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      {/* [advice from AI] 모니터링 대시보드 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              모니터링 대시보드
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ECP-AI K8s Orchestrator 실시간 모니터링 및 알림
            </Typography>
            <Typography variant="body2" color="text.secondary">
              마지막 업데이트: {lastUpdated.toLocaleTimeString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>테넌트 선택</InputLabel>
              <Select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                label="테넌트 선택"
              >
                <MenuItem value="all">전체 테넌트</MenuItem>
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.tenant_name} ({tenant.tenant_id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>갱신 주기</InputLabel>
              <Select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                label="갱신 주기"
              >
                <MenuItem value={1}>1초</MenuItem>
                <MenuItem value={10}>10초</MenuItem>
                <MenuItem value={30}>30초</MenuItem>
                <MenuItem value={60}>1분</MenuItem>
                <MenuItem value={600}>10분</MenuItem>
                <MenuItem value={1800}>30분</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant={isAutoRefresh ? "contained" : "outlined"}
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              size="small"
            >
              {isAutoRefresh ? '자동 갱신 ON' : '자동 갱신 OFF'}
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                if (selectedTenant !== 'all') {
                  generateTenantMonitoringData(selectedTenant);
                }
              }}
              disabled={selectedTenant === 'all' || isLoading || isGeneratingData}
              size="small"
            >
              {isGeneratingData ? '데이터 생성 중...' : '모니터링 데이터 생성'}
            </Button>

            <Button
              variant="outlined"
              onClick={() => setShowSourceSettings(true)}
              size="small"
              color="secondary"
            >
              모니터링 소스 설정
            </Button>
            
            <IconButton 
              onClick={loadMonitoringData} 
              disabled={isLoading}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* [advice from AI] 대시보드 요약 정보 */}
        {dashboardData && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {dashboardData.totalTenants}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  전체 테넌트
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {dashboardData.activeTenants}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  활성 테넌트
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="info.main">
                  {dashboardData.totalServices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  전체 서비스
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color={dashboardData.systemHealth > 90 ? 'success.main' : 'warning.main'}>
                  {dashboardData.systemHealth}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  시스템 건강도
                </Typography>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* [advice from AI] 주요 메트릭 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {metric.name}
                  </Typography>
                  {getTrendIcon(metric.trend)}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                  {metric.value}{metric.unit}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metric.value}
                  color={getMetricColor(metric.status) as any}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    경고: {metric.threshold.warning}{metric.unit}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    임계: {metric.threshold.critical}{metric.unit}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 서비스 상태 및 알림 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <BackstageCard title="서비스 상태" variant="default">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>서비스명</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>가동률</TableCell>
                    <TableCell>응답시간</TableCell>
                    <TableCell>에러율</TableCell>
                    <TableCell>요청 수</TableCell>
                    <TableCell>마지막 체크</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.tenantMetrics?.map((tenant: any) => 
                    tenant.metrics?.services?.map((service: any, index: number) => (
                      <TableRow key={`${tenant.tenantId}-${service.name}-${index}`}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {service.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {service.type} - {tenant.tenantName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={service.status} 
                            color={getServiceStatusColor(service.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={parseFloat(service.uptime)}
                            sx={{ width: 60, height: 8, borderRadius: 1 }}
                          />
                          <Typography variant="body2">
                            {service.uptime}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {service.response_time}ms
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={parseFloat(service.error_rate) > 2 ? 'error.main' : 'text.primary'}>
                          {service.error_rate}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {service.resources?.requests_per_second?.toLocaleString() || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(service.health_checks?.last_check || Date.now()).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    ))
                  ) || services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {service.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {service.type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={service.status} 
                          color={getServiceStatusColor(service.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={service.uptime}
                            sx={{ width: 60, height: 8, borderRadius: 1 }}
                          />
                          <Typography variant="body2">
                            {service.uptime}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {service.responseTime}ms
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={service.errorRate > 2 ? 'error.main' : 'text.primary'}>
                          {service.errorRate}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {service.requests.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(service.lastCheck).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <BackstageCard title="알림" variant="default">
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {alerts.map((alert) => (
                <Alert 
                  key={alert.id} 
                  severity={alert.severity as any}
                  sx={{ mb: 2 }}
                  action={
                    <IconButton size="small" color="inherit">
                      <NotificationsIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {alert.title}
                  </Typography>
                  <Typography variant="body2">
                    {alert.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.service} • {new Date(alert.timestamp).toLocaleString()}
                  </Typography>
                </Alert>
              ))}
            </Box>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* [advice from AI] 상세 모니터링 */}
      <BackstageCard title="상세 모니터링" variant="default">
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="리소스 사용률" />
          <Tab label="네트워크 트래픽" />
          <Tab label="로그 분석" />
          <Tab label="성능 지표" />
        </Tabs>

        <Box sx={{ mt: 3 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    CPU 사용률 (24시간)
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                      {dashboardData?.metrics?.totalCpuUsage || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      평균 CPU 사용률
                    </Typography>
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={dashboardData?.metrics?.totalCpuUsage || 0} 
                        color="primary"
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        경고: 80%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        임계: 90%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    메모리 사용률 (24시간)
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h3" color="secondary" sx={{ mb: 1 }}>
                      {dashboardData?.metrics?.totalMemoryUsage || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      평균 메모리 사용률
                    </Typography>
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={dashboardData?.metrics?.totalMemoryUsage || 0} 
                        color="secondary"
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        경고: 85%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        임계: 95%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    디스크 사용률
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h3" color="info.main" sx={{ mb: 1 }}>
                      {dashboardData?.metrics?.disk_usage || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      평균 디스크 사용률
                    </Typography>
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={dashboardData?.metrics?.disk_usage || 0} 
                        color="info"
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    GPU 사용률
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h3" color="warning.main" sx={{ mb: 1 }}>
                      {dashboardData?.metrics?.gpu_usage || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      평균 GPU 사용률
                    </Typography>
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={dashboardData?.metrics?.gpu_usage || 0} 
                        color="warning"
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    네트워크 인바운드
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={100} />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    네트워크 아웃바운드
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={100} />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
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
                <div>2024-01-20 14:30:15 [INFO] 콜봇 서비스 정상 동작</div>
                <div>2024-01-20 14:30:14 [INFO] 챗봇 서비스 요청 처리 완료</div>
                <div>2024-01-20 14:30:13 [WARN] TTS 서비스 응답 지연</div>
                <div>2024-01-20 14:30:12 [ERROR] STT 서비스 연결 실패</div>
                <div>2024-01-20 14:30:11 [INFO] 모니터링 서비스 헬스 체크</div>
                <div>2024-01-20 14:30:10 [INFO] 네트워크 트래픽 정상</div>
                <div>2024-01-20 14:30:09 [INFO] CPU 사용률 75%</div>
                <div>2024-01-20 14:30:08 [INFO] 메모리 사용률 60%</div>
              </Box>
            </Paper>
          )}

          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    평균 응답 시간
                  </Typography>
                  <Typography variant="h2" color="primary">
                    120ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    P95: 250ms
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    처리량
                  </Typography>
                  <Typography variant="h2" color="success.main">
                    4.2K
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    RPS
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    가용성
                  </Typography>
                  <Typography variant="h2" color="success.main">
                    99.9%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SLA 준수
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </BackstageCard>

      {/* [advice from AI] 모니터링 소스 설정 다이얼로그 */}
      {showSourceSettings && (
        <BackstageCard title="모니터링 소스 설정" variant="default" sx={{ mt: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              기존 모니터링 소스
            </Typography>
            <Grid container spacing={2}>
              {monitoringSources.map((source, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">{source.name}</Typography>
                      <Chip 
                        label={source.isActive ? '활성' : '비활성'} 
                        color={source.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {source.sourceType} - {source.endpoint}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => testMonitoringSource(source.id)}
                      >
                        연결 테스트
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                      >
                        삭제
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              새 모니터링 소스 추가
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>소스 타입</InputLabel>
                  <Select
                    value={newSource.sourceType}
                    onChange={(e) => setNewSource({...newSource, sourceType: e.target.value})}
                    label="소스 타입"
                  >
                    <MenuItem value="prometheus">Prometheus</MenuItem>
                    <MenuItem value="grafana">Grafana</MenuItem>
                    <MenuItem value="datadog">Datadog</MenuItem>
                    <MenuItem value="newrelic">New Relic</MenuItem>
                    <MenuItem value="custom">커스텀</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="소스 이름"
                  value={newSource.name}
                  onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="엔드포인트 URL"
                  value={newSource.endpoint}
                  onChange={(e) => setNewSource({...newSource, endpoint: e.target.value})}
                  placeholder="https://prometheus.example.com:9090"
                />
              </Grid>
              
              {/* [advice from AI] 인증 정보 설정 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  인증 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="사용자명"
                      value={newSource.credentials.username || ''}
                      onChange={(e) => setNewSource({
                        ...newSource, 
                        credentials: {...newSource.credentials, username: e.target.value}
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="비밀번호"
                      type="password"
                      value={newSource.credentials.password || ''}
                      onChange={(e) => setNewSource({
                        ...newSource, 
                        credentials: {...newSource.credentials, password: e.target.value}
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API 키"
                      value={newSource.credentials.apiKey || ''}
                      onChange={(e) => setNewSource({
                        ...newSource, 
                        credentials: {...newSource.credentials, apiKey: e.target.value}
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="앱 키 (Datadog용)"
                      value={newSource.credentials.appKey || ''}
                      onChange={(e) => setNewSource({
                        ...newSource, 
                        credentials: {...newSource.credentials, appKey: e.target.value}
                      })}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* [advice from AI] 커스텀 설정 */}
              {newSource.sourceType === 'custom' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    커스텀 설정
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="테스트 엔드포인트"
                        value={newSource.settings.testEndpoint || ''}
                        onChange={(e) => setNewSource({
                          ...newSource, 
                          settings: {...newSource.settings, testEndpoint: e.target.value}
                        })}
                        placeholder="/health"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>테스트 메서드</InputLabel>
                        <Select
                          value={newSource.settings.testMethod || 'GET'}
                          onChange={(e) => setNewSource({
                            ...newSource, 
                            settings: {...newSource.settings, testMethod: e.target.value}
                          })}
                          label="테스트 메서드"
                        >
                          <MenuItem value="GET">GET</MenuItem>
                          <MenuItem value="POST">POST</MenuItem>
                          <MenuItem value="PUT">PUT</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
              )}

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowSourceSettings(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => saveMonitoringSource(newSource)}
                    disabled={!newSource.name || !newSource.endpoint}
                  >
                    저장
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </BackstageCard>
      )}
    </Box>
  );
};

export default MonitoringDashboard;
