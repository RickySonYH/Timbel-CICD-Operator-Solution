// [advice from AI] SLA 관리 페이지 - 서비스 레벨 협약 모니터링 및 관리
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] SLA 메트릭 타입
interface SLAMetric {
  id: string;
  service_name: string;
  metric_type: 'uptime' | 'response_time' | 'error_rate' | 'availability';
  current_value: number;
  target_value: number;
  threshold_warning: number;
  threshold_critical: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  measured_at: string;
}

// [advice from AI] SLA 알림 타입
interface SLAAlert {
  id: string;
  service_name: string;
  metric_type: string;
  alert_level: 'warning' | 'critical';
  message: string;
  current_value: number;
  threshold_value: number;
  status: 'active' | 'resolved' | 'acknowledged';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

// [advice from AI] SLA 대시보드 메트릭
interface SLADashboard {
  totalServices: number;
  healthyServices: number;
  warningServices: number;
  criticalServices: number;
  activeAlerts: number;
  avgUptime: number;
  avgResponseTime: number;
  avgErrorRate: number;
}

const SLAManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [alerts, setAlerts] = useState<SLAAlert[]>([]);
  const [dashboard, setDashboard] = useState<SLADashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<SLAMetric | null>(null);
  const [formData, setFormData] = useState({
    service_name: '',
    metric_type: 'uptime' as SLAMetric['metric_type'],
    target_value: 99.9,
    threshold_warning: 99.0,
    threshold_critical: 98.0,
    unit: 'percent'
  });

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const [metricsRes, alertsRes, dashboardRes] = await Promise.all([
        fetch('/api/operations/sla-metrics', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/operations/sla-alerts', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/operations/sla-dashboard', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboard(data.dashboard);
      }
      
    } catch (error) {
      console.error('SLA 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] SLA 메트릭 생성
  const handleCreateMetric = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('/api/operations/sla-metrics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('SLA 메트릭 생성 실패');
      }

      setCreateDialog(false);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('SLA 메트릭 생성 실패:', error);
    }
  };

  // [advice from AI] 알림 해결 처리
  const handleResolveAlert = async (alertId: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch(`/api/operations/sla-alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resolved_by: user?.id })
      });

      if (!response.ok) {
        throw new Error('알림 해결 처리 실패');
      }

      loadData();
      
    } catch (error) {
      console.error('알림 해결 처리 실패:', error);
    }
  };

  // [advice from AI] 폼 초기화
  const resetForm = () => {
    setFormData({
      service_name: '',
      metric_type: 'uptime',
      target_value: 99.9,
      threshold_warning: 99.0,
      threshold_critical: 98.0,
      unit: 'percent'
    });
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 메트릭 타입별 라벨
  const getMetricLabel = (type: string) => {
    switch (type) {
      case 'uptime': return '가동률';
      case 'response_time': return '응답시간';
      case 'error_rate': return '오류율';
      case 'availability': return '가용성';
      default: return type;
    }
  };

  // [advice from AI] 서비스별 그룹화
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.service_name]) {
      acc[metric.service_name] = [];
    }
    acc[metric.service_name].push(metric);
    return acc;
  }, {} as { [key: string]: SLAMetric[] });

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          SLA 관리
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        SLA 관리
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        서비스 레벨 협약 모니터링 및 성능 지표 관리
      </Typography>

      {/* [advice from AI] SLA 대시보드 메트릭 */}
      {dashboard && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 서비스
                </Typography>
                <Typography variant="h4" color="primary">
                  {dashboard.totalServices}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  건강: {dashboard.healthyServices}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  평균 가동률
                </Typography>
                <Typography variant="h4" color={dashboard.avgUptime >= 99 ? "success.main" : "error.main"}>
                  {dashboard.avgUptime.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  목표: 99.5%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  평균 응답시간
                </Typography>
                <Typography variant="h4" color={dashboard.avgResponseTime <= 200 ? "success.main" : "warning.main"}>
                  {dashboard.avgResponseTime}ms
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  목표: 200ms 이하
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  활성 알림
                </Typography>
                <Typography variant="h4" color="error.main">
                  {dashboard.activeAlerts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  즉시 처리 필요
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`메트릭 현황 (${metrics.length})`} />
        <Tab label={`활성 알림 (${alerts.filter(a => a.status === 'active').length})`} />
        <Tab label="서비스별 현황" />
        <Tab label="알림 히스토리" />
      </Tabs>

      {/* [advice from AI] 메트릭 현황 탭 */}
      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">SLA 메트릭 현황</Typography>
            {permissions.canManageDeployment && (
              <Button variant="contained" onClick={() => setCreateDialog(true)}>
                새 메트릭 추가
              </Button>
            )}
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>서비스명</TableCell>
                  <TableCell>메트릭</TableCell>
                  <TableCell align="right">현재값</TableCell>
                  <TableCell align="right">목표값</TableCell>
                  <TableCell align="right">경고 임계치</TableCell>
                  <TableCell align="right">위험 임계치</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>측정시간</TableCell>
                  {permissions.canManageDeployment && <TableCell align="center">작업</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.id} hover>
                    <TableCell>{metric.service_name}</TableCell>
                    <TableCell>{getMetricLabel(metric.metric_type)}</TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        color={getStatusColor(metric.status) + '.main'}
                        fontWeight={600}
                      >
                        {metric.current_value}{metric.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{metric.target_value}{metric.unit}</TableCell>
                    <TableCell align="right">{metric.threshold_warning}{metric.unit}</TableCell>
                    <TableCell align="right">{metric.threshold_critical}{metric.unit}</TableCell>
                    <TableCell>
                      <Chip 
                        label={metric.status} 
                        color={getStatusColor(metric.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(metric.measured_at).toLocaleString()}
                    </TableCell>
                    {permissions.canManageDeployment && (
                      <TableCell align="center">
                        <Button 
                          size="small" 
                          onClick={() => {
                            setSelectedMetric(metric);
                            setFormData({
                              service_name: metric.service_name,
                              metric_type: metric.metric_type,
                              target_value: metric.target_value,
                              threshold_warning: metric.threshold_warning,
                              threshold_critical: metric.threshold_critical,
                              unit: metric.unit
                            });
                            setEditDialog(true);
                          }}
                        >
                          수정
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* [advice from AI] 활성 알림 탭 */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>서비스명</TableCell>
                <TableCell>메트릭</TableCell>
                <TableCell>레벨</TableCell>
                <TableCell>메시지</TableCell>
                <TableCell align="right">현재값</TableCell>
                <TableCell align="right">임계값</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>발생시간</TableCell>
                {permissions.canManageDeployment && <TableCell align="center">작업</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.filter(alert => alert.status === 'active').map((alert) => (
                <TableRow key={alert.id} hover>
                  <TableCell>{alert.service_name}</TableCell>
                  <TableCell>{getMetricLabel(alert.metric_type)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.alert_level} 
                      color={alert.alert_level === 'critical' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell align="right">{alert.current_value}</TableCell>
                  <TableCell align="right">{alert.threshold_value}</TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.status} 
                      color={alert.status === 'active' ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(alert.created_at).toLocaleString()}
                  </TableCell>
                  {permissions.canManageDeployment && (
                    <TableCell align="center">
                      <Button 
                        size="small" 
                        color="success"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        해결
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* [advice from AI] 서비스별 현황 탭 */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {Object.entries(groupedMetrics).map(([serviceName, serviceMetrics]) => (
            <Grid item xs={12} md={6} key={serviceName}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {serviceName}
                </Typography>
                <List dense>
                  {serviceMetrics.map((metric) => (
                    <ListItem key={metric.id}>
                      <ListItemText
                        primary={getMetricLabel(metric.metric_type)}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {metric.current_value}{metric.unit}
                            </Typography>
                            <Chip 
                              label={metric.status} 
                              color={getStatusColor(metric.status) as any}
                              size="small"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 알림 히스토리 탭 */}
      {tabValue === 3 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>서비스명</TableCell>
                <TableCell>메트릭</TableCell>
                <TableCell>레벨</TableCell>
                <TableCell>메시지</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>발생시간</TableCell>
                <TableCell>해결시간</TableCell>
                <TableCell>해결자</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id} hover>
                  <TableCell>{alert.service_name}</TableCell>
                  <TableCell>{getMetricLabel(alert.metric_type)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.alert_level} 
                      color={alert.alert_level === 'critical' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.status} 
                      color={alert.status === 'active' ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(alert.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {alert.resolved_at ? new Date(alert.resolved_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>{alert.resolved_by || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* [advice from AI] 메트릭 생성 대화상자 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 SLA 메트릭 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="서비스명"
            fullWidth
            variant="outlined"
            value={formData.service_name}
            onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>메트릭 타입</InputLabel>
            <Select
              value={formData.metric_type}
              label="메트릭 타입"
              onChange={(e) => setFormData({ ...formData, metric_type: e.target.value as any })}
            >
              <MenuItem value="uptime">가동률</MenuItem>
              <MenuItem value="response_time">응답시간</MenuItem>
              <MenuItem value="error_rate">오류율</MenuItem>
              <MenuItem value="availability">가용성</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="목표값"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.target_value}
            onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="경고 임계치"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.threshold_warning}
            onChange={(e) => setFormData({ ...formData, threshold_warning: parseFloat(e.target.value) })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="위험 임계치"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.threshold_critical}
            onChange={(e) => setFormData({ ...formData, threshold_critical: parseFloat(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button onClick={handleCreateMetric} variant="contained">추가</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canViewDeploymentLogs && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          SLA 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default SLAManagement;
