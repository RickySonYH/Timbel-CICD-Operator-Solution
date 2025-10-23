// [advice from AI] 완전한 이슈 관리 시스템 - 빌드/배포 실패 추적, 실시간 알림
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
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
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 이슈 데이터 타입
interface Issue {
  id: string;
  issue_type: 'build_failure' | 'deployment_failure' | 'monitoring_alert' | 'manual';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority_score: number;
  affected_service: string;
  error_details: any;
  auto_created: boolean;
  created_by_name?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
  history_count: number;
}

interface IssueHistory {
  id: string;
  action_type: string;
  action_description: string;
  performed_by_name: string;
  created_at: string;
}

interface IssueStatistics {
  total_issues: number;
  open_issues: number;
  in_progress_issues: number;
  resolved_issues: number;
  critical_issues: number;
  high_issues: number;
  auto_created_issues: number;
}

const ComprehensiveIssuesManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // 이슈 데이터
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statistics, setStatistics] = useState<IssueStatistics | null>(null);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    issue_type: 'all'
  });

  // 대화상자 상태
  const [detailDialog, setDetailDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueHistory, setIssueHistory] = useState<IssueHistory[]>([]);
  
  // 폼 상태
  const [statusForm, setStatusForm] = useState({
    status: 'open',
    resolution_notes: '',
    assigned_to: ''
  });

  const [createForm, setCreateForm] = useState({
    issue_type: 'manual',
    title: '',
    description: '',
    severity: 'medium',
    affected_service: ''
  });

  // [advice from AI] 이슈 목록 로드
  const loadIssues = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const queryParams = new URLSearchParams({
        ...filters,
        limit: '50',
        offset: '0'
      });

      const response = await fetch(`http://localhost:3001/api/issues/list?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('이슈 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 이슈 히스토리 로드
  const loadIssueHistory = async (issueId: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch(`http://localhost:3001/api/issues/${issueId}/history`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIssueHistory(data.history || []);
      }
    } catch (error) {
      console.error('이슈 히스토리 로드 실패:', error);
    }
  };

  // [advice from AI] 전체 데이터 로드
  const loadAllData = async () => {
    try {
      setLoading(true);
      await loadIssues();
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 데이터 새로고침
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // [advice from AI] 이슈 상세 보기
  const handleViewIssue = async (issue: Issue) => {
    setSelectedIssue(issue);
    await loadIssueHistory(issue.id);
    setDetailDialog(true);
  };

  // [advice from AI] 이슈 상태 변경
  const handleUpdateStatus = async () => {
    if (!selectedIssue) return;

    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch(`http://localhost:3001/api/issues/${selectedIssue.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusForm)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('이슈 상태가 성공적으로 업데이트되었습니다!');
          setStatusDialog(false);
          await loadAllData();
        }
      }
    } catch (error) {
      console.error('이슈 상태 업데이트 실패:', error);
      alert('이슈 상태 업데이트에 실패했습니다.');
    }
  };

  // [advice from AI] 수동 이슈 생성
  const handleCreateIssue = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/issues/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...createForm,
          auto_created: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('이슈가 성공적으로 생성되었습니다!');
          setCreateDialog(false);
          await loadAllData();
        }
      }
    } catch (error) {
      console.error('이슈 생성 실패:', error);
      alert('이슈 생성에 실패했습니다.');
    }
  };

  // [advice from AI] 상태별 색상
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getIssueTypeText = (type: string) => {
    switch (type) {
      case 'build_failure': return '빌드';
      case 'deployment_failure': return '배포';
      case 'monitoring_alert': return '모니터링';
      case 'manual': return '수동';
      default: return '기타';
    }
  };

  // 필터 변경 시 자동 새로고침
  useEffect(() => {
    loadAllData();
  }, [filters]);

  useEffect(() => {
    loadAllData();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(() => {
      loadAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          이슈 관리 시스템
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            이슈 관리 시스템
          </Typography>
          <Typography variant="body1" color="text.secondary">
            빌드/배포 실패 자동 추적, 실시간 알림 및 이슈 해결 관리
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined"
            onClick={handleRefresh} 
            disabled={refreshing}
            startIcon={refreshing ? <RefreshIcon /> : null}
          >
            {refreshing ? '새로고침 중...' : '새로고침'}
          </Button>
          {permissions.canManageDeployment && (
            <Button 
              variant="contained" 
              onClick={() => setCreateDialog(true)}
            >
              이슈 생성
            </Button>
          )}
        </Box>
      </Box>

      {/* [advice from AI] 이슈 통계 대시보드 */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 이슈
                </Typography>
                <Typography variant="h4" color="primary">
                  {statistics.total_issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  자동생성: {statistics.auto_created_issues}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  미해결 이슈
                </Typography>
                <Typography variant="h4" color="error.main">
                  {statistics.open_issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  진행중: {statistics.in_progress_issues}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  심각한 이슈
                </Typography>
                <Typography variant="h4" color="error.main">
                  {statistics.critical_issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  높음: {statistics.high_issues}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  해결 완료
                </Typography>
                <Typography variant="h4" color="success.main">
                  {statistics.resolved_issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  해결률: {((statistics.resolved_issues / statistics.total_issues) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 필터 컨트롤 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>필터</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>상태</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="open">미해결</MenuItem>
                  <MenuItem value="in_progress">진행중</MenuItem>
                  <MenuItem value="resolved">해결완료</MenuItem>
                  <MenuItem value="closed">종료</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>심각도</InputLabel>
                <Select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="critical">심각</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>이슈 타입</InputLabel>
                <Select
                  value={filters.issue_type}
                  onChange={(e) => setFilters({ ...filters, issue_type: e.target.value })}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="build_failure">빌드 실패</MenuItem>
                  <MenuItem value="deployment_failure">배포 실패</MenuItem>
                  <MenuItem value="monitoring_alert">모니터링 알림</MenuItem>
                  <MenuItem value="manual">수동 생성</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 이슈 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>우선순위</TableCell>
              <TableCell>이슈</TableCell>
              <TableCell>타입</TableCell>
              <TableCell>심각도</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>영향받는 서비스</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color="primary">
                      {issue.priority_score}
                    </Typography>
                    {issue.auto_created && (
                      <Chip 
                        label="자동" 
                        size="small" 
                        color="info"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ cursor: 'pointer' }} 
                      onClick={() => handleViewIssue(issue)}>
                      {issue.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" 
                      sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {issue.description}
                    </Typography>
                    {issue.history_count > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        히스토리: {issue.history_count}개
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getIssueTypeText(issue.issue_type)}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={issue.severity}
                    color={getSeverityColor(issue.severity) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={issue.status}
                    color={getStatusColor(issue.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{issue.affected_service}</TableCell>
                <TableCell>
                  {issue.assigned_to_name ? (
                    <Chip 
                      label={issue.assigned_to_name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      미할당
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(issue.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => handleViewIssue(issue)}
                    >
                      상세
                    </Button>
                    {permissions.canManageDeployment && (
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="warning"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setStatusForm({
                            status: issue.status,
                            resolution_notes: '',
                            assigned_to: issue.assigned_to_name || ''
                          });
                          setStatusDialog(true);
                        }}
                      >
                        처리
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* [advice from AI] 이슈 상세 대화상자 */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedIssue && (
            <Box>
              <Typography variant="h6">{selectedIssue.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip 
                  label={getIssueTypeText(selectedIssue.issue_type)}
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={selectedIssue.severity}
                  color={getSeverityColor(selectedIssue.severity) as any}
                  size="small"
                />
                <Chip 
                  label={selectedIssue.status}
                  color={getStatusColor(selectedIssue.status) as any}
                  size="small"
                />
              </Box>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedIssue.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">영향받는 서비스</Typography>
                  <Typography variant="body1">{selectedIssue.affected_service}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">우선순위 점수</Typography>
                  <Typography variant="body1">{selectedIssue.priority_score}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">생성일</Typography>
                  <Typography variant="body1">{new Date(selectedIssue.created_at).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">자동생성</Typography>
                  <Typography variant="body1">{selectedIssue.auto_created ? '예' : '아니오'}</Typography>
                </Grid>
              </Grid>

              {selectedIssue.error_details && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">오류 상세 정보</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                      {JSON.stringify(selectedIssue.error_details, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}

              {issueHistory.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>이슈 히스토리</Typography>
                  <Timeline>
                    {issueHistory.map((history) => (
                      <TimelineItem key={history.id}>
                        <TimelineSeparator>
                          <TimelineDot color="primary" />
                          <TimelineConnector />
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(history.created_at).toLocaleString()}
                          </Typography>
                          <Typography variant="body1">
                            {history.action_description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {history.performed_by_name || 'System'}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 상태 변경 대화상자 */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>이슈 상태 변경</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                >
                  <MenuItem value="open">미해결</MenuItem>
                  <MenuItem value="in_progress">진행중</MenuItem>
                  <MenuItem value="resolved">해결완료</MenuItem>
                  <MenuItem value="closed">종료</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="해결 노트"
                fullWidth
                multiline
                rows={3}
                value={statusForm.resolution_notes}
                onChange={(e) => setStatusForm({ ...statusForm, resolution_notes: e.target.value })}
                placeholder="이슈 해결 방법이나 추가 설명을 입력하세요"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>취소</Button>
          <Button onClick={handleUpdateStatus} variant="contained">업데이트</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 수동 이슈 생성 대화상자 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>수동 이슈 생성</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="이슈 제목"
                fullWidth
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="이슈 설명"
                fullWidth
                multiline
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>심각도</InputLabel>
                <Select
                  value={createForm.severity}
                  onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="critical">심각</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="영향받는 서비스"
                fullWidth
                value={createForm.affected_service}
                onChange={(e) => setCreateForm({ ...createForm, affected_service: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button onClick={handleCreateIssue} variant="contained">생성</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canManageDeployment && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          이슈 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default ComprehensiveIssuesManagement;
