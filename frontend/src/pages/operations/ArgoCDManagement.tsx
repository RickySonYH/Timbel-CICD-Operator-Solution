// [advice from AI] Argo CD 관리 페이지 - Application 생성, GitOps, 멀티 환경 배포
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Sync as SyncIcon,
  Launch as LaunchIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] Argo CD Application 타입
interface ArgoCDApplication {
  id: string;
  application_name: string;
  environment: string;
  gitops_repo_url: string;
  target_namespace: string;
  manifest_path: string;
  argocd_url: string;
  sync_status: 'Synced' | 'OutOfSync' | 'Unknown';
  health_status: 'Healthy' | 'Progressing' | 'Degraded' | 'Unknown';
  last_sync_attempt: string;
  created_at: string;
  system_name?: string;
  resources?: Array<{
    kind: string;
    name: string;
    status: string;
  }>;
}

// [advice from AI] Sync Operation 타입
interface SyncOperation {
  id: string;
  operation_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

const ArgoCDManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [applications, setApplications] = useState<ArgoCDApplication[]>([]);
  const [syncOperations, setSyncOperations] = useState<SyncOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [promoteDialog, setPromoteDialog] = useState(false);
  const [rollbackDialog, setRollbackDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ArgoCDApplication | null>(null);
  
  const [createForm, setCreateForm] = useState({
    application_name: 'ecp-ai-k8s-orchestrator',
    environment: 'development',
    gitops_repo_url: 'https://github.com/timbel-ops/ecp-ai-gitops',
    target_namespace: '',
    manifest_path: 'dev',
    image_tag: 'latest',
    cluster_id: '' // [advice from AI] 클러스터 선택 추가
  });

  // [advice from AI] 클러스터 목록
  const [clusters, setClusters] = useState<any[]>([]);

  const [promoteForm, setPromoteForm] = useState({
    target_environment: 'staging',
    image_tag: 'v2.0.0'
  });

  const [rollbackForm, setRollbackForm] = useState({
    target_revision: 'HEAD~1'
  });

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/argocd/applications', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
      
    } catch (error) {
      console.error('Argo CD 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 애플리케이션 생성
  const handleCreateApplication = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/argocd/applications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...createForm,
          target_namespace: createForm.target_namespace || 
                           `${createForm.application_name}-${createForm.environment}`,
          system_id: 'sample-system-id' // 실제로는 시스템 선택에서 가져옴
        })
      });

      if (!response.ok) {
        throw new Error('애플리케이션 생성 실패');
      }

      const data = await response.json();
      if (data.success) {
        alert('Argo CD 애플리케이션이 성공적으로 생성되었습니다!');
        setCreateDialog(false);
        loadData();
      }
      
    } catch (error) {
      console.error('애플리케이션 생성 실패:', error);
      alert('애플리케이션 생성에 실패했습니다.');
    }
  };

  // [advice from AI] 애플리케이션 동기화
  const handleSyncApplication = async (appId: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch(`http://localhost:3001/api/argocd/applications/${appId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('동기화가 시작되었습니다!');
          loadData();
        }
      }
      
    } catch (error) {
      console.error('동기화 실패:', error);
      alert('동기화에 실패했습니다.');
    }
  };

  // [advice from AI] 환경 프로모션
  const handlePromoteApplication = async () => {
    if (!selectedApp) return;

    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch(`http://localhost:3001/api/argocd/applications/${selectedApp.id}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promoteForm)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`${promoteForm.target_environment} 환경으로 프로모션이 완료되었습니다!`);
          setPromoteDialog(false);
          loadData();
        }
      }
      
    } catch (error) {
      console.error('프로모션 실패:', error);
      alert('프로모션에 실패했습니다.');
    }
  };

  // [advice from AI] 상태별 색상
  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'Synced': return 'success';
      case 'OutOfSync': return 'warning';
      case 'Unknown': return 'default';
      default: return 'default';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'success';
      case 'Progressing': return 'info';
      case 'Degraded': return 'error';
      case 'Unknown': return 'default';
      default: return 'default';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'error';
      case 'staging': return 'warning';
      case 'development': return 'info';
      default: return 'default';
    }
  };

  // [advice from AI] 클러스터 목록 로드
  const loadClusters = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch('http://localhost:3001/api/clusters/clusters', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClusters(data.clusters || []);
        
        // 기본 클러스터 자동 선택
        const defaultCluster = data.clusters?.find((c: any) => c.is_default);
        if (defaultCluster && !createForm.cluster_id) {
          setCreateForm(prev => ({ ...prev, cluster_id: defaultCluster.id }));
        }
      }
    } catch (error) {
      console.error('클러스터 목록 로드 실패:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadClusters();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Argo CD 관리
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        Argo CD 자동 배포 관리
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        GitOps 기반 애플리케이션 배포 및 멀티 환경 관리
      </Typography>

      {/* [advice from AI] 메트릭 대시보드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                총 애플리케이션
              </Typography>
              <Typography variant="h4" color="primary">
                {applications.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GitOps 배포
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                동기화됨
              </Typography>
              <Typography variant="h4" color="success.main">
                {applications.filter(app => app.sync_status === 'Synced').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / {applications.length} 앱
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                정상 상태
              </Typography>
              <Typography variant="h4" color="success.main">
                {applications.filter(app => app.health_status === 'Healthy').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Healthy 상태
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                환경별 분포
              </Typography>
              <Typography variant="h4" color="info.main">
                {new Set(applications.map(app => app.environment)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                개 환경
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`애플리케이션 (${applications.length})`} />
        <Tab label="GitOps 관리" />
        <Tab label="멀티 환경 배포" />
      </Tabs>

      {/* [advice from AI] 애플리케이션 목록 탭 */}
      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Argo CD 애플리케이션</Typography>
            {permissions.canManageDeployment && (
              <Button variant="contained" onClick={() => setCreateDialog(true)}>
                애플리케이션 생성
              </Button>
            )}
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>애플리케이션</TableCell>
                  <TableCell>환경</TableCell>
                  <TableCell>동기화 상태</TableCell>
                  <TableCell>건강 상태</TableCell>
                  <TableCell>네임스페이스</TableCell>
                  <TableCell>GitOps 레포</TableCell>
                  <TableCell>마지막 동기화</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{app.application_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {app.system_name || 'Unknown System'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={app.environment} 
                        color={getEnvironmentColor(app.environment) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={app.sync_status} 
                        color={getSyncStatusColor(app.sync_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={app.health_status} 
                        color={getHealthStatusColor(app.health_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{app.target_namespace}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {app.gitops_repo_url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {app.last_sync_attempt ? 
                        new Date(app.last_sync_attempt).toLocaleString() : 
                        '없음'
                      }
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleSyncApplication(app.id)}
                        >
                          동기화
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          href={app.argocd_url}
                          target="_blank"
                          component="a"
                        >
                          Argo CD
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => {
                            setSelectedApp(app);
                            setPromoteDialog(true);
                          }}
                        >
                          프로모션
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* [advice from AI] GitOps 관리 탭 */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>GitOps 레포지토리 관리</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            GitOps 레포지토리 자동 생성 및 매니페스트 관리 기능
          </Alert>
          
          <Grid container spacing={3}>
            {[...new Set(applications.map(app => app.gitops_repo_url))].map((repoUrl, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      GitOps Repository #{index + 1}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {repoUrl}
                    </Typography>
                    <Typography variant="body2">
                      연결된 앱: {applications.filter(app => app.gitops_repo_url === repoUrl).length}개
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" href={repoUrl} target="_blank">
                      레포 열기
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* [advice from AI] 멀티 환경 배포 탭 */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>멀티 환경 배포 현황</Typography>
          
          {['development', 'staging', 'production'].map((env) => (
            <Card key={env} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {env.toUpperCase()} 환경
                  </Typography>
                  <Chip 
                    label={`${applications.filter(app => app.environment === env).length}개 앱`}
                    color={getEnvironmentColor(env) as any}
                  />
                </Box>
                
                <Grid container spacing={2}>
                  {applications.filter(app => app.environment === env).map((app) => (
                    <Grid item xs={12} sm={6} md={4} key={app.id}>
                      <Card variant="outlined">
                        <CardContent sx={{ pb: 1 }}>
                          <Typography variant="subtitle2">{app.application_name}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip 
                              label={app.sync_status} 
                              color={getSyncStatusColor(app.sync_status) as any}
                              size="small"
                            />
                            <Chip 
                              label={app.health_status} 
                              color={getHealthStatusColor(app.health_status) as any}
                              size="small"
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* [advice from AI] 애플리케이션 생성 대화상자 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Argo CD 애플리케이션 생성</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="애플리케이션명"
                fullWidth
                value={createForm.application_name}
                onChange={(e) => setCreateForm({ ...createForm, application_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>환경</InputLabel>
                <Select
                  value={createForm.environment}
                  onChange={(e) => setCreateForm({ ...createForm, environment: e.target.value })}
                >
                  <MenuItem value="development">Development</MenuItem>
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="GitOps 레포지토리 URL"
                fullWidth
                value={createForm.gitops_repo_url}
                onChange={(e) => setCreateForm({ ...createForm, gitops_repo_url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="타겟 네임스페이스"
                fullWidth
                value={createForm.target_namespace}
                onChange={(e) => setCreateForm({ ...createForm, target_namespace: e.target.value })}
                placeholder="자동 생성됨"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="매니페스트 경로"
                fullWidth
                value={createForm.manifest_path}
                onChange={(e) => setCreateForm({ ...createForm, manifest_path: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button onClick={handleCreateApplication} variant="contained">생성</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로모션 대화상자 */}
      <Dialog open={promoteDialog} onClose={() => setPromoteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>환경 프로모션</DialogTitle>
        <DialogContent>
          {selectedApp && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedApp.application_name} ({selectedApp.environment})
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>타겟 환경</InputLabel>
                <Select
                  value={promoteForm.target_environment}
                  onChange={(e) => setPromoteForm({ ...promoteForm, target_environment: e.target.value })}
                >
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="이미지 태그"
                fullWidth
                value={promoteForm.image_tag}
                onChange={(e) => setPromoteForm({ ...promoteForm, image_tag: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromoteDialog(false)}>취소</Button>
          <Button onClick={handlePromoteApplication} variant="contained">프로모션 실행</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canManageDeployment && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Argo CD 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default ArgoCDManagement;
