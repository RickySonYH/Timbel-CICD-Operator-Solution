// [advice from AI] 레포지토리 기반 배포 시스템 - 완성된 코드 레포지토리로 운영센터 배포
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import DeploymentMonitor from '../../components/operations/DeploymentMonitor';

// [advice from AI] 레포지토리 정보 타입
interface RepositoryInfo {
  url: string;
  branch: string;
  name: string;
  description: string;
  language: string;
  framework: string;
  hasDockerfile: boolean;
  hasKubernetesManifests: boolean;
  packageJson?: any;
  requirements?: string[];
  dependencies: string[];
  estimatedResources: {
    cpu: number;
    memory: number;
    storage: number;
    replicas: number;
  };
}

// [advice from AI] 배포 설정 타입
interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  domain_id: string;
  service_name: string;
  port: number;
  auto_scaling: {
    min_replicas: number;
    max_replicas: number;
    target_cpu: number;
  };
  environment_variables: { [key: string]: string };
  health_check: {
    path: string;
    port: number;
    initial_delay: number;
  };
}

// [advice from AI] 파이프라인 정보 타입
interface PipelineInfo {
  id: string;
  pipeline_name: string;
  pipeline_type: string;
  environment: string;
  deployment_strategy: string;
  status: string;
  last_status?: string;
  config: {
    repository_url: string;
    branch: string;
    jenkins_job_name: string;
    jenkins_url: string;
    nexus_url: string;
    nexus_repository: string;
    argocd_url: string;
    argocd_app_name: string;
    dockerfile_path: string;
    image_tag: string;
    namespace: string;
  };
  created_at: string;
  updated_at: string;
}

const RepositoryDeployment: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  
  const [activeStep, setActiveStep] = useState(0);
  const [deploymentMode, setDeploymentMode] = useState<'new' | 'existing'>('new'); // [advice from AI] 배포 모드 선택
  const [repositoryUrl, setRepositoryUrl] = useState('https://github.com/RickySonYH/ecp-ai-k8s-orchestrator');
  const [repositoryInfo, setRepositoryInfo] = useState<RepositoryInfo | null>(null);
  const [existingPipelines, setExistingPipelines] = useState<PipelineInfo[]>([]); // [advice from AI] 기존 파이프라인 목록
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineInfo | null>(null); // [advice from AI] 선택된 파이프라인
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    environment: 'development',
    domain_id: '',
    service_name: '',
    port: 3000,
    auto_scaling: {
      min_replicas: 1,
      max_replicas: 5,
      target_cpu: 70
    },
    environment_variables: {},
    health_check: {
      path: '/health',
      port: 3000,
      initial_delay: 30
    }
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string>('');

  // [advice from AI] 컴포넌트 마운트 시 기존 파이프라인 로드
  useEffect(() => {
    loadExistingPipelines();
  }, []);

  // [advice from AI] 기존 파이프라인 목록 로드
  const loadExistingPipelines = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/operations/cicd/pipelines`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingPipelines(data.data || []);
        console.log('✅ 기존 파이프라인 로드 완료:', data.data?.length || 0, '개');
      }
    } catch (error) {
      console.error('❌ 기존 파이프라인 로드 실패:', error);
    }
  };

  // [advice from AI] 기존 파이프라인 선택 처리
  const handleSelectExistingPipeline = (pipeline: PipelineInfo) => {
    setSelectedPipeline(pipeline);
    setRepositoryUrl(pipeline.config.repository_url);
    
    // 선택된 파이프라인 정보로 RepositoryInfo 설정
    const repoInfo: RepositoryInfo = {
      url: pipeline.config.repository_url,
      branch: pipeline.config.branch || 'main',
      name: pipeline.pipeline_name.replace('-pipeline', ''),
      description: `기존 파이프라인: ${pipeline.pipeline_name}`,
      language: 'JavaScript', // 기본값
      framework: 'React', // 기본값
      hasDockerfile: true,
      hasKubernetesManifests: true,
      dependencies: [],
      estimatedResources: {
        cpu: 1,
        memory: 1024,
        storage: 10,
        replicas: 1
      }
    };
    
    setRepositoryInfo(repoInfo);
    setActiveStep(1); // 설정 단계로 이동
  };

  // [advice from AI] 레포지토리 분석
  const handleAnalyzeRepository = async () => {
    try {
      setAnalyzing(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/operations/repository/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ repository_url: repositoryUrl })
      });

      if (!response.ok) {
        throw new Error('레포지토리 분석 실패');
      }

      const data = await response.json();
      
      // API 응답 데이터를 RepositoryInfo 형식으로 변환
      const repoInfo: RepositoryInfo = {
        url: repositoryUrl,
        branch: data.repository_info?.branch || 'main',
        name: data.repository_info?.name || '알 수 없음',
        description: data.repository_info?.description || '',
        language: data.repository_info?.language || '알 수 없음',
        framework: data.repository_info?.framework || '알 수 없음',
        hasDockerfile: data.repository_info?.hasDockerfile || false,
        hasKubernetesManifests: data.repository_info?.hasKubernetesManifests || false,
        dependencies: data.repository_info?.dependencies || [],
        estimatedResources: {
          cpu: data.repository_info?.estimatedResources?.cpu || 1,
          memory: data.repository_info?.estimatedResources?.memory || 1024,
          storage: data.repository_info?.estimatedResources?.storage || 10,
          replicas: data.repository_info?.estimatedResources?.replicas || 1
        }
      };

      setRepositoryInfo(repoInfo);
      setActiveStep(1);
      
    } catch (error) {
      console.error('레포지토리 분석 오류:', error);
      alert('레포지토리 분석에 실패했습니다. URL을 확인해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  // [advice from AI] 배포 실행
  const handleDeployRepository = async () => {
    try {
      setDeploying(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/operations/repository/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_url: repositoryUrl,
          repository_info: repositoryInfo,
          deployment_config: {
            ...deploymentConfig,
            deployment_mode: deploymentMode,
            existing_pipeline_id: selectedPipeline?.id,
            jenkins_job_name: selectedPipeline?.config?.jenkins_job_name,
            jenkins_url: selectedPipeline?.config?.jenkins_url,
            nexus_url: selectedPipeline?.config?.nexus_url,
            argocd_url: selectedPipeline?.config?.argocd_url
          },
          deployed_by: user?.username || 'system'
        })
      });

      if (!response.ok) {
        throw new Error('배포 실행 실패');
      }

      const data = await response.json();
      setDeploymentResult(data);
      setActiveStep(2);
      
      // [advice from AI] 배포 모니터링 다이얼로그 열기
      if (data.deployment?.id) {
        setCurrentDeploymentId(data.deployment.id);
        setMonitorOpen(true);
      }
      
    } catch (error) {
      console.error('배포 실행 오류:', error);
      alert('배포 실행에 실패했습니다.');
    } finally {
      setDeploying(false);
    }
  };

  // [advice from AI] 배포 단계
  const steps = [
    {
      label: '레포지토리 분석',
      description: 'GitHub 레포지토리 URL을 입력하고 분석합니다. 자동으로 언어, 프레임워크, Dockerfile, K8s 매니페스트를 감지합니다.'
    },
    {
      label: '배포 설정',
      description: '배포 환경, 리소스 설정, 환경 변수 등을 구성합니다. 자동으로 추천된 설정을 사용하거나 수정할 수 있습니다.'
    },
    {
      label: '배포 완료',
      description: 'Jenkins → Nexus → Argo CD 파이프라인이 자동으로 실행됩니다. 배포 진행 상황을 모니터링합니다.'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 페이지 제목 및 설명 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          레포지토리 배포
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          완성된 GitHub 레포지토리를 직접 분석하고 배포합니다. 운영팀 전용 기능입니다.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>레포지토리 배포 가이드:</strong><br/>
            • <strong>1단계 - 레포지토리 분석</strong>: GitHub URL을 입력하면 자동으로 코드를 분석합니다.<br/>
            • <strong>2단계 - 배포 설정</strong>: 배포 환경(dev/stg/prod)과 리소스를 설정합니다.<br/>
            • <strong>3단계 - 자동 배포</strong>: Jenkins Job 생성 → Docker 빌드 → Nexus 푸시 → Argo CD 배포가 자동으로 실행됩니다.<br/>
            • 배포 후 지식자원 시스템으로 자동 등록되어 체계적으로 관리됩니다.
          </Typography>
        </Alert>
      </Box>

      {/* 배포 진행 단계 */}
      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* 1단계: 레포지토리 분석 */}
            <Step>
              <StepLabel>
                <Typography variant="h6">1단계: 배포 방식 선택</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  새로운 레포지토리를 분석하거나 기존 파이프라인을 선택하여 배포할 수 있습니다.
                </Typography>
                
                {/* [advice from AI] 배포 모드 선택 */}
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>배포 방식 선택</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button
                      variant={deploymentMode === 'new' ? 'contained' : 'outlined'}
                      onClick={() => setDeploymentMode('new')}
                      sx={{ flex: 1 }}
                    >
                      새 레포지토리 배포
                    </Button>
                    <Button
                      variant={deploymentMode === 'existing' ? 'contained' : 'outlined'}
                      onClick={() => setDeploymentMode('existing')}
                      sx={{ flex: 1 }}
                    >
                      기존 파이프라인 재배포
                    </Button>
                  </Box>
                </FormControl>

                {/* [advice from AI] 새 레포지토리 배포 */}
                {deploymentMode === 'new' && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      GitHub 레포지토리 URL을 입력하세요. 시스템이 자동으로 코드를 분석하여 언어, 프레임워크, 
                      Dockerfile 존재 여부, K8s 매니페스트 등을 감지합니다.
                    </Typography>
                    <TextField
                      fullWidth
                      label="GitHub 레포지토리 URL"
                      value={repositoryUrl}
                      onChange={(e) => setRepositoryUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      margin="normal"
                      helperText="예: https://github.com/RickySonYH/ecp-ai-k8s-orchestrator"
                    />
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleAnalyzeRepository}
                        disabled={!repositoryUrl || analyzing}
                      >
                        {analyzing ? '분석 중...' : '레포지토리 분석'}
                      </Button>
                    </Box>
                    {analyzing && <LinearProgress sx={{ mt: 2 }} />}
                  </Box>
                )}

                {/* [advice from AI] 기존 파이프라인 선택 */}
                {deploymentMode === 'existing' && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      기존에 설정된 파이프라인을 선택하여 재배포할 수 있습니다.
                    </Typography>
                    
                    {existingPipelines.length === 0 ? (
                      <Alert severity="info">
                        등록된 파이프라인이 없습니다. 새 레포지토리 배포를 선택하세요.
                      </Alert>
                    ) : (
                      <Box>
                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                          기존 파이프라인 목록 ({existingPipelines.length}개)
                        </Typography>
                        <Grid container spacing={2}>
                          {existingPipelines.map((pipeline) => (
                            <Grid item xs={12} md={6} key={pipeline.id}>
                              <Card 
                                sx={{ 
                                  cursor: 'pointer',
                                  border: selectedPipeline?.id === pipeline.id ? 2 : 1,
                                  borderColor: selectedPipeline?.id === pipeline.id ? 'primary.main' : 'divider'
                                }}
                                onClick={() => handleSelectExistingPipeline(pipeline)}
                              >
                                <CardContent>
                                  <Typography variant="h6" gutterBottom>
                                    {pipeline.pipeline_name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {pipeline.config.repository_url}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
                                    Jenkins: {pipeline.config.jenkins_url} | Nexus: {pipeline.config.nexus_url}
                                  </Typography>
                                  <Box sx={{ mt: 1 }}>
                                    <Chip 
                                      label={pipeline.config.branch || 'main'} 
                                      size="small" 
                                      sx={{ mr: 1 }} 
                                    />
                                    <Chip 
                                      label={pipeline.environment} 
                                      size="small" 
                                      color="primary"
                                      sx={{ mr: 1 }} 
                                    />
                                    <Chip 
                                      label={pipeline.deployment_strategy} 
                                      size="small" 
                                      color="secondary"
                                      sx={{ mr: 1 }} 
                                    />
                                    <Chip 
                                      label={pipeline.last_status || 'ready'} 
                                      size="small" 
                                      color={pipeline.last_status === 'success' ? 'success' : 
                                            pipeline.last_status === 'failed' ? 'error' :
                                            pipeline.last_status === 'running' ? 'warning' : 'default'}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    이미지: {pipeline.config.image_tag} | 네임스페이스: {pipeline.config.namespace}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                        
                        {selectedPipeline && (
                          <Box sx={{ mt: 2 }}>
                            <Alert severity="success">
                              선택된 파이프라인: <strong>{selectedPipeline.pipeline_name}</strong>
                            </Alert>
                            <Button
                              variant="contained"
                              onClick={() => setActiveStep(1)}
                              sx={{ mt: 2 }}
                            >
                              선택된 파이프라인으로 배포 진행
                            </Button>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* 2단계: 배포 설정 */}
            <Step>
              <StepLabel>
                <Typography variant="h6">2단계: 배포 설정</Typography>
              </StepLabel>
              <StepContent>
                {repositoryInfo && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      레포지토리 분석이 완료되었습니다. 배포 환경과 리소스를 설정하세요. 
                      자동으로 추천된 설정을 사용하거나 필요에 따라 수정할 수 있습니다.
                    </Typography>

                    {/* 분석 결과 */}
                    <Accordion defaultExpanded sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">레포지토리 정보</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">레포지토리명</Typography>
                            <Typography variant="body1" fontWeight="bold">{repositoryInfo.name}</Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">브랜치</Typography>
                            <Typography variant="body1" fontWeight="bold">{repositoryInfo.branch}</Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">언어</Typography>
                            <Chip label={repositoryInfo.language} color="primary" size="small" />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">프레임워크</Typography>
                            <Chip label={repositoryInfo.framework} color="secondary" size="small" />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">Dockerfile</Typography>
                            <Chip 
                              label={repositoryInfo.hasDockerfile ? '있음' : '없음'} 
                              color={repositoryInfo.hasDockerfile ? 'success' : 'error'} 
                              size="small" 
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">K8s 매니페스트</Typography>
                            <Chip 
                              label={repositoryInfo.hasKubernetesManifests ? '있음' : '없음'} 
                              color={repositoryInfo.hasKubernetesManifests ? 'success' : 'warning'} 
                              size="small" 
                            />
                          </Grid>
                        </Grid>

                        {repositoryInfo.description && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">설명</Typography>
                            <Typography variant="body1">{repositoryInfo.description}</Typography>
                          </Box>
                        )}

                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">추천 리소스</Typography>
                          <Grid container spacing={1} sx={{ mt: 0.5 }}>
                            <Grid item>
                              <Chip label={`CPU: ${repositoryInfo.estimatedResources.cpu} Core`} size="small" />
                            </Grid>
                            <Grid item>
                              <Chip label={`Memory: ${repositoryInfo.estimatedResources.memory}MB`} size="small" />
                            </Grid>
                            <Grid item>
                              <Chip label={`Storage: ${repositoryInfo.estimatedResources.storage}GB`} size="small" />
                            </Grid>
                            <Grid item>
                              <Chip label={`Replicas: ${repositoryInfo.estimatedResources.replicas}`} size="small" />
                            </Grid>
                          </Grid>
                        </Box>
                      </AccordionDetails>
                    </Accordion>

                    {/* 배포 설정 */}
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">배포 구성</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>배포 환경</InputLabel>
                              <Select
                                value={deploymentConfig.environment}
                                onChange={(e) => setDeploymentConfig({ 
                                  ...deploymentConfig, 
                                  environment: e.target.value as any 
                                })}
                                label="배포 환경"
                              >
                                <MenuItem value="development">개발 (Development)</MenuItem>
                                <MenuItem value="staging">스테이징 (Staging)</MenuItem>
                                <MenuItem value="production">운영 (Production)</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="서비스명"
                              value={deploymentConfig.service_name}
                              onChange={(e) => setDeploymentConfig({ 
                                ...deploymentConfig, 
                                service_name: e.target.value 
                              })}
                              placeholder={repositoryInfo.name}
                              helperText="배포될 서비스의 이름"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              type="number"
                              label="서비스 포트"
                              value={deploymentConfig.port}
                              onChange={(e) => setDeploymentConfig({ 
                                ...deploymentConfig, 
                                port: parseInt(e.target.value) 
                              })}
                              helperText="애플리케이션이 사용할 포트 번호"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Health Check 경로"
                              value={deploymentConfig.health_check.path}
                              onChange={(e) => setDeploymentConfig({ 
                                ...deploymentConfig, 
                                health_check: { 
                                  ...deploymentConfig.health_check, 
                                  path: e.target.value 
                                } 
                              })}
                              helperText="헬스체크를 위한 엔드포인트 경로"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Auto Scaling 설정
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="최소 Replica 수"
                              value={deploymentConfig.auto_scaling.min_replicas}
                              onChange={(e) => setDeploymentConfig({ 
                                ...deploymentConfig, 
                                auto_scaling: { 
                                  ...deploymentConfig.auto_scaling, 
                                  min_replicas: parseInt(e.target.value) 
                                } 
                              })}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="최대 Replica 수"
                              value={deploymentConfig.auto_scaling.max_replicas}
                              onChange={(e) => setDeploymentConfig({ 
                                ...deploymentConfig, 
                                auto_scaling: { 
                                  ...deploymentConfig.auto_scaling, 
                                  max_replicas: parseInt(e.target.value) 
                                } 
                              })}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="목표 CPU 사용률 (%)"
                              value={deploymentConfig.auto_scaling.target_cpu}
                              onChange={(e) => setDeploymentConfig({ 
                                ...deploymentConfig, 
                                auto_scaling: { 
                                  ...deploymentConfig.auto_scaling, 
                                  target_cpu: parseInt(e.target.value) 
                                } 
                              })}
                            />
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>

                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Button onClick={() => setActiveStep(0)}>
                        이전
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleDeployRepository}
                        disabled={deploying || !deploymentConfig.service_name}
                      >
                        {deploying ? '배포 중...' : '배포 실행'}
                      </Button>
                    </Box>
                    {deploying && <LinearProgress sx={{ mt: 2 }} />}
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* 3단계: 배포 완료 */}
            <Step>
              <StepLabel>
                <Typography variant="h6">3단계: 배포 완료</Typography>
              </StepLabel>
              <StepContent>
                {deploymentResult && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      배포가 성공적으로 완료되었습니다!
                    </Alert>

                    <Typography variant="body2" color="text.secondary" paragraph>
                      Jenkins → Nexus → Argo CD 파이프라인이 자동으로 실행되었습니다. 
                      아래에서 각 단계의 상태를 확인할 수 있습니다.
                    </Typography>

                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>배포 정보</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">배포 ID</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {deploymentResult.deployment?.id || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">시스템 ID</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {deploymentResult.system?.system_id || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">배포 환경</Typography>
                            <Chip label={deploymentConfig.environment} color="primary" size="small" />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">배포 시간</Typography>
                            <Typography variant="body1">
                              {new Date().toLocaleString('ko-KR')}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>

                    <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button variant="contained" onClick={() => navigate('/operations/nexus')}>
                        Nexus 이미지 확인
                      </Button>
                      <Button variant="outlined" onClick={() => navigate('/operations/argocd')}>
                        Argo CD 배포 확인
                      </Button>
                      <Button variant="outlined" onClick={() => navigate('/operations/comprehensive-monitoring')}>
                        모니터링 대시보드
                      </Button>
                      <Button variant="outlined" onClick={() => navigate('/knowledge/systems')}>
                        지식자원 시스템
                      </Button>
                      <Button onClick={() => {
                        setActiveStep(0);
                        setRepositoryInfo(null);
                        setDeploymentResult(null);
                      }}>
                        새로운 배포
                      </Button>
                    </Box>
                  </Box>
                )}
              </StepContent>
            </Step>
          </Stepper>
        </CardContent>
      </Card>

      {/* [advice from AI] 배포 모니터링 다이얼로그 */}
      <DeploymentMonitor
        open={monitorOpen}
        deploymentId={currentDeploymentId}
        onClose={() => setMonitorOpen(false)}
      />
    </Box>
  );
};

export default RepositoryDeployment;
