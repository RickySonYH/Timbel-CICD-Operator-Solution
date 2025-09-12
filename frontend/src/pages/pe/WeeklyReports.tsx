// [advice from AI] PE 주간 보고서 시스템
// Phase 3: PE 업무 지원 시스템의 핵심 기능

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

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadReports();
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
  const handleCreateReport = () => {
    setEditingReport(null);
    setFormData({
      report_date: new Date().toISOString().split('T')[0],
      title: '',
      content: '',
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
  };

  // [advice from AI] 보고서 수정
  const handleEditReport = (report: WeeklyReport) => {
    setEditingReport(report);
    setFormData({
      report_date: report.report_date,
      title: report.title,
      content: report.content,
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
          <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          주간 보고서
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateReport}
          sx={{ bgcolor: 'primary.main' }}
        >
          새 보고서 작성
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
          {editingReport ? '보고서 수정' : '새 주간 보고서 작성'}
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="보고서 내용"
                multiline
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="이번 주 업무 내용을 작성하세요..."
              />
            </Grid>
            
            {/* GitHub 요약 */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                GitHub 활동 요약
              </Typography>
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
              
              <Typography variant="subtitle2" gutterBottom>
                보고서 내용
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
