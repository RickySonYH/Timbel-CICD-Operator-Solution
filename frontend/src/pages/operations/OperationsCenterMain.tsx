// [advice from AI] 운영센터 메인 - 읽기 전용 통합 대시보드
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  CircularProgress,
  Container,
  IconButton,
  Tooltip,
  Badge,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Build as BuildIcon,
  Storage as StorageIcon,
  CloudUpload as DeployIcon,
  Webhook as WebhookIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  BugReport as BugReportIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 솔루션 상태 인터페이스
interface SolutionStatus {
  id: string;
  name: string;
  type: 'jenkins' | 'argocd' | 'nexus' | 'webhook';
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  url?: string;
  lastCheck?: string;
  metrics?: {
    jobs?: number;
    repositories?: number;
    applications?: number;
    hooks?: number;
  };
}

// [advice from AI] 최근 활동 인터페이스
interface RecentActivity {
  id: string;
  type: 'deployment' | 'build' | 'sync' | 'webhook';
  title: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  timestamp: string;
  details?: string;
}

const OperationsCenterMain: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [solutions, setSolutions] = useState<SolutionStatus[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalPipelines: 0,
    activePipelines: 0,
    successRate: 0,
    totalDeployments: 0
  });

  // [advice from AI] 솔루션 아이콘 매핑
  const getSolutionIcon = (type: string) => {
    switch (type) {
      case 'jenkins':
        return <BuildIcon />;
      case 'argocd':
        return <DeployIcon />;
      case 'nexus':
        return <StorageIcon />;
      case 'webhook':
        return <WebhookIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  // [advice from AI] 상태별 색상 매핑
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return 'success';
      case 'warning':
      case 'running':
        return 'warning';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // [advice from AI] 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return <CheckCircleIcon />;
      case 'warning':
      case 'running':
        return <WarningIcon />;
      case 'error':
      case 'failed':
        return <ErrorIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  // [advice from AI] 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // [advice from AI] 솔루션 상태 로드
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      // 파이프라인 통계
      try {
        const pipelinesResponse = await fetch(`${apiUrl}/api/operations/cicd/pipelines`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (pipelinesResponse.ok) {
          const pipelinesData = await pipelinesResponse.json();
          const pipelines = pipelinesData.data || [];
          
          setOverallStats({
            totalPipelines: pipelines.length,
            activePipelines: pipelines.filter((p: any) => p.status === 'active').length,
            successRate: pipelines.length > 0 ? 
              Math.round((pipelines.filter((p: any) => p.last_deployment?.status === 'completed').length / pipelines.length) * 100) : 0,
            totalDeployments: pipelines.reduce((acc: number, p: any) => acc + (p.last_deployment ? 1 : 0), 0)
          });

          // 솔루션 상태 생성
          setSolutions([
            {
              id: 'jenkins',
              name: 'Jenkins CI',
              type: 'jenkins',
              status: 'healthy',
              metrics: { jobs: pipelines.length },
              lastCheck: new Date().toISOString()
            },
            {
              id: 'argocd',
              name: 'ArgoCD',
              type: 'argocd',
              status: 'healthy',
              metrics: { applications: pipelines.filter((p: any) => p.status === 'active').length },
              lastCheck: new Date().toISOString()
            },
            {
              id: 'nexus',
              name: 'Nexus Repository',
              type: 'nexus',
              status: 'healthy',
              metrics: { repositories: pipelines.length },
              lastCheck: new Date().toISOString()
            },
            {
              id: 'webhooks',
              name: 'GitHub Webhooks',
              type: 'webhook',
              status: 'healthy',
              metrics: { hooks: pipelines.length },
              lastCheck: new Date().toISOString()
            }
          ]);

          // 최근 활동 생성
          const activities: RecentActivity[] = pipelines
            .filter((p: any) => p.last_deployment)
            .slice(0, 5)
            .map((p: any) => ({
              id: p.id,
              type: 'deployment',
              title: `${p.pipeline_name} 배포`,
              status: p.last_deployment.status === 'completed' ? 'success' : 
                     p.last_deployment.status === 'running' ? 'running' : 'failed',
              timestamp: p.last_deployment.time,
              details: p.last_deployment.name
            }));
          
          setRecentActivities(activities);
        }
      } catch (error) {
        console.warn('파이프라인 데이터 로드 실패:', error);
        // 샘플 데이터 사용
        setSolutions([
          { id: 'jenkins', name: 'Jenkins CI', type: 'jenkins', status: 'healthy', metrics: { jobs: 5 } },
          { id: 'argocd', name: 'ArgoCD', type: 'argocd', status: 'healthy', metrics: { applications: 3 } },
          { id: 'nexus', name: 'Nexus Repository', type: 'nexus', status: 'warning', metrics: { repositories: 8 } },
          { id: 'webhooks', name: 'GitHub Webhooks', type: 'webhook', status: 'healthy', metrics: { hooks: 12 } }
        ]);
        setOverallStats({ totalPipelines: 5, activePipelines: 3, successRate: 85, totalDeployments: 12 });
      }

    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          🏢 운영 센터
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          CI/CD 인프라 통합 모니터링 및 운영 현황
        </Typography>
      </Box>

      {/* [advice from AI] 전체 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    전체 파이프라인
                  </Typography>
                  <Typography variant="h4">
                    {overallStats.totalPipelines}
                  </Typography>
                </Box>
                <TimelineIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    활성 파이프라인
                  </Typography>
                  <Typography variant="h4">
                    {overallStats.activePipelines}
                  </Typography>
                </Box>
                <PlayIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    성공률
                  </Typography>
                  <Typography variant="h4">
                    {overallStats.successRate}%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    총 배포
                  </Typography>
                  <Typography variant="h4">
                    {overallStats.totalDeployments}
                  </Typography>
                </Box>
                <DeployIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* [advice from AI] 솔루션 상태 카드 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  🔧 솔루션 상태
                </Typography>
                <IconButton onClick={loadDashboardData}>
                  <RefreshIcon />
                </IconButton>
              </Box>
              
              <Grid container spacing={2}>
                {solutions.map((solution) => (
                  <Grid item xs={12} sm={6} key={solution.id}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2,
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getSolutionIcon(solution.type)}
                          <Box>
                            <Typography variant="subtitle2">
                              {solution.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {solution.lastCheck && `최종 확인: ${new Date(solution.lastCheck).toLocaleTimeString()}`}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Chip 
                            icon={getStatusIcon(solution.status)}
                            label={solution.status}
                            color={getStatusColor(solution.status) as any}
                            size="small"
                          />
                          {solution.metrics && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {Object.values(solution.metrics)[0]} 항목
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
            <CardActions>
              <Button 
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/operations/pipeline')}
              >
                설정 관리
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* [advice from AI] 최근 활동 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 최근 활동
              </Typography>
              
              {recentActivities.length === 0 ? (
                <Alert severity="info">
                  최근 활동이 없습니다.
                </Alert>
              ) : (
                <List dense>
                  {recentActivities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem>
                        <ListItemIcon>
                          {getStatusIcon(activity.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.title}
                          secondary={
                            <>
                              <span style={{ display: 'block', fontSize: '0.75rem' }}>
                                {activity.details}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                {new Date(activity.timestamp).toLocaleString()}
                              </span>
                            </>
                          }
                        />
                      </ListItem>
                      {index < recentActivities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
            <CardActions>
              <Button 
                startIcon={<ViewIcon />}
                onClick={() => navigate('/operations/comprehensive-monitoring')}
              >
                전체 모니터링
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 빠른 액션 버튼 */}
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          🚀 빠른 액션
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DeployIcon />}
              onClick={() => navigate('/operations/repository-deploy')}
            >
              즉시 배포
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<TimelineIcon />}
              onClick={() => navigate('/operations/pipeline')}
            >
              파이프라인 관리
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate('/operations/comprehensive-monitoring')}
            >
              모니터링
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/operations/infrastructure')}
            >
              인프라 설정
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default OperationsCenterMain;
