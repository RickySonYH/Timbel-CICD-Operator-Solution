// [advice from AI] 시스템 관리 페이지 - 프로젝트 페이지와 동일한 형태로 통일
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
  Paper,
  Chip,
  Alert,
  LinearProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Container,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress
} from '@mui/material';
import { 
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import EmptyState from '../../components/common/EmptyState';
import PermissionButton from '../../components/common/PermissionButton';

// [advice from AI] 시스템 데이터 타입
interface System {
  id: string;
  name: string;
  description: string;
  domain_name: string;
  domain_id: string;
  type: 'web' | 'api' | 'database' | 'microservice' | 'mobile' | 'desktop' | 'ai_service';
  architecture: 'monolithic' | 'microservices' | 'serverless' | 'hybrid';
  tech_stack: string[];
  version: string;
  development_stage: 'development' | 'staging' | 'production';
  code_status: 'active' | 'inactive' | 'deprecated' | 'archived';
  created_at: string;
  updated_at: string;
  repository_url?: string;
  repository_info?: any;
  analysis_data?: any;
}

// [advice from AI] 시스템 등록 관련 타입
interface RepositoryAnalysis {
  service: string;
  repositoryInfo: any;
  repository: any;
  readme: any;
  codeAnalysis: {
    languages: Array<{ language: string; bytes: number; percentage: number }>;
    dependencies: any[];
    frameworks: string[];
    architecture: string;
  };
  suggestedSystem: {
    name: string;
    description: string;
    category: string;
    techStack: string[];
    suggestedTags: string[];
  };
  errors: any[];
}

interface SystemRegistrationData {
  name: string;
  description: string;
  category: string;
  domain_id: string;
  repository_url: string;
  repository_info: any;
  analysis_data: any;
  tech_stack: string[];
  development_stage: string;
  version: string;
  architecture_type: string;
}

const SystemsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  // [advice from AI] 권한 디버깅
  console.log('🔐 현재 사용자 권한:', permissions);
  console.log('👤 사용자 정보:', user);
  
  const [systems, setSystems] = useState<System[]>([]);
  const [domains, setDomains] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<System>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain_id: '',
    type: 'web' as System['type'],
    architecture: 'monolithic' as System['architecture'],
    tech_stack: [] as string[],
    version: '1.0.0',
    development_stage: 'development' as System['development_stage'],
    code_status: 'active' as System['code_status']
  });

  // [advice from AI] 시스템 등록 관련 상태
  const [registrationDialog, setRegistrationDialog] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(0);
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [repositoryBranch, setRepositoryBranch] = useState('main');
  const [accessToken, setAccessToken] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RepositoryAnalysis | null>(null);
  const [systemData, setSystemData] = useState<SystemRegistrationData>({
    name: '',
    description: '',
    category: 'general',
    domain_id: '',
    repository_url: '',
    repository_info: null,
    analysis_data: null,
    tech_stack: [],
    development_stage: 'production',
    version: '1.0.0',
    architecture_type: 'monolithic'
  });

  // [advice from AI] 브랜치 관련 상태
  const [availableBranches, setAvailableBranches] = useState<Array<{name: string, protected: boolean}>>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // [advice from AI] 기술 스택 옵션
  const techStackOptions = [
    'React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'NestJS',
    'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Kotlin',
    'TypeScript', 'JavaScript', 'PostgreSQL', 'MySQL', 'MongoDB',
    'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Jenkins', 'GitLab CI', 'GitHub Actions', 'Terraform'
  ];

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 토큰 확인:', token ? '토큰 존재' : '토큰 없음');
      console.log('🌐 API URL:', '/api/knowledge/systems');
      
      // 실제 API 호출
      const response = await fetch('/api/knowledge/systems', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });

      console.log('📡 API 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 시스템 데이터:', data);
        setSystems(data.systems || data.data || []);
      } else {
        const errorData = await response.json();
        console.error('❌ 시스템 데이터 로드 실패:', response.status, errorData);
        setSystems([]);
      }

      // 도메인 데이터 로드
      const domainsResponse = await fetch('/api/knowledge/domains', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });

      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json();
        setDomains(domainsData.domains || []);
      } else {
        setDomains([]);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setSystems([]);
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // [advice from AI] 필터링된 시스템 목록
  const filteredSystems = systems.filter(system => {
    const matchesSearch = system.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         system.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || system.code_status === filterStatus;
    const matchesType = filterType === 'all' || system.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // [advice from AI] 시스템 생성
  const handleCreateSystem = async () => {
    try {
      const response = await fetch('/api/knowledge/systems', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
      setCreateDialog(false);
        setFormData({
          name: '',
          description: '',
          domain_id: '',
          type: 'web',
          architecture: 'monolithic',
          tech_stack: [],
          version: '1.0.0',
          development_stage: 'development',
          code_status: 'active'
        });
      loadData();
      }
    } catch (error) {
      console.error('시스템 생성 실패:', error);
    }
  };

  // [advice from AI] 레포지토리 분석 함수
  const handleAnalyzeRepository = async () => {
    if (!repositoryUrl.trim()) {
      alert('레포지토리 URL을 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/knowledge/systems/analyze-repository', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: repositoryUrl,
          branch: repositoryBranch,
          accessToken: accessToken || undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult(result.data);
        setSystemData(prev => ({
          ...prev,
          name: result.data.suggestedSystem.name,
          description: result.data.suggestedSystem.description,
          category: result.data.suggestedSystem.category,
          tech_stack: result.data.suggestedSystem.techStack,
          repository_url: repositoryUrl,
          repository_info: result.data.repositoryInfo,
          analysis_data: result.data,
          architecture_type: 'monolithic' // 기본값으로 설정
        }));
        setRegistrationStep(1);
      } else {
        alert(`분석 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('레포지토리 분석 실패:', error);
      alert('레포지토리 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // [advice from AI] 시스템 등록 함수
  const handleRegisterSystem = async () => {
    try {
      const response = await fetch('/api/knowledge/systems', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(systemData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('시스템이 성공적으로 등록되었습니다.');
        setRegistrationDialog(false);
        resetRegistrationState();
        loadData();
      } else {
        alert(`등록 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('시스템 등록 실패:', error);
      alert('시스템 등록 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 등록 상태 초기화
  const resetRegistrationState = () => {
    setRegistrationStep(0);
    setRepositoryUrl('');
    setRepositoryBranch('main');
    setAccessToken('');
    setAnalysisResult(null);
    setAvailableBranches([]);
    setIsLoadingBranches(false);
    setBranchError(null);
    
    // 디바운스 타이머 정리
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
    
    setSystemData({
      name: '',
      description: '',
      category: 'general',
      domain_id: '',
      repository_url: '',
      repository_info: null,
      analysis_data: null,
      tech_stack: [],
      development_stage: 'production',
      version: '1.0.0',
      architecture_type: 'monolithic'
    });
  };

  // [advice from AI] 시스템 삭제 함수
  const handleDeleteSystem = async (systemId: string) => {
    if (!window.confirm('이 시스템을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge/systems/${systemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('시스템이 성공적으로 삭제되었습니다.');
        loadData(); // 데이터 새로고침
      } else {
        alert(`삭제 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('시스템 삭제 실패:', error);
      alert('시스템 삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 시스템 편집 함수
  const handleUpdateSystem = async () => {
    if (!editFormData.id) return;

    try {
      const response = await fetch(`/api/knowledge/systems/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editFormData.name,
          description: editFormData.description,
          category: editFormData.type,
          tech_stack: editFormData.tech_stack,
          development_stage: editFormData.development_stage,
          version: editFormData.version
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('시스템이 성공적으로 수정되었습니다.');
        setEditDialog(false);
        loadData(); // 데이터 새로고침
      } else {
        alert(`수정 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('시스템 수정 실패:', error);
      alert('시스템 수정 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] Git 서비스 감지
  const detectGitService = (url: string) => {
    if (url.includes('github.com')) return 'GitHub';
    if (url.includes('gitlab.com')) return 'GitLab';
    if (url.includes('bitbucket.org')) return 'Bitbucket';
    if (url.includes('dev.azure.com')) return 'Azure DevOps';
    return 'Unknown';
  };

  // [advice from AI] 브랜치 조회 함수
  const handleFetchBranches = async (url: string) => {
    if (!url.trim()) {
      setAvailableBranches([]);
      setBranchError(null);
      return;
    }

    setIsLoadingBranches(true);
    setBranchError(null);

    try {
      const response = await fetch('/api/knowledge/systems/get-branches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          accessToken: accessToken || undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setAvailableBranches(result.data.branches);
        // 기본 브랜치 설정 (main 또는 master가 있으면 우선 선택)
        const defaultBranch = result.data.branches.find(branch => 
          branch.name === 'main' || branch.name === 'master'
        );
        if (defaultBranch) {
          setRepositoryBranch(defaultBranch.name);
        } else if (result.data.branches.length > 0) {
          setRepositoryBranch(result.data.branches[0].name);
        }
      } else {
        setBranchError(result.error);
        setAvailableBranches([]);
      }
    } catch (error) {
      console.error('브랜치 조회 실패:', error);
      setBranchError('브랜치 목록을 가져올 수 없습니다.');
      setAvailableBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // [advice from AI] URL 변경 핸들러 (디바운스 적용)
  const handleUrlChange = (url: string) => {
    setRepositoryUrl(url);
    
    // 기존 타이머 정리
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // 새로운 타이머 설정
    const timer = setTimeout(() => {
      handleFetchBranches(url);
    }, 1000); // 1초 후 브랜치 조회
    
    setDebounceTimer(timer);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
          시스템 관리
        </Typography>
          <Typography variant="body1" color="text.secondary">
            도메인별 시스템을 조회하고 관리합니다. 각 시스템은 프로젝트에서 개발된 소프트웨어 솔루션을 관리합니다.
        </Typography>
      </Box>
        {permissions.canManageSystems && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRegistrationDialog(true)}
            sx={{ ml: 2 }}
          >
            시스템 등록
          </Button>
        )}
      </Box>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
        <TextField
                fullWidth
                placeholder="시스템 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>시스템 상태</InputLabel>
          <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="시스템 상태"
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="active">활성</MenuItem>
            <MenuItem value="inactive">비활성</MenuItem>
                  <MenuItem value="deprecated">폐기예정</MenuItem>
                  <MenuItem value="archived">보관</MenuItem>
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>시스템 타입</InputLabel>
          <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="시스템 타입"
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="web">웹</MenuItem>
            <MenuItem value="api">API</MenuItem>
            <MenuItem value="database">데이터베이스</MenuItem>
            <MenuItem value="microservice">마이크로서비스</MenuItem>
            <MenuItem value="mobile">모바일</MenuItem>
            <MenuItem value="desktop">데스크톱</MenuItem>
                  <MenuItem value="ai_service">AI 서비스</MenuItem>
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <PermissionButton
            variant="contained" 
                startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
                permissions={['can_manage_systems']}
                noPermissionTooltip="시스템 관리 권한이 필요합니다"
                hideIfNoPermission={true}
                fullWidth
              >
                새 시스템
              </PermissionButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 시스템 목록 */}
      {filteredSystems.length === 0 ? (
        systems.length === 0 ? (
          <EmptyState
            title="등록된 시스템이 없습니다"
            description="아직 등록된 시스템이 없습니다. 새로운 시스템을 등록하여 지식자원 카탈로그를 시작해보세요."
            actionText="시스템 등록하기"
            onActionClick={() => setRegistrationDialog(true)}
            secondaryActionText="프로젝트 먼저 만들기"
            secondaryActionPath="/knowledge/projects"
          />
        ) : (
          <Alert severity="info" sx={{ textAlign: 'center', py: 3 }}>
            검색 조건에 맞는 시스템이 없습니다. 다른 검색어를 시도해보세요.
        </Alert>
        )
      ) : (
        <Grid container spacing={3}>
              {filteredSystems.map((system) => (
            <Grid item xs={12} sm={6} md={4} key={system.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {system.name}
                    </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {system.type} • {system.architecture}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        setSelectedSystem(system);
                        setViewDialog(true);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {system.description || '시스템 개요가 없습니다.'}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      도메인: {system.domain_name || '미정'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      개발 단계: {system.development_stage}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      버전: {system.version}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {(system.tech_stack || []).slice(0, 3).map((tech, index) => (
                      <Chip 
                        key={index}
                        label={tech} 
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {(system.tech_stack || []).length > 3 && (
                        <Chip 
                        label={`+${(system.tech_stack || []).length - 3}`} 
                          size="small"
                        variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={system.code_status}
                      size="small"
                      color={
                        system.code_status === 'active' ? 'success' :
                        system.code_status === 'inactive' ? 'warning' :
                        system.code_status === 'deprecated' ? 'error' : 'default'
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(system.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                      </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                  <Button 
                          size="small"
                          variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      setSelectedSystem(system);
                      setViewDialog(true);
                    }}
                    sx={{ 
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    상세보기
                  </Button>
                  
                    {permissions.canManageSystems && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="시스템 편집">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedSystem(system);
                            setEditFormData({
                              id: system.id,
                              name: system.name,
                              description: system.description,
                              type: system.type,
                              architecture: system.architecture,
                              domain_id: system.domain_id,
                              development_stage: system.development_stage,
                              version: system.version,
                              tech_stack: system.tech_stack || []
                            });
                            setEditDialog(true);
                          }}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'primary.50'
                            }
                          }}
                        >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      
                      <Tooltip title="시스템 삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSystem(system.id)}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'error.50'
                            }
                          }}
                        >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                    </Box>
                    )}
                </CardActions>
              </Card>
            </Grid>
              ))}
        </Grid>
      )}

      {/* [advice from AI] 시스템 생성 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 시스템 등록</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
              label="시스템명"
                value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControl fullWidth margin="normal">
                <InputLabel>도메인</InputLabel>
                <Select
                  value={formData.domain_id}
                onChange={(e) => setFormData({...formData, domain_id: e.target.value})}
                  label="도메인"
                >
                  {domains.map((domain) => (
                    <MenuItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            <FormControl fullWidth margin="normal">
                <InputLabel>시스템 타입</InputLabel>
                <Select
                  value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as System['type']})}
                  label="시스템 타입"
                >
                <MenuItem value="web">웹</MenuItem>
                <MenuItem value="api">API</MenuItem>
                  <MenuItem value="database">데이터베이스</MenuItem>
                  <MenuItem value="microservice">마이크로서비스</MenuItem>
                <MenuItem value="mobile">모바일</MenuItem>
                <MenuItem value="desktop">데스크톱</MenuItem>
                <MenuItem value="ai_service">AI 서비스</MenuItem>
                </Select>
              </FormControl>
            <FormControl fullWidth margin="normal">
                <InputLabel>아키텍처</InputLabel>
                <Select
                  value={formData.architecture}
                onChange={(e) => setFormData({...formData, architecture: e.target.value as System['architecture']})}
                  label="아키텍처"
                >
                  <MenuItem value="monolithic">모놀리식</MenuItem>
                  <MenuItem value="microservices">마이크로서비스</MenuItem>
                  <MenuItem value="serverless">서버리스</MenuItem>
                  <MenuItem value="hybrid">하이브리드</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
              label="버전"
                value={formData.version}
              onChange={(e) => setFormData({...formData, version: e.target.value})}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleCreateSystem}>등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 시스템 등록 다이얼로그 */}
      <Dialog 
        open={registrationDialog} 
        onClose={() => setRegistrationDialog(false)}
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          시스템 등록
          <Typography variant="body2" color="text.secondary">
            Git 레포지토리를 분석하여 시스템을 자동으로 등록합니다
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Stepper activeStep={registrationStep} orientation="vertical">
            
            {/* Step 1: 레포지토리 정보 입력 */}
            <Step>
              <StepLabel>레포지토리 정보 입력</StepLabel>
              <StepContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
              <TextField
                fullWidth
                      label="Git 레포지토리 URL"
                      placeholder="https://github.com/user/repo"
                      value={repositoryUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      helperText={`지원 서비스: GitHub, GitLab, Bitbucket, Azure DevOps
                      감지된 서비스: ${detectGitService(repositoryUrl)}`}
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>브랜치</InputLabel>
                      <Select
                        value={repositoryBranch}
                        onChange={(e) => setRepositoryBranch(e.target.value)}
                        label="브랜치"
                        disabled={isLoadingBranches || availableBranches.length === 0}
                      >
                        {isLoadingBranches ? (
                          <MenuItem disabled>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={16} />
                              브랜치 목록 조회 중...
                            </Box>
                          </MenuItem>
                        ) : availableBranches.length > 0 ? (
                          availableBranches.map((branch) => (
                            <MenuItem key={branch.name} value={branch.name}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {branch.name}
                                {branch.protected && (
                                  <Chip 
                                    label="보호됨" 
                                    size="small" 
                                    color="warning" 
                variant="outlined"
                                  />
                                )}
                              </Box>
                            </MenuItem>
                          ))
                        ) : repositoryUrl ? (
                          <MenuItem disabled>
                            브랜치를 찾을 수 없습니다
                          </MenuItem>
                        ) : (
                          <MenuItem disabled>
                            레포지토리 URL을 입력하세요
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>
                    {branchError && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {branchError}
                      </Typography>
                    )}
                    {availableBranches.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {availableBranches.length}개의 브랜치를 찾았습니다
                      </Typography>
                    )}
            </Grid>
                  
                  <Grid item xs={6}>
              <TextField
                fullWidth
                      label="액세스 토큰 (선택사항)"
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      helperText="Private 레포지토리용"
              />
            </Grid>
                  
            <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handleAnalyzeRepository}
                      disabled={!repositoryUrl.trim() || isAnalyzing}
                      startIcon={isAnalyzing ? <CircularProgress size={20} /> : null}
                    >
                      {isAnalyzing ? '분석 중...' : '레포지토리 분석'}
                    </Button>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>

            {/* Step 2: 분석 결과 확인 및 시스템 정보 입력 */}
            <Step>
              <StepLabel>분석 결과 확인</StepLabel>
              <StepContent>
                {analysisResult && (
                  <Grid container spacing={3}>
                    
                    {/* 레포지토리 기본 정보 */}
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        📋 레포지토리 정보
                      </Typography>
                      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {analysisResult.repository?.fullName || analysisResult.repository?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {analysisResult.repository?.description || '설명 없음'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={analysisResult.repository?.language || 'Unknown'} size="small" />
                          <Chip label={`⭐ ${analysisResult.repository?.stars || 0}`} size="small" />
                          <Chip label={`🍴 ${analysisResult.repository?.forks || 0}`} size="small" />
                        </Box>
                      </Card>
                    </Grid>

                    {/* 코드 분석 결과 */}
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        🔍 코드 분석 결과
                      </Typography>
                      <Grid container spacing={2}>
                        
                        {/* 언어 통계 */}
                        <Grid item xs={6}>
                          <Card variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              프로그래밍 언어
                            </Typography>
                            {analysisResult.codeAnalysis.languages.slice(0, 5).map((lang, index) => (
                              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">{lang.language}</Typography>
                                <Typography variant="body2">{lang.percentage}%</Typography>
                              </Box>
                            ))}
                          </Card>
                        </Grid>

                        {/* 프레임워크 */}
                        <Grid item xs={6}>
                          <Card variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              프레임워크
                            </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {analysisResult.codeAnalysis.frameworks.map((framework, index) => (
                                <Chip key={index} label={framework} size="small" />
                      ))}
                    </Box>
                          </Card>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* 시스템 정보 입력 */}
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        ⚙️ 시스템 정보
                      </Typography>
                      <Grid container spacing={2}>
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="시스템명"
                            value={systemData.name}
                            onChange={(e) => setSystemData(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>도메인</InputLabel>
                            <Select
                              value={systemData.domain_id}
                              onChange={(e) => setSystemData(prev => ({ ...prev, domain_id: e.target.value }))}
                              label="도메인"
                              required
                            >
                              {domains.map((domain) => (
                                <MenuItem key={domain.id} value={domain.id}>
                                  {domain.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="시스템 설명"
                            multiline
                            rows={3}
                            value={systemData.description}
                            onChange={(e) => setSystemData(prev => ({ ...prev, description: e.target.value }))}
                            required
                          />
          </Grid>
                        
                        <Grid item xs={6}>
                          <FormControl fullWidth>
                            <InputLabel>카테고리</InputLabel>
                            <Select
                              value={systemData.category}
                              onChange={(e) => setSystemData(prev => ({ ...prev, category: e.target.value }))}
                              label="카테고리"
                            >
                              <MenuItem value="frontend">프론트엔드</MenuItem>
                              <MenuItem value="backend">백엔드</MenuItem>
                              <MenuItem value="fullstack">풀스택</MenuItem>
                              <MenuItem value="enterprise">엔터프라이즈</MenuItem>
                              <MenuItem value="web">웹</MenuItem>
                              <MenuItem value="data">데이터</MenuItem>
                              <MenuItem value="general">일반</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <FormControl fullWidth>
                            <InputLabel>개발 단계</InputLabel>
                            <Select
                              value={systemData.development_stage}
                              onChange={(e) => setSystemData(prev => ({ ...prev, development_stage: e.target.value }))}
                              label="개발 단계"
                            >
                              <MenuItem value="planning">기획</MenuItem>
                              <MenuItem value="development">개발</MenuItem>
                              <MenuItem value="testing">테스트</MenuItem>
                              <MenuItem value="production">운영</MenuItem>
                              <MenuItem value="maintenance">유지보수</MenuItem>
                            </Select>
                          </FormControl>
                </Grid>
                        
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="버전"
                            value={systemData.version}
                            onChange={(e) => setSystemData(prev => ({ ...prev, version: e.target.value }))}
                          />
                </Grid>
                        
                        <Grid item xs={6}>
                          <FormControl fullWidth>
                            <InputLabel>아키텍처 타입</InputLabel>
                            <Select
                              value={systemData.architecture_type}
                              onChange={(e) => setSystemData(prev => ({ ...prev, architecture_type: e.target.value }))}
                              label="아키텍처 타입"
                            >
                              <MenuItem value="monolithic">모놀리식</MenuItem>
                              <MenuItem value="microservices">마이크로서비스</MenuItem>
                              <MenuItem value="serverless">서버리스</MenuItem>
                              <MenuItem value="hybrid">하이브리드</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                  <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            기술 스택
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {systemData.tech_stack.map((tech, index) => (
                              <Chip key={index} label={tech} size="small" />
                      ))}
                    </Box>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* 에러 표시 */}
                    {analysisResult.errors && analysisResult.errors.length > 0 && (
                      <Grid item xs={12}>
                        <Alert severity="warning">
                          <Typography variant="subtitle2">분석 중 일부 오류가 발생했습니다:</Typography>
                          <ul>
                            {analysisResult.errors.map((error, index) => (
                              <li key={index}>{error.type}: {error.error}</li>
                            ))}
                          </ul>
                        </Alert>
                  </Grid>
                )}

                  <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button 
                          onClick={() => setRegistrationStep(0)}
                          variant="outlined"
                        >
                          이전
                      </Button>
                      <Button 
                          variant="contained"
                          onClick={() => setRegistrationStep(2)}
                          disabled={!systemData.name || !systemData.description || !systemData.domain_id}
                        >
                          다음
                      </Button>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </StepContent>
            </Step>

            {/* Step 3: 최종 확인 및 등록 */}
            <Step>
              <StepLabel>최종 확인 및 등록</StepLabel>
              <StepContent>
                {analysisResult && (
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        📝 등록할 시스템 정보
                      </Typography>
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2">시스템명</Typography>
                            <Typography>{systemData.name}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2">도메인</Typography>
                            <Typography>{domains.find(d => d.id === systemData.domain_id)?.name}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2">설명</Typography>
                            <Typography>{systemData.description}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2">카테고리</Typography>
                            <Typography>{systemData.category}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2">개발 단계</Typography>
                            <Typography>{systemData.development_stage}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2">레포지토리</Typography>
                            <Typography variant="body2" color="primary">
                              {systemData.repository_url}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          onClick={() => setRegistrationStep(1)}
                          variant="outlined"
                        >
                          이전
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleRegisterSystem}
                          color="primary"
                        >
                          시스템 등록
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </StepContent>
            </Step>

          </Stepper>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => {
            setRegistrationDialog(false);
            resetRegistrationState();
          }}>
            취소
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 시스템 편집 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>시스템 편집</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="시스템명"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>타입</InputLabel>
                <Select
                  value={editFormData.type || 'web'}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value as System['type'] }))}
                  label="타입"
                >
                  <MenuItem value="web">웹 애플리케이션</MenuItem>
                  <MenuItem value="mobile">모바일 앱</MenuItem>
                  <MenuItem value="desktop">데스크톱 앱</MenuItem>
                  <MenuItem value="api">API 서비스</MenuItem>
                  <MenuItem value="database">데이터베이스</MenuItem>
                  <MenuItem value="infrastructure">인프라</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>개발 단계</InputLabel>
                <Select
                  value={editFormData.development_stage || 'development'}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, development_stage: e.target.value }))}
                  label="개발 단계"
                >
                  <MenuItem value="development">개발</MenuItem>
                  <MenuItem value="testing">테스트</MenuItem>
                  <MenuItem value="production">운영</MenuItem>
                  <MenuItem value="maintenance">유지보수</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="버전"
                value={editFormData.version || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, version: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button onClick={handleUpdateSystem} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 시스템 상세보기 다이얼로그 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>시스템 상세 정보</DialogTitle>
        <DialogContent>
          {selectedSystem && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedSystem.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedSystem.description || '설명이 없습니다.'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>타입</Typography>
                <Typography variant="body2">{selectedSystem.type}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>아키텍처</Typography>
                <Typography variant="body2">{selectedSystem.architecture}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>도메인</Typography>
                <Typography variant="body2">{selectedSystem.domain_name || '미정'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>개발 단계</Typography>
                <Typography variant="body2">{selectedSystem.development_stage}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>버전</Typography>
                <Typography variant="body2">{selectedSystem.version}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>상태</Typography>
                <Typography variant="body2">{selectedSystem.code_status || selectedSystem.status || '미정'}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>프로젝트</Typography>
                <Typography variant="body2">{selectedSystem.project_name || '미정'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>레포지토리 URL</Typography>
                <Typography variant="body2" color="primary">
                  {selectedSystem.repository_url ? (
                    <a href={selectedSystem.repository_url} target="_blank" rel="noopener noreferrer">
                      {selectedSystem.repository_url}
                    </a>
                  ) : '미정'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>기술 스택</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selectedSystem.tech_stack || []).length > 0 ? (
                    (selectedSystem.tech_stack || []).map((tech, index) => (
                      <Chip key={index} label={tech} size="small" variant="outlined" />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">기술 스택 정보가 없습니다.</Typography>
                  )}
            </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>생성일</Typography>
                <Typography variant="body2">
                  {selectedSystem.created_at ? new Date(selectedSystem.created_at).toLocaleDateString('ko-KR') : '미정'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>작성자</Typography>
                <Typography variant="body2">{selectedSystem.created_by_username || selectedSystem.author_username || '미정'}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>문서 URL</Typography>
                <Typography variant="body2" color="primary">
                  {selectedSystem.documentation_url ? (
                    <a href={selectedSystem.documentation_url} target="_blank" rel="noopener noreferrer">
                      {selectedSystem.documentation_url}
                    </a>
                  ) : '미정'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" gutterBottom>데모 URL</Typography>
                <Typography variant="body2" color="primary">
                  {selectedSystem.demo_url ? (
                    <a href={selectedSystem.demo_url} target="_blank" rel="noopener noreferrer">
                      {selectedSystem.demo_url}
                    </a>
                  ) : '미정'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>닫기</Button>
          {permissions.canManageSystems && (
            <>
              <Button 
                onClick={() => {
              setViewDialog(false);
                  setEditFormData({
                    id: selectedSystem?.id,
                    name: selectedSystem?.name,
                    description: selectedSystem?.description,
                    type: selectedSystem?.type,
                    architecture: selectedSystem?.architecture,
                    domain_id: selectedSystem?.domain_id,
                    development_stage: selectedSystem?.development_stage,
                    version: selectedSystem?.version,
                    tech_stack: selectedSystem?.tech_stack || []
                  });
                  setEditDialog(true);
                }}
                variant="outlined"
                startIcon={<EditIcon />}
              >
              수정
            </Button>
              <Button 
                onClick={() => {
                  if (selectedSystem?.id && window.confirm('이 시스템을 삭제하시겠습니까?')) {
                    handleDeleteSystem(selectedSystem.id);
                    setViewDialog(false);
                  }
                }}
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
              >
                삭제
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 관련 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          시스템 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Container>
  );
};

export default SystemsPage;