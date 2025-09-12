// [advice from AI] 테스트 케이스 관리 페이지 - 실제 백엔드 API 연동
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

interface TestCase {
  id: string;
  name: string;
  description: string;
  test_type: string;
  priority: string;
  status: string;
  project_name?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface TestCaseFormData {
  name: string;
  description: string;
  test_type: string;
  priority: string;
  project_id?: string;
}

const TestCaseManagement: React.FC = () => {
  const { isAuthenticated, token } = useJwtAuthStore();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [formData, setFormData] = useState<TestCaseFormData>({
    name: '',
    description: '',
    test_type: 'functional',
    priority: 'medium'
  });

  // [advice from AI] 테스트 케이스 목록 조회
  const fetchTestCases = async () => {
    try {
      setLoading(true);
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch('http://localhost:3001/api/qa/test-cases', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setTestCases(data.data.test_cases || []);
      } else {
        setError('테스트 케이스 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('테스트 케이스 조회 오류:', err);
      setError('테스트 케이스를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 테스트 케이스 생성/수정
  const handleSave = async () => {
    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const url = editingCase ? `http://localhost:3001/api/qa/test-cases/${editingCase.id}` : 'http://localhost:3001/api/qa/test-cases';
      const method = editingCase ? 'PUT' : 'POST';

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
        setEditingCase(null);
        setFormData({ name: '', description: '', test_type: 'functional', priority: 'medium' });
        fetchTestCases();
      } else {
        setError(data.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('테스트 케이스 저장 오류:', err);
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 테스트 케이스 삭제
  const handleDelete = async (id: string) => {
    if (!window.confirm('정말로 이 테스트 케이스를 삭제하시겠습니까?')) {
      return;
    }

    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/qa/test-cases/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchTestCases();
      } else {
        setError(data.message || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('테스트 케이스 삭제 오류:', err);
      setError('삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 편집 모드 열기
  const handleEdit = (testCase: TestCase) => {
    setEditingCase(testCase);
    setFormData({
      name: testCase.name,
      description: testCase.description,
      test_type: testCase.test_type,
      priority: testCase.priority,
      project_id: testCase.project_name || ''
    });
    setOpenDialog(true);
  };

  // [advice from AI] 새 테스트 케이스 모드 열기
  const handleAdd = () => {
    setEditingCase(null);
    setFormData({ name: '', description: '', test_type: 'functional', priority: 'medium' });
    setOpenDialog(true);
  };

  useEffect(() => {
    fetchTestCases();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'draft': return 'default';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>테스트 케이스 로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          테스트 케이스 관리
        </Typography>
        <Box>
          <Tooltip title="새로고침">
            <IconButton onClick={fetchTestCases} color="primary" sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            새 테스트 케이스
          </Button>
        </Box>
      </Box>

      {/* 오류 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 테스트 케이스 목록 */}
      <BackstageCard>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>설명</TableCell>
                  <TableCell>타입</TableCell>
                  <TableCell>우선순위</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>프로젝트</TableCell>
                  <TableCell>생성자</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {testCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="text.secondary">
                        테스트 케이스가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  testCases.map((testCase) => (
                    <TableRow key={testCase.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {testCase.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {testCase.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={testCase.test_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={testCase.priority} 
                          color={getPriorityColor(testCase.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={testCase.status || 'draft'} 
                          color={getStatusColor(testCase.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {testCase.project_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {testCase.created_by_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(testCase.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="편집">
                          <IconButton size="small" onClick={() => handleEdit(testCase)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDelete(testCase.id)}>
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

      {/* 테스트 케이스 생성/편집 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCase ? '테스트 케이스 편집' : '새 테스트 케이스'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="테스트 케이스 이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <FormControl fullWidth margin="normal">
              <InputLabel>테스트 타입</InputLabel>
              <Select
                value={formData.test_type}
                onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
              >
                <MenuItem value="functional">기능 테스트</MenuItem>
                <MenuItem value="integration">통합 테스트</MenuItem>
                <MenuItem value="performance">성능 테스트</MenuItem>
                <MenuItem value="security">보안 테스트</MenuItem>
                <MenuItem value="usability">사용성 테스트</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>우선순위</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            {editingCase ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestCaseManagement;
