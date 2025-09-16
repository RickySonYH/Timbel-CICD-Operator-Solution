// [advice from AI] 통합 모니터링 대시보드 - 모든 Phase의 모니터링 통합
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
  TextField,
  Switch,
  FormControlLabel
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
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

// [advice from AI] 통합 모니터링 데이터 인터페이스
interface IntegratedMetrics {
  systemHealth: number;
  totalAlerts: number;
  activeProjects: number;
  runningServices: number;
  totalUsers: number;
  qaTestCases: number;
  bugReports: number;
  deployments: number;
}

interface PhaseMetrics {
  phase: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    activeItems: number;
    completionRate: number;
    errorRate: number;
    lastActivity: string;
  };
  alerts: number;
  trends: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

interface SystemAlert {
  id: string;
  phase: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  source: string;
}

const IntegratedMonitoringDashboard: React.FC = () => {
  const { getAuthHeaders } = useJwtAuthStore();
  
  // [advice from AI] 통합 모니터링 데이터 상태
  const [integratedMetrics, setIntegratedMetrics] = useState<IntegratedMetrics>({
    systemHealth: 0,
    totalAlerts: 0,
    activeProjects: 0,
    runningServices: 0,
    totalUsers: 0,
    qaTestCases: 0,
    bugReports: 0,
    deployments: 0
  });
  
  const [phaseMetrics, setPhaseMetrics] = useState<PhaseMetrics[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // [advice from AI] 통합 모니터링 데이터 로드
  const loadIntegratedData = async () => {
    setIsLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      
      console.log('📊 통합 모니터링 데이터 로딩 시작');
      
      // [advice from AI] 1. 전체 시스템 메트릭 수집
      const systemResponse = await fetch('http://localhost:3001/api/monitoring/integrated/overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        console.log('✅ 통합 모니터링 데이터 로딩 성공:', systemData);
        
        if (systemData.success) {
          setIntegratedMetrics(systemData.data.metrics);
          setPhaseMetrics(systemData.data.phaseMetrics);
          setSystemAlerts(systemData.data.alerts);
        }
      } else {
        console.error('❌ 통합 모니터링 API 응답 실패:', systemResponse.status);
        throw new Error(`API 응답 실패: ${systemResponse.status}`);
      }

      // [advice from AI] 데이터 로딩 완료 - 모든 데이터는 백엔드 API에서 처리됨
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('통합 모니터링 데이터 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 자동 새로고침 설정
  useEffect(() => {
    loadIntegratedData();
    
    if (isAutoRefresh) {
      const interval = setInterval(() => {
        loadIntegratedData();
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [isAutoRefresh, refreshInterval]);

  // [advice from AI] 상태별 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 심각도별 색상 반환
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 트렌드 아이콘 반환
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUpIcon color="success" />;
      case 'down': return <TrendingDownIcon color="error" />;
      default: return <TimelineIcon color="info" />;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>통합 모니터링 데이터 로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            통합 모니터링 대시보드
          </Typography>
          <Typography variant="body1" color="text.secondary">
            전체 시스템 상태 및 성능 모니터링
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
              />
            }
            label="자동 새로고침"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>간격</InputLabel>
            <Select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <MenuItem value={10}>10초</MenuItem>
              <MenuItem value={30}>30초</MenuItem>
              <MenuItem value={60}>1분</MenuItem>
              <MenuItem value={300}>5분</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadIntegratedData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* [advice from AI] 전체 시스템 메트릭 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <DashboardIcon color="primary" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {integratedMetrics.systemHealth}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 시스템 헬스
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={integratedMetrics.systemHealth}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <NotificationsIcon color="warning" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {integratedMetrics.totalAlerts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    활성 알림
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <BuildIcon color="success" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {integratedMetrics.activeProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    활성 프로젝트
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CloudIcon color="info" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {integratedMetrics.runningServices}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    실행 중인 서비스
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Phase별 상태" />
          <Tab label="실시간 알림" />
          <Tab label="성능 분석" />
          <Tab label="시스템 로그" />
        </Tabs>
      </Box>

      {/* [advice from AI] 탭 콘텐츠 */}
      {activeTab === 0 && (
        <BackstageCard title="Phase별 시스템 상태">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Phase</TableCell>
                  <TableCell>시스템명</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>활성 항목</TableCell>
                  <TableCell>완료율</TableCell>
                  <TableCell>에러율</TableCell>
                  <TableCell>알림</TableCell>
                  <TableCell>트렌드</TableCell>
                  <TableCell>마지막 활동</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phaseMetrics.map((phase, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {phase.phase}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {phase.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={phase.status} 
                        color={getStatusColor(phase.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {phase.metrics.activeItems}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {phase.metrics.completionRate}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {phase.metrics.errorRate}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={phase.alerts} 
                        color={phase.alerts > 0 ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTrendIcon(phase.trends.direction)}
                        <Typography variant="body2">
                          {phase.trends.percentage}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(phase.metrics.lastActivity).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </BackstageCard>
      )}

      {activeTab === 1 && (
        <BackstageCard title="실시간 알림">
          <List>
            {systemAlerts.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="알림이 없습니다" 
                  secondary="현재 시스템에 활성 알림이 없습니다."
                />
              </ListItem>
            ) : (
              systemAlerts.map((alert) => (
                <ListItem key={alert.id} divider>
                  <ListItemIcon>
                    {alert.severity === 'critical' && <ErrorIcon color="error" />}
                    {alert.severity === 'error' && <ErrorIcon color="error" />}
                    {alert.severity === 'warning' && <WarningIcon color="warning" />}
                    {alert.severity === 'info' && <InfoIcon color="info" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {alert.title}
                        </Typography>
                        <Chip 
                          label={alert.phase} 
                          size="small" 
                          color="primary"
                        />
                        <Chip 
                          label={alert.severity} 
                          size="small" 
                          color={getSeverityColor(alert.severity) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {alert.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(alert.timestamp).toLocaleString()} | {alert.source}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </BackstageCard>
      )}

      {activeTab === 2 && (
        <BackstageCard title="성능 분석">
          <Alert severity="info">
            성능 분석 기능은 현재 개발 중입니다. 곧 상세한 성능 메트릭과 분석 도구를 제공할 예정입니다.
          </Alert>
        </BackstageCard>
      )}

      {activeTab === 3 && (
        <BackstageCard title="시스템 로그">
          <Alert severity="info">
            시스템 로그 기능은 현재 개발 중입니다. 곧 실시간 로그 모니터링과 검색 기능을 제공할 예정입니다.
          </Alert>
        </BackstageCard>
      )}

      {/* [advice from AI] 마지막 업데이트 시간 */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          마지막 업데이트: {lastUpdated.toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default IntegratedMonitoringDashboard;
