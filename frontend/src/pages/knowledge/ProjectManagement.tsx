// [advice from AI] 프로젝트 관리 페이지 - 도메인과 시스템 중간 계층

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Avatar, Divider, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Assignment as ProjectIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Business as DomainIcon,
  Computer as SystemIcon,
  Schedule as DeadlineIcon,
  PriorityHigh as UrgencyIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useRoleBasedVisibility } from '../../hooks/usePermissions';

// [advice from AI] 프로젝트 정보 인터페이스
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
  connected_systems_count?: number;
  created_at: string;
  updated_at: string;
}

// [advice from AI] 도메인 정보 인터페이스
interface DomainOption {
  id: string;
  name: string;
}

const ProjectManagement: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useJwtAuthStore();
  const { showManageButtons, permissions } = useRoleBasedVisibility();

  // [advice from AI] 상태 관리
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectInfo[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // [advice from AI] 다이얼로그 상태
  const [detailDialog, setDetailDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null);
  const [editProject, setEditProject] = useState<Partial<ProjectInfo>>({});
  const [newProject, setNewProject] = useState<Partial<ProjectInfo>>({
    name: '',
    domain_id: '',
    project_overview: '',
    target_system_name: '',
    urgency_level: 'medium',
    deadline: '',
    project_status: 'planning'
  });

  // [advice from AI] 필터 상태
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // [advice from AI] 동적 API URL 결정 로직
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return '';
    }
  };

  // [advice from AI] 프로젝트 목록 조회
  const fetchProjects = async () => {
    try {
      console.log('🔄 프로젝트 목록 요청 시작...');
      console.log(`  - 요청 URL: ${getApiUrl()}/api/projects`);
      console.log(`  - 요청 헤더: {Authorization: 'Bearer ${token?.substring(0, 50)}...'}`);

      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects` : '/api/projects';
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📡 API 응답 상태:', response.status);
      console.log('📡 API 응답 헤더:', Object.fromEntries(response.headers));

      if (!response.ok) {
        throw new Error(`프로젝트 목록을 불러올 수 없습니다 (상태: ${response.status})`);
      }

      const result = await response.json();
      console.log('📊 받은 데이터:', result);
      console.log('📊 데이터 타입:', typeof result);
      console.log('📊 success 필드:', result.success);
      console.log('📊 data 필드:', result.data);
      console.log('📊 data 배열 길이:', result.data?.length);

      if (result.success) {
        const projectsData = result.data || [];
        setProjects(projectsData);
        setFilteredProjects(projectsData);
        console.log('✅ 프로젝트 데이터 설정 완료:', projectsData.length, '개');
      } else {
        setError('프로젝트 데이터를 처리할 수 없습니다');
      }
    } catch (err) {
      console.error('❌ 프로젝트 로딩 오류:', err);
      console.error('❌ 오류 스택:', err.stack);
      setError(err instanceof Error ? err.message : '프로젝트 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      console.log('🏁 로딩 상태 해제');
      setLoading(false);
    }
  };

  // [advice from AI] 도메인 목록 조회 (프로젝트 생성 시 사용)
  const fetchDomains = async () => {
    try {
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/domains` : '/api/domains';
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDomains(result.data || []);
        }
      }
    } catch (error) {
      console.error('도메인 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    console.log('🎯 ProjectManagement 마운트됨');
    console.log('  - isAuthenticated:', !!token);
    console.log('  - user:', user);
    console.log('  - token 존재:', !!token);

    if (token) {
      fetchProjects();
      fetchDomains();
    }
  }, [token]);

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

  // [advice from AI] 프로젝트 상세 보기
  const handleViewProject = async (project: ProjectInfo) => {
    try {
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects/${project.id}` : `/api/projects/${project.id}`;
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSelectedProject(result.data);
        } else {
          setSelectedProject(project);
        }
      } else {
        setSelectedProject(project);
      }
    } catch (error) {
      console.error('프로젝트 상세 정보 로드 실패:', error);
      setSelectedProject(project);
    }
    
    setDetailDialog(true);
  };

  // [advice from AI] 프로젝트 생성
  const handleCreateProject = async () => {
    try {
      if (!newProject.name || !newProject.domain_id) {
        alert('프로젝트명과 소속 도메인을 입력해주세요.');
        return;
      }

      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects` : '/api/projects';
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProject)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `프로젝트 생성에 실패했습니다 (상태: ${response.status})`);
      }

      if (result.success) {
        // 목록 새로고침
        await fetchProjects();
        setCreateDialog(false);
        setNewProject({
          name: '',
          domain_id: '',
          project_overview: '',
          target_system_name: '',
          urgency_level: 'medium',
          deadline: '',
          project_status: 'planning'
        });
        alert('프로젝트가 성공적으로 생성되었습니다.');
      }
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      alert(`프로젝트 생성에 실패했습니다: ${error.message}`);
    }
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          프로젝트 (기획) 카탈로그
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
              {showManageButtons && (
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
                onClick={() => handleViewProject(project)}
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

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      연결된 시스템
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {project.connected_systems_count || 0}개
                    </Typography>
                  </Box>

                  {project.deadline && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        완료 예정일
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {new Date(project.deadline).toLocaleDateString('ko-KR')}
                      </Typography>
                    </Box>
                  )}

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

      {/* [advice from AI] 빈 상태 */}
      {!loading && !error && filteredProjects.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ProjectIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || filterStatus !== 'all' || filterUrgency !== 'all' 
              ? '조건에 맞는 프로젝트가 없습니다' 
              : '등록된 프로젝트가 없습니다'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {showManageButtons 
              ? '새 프로젝트를 생성하여 도메인별 개발 프로젝트를 관리하세요'
              : '관리자에게 프로젝트 생성을 요청하세요'
            }
          </Typography>
          {showManageButtons && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
            >
              첫 번째 프로젝트 생성
            </Button>
          )}
        </Box>
      )}

      {/* [advice from AI] 프로젝트 생성 다이얼로그 */}
      <Dialog 
        open={createDialog} 
        onClose={() => setCreateDialog(false)}
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
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>고객사 요구사항</strong>과 <strong>디자인 요구사항</strong> 파일 업로드는 향후 추가 예정입니다.
              </Typography>
            </Alert>
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
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ProjectIcon />
            프로젝트 상세 정보
          </Box>
        </DialogTitle>
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
                      상태
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip 
                          label={selectedProject.project_status} 
                          color={getStatusColor(selectedProject.project_status) as any}
                          size="small"
                        />
                        <Chip 
                          label={selectedProject.approval_status} 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
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
                  {selectedProject.deadline && (
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                        완료 예정일
                      </TableCell>
                      <TableCell>
                        {new Date(selectedProject.deadline).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      연결된 시스템
                    </TableCell>
                    <TableCell>
                      {selectedProject.connected_systems_count || 0}개
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      생성 정보
                    </TableCell>
                    <TableCell>
                      {selectedProject.created_by_name || 'Unknown'} • {' '}
                      {new Date(selectedProject.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                  {selectedProject.approved_by_name && (
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                        승인 정보
                      </TableCell>
                      <TableCell>
                        {selectedProject.approved_by_name} • {' '}
                        {selectedProject.approved_at && new Date(selectedProject.approved_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          {showManageButtons && selectedProject && (
            <>
              <Button
                startIcon={<EditIcon />}
                onClick={() => {
                  setEditProject(selectedProject);
                  setDetailDialog(false);
                  setEditDialog(true);
                }}
              >
                수정
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                onClick={() => {/* TODO: 프로젝트 삭제 */}}
              >
                삭제
              </Button>
            </>
          )}
          <Button onClick={() => setDetailDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectManagement;
