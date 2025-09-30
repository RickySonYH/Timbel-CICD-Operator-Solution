// [advice from AI] QA 대시보드 - 실제 백엔드 API 연동
import React, { useState, useEffect } from 'react';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
// [advice from AI] 사용자 요청에 따라 아이콘 제거
import { 
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  BugReport as BugReportIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Add as AddIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

interface QAMetrics {
  totalTestCases: number;
  totalBugReports: number;
  openBugs: number;
  resolvedBugs: number;
  testExecutionRate: number;
}

interface BugReport {
  id: string;
  title: string;
  severity: string;
  priority: string;
  status: string;
  created_at: string;
  assignee_name?: string;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

interface ProjectStats {
  stage1_count: number;
  stage2_count: number;
  stage3_count: number;
  stage4_count: number;
  stage5_count: number;
  stage6_count: number;
  stage7_count: number;
  total_projects: number;
  completed_projects: number;
}

const QADashboard: React.FC = () => {
  const { isAuthenticated, token, user } = useJwtAuthStore();
  const [metrics, setMetrics] = useState<QAMetrics>({
    totalTestCases: 0,
    totalBugReports: 0,
    openBugs: 0,
    resolvedBugs: 0,
    testExecutionRate: 0
  });
  const [recentBugs, setRecentBugs] = useState<BugReport[]>([]);
  const [recentTestCases, setRecentTestCases] = useState<TestCase[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] API 호출 함수들
  const fetchMetrics = async () => {
    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      // 테스트 케이스 목록 조회
      const testCasesResponse = await fetch('http://localhost:3001/api/qa/test-cases', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const testCasesData = await testCasesResponse.json();

      // 버그 리포트 목록 조회
      const bugReportsResponse = await fetch('http://localhost:3001/api/qa/bug-reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const bugReportsData = await bugReportsResponse.json();

      // 프로젝트 통계 조회
      const statsResponse = await fetch('http://localhost:3001/api/project-workflow/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const statsData = await statsResponse.json();

      if (testCasesData.success && bugReportsData.success) {
        const testCases = testCasesData.data.test_cases || [];
        const bugReports = bugReportsData.data.bug_reports || [];
        
        const openBugs = bugReports.filter((bug: BugReport) => 
          bug.status === 'open' || bug.status === 'in_progress'
        ).length;
        
        const resolvedBugs = bugReports.filter((bug: BugReport) => 
          bug.status === 'resolved' || bug.status === 'closed'
        ).length;

        setMetrics({
          totalTestCases: testCases.length,
          totalBugReports: bugReports.length,
          openBugs,
          resolvedBugs,
          testExecutionRate: testCases.length > 0 ? 
            Math.round((resolvedBugs / testCases.length) * 100) : 0
        });

        setRecentBugs(bugReports.slice(0, 5));
        setRecentTestCases(testCases.slice(0, 5));

        // [advice from AI] 프로젝트 통계 설정 - 실제 API 응답 구조에 맞게 매핑
        if (statsData.success && statsData.data.stage_statistics) {
          const stats = statsData.data.stage_statistics;
          setProjectStats({
            stage1_count: stats.stage1_planning || 0,
            stage2_count: stats.stage2_admin_approval || 0,
            stage3_count: stats.stage3_po_assignment || 0,
            stage4_count: stats.stage4_development || 0,
            stage5_count: stats.stage5_qa_review || 0,
            stage6_count: stats.stage6_deployment_decision || 0,
            stage7_count: stats.stage7_operations_deployment || 0,
            total_projects: stats.total_projects || 0,
            completed_projects: stats.completed_projects || 0
          });
        } else {
          console.warn('⚠️ 프로젝트 통계 API 응답이 없습니다');
          setProjectStats({
            stage1_count: 0, stage2_count: 0, stage3_count: 0, stage4_count: 0,
            stage5_count: 0, stage6_count: 0, stage7_count: 0,
            total_projects: 0, completed_projects: 0
          });
        }
      } else {
        setError('데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('메트릭 조회 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>QA 대시보드 로딩 중...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchMetrics} startIcon={<RefreshIcon />}>
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          QA/QC 대시보드
        </Typography>
        <Box>
          <Tooltip title="새로고침">
            <IconButton onClick={fetchMetrics} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 메트릭 카드들 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <BackstageCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">테스트 케이스</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {metrics.totalTestCases}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 테스트 케이스
              </Typography>
            </CardContent>
          </BackstageCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <BackstageCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BugReportIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">총 버그</Typography>
              </Box>
              <Typography variant="h4" color="error">
                {metrics.totalBugReports}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                발견된 버그
              </Typography>
            </CardContent>
          </BackstageCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <BackstageCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">미해결 버그</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {metrics.openBugs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                해결 대기 중
              </Typography>
            </CardContent>
          </BackstageCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <BackstageCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">해결된 버그</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {metrics.resolvedBugs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                완료된 버그
              </Typography>
            </CardContent>
          </BackstageCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <BackstageCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">테스트 실행률</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {metrics.testExecutionRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                완료율
              </Typography>
            </CardContent>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* 프로젝트 단계별 현황 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <BackstageCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                프로젝트 단계별 현황
              </Typography>
              {projectStats ? (
                <List dense>
                  {[
                    { label: '1단계: 프로젝트 생성', count: projectStats.stage1_count },
                    { label: '2단계: 최고운영자 승인', count: projectStats.stage2_count },
                    { label: '3단계: PO 검토/PE 할당', count: projectStats.stage3_count },
                    { label: '4단계: PE 개발 진행', count: projectStats.stage4_count },
                    { label: '5단계: QA 승인 대기', count: projectStats.stage5_count },
                    { label: '6단계: PO 배포 결정', count: projectStats.stage6_count },
                    { label: '7단계: 운영팀 배포', count: projectStats.stage7_count },
                  ].map((stage, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemText
                        primary={stage.label}
                        secondary={`${stage.count} 건`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <LinearProgress
                        variant="determinate"
                        value={(stage.count / (projectStats.total_projects || 1)) * 100}
                        sx={{ width: '40%', ml: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="warning">
                  프로젝트 통계를 불러올 수 없습니다.
                </Alert>
              )}
            </CardContent>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* 최근 버그 리포트 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <BackstageCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">최근 버그 리포트</Typography>
                <Button size="small" startIcon={<AddIcon />}>
                  새 버그 리포트
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>제목</TableCell>
                      <TableCell>심각도</TableCell>
                      <TableCell>우선순위</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentBugs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            최근 버그 리포트가 없습니다.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentBugs.map((bug) => (
                        <TableRow key={bug.id}>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {bug.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={bug.severity} 
                              color={getSeverityColor(bug.severity) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={bug.priority} 
                              color={getPriorityColor(bug.priority) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={bug.status} 
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </BackstageCard>
        </Grid>

        {/* 최근 테스트 케이스 */}
        <Grid item xs={12} md={6}>
          <BackstageCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">최근 테스트 케이스</Typography>
                <Button size="small" startIcon={<AddIcon />}>
                  새 테스트 케이스
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>이름</TableCell>
                      <TableCell>설명</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTestCases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            최근 테스트 케이스가 없습니다.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentTestCases.map((testCase) => (
                        <TableRow key={testCase.id}>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {testCase.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {testCase.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={testCase.status || 'draft'} 
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </BackstageCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QADashboard;
