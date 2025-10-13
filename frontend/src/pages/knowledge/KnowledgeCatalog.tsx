// [advice from AI] 지식자원 카탈로그 메인 페이지 - 통합 지식 관리 허브
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  LinearProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Paper
} from '@mui/material';
// [advice from AI] 아이콘 제거하고 텍스트만 사용
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 카탈로그 통계 데이터 타입
interface CatalogStats {
  domains: number;
  projects: number;
  systems: number;
  codeComponents: number;
  designAssets: number;
  documents: number;
}

// [advice from AI] 최근 활동 데이터 타입
interface RecentActivity {
  id: string;
  type: 'domain' | 'project' | 'system' | 'code' | 'design' | 'document';
  title: string;
  action: 'created' | 'updated' | 'approved';
  user: string;
  timestamp: string;
}

// [advice from AI] 인기 자원 데이터 타입
interface PopularResource {
  id: string;
  type: 'domain' | 'project' | 'system' | 'code' | 'design' | 'document';
  title: string;
  views: number;
  stars: number;
  category: string;
}

const KnowledgeCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [popularResources, setPopularResources] = useState<PopularResource[]>([]);
  const [loading, setLoading] = useState(true);

  // [advice from AI] 카탈로그 데이터 로드
  const loadCatalogData = async () => {
    try {
      setLoading(true);
      
      // API 호출로 실제 데이터 가져오기
      const { token } = useJwtAuthStore.getState();
      const response = await fetch('/api/knowledge/catalog-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('카탈로그 데이터 로드 실패');
      }

      const data = await response.json();
      setStats(data.stats);
      setRecentActivities(data.recentActivities);
      setPopularResources(data.popularResources);
      
    } catch (error) {
      console.error('카탈로그 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
  }, []);

  // [advice from AI] 카테고리별 텍스트 라벨 매핑
  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'domain': return 'D';
      case 'project': return 'P';
      case 'system': return 'S';
      case 'code': return 'C';
      case 'design': return 'UI';
      case 'document': return 'DOC';
      default: return 'DOC';
    }
  };

  // [advice from AI] 카테고리별 색상 매핑
  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'domain': return 'primary';
      case 'project': return 'secondary';
      case 'system': return 'success';
      case 'code': return 'info';
      case 'design': return 'warning';
      case 'document': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 카테고리 카드 데이터
  const categoryCards = [
    {
      title: '도메인',
      description: '비즈니스 도메인 및 영업처 정보',
      count: stats?.domains || 0,
      label: 'DOMAIN',
      color: 'primary',
      path: '/knowledge/domains'
    },
    {
      title: '프로젝트',
      description: '프로젝트 기획 및 관리 정보',
      count: stats?.projects || 0,
      label: 'PROJECT',
      color: 'secondary',
      path: '/knowledge/projects',
      badge: 'NEW'
    },
    {
      title: '시스템',
      description: '솔루션 및 시스템 아키텍처',
      count: stats?.systems || 0,
      label: 'SYSTEM',
      color: 'success',
      path: '/knowledge/systems'
    },
    {
      title: '코드 컴포넌트',
      description: '재사용 가능한 코드 라이브러리',
      count: stats?.codeComponents || 0,
      label: 'CODE',
      color: 'info',
      path: '/knowledge/code'
    },
    {
      title: '디자인 자산',
      description: 'UI/UX 디자인 리소스',
      count: stats?.designAssets || 0,
      label: 'DESIGN',
      color: 'warning',
      path: '/knowledge/design'
    },
    {
      title: '문서/가이드',
      description: '개발 가이드 및 문서',
      count: stats?.documents || 0,
      label: 'DOCS',
      color: 'default',
      path: '/knowledge/docs'
    }
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          지식자원 카탈로그
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 섹션 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          지식자원 카탈로그
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          조직의 모든 지식 자산을 체계적으로 관리하고 공유하세요
        </Typography>

        {/* [advice from AI] 검색바 */}
        <TextField
          fullWidth
          placeholder="지식 자원 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ maxWidth: 600, mb: 3 }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* [advice from AI] 카테고리 카드들 */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            {categoryCards.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.title}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => navigate(category.path)}
                >
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip 
                          label={category.label} 
                          size="small" 
                          color={category.color as any}
                          sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                        />
                        {category.badge && (
                          <Chip 
                            label={category.badge} 
                            size="small" 
                            color="primary"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {category.title}
                      </Typography>
                      <Typography variant="h4" color={`${category.color}.main`} gutterBottom>
                        {stats ? (
                          category.title === '도메인' ? stats.domains :
                          category.title === '프로젝트' ? stats.projects :
                          category.title === '시스템' ? stats.systems :
                          category.title === '코드 컴포넌트' ? stats.codeComponents :
                          category.title === '디자인 자산' ? stats.designAssets :
                          category.title === '문서/가이드' ? stats.documents : 0
                        ) : 0}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {category.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="outlined"
                    >
                      {permissions.canManageDomains ? '관리하기' : '보기'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* [advice from AI] 사이드바 - 최근 활동 및 인기 자원 */}
        <Grid item xs={12} lg={4}>
          {/* 최근 활동 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              최근 활동
            </Typography>
            <List dense>
              {recentActivities.map((activity) => (
                <ListItem key={activity.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                      {getCategoryLabel(activity.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.title}
                    secondary={`${activity.user}가 ${activity.action === 'created' ? '생성' : activity.action === 'updated' ? '수정' : '승인'}함 · ${activity.timestamp}`}
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                    secondaryTypographyProps={{ fontSize: '0.8rem' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* 인기 자원 */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              인기 자원
            </Typography>
            <List dense>
              {popularResources.map((resource) => (
                <ListItem key={resource.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                      {getCategoryLabel(resource.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {resource.title}
                        </Typography>
                        <Typography variant="caption" color="warning.main">
                          ★ {resource.stars}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Chip 
                          label={resource.category} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          조회 {resource.views}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          지식자원 카탈로그에 접근할 권한이 없습니다. 관리자에게 문의하세요.
        </Alert>
      )}
    </Box>
  );
};

export default KnowledgeCatalog;
