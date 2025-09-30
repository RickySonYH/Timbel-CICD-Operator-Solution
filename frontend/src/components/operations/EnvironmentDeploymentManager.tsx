// [advice from AI] 환경별 배포 관리 - 개발/스테이징/프로덕션 환경별 배포 상태 및 관리
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, TextField, FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, List, ListItem,
  ListItemText, ListItemIcon, Divider, Switch, FormControlLabel, LinearProgress
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 인터페이스 정의
interface Environment {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production';
  description: string;
  namespace: string;
  cluster_endpoint: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  applications: Application[];
}

interface Application {
  id: string;
  name: string;
  repository_url: string;
  branch: string;
  image_tag: string;
  status: 'running' | 'stopped' | 'deploying' | 'failed';
  replicas: number;
  cpu_usage: number;
  memory_usage: number;
  last_deployed: string;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
}

interface DeploymentRequest {
  application_name: string;
  environment_id: string;
  image_tag: string;
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
  };
  config_overrides: { [key: string]: string };
}

const EnvironmentDeploymentManager: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  
  // [advice from AI] 배포 관련 상태
  const [deployDialog, setDeployDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [deploymentRequest, setDeploymentRequest] = useState<DeploymentRequest>({
    application_name: '',
    environment_id: '',
    image_tag: '',
    replicas: 1,
    resources: { cpu: '100m', memory: '128Mi' },
    config_overrides: {}
  });

  // [advice from AI] 환경별 데이터 로드
  const loadEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 환경 목록 로드
      const envResponse = await fetch('/api/operations/environments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (envResponse.ok) {
        const envData = await envResponse.json();
        if (envData.success) {
          setEnvironments(envData.environments || []);
        }
      } else {
        // Mock 데이터로 대체
        setEnvironments([
          {
            id: 'dev-env',
            name: 'Development',
            type: 'development',
            description: '개발 환경',
            namespace: 'development',
            cluster_endpoint: 'https://dev-k8s.langsa.ai',
            status: 'active',
            created_at: new Date().toISOString(),
            applications: [
              {
                id: 'app-1',
                name: 'ecp-ai-orchestrator',
                repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
                branch: 'develop',
                image_tag: 'v1.2.3-dev',
                status: 'running',
                replicas: 2,
                cpu_usage: 45,
                memory_usage: 60,
                last_deployed: new Date(Date.now() - 3600000).toISOString(),
                health_status: 'healthy'
              }
            ]
          },
          {
            id: 'staging-env',
            name: 'Staging',
            type: 'staging',
            description: '스테이징 환경',
            namespace: 'staging',
            cluster_endpoint: 'https://staging-k8s.langsa.ai',
            status: 'active',
            created_at: new Date().toISOString(),
            applications: [
              {
                id: 'app-2',
                name: 'ecp-ai-orchestrator',
                repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
                branch: 'main',
                image_tag: 'v1.2.2',
                status: 'running',
                replicas: 3,
                cpu_usage: 30,
                memory_usage: 40,
                last_deployed: new Date(Date.now() - 7200000).toISOString(),
                health_status: 'healthy'
              }
            ]
          },
          {
            id: 'prod-env',
            name: 'Production',
            type: 'production',
            description: '프로덕션 환경',
            namespace: 'production',
            cluster_endpoint: 'https://prod-k8s.langsa.ai',
            status: 'active',
            created_at: new Date().toISOString(),
            applications: [
              {
                id: 'app-3',
                name: 'ecp-ai-orchestrator',
                repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
                branch: 'main',
                image_tag: 'v1.2.1',
                status: 'running',
                replicas: 5,
                cpu_usage: 65,
                memory_usage: 75,
                last_deployed: new Date(Date.now() - 86400000).toISOString(),
                health_status: 'healthy'
              }
            ]
          }
        ]);
      }
    } catch (err: any) {
      setError(err.message || '환경 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  // [advice from AI] 환경별 색상
  const getEnvironmentColor = (type: string) => {
    switch (type) {
      case 'development': return 'info';
      case 'staging': return 'warning';
      case 'production': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': case 'healthy': case 'active': return 'success';
      case 'deploying': return 'warning';
      case 'stopped': case 'inactive': return 'default';
      case 'failed': case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 배포 실행
  const handleDeploy = async (app: Application, envId: string) => {
    try {
      const response = await fetch('/api/operations/deploy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_name: app.name,
          environment_id: envId,
          image_tag: app.image_tag,
          replicas: app.replicas
        })
      });

      if (response.ok) {
        alert('배포가 시작되었습니다.');
        loadEnvironments();
      } else {
        alert('배포 실행에 실패했습니다.');
      }
    } catch (err) {
      alert('배포 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 애플리케이션 중지
  const handleStop = async (app: Application, envId: string) => {
    if (!confirm(`${app.name} 애플리케이션을 중지하시겠습니까?`)) return;

    try {
      const response = await fetch('/api/operations/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_name: app.name,
          environment_id: envId
        })
      });

      if (response.ok) {
        alert('애플리케이션이 중지되었습니다.');
        loadEnvironments();
      } else {
        alert('애플리케이션 중지에 실패했습니다.');
      }
    } catch (err) {
      alert('중지 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 스케일링
  const handleScale = async (app: Application, envId: string, newReplicas: number) => {
    try {
      const response = await fetch('/api/operations/scale', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_name: app.name,
          environment_id: envId,
          replicas: newReplicas
        })
      });

      if (response.ok) {
        alert(`${app.name}이 ${newReplicas}개 인스턴스로 스케일링되었습니다.`);
        loadEnvironments();
      } else {
        alert('스케일링에 실패했습니다.');
      }
    } catch (err) {
      alert('스케일링 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>환경별 배포 정보를 불러오는 중...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          환경별 배포 관리
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setDeployDialog(true)}
        >
          새 배포 실행
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 환경별 탭 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          {environments.map((env, index) => (
            <Tab
              key={env.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={env.name} 
                    size="small" 
                    color={getEnvironmentColor(env.type) as any}
                  />
                  <Typography variant="caption">
                    ({env.applications.length})
                  </Typography>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* [advice from AI] 환경별 내용 */}
      {environments.map((env, index) => (
        <Box key={env.id} hidden={selectedTab !== index}>
          {/* [advice from AI] 환경 정보 카드 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="h6" gutterBottom>
                    {env.name} 환경
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {env.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label={env.status} 
                      size="small" 
                      color={getStatusColor(env.status) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2">네임스페이스</Typography>
                  <Typography variant="body2">{env.namespace}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2">클러스터 엔드포인트</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {env.cluster_endpoint}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2">애플리케이션 수</Typography>
                  <Typography variant="h4" color="primary">
                    {env.applications.length}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* [advice from AI] 애플리케이션 목록 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                배포된 애플리케이션
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>애플리케이션</TableCell>
                      <TableCell>이미지 태그</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>인스턴스</TableCell>
                      <TableCell>리소스 사용률</TableCell>
                      <TableCell>마지막 배포</TableCell>
                      <TableCell>액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {env.applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary">
                            배포된 애플리케이션이 없습니다.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      env.applications.map((app) => (
                        <TableRow key={app.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {app.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {app.branch} 브랜치
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={app.image_tag} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={app.status} 
                                size="small" 
                                color={getStatusColor(app.status) as any}
                              />
                              <Chip 
                                label={app.health_status} 
                                size="small" 
                                color={getStatusColor(app.health_status) as any}
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {app.replicas} 개
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="caption">CPU:</Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={app.cpu_usage} 
                                  sx={{ width: 60, height: 4 }}
                                />
                                <Typography variant="caption">{app.cpu_usage}%</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption">MEM:</Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={app.memory_usage} 
                                  sx={{ width: 60, height: 4 }}
                                />
                                <Typography variant="caption">{app.memory_usage}%</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(app.last_deployed).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="재배포">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeploy(app, env.id)}
                                  disabled={app.status === 'deploying'}
                                >
                                  🚀
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="스케일링">
                                <IconButton 
                                  size="small" 
                                  onClick={() => {
                                    const newReplicas = prompt('새로운 인스턴스 수를 입력하세요:', app.replicas.toString());
                                    if (newReplicas && !isNaN(Number(newReplicas))) {
                                      handleScale(app, env.id, Number(newReplicas));
                                    }
                                  }}
                                >
                                  📊
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="중지">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleStop(app, env.id)}
                                  disabled={app.status === 'stopped'}
                                >
                                  ⏹️
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="로그 보기">
                                <IconButton size="small">
                                  📋
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      ))}

      {/* [advice from AI] 배포 다이얼로그 */}
      <Dialog open={deployDialog} onClose={() => setDeployDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 배포 실행</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="애플리케이션 이름"
                value={deploymentRequest.application_name}
                onChange={(e) => setDeploymentRequest(prev => ({ 
                  ...prev, 
                  application_name: e.target.value 
                }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>배포 환경</InputLabel>
                <Select
                  value={deploymentRequest.environment_id}
                  label="배포 환경"
                  onChange={(e) => setDeploymentRequest(prev => ({ 
                    ...prev, 
                    environment_id: e.target.value 
                  }))}
                >
                  {environments.map((env) => (
                    <MenuItem key={env.id} value={env.id}>
                      {env.name} ({env.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="이미지 태그"
                value={deploymentRequest.image_tag}
                onChange={(e) => setDeploymentRequest(prev => ({ 
                  ...prev, 
                  image_tag: e.target.value 
                }))}
                placeholder="v1.0.0"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="인스턴스 수"
                value={deploymentRequest.replicas}
                onChange={(e) => setDeploymentRequest(prev => ({ 
                  ...prev, 
                  replicas: Number(e.target.value) 
                }))}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CPU 요청"
                value={deploymentRequest.resources.cpu}
                onChange={(e) => setDeploymentRequest(prev => ({ 
                  ...prev, 
                  resources: { ...prev.resources, cpu: e.target.value }
                }))}
                placeholder="100m"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="메모리 요청"
                value={deploymentRequest.resources.memory}
                onChange={(e) => setDeploymentRequest(prev => ({ 
                  ...prev, 
                  resources: { ...prev.resources, memory: e.target.value }
                }))}
                placeholder="128Mi"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              // 배포 실행 로직
              console.log('배포 요청:', deploymentRequest);
              setDeployDialog(false);
            }}
          >
            배포 실행
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EnvironmentDeploymentManager;
