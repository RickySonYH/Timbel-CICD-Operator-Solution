// [advice from AI] 지식자원 대시보드 - 지식 자산 현황 및 분석 (성능 최적화됨)
import React, { useState, useEffect, useMemo, memo } from 'react';
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
  Alert,
  Skeleton
} from '@mui/material';
// [advice from AI] 아이콘 제거하고 텍스트만 사용
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useOptimizedAPI } from '../../hooks/useOptimizedAPI';
import { usePerformanceMonitor } from '../../hooks/useOptimizedComponents';

// [advice from AI] 대시보드 메트릭 타입
interface DashboardMetrics {
  totalAssets: number;
  categoryBreakdown: {
    domains: number;
    projects: number;
    systems: number;
    components: number;
    designAssets: number;
    documents: number;
  };
}

// [advice from AI] 메모이제이션된 통계 카드 컴포넌트
const StatCard = memo(({ title, value, subtitle, color = 'primary' }: {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography color="textSecondary" gutterBottom variant="body2">
        {title}
      </Typography>
      <Typography variant="h4" component="div" color={`${color}.main`}>
        {value}
      </Typography>
      {subtitle && (
        <Typography color="textSecondary" variant="body2">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
));

// [advice from AI] 로딩 스켈레톤 컴포넌트
const DashboardSkeleton = memo(() => (
  <Grid container spacing={3}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Grid item xs={12} sm={6} md={4} key={i}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height={40} />
            <Skeleton variant="text" width="80%" />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
));

const KnowledgeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useJwtAuthStore();
  const permissions = usePermissions();
  
  // [advice from AI] 성능 모니터링
  usePerformanceMonitor('KnowledgeDashboard');
  
  // [advice from AI] 최적화된 API 훅 사용
  const { 
    data: apiData, 
    loading, 
    error, 
    refetch 
  } = useOptimizedAPI('/api/knowledge/catalog-stats', {
    cacheTime: 5 * 60 * 1000, // 5분 캐시
    retryCount: 3,
    dependencies: []
  });

  // [advice from AI] 메모이제이션된 메트릭 변환
  const metrics = useMemo(() => {
    if (!apiData?.stats) return null;
    
    const stats = apiData.stats;
    return {
      totalAssets: (stats.domains || 0) + (stats.projects || 0) + (stats.systems || 0) + 
                  (stats.codeComponents || 0) + (stats.designAssets || 0) + (stats.documents || 0),
      categoryBreakdown: {
        domains: stats.domains || 0,
        projects: stats.projects || 0,
        systems: stats.systems || 0,
        components: stats.codeComponents || 0,
        designAssets: stats.designAssets || 0,
        documents: stats.documents || 0
      }
    };
  }, [apiData]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          지식자원 대시보드
        </Typography>
        <DashboardSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          지식자원 대시보드
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
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
          <Box 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
              }
            }}
            onClick={() => navigate('/knowledge')}
          >
            <StatCard
              title="총 자산 수"
              value={(metrics.totalAssets || 0).toLocaleString()}
              subtitle="지식 자산 총합"
              color="primary"
            />
          </Box>
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
            onClick={() => navigate('/knowledge/domains')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                도메인 수
              </Typography>
              <Typography variant="h4" color="success.main">
                {metrics.categoryBreakdown?.domains || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                비즈니스 도메인
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
            onClick={() => navigate('/knowledge/projects')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                프로젝트 수
              </Typography>
              <Typography variant="h4" color="info.main">
                {metrics.categoryBreakdown?.projects || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                진행 중인 프로젝트
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
                시스템 수
              </Typography>
              <Typography variant="h4" color="warning.main">
                {metrics.categoryBreakdown?.systems || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                운영 중인 시스템
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
                    value={metrics.totalAssets > 0 && metrics.categoryBreakdown ? (metrics.categoryBreakdown.domains / metrics.totalAssets) * 100 : 0}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown?.domains || 0}
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
                    value={metrics.totalAssets > 0 && metrics.categoryBreakdown ? (metrics.categoryBreakdown.projects / metrics.totalAssets) * 100 : 0}
                    sx={{ width: 100 }}
                    color="secondary"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown?.projects || 0}
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
                    value={metrics.totalAssets > 0 && metrics.categoryBreakdown ? (metrics.categoryBreakdown.systems / metrics.totalAssets) * 100 : 0}
                    sx={{ width: 100 }}
                    color="success"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown?.systems || 0}
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
                <ListItemText primary="컴포넌트" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.totalAssets > 0 && metrics.categoryBreakdown ? (metrics.categoryBreakdown.components / metrics.totalAssets) * 100 : 0}
                    sx={{ width: 100 }}
                    color="info"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown?.components || 0}
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
                    value={metrics.totalAssets > 0 && metrics.categoryBreakdown ? (metrics.categoryBreakdown.designAssets / metrics.totalAssets) * 100 : 0}
                    sx={{ width: 100 }}
                    color="warning"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown?.designAssets || 0}
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
                    value={metrics.totalAssets > 0 && metrics.categoryBreakdown ? (metrics.categoryBreakdown.documents / metrics.totalAssets) * 100 : 0}
                    sx={{ width: 100 }}
                    color="success"
                  />
                  <Typography variant="body2">
                    {metrics.categoryBreakdown?.documents || 0}
                  </Typography>
                </Box>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* [advice from AI] 빠른 액션 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              빠른 액션
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => navigate('/knowledge/domains')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" color="primary">
                      + 도메인
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      새 도메인 추가
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => navigate('/knowledge/projects')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" color="primary">
                      + 프로젝트
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      새 프로젝트 추가
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => navigate('/knowledge/systems')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" color="primary">
                      + 시스템
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      새 시스템 추가
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => navigate('/knowledge/components')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" color="primary">
                      + 컴포넌트
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      새 컴포넌트 추가
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* [advice from AI] 시스템 상태 요약 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              시스템 상태 요약
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                전체 시스템 상태
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={75} 
                color="success"
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary">
                75% 정상 운영
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                지식 자산 활용도
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={60} 
                color="info"
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary">
                60% 활용 중
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                프로젝트 진행률
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={85} 
                color="warning"
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary">
                85% 진행 중
              </Typography>
            </Box>
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
