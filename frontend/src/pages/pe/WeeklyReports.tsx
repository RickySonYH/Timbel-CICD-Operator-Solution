// [advice from AI] PE 진행 상황 보고 시스템
// Phase 3: PE 업무 지원 시스템의 핵심 기능 - 업무 관리와 주간 보고서 통합

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

interface WeeklyReport {
  id: string;
  report_date: string;
  title: string;
  content: string;
  github_summary: any;
  attachments: any[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface TaskSummary {
  task_id: string;
  title: string;
  progress: number;
  hours_worked: number;
  commits: number;
  issues_resolved: number;
}

const WeeklyReports: React.FC = () => {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // 다이얼로그 상태
  const [reportDialog, setReportDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [viewingReport, setViewingReport] = useState<WeeklyReport | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    readme_content: '',
    progress_percentage: 0,
    developer_comments: '',
    github_summary: {
      total_commits: 0,
      lines_added: 0,
      lines_removed: 0,
      files_changed: 0,
      issues_created: 0,
      issues_resolved: 0,
      pull_requests: 0
    },
    attachments: [] as any[]
  });
  
  // [advice from AI] GitHub 활동 및 레포지토리 정보
  const [repositoryInfo, setRepositoryInfo] = useState<any>(null);
  const [loadingGitActivity, setLoadingGitActivity] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  // [advice from AI] 데이터 로드 함수들
  const loadReports = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/operations/pe/weekly-reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('주간 보고서 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] GitHub 활동 자동 로드
  const loadGitHubActivity = async () => {
    try {
      setLoadingGitActivity(true);
      
      // 현재 할당된 프로젝트의 레포지토리 정보 조회
      const projectsResponse = await fetch('/api/projects/assigned/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (projectsResponse.ok) {
        const projectsResult = await projectsResponse.json();
        if (projectsResult.success && projectsResult.data.length > 0) {
          const project = projectsResult.data[0];
          
          // Git 분석 데이터 조회
          const gitResponse = await fetch(`/api/dev-environment/projects/${project.project_id}/git-analytics`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (gitResponse.ok) {
            const gitResult = await gitResponse.json();
            if (gitResult.success && gitResult.data) {
              const gitData = gitResult.data;
              setRepositoryInfo({
                repository_url: gitData.repository_url,
                last_commit_date: gitData.last_commit_date,
                total_files: gitData.total_files
              });
              
              // GitHub 요약 자동 설정
              setFormData(prev => ({
                ...prev,
                github_summary: {
                  total_commits: gitData.total_commits || 0,
                  lines_added: gitData.total_lines_added || 0,
                  lines_removed: gitData.total_lines_deleted || 0,
                  files_changed: gitData.code_files || 0,
                  issues_created: 0,
                  issues_resolved: 0,
                  pull_requests: 0
                }
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('GitHub 활동 로드 실패:', error);
    } finally {
      setLoadingGitActivity(false);
    }
  };

  // [advice from AI] 현재 프로젝트 진행률 로드
  const loadCurrentProgress = async () => {
    try {
      const response = await fetch('/api/projects/assigned/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          const latestProject = result.data[0];
          setCurrentProgress(latestProject.progress_percentage || 0);
          setFormData(prev => ({
            ...prev,
            progress_percentage: latestProject.progress_percentage || 0
          }));
        }
      }
    } catch (error) {
      console.error('진행률 로드 실패:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadReports();
    loadCurrentProgress();
  }, []);

  // [advice from AI] 필터링된 보고서 목록
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'info';
      case 'reviewed': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 보고서 생성/수정 핸들러
  const handleSaveReport = async () => {
    try {
      const url = editingReport 
        ? `/api/operations/pe/weekly-reports/${editingReport.id}`
        : '/api/operations/pe/weekly-reports';
      
      const method = editingReport ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await loadReports();
        setReportDialog(false);
        setEditingReport(null);
        setFormData({
          report_date: new Date().toISOString().split('T')[0],
          title: '',
          content: '',
          readme_content: '',
          progress_percentage: 0,
          developer_comments: '',
          github_summary: {
            total_commits: 0,
            lines_added: 0,
            lines_removed: 0,
            files_changed: 0,
            issues_created: 0,
            issues_resolved: 0,
            pull_requests: 0
          },
          attachments: []
        });
      } else {
        console.error('보고서 저장 실패');
      }
    } catch (error) {
      console.error('보고서 저장 중 오류:', error);
    }
  };

  // [advice from AI] 보고서 삭제 핸들러
  const handleDeleteReport = async (id: string) => {
    if (window.confirm('정말로 이 보고서를 삭제하시겠습니까?')) {
      try {
        // 실제로는 API 호출
        console.log('보고서 삭제:', id);
        await loadReports();
      } catch (error) {
        console.error('보고서 삭제 중 오류:', error);
      }
    }
  };

  // [advice from AI] 새 보고서 작성
  const handleCreateReport = async () => {
    setEditingReport(null);
    setFormData({
      report_date: new Date().toISOString().split('T')[0],
      title: '',
      content: '',
      readme_content: '',
      progress_percentage: currentProgress,
      developer_comments: '',
      github_summary: {
        total_commits: 0,
        lines_added: 0,
        lines_removed: 0,
        files_changed: 0,
        issues_created: 0,
        issues_resolved: 0,
        pull_requests: 0
      },
      attachments: []
    });
    setReportDialog(true);
    
    // 다이얼로그가 열린 후 GitHub 활동 자동 로드
    setTimeout(() => {
      loadGitHubActivity();
    }, 500);
  };

  // [advice from AI] 보고서 수정
  const handleEditReport = (report: WeeklyReport) => {
    setEditingReport(report);
    setFormData({
      report_date: report.report_date,
      title: report.title,
      content: report.content,
      readme_content: (report as any).readme_content || '',
      progress_percentage: (report as any).progress_percentage || currentProgress,
      developer_comments: (report as any).developer_comments || '',
      github_summary: report.github_summary || {
        total_commits: 0,
        lines_added: 0,
        lines_removed: 0,
        files_changed: 0,
        issues_created: 0,
        issues_resolved: 0,
        pull_requests: 0
      },
      attachments: report.attachments || []
    });
    setReportDialog(true);
  };

  // [advice from AI] 보고서 상세 보기
  const handleViewReport = (report: WeeklyReport) => {
    setViewingReport(report);
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
          진행 상황 보고
        </Typography>
        <Button
          variant="contained"
          onClick={handleCreateReport}
          sx={{ bgcolor: 'primary.main' }}
        >
          진행 보고서 작성
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
                    전체 보고서
                  </Typography>
                  <Typography variant="h5">
                    {reports.length}
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
                    제출됨
                  </Typography>
                  <Typography variant="h5">
                    {reports.filter(r => r.status === 'submitted').length}
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
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    검토됨
                  </Typography>
                  <Typography variant="h5">
                    {reports.filter(r => r.status === 'reviewed').length}
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
                <WarningIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    초안
                  </Typography>
                  <Typography variant="h5">
                    {reports.filter(r => r.status === 'draft').length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 검색 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목 또는 내용으로 검색..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="상태"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="submitted">제출됨</MenuItem>
                <MenuItem value="reviewed">검토됨</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 보고서 목록 */}
      <Grid container spacing={3}>
        {filteredReports.map((report) => (
          <Grid item xs={12} md={6} lg={4} key={report.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" noWrap sx={{ flex: 1, mr: 1 }}>
                    {report.title}
                  </Typography>
                  <Chip
                    label={report.status}
                    color={getStatusColor(report.status)}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {new Date(report.report_date).toLocaleDateString()}
                </Typography>
                
                <Typography variant="body2" noWrap sx={{ mb: 2 }}>
                  {report.content.substring(0, 100)}...
                </Typography>
                
                {report.github_summary && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      GitHub 활동: {report.github_summary.total_commits} 커밋, {report.github_summary.lines_added} 라인 추가
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewReport(report)}
                  >
                    상세
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditReport(report)}
                  >
                    수정
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteReport(report.id)}
                    color="error"
                  >
                    삭제
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 보고서 생성/수정 다이얼로그 */}
      <Dialog
        open={reportDialog}
        onClose={() => setReportDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editingReport ? '진행 보고서 수정' : '새 진행 보고서 작성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="보고서 날짜"
                type="date"
                value={formData.report_date}
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>

            {/* [advice from AI] 진행률 게이지 및 개발자 의견 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom>
                  📊 프로젝트 진행률 업데이트
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    현재 진행률: {currentProgress}% → 업데이트할 진행률: {formData.progress_percentage}%
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 50 }}>
                      {formData.progress_percentage}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={formData.progress_percentage}
                      sx={{ flexGrow: 1, mx: 2, height: 8, borderRadius: 4 }}
                    />
                    <TextField
                      type="number"
                      value={formData.progress_percentage}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        progress_percentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                      })}
                      inputProps={{ min: 0, max: 100 }}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </Box>
                </Box>
                
                <TextField
                  fullWidth
                  label="진행률 변경 사유 및 개발자 의견"
                  multiline
                  rows={3}
                  value={formData.developer_comments}
                  onChange={(e) => setFormData({ ...formData, developer_comments: e.target.value })}
                  placeholder="이번 주 진행 상황, 어려움, 성과 등을 작성해주세요..."
                  helperText={`진행률이 ${formData.progress_percentage - currentProgress}% 변경됩니다.`}
                />
              </Paper>
            </Grid>

            {/* [advice from AI] README 파일 영역 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    📝 README 파일 내용
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={loadGitHubActivity}
                    disabled={loadingGitActivity}
                  >
                    {loadingGitActivity ? '로딩...' : '레포지토리에서 불러오기'}
                  </Button>
                </Box>
                
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={formData.readme_content}
                  onChange={(e) => setFormData({ ...formData, readme_content: e.target.value })}
                  placeholder="프로젝트 README 내용을 작성하거나 레포지토리에서 불러오세요..."
                  variant="outlined"
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="보고서 내용"
                multiline
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="이번 주 업무 내용을 작성하세요..."
              />
            </Grid>
            
            {/* [advice from AI] GitHub 활동 요약 - 자동 로드 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    🔄 GitHub 활동 요약
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={loadGitHubActivity}
                    disabled={loadingGitActivity}
                  >
                    {loadingGitActivity ? '로딩...' : '최신 데이터 불러오기'}
                  </Button>
                </Box>

                {repositoryInfo && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>레포지토리:</strong> {repositoryInfo.repository_url}<br />
                      <strong>마지막 커밋:</strong> {repositoryInfo.last_commit_date ? new Date(repositoryInfo.last_commit_date).toLocaleDateString() : '없음'}<br />
                      <strong>전체 파일:</strong> {repositoryInfo.total_files}개
                    </Typography>
                  </Alert>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="총 커밋 수"
                type="number"
                value={formData.github_summary.total_commits}
                onChange={(e) => setFormData({
                  ...formData,
                  github_summary: {
                    ...formData.github_summary,
                    total_commits: parseInt(e.target.value) || 0
                  }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="추가된 라인 수"
                type="number"
                value={formData.github_summary.lines_added}
                onChange={(e) => setFormData({
                  ...formData,
                  github_summary: {
                    ...formData.github_summary,
                    lines_added: parseInt(e.target.value) || 0
                  }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="삭제된 라인 수"
                type="number"
                value={formData.github_summary.lines_removed}
                onChange={(e) => setFormData({
                  ...formData,
                  github_summary: {
                    ...formData.github_summary,
                    lines_removed: parseInt(e.target.value) || 0
                  }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="변경된 파일 수"
                type="number"
                value={formData.github_summary.files_changed}
                onChange={(e) => setFormData({
                  ...formData,
                  github_summary: {
                    ...formData.github_summary,
                    files_changed: parseInt(e.target.value) || 0
                  }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="생성된 이슈 수"
                type="number"
                value={formData.github_summary.issues_created}
                onChange={(e) => setFormData({
                  ...formData,
                  github_summary: {
                    ...formData.github_summary,
                    issues_created: parseInt(e.target.value) || 0
                  }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="해결된 이슈 수"
                type="number"
                value={formData.github_summary.issues_resolved}
                onChange={(e) => setFormData({
                  ...formData,
                  github_summary: {
                    ...formData.github_summary,
                    issues_resolved: parseInt(e.target.value) || 0
                  }
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>
            취소
          </Button>
          <Button onClick={handleSaveReport} variant="contained">
            {editingReport ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 보고서 상세 보기 다이얼로그 */}
      <Dialog
        open={!!viewingReport}
        onClose={() => setViewingReport(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {viewingReport?.title}
        </DialogTitle>
        <DialogContent>
          {viewingReport && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                보고서 날짜: {new Date(viewingReport.report_date).toLocaleDateString()}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                상태: 
                <Chip
                  label={viewingReport.status}
                  color={getStatusColor(viewingReport.status)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {/* [advice from AI] 진행률 표시 */}
              {(viewingReport as any).progress_percentage !== undefined && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    📊 프로젝트 진행률
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(viewingReport as any).progress_percentage}
                      sx={{ flexGrow: 1, mr: 2, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 50 }}>
                      {(viewingReport as any).progress_percentage}%
                    </Typography>
                  </Box>
                  {(viewingReport as any).developer_comments && (
                    <Paper sx={{ p: 2, bgcolor: 'info.50', mb: 2 }}>
                      <Typography variant="body2">
                        <strong>개발자 의견:</strong> {(viewingReport as any).developer_comments}
                      </Typography>
                    </Paper>
                  )}
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* [advice from AI] README 파일 내용 */}
              {(viewingReport as any).readme_content && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    📝 README 파일
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      margin: 0 
                    }}>
                      {(viewingReport as any).readme_content}
                    </pre>
                  </Paper>
                  <Divider sx={{ my: 2 }} />
                </>
              )}
              
              <Typography variant="subtitle2" gutterBottom>
                📋 보고서 내용
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {viewingReport.content}
                </pre>
              </Paper>
              
              {viewingReport.github_summary && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    GitHub 활동 요약
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">총 커밋: {viewingReport.github_summary.total_commits}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">추가된 라인: {viewingReport.github_summary.lines_added}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">삭제된 라인: {viewingReport.github_summary.lines_removed}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">변경된 파일: {viewingReport.github_summary.files_changed}</Typography>
                    </Grid>
                  </Grid>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingReport(null)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeeklyReports;
