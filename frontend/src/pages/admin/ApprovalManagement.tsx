// [advice from AI] 승인 관리 페이지 - 시스템 및 자산 승인 워크플로우 관리
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 승인 대기 항목 타입
interface PendingApproval {
  id: string;
  type: 'system' | 'project' | 'code' | 'design' | 'document';
  title: string;
  description: string;
  submitter: string;
  submitted_at: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  current_step: number;
  total_steps: number;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'revision_needed';
  metadata: any;
}

// [advice from AI] 승인 히스토리 타입
interface ApprovalHistory {
  id: string;
  type: string;
  title: string;
  submitter: string;
  reviewer: string;
  decision: 'approved' | 'rejected';
  decision_reason: string;
  submitted_at: string;
  reviewed_at: string;
  processing_time_hours: number;
}

// [advice from AI] 승인 메트릭 타입
interface ApprovalMetrics {
  totalPending: number;
  systemsPending: number;
  assetsPending: number;
  avgProcessingTime: number;
  approvalRate: number;
  monthlyApprovals: { month: string; approved: number; rejected: number; }[];
}

const ApprovalManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [metrics, setMetrics] = useState<ApprovalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingApproval | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    decision: 'approved' as 'approved' | 'rejected',
    reason: '',
    feedback: ''
  });

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [pendingRes, historyRes, metricsRes] = await Promise.all([
        fetch('/api/admin/approvals/pending', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/approvals/history', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/approvals/metrics', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingApprovals(data.approvals || []);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setApprovalHistory(data.history || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 승인 처리
  const handleApprovalDecision = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`/api/admin/approvals/${selectedItem.id}/decision`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision: approvalForm.decision,
          reason: approvalForm.reason,
          feedback: approvalForm.feedback,
          reviewer_id: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('승인 처리 실패');
      }

      setApprovalDialog(false);
      setSelectedItem(null);
      setApprovalForm({ decision: 'approved', reason: '', feedback: '' });
      loadData();
      
    } catch (error) {
      console.error('승인 처리 실패:', error);
    }
  };

  // [advice from AI] 상세보기
  const handleViewDetails = (item: PendingApproval) => {
    setSelectedItem(item);
    setViewDialog(true);
  };

  // [advice from AI] 승인/거부 대화상자 열기
  const handleOpenApprovalDialog = (item: PendingApproval, decision: 'approved' | 'rejected') => {
    setSelectedItem(item);
    setApprovalForm({ ...approvalForm, decision });
    setApprovalDialog(true);
  };

  // [advice from AI] 타입별 색상
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'primary';
      case 'project': return 'secondary';
      case 'code': return 'info';
      case 'design': return 'warning';
      case 'document': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_review': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'revision_needed': return 'secondary';
      default: return 'default';
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  useEffect(() => {
    if (permissions.canViewApprovals) {
      loadData();
    }
  }, [permissions.canViewApprovals]);

  if (!permissions.canViewApprovals) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          승인 관리에 접근할 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          승인 관리
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        승인 관리
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        시스템 등록 및 지식 자산의 승인 워크플로우를 관리합니다
      </Typography>

      {/* [advice from AI] 메트릭 대시보드 */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  승인 대기
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {metrics.totalPending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  시스템: {metrics.systemsPending} | 자산: {metrics.assetsPending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  평균 처리시간
                </Typography>
                <Typography variant="h4" color="info.main">
                  {metrics.avgProcessingTime.toFixed(1)}시간
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  승인 완료까지
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  승인율
                </Typography>
                <Typography variant="h4" color="success.main">
                  {metrics.approvalRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  최근 30일 기준
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  이번달 승인
                </Typography>
                <Typography variant="h4" color="primary">
                  {metrics.monthlyApprovals[metrics.monthlyApprovals.length - 1]?.approved || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  거부: {metrics.monthlyApprovals[metrics.monthlyApprovals.length - 1]?.rejected || 0}건
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`승인 대기 (${pendingApprovals.length})`} />
        <Tab label={`시스템 승인 (${pendingApprovals.filter(a => a.type === 'system').length})`} />
        <Tab label={`자산 승인 (${pendingApprovals.filter(a => ['code', 'design', 'document'].includes(a.type)).length})`} />
        <Tab label={`승인 히스토리 (${approvalHistory.length})`} />
      </Tabs>

      {/* [advice from AI] 승인 대기 목록 */}
      {(tabValue === 0 || tabValue === 1 || tabValue === 2) && (
        <>
          {pendingApprovals.filter(approval => {
            if (tabValue === 1) return approval.type === 'system';
            if (tabValue === 2) return ['code', 'design', 'document'].includes(approval.type);
            return true;
          }).length === 0 ? (
            <Alert severity="info">
              승인 대기 중인 항목이 없습니다.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>제목</TableCell>
                    <TableCell>타입</TableCell>
                    <TableCell>제출자</TableCell>
                    <TableCell>우선순위</TableCell>
                    <TableCell>진행단계</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>제출일</TableCell>
                    <TableCell align="center">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingApprovals.filter(approval => {
                    if (tabValue === 1) return approval.type === 'system';
                    if (tabValue === 2) return ['code', 'design', 'document'].includes(approval.type);
                    return true;
                  }).map((approval) => (
                    <TableRow key={approval.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{approval.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {approval.description.length > 60 ? 
                            approval.description.substring(0, 60) + '...' : 
                            approval.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.type} 
                          color={getTypeColor(approval.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{approval.submitter}</TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.priority} 
                          color={getPriorityColor(approval.priority) as any}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={(approval.current_step / approval.total_steps) * 100}
                            sx={{ width: 60, height: 8 }}
                          />
                          <Typography variant="body2">
                            {approval.current_step}/{approval.total_steps}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.status} 
                          color={getStatusColor(approval.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(approval.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="상세보기">
                          <IconButton size="small" onClick={() => handleViewDetails(approval)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {permissions.canApprove && approval.status === 'pending' && (
                          <>
                            <Tooltip title="승인">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handleOpenApprovalDialog(approval, 'approved')}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="거부">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleOpenApprovalDialog(approval, 'rejected')}
                              >
                                <RejectIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* [advice from AI] 승인 히스토리 */}
      {tabValue === 3 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>제목</TableCell>
                <TableCell>타입</TableCell>
                <TableCell>제출자</TableCell>
                <TableCell>검토자</TableCell>
                <TableCell>결정</TableCell>
                <TableCell>처리시간</TableCell>
                <TableCell>검토일</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvalHistory.map((history) => (
                <TableRow key={history.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{history.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={history.type} 
                      color={getTypeColor(history.type) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{history.submitter}</TableCell>
                  <TableCell>{history.reviewer}</TableCell>
                  <TableCell>
                    <Chip 
                      label={history.decision} 
                      color={history.decision === 'approved' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {history.processing_time_hours.toFixed(1)}시간
                  </TableCell>
                  <TableCell>
                    {new Date(history.reviewed_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* [advice from AI] 상세보기 대화상자 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>승인 항목 상세 정보</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedItem.title}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedItem.description}</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="타입" secondary={selectedItem.type} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="제출자" secondary={selectedItem.submitter} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="우선순위" secondary={selectedItem.priority} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="제출일" secondary={new Date(selectedItem.submitted_at).toLocaleString()} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="진행 단계" 
                        secondary={`${selectedItem.current_step}/${selectedItem.total_steps} 단계`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="상태" 
                        secondary={
                          <Chip 
                            label={selectedItem.status} 
                            color={getStatusColor(selectedItem.status) as any}
                            size="small"
                          />
                        } 
                      />
                    </ListItem>
                  </List>
                </Grid>
                {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>추가 정보</Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                        {JSON.stringify(selectedItem.metadata, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>닫기</Button>
          {permissions.canApprove && selectedItem?.status === 'pending' && (
            <>
              <Button 
                onClick={() => {
                  setViewDialog(false);
                  if (selectedItem) handleOpenApprovalDialog(selectedItem, 'approved');
                }} 
                variant="contained" 
                color="success"
              >
                승인
              </Button>
              <Button 
                onClick={() => {
                  setViewDialog(false);
                  if (selectedItem) handleOpenApprovalDialog(selectedItem, 'rejected');
                }} 
                variant="contained" 
                color="error"
              >
                거부
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 승인/거부 대화상자 */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalForm.decision === 'approved' ? '승인 처리' : '거부 처리'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="처리 사유"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={approvalForm.reason}
            onChange={(e) => setApprovalForm({ ...approvalForm, reason: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="피드백 (선택사항)"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={approvalForm.feedback}
            onChange={(e) => setApprovalForm({ ...approvalForm, feedback: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>취소</Button>
          <Button 
            onClick={handleApprovalDecision} 
            variant="contained"
            color={approvalForm.decision === 'approved' ? 'success' : 'error'}
          >
            {approvalForm.decision === 'approved' ? '승인' : '거부'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalManagement;
