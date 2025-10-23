// [advice from AI] 최적화된 운영 센터 대시보드 - 성능 개선 버전
import React, { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Skeleton
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useOptimizedDashboard } from '../../hooks/useOptimizedAPI';

// [advice from AI] 메모이제이션된 통계 카드 컴포넌트
const StatCard = memo(({ title, value, subtitle, color, icon }: {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  icon?: React.ReactNode;
}) => (
  <Card elevation={2} sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h3" component="div" color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box sx={{ opacity: 0.7 }}>
            {icon}
          </Box>
        )}
      </Box>
    </CardContent>
  </Card>
));

// [advice from AI] 메모이제이션된 배포 상태 행 컴포넌트
const DeploymentRow = memo(({ deployment }: { deployment: any }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'primary';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'running': return '실행중';
      case 'failed': return '실패';
      case 'pending': return '대기중';
      default: return status;
    }
  };

  return (
    <TableRow>
      <TableCell>{deployment.projectName || '프로젝트명 없음'}</TableCell>
      <TableCell>
        <Chip 
          label={getStatusText(deployment.status)} 
          color={getStatusColor(deployment.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress 
            variant="determinate" 
            value={Math.max(0, Math.min(100, deployment.progress || 0))} 
            sx={{ width: 100 }}
          />
          <Typography variant="body2">
            {deployment.progress || 0}%
          </Typography>
        </Box>
      </TableCell>
      <TableCell>{deployment.environment || 'production'}</TableCell>
      <TableCell>
        {deployment.startedAt ? new Date(deployment.startedAt).toLocaleString('ko-KR') : '-'}
      </TableCell>
    </TableRow>
  );
});

// [advice from AI] 로딩 스켈레톤 컴포넌트
const DashboardSkeleton = memo(() => (
  <Grid container spacing={3}>
    {[1, 2, 3, 4].map((i) => (
      <Grid item xs={12} sm={6} md={3} key={i}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height={40} />
            <Skeleton variant="text" width="80%" />
          </CardContent>
        </Card>
      </Grid>
    ))}
    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Skeleton variant="text" width="30%" height={30} />
          <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    </Grid>
  </Grid>
));

const OptimizedOperationsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useJwtAuthStore();
  
  // [advice from AI] 최적화된 API 훅 사용
  const { data: dashboardData, loading, error, refetch } = useOptimizedDashboard();

  // [advice from AI] 메모이제이션된 통계 데이터
  const stats = useMemo(() => {
    if (!dashboardData?.stats) return null;
    
    const { deployments, infrastructure, servers, sla } = dashboardData.stats;
    
    return {
      deployments: {
        inProgress: deployments?.running_deployments || 0,
        pending: deployments?.total_deployments || 0,
        completed: deployments?.completed_deployments || 0,
        failed: deployments?.failed_deployments || 0
      },
      infrastructure: {
        healthy: infrastructure?.active_infrastructures || 0,
        total: infrastructure?.total_infrastructures || 0
      },
      servers: {
        online: servers?.online_servers || 0,
        total: servers?.total_servers || 0
      },
      sla: {
        uptime: sla?.avg_availability || 99.5,
        responseTime: sla?.avg_latency || 245,
        errorRate: sla?.avg_error_rate || 0.02
      }
    };
  }, [dashboardData]);

  // [advice from AI] 메모이제이션된 최근 배포 데이터
  const recentDeployments = useMemo(() => {
    return dashboardData?.recentDeployments || [];
  }, [dashboardData]);

  // [advice from AI] 성능 정보 표시
  const performanceInfo = useMemo(() => {
    if (!dashboardData?.performance) return null;
    return dashboardData.performance;
  }, [dashboardData]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          운영 센터 대시보드
        </Typography>
        <DashboardSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              다시 시도
            </Button>
          }
        >
          대시보드 데이터 로드 실패: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          운영 센터 대시보드 (최적화됨)
        </Typography>
        <Box>
          {performanceInfo && (
            <Chip 
              label={`응답시간: ${performanceInfo.query_time}ms`}
              color="primary" 
              size="small" 
              sx={{ mr: 1 }}
            />
          )}
          <Button variant="outlined" onClick={refetch} size="small">
            새로고침
          </Button>
        </Box>
      </Box>

      {/* 주요 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="진행 중인 배포"
            value={stats?.deployments.inProgress || 0}
            subtitle="현재 실행 중"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="완료된 배포"
            value={stats?.deployments.completed || 0}
            subtitle="성공적으로 완료"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="온라인 서버"
            value={`${stats?.servers.online || 0}/${stats?.servers.total || 0}`}
            subtitle="정상 작동 중"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="시스템 가동률"
            value={`${stats?.sla.uptime || 99.5}%`}
            subtitle={`응답시간: ${stats?.sla.responseTime || 245}ms`}
            color="success"
          />
        </Grid>
      </Grid>

      {/* 최근 배포 현황 */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">최근 배포 현황</Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/operations/repository-deployment')}
            >
              새 배포 요청
            </Button>
          </Box>
          
          {recentDeployments.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>진행률</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>시작 시간</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDeployments.map((deployment, index) => (
                    <DeploymentRow key={deployment.id || index} deployment={deployment} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              최근 배포 내역이 없습니다.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 빠른 액세스 버튼 */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/operations/cluster-dashboard')}
          >
            클러스터 관리
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/operations/monitoring')}
          >
            시스템 모니터링
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/operations/pipeline-dashboard')}
          >
            파이프라인 관리
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/operations/infrastructure')}
          >
            인프라 관리
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OptimizedOperationsDashboard;
