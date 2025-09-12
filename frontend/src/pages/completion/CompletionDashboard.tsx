// [advice from AI] 완료 및 인수인계 대시보드
// Phase 4: 완료 및 인수인계 시스템의 통합 대시보드

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  BugReport as BugReportIcon,
  DocumentScanner as DocumentScannerIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';

interface ProjectCompletion {
  id: string;
  name: string;
  status: 'in_progress' | 'testing' | 'review' | 'completed' | 'handover';
  completion_percentage: number;
  checklist_completed: number;
  checklist_total: number;
  test_environments: number;
  active_tests: number;
  bugs_found: number;
  bugs_fixed: number;
  handover_status: 'pending' | 'in_progress' | 'completed';
  po_name: string;
  pe_name: string;
  qa_name: string;
  deadline: string;
}

interface TestEnvironment {
  id: string;
  name: string;
  type: string;
  status: string;
  health: string;
  last_test: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee: string;
  due_date: string;
}

interface HandoverDocument {
  id: string;
  project_id: string;
  document_type: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  created_by: string;
  created_at: string;
  approved_by: string;
  approved_at: string;
}

const CompletionDashboard: React.FC = () => {
  const [projects, setProjects] = useState<ProjectCompletion[]>([]);
  const [testEnvironments, setTestEnvironments] = useState<TestEnvironment[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [handoverDocs, setHandoverDocs] = useState<HandoverDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedProject, setSelectedProject] = useState<ProjectCompletion | null>(null);
  const [handoverDialog, setHandoverDialog] = useState(false);

  // [advice from AI] 데이터 로드 함수들
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // [advice from AI] 프로젝트 완료 현황 로드
      const projectsResponse = await fetch('/api/operations/completion/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);
      }

      // [advice from AI] 테스트 환경 현황 로드
      const envResponse = await fetch('/api/operations/test-environments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (envResponse.ok) {
        const envData = await envResponse.json();
        setTestEnvironments(envData);
      }

      // [advice from AI] 체크리스트 항목 로드
      const checklistResponse = await fetch('/api/operations/completion/checklist', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (checklistResponse.ok) {
        const checklistData = await checklistResponse.json();
        setChecklistItems(checklistData);
      }

      // [advice from AI] 인수인계 문서 로드
      const docsResponse = await fetch('/api/operations/completion/handover-docs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setHandoverDocs(docsData);
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'info';
      case 'testing': return 'warning';
      case 'review': return 'secondary';
      case 'completed': return 'success';
      case 'handover': return 'primary';
      default: return 'default';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      case 'unknown': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 통계 계산
  const stats = {
    totalProjects: projects.length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    inProgressProjects: projects.filter(p => p.status === 'in_progress').length,
    testingProjects: projects.filter(p => p.status === 'testing').length,
    totalTestEnvs: testEnvironments.length,
    activeTestEnvs: testEnvironments.filter(e => e.status === 'active').length,
    totalChecklistItems: checklistItems.length,
    completedChecklistItems: checklistItems.filter(c => c.status === 'completed').length,
    criticalItems: checklistItems.filter(c => c.priority === 'critical' && c.status !== 'completed').length,
    totalHandoverDocs: handoverDocs.length,
    approvedDocs: handoverDocs.filter(d => d.status === 'approved').length
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          완료 및 인수인계 대시보드
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setHandoverDialog(true)}
          sx={{ bgcolor: 'primary.main' }}
        >
          인수인계 문서 생성
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    전체 프로젝트
                  </Typography>
                  <Typography variant="h5">
                    {stats.totalProjects}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    완료된 프로젝트
                  </Typography>
                  <Typography variant="h5">
                    {stats.completedProjects}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CloudIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    활성 테스트 환경
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeTestEnvs}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    중요 체크리스트
                  </Typography>
                  <Typography variant="h5">
                    {stats.criticalItems}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="프로젝트 현황" />
          <Tab label="테스트 환경" />
          <Tab label="체크리스트" />
          <Tab label="인수인계 문서" />
        </Tabs>
      </Box>

      {/* 프로젝트 현황 탭 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  프로젝트 완료 현황
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>프로젝트명</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>완료율</TableCell>
                        <TableCell>체크리스트</TableCell>
                        <TableCell>테스트 환경</TableCell>
                        <TableCell>버그 현황</TableCell>
                        <TableCell>인수인계</TableCell>
                        <TableCell>담당자</TableCell>
                        <TableCell>마감일</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {project.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={project.status}
                              color={getStatusColor(project.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={project.completion_percentage}
                                />
                              </Box>
                              <Typography variant="body2" color="textSecondary">
                                {project.completion_percentage}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {project.checklist_completed}/{project.checklist_total}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CloudIcon fontSize="small" sx={{ mr: 0.5 }} />
                              {project.test_environments}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <BugReportIcon fontSize="small" sx={{ mr: 0.5 }} />
                              {project.bugs_fixed}/{project.bugs_found}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={project.handover_status}
                              color={getStatusColor(project.handover_status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              PO: {project.po_name}
                            </Typography>
                            <Typography variant="body2">
                              PE: {project.pe_name}
                            </Typography>
                            <Typography variant="body2">
                              QA: {project.qa_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(project.deadline).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="상세 보기">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedProject(project)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 테스트 환경 탭 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  테스트 환경 현황
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>환경명</TableCell>
                        <TableCell>타입</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>헬스</TableCell>
                        <TableCell>마지막 테스트</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testEnvironments.map((env) => (
                        <TableRow key={env.id}>
                          <TableCell>{env.name}</TableCell>
                          <TableCell>
                            <Chip label={env.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={env.status}
                              color={getStatusColor(env.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={env.health}
                              color={getHealthColor(env.health)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {env.last_test ? new Date(env.last_test).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="테스트 실행">
                              <IconButton size="small">
                                <PlayIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="상세 보기">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 체크리스트 탭 */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  완료 체크리스트 현황
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>카테고리</TableCell>
                        <TableCell>항목명</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>우선순위</TableCell>
                        <TableCell>담당자</TableCell>
                        <TableCell>마감일</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {checklistItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Chip label={item.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.status}
                              color={getStatusColor(item.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.priority}
                              color={getPriorityColor(item.priority)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{item.assignee}</TableCell>
                          <TableCell>
                            {new Date(item.due_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="상세 보기">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 인수인계 문서 탭 */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  인수인계 문서 현황
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>문서명</TableCell>
                        <TableCell>타입</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>작성자</TableCell>
                        <TableCell>승인자</TableCell>
                        <TableCell>작성일</TableCell>
                        <TableCell>승인일</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {handoverDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.title}</TableCell>
                          <TableCell>
                            <Chip label={doc.document_type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={doc.status}
                              color={getStatusColor(doc.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{doc.created_by}</TableCell>
                          <TableCell>{doc.approved_by || 'N/A'}</TableCell>
                          <TableCell>
                            {new Date(doc.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {doc.approved_at ? new Date(doc.approved_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="다운로드">
                              <IconButton size="small">
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="상세 보기">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 프로젝트 상세 다이얼로그 */}
      <Dialog
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedProject?.name} - 상세 정보
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">상태</Typography>
                  <Chip
                    label={selectedProject.status}
                    color={getStatusColor(selectedProject.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">완료율</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={selectedProject.completion_percentage}
                      />
                    </Box>
                    <Typography variant="body2">
                      {selectedProject.completion_percentage}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">체크리스트</Typography>
                  <Typography>
                    {selectedProject.checklist_completed}/{selectedProject.checklist_total}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">테스트 환경</Typography>
                  <Typography>{selectedProject.test_environments}개</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                담당자 정보
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <AssignmentIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="PO (Product Owner)"
                    secondary={selectedProject.po_name}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="PE (Product Engineer)"
                    secondary={selectedProject.pe_name}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BugReportIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="QA (Quality Assurance)"
                    secondary={selectedProject.qa_name}
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedProject(null)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 인수인계 문서 생성 다이얼로그 */}
      <Dialog
        open={handoverDialog}
        onClose={() => setHandoverDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          인수인계 문서 생성
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary">
            인수인계 문서 생성 기능은 Phase 4의 다음 단계에서 구현됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHandoverDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompletionDashboard;
