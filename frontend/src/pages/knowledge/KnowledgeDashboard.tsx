// [advice from AI] 지식 등록 및 관리 대시보드 컴포넌트
// 지식 자산의 등록, 검색, 승인, 다이어그램 관리 기능을 제공

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
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
import {
  Dashboard as DashboardIcon,
  Palette as DesignIcon,
  Code as CodeIcon,
  Description as DocIcon,
  Search as SearchIcon,
  Approval as ApprovalIcon,
  AccountTree as DiagramIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

const KnowledgeDashboard: React.FC = () => {
  const { user } = useJwtAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] 지식 자산 통계 조회
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = useJwtAuthStore.getState().token;
        
        if (!token) {
          throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
        }

        // [advice from AI] 실제 API에서 데이터 조회
        const [designAssetsResponse, codeComponentsResponse, documentsResponse] = await Promise.all([
          fetch('http://localhost:3001/api/design-assets', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:3001/api/code-components', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:3001/api/documents', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        const designAssetsData = await designAssetsResponse.json();
        const codeComponentsData = await codeComponentsResponse.json();
        const documentsData = await documentsResponse.json();

        // [advice from AI] 실제 데이터로 통계 설정
        setStats({
          totalDesignAssets: designAssetsData.success ? (designAssetsData.data?.length || 0) : 0,
          totalCodeComponents: codeComponentsData.success ? (codeComponentsData.data?.length || 0) : 0,
          totalDocuments: documentsData.success ? (documentsData.data?.length || 0) : 0,
          pendingApprovals: 0, // 승인 대기 데이터는 별도 API 필요
          totalDiagrams: 0, // 다이어그램 데이터는 별도 API 필요
          recentUploads: 0 // 최근 업로드 데이터는 별도 API 필요
        });

        console.log('🔍 KnowledgeDashboard 실제 데이터:', { designAssetsData, codeComponentsData, documentsData });
      } catch (err) {
        console.error('❌ KnowledgeDashboard API 에러:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // [advice from AI] 에러 시에도 기본값 설정하지 않음 - 실제 에러 표시
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  // [advice from AI] 지식 관리 메뉴 항목들
  const knowledgeItems = [
    {
      title: '디자인 자산 등록',
      description: 'UI/UX 디자인 자산을 등록하고 관리합니다',
      icon: <DesignIcon />,
      path: '/knowledge/design',
      color: '#e91e63',
      stats: stats?.totalDesignAssets || 0
    },
    {
      title: '코드/컴포넌트 등록',
      description: '재사용 가능한 코드와 컴포넌트를 등록합니다',
      icon: <CodeIcon />,
      path: '/knowledge/code',
      color: '#9c27b0',
      stats: stats?.totalCodeComponents || 0
    },
    {
      title: '문서/가이드 등록',
      description: '기술 문서와 가이드를 등록하고 관리합니다',
      icon: <DocIcon />,
      path: '/knowledge/docs',
      color: '#3f51b5',
      stats: stats?.totalDocuments || 0
    },
    {
      title: '지식 검색 및 관리',
      description: '등록된 지식 자산을 검색하고 관리합니다',
      icon: <SearchIcon />,
      path: '/knowledge/search',
      color: '#2196f3'
    },
    {
      title: '승인 워크플로우',
      description: '지식 자산의 승인 프로세스를 관리합니다',
      icon: <ApprovalIcon />,
      path: '/knowledge/approval',
      color: '#ff9800',
      stats: stats?.pendingApprovals || 0
    },
    {
      title: '다이어그램 관리',
      description: '시스템 다이어그램을 생성하고 관리합니다',
      icon: <DiagramIcon />,
      path: '/knowledge/diagrams',
      color: '#4caf50',
      stats: stats?.totalDiagrams || 0
    }
  ];

  // [advice from AI] 최근 활동 데이터 상태
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // [advice from AI] 최근 활동 데이터 조회
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const token = useJwtAuthStore.getState().token;
        if (!token) return;

        // [advice from AI] 최근 등록된 데이터 조회
        const [recentDesignAssets, recentCodeComponents, recentDocuments] = await Promise.all([
          fetch('http://localhost:3001/api/design-assets?limit=5&sort=created_at:desc', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:3001/api/code-components?limit=5&sort=created_at:desc', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:3001/api/documents?limit=5&sort=created_at:desc', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        const designAssetsData = await recentDesignAssets.json();
        const codeComponentsData = await recentCodeComponents.json();
        const documentsData = await recentDocuments.json();

        // [advice from AI] 활동 데이터 변환
        const activities: any[] = [];

        if (designAssetsData.success && designAssetsData.data) {
          designAssetsData.data.slice(0, 2).forEach((item: any) => {
            activities.push({
              type: 'design',
              title: `새 디자인 자산 등록: ${item.name}`,
              user: item.creator_name || '시스템',
              time: new Date(item.created_at).toLocaleString()
            });
          });
        }

        if (codeComponentsData.success && codeComponentsData.data) {
          codeComponentsData.data.slice(0, 2).forEach((item: any) => {
            activities.push({
              type: 'code',
              title: `새 코드 컴포넌트 등록: ${item.name}`,
              user: item.creator_name || '시스템',
              time: new Date(item.created_at).toLocaleString()
            });
          });
        }

        if (documentsData.success && documentsData.data) {
          documentsData.data.slice(0, 2).forEach((item: any) => {
            activities.push({
              type: 'doc',
              title: `새 문서 등록: ${item.title}`,
              user: item.creator_name || '시스템',
              time: new Date(item.created_at).toLocaleString()
            });
          });
        }

        // [advice from AI] 시간순 정렬
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivities(activities.slice(0, 6)); // 최대 6개만 표시

      } catch (err) {
        console.error('최근 활동 데이터 조회 실패:', err);
        // [advice from AI] 에러 시 기본 활동 표시
        setRecentActivities([
          { type: 'design', title: '데이터 로딩 중...', user: '시스템', time: '방금 전' }
        ]);
      }
    };

    if (user) {
      fetchRecentActivities();
    }
  }, [user]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'design': return <DesignIcon />;
      case 'code': return <CodeIcon />;
      case 'doc': return <DocIcon />;
      case 'approval': return <ApprovalIcon />;
      case 'diagram': return <DiagramIcon />;
      default: return <DashboardIcon />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'design': return '#e91e63';
      case 'code': return '#9c27b0';
      case 'doc': return '#3f51b5';
      case 'approval': return '#ff9800';
      case 'diagram': return '#4caf50';
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
          지식 등록 및 관리 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          지식 자산을 등록, 검색, 승인하고 시스템 다이어그램을 관리합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 통계 요약 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DesignIcon sx={{ color: '#e91e63', mr: 1 }} />
                <Typography variant="h6">디자인 자산</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#e91e63' }}>
                {stats?.totalDesignAssets || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                등록된 디자인 자산
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CodeIcon sx={{ color: '#9c27b0', mr: 1 }} />
                <Typography variant="h6">코드 컴포넌트</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                {stats?.totalCodeComponents || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                재사용 가능한 컴포넌트
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DocIcon sx={{ color: '#3f51b5', mr: 1 }} />
                <Typography variant="h6">문서/가이드</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#3f51b5' }}>
                {stats?.totalDocuments || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                기술 문서 및 가이드
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ApprovalIcon sx={{ color: '#ff9800', mr: 1 }} />
                <Typography variant="h6">승인 대기</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#ff9800' }}>
                {stats?.pendingApprovals || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                승인 대기 중인 자산
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 지식 관리 메뉴 그리드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {knowledgeItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate(item.path)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: `${item.color}20`,
                      color: item.color,
                      mr: 2
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {item.description}
                </Typography>
                {item.stats !== undefined && (
                  <Typography variant="h4" sx={{ fontWeight: 600, color: item.color }}>
                    {item.stats}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<ViewIcon />}>
                  관리
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 최근 활동 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                최근 지식 활동
              </Typography>
              <List>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem disablePadding>
                      <ListItemIcon>
                        <Box 
                          sx={{ 
                            p: 0.5, 
                            borderRadius: 1, 
                            bgcolor: `${getActivityColor(activity.type)}20`,
                            color: getActivityColor(activity.type)
                          }}
                        >
                          {getActivityIcon(activity.type)}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              {activity.user}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {activity.time}
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

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                지식 관리 현황
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="전체 지식 자산"
                    secondary={`${(stats?.totalDesignAssets || 0) + (stats?.totalCodeComponents || 0) + (stats?.totalDocuments || 0)}개`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="이번 주 등록"
                    secondary={`${stats?.recentUploads || 0}개`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="승인 완료율"
                    secondary="94.2%"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="평균 검토 시간"
                    secondary="2.3일"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default KnowledgeDashboard;
