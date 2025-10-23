// [advice from AI] 프로젝트 관리 페이지 - 다른 지식자원들과 동일한 형태로 통일
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
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import EmptyState from '../../components/common/EmptyState';
import PermissionButton from '../../components/common/PermissionButton';

// [advice from AI] 프로젝트 데이터 타입
interface Project {
  id: string;
  name: string;
  domain_id: string;
  domain_name?: string;
  project_overview: string;
  target_system_name: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  deadline: string;
  project_status: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  is_urgent_development: boolean;
  urgent_reason?: string;
  expected_completion_hours?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

// [advice from AI] 도메인 옵션 타입
interface DomainOption {
  id: string;
  name: string;
}

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();

  // [advice from AI] 디버깅: 현재 사용자 정보 및 권한 확인
  console.log('🔍 현재 사용자 정보:', user);
  console.log('🔍 사용자 권한:', permissions);
  console.log('🔍 canManageProjects:', permissions.canManageProjects);
  console.log('🔍 사용자 roleType:', user?.roleType);
  console.log('🔍 사용자 permissionLevel:', user?.permissionLevel);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    customer_company: '',
    requirements: '',
    expected_duration: '',
    budget: '',
    priority: 'medium' as Project['priority'],
    status: 'planning' as Project['status'],
    domain_id: '',
    urgency_level: 'medium' as Project['urgency_level'],
    deadline: '',
    target_system_name: '',
    // 개발자를 위한 상세 정보
    tech_stack: '',
    dev_environment: '',
    api_specs: '',
    database_info: '',
    performance_security: '',
    special_notes: '',
    // 긴급 개발 관련
    is_urgent_development: false,
    urgent_reason: '',
    expected_completion_hours: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer_company: '',
    requirements: '',
    expected_duration: '',
    budget: '',
    priority: 'medium' as Project['priority'],
    status: 'planning' as Project['status'],
    domain_id: '',
    urgency_level: 'medium' as Project['urgency_level'],
    deadline: '',
    target_system_name: '',
    assigned_po: '',
    milestones: [],
    // 개발자를 위한 상세 정보
    tech_stack: '',
    dev_environment: '',
    api_specs: '',
    database_info: '',
    performance_security: '',
    special_notes: '',
    // 긴급 개발 관련
    is_urgent_development: false,
    urgent_reason: '',
    expected_completion_hours: ''
  });

  // [advice from AI] 날짜를 HTML input 형식으로 변환
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // YYYY-MM-DD 형식으로 변환
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('날짜 입력 형식 변환 오류:', error);
      return '';
    }
  };

  // [advice from AI] 날짜 포맷팅 함수
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '미정';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '미정';
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error);
      return '미정';
    }
  };

  // [advice from AI] 날짜 포맷팅 함수 (간단한 형식)
  const formatDateShort = (dateString: string | null | undefined): string => {
    if (!dateString) return '미정';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '미정';
      
      return date.toLocaleDateString('ko-KR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error);
      return '미정';
    }
  };

  // [advice from AI] API URL 생성
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      } else {
        return `http://${hostname}:3001`;
      }
    }
    return 'http://localhost:3001';
  };

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const apiUrl = getApiUrl();
      
      // 프로젝트 데이터 로드
      const projectsResponse = await fetch(`${apiUrl}/api/knowledge/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        console.log('🔍 프로젝트 데이터 응답:', projectsData);
        console.log('🔍 프로젝트 배열:', projectsData.projects);
        
        if (projectsData.success && projectsData.projects) {
          setProjects(projectsData.projects);
          console.log('✅ 프로젝트 데이터 설정 완료:', projectsData.projects.length, '개');
        } else {
          console.warn('⚠️ 프로젝트 데이터 구조 오류:', projectsData);
          setProjects([]);
        }
      } else {
        console.error('❌ 프로젝트 데이터 로드 실패:', projectsResponse.status);
        setProjects([]);
      }

      // 도메인 데이터 로드
      const domainsResponse = await fetch(`${apiUrl}/api/knowledge/domains`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json();
        console.log('🔍 도메인 데이터 응답:', domainsData);
        
        if (domainsData.success && domainsData.domains) {
          setDomains(domainsData.domains);
          console.log('✅ 도메인 데이터 설정 완료:', domainsData.domains.length, '개');
        } else {
          console.warn('⚠️ 도메인 데이터 구조 오류:', domainsData);
          setDomains([]);
        }
      } else {
        console.error('❌ 도메인 데이터 로드 실패:', domainsResponse.status);
        setDomains([]);
      }
      
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      setProjects([]);
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

  // [advice from AI] 필터링된 프로젝트 목록
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.project_overview.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.project_status === filterStatus;
    const matchesUrgency = filterUrgency === 'all' || project.urgency_level === filterUrgency;
    const matchesDomain = filterDomain === 'all' || project.domain_id === filterDomain;
    
    return matchesSearch && matchesStatus && matchesUrgency && matchesDomain;
  });

  // [advice from AI] 프로젝트 삭제
  const handleDeleteProject = async (projectId: string) => {
    try {
      console.log('🔍 프로젝트 삭제 요청:', projectId);
      
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/knowledge/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 삭제 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ 삭제 오류 응답:', errorData);
        alert(`프로젝트 삭제 실패: ${errorData.message || '알 수 없는 오류'}`);
        return;
      }

      console.log('✅ 프로젝트 삭제 성공');
      alert('프로젝트가 성공적으로 삭제되었습니다.');
      loadData(); // 목록 새로고침
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 편집 다이얼로그 열기 및 데이터 로드
  const handleOpenEditDialog = (project: Project) => {
    console.log('🔍 편집 다이얼로그 열기:', project);
    console.log('🔍 프로젝트 전체 데이터:', JSON.stringify(project, null, 2));
    console.log('🔍 design_requirements:', project.design_requirements);
    
    setSelectedProject(project);
    
    // design_requirements 파싱
    let designRequirements = {};
    if (project.design_requirements) {
      try {
        if (typeof project.design_requirements === 'string') {
          designRequirements = JSON.parse(project.design_requirements);
        } else {
          designRequirements = project.design_requirements;
        }
        console.log('🔍 파싱된 design_requirements:', designRequirements);
      } catch (error) {
        console.error('❌ design_requirements 파싱 오류:', error);
        designRequirements = {};
      }
    }
    
    // 기존 프로젝트 데이터를 편집 폼에 로드
    const editData = {
      name: project.name || '',
      description: project.description || '',
      customer_company: project.customer_company || '',
      requirements: project.requirements || '',
      expected_duration: project.expected_duration?.toString() || '',
      budget: project.budget?.toString() || '',
      priority: project.priority || 'medium',
      status: project.status || 'planning',
      domain_id: project.domain_id || '',
      urgency_level: project.urgency_level || 'medium',
      deadline: project.deadline || '',
      target_system_name: project.target_system_name || '',
      // 개발자 정보 (design_requirements에서 추출)
      tech_stack: designRequirements.tech_stack || '',
      dev_environment: designRequirements.dev_environment || '',
      api_specs: designRequirements.api_specs || '',
      database_info: designRequirements.database_info || '',
      performance_security: designRequirements.performance_security || '',
      special_notes: designRequirements.special_notes || '',
      // 긴급 개발 정보
      is_urgent_development: designRequirements.urgent_development?.is_urgent || false,
      urgent_reason: designRequirements.urgent_development?.reason || '',
      expected_completion_hours: designRequirements.urgent_development?.expected_hours?.toString() || ''
    };
    
    console.log('🔍 편집 폼에 로드할 데이터:', editData);
    setEditFormData(editData);
    setEditDialog(true);
  };

  // [advice from AI] 프로젝트 편집 저장
  const handleUpdateProject = async () => {
    try {
      if (!selectedProject?.id) {
        alert('편집할 프로젝트가 선택되지 않았습니다.');
        return;
      }

      console.log('🔍 프로젝트 편집 요청:', selectedProject.id);
      console.log('🔍 편집할 데이터:', editFormData);
      
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/knowledge/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      console.log('🔍 편집 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ 편집 오류 응답:', errorData);
        alert(`프로젝트 편집 실패: ${errorData.message || '알 수 없는 오류'}`);
        return;
      }

      const result = await response.json();
      console.log('✅ 프로젝트 편집 성공:', result);
      
      setEditDialog(false);
      setSelectedProject(null);
      loadData(); // 목록 새로고침
      alert('프로젝트가 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('프로젝트 편집 실패:', error);
      alert('프로젝트 편집 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 프로젝트 생성
  const handleCreateProject = async () => {
    try {
      console.log('🔍 전송할 데이터:', formData);
      
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/knowledge/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      console.log('🔍 응답 상태:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API 오류 응답:', errorData);
        alert(`프로젝트 생성 실패: ${errorData.message || '알 수 없는 오류'}`);
        return;
      }

      const result = await response.json();
      console.log('✅ 프로젝트 생성 성공:', result);
      
      setCreateDialog(false);
      setFormData({
      name: '',
        description: '',
        customer_company: '',
        requirements: '',
        expected_duration: '',
        budget: '',
        priority: 'medium',
        status: 'planning',
      domain_id: '',
      urgency_level: 'medium',
      deadline: '',
        target_system_name: '',
        assigned_po: '',
        milestones: [],
        // 개발자를 위한 상세 정보
        tech_stack: '',
        dev_environment: '',
        api_specs: '',
        database_info: '',
        performance_security: '',
        special_notes: '',
        // 긴급 개발 관련
      is_urgent_development: false,
      urgent_reason: '',
        expected_completion_hours: ''
      });
      loadData();
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성 중 오류가 발생했습니다.');
    }
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          프로젝트 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          도메인별 프로젝트를 조회하고 관리합니다. 각 프로젝트는 고객 요구사항부터 시스템 개발까지의 전체 과정을 관리합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="프로젝트 검색"
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>프로젝트 상태</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="프로젝트 상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="planning">기획</MenuItem>
                  <MenuItem value="in_progress">진행중</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                  <MenuItem value="on_hold">보류</MenuItem>
                  <MenuItem value="cancelled">취소</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>긴급도</InputLabel>
                <Select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  label="긴급도"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="critical">긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>도메인</InputLabel>
                <Select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  label="도메인"
                >
                  <MenuItem value="all">전체</MenuItem>
                  {domains.map((domain) => (
                    <MenuItem key={domain.id} value={domain.id}>{domain.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <PermissionButton
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialog(true)}
                permissions={['can_manage_projects']}
                noPermissionTooltip="프로젝트 관리 권한이 필요합니다"
                hideIfNoPermission={true}
                fullWidth
                >
                  새 프로젝트
              </PermissionButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 프로젝트 목록 */}
      {filteredProjects.length === 0 ? (
        projects.length === 0 ? (
          <EmptyState
            title="등록된 프로젝트가 없습니다"
            description="아직 등록된 프로젝트가 없습니다. 새로운 프로젝트를 등록하여 개발 과정을 관리해보세요."
            actionText="프로젝트 등록하기"
            actionPath="/knowledge/projects"
            secondaryActionText="도메인 먼저 만들기"
            secondaryActionPath="/knowledge/domains"
          />
        ) : (
          <Alert severity="info" sx={{ textAlign: 'center', py: 3 }}>
            검색 조건에 맞는 프로젝트가 없습니다. 다른 검색어를 시도해보세요.
        </Alert>
        )
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
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
                          {project.name}
                        </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {project.domain_name || '도메인 미정'} • {project.target_system_name || '시스템 미정'}
                        </Typography>
                      </Box>
                    <IconButton 
                        size="small" 
                      onClick={() => {
                        setSelectedProject(project);
                        setViewDialog(true);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {project.project_overview || '프로젝트 개요가 없습니다.'}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      마감일: {formatDateShort(project.deadline)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      예상 소요시간: {project.expected_completion_hours || '미정'}시간
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      생성자: {project.created_by_name || 'Unknown'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    <Chip 
                      label={project.project_status}
                      size="small"
                      color={
                        project.project_status === 'completed' ? 'success' :
                        project.project_status === 'in_progress' ? 'info' :
                        project.project_status === 'on_hold' ? 'warning' :
                        project.project_status === 'cancelled' ? 'error' : 'default'
                      }
                    />
                    <Chip 
                      label={project.urgency_level}
                      size="small"
                      variant="outlined"
                      color={
                        project.urgency_level === 'critical' ? 'error' :
                        project.urgency_level === 'high' ? 'warning' :
                        project.urgency_level === 'low' ? 'default' : 'info'
                      }
                    />
                    {project.is_urgent_development && (
                      <Chip 
                        label="긴급개발" 
                        size="small" 
                        color="error"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {project.urgent_reason || '일반 프로젝트'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateShort(project.created_at)}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      setSelectedProject(project);
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
                  
                  {permissions.canManageProjects && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="프로젝트 편집">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditDialog(project)}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'primary.50'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="프로젝트 삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
                              handleDeleteProject(project.id);
                            }
                          }}
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

      {/* [advice from AI] 프로젝트 생성 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 프로젝트 등록</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 기본 정보 섹션 */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
              📋 기본 정보
            </Typography>
            
            <TextField
              fullWidth
              label="프로젝트명"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="예: 모바일 뱅킹 앱 개발"
              helperText="프로젝트의 이름을 입력하세요"
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="프로젝트 설명"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="프로젝트의 목적과 범위를 설명하세요"
              helperText="프로젝트의 목적, 범위, 기대효과를 설명하세요"
              sx={{ mb: 2 }}
              required
            />
            
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel>도메인 선택</InputLabel>
              <Select
                value={formData.domain_id}
                onChange={(e) => setFormData({...formData, domain_id: e.target.value})}
                label="도메인 선택"
              >
                {domains.map((domain) => (
                  <MenuItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="고객사"
              value={formData.customer_company}
              onChange={(e) => setFormData({...formData, customer_company: e.target.value})}
              placeholder="예: ABC 은행"
              helperText="프로젝트를 요청한 고객사명을 입력하세요"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="요구사항"
              value={formData.requirements}
              onChange={(e) => setFormData({...formData, requirements: e.target.value})}
              placeholder="프로젝트의 주요 요구사항을 입력하세요"
              helperText="기능적 요구사항, 비기능적 요구사항을 상세히 입력하세요"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="목표 시스템명 (향후 솔루션명)"
              value={formData.target_system_name}
              onChange={(e) => setFormData({...formData, target_system_name: e.target.value})}
              placeholder="예: SmartBank Mobile v1.0"
              helperText="개발될 시스템의 이름을 입력하세요"
              sx={{ mb: 2 }}
            />

            {/* 프로젝트 관리 정보 섹션 */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
              📊 프로젝트 관리 정보
              </Typography>
              
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="예상 기간 (일)"
                  value={formData.expected_duration}
                  onChange={(e) => setFormData({...formData, expected_duration: e.target.value})}
                  placeholder="30"
                  helperText="프로젝트 완료까지 예상되는 일수"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="예산 (원)"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  placeholder="10000000"
                  helperText="프로젝트 예산을 입력하세요"
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
            
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>프로젝트 상태</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as Project['status']})}
                    label="프로젝트 상태"
                  >
                    <MenuItem value="planning">기획</MenuItem>
                    <MenuItem value="in_progress">진행중</MenuItem>
                    <MenuItem value="development">개발</MenuItem>
                    <MenuItem value="testing">테스트</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                    <MenuItem value="on_hold">보류</MenuItem>
                  </Select>
                </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>우선순위</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as Project['priority']})}
                    label="우선순위"
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">긴급</MenuItem>
                  </Select>
                </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>긴급도</InputLabel>
                  <Select
                    value={formData.urgency_level}
                    onChange={(e) => setFormData({...formData, urgency_level: e.target.value as Project['urgency_level']})}
                    label="긴급도"
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">긴급</MenuItem>
                  </Select>
                </FormControl>
                </Grid>
              </Grid>
            
            <TextField
              fullWidth
                type="date"
                label="마감일"
                value={formatDateForInput(formData.deadline)}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                InputLabelProps={{ shrink: true }}
                helperText="프로젝트 완료 예정일을 선택하세요"
              sx={{ mb: 2 }}
            />
            
            {/* 개발자를 위한 상세 정보 섹션 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                🛠️ 개발자를 위한 상세 정보
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                아래 정보들은 작업 시작 시 개발자에게 도움이 됩니다. 가능한 한 상세히 입력해 주세요.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="권장 기술 스택"
                    value={formData.tech_stack}
                    onChange={(e) => setFormData({...formData, tech_stack: e.target.value})}
                    placeholder="예: React, Node.js, PostgreSQL, Docker"
                    helperText="주요 프로그래밍 언어, 프레임워크, 데이터베이스 등"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="개발 환경 요구사항"
                    value={formData.dev_environment}
                    onChange={(e) => setFormData({...formData, dev_environment: e.target.value})}
                    placeholder="예: Node.js 18+, Docker, Git"
                    helperText="필수 개발 도구 및 버전 요구사항"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="API 명세 및 연동 정보"
                    value={formData.api_specs}
                    onChange={(e) => setFormData({...formData, api_specs: e.target.value})}
                    placeholder="예: REST API 기반, JWT 인증, Swagger 문서 제공 예정"
                    helperText="외부 API 연동, 인증 방식, 데이터 포맷 등"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="데이터베이스 정보"
                    value={formData.database_info}
                    onChange={(e) => setFormData({...formData, database_info: e.target.value})}
                    placeholder="예: PostgreSQL 15, Redis 캐시 활용"
                    helperText="DB 종류, 스키마 설계 방향"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="성능 및 보안 요구사항"
                    value={formData.performance_security}
                    onChange={(e) => setFormData({...formData, performance_security: e.target.value})}
                    placeholder="예: 동시 사용자 1000명, HTTPS 필수"
                    helperText="성능 목표, 보안 수준, 규정 준수"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="특별 고려사항 및 제약조건"
                    value={formData.special_notes}
                    onChange={(e) => setFormData({...formData, special_notes: e.target.value})}
                    placeholder="예: 기존 레거시 시스템과의 호환성 유지 필요, 24/7 무중단 서비스"
                    helperText="개발 시 특별히 주의해야 할 사항들"
                    sx={{ mb: 1 }}
                  />
                </Grid>
              </Grid>
            </Box>
            
            {/* 긴급 개발 옵션 섹션 */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'error.main', mb: 2 }}>
                🚨 긴급 개발 프로젝트
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_urgent_development}
                    onChange={(e) => setFormData({
                      ...formData, 
                      is_urgent_development: e.target.checked,
                      urgency_level: e.target.checked ? 'critical' : formData.urgency_level
                    })}
                    color="error"
                  />
                }
                label="이 프로젝트는 긴급 개발이 필요합니다"
                sx={{ mb: 2 }}
              />

              {formData.is_urgent_development && (
                <Box>
                  <TextField
                    fullWidth
                    label="긴급 개발 사유 *"
                    multiline
                    rows={3}
                    value={formData.urgent_reason}
                    onChange={(e) => setFormData({...formData, urgent_reason: e.target.value})}
                    placeholder="긴급하게 개발이 필요한 사유를 상세히 입력해주세요. (예: 고객 요구사항 변경, 시장 상황 급변, 보안 이슈 등)"
                    sx={{ mb: 2 }}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="예상 완료 시간 (시간) *"
                    value={formData.expected_completion_hours}
                    onChange={(e) => setFormData({...formData, expected_completion_hours: e.target.value})}
                    placeholder="24"
                    helperText="긴급 개발 완료까지 예상되는 시간을 입력해주세요"
                    sx={{ mb: 2 }}
                    required
                  />

                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>긴급 개발 프로젝트 주의사항:</strong><br />
                      • 최고 우선순위로 처리되며 다른 작업보다 우선 할당됩니다<br />
                      • PO 대시보드의 긴급 처리 사항에 실시간으로 표시됩니다<br />
                      • 완료 시간 추적 및 성과 분석이 별도로 진행됩니다
              </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>고객사 요구사항</strong>과 <strong>디자인 요구사항</strong> 파일 업로드는 향후 추가 예정입니다.
                  </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleCreateProject}>등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 상세보기 다이얼로그 */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon />
            프로젝트 상세 정보
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProject ? (
            <Box sx={{ pt: 2 }}>
              {/* 기본 정보 */}
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                📋 기본 정보
                        </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="프로젝트명"
                    value={selectedProject.name}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="도메인"
                    value={selectedProject.domain_name || '미정'}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="프로젝트 설명"
                    value={selectedProject.description || '설명이 없습니다.'}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="고객사"
                    value={selectedProject.customer_company || '미정'}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="목표 시스템명"
                    value={selectedProject.target_system_name || '미정'}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
              </Grid>

              {/* 프로젝트 관리 정보 */}
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                📊 프로젝트 관리 정보
                          </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="예상 기간"
                    value={selectedProject.expected_duration ? `${selectedProject.expected_duration}일` : '미정'}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="예산"
                    value={selectedProject.budget ? `${selectedProject.budget.toLocaleString()}원` : '미정'}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="마감일"
                    value={formatDate(selectedProject.deadline)}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: '80px' }}>상태:</Typography>
                      <Chip 
                      label={selectedProject.status}
                      color={
                        selectedProject.status === 'completed' ? 'success' :
                        selectedProject.status === 'in_progress' ? 'info' :
                        selectedProject.status === 'on_hold' ? 'warning' :
                        selectedProject.status === 'cancelled' ? 'error' : 'default'
                      }
                        size="small" 
                    />
                      </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: '80px' }}>우선순위:</Typography>
                      <Chip 
                      label={selectedProject.priority}
                      color={
                        selectedProject.priority === 'critical' ? 'error' :
                        selectedProject.priority === 'high' ? 'warning' :
                        selectedProject.priority === 'low' ? 'default' : 'info'
                      }
                        size="small" 
                      />
                    </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: '80px' }}>긴급도:</Typography>
                    <Chip 
                      label={selectedProject.urgency_level}
                      color={
                        selectedProject.urgency_level === 'critical' ? 'error' :
                        selectedProject.urgency_level === 'high' ? 'warning' :
                        selectedProject.urgency_level === 'low' ? 'default' : 'info'
                      }
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* 개발자 정보 */}
              {selectedProject.design_requirements && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                    🛠️ 개발자 정보
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="기술 스택"
                        value={selectedProject.design_requirements.tech_stack || '미정'}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="개발 환경"
                        value={selectedProject.design_requirements.dev_environment || '미정'}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="API 명세"
                        value={selectedProject.design_requirements.api_specs || '미정'}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        multiline
                        rows={2}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="데이터베이스"
                        value={selectedProject.design_requirements.database_info || '미정'}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="성능/보안"
                        value={selectedProject.design_requirements.performance_security || '미정'}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="특별 고려사항"
                        value={selectedProject.design_requirements.special_notes || '미정'}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        multiline
                        rows={2}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {/* 긴급 개발 정보 */}
              {selectedProject.design_requirements?.urgent_development?.is_urgent && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'error.main', fontWeight: 600 }}>
                    🚨 긴급 개발 정보
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                <TextField
                        fullWidth
                        label="긴급 개발 사유"
                        value={selectedProject.design_requirements.urgent_development.reason || '미정'}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="예상 완료 시간"
                        value={selectedProject.design_requirements.urgent_development.expected_hours ? `${selectedProject.design_requirements.urgent_development.expected_hours}시간` : '미정'}
                        InputProps={{ readOnly: true }}
                  variant="outlined" 
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* 생성 정보 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  생성자: {selectedProject.created_by_name || 'Unknown'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  생성일: {formatDate(selectedProject.created_at)}
                </Typography>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {permissions.canManageProjects && selectedProject && (
            <>
              <Button
                startIcon={<EditIcon />}
                  onClick={() => {
                  setViewDialog(false);
                  setEditDialog(true);
                }}
              >
                편집
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                onClick={() => {
                  if (window.confirm(`"${selectedProject.name}" 프로젝트를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
                    handleDeleteProject(selectedProject.id);
                    setViewDialog(false);
                  }
                }}
              >
                삭제
                </Button>
            </>
          )}
          <Button onClick={() => setViewDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 편집 다이얼로그 */}
      <Dialog 
        open={editDialog} 
        onClose={() => setEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            프로젝트 편집
              </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 기본 정보 섹션 */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
              📋 기본 정보
            </Typography>
            
            <TextField
              fullWidth
              label="프로젝트명"
              value={editFormData.name}
              onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
              placeholder="예: 모바일 뱅킹 앱 개발"
              helperText="프로젝트의 이름을 입력하세요"
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="프로젝트 설명"
              value={editFormData.description}
              onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
              placeholder="프로젝트의 목적과 범위를 설명하세요"
              helperText="프로젝트의 목적, 범위, 기대효과를 설명하세요"
              sx={{ mb: 2 }}
              required
            />
            
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel>도메인 선택</InputLabel>
              <Select
                value={editFormData.domain_id}
                onChange={(e) => setEditFormData({...editFormData, domain_id: e.target.value})}
                label="도메인 선택"
              >
                {domains.map((domain) => (
                  <MenuItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="고객사"
              value={editFormData.customer_company}
              onChange={(e) => setEditFormData({...editFormData, customer_company: e.target.value})}
              placeholder="예: ABC 은행"
              helperText="프로젝트를 요청한 고객사명을 입력하세요"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="요구사항"
              value={editFormData.requirements}
              onChange={(e) => setEditFormData({...editFormData, requirements: e.target.value})}
              placeholder="프로젝트의 주요 요구사항을 입력하세요"
              helperText="기능적 요구사항, 비기능적 요구사항을 상세히 입력하세요"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="목표 시스템명 (향후 솔루션명)"
              value={editFormData.target_system_name}
              onChange={(e) => setEditFormData({...editFormData, target_system_name: e.target.value})}
              placeholder="예: SmartBank Mobile v1.0"
              helperText="개발될 시스템의 이름을 입력하세요"
              sx={{ mb: 2 }}
            />

            {/* 프로젝트 관리 정보 섹션 */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
              📊 프로젝트 관리 정보
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="예상 기간 (일)"
                  value={editFormData.expected_duration}
                  onChange={(e) => setEditFormData({...editFormData, expected_duration: e.target.value})}
                  placeholder="30"
                  helperText="프로젝트 완료까지 예상되는 일수"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="예산 (원)"
                  value={editFormData.budget}
                  onChange={(e) => setEditFormData({...editFormData, budget: e.target.value})}
                  placeholder="10000000"
                  helperText="프로젝트 예산을 입력하세요"
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>프로젝트 상태</InputLabel>
                  <Select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value as Project['status']})}
                    label="프로젝트 상태"
                  >
                    <MenuItem value="planning">기획</MenuItem>
                    <MenuItem value="in_progress">진행중</MenuItem>
                    <MenuItem value="development">개발</MenuItem>
                    <MenuItem value="testing">테스트</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                    <MenuItem value="on_hold">보류</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>우선순위</InputLabel>
                  <Select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({...editFormData, priority: e.target.value as Project['priority']})}
                    label="우선순위"
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">긴급</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>긴급도</InputLabel>
                  <Select
                    value={editFormData.urgency_level}
                    onChange={(e) => setEditFormData({...editFormData, urgency_level: e.target.value as Project['urgency_level']})}
                    label="긴급도"
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">긴급</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
                <TextField
                  fullWidth
                  type="date"
              label="마감일"
              value={formatDateForInput(editFormData.deadline)}
              onChange={(e) => setEditFormData({...editFormData, deadline: e.target.value})}
                  InputLabelProps={{ shrink: true }}
              helperText="프로젝트 완료 예정일을 선택하세요"
              sx={{ mb: 2 }}
            />

            {/* 개발자를 위한 상세 정보 섹션 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                🛠️ 개발자를 위한 상세 정보
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                아래 정보들은 작업 시작 시 개발자에게 도움이 됩니다. 가능한 한 상세히 입력해 주세요.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="권장 기술 스택"
                    value={editFormData.tech_stack}
                    onChange={(e) => setEditFormData({...editFormData, tech_stack: e.target.value})}
                    placeholder="예: React, Node.js, PostgreSQL, Docker"
                    helperText="주요 프로그래밍 언어, 프레임워크, 데이터베이스 등"
                  sx={{ mb: 2 }}
                />
              </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="개발 환경 요구사항"
                    value={editFormData.dev_environment}
                    onChange={(e) => setEditFormData({...editFormData, dev_environment: e.target.value})}
                    placeholder="예: Node.js 18+, Docker, Git"
                    helperText="필수 개발 도구 및 버전 요구사항"
                    sx={{ mb: 2 }}
                  />
            </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="API 명세 및 연동 정보"
                    value={editFormData.api_specs}
                    onChange={(e) => setEditFormData({...editFormData, api_specs: e.target.value})}
                    placeholder="예: REST API 기반, JWT 인증, Swagger 문서 제공 예정"
                    helperText="외부 API 연동, 인증 방식, 데이터 포맷 등"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="데이터베이스 정보"
                    value={editFormData.database_info}
                    onChange={(e) => setEditFormData({...editFormData, database_info: e.target.value})}
                    placeholder="예: PostgreSQL 15, Redis 캐시 활용"
                    helperText="DB 종류, 스키마 설계 방향"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="성능 및 보안 요구사항"
                    value={editFormData.performance_security}
                    onChange={(e) => setEditFormData({...editFormData, performance_security: e.target.value})}
                    placeholder="예: 동시 사용자 1000명, HTTPS 필수"
                    helperText="성능 목표, 보안 수준, 규정 준수"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="특별 고려사항 및 제약조건"
                    value={editFormData.special_notes}
                    onChange={(e) => setEditFormData({...editFormData, special_notes: e.target.value})}
                    placeholder="예: 기존 레거시 시스템과의 호환성 유지 필요, 24/7 무중단 서비스"
                    helperText="개발 시 특별히 주의해야 할 사항들"
                    sx={{ mb: 1 }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* 긴급 개발 옵션 섹션 */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'error.main', mb: 2 }}>
                🚨 긴급 개발 프로젝트
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editFormData.is_urgent_development}
                    onChange={(e) => setEditFormData({
                      ...editFormData, 
                      is_urgent_development: e.target.checked,
                      urgency_level: e.target.checked ? 'critical' : editFormData.urgency_level
                    })}
                    color="error"
                  />
                }
                label="이 프로젝트는 긴급 개발이 필요합니다"
                sx={{ mb: 2 }}
              />

              {editFormData.is_urgent_development && (
                <Box>
                  <TextField
                    fullWidth
                    label="긴급 개발 사유 *"
                    multiline
                    rows={3}
                    value={editFormData.urgent_reason}
                    onChange={(e) => setEditFormData({...editFormData, urgent_reason: e.target.value})}
                    placeholder="긴급하게 개발이 필요한 사유를 상세히 입력해주세요. (예: 고객 요구사항 변경, 시장 상황 급변, 보안 이슈 등)"
                    sx={{ mb: 2 }}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="예상 완료 시간 (시간) *"
                    value={editFormData.expected_completion_hours}
                    onChange={(e) => setEditFormData({...editFormData, expected_completion_hours: e.target.value})}
                    placeholder="24"
                    helperText="긴급 개발 완료까지 예상되는 시간을 입력해주세요"
                    sx={{ mb: 2 }}
                    required
                  />

                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>긴급 개발 프로젝트 주의사항:</strong><br />
                      • 최고 우선순위로 처리되며 다른 작업보다 우선 할당됩니다<br />
                      • PO 대시보드의 긴급 처리 사항에 실시간으로 표시됩니다<br />
                      • 완료 시간 추적 및 성과 분석이 별도로 진행됩니다
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateProject}
            disabled={!editFormData.name || !editFormData.description}
          >
            수정 완료
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 관련 안내 */}
      {!permissions.canManageProjects && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          프로젝트 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Container>
  );
};

export default ProjectsPage;