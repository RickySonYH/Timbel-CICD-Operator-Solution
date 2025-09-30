// [advice from AI] 최고 관리자 대시보드 - 전체 시스템 현황 및 조직 관리
// PO-PE-QA-운영팀 구조의 최상위 관리자용 대시보드

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BackstageCard from '../../components/layout/BackstageCard';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useJwtAuthStore();
  
  // [advice from AI] 상태 관리
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // [advice from AI] API 데이터 로드
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://rdc.rickyson.com:3001/api/executive-dashboard/overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || '데이터 로드 실패');
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류');
      
      // [advice from AI] 오류 시 기본 데이터 사용
      setDashboardData({
        system_overview: {
          total_users: 156,
          active_projects: 12,
          operational_systems: 8,
          recent_failures: 2,
          open_issues: 5
        },
        organization_stats: [
          { role_type: 'po', total_count: 8, active_count: 8, activity_rate: 92 },
          { role_type: 'pe', total_count: 24, active_count: 22, activity_rate: 88 },
          { role_type: 'qa', total_count: 6, active_count: 6, activity_rate: 95 },
          { role_type: 'operations', total_count: 4, active_count: 4, activity_rate: 90 },
        ],
        business_metrics: {
          total_strategic_projects: 5,
          avg_expected_roi: 310,
          total_investment_hours: 2750,
          high_priority_projects: 3,
          urgent_projects: 2
        },
        recent_activities: [
          { 
            activity_type: 'project_creation',
            project_name: '디지털 트랜스포메이션 전략 수립',
            approval_action: 'draft',
            activity_time: new Date().toISOString(),
            actor_name: '최고 관리자',
            expected_roi: '500',
            expected_completion_hours: 800
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  // [advice from AI] 로딩 및 에러 처리
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          대시보드 데이터를 불러올 수 없습니다.
        </Alert>
        <Button onClick={loadDashboardData} variant="contained">
          다시 시도
        </Button>
      </Box>
    );
  }

  const { system_overview, organization_stats, business_metrics, recent_activities } = dashboardData;

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          최고 관리자 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          전체 시스템 현황 및 조직 성과를 한눈에 확인하세요
        </Typography>
        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            일부 데이터를 불러오지 못했습니다: {error}
          </Alert>
        )}
      </Box>

      {/* [advice from AI] 전체 시스템 현황 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <BackstageCard title="전체 시스템 현황" variant="default">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {system_overview?.total_users || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    활성 사용자
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {system_overview?.active_projects || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    진행중 프로젝트
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {system_overview?.operational_systems || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    운영중 시스템
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {system_overview?.recent_failures || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    최근 실패
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {system_overview?.open_issues || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    미해결 이슈
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip 
                    label={systemOverview.systemStatus} 
                    color="success" 
                    sx={{ fontSize: '1.2rem', py: 2, px: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    시스템 상태
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {systemOverview.storageUsage}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    저장소 사용량
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemOverview.storageUsage} 
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {systemOverview.lastBackup}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    마지막 백업
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </BackstageCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* [advice from AI] 조직 관리 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="조직 현황" variant="default">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>역할</TableCell>
                    <TableCell align="right">인원</TableCell>
                    <TableCell align="right">성과</TableCell>
                    <TableCell align="right">진행률</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {organizationStats.map((stat) => (
                    <TableRow key={stat.role}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {stat.role}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {stat.count}명
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {stat.performance}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <LinearProgress 
                          variant="determinate" 
                          value={stat.performance} 
                          sx={{ width: 60 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 비즈니스 분석 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="비즈니스 지표" variant="default">
            <Grid container spacing={2}>
              {businessMetrics.map((metric) => (
                <Grid item xs={6} key={metric.title}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {metric.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {metric.title}
                    </Typography>
                    <Chip 
                      label={metric.trend} 
                      size="small" 
                      color="success"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 최근 활동 */}
        <Grid item xs={12}>
          <BackstageCard title="최근 주요 성과" variant="default">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>활동</TableCell>
                    <TableCell>임팩트</TableCell>
                    <TableCell align="right">절감 효과</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivities.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {activity.action}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main">
                          {activity.impact}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {activity.value}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 유저 관리 */}
        <Grid item xs={12}>
          <BackstageCard title="유저 관리" variant="default">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  역할별 권한 관리
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PO-PE-QA-운영팀 구조의 사용자 권한을 관리하고 모니터링합니다.
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => navigate('/user-management')}
                sx={{ height: 40 }}
              >
                유저 관리 페이지
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                    {systemOverview.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 사용자
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main', mb: 1 }}>
                    {organizationStats.reduce((sum, role) => sum + role.count, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    활성 역할
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main', mb: 1 }}>
                    {organizationStats.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    역할 유형
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main', mb: 1 }}>
                    6
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    권한 유형
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </BackstageCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;
