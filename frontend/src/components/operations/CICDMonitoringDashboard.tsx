// [advice from AI] CI/CD 빌드 과정 실시간 모니터링 대시보드
import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Chip, Alert, CircularProgress, LinearProgress, Table, TableBody,
  TableCell, TableContainer, TableRow, TableHead, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Accordion, AccordionSummary, AccordionDetails, Divider,
  List, ListItem, ListItemText, ListItemIcon, Tabs, Tab
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 인터페이스 정의
interface JenkinsJob {
  name: string;
  url: string;
  color: string;
  buildable: boolean;
  inQueue: boolean;
  nextBuildNumber: number;
  lastBuild?: {
    number: number;
    url: string;
  };
  lastCompletedBuild?: {
    number: number;
    url: string;
  };
}

interface BuildDetails {
  number: number;
  result: string;
  building: boolean;
  duration: number;
  estimatedDuration: number;
  timestamp: number;
  url: string;
  displayName: string;
  fullDisplayName: string;
  description?: string;
}

interface PipelineStatus {
  jenkins: {
    online: boolean;
    mode?: string;
    jobs?: number;
    version?: string;
    error?: string;
  };
  nexus: {
    online: boolean;
    available?: boolean;
    error?: string;
  };
  timestamp: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cicd-tabpanel-${index}`}
      aria-labelledby={`cicd-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CICDMonitoringDashboard: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // 상태 관리
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [jenkinsJobs, setJenkinsJobs] = useState<JenkinsJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [buildHistory, setBuildHistory] = useState<BuildDetails[]>([]);
  const [buildLogs, setBuildLogs] = useState<string>('');
  const [selectedBuild, setSelectedBuild] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logDialog, setLogDialog] = useState(false);
  
  // 자동 새로고침을 위한 ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // API 호출 함수들
  const fetchPipelineStatus = async () => {
    try {
      const response = await fetch('/api/operations/monitoring/pipeline/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setPipelineStatus(result.data);
      } else {
        throw new Error(result.message || '파이프라인 상태 조회 실패');
      }
    } catch (error) {
      console.error('파이프라인 상태 조회 오류:', error);
      setError(error instanceof Error ? error.message : '파이프라인 상태 조회 실패');
    }
  };

  const fetchJenkinsJobs = async () => {
    try {
      const response = await fetch('/api/operations/monitoring/jenkins/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setJenkinsJobs(result.data);
      } else {
        throw new Error(result.message || 'Jenkins Job 목록 조회 실패');
      }
    } catch (error) {
      console.error('Jenkins Job 목록 조회 오류:', error);
      setError(error instanceof Error ? error.message : 'Jenkins Job 목록 조회 실패');
    }
  };

  const fetchBuildHistory = async (jobName: string) => {
    try {
      const response = await fetch(`/api/operations/monitoring/jenkins/jobs/${jobName}/builds?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setBuildHistory(result.data.builds);
      } else {
        throw new Error(result.message || '빌드 히스토리 조회 실패');
      }
    } catch (error) {
      console.error('빌드 히스토리 조회 오류:', error);
      setError(error instanceof Error ? error.message : '빌드 히스토리 조회 실패');
    }
  };

  const fetchBuildLogs = async (jobName: string, buildNumber: number) => {
    try {
      const response = await fetch(`/api/operations/monitoring/jenkins/jobs/${jobName}/builds/${buildNumber}/log`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setBuildLogs(result.data.log);
        setSelectedBuild(buildNumber);
        setLogDialog(true);
      } else {
        throw new Error(result.message || '빌드 로그 조회 실패');
      }
    } catch (error) {
      console.error('빌드 로그 조회 오류:', error);
      setError(error instanceof Error ? error.message : '빌드 로그 조회 실패');
    }
  };

  const triggerBuild = async (jobName: string) => {
    try {
      const response = await fetch(`/api/operations/monitoring/jenkins/jobs/${jobName}/build`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        alert(`빌드가 트리거되었습니다: ${jobName}`);
        // 잠시 후 데이터 새로고침
        setTimeout(() => {
          fetchJenkinsJobs();
          if (selectedJob) {
            fetchBuildHistory(selectedJob);
          }
        }, 2000);
      } else {
        throw new Error(result.message || '빌드 트리거 실패');
      }
    } catch (error) {
      console.error('빌드 트리거 오류:', error);
      alert(`빌드 트리거 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchPipelineStatus(),
          fetchJenkinsJobs()
        ]);
      } catch (error) {
        console.error('초기 데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadInitialData();
    }
  }, [token]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (autoRefresh && !loading) {
      intervalRef.current = setInterval(() => {
        fetchPipelineStatus();
        fetchJenkinsJobs();
        if (selectedJob) {
          fetchBuildHistory(selectedJob);
        }
      }, 5000); // 5초마다 새로고침

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, loading, selectedJob]);

  // Job 선택 시 빌드 히스토리 로드
  useEffect(() => {
    if (selectedJob) {
      fetchBuildHistory(selectedJob);
    }
  }, [selectedJob]);

  // 빌드 상태에 따른 색상 반환
  const getBuildStatusColor = (result: string, building: boolean) => {
    if (building) return 'info';
    switch (result) {
      case 'SUCCESS': return 'success';
      case 'FAILURE': return 'error';
      case 'UNSTABLE': return 'warning';
      case 'ABORTED': return 'default';
      default: return 'info';
    }
  };

  // 빌드 상태 텍스트 반환
  const getBuildStatusText = (result: string, building: boolean) => {
    if (building) return '빌드 중';
    switch (result) {
      case 'SUCCESS': return '성공';
      case 'FAILURE': return '실패';
      case 'UNSTABLE': return '불안정';
      case 'ABORTED': return '중단됨';
      default: return '알 수 없음';
    }
  };

  // 시간 포맷팅
  const formatDuration = (duration: number) => {
    if (!duration) return '0초';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분 ${seconds % 60}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    } else {
      return `${seconds}초`;
    }
  };

  // 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            CI/CD 모니터링 데이터 로딩 중...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          🚀 CI/CD 파이프라인 실시간 모니터링
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Jenkins + Nexus 빌드 과정을 실시간으로 모니터링하고 관리합니다.
        </Typography>
      </Box>

      {/* 오류 표시 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 자동 새로고침 토글 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant={autoRefresh ? 'contained' : 'outlined'}
          color={autoRefresh ? 'success' : 'primary'}
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? '자동 새로고침 ON' : '자동 새로고침 OFF'}
        </Button>
        <Typography variant="body2" color="text.secondary">
          마지막 업데이트: {pipelineStatus ? new Date(pipelineStatus.timestamp).toLocaleTimeString() : '없음'}
        </Typography>
      </Box>

      {/* 파이프라인 상태 카드 */}
      {pipelineStatus && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Jenkins 상태
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={pipelineStatus.jenkins.online ? '온라인' : '오프라인'}
                    color={pipelineStatus.jenkins.online ? 'success' : 'error'}
                  />
                  {pipelineStatus.jenkins.online && (
                    <>
                      <Typography variant="body2">
                        모드: {pipelineStatus.jenkins.mode}
                      </Typography>
                      <Typography variant="body2">
                        Job 수: {pipelineStatus.jenkins.jobs}
                      </Typography>
                      <Typography variant="body2">
                        버전: {pipelineStatus.jenkins.version}
                      </Typography>
                    </>
                  )}
                </Box>
                {pipelineStatus.jenkins.error && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    오류: {pipelineStatus.jenkins.error}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Nexus 상태
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={pipelineStatus.nexus.online ? '온라인' : '오프라인'}
                    color={pipelineStatus.nexus.online ? 'success' : 'error'}
                  />
                  {pipelineStatus.nexus.online && pipelineStatus.nexus.available && (
                    <Typography variant="body2">
                      서비스 가능
                    </Typography>
                  )}
                </Box>
                {pipelineStatus.nexus.error && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    오류: {pipelineStatus.nexus.error}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Jenkins Jobs" />
          <Tab label="빌드 히스토리" />
          <Tab label="ECP-AI 전용" />
        </Tabs>
      </Box>

      {/* Jenkins Jobs 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {jenkinsJobs.map((job) => (
            <Grid item xs={12} md={6} lg={4} key={job.name}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedJob === job.name ? 2 : 1,
                  borderColor: selectedJob === job.name ? 'primary.main' : 'divider'
                }}
                onClick={() => setSelectedJob(job.name)}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {job.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={job.buildable ? '빌드 가능' : '빌드 불가'}
                      color={job.buildable ? 'success' : 'default'}
                      size="small"
                    />
                    {job.inQueue && (
                      <Chip label="대기 중" color="warning" size="small" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    다음 빌드 번호: #{job.nextBuildNumber}
                  </Typography>
                  {job.lastBuild && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      마지막 빌드: #{job.lastBuild.number}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!job.buildable}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerBuild(job.name);
                    }}
                    sx={{ mt: 1 }}
                  >
                    빌드 실행
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* 빌드 히스토리 탭 */}
      <TabPanel value={tabValue} index={1}>
        {selectedJob ? (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedJob} - 빌드 히스토리
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>빌드 번호</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>시작 시간</TableCell>
                      <TableCell>소요 시간</TableCell>
                      <TableCell>액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {buildHistory.map((build) => (
                      <TableRow key={build.number}>
                        <TableCell>#{build.number}</TableCell>
                        <TableCell>
                          <Chip
                            label={getBuildStatusText(build.result, build.building)}
                            color={getBuildStatusColor(build.result, build.building)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(build.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {build.building ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={16} />
                              <Typography variant="body2">진행 중</Typography>
                            </Box>
                          ) : (
                            formatDuration(build.duration)
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => fetchBuildLogs(selectedJob, build.number)}
                          >
                            로그 보기
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">
            Jenkins Job을 선택하면 빌드 히스토리를 확인할 수 있습니다.
          </Alert>
        )}
      </TabPanel>

      {/* ECP-AI 전용 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ECP-AI K8s Orchestrator 전용 모니터링
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              ECP-AI 프로젝트 전용 빌드 상태를 모니터링합니다.
            </Alert>
            <Button
              variant="contained"
              onClick={() => triggerBuild('ecp-ai-local-test')}
            >
              ECP-AI 빌드 실행
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      {/* 빌드 로그 다이얼로그 */}
      <Dialog
        open={logDialog}
        onClose={() => setLogDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          빌드 로그 - {selectedJob} #{selectedBuild}
        </DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              backgroundColor: '#1e1e1e',
              color: '#ffffff',
              padding: 2,
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: '500px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap'
            }}
          >
            {buildLogs || '로그를 불러오는 중...'}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CICDMonitoringDashboard;
