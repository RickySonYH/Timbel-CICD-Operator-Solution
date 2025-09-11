import React, { useState, useEffect } from 'react';
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
  CircularProgress
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
  const [metrics, setMetrics] = useState<MetricData[]>([
    {
      name: 'CPU 사용률',
      value: 75,
      unit: '%',
      trend: 'up',
      threshold: { warning: 80, critical: 90 },
      status: 'healthy'
    },
    {
      name: '메모리 사용률',
      value: 60,
      unit: '%',
      trend: 'stable',
      threshold: { warning: 85, critical: 95 },
      status: 'healthy'
    },
    {
      name: '네트워크 트래픽',
      value: 1.2,
      unit: 'GB/s',
      trend: 'up',
      threshold: { warning: 2.0, critical: 3.0 },
      status: 'healthy'
    },
    {
      name: '디스크 사용률',
      value: 45,
      unit: '%',
      trend: 'stable',
      threshold: { warning: 80, critical: 90 },
      status: 'healthy'
    },
    {
      name: '응답 시간',
      value: 120,
      unit: 'ms',
      trend: 'down',
      threshold: { warning: 500, critical: 1000 },
      status: 'healthy'
    },
    {
      name: '에러율',
      value: 0.5,
      unit: '%',
      trend: 'stable',
      threshold: { warning: 2.0, critical: 5.0 },
      status: 'healthy'
    }
  ]);

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

  const [activeTab, setActiveTab] = useState(0);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              모니터링 대시보드
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ECP-AI K8s Orchestrator 실시간 모니터링 및 알림
            </Typography>
          </Box>
          <IconButton 
            onClick={refreshData} 
            disabled={isRefreshing}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
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
                  {services.map((service) => (
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
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={100} />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    메모리 사용률 (24시간)
                  </Typography>
                  <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={100} />
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
    </Box>
  );
};

export default MonitoringDashboard;
