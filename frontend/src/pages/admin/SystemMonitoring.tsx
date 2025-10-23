import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Alert,
  LinearProgress, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkCheckIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface SystemMetrics {
  hostname: string;
  service_name: string;
  cpu_usage_percent: number;
  cpu_load_1m: number;
  cpu_load_5m: number;
  cpu_load_15m: number;
  cpu_cores: number;
  memory_total_gb: number;
  memory_used_gb: number;
  memory_free_gb: number;
  memory_usage_percent: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_usage_percent: number;
  network_connections_active: number;
  process_count: number;
  timestamp: string;
}

interface ServiceHealth {
  service_name: string;
  service_type: string;
  endpoint_url: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  response_time_ms: number;
  http_status_code?: number;
  error_message?: string;
}

interface ActiveAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggered_at: string;
  metric_value: number;
  threshold_value: number;
  rule_name: string;
  metric_type: string;
}

const SystemMonitoring: React.FC = () => {
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<ActiveAlert | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const { token } = useJwtAuthStore();

  useEffect(() => {
    loadSystemStatus();
    
    // 자동 새로고침 (30초마다)
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadSystemStatus, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadSystemStatus = async () => {
    setLoading(true);
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const [systemResponse, healthResponse] = await Promise.all([
        fetch(`${apiUrl}/api/admin/system/current`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiUrl}/api/admin/services/health`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        if (systemData.success) {
          setCurrentMetrics(systemData.data.current_metrics);
          setActiveAlerts(systemData.data.active_alerts || []);
        }
      }

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.success) {
          setServiceHealth(healthData.data.current_status || []);
        }
      }

    } catch (error) {
      console.error('시스템 상태 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const handleAlertClick = (alert: ActiveAlert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>시스템 모니터링</Typography>
          <Typography variant="body1" color="text.secondary">
            Timbel CI/CD Operator Solution 서비스 상태 모니터링
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            label={autoRefresh ? '자동 새로고침 ON' : '자동 새로고침 OFF'} 
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            clickable
          />
          <Button
            variant="outlined"
            onClick={loadSystemStatus}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            새로고침
          </Button>
        </Box>
      </Box>

      {/* 서비스 상태 개요 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>전체 서비스</Typography>
                  <Typography variant="h4">
                    {serviceHealth.length}
                  </Typography>
                </Box>
                <ComputerIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>정상 서비스</Typography>
                  <Typography variant="h4" color="success.main">
                    {serviceHealth.filter(s => s.status === 'healthy').length}
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>활성 알림</Typography>
                  <Typography variant="h4" color="warning.main">
                    {activeAlerts.length}
                  </Typography>
                </Box>
                <WarningIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>업타임</Typography>
                  <Typography variant="h4" color="info.main">
                    99.9%
                  </Typography>
                </Box>
                <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 실시간 시스템 메트릭 */}
      {currentMetrics && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ComputerIcon />
              실시간 시스템 리소스 ({currentMetrics.hostname})
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              {/* CPU 사용률 */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      CPU 사용률
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {currentMetrics.cpu_usage_percent}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.max(0, Math.min(100, currentMetrics.cpu_usage_percent || 0))} 
                    color={getUsageColor(currentMetrics.cpu_usage_percent)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Load: {currentMetrics.cpu_load_1m} / {currentMetrics.cpu_load_5m} / {currentMetrics.cpu_load_15m} 
                    ({currentMetrics.cpu_cores} cores)
                  </Typography>
                </Box>
              </Grid>

              {/* 메모리 사용률 */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      메모리 사용률
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {currentMetrics.memory_usage_percent}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.max(0, Math.min(100, currentMetrics.memory_usage_percent || 0))} 
                    color={getUsageColor(currentMetrics.memory_usage_percent)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {currentMetrics.memory_used_gb}GB / {currentMetrics.memory_total_gb}GB 사용
                  </Typography>
                </Box>
              </Grid>

              {/* 디스크 사용률 */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      디스크 사용률
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {currentMetrics.disk_usage_percent}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.max(0, Math.min(100, currentMetrics.disk_usage_percent || 0))} 
                    color={getUsageColor(currentMetrics.disk_usage_percent)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {currentMetrics.disk_used_gb}GB / {currentMetrics.disk_total_gb}GB 사용
                  </Typography>
                </Box>
              </Grid>

              {/* 프로세스 정보 */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    프로세스 정보
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip label={`총 ${currentMetrics.process_count}개`} size="small" />
                    <Chip label={`활성 연결 ${currentMetrics.network_connections_active}개`} size="small" color="info" />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* 서비스 상태 */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>서비스 상태</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>서비스명</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>응답시간</TableCell>
                      <TableCell>상태코드</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {serviceHealth.map((service, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{service.service_name}</TableCell>
                        <TableCell>
                          <Chip label={service.service_type} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={service.status} 
                            color={getStatusColor(service.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {service.response_time_ms ? `${service.response_time_ms}ms` : '-'}
                        </TableCell>
                        <TableCell>
                          {service.http_status_code || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {serviceHealth.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Alert severity="info">서비스 상태 정보를 로드 중입니다...</Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 활성 알림 */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>활성 알림</Typography>
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {activeAlerts.map((alert) => (
                  <Alert 
                    key={alert.id}
                    severity={getSeverityColor(alert.severity) as any}
                    sx={{ mb: 1, cursor: 'pointer' }}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {alert.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alert.triggered_at).toLocaleString()}
                      </Typography>
                    </Box>
                  </Alert>
                ))}
                {activeAlerts.length === 0 && (
                  <Alert severity="success">
                    현재 활성 알림이 없습니다.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 알림 상세 다이얼로그 */}
      <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>알림 상세 정보</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" color={getSeverityColor(selectedAlert.severity) + '.main'}>
                    {selectedAlert.title}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">발생 시간</Typography>
                  <Typography variant="body1">
                    {new Date(selectedAlert.triggered_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">심각도</Typography>
                  <Chip 
                    label={selectedAlert.severity.toUpperCase()} 
                    color={getSeverityColor(selectedAlert.severity) as any}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">현재 값</Typography>
                  <Typography variant="body1">{selectedAlert.metric_value}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">임계값</Typography>
                  <Typography variant="body1">{selectedAlert.threshold_value}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">메시지</Typography>
                  <Typography variant="body1">{selectedAlert.message}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">규칙명</Typography>
                  <Typography variant="body1">{selectedAlert.rule_name}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemMonitoring;
