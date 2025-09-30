// [advice from AI] 레포지토리 등록 및 CI/CD 파이프라인 설정 완전 워크플로우
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Stepper, Step, StepLabel, Box, Typography, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Alert, Chip, LinearProgress, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, ListItemIcon, Divider, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 인터페이스 정의
interface Repository {
  id?: string;
  name: string;
  description: string;
  repository_url: string;
  branch: string;
  language: string;
  framework?: string;
  project_id?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  owner_name?: string;
}

interface Infrastructure {
  id: string;
  service_name: string;
  service_type: string;
  service_url: string;
  environment: string;
  health_status: string;
}

interface PipelineConfig {
  pipeline_name: string;
  pipeline_type: 'docker' | 'maven' | 'gradle' | 'npm' | 'python';
  environment: 'development' | 'staging' | 'production';
  dockerfile_path: string;
  image_name: string;
  auto_trigger: boolean;
  notifications: boolean;
  jenkins_id: string;
  nexus_id: string;
  argocd_id: string;
  build_commands: string[];
  test_commands: string[];
  deploy_commands: string[];
}

interface RepositoryRegistrationWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (repository: Repository, pipeline: PipelineConfig) => void;
}

const steps = [
  '레포지토리 정보',
  '빌드 설정',
  '인프라 선택',
  '파이프라인 구성',
  '검토 및 생성'
];

