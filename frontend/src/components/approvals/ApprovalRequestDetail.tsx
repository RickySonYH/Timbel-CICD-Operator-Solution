// [advice from AI] 승인 요청 상세 보기 및 처리 컴포넌트
// 승인 요청의 세부 내용을 확인하고 승인/반려 처리할 수 있는 기능

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Comment as CommentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  BugReport as BugIcon,
  Architecture as ArchitectureIcon,
  RocketLaunch as DeployIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface ApprovalRequest {
  id: number;
  request_id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  requester_name: string;
  requester_email: string;
  department_name: string;
  project_name?: string;
  component_name?: string;
  version?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

interface Approver {
  id: number;
  approver_id: string;
  full_name: string;
  email: string;
  role_type: string;
  level: number;
  status: string;
  assigned_at: string;
  responded_at?: string;
  decided_at?: string;
  response_comment?: string;
  timeout_hours: number;
}

interface Comment {
  id: number;
  comment_id: string;
  author_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface ApprovalRequestDetailProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  onStatusChange: () => void;
}

const ApprovalRequestDetail: React.FC<ApprovalRequestDetailProps> = ({
  open,
  onClose,
  requestId,
  onStatusChange
}) => {
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [responseComment, setResponseComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { token, user } = useJwtAuthStore();

  // [advice from AI] 승인 요청 상세 정보 로드
  const loadRequestDetail = async () => {
    if (!requestId || !token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/approvals/requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRequest(data.data.request);
          setApprovers(data.data.approvers);
          setComments(data.data.comments);
        }
      } else {
        setError('승인 요청 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('승인 요청 상세 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && requestId) {
      loadRequestDetail();
    }
  }, [open, requestId, token]);

  // [advice from AI] 승인/반려 처리
  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    if (!requestId || !token) return;

    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/approvals/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          comment: responseComment,
          metadata: {
            responded_at: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('승인 처리 응답:', data);
        if (data.success) {
          onStatusChange();
          onClose();
        } else {
          console.error('승인 처리 실패 응답:', data);
          setError(data.message || `${action === 'approve' ? '승인' : '반려'} 처리에 실패했습니다.`);
        }
      } else {
        const errorData = await response.text();
        console.error('HTTP 에러:', response.status, errorData);
        setError(`${action === 'approve' ? '승인' : '반려'} 처리에 실패했습니다. (${response.status})`);
      }
    } catch (error) {
      console.error('승인 처리 실패:', error);
      setError('처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // [advice from AI] 댓글 추가
  const handleAddComment = async () => {
    if (!requestId || !token || !newComment.trim()) return;

    try {
      const response = await fetch('http://localhost:3001/api/approvals/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_id: requestId,
          request_type: 'approval',
          content: newComment,
          is_internal: isInternalComment
        })
      });

      if (response.ok) {
        setNewComment('');
        loadRequestDetail(); // 댓글 목록 새로고침
      }
    } catch (error) {
      console.error('댓글 추가 실패:', error);
    }
  };

  // [advice from AI] 승인/반려 결정 취소
  const handleCancelDecision = async () => {
    if (!token || !requestId) return;

    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/approvals/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancelReason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowCancelDialog(false);
        setCancelReason('');
        // 상태 변경 알림
        if (onStatusChange) {
          onStatusChange();
        }
        // 상세 정보 새로고침
        loadRequestDetail();
      } else {
        setError(data.message || '취소 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('승인 결정 취소 실패:', error);
      setError('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // [advice from AI] 취소 가능 여부 확인
  const canCancelDecision = () => {
    if (!user || !request) return false;
    
    // 24시간 이내 본인이 처리한 승인/반려만 취소 가능
    const myApprover = approvers.find(app => app.approver_id === user.id);
    if (!myApprover || myApprover.status === 'pending' || !myApprover.decided_at) return false;
    
    const decidedAt = new Date(myApprover.decided_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - decidedAt.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff <= 24 && request.status !== 'completed';
  };

  // [advice from AI] 승인 유형별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code_component': return <AssignmentIcon />;
      case 'bug_fix': return <BugIcon />;
      case 'architecture_change': return <ArchitectureIcon />;
      case 'solution_deployment': return <DeployIcon />;
      default: return <AssignmentIcon />;
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

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // [advice from AI] 시간 포맷팅
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (!request) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getTypeIcon(request.type)}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{request.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {request.request_id}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* [advice from AI] 기본 정보 */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      요청자
                    </Typography>
                    <Typography variant="body1">
                      {request.requester_name} ({request.requester_email})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      부서
                    </Typography>
                    <Typography variant="body1">
                      {request.department_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      유형
                    </Typography>
                    <Chip 
                      label={request.type} 
                      icon={getTypeIcon(request.type)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      우선순위
                    </Typography>
                    <Chip 
                      label={request.priority} 
                      color={getPriorityColor(request.priority) as any}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      상태
                    </Typography>
                    <Chip 
                      label={request.status} 
                      color={getStatusColor(request.status) as any}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      마감일
                    </Typography>
                    <Typography variant="body1">
                      {request.due_date ? formatDateTime(request.due_date) : '미정'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* [advice from AI] 상세 내용 */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  상세 내용
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {request.description}
                </Typography>
                
                {request.component_name && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      컴포넌트 정보
                    </Typography>
                    <Typography variant="body2">
                      {request.component_name} {request.version && `v${request.version}`}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* [advice from AI] 탭 네비게이션 */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab label="승인자 현황" />
                <Tab label="댓글" />
                <Tab label="처리" />
              </Tabs>
            </Box>

            {/* [advice from AI] 탭 내용 */}
            {activeTab === 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    승인자 현황
                  </Typography>
                  <List>
                    {approvers.map((approver, index) => (
                      <ListItem key={approver.id}>
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${approver.full_name} (${approver.role_type})`}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {approver.email} • {approver.level}단계
                              </Typography>
                              <Chip 
                                label={approver.status} 
                                color={getStatusColor(approver.status) as any}
                                size="small"
                                sx={{ mt: 0.5 }}
                              />
                              {approver.response_comment && (
                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                  {approver.response_comment}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}

            {activeTab === 1 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    댓글
                  </Typography>
                  
                  {/* [advice from AI] 댓글 목록 */}
                  <List>
                    {comments.map((comment) => (
                      <ListItem key={comment.id}>
                        <ListItemAvatar>
                          <Avatar>
                            <CommentIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {comment.author_name}
                              </Typography>
                              {comment.is_internal && (
                                <Chip label="내부" size="small" color="secondary" />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(comment.created_at)}
                              </Typography>
                            </Box>
                          }
                          secondary={comment.content}
                        />
                      </ListItem>
                    ))}
                  </List>

                  {/* [advice from AI] 댓글 작성 */}
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="댓글을 입력하세요..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input
                          type="checkbox"
                          id="internal-comment"
                          checked={isInternalComment}
                          onChange={(e) => setIsInternalComment(e.target.checked)}
                        />
                        <label htmlFor="internal-comment">
                          <Typography variant="caption">
                            내부 댓글 (승인자만 볼 수 있음)
                          </Typography>
                        </label>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                      >
                        댓글 추가
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {activeTab === 2 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    승인 처리
                  </Typography>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="승인/반려 사유를 입력하세요..."
                    value={responseComment}
                    onChange={(e) => setResponseComment(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ApproveIcon />}
                      onClick={() => handleApprovalAction('approve')}
                      disabled={actionLoading}
                    >
                      승인
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => handleApprovalAction('reject')}
                      disabled={actionLoading}
                    >
                      반려
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {/* [advice from AI] 취소 버튼 - 24시간 이내 본인 처리 건만 표시 */}
        {canCancelDecision() && (
          <Button
            variant="outlined"
            color="warning"
            onClick={() => setShowCancelDialog(true)}
            disabled={actionLoading}
          >
            결정 취소
          </Button>
        )}
        <Button onClick={onClose}>
          닫기
        </Button>
      </DialogActions>

      {/* [advice from AI] 취소 확인 다이얼로그 */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>승인/반려 결정 취소</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            승인/반려 결정을 취소하면 해당 승인 요청은 다시 대기 상태로 돌아갑니다.
            취소는 24시간 이내에만 가능하며, 본인이 처리한 건만 취소할 수 있습니다.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="취소 사유 (선택사항)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="취소 사유를 입력해주세요..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleCancelDecision}
            disabled={actionLoading}
          >
            {actionLoading ? '처리 중...' : '결정 취소'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ApprovalRequestDetail;
