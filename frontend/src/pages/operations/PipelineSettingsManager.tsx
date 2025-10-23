// [advice from AI] 파이프라인 설정 관리 전용 페이지 - 템플릿 및 인증/보안 관리 강화
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Container,
  Breadcrumbs,
  Link,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Security as SecurityIcon,
  Key as KeyIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import SolutionInstanceManager from '../../components/operations/SolutionInstanceManager';

interface PipelineTemplate {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  category?: string;
  language: string;
  framework?: string;
  provider_type?: string;
  usage_count: number;
  last_used?: string;
  jenkins_pipeline?: string;
  dockerfile?: string;
  enabled?: boolean;
  created_at?: string;
}

interface PipelineInstance {
  id: string;
  pipeline_name: string;
  pipeline_type: string;
  environment: string;
  deployment_strategy: string;
  status: string;
  config: {
    repository_url: string;
    branch: string;
    jenkins_job_name: string;
    jenkins_url: string;
    nexus_url: string;
    argocd_url: string;
    namespace: string;
  };
  created_at: string;
  updated_at: string;
}

interface InstanceCredential {
  id: string;
  instance_id: string;
  instance_name: string;
  solution_type: string;
  auth_type: string;
  username?: string;
  password?: string;
  api_token?: string;
  ssl_enabled: boolean;
  last_verified?: string;
  status: string;
}

const PipelineSettingsManager: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useJwtAuthStore();
  const [loading, setLoading] = useState(false);
  const [pipelineStats, setPipelineStats] = useState({
    totalPipelines: 0,
    activePipelines: 0,
    totalInstances: 0
  });

  // [advice from AI] 파이프라인 템플릿 관리
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateDetailOpen, setTemplateDetailOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PipelineTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState<Partial<PipelineTemplate>>({
    name: '',
    description: '',
    language: '',
    framework: '',
    provider_type: 'jenkins'
  });

  // [advice from AI] 파이프라인 인스턴스 관리
  const [pipelines, setPipelines] = useState<PipelineInstance[]>([]);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [pipelineDetailOpen, setPipelineDetailOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineInstance | null>(null);
  const [pipelineFormData, setPipelineFormData] = useState<Partial<PipelineInstance>>({
    pipeline_name: '',
    pipeline_type: '',
    environment: 'development',
    deployment_strategy: 'rolling-update',
    config: {
      repository_url: '',
      branch: 'main',
      jenkins_job_name: '',
      jenkins_url: '',
      nexus_url: '',
      argocd_url: '',
      namespace: 'default'
    }
  });

  // [advice from AI] 인증/보안 관리
  const [credentials, setCredentials] = useState<InstanceCredential[]>([]);
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<InstanceCredential | null>(null);
  const [credentialFormData, setCredentialFormData] = useState<Partial<InstanceCredential>>({
    auth_type: 'basic',
    username: '',
    password: '',
    ssl_enabled: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // [advice from AI] 파이프라인 통계 로드
  useEffect(() => {
    loadPipelineStats();
    loadTemplates();
    loadPipelines();
    loadCredentials();
  }, []);

  const loadPipelineStats = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const response = await fetch(`${apiUrl}/api/operations/cicd/pipelines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const pipelines = data.data || [];
        setPipelineStats({
          totalPipelines: pipelines.length,
          activePipelines: pipelines.filter((p: any) => p.status === 'active').length,
          totalInstances: 4 // 기본 솔루션 인스턴스 수
        });
      }
    } catch (error) {
      console.warn('파이프라인 통계 로드 실패:', error);
      setPipelineStats({
        totalPipelines: 5,
        activePipelines: 3,
        totalInstances: 4
      });
    }
  };

  const handleInstanceChange = (instances: any[]) => {
    setPipelineStats(prev => ({
      ...prev,
      totalInstances: instances.length
    }));
  };

  // [advice from AI] 템플릿 목록 로드
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/pipeline-templates/templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || data.data || []);
      }
    } catch (error) {
      console.error('템플릿 로드 실패:', error);
    }
  };

  // [advice from AI] 파이프라인 인스턴스 목록 로드
  const loadPipelines = async () => {
    try {
      const response = await fetch('/api/operations/cicd/pipelines', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPipelines(data.data || []);
        // 통계 업데이트
        setPipelineStats(prev => ({
          ...prev,
          totalPipelines: (data.data || []).length,
          activePipelines: (data.data || []).filter((p: PipelineInstance) => p.status === 'active').length
        }));
      }
    } catch (error) {
      console.error('파이프라인 로드 실패:', error);
    }
  };

  // [advice from AI] 인증 정보 로드
  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/operations/instances', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const instances = data.instances || [];
        // 인스턴스 정보를 인증 정보 형식으로 변환
        const creds = instances.map((inst: any) => ({
          id: inst.id,
          instance_id: inst.id,
          instance_name: inst.instance_name,
          solution_type: inst.solution_type,
          auth_type: inst.auth_type || 'basic',
          username: inst.username || '',
          ssl_enabled: inst.ssl_enabled || false,
          status: inst.status || 'unknown',
          last_verified: inst.last_health_check
        }));
        setCredentials(creds);
      }
    } catch (error) {
      console.error('인증 정보 로드 실패:', error);
    }
  };

  // [advice from AI] 템플릿 상세보기
  const handleViewTemplate = (template: PipelineTemplate) => {
    setSelectedTemplate(template);
    setTemplateDetailOpen(true);
  };

  // [advice from AI] 템플릿 편집
  const handleEditTemplate = (template: PipelineTemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      description: template.description,
      language: template.language,
      framework: template.framework || '',
      provider_type: template.provider_type || 'jenkins'
    });
    setTemplateDialogOpen(true);
  };

  // [advice from AI] 템플릿 삭제
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('정말로 이 템플릿을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 현재 백엔드에서 DELETE를 지원하지 않으므로 알림만 표시
      alert('템플릿 삭제 기능은 현재 개발 중입니다.\n기본 템플릿은 수정만 가능합니다.');
    } catch (error) {
      console.error('템플릿 삭제 실패:', error);
      alert('템플릿 삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 템플릿 저장
  const handleSaveTemplate = async () => {
    try {
      // 현재 백엔드에서 POST/PUT을 지원하지 않으므로 알림만 표시
      alert('템플릿 생성/수정 기능은 현재 개발 중입니다.\n기본 템플릿을 사용해주세요.');
      setTemplateDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('템플릿 저장 실패:', error);
      alert('템플릿 저장 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 인증 정보 편집
  const handleEditCredential = (credential: InstanceCredential) => {
    setSelectedCredential(credential);
    setCredentialFormData({
      auth_type: credential.auth_type,
      username: credential.username || '',
      password: '',
      ssl_enabled: credential.ssl_enabled
    });
    setSecurityDialogOpen(true);
  };

  // [advice from AI] 인증 정보 저장
  const handleSaveCredential = async () => {
    if (!selectedCredential) return;

    try {
      const response = await fetch(`/api/operations/instances/${selectedCredential.instance_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auth_type: credentialFormData.auth_type,
          username: credentialFormData.username,
          password: credentialFormData.password,
          ssl_enabled: credentialFormData.ssl_enabled
        })
      });

      if (response.ok) {
        alert('인증 정보가 업데이트되었습니다.');
        setSecurityDialogOpen(false);
        setSelectedCredential(null);
        loadCredentials();
      } else {
        alert('인증 정보 업데이트 실패');
      }
    } catch (error) {
      console.error('인증 정보 업데이트 실패:', error);
      alert('인증 정보 업데이트 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 인증 정보 테스트
  const handleTestCredential = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/operations/instances/${credentialId}/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('연결 테스트 성공!');
        loadCredentials();
      } else {
        alert(`연결 테스트 실패: ${data.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('연결 테스트 실패:', error);
      alert('연결 테스트 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 파이프라인 상세보기
  const handleViewPipeline = (pipeline: PipelineInstance) => {
    setSelectedPipeline(pipeline);
    setPipelineDetailOpen(true);
  };

  // [advice from AI] 파이프라인 편집
  const handleEditPipeline = (pipeline: PipelineInstance) => {
    setSelectedPipeline(pipeline);
    setPipelineFormData({
      pipeline_name: pipeline.pipeline_name,
      pipeline_type: pipeline.pipeline_type,
      environment: pipeline.environment,
      deployment_strategy: pipeline.deployment_strategy,
      config: { ...pipeline.config }
    });
    setPipelineDialogOpen(true);
  };

  // [advice from AI] 파이프라인 삭제
  const handleDeletePipeline = async (pipelineId: string, pipelineName: string) => {
    if (!confirm(`정말로 "${pipelineName}" 파이프라인을 삭제하시겠습니까?\n\n⚠️ 주의: 연결된 Jenkins Job과 ArgoCD Application도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/operations/cicd/pipelines/${pipelineId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('파이프라인이 성공적으로 삭제되었습니다.');
        loadPipelines();
      } else {
        const data = await response.json();
        alert(`파이프라인 삭제 실패: ${data.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('파이프라인 삭제 실패:', error);
      alert('파이프라인 삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 파이프라인 저장
  const handleSavePipeline = async () => {
    try {
      const url = selectedPipeline 
        ? `/api/operations/cicd/pipelines/${selectedPipeline.id}`
        : '/api/operations/cicd/pipelines';
      const method = selectedPipeline ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipelineFormData)
      });

      if (response.ok) {
        alert(selectedPipeline ? '파이프라인이 수정되었습니다.' : '파이프라인이 생성되었습니다.');
        setPipelineDialogOpen(false);
        setSelectedPipeline(null);
        setPipelineFormData({
          pipeline_name: '',
          pipeline_type: '',
          environment: 'development',
          deployment_strategy: 'rolling-update',
          config: {
            repository_url: '',
            branch: 'main',
            jenkins_job_name: '',
            jenkins_url: '',
            nexus_url: '',
            argocd_url: '',
            namespace: 'default'
          }
        });
        loadPipelines();
      } else {
        const data = await response.json();
        alert(`파이프라인 저장 실패: ${data.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('파이프라인 저장 실패:', error);
      alert('파이프라인 저장 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 템플릿으로 파이프라인 생성
  const handleCreateFromTemplate = (template: PipelineTemplate) => {
    setSelectedTemplate(template);
    setPipelineFormData({
      pipeline_name: `${template.display_name || template.name} Pipeline`,
      pipeline_type: template.language,
      environment: 'development',
      deployment_strategy: 'rolling-update',
      config: {
        repository_url: '',
        branch: 'main',
        jenkins_job_name: '',
        jenkins_url: 'http://jenkins:8080',
        nexus_url: 'http://nexus:8081',
        argocd_url: 'http://argocd-server:8080',
        namespace: 'default'
      }
    });
    setPipelineDialogOpen(true);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* [advice from AI] 브레드크럼 네비게이션 */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link 
          color="inherit" 
          href="#" 
          onClick={(e) => { e.preventDefault(); navigate('/operations'); }}
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <HomeIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          운영센터
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          파이프라인 설정 관리
        </Typography>
      </Breadcrumbs>

      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          ⚙️ 파이프라인 설정 관리
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          CI/CD 솔루션 인스턴스 및 파이프라인 템플릿을 중앙에서 관리합니다.
        </Typography>
        
        {/* 통계 칩들 */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            icon={<TimelineIcon />} 
            label={`실행 중인 파이프라인 ${pipelines.length}개`} 
            color="primary" 
          />
          <Chip 
            label={`활성 ${pipelineStats.activePipelines}개`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`표준 템플릿 ${templates.length}개`} 
            color="secondary" 
            variant="outlined"
          />
          <Chip 
            label={`솔루션 인스턴스 ${pipelineStats.totalInstances}개`} 
            color="info" 
            variant="outlined"
          />
        </Box>
      </Box>

      {/* [advice from AI] 빠른 액션 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                onClick={() => navigate('/operations')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                📊 운영 대시보드
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전체 운영 현황 조회
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                onClick={() => navigate('/operations/repository-deploy')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                🚀 즉시 배포
              </Typography>
              <Typography variant="body2" color="text.secondary">
                레포지토리 직접 배포
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                onClick={() => navigate('/operations/comprehensive-monitoring')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                📈 종합 모니터링
              </Typography>
              <Typography variant="body2" color="text.secondary">
                실시간 성능 모니터링
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                onClick={() => navigate('/operations/infrastructure')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" color="info.main" gutterBottom>
                🔧 인프라 설정
              </Typography>
              <Typography variant="body2" color="text.secondary">
                서버 연결 설정
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 메인 설정 관리 영역 */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SolutionInstanceManager onInstanceChange={handleInstanceChange} />
        </Grid>
      </Grid>

      {/* [advice from AI] 파이프라인 인스턴스 관리 테이블 */}
      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              🚀 실행 중인 파이프라인 ({pipelines.length})
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadPipelines}
                sx={{ mr: 1 }}
              >
                새로고침
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedPipeline(null);
                  setPipelineFormData({
                    pipeline_name: '',
                    pipeline_type: '',
                    environment: 'development',
                    deployment_strategy: 'rolling-update',
                    config: {
                      repository_url: '',
                      branch: 'main',
                      jenkins_job_name: '',
                      jenkins_url: 'http://jenkins:8080',
                      nexus_url: 'http://nexus:8081',
                      argocd_url: 'http://argocd-server:8080',
                      namespace: 'default'
                    }
                  });
                  setPipelineDialogOpen(true);
                }}
              >
                새 파이프라인 추가
              </Button>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            실제 배포 중인 파이프라인을 관리합니다. 각 파이프라인은 Jenkins, Nexus, ArgoCD와 연동되어 있습니다.
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>파이프라인명</TableCell>
                  <TableCell>저장소</TableCell>
                  <TableCell>환경</TableCell>
                  <TableCell>배포 전략</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>마지막 업데이트</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pipelines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        등록된 파이프라인이 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pipelines.map((pipeline) => (
                    <TableRow key={pipeline.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {pipeline.pipeline_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pipeline.pipeline_type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-all' }}>
                          {pipeline.config.repository_url}
                        </Typography>
                        <Chip label={pipeline.config.branch} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pipeline.environment} 
                          size="small" 
                          color={
                            pipeline.environment === 'production' ? 'error' :
                            pipeline.environment === 'staging' ? 'warning' : 'info'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{pipeline.deployment_strategy}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={pipeline.status === 'active' ? '활성' : pipeline.status} 
                          size="small"
                          color={pipeline.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {pipeline.updated_at ? new Date(pipeline.updated_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="상세 보기">
                          <IconButton size="small" onClick={() => handleViewPipeline(pipeline)} color="primary">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="편집">
                          <IconButton size="small" onClick={() => handleEditPipeline(pipeline)} color="info">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeletePipeline(pipeline.id, pipeline.pipeline_name)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* [advice from AI] 파이프라인 템플릿 관리 테이블 */}
      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              📋 표준 템플릿 라이브러리 ({templates.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadTemplates}
            >
              새로고침
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            재사용 가능한 표준 CI/CD 템플릿입니다. 템플릿을 기반으로 새 파이프라인을 생성할 수 있습니다.
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>템플릿명</TableCell>
                  <TableCell>언어</TableCell>
                  <TableCell>프레임워크</TableCell>
                  <TableCell>사용 횟수</TableCell>
                  <TableCell>마지막 사용</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        등록된 템플릿이 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {template.display_name || template.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={template.language} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>{template.framework || '-'}</TableCell>
                      <TableCell>
                        <Chip label={`${template.usage_count}회`} size="small" />
                      </TableCell>
                      <TableCell>
                        {template.last_used ? new Date(template.last_used).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="이 템플릿으로 파이프라인 생성">
                          <IconButton size="small" onClick={() => handleCreateFromTemplate(template)} color="success">
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="상세 보기">
                          <IconButton size="small" onClick={() => handleViewTemplate(template)} color="primary">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* [advice from AI] 인증 및 보안 관리 테이블 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              🔐 인증 및 보안 ({credentials.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadCredentials}
            >
              새로고침
            </Button>
          </Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            인증 정보는 암호화되어 저장됩니다. 비밀번호는 수정 시에만 입력하세요.
          </Alert>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>인스턴스명</TableCell>
                  <TableCell>솔루션 타입</TableCell>
                  <TableCell>인증 방식</TableCell>
                  <TableCell>사용자명</TableCell>
                  <TableCell>SSL</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>마지막 확인</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {credentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        등록된 인스턴스가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  credentials.map((cred) => (
                    <TableRow key={cred.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {cred.instance_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={cred.solution_type} size="small" color="info" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={<KeyIcon fontSize="small" />}
                          label={cred.auth_type} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{cred.username || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          icon={cred.ssl_enabled ? <LockIcon fontSize="small" /> : undefined}
                          label={cred.ssl_enabled ? 'SSL' : 'No SSL'} 
                          size="small"
                          color={cred.ssl_enabled ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={cred.status === 'active' ? '활성' : cred.status} 
                          size="small"
                          color={cred.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {cred.last_verified ? new Date(cred.last_verified).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="인증 정보 편집">
                          <IconButton size="small" onClick={() => handleEditCredential(cred)} color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="연결 테스트">
                          <IconButton 
                            size="small" 
                            onClick={() => handleTestCredential(cred.instance_id)}
                            color="success"
                          >
                            <PlayIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* [advice from AI] 템플릿 상세보기 다이얼로그 */}
      <Dialog open={templateDetailOpen} onClose={() => setTemplateDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>템플릿 상세 정보</DialogTitle>
        <DialogContent dividers>
          {selectedTemplate && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedTemplate.display_name || selectedTemplate.name}</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedTemplate.description}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>언어:</strong> {selectedTemplate.language}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>프레임워크:</strong> {selectedTemplate.framework || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>사용 횟수:</strong> {selectedTemplate.usage_count}회</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Provider:</strong> {selectedTemplate.provider_type || '-'}</Typography>
                </Grid>
              </Grid>
              {selectedTemplate.jenkins_pipeline && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Jenkins Pipeline Script:</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={10}
                    value={selectedTemplate.jenkins_pipeline}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDetailOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 템플릿 생성/편집 다이얼로그 */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedTemplate ? '템플릿 편집' : '새 템플릿 추가'}</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="템플릿 이름"
            value={templateFormData.name}
            onChange={(e) => setTemplateFormData({...templateFormData, name: e.target.value})}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="설명"
            value={templateFormData.description}
            onChange={(e) => setTemplateFormData({...templateFormData, description: e.target.value})}
            multiline
            rows={2}
            sx={{ mb: 2 }}
            required
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>언어</InputLabel>
            <Select
              value={templateFormData.language}
              onChange={(e) => setTemplateFormData({...templateFormData, language: e.target.value})}
              label="언어"
            >
              <MenuItem value="JavaScript">JavaScript</MenuItem>
              <MenuItem value="TypeScript">TypeScript</MenuItem>
              <MenuItem value="Python">Python</MenuItem>
              <MenuItem value="Java">Java</MenuItem>
              <MenuItem value="Go">Go</MenuItem>
              <MenuItem value="Ruby">Ruby</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="프레임워크"
            value={templateFormData.framework}
            onChange={(e) => setTemplateFormData({...templateFormData, framework: e.target.value})}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={templateFormData.provider_type}
              onChange={(e) => setTemplateFormData({...templateFormData, provider_type: e.target.value})}
              label="Provider"
            >
              <MenuItem value="jenkins">Jenkins</MenuItem>
              <MenuItem value="gitlab">GitLab CI</MenuItem>
              <MenuItem value="github">GitHub Actions</MenuItem>
              <MenuItem value="azure">Azure DevOps</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTemplateDialogOpen(false);
            setSelectedTemplate(null);
          }}>취소</Button>
          <Button 
            onClick={handleSaveTemplate}
            variant="contained"
            color="primary"
            disabled={!templateFormData.name || !templateFormData.description || !templateFormData.language}
          >
            {selectedTemplate ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 인증 정보 편집 다이얼로그 */}
      <Dialog open={securityDialogOpen} onClose={() => setSecurityDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            인증 정보 편집
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCredential && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{selectedCredential.instance_name}</strong>의 인증 정보를 수정합니다.
              </Alert>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>인증 방식</InputLabel>
                <Select
                  value={credentialFormData.auth_type}
                  onChange={(e) => setCredentialFormData({...credentialFormData, auth_type: e.target.value})}
                  label="인증 방식"
                >
                  <MenuItem value="basic">Basic Auth</MenuItem>
                  <MenuItem value="token">API Token</MenuItem>
                  <MenuItem value="oauth">OAuth</MenuItem>
                </Select>
              </FormControl>
              
              {credentialFormData.auth_type === 'basic' && (
                <>
                  <TextField
                    fullWidth
                    label="사용자명"
                    value={credentialFormData.username}
                    onChange={(e) => setCredentialFormData({...credentialFormData, username: e.target.value})}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="비밀번호"
                    type={showPassword ? 'text' : 'password'}
                    value={credentialFormData.password}
                    onChange={(e) => setCredentialFormData({...credentialFormData, password: e.target.value})}
                    sx={{ mb: 2 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <ViewIcon /> : <LockIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    placeholder="변경하려면 입력하세요"
                  />
                </>
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={credentialFormData.ssl_enabled}
                    onChange={(e) => setCredentialFormData({...credentialFormData, ssl_enabled: e.target.checked})}
                  />
                }
                label="SSL/TLS 사용"
              />
              
              <Alert severity="warning" sx={{ mt: 2 }}>
                모든 인증 정보는 암호화되어 데이터베이스에 저장됩니다.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSecurityDialogOpen(false);
            setSelectedCredential(null);
            setShowPassword(false);
          }}>취소</Button>
          <Button 
            onClick={handleSaveCredential}
            variant="contained"
            color="primary"
            startIcon={<SecurityIcon />}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 파이프라인 상세보기 다이얼로그 */}
      <Dialog open={pipelineDetailOpen} onClose={() => setPipelineDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>파이프라인 상세 정보</DialogTitle>
        <DialogContent dividers>
          {selectedPipeline && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedPipeline.pipeline_name}</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>환경:</strong> {selectedPipeline.environment}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>배포 전략:</strong> {selectedPipeline.deployment_strategy}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>저장소:</strong> {selectedPipeline.config.repository_url}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>브랜치:</strong> {selectedPipeline.config.branch}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>네임스페이스:</strong> {selectedPipeline.config.namespace}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">연동 정보</Typography>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography variant="body2">Jenkins: {selectedPipeline.config.jenkins_url}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">Nexus: {selectedPipeline.config.nexus_url}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">ArgoCD: {selectedPipeline.config.argocd_url}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPipelineDetailOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 파이프라인 생성/편집 다이얼로그 */}
      <Dialog open={pipelineDialogOpen} onClose={() => setPipelineDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPipeline ? '파이프라인 편집' : '새 파이프라인 생성'}
          {selectedTemplate && (
            <Typography variant="caption" display="block" color="text.secondary">
              템플릿: {selectedTemplate.display_name || selectedTemplate.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="파이프라인 이름"
            value={pipelineFormData.pipeline_name}
            onChange={(e) => setPipelineFormData({...pipelineFormData, pipeline_name: e.target.value})}
            sx={{ mb: 2 }}
            required
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>환경</InputLabel>
                <Select
                  value={pipelineFormData.environment}
                  onChange={(e) => setPipelineFormData({...pipelineFormData, environment: e.target.value})}
                  label="환경"
                >
                  <MenuItem value="development">Development</MenuItem>
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>배포 전략</InputLabel>
                <Select
                  value={pipelineFormData.deployment_strategy}
                  onChange={(e) => setPipelineFormData({...pipelineFormData, deployment_strategy: e.target.value})}
                  label="배포 전략"
                >
                  <MenuItem value="rolling-update">Rolling Update</MenuItem>
                  <MenuItem value="blue-green">Blue-Green</MenuItem>
                  <MenuItem value="canary">Canary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>저장소 정보</Typography>
          
          <TextField
            fullWidth
            label="저장소 URL"
            value={pipelineFormData.config?.repository_url}
            onChange={(e) => setPipelineFormData({
              ...pipelineFormData, 
              config: {...pipelineFormData.config!, repository_url: e.target.value}
            })}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="브랜치"
            value={pipelineFormData.config?.branch}
            onChange={(e) => setPipelineFormData({
              ...pipelineFormData, 
              config: {...pipelineFormData.config!, branch: e.target.value}
            })}
            sx={{ mb: 2 }}
          />
          
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>연동 서비스</Typography>
          
          <TextField
            fullWidth
            label="Jenkins URL"
            value={pipelineFormData.config?.jenkins_url}
            onChange={(e) => setPipelineFormData({
              ...pipelineFormData, 
              config: {...pipelineFormData.config!, jenkins_url: e.target.value}
            })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Nexus URL"
            value={pipelineFormData.config?.nexus_url}
            onChange={(e) => setPipelineFormData({
              ...pipelineFormData, 
              config: {...pipelineFormData.config!, nexus_url: e.target.value}
            })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="ArgoCD URL"
            value={pipelineFormData.config?.argocd_url}
            onChange={(e) => setPipelineFormData({
              ...pipelineFormData, 
              config: {...pipelineFormData.config!, argocd_url: e.target.value}
            })}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPipelineDialogOpen(false);
            setSelectedPipeline(null);
            setSelectedTemplate(null);
          }}>취소</Button>
          <Button 
            onClick={handleSavePipeline}
            variant="contained"
            color="primary"
            disabled={!pipelineFormData.pipeline_name || !pipelineFormData.config?.repository_url}
          >
            {selectedPipeline ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PipelineSettingsManager;
