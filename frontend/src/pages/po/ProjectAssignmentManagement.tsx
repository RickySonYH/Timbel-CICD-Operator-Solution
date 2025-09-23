// [advice from AI] PO용 승인된 프로젝트 PE 할당 관리 화면

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemText, Divider, Alert,
  FormControl, InputLabel, Select, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableRow, Paper, CircularProgress,
  Checkbox, FormControlLabel, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Assignment as AssignIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  PendingActions as PendingIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 승인된 프로젝트 인터페이스
interface ApprovedProject {
  id: string;
  name: string;
  domain_id: string;
  domain_name: string;
  project_overview: string;
  target_system_name: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  deadline: string;
  project_status: string;
  approval_status: string;
  approved_by_name: string;
  approved_at: string;
  document_count: number;
  work_group_count: number;
  created_at: string;
  work_groups?: WorkGroup[];
}

interface WorkGroup {
  id: string;
  name: string;
  description: string;
  assigned_pe?: string;
  status: 'unassigned' | 'assigned' | 'in_progress' | 'completed';
}

interface PEUser {
  id: string;
  full_name: string;
  email: string;
  current_workload: number;
}

const ProjectAssignmentManagement: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  
  // 상태 관리
  const [approvedProjects, setApprovedProjects] = useState<ApprovedProject[]>([]);
  const [peUsers, setPeUsers] = useState<PEUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 할당 다이얼로그 상태
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ApprovedProject | null>(null);
  const [assignments, setAssignments] = useState<{ [workGroupId: string]: string }>({});
  const [assignmentNotes, setAssignmentNotes] = useState('');

  // [advice from AI] API URL 결정 (수정됨)
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return `http://${currentHost.split(':')[0]}:3000`;
    }
  };

  // [advice from AI] 승인된 프로젝트 목록 조회
  const fetchApprovedProjects = async () => {
    try {
      setLoading(true);
      console.log('🔍 승인된 프로젝트 조회 시작...');
      
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/projects/list/approved`;
      
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setApprovedProjects(result.data || []);
          console.log('✅ 승인된 프로젝트 로드 완료:', result.data?.length || 0, '개');
        } else {
          setError('승인된 프로젝트를 불러올 수 없습니다');
        }
      } else {
        setError(`서버 오류: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ 승인된 프로젝트 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] PE 사용자 목록 조회
  const fetchPEUsers = async () => {
    try {
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/projects/list/users/pe`;
      
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPeUsers(result.data || []);
          console.log('✅ PE 사용자 로드 완료:', result.data?.length || 0, '명');
        }
      }
    } catch (error) {
      console.error('❌ PE 사용자 로드 실패:', error);
    }
  };

  // [advice from AI] PE 할당 처리
  const handleAssignToPE = async () => {
    if (!selectedProject) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    const workGroups = selectedProject.work_groups || [];
    
    // 작업 그룹이 없는 경우 - 전체 프로젝트 할당
    if (workGroups.length === 0) {
      if (!assignments['whole_project']) {
        alert('전체 프로젝트를 담당할 PE를 선택해주세요.');
        return;
      }
    } else {
      // 작업 그룹이 있는 경우 - 모든 작업 그룹 할당 확인
      const unassignedGroups = workGroups.filter(wg => !assignments[wg.id]);
      
      if (unassignedGroups.length > 0) {
        alert(`${unassignedGroups.length}개의 작업 그룹이 아직 할당되지 않았습니다: ${unassignedGroups.map(wg => wg.name).join(', ')}`);
        return;
      }
    }

    try {
      console.log('🎯 PE 할당 처리:', selectedProject.id);
      console.log('📋 할당 정보:', assignments);
      
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/projects/${selectedProject.id}/assign-pe`;
      
      let assignmentData;
      
      if (workGroups.length === 0) {
        // 작업 그룹이 없는 경우
        assignmentData = {
          assignments: [{
            work_group_id: null,
            assigned_to: assignments['whole_project'],
            assignment_notes: assignmentNotes
          }]
        };
      } else {
        // 작업 그룹이 있는 경우
        assignmentData = {
          assignments: Object.entries(assignments).map(([workGroupId, peId]) => ({
            work_group_id: workGroupId,
            assigned_to: peId,
            assignment_notes: assignmentNotes
          }))
        };
      }
      
      console.log('🚀 PE 할당 API 호출:', fullUrl);
      console.log('📤 요청 데이터:', JSON.stringify(assignmentData, null, 2));
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentData)
      });
      
      console.log('📡 PE 할당 응답 상태:', response.status, response.statusText);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `PE 할당에 실패했습니다 (상태: ${response.status})`);
      }

      if (result.success) {
        await fetchApprovedProjects(); // 목록 새로고침
        setAssignmentDialog(false);
        resetAssignmentDialog();
        
        alert(`프로젝트 "${selectedProject.name}"가 성공적으로 PE에게 할당되었습니다.`);
        console.log('✅ PE 할당 완료:', selectedProject.name);
      }
    } catch (error) {
      console.error('❌ PE 할당 오류:', error);
      alert(`PE 할당에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 할당 다이얼로그 초기화
  const resetAssignmentDialog = () => {
    setSelectedProject(null);
    setAssignments({});
    setAssignmentNotes('');
  };

  // [advice from AI] 할당 다이얼로그 열기
  const openAssignmentDialog = (project: ApprovedProject) => {
    setSelectedProject(project);
    setAssignmentDialog(true);
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드 (admin 계정도 포함)
  useEffect(() => {
    if (token && user && (user.roleType === 'po' || user.roleType === 'admin' || user.roleType === 'executive')) {
      console.log('✅ PE 할당 관리 페이지 로딩 - API 호출 시작');
      fetchApprovedProjects();
      fetchPEUsers();
    } else {
      console.log('❌ PE 할당 관리 페이지 접근 권한 없음:', user?.roleType);
    }
  }, [token, user]);

  // 긴급도 색상 반환
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          프로젝트 PE 할당 관리
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.6 }}>
          승인된 프로젝트를 PE에게 할당하여 개발 업무를 시작합니다
        </Typography>
      </Box>

      {/* 승인된 프로젝트 통계 */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                  {approvedProjects.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  승인된 프로젝트
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                  {approvedProjects.filter(p => p.project_status === 'planning').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PE 할당 대기
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                  {peUsers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  사용 가능한 PE
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* 승인된 프로젝트 목록 */}
      {approvedProjects.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body1">
            현재 PE 할당 대기 중인 승인된 프로젝트가 없습니다.
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {approvedProjects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: project.urgency_level === 'critical' ? '2px solid #f44336' : 
                         project.urgency_level === 'high' ? '2px solid #ff9800' : '1px solid #e0e0e0'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                      {project.name}
                    </Typography>
                    <Chip 
                      label={
                        project.urgency_level === 'critical' ? '긴급' :
                        project.urgency_level === 'high' ? '높음' :
                        project.urgency_level === 'medium' ? '보통' : '낮음'
                      }
                      size="small"
                      sx={{ 
                        bgcolor: getUrgencyColor(project.urgency_level), 
                        color: 'white',
                        ml: 1
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    도메인: {project.domain_name}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 2, minHeight: '40px' }}>
                    {project.project_overview?.length > 100 
                      ? `${project.project_overview.substring(0, 100)}...` 
                      : project.project_overview || '개요 없음'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip label={`문서 ${project.document_count}개`} size="small" variant="outlined" />
                    <Chip label={`작업그룹 ${project.work_group_count}개`} size="small" variant="outlined" />
                  </Box>
                  
                  <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    승인자: {project.approved_by_name} • {new Date(project.approved_at).toLocaleDateString('ko-KR')}
                  </Typography>
                  
                  {project.deadline && (
                    <Typography variant="caption" color={new Date(project.deadline) < new Date() ? 'error.main' : 'text.secondary'} sx={{ display: 'block', mb: 2 }}>
                      완료 예정: {new Date(project.deadline).toLocaleDateString('ko-KR')}
                      {new Date(project.deadline) < new Date() && ' (기한 초과 위험)'}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      startIcon={<AssignIcon />}
                      onClick={() => openAssignmentDialog(project)}
                      fullWidth
                      disabled={project.project_status !== 'planning'}
                    >
                      {project.project_status === 'planning' ? 'PE 할당' : '할당 완료'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] PE 할당 다이얼로그 */}
      <Dialog 
        open={assignmentDialog} 
        onClose={() => {
          setAssignmentDialog(false);
          resetAssignmentDialog();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignIcon />
            PE 할당
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                프로젝트: {selectedProject.name}
              </Typography>
              
              {selectedProject.work_groups && selectedProject.work_groups.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignIcon />
                    작업 그룹별 PE 할당 ({selectedProject.work_groups.length}개 그룹)
                  </Typography>
                  
                  {selectedProject.work_groups.map((workGroup) => (
                    <Card key={workGroup.id} sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          📋 {workGroup.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {workGroup.description}
                        </Typography>
                        
                        <FormControl fullWidth>
                          <InputLabel>담당 PE 선택</InputLabel>
                          <Select
                            value={assignments[workGroup.id] || ''}
                            onChange={(e) => setAssignments({
                              ...assignments,
                              [workGroup.id]: e.target.value
                            })}
                            label="담당 PE 선택"
                          >
                            {peUsers.map((pe) => (
                              <MenuItem key={pe.id} value={pe.id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                  <span>👤 {pe.full_name}</span>
                                  <Chip 
                                    label={`현재 업무: ${pe.current_workload || 0}개`} 
                                    size="small" 
                                    variant="outlined"
                                    color={
                                      (pe.current_workload || 0) < 3 ? 'success' :
                                      (pe.current_workload || 0) < 6 ? 'warning' : 'error'
                                    }
                                  />
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>📌 전체 프로젝트 할당 모드</strong><br/>
                      이 프로젝트에는 작업 그룹이 설정되지 않았습니다. 전체 프로젝트를 하나의 PE에게 할당합니다.
                    </Typography>
                  </Alert>
                  
                  <Card sx={{ border: 1, borderColor: 'primary.main' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon />
                        전체 프로젝트 담당 PE
                      </Typography>
                      
                      <FormControl fullWidth>
                        <InputLabel>담당 PE 선택</InputLabel>
                        <Select
                          value={assignments['whole_project'] || ''}
                          onChange={(e) => setAssignments({
                            ...assignments,
                            'whole_project': e.target.value
                          })}
                          label="담당 PE 선택"
                        >
                          {peUsers.map((pe) => (
                            <MenuItem key={pe.id} value={pe.id}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span>👤 {pe.full_name}</span>
                                <Chip 
                                  label={`현재 업무: ${pe.current_workload || 0}개`} 
                                  size="small" 
                                  variant="outlined"
                                  color={
                                    (pe.current_workload || 0) < 3 ? 'success' :
                                    (pe.current_workload || 0) < 6 ? 'warning' : 'error'
                                  }
                                />
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Box>
              )}
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="할당 메모"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="PE에게 전달할 특별한 지시사항이나 참고사항을 입력하세요"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAssignmentDialog(false);
            resetAssignmentDialog();
          }}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAssignToPE}
            disabled={
              !selectedProject || 
              (selectedProject.work_groups && selectedProject.work_groups.length > 0 
                ? selectedProject.work_groups.some(wg => !assignments[wg.id])
                : !assignments['whole_project']
              )
            }
          >
            PE 할당 완료
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectAssignmentManagement;
