// [advice from AI] 통합 배포 실행 센터 - 요청 기반 자동 5단계 진행 (친절한 설명 + 수정 가능)
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Stepper, Step, StepLabel, StepContent,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Divider,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip
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

const IntegratedDeploymentCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // 배포 요청 목록
  const [deploymentRequests, setDeploymentRequests] = useState<any[]>([]);
  const [activeDeployments, setActiveDeployments] = useState<any[]>([]);
  
  // 통합 배포 마법사
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 5단계 마법사 데이터
  const [wizardData, setWizardData] = useState({
    // 프로젝트 정보
    project: {
      name: '',
      repository_url: '',
      branch: 'main',
      description: '',
      readme_content: ''
    },
    // STEP 1: 레포지토리 분석
    analysis: {
      detected_services: [] as any[],
      framework: '',
      language: '',
      complexity: 'medium',
      estimated_build_time: '5-10분',
      dependencies: [] as string[],
      docker_detected: false,
      k8s_manifests_detected: false
    },
    // STEP 2: 리소스 계산
    resources: {
      calculation_mode: 'auto', // auto, channel, custom
      usage_requirements: {
        expected_concurrent_users: 100,
        peak_traffic_multiplier: 3,
        daily_requests: 10000,
        service_scale: 'medium'
      },
      channel_requirements: {
        callbot: 10, chatbot: 20, advisor: 5,
        stt: 15, tts: 10, ta: 10, qa: 5
      },
      custom_requirements: {
        cpu_cores: 2, memory_gb: 4, storage_gb: 20, gpu_count: 0
      },
      calculated_resources: {
        total_cpu_cores: 0,
        total_memory_gb: 0,
        total_storage_gb: 0,
        gpu_count: 0,
        estimated_cost_monthly: 0,
        instance_recommendations: {
          aws: '', azure: '', gcp: ''
        }
      }
    },
    // STEP 3: 배포 설정
    deployment: {
      target_environment: 'development',
      namespace: '',
      deployment_strategy: 'rolling',
      replicas: 3,
      domains: [] as string[],
      ssl_enabled: true,
      auto_scaling: {
        enabled: true,
        min_replicas: 1,
        max_replicas: 10,
        cpu_threshold: 70
      },
      health_check: {
        path: '/health',
        initial_delay: 30,
        period: 10
      }
    },
    // STEP 4: 인프라 검증
    infrastructure: {
      jenkins_status: 'checking',
      nexus_status: 'checking',
      k8s_status: 'checking',
      argocd_status: 'checking',
      all_systems_ready: false,
      verification_details: {} as any
    },
    // STEP 5: 최종 배포 계획
    final_plan: {
      deployment_order: [] as string[],
      estimated_duration: '',
      rollback_plan: '',
      monitoring_setup: '',
      pe_contacts: [] as string[],
      approval_required: false
    }
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
      const [requestsRes, activeRes] = await Promise.all([
        fetch('http://rdc.rickyson.com:3001/api/deployment-requests?status=pending_operations', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://rdc.rickyson.com:3001/api/deployment/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // API 응답 처리 (실패 시 빈 배열)
      const requestsData = requestsRes.ok ? await requestsRes.json() : { success: false, data: [] };
      const activeData = activeRes.ok ? await activeRes.json() : { success: false, data: [] };

      setDeploymentRequests(requestsData.success ? requestsData.data : []);
      setActiveDeployments(activeData.success ? activeData.data : []);

    } catch (error) {
      console.error('배포 데이터 로드 실패:', error);
      setDeploymentRequests([]);
      setActiveDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  // 배포 마법사 시작
  const startDeploymentWizard = async (request: any) => {
    setSelectedRequest(request);
    setWizardData({
      ...wizardData,
      project: {
        name: request.project_name || 'Unknown Project',
        repository_url: request.repository_url || '',
        branch: request.branch || 'main',
        description: request.description || '',
        readme_content: ''
      }
    });
    setCurrentStep(0);
    setWizardOpen(true);
    
    // 프로젝트 정보 로드
    await loadProjectInfo(request);
  };

  const loadProjectInfo = async (request: any) => {
    try {
      // 실제 프로젝트 정보 API 호출
      const response = await fetch(`http://rdc.rickyson.com:3001/api/operations/project-info/${request.project_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWizardData(prev => ({
            ...prev,
            project: {
              ...prev.project,
              ...result.data
            }
          }));
        }
      }
    } catch (error) {
      console.error('프로젝트 정보 로드 실패:', error);
    }
  };

  // STEP 1: 레포지토리 분석
  const analyzeRepository = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('http://rdc.rickyson.com:3001/api/operations/analyze-repository', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repository_url: wizardData.project.repository_url,
          branch: wizardData.project.branch
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWizardData(prev => ({
            ...prev,
            analysis: {
              ...prev.analysis,
              ...result.data
            }
          }));
        }
      }
    } catch (error) {
      console.error('레포지토리 분석 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 2: 리소스 계산
  const calculateResources = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('http://rdc.rickyson.com:3001/api/operations/calculate-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          services: wizardData.analysis.detected_services,
          calculation_mode: wizardData.resources.calculation_mode,
          usage_requirements: wizardData.resources.usage_requirements,
          channel_requirements: wizardData.resources.channel_requirements,
          custom_requirements: wizardData.resources.custom_requirements
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWizardData(prev => ({
            ...prev,
            resources: {
              ...prev.resources,
              calculated_resources: result.data
            }
          }));
        }
      }
    } catch (error) {
      console.error('리소스 계산 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 3: 배포 설정 생성
  const generateDeploymentConfig = async () => {
    setIsProcessing(true);
    try {
      const namespace = `${wizardData.project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${wizardData.deployment.target_environment}`;
      const domains = wizardData.analysis.detected_services.map((service: any) => 
        `${service.name}.${wizardData.deployment.target_environment}.rdc.rickyson.com`
      );

      setWizardData(prev => ({
        ...prev,
        deployment: {
          ...prev.deployment,
          namespace,
          domains
        }
      }));
    } catch (error) {
      console.error('배포 설정 생성 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 4: 인프라 검증
  const verifyInfrastructure = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('http://rdc.rickyson.com:3001/api/operations/verify-infrastructure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_environment: wizardData.deployment.target_environment,
          required_resources: wizardData.resources.calculated_resources
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWizardData(prev => ({
            ...prev,
            infrastructure: {
              ...prev.infrastructure,
              ...result.data
            }
          }));
        }
      }
    } catch (error) {
      console.error('인프라 검증 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 5: 최종 배포 실행
  const executeDeployment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('http://rdc.rickyson.com:3001/api/operations/execute-deployment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: selectedRequest?.id,
          wizard_data: wizardData
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('✅ 배포가 성공적으로 시작되었습니다!');
          setWizardOpen(false);
          loadDeploymentData();
        } else {
          alert(`❌ 배포 실행 실패: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('배포 실행 실패:', error);
      alert('❌ 배포 실행 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextStep = async () => {
    switch (currentStep) {
      case 0: await analyzeRepository(); break;
      case 1: await calculateResources(); break;
      case 2: await generateDeploymentConfig(); break;
      case 3: await verifyInfrastructure(); break;
      case 4: await executeDeployment(); return null; // 마지막 단계
    }
    setCurrentStep(currentStep + 1);
  };

  const wizardSteps = [
    {
      label: '레포지토리 분석',
      description: 'GitHub 레포지토리를 분석하여 서비스 구조와 의존성을 파악합니다'
    },
    {
      label: '리소스 계산',
      description: '하드웨어 계산기를 통해 필요한 CPU, 메모리, 스토리지를 계산합니다'
    },
    {
      label: '배포 설정',
      description: 'Kubernetes 배포 설정과 도메인, SSL 등을 구성합니다'
    },
    {
      label: '인프라 검증',
      description: 'Jenkins, Nexus, Argo CD 등 필요한 인프라가 준비되었는지 확인합니다'
    },
    {
      label: '배포 실행',
      description: '최종 검토 후 자동 배포 파이프라인을 실행합니다'
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
          통합 배포 실행 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          배포 요청 → 자동 5단계 진행 → 완료 (원스톱 배포 시스템)
        </Typography>
      </Box>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="배포 요청 목록" />
          <Tab label="진행 중인 배포" />
          <Tab label="배포 히스토리" />
        </Tabs>
      </Paper>

      {/* TAB 1: 배포 요청 목록 */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            PO에서 승인된 배포 요청들입니다. "배포 시작" 버튼을 클릭하면 자동으로 5단계 배포 프로세스가 진행됩니다.
          </Alert>
        </Box>

        {deploymentRequests.length === 0 ? (
          <Alert severity="info">현재 대기 중인 배포 요청이 없습니다.</Alert>
        ) : (
          <Grid container spacing={3}>
            {deploymentRequests.map((request) => (
              <Grid item xs={12} key={request.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {request.project_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip label={request.priority} size="small" color="primary" />
                          <Chip label={request.target_environment} size="small" color="secondary" />
                          <Chip label={request.status} size="small" color="warning" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          요청자: {request.requested_by} • 요청일: {new Date(request.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => startDeploymentWizard(request)}
                      >
                        배포 시작
                      </Button>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>GitHub 레포지토리:</strong> {request.repository_url}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>브랜치:</strong> {request.branch || 'main'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>설명:</strong> {request.description || '설명 없음'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* TAB 2: 진행 중인 배포 */}
      <TabPanel value={tabValue} index={1}>
        {activeDeployments.length === 0 ? (
          <Alert severity="info">현재 진행 중인 배포가 없습니다.</Alert>
        ) : (
          <Grid container spacing={3}>
            {activeDeployments.map((deployment) => (
              <Grid item xs={12} key={deployment.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {deployment.project_name}
                      </Typography>
                      <Chip 
                        label={deployment.status} 
                        color={deployment.status === 'deploying' ? 'primary' : 'success'}
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">배포 진행률</Typography>
                        <Typography variant="body2">{deployment.progress}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={deployment.progress} 
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      현재 단계: {deployment.current_phase} • 시작: {new Date(deployment.started_at).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* 통합 배포 마법사 */}
      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            null
            <Typography variant="h6">
              통합 배포 마법사 - {wizardData.project.name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 진행 단계 표시 */}
            <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
              {wizardSteps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel 
                    optional={
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    }
                  >
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* STEP 0: 레포지토리 분석 */}
            {currentStep === 0 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>📋 레포지토리 분석 단계</strong><br/>
                    GitHub 레포지토리를 분석하여 서비스 구조, 프레임워크, 의존성을 자동으로 파악합니다.
                    분석 결과를 검토하고 필요시 수정할 수 있습니다.
                  </Typography>
                </Alert>

                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                       프로젝트 정보
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="프로젝트명"
                          value={wizardData.project.name}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            project: { ...prev.project, name: e.target.value }
                          }))}
                          helperText="배포될 서비스의 이름입니다"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="브랜치"
                          value={wizardData.project.branch}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            project: { ...prev.project, branch: e.target.value }
                          }))}
                          helperText="빌드할 Git 브랜치를 지정하세요"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="GitHub 레포지토리 URL"
                          value={wizardData.project.repository_url}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            project: { ...prev.project, repository_url: e.target.value }
                          }))}
                          helperText="분석할 GitHub 레포지토리 주소입니다"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {wizardData.analysis.detected_services.length > 0 && (
                  <Accordion>
                    <AccordionSummary>
                      <Typography variant="h6">🔍 분석 결과</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>감지된 서비스:</strong> {wizardData.analysis.detected_services.length}개
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>프레임워크:</strong> {wizardData.analysis.framework}
                          </Typography>
                          <Typography variant="body2">
                            <strong>예상 빌드 시간:</strong> {wizardData.analysis.estimated_build_time}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>복잡도:</strong> {wizardData.analysis.complexity}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Dockerfile:</strong> {wizardData.analysis.docker_detected ? '있음' : '없음'}
                          </Typography>
                          <Typography variant="body2">
                            <strong>K8s 매니페스트:</strong> {wizardData.analysis.k8s_manifests_detected ? '있음' : '없음'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}

            {/* STEP 1: 리소스 계산 */}
            {currentStep === 1 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>💻 리소스 계산 단계</strong><br/>
                    분석된 서비스를 기반으로 필요한 하드웨어 리소스를 계산합니다.
                    계산 방식을 선택하고 필요시 값을 수정할 수 있습니다.
                  </Typography>
                </Alert>

                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>계산 방식 선택</Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>리소스 계산 방식</InputLabel>
                      <Select
                        value={wizardData.resources.calculation_mode}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          resources: { ...prev.resources, calculation_mode: e.target.value }
                        }))}
                        label="리소스 계산 방식"
                      >
                        <MenuItem value="auto">자동 계산 (서비스 분석 기반)</MenuItem>
                        <MenuItem value="channel">ECP-AI 채널 기반</MenuItem>
                        <MenuItem value="custom">커스텀 입력</MenuItem>
                      </Select>
                    </FormControl>

                    {/* 자동 계산 모드 */}
                    {wizardData.resources.calculation_mode === 'auto' && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="예상 동시 사용자"
                            value={wizardData.resources.usage_requirements.expected_concurrent_users}
                            onChange={(e) => setWizardData(prev => ({
                              ...prev,
                              resources: {
                                ...prev.resources,
                                usage_requirements: {
                                  ...prev.resources.usage_requirements,
                                  expected_concurrent_users: parseInt(e.target.value)
                                }
                              }
                            }))}
                            helperText="동시에 서비스를 이용할 사용자 수"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="피크 트래픽 배수"
                            value={wizardData.resources.usage_requirements.peak_traffic_multiplier}
                            onChange={(e) => setWizardData(prev => ({
                              ...prev,
                              resources: {
                                ...prev.resources,
                                usage_requirements: {
                                  ...prev.resources.usage_requirements,
                                  peak_traffic_multiplier: parseInt(e.target.value)
                                }
                              }
                            }))}
                            helperText="평상시 대비 최대 트래픽 배수"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth>
                            <InputLabel>서비스 규모</InputLabel>
                            <Select
                              value={wizardData.resources.usage_requirements.service_scale}
                              onChange={(e) => setWizardData(prev => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  usage_requirements: {
                                    ...prev.resources.usage_requirements,
                                    service_scale: e.target.value
                                  }
                                }
                              }))}
                              label="서비스 규모"
                            >
                              <MenuItem value="small">소규모 (개발/테스트)</MenuItem>
                              <MenuItem value="medium">중간 규모 (스테이징)</MenuItem>
                              <MenuItem value="large">대규모 (프로덕션)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    )}

                    {/* 계산 결과 표시 */}
                    {wizardData.resources.calculated_resources.total_cpu_cores > 0 && (
                      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          💻 계산된 리소스 요구사항
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={3}>
                            <Typography variant="body2">
                              <strong>CPU:</strong> {wizardData.resources.calculated_resources.total_cpu_cores} Cores
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="body2">
                              <strong>메모리:</strong> {wizardData.resources.calculated_resources.total_memory_gb} GB
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="body2">
                              <strong>스토리지:</strong> {wizardData.resources.calculated_resources.total_storage_gb} GB
                            </Typography>
                          </Grid>
                          <Grid item xs={3}>
                            <Typography variant="body2">
                              <strong>예상 비용:</strong> ${wizardData.resources.calculated_resources.estimated_cost_monthly}/월
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* STEP 2: 배포 설정 */}
            {currentStep === 2 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>⚙️ 배포 설정 단계</strong><br/>
                    Kubernetes 배포 설정을 구성합니다. 환경, 네임스페이스, 도메인 등을 설정하고
                    오토스케일링과 헬스체크 옵션을 조정할 수 있습니다.
                  </Typography>
                </Alert>

                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>기본 배포 설정</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>배포 환경</InputLabel>
                          <Select
                            value={wizardData.deployment.target_environment}
                            onChange={(e) => setWizardData(prev => ({
                              ...prev,
                              deployment: { ...prev.deployment, target_environment: e.target.value }
                            }))}
                            label="배포 환경"
                          >
                            <MenuItem value="development">Development (개발)</MenuItem>
                            <MenuItem value="staging">Staging (스테이징)</MenuItem>
                            <MenuItem value="production">Production (운영)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="네임스페이스"
                          value={wizardData.deployment.namespace}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            deployment: { ...prev.deployment, namespace: e.target.value }
                          }))}
                          helperText="Kubernetes 네임스페이스 (자동 생성됨)"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="복제본 수"
                          value={wizardData.deployment.replicas}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            deployment: { ...prev.deployment, replicas: parseInt(e.target.value) }
                          }))}
                          helperText="Pod 복제본 개수 (고가용성)"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* 도메인 설정 */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>도메인 및 네트워크 설정</Typography>
                    <Grid container spacing={2}>
                      {wizardData.deployment.domains.map((domain, index) => (
                        <Grid item xs={12} md={6} key={index}>
                          <TextField
                            fullWidth
                            label={`도메인 ${index + 1}`}
                            value={domain}
                            onChange={(e) => {
                              const newDomains = [...wizardData.deployment.domains];
                              newDomains[index] = e.target.value;
                              setWizardData(prev => ({
                                ...prev,
                                deployment: { ...prev.deployment, domains: newDomains }
                              }));
                            }}
                            helperText="서비스 접속 도메인"
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* STEP 3: 인프라 검증 */}
            {currentStep === 3 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>🔍 인프라 검증 단계</strong><br/>
                    배포에 필요한 인프라(Jenkins, Nexus, Kubernetes, Argo CD)가 
                    정상 작동하는지 확인합니다. 문제가 있으면 자동으로 해결 방안을 제시합니다.
                  </Typography>
                </Alert>

                <Grid container spacing={2}>
                  {[
                    { name: 'Jenkins', status: wizardData.infrastructure.jenkins_status, description: '빌드 서버' },
                    { name: 'Nexus', status: wizardData.infrastructure.nexus_status, description: '이미지 저장소' },
                    { name: 'Kubernetes', status: wizardData.infrastructure.k8s_status, description: '컨테이너 오케스트레이션' },
                    { name: 'Argo CD', status: wizardData.infrastructure.argocd_status, description: 'GitOps 배포' }
                  ].map((infra) => (
                    <Grid item xs={12} md={6} key={infra.name}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="h6">{infra.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {infra.description}
                              </Typography>
                            </Box>
                            <Chip 
                              label={infra.status} 
                              color={
                                infra.status === 'healthy' ? 'success' :
                                infra.status === 'checking' ? 'primary' : 'error'
                              }
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* STEP 4: 최종 배포 계획 */}
            {currentStep === 4 && (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>🚀 최종 배포 실행 단계</strong><br/>
                    모든 설정이 완료되었습니다. 아래 계획을 검토하고 배포를 실행하세요.
                    배포 중 문제가 발생하면 자동으로 담당 PE에게 알림이 전송됩니다.
                  </Typography>
                </Alert>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>📋 최종 배포 계획</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>프로젝트:</strong> {wizardData.project.name}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>환경:</strong> {wizardData.deployment.target_environment}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>네임스페이스:</strong> {wizardData.deployment.namespace}
                        </Typography>
                        <Typography variant="body2">
                          <strong>복제본:</strong> {wizardData.deployment.replicas}개
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>CPU:</strong> {wizardData.resources.calculated_resources.total_cpu_cores} Cores
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>메모리:</strong> {wizardData.resources.calculated_resources.total_memory_gb} GB
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>스토리지:</strong> {wizardData.resources.calculated_resources.total_storage_gb} GB
                        </Typography>
                        <Typography variant="body2">
                          <strong>예상 비용:</strong> ${wizardData.resources.calculated_resources.estimated_cost_monthly}/월
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWizardOpen(false)}>취소</Button>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>이전</Button>
          )}
          <Button
            variant="contained"
            onClick={handleNextStep}
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} /> : 
              currentStep === 4 ? null : null}
          >
            {isProcessing ? '처리 중...' : 
             currentStep === 4 ? '배포 실행' : '다음 단계'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IntegratedDeploymentCenter;
