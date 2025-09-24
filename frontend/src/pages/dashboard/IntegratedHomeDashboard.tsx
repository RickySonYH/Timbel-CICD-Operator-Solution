// [advice from AI] 통합 홈 대시보드
// 전체 업무 흐름, PO/PE 성과, 이벤트, CI/CD, 운영 서버 현황을 한눈에 보는 대시보드

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Speed as PerformanceIcon,
  Timeline as WorkflowIcon,
  Build as CICDIcon,
  Computer as ServerIcon,
  Event as EventIcon,
  People as TeamIcon,
  Assignment as ProjectIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface DashboardData {
  workflow_stats: any;
  performance_stats: any[];
  recent_events: any[];
  cicd_stats: any;
  infrastructure_stats: any;
  role_specific_data: any;
  user_role: string;
  last_updated: string;
}

const IntegratedHomeDashboard: React.FC = () => {
  const { user, token } = useJwtAuthStore();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // [advice from AI] 경로 변경 감지 디버깅
  useEffect(() => {
    console.log('📍 IntegratedHomeDashboard - 현재 경로 변경됨:', location.pathname);
    console.log('📍 IntegratedHomeDashboard - 전체 URL:', window.location.href);
  }, [location.pathname]);

  // [advice from AI] API URL 결정
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3001';
    } else {
      // 외부 접속 - 포트 3001 사용
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };

  // [advice from AI] 대시보드 데이터 로드
  const loadDashboardData = async () => {
    if (!user || !token) return;

    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/dashboard/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
          setLastRefresh(new Date());
          setError(null);
        } else {
          setError('대시보드 데이터 로드에 실패했습니다.');
        }
      } else {
        setError(`API 오류: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 대시보드 데이터 로드 실패:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드 및 자동 갱신
  useEffect(() => {
    loadDashboardData();
    
    // 30초마다 자동 갱신
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, [user, token]);

  // [advice from AI] 상태별 색상 결정
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'success': case 'completed': return '#4caf50';
      case 'warning': case 'pending': return '#ff9800';
      case 'critical': case 'error': case 'failure': return '#f44336';
      case 'down': case 'cancelled': return '#9e9e9e';
      default: return '#2196f3';
    }
  };

  // [advice from AI] 이벤트 심각도별 아이콘
  const getEventIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  // [advice from AI] 로딩 상태
  if (loading && !dashboardData) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // [advice from AI] 에러 상태
  if (error && !dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadDashboardData}>
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 대시보드 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            🏠 통합 운영 대시보드
          </Typography>
          <Typography variant="body1" color="text.secondary">
            전체 업무 흐름, 성과, 이벤트, CI/CD, 인프라 현황을 실시간으로 모니터링합니다.
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')}
          </Typography>
          <Button size="small" onClick={loadDashboardData} disabled={loading}>
            {loading ? '갱신 중...' : '수동 갱신'}
          </Button>
        </Box>
      </Box>

      {dashboardData && (
        <Grid container spacing={3}>
          {/* [advice from AI] 1행: 전체 업무 흐름 현황 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  전체 업무 흐름 현황
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3} md={2}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#2196f3' }}>
                        {dashboardData.workflow_stats?.total_projects || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        전체 프로젝트
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3} md={2}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#ff9800' }}>
                        {dashboardData.workflow_stats?.pending_approval || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        할당가능
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3} md={2}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#4caf50' }}>
                        {dashboardData.workflow_stats?.pe_working || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        PE 작업 중
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3} md={2}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#4caf50' }}>
                        {dashboardData.workflow_stats?.completed || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        완료됨
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                {/* 긴급/지연 프로젝트 경고 */}
                {(dashboardData.workflow_stats?.urgent_active > 0 || dashboardData.workflow_stats?.overdue > 0) && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    {dashboardData.workflow_stats?.urgent_active > 0 && (
                      <Chip 
                        label={`🚨 긴급 ${dashboardData.workflow_stats.urgent_active}개`}
                        color="error"
                        variant="filled"
                        size="small"
                      />
                    )}
                    {dashboardData.workflow_stats?.overdue > 0 && (
                      <Chip 
                        label={`⏰ 지연 ${dashboardData.workflow_stats.overdue}개`}
                        color="warning"
                        variant="filled"
                        size="small"
                      />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* [advice from AI] 2행: PO/PE 성과 및 CI/CD 현황 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  PO/PE 성과 현황
                </Typography>
                
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>이름</TableCell>
                        <TableCell>역할</TableCell>
                        <TableCell align="right">진행 중</TableCell>
                        <TableCell align="right">이번 달</TableCell>
                        <TableCell align="right">진행률</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.performance_stats?.slice(0, 8).map((person: any) => (
                        <TableRow key={person.user_id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                                {person.user_name?.charAt(0)}
                              </Avatar>
                              {person.user_name}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={person.role_type?.toUpperCase()} 
                              size="small"
                              color={person.role_type === 'po' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {person.active_workload || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {person.monthly_completed || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: person.progress_rate_percent >= 80 ? '#4caf50' : 
                                       person.progress_rate_percent >= 60 ? '#ff9800' : '#f44336'
                              }}
                            >
                              {person.progress_rate_percent || 0}%
                            </Typography>
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
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  CI/CD 파이프라인 현황
                </Typography>
                
                {dashboardData.cicd_stats ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 600, color: '#4caf50' }}>
                          {dashboardData.cicd_stats.running_pipelines || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          실행 중
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 600, color: '#2196f3' }}>
                          {dashboardData.cicd_stats.success_rate_7d || 0}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          7일 진행률
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        최근 24시간 실행 결과
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip 
                          label={`성공 ${dashboardData.cicd_stats.success_24h || 0}`}
                          color="success"
                          size="small"
                        />
                        <Chip 
                          label={`실패 ${dashboardData.cicd_stats.failure_24h || 0}`}
                          color="error"
                          size="small"
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        환경별 배포 현황
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip 
                          label={`개발 ${dashboardData.cicd_stats.dev_deployments || 0}`}
                          color="info"
                          size="small"
                          variant="outlined"
                        />
                        <Chip 
                          label={`스테이징 ${dashboardData.cicd_stats.staging_deployments || 0}`}
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                        <Chip 
                          label={`프로덕션 ${dashboardData.cicd_stats.prod_deployments || 0}`}
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info">
                    CI/CD 파이프라인 데이터가 없습니다. 
                    파이프라인을 설정하고 실행하면 여기에 현황이 표시됩니다.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* [advice from AI] 3행: 실시간 이벤트 및 인프라 현황 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  실시간 이벤트 스트림
                </Typography>
                
                <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                  {dashboardData.recent_events?.slice(0, 10).map((event: any, index: number) => (
                    <React.Fragment key={event.id}>
                      <ListItem disablePadding>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                {getEventIcon(event.event_severity)}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {event.title}
                              </Typography>
                              <Chip 
                                label={event.event_category}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {event.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {event.user_name && `👤 ${event.user_name}`}
                                {event.project_name && ` 📋 ${event.project_name}`}
                                {' • '}
                                {new Date(event.event_timestamp).toLocaleString('ko-KR')}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(dashboardData.recent_events.length - 1, 9) && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  운영 서버 현황
                </Typography>
                
                {dashboardData.infrastructure_stats ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 600, color: '#4caf50' }}>
                          {dashboardData.infrastructure_stats.healthy_servers || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          정상 서버
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 600, color: '#f44336' }}>
                          {(dashboardData.infrastructure_stats.warning_servers || 0) + 
                           (dashboardData.infrastructure_stats.critical_servers || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          문제 서버
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        리소스 사용률
                      </Typography>
                      
                      {dashboardData.infrastructure_stats.avg_cpu_usage && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">CPU</Typography>
                            <Typography variant="caption">
                              {dashboardData.infrastructure_stats.avg_cpu_usage.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={dashboardData.infrastructure_stats.avg_cpu_usage}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      )}
                      
                      {dashboardData.infrastructure_stats.avg_memory_usage && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">메모리</Typography>
                            <Typography variant="caption">
                              {dashboardData.infrastructure_stats.avg_memory_usage.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={dashboardData.infrastructure_stats.avg_memory_usage}
                            color="secondary"
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        {dashboardData.infrastructure_stats.avg_response_time && (
                          <Chip 
                            label={`응답시간 ${dashboardData.infrastructure_stats.avg_response_time}ms`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        )}
                        {dashboardData.infrastructure_stats.total_containers && (
                          <Chip 
                            label={`컨테이너 ${dashboardData.infrastructure_stats.total_containers}개`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info">
                    인프라 모니터링 데이터가 없습니다. 
                    모니터링 에이전트를 설정하면 여기에 서버 현황이 표시됩니다.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* [advice from AI] 4행: 권한별 개인 현황 */}
          {dashboardData.role_specific_data && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    내 업무 현황 ({dashboardData.user_role?.toUpperCase()})
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {dashboardData.user_role === 'admin' && (
                      <>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#ff9800' }}>
                              {dashboardData.role_specific_data.pending_approvals || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              승인 대기
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2196f3' }}>
                              {dashboardData.role_specific_data.total_pos || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              전체 PO
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                              {dashboardData.role_specific_data.total_pes || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              전체 PE
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#4caf50' }}>
                              {dashboardData.role_specific_data.active_users_24h || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              24시간 활성
                            </Typography>
                          </Box>
                        </Grid>
                      </>
                    )}
                    
                    {dashboardData.user_role === 'po' && (
                      <>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#3f51b5' }}>
                              {dashboardData.role_specific_data.my_active_claims || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              내 선점 프로젝트
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#ff9800' }}>
                              {dashboardData.role_specific_data.available_to_claim || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              선점 가능
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#4caf50' }}>
                              {dashboardData.role_specific_data.my_completed_projects || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              완료 프로젝트
                            </Typography>
                          </Box>
                        </Grid>
                      </>
                    )}
                    
                    {dashboardData.user_role === 'pe' && (
                      <>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#ff9800' }}>
                              {dashboardData.role_specific_data.pending_assignments || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              할당 대기
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#3f51b5' }}>
                              {dashboardData.role_specific_data.active_assignments || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              진행 중
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#4caf50' }}>
                              {dashboardData.role_specific_data.completed_assignments || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              완료
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Typography variant="h4" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                              {dashboardData.role_specific_data.avg_progress?.toFixed(0) || 0}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              평균 진행률
                            </Typography>
                          </Box>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* [advice from AI] 5행: 이번 주 요약 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 이번 주 요약
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#2196f3' }}>
                        {dashboardData.workflow_stats?.this_week_created || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        신규 프로젝트
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#4caf50' }}>
                        {dashboardData.workflow_stats?.this_week_completed || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        완료 프로젝트
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                        {dashboardData.workflow_stats?.avg_po_to_completion_days?.toFixed(1) || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        평균 완료일수
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#ff5722' }}>
                        {Math.round(((dashboardData.workflow_stats?.this_week_completed || 0) / 
                                    Math.max(dashboardData.workflow_stats?.this_week_created || 1, 1)) * 100)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        이번 주 완료율
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default IntegratedHomeDashboard;
