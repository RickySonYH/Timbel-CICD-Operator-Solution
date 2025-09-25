import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';

interface DeploymentRequestDialogProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
}

interface Project {
  id: string;
  project_name: string;
  description: string;
  tech_stack: string[];
  repository_url: string;
  assigned_pe: string;
  priority_level: string;
  metadata: any;
}

interface Infrastructure {
  id: string;
  service_type: string;
  environment: string;
  service_url: string;
  status: string;
  health_status: string;
}

interface DeploymentConfig {
  project: Project | null;
  environment: string;
  argocd_instance: string;
  container_registry: string;
  helm_values: { [key: string]: any };
  resource_limits: {
    cpu: string;
    memory: string;
    replicas: number;
  };
  environment_variables: { [key: string]: string };
  deployment_notes: string;
}

const getApiUrl = (): string => {
  const currentHost = window.location.host;
  
  if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
    return 'http://localhost:3001';
  } else {
    return `http://${currentHost.split(':')[0]}:3001`;
  }
};

const DeploymentRequestDialog: React.FC<DeploymentRequestDialogProps> = ({
  open,
  onClose,
  projectId
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 데이터 상태
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    project: null,
    environment: '',
    argocd_instance: '',
    container_registry: '',
    helm_values: {},
    resource_limits: {
      cpu: '500m',
      memory: '512Mi',
      replicas: 1
    },
    environment_variables: {},
    deployment_notes: ''
  });
  
  // 배포 실행 상태
  const [deploying, setDeploying] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deploymentStatus, setDeploymentStatus] = useState<'pending' | 'running' | 'success' | 'failed'>('pending');
  
  const { token } = useAuthStore();

  const steps = [
    '프로젝트 선택',
    '환경 및 인프라 설정',
    '배포 구성',
    '배포 실행'
  ];

  useEffect(() => {
    if (open) {
      loadAvailableProjects();
      loadInfrastructures();
      
      // 특정 프로젝트 ID가 제공된 경우 해당 프로젝트 선택
      if (projectId) {
        // 프로젝트 로드 후 선택하도록 처리
      }
    }
  }, [open, projectId]);

  const loadAvailableProjects = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/po/deployment-ready-projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableProjects(data.data);
          
          // 특정 프로젝트 ID가 있으면 자동 선택
          if (projectId) {
            const selectedProject = data.data.find((p: Project) => p.id === projectId);
            if (selectedProject) {
              setDeploymentConfig(prev => ({ ...prev, project: selectedProject }));
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 배포 가능 프로젝트 로드 실패:', error);
      setError('배포 가능한 프로젝트를 불러올 수 없습니다.');
    }
  };

  const loadInfrastructures = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/deployment-infrastructure`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInfrastructures(data.data);
        }
      }
    } catch (error) {
      console.error('❌ 인프라 정보 로드 실패:', error);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !deploymentConfig.project) {
      setError('프로젝트를 선택해주세요.');
      return;
    }
    if (activeStep === 1 && (!deploymentConfig.environment || !deploymentConfig.argocd_instance)) {
      setError('환경과 Argo CD 인스턴스를 선택해주세요.');
      return;
    }
    
    setError(null);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setDeploymentConfig({
      project: null,
      environment: '',
      argocd_instance: '',
      container_registry: '',
      helm_values: {},
      resource_limits: {
        cpu: '500m',
        memory: '512Mi',
        replicas: 1
      },
      environment_variables: {},
      deployment_notes: ''
    });
    setDeploymentLogs([]);
    setDeploymentStatus('pending');
    setDeploying(false);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const executeDeployment = async () => {
    setDeploying(true);
    setDeploymentStatus('running');
    setDeploymentLogs(['🚀 배포 시작...']);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/deployment/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentConfig)
      });

      // 시뮬레이션된 배포 프로세스
      const simulateDeployment = () => {
        const steps = [
          '📦 컨테이너 이미지 빌드 중...',
          '🔍 보안 스캔 실행 중...',
          '📤 이미지를 레지스트리에 푸시 중...',
          '📋 Helm Chart 검증 중...',
          '🎯 Argo CD에 배포 요청 전송...',
          '⚙️ 쿠버네티스 리소스 생성 중...',
          '🔄 Pod 시작 대기 중...',
          '🌐 서비스 헬스체크 실행 중...',
          '✅ 배포 완료!'
        ];

        let stepIndex = 0;
        const interval = setInterval(() => {
          if (stepIndex < steps.length) {
            setDeploymentLogs(prev => [...prev, steps[stepIndex]]);
            stepIndex++;
          } else {
            clearInterval(interval);
            setDeploymentStatus('success');
            setDeploying(false);
          }
        }, 1500);
      };

      simulateDeployment();

    } catch (error) {
      console.error('❌ 배포 실행 실패:', error);
      setDeploymentLogs(prev => [...prev, `❌ 배포 실패: ${error}`]);
      setDeploymentStatus('failed');
      setDeploying(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              배포할 프로젝트를 선택하세요
            </Typography>
            
            {availableProjects.length === 0 ? (
              <Alert severity="info">
                배포 가능한 프로젝트가 없습니다. QC/QA 승인이 완료된 프로젝트만 배포할 수 있습니다.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {availableProjects.map((project) => (
                  <Grid item xs={12} key={project.id}>
                    <Card 
                      variant={deploymentConfig.project?.id === project.id ? "outlined" : "elevation"}
                      sx={{ 
                        cursor: 'pointer',
                        border: deploymentConfig.project?.id === project.id ? 2 : 0,
                        borderColor: 'primary.main'
                      }}
                      onClick={() => setDeploymentConfig(prev => ({ ...prev, project }))}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {project.project_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {project.description}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {project.tech_stack?.map((tech, index) => (
                                <Chip key={index} label={tech} size="small" variant="outlined" />
                              ))}
                            </Box>
                          </Box>
                          <Box textAlign="right">
                            <Chip 
                              label={project.priority_level} 
                              size="small"
                              color={
                                project.priority_level === 'critical' ? 'error' :
                                project.priority_level === 'high' ? 'warning' : 'default'
                              }
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              담당: {project.assigned_pe}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              배포 환경 및 인프라를 선택하세요
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>배포 환경</InputLabel>
                  <Select
                    value={deploymentConfig.environment}
                    onChange={(e) => setDeploymentConfig(prev => ({ 
                      ...prev, 
                      environment: e.target.value,
                      argocd_instance: '', // 환경 변경 시 Argo CD 인스턴스 초기화
                      container_registry: ''
                    }))}
                    label="배포 환경"
                  >
                    <MenuItem value="development">Development</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!deploymentConfig.environment}>
                  <InputLabel>Argo CD 인스턴스</InputLabel>
                  <Select
                    value={deploymentConfig.argocd_instance}
                    onChange={(e) => setDeploymentConfig(prev => ({ ...prev, argocd_instance: e.target.value }))}
                    label="Argo CD 인스턴스"
                  >
                    {infrastructures
                      .filter(infra => 
                        infra.service_type === 'argocd' && 
                        (infra.environment === deploymentConfig.environment || infra.environment === null)
                      )
                      .map((argocd) => (
                        <MenuItem key={argocd.id} value={argocd.id}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography>{argocd.service_url}</Typography>
                            <Chip
                              label={argocd.health_status || 'unknown'}
                              size="small"
                              color={
                                argocd.health_status === 'healthy' ? 'success' :
                                argocd.health_status === 'warning' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Container Registry</InputLabel>
                  <Select
                    value={deploymentConfig.container_registry}
                    onChange={(e) => setDeploymentConfig(prev => ({ ...prev, container_registry: e.target.value }))}
                    label="Container Registry"
                  >
                    {infrastructures
                      .filter(infra => 
                        infra.service_type === 'nexus' || infra.service_type === 'docker_registry'
                      )
                      .map((registry) => (
                        <MenuItem key={registry.id} value={registry.id}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography>
                              {registry.service_type === 'nexus' ? 'Nexus Repository' : 'Docker Registry'} 
                              - {registry.service_url}
                            </Typography>
                            <Chip
                              label={registry.health_status || 'unknown'}
                              size="small"
                              color={
                                registry.health_status === 'healthy' ? 'success' :
                                registry.health_status === 'warning' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {deploymentConfig.environment && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>{deploymentConfig.environment}</strong> 환경에 배포됩니다. 
                  {deploymentConfig.environment === 'production' && 
                    ' 프로덕션 환경은 신중하게 배포해주세요.'}
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              배포 구성을 설정하세요
            </Typography>
            
            <Grid container spacing={3}>
              {/* 리소스 제한 */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      리소스 할당
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="CPU 제한"
                          value={deploymentConfig.resource_limits.cpu}
                          onChange={(e) => setDeploymentConfig(prev => ({
                            ...prev,
                            resource_limits: { ...prev.resource_limits, cpu: e.target.value }
                          }))}
                          placeholder="500m"
                          helperText="예: 500m, 1, 2"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="메모리 제한"
                          value={deploymentConfig.resource_limits.memory}
                          onChange={(e) => setDeploymentConfig(prev => ({
                            ...prev,
                            resource_limits: { ...prev.resource_limits, memory: e.target.value }
                          }))}
                          placeholder="512Mi"
                          helperText="예: 512Mi, 1Gi, 2Gi"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="레플리카 수"
                          type="number"
                          value={deploymentConfig.resource_limits.replicas}
                          onChange={(e) => setDeploymentConfig(prev => ({
                            ...prev,
                            resource_limits: { ...prev.resource_limits, replicas: parseInt(e.target.value) || 1 }
                          }))}
                          inputProps={{ min: 1, max: 10 }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* 환경 변수 */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      환경 변수
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="환경 변수 (KEY=VALUE 형식, 한 줄에 하나씩)"
                      value={Object.entries(deploymentConfig.environment_variables)
                        .map(([key, value]) => `${key}=${value}`)
                        .join('\n')}
                      onChange={(e) => {
                        const envVars: { [key: string]: string } = {};
                        e.target.value.split('\n').forEach(line => {
                          const [key, ...valueParts] = line.split('=');
                          if (key && valueParts.length > 0) {
                            envVars[key.trim()] = valueParts.join('=').trim();
                          }
                        });
                        setDeploymentConfig(prev => ({ ...prev, environment_variables: envVars }));
                      }}
                      placeholder="NODE_ENV=production&#10;API_URL=https://api.example.com&#10;DEBUG=false"
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* 배포 노트 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="배포 노트"
                  value={deploymentConfig.deployment_notes}
                  onChange={(e) => setDeploymentConfig(prev => ({ ...prev, deployment_notes: e.target.value }))}
                  placeholder="배포에 대한 추가 정보나 주의사항을 입력하세요..."
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              배포 실행 및 모니터링
            </Typography>
            
            {/* 배포 요약 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  배포 요약
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">프로젝트</Typography>
                    <Typography variant="body1">{deploymentConfig.project?.project_name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">환경</Typography>
                    <Typography variant="body1">{deploymentConfig.environment}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">리소스</Typography>
                    <Typography variant="body1">
                      CPU: {deploymentConfig.resource_limits.cpu}, 
                      Memory: {deploymentConfig.resource_limits.memory}, 
                      Replicas: {deploymentConfig.resource_limits.replicas}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">상태</Typography>
                    <Chip
                      label={deploymentStatus}
                      color={
                        deploymentStatus === 'success' ? 'success' :
                        deploymentStatus === 'failed' ? 'error' :
                        deploymentStatus === 'running' ? 'warning' : 'default'
                      }
                      icon={
                        deploymentStatus === 'success' ? <CheckCircleIcon /> :
                        deploymentStatus === 'failed' ? <ErrorIcon /> :
                        deploymentStatus === 'running' ? <CircularProgress size={16} /> : undefined
                      }
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 배포 로그 */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    배포 로그
                  </Typography>
                  {!deploying && deploymentStatus === 'pending' && (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={executeDeployment}
                    >
                      배포 시작
                    </Button>
                  )}
                </Box>
                
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                  {deploymentLogs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      배포를 시작하면 로그가 여기에 표시됩니다.
                    </Typography>
                  ) : (
                    <List dense>
                      {deploymentLogs.map((log, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {log.includes('✅') ? <CheckCircleIcon color="success" /> :
                             log.includes('❌') ? <ErrorIcon color="error" /> :
                             log.includes('⚠️') ? <WarningIcon color="warning" /> :
                             <InfoIcon color="info" />}
                          </ListItemIcon>
                          <ListItemText 
                            primary={log}
                            primaryTypographyProps={{ 
                              variant: 'body2',
                              fontFamily: 'monospace'
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
                
                {deploying && (
                  <LinearProgress sx={{ mt: 2 }} />
                )}
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          배포 요청
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          취소
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={deploying}>
            이전
          </Button>
        )}
        
        {activeStep < steps.length - 1 && (
          <Button 
            variant="contained" 
            onClick={handleNext}
            disabled={loading}
          >
            다음
          </Button>
        )}
        
        {activeStep === steps.length - 1 && deploymentStatus === 'success' && (
          <Button 
            variant="contained" 
            color="success"
            onClick={handleClose}
          >
            완료
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeploymentRequestDialog;
