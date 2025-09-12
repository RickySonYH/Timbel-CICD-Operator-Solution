// [advice from AI] QA 승인 워크플로우 페이지 - 실제 백엔드 API 연동
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
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  BugReport as BugReportIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import BackstageCard from '../../components/layout/BackstageCard';

interface QAApproval {
  id: string;
  approval_type: string;
  status: string;
  project_name?: string;
  test_suite_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

interface ApprovalFormData {
  approval_type: string;
  project_id?: string;
  test_suite_id?: string;
  comments?: string;
}

const QAApprovalWorkflow: React.FC = () => {
  const { isAuthenticated, token } = useJwtAuthStore();
  const [approvals, setApprovals] = useState<QAApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingApproval, setEditingApproval] = useState<QAApproval | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<ApprovalFormData>({
    approval_type: 'test_completion',
    comments: ''
  });

  // [advice from AI] QA 승인 목록 조회
  const fetchApprovals = async () => {
    try {
      setLoading(true);
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch('http://localhost:3001/api/qa/approvals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setApprovals(data.data.approvals || []);
      } else {
        setError('QA 승인 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('QA 승인 조회 오류:', err);
      setError('QA 승인을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 승인/반려 처리
  const handleApproval = async (id: string, action: 'approve' | 'reject', comments?: string) => {
    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/qa/approvals/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments })
      });

      const data = await response.json();
      if (data.success) {
        fetchApprovals();
      } else {
        setError(data.message || `${action === 'approve' ? '승인' : '반려'} 처리에 실패했습니다.`);
      }
    } catch (err) {
      console.error('QA 승인 처리 오류:', err);
      setError(`${action === 'approve' ? '승인' : '반려'} 처리 중 오류가 발생했습니다.`);
    }
  };

  // [advice from AI] 새 승인 요청
  const handleSave = async () => {
    try {
      if (!isAuthenticated || !token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch('http://localhost:3001/api/qa/approvals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setOpenDialog(false);
        setFormData({ approval_type: 'test_completion', comments: '' });
        fetchApprovals();
      } else {
        setError(data.message || '승인 요청에 실패했습니다.');
      }
    } catch (err) {
      console.error('QA 승인 요청 오류:', err);
      setError('승인 요청 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 새 승인 요청 모드 열기
  const handleAdd = () => {
    setEditingApproval(null);
    setFormData({ approval_type: 'test_completion', comments: '' });
    setOpenDialog(true);
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'test_completion': return 'info';
      case 'release_approval': return 'success';
      case 'hotfix_approval': return 'error';
      case 'feature_approval': return 'primary';
      default: return 'default';
    }
  };

  // [advice from AI] 탭별 필터링
  const filteredApprovals = approvals.filter(approval => {
    switch (activeTab) {
      case 0: return true; // 전체
      case 1: return approval.status === 'pending';
      case 2: return approval.status === 'approved';
      case 3: return approval.status === 'rejected';
      default: return true;
    }
  });

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>QA 승인 로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          QA 승인 워크플로우
        </Typography>
        <Box>
          <Tooltip title="새로고침">
            <IconButton onClick={fetchApprovals} color="primary" sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AssignmentIcon />}
            onClick={handleAdd}
          >
            새 승인 요청
          </Button>
        </Box>
      </Box>

      {/* 오류 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 승인 워크플로우 단계 */}
      <BackstageCard sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            QA 승인 프로세스
          </Typography>
          <Stepper activeStep={2} orientation="horizontal">
            <Step>
              <StepLabel>테스트 완료</StepLabel>
            </Step>
            <Step>
              <StepLabel>QA 검토</StepLabel>
            </Step>
            <Step>
              <StepLabel>승인/반려</StepLabel>
            </Step>
            <Step>
              <StepLabel>배포 준비</StepLabel>
            </Step>
          </Stepper>
        </CardContent>
      </BackstageCard>

      {/* 탭 필터 */}
      <BackstageCard sx={{ mb: 3 }}>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label={`전체 (${approvals.length})`} />
            <Tab label={`대기중 (${approvals.filter(a => a.status === 'pending').length})`} />
            <Tab label={`승인됨 (${approvals.filter(a => a.status === 'approved').length})`} />
            <Tab label={`반려됨 (${approvals.filter(a => a.status === 'rejected').length})`} />
          </Tabs>
        </CardContent>
      </BackstageCard>

      {/* 승인 목록 */}
      <BackstageCard>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>승인 타입</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>프로젝트</TableCell>
                  <TableCell>테스트 스위트</TableCell>
                  <TableCell>요청자</TableCell>
                  <TableCell>승인자</TableCell>
                  <TableCell>요청일</TableCell>
                  <TableCell>액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApprovals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {activeTab === 0 ? '승인 요청이 없습니다.' : '해당 상태의 승인 요청이 없습니다.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <Chip 
                          label={approval.approval_type} 
                          color={getTypeColor(approval.approval_type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.status || 'pending'} 
                          color={getStatusColor(approval.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {approval.project_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {approval.test_suite_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {approval.created_by_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {approval.approved_by_name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(approval.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {approval.status === 'pending' && (
                          <>
                            <Tooltip title="승인">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleApproval(approval.id, 'approve')}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="반려">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleApproval(approval.id, 'reject')}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {approval.status !== 'pending' && (
                          <Tooltip title="상세보기">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </BackstageCard>

      {/* 승인 요청 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          새 승인 요청
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>승인 타입</InputLabel>
              <Select
                value={formData.approval_type}
                onChange={(e) => setFormData({ ...formData, approval_type: e.target.value })}
              >
                <MenuItem value="test_completion">테스트 완료</MenuItem>
                <MenuItem value="release_approval">릴리스 승인</MenuItem>
                <MenuItem value="hotfix_approval">핫픽스 승인</MenuItem>
                <MenuItem value="feature_approval">기능 승인</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="프로젝트 ID (선택사항)"
              value={formData.project_id || ''}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="테스트 스위트 ID (선택사항)"
              value={formData.test_suite_id || ''}
              onChange={(e) => setFormData({ ...formData, test_suite_id: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="설명/코멘트"
              value={formData.comments || ''}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            승인 요청
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QAApprovalWorkflow;
