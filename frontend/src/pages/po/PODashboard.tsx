// [advice from AI] PO 대시보드 메인 페이지

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Tooltip, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Assignment as ProjectIcon,
  Group as TeamIcon,
  TrendingUp as ProgressIcon,
  CheckCircle as CompletedIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Assessment as ReportIcon,
  Speed as PerformanceIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

// [advice from AI] 대시보드 데이터 인터페이스
interface PODashboardData {
  project_summary: {
    total_projects: number;
    approved_projects: number;
    assigned_projects: number;
    completed_projects: number;
    overdue_projects: number;
  };
  pe_workload: Array<{
    pe_id: string;
    pe_name: string;
    total_assignments: number;
    active_assignments: number;
    completed_assignments: number;
    avg_progress: number;
    current_workload_hours: number;
    git_activity?: {
      commits_last_7_days: number;
      commits_last_30_days: number;
      last_commit_date: string;
      activity_score: number;
      repository_count: number;
    };
  }>;
  recent_activities: Array<{
  id: string;
    type: string;
    title: string;
    description: string;
    created_at: string;
    project_name?: string;
    pe_name?: string;
  }>;
  urgent_items: Array<{
  id: string;
    type: 'deadline' | 'overdue' | 'blocked';
  title: string;
    description: string;
    deadline?: string;
  project_name: string;
  }>;
}

