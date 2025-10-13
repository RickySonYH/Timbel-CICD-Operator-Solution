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

const RepositoryDeployment: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  
  const [activeStep, setActiveStep] = useState(0);
  const [repositoryUrl, setRepositoryUrl] = useState('https://github.com/RickySonYH/ecp-ai-k8s-orchestrator');
  const [repositoryInfo, setRepositoryInfo] = useState<RepositoryInfo | null>(null);
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

  // [advice from AI] 레포지토리 분석
  const handleAnalyzeRepository = async () => {
    try {
      setAnalyzing(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/operations/repository/analyze', {
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
      const response = await fetch('http://localhost:3001/api/operations/repository/deploy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_url: repositoryUrl,
          repository_info: repositoryInfo,
          deployment_config: deploymentConfig
        })
      });

      if (!response.ok) {
        throw new Error('배포 실행 실패');
      }

      const data = await response.json();
      setDeploymentResult(data);
      setActiveStep(2);
      
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
                <Typography variant="h6">1단계: 레포지토리 분석</Typography>
              </StepLabel>
              <StepContent>
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
    </Box>
  );
};

export default RepositoryDeployment;
