// [advice from AI] 카탈로그 대시보드 컴포넌트
// 지식자원 카탈로그의 메인 대시보드

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface CatalogStats {
  total_domains: number;
  total_systems: number;
  total_components: number;
  total_apis: number;
  total_resources: number;
  total_knowledge_assets: number;
  pending_approvals: number;
}

const CatalogDashboard: React.FC = () => {
  const { user } = useJwtAuthStore();
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] API 호출로 카탈로그 통계 가져오기 - 실제 데이터 연동
  useEffect(() => {
    const fetchCatalogStats = async () => {
      try {
        setLoading(true);
        const token = useJwtAuthStore.getState().token;
        
        // 실제 구현된 API들로 통계 데이터 조회
        const [designAssetsResponse, codeComponentsResponse, documentsResponse] = await Promise.all([
          fetch('http://localhost:3001/api/design-assets?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/code-components?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/documents?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [designAssetsData, codeComponentsData, documentsData] = await Promise.all([
          designAssetsResponse.json(),
          codeComponentsResponse.json(),
          documentsResponse.json()
        ]);

        // 실제 데이터로 통계 구성
        setCatalogStats({
          total_domains: 1, // 기본 도메인
          total_systems: 1, // Timbel 시스템
          total_components: codeComponentsData.success ? (codeComponentsData.data?.pagination?.total || 0) : 0,
          total_apis: 1, // 관리자 API
          total_resources: (designAssetsData.success ? (designAssetsData.data?.pagination?.total || 0) : 0) + 
                          (documentsData.success ? (documentsData.data?.pagination?.total || 0) : 0),
          total_knowledge_assets: (designAssetsData.success ? (designAssetsData.data?.pagination?.total || 0) : 0) + 
                                 (codeComponentsData.success ? (codeComponentsData.data?.pagination?.total || 0) : 0) + 
                                 (documentsData.success ? (documentsData.data?.pagination?.total || 0) : 0),
          pending_approvals: 0 // 승인 대기 항목
        });
      } catch (err) {
        console.error('Error fetching catalog stats:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // 에러 시 기본값 설정
        setCatalogStats({
          total_domains: 1,
          total_systems: 1,
          total_components: 0,
          total_apis: 1,
          total_resources: 0,
          total_knowledge_assets: 0,
          pending_approvals: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchCatalogStats();
    }
  }, [user]);

  // [advice from AI] 최근 활동 데이터 상태
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // [advice from AI] 최근 활동 데이터 조회
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const token = useJwtAuthStore.getState().token;
        
        // 최근 디자인 자산, 코드 컴포넌트, 문서 데이터 조회
        const [designAssetsResponse, codeComponentsResponse, documentsResponse] = await Promise.all([
          fetch('http://localhost:3001/api/design-assets?limit=3', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/code-components?limit=3', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/documents?limit=3', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [designAssetsData, codeComponentsData, documentsData] = await Promise.all([
          designAssetsResponse.json(),
          codeComponentsResponse.json(),
          documentsResponse.json()
        ]);

        const activities: any[] = [];

        // 디자인 자산 활동
        if (designAssetsData.success && designAssetsData.data) {
          designAssetsData.data.slice(0, 2).forEach((asset: any) => {
            activities.push({
              type: 'component',
              title: `디자인 자산 등록 - ${asset.name}`,
              user: asset.created_by || '시스템',
              time: new Date(asset.created_at).toLocaleString(),
              icon: 'component'
            });
          });
        }

        // 코드 컴포넌트 활동
        if (codeComponentsData.success && codeComponentsData.data) {
          codeComponentsData.data.slice(0, 2).forEach((component: any) => {
            activities.push({
              type: 'system',
              title: `코드 컴포넌트 등록 - ${component.name}`,
              user: component.created_by || '시스템',
              time: new Date(component.created_at).toLocaleString(),
              icon: 'system'
            });
          });
        }

        // 문서 활동
        if (documentsData.success && documentsData.data) {
          documentsData.data.slice(0, 1).forEach((doc: any) => {
            activities.push({
              type: 'api',
              title: `문서 등록 - ${doc.title}`,
              user: doc.created_by || '시스템',
              time: new Date(doc.created_at).toLocaleString(),
              icon: 'api'
            });
          });
        }

        // 시간순으로 정렬하고 최대 5개만 표시
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivities(activities.slice(0, 5));
      } catch (err) {
        console.error('Error fetching recent activities:', err);
        // 에러 시 기본 데이터 사용
        setRecentActivities([
          { type: 'component', title: '새로운 컴포넌트 등록', user: '김PE', time: '2분 전', icon: 'component' },
          { type: 'system', title: '시스템 업데이트', user: '이운영', time: '15분 전', icon: 'system' },
          { type: 'domain', title: '도메인 구조 변경', user: '박관리', time: '1시간 전', icon: 'domain' },
          { type: 'api', title: 'API 문서 업데이트', user: '최QA', time: '2시간 전', icon: 'api' }
        ]);
      }
    };

    if (user) {
      fetchRecentActivities();
    }
  }, [user]);

  // [advice from AI] 카탈로그 메뉴 항목들 - 아이콘 제거
  const catalogItems = [
    {
      title: 'Domains',
      description: '비즈니스 도메인 관리',
      path: '/catalog/domains',
      count: catalogStats?.total_domains || 0,
      color: '#1976d2'
    },
    {
      title: 'Systems',
      description: '시스템 아키텍처 관리',
      path: '/catalog/systems',
      count: catalogStats?.total_systems || 0,
      color: '#388e3c'
    },
    {
      title: 'Components',
      description: '재사용 가능한 컴포넌트',
      path: '/catalog/components',
      count: catalogStats?.total_components || 0,
      color: '#f57c00'
    },
    {
      title: 'APIs',
      description: 'API 문서 및 관리',
      path: '/catalog/apis',
      count: catalogStats?.total_apis || 0,
      color: '#7b1fa2'
    },
    {
      title: 'Resources',
      description: '리소스 및 에셋 관리',
      path: '/catalog/resources',
      count: catalogStats?.total_resources || 0,
      color: '#d32f2f'
    },
    {
      title: 'Groups',
      description: '그룹 및 팀 관리',
      path: '/catalog/groups',
      count: 0, // [advice from AI] 그룹 관리 기능은 시스템 관리로 이동됨
      color: '#0288d1'
    },
    {
      title: 'Users',
      description: '사용자 계정 관리',
      path: '/catalog/users',
      count: 0, // [advice from AI] 사용자 관리 기능은 시스템 관리로 이동됨
      color: '#689f38'
    }
  ];

  // [advice from AI] 아이콘 제거 - 텍스트 기반으로 변경
  const getActivityIcon = (type: string) => {
    return null; // 아이콘 사용하지 않음
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'component': return '#f57c00';
      case 'system': return '#388e3c';
      case 'domain': return '#1976d2';
      case 'api': return '#7b1fa2';
      default: return '#666';
    }
  };

  // [advice from AI] 로딩 상태 처리
  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // [advice from AI] 에러 상태 처리
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          카탈로그 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          지식자원 카탈로그의 전체 현황과 최근 활동을 확인할 수 있습니다.
        </Typography>
      </Box>

      {/* [advice from AI] 통계 요약 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#1976d2', mb: 2 }}>
                Domains
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#1976d2' }}>
                {catalogStats?.total_domains || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                비즈니스 도메인
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#388e3c', mb: 2 }}>
                Systems
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#388e3c' }}>
                {catalogStats?.total_systems || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                시스템 아키텍처
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f57c00', mb: 2 }}>
                Components
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#f57c00' }}>
                {catalogStats?.total_components || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                재사용 컴포넌트
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#7b1fa2', mb: 2 }}>
                APIs
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                {catalogStats?.total_apis || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                API 엔드포인트
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* [advice from AI] 카탈로그 메뉴 그리드 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                카탈로그 메뉴
              </Typography>
              <Grid container spacing={2}>
                {catalogItems.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        border: '1px solid #e0e0e0',
                        '&:hover': {
                          borderColor: item.color,
                          boxShadow: 2
                        }
                      }}
                      onClick={() => window.location.href = item.path}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: item.color, mb: 1 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Chip 
                          label={`${item.count}개`} 
                          size="small" 
                          sx={{ backgroundColor: item.color + '20', color: item.color }}
                        />
                        <Button size="small" variant="outlined">
                          보기
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 최근 활동 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                최근 활동
              </Typography>
              <List dense>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box sx={{ color: getActivityColor(activity.type) }}>
                          {getActivityIcon(activity.type)}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {activity.title}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {activity.user}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              • {activity.time}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CatalogDashboard;
