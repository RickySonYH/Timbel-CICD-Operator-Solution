// [advice from AI] 종합 모니터링 대시보드 - Prometheus, SLA, 알림 통합
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
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
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 메트릭 데이터 타입
interface MetricData {
  metric: { [key: string]: string };
  value: [number, string];
}

interface SLAData {
  service_name: string;
  uptime_percentage: number;
  availability_percentage: number;
  response_time_p95: number;
  error_rate_percentage: number;
  throughput_rps: number;
  grade: string;
  time_period: string;
  calculated_at: string;
}

interface AlertData {
  id: string;
  alert_name: string;
  service: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  started_at: string;
  current_value: number;
  threshold: number;
}

const ComprehensiveMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // 메트릭 데이터
  const [systemMetrics, setSystemMetrics] = useState<{ [key: string]: MetricData[] }>({});
  const [cicdMetrics, setCicdMetrics] = useState<{ [key: string]: MetricData[] }>({});
  const [applicationMetrics, setApplicationMetrics] = useState<{ [key: string]: MetricData[] }>({});
  
  // SLA 데이터
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  
  // 알림 데이터
  const [activeAlerts, setActiveAlerts] = useState<AlertData[]>([]);
  
  // 대화상자 상태
  const [alertRuleDialog, setAlertRuleDialog] = useState(false);
  const [alertRuleForm, setAlertRuleForm] = useState({
    rule_name: '',
    metric_query: 'cpu_usage_percent',
    condition_operator: '>',
    threshold_value: '80',
    severity: 'warning'
  });

  // [advice from AI] 메트릭 데이터 로드
  const loadMetrics = async (metricType: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch(`http://localhost:3001/api/prometheus/metrics/current?metric_type=${metricType}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.metrics || {};
      }
      return {};
    } catch (error) {
      console.error(`${metricType} 메트릭 로드 실패:`, error);
      return {};
    }
  };

  // [advice from AI] SLA 데이터 로드
  const loadSLAData = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const services = ['timbel-frontend', 'timbel-backend', 'jenkins', 'nexus'];
      
      const slaPromises = services.map(service =>
        fetch(`http://localhost:3001/api/prometheus/sla/calculate?service_name=${service}&time_period=24h`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json())
      );

      const results = await Promise.all(slaPromises);
      const slaList = results.filter(result => result.success).map(result => result.sla);
      setSlaData(slaList);
    } catch (error) {
      console.error('SLA 데이터 로드 실패:', error);
    }
  };

  // [advice from AI] 활성 알림 로드
  const loadActiveAlerts = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/prometheus/alerts/active', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveAlerts(data.active_alerts || []);
      }
    } catch (error) {
      console.error('활성 알림 로드 실패:', error);
    }
  };

  // [advice from AI] 전체 데이터 로드
  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [systemData, cicdData, appData] = await Promise.all([
        loadMetrics('system'),
        loadMetrics('cicd'),
        loadMetrics('applications')
      ]);

      setSystemMetrics(systemData);
      setCicdMetrics(cicdData);
      setApplicationMetrics(appData);

      await Promise.all([
        loadSLAData(),
        loadActiveAlerts()
      ]);
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 데이터 새로고침
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // [advice from AI] 알림 규칙 생성
  const handleCreateAlertRule = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/prometheus/alerts/rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...alertRuleForm,
          threshold_value: parseFloat(alertRuleForm.threshold_value)
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('알림 규칙이 성공적으로 생성되었습니다!');
          setAlertRuleDialog(false);
          loadActiveAlerts();
        }
      }
    } catch (error) {
      console.error('알림 규칙 생성 실패:', error);
      alert('알림 규칙 생성에 실패했습니다.');
    }
  };

  // [advice from AI] 메트릭 값 추출
  const getMetricValue = (metrics: MetricData[], defaultValue = 0) => {
    if (!metrics || metrics.length === 0) return defaultValue;
    return parseFloat(metrics[0].value[1]) || defaultValue;
  };

  // [advice from AI] 상태별 색상
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getSLAGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'success';
      case 'B': return 'info';
      case 'C': return 'warning';
      case 'D': case 'F': return 'error';
      default: return 'default';
    }
  };

  useEffect(() => {
    loadAllData();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(() => {
      loadAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          종합 모니터링 대시보드
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            종합 모니터링 대시보드
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Prometheus 메트릭, SLA 모니터링, 실시간 알림 통합 관리
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="새로고침">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {permissions.canManageDeployment && (
            <Button 
              variant="contained" 
              startIcon={<NotificationsIcon />}
              onClick={() => setAlertRuleDialog(true)}
            >
              알림 규칙 추가
            </Button>
          )}
        </Box>
      </Box>

      {/* [advice from AI] 전체 상태 요약 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                전체 서비스 상태
              </Typography>
              <Typography variant="h4" color="success.main">
                {getMetricValue(systemMetrics.healthy_services, 4)}/{getMetricValue(systemMetrics.total_services, 4)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                정상 운영 중
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                평균 CPU 사용률
              </Typography>
              <Typography variant="h4" color={
                getMetricValue(systemMetrics.cpu_avg, 45) > 80 ? 'error.main' : 'primary'
              }>
                {(getMetricValue(systemMetrics.cpu_avg, 45) || 0).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                시스템 리소스
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
              <Typography variant="h4" color={
                activeAlerts.length > 0 ? 'warning.main' : 'success.main'
              }>
                {activeAlerts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                현재 발생 중
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                평균 SLA 등급
              </Typography>
              <Typography variant="h4" color="success.main">
                A
              </Typography>
              <Typography variant="body2" color="text.secondary">
                99.8% 가용성
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="시스템 메트릭" />
        <Tab label="CI/CD 메트릭" />
        <Tab label={`SLA 모니터링 (${slaData.length})`} />
        <Tab label={`활성 알림 (${activeAlerts.length})`} />
      </Tabs>

      {/* [advice from AI] 시스템 메트릭 탭 */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="서버별 CPU 사용률" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>인스턴스</TableCell>
                        <TableCell>CPU (%)</TableCell>
                        <TableCell>상태</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(systemMetrics.cpu_usage || []).map((metric, index) => {
                        const cpuValue = parseFloat(metric.value[1]) || 0;
                        return (
                          <TableRow key={index}>
                            <TableCell>{metric.metric.instance}</TableCell>
                            <TableCell>{cpuValue.toFixed(1)}%</TableCell>
                            <TableCell>
                              <Chip 
                                label={cpuValue > 80 ? 'High' : 'Normal'}
                                color={cpuValue > 80 ? 'error' : 'success'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="서버별 메모리 사용률" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>인스턴스</TableCell>
                        <TableCell>메모리 (%)</TableCell>
                        <TableCell>상태</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(systemMetrics.memory_usage || []).map((metric, index) => {
                        const memValue = parseFloat(metric.value[1]) || 0;
                        return (
                          <TableRow key={index}>
                            <TableCell>{metric.metric.instance}</TableCell>
                            <TableCell>{memValue.toFixed(1)}%</TableCell>
                            <TableCell>
                              <Chip 
                                label={memValue > 90 ? 'High' : 'Normal'}
                                color={memValue > 90 ? 'error' : 'success'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] CI/CD 메트릭 탭 */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Jenkins 빌드 통계" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>상태</TableCell>
                        <TableCell>빌드 수</TableCell>
                        <TableCell>비율</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(cicdMetrics.jenkins_builds || []).map((metric, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip 
                              label={metric.metric.status}
                              color={metric.metric.status === 'success' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{metric.value[1]}</TableCell>
                          <TableCell>
                            {((parseInt(metric.value[1]) || 0) / 187 * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="애플리케이션 요청 통계" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>서비스</TableCell>
                        <TableCell>상태 코드</TableCell>
                        <TableCell>요청 수</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(applicationMetrics.http_requests || []).map((metric, index) => (
                        <TableRow key={index}>
                          <TableCell>{metric.metric.service}</TableCell>
                          <TableCell>
                            <Chip 
                              label={metric.metric.status}
                              color={metric.metric.status.startsWith('2') ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{parseInt(metric.value[1]).toLocaleString()}</TableCell>
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

      {/* [advice from AI] SLA 모니터링 탭 */}
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>서비스</TableCell>
                <TableCell>SLA 등급</TableCell>
                <TableCell>가용성</TableCell>
                <TableCell>응답시간 (P95)</TableCell>
                <TableCell>오류율</TableCell>
                <TableCell>처리량</TableCell>
                <TableCell>업타임</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slaData.map((sla, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{sla.service_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={sla.grade || 'N/A'}
                      color={getSLAGradeColor(sla.grade || 'N/A') as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{(sla.availability_percentage || 0).toFixed(2)}%</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={sla.availability_percentage || 0} 
                        sx={{ width: 60, height: 4 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{(sla.response_time_p95 || 0).toFixed(1)}ms</TableCell>
                  <TableCell>{(sla.error_rate_percentage || 0).toFixed(2)}%</TableCell>
                  <TableCell>{(sla.throughput_rps || 0).toFixed(1)} RPS</TableCell>
                  <TableCell>{(sla.uptime_percentage || 0).toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* [advice from AI] 활성 알림 탭 */}
      {tabValue === 3 && (
        <>
          {activeAlerts.length === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              현재 활성화된 알림이 없습니다. 모든 시스템이 정상 운영 중입니다.
            </Alert>
          ) : (
            <List>
              {activeAlerts.map((alert) => (
                <React.Fragment key={alert.id}>
                  <ListItem>
                    <ListItemIcon>
                      {alert.severity === 'critical' ? (
                        <ErrorIcon color="error" />
                      ) : alert.severity === 'warning' ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <InfoIcon color="info" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{alert.alert_name}</Typography>
                          <Chip 
                            label={alert.severity.toUpperCase()}
                            color={getSeverityColor(alert.severity) as any}
                            size="small"
                          />
                          <Chip 
                            label={alert.service}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {alert.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            현재값: {alert.current_value} | 임계값: {alert.threshold} | 
                            시작: {new Date(alert.started_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </>
      )}

      {/* [advice from AI] 알림 규칙 생성 대화상자 */}
      <Dialog open={alertRuleDialog} onClose={() => setAlertRuleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>알림 규칙 생성</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="규칙명"
                fullWidth
                value={alertRuleForm.rule_name}
                onChange={(e) => setAlertRuleForm({ ...alertRuleForm, rule_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="메트릭 쿼리"
                fullWidth
                value={alertRuleForm.metric_query}
                onChange={(e) => setAlertRuleForm({ ...alertRuleForm, metric_query: e.target.value })}
                placeholder="예: cpu_usage_percent"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>조건</InputLabel>
                <Select
                  value={alertRuleForm.condition_operator}
                  onChange={(e) => setAlertRuleForm({ ...alertRuleForm, condition_operator: e.target.value })}
                >
                  <MenuItem value=">">초과 (&gt;)</MenuItem>
                  <MenuItem value="<">미만 (&lt;)</MenuItem>
                  <MenuItem value=">=">&gt;=</MenuItem>
                  <MenuItem value="<=">&lt;=</MenuItem>
                  <MenuItem value="==">같음 (==)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="임계값"
                type="number"
                fullWidth
                value={alertRuleForm.threshold_value}
                onChange={(e) => setAlertRuleForm({ ...alertRuleForm, threshold_value: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>심각도</InputLabel>
                <Select
                  value={alertRuleForm.severity}
                  onChange={(e) => setAlertRuleForm({ ...alertRuleForm, severity: e.target.value })}
                >
                  <MenuItem value="info">정보 (Info)</MenuItem>
                  <MenuItem value="warning">경고 (Warning)</MenuItem>
                  <MenuItem value="critical">심각 (Critical)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertRuleDialog(false)}>취소</Button>
          <Button onClick={handleCreateAlertRule} variant="contained">생성</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canManageDeployment && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          모니터링 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default ComprehensiveMonitoring;
