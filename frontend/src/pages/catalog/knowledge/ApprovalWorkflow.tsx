// [advice from AI] 승인 워크플로우 컴포넌트
// PE 1차 검토, QA/QC 2차 승인 프로세스 관리

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
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
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Approval as ApprovalIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  Comment as CommentIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface ApprovalItem {
  id: string;
  title: string;
  type: 'design' | 'code' | 'document';
  submitter: string;
  submitterRole: string;
  currentStep: number;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  description: string;
  files: string[];
  comments: ApprovalComment[];
  workflow: WorkflowStep[];
}

interface ApprovalComment {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  createdAt: Date;
  type: 'comment' | 'approval' | 'rejection' | 'revision_request';
}

interface WorkflowStep {
  step: number;
  title: string;
  assignedTo: string;
  assignedRole: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  comment?: string;
}

const ApprovalWorkflow: React.FC = () => {
  const { user } = useJwtAuthStore();
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'my_tasks'>('all');

  // [advice from AI] 승인 프로세스 단계 정의
  const workflowSteps = [
    { label: '등록', description: '사용자가 자산을 등록합니다' },
    { label: 'PE 1차 검토', description: 'PE가 기술적 검토를 수행합니다' },
    { label: 'QA/QC 2차 승인', description: 'QA/QC에서 품질 검증을 수행합니다' },
    { label: '다이어그램 생성', description: '관계도 및 다이어그램을 자동 생성합니다' },
    { label: '수정/확인', description: '생성된 다이어그램을 검토하고 수정합니다' },
    { label: '최종 승인', description: '관리자가 최종 승인을 합니다' }
  ];

  // [advice from AI] 샘플 승인 아이템 데이터
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([
    {
      id: '1',
      title: 'Button 컴포넌트 디자인 시스템',
      type: 'design',
      submitter: '김디자이너',
      submitterRole: 'designer',
      currentStep: 2,
      status: 'in_review',
      priority: 'high',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-16'),
      description: 'Primary, Secondary, Tertiary 버튼 컴포넌트의 디자인 시스템 정의',
      files: ['button-design.sketch', 'button-specs.pdf'],
      comments: [
        {
          id: '1',
          author: '이PE',
          authorRole: 'pe',
          content: '컴포넌트 구조가 명확하고 재사용성이 좋습니다. 승인합니다.',
          createdAt: new Date('2024-01-16'),
          type: 'approval'
        }
      ],
      workflow: [
        { step: 1, title: '등록', assignedTo: '김디자이너', assignedRole: 'designer', status: 'completed', completedAt: new Date('2024-01-15') },
        { step: 2, title: 'PE 1차 검토', assignedTo: '이PE', assignedRole: 'pe', status: 'completed', completedAt: new Date('2024-01-16') },
        { step: 3, title: 'QA/QC 2차 승인', assignedTo: '박QA', assignedRole: 'qa', status: 'in_progress' },
        { step: 4, title: '다이어그램 생성', assignedTo: '시스템', assignedRole: 'system', status: 'pending' },
        { step: 5, title: '수정/확인', assignedTo: '김디자이너', assignedRole: 'designer', status: 'pending' },
        { step: 6, title: '최종 승인', assignedTo: '최관리자', assignedRole: 'admin', status: 'pending' }
      ]
    },
    {
      id: '2',
      title: 'API 문서 업데이트',
      type: 'document',
      submitter: '정개발자',
      submitterRole: 'pe',
      currentStep: 1,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17'),
      description: '사용자 인증 API의 문서를 최신 버전으로 업데이트',
      files: ['auth-api-v2.md'],
      comments: [],
      workflow: [
        { step: 1, title: '등록', assignedTo: '정개발자', assignedRole: 'pe', status: 'completed', completedAt: new Date('2024-01-17') },
        { step: 2, title: 'PE 1차 검토', assignedTo: '이PE', assignedRole: 'pe', status: 'pending' },
        { step: 3, title: 'QA/QC 2차 승인', assignedTo: '박QA', assignedRole: 'qa', status: 'pending' },
        { step: 4, title: '다이어그램 생성', assignedTo: '시스템', assignedRole: 'system', status: 'pending' },
        { step: 5, title: '수정/확인', assignedTo: '정개발자', assignedRole: 'pe', status: 'pending' },
        { step: 6, title: '최종 승인', assignedTo: '최관리자', assignedRole: 'admin', status: 'pending' }
      ]
    }
  ]);

  const getStatusColor = (status: ApprovalItem['status']) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_review': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'needs_revision': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status: ApprovalItem['status']) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'in_review': return '검토중';
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      case 'needs_revision': return '수정요청';
      default: return '알 수 없음';
    }
  };

  const getPriorityColor = (priority: ApprovalItem['priority']) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: ApprovalItem['priority']) => {
    switch (priority) {
      case 'urgent': return '긴급';
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '알 수 없음';
    }
  };

  const getTypeText = (type: ApprovalItem['type']) => {
    switch (type) {
      case 'design': return '디자인';
      case 'code': return '코드';
      case 'document': return '문서';
      default: return '알 수 없음';
    }
  };

  const getFilteredItems = () => {
    switch (filter) {
      case 'pending':
        return approvalItems.filter(item => item.status === 'pending' || item.status === 'in_review');
      case 'my_tasks':
        return approvalItems.filter(item => 
          item.workflow.some(step => 
            (step.assignedRole === user?.roleType || step.assignedRole === 'system') && 
            step.status === 'in_progress'
          )
        );
      default:
        return approvalItems;
    }
  };

  const handleApprove = (itemId: string) => {
    setApprovalItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, currentStep: item.currentStep + 1, status: item.currentStep >= 5 ? 'approved' : 'in_review' }
          : item
      )
    );
  };

  const handleReject = (itemId: string) => {
    setApprovalItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, status: 'rejected' }
          : item
      )
    );
  };

  const handleRequestRevision = (itemId: string) => {
    setApprovalItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, status: 'needs_revision' }
          : item
      )
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          승인 워크플로우
        </Typography>
        <Typography variant="body1" color="text.secondary">
          PE 1차 검토, QA/QC 2차 승인 프로세스를 관리하고 다이어그램 생성 및 수정 과정을 추적합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 필터 및 통계 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                승인 프로세스 현황
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`전체: ${approvalItems.length}건`} 
                  color="primary" 
                  variant="outlined"
                />
                <Chip 
                  label={`대기중: ${approvalItems.filter(item => item.status === 'pending').length}건`} 
                  color="warning" 
                  variant="outlined"
                />
                <Chip 
                  label={`검토중: ${approvalItems.filter(item => item.status === 'in_review').length}건`} 
                  color="info" 
                  variant="outlined"
                />
                <Chip 
                  label={`승인됨: ${approvalItems.filter(item => item.status === 'approved').length}건`} 
                  color="success" 
                  variant="outlined"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>필터</InputLabel>
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  label="필터"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="pending">대기중/검토중</MenuItem>
                  <MenuItem value="my_tasks">내 업무</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* [advice from AI] 승인 아이템 목록 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                승인 대기 목록
              </Typography>
              <List>
                {getFilteredItems().map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="상세보기">
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setSelectedItem(item);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="댓글">
                            <IconButton size="small">
                              <CommentIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <AssignmentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography component="span" variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {item.title}
                            </Typography>
                            <Chip 
                              label={getStatusText(item.status)} 
                              size="small" 
                              color={getStatusColor(item.status) as any}
                            />
                            <Chip 
                              label={getPriorityText(item.priority)} 
                              size="small" 
                              color={getPriorityColor(item.priority) as any}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography component="span" variant="body2" color="text.secondary">
                              {getTypeText(item.type)} • {item.submitter} ({item.submitterRole}) • {item.createdAt.toLocaleDateString()}
                            </Typography>
                            <Typography component="span" variant="caption" color="text.secondary" display="block">
                              현재 단계: {workflowSteps[item.currentStep - 1]?.label}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < getFilteredItems().length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 워크플로우 단계 안내 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                승인 프로세스
              </Typography>
              <Stepper activeStep={selectedItem?.currentStep || 0} orientation="vertical">
                {workflowSteps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel>{step.label}</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 상세보기 다이얼로그 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedItem?.title}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip 
              label={getStatusText(selectedItem?.status || 'pending')} 
              color={getStatusColor(selectedItem?.status || 'pending') as any}
              size="small"
            />
            <Chip 
              label={getPriorityText(selectedItem?.priority || 'medium')} 
              color={getPriorityColor(selectedItem?.priority || 'medium') as any}
              size="small"
              variant="outlined"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedItem.description}
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                워크플로우 진행 상황
              </Typography>
              <Stepper activeStep={selectedItem.currentStep - 1} orientation="vertical">
                {selectedItem.workflow.map((step, index) => (
                  <Step key={index}>
                    <StepLabel>
                      {step.title} ({step.assignedTo})
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        담당자: {step.assignedTo} ({step.assignedRole})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        상태: {step.status}
                      </Typography>
                      {step.completedAt && (
                        <Typography variant="caption" color="text.secondary">
                          완료일: {step.completedAt.toLocaleString()}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              {/* [advice from AI] 승인/거부 버튼 (권한에 따라 표시) */}
              {(user?.roleType === 'pe' || user?.roleType === 'qa' || user?.roleType === 'admin') && (
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      handleApprove(selectedItem.id);
                      setDetailDialogOpen(false);
                    }}
                  >
                    승인
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => {
                      handleReject(selectedItem.id);
                      setDetailDialogOpen(false);
                    }}
                  >
                    거부
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      handleRequestRevision(selectedItem.id);
                      setDetailDialogOpen(false);
                    }}
                  >
                    수정요청
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalWorkflow;
