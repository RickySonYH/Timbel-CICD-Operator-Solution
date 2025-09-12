// [advice from AI] 지시서 승인 워크플로우 시스템
// Phase 2: PO 업무 지원 시스템의 핵심 기능

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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  Feedback as FeedbackIcon
} from '@mui/icons-material';

interface ApprovalWorkflow {
  id: string;
  instruction_id: string;
  instruction_title: string;
  current_step: number;
  total_steps: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'feedback_requested';
  created_by: string;
  created_by_name: string;
  approvers: Approver[];
  comments: Comment[];
  created_at: string;
  updated_at: string;
  deadline: string;
}

interface Approver {
  id: string;
  name: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'feedback_requested';
  comment?: string;
  approved_at?: string;
  order: number;
}

interface Comment {
  id: string;
  author: string;
  author_name: string;
  content: string;
  created_at: string;
  type: 'approval' | 'feedback' | 'general';
}

interface Instruction {
  id: string;
  title: string;
  content: string;
  status: string;
  priority: string;
  project_name: string;
  created_by_name: string;
  created_at: string;
}

const ApprovalWorkflow: React.FC = () => {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // 다이얼로그 상태
  const [workflowDialog, setWorkflowDialog] = useState(false);
  const [viewingWorkflow, setViewingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [commentDialog, setCommentDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
  
  // 폼 상태
  const [commentData, setCommentData] = useState({
    content: '',
    type: 'general' as 'approval' | 'feedback' | 'general'
  });

  // [advice from AI] 데이터 로드 함수들
  const loadWorkflows = async () => {
    try {
      // 실제로는 승인 워크플로우 API에서 데이터를 가져와야 함
      // 임시로 하드코딩된 데이터 사용
      const mockWorkflows: ApprovalWorkflow[] = [
        {
          id: 'workflow-001',
          instruction_id: '21af88be-6cdf-4518-b6a0-490d0f5fcb13',
          instruction_title: '사용자 인증 시스템 개발',
          current_step: 2,
          total_steps: 3,
          status: 'pending_review',
          created_by: '1a71adf6-daa1-4267-98f7-b99098945630',
          created_by_name: 'PO 사용자',
          approvers: [
            {
              id: 'approver-001',
              name: '김승인',
              role: 'Senior PO',
              status: 'approved',
              comment: '요구사항이 명확합니다.',
              approved_at: '2025-09-12T10:00:00.000Z',
              order: 1
            },
            {
              id: 'approver-002',
              name: '이검토',
              role: 'Technical Lead',
              status: 'pending',
              order: 2
            },
            {
              id: 'approver-003',
              name: '박최종',
              role: 'Project Manager',
              status: 'pending',
              order: 3
            }
          ],
          comments: [
            {
              id: 'comment-001',
              author: '1a71adf6-daa1-4267-98f7-b99098945630',
              author_name: 'PO 사용자',
              content: '초기 요구사항을 작성했습니다.',
              created_at: '2025-09-12T09:00:00.000Z',
              type: 'general'
            },
            {
              id: 'comment-002',
              author: 'approver-001',
              author_name: '김승인',
              content: '요구사항이 명확합니다.',
              created_at: '2025-09-12T10:00:00.000Z',
              type: 'approval'
            }
          ],
          created_at: '2025-09-12T09:00:00.000Z',
          updated_at: '2025-09-12T10:00:00.000Z',
          deadline: '2025-09-15T18:00:00.000Z'
        }
      ];
      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error('워크플로우 데이터 로드 중 오류:', error);
    }
  };

  const loadInstructions = async () => {
    try {
      const response = await fetch('/api/operations/instructions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInstructions(data);
      }
    } catch (error) {
      console.error('지시서 데이터 로드 중 오류:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadWorkflows(),
        loadInstructions()
      ]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // [advice from AI] 필터링된 워크플로우 목록
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.instruction_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.created_by_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_review': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'feedback_requested': return 'info';
      default: return 'default';
    }
  };

  const getApproverStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'feedback_requested': return 'warning';
      default: return 'default';
    }
  };

  // [advice from AI] 워크플로우 승인/거부 핸들러
  const handleApprove = async (workflowId: string, approverId: string, comment: string) => {
    try {
      // 실제로는 API 호출
      console.log('승인:', workflowId, approverId, comment);
    } catch (error) {
      console.error('승인 처리 중 오류:', error);
    }
  };

  const handleReject = async (workflowId: string, approverId: string, comment: string) => {
    try {
      // 실제로는 API 호출
      console.log('거부:', workflowId, approverId, comment);
    } catch (error) {
      console.error('거부 처리 중 오류:', error);
    }
  };

  const handleRequestFeedback = async (workflowId: string, approverId: string, comment: string) => {
    try {
      // 실제로는 API 호출
      console.log('피드백 요청:', workflowId, approverId, comment);
    } catch (error) {
      console.error('피드백 요청 중 오류:', error);
    }
  };

  // [advice from AI] 댓글 추가 핸들러
  const handleAddComment = async () => {
    try {
      // 실제로는 API 호출
      console.log('댓글 추가:', commentData);
      setCommentDialog(false);
      setCommentData({ content: '', type: 'general' });
    } catch (error) {
      console.error('댓글 추가 중 오류:', error);
    }
  };

  // [advice from AI] 워크플로우 상세 보기
  const handleViewWorkflow = (workflow: ApprovalWorkflow) => {
    setViewingWorkflow(workflow);
  };

  // [advice from AI] 댓글 다이얼로그 열기
  const handleOpenCommentDialog = (workflow: ApprovalWorkflow) => {
    setSelectedWorkflow(workflow);
    setCommentDialog(true);
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
          지시서 승인 워크플로우
        </Typography>
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
                    전체 워크플로우
                  </Typography>
                  <Typography variant="h5">
                    {workflows.length}
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
                    검토 대기
                  </Typography>
                  <Typography variant="h5">
                    {workflows.filter(w => w.status === 'pending_review').length}
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
                    승인됨
                  </Typography>
                  <Typography variant="h5">
                    {workflows.filter(w => w.status === 'approved').length}
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
                <FeedbackIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    피드백 요청
                  </Typography>
                  <Typography variant="h5">
                    {workflows.filter(w => w.status === 'feedback_requested').length}
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
              placeholder="지시서 제목 또는 작성자로 검색..."
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
                <MenuItem value="pending_review">검토 대기</MenuItem>
                <MenuItem value="approved">승인됨</MenuItem>
                <MenuItem value="rejected">거부됨</MenuItem>
                <MenuItem value="feedback_requested">피드백 요청</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 워크플로우 목록 */}
      <Grid container spacing={3}>
        {filteredWorkflows.map((workflow) => (
          <Grid item xs={12} key={workflow.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {workflow.instruction_title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      작성자: {workflow.created_by_name} • {new Date(workflow.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={workflow.status}
                      color={getStatusColor(workflow.status)}
                      size="small"
                    />
                    <Tooltip title="상세 보기">
                      <IconButton
                        size="small"
                        onClick={() => handleViewWorkflow(workflow)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* 진행률 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    진행률: {workflow.current_step} / {workflow.total_steps} 단계
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(workflow.current_step / workflow.total_steps) * 100}
                    sx={{ mb: 1 }}
                  />
                </Box>

                {/* 승인자 목록 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    승인자 현황:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {workflow.approvers.map((approver) => (
                      <Chip
                        key={approver.id}
                        label={`${approver.name} (${approver.role})`}
                        color={getApproverStatusColor(approver.status)}
                        size="small"
                        icon={
                          approver.status === 'approved' ? <CheckCircleIcon /> :
                          approver.status === 'rejected' ? <CancelIcon /> :
                          approver.status === 'feedback_requested' ? <FeedbackIcon /> :
                          <PendingIcon />
                        }
                      />
                    ))}
                  </Box>
                </Box>

                {/* 마감일 */}
                <Typography variant="body2" color="textSecondary">
                  마감일: {new Date(workflow.deadline).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 워크플로우 상세 보기 다이얼로그 */}
      <Dialog
        open={!!viewingWorkflow}
        onClose={() => setViewingWorkflow(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {viewingWorkflow?.instruction_title}
        </DialogTitle>
        <DialogContent>
          {viewingWorkflow && (
            <Box>
              {/* 워크플로우 단계 */}
              <Typography variant="h6" gutterBottom>
                승인 단계
              </Typography>
              <Stepper activeStep={viewingWorkflow.current_step - 1} orientation="vertical">
                {viewingWorkflow.approvers.map((approver, index) => (
                  <Step key={approver.id}>
                    <StepLabel>
                      {approver.name} ({approver.role})
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={approver.status}
                          color={getApproverStatusColor(approver.status)}
                          size="small"
                        />
                        {approver.approved_at && (
                          <Typography variant="caption" color="textSecondary">
                            {new Date(approver.approved_at).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                      {approver.comment && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {approver.comment}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              <Divider sx={{ my: 3 }} />

              {/* 댓글 목록 */}
              <Typography variant="h6" gutterBottom>
                댓글
              </Typography>
              <List>
                {viewingWorkflow.comments.map((comment) => (
                  <ListItem key={comment.id} divider>
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {comment.author_name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {comment.author_name}
                          </Typography>
                          <Chip
                            label={comment.type}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="textSecondary">
                            {new Date(comment.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={comment.content}
                    />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<FeedbackIcon />}
                  onClick={() => handleOpenCommentDialog(viewingWorkflow)}
                >
                  댓글 추가
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingWorkflow(null)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 댓글 추가 다이얼로그 */}
      <Dialog
        open={commentDialog}
        onClose={() => setCommentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          댓글 추가
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>댓글 유형</InputLabel>
                <Select
                  value={commentData.type}
                  onChange={(e) => setCommentData({ ...commentData, type: e.target.value as any })}
                  label="댓글 유형"
                >
                  <MenuItem value="general">일반</MenuItem>
                  <MenuItem value="approval">승인</MenuItem>
                  <MenuItem value="feedback">피드백</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="댓글 내용"
                multiline
                rows={4}
                value={commentData.content}
                onChange={(e) => setCommentData({ ...commentData, content: e.target.value })}
                placeholder="댓글을 입력하세요..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialog(false)}>
            취소
          </Button>
          <Button onClick={handleAddComment} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalWorkflow;
