// [advice from AI] 프로덕션 레벨 실시간 모니터링 대시보드
// WebSocket/SSE 기반 실시간 데이터, 지능형 알림, 성능 분석 시각화

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Fade,
  Zoom,
  alpha
} from '@mui/material';
import {
  Timeline,
  Refresh,
  Settings,
  Warning,
  Error,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Notifications,
  NotificationsOff,
  Analytics,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Close,
  FullScreen,
  FullScreenExit
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '@mui/material/styles';

interface MetricData {
  collector: string;
  timestamp: number;
  data: any;
  duration: number;
}

interface AlertData {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  timestamp: number;
  status: 'active' | 'sent' | 'resolved';
}

interface DashboardData {
  timestamp: number;
  timeRange: number;
  overview: {
    systemHealth: string;
    totalMetrics: number;
    metricsPerSecond: number;
    connectedClients: number;
    activeAlerts: number;
    criticalIssues: number;
  };
  metrics: {
    latest: {
      system: { cpu: number | null; memory: number | null; disk: number | null };
      database: { connections: number | null; queryTime: number | null };
      application: { uptime: number | null; memory: number | null };
    };
    collectors: Array<{
      name: string;
      lastRun: number | null;
      stats: { runs: number; errors: number; avgDuration: number };
    }>;
  };
  alerts: {
    active: AlertData[];
    channels: Array<{
      name: string;
      enabled: boolean;
      stats: { sent: number; failed: number; lastSent: number | null };
    }>;
  };
  performance: {
    overallHealth: string;
    criticalIssues: number;
    warnings: number;
    topConcerns: Array<{
      category: string;
      title: string;
      type: string;
    }>;
    trends: Record<string, string>;
  } | null;
  trends: Record<string, string>;
}

const RealTimeMonitoringDashboard: React.FC = () => {
  const theme = useTheme();
  
  // 상태 관리
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(3600000); // 1시간
  const [activeTab, setActiveTab] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // 실시간 연결 관리
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // 차트 데이터 처리
  const chartData = useMemo(() => {
    if (realtimeMetrics.length === 0) return [];
    
    // 최근 50개 데이터 포인트만 사용
    const recentMetrics = realtimeMetrics.slice(-50);
    
    return recentMetrics.map(metric => ({
      timestamp: new Date(metric.timestamp).toLocaleTimeString(),
      cpu: metric.data?.cpu?.usage || 0,
      memory: metric.data?.memory?.usage || 0,
      disk: metric.data?.disk?.usage || 0,
      connections: metric.data?.connections?.active || 0,
      queryTime: metric.data?.queries?.avgTime || 0
    }));
  }, [realtimeMetrics]);
  
  // 시스템 건강도 색상
  const getHealthColor = useCallback((health: string) => {
    switch (health) {
      case 'excellent': return theme.palette.success.main;
      case 'good': return theme.palette.info.main;
      case 'fair': return theme.palette.warning.main;
      case 'poor': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  }, [theme]);
  
  // 심각도별 색상
  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  }, [theme]);
  
  // 트렌드 아이콘
  const getTrendIcon = useCallback((trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp color="error" />;
      case 'decreasing': return <TrendingDown color="success" />;
      case 'stable': return <TrendingFlat color="info" />;
      default: return <TrendingFlat color="disabled" />;
    }
  }, []);
  
  // 대시보드 데이터 로드
  const loadDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`/api/admin/monitoring/dashboard?timeRange=${selectedTimeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`대시보드 데이터 로드 실패: ${response.status}`);
      }
      
      const result = await response.json();
      setDashboardData(result.data);
      setError(null);
      
    } catch (err) {
      console.error('대시보드 데이터 로드 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);
  
  // 실시간 연결 설정
  const setupRealTimeConnection = useCallback(() => {
    if (!isRealTimeEnabled) return;
    
    const token = localStorage.getItem('jwtToken');
    const eventSource = new EventSource(`/api/admin/monitoring/metrics/stream?token=${token}`);
    
    eventSource.onopen = () => {
      console.log('📡 실시간 모니터링 연결됨');
      setConnectionStatus('connected');
      setError(null);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'metric') {
          setRealtimeMetrics(prev => {
            const newMetrics = [...prev, data.data];
            // 최대 200개 메트릭만 유지 (메모리 절약)
            return newMetrics.slice(-200);
          });
        } else if (data.type === 'initial_data') {
          setRealtimeMetrics(data.data);
        }
        
      } catch (err) {
        console.error('실시간 데이터 파싱 오류:', err);
      }
    };
    
    eventSource.onerror = (event) => {
      console.error('실시간 연결 오류:', event);
      setConnectionStatus('disconnected');
      
      // 자동 재연결
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 실시간 연결 재시도...');
        setupRealTimeConnection();
      }, 5000);
    };
    
    eventSourceRef.current = eventSource;
  }, [isRealTimeEnabled]);
  
  // 컴포넌트 마운트
  useEffect(() => {
    loadDashboardData();
    
    if (isRealTimeEnabled) {
      setupRealTimeConnection();
    }
    
    // 주기적 대시보드 데이터 새로고침
    const refreshInterval = setInterval(loadDashboardData, 30000); // 30초
    
    return () => {
      clearInterval(refreshInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadDashboardData, setupRealTimeConnection, isRealTimeEnabled]);
  
  // 실시간 토글
  const handleRealTimeToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setIsRealTimeEnabled(enabled);
    
    if (enabled) {
      setupRealTimeConnection();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus('disconnected');
    }
  }, [setupRealTimeConnection]);
  
  // 시간 범위 변경
  const handleTimeRangeChange = useCallback((event: any) => {
    setSelectedTimeRange(event.target.value);
  }, []);
  
  // 수동 새로고침
  const handleRefresh = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);
  
  // 탭 변경
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);
  
  // 전체화면 토글
  const handleFullScreenToggle = useCallback(() => {
    setFullScreen(prev => !prev);
  }, []);
  
  // 로딩 상태
  if (loading && !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          모니터링 대시보드 로딩 중...
        </Typography>
      </Box>
    );
  }
  
  // 에러 상태
  if (error && !dashboardData) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            다시 시도
          </Button>
        }
      >
        모니터링 대시보드 로드 실패: {error}
      </Alert>
    );
  }
  
  if (!dashboardData) {
    return (
      <Alert severity="info">
        모니터링 데이터가 없습니다.
      </Alert>
    );
  }
  
  return (
    <Box sx={{ 
      position: fullScreen ? 'fixed' : 'relative',
      top: fullScreen ? 0 : 'auto',
      left: fullScreen ? 0 : 'auto',
      right: fullScreen ? 0 : 'auto',
      bottom: fullScreen ? 0 : 'auto',
      zIndex: fullScreen ? 9999 : 'auto',
      backgroundColor: fullScreen ? theme.palette.background.default : 'transparent',
      p: fullScreen ? 2 : 0
    }}>
      {/* 헤더 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4" component="h1">
            📊 실시간 모니터링 대시보드
          </Typography>
          
          <Chip
            icon={connectionStatus === 'connected' ? <CheckCircle /> : <Error />}
            label={connectionStatus === 'connected' ? '실시간 연결됨' : '연결 끊김'}
            color={connectionStatus === 'connected' ? 'success' : 'error'}
            variant="outlined"
            size="small"
          />
          
          <Chip
            label={`${dashboardData.overview.connectedClients}개 클라이언트 연결`}
            color="info"
            variant="outlined"
            size="small"
          />
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={isRealTimeEnabled}
                onChange={handleRealTimeToggle}
                size="small"
              />
            }
            label="실시간"
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>시간 범위</InputLabel>
            <Select
              value={selectedTimeRange}
              onChange={handleTimeRangeChange}
              label="시간 범위"
            >
              <MenuItem value={1800000}>30분</MenuItem>
              <MenuItem value={3600000}>1시간</MenuItem>
              <MenuItem value={10800000}>3시간</MenuItem>
              <MenuItem value={21600000}>6시간</MenuItem>
              <MenuItem value={86400000}>24시간</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="새로고침">
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="설정">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <Settings />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={fullScreen ? "전체화면 해제" : "전체화면"}>
            <IconButton onClick={handleFullScreenToggle}>
              {fullScreen ? <FullScreenExit /> : <FullScreen />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* 시스템 개요 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    시스템 상태
                  </Typography>
                  <Typography variant="h6" component="h2">
                    {dashboardData.overview.systemHealth}
                  </Typography>
                </Box>
                <CheckCircle sx={{ color: getHealthColor(dashboardData.overview.systemHealth), fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    총 메트릭
                  </Typography>
                  <Typography variant="h6" component="h2">
                    {dashboardData.overview.totalMetrics.toLocaleString()}
                  </Typography>
                </Box>
                <Analytics sx={{ color: theme.palette.info.main, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    메트릭/초
                  </Typography>
                  <Typography variant="h6" component="h2">
                    {dashboardData.overview.metricsPerSecond}
                  </Typography>
                </Box>
                <Speed sx={{ color: theme.palette.success.main, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    활성 알림
                  </Typography>
                  <Typography variant="h6" component="h2" color={dashboardData.overview.activeAlerts > 0 ? "error" : "textPrimary"}>
                    {dashboardData.overview.activeAlerts}
                  </Typography>
                </Box>
                <Warning sx={{ color: dashboardData.overview.activeAlerts > 0 ? theme.palette.error.main : theme.palette.grey[400], fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    심각한 문제
                  </Typography>
                  <Typography variant="h6" component="h2" color={dashboardData.overview.criticalIssues > 0 ? "error" : "textPrimary"}>
                    {dashboardData.overview.criticalIssues}
                  </Typography>
                </Box>
                <Error sx={{ color: dashboardData.overview.criticalIssues > 0 ? theme.palette.error.main : theme.palette.grey[400], fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    연결된 클라이언트
                  </Typography>
                  <Typography variant="h6" component="h2">
                    {dashboardData.overview.connectedClients}
                  </Typography>
                </Box>
                <NetworkCheck sx={{ color: theme.palette.primary.main, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="실시간 메트릭" />
          <Tab label="성능 분석" />
          <Tab label="알림 관리" />
          <Tab label="시스템 상태" />
        </Tabs>
      </Box>
      
      {/* 탭 콘텐츠 */}
      {activeTab === 0 && (
        <Fade in={activeTab === 0}>
          <Grid container spacing={3}>
            {/* 실시간 차트 */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    실시간 시스템 메트릭
                  </Typography>
                  
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="cpu" stroke={theme.palette.error.main} name="CPU %" />
                        <Line type="monotone" dataKey="memory" stroke={theme.palette.warning.main} name="Memory %" />
                        <Line type="monotone" dataKey="disk" stroke={theme.palette.info.main} name="Disk %" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                      <Typography color="textSecondary">
                        실시간 데이터를 수집하는 중...
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* 현재 메트릭 */}
            <Grid item xs={12} lg={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        현재 시스템 상태
                      </Typography>
                      
                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2">CPU 사용률</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dashboardData.metrics.latest.system.cpu?.toFixed(1) || 0}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={dashboardData.metrics.latest.system.cpu || 0}
                          color={
                            (dashboardData.metrics.latest.system.cpu || 0) > 80 ? 'error' :
                            (dashboardData.metrics.latest.system.cpu || 0) > 60 ? 'warning' : 'primary'
                          }
                        />
                      </Box>
                      
                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2">메모리 사용률</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dashboardData.metrics.latest.system.memory?.toFixed(1) || 0}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={dashboardData.metrics.latest.system.memory || 0}
                          color={
                            (dashboardData.metrics.latest.system.memory || 0) > 80 ? 'error' :
                            (dashboardData.metrics.latest.system.memory || 0) > 60 ? 'warning' : 'primary'
                          }
                        />
                      </Box>
                      
                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2">디스크 사용률</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dashboardData.metrics.latest.system.disk?.toFixed(1) || 0}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={dashboardData.metrics.latest.system.disk || 0}
                          color={
                            (dashboardData.metrics.latest.system.disk || 0) > 80 ? 'error' :
                            (dashboardData.metrics.latest.system.disk || 0) > 60 ? 'warning' : 'primary'
                          }
                        />
                      </Box>
                      
                      <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2">DB 연결 수</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dashboardData.metrics.latest.database.connections || 0}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((dashboardData.metrics.latest.database.connections || 0) / 100 * 100, 100)}
                          color="info"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        수집기 상태
                      </Typography>
                      
                      {dashboardData.metrics.collectors.map((collector, index) => (
                        <Box key={index} mb={1}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">{collector.name}</Typography>
                            <Chip
                              size="small"
                              label={collector.lastRun ? '활성' : '비활성'}
                              color={collector.lastRun ? 'success' : 'error'}
                              variant="outlined"
                            />
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            실행: {collector.stats.runs}회, 오류: {collector.stats.errors}회
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Fade>
      )}
      
      {activeTab === 1 && (
        <Fade in={activeTab === 1}>
          <Grid container spacing={3}>
            {/* 성능 분석 결과 */}
            {dashboardData.performance ? (
              <>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        성능 분석 결과
                      </Typography>
                      
                      <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <Chip
                          label={`전체 상태: ${dashboardData.performance.overallHealth}`}
                          color={
                            dashboardData.performance.overallHealth === 'excellent' ? 'success' :
                            dashboardData.performance.overallHealth === 'good' ? 'info' :
                            dashboardData.performance.overallHealth === 'fair' ? 'warning' : 'error'
                          }
                        />
                        <Chip
                          label={`심각한 문제: ${dashboardData.performance.criticalIssues}개`}
                          color={dashboardData.performance.criticalIssues > 0 ? 'error' : 'success'}
                          variant="outlined"
                        />
                        <Chip
                          label={`경고: ${dashboardData.performance.warnings}개`}
                          color={dashboardData.performance.warnings > 0 ? 'warning' : 'success'}
                          variant="outlined"
                        />
                      </Box>
                      
                      {dashboardData.performance.topConcerns.length > 0 && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            주요 우려사항
                          </Typography>
                          {dashboardData.performance.topConcerns.map((concern, index) => (
                            <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                <strong>{concern.category}</strong>: {concern.title}
                              </Typography>
                            </Alert>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        트렌드 분석
                      </Typography>
                      
                      {Object.entries(dashboardData.performance.trends).map(([category, trend]) => (
                        <Box key={category} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">{category}</Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getTrendIcon(trend)}
                            <Typography variant="body2" color="textSecondary">
                              {trend}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Alert severity="info">
                  성능 분석을 위한 데이터가 부족합니다. 더 많은 메트릭이 수집되면 분석 결과가 표시됩니다.
                </Alert>
              </Grid>
            )}
          </Grid>
        </Fade>
      )}
      
      {activeTab === 2 && (
        <Fade in={activeTab === 2}>
          <Grid container spacing={3}>
            {/* 활성 알림 */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    활성 알림
                  </Typography>
                  
                  {dashboardData.alerts.active.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>심각도</TableCell>
                            <TableCell>제목</TableCell>
                            <TableCell>메시지</TableCell>
                            <TableCell>시간</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboardData.alerts.active.map((alert) => (
                            <TableRow key={alert.id}>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={alert.severity}
                                  color={
                                    alert.severity === 'critical' ? 'error' :
                                    alert.severity === 'high' ? 'warning' :
                                    alert.severity === 'medium' ? 'info' : 'success'
                                  }
                                />
                              </TableCell>
                              <TableCell>{alert.title}</TableCell>
                              <TableCell>{alert.message}</TableCell>
                              <TableCell>
                                {new Date(alert.timestamp).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                      <Typography color="textSecondary">
                        활성 알림이 없습니다.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* 알림 채널 상태 */}
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    알림 채널 상태
                  </Typography>
                  
                  {dashboardData.alerts.channels.map((channel, index) => (
                    <Box key={index} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">{channel.name}</Typography>
                        <Chip
                          size="small"
                          icon={channel.enabled ? <Notifications /> : <NotificationsOff />}
                          label={channel.enabled ? '활성' : '비활성'}
                          color={channel.enabled ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        발송: {channel.stats.sent}회, 실패: {channel.stats.failed}회
                      </Typography>
                      {channel.stats.lastSent && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          마지막 발송: {new Date(channel.stats.lastSent).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}
      
      {activeTab === 3 && (
        <Fade in={activeTab === 3}>
          <Grid container spacing={3}>
            {/* 시스템 구성 요소 상태 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    모니터링 시스템 구성 요소
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.success.main, 0.1) }}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <CheckCircle color="success" />
                          <Typography variant="subtitle1">메트릭 수집기</Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          실시간 시스템 메트릭 수집 중
                        </Typography>
                        <Typography variant="caption">
                          수집기: {dashboardData.metrics.collectors.length}개 활성
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.info.main, 0.1) }}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <CheckCircle color="info" />
                          <Typography variant="subtitle1">지능형 알림 시스템</Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          머신러닝 기반 이상 감지 활성
                        </Typography>
                        <Typography variant="caption">
                          채널: {dashboardData.alerts.channels.filter(c => c.enabled).length}개 활성
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, backgroundColor: alpha(theme.palette.warning.main, 0.1) }}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Analytics color="warning" />
                          <Typography variant="subtitle1">성능 분석기</Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          {dashboardData.performance ? '분석 결과 사용 가능' : '데이터 수집 중'}
                        </Typography>
                        <Typography variant="caption">
                          상태: {dashboardData.performance?.overallHealth || '분석 중'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}
      
      {/* 설정 대화상자 */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          모니터링 설정
          <IconButton
            onClick={() => setSettingsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={isRealTimeEnabled}
                  onChange={handleRealTimeToggle}
                />
              }
              label="실시간 모니터링 활성화"
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              실시간 데이터 스트림을 통해 최신 메트릭을 수신합니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RealTimeMonitoringDashboard;
