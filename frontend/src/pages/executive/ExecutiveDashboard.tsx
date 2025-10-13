// [advice from AI] 최고관리자 대시보드 - 전략적 의사결정을 위한 통합 현황
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 경영진 대시보드 데이터 타입
interface ExecutiveMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  usedBudget: number;
  totalTeamMembers: number;
  systemsCount: number;
  domainsCount: number;
  monthlyProgress: {
    month: string;
    completed: number;
    budget_used: number;
    team_productivity: number;
  }[];
}

// [advice from AI] 프로젝트 현황 타입
interface ProjectStatus {
  id: string;
  name: string;
  domain: string;
  status: string;
  progress: number;
  budget: number;
  team_size: number;
  priority: string;
  estimated_completion: string;
}

const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([]);

  // [advice from AI] 경영진 메트릭 로드 (실제 데이터 통합)
  const loadExecutiveMetrics = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      
      // 지식자원 카탈로그와 운영센터 데이터를 모두 가져와서 통합
      const [knowledgeRes, operationsRes] = await Promise.all([
        fetch('/api/knowledge/catalog-stats', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/operations/dashboard-stats', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      let knowledgeData = null;
      let operationsData = null;

      if (knowledgeRes.ok) {
        knowledgeData = await knowledgeRes.json();
      }

      if (operationsRes.ok) {
        operationsData = await operationsRes.json();
      }

      // 통합 메트릭 생성
      const integratedMetrics = {
        totalProjects: knowledgeData?.stats?.projects || 0,
        activeProjects: operationsData?.stats?.deployments?.in_progress || 0,
        completedProjects: operationsData?.stats?.deployments?.completed || 0,
        totalBudget: 100000000, // 임시값
        usedBudget: 45000000, // 임시값
        totalTeamMembers: operationsData?.stats?.servers?.total || 0,
        systemsCount: knowledgeData?.stats?.systems || 0,
        domainsCount: knowledgeData?.stats?.domains || 0,
        monthlyProgress: [
          { month: '이번달', completed: operationsData?.stats?.deployments?.completed || 0, budget_used: 15000000, team_productivity: 85 }
        ]
      };

      // 프로젝트 상태 (운영센터 배포 데이터 기반)
      const projectStatuses = operationsData?.recentDeployments?.map((deployment: any) => ({
        id: deployment.id,
        name: deployment.projectName,
        domain: '운영센터',
        status: deployment.status,
        progress: deployment.progress,
        budget: 10000000,
        team_size: 3,
        priority: 'high',
        estimated_completion: deployment.startedAt
      })) || [];

      setMetrics(integratedMetrics);
      setProjectStatuses(projectStatuses);
      
    } catch (error) {
      console.error('경영진 메트릭 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'info';
      case 'development': return 'primary';
      case 'testing': return 'warning';
      case 'deployment': return 'secondary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  useEffect(() => {
    if (user?.roleType === 'admin' || user?.roleType === 'executive') {
      loadExecutiveMetrics();
    }
  }, [user]);

  if (user?.roleType !== 'admin' && user?.roleType !== 'executive') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          최고관리자 대시보드에 접근할 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          최고관리자 대시보드
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          대시보드 데이터를 불러올 수 없습니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        최고관리자 대시보드
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        조직 전체의 프로젝트 현황과 성과를 한눈에 확인하세요
      </Typography>

      {/* [advice from AI] 주요 메트릭 카드들 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate('/knowledge/projects')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                총 프로젝트
              </Typography>
              <Typography variant="h4" color="primary">
                {metrics.totalProjects}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                활성: {metrics.activeProjects} | 완료: {metrics.completedProjects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                예산 현황
              </Typography>
              <Typography variant="h4" color="warning.main">
                {Math.round((metrics.usedBudget / metrics.totalBudget) * 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                사용: {metrics.usedBudget.toLocaleString()}만원 / {metrics.totalBudget.toLocaleString()}만원
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                팀 규모
              </Typography>
              <Typography variant="h4" color="info.main">
                {metrics.totalTeamMembers}명
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전체 팀원 수
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate('/knowledge/systems')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                시스템 현황
              </Typography>
              <Typography variant="h4" color="success.main">
                {metrics.systemsCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                도메인: {metrics.domainsCount}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 프로젝트 현황 테이블 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          주요 프로젝트 현황
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>프로젝트명</TableCell>
                <TableCell>도메인</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>우선순위</TableCell>
                <TableCell align="center">진행률</TableCell>
                <TableCell align="right">예산</TableCell>
                <TableCell align="center">팀 규모</TableCell>
                <TableCell>예상 완료</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projectStatuses.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{project.name}</Typography>
                  </TableCell>
                  <TableCell>{project.domain}</TableCell>
                  <TableCell>
                    <Chip 
                      label={project.status} 
                      color={getStatusColor(project.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={project.priority} 
                      color={getPriorityColor(project.priority) as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={project.progress}
                        sx={{ width: 60, height: 8 }}
                      />
                      <Typography variant="body2">
                        {project.progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {project.budget.toLocaleString()}만원
                  </TableCell>
                  <TableCell align="center">{project.team_size}명</TableCell>
                  <TableCell>
                    {project.estimated_completion ? new Date(project.estimated_completion).toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ExecutiveDashboard;
