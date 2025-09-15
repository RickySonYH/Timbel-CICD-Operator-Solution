import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

// [advice from AI] 백업 관리를 위한 인터페이스 정의
interface BackupFile {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'completed' | 'in_progress' | 'failed' | 'scheduled';
  description?: string;
  checksum: string;
  location: string;
  retentionDate?: string;
}

interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  type: 'full' | 'incremental' | 'differential';
  enabled: boolean;
  retentionDays: number;
  lastRun?: string;
  nextRun?: string;
  components: string[];
}

interface BackupComponent {
  id: string;
  name: string;
  type: 'database' | 'files' | 'config' | 'logs';
  size: number;
  description: string;
  included: boolean;
}

interface RestoreJob {
  id: string;
  backupId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  progress: number;
  components: string[];
  logs: string[];
}

const BackupRestore: React.FC = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [components, setComponents] = useState<BackupComponent[]>([]);
  const [restoreJobs, setRestoreJobs] = useState<RestoreJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 다이얼로그 상태
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  // 폼 상태
  const [backupForm, setBackupForm] = useState({
    name: '',
    type: 'full' as const,
    description: '',
    components: [] as string[]
  });

  const [restoreForm, setRestoreForm] = useState({
    backupId: '',
    components: [] as string[],
    confirmRestore: false
  });

  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    frequency: 'daily' as const,
    time: '02:00',
    type: 'incremental' as const,
    retentionDays: 30,
    components: [] as string[]
  });

  // 현재 진행 중인 작업
  const [currentJob, setCurrentJob] = useState<RestoreJob | null>(null);

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // [advice from AI] 진행 중인 작업 모니터링
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentJob && currentJob.status === 'in_progress') {
        checkJobProgress(currentJob.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJob]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('인증 토큰이 없습니다. 로그인해주세요.');
        return;
      }

      // 모든 백업 관련 데이터를 병렬로 로드
      const [backupsRes, schedulesRes, componentsRes, jobsRes] = await Promise.all([
        fetch('/api/admin/backups', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/backups/schedules', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/backups/components', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/restore/jobs', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!backupsRes.ok || !schedulesRes.ok || !componentsRes.ok || !jobsRes.ok) {
        throw new Error('데이터 로드 실패');
      }

      const [backupsData, schedulesData, componentsData, jobsData] = await Promise.all([
        backupsRes.json(),
        schedulesRes.json(),
        componentsRes.json(),
        jobsRes.json()
      ]);

      setBackups(backupsData.backups || []);
      setSchedules(schedulesData.schedules || []);
      setComponents(componentsData.components || []);
      setRestoreJobs(jobsData.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 백업 생성
  const createBackup = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(backupForm)
      });

      if (!response.ok) {
        throw new Error('백업 생성 실패');
      }

      setSuccess('백업이 성공적으로 시작되었습니다.');
      setBackupDialogOpen(false);
      resetBackupForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 복원 시작
  const startRestore = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(restoreForm)
      });

      if (!response.ok) {
        throw new Error('복원 시작 실패');
      }

      const data = await response.json();
      setCurrentJob(data.job);
      setProgressDialogOpen(true);
      setRestoreDialogOpen(false);
      resetRestoreForm();
      setSuccess('복원이 성공적으로 시작되었습니다.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '복원 시작 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 스케줄 생성
  const createSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/backups/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(scheduleForm)
      });

      if (!response.ok) {
        throw new Error('스케줄 생성 실패');
      }

      setSuccess('백업 스케줄이 성공적으로 생성되었습니다.');
      setScheduleDialogOpen(false);
      resetScheduleForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '스케줄 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 백업 삭제
  const deleteBackup = async (id: string) => {
    if (!window.confirm('이 백업을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/backups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('백업 삭제 실패');
      }

      setSuccess('백업이 성공적으로 삭제되었습니다.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 삭제 실패');
    }
  };

  // [advice from AI] 백업 다운로드
  const downloadBackup = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/backups/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('백업 다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('백업이 성공적으로 다운로드되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '백업 다운로드 실패');
    }
  };

  // [advice from AI] 작업 진행률 확인
  const checkJobProgress = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/restore/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJob(data.job);
        
        if (data.job.status === 'completed' || data.job.status === 'failed') {
          setProgressDialogOpen(false);
          setCurrentJob(null);
          loadData();
        }
      }
    } catch (err) {
      console.error('작업 진행률 확인 실패:', err);
    }
  };

  // [advice from AI] 폼 리셋 함수들
  const resetBackupForm = () => {
    setBackupForm({ name: '', type: 'full', description: '', components: [] });
  };

  const resetRestoreForm = () => {
    setRestoreForm({ backupId: '', components: [], confirmRestore: false });
  };

  const resetScheduleForm = () => {
    setScheduleForm({ name: '', frequency: 'daily', time: '02:00', type: 'incremental', retentionDays: 30, components: [] });
  };

  // [advice from AI] 백업 타입별 색상
  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'primary';
      case 'incremental': return 'secondary';
      case 'differential': return 'success';
      default: return 'default';
    }
  };


  // [advice from AI] 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && backups.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>데이터를 로드하는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          백업 및 복원 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            // [advice from AI] 아이콘 제거
            onClick={loadData}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            onClick={() => setBackupDialogOpen(true)}
          >
            새 백업
          </Button>
        </Box>
      </Box>

      {/* 백업 목록 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="백업 파일 목록"
          subheader={`총 ${backups.length}개의 백업 파일`}
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>타입</TableCell>
                  <TableCell>크기</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{backup.name}</Typography>
                        {backup.description && (
                          <Typography variant="caption" color="text.secondary">
                            {backup.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={backup.type}
                        color={getBackupTypeColor(backup.type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatFileSize(backup.size)}</TableCell>
                    <TableCell>
                      <Chip
                        label={backup.status}
                        size="small"
                        color={backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'error' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(backup.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => downloadBackup(backup.id)}
                        disabled={backup.status !== 'completed'}
                      >
                        다운로드
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setRestoreForm({ ...restoreForm, backupId: backup.id });
                          setRestoreDialogOpen(true);
                        }}
                        disabled={backup.status !== 'completed'}
                      >
                        복원
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => deleteBackup(backup.id)}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 백업 스케줄 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="백업 스케줄"
          action={
            <Button
              variant="contained"
              onClick={() => setScheduleDialogOpen(true)}
            >
              새 스케줄
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            {schedules.map((schedule) => (
              <Grid item xs={12} md={6} key={schedule.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">{schedule.name}</Typography>
                      <Chip
                        label={schedule.enabled ? '활성' : '비활성'}
                        color={schedule.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {schedule.frequency} - {schedule.time}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={schedule.type} size="small" color="primary" />
                      <Chip label={`보관 ${schedule.retentionDays}일`} size="small" />
                    </Box>
                    {schedule.lastRun && (
                      <Typography variant="caption" color="text.secondary">
                        마지막 실행: {new Date(schedule.lastRun).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* 백업 생성 다이얼로그 */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 백업 생성</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="백업 이름"
                value={backupForm.name}
                onChange={(e) => setBackupForm({ ...backupForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>백업 타입</InputLabel>
                <Select
                  value={backupForm.type}
                  onChange={(e) => setBackupForm({ ...backupForm, type: e.target.value as any })}
                >
                  <MenuItem value="full">전체 백업</MenuItem>
                  <MenuItem value="incremental">증분 백업</MenuItem>
                  <MenuItem value="differential">차등 백업</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                multiline
                rows={3}
                value={backupForm.description}
                onChange={(e) => setBackupForm({ ...backupForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                포함할 컴포넌트
              </Typography>
              <List>
                {components.map((component) => (
                  <ListItem key={component.id}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={backupForm.components.includes(component.id)}
                          onChange={(e) => {
                            const newComponents = e.target.checked
                              ? [...backupForm.components, component.id]
                              : backupForm.components.filter(id => id !== component.id);
                            setBackupForm({ ...backupForm, components: newComponents });
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{component.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {component.description}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>취소</Button>
          <Button onClick={createBackup} variant="contained" disabled={loading}>
            백업 시작
          </Button>
        </DialogActions>
      </Dialog>

      {/* 복원 다이얼로그 */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>시스템 복원</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            복원 작업은 기존 데이터를 덮어씁니다. 신중하게 진행해주세요.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                복원할 컴포넌트
              </Typography>
              <List>
                {components.map((component) => (
                  <ListItem key={component.id}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={restoreForm.components.includes(component.id)}
                          onChange={(e) => {
                            const newComponents = e.target.checked
                              ? [...restoreForm.components, component.id]
                              : restoreForm.components.filter(id => id !== component.id);
                            setRestoreForm({ ...restoreForm, components: newComponents });
                          }}
                        />
                      }
                      label={component.name}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={restoreForm.confirmRestore}
                    onChange={(e) => setRestoreForm({ ...restoreForm, confirmRestore: e.target.checked })}
                  />
                }
                label="복원 작업을 진행하는 것에 동의합니다"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>취소</Button>
          <Button
            onClick={startRestore}
            variant="contained"
            disabled={loading || !restoreForm.confirmRestore}
          >
            복원 시작
          </Button>
        </DialogActions>
      </Dialog>

      {/* 진행률 다이얼로그 */}
      <Dialog open={progressDialogOpen} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>복원 진행 중</DialogTitle>
        <DialogContent>
          {currentJob && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  진행률: {currentJob.progress}%
                </Typography>
                <Chip
                  label={currentJob.status}
                  color={currentJob.status === 'completed' ? 'success' : 'primary'}
                  size="small"
                />
              </Box>
              <LinearProgress variant="determinate" value={currentJob.progress} sx={{ mb: 2 }} />
              {currentJob.logs.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>로그</Typography>
                  <Paper sx={{ p: 1, maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50' }}>
                    {currentJob.logs.map((log, index) => (
                      <Typography key={index} variant="caption" display="block">
                        {log}
                      </Typography>
                    ))}
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* 스케줄 생성 다이얼로그 */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>백업 스케줄 생성</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="스케줄 이름"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>주기</InputLabel>
                <Select
                  value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value as any })}
                >
                  <MenuItem value="daily">매일</MenuItem>
                  <MenuItem value="weekly">매주</MenuItem>
                  <MenuItem value="monthly">매월</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="시간"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>백업 타입</InputLabel>
                <Select
                  value={scheduleForm.type}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as any })}
                >
                  <MenuItem value="full">전체 백업</MenuItem>
                  <MenuItem value="incremental">증분 백업</MenuItem>
                  <MenuItem value="differential">차등 백업</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="보관 기간 (일)"
                value={scheduleForm.retentionDays}
                onChange={(e) => setScheduleForm({ ...scheduleForm, retentionDays: parseInt(e.target.value) })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>취소</Button>
          <Button onClick={createSchedule} variant="contained" disabled={loading}>
            스케줄 생성
          </Button>
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

export default BackupRestore;
