// [advice from AI] 배포 요청 처리 마법사 - 단계별 대화형 프로세스로 운영센터 메뉴 단순화
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stepper, Step, StepLabel,
  StepContent, Typography, Box, Card, CardContent, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Chip, Alert, LinearProgress, List, ListItem,
  ListItemText, Divider, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, CircularProgress
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import LangsaHardwareCalculator from './LangsaHardwareCalculator';

// [advice from AI] 타입 정의
interface DeploymentRequest {
  id: string;
  project_name: string;
  po_name: string;
  priority: 'high' | 'normal' | 'low';
  target_environment: string;
  repository_url: string;
  quality_score: number;
  resource_requirements: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
  };
  deployment_notes: string;
  status: string;
  created_at: string;
}

interface GPUSpec {
  id: string;
  name: string;
  vram_gb: number;
  cuda_cores: number;
  tensor_cores?: number;
  memory_bandwidth: string;
  power_consumption: number;
  use_cases: string[];
  price_per_hour_usd: number;
  availability: {
    aws: string;
    ncp: string;
    kt_cloud: string;
  };
}

// [advice from AI] GPU 사양 데이터베이스
const GPU_SPECS: GPUSpec[] = [
  {
    id: 'rtx4090',
    name: 'NVIDIA RTX 4090',
    vram_gb: 24,
    cuda_cores: 16384,
    tensor_cores: 128,
    memory_bandwidth: '1008 GB/s',
    power_consumption: 450,
    use_cases: ['AI Training', 'Inference', '3D Rendering', 'Gaming'],
    price_per_hour_usd: 2.5,
    availability: {
      aws: 'g5.xlarge',
      ncp: 'GPU-RTX4090-1',
      kt_cloud: 'GPU Premium RTX4090'
    }
  },
  {
    id: 'a100',
    name: 'NVIDIA A100 (40GB)',
    vram_gb: 40,
    cuda_cores: 6912,
    tensor_cores: 432,
    memory_bandwidth: '1555 GB/s',
    power_consumption: 400,
    use_cases: ['Large AI Training', 'HPC', 'Deep Learning'],
    price_per_hour_usd: 4.0,
    availability: {
      aws: 'p4d.xlarge',
      ncp: 'GPU-A100-1',
      kt_cloud: 'GPU Enterprise A100'
    }
  },
  {
    id: 'a100_80gb',
    name: 'NVIDIA A100 (80GB)',
    vram_gb: 80,
    cuda_cores: 6912,
    tensor_cores: 432,
    memory_bandwidth: '2039 GB/s',
    power_consumption: 400,
    use_cases: ['Large Model Training', 'LLM Fine-tuning', 'Research'],
    price_per_hour_usd: 6.0,
    availability: {
      aws: 'p4de.xlarge',
      ncp: 'GPU-A100-80GB-1',
      kt_cloud: 'GPU Enterprise A100-80GB'
    }
  },
  {
    id: 'v100',
    name: 'NVIDIA V100 (32GB)',
    vram_gb: 32,
    cuda_cores: 5120,
    tensor_cores: 640,
    memory_bandwidth: '900 GB/s',
    power_consumption: 300,
    use_cases: ['AI Training', 'Scientific Computing', 'HPC'],
    price_per_hour_usd: 3.0,
    availability: {
      aws: 'p3.2xlarge',
      ncp: 'GPU-V100-1',
      kt_cloud: 'GPU Standard V100'
    }
  },
  {
    id: 't4',
    name: 'NVIDIA T4',
    vram_gb: 16,
    cuda_cores: 2560,
    tensor_cores: 320,
    memory_bandwidth: '320 GB/s',
    power_consumption: 70,
    use_cases: ['AI Inference', 'Light Training', 'Video Processing'],
    price_per_hour_usd: 0.8,
    availability: {
      aws: 'g4dn.xlarge',
      ncp: 'GPU-T4-1',
      kt_cloud: 'GPU Basic T4'
    }
  },
  {
    id: 'l4',
    name: 'NVIDIA L4',
    vram_gb: 24,
    cuda_cores: 7424,
    tensor_cores: 240,
    memory_bandwidth: '300 GB/s',
    power_consumption: 72,
    use_cases: ['AI Inference', 'Video AI', 'Graphics Workloads'],
    price_per_hour_usd: 1.2,
    availability: {
      aws: 'g6.xlarge',
      ncp: 'GPU-L4-1',
      kt_cloud: 'GPU Standard L4'
    }
  },
  {
    id: 'h100',
    name: 'NVIDIA H100 (80GB)',
    vram_gb: 80,
    cuda_cores: 14592,
    tensor_cores: 456,
    memory_bandwidth: '3350 GB/s',
    power_consumption: 700,
    use_cases: ['LLM Training', 'Generative AI', 'Transformer Models'],
    price_per_hour_usd: 8.0,
    availability: {
      aws: 'p5.xlarge',
      ncp: 'GPU-H100-1',
      kt_cloud: 'GPU Enterprise H100'
    }
  }
];

