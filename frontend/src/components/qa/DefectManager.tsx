import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Paper,
  Avatar,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  BugReport as BugReportIcon,
  Assignment as AssignmentIcon,
  Flag as PriorityIcon,
  Timeline as TimelineIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] 결함 관리 컴포넌트 - 백스테이지IO 스타일
interface Defect {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'new' | 'assigned' | 'in-progress' | 'resolved' | 'closed' | 'rejected';
  type: 'bug' | 'enhancement' | 'task' | 'story';
  reporter: string;
  assignee?: string;
  component: string;
  version: string;
  environment: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  attachments: string[];
  comments: Comment[];
  createdDate: string;
  lastModified: string;
  resolvedDate?: string;
  closedDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdDate: string;
  type: 'comment' | 'status-change' | 'assignment';
}

const DefectManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [defectDialog, setDefectDialog] = useState(false);
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // [advice from AI] 결함 데이터를 API에서 가져오도록 변경
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // [advice from AI] 결함 데이터 로드 함수
  const loadDefects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bug-reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDefects(data);
      } else {
        console.error('결함 데이터 로드 실패');
      }
    } catch (error) {
      console.error('결함 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDefects();
  }, []);

  // [advice from AI] 샘플 결함 데이터 (백업용)
  const [sampleDefects] = useState<Defect[]>([
    {
      id: 'BUG-001',
      title: '로그인 버튼 클릭 시 오류 발생',
      description: '사용자가 로그인 버튼을 클릭하면 JavaScript 오류가 발생하여 로그인이 되지 않습니다.',
      severity: 'critical',
      priority: 'urgent',
      status: 'in-progress',
      type: 'bug',
      reporter: '김테스터',
      assignee: '김개발',
      component: 'Authentication',
      version: '1.2.0',
      environment: 'Production',
      stepsToReproduce: [
        '로그인 페이지에 접속',
        '사용자명과 비밀번호 입력',
        '로그인 버튼 클릭'
      ],
      expectedResult: '사용자가 성공적으로 로그인되어 대시보드로 이동',
      actualResult: 'JavaScript 오류 발생: "Cannot read property of undefined"',
      attachments: ['screenshot-001.png', 'console-log.txt'],
      comments: [
        {
          id: '1',
          author: '김개발',
          content: '오류를 확인했습니다. 코드를 수정 중입니다.',
          createdDate: '2024-01-20 10:30',
          type: 'comment'
        },
        {
          id: '2',
          author: '김개발',
          content: '상태를 in-progress로 변경했습니다.',
          createdDate: '2024-01-20 10:31',
          type: 'status-change'
        }
      ],
      createdDate: '2024-01-20 09:15',
      lastModified: '2024-01-20 10:31',
      estimatedHours: 4,
      actualHours: 2,
      tags: ['login', 'javascript', 'critical']
    },
    {
      id: 'BUG-002',
      title: '모바일 화면에서 레이아웃 깨짐',
      description: 'iPhone에서 웹사이트를 볼 때 사이드바가 화면을 벗어나서 표시됩니다.',
      severity: 'high',
      priority: 'high',
      status: 'assigned',
      type: 'bug',
      reporter: '이사용자',
      assignee: '이프론트',
      component: 'UI/UX',
      version: '1.2.0',
      environment: 'Staging',
      stepsToReproduce: [
        'iPhone에서 웹사이트 접속',
        '사이드바 메뉴 클릭',
        '화면을 가로로 회전'
      ],
      expectedResult: '사이드바가 화면에 맞게 표시됨',
      actualResult: '사이드바가 화면을 벗어나서 표시됨',
      attachments: ['mobile-screenshot.png'],
      comments: [
        {
          id: '1',
          author: '이프론트',
          content: '모바일 반응형 CSS를 확인해보겠습니다.',
          createdDate: '2024-01-19 14:20',
          type: 'comment'
        }
      ],
      createdDate: '2024-01-19 13:45',
      lastModified: '2024-01-19 14:20',
      estimatedHours: 6,
      tags: ['mobile', 'responsive', 'ui']
    },
    {
      id: 'BUG-003',
      title: 'API 응답 속도 지연',
      description: '사용자 목록 API의 응답 시간이 5초 이상 소요됩니다.',
      severity: 'medium',
      priority: 'medium',
      status: 'resolved',
      type: 'bug',
      reporter: '박성능',
      assignee: '박백엔드',
      component: 'API',
      version: '1.1.0',
      environment: 'Production',
      stepsToReproduce: [
        '사용자 관리 페이지 접속',
        '사용자 목록 조회 버튼 클릭'
      ],
      expectedResult: '2초 이내에 사용자 목록이 표시됨',
      actualResult: '5초 이상 소요되어 사용자 목록이 표시됨',
      attachments: ['performance-log.txt'],
      comments: [
        {
          id: '1',
          author: '박백엔드',
          content: '데이터베이스 쿼리를 최적화했습니다.',
          createdDate: '2024-01-18 16:30',
          type: 'comment'
        },
        {
          id: '2',
          author: '박백엔드',
          content: '상태를 resolved로 변경했습니다.',
          createdDate: '2024-01-18 16:31',
          type: 'status-change'
        }
      ],
      createdDate: '2024-01-18 15:00',
      lastModified: '2024-01-18 16:31',
      resolvedDate: '2024-01-18 16:31',
      estimatedHours: 8,
      actualHours: 6,
      tags: ['performance', 'api', 'database']
    }
  ]);

  // [advice from AI] 필터링된 결함 목록
  const filteredDefects = defects.filter(defect => {
    const matchesStatus = filterStatus === 'all' || defect.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || defect.severity === filterSeverity;
    const matchesSearch = searchTerm === '' || 
      defect.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defect.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defect.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  // [advice from AI] 심각도별 색상
  const getSeverityColor = (severity: Defect['severity']) => {
    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'default'
    } as const;
    return colors[severity];
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: Defect['priority']) => {
    const colors = {
      urgent: 'error',
      high: 'warning',
      medium: 'info',
      low: 'default'
    } as const;
    return colors[priority];
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: Defect['status']) => {
    const colors = {
      new: 'info',
      assigned: 'warning',
      'in-progress': 'primary',
      resolved: 'success',
      closed: 'default',
      rejected: 'error'
    } as const;
    return colors[status];
  };

  // [advice from AI] 통계 데이터
  const getStatistics = () => {
    const total = defects.length;
    const byStatus = defects.reduce((acc, defect) => {
      acc[defect.status] = (acc[defect.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = defects.reduce((acc, defect) => {
      acc[defect.severity] = (acc[defect.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus, bySeverity };
  };

  const stats = getStatistics();

  return (
    <Box>
      {/* [advice from AI] 결함 관리 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          결함 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          버그, 이슈, 개선사항을 추적하고 관리합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard title="전체 결함" variant="default">
            <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {stats.total}
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard title="해결됨" variant="default">
            <Typography variant="h3" sx={{ fontWeight: 600, color: 'success.main' }}>
              {stats.byStatus.resolved || 0}
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard title="진행 중" variant="default">
            <Typography variant="h3" sx={{ fontWeight: 600, color: 'warning.main' }}>
              {stats.byStatus['in-progress'] || 0}
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard title="심각한 결함" variant="default">
            <Typography variant="h3" sx={{ fontWeight: 600, color: 'error.main' }}>
              {stats.bySeverity.critical || 0}
            </Typography>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* [advice from AI] 필터 및 검색 */}
      <BackstageCard title="필터 및 검색" variant="default">
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="new">새로 생성</MenuItem>
                <MenuItem value="assigned">할당됨</MenuItem>
                <MenuItem value="in-progress">진행 중</MenuItem>
                <MenuItem value="resolved">해결됨</MenuItem>
                <MenuItem value="closed">닫힘</MenuItem>
                <MenuItem value="rejected">거부됨</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>심각도</InputLabel>
              <Select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="critical">심각</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">중간</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDefectDialog(true)}
              fullWidth
            >
              새 결함 등록
            </Button>
          </Grid>
        </Grid>
      </BackstageCard>

      {/* [advice from AI] 결함 목록 */}
      <BackstageCard title="결함 목록" variant="default">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>제목</TableCell>
                <TableCell>심각도</TableCell>
                <TableCell>우선순위</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>담당자</TableCell>
                <TableCell>컴포넌트</TableCell>
                <TableCell>생성일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDefects.map((defect) => (
                <TableRow key={defect.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {defect.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {defect.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {defect.description.substring(0, 100)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={defect.severity.toUpperCase()} 
                      color={getSeverityColor(defect.severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={defect.priority.toUpperCase()} 
                      color={getPriorityColor(defect.priority)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={defect.status.toUpperCase()} 
                      color={getStatusColor(defect.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {defect.assignee?.charAt(0) || '?'}
                      </Avatar>
                      <Typography variant="body2">
                        {defect.assignee || '미할당'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {defect.component}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {defect.createdDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setSelectedDefect(defect)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => setEditingDefect(defect)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </BackstageCard>

      {/* [advice from AI] 결함 상세 다이얼로그 */}
      <Dialog 
        open={selectedDefect !== null} 
        onClose={() => setSelectedDefect(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDefect?.id} - {selectedDefect?.title}
        </DialogTitle>
        <DialogContent>
          {selectedDefect && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    심각도
                  </Typography>
                  <Chip 
                    label={selectedDefect.severity.toUpperCase()} 
                    color={getSeverityColor(selectedDefect.severity)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    우선순위
                  </Typography>
                  <Chip 
                    label={selectedDefect.priority.toUpperCase()} 
                    color={getPriorityColor(selectedDefect.priority)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    상태
                  </Typography>
                  <Chip 
                    label={selectedDefect.status.toUpperCase()} 
                    color={getStatusColor(selectedDefect.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    담당자
                  </Typography>
                  <Typography variant="body2">
                    {selectedDefect.assignee || '미할당'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                설명
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                {selectedDefect.description}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                재현 단계
              </Typography>
              <List dense>
                {selectedDefect.stepsToReproduce.map((step, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={`${index + 1}. ${step}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>

              <Typography variant="h6" sx={{ mb: 2, mt: 3, fontWeight: 600 }}>
                예상 결과
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedDefect.expectedResult}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                실제 결과
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                {selectedDefect.actualResult}
              </Typography>

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                댓글
              </Typography>
              {selectedDefect.comments.map((comment) => (
                <Paper key={comment.id} sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {comment.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {comment.createdDate}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {comment.content}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDefect(null)}>
            닫기
          </Button>
          <Button 
            onClick={() => {
              setEditingDefect(selectedDefect);
              setSelectedDefect(null);
            }}
            variant="contained"
          >
            편집
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DefectManager;
