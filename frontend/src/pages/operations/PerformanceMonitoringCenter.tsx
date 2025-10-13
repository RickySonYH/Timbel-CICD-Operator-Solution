// [advice from AI] STEP 5: 성능 모니터링 - 배포된 서비스 모니터링, 메트릭 수집, 알림 설정
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PerformanceMonitoringCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // 성능 메트릭
  const [serviceMetrics, setServiceMetrics] = useState<any[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // 모니터링 대시보드
  const [dashboards, setDashboards] = useState<any[]>([]);
  
  // 알림 설정
  const [alertRules, setAlertRules] = useState<any[]>([]);
  const [alertDialog, setAlertDialog] = useState(false);

  useEffect(() => {
    if (token) {
      loadMonitoringData();
      
      // 자동 새로고침 (1분마다)
      const interval = autoRefresh ? setInterval(() => {
        loadMonitoringData();
      }, 60000) : null;
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [token, autoRefresh]);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      
      // 샘플 데이터 (실제로는 Prometheus/Grafana API 호출)
      setServiceMetrics([
        {
          service_name: 'ECP-AI Orchestrator',
          namespace: 'ecp-ai-prod',
          status: 'healthy',
          cpu_usage: 65,
          memory_usage: 78,
          disk_usage: 45,
          network_in: '2.5 MB/s',
          network_out: '1.8 MB/s',
          requests_per_minute: 1250,
          response_time_avg: 145,
          error_rate: 0.2,
          uptime: '99.8%',
          last_restart: '2025-09-28T10:30:00Z',
          replicas: { running: 3, desired: 3 }
        },
        {
          service_name: 'User Service',
          namespace: 'user-service-prod',
          status: 'healthy',
          cpu_usage: 45,
          memory_usage: 60,
          disk_usage: 30,
          network_in: '1.2 MB/s',
          network_out: '0.8 MB/s',
          requests_per_minute: 800,
          response_time_avg: 95,
          error_rate: 0.1,
          uptime: '99.9%',
          last_restart: '2025-09-29T08:15:00Z',
          replicas: { running: 2, desired: 2 }
        },
        {
          service_name: 'Frontend Dashboard',
          namespace: 'frontend-prod',
          status: 'warning',
          cpu_usage: 85,
          memory_usage: 90,
          disk_usage: 70,
          network_in: '5.2 MB/s',
          network_out: '3.1 MB/s',
          requests_per_minute: 2100,
          response_time_avg: 280,
          error_rate: 1.5,
          uptime: '98.5%',
          last_restart: '2025-09-30T09:45:00Z',
          replicas: { running: 1, desired: 2 }
        }
      ]);

      setSystemMetrics({
        cluster_cpu_usage: 72,
        cluster_memory_usage: 68,
        cluster_storage_usage: 55,
        node_count: 5,
        pod_count: 45,
        service_count: 15,
        ingress_count: 8,
        total_requests_per_minute: 4150,
        avg_response_time: 165,
        overall_error_rate: 0.6,
        cluster_uptime: '99.7%'
      });

      setAlerts([
        {
          id: '1',
          service: 'Frontend Dashboard',
          severity: 'critical',
          message: 'High CPU usage detected (85%)',
          timestamp: '2025-09-30T11:30:00Z',
          status: 'firing',
          duration: '15m'
        },
        {
          id: '2',
          service: 'Frontend Dashboard',
          severity: 'warning',
          message: 'Memory usage above threshold (90%)',
          timestamp: '2025-09-30T11:25:00Z',
          status: 'firing',
          duration: '20m'
        },
        {
          id: '3',
          service: 'ECP-AI Orchestrator',
          severity: 'warning',
          message: 'Response time increased (145ms)',
          timestamp: '2025-09-30T11:15:00Z',
          status: 'resolved',
          duration: '5m'
        }
      ]);

      setDashboards([
        {
          name: 'System Overview',
          description: '전체 시스템 현황 대시보드',
          url: 'https://grafana.rdc.rickyson.com/d/system-overview',
          panels: 12,
          last_updated: '2025-09-30T11:30:00Z'
        },
        {
          name: 'Application Metrics',
          description: '애플리케이션별 성능 지표',
          url: 'https://grafana.rdc.rickyson.com/d/app-metrics',
          panels: 8,
          last_updated: '2025-09-30T11:25:00Z'
        },
        {
          name: 'Infrastructure Health',
          description: '인프라 상태 모니터링',
          url: 'https://grafana.rdc.rickyson.com/d/infra-health',
          panels: 15,
          last_updated: '2025-09-30T11:20:00Z'
        }
      ]);

      setAlertRules([
        {
          id: '1',
          name: 'High CPU Usage',
          condition: 'CPU > 80%',
          severity: 'critical',
          enabled: true,
          notification_channels: ['email', 'slack']
        },
        {
          id: '2',
          name: 'Memory Usage Warning',
          condition: 'Memory > 85%',
          severity: 'warning',
          enabled: true,
          notification_channels: ['slack']
        },
        {
          id: '3',
          name: 'High Error Rate',
          condition: 'Error Rate > 5%',
          severity: 'critical',
          enabled: true,
          notification_channels: ['email', 'slack', 'pe_notification']
        }
      ]);

    } catch (error) {
      console.error('모니터링 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': case 'error': return 'error';
      default: return 'info';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          성능 모니터링 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          배포된 서비스 실시간 모니터링, 메트릭 수집, 알림 관리
        </Typography>
      </Box>

      {/* 시스템 전체 메트릭 요약 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {systemMetrics.cluster_cpu_usage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    클러스터 CPU
                  </Typography>
                </Box>
                null
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={systemMetrics.cluster_cpu_usage} 
                sx={{ mt: 1, height: 6, borderRadius: 1 }}
                color={systemMetrics.cluster_cpu_usage > 80 ? 'error' : 'primary'}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {systemMetrics.cluster_memory_usage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    클러스터 메모리
                  </Typography>
                </Box>
                null
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={systemMetrics.cluster_memory_usage} 
                sx={{ mt: 1, height: 6, borderRadius: 1 }}
                color={systemMetrics.cluster_memory_usage > 85 ? 'error' : 'success'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {systemMetrics.avg_response_time}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    평균 응답시간
                  </Typography>
                </Box>
                null
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {systemMetrics.overall_error_rate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 오류율
                  </Typography>
                </Box>
                null
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 제어 패널 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="자동 새로고침 (1분)"
          />
          <Button
            variant="outlined"
            onClick={loadMonitoringData}
          >
            새로고침
          </Button>
        </Box>
        
        <Button
          variant="contained"
          onClick={() => window.open('https://grafana.rdc.rickyson.com', '_blank')}
        >
          Grafana 대시보드
        </Button>
      </Box>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="서비스 메트릭" />
          <Tab label="실시간 알림" />
          <Tab label="대시보드" />
          <Tab label="알림 규칙" />
        </Tabs>
      </Paper>

      {/* TAB 1: 서비스 메트릭 */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {serviceMetrics.map((service, index) => (
            <Grid item xs={12} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {service.service_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip 
                          label={service.namespace} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={service.status} 
                          size="small" 
                          color={getStatusColor(service.status)}
                        />
                        <Chip 
                          label={`${service.replicas.running}/${service.replicas.desired} Replicas`} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Uptime: {service.uptime} • 마지막 재시작: {new Date(service.last_restart).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={3}>
                    {/* 리소스 사용률 */}
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          리소스 사용률
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">CPU</Typography>
                            <Typography variant="body2">{service.cpu_usage}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={service.cpu_usage} 
                            sx={{ height: 6, borderRadius: 1 }}
                            color={service.cpu_usage > 80 ? 'error' : 'primary'}
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Memory</Typography>
                            <Typography variant="body2">{service.memory_usage}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={service.memory_usage} 
                            sx={{ height: 6, borderRadius: 1 }}
                            color={service.memory_usage > 85 ? 'error' : 'success'}
                          />
                        </Box>
                        
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Disk</Typography>
                            <Typography variant="body2">{service.disk_usage}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={service.disk_usage} 
                            sx={{ height: 6, borderRadius: 1 }}
                            color={service.disk_usage > 90 ? 'error' : 'info'}
                          />
                        </Box>
                      </Paper>
                    </Grid>

                    {/* 네트워크 & 성능 */}
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          네트워크 & 성능
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Network In</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {service.network_in}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Network Out</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {service.network_out}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Requests/min</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {service.requests_per_minute.toLocaleString()}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Avg Response</Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: service.response_time_avg > 200 ? 'error.main' : 'text.primary'
                            }}
                          >
                            {service.response_time_avg}ms
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* 오류율 & 상태 */}
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          서비스 상태
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2">Error Rate</Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 600,
                              color: service.error_rate > 1 ? 'error.main' : 'success.main'
                            }}
                          >
                            {service.error_rate}%
                          </Typography>
                        </Box>
                        
                        <Box sx={{ textAlign: 'center' }}>
                          {service.status === 'healthy' ? (
                            null
                          ) : service.status === 'warning' ? (
                            null
                          ) : (
                            null
                          )}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {service.status}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* TAB 2: 실시간 알림 */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            활성 알림 ({alerts.filter(alert => alert.status === 'firing').length}개)
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {alerts.map((alert) => (
            <Grid item xs={12} key={alert.id}>
              <Alert 
                severity={getSeverityColor(alert.severity)} 
                sx={{ 
                  '& .MuiAlert-message': { width: '100%' },
                  opacity: alert.status === 'resolved' ? 0.6 : 1
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {alert.service}: {alert.message}
                    </Typography>
                    <Typography variant="body2">
                      발생 시간: {new Date(alert.timestamp).toLocaleString()} • 지속 시간: {alert.duration}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={alert.severity} 
                      size="small" 
                      color={getSeverityColor(alert.severity)}
                    />
                    <Chip 
                      label={alert.status} 
                      size="small" 
                      color={alert.status === 'firing' ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Alert>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* TAB 3: 대시보드 */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {dashboards.map((dashboard, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {dashboard.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {dashboard.description}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    패널 수: {dashboard.panels}개
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    마지막 업데이트: {new Date(dashboard.last_updated).toLocaleString()}
                  </Typography>
                  <Button 
                    variant="contained" 
                    fullWidth
                    onClick={() => window.open(dashboard.url, '_blank')}
                  >
                    대시보드 열기
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* TAB 4: 알림 규칙 */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            알림 규칙 관리
          </Typography>
          <Button 
            variant="contained"
            onClick={() => setAlertDialog(true)}
          >
            규칙 추가
          </Button>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>규칙명</TableCell>
                <TableCell>조건</TableCell>
                <TableCell>심각도</TableCell>
                <TableCell>알림 채널</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alertRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {rule.condition}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={rule.severity} 
                      size="small" 
                      color={getSeverityColor(rule.severity)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {rule.notification_channels.map((channel: string, index: number) => (
                        <Chip 
                          key={index}
                          label={channel} 
                          size="small" 
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={rule.enabled} 
                      size="small"
                      onChange={(e) => {
                        // 실제로는 API 호출
                        console.log(`Alert rule ${rule.name} ${e.target.checked ? 'enabled' : 'disabled'}`);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small">
                      편집
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* 알림 규칙 추가 다이얼로그 */}
      <Dialog open={alertDialog} onClose={() => setAlertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>알림 규칙 추가</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="규칙명"
              placeholder="High Memory Usage"
            />
            <TextField
              fullWidth
              label="조건"
              placeholder="Memory > 85%"
              helperText="예: CPU > 80%, Memory > 85%, Error Rate > 5%"
            />
            <FormControl fullWidth>
              <InputLabel>심각도</InputLabel>
              <Select label="심각도" defaultValue="warning">
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              placeholder="알림 규칙에 대한 설명을 입력하세요..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog(false)}>취소</Button>
          <Button variant="contained" onClick={() => {
            alert('알림 규칙이 추가되었습니다!');
            setAlertDialog(false);
          }}>
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PerformanceMonitoringCenter;