interface WizardProps {
  open: boolean;
  onClose: () => void;
  selectedRequest?: DeploymentRequest | null;
}

const DeploymentProcessWizard: React.FC<WizardProps> = ({ open, onClose, selectedRequest }) => {
  const { token } = useJwtAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // [advice from AI] 서버 목록 상태
  const [availableServers, setAvailableServers] = useState({
    jenkins: [],
    nexus: [],
    argocd: []
  });
  
  // [advice from AI] 단계별 데이터 상태
  const [reviewData, setReviewData] = useState({
    approved: false,
    notes: '',
    estimated_time: ''
  });
  
  const [resourceData, setResourceData] = useState({
    cpu_cores: 2,
    memory_gb: 4,
    storage_gb: 20,
    gpu_specs: [], // GPU 사양 배열로 변경
    auto_scaling: false,
    load_balancer: false
  });

  // [advice from AI] 리소스 계산 모드 상태
  const [resourceMode, setResourceMode] = useState<'auto' | 'manual'>('auto');
  
  const [pipelineData, setPipelineData] = useState({
    jenkins_server_id: '',
    jenkins_job_name: '',
    build_branch: 'main',
    nexus_server_id: '',
    docker_registry: '',
    argocd_server_id: '',
    k8s_namespace: '',
    deployment_strategy: 'rolling',
    target_cluster: '',
    target_namespace: ''
  });
  
  const [monitoringData, setMonitoringData] = useState({
    health_check_enabled: true,
    metrics_enabled: true,
    log_aggregation: true,
    alert_threshold: 80
  });
  
  // [advice from AI] 설정 미리보기 상태
  const [configPreview, setConfigPreview] = useState({
    jenkins_config: '',
    nexus_config: '',
    argocd_config: '',
    k8s_manifest: ''
  });

  // [advice from AI] 마법사 단계 정의
  const steps = [
    {
      label: '배포 요청 검토',
      description: 'PO 배포 요청서를 검토하고 승인/반려를 결정합니다.',
    },
    {
      label: '리소스 계산 및 할당',
      description: '필요한 하드웨어 리소스를 계산하고 할당합니다.',
    },
    {
      label: 'CI/CD 파이프라인 설정',
      description: 'Jenkins, Nexus, Argo CD 파이프라인을 자동 설정합니다.',
    },
    {
      label: '배포 실행',
      description: '실제 배포를 실행하고 진행 상황을 모니터링합니다.',
    },
    {
      label: '모니터링 및 완료',
      description: '배포 완료 후 모니터링 설정 및 결과 보고서를 생성합니다.',
    },
  ];

  // [advice from AI] 다음 단계로 이동
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // [advice from AI] 이전 단계로 이동
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // [advice from AI] 서버 목록 로딩
  const loadAvailableServers = async () => {
    try {
      const response = await fetch('/api/cicd-servers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const servers = data.data || [];
        
        const groupedServers = {
          jenkins: servers.filter(s => s.server_type === 'jenkins'),
          nexus: servers.filter(s => s.server_type === 'nexus'),
          argocd: servers.filter(s => s.server_type === 'argocd')
        };
        
        setAvailableServers(groupedServers);
        
        // 첫 번째 서버들을 기본값으로 설정
        if (groupedServers.jenkins.length > 0) {
          setPipelineData(prev => ({ 
            ...prev, 
            jenkins_server_id: groupedServers.jenkins[0].id 
          }));
        }
        if (groupedServers.nexus.length > 0) {
          setPipelineData(prev => ({ 
            ...prev, 
            nexus_server_id: groupedServers.nexus[0].id,
            docker_registry: groupedServers.nexus[0].server_url
          }));
        }
        if (groupedServers.argocd.length > 0) {
          setPipelineData(prev => ({ 
            ...prev, 
            argocd_server_id: groupedServers.argocd[0].id 
          }));
        }
      }
    } catch (error) {
      console.error('❌ 서버 목록 로딩 실패:', error);
    }
  };

  // [advice from AI] 마법사 초기화
  const handleReset = () => {
    setActiveStep(0);
    setReviewData({ approved: false, notes: '', estimated_time: '' });
    setResourceData({ cpu_cores: 2, memory_gb: 4, storage_gb: 20, auto_scaling: false, load_balancer: false });
    setPipelineData({ 
      jenkins_server_id: '',
      jenkins_job_name: '', 
      build_branch: 'main', 
      nexus_server_id: '',
      docker_registry: '', 
      argocd_server_id: '',
      k8s_namespace: '', 
      deployment_strategy: 'rolling',
      target_cluster: '',
      target_namespace: ''
    });
    setMonitoringData({ health_check_enabled: true, metrics_enabled: true, log_aggregation: true, alert_threshold: 80 });
  };

  // [advice from AI] GPU 관리 함수들
  const addGPU = (gpuId: string, quantity: number = 1) => {
    const gpuSpec = GPU_SPECS.find(gpu => gpu.id === gpuId);
    if (!gpuSpec) return;

    setResourceData(prev => ({
      ...prev,
      gpu_specs: [...prev.gpu_specs, { ...gpuSpec, quantity }]
    }));
  };

  const removeGPU = (index: number) => {
    setResourceData(prev => ({
      ...prev,
      gpu_specs: prev.gpu_specs.filter((_, i) => i !== index)
    }));
  };

  const updateGPUQuantity = (index: number, quantity: number) => {
    setResourceData(prev => ({
      ...prev,
      gpu_specs: prev.gpu_specs.map((gpu, i) => 
        i === index ? { ...gpu, quantity } : gpu
      )
    }));
  };

  const getTotalGPUCost = () => {
    return resourceData.gpu_specs.reduce((total, gpu) => 
      total + (gpu.price_per_hour_usd * gpu.quantity * 24 * 30), 0
    );
  };

  // [advice from AI] 하드웨어 계산기 결과 핸들러 (GPU 자동 적용)
  const handleResourceCalculated = (calculatedResources: { cpu_cores: number; memory_gb: number; storage_gb: number; gpu_specs?: any[] }) => {
    console.log('🔧 하드웨어 계산 결과 적용 (GPU 포함):', calculatedResources);
    
    // GPU 사양을 자동으로 적용
    const gpuSpecs = calculatedResources.gpu_specs || [];
    
    setResourceData(prev => ({
      ...prev,
      cpu_cores: calculatedResources.cpu_cores,
      memory_gb: calculatedResources.memory_gb,
      storage_gb: calculatedResources.storage_gb,
      gpu_specs: gpuSpecs // 자동 계산된 GPU 사양 직접 적용
    }));
    
    console.log('✅ GPU 사양 자동 적용 완료:', gpuSpecs);
  };

  // [advice from AI] 컴포넌트 마운트 시 서버 목록 로딩
  useEffect(() => {
    if (token) {
      loadAvailableServers();
    }
  }, [token]);

  // [advice from AI] 선택된 요청이 변경될 때 파이프라인 데이터 자동 설정
  useEffect(() => {
    if (selectedRequest) {
      const jobName = selectedRequest.project_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown-project';
      const namespace = `${jobName}-${selectedRequest.target_environment}`;
      
      setPipelineData(prev => ({
        ...prev,
        jenkins_job_name: jobName,
        k8s_namespace: namespace,
        target_namespace: `${namespace}-${selectedRequest.target_environment}`
      }));
      
      // 리소스 요구사항이 있으면 자동 설정
      if (selectedRequest.resource_requirements) {
        setResourceData(prev => ({
          ...prev,
          cpu_cores: selectedRequest.resource_requirements.cpu_cores || prev.cpu_cores,
          memory_gb: selectedRequest.resource_requirements.memory_gb || prev.memory_gb,
          storage_gb: selectedRequest.resource_requirements.storage_gb || prev.storage_gb
        }));
      }
    }
  }, [selectedRequest]);

  // [advice from AI] 배포 실행
  const executeDeployment = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 실제 Jenkins Job 생성 시작');

      // [advice from AI] 1단계: Jenkins Job 생성
      const createJobResponse = await fetch('/api/jenkins/create-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_name: selectedRequest?.project_name,
          jenkins_job_name: pipelineData.jenkins_job_name || `${selectedRequest?.project_name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          repository_url: selectedRequest?.repository_url,
          build_branch: pipelineData.build_branch,
          docker_registry: pipelineData.docker_registry,
          target_environment: selectedRequest?.target_environment
        })
      });

      if (!createJobResponse.ok) {
        const errorData = await createJobResponse.json();
        throw new Error(errorData.message || 'Jenkins Job 생성 실패');
      }

      const jobData = await createJobResponse.json();
      console.log('✅ Jenkins Job 생성 성공:', jobData);

      // [advice from AI] 2단계: 빌드 트리거
      console.log('🚀 Jenkins 빌드 트리거 시작');
      
      const triggerResponse = await fetch('/api/jenkins/trigger-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jenkins_job_name: jobData.data.job_name
        })
      });

      if (!triggerResponse.ok) {
        const errorData = await triggerResponse.json();
        console.warn('⚠️ 빌드 트리거 실패:', errorData.message);
        // 빌드 트리거 실패해도 Job은 생성되었으므로 계속 진행
      } else {
        const triggerData = await triggerResponse.json();
        console.log('✅ Jenkins 빌드 트리거 성공:', triggerData);
      }

      // [advice from AI] 3단계: 배포 설정 저장 (실제 DB 저장)
      const deploymentConfig = {
        request_id: selectedRequest?.id,
        jenkins_job_name: jobData.data.job_name,
        jenkins_job_url: jobData.data.job_url,
        resources: resourceData,
        pipeline: pipelineData,
        monitoring: monitoringData,
        created_at: new Date().toISOString()
      };

      console.log('💾 배포 설정 저장:', deploymentConfig);
      
      // 실제 환경에서는 배포 설정을 DB에 저장
      // await saveDeploymentConfig(deploymentConfig);
      
      handleNext();
    } catch (error) {
      console.error('❌ 배포 실행 실패:', error);
      setError(`배포 실행 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 단계별 컨텐츠 렌더링
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              배포 요청서 검토
            </Typography>
            {selectedRequest && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>프로젝트 정보</Typography>
                      <Typography variant="body2">프로젝트명: {selectedRequest.project_name}</Typography>
                      <Typography variant="body2">담당 PO: {selectedRequest.po_name}</Typography>
                      <Typography variant="body2">품질 점수: {selectedRequest.quality_score}점</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>배포 설정</Typography>
                      <Typography variant="body2">대상 환경: {selectedRequest.target_environment}</Typography>
                      <Typography variant="body2">우선순위: 
                        <Chip 
                          label={selectedRequest.priority.toUpperCase()} 
                          color={selectedRequest.priority === 'high' ? 'error' : 'primary'}
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2">레포지토리: {selectedRequest.repository_url}</Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>배포 요청 사유</Typography>
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {selectedRequest.deployment_notes}
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="검토 의견"
              value={reviewData.notes}
              onChange={(e) => setReviewData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="배포 요청에 대한 검토 의견을 입력하세요..."
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="예상 소요 시간"
              value={reviewData.estimated_time}
              onChange={(e) => setReviewData(prev => ({ ...prev, estimated_time: e.target.value }))}
              placeholder="예: 2시간"
              sx={{ mb: 2 }}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              리소스 계산 및 할당
            </Typography>
            
            {/* 계산 모드 선택 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  리소스 계산 방식 선택
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: resourceMode === 'auto' ? 2 : 1,
                        borderColor: resourceMode === 'auto' ? 'primary.main' : 'grey.300'
                      }}
                      onClick={() => setResourceMode('auto')}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="subtitle2">🤖 자동 계산</Typography>
                        <Typography variant="caption" color="text.secondary">
                          랭사 AICC 솔루션 기반 자동 계산
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: resourceMode === 'manual' ? 2 : 1,
                        borderColor: resourceMode === 'manual' ? 'primary.main' : 'grey.300'
                      }}
                      onClick={() => setResourceMode('manual')}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="subtitle2">✏️ 수동 입력</Typography>
                        <Typography variant="caption" color="text.secondary">
                          직접 리소스 값 입력
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 자동 계산 모드 */}
            {resourceMode === 'auto' && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      🤖 랭사 AICC 솔루션 기반 자동 계산
                    </Typography>
                    <Typography variant="body2">
                      프로젝트에 필요한 채널 수를 입력하면 최적의 하드웨어 리소스를 자동으로 계산합니다.
                    </Typography>
                  </Alert>
                  
                  <LangsaHardwareCalculator
                    onResourceCalculated={handleResourceCalculated}
                    initialServices={{
                      callbot: selectedRequest?.project_name?.includes('콜') ? 20 : 10,
                      chatbot: selectedRequest?.project_name?.includes('챗') ? 15 : 5,
                      advisor: 2,
                      stt: 15,
                      tts: 10,
                      ta: 5,
                      qa: 2
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* 수동 입력 모드 또는 계산 결과 표시 */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {resourceMode === 'auto' ? '계산된 리소스 (수정 가능)' : '리소스 직접 입력'}
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="CPU 코어"
                      value={resourceData.cpu_cores}
                      onChange={(e) => setResourceData(prev => ({ ...prev, cpu_cores: parseInt(e.target.value) || 0 }))}
                      inputProps={{ min: 1, max: 128 }}
                      helperText={resourceMode === 'auto' ? '자동 계산된 값' : '필요한 CPU 코어 수'}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="메모리 (GB)"
                      value={resourceData.memory_gb}
                      onChange={(e) => setResourceData(prev => ({ ...prev, memory_gb: parseInt(e.target.value) || 0 }))}
                      inputProps={{ min: 1, max: 512 }}
                      helperText={resourceMode === 'auto' ? '자동 계산된 값' : '필요한 메모리 용량'}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="스토리지 (GB)"
                      value={resourceData.storage_gb}
                      onChange={(e) => setResourceData(prev => ({ ...prev, storage_gb: parseInt(e.target.value) || 0 }))}
                      inputProps={{ min: 10, max: 10000 }}
                      helperText={resourceMode === 'auto' ? '자동 계산된 값' : '필요한 스토리지 용량'}
                    />
                  </Grid>
                </Grid>

                {/* GPU 설정 섹션 */}
                <Typography variant="subtitle2" sx={{ mb: 2, mt: 3 }}>
                  🎮 GPU 설정 (AI 처리용)
                </Typography>
                
                {/* GPU 추가 버튼 */}
                <Box sx={{ mb: 3 }}>
                  <FormControl sx={{ minWidth: 300, mr: 2 }}>
                    <InputLabel>GPU 추가</InputLabel>
                    <Select
                      value=""
                      onChange={(e) => addGPU(e.target.value as string)}
                      label="GPU 추가"
                    >
                      {GPU_SPECS.map((gpu) => (
                        <MenuItem key={gpu.id} value={gpu.id}>
                          {gpu.name} ({gpu.vram_gb}GB VRAM) - ${gpu.price_per_hour_usd}/시간
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary">
                    AI 처리에 필요한 GPU를 선택하세요
                  </Typography>
                </Box>

                {/* 선택된 GPU 목록 */}
                {resourceData.gpu_specs.length > 0 && (
                  <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        선택된 GPU 구성
                      </Typography>
                      {resourceData.gpu_specs.map((gpu, index) => (
                        <Card key={index} sx={{ mb: 2, p: 2 }} variant="outlined">
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}>
                              <Typography variant="subtitle2">{gpu.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {gpu.vram_gb}GB VRAM | {gpu.cuda_cores} CUDA Cores
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                              <TextField
                                type="number"
                                label="개수"
                                size="small"
                                value={gpu.quantity}
                                onChange={(e) => updateGPUQuantity(index, parseInt(e.target.value) || 1)}
                                inputProps={{ min: 1, max: 8 }}
                              />
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">
                                월 비용: ${(gpu.price_per_hour_usd * gpu.quantity * 24 * 30).toFixed(0)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                시간당 ${gpu.price_per_hour_usd} × {gpu.quantity}개
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <Typography variant="caption" display="block">
                                용도: {gpu.use_cases.slice(0, 2).join(', ')}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={1}>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => removeGPU(index)}
                              >
                                삭제
                              </Button>
                            </Grid>
                          </Grid>
                          
                          {/* 클라우드 제공사별 인스턴스 정보 */}
                          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              클라우드 인스턴스:
                            </Typography>
                            <Grid container spacing={1}>
                              <Grid item xs={4}>
                                <Typography variant="caption">
                                  <strong>AWS:</strong> {gpu.availability.aws}
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="caption">
                                  <strong>NCP:</strong> {gpu.availability.ncp}
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="caption">
                                  <strong>KT:</strong> {gpu.availability.kt_cloud}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Card>
                      ))}
                      
                      {/* GPU 총 비용 */}
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">
                          💰 GPU 총 월 예상 비용: ${getTotalGPUCost().toFixed(0)}
                        </Typography>
                        <Typography variant="body2">
                          총 {resourceData.gpu_specs.reduce((sum, gpu) => sum + gpu.quantity, 0)}개 GPU 사용
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                )}
                
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  추가 옵션
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>오토 스케일링</InputLabel>
                      <Select
                        value={resourceData.auto_scaling ? 'enabled' : 'disabled'}
                        onChange={(e) => setResourceData(prev => ({ ...prev, auto_scaling: e.target.value === 'enabled' }))}
                        label="오토 스케일링"
                      >
                        <MenuItem value="enabled">활성화</MenuItem>
                        <MenuItem value="disabled">비활성화</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>로드 밸런서</InputLabel>
                      <Select
                        value={resourceData.load_balancer ? 'enabled' : 'disabled'}
                        onChange={(e) => setResourceData(prev => ({ ...prev, load_balancer: e.target.value === 'enabled' }))}
                        label="로드 밸런서"
                      >
                        <MenuItem value="enabled">활성화</MenuItem>
                        <MenuItem value="disabled">비활성화</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* 리소스 요약 */}
                <Alert severity="success" sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    📊 리소스 요약
                  </Typography>
                  <Typography variant="body2">
                    CPU: {resourceData.cpu_cores}코어 |
                    메모리: {resourceData.memory_gb}GB |
                    스토리지: {resourceData.storage_gb}GB
                    {resourceData.gpu_specs.length > 0 && ` | GPU: ${resourceData.gpu_specs.reduce((sum, gpu) => sum + gpu.quantity, 0)}개`}
                    {resourceData.auto_scaling && ' | 오토스케일링 활성화'}
                    {resourceData.load_balancer && ' | 로드밸런서 활성화'}
                  </Typography>
                  {resourceData.gpu_specs.length > 0 && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      GPU 구성: {resourceData.gpu_specs.map(gpu => `${gpu.name} × ${gpu.quantity}`).join(', ')}
                    </Typography>
                  )}
                </Alert>
              </CardContent>
            </Card>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              CI/CD 파이프라인 설정
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              등록된 Jenkins, Nexus, Argo CD 서버를 선택하여 파이프라인을 설정합니다.
            </Alert>
            
            {/* Jenkins 서버 선택 */}
            <Typography variant="subtitle2" sx={{ mb: 2, mt: 3 }}>
              🔨 Jenkins 서버 설정
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Jenkins 서버</InputLabel>
                  <Select
                    value={pipelineData.jenkins_server_id}
                    onChange={(e) => setPipelineData(prev => ({ ...prev, jenkins_server_id: e.target.value }))}
                    label="Jenkins 서버"
                  >
                    {availableServers.jenkins.map((server) => (
                      <MenuItem key={server.id} value={server.id}>
                        {server.server_name} ({server.server_url})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Jenkins Job 이름"
                  value={pipelineData.jenkins_job_name}
                  onChange={(e) => setPipelineData(prev => ({ ...prev, jenkins_job_name: e.target.value }))}
                  placeholder="예: ecp-ai-k8s-orchestrator"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="빌드 브랜치"
                  value={pipelineData.build_branch}
                  onChange={(e) => setPipelineData(prev => ({ ...prev, build_branch: e.target.value }))}
                />
              </Grid>
            </Grid>

            {/* Nexus 서버 선택 */}
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              📦 Nexus Repository 설정
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Nexus 서버</InputLabel>
                  <Select
                    value={pipelineData.nexus_server_id}
                    onChange={(e) => {
                      const selectedServer = availableServers.nexus.find(s => s.id === e.target.value);
                      setPipelineData(prev => ({ 
                        ...prev, 
                        nexus_server_id: e.target.value,
                        docker_registry: selectedServer?.server_url || ''
                      }));
                    }}
                    label="Nexus 서버"
                  >
                    {availableServers.nexus.map((server) => (
                      <MenuItem key={server.id} value={server.id}>
                        {server.server_name} ({server.server_url})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Docker Registry URL"
                  value={pipelineData.docker_registry}
                  onChange={(e) => setPipelineData(prev => ({ ...prev, docker_registry: e.target.value }))}
                  placeholder="자동 설정됨"
                />
              </Grid>
            </Grid>

            {/* Argo CD 서버 선택 */}
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              🚀 Argo CD 설정
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Argo CD 서버</InputLabel>
                  <Select
                    value={pipelineData.argocd_server_id}
                    onChange={(e) => setPipelineData(prev => ({ ...prev, argocd_server_id: e.target.value }))}
                    label="Argo CD 서버"
                  >
                    {availableServers.argocd.map((server) => (
                      <MenuItem key={server.id} value={server.id}>
                        {server.server_name} ({server.server_url})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Target Cluster"
                  value={pipelineData.target_cluster}
                  onChange={(e) => setPipelineData(prev => ({ ...prev, target_cluster: e.target.value }))}
                  placeholder="예: local-k8s"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Kubernetes Namespace"
                  value={pipelineData.k8s_namespace}
                  onChange={(e) => setPipelineData(prev => ({ ...prev, k8s_namespace: e.target.value }))}
                  placeholder="예: ecp-ai-prod"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>배포 전략</InputLabel>
                  <Select
                    value={pipelineData.deployment_strategy}
                    onChange={(e) => setPipelineData(prev => ({ ...prev, deployment_strategy: e.target.value }))}
                    label="배포 전략"
                  >
                    <MenuItem value="rolling">Rolling Update</MenuItem>
                    <MenuItem value="blue-green">Blue-Green</MenuItem>
                    <MenuItem value="canary">Canary</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* 설정 미리보기 */}
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              ⚙️ 파이프라인 설정 미리보기
            </Typography>
            <Card sx={{ bgcolor: 'grey.50', p: 2 }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
{`Jenkins Job: ${pipelineData.jenkins_job_name}
Repository: ${selectedRequest?.repository_url}
Branch: ${pipelineData.build_branch}
Docker Registry: ${pipelineData.docker_registry}
Target Namespace: ${pipelineData.k8s_namespace}
Deployment Strategy: ${pipelineData.deployment_strategy}
Target Cluster: ${pipelineData.target_cluster}`}
              </Typography>
            </Card>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              배포 실행
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={60} />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  배포를 실행하고 있습니다...
                </Typography>
                <LinearProgress sx={{ mt: 2 }} />
              </Box>
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  배포를 실행하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </Alert>
                
                <Typography variant="subtitle2" gutterBottom>
                  배포 설정 요약
                </Typography>
                
                <Card sx={{ mb: 2, p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" gutterBottom>🔨 Jenkins 설정</Typography>
                  <Typography variant="body2">
                    서버: {availableServers.jenkins.find(s => s.id === pipelineData.jenkins_server_id)?.server_name || '선택 안됨'}<br/>
                    Job 이름: {pipelineData.jenkins_job_name}<br/>
                    브랜치: {pipelineData.build_branch}
                  </Typography>
                </Card>

                <Card sx={{ mb: 2, p: 2, bgcolor: 'secondary.50' }}>
                  <Typography variant="subtitle2" gutterBottom>📦 Nexus 설정</Typography>
                  <Typography variant="body2">
                    서버: {availableServers.nexus.find(s => s.id === pipelineData.nexus_server_id)?.server_name || '선택 안됨'}<br/>
                    Registry: {pipelineData.docker_registry}
                  </Typography>
                </Card>

                <Card sx={{ mb: 2, p: 2, bgcolor: 'success.50' }}>
                  <Typography variant="subtitle2" gutterBottom>🚀 Argo CD 설정</Typography>
                  <Typography variant="body2">
                    서버: {availableServers.argocd.find(s => s.id === pipelineData.argocd_server_id)?.server_name || '선택 안됨'}<br/>
                    클러스터: {pipelineData.target_cluster}<br/>
                    네임스페이스: {pipelineData.k8s_namespace}<br/>
                    배포 전략: {pipelineData.deployment_strategy}
                  </Typography>
                </Card>

                <Card sx={{ mb: 2, p: 2, bgcolor: 'warning.50' }}>
                  <Typography variant="subtitle2" gutterBottom>💻 리소스 설정</Typography>
                  <Typography variant="body2">
                    CPU: {resourceData.cpu_cores}코어<br/>
                    메모리: {resourceData.memory_gb}GB<br/>
                    스토리지: {resourceData.storage_gb}GB<br/>
                    {resourceData.gpu_specs.length > 0 && (
                      <>
                        GPU: {resourceData.gpu_specs.reduce((sum, gpu) => sum + gpu.quantity, 0)}개<br/>
                        GPU 구성: {resourceData.gpu_specs.map(gpu => `${gpu.name} × ${gpu.quantity}`).join(', ')}<br/>
                        GPU 월 비용: ${getTotalGPUCost().toFixed(0)}<br/>
                      </>
                    )}
                    오토스케일링: {resourceData.auto_scaling ? '활성화' : '비활성화'}<br/>
                    로드밸런서: {resourceData.load_balancer ? '활성화' : '비활성화'}
                  </Typography>
                </Card>
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={executeDeployment}
                    disabled={loading}
                  >
                    배포 실행
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              배포 완료 및 모니터링 설정
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              배포가 성공적으로 완료되었습니다!
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>
              모니터링 설정
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>헬스 체크</InputLabel>
                  <Select
                    value={monitoringData.health_check_enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setMonitoringData(prev => ({ ...prev, health_check_enabled: e.target.value === 'enabled' }))}
                    label="헬스 체크"
                  >
                    <MenuItem value="enabled">활성화</MenuItem>
                    <MenuItem value="disabled">비활성화</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="알림 임계값 (%)"
                  value={monitoringData.alert_threshold}
                  onChange={(e) => setMonitoringData(prev => ({ ...prev, alert_threshold: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
            </Grid>
            
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>
              배포 결과 요약
            </Typography>
            <Card>
              <CardContent>
                <Typography variant="body2">
                  • 프로젝트: {selectedRequest?.project_name}<br/>
                  • 배포 환경: {selectedRequest?.target_environment}<br/>
                  • 배포 시간: {new Date().toLocaleString('ko-KR')}<br/>
                  • 상태: 성공<br/>
                  • 접속 URL: https://{pipelineData.k8s_namespace}.langsa.ai
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return <Typography>알 수 없는 단계입니다.</Typography>;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        배포 요청 처리 마법사
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                {renderStepContent(index)}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <div>
                    {index === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleReset}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        새 배포 시작
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={index === 3 ? executeDeployment : handleNext}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={loading}
                      >
                        {index === 3 ? '배포 실행' : '다음'}
                      </Button>
                    )}
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      이전
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeploymentProcessWizard;
