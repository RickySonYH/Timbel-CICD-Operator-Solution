// [advice from AI] 버그 리포트 관리 페이지 - 실제 백엔드 API 연동
import React, { useState, useEffect } from 'react';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  component: string;
  environment: string;
  version: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  assignee_name?: string;
  reported_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface BugReportFormData {
  title: string;
  description: string;
  severity: string;
  priority: string;
  component: string;
  environment: string;
  version: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  assigned_to?: string;
}

const BugReportManagement: React.FC = () => {
  const { isAuthenticated, token } = useJwtAuthStore();
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<BugReport | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<BugReportFormData>({
    title: '',
    description: '',
    severity: 'medium',
    priority: 'medium',
    component: '',
    environment: '',
    version: '',
    steps_to_reproduce: '',
    expected_result: '',
    actual_result: ''
  });

  // [advice from AI] 버그 리포트 목록 조회
  const fetchBugReports = async () => {
    try {
      setLoading(true);
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch('http://localhost:3001/api/qa/bug-reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setBugReports(data.data.bug_reports || []);
      } else {
        setError('버그 리포트 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('버그 리포트 조회 오류:', err);
      setError('버그 리포트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 버그 리포트 생성/수정
  const handleSave = async () => {
    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const url = editingReport ? `http://localhost:3001/api/qa/bug-reports/${editingReport.id}` : 'http://localhost:3001/api/qa/bug-reports';
      const method = editingReport ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setOpenDialog(false);
        setEditingReport(null);
        setFormData({
          title: '',
          description: '',
          severity: 'medium',
          priority: 'medium',
          component: '',
          environment: '',
          version: '',
          steps_to_reproduce: '',
          expected_result: '',
          actual_result: ''
        });
        fetchBugReports();
      } else {
        setError(data.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('버그 리포트 저장 오류:', err);
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 버그 리포트 삭제
  const handleDelete = async (id: string) => {
    if (!window.confirm('정말로 이 버그 리포트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/qa/bug-reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchBugReports();
      } else {
        setError(data.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('버그 리포트 삭제 오류:', err);
      setError('삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 편집 모드 열기
  const handleEdit = (bugReport: BugReport) => {
    setEditingReport(bugReport);
    setFormData({
      title: bugReport.title,
      description: bugReport.description,
      severity: bugReport.severity,
      priority: bugReport.priority,
      component: bugReport.component,
      environment: bugReport.environment,
      version: bugReport.version,
      steps_to_reproduce: bugReport.steps_to_reproduce,
      expected_result: bugReport.expected_result,
      actual_result: bugReport.actual_result,
      assigned_to: bugReport.assignee_name || ''
    });
    setOpenDialog(true);
  };

  // [advice from AI] 새 버그 리포트 모드 열기
  const handleAdd = () => {
    setEditingReport(null);
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      priority: 'medium',
      component: '',
      environment: '',
      version: '',
      steps_to_reproduce: '',
      expected_result: '',
      actual_result: ''
    });
    setOpenDialog(true);
  };

  useEffect(() => {
    fetchBugReports();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 탭별 필터링
  const filteredReports = bugReports.filter(report => {
    switch (activeTab) {
      case 0: return true; // 전체
      case 1: return report.status === 'open';
      case 2: return report.status === 'in_progress';
      case 3: return report.status === 'resolved';
      case 4: return report.status === 'closed';
      default: return true;
    }
  });

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>버그 리포트 로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          버그 리포트 관리
        </Typography>
        <Box>
          <Tooltip title="새로고침">
            <IconButton onClick={fetchBugReports} color="primary" sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            새 버그 리포트
          </Button>
        </Box>
      </Box>

      {/* 오류 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 탭 필터 */}
      <BackstageCard sx={{ mb: 3 }}>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label={`전체 (${bugReports.length})`} />
            <Tab label={`열림 (${bugReports.filter(r => r.status === 'open').length})`} />
            <Tab label={`진행중 (${bugReports.filter(r => r.status === 'in_progress').length})`} />
            <Tab label={`해결됨 (${bugReports.filter(r => r.status === 'resolved').length})`} />
            <Tab label={`닫힘 (${bugReports.filter(r => r.status === 'closed').length})`} />
          </Tabs>
        </CardContent>
      </BackstageCard>

      {/* 버그 리포트 목록 */}
      <BackstageCard>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>제목</TableCell>
                  <TableCell>심각도</TableCell>
                  <TableCell>우선순위</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>컴포넌트</TableCell>
                  <TableCell>환경</TableCell>
                  <TableCell>담당자</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {activeTab === 0 ? '버그 리포트가 없습니다.' : '해당 상태의 버그 리포트가 없습니다.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((bugReport) => (
                    <TableRow key={bugReport.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
                          {bugReport.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bugReport.severity} 
                          color={getSeverityColor(bugReport.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bugReport.priority} 
                          color={getPriorityColor(bugReport.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bugReport.status || 'open'} 
                          color={getStatusColor(bugReport.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {bugReport.component || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {bugReport.environment || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {bugReport.assignee_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(bugReport.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="편집">
                          <IconButton size="small" onClick={() => handleEdit(bugReport)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDelete(bugReport.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </BackstageCard>

      {/* 버그 리포트 생성/편집 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingReport ? '버그 리포트 편집' : '새 버그 리포트'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="제목"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              required
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>심각도</InputLabel>
                <Select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                label="컴포넌트"
                value={formData.component}
                onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                margin="normal"
                sx={{ flex: 1 }}
              />
              <TextField
                label="환경"
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                margin="normal"
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              fullWidth
              label="버전"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="재현 단계"
              value={formData.steps_to_reproduce}
              onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="예상 결과"
              value={formData.expected_result}
              onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="실제 결과"
              value={formData.actual_result}
              onChange={(e) => setFormData({ ...formData, actual_result: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            {editingReport ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BugReportManagement;