const RepositoryRegistrationWizard: React.FC<RepositoryRegistrationWizardProps> = ({
  open,
  onClose,
  onComplete
}) => {
  const { token } = useJwtAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] 레포지토리 정보 상태
  const [repository, setRepository] = useState<Repository>({
    name: '',
    description: '',
    repository_url: '',
    branch: 'main',
    language: '',
    framework: '',
    status: 'active'
  });

  // [advice from AI] 파이프라인 설정 상태
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig>({
    pipeline_name: '',
    pipeline_type: 'docker',
    environment: 'development',
    dockerfile_path: './Dockerfile',
    image_name: '',
    auto_trigger: true,
    notifications: true,
    jenkins_id: '',
    nexus_id: '',
    argocd_id: '',
    build_commands: ['docker build -t $IMAGE_NAME .'],
    test_commands: ['npm test'],
    deploy_commands: ['kubectl apply -f k8s/']
  });

  // [advice from AI] 인프라 목록 상태
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // [advice from AI] 초기 데이터 로드
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // 인프라 목록 로드
      const infraResponse = await fetch('/api/deployment-infrastructure', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const infraData = await infraResponse.json();
      if (infraData.success) {
        setInfrastructures(infraData.data);
      }

      // 프로젝트 목록 로드
      const projectsResponse = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projectsData = await projectsResponse.json();
      if (projectsData.success) {
        setProjects(projectsData.projects || projectsData.data || []);
      }

    } catch (err: any) {
      setError(err.message || '초기 데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] GitHub 레포지토리 분석
  const analyzeRepository = async (url: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/operations/github/analyze-repository', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ repository_url: url })
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        const analysis = data.analysis;
        setRepository(prev => ({
          ...prev,
          name: analysis.name || prev.name,
          description: analysis.description || prev.description,
          language: analysis.language || prev.language,
          framework: analysis.framework || prev.framework
        }));

        setPipelineConfig(prev => ({
          ...prev,
          pipeline_name: `${analysis.name}-pipeline`,
          image_name: analysis.name?.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          pipeline_type: analysis.language === 'JavaScript' ? 'npm' : 
                        analysis.language === 'Java' ? 'maven' : 
                        analysis.language === 'Python' ? 'python' : 'docker'
        }));
      }
    } catch (err: any) {
      console.error('레포지토리 분석 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 단계별 검증
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // 레포지토리 정보
        return !!(repository.name && repository.repository_url && repository.language);
      case 1: // 빌드 설정
        return !!(pipelineConfig.pipeline_name && pipelineConfig.image_name);
      case 2: // 인프라 선택
        return !!(pipelineConfig.jenkins_id && pipelineConfig.nexus_id);
      case 3: // 파이프라인 구성
        return pipelineConfig.build_commands.length > 0;
      default:
        return true;
    }
  };

  // [advice from AI] 다음 단계
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
      setError(null);
    } else {
      setError('필수 정보를 모두 입력해주세요.');
    }
  };

  // [advice from AI] 이전 단계
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
  };

  // [advice from AI] 최종 생성
  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 레포지토리 등록
      const repoResponse = await fetch('/api/project-repositories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(repository)
      });

      const repoData = await repoResponse.json();
      if (!repoData.success) {
        throw new Error(repoData.message || '레포지토리 등록 실패');
      }

      // 2. CI/CD 파이프라인 생성
      const pipelineResponse = await fetch('/api/operations/cicd/pipelines', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...pipelineConfig,
          repository_id: repoData.repository.id,
          repository_url: repository.repository_url,
          branch: repository.branch
        })
      });

      const pipelineData = await pipelineResponse.json();
      if (!pipelineData.success) {
        throw new Error(pipelineData.message || '파이프라인 생성 실패');
      }

      // 3. 완료 콜백 호출
      if (onComplete) {
        onComplete(repoData.repository, pipelineConfig);
      }

      onClose();
      
    } catch (err: any) {
      setError(err.message || '생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 단계별 컨텐츠 렌더링
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // 레포지토리 정보
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="GitHub Repository URL"
                value={repository.repository_url}
                onChange={(e) => {
                  setRepository(prev => ({ ...prev, repository_url: e.target.value }));
                  if (e.target.value && e.target.value.includes('github.com')) {
                    analyzeRepository(e.target.value);
                  }
                }}
                placeholder="https://github.com/username/repository"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="레포지토리 이름"
                value={repository.name}
                onChange={(e) => setRepository(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="브랜치"
                value={repository.branch}
                onChange={(e) => setRepository(prev => ({ ...prev, branch: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="설명"
                value={repository.description}
                onChange={(e) => setRepository(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>주요 언어</InputLabel>
                <Select
                  value={repository.language}
                  label="주요 언어"
                  onChange={(e) => setRepository(prev => ({ ...prev, language: e.target.value }))}
                >
                  <MenuItem value="JavaScript">JavaScript</MenuItem>
                  <MenuItem value="TypeScript">TypeScript</MenuItem>
                  <MenuItem value="Python">Python</MenuItem>
                  <MenuItem value="Java">Java</MenuItem>
                  <MenuItem value="Go">Go</MenuItem>
                  <MenuItem value="C#">C#</MenuItem>
                  <MenuItem value="PHP">PHP</MenuItem>
                  <MenuItem value="Ruby">Ruby</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="프레임워크 (선택사항)"
                value={repository.framework || ''}
                onChange={(e) => setRepository(prev => ({ ...prev, framework: e.target.value }))}
                placeholder="React, Spring Boot, Django 등"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>연결할 프로젝트 (선택사항)</InputLabel>
                <Select
                  value={repository.project_id || ''}
                  label="연결할 프로젝트"
                  onChange={(e) => setRepository(prev => ({ ...prev, project_id: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>프로젝트 선택 안함</em>
                  </MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1: // 빌드 설정
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="파이프라인 이름"
                value={pipelineConfig.pipeline_name}
                onChange={(e) => setPipelineConfig(prev => ({ ...prev, pipeline_name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>빌드 타입</InputLabel>
                <Select
                  value={pipelineConfig.pipeline_type}
                  label="빌드 타입"
                  onChange={(e) => setPipelineConfig(prev => ({ ...prev, pipeline_type: e.target.value as any }))}
                >
                  <MenuItem value="docker">Docker</MenuItem>
                  <MenuItem value="npm">NPM</MenuItem>
                  <MenuItem value="maven">Maven</MenuItem>
                  <MenuItem value="gradle">Gradle</MenuItem>
                  <MenuItem value="python">Python</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>배포 환경</InputLabel>
                <Select
                  value={pipelineConfig.environment}
                  label="배포 환경"
                  onChange={(e) => setPipelineConfig(prev => ({ ...prev, environment: e.target.value as any }))}
                >
                  <MenuItem value="development">Development</MenuItem>
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Docker 이미지 이름"
                value={pipelineConfig.image_name}
                onChange={(e) => setPipelineConfig(prev => ({ ...prev, image_name: e.target.value }))}
                required
              />
            </Grid>
            {pipelineConfig.pipeline_type === 'docker' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dockerfile 경로"
                  value={pipelineConfig.dockerfile_path}
                  onChange={(e) => setPipelineConfig(prev => ({ ...prev, dockerfile_path: e.target.value }))}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={pipelineConfig.auto_trigger}
                    onChange={(e) => setPipelineConfig(prev => ({ ...prev, auto_trigger: e.target.checked }))}
                  />
                }
                label="자동 빌드 트리거 (Push 시 자동 실행)"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={pipelineConfig.notifications}
                    onChange={(e) => setPipelineConfig(prev => ({ ...prev, notifications: e.target.checked }))}
                  />
                }
                label="빌드 결과 알림"
              />
            </Grid>
          </Grid>
        );

      case 2: // 인프라 선택
        const jenkinsInfras = infrastructures.filter(infra => 
          infra.service_type === 'jenkins' || infra.service_type === 'ci_cd'
        );
        const nexusInfras = infrastructures.filter(infra => 
          infra.service_type === 'nexus' || infra.service_type === 'artifact_repository'
        );
        const argocdInfras = infrastructures.filter(infra => 
          infra.service_type === 'argocd' || infra.service_type === 'deployment_platform'
        );

        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                CI/CD 인프라 선택
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                파이프라인에서 사용할 Jenkins, Nexus, Argo CD 서버를 선택하세요.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Jenkins CI/CD 서버 *
                  </Typography>
                  <FormControl fullWidth required>
                    <Select
                      value={pipelineConfig.jenkins_id}
                      onChange={(e) => setPipelineConfig(prev => ({ ...prev, jenkins_id: e.target.value }))}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Jenkins 서버 선택</em>
                      </MenuItem>
                      {jenkinsInfras.map((infra) => (
                        <MenuItem key={infra.id} value={infra.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              size="small" 
                              label={infra.health_status} 
                              color={infra.health_status === 'active' ? 'success' : 'default'}
                            />
                            <Typography>{infra.service_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({infra.service_url})
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Nexus Repository *
                  </Typography>
                  <FormControl fullWidth required>
                    <Select
                      value={pipelineConfig.nexus_id}
                      onChange={(e) => setPipelineConfig(prev => ({ ...prev, nexus_id: e.target.value }))}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Nexus Repository 선택</em>
                      </MenuItem>
                      {nexusInfras.map((infra) => (
                        <MenuItem key={infra.id} value={infra.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              size="small" 
                              label={infra.health_status} 
                              color={infra.health_status === 'active' ? 'success' : 'default'}
                            />
                            <Typography>{infra.service_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({infra.service_url})
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Argo CD 서버 (선택사항)
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      value={pipelineConfig.argocd_id}
                      onChange={(e) => setPipelineConfig(prev => ({ ...prev, argocd_id: e.target.value }))}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Argo CD 서버 선택 (선택사항)</em>
                      </MenuItem>
                      {argocdInfras.map((infra) => (
                        <MenuItem key={infra.id} value={infra.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              size="small" 
                              label={infra.health_status} 
                              color={infra.health_status === 'active' ? 'success' : 'default'}
                            />
                            <Typography>{infra.service_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({infra.service_url})
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 3: // 파이프라인 구성
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                빌드 명령어 설정
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary>
                  <Typography>빌드 명령어</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="빌드 명령어 (한 줄씩 입력)"
                    value={pipelineConfig.build_commands.join('\n')}
                    onChange={(e) => setPipelineConfig(prev => ({
                      ...prev,
                      build_commands: e.target.value.split('\n').filter(cmd => cmd.trim())
                    }))}
                    placeholder="docker build -t $IMAGE_NAME ."
                  />
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary>
                  <Typography>테스트 명령어</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="테스트 명령어 (한 줄씩 입력)"
                    value={pipelineConfig.test_commands.join('\n')}
                    onChange={(e) => setPipelineConfig(prev => ({
                      ...prev,
                      test_commands: e.target.value.split('\n').filter(cmd => cmd.trim())
                    }))}
                    placeholder="npm test"
                  />
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary>
                  <Typography>배포 명령어</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="배포 명령어 (한 줄씩 입력)"
                    value={pipelineConfig.deploy_commands.join('\n')}
                    onChange={(e) => setPipelineConfig(prev => ({
                      ...prev,
                      deploy_commands: e.target.value.split('\n').filter(cmd => cmd.trim())
                    }))}
                    placeholder="kubectl apply -f k8s/"
                  />
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        );

      case 4: // 검토 및 생성
        const selectedJenkins = infrastructures.find(infra => infra.id === pipelineConfig.jenkins_id);
        const selectedNexus = infrastructures.find(infra => infra.id === pipelineConfig.nexus_id);
        const selectedArgoCD = infrastructures.find(infra => infra.id === pipelineConfig.argocd_id);

        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                설정 검토
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                아래 설정을 확인하고 파이프라인을 생성하세요.
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    레포지토리 정보
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="이름" secondary={repository.name} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="URL" secondary={repository.repository_url} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="브랜치" secondary={repository.branch} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="언어" secondary={repository.language} />
                    </ListItem>
                    {repository.framework && (
                      <ListItem>
                        <ListItemText primary="프레임워크" secondary={repository.framework} />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    파이프라인 설정
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="파이프라인 이름" secondary={pipelineConfig.pipeline_name} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="빌드 타입" secondary={pipelineConfig.pipeline_type} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="환경" secondary={pipelineConfig.environment} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="이미지 이름" secondary={pipelineConfig.image_name} />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="자동 트리거" 
                        secondary={pipelineConfig.auto_trigger ? '활성화' : '비활성화'} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    선택된 인프라
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>서비스</TableCell>
                          <TableCell>이름</TableCell>
                          <TableCell>URL</TableCell>
                          <TableCell>상태</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Jenkins</TableCell>
                          <TableCell>{selectedJenkins?.service_name}</TableCell>
                          <TableCell>{selectedJenkins?.service_url}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={selectedJenkins?.health_status} 
                              color={selectedJenkins?.health_status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Nexus</TableCell>
                          <TableCell>{selectedNexus?.service_name}</TableCell>
                          <TableCell>{selectedNexus?.service_url}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={selectedNexus?.health_status} 
                              color={selectedNexus?.health_status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                        {selectedArgoCD && (
                          <TableRow>
                            <TableCell>Argo CD</TableCell>
                            <TableCell>{selectedArgoCD?.service_name}</TableCell>
                            <TableCell>{selectedArgoCD?.service_url}</TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={selectedArgoCD?.health_status} 
                                color={selectedArgoCD?.health_status === 'active' ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h5">
          레포지토리 등록 및 CI/CD 파이프라인 설정
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers sx={{ minHeight: '600px' }}>
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          {renderStepContent(activeStep)}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          취소
        </Button>
        <Button 
          onClick={handleBack} 
          disabled={activeStep === 0 || loading}
        >
          이전
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button 
            onClick={handleCreate} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? '생성 중...' : '파이프라인 생성'}
          </Button>
        ) : (
          <Button 
            onClick={handleNext} 
            variant="contained" 
            disabled={!validateStep(activeStep) || loading}
          >
            다음
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RepositoryRegistrationWizard;
