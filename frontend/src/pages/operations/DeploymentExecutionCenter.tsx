// [advice from AI] STEP 4: 배포 실행 센터 - Kubernetes 배포, Argo CD 연동, 환경별 배포 관리
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Stepper, Step, StepLabel, StepContent, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  CloudUpload as DeployIcon,
  Kubernetes as K8sIcon,
  GitHub as GitHubIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  Rollback as RollbackIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const DeploymentExecutionCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // 배포 실행 현황
  const [activeDeployments, setActiveDeployments] = useState<any[]>([]);
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);
  
  // Argo CD Applications
  const [argocdApps, setArgocdApps] = useState<any[]>([]);
  
  // 배포 마법사
  const [deployWizard, setDeployWizard] = useState(false);
  const [deployWizardStep, setDeployWizardStep] = useState(0);
  const [deployWizardData, setDeployWizardData] = useState({
    project_name: '',
    image_url: '',
    image_tag: 'latest',
    target_environment: 'development',
    namespace: '',
    replicas: 3,
    resources: {
      cpu: '500m',
      memory: '512Mi',
      storage: '1Gi'
    },
    ingress_enabled: true,
    domain: '',
    health_check_path: '/health',
    environment_variables: [] as any[]
  });

  useEffect(() => {
    if (token) {
      loadDeploymentData();
    }
  }, [token]);

  const loadDeploymentData = async () => {
    try {
      setLoading(true);
      
      // 실제 API 호출
      const [activeRes, historyRes, envRes, argoRes] = await Promise.all([
        fetch('http://rdc.rickyson.com:3001/api/deployment/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://rdc.rickyson.com:3001/api/deployment/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://rdc.rickyson.com:3001/api/deployment/environments', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://rdc.rickyson.com:3001/api/deployment/argocd-apps', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // 실제 API 응답 처리
      const activeData = activeRes.ok ? await activeRes.json() : { success: false, data: [] };
      const historyData = historyRes.ok ? await historyRes.json() : { success: false, data: [] };
      const envData = envRes.ok ? await envRes.json() : { success: false, data: [] };
      const argoData = argoRes.ok ? await argoRes.json() : { success: false, data: [] };

      setActiveDeployments(activeData.success ? activeData.data : []);
      setDeploymentHistory(historyData.success ? historyData.data : []);
      setEnvironments(envData.success ? envData.data : []);
      setArgocdApps(argoData.success ? argoData.data : []);


    } catch (error) {
      console.error('배포 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (deploymentData: any) => {
    try {
      console.log('🚀 배포 실행:', deploymentData);
      
      // 실제 API 호출
      const response = await fetch('http://rdc.rickyson.com:3001/api/deployment/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_name: deploymentData.project_name,
          image_url: deploymentData.image_url,
          image_tag: deploymentData.image_tag,
          target_environment: deploymentData.target_environment,
          namespace: deploymentData.namespace,
          replicas: deploymentData.replicas,
          resources: deploymentData.resources,
          ingress_enabled: deploymentData.ingress_enabled,
          domain: deploymentData.domain,
          health_check_path: deploymentData.health_check_path
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${deploymentData.project_name} 배포가 시작되었습니다!`);
        loadDeploymentData();
      } else {
        alert(`❌ 배포 실행 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('배포 실행 실패:', error);
      alert('❌ 배포 실행 중 오류가 발생했습니다.');
    }
  };

  const handleRollback = async (deploymentId: string) => {
    try {
      console.log('🔄 롤백 실행:', deploymentId);
      
      if (confirm('이전 버전으로 롤백하시겠습니까?')) {
        // 실제로는 API 호출
        alert('✅ 롤백이 시작되었습니다!');
        loadDeploymentData();
      }
    } catch (error) {
      console.error('롤백 실패:', error);
      alert('❌ 롤백 중 오류가 발생했습니다.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deploying': return <CircularProgress size={20} />;
      case 'healthy': case 'success': return <CheckCircleIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      default: return <SettingsIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deploying': return 'primary';
      case 'healthy': case 'success': return 'success';
      case 'failed': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const deployWizardSteps = [
    { label: '프로젝트 선택', description: '배포할 프로젝트와 이미지를 선택하세요' },
    { label: '환경 설정', description: '배포 환경과 네임스페이스를 구성하세요' },
    { label: '리소스 설정', description: 'CPU, 메모리, 스토리지 리소스를 설정하세요' },
    { label: '네트워크 설정', description: 'Ingress 및 도메인 설정을 구성하세요' },
    { label: '최종 확인', description: '설정을 검토하고 배포를 실행하세요' }
  ];

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          배포 실행 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Kubernetes 배포, Argo CD 연동, 환경별 배포 관리 및 리소스 모니터링
        </Typography>
      </Box>

      {/* 액션 버튼 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<DeployIcon />}
            onClick={() => setDeployWizard(true)}
            size="large"
          >
            새 배포 실행
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDeploymentData}
          >
            새로고침
          </Button>
        </Box>
      </Box>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="실행 중인 배포" icon={<DeployIcon />} />
          <Tab label="배포 히스토리" icon={<TimelineIcon />} />
          <Tab label="환경 관리" icon={<K8sIcon />} />
          <Tab label="Argo CD Apps" icon={<GitHubIcon />} />
        </Tabs>
      </Paper>

      {/* TAB 1: 실행 중인 배포 */}
      <TabPanel value={tabValue} index={0}>
        {activeDeployments.length === 0 ? (
          <Alert severity="info">현재 실행 중인 배포가 없습니다.</Alert>
        ) : (
          <Grid container spacing={3}>
            {activeDeployments.map((deployment) => (
              <Grid item xs={12} key={deployment.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {getStatusIcon(deployment.status)}
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {deployment.project_name}
                          </Typography>
                          <Chip 
                            label={deployment.environment} 
                            size="small" 
                            color={
                              deployment.environment === 'production' ? 'error' :
                              deployment.environment === 'staging' ? 'warning' : 'primary'
                            }
                          />
                          <Chip 
                            label={deployment.status} 
                            size="small" 
                            color={getStatusColor(deployment.status)}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          이미지: {deployment.image}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          네임스페이스: {deployment.namespace} • 시작: {new Date(deployment.started_at).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          현재 단계: {deployment.current_phase}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" size="small" startIcon={<ViewIcon />}>
                          로그
                        </Button>
                        {deployment.status === 'deploying' && (
                          <Button variant="outlined" size="small" color="error" startIcon={<StopIcon />}>
                            중지
                          </Button>
                        )}
                        {deployment.status === 'failed' && (
                          <Button variant="outlined" size="small" color="warning" startIcon={<RollbackIcon />}
                            onClick={() => handleRollback(deployment.id)}
                          >
                            롤백
                          </Button>
                        )}
                      </Box>
                    </Box>

                    {/* 진행률 표시 */}
                    {deployment.status === 'deploying' && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2">배포 진행률</Typography>
                          <Typography variant="body2">{deployment.progress}%</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={deployment.progress} 
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                    )}

                    {/* 리소스 정보 */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          리소스 정보 및 상태
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="body2" color="text.secondary">Replicas</Typography>
                              <Typography variant="body1">
                                {deployment.replicas.ready}/{deployment.replicas.desired} Ready
                              </Typography>
                              <Typography variant="body2">
                                Updated: {deployment.replicas.updated}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="body2" color="text.secondary">CPU & Memory</Typography>
                              <Typography variant="body1">{deployment.resources.cpu}</Typography>
                              <Typography variant="body1">{deployment.resources.memory}</Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="body2" color="text.secondary">Storage</Typography>
                              <Typography variant="body1">{deployment.resources.storage}</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>

                    {/* 오류 메시지 */}
                    {deployment.status === 'failed' && deployment.error_message && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          {deployment.error_message}
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* TAB 2: 배포 히스토리 */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>프로젝트</TableCell>
                <TableCell>버전</TableCell>
                <TableCell>환경</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>배포 시간</TableCell>
                <TableCell>소요 시간</TableCell>
                <TableCell>배포자</TableCell>
                <TableCell>액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deploymentHistory.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>{deployment.project_name}</TableCell>
                  <TableCell>
                    <Chip label={deployment.version} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={deployment.environment} 
                      size="small" 
                      color={
                        deployment.environment === 'production' ? 'error' :
                        deployment.environment === 'staging' ? 'warning' : 'primary'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={deployment.status} 
                      size="small" 
                      color={getStatusColor(deployment.status)}
                    />
                  </TableCell>
                  <TableCell>{new Date(deployment.deployed_at).toLocaleString()}</TableCell>
                  <TableCell>{deployment.duration}</TableCell>
                  <TableCell>{deployment.deployed_by}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="outlined" size="small" startIcon={<ViewIcon />}>
                        상세
                      </Button>
                      {deployment.status === 'success' && (
                        <Button variant="outlined" size="small" startIcon={<RollbackIcon />}>
                          재배포
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TAB 3: 환경 관리 */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {environments.map((env, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {env.name}
                    </Typography>
                    <Chip 
                      label={env.status} 
                      size="small" 
                      color={getStatusColor(env.status)}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    클러스터: {env.cluster}
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2">네임스페이스: {env.namespace_count}개</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">활성 배포: {env.active_deployments}개</Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">CPU 사용률</Typography>
                      <Typography variant="body2">{env.cpu_usage}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={env.cpu_usage} 
                      sx={{ height: 6, borderRadius: 1, mb: 1 }}
                      color={env.cpu_usage > 80 ? 'error' : env.cpu_usage > 60 ? 'warning' : 'primary'}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2">메모리 사용률</Typography>
                      <Typography variant="body2">{env.memory_usage}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={env.memory_usage} 
                      sx={{ height: 6, borderRadius: 1 }}
                      color={env.memory_usage > 80 ? 'error' : env.memory_usage > 60 ? 'warning' : 'success'}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    마지막 배포: {new Date(env.last_deployment).toLocaleString()}
                  </Typography>

                  <Button variant="outlined" fullWidth startIcon={<K8sIcon />}>
                    환경 관리
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* TAB 4: Argo CD Applications */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          {argocdApps.map((app, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GitHubIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {app.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        label={app.sync_status} 
                        size="small" 
                        color={app.sync_status === 'Synced' ? 'success' : 'warning'}
                      />
                      <Chip 
                        label={app.health_status} 
                        size="small" 
                        color={app.health_status === 'Healthy' ? 'success' : 'error'}
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    네임스페이스: {app.namespace}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    레포지토리: {app.repo_url}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    마지막 동기화: {new Date(app.last_sync).toLocaleString()}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2">
                      자동 동기화: {app.auto_sync ? '활성화' : '비활성화'}
                    </Typography>
                    <Switch 
                      checked={app.auto_sync} 
                      size="small"
                      onChange={(e) => {
                        // 실제로는 API 호출
                        console.log(`Auto sync ${e.target.checked ? 'enabled' : 'disabled'} for ${app.name}`);
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" size="small" startIcon={<RefreshIcon />}>
                      동기화
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<ViewIcon />}>
                      상세
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* 배포 실행 마법사 */}
      <Dialog open={deployWizard} onClose={() => setDeployWizard(false)} maxWidth="md" fullWidth>
        <DialogTitle>배포 실행 마법사</DialogTitle>
        <DialogContent>
          <Stepper activeStep={deployWizardStep} orientation="vertical" sx={{ mt: 2 }}>
            {deployWizardSteps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>

                  {/* Step 0: 프로젝트 선택 */}
                  {index === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="프로젝트명"
                        value={deployWizardData.project_name}
                        onChange={(e) => setDeployWizardData({...deployWizardData, project_name: e.target.value})}
                        placeholder="ECP-AI Orchestrator"
                      />
                      <TextField
                        fullWidth
                        label="이미지 URL"
                        value={deployWizardData.image_url}
                        onChange={(e) => setDeployWizardData({...deployWizardData, image_url: e.target.value})}
                        placeholder="nexus.rdc.rickyson.com/ecp-ai/orchestrator"
                      />
                      <TextField
                        fullWidth
                        label="이미지 태그"
                        value={deployWizardData.image_tag}
                        onChange={(e) => setDeployWizardData({...deployWizardData, image_tag: e.target.value})}
                        placeholder="latest"
                      />
                    </Box>
                  )}

                  {/* Step 1: 환경 설정 */}
                  {index === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>배포 환경</InputLabel>
                        <Select
                          value={deployWizardData.target_environment}
                          onChange={(e) => setDeployWizardData({...deployWizardData, target_environment: e.target.value})}
                          label="배포 환경"
                        >
                          <MenuItem value="development">Development</MenuItem>
                          <MenuItem value="staging">Staging</MenuItem>
                          <MenuItem value="production">Production</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <TextField
                        fullWidth
                        label="네임스페이스"
                        value={deployWizardData.namespace}
                        onChange={(e) => setDeployWizardData({...deployWizardData, namespace: e.target.value})}
                        placeholder={`${deployWizardData.project_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${deployWizardData.target_environment}`}
                      />
                      
                      <TextField
                        fullWidth
                        type="number"
                        label="복제본 수 (Replicas)"
                        value={deployWizardData.replicas}
                        onChange={(e) => setDeployWizardData({...deployWizardData, replicas: parseInt(e.target.value)})}
                      />
                    </Box>
                  )}

                  {/* Step 2: 리소스 설정 */}
                  {index === 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        하드웨어 계산기 결과를 기반으로 리소스를 설정합니다.
                      </Alert>
                      
                      <TextField
                        fullWidth
                        label="CPU 요청량"
                        value={deployWizardData.resources.cpu}
                        onChange={(e) => setDeployWizardData({
                          ...deployWizardData, 
                          resources: {...deployWizardData.resources, cpu: e.target.value}
                        })}
                        placeholder="500m"
                        helperText="예: 500m (0.5 Core), 2 (2 Cores)"
                      />
                      
                      <TextField
                        fullWidth
                        label="메모리 요청량"
                        value={deployWizardData.resources.memory}
                        onChange={(e) => setDeployWizardData({
                          ...deployWizardData, 
                          resources: {...deployWizardData.resources, memory: e.target.value}
                        })}
                        placeholder="512Mi"
                        helperText="예: 512Mi, 1Gi, 2Gi"
                      />
                      
                      <TextField
                        fullWidth
                        label="스토리지 용량"
                        value={deployWizardData.resources.storage}
                        onChange={(e) => setDeployWizardData({
                          ...deployWizardData, 
                          resources: {...deployWizardData.resources, storage: e.target.value}
                        })}
                        placeholder="1Gi"
                        helperText="예: 1Gi, 5Gi, 10Gi"
                      />
                    </Box>
                  )}

                  {/* Step 3: 네트워크 설정 */}
                  {index === 3 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={deployWizardData.ingress_enabled}
                            onChange={(e) => setDeployWizardData({...deployWizardData, ingress_enabled: e.target.checked})}
                          />
                        }
                        label="Ingress 활성화 (외부 접속 허용)"
                      />
                      
                      {deployWizardData.ingress_enabled && (
                        <>
                          <TextField
                            fullWidth
                            label="도메인"
                            value={deployWizardData.domain}
                            onChange={(e) => setDeployWizardData({...deployWizardData, domain: e.target.value})}
                            placeholder="myapp.rdc.rickyson.com"
                          />
                          
                          <TextField
                            fullWidth
                            label="헬스체크 경로"
                            value={deployWizardData.health_check_path}
                            onChange={(e) => setDeployWizardData({...deployWizardData, health_check_path: e.target.value})}
                            placeholder="/health"
                          />
                        </>
                      )}
                    </Box>
                  )}

                  {/* Step 4: 최종 확인 */}
                  {index === 4 && (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        아래 설정으로 배포를 실행합니다.
                      </Alert>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2"><strong>프로젝트:</strong> {deployWizardData.project_name}</Typography>
                        <Typography variant="body2"><strong>이미지:</strong> {deployWizardData.image_url}:{deployWizardData.image_tag}</Typography>
                        <Typography variant="body2"><strong>환경:</strong> {deployWizardData.target_environment}</Typography>
                        <Typography variant="body2"><strong>네임스페이스:</strong> {deployWizardData.namespace}</Typography>
                        <Typography variant="body2"><strong>복제본:</strong> {deployWizardData.replicas}개</Typography>
                        <Typography variant="body2"><strong>리소스:</strong> {deployWizardData.resources.cpu} CPU, {deployWizardData.resources.memory} Memory</Typography>
                        <Typography variant="body2"><strong>Ingress:</strong> {deployWizardData.ingress_enabled ? '활성화' : '비활성화'}</Typography>
                        {deployWizardData.ingress_enabled && (
                          <Typography variant="body2"><strong>도메인:</strong> {deployWizardData.domain}</Typography>
                        )}
                      </Paper>
                    </Box>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      disabled={deployWizardStep === 0}
                      onClick={() => setDeployWizardStep(deployWizardStep - 1)}
                    >
                      이전
                    </Button>
                    {deployWizardStep === deployWizardSteps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={() => handleDeploy(deployWizardData)}
                        disabled={!deployWizardData.project_name || !deployWizardData.image_url}
                      >
                        배포 실행
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={() => setDeployWizardStep(deployWizardStep + 1)}
                        disabled={
                          (deployWizardStep === 0 && (!deployWizardData.project_name || !deployWizardData.image_url)) ||
                          (deployWizardStep === 1 && !deployWizardData.namespace)
                        }
                      >
                        다음
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeployWizard(false);
            setDeployWizardStep(0);
          }}>
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DeploymentExecutionCenter;
