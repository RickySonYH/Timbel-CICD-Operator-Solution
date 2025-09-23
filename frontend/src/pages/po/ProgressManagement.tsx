// [advice from AI] PO 진행 현황 및 PE 성과 관리 페이지

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  TrendingUp as ProgressIcon,
  Assignment as ProjectIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 프로젝트 진행 현황 인터페이스
interface ProjectProgress {
  id: string;
  name: string;
  project_overview: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  deadline: string;
  project_status: string;
  created_at: string;
  domain_name: string;
  work_group_count: number;
  assignment_count: number;
  completed_assignments: number;
  avg_progress: number;
  assigned_pes: string;
}

const ProgressManagement: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  
  // 상태 관리
  const [projects, setProjects] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 상태 업데이트 다이얼로그
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectProgress | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');

  // API URL 결정
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return '';
    }
  };

  // [advice from AI] 프로젝트 진행 현황 조회
  const fetchProjectProgress = async () => {
    try {
      setLoading(true);
      console.log('📈 프로젝트 진행 현황 조회 시작...');
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/po/progress-overview` : '/api/po/progress-overview';
      
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProjects(result.data || []);
          console.log('✅ 프로젝트 진행 현황 로드 완료:', result.data?.length || 0, '개');
        } else {
          setError('프로젝트 진행 현황을 불러올 수 없습니다');
        }
      } else {
        setError(`서버 오류: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ 프로젝트 진행 현황 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 프로젝트 상태 업데이트
  const handleStatusUpdate = async () => {
    if (!selectedProject || !newStatus) {
      alert('프로젝트와 새로운 상태를 선택해주세요.');
      return;
    }

    try {
      console.log('📝 프로젝트 상태 업데이트:', selectedProject.id, newStatus);
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects/${selectedProject.id}/status` : `/api/projects/${selectedProject.id}/status`;
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_status: newStatus,
          status_comment: statusComment
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `상태 업데이트에 실패했습니다 (상태: ${response.status})`);
      }

      if (result.success) {
        await fetchProjectProgress(); // 목록 새로고침
        setStatusDialog(false);
        resetStatusDialog();
        
        alert(`프로젝트 "${selectedProject.name}"의 상태가 "${getStatusLabel(newStatus)}"로 업데이트되었습니다.`);
      }
    } catch (error) {
      console.error('❌ 프로젝트 상태 업데이트 오류:', error);
      alert(`상태 업데이트에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 상태 다이얼로그 초기화
  const resetStatusDialog = () => {
    setSelectedProject(null);
    setNewStatus('');
    setStatusComment('');
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (token && user?.roleType === 'po') {
      fetchProjectProgress();
    }
  }, [token, user]);

  // 긴급도 색상 반환
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // 프로젝트 상태 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': case 'development': return 'info';
      case 'testing': return 'warning';
      case 'on_hold': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // 상태 라벨 반환
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return '계획';
      case 'in_progress': return '진행 중';
      case 'development': return '개발';
      case 'testing': return '테스트';
      case 'completed': return '완료';
      case 'on_hold': return '보류';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

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
          진행 현황 및 PE 성과 관리
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, lineHeight: 1.6 }}>
          프로젝트 진행 상황과 PE들의 성과를 실시간으로 모니터링하고 관리합니다
        </Typography>
      </Box>

      {/* 진행 현황 요약 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {projects.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 진행 프로젝트
                  </Typography>
                </Box>
                <ProjectIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {projects.filter(p => p.project_status === 'in_progress' || p.project_status === 'development').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    진행 중
                  </Typography>
                </Box>
                <ProgressIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {projects.filter(p => p.project_status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    완료
                  </Typography>
                </Box>
                <CompletedIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {projects.filter(p => new Date(p.deadline) < new Date() && p.project_status !== 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    지연 위험
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 프로젝트 진행 현황 테이블 */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            프로젝트별 상세 진행 현황
          </Typography>
          
          {projects.length === 0 ? (
            <Alert severity="info">
              현재 진행 중인 프로젝트가 없습니다.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>프로젝트명</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>도메인</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>상태</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>긴급도</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>진행률</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>할당 PE</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>마감일</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {project.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.project_overview?.length > 50 
                              ? `${project.project_overview.substring(0, 50)}...` 
                              : project.project_overview}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {project.domain_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(project.project_status)}
                          color={getStatusColor(project.project_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            project.urgency_level === 'critical' ? '긴급' :
                            project.urgency_level === 'high' ? '높음' :
                            project.urgency_level === 'medium' ? '보통' : '낮음'
                          }
                          color={getUrgencyColor(project.urgency_level)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={project.avg_progress || 0}
                            sx={{ width: 80 }}
                            color={getProgressColor(project.avg_progress || 0)}
                          />
                          <Typography variant="caption">
                            {project.avg_progress?.toFixed(0) || 0}%
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {project.completed_assignments}/{project.assignment_count} 완료
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {project.assigned_pes || '미할당'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {project.work_group_count}개 그룹
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          color={new Date(project.deadline) < new Date() ? 'error.main' : 'text.primary'}
                        >
                          {new Date(project.deadline).toLocaleDateString('ko-KR')}
                        </Typography>
                        {new Date(project.deadline) < new Date() && (
                          <Typography variant="caption" color="error.main">
                            지연 위험
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => {
                            setSelectedProject(project);
                            setNewStatus(project.project_status);
                            setStatusDialog(true);
                          }}
                        >
                          상태 변경
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 프로젝트 상태 업데이트 다이얼로그 */}
      <Dialog 
        open={statusDialog} 
        onClose={() => {
          setStatusDialog(false);
          resetStatusDialog();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          프로젝트 상태 변경
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {selectedProject.name}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>새로운 상태</InputLabel>
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  label="새로운 상태"
                >
                  <MenuItem value="planning">계획</MenuItem>
                  <MenuItem value="in_progress">진행 중</MenuItem>
                  <MenuItem value="development">개발</MenuItem>
                  <MenuItem value="testing">테스트</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                  <MenuItem value="on_hold">보류</MenuItem>
                  <MenuItem value="cancelled">취소</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="상태 변경 사유"
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                placeholder="상태 변경 이유나 추가 정보를 입력하세요"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStatusDialog(false);
            resetStatusDialog();
          }}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleStatusUpdate}
            disabled={!newStatus}
          >
            상태 변경
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProgressManagement;
