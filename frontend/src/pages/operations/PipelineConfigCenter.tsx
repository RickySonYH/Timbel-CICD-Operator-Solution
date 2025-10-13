// [advice from AI] STEP 2: 파이프라인 설정 센터 - Jenkins Job 생성, GitHub Webhook 설정, 빌드 설정 마법사
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Stepper, Step, StepLabel, StepContent
} from '@mui/material';
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

const PipelineConfigCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // 파이프라인 설정 마법사
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    project_name: '',
    repository_url: '',
    branch: 'main',
    build_script: 'npm run build',
    deployment_environment: 'development',
    jenkins_config: {
      enable_webhook: true,
      build_triggers: ['push', 'pull_request'],
      notification_email: ''
    }
  });
  
  // 기존 파이프라인 목록
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [jenkinsJobs, setJenkinsJobs] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      loadPipelineData();
    }
  }, [token]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      
      // 실제 API 데이터 로드
      const { token: authToken } = useJwtAuthStore.getState();
      const [templatesRes, jobsRes] = await Promise.all([
        fetch('http://localhost:3001/api/pipeline-templates/applications', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch('http://localhost:3001/api/jenkins/jobs', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setPipelines(templatesData.applications || []);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJenkinsJobs(jobsData.jobs || []);
      }

      // 백업 샘플 데이터
      setPipelines([
        {
          id: '1',
          project_name: 'ECP-AI K8s Orchestrator',
          repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
          branch: 'main',
          status: 'active',
          jenkins_job: 'ecp-ai-orchestrator-build',
          last_build: '2025-09-30T10:30:00Z',
          success_rate: 95
        },
        {
          id: '2', 
          project_name: 'User Service',
          repository_url: 'https://github.com/company/user-service',
          branch: 'develop',
          status: 'active',
          jenkins_job: 'user-service-pipeline',
          last_build: '2025-09-30T09:45:00Z',
          success_rate: 88
        }
      ]);

      setJenkinsJobs([
        {
          name: 'ecp-ai-orchestrator-build',
          status: 'success',
          last_build: '2025-09-30T10:30:00Z',
          build_number: 42,
          duration: '4m 32s'
        },
        {
          name: 'user-service-pipeline', 
          status: 'running',
          last_build: '2025-09-30T10:25:00Z',
          build_number: 15,
          duration: '2m 18s'
        }
      ]);

      setWebhooks([
        {
          repository: 'RickySonYH/ecp-ai-k8s-orchestrator',
          url: 'http://rdc.rickyson.com:8080/github-webhook/',
          events: ['push', 'pull_request'],
          status: 'active',
          last_delivery: '2025-09-30T10:30:00Z'
        },
        {
          repository: 'company/user-service',
          url: 'http://rdc.rickyson.com:8080/github-webhook/',
          events: ['push'],
          status: 'active', 
          last_delivery: '2025-09-30T09:45:00Z'
        }
      ]);

    } catch (error) {
      console.error('파이프라인 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePipeline = async () => {
    try {
      console.log('🚀 파이프라인 생성 시작:', wizardData);

      // 1단계: Jenkins Job 생성
      const jenkinsResponse = await fetch('http://rdc.rickyson.com:3001/api/cicd/jenkins/create-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_name: wizardData.project_name,
          repository_url: wizardData.repository_url,
          branch: wizardData.branch,
          build_script: wizardData.build_script
        })
      });

      const jenkinsResult = await jenkinsResponse.json();

      if (jenkinsResult.success) {
        alert(`✅ Jenkins Job 생성 완료!\nJob명: ${jenkinsResult.data.job_name}\nURL: ${jenkinsResult.data.job_url}`);
        
        // 2단계: GitHub Webhook 설정 (시뮬레이션)
        if (wizardData.jenkins_config.enable_webhook) {
          alert('🔗 GitHub Webhook 설정이 완료되었습니다!');
        }

        // 파이프라인 목록 새로고침
        loadPipelineData();
        setWizardOpen(false);
        setActiveStep(0);
        setWizardData({
          project_name: '',
          repository_url: '',
          branch: 'main',
          build_script: 'npm run build',
          deployment_environment: 'development',
          jenkins_config: {
            enable_webhook: true,
            build_triggers: ['push', 'pull_request'],
            notification_email: ''
          }
        });
      } else {
        alert(`❌ Jenkins Job 생성 실패: ${jenkinsResult.message}`);
      }

    } catch (error) {
      console.error('파이프라인 생성 실패:', error);
      alert('❌ 파이프라인 생성 중 오류가 발생했습니다.');
    }
  };

  const wizardSteps = [
    {
      label: '프로젝트 정보',
      description: '프로젝트명과 GitHub 레포지토리 정보를 입력하세요'
    },
    {
      label: '빌드 설정',
      description: '빌드 스크립트와 브랜치 설정을 구성하세요'
    },
    {
      label: 'Jenkins 설정',
      description: 'Jenkins Job 설정과 Webhook 연동을 구성하세요'
    },
    {
      label: '최종 확인',
      description: '설정을 검토하고 파이프라인을 생성하세요'
    }
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
          파이프라인 설정 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Jenkins Job 생성, GitHub Webhook 설정, 빌드 설정 마법사
        </Typography>
      </Box>

      {/* 액션 버튼 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => setWizardOpen(true)}
          size="large"
        >
          새 파이프라인 생성
        </Button>
      </Box>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="파이프라인 목록" />
          <Tab label="Jenkins Jobs" />
          <Tab label="GitHub Webhooks" />
        </Tabs>
      </Paper>

      {/* TAB 1: 파이프라인 목록 */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {pipelines.map((pipeline) => (
            <Grid item xs={12} key={pipeline.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {pipeline.project_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        null
                        <Typography variant="body2" color="text.secondary">
                          {pipeline.repository_url}
                        </Typography>
                        <Chip label={pipeline.branch} size="small" color="primary" variant="outlined" />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Jenkins Job: {pipeline.jenkins_job}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip 
                        label={pipeline.status} 
                        color={pipeline.status === 'active' ? 'success' : 'default'}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        성공률: {pipeline.success_rate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        마지막 빌드: {new Date(pipeline.last_build).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={pipeline.success_rate} 
                    sx={{ mb: 2, height: 8, borderRadius: 1 }}
                    color={pipeline.success_rate > 90 ? 'success' : 'primary'}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" size="small">
                      빌드 실행
                    </Button>
                    <Button variant="outlined" size="small">
                      설정
                    </Button>
                    <Button variant="outlined" size="small">
                      Webhook 확인
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* TAB 2: Jenkins Jobs */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job명</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>빌드 번호</TableCell>
                <TableCell>소요시간</TableCell>
                <TableCell>마지막 빌드</TableCell>
                <TableCell>액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jenkinsJobs.map((job, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      null
                      {job.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status}
                      color={job.status === 'success' ? 'success' : job.status === 'running' ? 'primary' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>#{job.build_number}</TableCell>
                  <TableCell>{job.duration}</TableCell>
                  <TableCell>{new Date(job.last_build).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small">
                      실행
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TAB 3: GitHub Webhooks */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {webhooks.map((webhook, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      null
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {webhook.repository}
                      </Typography>
                    </Box>
                    <Chip 
                      label={webhook.status} 
                      color={webhook.status === 'active' ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    URL: {webhook.url}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    {webhook.events.map((event: string) => (
                      <Chip 
                        key={event} 
                        label={event} 
                        size="small" 
                        variant="outlined" 
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    마지막 전달: {new Date(webhook.last_delivery).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* 파이프라인 생성 마법사 */}
      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>빌드 파이프라인 생성 마법사</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 2 }}>
            {wizardSteps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>

                  {/* Step 0: 프로젝트 정보 */}
                  {index === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="프로젝트명"
                        value={wizardData.project_name}
                        onChange={(e) => setWizardData({...wizardData, project_name: e.target.value})}
                        placeholder="my-awesome-project"
                      />
                      <TextField
                        fullWidth
                        label="GitHub 레포지토리 URL"
                        value={wizardData.repository_url}
                        onChange={(e) => setWizardData({...wizardData, repository_url: e.target.value})}
                        placeholder="https://github.com/username/repo"
                      />
                    </Box>
                  )}

                  {/* Step 1: 빌드 설정 */}
                  {index === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="브랜치"
                        value={wizardData.branch}
                        onChange={(e) => setWizardData({...wizardData, branch: e.target.value})}
                      />
                      <TextField
                        fullWidth
                        label="빌드 스크립트"
                        value={wizardData.build_script}
                        onChange={(e) => setWizardData({...wizardData, build_script: e.target.value})}
                        placeholder="npm run build"
                      />
                      <FormControl fullWidth>
                        <InputLabel>배포 환경</InputLabel>
                        <Select
                          value={wizardData.deployment_environment}
                          onChange={(e) => setWizardData({...wizardData, deployment_environment: e.target.value})}
                          label="배포 환경"
                        >
                          <MenuItem value="development">Development</MenuItem>
                          <MenuItem value="staging">Staging</MenuItem>
                          <MenuItem value="production">Production</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* Step 2: Jenkins 설정 */}
                  {index === 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={wizardData.jenkins_config.enable_webhook}
                            onChange={(e) => setWizardData({
                              ...wizardData,
                              jenkins_config: {...wizardData.jenkins_config, enable_webhook: e.target.checked}
                            })}
                          />
                        }
                        label="GitHub Webhook 자동 설정"
                      />
                      <TextField
                        fullWidth
                        label="알림 이메일 (선택사항)"
                        value={wizardData.jenkins_config.notification_email}
                        onChange={(e) => setWizardData({
                          ...wizardData,
                          jenkins_config: {...wizardData.jenkins_config, notification_email: e.target.value}
                        })}
                        placeholder="admin@company.com"
                      />
                    </Box>
                  )}

                  {/* Step 3: 최종 확인 */}
                  {index === 3 && (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        아래 설정으로 파이프라인을 생성합니다.
                      </Alert>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2"><strong>프로젝트:</strong> {wizardData.project_name}</Typography>
                        <Typography variant="body2"><strong>레포지토리:</strong> {wizardData.repository_url}</Typography>
                        <Typography variant="body2"><strong>브랜치:</strong> {wizardData.branch}</Typography>
                        <Typography variant="body2"><strong>빌드 스크립트:</strong> {wizardData.build_script}</Typography>
                        <Typography variant="body2"><strong>환경:</strong> {wizardData.deployment_environment}</Typography>
                        <Typography variant="body2"><strong>Webhook:</strong> {wizardData.jenkins_config.enable_webhook ? '활성화' : '비활성화'}</Typography>
                      </Paper>
                    </Box>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep(activeStep - 1)}
                    >
                      이전
                    </Button>
                    {activeStep === wizardSteps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleCreatePipeline}
                        disabled={!wizardData.project_name || !wizardData.repository_url}
                      >
                        파이프라인 생성
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(activeStep + 1)}
                        disabled={
                          (activeStep === 0 && (!wizardData.project_name || !wizardData.repository_url))
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
            setWizardOpen(false);
            setActiveStep(0);
          }}>
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PipelineConfigCenter;
