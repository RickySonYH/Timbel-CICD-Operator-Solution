// [advice from AI] 운영팀 전용 배포 진행 센터 - 레포지토리 기반 직접 배포
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Grid, Alert, Chip, Card, CardContent,
  TextField, Divider, LinearProgress, FormControl, InputLabel, Select, MenuItem,
  Stepper, Step, StepLabel, StepContent, Dialog, DialogTitle, DialogContent,
  DialogActions, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip, Accordion, AccordionSummary,
  AccordionDetails, List, ListItem, ListItemText, Switch, FormControlLabel
} from '@mui/material';
import {
  GitHub as GitHubIcon, Build as BuildIcon, Deploy as DeployIcon,
  Refresh as RefreshIcon, PlayArrow as PlayArrowIcon, Stop as StopIcon,
  Visibility as VisibilityIcon, History as HistoryIcon, Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon, Error as ErrorIcon, Warning as WarningIcon,
  Info as InfoIcon, Timeline as TimelineIcon, Code as CodeIcon,
  CloudUpload as CloudUploadIcon, Storage as StorageIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] 타입 정의
interface Repository {
  url: string;
  name: string;
  owner: string;
  branch: string;
  lastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
}

interface BuildConfig {
  dockerfilePath: string;
  buildContext: string;
  buildArgs: { [key: string]: string };
  environmentVariables: { [key: string]: string };
  imageName: string;
  imageTag: string;
}

interface DeploymentTarget {
  environment: 'development' | 'staging' | 'production';
  namespace: string;
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
  };
  ports: Array<{
    name: string;
    port: number;
    targetPort: number;
  }>;
}

interface DeploymentExecution {
  id: string;
  repository: Repository;
  buildConfig: BuildConfig;
  deploymentTarget: DeploymentTarget;
  status: 'preparing' | 'building' | 'pushing' | 'deploying' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  logs: Array<{
    timestamp: string;
    stage: string;
    message: string;
    level: 'info' | 'warning' | 'error';
  }>;
  buildNumber?: number;
  imageUrl?: string;
  deploymentUrl?: string;
}

const OperationsDeploymentCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  // [advice from AI] 상태 관리
  const [activeTab, setActiveTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  
  // [advice from AI] 레포지토리 설정
  const [repository, setRepository] = useState<Repository>({
    url: '',
    name: '',
    owner: '',
    branch: 'main'
  });
  
  // [advice from AI] 빌드 설정
  const [buildConfig, setBuildConfig] = useState<BuildConfig>({
    dockerfilePath: './Dockerfile',
    buildContext: '.',
    buildArgs: {},
    environmentVariables: {},
    imageName: '',
    imageTag: 'latest'
  });
  
  // [advice from AI] 배포 대상 설정
  const [deploymentTarget, setDeploymentTarget] = useState<DeploymentTarget>({
    environment: 'development',
    namespace: 'default',
    replicas: 1,
    resources: {
      cpu: '100m',
      memory: '128Mi'
    },
    ports: [
      { name: 'http', port: 80, targetPort: 8080 }
    ]
  });
  
  // [advice from AI] 배포 실행 상태
  const [currentExecution, setCurrentExecution] = useState<DeploymentExecution | null>(null);
  const [executionHistory, setExecutionHistory] = useState<DeploymentExecution[]>([]);
  const [loading, setLoading] = useState(false);
  
  // [advice from AI] UI 상태
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<DeploymentExecution | null>(null);

  // [advice from AI] 레포지토리 정보 가져오기
  const fetchRepositoryInfo = useCallback(async (repoUrl: string) => {
    if (!repoUrl) return;
    
    try {
      setLoading(true);
      
      // GitHub URL 파싱
      const urlParts = repoUrl.replace('https://github.com/', '').split('/');
      if (urlParts.length >= 2) {
        const owner = urlParts[0];
        const name = urlParts[1].replace('.git', '');
        
        setRepository(prev => ({
          ...prev,
          name,
          owner
        }));
        
        // 기본 이미지 이름 설정
        setBuildConfig(prev => ({
          ...prev,
          imageName: `${owner}/${name}`.toLowerCase()
        }));
        
        // GitHub API로 최신 커밋 정보 가져오기 (선택사항)
        const response = await fetch(`/api/operations/github/repository-info`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            repository_url: repoUrl,
            branch: repository.branch 
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.repository) {
            setRepository(prev => ({
              ...prev,
              lastCommit: data.repository.lastCommit
            }));
          }
        }
      }
    } catch (error) {
      console.error('레포지토리 정보 가져오기 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [token, repository.branch]);

  // [advice from AI] 배포 실행
  const executeDeployment = useCallback(async () => {
    if (!repository.url || !buildConfig.imageName) {
      alert('레포지토리 URL과 이미지 이름을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      const executionData = {
        repository,
        buildConfig,
        deploymentTarget,
        requestedBy: 'operations' // 운영팀 요청
      };

      const response = await fetch('/api/operations/deployments/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(executionData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentExecution(data.execution);
          setActiveTab(1); // 모니터링 탭으로 이동
          
          // 실시간 모니터링 시작
          startRealTimeMonitoring(data.execution.id);
        } else {
          throw new Error(data.message);
        }
      } else {
        throw new Error('배포 실행 요청 실패');
      }
    } catch (error) {
      console.error('배포 실행 실패:', error);
      alert(`배포 실행 중 오류가 발생했습니다: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [repository, buildConfig, deploymentTarget, token]);

  // [advice from AI] 실시간 모니터링
  const startRealTimeMonitoring = useCallback((executionId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/operations/deployments/${executionId}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCurrentExecution(data.execution);
            
            // 완료되면 모니터링 중지
            if (data.execution.status === 'completed' || data.execution.status === 'failed') {
              clearInterval(interval);
              fetchExecutionHistory(); // 히스토리 새로고침
            }
          }
        }
      } catch (error) {
        console.error('상태 모니터링 실패:', error);
      }
    }, 2000); // 2초마다 업데이트

    return () => clearInterval(interval);
  }, [token]);

  // [advice from AI] 배포 히스토리 가져오기
  const fetchExecutionHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/operations/deployments/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExecutionHistory(data.executions);
        }
      }
    } catch (error) {
      console.error('배포 히스토리 가져오기 실패:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchExecutionHistory();
  }, [fetchExecutionHistory]);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'building':
      case 'pushing':
      case 'deploying': return 'warning';
      case 'preparing': return 'info';
      default: return 'default';
    }
  };

  // [advice from AI] 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon />;
      case 'failed': return <ErrorIcon />;
      case 'building':
      case 'pushing':
      case 'deploying': return <RefreshIcon />;
      case 'preparing': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  // [advice from AI] 단계별 컨텐츠
  const steps = [
    {
      label: '레포지토리 설정',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>GitHub 레포지토리 설정</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            배포할 GitHub 레포지토리 정보를 입력하세요.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Repository URL"
                value={repository.url}
                onChange={(e) => {
                  setRepository(prev => ({ ...prev, url: e.target.value }));
                  if (e.target.value) {
                    fetchRepositoryInfo(e.target.value);
                  }
                }}
                placeholder="https://github.com/owner/repository"
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Branch"
                value={repository.branch}
                onChange={(e) => setRepository(prev => ({ ...prev, branch: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Owner"
                value={repository.owner}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Repository Name"
                value={repository.name}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>

          {repository.lastCommit && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>최신 커밋 정보</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>SHA:</strong> {repository.lastCommit.sha.substring(0, 7)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>메시지:</strong> {repository.lastCommit.message}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>작성자:</strong> {repository.lastCommit.author}
                </Typography>
                <Typography variant="body2">
                  <strong>날짜:</strong> {new Date(repository.lastCommit.date).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )
    },
    {
      label: '빌드 설정',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>Docker 빌드 설정</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Docker 이미지 빌드에 필요한 설정을 입력하세요.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Dockerfile Path"
                value={buildConfig.dockerfilePath}
                onChange={(e) => setBuildConfig(prev => ({ ...prev, dockerfilePath: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Build Context"
                value={buildConfig.buildContext}
                onChange={(e) => setBuildConfig(prev => ({ ...prev, buildContext: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Image Name"
                value={buildConfig.imageName}
                onChange={(e) => setBuildConfig(prev => ({ ...prev, imageName: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Image Tag"
                value={buildConfig.imageTag}
                onChange={(e) => setBuildConfig(prev => ({ ...prev, imageTag: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>

          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary>
              <Typography>고급 빌드 설정</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="h6" gutterBottom>Build Arguments</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Build Args (JSON 형식)"
                value={JSON.stringify(buildConfig.buildArgs, null, 2)}
                onChange={(e) => {
                  try {
                    const args = JSON.parse(e.target.value);
                    setBuildConfig(prev => ({ ...prev, buildArgs: args }));
                  } catch (error) {
                    // JSON 파싱 오류 무시
                  }
                }}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="h6" gutterBottom>Environment Variables</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Environment Variables (JSON 형식)"
                value={JSON.stringify(buildConfig.environmentVariables, null, 2)}
                onChange={(e) => {
                  try {
                    const envVars = JSON.parse(e.target.value);
                    setBuildConfig(prev => ({ ...prev, environmentVariables: envVars }));
                  } catch (error) {
                    // JSON 파싱 오류 무시
                  }
                }}
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      )
    },
    {
      label: '배포 설정',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>Kubernetes 배포 설정</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Kubernetes 클러스터에 배포할 설정을 입력하세요.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Environment</InputLabel>
                <Select
                  value={deploymentTarget.environment}
                  label="Environment"
                  onChange={(e) => setDeploymentTarget(prev => ({ 
                    ...prev, 
                    environment: e.target.value as 'development' | 'staging' | 'production'
                  }))}
                >
                  <MenuItem value="development">Development</MenuItem>
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Namespace"
                value={deploymentTarget.namespace}
                onChange={(e) => setDeploymentTarget(prev => ({ ...prev, namespace: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Replicas"
                value={deploymentTarget.replicas}
                onChange={(e) => setDeploymentTarget(prev => ({ ...prev, replicas: Number(e.target.value) }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CPU Request"
                value={deploymentTarget.resources.cpu}
                onChange={(e) => setDeploymentTarget(prev => ({ 
                  ...prev, 
                  resources: { ...prev.resources, cpu: e.target.value }
                }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Memory Request"
                value={deploymentTarget.resources.memory}
                onChange={(e) => setDeploymentTarget(prev => ({ 
                  ...prev, 
                  resources: { ...prev.resources, memory: e.target.value }
                }))}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>포트 설정</Typography>
          {deploymentTarget.ports.map((port, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Port Name"
                  value={port.name}
                  onChange={(e) => {
                    const newPorts = [...deploymentTarget.ports];
                    newPorts[index].name = e.target.value;
                    setDeploymentTarget(prev => ({ ...prev, ports: newPorts }));
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Service Port"
                  value={port.port}
                  onChange={(e) => {
                    const newPorts = [...deploymentTarget.ports];
                    newPorts[index].port = Number(e.target.value);
                    setDeploymentTarget(prev => ({ ...prev, ports: newPorts }));
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Target Port"
                  value={port.targetPort}
                  onChange={(e) => {
                    const newPorts = [...deploymentTarget.ports];
                    newPorts[index].targetPort = Number(e.target.value);
                    setDeploymentTarget(prev => ({ ...prev, ports: newPorts }));
                  }}
                />
              </Grid>
            </Grid>
          ))}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          운영팀 배포 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          GitHub 레포지토리 기반 직접 빌드 및 배포 관리
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="새 배포 실행" icon={<DeployIcon />} />
          <Tab label="실시간 모니터링" icon={<TimelineIcon />} />
          <Tab label="배포 히스토리" icon={<HistoryIcon />} />
        </Tabs>
      </Paper>

      {/* [advice from AI] 탭 컨텐츠 */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  {step.content}
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (index === steps.length - 1) {
                          executeDeployment();
                        } else {
                          setActiveStep(index + 1);
                        }
                      }}
                      disabled={loading}
                      sx={{ mr: 1 }}
                    >
                      {index === steps.length - 1 ? '배포 실행' : '다음'}
                    </Button>
                    {index > 0 && (
                      <Button onClick={() => setActiveStep(index - 1)}>
                        이전
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {/* [advice from AI] 실시간 모니터링 탭 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {currentExecution ? (
              <BackstageCard title="현재 배포 진행 상황" variant="default">
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h6">
                      {currentExecution.repository.name}
                    </Typography>
                    <Chip 
                      label={currentExecution.status}
                      color={getStatusColor(currentExecution.status)}
                      icon={getStatusIcon(currentExecution.status)}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Environment: {currentExecution.deploymentTarget.environment} | 
                    Image: {currentExecution.buildConfig.imageName}:{currentExecution.buildConfig.imageTag}
                  </Typography>

                  {(currentExecution.status === 'building' || 
                    currentExecution.status === 'pushing' || 
                    currentExecution.status === 'deploying') && (
                    <LinearProgress sx={{ mb: 2 }} />
                  )}
                </Box>

                {/* [advice from AI] 실시간 로그 */}
                <Typography variant="h6" gutterBottom>실시간 로그</Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#1e1e1e', 
                    color: '#ffffff',
                    maxHeight: 400,
                    overflowY: 'auto',
                    fontFamily: 'monospace'
                  }}
                >
                  {currentExecution.logs.map((log, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: log.level === 'error' ? '#ff6b6b' : 
                                log.level === 'warning' ? '#ffd93d' : '#6bcf7f'
                        }}
                      >
                        [{log.timestamp}] [{log.stage}] {log.message}
                      </Typography>
                    </Box>
                  ))}
                </Paper>

                {currentExecution.status === 'completed' && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    배포가 성공적으로 완료되었습니다!
                    {currentExecution.deploymentUrl && (
                      <Box sx={{ mt: 1 }}>
                        <Button 
                          variant="outlined" 
                          size="small"
                          href={currentExecution.deploymentUrl}
                          target="_blank"
                        >
                          배포된 서비스 확인
                        </Button>
                      </Box>
                    )}
                  </Alert>
                )}

                {currentExecution.status === 'failed' && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    배포 중 오류가 발생했습니다. 로그를 확인해주세요.
                  </Alert>
                )}
              </BackstageCard>
            ) : (
              <Alert severity="info">
                현재 진행 중인 배포가 없습니다. 새 배포를 시작해주세요.
              </Alert>
            )}
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 배포 히스토리 탭 */}
      {activeTab === 2 && (
        <BackstageCard title="배포 히스토리" variant="default">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Repository</TableCell>
                  <TableCell>Environment</TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Started At</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {executionHistory.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {execution.repository.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {execution.repository.branch}
                      </Typography>
                    </TableCell>
                    <TableCell>{execution.deploymentTarget.environment}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {execution.buildConfig.imageName}:{execution.buildConfig.imageTag}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={execution.status}
                        color={getStatusColor(execution.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(execution.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {execution.completedAt ? 
                        `${Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s` :
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Tooltip title="로그 보기">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedExecution(execution);
                            setLogDialogOpen(true);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </BackstageCard>
      )}

      {/* [advice from AI] 로그 다이얼로그 */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>배포 로그 - {selectedExecution?.repository.name}</DialogTitle>
        <DialogContent dividers>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: '#1e1e1e', 
              color: '#ffffff',
              maxHeight: 500,
              overflowY: 'auto',
              fontFamily: 'monospace'
            }}
          >
            {selectedExecution?.logs.map((log, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: log.level === 'error' ? '#ff6b6b' : 
                          log.level === 'warning' ? '#ffd93d' : '#6bcf7f'
                  }}
                >
                  [{log.timestamp}] [{log.stage}] {log.message}
                </Typography>
              </Box>
            ))}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OperationsDeploymentCenter;
