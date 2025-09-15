import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Switch,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

// [advice from AI] 로그 관리를 위한 인터페이스 정의
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  source: string;
  message: string;
  details?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface LogFilter {
  level: string[];
  source: string[];
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
  userId: string;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  todayCount: number;
  errorCount: number;
}

const LogManagement: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 필터링 및 페이지네이션 상태
  const [filter, setFilter] = useState<LogFilter>({
    level: [],
    source: [],
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
    userId: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // 다이얼로그 상태
  const [logDetailDialogOpen, setLogDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // 자동 새로고침 상태
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  // [advice from AI] 컴포넌트 마운트 시 로그 데이터 로드
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [currentPage, pageSize, filter]);

  // [advice from AI] 자동 새로고침 설정
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadLogs();
        loadStats();
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('인증 토큰이 없습니다. 로그인해주세요.');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(filter).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value
          ])
        )
      });

      const response = await fetch(`/api/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('로그 데이터 로드 실패');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그 데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/logs/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('통계 로드 실패:', err);
    }
  };

  // [advice from AI] 로그 내보내기
  const exportLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filter).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value
          ])
        )
      );

      const response = await fetch(`/api/admin/logs/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('로그 내보내기 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('로그가 성공적으로 내보내졌습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그 내보내기 실패');
    }
  };

  // [advice from AI] 로그 삭제
  const deleteLogs = async (olderThanDays: number) => {
    if (!window.confirm(`${olderThanDays}일 이상 된 로그를 삭제하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ olderThanDays })
      });

      if (!response.ok) {
        throw new Error('로그 삭제 실패');
      }

      setSuccess('로그가 성공적으로 삭제되었습니다.');
      loadLogs();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그 삭제 실패');
    }
  };

  // [advice from AI] 로그 레벨별 아이콘
  const getLogLevelIcon = (level: string) => {
    return null; // 아이콘 사용 최소화
  };

  // [advice from AI] 로그 레벨별 색상
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'error';
      case 'WARN':
        return 'warning';
      case 'INFO':
        return 'info';
      case 'DEBUG':
        return 'default';
      default:
        return 'default';
    }
  };

  // [advice from AI] 필터 리셋
  const resetFilter = () => {
    setFilter({
      level: [],
      source: [],
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
      userId: ''
    });
    setCurrentPage(1);
  };

  // [advice from AI] 로그 상세 보기
  const viewLogDetail = (log: LogEntry) => {
    setSelectedLog(log);
    setLogDetailDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          로그 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="자동 새로고침"
          />
          <Button
            // [advice from AI] 아이콘 제거
            onClick={() => {
              loadLogs();
              loadStats();
            }}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            onClick={exportLogs}
            variant="contained"
          >
            내보내기
          </Button>
        </Box>
      </Box>

      {/* 통계 카드 */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">{stats.total}</Typography>
                <Typography variant="body2" color="text.secondary">
                  총 로그 수
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">{stats.errorCount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  오류 로그
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">{stats.todayCount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  오늘 로그
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  소스 수: {Object.keys(stats.bySource).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  활성 소스
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 필터 섹션 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="로그 필터"
          action={
            <Button onClick={resetFilter}>
              필터 리셋
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>로그 레벨</InputLabel>
                <Select
                  multiple
                  value={filter.level}
                  onChange={(e) => setFilter({ ...filter, level: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].map((level) => (
                    <MenuItem key={level} value={level}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getLogLevelIcon(level)}
                        <Typography sx={{ ml: 1 }}>{level}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>소스</InputLabel>
                <Select
                  multiple
                  value={filter.source}
                  onChange={(e) => setFilter({ ...filter, source: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {/* 실제 소스 목록은 API에서 가져와야 함 */}
                  <MenuItem value="auth">인증</MenuItem>
                  <MenuItem value="api">API</MenuItem>
                  <MenuItem value="database">데이터베이스</MenuItem>
                  <MenuItem value="frontend">프론트엔드</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="시작일"
                value={filter.dateFrom}
                onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="종료일"
                value={filter.dateTo}
                onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="검색어"
                value={filter.searchTerm}
                onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                placeholder="메시지 검색..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 로그 테이블 */}
      <Card>
        <CardHeader
          title="로그 목록"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                color="error"
                onClick={() => deleteLogs(30)}
              >
                30일 이상 삭제
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => deleteLogs(90)}
              >
                90일 이상 삭제
              </Button>
            </Box>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>시간</TableCell>
                  <TableCell>레벨</TableCell>
                  <TableCell>소스</TableCell>
                  <TableCell>메시지</TableCell>
                  <TableCell>사용자</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      로그를 로드하는 중...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getLogLevelIcon(log.level)}
                          <Chip
                            label={log.level}
                            size="small"
                            color={getLogLevelColor(log.level) as any}
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.source} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.userId ? (
                          <Chip label={log.userId} size="small" variant="outlined" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => viewLogDetail(log)}
                        >
                          상세 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* 로그 상세 다이얼로그 */}
      <Dialog
        open={logDetailDialogOpen}
        onClose={() => setLogDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          로그 상세 정보
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    시간
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    레벨
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    {getLogLevelIcon(selectedLog.level)}
                    <Chip
                      label={selectedLog.level}
                      size="small"
                      color={getLogLevelColor(selectedLog.level) as any}
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    소스
                  </Typography>
                  <Typography variant="body1">{selectedLog.source}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    사용자 ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.userId || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    메시지
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {selectedLog.message}
                  </Typography>
                </Grid>
                {selectedLog.details && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      상세 정보
                    </Typography>
                    <Paper sx={{ p: 2, mt: 0.5, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {selectedLog.details}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <Grid item xs={12}>
                    <Accordion>
                      <AccordionSummary>
                        <Typography variant="subtitle2">메타데이터</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 알림 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LogManagement;
