// [advice from AI] PO 대시보드 - 프로젝트 오너용 대시보드
// 개발계획서 4.2 PO(프로젝트 오너) 레벨 구조에 따른 구현

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Button,
  Paper,
} from '@mui/material';
import BackstageCard from '../../components/layout/BackstageCard';

const PODashboard: React.FC = () => {
  // [advice from AI] 개발계획서 4.2 PO 대시보드 구조에 따른 샘플 데이터
  const projectStats = {
    total: 12,
    inProgress: 8,
    completed: 3,
    delayed: 1,
  };

  const pePerformance = [
    { name: '김개발', projects: 3, performance: 95, workload: 85 },
    { name: '이코딩', projects: 2, performance: 88, workload: 70 },
    { name: '박프로그래밍', projects: 4, performance: 92, workload: 90 },
    { name: '최소프트웨어', projects: 2, performance: 85, workload: 75 },
  ];

  const requirements = [
    { id: 'REQ-001', title: '사용자 인증 시스템 개선', status: '승인완료', priority: '높음', assignee: '김개발' },
    { id: 'REQ-002', title: '결제 모듈 통합', status: '검토중', priority: '중간', assignee: '이코딩' },
    { id: 'REQ-003', title: '모바일 UI 개선', status: '대기', priority: '낮음', assignee: '박프로그래밍' },
    { id: 'REQ-004', title: 'API 성능 최적화', status: '승인완료', priority: '높음', assignee: '최소프트웨어' },
  ];

  const projectROI = [
    { project: '모바일 뱅킹 앱', roi: '1,450%', savings: '2.1억원', status: '완료' },
    { project: '이커머스 리뉴얼', roi: '1,200%', savings: '1.8억원', status: '진행중' },
    { project: 'AI 챗봇 도입', roi: '980%', savings: '1.2억원', status: '진행중' },
  ];

  const recentReports = [
    { title: '주간 프로젝트 현황 보고서', date: '2024-01-15', status: '완료' },
    { title: 'PE 성과 분석 보고서', date: '2024-01-12', status: '완료' },
    { title: '월간 ROI 분석 보고서', date: '2024-01-10', status: '진행중' },
  ];

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 - 개발계획서 4.2 구조 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          PO 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          프로젝트 관리, PE 관리, 요구사항 관리, 성과 분석
        </Typography>
      </Box>

      {/* [advice from AI] 프로젝트 관리 - 개발계획서 4.2 구조 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <BackstageCard title="프로젝트 관리" variant="default">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {projectStats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 프로젝트
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {projectStats.inProgress}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    진행 중인 프로젝트
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {projectStats.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    완료된 프로젝트
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {projectStats.delayed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    지연/위험 프로젝트
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </BackstageCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* [advice from AI] PE 관리 - 개발계획서 4.2 구조 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="PE 관리" variant="default">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>PE 이름</TableCell>
                    <TableCell align="right">담당 프로젝트</TableCell>
                    <TableCell align="right">성과</TableCell>
                    <TableCell align="right">업무량</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pePerformance.map((pe) => (
                    <TableRow key={pe.name}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {pe.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {pe.projects}개
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pe.performance}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={pe.performance} 
                          sx={{ width: 60, mt: 0.5 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pe.workload}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={pe.workload} 
                          sx={{ width: 60, mt: 0.5 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 요구사항 관리 - 개발계획서 4.2 구조 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="요구사항 관리" variant="default">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>요구사항 ID</TableCell>
                    <TableCell>제목</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>우선순위</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {req.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {req.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={req.status} 
                          size="small"
                          color={req.status === '승인완료' ? 'success' : 
                                 req.status === '검토중' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={req.priority} 
                          size="small"
                          color={req.priority === '높음' ? 'error' : 
                                 req.priority === '중간' ? 'warning' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 성과 분석 - 개발계획서 4.2 구조 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="성과 분석" variant="default">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트</TableCell>
                    <TableCell align="right">ROI</TableCell>
                    <TableCell align="right">절감 효과</TableCell>
                    <TableCell align="right">상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectROI.map((project) => (
                    <TableRow key={project.project}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {project.project}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {project.roi}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {project.savings}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={project.status} 
                          size="small"
                          color={project.status === '완료' ? 'success' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 보고서 - 개발계획서 4.2 구조 */}
        <Grid item xs={12} md={6}>
          <BackstageCard title="보고서" variant="default">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentReports.map((report, index) => (
                <Paper 
                  key={index}
                  sx={{ 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {report.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {report.date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip 
                      label={report.status} 
                      size="small"
                      color={report.status === '완료' ? 'success' : 'warning'}
                    />
                    <Button size="small" variant="outlined">
                      보기
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          </BackstageCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PODashboard;
