// [advice from AI] 최고관리자 프로젝트 승인 관리 화면

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemText, Divider, Alert,
  FormControl, InputLabel, Select, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableRow, Paper, CircularProgress
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Schedule as DeadlineIcon,
  PriorityHigh as UrgencyIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useRoleBasedVisibility } from '../../hooks/usePermissions';

// [advice from AI] 승인 대기 프로젝트 인터페이스
interface PendingProject {
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
  created_by_name: string;
  document_count: number;
  work_group_count: number;
  created_at: string;
  last_approval_comment?: string;
  last_reviewed_at?: string;
}

const ProjectApprovalManagement: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  const { permissions } = useRoleBasedVisibility();
  
  // 상태 관리
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 다이얼로그 상태
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PendingProject | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected' | ''>('');
  const [approvalComment, setApprovalComment] = useState('');
  const [editProject, setEditProject] = useState<Partial<PendingProject>>({});
  
  // API URL 결정
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return '';
    }
  };

  // [advice from AI] 승인 대기 프로젝트 목록 조회
  const fetchPendingProjects = async () => {
    try {
      setLoading(true);
      console.log('🔍 승인 대기 프로젝트 조회 시작...');
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/admin/approvals/pending-projects` : '/api/admin/approvals/pending-projects';
      
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPendingProjects(result.data || []);
          console.log('✅ 승인 대기 프로젝트 로드 완료:', result.data?.length || 0, '개');
        } else {
          setError('승인 대기 프로젝트를 불러올 수 없습니다');
        }
      } else {
        setError(`서버 오류: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ 승인 대기 프로젝트 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 프로젝트 승인 처리
  const handleApprovalAction = async () => {
    if (!selectedProject || !approvalAction) {
      alert('승인/거부를 선택해주세요.');
      return;
    }

    if (!approvalComment.trim()) {
      alert('승인/거부 사유를 입력해주세요.');
      return;
    }

    try {
      console.log('🎯 프로젝트 승인 처리:', selectedProject.id, approvalAction);
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/admin/approvals/projects/${selectedProject.id}/approve` : `/api/admin/approvals/projects/${selectedProject.id}/approve`;
      
      // FormData 생성 (수정사항 포함)
      const formData = new FormData();
      formData.append('approval_action', approvalAction);
      formData.append('approval_comment', approvalComment);
      
      // 수정된 프로젝트 정보가 있으면 포함
      if (editProject.name && editProject.name !== selectedProject.name) {
        formData.append('name', editProject.name);
      }
      if (editProject.domain_id && editProject.domain_id !== selectedProject.domain_id) {
        formData.append('domain_id', editProject.domain_id);
      }
      if (editProject.project_overview && editProject.project_overview !== selectedProject.project_overview) {
        formData.append('project_overview', editProject.project_overview);
      }
      if (editProject.target_system_name && editProject.target_system_name !== selectedProject.target_system_name) {
        formData.append('target_system_name', editProject.target_system_name);
      }
      if (editProject.urgency_level && editProject.urgency_level !== selectedProject.urgency_level) {
        formData.append('urgency_level', editProject.urgency_level);
      }
      if (editProject.deadline && editProject.deadline !== selectedProject.deadline) {
        formData.append('deadline', editProject.deadline);
      }
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `승인 처리에 실패했습니다 (상태: ${response.status})`);
      }

      if (result.success) {
        await fetchPendingProjects(); // 목록 새로고침
        setApprovalDialog(false);
        resetApprovalDialog();
        
        const actionText = approvalAction === 'approved' ? '승인' : '거부';
        alert(`프로젝트 "${selectedProject.name}"가 성공적으로 ${actionText}되었습니다.`);
        console.log('✅ 프로젝트 승인 처리 완료:', selectedProject.name, actionText);
      }
    } catch (error) {
      console.error('❌ 프로젝트 승인 처리 오류:', error);
      alert(`승인 처리에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 승인 다이얼로그 초기화
  const resetApprovalDialog = () => {
    setSelectedProject(null);
    setApprovalAction('');
    setApprovalComment('');
    setEditProject({});
  };

  // [advice from AI] 승인 다이얼로그 열기
  const openApprovalDialog = (project: PendingProject) => {
    setSelectedProject(project);
    setEditProject(project); // 수정 가능하도록 초기값 설정
    setApprovalDialog(true);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (token && (user?.roleType === 'admin' || user?.roleType === 'executive')) {
      fetchPendingProjects();
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
          프로젝트 승인 관리
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.6 }}>
          생성된 프로젝트를 검토하고 승인/거부를 결정합니다
        </Typography>
      </Box>

      {/* 승인 대기 프로젝트 통계 */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                  {pendingProjects.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  승인 대기 프로젝트
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="error.main" sx={{ fontWeight: 700 }}>
                  {pendingProjects.filter(p => p.urgency_level === 'critical' || p.urgency_level === 'high').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  긴급/높음 우선순위
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                  {pendingProjects.filter(p => new Date(p.deadline) < new Date()).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  기한 초과 위험
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* 승인 대기 프로젝트 목록 */}
      {pendingProjects.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body1">
            현재 승인 대기 중인 프로젝트가 없습니다.
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {pendingProjects.map((project) => (
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
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    생성자: {project.created_by_name} • {new Date(project.created_at).toLocaleDateString('ko-KR')}
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
                      startIcon={<ViewIcon />}
                      onClick={() => openApprovalDialog(project)}
                      fullWidth
                    >
                      검토 및 승인
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 프로젝트 승인 다이얼로그 */}
      <Dialog 
        open={approvalDialog} 
        onClose={() => {
          setApprovalDialog(false);
          resetApprovalDialog();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            프로젝트 검토 및 승인
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 2 }}>
              {/* 프로젝트 기본 정보 수정 가능 */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                프로젝트 정보 (수정 가능)
              </Typography>
              
              <TextField
                fullWidth
                label="프로젝트명"
                value={editProject.name || ''}
                onChange={(e) => setEditProject({...editProject, name: e.target.value})}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="프로젝트 개요"
                value={editProject.project_overview || ''}
                onChange={(e) => setEditProject({...editProject, project_overview: e.target.value})}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="목표 시스템명"
                value={editProject.target_system_name || ''}
                onChange={(e) => setEditProject({...editProject, target_system_name: e.target.value})}
                sx={{ mb: 2 }}
              />
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>긴급도</InputLabel>
                    <Select
                      value={editProject.urgency_level || 'medium'}
                      onChange={(e) => setEditProject({...editProject, urgency_level: e.target.value as any})}
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
                    value={editProject.deadline?.split('T')[0] || ''}
                    onChange={(e) => setEditProject({...editProject, deadline: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              {/* 승인/거부 결정 */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                승인 결정
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>승인/거부</InputLabel>
                <Select
                  value={approvalAction}
                  onChange={(e) => setApprovalAction(e.target.value as any)}
                  label="승인/거부"
                >
                  <MenuItem value="approved">승인</MenuItem>
                  <MenuItem value="rejected">거부</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="승인/거부 사유"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="승인 또는 거부하는 이유를 상세히 입력해주세요"
                required
              />
              
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>주의:</strong> 승인 후에는 해당 프로젝트가 PO에게 전달되어 PE 할당이 시작됩니다.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setApprovalDialog(false);
            resetApprovalDialog();
          }}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleApprovalAction}
            disabled={!approvalAction || !approvalComment.trim()}
            color={approvalAction === 'approved' ? 'success' : approvalAction === 'rejected' ? 'error' : 'primary'}
          >
            {approvalAction === 'approved' ? '승인 완료' : 
             approvalAction === 'rejected' ? '거부 처리' : '결정'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectApprovalManagement;
