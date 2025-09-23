// [advice from AI] PO 진행 현황 및 성과 관리 페이지
// 요구사항 관리와 PE 성과 관리를 통합한 종합 모니터링 대시보드

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, LinearProgress, Alert, CircularProgress,
  Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, Divider, FormControl, InputLabel,
  Select, MenuItem, TextField
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

// [advice from AI] 인터페이스 정의
interface ProjectProgress {
  project_id: string;
  project_name: string;
  assigned_pe_name: string;
  assigned_pe_id: string;
  assignment_status: string;
  progress_percentage: number;
  start_date: string;
  due_date: string;
  work_group_name?: string;
  urgency_level: string;
  estimated_hours?: number;
  actual_hours?: number;
  last_activity: string;
  repository_url?: string;
  git_activity?: {
    commits_last_7_days: number;
    activity_score: number;
    last_commit_date: string;
  };
}

interface PEPerformance {
  pe_id: string;
  pe_name: string;
  total_assignments: number;
  active_assignments: number;
  completed_assignments: number;
  avg_progress: number;
  total_commits: number;
  avg_quality_score: number;
  on_time_delivery_rate: number;
  workload_level: string;
}

interface ProjectDocument {
  id: string;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
}

const ProgressPerformanceManagement: React.FC = () => {
  const { user, token } = useJwtAuthStore();
  const navigate = useNavigate();
  
  // [advice from AI] 상태 관리
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // 프로젝트 진행 현황 관련
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [pePerformance, setPePerformance] = useState<PEPerformance[]>([]);
  
  // 요구사항 관리 관련
  const [selectedProject, setSelectedProject] = useState<ProjectProgress | null>(null);
  const [requirementsDialog, setRequirementsDialog] = useState(false);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [requirementsFeedback, setRequirementsFeedback] = useState('');

  // [advice from AI] API URL 생성
  const getApiUrl = () => {
    const currentHost = window.location.host;
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3000';
    }
    return `http://${currentHost.split(':')[0]}:3000`;
  };

  // [advice from AI] 프로젝트 진행 현황 로드
  const loadProjectProgress = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/po/project-progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProjectProgress(result.data);
          console.log('✅ 프로젝트 진행 현황 로드 완료:', result.data.length, '개');
        }
      }
    } catch (error) {
      console.error('❌ 프로젝트 진행 현황 로드 실패:', error);
      setError('프로젝트 진행 현황을 불러오는데 실패했습니다.');
    }
  };

  // [advice from AI] PE 성과 데이터 로드
  const loadPEPerformance = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/po/pe-performance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPePerformance(result.data);
          console.log('✅ PE 성과 데이터 로드 완료:', result.data.length, '개');
        }
      }
    } catch (error) {
      console.error('❌ PE 성과 데이터 로드 실패:', error);
    }
  };

  // [advice from AI] 프로젝트 문서 로드
  const loadProjectDocuments = async (projectId: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.documents) {
          setProjectDocuments(result.data.documents);
          console.log('✅ 프로젝트 문서 로드 완료:', result.data.documents.length, '개');
        }
      }
    } catch (error) {
      console.error('❌ 프로젝트 문서 로드 실패:', error);
    }
  };

  // [advice from AI] 초기 데이터 로드
  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    if (user.roleType === 'po' || user.roleType === 'admin' || user.roleType === 'executive') {
      loadData();
    }
  }, [token, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProjectProgress(),
        loadPEPerformance()
      ]);
    } catch (error) {
      console.error('❌ 데이터 로드 중 오류:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 상태별 색상 반환
  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'assigned': return 'info';
      case 'in_progress': return 'primary';
      case 'review': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 긴급도별 색상 반환
  const getUrgencyColor = (urgency: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (urgency) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 진행률 색상 반환
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'info';
    if (progress >= 40) return 'warning';
    return 'error';
  };

  // [advice from AI] 요구사항 검토 다이얼로그 열기
  const handleRequirementsReview = (project: ProjectProgress) => {
    setSelectedProject(project);
    setRequirementsDialog(true);
    loadProjectDocuments(project.project_id);
  };

  // [advice from AI] 문서 다운로드
  const handleDocumentDownload = async (projectId: string, documentId: string, filename: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/projects/${projectId}/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('❌ 문서 다운로드 실패:', error);
    }
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
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          진행 현황 및 성과 관리
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, lineHeight: 1.6 }}>
          할당된 프로젝트의 진행 상황과 PE 성과를 통합 관리하고 모니터링합니다
        </Typography>
      </Box>

      {/* 탭 메뉴 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="프로젝트 진행 현황" />
          <Tab label="PE 성과 관리" />
        </Tabs>
      </Box>

      {/* 프로젝트 진행 현황 탭 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  할당된 프로젝트 진행 현황 ({projectProgress.length}개)
                </Typography>
                
                {projectProgress.length === 0 ? (
                  <Alert severity="info">현재 진행 중인 프로젝트가 없습니다.</Alert>
                ) : (
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>프로젝트명</TableCell>
                          <TableCell>담당 PE</TableCell>
                          <TableCell>작업 그룹</TableCell>
                          <TableCell>상태</TableCell>
                          <TableCell>긴급도</TableCell>
                          <TableCell>진행률</TableCell>
                          <TableCell>일정</TableCell>
                          <TableCell>Git 활동</TableCell>
                          <TableCell>액션</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {projectProgress.map((project) => (
                          <TableRow key={`${project.project_id}-${project.assigned_pe_id}`}>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {project.project_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{project.assigned_pe_name}</TableCell>
                            <TableCell>
                              {project.work_group_name ? (
                                <Chip label={project.work_group_name} size="small" variant="outlined" />
                              ) : (
                                <Typography variant="body2" color="text.secondary">전체 프로젝트</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={project.assignment_status} 
                                color={getStatusColor(project.assignment_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={project.urgency_level} 
                                color={getUrgencyColor(project.urgency_level)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={project.progress_percentage}
                                  color={getProgressColor(project.progress_percentage)}
                                  sx={{ width: 100, height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="body2" sx={{ minWidth: 35 }}>
                                  {project.progress_percentage}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {project.start_date} ~ {project.due_date}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {project.git_activity ? (
                                <Box>
                                  <Typography variant="body2">
                                    커밋: {project.git_activity.commits_last_7_days}회 (7일)
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    점수: {project.git_activity.activity_score}/100
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  레포지토리 미등록
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleRequirementsReview(project)}
                              >
                                요구사항 검토
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
          </Grid>
        </Grid>
      )}

      {/* PE 성과 관리 탭 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  PE 성과 현황 ({pePerformance.length}명)
                </Typography>
                
                {pePerformance.length === 0 ? (
                  <Alert severity="info">현재 활동 중인 PE가 없습니다.</Alert>
                ) : (
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>PE 이름</TableCell>
                          <TableCell>총 할당</TableCell>
                          <TableCell>진행 중</TableCell>
                          <TableCell>완료</TableCell>
                          <TableCell>평균 진행률</TableCell>
                          <TableCell>총 커밋수</TableCell>
                          <TableCell>품질 점수</TableCell>
                          <TableCell>정시 완료율</TableCell>
                          <TableCell>워크로드</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pePerformance.map((pe) => (
                          <TableRow key={pe.pe_id}>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {pe.pe_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{pe.total_assignments}</TableCell>
                            <TableCell>{pe.active_assignments}</TableCell>
                            <TableCell>{pe.completed_assignments}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={pe.avg_progress}
                                  color={getProgressColor(pe.avg_progress)}
                                  sx={{ width: 100, height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="body2">
                                  {pe.avg_progress}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{pe.total_commits}</TableCell>
                            <TableCell>
                              <Chip 
                                label={`${pe.avg_quality_score}/10`} 
                                color={pe.avg_quality_score >= 8 ? 'success' : pe.avg_quality_score >= 6 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{pe.on_time_delivery_rate}%</TableCell>
                            <TableCell>
                              <Chip 
                                label={pe.workload_level} 
                                color={pe.workload_level === 'high' ? 'error' : pe.workload_level === 'medium' ? 'warning' : 'success'}
                                size="small"
                              />
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
        </Grid>
      )}

      {/* 요구사항 검토 다이얼로그 */}
      <Dialog 
        open={requirementsDialog} 
        onClose={() => setRequirementsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          요구사항 검토 - {selectedProject?.project_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              프로젝트 문서
            </Typography>
            {projectDocuments.length === 0 ? (
              <Alert severity="info">업로드된 문서가 없습니다.</Alert>
            ) : (
              <List>
                {projectDocuments.map((doc) => (
                  <ListItem key={doc.id} divider>
                    <ListItemText
                      primary={doc.original_filename}
                      secondary={`크기: ${(doc.file_size / 1024).toFixed(1)}KB • 업로드: ${new Date(doc.uploaded_at).toLocaleDateString()}`}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => selectedProject && handleDocumentDownload(selectedProject.project_id, doc.id, doc.original_filename)}
                    >
                      다운로드
                    </Button>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="h6" gutterBottom>
              요구사항 검토 의견
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="프로젝트 요구사항에 대한 검토 의견을 작성해주세요..."
              value={requirementsFeedback}
              onChange={(e) => setRequirementsFeedback(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequirementsDialog(false)}>
            닫기
          </Button>
          <Button variant="contained" disabled={!requirementsFeedback.trim()}>
            검토 완료
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProgressPerformanceManagement;
