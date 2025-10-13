// [advice from AI] 지식자원 대시보드 - 지식 자산 현황 및 분석
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert
} from '@mui/material';
// [advice from AI] 아이콘 제거하고 텍스트만 사용
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 대시보드 메트릭 타입
interface DashboardMetrics {
  totalAssets: number;
  pendingApprovals: number;
  activeContributors: number;
  monthlyGrowth: number;
  categoryBreakdown: {
    domains: number;
    projects: number;
    systems: number;
    code: number;
    design: number;
    documents: number;
  };
  recentTrends: {
    period: string;
    created: number;
    updated: number;
    approved: number;
  }[];
  topContributors: {
    name: string;
    contributions: number;
    category: string;
  }[];
}

const KnowledgeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // [advice from AI] 대시보드 메트릭 로드
  const loadDashboardMetrics = async () => {
    try {
      setLoading(true);
      
      // API 호출로 실제 데이터 가져오기
      const { token } = useJwtAuthStore.getState();
      const response = await fetch('/api/knowledge/dashboard-metrics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('대시보드 메트릭 로드 실패');
      }

      const data = await response.json();
      setMetrics(data);
      
    } catch (error) {
      console.error('대시보드 메트릭 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          지식자원 대시보드
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
        지식자원 대시보드
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        지식 자산의 현황과 활용도를 한눈에 확인하세요
      </Typography>

      <Grid container spacing={3}>
        {/* [advice from AI] 주요 메트릭 카드들 */}
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
            onClick={() => navigate('/knowledge')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                총 자산 수
              </Typography>
              <Typography variant="h4" color="primary">
                {metrics.totalAssets.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                승인 대기
              </Typography>
              <Typography variant="h4" color="warning.main">
                {metrics.pendingApprovals}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                활성 기여자
              </Typography>
              <Typography variant="h4" color="success.main">
                {metrics.activeContributors}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                월간 성장률
              </Typography>
              <Typography variant="h4" color="info.main">
                +{metrics.monthlyGrowth}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 카테고리별 현황 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              카테고리별 현황
            </Typography>
            <List dense>
              <ListItem 
                button 
                onClick={() => navigate('/knowledge/domains')}
                sx={{ 
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemText primary="도메인" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metrics.categoryBreakdown.domains / metrics.totalAssets) * 100}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown.domains}
                  </Typography>
                </Box>
              </ListItem>
              <ListItem 
                button 
                onClick={() => navigate('/knowledge/projects')}
                sx={{ 
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemText primary="프로젝트" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metrics.categoryBreakdown.projects / metrics.totalAssets) * 100}
                    sx={{ width: 100 }}
                    color="secondary"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown.projects}
                  </Typography>
                </Box>
              </ListItem>
              <ListItem 
                button 
                onClick={() => navigate('/knowledge/systems')}
                sx={{ 
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemText primary="시스템" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metrics.categoryBreakdown.systems / metrics.totalAssets) * 100}
                    sx={{ width: 100 }}
                    color="success"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown.systems}
                  </Typography>
                </Box>
              </ListItem>
              <ListItem 
                button 
                onClick={() => navigate('/knowledge/code')}
                sx={{ 
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemText primary="코드 컴포넌트" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metrics.categoryBreakdown.code / metrics.totalAssets) * 100}
                    sx={{ width: 100 }}
                    color="info"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown.code}
                  </Typography>
                </Box>
              </ListItem>
              <ListItem 
                button 
                onClick={() => navigate('/knowledge/design')}
                sx={{ 
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemText primary="디자인 자산" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metrics.categoryBreakdown.design / metrics.totalAssets) * 100}
                    sx={{ width: 100 }}
                    color="warning"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown.design}
                  </Typography>
                </Box>
              </ListItem>
              <ListItem 
                button 
                onClick={() => navigate('/knowledge/docs')}
                sx={{ 
                  borderRadius: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemText primary="문서/가이드" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metrics.categoryBreakdown.documents / metrics.totalAssets) * 100}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown.documents}
                  </Typography>
                </Box>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* [advice from AI] 상위 기여자 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              상위 기여자
            </Typography>
            <List dense>
              {metrics.topContributors.map((contributor, index) => (
                <ListItem key={contributor.name}>
                  <ListItemIcon>
                    <Chip 
                      label={index + 1} 
                      size="small" 
                      color={index === 0 ? 'primary' : index === 1 ? 'secondary' : 'default'}
                      sx={{ width: 24, height: 24 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={contributor.name}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={contributor.category} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                        <Typography variant="caption">
                          {contributor.contributions}개 기여
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* [advice from AI] 월별 활동 트렌드 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              월별 활동 트렌드
            </Typography>
            <Grid container spacing={2}>
              {metrics.recentTrends.map((trend) => (
                <Grid item xs={12} sm={6} md={2.4} key={trend.period}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        {trend.period}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">생성:</Typography>
                          <Typography variant="body2" color="primary">
                            {trend.created}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">수정:</Typography>
                          <Typography variant="body2" color="secondary">
                            {trend.updated}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">승인:</Typography>
                          <Typography variant="body2" color="success.main">
                            {trend.approved}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* [advice from AI] 권한 관련 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          일부 데이터에 접근할 권한이 없을 수 있습니다.
        </Alert>
      )}
    </Box>
  );
};

export default KnowledgeDashboard;
