// [advice from AI] PO 대시보드 페이지
// Phase 2: PO 업무 지원 시스템의 통합 대시보드

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
  Tooltip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  team: string[];
  startDate: string;
  endDate: string;
  priority: string;
  customer_company: string;
}

interface Instruction {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimated_hours: number;
  actual_hours?: number;
  project_name: string;
  assigned_pe_name: string;
  created_at: string;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalInstructions: number;
  pendingInstructions: number;
  approvedInstructions: number;
  totalTeamMembers: number;
  overdueTasks: number;
}

const PODashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalInstructions: 0,
    pendingInstructions: 0,
    approvedInstructions: 0,
    totalTeamMembers: 0,
    overdueTasks: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // [advice from AI] 데이터 로드 함수들
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // 프로젝트 데이터 로드
      const projectsResponse = await fetch('/api/operations/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);
      }
      
      // 개발 지시서 데이터 로드
      const instructionsResponse = await fetch('/api/operations/instructions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (instructionsResponse.ok) {
        const instructionsData = await instructionsResponse.json();
        setInstructions(instructionsData);
      }
      
      // 통계 계산
      calculateStats(projects || [], instructions || []);
      
    } catch (error) {
      console.error('대시보드 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 통계 계산
  const calculateStats = (projectsData: Project[], instructionsData: Instruction[]) => {
    const totalProjects = projectsData.length;
    const activeProjects = projectsData.filter(p => p.status === 'active').length;
    const completedProjects = projectsData.filter(p => p.status === 'completed').length;
    
    const totalInstructions = instructionsData.length;
    const pendingInstructions = instructionsData.filter(i => i.status === 'review').length;
    const approvedInstructions = instructionsData.filter(i => i.status === 'approved').length;
    
    // 팀 멤버 수 계산 (중복 제거)
    const allTeamMembers = new Set();
    projectsData.forEach(project => {
      project.team.forEach(member => allTeamMembers.add(member));
    });
    
    // 지연된 작업 계산 (예시)
    const overdueTasks = instructionsData.filter(instruction => {
      const createdDate = new Date(instruction.created_at);
      const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 7 && instruction.status !== 'approved';
    }).length;
    
    setStats({
      totalProjects,
      activeProjects,
      completedProjects,
      totalInstructions,
      pendingInstructions,
      approvedInstructions,
      totalTeamMembers: allTeamMembers.size,
      overdueTasks
    });
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'default';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 최근 활동 목록
  const getRecentActivities = () => {
    const recentInstructions = instructions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    return recentInstructions;
  };

  // [advice from AI] 지연된 작업 목록
  const getOverdueTasks = () => {
    return instructions.filter(instruction => {
      const createdDate = new Date(instruction.created_at);
      const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 7 && instruction.status !== 'approved';
    });
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
          PO 대시보드
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
                    전체 프로젝트
                  </Typography>
                  <Typography variant="h5">
                    {stats.totalProjects}
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
                    활성 프로젝트
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeProjects}
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
                    검토 대기 지시서
                  </Typography>
                  <Typography variant="h5">
                    {stats.pendingInstructions}
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
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    지연된 작업
                  </Typography>
                  <Typography variant="h5">
                    {stats.overdueTasks}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 프로젝트 현황 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                프로젝트 현황
              </Typography>
              {projects.length === 0 ? (
                <Alert severity="info">등록된 프로젝트가 없습니다.</Alert>
              ) : (
                <List>
                  {projects.map((project) => (
                    <ListItem key={project.id} divider>
                      <ListItemIcon>
                        <AssignmentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={project.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {project.customer_company} • {project.team.join(', ')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={project.progress}
                                sx={{ width: '100px', mr: 2 }}
                              />
                              <Typography variant="body2" sx={{ mr: 2 }}>
                                {project.progress}%
                              </Typography>
                              <Chip
                                label={project.status}
                                color={getStatusColor(project.status)}
                                size="small"
                                sx={{ mr: 1 }}
                              />
                              <Chip
                                label={project.priority}
                                color={getPriorityColor(project.priority)}
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
              {getRecentActivities().length === 0 ? (
                <Alert severity="info">최근 활동이 없습니다.</Alert>
              ) : (
                <List>
                  {getRecentActivities().map((instruction) => (
                    <ListItem key={instruction.id} divider>
                      <ListItemIcon>
                        {instruction.status === 'approved' ? (
                          <CheckCircleIcon color="success" />
                        ) : instruction.status === 'review' ? (
                          <PendingIcon color="warning" />
                        ) : (
                          <AssignmentIcon />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={instruction.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {instruction.project_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {instruction.assigned_pe_name} • {instruction.estimated_hours}시간
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

        {/* 지연된 작업 알림 */}
        {getOverdueTasks().length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="error">
                  <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  지연된 작업 알림
                </Typography>
                <List>
                  {getOverdueTasks().map((instruction) => (
                    <ListItem key={instruction.id} divider>
                      <ListItemIcon>
                        <WarningIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={instruction.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {instruction.project_name} • {instruction.assigned_pe_name}
                            </Typography>
                            <Typography variant="caption" color="error">
                              {Math.ceil((Date.now() - new Date(instruction.created_at).getTime()) / (1000 * 60 * 60 * 24))}일 지연
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 팀 현황 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                팀 현황
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="h5">
                  {stats.totalTeamMembers}명
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                현재 활성화된 팀 멤버 수
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 지시서 현황 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                지시서 현황
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">전체</Typography>
                <Typography variant="body2">{stats.totalInstructions}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">승인됨</Typography>
                <Typography variant="body2" color="success.main">{stats.approvedInstructions}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">검토 대기</Typography>
                <Typography variant="body2" color="warning.main">{stats.pendingInstructions}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PODashboard;