// [advice from AI] 업무 분배 관리 시스템
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
  ListItemAvatar,
  Divider
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
  SwapHoriz as SwapIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface PE {
  id: string;
  name: string;
  email: string;
  role: string;
  currentWorkload: number;
  maxWorkload: number;
  skills: string[];
  availability: 'available' | 'busy' | 'overloaded';
}

interface WorkAssignment {
  id: string;
  instruction_id: string;
  instruction_title: string;
  pe_id: string;
  pe_name: string;
  work_percentage: number;
  estimated_hours: number;
  actual_hours?: number;
  priority: string;
  status: string;
  assigned_at: string;
  deadline: string;
  progress: number;
}

interface Instruction {
  id: string;
  title: string;
  content: string;
  estimated_hours: number;
  priority: string;
  status: string;
  project_name: string;
  assigned_pe_name?: string;
}

const WorkAssignment: React.FC = () => {
  const [pes, setPes] = useState<PE[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // 다이얼로그 상태
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignment | null>(null);
  const [reassignDialog, setReassignDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<WorkAssignment | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    instruction_id: '',
    pe_id: '',
    work_percentage: 100,
    estimated_hours: 0,
    priority: 'medium',
    deadline: ''
  });

  // [advice from AI] 데이터 로드 함수들
  const loadPes = async () => {
    try {
      // 실제로는 사용자 API에서 PE 역할 사용자들을 가져와야 함
      // 임시로 하드코딩된 데이터 사용
      const mockPes: PE[] = [
        {
          id: 'cb45aae6-4b47-4238-af31-5bbbeaa3d18c',
          name: 'PE 사용자',
          email: 'pe@timbel.com',
          role: 'pe',
          currentWorkload: 60,
          maxWorkload: 100,
          skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
          availability: 'available'
        },
        {
          id: 'pe-002',
          name: '김개발',
          email: 'kim.dev@timbel.com',
          role: 'pe',
          currentWorkload: 80,
          maxWorkload: 100,
          skills: ['Vue.js', 'Python', 'Django', 'MongoDB'],
          availability: 'busy'
        },
        {
          id: 'pe-003',
          name: '이프론트',
          email: 'lee.frontend@timbel.com',
          role: 'pe',
          currentWorkload: 95,
          maxWorkload: 100,
          skills: ['React', 'Angular', 'JavaScript', 'CSS'],
          availability: 'overloaded'
        }
      ];
      setPes(mockPes);
    } catch (error) {
      console.error('PE 데이터 로드 중 오류:', error);
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

  const loadAssignments = async () => {
    try {
      // 실제로는 할당 API에서 데이터를 가져와야 함
      // 임시로 하드코딩된 데이터 사용
      const mockAssignments: WorkAssignment[] = [
        {
          id: 'assign-001',
          instruction_id: '21af88be-6cdf-4518-b6a0-490d0f5fcb13',
          instruction_title: '사용자 인증 시스템 개발',
          pe_id: 'cb45aae6-4b47-4238-af31-5bbbeaa3d18c',
          pe_name: 'PE 사용자',
          work_percentage: 100,
          estimated_hours: 8,
          actual_hours: 6,
          priority: 'high',
          status: 'in_progress',
          assigned_at: '2025-09-12T03:09:01.952Z',
          deadline: '2025-09-15T18:00:00.000Z',
          progress: 75
        }
      ];
      setAssignments(mockAssignments);
    } catch (error) {
      console.error('할당 데이터 로드 중 오류:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadPes(),
        loadInstructions(),
        loadAssignments()
      ]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
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

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'success';
      case 'busy': return 'warning';
      case 'overloaded': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 할당 생성/수정 핸들러
  const handleSaveAssignment = async () => {
    try {
      // 실제로는 API 호출
      console.log('할당 저장:', formData);
      setAssignmentDialog(false);
      setEditingAssignment(null);
      setFormData({
        instruction_id: '',
        pe_id: '',
        work_percentage: 100,
        estimated_hours: 0,
        priority: 'medium',
        deadline: ''
      });
    } catch (error) {
      console.error('할당 저장 중 오류:', error);
    }
  };

  // [advice from AI] 재할당 핸들러
  const handleReassign = async (newPeId: string) => {
    try {
      // 실제로는 API 호출
      console.log('재할당:', selectedAssignment?.id, '->', newPeId);
      setReassignDialog(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('재할당 중 오류:', error);
    }
  };

  // [advice from AI] 할당 삭제 핸들러
  const handleDeleteAssignment = async (id: string) => {
    if (window.confirm('정말로 이 할당을 삭제하시겠습니까?')) {
      try {
        // 실제로는 API 호출
        console.log('할당 삭제:', id);
      } catch (error) {
        console.error('할당 삭제 중 오류:', error);
      }
    }
  };

  // [advice from AI] 새 할당 생성
  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    setFormData({
      instruction_id: '',
      pe_id: '',
      work_percentage: 100,
      estimated_hours: 0,
      priority: 'medium',
      deadline: ''
    });
    setAssignmentDialog(true);
  };

  // [advice from AI] 할당 수정
  const handleEditAssignment = (assignment: WorkAssignment) => {
    setEditingAssignment(assignment);
    setFormData({
      instruction_id: assignment.instruction_id,
      pe_id: assignment.pe_id,
      work_percentage: assignment.work_percentage,
      estimated_hours: assignment.estimated_hours,
      priority: assignment.priority,
      deadline: assignment.deadline
    });
    setAssignmentDialog(true);
  };

  // [advice from AI] 재할당 시작
  const handleStartReassign = (assignment: WorkAssignment) => {
    setSelectedAssignment(assignment);
    setReassignDialog(true);
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
          업무 분배 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateAssignment}
          sx={{ bgcolor: 'primary.main' }}
        >
          새 할당 생성
        </Button>
      </Box>

      {/* 탭 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="할당 현황" />
          <Tab label="PE 현황" />
          <Tab label="지시서 현황" />
        </Tabs>
      </Box>

      {/* 할당 현황 탭 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  현재 할당 현황
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>지시서</TableCell>
                        <TableCell>담당 PE</TableCell>
                        <TableCell>진행률</TableCell>
                        <TableCell>우선순위</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>마감일</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {assignment.instruction_title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                                {assignment.pe_name.charAt(0)}
                              </Avatar>
                              {assignment.pe_name}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LinearProgress
                                variant="determinate"
                                value={assignment.progress}
                                sx={{ width: '100px', mr: 1 }}
                              />
                              <Typography variant="body2">
                                {assignment.progress}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={assignment.priority}
                              color={getPriorityColor(assignment.priority)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={assignment.status}
                              color={getStatusColor(assignment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(assignment.deadline).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="수정">
                              <IconButton
                                size="small"
                                onClick={() => handleEditAssignment(assignment)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="재할당">
                              <IconButton
                                size="small"
                                onClick={() => handleStartReassign(assignment)}
                              >
                                <SwapIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="삭제">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
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

      {/* PE 현황 탭 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {pes.map((pe) => (
            <Grid item xs={12} md={6} lg={4} key={pe.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2 }}>
                      {pe.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{pe.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {pe.email}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      현재 작업량: {pe.currentWorkload}% / {pe.maxWorkload}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(pe.currentWorkload / pe.maxWorkload) * 100}
                      color={pe.availability === 'overloaded' ? 'error' : 
                             pe.availability === 'busy' ? 'warning' : 'success'}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={pe.availability}
                      color={getAvailabilityColor(pe.availability)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" gutterBottom>
                    보유 기술:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {pe.skills.map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 지시서 현황 탭 */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  할당 가능한 지시서
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>제목</TableCell>
                        <TableCell>프로젝트</TableCell>
                        <TableCell>예상 공수</TableCell>
                        <TableCell>우선순위</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {instructions.map((instruction) => (
                        <TableRow key={instruction.id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {instruction.title}
                            </Typography>
                          </TableCell>
                          <TableCell>{instruction.project_name}</TableCell>
                          <TableCell>{instruction.estimated_hours}시간</TableCell>
                          <TableCell>
                            <Chip
                              label={instruction.priority}
                              color={getPriorityColor(instruction.priority)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={instruction.status}
                              color={getStatusColor(instruction.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, instruction_id: instruction.id }));
                                setAssignmentDialog(true);
                              }}
                            >
                              할당
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

      {/* 할당 생성/수정 다이얼로그 */}
      <Dialog
        open={assignmentDialog}
        onClose={() => setAssignmentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAssignment ? '할당 수정' : '새 할당 생성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>지시서</InputLabel>
                <Select
                  value={formData.instruction_id}
                  onChange={(e) => setFormData({ ...formData, instruction_id: e.target.value })}
                  label="지시서"
                >
                  {instructions.map((instruction) => (
                    <MenuItem key={instruction.id} value={instruction.id}>
                      {instruction.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>담당 PE</InputLabel>
                <Select
                  value={formData.pe_id}
                  onChange={(e) => setFormData({ ...formData, pe_id: e.target.value })}
                  label="담당 PE"
                >
                  {pes.map((pe) => (
                    <MenuItem key={pe.id} value={pe.id}>
                      {pe.name} ({pe.availability})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="업무 비중 (%)"
                type="number"
                value={formData.work_percentage}
                onChange={(e) => setFormData({ ...formData, work_percentage: parseInt(e.target.value) || 100 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="예상 공수 (시간)"
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="우선순위"
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="마감일"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignmentDialog(false)}>
            취소
          </Button>
          <Button onClick={handleSaveAssignment} variant="contained">
            {editingAssignment ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 재할당 다이얼로그 */}
      <Dialog
        open={reassignDialog}
        onClose={() => setReassignDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          재할당
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            현재 할당: {selectedAssignment?.instruction_title}
          </Typography>
          <Typography variant="body2" gutterBottom>
            현재 담당자: {selectedAssignment?.pe_name}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <FormControl fullWidth>
            <InputLabel>새 담당 PE</InputLabel>
            <Select
              onChange={(e) => handleReassign(e.target.value as string)}
              label="새 담당 PE"
            >
              {pes.map((pe) => (
                <MenuItem key={pe.id} value={pe.id}>
                  {pe.name} ({pe.availability})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialog(false)}>
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkAssignment;
