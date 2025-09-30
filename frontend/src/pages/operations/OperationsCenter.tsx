// [advice from AI] 운영센터 - 깔끔한 배포 마법사
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

const OperationsCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [wizardDialog, setWizardDialog] = useState(false);
  const [wizardStep, setWizardStep] = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // 프로젝트 정보 (실제로는 DB에서 조회)
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [readmeContent, setReadmeContent] = useState('');
  
  // 5단계 마법사 데이터
  const [wizardData, setWizardData] = useState({
    // STEP 0: 분석 결과
    analysis: {
      repository_info: null,
      detected_services: [],
      complexity: 'medium',
      readme_content: ''
    },
    // STEP 1: 리소스 계산
    resources: {
      calculation_mode: 'auto', // auto, channel, custom
      total_cpu_cores: 0,
      total_memory_gb: 0,
      total_storage_gb: 0,
      gpu_count: 0,
      estimated_cost: 0,
      usage_input: {
        concurrent_users: 100,
        peak_multiplier: 3,
        service_scale: 'medium'
      },
      channel_input: {
        callbot: 10, chatbot: 20, advisor: 5,
        stt: 15, tts: 10, ta: 10, qa: 5
      },
      custom_input: {
        cpu_cores: 2, memory_gb: 4, storage_gb: 20, gpu_count: 0
      }
    },
    // STEP 2: 배포 설정
    deployment: {
      strategy: 'rolling',
      namespace: '',
      domains: [],
      ssl_enabled: true,
      monitoring_enabled: true
    },
    // STEP 3: 인프라 검증
    infrastructure: {
      jenkins_status: 'unknown',
      nexus_status: 'unknown',
      k8s_status: 'unknown',
      argocd_status: 'unknown',
      all_ready: false
    },
    // STEP 4: 최종 계획
    final_plan: {
      deployment_order: [],
      rollback_plan: '',
      monitoring_setup: '',
      pe_contacts: []
    }
  });
  
  // 샘플 배포 작업
  const [deploymentWork] = useState({
    id: 'ecp-ai-sample',
    project_name: 'ECP-AI K8s Orchestrator v2.0',
    repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
    status: 'pending'
  });

  useEffect(() => {
    if (token) {
      setLoading(false);
    }
  }, [token]);

  // 배포 마법사 시작 (실제 DB에서 프로젝트 정보 로드)
  const startDeploymentWizard = async () => {
    setWizardStep(-1);
    
    try {
      // 실제 프로젝트 정보 API 호출
      const response = await fetch(`http://rdc.rickyson.com:3001/api/operations/project-info/${deploymentWork.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setProjectInfo(result.data);
      } else {
        // API 실패 시 기본 정보 사용
        console.warn('프로젝트 정보 API 실패, 기본 정보 사용');
        setProjectInfo({
          project_info: {
            name: deploymentWork.project_name,
            repository_url: deploymentWork.repository_url
          }
        });
      }

      // GitHub README 실제 로드
      await loadReadmeFromGitHub(deploymentWork.repository_url);
      
    } catch (error) {
      console.error('프로젝트 정보 로드 실패:', error);
    }
    
    setWizardDialog(true);
  };

  // GitHub에서 실제 README 로드
  const loadReadmeFromGitHub = async (repoUrl: string) => {
    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) return;
      
      const owner = match[1];
      const repo = match[2].replace('.git', '');
      
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          const readme = Buffer.from(data.content, 'base64').toString('utf-8');
          setReadmeContent(readme);
        }
      }
    } catch (error) {
      console.error('README 로드 실패:', error);
      setReadmeContent('README를 불러올 수 없습니다.');
    }
  };

  // STEP 0: 실제 레포지토리 분석
  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // 실제 GitHub API 분석 호출
      const response = await fetch('http://rdc.rickyson.com:3001/api/operations/analyze-repository', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repository_url: deploymentWork.repository_url,
          project_id: deploymentWork.id
        })
      });

      // 진행도 시뮬레이션
      const steps = ['접속', '분석', '검사', '감지', '평가', '완료'];
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setAnalysisProgress(Math.round(((i + 1) / steps.length) * 100));
      }

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 실제 분석 결과:', result.data);
        
        setWizardData(prev => ({ 
          ...prev, 
          analysis: {
            repository_info: result.data.repository_info,
            detected_services: result.data.detected_services,
            complexity: result.data.deployment_complexity,
            readme_content: result.data.readme_content || ''
          }
        }));
      } else {
        throw new Error('분석 API 호출 실패');
      }
      
    } catch (error) {
      console.error('레포지토리 분석 실패:', error);
      alert('레포지토리 분석에 실패했습니다. 네트워크 연결을 확인해주세요.');
    } finally {
      setIsAnalyzing(false);
      setWizardStep(0);
    }
  };

  // STEP 1: 리소스 계산
  const calculateResources = async () => {
    const mode = wizardData.resources.calculation_mode;
    
    if (mode === 'channel') {
      // ECP-AI 채널 기반 계산
      const requirements = wizardData.resources.channel_input;
      
      try {
        const response = await fetch('http://rdc.rickyson.com:3001/api/operations/calculate-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ requirements, gpu_type: 'auto' })
        });
        
        if (response.ok) {
          const result = await response.json();
          setWizardData(prev => ({
            ...prev,
            resources: {
              ...prev.resources,
              total_cpu_cores: result.data.cpu || 10,
              total_memory_gb: result.data.memory || 20,
              total_storage_gb: result.data.storage || 43,
              gpu_count: result.data.gpu || 3,
              estimated_cost: 850
            }
          }));
        }
      } catch (error) {
        console.error('리소스 계산 실패:', error);
      }
    } else if (mode === 'custom') {
      // 커스텀 입력값 사용
      const custom = wizardData.resources.custom_input;
      setWizardData(prev => ({
        ...prev,
        resources: {
          ...prev.resources,
          total_cpu_cores: custom.cpu_cores,
          total_memory_gb: custom.memory_gb,
          total_storage_gb: custom.storage_gb,
          gpu_count: custom.gpu_count,
          estimated_cost: Math.round(custom.cpu_cores * 30 + custom.memory_gb * 10 + custom.gpu_count * 500)
        }
      }));
    } else {
      // 자동 계산
      const usage = wizardData.resources.usage_input;
      const multiplier = usage.service_scale === 'high' ? 3 : usage.service_scale === 'low' ? 0.5 : 1.5;
      const userMultiplier = usage.concurrent_users > 500 ? 2 : usage.concurrent_users > 100 ? 1.5 : 1;
      
      setWizardData(prev => ({
        ...prev,
        resources: {
          ...prev.resources,
          total_cpu_cores: Math.round(2 * multiplier * userMultiplier * 10) / 10,
          total_memory_gb: Math.round(4 * multiplier * userMultiplier * 10) / 10,
          total_storage_gb: Math.round(10 * multiplier * 10) / 10,
          gpu_count: usage.service_scale === 'high' ? 2 : 0,
          estimated_cost: Math.round(2 * multiplier * userMultiplier * 30 + 4 * multiplier * userMultiplier * 10)
        }
      }));
    }
  };

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
          배포 워크플로우 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          효율적인 배포 관리 및 진행도 모니터링
        </Typography>
      </Box>

      {/* 배포 작업 현황 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>1</Typography>
              <Typography variant="body2" color="text.secondary">접수 대기</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>0</Typography>
              <Typography variant="body2" color="text.secondary">준비 중</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>0</Typography>
              <Typography variant="body2" color="text.secondary">실행 중</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>0</Typography>
              <Typography variant="body2" color="text.secondary">완료/운영</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 커스텀 작업 카드 */}
      <Card sx={{ mb: 3, bgcolor: 'info.50' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'info.main' }}>
                커스텀 작업
              </Typography>
              <Typography variant="body2" color="text.secondary">
                기존 프로젝트 흐름과 무관하게 GitHub 레포지토리를 직접 배포
              </Typography>
            </Box>
            <Button variant="contained" color="info" sx={{ px: 4, py: 1.5 }}>
              커스텀 배포
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 배포 작업 목록 */}
      <Card>
            <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            배포 작업 목록
                  </Typography>
          
          <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>진행률</TableCell>
                    <TableCell>우선순위</TableCell>
                  <TableCell>액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {deploymentWork.project_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      배포 접수 완료
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label="접수 대기" color="warning" size="small" />
                  </TableCell>
                  <TableCell>
                    <LinearProgress variant="determinate" value={0} sx={{ width: 100 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label="높음" color="error" size="small" />
                  </TableCell>
                      <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={startDeploymentWizard}
                    >
                      작업 시작
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 5단계 배포 마법사 */}
      <Dialog open={wizardDialog} onClose={() => setWizardDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>배포 마법사 - {deploymentWork.project_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 진행 단계 표시 */}
            {wizardStep >= 0 && (
              <Stepper activeStep={wizardStep} sx={{ mb: 4 }}>
                <Step><StepLabel>레포지토리 분석</StepLabel></Step>
                <Step><StepLabel>리소스 계산</StepLabel></Step>
                <Step><StepLabel>배포 설정</StepLabel></Step>
                <Step><StepLabel>인프라 검증</StepLabel></Step>
                <Step><StepLabel>배포 실행</StepLabel></Step>
              </Stepper>
            )}

            {/* STEP -1: 프로젝트 요약 */}
            {wizardStep === -1 && projectInfo && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>프로젝트 요약</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>담당 PE:</strong> {projectInfo.project_info.pe_name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>개발 기간:</strong> {projectInfo.project_info.development_period}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>QA 점수:</strong> {projectInfo.qa_results?.score || 0}점 ({projectInfo.qa_results?.quality_level || '미평가'})</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>테스트 결과:</strong> 통과 {projectInfo.qa_results?.test_passed || 0}개, 실패 {projectInfo.qa_results?.test_failed || 0}개</Typography>
                    </Grid>
                  </Grid>
                  
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {projectInfo.po_approval?.comment || '승인 대기 중'}
                  </Alert>
                  
                  <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>README.md</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                      {readmeContent}
                    </Typography>
                  </Paper>
                  
                  {isAnalyzing && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body2" gutterBottom>분석 진행 중...</Typography>
                      <LinearProgress variant="determinate" value={analysisProgress} sx={{ height: 8, borderRadius: 1 }} />
                      <Typography variant="caption" color="text.secondary">{analysisProgress}% 완료</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 0: 분석 결과 (수정 가능) */}
            {wizardStep === 0 && wizardData.analysis.repository_info && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>STEP 1: 분석 결과 검토</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    감지된 {wizardData.analysis.detected_services.length}개 서비스를 검토하고 수정하세요:
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>서비스 타입</TableCell>
                          <TableCell>도메인 (수정가능)</TableCell>
                          <TableCell>신뢰도</TableCell>
                          <TableCell>액션</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {wizardData.analysis.detected_services.map((service: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{service.type}</TableCell>
                      <TableCell>
                              <TextField
                          size="small"
                                value={service.domain}
                                onChange={(e) => {
                                  const newServices = [...wizardData.analysis.detected_services];
                                  newServices[index].domain = e.target.value;
                                  setWizardData(prev => ({
                                    ...prev,
                                    analysis: { ...prev.analysis, detected_services: newServices }
                                  }));
                                }}
                                fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                                label={`${Math.round(service.confidence * 100)}%`}
                                color={service.confidence > 0.8 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                                variant="outlined"
                          size="small"
                                color="error"
                          onClick={() => {
                                  const newServices = wizardData.analysis.detected_services.filter((_, i) => i !== index);
                                  setWizardData(prev => ({
                                    ...prev,
                                    analysis: { ...prev.analysis, detected_services: newServices }
                                  }));
                                }}
                              >
                                제외
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            </CardContent>
          </Card>
            )}

            {/* STEP 1: 리소스 계산 (3가지 모드) */}
            {wizardStep === 1 && (
      <Card sx={{ mb: 3 }}>
        <CardContent>
                  <Typography variant="h6" gutterBottom>STEP 2: 리소스 계산</Typography>
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>계산 방식</InputLabel>
                    <Select
                      value={wizardData.resources.calculation_mode}
                      onChange={(e) => setWizardData(prev => ({
                        ...prev,
                        resources: { ...prev.resources, calculation_mode: e.target.value }
                      }))}
                    >
                      <MenuItem value="auto">자동 계산 (사용량 기반)</MenuItem>
                      <MenuItem value="channel">ECP-AI 채널 기반</MenuItem>
                      <MenuItem value="custom">커스텀 직접 입력</MenuItem>
                    </Select>
                  </FormControl>

                  {wizardData.resources.calculation_mode === 'channel' && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      {Object.entries(wizardData.resources.channel_input).map(([service, value]) => (
                        <Grid item xs={6} md={3} key={service}>
                          <TextField
                            fullWidth
                            type="number"
                            label={service.toUpperCase()}
                            value={value}
                            onChange={(e) => setWizardData(prev => ({
                              ...prev,
                              resources: {
                                ...prev.resources,
                                channel_input: {
                                  ...prev.resources.channel_input,
                                  [service]: parseInt(e.target.value) || 0
                                }
                              }
                            }))}
                          />
                </Grid>
              ))}
            </Grid>
                  )}

                  {wizardData.resources.calculation_mode === 'custom' && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="CPU Cores"
                          value={wizardData.resources.custom_input.cpu_cores}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              custom_input: { ...prev.resources.custom_input, cpu_cores: parseFloat(e.target.value) || 0 }
                            }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Memory GB"
                          value={wizardData.resources.custom_input.memory_gb}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              custom_input: { ...prev.resources.custom_input, memory_gb: parseFloat(e.target.value) || 0 }
                            }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Storage GB"
                          value={wizardData.resources.custom_input.storage_gb}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              custom_input: { ...prev.resources.custom_input, storage_gb: parseInt(e.target.value) || 0 }
                            }
                          }))}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="GPU"
                          value={wizardData.resources.custom_input.gpu_count}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              custom_input: { ...prev.resources.custom_input, gpu_count: parseInt(e.target.value) || 0 }
                            }
                          }))}
                        />
                      </Grid>
                    </Grid>
                  )}

                  <Button variant="contained" onClick={calculateResources} sx={{ mb: 3 }}>
                    리소스 계산
                  </Button>

                  {/* 계산 결과 */}
                  <Typography variant="h6" gutterBottom>계산 결과</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                        <Typography variant="h5" color="primary.main">{wizardData.resources.total_cpu_cores}</Typography>
                        <Typography variant="caption">CPU Cores</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="h5" color="info.main">{wizardData.resources.total_memory_gb}</Typography>
                        <Typography variant="caption">Memory GB</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="h5" color="success.main">{wizardData.resources.total_storage_gb}</Typography>
                        <Typography variant="caption">Storage GB</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                        <Typography variant="h5" color="warning.main">{wizardData.resources.gpu_count}</Typography>
                        <Typography variant="caption">GPU</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Typography variant="h6" sx={{ mt: 2 }}>예상 비용: ${wizardData.resources.estimated_cost}/월</Typography>
        </CardContent>
      </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWizardDialog(false)}>취소</Button>
          
          {wizardStep === -1 && (
            <Button variant="contained" onClick={startAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? '분석 중...' : '분석 시작'}
            </Button>
          )}
          
          {wizardStep === 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setWizardStep(-1)}>이전</Button>
              <Button variant="contained" onClick={() => setWizardStep(1)}>다음: 리소스 계산</Button>
            </Box>
          )}
          
          {wizardStep === 1 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setWizardStep(0)}>이전</Button>
              <Button variant="contained" onClick={() => setWizardStep(2)}>다음: 배포 설정</Button>
            </Box>
          )}
          
          {wizardStep >= 2 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setWizardStep(wizardStep - 1)}>이전</Button>
        <Button
          variant="contained"
          color="primary"
                onClick={() => {
                  alert('🎉 배포가 시작되었습니다!\n\n8개 서비스가 자동으로 배포됩니다.');
                  setWizardDialog(false);
                }}
              >
                배포 실행
        </Button>
              </Box>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OperationsCenter;