import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, TextField, MenuItem, Select, FormControl, InputLabel,
  LinearProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  user?: string;
  ip?: string;
  endpoint?: string;
  responseTime?: number;
  statusCode?: number;
}

const LogManagement: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { token } = useJwtAuthStore();

  const logLevels = [
    { value: 'all', label: '전체' },
    { value: 'error', label: '오류' },
    { value: 'warn', label: '경고' },
    { value: 'info', label: '정보' },
    { value: 'debug', label: '디버그' }
  ];

  const services = [
    { value: 'all', label: '전체 서비스' },
    { value: 'backend', label: '백엔드' },
    { value: 'frontend', label: '프론트엔드' },
    { value: 'jenkins', label: 'Jenkins' },
    { value: 'nexus', label: 'Nexus' },
    { value: 'argocd', label: 'ArgoCD' },
    { value: 'postgres', label: 'PostgreSQL' }
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // 실제 백엔드 API 호출
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const params = new URLSearchParams({
        page: '1',
        limit: '100'
      });

      if (levelFilter !== 'all') params.append('level', levelFilter);
      if (serviceFilter !== 'all') params.append('service', serviceFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${apiUrl}/api/admin/logs?${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`로그 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // API 응답 데이터를 프론트엔드 인터페이스에 맞게 변환
        const transformedLogs: LogEntry[] = data.data.logs.map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level as 'info' | 'warn' | 'error' | 'debug',
          service: log.service,
          message: log.message,
          user: log.username,
          ip: log.ip_address,
          endpoint: log.endpoint,
          responseTime: log.response_time,
          statusCode: log.status_code
        }));
        
        setLogs(transformedLogs);
      } else {
        throw new Error(data.message || '로그 조회 실패');
      }
    } catch (error) {
      console.error('로그 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.user && log.user.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesService = serviceFilter === 'all' || log.service === serviceFilter;
    
    return matchesSearch && matchesLevel && matchesService;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  const handleViewLog = (log: LogEntry) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const handleExportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "시간,레벨,서비스,메시지,사용자,IP,엔드포인트,응답시간,상태코드\n" +
      filteredLogs.map(log => 
        `"${log.timestamp}","${log.level}","${log.service}","${log.message}","${log.user || ''}","${log.ip || ''}","${log.endpoint || ''}","${log.responseTime || ''}","${log.statusCode || ''}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>로그 관리</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        시스템 전반의 로그를 조회하고 분석합니다
      </Typography>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>전체 로그</Typography>
              <Typography variant="h4">{logs.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>오류</Typography>
              <Typography variant="h4" color="error">
                {logs.filter(log => log.level === 'error').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>경고</Typography>
              <Typography variant="h4" color="warning.main">
                {logs.filter(log => log.level === 'warn').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>활성 서비스</Typography>
              <Typography variant="h4">{new Set(logs.map(log => log.service)).size}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="메시지, 서비스, 사용자 검색..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>로그 레벨</InputLabel>
                <Select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  label="로그 레벨"
                >
                  {logLevels.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>서비스</InputLabel>
                <Select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  label="서비스"
                >
                  {services.map(service => (
                    <MenuItem key={service.value} value={service.value}>
                      {service.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={loadLogs}
                  disabled={loading}
                  startIcon={<RefreshIcon />}
                >
                  새로고침
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setLevelFilter('all');
                    setServiceFilter('all');
                  }}
                  startIcon={<ClearIcon />}
                >
                  초기화
                </Button>
                <Button
                  variant="contained"
                  onClick={handleExportLogs}
                  startIcon={<DownloadIcon />}
                >
                  내보내기
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* 로그 테이블 */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>시간</TableCell>
                <TableCell>레벨</TableCell>
                <TableCell>서비스</TableCell>
                <TableCell>메시지</TableCell>
                <TableCell>사용자</TableCell>
                <TableCell>응답시간</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.level.toUpperCase()} 
                      color={getLevelColor(log.level) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.service}</TableCell>
                  <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.message}
                  </TableCell>
                  <TableCell>{log.user || '-'}</TableCell>
                  <TableCell>
                    {log.responseTime ? `${log.responseTime}ms` : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="상세 보기">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewLog(log)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Alert severity="info">조건에 맞는 로그가 없습니다.</Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 로그 상세 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>로그 상세 정보</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">시간</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">레벨</Typography>
                  <Chip 
                    label={selectedLog.level.toUpperCase()} 
                    color={getLevelColor(selectedLog.level) as any}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">서비스</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>{selectedLog.service}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">사용자</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>{selectedLog.user || '-'}</Typography>
                </Grid>
                {selectedLog.ip && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">IP 주소</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{selectedLog.ip}</Typography>
                  </Grid>
                )}
                {selectedLog.endpoint && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">엔드포인트</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{selectedLog.endpoint}</Typography>
                  </Grid>
                )}
                {selectedLog.responseTime && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">응답 시간</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{selectedLog.responseTime}ms</Typography>
                  </Grid>
                )}
                {selectedLog.statusCode && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">상태 코드</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{selectedLog.statusCode}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">메시지</Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50', mt: 1 }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedLog.message}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LogManagement;
