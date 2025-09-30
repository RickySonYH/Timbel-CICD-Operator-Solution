// [advice from AI] 빌드 파이프라인 센터 - Jenkins 빌드 실행 및 관리 전용 페이지
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, CircularProgress, LinearProgress, IconButton, Tooltip,
  List, ListItem, ListItemText, ListItemIcon, Collapse, Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface BuildJob {
  id: string;
  job_name: string;
  project_name: string;
  repository_url: string;
  branch: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'aborted';
  build_number: number;
  started_at: string;
  duration: number;
  progress: number;
  console_url: string;
  commit_sha: string;
  commit_message: string;
  triggered_by: string;
}

interface BuildStats {
  total_jobs: number;
  running_jobs: number;
  success_rate: number;
  avg_build_time: number;
  failed_today: number;
}

const BuildPipelineCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [jobs, setJobs] = useState<BuildJob[]>([]);
  const [stats, setStats] = useState<BuildStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [buildDialog, setBuildDialog] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [buildBranch, setBuildBranch] = useState('main');
  const [buildNotes, setBuildNotes] = useState('');
  const [triggering, setTriggering] = useState(false);

  // [advice from AI] 빌드 작업 목록 로드
  const loadBuildJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/jenkins/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobs(data.data.jobs);
          setStats(data.data.stats);
          console.log('✅ 빌드 작업 목록 로딩 완료:', data.data.jobs.length);
        }
      } else {
        // [advice from AI] Mock 데이터로 대체
        const mockJobs: BuildJob[] = [
          {
            id: 'job-1',
            job_name: 'ecp-ai-k8s-orchestrator-build',
            project_name: 'ECP-AI K8s Orchestrator',
            repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
            branch: 'main',
            status: 'running',
            build_number: 15,
            started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            duration: 0,
            progress: 65,
            console_url: 'http://jenkins.langsa.ai:8080/job/ecp-ai-k8s-orchestrator-build/15/console',
            commit_sha: 'a1b2c3d4',
            commit_message: 'feat: Add new deployment configuration',
            triggered_by: 'GitHub Webhook'
          },
          {
            id: 'job-2',
            job_name: 'aicc-chatbot-build',
            project_name: 'AICC 챗봇 시스템',
            repository_url: 'https://github.com/company/aicc-chatbot',
            branch: 'develop',
            status: 'success',
            build_number: 23,
            started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            duration: 420,
            progress: 100,
            console_url: 'http://jenkins.langsa.ai:8080/job/aicc-chatbot-build/23/console',
            commit_sha: 'e5f6g7h8',
            commit_message: 'fix: Resolve memory leak in chat handler',
            triggered_by: '김PE'
          },
          {
            id: 'job-3',
            job_name: 'legacy-system-migration',
            project_name: '레거시 시스템 마이그레이션',
            repository_url: 'https://github.com/company/legacy-migration',
            branch: 'main',
            status: 'failed',
            build_number: 8,
            started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            duration: 180,
            progress: 100,
            console_url: 'http://jenkins.langsa.ai:8080/job/legacy-system-migration/8/console',
            commit_sha: 'i9j0k1l2',
            commit_message: 'refactor: Update database schema',
            triggered_by: '이PE'
          }
        ];

        const mockStats: BuildStats = {
          total_jobs: 3,
          running_jobs: 1,
          success_rate: 78.5,
          avg_build_time: 340,
          failed_today: 2
        };

        setJobs(mockJobs);
        setStats(mockStats);
      }
    } catch (error) {
      console.error('❌ 빌드 작업 목록 로딩 오류:', error);
      setError(error instanceof Error ? error.message : '데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // [advice from AI] 빌드 트리거
  const triggerBuild = async () => {
    if (!selectedRepo) return;

    try {
      setTriggering(true);

      const response = await fetch('/api/jenkins/trigger-build', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_url: selectedRepo,
          branch: buildBranch,
          notes: buildNotes
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ 빌드 트리거 완료:', result.data);
          setBuildDialog(false);
          setSelectedRepo('');
          setBuildBranch('main');
          setBuildNotes('');
          
          // 목록 새로고침
          setTimeout(() => {
            loadBuildJobs();
          }, 2000);
        }
      } else {
        throw new Error('빌드 트리거 실패');
      }
    } catch (error) {
      console.error('❌ 빌드 트리거 오류:', error);
      setError(error instanceof Error ? error.message : '빌드 트리거 실패');
    } finally {
      setTriggering(false);
    }
  };

  // [advice from AI] 빌드 중단
  const stopBuild = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jenkins/jobs/${jobId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ 빌드 중단 완료');
        loadBuildJobs();
      }
    } catch (error) {
      console.error('❌ 빌드 중단 오류:', error);
    }
  };

  // [advice from AI] 상태별 아이콘 및 색상
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <BuildIcon color="primary" />;
      case 'success': return <SuccessIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'pending': return <PendingIcon color="warning" />;
      default: return <BuildIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'primary';
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // [advice from AI] 빌드 시간 포맷
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '진행 중';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  useEffect(() => {
    loadBuildJobs();
    
    // [advice from AI] 실행 중인 빌드가 있으면 주기적으로 업데이트
    const interval = setInterval(() => {
      if (jobs.some(job => job.status === 'running')) {
        loadBuildJobs();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [loadBuildJobs, jobs]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            빌드 파이프라인
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Jenkins 빌드 작업을 실행하고 모니터링합니다.
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadBuildJobs}
            sx={{ mr: 2 }}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={() => setBuildDialog(true)}
          >
            빌드 실행
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 통계 카드 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  전체 작업
                </Typography>
                <Typography variant="h4">
                  {stats.total_jobs}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  실행 중
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {stats.running_jobs}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  성공률
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.success_rate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  평균 빌드 시간
                </Typography>
                <Typography variant="h4">
                  {Math.round(stats.avg_build_time / 60)}분
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 빌드 작업 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            빌드 작업 목록
          </Typography>
          
          {jobs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                실행 중인 빌드 작업이 없습니다.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>상태</TableCell>
                    <TableCell>프로젝트</TableCell>
                    <TableCell>브랜치</TableCell>
                    <TableCell>빌드 번호</TableCell>
                    <TableCell>진행률</TableCell>
                    <TableCell>소요시간</TableCell>
                    <TableCell>트리거</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <React.Fragment key={job.id}>
                      <TableRow hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(job.status)}
                            <Chip 
                              label={job.status.toUpperCase()} 
                              color={getStatusColor(job.status) as any}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {job.project_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {job.job_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={job.branch} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>#{job.build_number}</TableCell>
                        <TableCell>
                          {job.status === 'running' ? (
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={job.progress} 
                                sx={{ mb: 1 }}
                              />
                              <Typography variant="caption">
                                {job.progress}%
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2">
                              {job.status === 'success' ? '완료' : 
                               job.status === 'failed' ? '실패' : '대기'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDuration(job.duration)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {job.triggered_by}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="상세 정보">
                              <IconButton
                                size="small"
                                onClick={() => setExpandedJob(
                                  expandedJob === job.id ? null : job.id
                                )}
                              >
                                {expandedJob === job.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="콘솔 로그">
                              <IconButton
                                size="small"
                                onClick={() => window.open(job.console_url, '_blank')}
                              >
                                <OpenInNewIcon />
                              </IconButton>
                            </Tooltip>
                            {job.status === 'running' && (
                              <Tooltip title="빌드 중단">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => stopBuild(job.id)}
                                >
                                  <StopIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                      
                      {/* [advice from AI] 확장된 상세 정보 */}
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 0 }}>
                          <Collapse in={expandedJob === job.id}>
                            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    레포지토리 정보
                                  </Typography>
                                  <List dense>
                                    <ListItem>
                                      <ListItemText 
                                        primary="Repository URL" 
                                        secondary={job.repository_url} 
                                      />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemText 
                                        primary="Commit SHA" 
                                        secondary={job.commit_sha} 
                                      />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemText 
                                        primary="Commit Message" 
                                        secondary={job.commit_message} 
                                      />
                                    </ListItem>
                                  </List>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    빌드 정보
                                  </Typography>
                                  <List dense>
                                    <ListItem>
                                      <ListItemText 
                                        primary="시작 시간" 
                                        secondary={new Date(job.started_at).toLocaleString('ko-KR')} 
                                      />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemText 
                                        primary="콘솔 URL" 
                                        secondary={
                                          <Button
                                            size="small"
                                            onClick={() => window.open(job.console_url, '_blank')}
                                          >
                                            콘솔 열기
                                          </Button>
                                        } 
                                      />
                                    </ListItem>
                                  </List>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 빌드 실행 다이얼로그 */}
      <Dialog 
        open={buildDialog} 
        onClose={() => setBuildDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          새 빌드 실행
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Repository URL"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              placeholder="https://github.com/user/repository"
              sx={{ mb: 3 }}
            />
            
            <TextField
              fullWidth
              label="브랜치"
              value={buildBranch}
              onChange={(e) => setBuildBranch(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="빌드 노트"
              value={buildNotes}
              onChange={(e) => setBuildNotes(e.target.value)}
              placeholder="빌드 실행 사유나 특이사항을 입력하세요..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuildDialog(false)}>
            취소
          </Button>
          <Button 
            onClick={triggerBuild}
            variant="contained"
            disabled={!selectedRepo || triggering}
          >
            {triggering ? <CircularProgress size={20} /> : '빌드 실행'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BuildPipelineCenter;
