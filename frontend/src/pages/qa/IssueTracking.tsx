// [advice from AI] 이슈 트래킹 페이지 - 실제 백엔드 API 연동
import React, { useState, useEffect } from 'react';
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
  Assignment as AssignmentIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import BackstageCard from '../../components/layout/BackstageCard';

interface Issue {
  id: string;
  title: string;
  description: string;
  issue_type: string;
  priority: string;
  status: string;
  bug_id?: string;
  project_name?: string;
  created_by_name?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

interface IssueFormData {
  title: string;
  description: string;
  issue_type: string;
  priority: string;
  bug_id?: string;
  assigned_to?: string;
}

const IssueTracking: React.FC = () => {
  const { isAuthenticated, token } = useJwtAuthStore();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<IssueFormData>({
    title: '',
    description: '',
    issue_type: 'bug',
    priority: 'medium'
  });

  // [advice from AI] 이슈 목록 조회
  const fetchIssues = async () => {
    try {
      setLoading(true);
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch('http://localhost:3001/api/qa/issues', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setIssues(data.data.issues || []);
      } else {
        setError('이슈 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('이슈 조회 오류:', err);
      setError('이슈를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 이슈 생성/수정
  const handleSave = async () => {
    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const url = editingIssue ? `http://localhost:3001/api/qa/issues/${editingIssue.id}` : 'http://localhost:3001/api/qa/issues';
      const method = editingIssue ? 'PUT' : 'POST';

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
        setEditingIssue(null);
        setFormData({ title: '', description: '', issue_type: 'bug', priority: 'medium' });
        fetchIssues();
      } else {
        setError(data.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('이슈 저장 오류:', err);
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 이슈 삭제
  const handleDelete = async (id: string) => {
    if (!window.confirm('정말로 이 이슈를 삭제하시겠습니까?')) {
      return;
    }

    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/qa/issues/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchIssues();
      } else {
        setError(data.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('이슈 삭제 오류:', err);
      setError('삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 편집 모드 열기
  const handleEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setFormData({
      title: issue.title,
      description: issue.description,
      issue_type: issue.issue_type,
      priority: issue.priority,
      bug_id: issue.bug_id || '',
      assigned_to: issue.assigned_to_name || ''
    });
    setOpenDialog(true);
  };

  // [advice from AI] 새 이슈 모드 열기
  const handleAdd = () => {
    setEditingIssue(null);
    setFormData({ title: '', description: '', issue_type: 'bug', priority: 'medium' });
    setOpenDialog(true);
  };

  useEffect(() => {
    fetchIssues();
  }, []);

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

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'bug': return 'error';
      case 'feature': return 'info';
      case 'improvement': return 'success';
      case 'task': return 'warning';
      default: return 'default';
    }
  };

  // [advice from AI] 탭별 필터링
  const filteredIssues = issues.filter(issue => {
    switch (activeTab) {
      case 0: return true; // 전체
      case 1: return issue.status === 'open';
      case 2: return issue.status === 'in_progress';
      case 3: return issue.status === 'resolved';
      case 4: return issue.status === 'closed';
      default: return true;
    }
  });

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>이슈 로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          이슈 트래킹
        </Typography>
        <Box>
          <Tooltip title="새로고침">
            <IconButton onClick={fetchIssues} color="primary" sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            새 이슈
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
            <Tab label={`전체 (${issues.length})`} />
            <Tab label={`열림 (${issues.filter(i => i.status === 'open').length})`} />
            <Tab label={`진행중 (${issues.filter(i => i.status === 'in_progress').length})`} />
            <Tab label={`해결됨 (${issues.filter(i => i.status === 'resolved').length})`} />
            <Tab label={`닫힘 (${issues.filter(i => i.status === 'closed').length})`} />
          </Tabs>
        </CardContent>
      </BackstageCard>

      {/* 이슈 목록 */}
      <BackstageCard>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>제목</TableCell>
                  <TableCell>타입</TableCell>
                  <TableCell>우선순위</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>관련 버그</TableCell>
                  <TableCell>프로젝트</TableCell>
                  <TableCell>담당자</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {activeTab === 0 ? '이슈가 없습니다.' : '해당 상태의 이슈가 없습니다.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
                          {issue.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={issue.issue_type} 
                          color={getTypeColor(issue.issue_type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={issue.priority} 
                          color={getPriorityColor(issue.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={issue.status || 'open'} 
                          color={getStatusColor(issue.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {issue.bug_id || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {issue.project_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {issue.assigned_to_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(issue.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="편집">
                          <IconButton size="small" onClick={() => handleEdit(issue)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDelete(issue.id)}>
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

      {/* 이슈 생성/편집 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIssue ? '이슈 편집' : '새 이슈'}
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
                <InputLabel>이슈 타입</InputLabel>
                <Select
                  value={formData.issue_type}
                  onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                >
                  <MenuItem value="bug">버그</MenuItem>
                  <MenuItem value="feature">기능 요청</MenuItem>
                  <MenuItem value="improvement">개선사항</MenuItem>
                  <MenuItem value="task">작업</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="urgent">긴급</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label="관련 버그 ID (선택사항)"
              value={formData.bug_id || ''}
              onChange={(e) => setFormData({ ...formData, bug_id: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            {editingIssue ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssueTracking;