const PODashboard: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  const navigate = useNavigate();
  
  // 상태 관리
  const [dashboardData, setDashboardData] = useState<PODashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // [advice from AI] 프로젝트 리스트 다이얼로그 상태 (최고관리자 대시보드와 동일)
  const [projectListDialog, setProjectListDialog] = useState(false);
  const [projectListTitle, setProjectListTitle] = useState('');
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // [advice from AI] 프로젝트 관리 상태
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // [advice from AI] PE 관리 관련 상태
  const [availablePEs, setAvailablePEs] = useState<any[]>([]);
  const [loadingPEs, setLoadingPEs] = useState(false);
  
  // [advice from AI] 통합 설정 다이얼로그 상태
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [settingsTab, setSettingsTab] = useState('pe_assignment'); // 'pe_assignment', 'project_edit', 'status_change'
  const [newAssignedPE, setNewAssignedPE] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  // [advice from AI] API URL 결정 (수정됨)
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    console.log('🌐 현재 호스트:', currentHost);
    
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      console.log('🏠 로컬 환경 - 직접 백엔드 포트 사용');
      return 'http://localhost:3001';
    } else {
      console.log('🌍 외부 환경 - 프록시 사용');
      return `http://${currentHost.split(':')[0]}:3000`;
    }
  };

  // [advice from AI] 대시보드 데이터 조회 (디버깅 강화)
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(''); // 이전 에러 초기화
      console.log('📊 PO 대시보드 데이터 조회 시작...');
      
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/po/dashboard-stats`;
      
      console.log('🔗 API 호출 URL:', fullUrl);
      console.log('🔑 사용자 토큰 존재:', !!token);
      console.log('👤 사용자 정보:', user);
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 API 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('📄 API 응답 데이터:', result);
        
        if (result.success) {
          setDashboardData(result.data);
          console.log('✅ PO 대시보드 데이터 로드 완료:', result.data);
        } else {
          console.error('❌ API 응답 실패:', result);
          setError(result.message || '대시보드 데이터를 불러올 수 없습니다');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ HTTP 오류:', response.status, errorText);
        setError(`서버 오류: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ PO 대시보드 데이터 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 카드 클릭 핸들러 - 프로젝트 리스트 다이얼로그 열기 (PO 권한)
  const handleCardClick = async (cardType: string) => {
    console.log('🔍 PO 카드 클릭:', cardType);
    
    let title = '';
    let statusFilter = '';
    
    switch (cardType) {
      case 'approved':
        title = '승인된 프로젝트 (할당 대기)';
        statusFilter = 'approved_waiting_assignment';
        break;
      case 'assigned':
        title = '할당된 프로젝트';
        statusFilter = 'assigned';
        break;
      case 'in_progress':
        title = '진행 중인 프로젝트';
        statusFilter = 'in_progress';
        break;
      case 'completed':
        title = '완료된 프로젝트';
        statusFilter = 'completed';
        break;
      case 'overdue':
        title = '지연된 프로젝트';
        statusFilter = 'overdue';
        break;
      default:
        title = '전체 프로젝트';
        statusFilter = 'all';
    }
    
    setProjectListTitle(title);
    setProjectListDialog(true);
    await loadProjectList(statusFilter);
  };

  // [advice from AI] 프로젝트 리스트 로드 (PO 권한)
  const loadProjectList = async (filterType: string) => {
    try {
      setLoadingProjects(true);
      const apiUrl = getApiUrl();
      
      let endpoint = '/api/admin/approvals/projects';
      let params = '';
      
      switch (filterType) {
        case 'approved_waiting_assignment':
          params = '?status=approved';
          break;
        case 'assigned':
          params = '?status=assigned';
          break;
        case 'in_progress':
          params = '?status=in_progress';
          break;
        case 'completed':
          params = '?status=completed';
          break;
        case 'overdue':
          params = '?overdue=true';
          break;
        default:
          params = '';
      }
      
      const response = await fetch(`${apiUrl}${endpoint}${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProjectList(result.data || []);
        } else {
          console.error('PO 프로젝트 리스트 로드 실패:', result.message);
          setProjectList([]);
        }
      } else {
        console.error('PO 프로젝트 리스트 API 호출 실패:', response.status);
        setProjectList([]);
      }
    } catch (error) {
      console.error('PO 프로젝트 리스트 로드 오류:', error);
      setProjectList([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // [advice from AI] PE 목록 로드
  const loadAvailablePEs = async () => {
    try {
      setLoadingPEs(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/projects/list/users/pe`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvailablePEs(result.data || []);
        } else {
          console.error('PE 목록 로드 실패:', result.message);
          setAvailablePEs([]);
        }
      }
    } catch (error) {
      console.error('PE 목록 로드 오류:', error);
      setAvailablePEs([]);
    } finally {
      setLoadingPEs(false);
    }
  };


  // [advice from AI] 통합 설정 다이얼로그 열기
  const openSettingsDialog = (project: any) => {
    setSelectedProject(project);
    setNewAssignedPE('');
    setAssignmentReason('');
    
    // 기본 탭 설정
    if (!project.assigned_pe_name) {
      setSettingsTab('pe_assignment'); // PE 할당
    } else {
      setSettingsTab('pe_assignment'); // PE 재할당
    }
    
    loadAvailablePEs();
    setSettingsDialog(true);
  };

  // [advice from AI] PE 할당/재할당 처리 (통합됨)
  const handlePEAssignment = async () => {
    if (!selectedProject || !newAssignedPE || !assignmentReason.trim()) return;

    try {
      setSettingsSubmitting(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/admin/approvals/projects/${selectedProject.project_id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_status: selectedProject.approval_status || 'approved',
          project_status: 'in_progress',
          change_reason: assignmentReason,
          action_type: selectedProject.assigned_pe_name ? 'reassign_pe' : 'assign_pe',
          new_assignee_id: newAssignedPE
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ PE 할당/재할당 완료:', result.message);
          setSettingsDialog(false);
          setAssignmentReason('');
          setNewAssignedPE('');
          // 프로젝트 리스트 새로고침
          await loadProjectList('all');
          // 대시보드 데이터 새로고침
          await fetchDashboardData();
        } else {
          setError(result.message || 'PE 할당에 실패했습니다');
        }
      } else {
        const errorText = await response.text();
        setError(`PE 할당 실패: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ PE 할당 실패:', err);
      setError(err instanceof Error ? err.message : 'PE 할당 중 오류가 발생했습니다');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // [advice from AI] PE 할당 처리 (PO 권한) - 기존 함수
  const handleAssignPE = async (peId: string, reason: string) => {
    if (!selectedProject) return;

    try {
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/admin/approvals/projects/${selectedProject.project_id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_status: selectedProject.approval_status,
          project_status: 'in_progress',
          change_reason: reason,
          action_type: 'assign_pe',
          new_assignee_id: peId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ PE 할당 완료:', result.message);
          // 프로젝트 리스트 새로고침
          await loadProjectList('all');
          // 대시보드 데이터 새로고침
          await fetchDashboardData();
        } else {
          setError(result.message || 'PE 할당에 실패했습니다');
        }
      }
    } catch (err) {
      console.error('❌ PE 할당 실패:', err);
      setError(err instanceof Error ? err.message : 'PE 할당 중 오류가 발생했습니다');
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드 (admin 계정도 포함)
  useEffect(() => {
    console.log('🔄 useEffect 실행:', { token: !!token, userRoleType: user?.roleType });
    
    if (token && user && (user.roleType === 'po' || user.roleType === 'admin' || user.roleType === 'executive')) {
      console.log('✅ PO 대시보드 로딩 조건 만족 - API 호출 시작');
      fetchDashboardData();
      
      // 주기적 데이터 새로고침 (30초마다)
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      console.log('❌ PO 대시보드 로딩 조건 불만족:', {
        hasToken: !!token,
        hasUser: !!user,
        userRoleType: user?.roleType,
        allowedRoles: ['po', 'admin', 'executive']
      });
    }
  }, [token, user]);

  // 진행률 색상 반환
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'info';
    if (progress >= 40) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
      </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          PO 대시보드
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, lineHeight: 1.6 }}>
          프로젝트 진행 현황과 PE 작업 분배를 실시간으로 모니터링하고 관리합니다
        </Typography>
      </Box>

      {dashboardData ? (
        <>
          {/* 주요 지표 카드 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('total')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {dashboardData.project_summary.total_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                    전체 프로젝트
                  </Typography>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                        클릭하여 관리
                  </Typography>
                </Box>
                    <ProjectIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
            
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('approved')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {dashboardData.project_summary.approved_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        승인된 프로젝트
                  </Typography>
                      <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>
                        클릭하여 PE 할당
                  </Typography>
                </Box>
                    <CompletedIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
            
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('in_progress')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                        {dashboardData.project_summary.assigned_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        진행 중
                  </Typography>
                      <Typography variant="caption" color="info.main" sx={{ fontWeight: 500 }}>
                        클릭하여 관리
                  </Typography>
                </Box>
                    <ProgressIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
            
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('overdue')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {dashboardData.project_summary.overdue_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        지연 위험
                  </Typography>
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 500 }}>
                        클릭하여 관리
                  </Typography>
                </Box>
                    <WarningIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

          {/* PE 작업 현황 및 긴급 사항 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TeamIcon />
                    PE 작업 현황
                    <Chip 
                      label={`${dashboardData.pe_workload.length}명`} 
                      size="small" 
                      color="primary" 
                    />
              </Typography>
                  
                  {dashboardData.pe_workload.length === 0 ? (
                    <Alert severity="info">
                      현재 작업이 할당된 PE가 없습니다.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableBody>
                          {dashboardData.pe_workload.map((pe) => (
                            <TableRow key={pe.pe_id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>
                                <Button
                                  variant="text"
                                  color="primary"
                                  onClick={() => {
                                    // PE 대시보드로 이동 (PE ID를 URL 파라미터로 전달)
                                    navigate(`/pe-workspace?peId=${pe.pe_id}&peName=${encodeURIComponent(pe.pe_name)}`);
                                  }}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    p: 0,
                                    minWidth: 'auto',
                                    '&:hover': {
                                      backgroundColor: 'transparent',
                                      textDecoration: 'underline'
                                    }
                                  }}
                                >
                                  {pe.pe_name}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    총 {pe.total_assignments}개
                              </Typography>
                              <Chip
                                    label={`진행중 ${pe.active_assignments}`} 
                                    size="small" 
                                    color="info"
                                    variant="outlined"
                                  />
                                  <Chip 
                                    label={`완료 ${pe.completed_assignments}`} 
                                    size="small" 
                                    color="success"
                                    variant="outlined"
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                {pe.git_activity ? (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip 
                                        label={`7일: ${pe.git_activity.commits_last_7_days}회`} 
                                size="small"
                                        color={pe.git_activity.commits_last_7_days > 5 ? "success" : pe.git_activity.commits_last_7_days > 2 ? "warning" : "error"}
                                        variant="outlined"
                              />
                              <Chip
                                        label={`활동점수: ${pe.git_activity.activity_score}`} 
                                size="small"
                                        color={pe.git_activity.activity_score > 70 ? "success" : pe.git_activity.activity_score > 40 ? "warning" : "error"}
                                        variant="outlined"
                              />
                            </Box>
                                    <Typography variant="caption" color="text.secondary">
                                      최근 커밋: {pe.git_activity.last_commit_date ? 
                                        new Date(pe.git_activity.last_commit_date).toLocaleDateString('ko-KR') : 
                                        '없음'}
                                    </Typography>
                          </Box>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    Git 데이터 없음
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ width: '200px' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={pe.avg_progress || 0}
                                    sx={{ flex: 1 }}
                                    color={getProgressColor(pe.avg_progress || 0)}
                                  />
                                  <Typography variant="caption" sx={{ minWidth: '40px' }}>
                                    {pe.avg_progress?.toFixed(0) || 0}%
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {pe.current_workload_hours || 0}시간
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon />
                    긴급 처리 사항
                    <Chip 
                      label={dashboardData.urgent_items?.length || 0} 
                      size="small" 
                      color="error" 
                    />
              </Typography>
                  
                  {!dashboardData.urgent_items || dashboardData.urgent_items.length === 0 ? (
                    <Alert severity="success">
                      현재 긴급 처리 사항이 없습니다.
                    </Alert>
                  ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {dashboardData.urgent_items.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <ListItem sx={{ px: 0 }}>
                      <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {item.title}
                                  </Typography>
                                  <Chip 
                                    label={
                                      item.type === 'deadline' ? '마감임박' :
                                      item.type === 'overdue' ? '지연' : '차단됨'
                                    }
                                    size="small"
                                    color={
                                      item.type === 'deadline' ? 'warning' :
                                      item.type === 'overdue' ? 'error' : 'secondary'
                                    }
                                  />
                                </Box>
                              }
                        secondary={
                          <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.description}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    프로젝트: {item.project_name}
                            </Typography>
                                  {item.deadline && (
                                    <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                      마감: {new Date(item.deadline).toLocaleDateString('ko-KR')}
                            </Typography>
                                  )}
                          </Box>
                        }
                      />
                    </ListItem>
                          {index < dashboardData.urgent_items.length - 1 && <Divider />}
                        </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 PE 활동 섹션 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ProgressIcon />
                최근 PE 활동
                <Chip 
                  label={dashboardData.recent_activities?.length || 0} 
                  size="small" 
                  color="info" 
                />
                </Typography>
              
              {!dashboardData.recent_activities || dashboardData.recent_activities.length === 0 ? (
                <Alert severity="info">
                  최근 PE 활동이 없습니다.
                </Alert>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {dashboardData.recent_activities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem sx={{ px: 0 }}>
                      <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Button
                                variant="text"
                                color="primary"
                                onClick={() => {
                                  navigate(`/pe-workspace?peId=${activity.pe_id}&peName=${encodeURIComponent(activity.pe_name)}`);
                                }}
                                sx={{ 
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  p: 0,
                                  minWidth: 'auto',
                                  '&:hover': {
                                    backgroundColor: 'transparent',
                                    textDecoration: 'underline'
                                  }
                                }}
                              >
                                {activity.pe_name}
                              </Button>
                              <Chip 
                                label={
                                  activity.activity_type === 'project_assignment' ? '할당' :
                                  activity.activity_type === 'work_start' ? '작업 시작' :
                                  activity.activity_type === 'progress_update' ? '진행률 업데이트' :
                                  activity.activity_type === 'code_commit' ? 'Git 커밋' :
                                  activity.activity_type === 'issue_reported' ? '이슈 보고' : '활동'
                                }
                                size="small" 
                                color={
                                  activity.status === 'success' ? 'success' :
                                  activity.status === 'active' ? 'info' :
                                  activity.status === 'warning' ? 'warning' :
                                  activity.status === 'completed' ? 'primary' : 'default'
                                } 
                              />
                            </Box>
                          }
                        secondary={
                          <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {activity.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {activity.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                📋 프로젝트: {activity.project_name}
                            </Typography>
                              <Typography variant="caption" color="text.secondary">
                                🕐 {new Date(activity.timestamp).toLocaleString('ko-KR')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                      {index < dashboardData.recent_activities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
              </CardContent>
            </Card>
        </Grid>
          </Grid>

        </>
      ) : (
        <Alert severity="info">
          대시보드 데이터가 없습니다.
        </Alert>
      )}

      {/* [advice from AI] 프로젝트 리스트 다이얼로그 - PO 권한별 관리 기능 */}
      <Dialog open={projectListDialog} onClose={() => setProjectListDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{projectListTitle}</Typography>
            <Button onClick={() => setProjectListDialog(false)} size="small">
              닫기
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingProjects ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>담당 PE</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>진행률</TableCell>
                    <TableCell>긴급도</TableCell>
                    <TableCell>마감일</TableCell>
                    <TableCell>PO 관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                          해당 조건의 프로젝트가 없습니다.
                </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectList.map((project) => (
                      <TableRow key={project.assignment_id || project.project_id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {project.project_name}
                            </Typography>
                            {project.work_group_name && (
                              <Typography variant="caption" color="text.secondary">
                                작업 그룹: {project.work_group_name}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {project.assigned_pe_name || '미할당'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.project_status}
                            color={
                              project.project_status === 'completed' ? 'success' :
                              project.project_status === 'in_progress' ? 'info' :
                              project.project_status === 'on_hold' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={project.progress_percentage || 0}
                              sx={{ width: 80, mr: 1 }}
                            />
                            <Typography variant="body2">
                              {project.progress_percentage || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {project.urgency_level && (
                            <Chip
                              label={project.urgency_level}
                              color={
                                project.urgency_level === 'critical' ? 'error' :
                                project.urgency_level === 'high' ? 'warning' :
                                project.urgency_level === 'medium' ? 'info' :
                                'success'
                              }
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {project.deadline ? new Date(project.deadline).toLocaleDateString() : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {/* [advice from AI] PO 권한: 통합 설정 */}
                            {user && ['po', 'admin', 'executive'].includes(user.roleType) && (
                              <Button
                                onClick={() => openSettingsDialog(project)}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ minWidth: 60 }}
                              >
                                설정
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectListDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 통합 설정 다이얼로그 - PO 권한 */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">프로젝트 설정</Typography>
            <Button onClick={() => setSettingsDialog(false)} size="small">
              닫기
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 1 }}>
              {/* 프로젝트 정보 */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                  📋 {selectedProject.project_name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>현재 담당 PE:</strong> {selectedProject.assigned_pe_name || '미할당'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>프로젝트 상태:</strong> {selectedProject.project_status}
              </Typography>
                <Typography variant="body2">
                  <strong>긴급도:</strong> {selectedProject.urgency_level}
                </Typography>
              </Box>

              {/* PE 할당/재할당 섹션 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  👨‍💼 PE 할당 관리
              </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>담당 PE 선택</InputLabel>
                  <Select
                    value={newAssignedPE}
                    onChange={(e) => setNewAssignedPE(e.target.value)}
                    label="담당 PE 선택"
                  >
                    {availablePEs.map((pe) => (
                      <MenuItem key={pe.id} value={pe.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <Typography>{pe.full_name} ({pe.username})</Typography>
                          <Chip 
                            label={`${pe.current_assignments || 0}개 할당`}
                            size="small"
                            color={
                              (pe.current_assignments || 0) === 0 ? 'success' :
                              (pe.current_assignments || 0) <= 2 ? 'info' :
                              (pe.current_assignments || 0) <= 4 ? 'warning' : 'error'
                            }
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label={selectedProject.assigned_pe_name ? 'PE 재할당 사유' : 'PE 할당 사유'}
                  multiline
                  rows={3}
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  placeholder={
                    selectedProject.assigned_pe_name 
                      ? '재할당하는 사유를 입력해주세요. (예: 기술 스킬 매칭, 업무량 조절 등)'
                      : '할당하는 사유를 입력해주세요. (예: 적합한 기술 스킬 보유, 업무 가능 시간 등)'
                  }
                  required
                  sx={{ mb: 2 }}
                />

                {newAssignedPE && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>{availablePEs.find(pe => pe.id === newAssignedPE)?.full_name}님</strong>에게 할당됩니다.
                      <br />현재 작업량: {availablePEs.find(pe => pe.id === newAssignedPE)?.current_assignments || 0}개
                      <br />워크로드 레벨: {availablePEs.find(pe => pe.id === newAssignedPE)?.workload_level || 'Normal'}
              </Typography>
                  </Alert>
                )}
              </Box>
              </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setSettingsDialog(false)}
            disabled={settingsSubmitting}
          >
            취소
          </Button>
          <Button 
            onClick={handlePEAssignment}
            variant="contained"
            color="primary"
            disabled={!newAssignedPE || !assignmentReason.trim() || settingsSubmitting}
          >
            {settingsSubmitting ? '처리 중...' : (selectedProject?.assigned_pe_name ? 'PE 재할당' : 'PE 할당')}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default PODashboard;