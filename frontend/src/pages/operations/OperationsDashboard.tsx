// [advice from AI] 운영 센터 메인 대시보드 - 실시간 운영 현황 및 배포 요청
import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 대시보드 데이터 타입 정의
interface DashboardStats {
  deployments: {
    inProgress: number;
    pending: number;
    completed: number;
    failed: number;
  };
  infrastructure: {
    healthy: number;
    warning: number;
    critical: number;
    total: number;
  };
  servers: {
    online: number;
    offline: number;
    maintenance: number;
    total: number;
  };
  sla: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    alerts: number;
  };
}

interface RecentDeployment {
  id: string;
  projectName: string;
  status: 'running' | 'pending' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  environment: string;
  repository_url?: string;
}

const OperationsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDeployments, setRecentDeployments] = useState<RecentDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  // [advice from AI] 대시보드 데이터 로드 - 실제 API에서 가져오기
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // API 호출로 실제 데이터 가져오기
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://rdc.rickyson.com:3001/api/operations/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('대시보드 데이터 로드 실패');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setRecentDeployments(data.recentDeployments || []);
      } else {
        throw new Error(data.message || '데이터 로드 실패');
      }
      
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      // [advice from AI] 실사용 모드 - 기본값으로 안전하게 초기화
      setStats({
        deployments: { inProgress: 0, pending: 0, completed: 0, failed: 0 },
        infrastructure: { healthy: 0, warning: 0, critical: 0, total: 0 },
        servers: { online: 0, offline: 0, maintenance: 0, total: 0 },
        sla: { uptime: 99.5, responseTime: 150, errorRate: 0.1, alerts: 0 }
      });
      setRecentDeployments([]);
      
      // 사용자에게 친화적인 알림
      alert('대시보드 데이터를 불러올 수 없습니다. 네트워크 연결을 확인하세요.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadDashboardData();
    // 30초마다 자동 새로고침
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // [advice from AI] 상태에 따른 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'healthy':
      case 'online':
        return 'success';
      case 'running':
      case 'inProgress':
        return 'info';
      case 'pending':
      case 'warning':
        return 'warning';
      case 'failed':
      case 'critical':
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  // [advice from AI] 상태 라벨 한글화
  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'running': '진행중',
      'pending': '대기중',
      'completed': '완료',
      'failed': '실패',
      'development': '개발',
      'staging': '스테이징',
      'production': '운영'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 페이지 제목 및 설명 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          운영 센터 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          실시간 운영 현황을 확인하고 레포지토리 배포를 관리합니다.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>운영 센터 사용 가이드:</strong><br/>
            • <strong>레포지토리 배포</strong>: 운영팀이 GitHub 레포지토리를 직접 배포합니다.<br/>
            • <strong>파이프라인 관리</strong>: Jenkins + Nexus + Argo CD 통합 관리합니다.<br/>
            • 모든 배포는 Jenkins → Nexus → Argo CD 체인으로 자동 실행됩니다.
          </Typography>
        </Alert>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 배포 현황 */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                배포 현황
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">진행중</Typography>
                  <Chip label={stats?.deployments.inProgress || 0} color="info" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">대기중</Typography>
                  <Chip label={stats?.deployments.pending || 0} color="warning" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">완료</Typography>
                  <Chip label={stats?.deployments.completed || 0} color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">실패</Typography>
                  <Chip label={stats?.deployments.failed || 0} color="error" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 인프라 상태 */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                인프라 상태
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">정상</Typography>
                  <Chip label={stats?.infrastructure.healthy || 0} color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">경고</Typography>
                  <Chip label={stats?.infrastructure.warning || 0} color="warning" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">위험</Typography>
                  <Chip label={stats?.infrastructure.critical || 0} color="error" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">총 서비스</Typography>
                  <Chip label={stats?.infrastructure.total || 0} size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 서버 현황 */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                서버 현황
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">온라인</Typography>
                  <Chip label={stats?.servers.online || 0} color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">오프라인</Typography>
                  <Chip label={stats?.servers.offline || 0} color="error" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">점검중</Typography>
                  <Chip label={stats?.servers.maintenance || 0} color="warning" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">총 서버</Typography>
                  <Chip label={stats?.servers.total || 0} size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* SLA 지표 */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                SLA 지표
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">가동률</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats?.sla.uptime.toFixed(2) || 0}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">응답시간(P95)</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats?.sla.responseTime || 0}ms
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">에러율</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats?.sla.errorRate.toFixed(2) || 0}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">활성 알림</Typography>
                  <Chip label={stats?.sla.alerts || 0} color="warning" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 빠른 작업 버튼 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            빠른 작업
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            자주 사용하는 작업을 빠르게 실행합니다.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/operations')}
            >
              🏢 운영 센터
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/operations/repository-deploy')}
            >
              📦 레포지토리 배포
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/operations/comprehensive-monitoring')}
            >
              📊 종합 모니터링
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/knowledge')}
            >
              📚 지식자원 카탈로그
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 최근 배포 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            최근 배포 현황
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            최근 진행된 배포 작업들을 확인합니다. 실시간으로 업데이트됩니다.
          </Typography>
          {recentDeployments.length === 0 ? (
            <Alert severity="info">
              최근 배포 내역이 없습니다. 레포지토리를 직접 배포해보세요.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>진행률</TableCell>
                    <TableCell>시작 시간</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDeployments.map((deployment) => (
                    <TableRow key={deployment.id}>
                      <TableCell>{deployment.projectName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(deployment.environment)} 
                          size="small"
                          color={deployment.environment === 'production' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(deployment.status)} 
                          color={getStatusColor(deployment.status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={deployment.progress} 
                            sx={{ flexGrow: 1, minWidth: 100 }}
                          />
                          <Typography variant="body2">{deployment.progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(deployment.startedAt).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          onClick={() => navigate(`/operations/deployment-center`)}
                        >
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

    </Box>
  );
};

export default OperationsDashboard;
