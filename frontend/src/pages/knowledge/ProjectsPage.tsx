// [advice from AI] 프로젝트 관리 페이지 - 도메인과 시스템 중간 계층 (프로젝트 생성.tsx 기반 완전 구현)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemText,
  Avatar, Divider, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel,
  Tabs, Tab
} from '@mui/material';
import {
  Assignment as ProjectIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as DomainIcon,
  Computer as SystemIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 프로젝트 정보 인터페이스 (프로젝트 생성.tsx 기반)
interface ProjectInfo {
  id: string;
  name: string;
  domain_id?: string;
  domain_name?: string;
  project_overview?: string;
  target_system_name?: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  deadline?: string;
  project_status: 'planning' | 'in_progress' | 'development' | 'testing' | 'completed' | 'on_hold' | 'cancelled';
  approval_status: 'pending' | 'approved' | 'rejected' | 'draft';
  created_by_name?: string;
  approved_by_name?: string;
  approved_at?: string;
  connected_systems_count?: number;
  created_at: string;
  updated_at: string;
  documents?: ProjectDocument[];
  work_groups?: WorkGroup[];
  similar_systems?: SystemOption[];
  metadata?: any;
  is_urgent_development?: boolean;
  urgent_reason?: string;
  expected_completion_hours?: string;
}

// [advice from AI] 도메인 정보 인터페이스
interface DomainOption {
  id: string;
  name: string;
}

// [advice from AI] 시스템 정보 인터페이스
interface SystemOption {
  id: string;
  name: string;
  title?: string;
  description?: string;
  version?: string;
}

// [advice from AI] 프로젝트 문서 인터페이스
interface ProjectDocument {
  id?: string;
  document_type: 'voc' | 'requirements' | 'design';
  file?: File;
  title: string;
  description?: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

// [advice from AI] 작업 그룹 인터페이스
interface WorkGroup {
  id?: string;
  name: string;
  description?: string;
  assigned_pe?: string;
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'on_hold';
  order_index?: number;
  created_by?: string;
  created_by_name?: string;
  assigned_pe_name?: string;
  created_at?: string;
}

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useJwtAuthStore();
  const permissions = usePermissions();

  // [advice from AI] 상태 관리
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectInfo[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [selectedSimilarSystems, setSelectedSimilarSystems] = useState<SystemOption[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // [advice from AI] 다이얼로그 상태
  const [detailDialog, setDetailDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null);
  const [newProject, setNewProject] = useState<Partial<ProjectInfo>>({
    name: '',
    domain_id: '',
    project_overview: '',
    target_system_name: '',
    urgency_level: 'medium',
    deadline: '',
    project_status: 'planning',
    is_urgent_development: false,
    urgent_reason: '',
    expected_completion_hours: '',
    metadata: {}
  });

  // [advice from AI] 필터 상태
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  // [advice from AI] 프로젝트 목록 조회
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch('http://localhost:3001/api/knowledge/projects', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('프로젝트 목록 로드 실패');
      }

      const result = await response.json();
      if (result.success) {
        setProjects(result.projects || []);
        setFilteredProjects(result.projects || []);
      }
    } catch (err) {
      console.error('프로젝트 로딩 오류:', err);
      setError(err instanceof Error ? err.message : '프로젝트 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 도메인 목록 조회
  const fetchDomains = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/knowledge/domains', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDomains(result.domains || []);
        }
      }
    } catch (error) {
      console.error('도메인 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 시스템 목록 조회
  const fetchSystems = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/knowledge/systems', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSystems(result.systems || []);
        }
      }
    } catch (error) {
      console.error('시스템 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 유사 시스템 관리
  const addSimilarSystem = (systemId: string) => {
    const system = systems.find(s => s.id === systemId);
    if (system && !selectedSimilarSystems.find(s => s.id === systemId)) {
      setSelectedSimilarSystems([...selectedSimilarSystems, system]);
    }
  };

  const removeSimilarSystem = (systemId: string) => {
    setSelectedSimilarSystems(selectedSimilarSystems.filter(s => s.id !== systemId));
  };

  // [advice from AI] 문서 관리
  const addProjectDocument = (documentType: 'voc' | 'requirements' | 'design', file: File, title: string, description?: string) => {
    const newDocument: ProjectDocument = {
      id: `temp-${Date.now()}`,
      document_type: documentType,
      file,
      title,
      description
    };
    setProjectDocuments([...projectDocuments, newDocument]);
  };

  const removeProjectDocument = (documentId: string) => {
    setProjectDocuments(projectDocuments.filter(doc => doc.id !== documentId));
  };

  // [advice from AI] 작업 그룹 관리
  const addWorkGroup = (name: string, description?: string) => {
    const newWorkGroup: WorkGroup = {
      id: `temp-${Date.now()}`,
      name,
      description
    };
    setWorkGroups([...workGroups, newWorkGroup]);
  };

  const removeWorkGroup = (groupId: string) => {
    setWorkGroups(workGroups.filter(group => group.id !== groupId));
  };

  // [advice from AI] 프로젝트 생성 (FormData 기반 파일 업로드 포함)
  const handleCreateProject = async () => {
    try {
      if (!newProject.name || !newProject.domain_id) {
        alert('프로젝트명과 소속 도메인을 입력해주세요.');
        return;
      }

      const { token: authToken } = useJwtAuthStore.getState();
      
      // FormData 생성하여 파일과 데이터 함께 전송
      const formData = new FormData();
      
      // 기본 프로젝트 정보
      formData.append('name', newProject.name);
      formData.append('domain_id', newProject.domain_id);
      formData.append('project_overview', newProject.project_overview || '');
      formData.append('target_system_name', newProject.target_system_name || '');
      formData.append('urgency_level', newProject.urgency_level || 'medium');
      formData.append('deadline', newProject.deadline || '');
      formData.append('is_urgent_development', newProject.is_urgent_development ? 'true' : 'false');
      formData.append('urgent_reason', newProject.urgent_reason || '');
      formData.append('expected_completion_hours', newProject.expected_completion_hours || '');
      
      // 메타데이터
      formData.append('metadata', JSON.stringify({
        tech_stack: newProject.metadata?.tech_stack || '',
        dev_environment: newProject.metadata?.dev_environment || '',
        api_specs: newProject.metadata?.api_specs || '',
        database_info: newProject.metadata?.database_info || '',
        performance_security: newProject.metadata?.performance_security || '',
        special_notes: newProject.metadata?.special_notes || ''
      }));
      
      // 유사 시스템 정보
      formData.append('similar_systems', JSON.stringify(selectedSimilarSystems.map(system => ({
        id: system.id,
        name: system.name,
        version: system.version,
        description: system.description
      }))));
      
      // 작업 그룹 정보
      formData.append('work_groups', JSON.stringify(workGroups.map(group => ({
        name: group.name,
        description: group.description
      }))));
      
      // 문서 파일들 및 메타데이터
      const documentMetadata: any[] = [];
      projectDocuments.forEach((doc) => {
        if (doc.file) {
          formData.append('documents', doc.file);
          documentMetadata.push({
            document_type: doc.document_type,
            title: doc.title,
            description: doc.description
          });
        }
      });
      formData.append('document_metadata', JSON.stringify(documentMetadata));
      
      const response = await fetch('http://localhost:3001/api/knowledge/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('프로젝트 생성 실패');
      }

      const result = await response.json();
      if (result.success) {
        await fetchProjects();
        setCreateDialog(false);
        resetCreateDialog();
        alert('프로젝트가 성공적으로 생성되었습니다.');
      }
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      alert(`프로젝트 생성에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 프로젝트 생성 다이얼로그 초기화
  const resetCreateDialog = () => {
    setNewProject({
      name: '',
      domain_id: '',
      project_overview: '',
      target_system_name: '',
      urgency_level: 'medium',
      deadline: '',
      project_status: 'planning',
      is_urgent_development: false,
      urgent_reason: '',
      expected_completion_hours: '',
      metadata: {}
    });
    setSelectedSimilarSystems([]);
    setProjectDocuments([]);
    setWorkGroups([]);
  };

  // [advice from AI] 긴급도 색상 반환
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  // [advice from AI] 상태 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': case 'development': return 'primary';
      case 'testing': return 'info';
      case 'planning': return 'warning';
      case 'on_hold': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 필터링 로직
  useEffect(() => {
    let filtered = projects;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.project_status === filterStatus);
    }

    if (filterUrgency !== 'all') {
      filtered = filtered.filter(project => project.urgency_level === filterUrgency);
    }

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.project_overview?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.target_system_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  }, [projects, filterStatus, filterUrgency, searchTerm]);

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (token) {
      fetchProjects();
      fetchDomains();
      fetchSystems();
    }
  }, [token]);

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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="프로젝트 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="프로젝트명, 개요, 시스템명으로 검색"
              />
            </Grid>
            <Grid item xs={12} md={3}>
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
                  <MenuItem value="development">개발</MenuItem>
                  <MenuItem value="testing">테스트</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                  <MenuItem value="on_hold">보류</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>긴급도</InputLabel>
                <Select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  label="긴급도"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="critical">긴급</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              {permissions.canManageDomains && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialog(true)}
                >
                  새 프로젝트
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 프로젝트 목록 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => {
                  setSelectedProject(project);
                  setDetailDialog(true);
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: getUrgencyColor(project.urgency_level), width: 32, height: 32 }}>
                        <ProjectIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          {project.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {project.domain_name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Chip 
                        label={project.urgency_level} 
                        size="small" 
                        sx={{ 
                          bgcolor: getUrgencyColor(project.urgency_level), 
                          color: 'white',
                          fontSize: '0.7rem'
                        }} 
                      />
                      <Chip 
                        label={project.project_status} 
                        size="small" 
                        color={getStatusColor(project.project_status) as any}
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {project.project_overview || '프로젝트 개요가 없습니다.'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      목표 시스템
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {project.target_system_name || '미정'}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      생성자: {project.created_by_name || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(project.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 프로젝트 생성 다이얼로그 (프로젝트 생성.tsx 기반 완전 구현) */}
      <Dialog 
        open={createDialog} 
        onClose={() => {
          setCreateDialog(false);
          resetCreateDialog();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            새 프로젝트 생성
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="프로젝트명"
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              placeholder="예: 모바일 뱅킹 앱 개발"
              sx={{ mb: 2 }}
              required
            />
            
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel>소속 도메인</InputLabel>
              <Select
                value={newProject.domain_id}
                onChange={(e) => setNewProject({...newProject, domain_id: e.target.value})}
                label="소속 도메인"
              >
                {domains.map((domain) => (
                  <MenuItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* [advice from AI] 유사 시스템 선택 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                유사 시스템(솔루션) 선택
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                이 프로젝트와 유사한 기존 시스템들을 선택하여 참조할 수 있습니다.
              </Typography>
              
              {/* 선택된 시스템들 표시 */}
              {selectedSimilarSystems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    선택된 유사 시스템 ({selectedSimilarSystems.length}개)
                  </Typography>
                  {selectedSimilarSystems.map((system) => (
                    <Box 
                      key={system.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {system.name}
                          {system.version && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              (v{system.version})
                            </Typography>
                          )}
                        </Typography>
                        {system.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {system.description.length > 80 
                              ? `${system.description.substring(0, 80)}...` 
                              : system.description
                            }
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => removeSimilarSystem(system.id)}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 시스템 추가 섹션 */}
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>유사 시스템 추가</InputLabel>
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addSimilarSystem(e.target.value as string);
                    }
                  }}
                  label="유사 시스템 추가"
                >
                  {systems
                    .filter(system => !selectedSimilarSystems.find(s => s.id === system.id))
                    .map((system) => (
                      <MenuItem key={system.id} value={system.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {system.name}
                            {system.version && ` (v${system.version})`}
                          </Typography>
                          {system.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {system.description.length > 60 
                                ? `${system.description.substring(0, 60)}...` 
                                : system.description
                              }
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* [advice from AI] 프로젝트 문서 업로드 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                프로젝트 문서 등록
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                VoC 문서, 요구사양서, 디자인 기획서 등을 업로드할 수 있습니다.
              </Typography>
              
              {/* 업로드된 문서들 표시 */}
              {projectDocuments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    업로드된 문서 ({projectDocuments.length}개)
                  </Typography>
                  {projectDocuments.map((doc) => (
                    <Box 
                      key={doc.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {doc.title}
                          <Typography component="span" variant="caption" color="primary" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'primary.50', borderRadius: 0.5 }}>
                            {doc.document_type === 'voc' ? 'VoC' : 
                             doc.document_type === 'requirements' ? '요구사양서' : '디자인기획서'}
                          </Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {doc.file?.name} ({doc.file ? (doc.file.size / 1024 / 1024).toFixed(2) : 0} MB)
                        </Typography>
                        {doc.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {doc.description}
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => removeProjectDocument(doc.id!)}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 문서 업로드 버튼들 */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    VoC 문서 업로드
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            addProjectDocument('voc', file, title, description || undefined);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    요구사양서 업로드
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            addProjectDocument('requirements', file, title, description || undefined);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    디자인 기획서 업로드
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp,.ppt,.pptx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            addProjectDocument('design', file, title, description || undefined);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="프로젝트 개요"
              value={newProject.project_overview}
              onChange={(e) => setNewProject({...newProject, project_overview: e.target.value})}
              placeholder="이 프로젝트의 목적, 범위, 기대효과를 설명하세요"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="목표 시스템명 (향후 솔루션명)"
              value={newProject.target_system_name}
              onChange={(e) => setNewProject({...newProject, target_system_name: e.target.value})}
              placeholder="예: SmartBank Mobile v1.0"
              sx={{ mb: 2 }}
            />

            {/* [advice from AI] 개발자를 위한 상세 정보 섹션 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                개발자를 위한 상세 정보
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                아래 정보들은 작업 시작 시 개발자에게 도움이 됩니다. 가능한 한 상세히 입력해 주세요.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="권장 기술 스택"
                    value={newProject.metadata?.tech_stack || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, tech_stack: e.target.value }
                    })}
                    placeholder="예: React, Node.js, PostgreSQL, Docker"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="개발 환경 요구사항"
                    value={newProject.metadata?.dev_environment || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, dev_environment: e.target.value }
                    })}
                    placeholder="예: Node.js 18+, Docker, Git"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="API 명세 및 연동 정보"
                    value={newProject.metadata?.api_specs || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, api_specs: e.target.value }
                    })}
                    placeholder="예: REST API 기반, JWT 인증, Swagger 문서 제공 예정"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="데이터베이스 정보"
                    value={newProject.metadata?.database_info || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, database_info: e.target.value }
                    })}
                    placeholder="예: PostgreSQL 15, Redis 캐시 활용"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="성능 및 보안 요구사항"
                    value={newProject.metadata?.performance_security || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, performance_security: e.target.value }
                    })}
                    placeholder="예: 동시 사용자 1000명, HTTPS 필수"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="특별 고려사항 및 제약조건"
                    value={newProject.metadata?.special_notes || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, special_notes: e.target.value }
                    })}
                    placeholder="예: 기존 레거시 시스템과의 호환성 유지 필요, 24/7 무중단 서비스"
                    sx={{ mb: 1 }}
                  />
                </Grid>
              </Grid>
            </Box>
            
            {/* [advice from AI] 작업 그룹 관리 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                작업 그룹 설정
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                대형 프로젝트를 세부 시스템으로 나누어 PE에게 할당할 수 있습니다.
              </Typography>
              
              {/* 생성된 작업 그룹들 표시 */}
              {workGroups.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    생성된 작업 그룹 ({workGroups.length}개)
                  </Typography>
                  {workGroups.map((group, index) => (
                    <Box 
                      key={group.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {index + 1}. {group.name}
                        </Typography>
                        {group.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {group.description}
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => removeWorkGroup(group.id!)}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 작업 그룹 추가 */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  label="작업 그룹명"
                  placeholder="예: 콜봇 시스템"
                  sx={{ flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      const name = target.value.trim();
                      if (name) {
                        const description = prompt('작업 그룹 설명을 입력하세요 (선택사항):', '');
                        addWorkGroup(name, description || undefined);
                        target.value = '';
                      }
                    }
                  }}
                />
                <Button 
                  variant="outlined" 
                  sx={{ minWidth: 'auto', px: 2, py: 1.5 }}
                  onClick={() => {
                    const name = prompt('작업 그룹명을 입력하세요:', '');
                    if (name?.trim()) {
                      const description = prompt('작업 그룹 설명을 입력하세요 (선택사항):', '');
                      addWorkGroup(name.trim(), description || undefined);
                    }
                  }}
                >
                  추가
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>긴급도</InputLabel>
                  <Select
                    value={newProject.urgency_level}
                    onChange={(e) => setNewProject({...newProject, urgency_level: e.target.value as any})}
                    label="긴급도"
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">긴급</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="완료 예정일"
                  value={newProject.deadline?.split('T')[0] || ''}
                  onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
            
            {/* [advice from AI] 긴급 개발 옵션 */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'error.main', mb: 2 }}>
                긴급 개발 프로젝트
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newProject.is_urgent_development || false}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      is_urgent_development: e.target.checked,
                      urgency_level: e.target.checked ? 'critical' : newProject.urgency_level
                    })}
                    color="error"
                  />
                }
                label="이 프로젝트는 긴급 개발이 필요합니다"
                sx={{ mb: 2 }}
              />

              {newProject.is_urgent_development && (
                <Box>
                  <TextField
                    fullWidth
                    label="긴급 개발 사유"
                    multiline
                    rows={3}
                    value={newProject.urgent_reason || ''}
                    onChange={(e) => setNewProject({...newProject, urgent_reason: e.target.value})}
                    placeholder="긴급하게 개발이 필요한 사유를 상세히 입력해주세요."
                    sx={{ mb: 2 }}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="예상 완료 시간 (시간)"
                    value={newProject.expected_completion_hours || ''}
                    onChange={(e) => setNewProject({...newProject, expected_completion_hours: e.target.value})}
                    placeholder="24"
                    sx={{ mb: 2 }}
                    required
                  />

                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>긴급 개발 프로젝트 주의사항:</strong><br />
                      • 최고 우선순위로 처리되며 다른 작업보다 우선 할당됩니다<br />
                      • 완료 시간 추적 및 성과 분석이 별도로 진행됩니다
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateProject}
            disabled={!newProject.name || !newProject.domain_id}
          >
            프로젝트 생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 상세 정보 다이얼로그 */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>프로젝트 상세 정보</DialogTitle>
        <DialogContent>
          {selectedProject && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600, width: '30%' }}>
                      프로젝트명
                    </TableCell>
                    <TableCell>{selectedProject.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      소속 도메인
                    </TableCell>
                    <TableCell>{selectedProject.domain_name || '미지정'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      목표 시스템명
                    </TableCell>
                    <TableCell>{selectedProject.target_system_name || '미정'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      프로젝트 개요
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedProject.project_overview || '개요가 없습니다.'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      긴급도
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={selectedProject.urgency_level} 
                        size="small" 
                        sx={{ 
                          bgcolor: getUrgencyColor(selectedProject.urgency_level), 
                          color: 'white' 
                        }} 
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      프로젝트 상태
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={selectedProject.project_status} 
                        color={getStatusColor(selectedProject.project_status) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  {selectedProject.deadline && (
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                        완료 예정일
                      </TableCell>
                      <TableCell>
                        {new Date(selectedProject.deadline).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      생성 정보
                    </TableCell>
                    <TableCell>
                      {selectedProject.created_by_name || 'Unknown'} • {' '}
                      {new Date(selectedProject.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectsPage;