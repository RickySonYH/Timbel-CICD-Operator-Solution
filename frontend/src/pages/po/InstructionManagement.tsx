// [advice from AI] PO 개발 지시서 관리 페이지
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
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

interface Instruction {
  id: string;
  project_id: string;
  title: string;
  content: string;
  template_type: string;
  status: string;
  priority: string;
  work_percentage: number;
  estimated_hours: number;
  actual_hours?: number;
  assigned_pe: string;
  project_name: string;
  created_by_name: string;
  assigned_pe_name: string;
  created_at: string;
  updated_at: string;
  dependencies: any;
  attachments: any[];
}

interface Project {
  id: string;
  name: string;
}

const InstructionManagement: React.FC = () => {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  
  // 다이얼로그 상태
  const [instructionDialog, setInstructionDialog] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [viewingInstruction, setViewingInstruction] = useState<Instruction | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    content: '',
    template_type: 'requirements',
    assigned_pe: '',
    work_percentage: 100,
    estimated_hours: 0,
    priority: 'medium',
    dependencies: {} as any,
    attachments: [] as any[]
  });

  // [advice from AI] 데이터 로드 함수들
  const loadInstructions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/operations/instructions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInstructions(data);
      } else {
        console.error('개발 지시서 데이터 로드 실패');
      }
    } catch (error) {
      console.error('개발 지시서 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/operations/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('프로젝트 데이터 로드 중 오류:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadInstructions();
    loadProjects();
  }, []);

  // [advice from AI] 필터링된 지시서 목록
  const filteredInstructions = instructions.filter(instruction => {
    const matchesSearch = instruction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         instruction.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || instruction.status === filterStatus;
    const matchesProject = filterProject === 'all' || instruction.project_id === filterProject;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'review': return 'warning';
      case 'approved': return 'success';
      case 'distributed': return 'info';
      default: return 'default';
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 지시서 생성/수정 핸들러
  const handleSaveInstruction = async () => {
    try {
      const url = editingInstruction 
        ? `/api/operations/instructions/${editingInstruction.id}`
        : '/api/operations/instructions';
      
      const method = editingInstruction ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await loadInstructions();
        setInstructionDialog(false);
        setEditingInstruction(null);
        setFormData({
          project_id: '',
          title: '',
          content: '',
          template_type: 'requirements',
          assigned_pe: '',
          work_percentage: 100,
          estimated_hours: 0,
          priority: 'medium',
          dependencies: {},
          attachments: []
        });
      } else {
        console.error('지시서 저장 실패');
      }
    } catch (error) {
      console.error('지시서 저장 중 오류:', error);
    }
  };

  // [advice from AI] 지시서 삭제 핸들러
  const handleDeleteInstruction = async (id: string) => {
    if (window.confirm('정말로 이 지시서를 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`/api/operations/instructions/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          await loadInstructions();
        } else {
          console.error('지시서 삭제 실패');
        }
      } catch (error) {
        console.error('지시서 삭제 중 오류:', error);
      }
    }
  };

  // [advice from AI] 새 지시서 작성
  const handleCreateInstruction = () => {
    setEditingInstruction(null);
    setFormData({
      project_id: '',
      title: '',
      content: '',
      template_type: 'requirements',
      assigned_pe: '',
      work_percentage: 100,
      estimated_hours: 0,
      priority: 'medium',
      dependencies: {},
      attachments: []
    });
    setInstructionDialog(true);
  };

  // [advice from AI] 지시서 수정
  const handleEditInstruction = (instruction: Instruction) => {
    setEditingInstruction(instruction);
    setFormData({
      project_id: instruction.project_id,
      title: instruction.title,
      content: instruction.content,
      template_type: instruction.template_type,
      assigned_pe: instruction.assigned_pe,
      work_percentage: instruction.work_percentage,
      estimated_hours: instruction.estimated_hours,
      priority: instruction.priority,
      dependencies: instruction.dependencies,
      attachments: instruction.attachments
    });
    setInstructionDialog(true);
  };

  // [advice from AI] 지시서 상세 보기
  const handleViewInstruction = (instruction: Instruction) => {
    setViewingInstruction(instruction);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          개발 지시서 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateInstruction}
          sx={{ bgcolor: 'primary.main' }}
        >
          새 지시서 작성
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
                    전체 지시서
                  </Typography>
                  <Typography variant="h5">
                    {instructions.length}
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
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    승인된 지시서
                  </Typography>
                  <Typography variant="h5">
                    {instructions.filter(i => i.status === 'approved').length}
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
                <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    검토 대기
                  </Typography>
                  <Typography variant="h5">
                    {instructions.filter(i => i.status === 'review').length}
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
                <PersonIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    배포된 지시서
                  </Typography>
                  <Typography variant="h5">
                    {instructions.filter(i => i.status === 'distributed').length}
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
              placeholder="제목 또는 내용으로 검색..."
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
                <MenuItem value="review">검토</MenuItem>
                <MenuItem value="approved">승인</MenuItem>
                <MenuItem value="distributed">배포</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>프로젝트</InputLabel>
              <Select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                label="프로젝트"
              >
                <MenuItem value="all">전체</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 지시서 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>제목</TableCell>
              <TableCell>프로젝트</TableCell>
              <TableCell>담당 PE</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>우선순위</TableCell>
              <TableCell>예상 공수</TableCell>
              <TableCell>작성일</TableCell>
              <TableCell>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInstructions.map((instruction) => (
              <TableRow key={instruction.id}>
                <TableCell>
                  <Typography variant="subtitle2" noWrap>
                    {instruction.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {instruction.template_type}
                  </Typography>
                </TableCell>
                <TableCell>{instruction.project_name}</TableCell>
                <TableCell>{instruction.assigned_pe_name}</TableCell>
                <TableCell>
                  <Chip
                    label={instruction.status}
                    color={getStatusColor(instruction.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={instruction.priority}
                    color={getPriorityColor(instruction.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{instruction.estimated_hours}시간</TableCell>
                <TableCell>
                  {new Date(instruction.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="상세 보기">
                    <IconButton
                      size="small"
                      onClick={() => handleViewInstruction(instruction)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="수정">
                    <IconButton
                      size="small"
                      onClick={() => handleEditInstruction(instruction)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="삭제">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteInstruction(instruction.id)}
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

      {/* 지시서 생성/수정 다이얼로그 */}
      <Dialog
        open={instructionDialog}
        onClose={() => setInstructionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingInstruction ? '지시서 수정' : '새 지시서 작성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>프로젝트</InputLabel>
                <Select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  label="프로젝트"
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>템플릿 유형</InputLabel>
                <Select
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                  label="템플릿 유형"
                >
                  <MenuItem value="requirements">요구사항</MenuItem>
                  <MenuItem value="specification">기능명세</MenuItem>
                  <MenuItem value="technical">기술명세</MenuItem>
                </Select>
              </FormControl>
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
                label="예상 공수 (시간)"
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 0 })}
              />
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="내용"
                multiline
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="마크다운 형식으로 작성하세요..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstructionDialog(false)}>
            취소
          </Button>
          <Button onClick={handleSaveInstruction} variant="contained">
            {editingInstruction ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 지시서 상세 보기 다이얼로그 */}
      <Dialog
        open={!!viewingInstruction}
        onClose={() => setViewingInstruction(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {viewingInstruction?.title}
        </DialogTitle>
        <DialogContent>
          {viewingInstruction && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">프로젝트</Typography>
                  <Typography>{viewingInstruction.project_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">담당 PE</Typography>
                  <Typography>{viewingInstruction.assigned_pe_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">상태</Typography>
                  <Chip
                    label={viewingInstruction.status}
                    color={getStatusColor(viewingInstruction.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">우선순위</Typography>
                  <Chip
                    label={viewingInstruction.priority}
                    color={getPriorityColor(viewingInstruction.priority)}
                    size="small"
                  />
                </Grid>
              </Grid>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>내용</Typography>
              <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {viewingInstruction.content}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingInstruction(null)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstructionManagement;
