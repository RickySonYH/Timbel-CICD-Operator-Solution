// [advice from AI] 최고 관리자 대시보드 - 전체 시스템 현황 및 조직 관리
// PO-PE-QA-운영팀 구조의 최상위 관리자용 대시보드

import React from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BackstageCard from '../../components/layout/BackstageCard';

const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // [advice from AI] 최고 관리자용 샘플 데이터
  const systemOverview = {
    totalUsers: 156,
    activeProjects: 12,
    systemStatus: '정상',
    storageUsage: 68,
    lastBackup: '2시간 전',
  };

  const organizationStats = [
    { role: 'PO (프로젝트 오너)', count: 8, performance: 92 },
    { role: 'PE (프로젝트 엔지니어)', count: 24, performance: 88 },
    { role: 'QA/QC 부서', count: 6, performance: 95 },
    { role: '운영팀', count: 4, performance: 90 },
  ];

  const businessMetrics = [
    { title: 'ROI', value: '1,307%', trend: '+12%' },
    { title: '연간 절감', value: '19.6억원', trend: '+8%' },
    { title: '생산성 향상', value: '300%', trend: '+15%' },
    { title: '재사용률', value: '60%', trend: '+5%' },
  ];

  const recentActivities = [
    { action: '모바일 뱅킹 앱 프로젝트 완료', impact: '4.5개월 단축', value: '2.1억원 절감' },
    { action: '이커머스 리뉴얼 78% 컴포넌트 재사용', impact: '개발비 40% 절감', value: '1.8억원 절감' },
    { action: 'AI 코드 생성 도구 도입', impact: '개발속도 300% 향상', value: '3.2억원 절감' },
  ];

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
      </Box>

      {/* [advice from AI] 전체 시스템 현황 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <BackstageCard title="전체 시스템 현황" variant="default">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {systemOverview.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    활성 사용자
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {systemOverview.activeProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    진행중 프로젝트
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
