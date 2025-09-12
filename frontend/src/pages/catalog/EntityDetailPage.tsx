import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Avatar,
  Tooltip,
  LinearProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Description as DocsIcon,
  Fullscreen as FullscreenIcon,
  Domain as DomainIcon,
  Storage as SystemIcon,
  Extension as ComponentIcon,
  Api as ApiIcon,
  Folder as ResourceIcon,
  Group as GroupIcon,
  Person as UserIcon,
  Build as CICDIcon,
  Cloud as K8sIcon,
  Timeline as TimelineIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] Backstage.io 스타일의 엔티티 상세 페이지
const EntityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useJwtAuthStore();
  
  const [entity, setEntity] = useState<any>(null);
  const [relations, setRelations] = useState<any[]>([]);
  const [cicdPipelines, setCicdPipelines] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [kubernetes, setKubernetes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  // [advice from AI] 엔티티 종류별 아이콘 매핑
  const getEntityIcon = (kind: string) => {
    switch (kind) {
      case 'domain': return <DomainIcon />;
      case 'system': return <SystemIcon />;
      case 'component': return <ComponentIcon />;
      case 'api': return <ApiIcon />;
      case 'resource': return <ResourceIcon />;
      case 'group': return <GroupIcon />;
      case 'user': return <UserIcon />;
      default: return <ComponentIcon />;
    }
  };

  // [advice from AI] 라이프사이클별 색상
  const getLifecycleColor = (lifecycle: string) => {
    switch (lifecycle) {
      case 'production': return 'success';
      case 'experimental': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] CI/CD 상태별 아이콘
  const getCICDStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <SuccessIcon sx={{ color: '#4caf50' }} />;
      case 'failed': return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'running': return <LinearProgress sx={{ width: 20 }} />;
      case 'idle': return <ScheduleIcon sx={{ color: '#ff9800' }} />;
      default: return <ScheduleIcon sx={{ color: '#9e9e9e' }} />;
    }
  };

  // [advice from AI] 엔티티 상세 정보 조회
  const fetchEntityDetails = async () => {
    if (!isAuthenticated || !token || !id) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/catalog/entities/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEntity(data.data.entity);
        setRelations(data.data.relations);
        setCicdPipelines(data.data.cicd);
        setDocs(data.data.docs);
        setKubernetes(data.data.kubernetes);
      }
    } catch (error) {
      console.error('엔티티 상세 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntityDetails();
  }, [isAuthenticated, token, id]);

  // [advice from AI] 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">로그인이 필요합니다.</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>로딩 중...</Typography>
      </Box>
    );
  }

  if (!entity) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">엔티티를 찾을 수 없습니다.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#1a1a1a', minHeight: '100vh' }}>
      {/* [advice from AI] 헤더 영역 */}
      <Box sx={{ 
        bgcolor: '#2d2d2d', 
        p: 3, 
        borderBottom: '1px solid #404040',
        background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/catalog')} sx={{ color: 'white', mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: '#888', textTransform: 'uppercase' }}>
            {entity.kind}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: '#404040', mr: 2, width: 48, height: 48 }}>
              {getEntityIcon(entity.kind)}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                {entity.name}
                <IconButton sx={{ ml: 1, color: '#ffd700' }}>
                  <StarBorderIcon />
                </IconButton>
              </Typography>
              <Typography variant="body1" sx={{ color: '#888' }}>
                {entity.description || 'No description'}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ color: '#888' }}>Owner</Typography>
            <Typography variant="h6" sx={{ color: 'white' }}>{entity.owner}</Typography>
            <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>Lifecycle</Typography>
            <Chip 
              label={entity.lifecycle} 
              color={getLifecycleColor(entity.lifecycle)}
              size="small"
            />
          </Box>
        </Box>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ bgcolor: '#2d2d2d', borderBottom: '1px solid #404040' }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': { color: '#888' },
            '& .Mui-selected': { color: 'white' },
            '& .MuiTabs-indicator': { bgcolor: '#1976d2' }
          }}
        >
          <Tab label="OVERVIEW" />
          <Tab label="CI/CD" />
          <Tab label="API" />
          <Tab label="DEPENDENCIES" />
          <Tab label="DOCS" />
          <Tab label="KUBERNETES" />
        </Tabs>
      </Box>

      {/* [advice from AI] 메인 콘텐츠 */}
      <Box sx={{ p: 3 }}>
        {selectedTab === 0 && (
          <Grid container spacing={3}>
            {/* About 섹션 */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">About</Typography>
                    <Box>
                      <IconButton size="small" sx={{ color: '#888' }}>
                        <RefreshIcon />
                      </IconButton>
                      <IconButton size="small" sx={{ color: '#888' }}>
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Button startIcon={<CodeIcon />} sx={{ color: '#1976d2', mr: 2 }}>
                      VIEW SOURCE
                    </Button>
                    <Button startIcon={<DocsIcon />} sx={{ color: '#1976d2' }}>
                      VIEW TECHDOCS
                    </Button>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>DESCRIPTION</Typography>
                    <Typography variant="body1" sx={{ color: 'white' }}>
                      {entity.description || 'No description'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>OWNER</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: '#404040', mr: 1, width: 20, height: 20 }}>
                        <UserIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Typography variant="body1" sx={{ color: 'white' }}>{entity.owner}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>TYPE</Typography>
                    <Typography variant="body1" sx={{ color: 'white' }}>{entity.kind}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>LIFECYCLE</Typography>
                    <Chip 
                      label={entity.lifecycle} 
                      color={getLifecycleColor(entity.lifecycle)}
                      size="small"
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>TAGS</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {entity.tags && entity.tags.length > 0 ? (
                        entity.tags.map((tag: string, index: number) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            sx={{ bgcolor: '#404040', color: 'white' }}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ color: '#666' }}>No Tags</Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Relations 섹션 */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Relations</Typography>
                    <IconButton size="small" sx={{ color: '#888' }}>
                      <FullscreenIcon />
                    </IconButton>
                  </Box>
                  
                  {/* 간단한 관계 그래프 시각화 */}
                  <Box sx={{ 
                    height: 200, 
                    bgcolor: '#1a1a1a', 
                    borderRadius: 1, 
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #404040'
                  }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Relations graph will be displayed here
                    </Typography>
                  </Box>
                  
                  <Button sx={{ color: '#1976d2', mt: 1 }}>
                    View graph →
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {selectedTab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>CI/CD Pipelines</Typography>
            {cicdPipelines.length > 0 ? (
              <TableContainer component={Paper} sx={{ bgcolor: '#2d2d2d' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'white' }}>Pipeline</TableCell>
                      <TableCell sx={{ color: 'white' }}>Type</TableCell>
                      <TableCell sx={{ color: 'white' }}>Status</TableCell>
                      <TableCell sx={{ color: 'white' }}>Last Run</TableCell>
                      <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cicdPipelines.map((pipeline) => (
                      <TableRow key={pipeline.id}>
                        <TableCell sx={{ color: 'white' }}>{pipeline.pipeline_name}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{pipeline.pipeline_type}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getCICDStatusIcon(pipeline.status)}
                            <Typography variant="body2" sx={{ color: 'white', ml: 1 }}>
                              {pipeline.status}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#888' }}>
                          {pipeline.last_run_at ? new Date(pipeline.last_run_at).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" sx={{ color: '#1976d2' }}>
                            Run
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No CI/CD pipelines configured for this entity.</Alert>
            )}
          </Box>
        )}

        {selectedTab === 2 && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>API Documentation</Typography>
            <Alert severity="info">
              API documentation will be displayed here when available.
            </Alert>
          </Box>
        )}

        {selectedTab === 3 && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Dependencies</Typography>
            <Alert severity="info">
              Dependencies will be displayed here when available.
            </Alert>
          </Box>
        )}

        {selectedTab === 4 && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Documentation</Typography>
            {docs.length > 0 ? (
              <TableContainer component={Paper} sx={{ bgcolor: '#2d2d2d' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'white' }}>Title</TableCell>
                      <TableCell sx={{ color: 'white' }}>Type</TableCell>
                      <TableCell sx={{ color: 'white' }}>Version</TableCell>
                      <TableCell sx={{ color: 'white' }}>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {docs.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell sx={{ color: 'white' }}>{doc.title}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{doc.doc_type}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{doc.version}</TableCell>
                        <TableCell sx={{ color: '#888' }}>
                          {new Date(doc.updated_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No documentation available for this entity.</Alert>
            )}
          </Box>
        )}

        {selectedTab === 5 && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Kubernetes Resources</Typography>
            {kubernetes.length > 0 ? (
              <TableContainer component={Paper} sx={{ bgcolor: '#2d2d2d' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'white' }}>Name</TableCell>
                      <TableCell sx={{ color: 'white' }}>Type</TableCell>
                      <TableCell sx={{ color: 'white' }}>Namespace</TableCell>
                      <TableCell sx={{ color: 'white' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kubernetes.map((k8s) => (
                      <TableRow key={k8s.id}>
                        <TableCell sx={{ color: 'white' }}>{k8s.resource_name}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{k8s.resource_type}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{k8s.namespace}</TableCell>
                        <TableCell>
                          <Chip 
                            label={k8s.status} 
                            color={k8s.status === 'running' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No Kubernetes resources found for this entity.</Alert>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default EntityDetailPage;
