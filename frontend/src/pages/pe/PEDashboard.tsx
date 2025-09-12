// [advice from AI] PE 대시보드 페이지
// Phase 3: PE 업무 지원 시스템의 통합 대시보드

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

interface DashboardStats {
  total_tasks: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  paused_tasks: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  avg_progress: number;
}

interface RecentActivity {
  title: string;
  status: string;
  progress_percentage: number;
  last_activity_at: string;
  project_name: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress_percentage: number;
  estimated_hours: number;
  actual_hours?: number;
  project_name: string;
  created_by_name: string;
  last_activity_at?: string;
}

const PEDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_tasks: 0,
    assigned_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    paused_tasks: 0,
    total_estimated_hours: 0,
    total_actual_hours: 0,
    avg_progress: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // [advice from AI] 데이터 로드 함수들
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // 대시보드 통계 로드
      const statsResponse = await fetch('/api/operations/pe/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
        setRecentActivity(statsData.recent_activity);
      }
      
      // 업무 목록 로드
      const tasksResponse = await fetch('/api/operations/pe/tasks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData);
      }
      
    } catch (error) {
      console.error('대시보드 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          PE 대시보드
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
        >
          새로고침
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    전체 업무
                  </Typography>
                  <Typography variant="h5">
                    {stats.total_tasks}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    진행 중
                  </Typography>
                  <Typography variant="h5">
                    {stats.in_progress_tasks}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    완료됨
                  </Typography>
                  <Typography variant="h5">
                    {stats.completed_tasks}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    평균 진행률
                  </Typography>
                  <Typography variant="h5">
                    {Math.round(stats.avg_progress)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 현재 업무 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                현재 업무
              </Typography>
              {tasks.length === 0 ? (
                <Alert severity="info">할당된 업무가 없습니다.</Alert>
              ) : (
                <List>
                  {tasks.slice(0, 5).map((task) => (
                    <ListItem key={task.id} divider>
                      <ListItemIcon>
                        <AssignmentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {task.project_name} • {task.created_by_name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={task.progress_percentage || 0}
                                sx={{ width: '100px', mr: 2 }}
                              />
                              <Typography variant="body2" sx={{ mr: 2 }}>
                                {task.progress_percentage || 0}%
                              </Typography>
                              <Chip
                                label={task.status}
                                color={getStatusColor(task.status)}
                                size="small"
                                sx={{ mr: 1 }}
                              />
                              <Chip
                                label={task.priority}
                                color={getPriorityColor(task.priority)}
                                size="small"
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 활동 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 활동
              </Typography>
              {recentActivity.length === 0 ? (
                <Alert severity="info">최근 활동이 없습니다.</Alert>
              ) : (
                <List>
                  {recentActivity.map((activity, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <CodeIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {activity.project_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              진행률: {activity.progress_percentage || 0}% • 
                              {activity.last_activity_at ? 
                                new Date(activity.last_activity_at).toLocaleDateString() : 
                                '활동 없음'
                              }
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 업무 시간 통계 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                업무 시간 통계
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">예상 시간</Typography>
                <Typography variant="body2">{stats.total_estimated_hours}시간</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">실제 시간</Typography>
                <Typography variant="body2" color="primary.main">{stats.total_actual_hours}시간</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">효율성</Typography>
                <Typography variant="body2" color={stats.total_actual_hours <= stats.total_estimated_hours ? 'success.main' : 'warning.main'}>
                  {stats.total_estimated_hours > 0 ? 
                    Math.round((stats.total_estimated_hours / stats.total_actual_hours) * 100) : 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 업무 상태 분포 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                업무 상태 분포
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">할당됨</Typography>
                <Typography variant="body2" color="info.main">{stats.assigned_tasks}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">진행 중</Typography>
                <Typography variant="body2" color="primary.main">{stats.in_progress_tasks}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">완료됨</Typography>
                <Typography variant="body2" color="success.main">{stats.completed_tasks}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">일시정지</Typography>
                <Typography variant="body2" color="warning.main">{stats.paused_tasks}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 빠른 액션 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                빠른 액션
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<TrendingUpIcon />}
                  href="/pe/tasks"
                >
                  업무 관리
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CodeIcon />}
                  href="/pe/code-registration"
                >
                  코드 등록
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TimelineIcon />}
                  href="/pe/weekly-reports"
                >
                  주간 보고서
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<BugReportIcon />}
                  href="/pe/bug-reports"
                >
                  버그 리포트
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PEDashboard;
