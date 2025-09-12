// [advice from AI] PE 업무 관리 시스템
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
  AccordionDetails,
  Badge
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

interface AssignedTask {
  id: string;
  instruction_id: string;
  title: string;
  content: string;
  project_name: string;
  priority: string;
  status: string;
  work_percentage: number;
  estimated_hours: number;
  actual_hours?: number;
  progress: number;
  assigned_at: string;
  deadline: string;
  created_by_name: string;
  dependencies: any;
  attachments: any[];
}

interface ProgressUpdate {
  id: string;
  instruction_id: string;
  progress_percentage: number;
  commit_count: number;
  lines_added: number;
  lines_removed: number;
  files_changed: number;
  last_commit_hash: string;
  last_commit_message: string;
  last_activity_at: string;
  created_at: string;
}

const TaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  
  // 다이얼로그 상태
  const [taskDialog, setTaskDialog] = useState(false);
  const [progressDialog, setProgressDialog] = useState(false);
  const [viewingTask, setViewingTask] = useState<AssignedTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<AssignedTask | null>(null);
  
  // 폼 상태
  const [progressData, setProgressData] = useState({
    progress_percentage: 0,
    commit_count: 0,
    lines_added: 0,
    lines_removed: 0,
    files_changed: 0,
    last_commit_hash: '',
    last_commit_message: ''
  });

  // [advice from AI] 데이터 로드 함수들
  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/operations/assignments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // PE 사용자에게 할당된 작업만 필터링
        const assignedTasks = data.map((assignment: any) => ({
          id: assignment.id,
          instruction_id: assignment.id,
          title: assignment.instruction_title,
          content: '', // 실제로는 별도 API에서 가져와야 함
          project_name: assignment.project_name,
          priority: assignment.priority,
          status: assignment.status,
          work_percentage: assignment.work_percentage,
          estimated_hours: assignment.estimated_hours,
          actual_hours: assignment.actual_hours,
          progress: 0, // 실제로는 progress 테이블에서 계산
          assigned_at: assignment.assigned_at,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 임시 마감일
          created_by_name: 'PO 사용자',
          dependencies: {},
          attachments: []
        }));
        setTasks(assignedTasks);
      }
    } catch (error) {
      console.error('업무 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgressUpdates = async () => {
    try {
      // 실제로는 progress API에서 데이터를 가져와야 함
      // 임시로 하드코딩된 데이터 사용
      const mockProgress: ProgressUpdate[] = [
        {
          id: 'progress-001',
          instruction_id: '21af88be-6cdf-4518-b6a0-490d0f5fcb13',
          progress_percentage: 75,
          commit_count: 12,
          lines_added: 450,
          lines_removed: 120,
          files_changed: 8,
          last_commit_hash: 'abc123def456',
          last_commit_message: '사용자 인증 로직 구현 완료',
          last_activity_at: '2025-09-12T15:30:00.000Z',
          created_at: '2025-09-12T15:30:00.000Z'
        }
      ];
      setProgressUpdates(mockProgress);
    } catch (error) {
      console.error('진행 상황 데이터 로드 중 오류:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadTasks(),
        loadProgressUpdates()
      ]);
    };
    loadData();
  }, []);

  // [advice from AI] 필터링된 작업 목록
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 작업 상태 변경 핸들러
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      // 실제로는 API 호출
      console.log('상태 변경:', taskId, newStatus);
      await loadTasks();
    } catch (error) {
      console.error('상태 변경 중 오류:', error);
    }
  };

  // [advice from AI] 진행 상황 업데이트 핸들러
  const handleProgressUpdate = async () => {
    try {
      // 실제로는 API 호출
      console.log('진행 상황 업데이트:', progressData);
      setProgressDialog(false);
      setProgressData({
        progress_percentage: 0,
        commit_count: 0,
        lines_added: 0,
        lines_removed: 0,
        files_changed: 0,
        last_commit_hash: '',
        last_commit_message: ''
      });
      await loadTasks();
      await loadProgressUpdates();
    } catch (error) {
      console.error('진행 상황 업데이트 중 오류:', error);
    }
  };

  // [advice from AI] 작업 상세 보기
  const handleViewTask = (task: AssignedTask) => {
    setViewingTask(task);
  };

  // [advice from AI] 진행 상황 업데이트 다이얼로그 열기
  const handleOpenProgressDialog = (task: AssignedTask) => {
    setSelectedTask(task);
    setProgressData({
      progress_percentage: task.progress,
      commit_count: 0,
      lines_added: 0,
      lines_removed: 0,
      files_changed: 0,
      last_commit_hash: '',
      last_commit_message: ''
    });
    setProgressDialog(true);
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
          <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          업무 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<TrendingUpIcon />}
          onClick={() => setProgressDialog(true)}
          sx={{ bgcolor: 'primary.main' }}
        >
          진행 상황 업데이트
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
                    전체 업무
                  </Typography>
                  <Typography variant="h5">
                    {tasks.length}
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
                <PlayIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    진행 중
                  </Typography>
                  <Typography variant="h5">
                    {tasks.filter(t => t.status === 'in_progress').length}
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
                    완료됨
                  </Typography>
                  <Typography variant="h5">
                    {tasks.filter(t => t.status === 'completed').length}
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
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    지연됨
                  </Typography>
                  <Typography variant="h5">
                    {tasks.filter(t => new Date(t.deadline) < new Date()).length}
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
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="업무 제목 또는 프로젝트로 검색..."
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
                <MenuItem value="assigned">할당됨</MenuItem>
                <MenuItem value="in_progress">진행 중</MenuItem>
                <MenuItem value="completed">완료됨</MenuItem>
                <MenuItem value="paused">일시정지</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                label="우선순위"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 탭 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="업무 목록" />
          <Tab label="진행 상황" />
          <Tab label="완료된 업무" />
        </Tabs>
      </Box>

      {/* 업무 목록 탭 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {filteredTasks.map((task) => (
            <Grid item xs={12} md={6} lg={4} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" noWrap sx={{ flex: 1, mr: 1 }}>
                      {task.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip
                        label={task.status}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                      <Chip
                        label={task.priority}
                        color={getPriorityColor(task.priority)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {task.project_name}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      진행률: {task.progress}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={task.progress}
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      예상 공수: {task.estimated_hours}시간
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      마감일: {new Date(task.deadline).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewTask(task)}
                    >
                      상세
                    </Button>
                    <Button
                      size="small"
                      startIcon={<TrendingUpIcon />}
                      onClick={() => handleOpenProgressDialog(task)}
                    >
                      진행상황
                    </Button>
                    {task.status === 'assigned' && (
                      <Button
                        size="small"
                        startIcon={<PlayIcon />}
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                        color="success"
                      >
                        시작
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="small"
                        startIcon={<PauseIcon />}
                        onClick={() => handleStatusChange(task.id, 'paused')}
                        color="warning"
                      >
                        일시정지
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleStatusChange(task.id, 'completed')}
                        color="success"
                      >
                        완료
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 진행 상황 탭 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  최근 진행 상황
                </Typography>
                <List>
                  {progressUpdates.map((update) => (
                    <ListItem key={update.id} divider>
                      <ListItemIcon>
                        <CodeIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              진행률: {update.progress_percentage}%
                            </Typography>
                            <Chip
                              label={`${update.commit_count} 커밋`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {update.last_commit_message}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(update.last_activity_at).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 완료된 업무 탭 */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  완료된 업무
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>업무</TableCell>
                        <TableCell>프로젝트</TableCell>
                        <TableCell>완료일</TableCell>
                        <TableCell>소요 시간</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tasks.filter(t => t.status === 'completed').map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.title}</TableCell>
                          <TableCell>{task.project_name}</TableCell>
                          <TableCell>
                            {new Date(task.assigned_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{task.actual_hours || task.estimated_hours}시간</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewTask(task)}
                            >
                              상세
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 업무 상세 보기 다이얼로그 */}
      <Dialog
        open={!!viewingTask}
        onClose={() => setViewingTask(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {viewingTask?.title}
        </DialogTitle>
        <DialogContent>
          {viewingTask && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">프로젝트</Typography>
                  <Typography>{viewingTask.project_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">상태</Typography>
                  <Chip
                    label={viewingTask.status}
                    color={getStatusColor(viewingTask.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">우선순위</Typography>
                  <Chip
                    label={viewingTask.priority}
                    color={getPriorityColor(viewingTask.priority)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">마감일</Typography>
                  <Typography>{new Date(viewingTask.deadline).toLocaleString()}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                진행률: {viewingTask.progress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={viewingTask.progress}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" gutterBottom>
                업무 내용
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {viewingTask.content || '업무 내용이 없습니다.'}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingTask(null)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 진행 상황 업데이트 다이얼로그 */}
      <Dialog
        open={progressDialog}
        onClose={() => setProgressDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          진행 상황 업데이트
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="진행률 (%)"
                type="number"
                value={progressData.progress_percentage}
                onChange={(e) => setProgressData({ ...progressData, progress_percentage: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="커밋 수"
                type="number"
                value={progressData.commit_count}
                onChange={(e) => setProgressData({ ...progressData, commit_count: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="추가된 라인 수"
                type="number"
                value={progressData.lines_added}
                onChange={(e) => setProgressData({ ...progressData, lines_added: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="삭제된 라인 수"
                type="number"
                value={progressData.lines_removed}
                onChange={(e) => setProgressData({ ...progressData, lines_removed: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="변경된 파일 수"
                type="number"
                value={progressData.files_changed}
                onChange={(e) => setProgressData({ ...progressData, files_changed: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="마지막 커밋 해시"
                value={progressData.last_commit_hash}
                onChange={(e) => setProgressData({ ...progressData, last_commit_hash: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="마지막 커밋 메시지"
                multiline
                rows={3}
                value={progressData.last_commit_message}
                onChange={(e) => setProgressData({ ...progressData, last_commit_message: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressDialog(false)}>
            취소
          </Button>
          <Button onClick={handleProgressUpdate} variant="contained">
            업데이트
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskManagement;
