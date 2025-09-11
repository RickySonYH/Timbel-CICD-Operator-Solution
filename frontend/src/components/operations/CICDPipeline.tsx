import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
  Alert,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  GitHub as GitHubIcon,
  Build as BuildIcon,
  CloudUpload as DeployIcon,
  BugReport as TestIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] ECP-AI K8s Orchestrator CI/CD 파이프라인 관리
interface Pipeline {
  id: string;
  name: string;
  description: string;
  type: 'jenkins' | 'github-actions' | 'gitlab-ci' | 'azure-devops';
  status: 'active' | 'inactive' | 'running' | 'failed' | 'paused';
  repository: {
    url: string;
    branch: string;
    provider: 'github' | 'gitlab' | 'bitbucket';
  };
  triggers: {
    push: boolean;
    pullRequest: boolean;
    schedule: boolean;
    manual: boolean;
  };
  stages: PipelineStage[];
  lastRun?: PipelineRun;
  createdAt: string;
  updatedAt: string;
}

interface PipelineStage {
  id: string;
  name: string;
  type: 'build' | 'test' | 'security' | 'deploy' | 'notification';
  order: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  logs: string[];
  artifacts?: string[];
  environment?: string;
}

interface PipelineRun {
  id: string;
  pipelineId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  triggeredBy: string;
  commit: {
    hash: string;
    message: string;
    author: string;
  };
  stages: PipelineStage[];
  artifacts: string[];
  logs: PipelineLog[];
}

interface PipelineLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  stage?: string;
  service?: string;
}

const CICDPipeline: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: 'pipeline-001',
      name: 'ECP-메인-파이프라인',
      description: 'ECP-AI K8s 메인 서비스 CI/CD 파이프라인',
      type: 'jenkins',
      status: 'active',
      repository: {
        url: 'https://github.com/company/ecp-ai-main',
        branch: 'main',
        provider: 'github'
      },
      triggers: {
        push: true,
        pullRequest: true,
        schedule: false,
        manual: true
      },
      stages: [
        {
          id: 'stage-001',
          name: '코드 빌드',
          type: 'build',
          order: 1,
          status: 'completed',
          duration: 120,
          logs: ['Docker 이미지 빌드 시작', '의존성 설치 완료', '빌드 성공'],
          artifacts: ['ecp-ai-main:latest', 'ecp-ai-main:v1.2.0']
        },
        {
          id: 'stage-002',
          name: '단위 테스트',
          type: 'test',
          order: 2,
          status: 'completed',
          duration: 90,
          logs: ['테스트 실행 시작', '모든 테스트 통과', '커버리지 85% 달성']
        },
        {
          id: 'stage-003',
          name: '보안 스캔',
          type: 'security',
          order: 3,
          status: 'completed',
          duration: 60,
          logs: ['보안 취약점 스캔 시작', '중요도 높은 취약점 없음', '스캔 완료']
        },
        {
          id: 'stage-004',
          name: 'K8s 배포',
          type: 'deploy',
          order: 4,
          status: 'completed',
          duration: 180,
          logs: ['Kubernetes 매니페스트 생성', '배포 시작', '헬스 체크 통과', '배포 완료'],
          environment: 'production'
        }
      ],
      lastRun: {
        id: 'run-001',
        pipelineId: 'pipeline-001',
        status: 'completed',
        startedAt: '2024-01-20T10:00:00Z',
        completedAt: '2024-01-20T10:15:00Z',
        duration: 900,
        triggeredBy: 'push',
        commit: {
          hash: 'a1b2c3d4',
          message: 'feat: 콜봇 서비스 v1.2.0 기능 추가',
          author: 'developer@company.com'
        },
        stages: [],
        artifacts: ['ecp-ai-main:latest', 'ecp-ai-main:v1.2.0'],
        logs: []
      },
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-20T10:15:00Z'
    },
    {
      id: 'pipeline-002',
      name: 'ECP-개발-파이프라인',
      description: 'ECP-AI K8s 개발 환경 파이프라인',
      type: 'github-actions',
      status: 'running',
      repository: {
        url: 'https://github.com/company/ecp-ai-dev',
        branch: 'develop',
        provider: 'github'
      },
      triggers: {
        push: true,
        pullRequest: true,
        schedule: false,
        manual: true
      },
      stages: [
        {
          id: 'stage-005',
          name: '코드 빌드',
          type: 'build',
          order: 1,
          status: 'running',
          duration: 0,
          logs: ['Docker 이미지 빌드 시작', '의존성 설치 중...']
        },
        {
          id: 'stage-006',
          name: '단위 테스트',
          type: 'test',
          order: 2,
          status: 'pending',
          logs: []
        },
        {
          id: 'stage-007',
          name: '개발 배포',
          type: 'deploy',
          order: 3,
          status: 'pending',
          logs: [],
          environment: 'development'
        }
      ],
      lastRun: {
        id: 'run-002',
        pipelineId: 'pipeline-002',
        status: 'running',
        startedAt: '2024-01-20T14:00:00Z',
        triggeredBy: 'push',
        commit: {
          hash: 'e5f6g7h8',
          message: 'fix: TTS 서비스 메모리 누수 수정',
          author: 'developer2@company.com'
        },
        stages: [],
        artifacts: [],
        logs: []
      },
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-20T14:00:00Z'
    }
  ]);

  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // [advice from AI] 파이프라인 상태별 색상
  const getStatusColor = (status: string) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      running: 'warning',
      failed: 'error',
      paused: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 스테이지 상태별 색상
  const getStageStatusColor = (status: string) => {
    const colors = {
      pending: 'default',
      running: 'warning',
      completed: 'success',
      failed: 'error',
      skipped: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  // [advice from AI] 스테이지 타입별 아이콘
  const getStageIcon = (type: string) => {
    const icons = {
      build: <BuildIcon />,
      test: <TestIcon />,
      security: <SecurityIcon />,
      deploy: <DeployIcon />,
      notification: <InfoIcon />
    };
    return icons[type as keyof typeof icons] || <CodeIcon />;
  };

  // [advice from AI] 파이프라인 실행
  const runPipeline = async (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;

    // [advice from AI] 파이프라인 상태 업데이트
    setPipelines(pipelines.map(p => 
      p.id === pipelineId 
        ? { ...p, status: 'running' }
        : p
    ));

    // [advice from AI] 실행 시뮬레이션
    const newRun: PipelineRun = {
      id: `run-${Date.now()}`,
      pipelineId,
      status: 'running',
      startedAt: new Date().toISOString(),
      triggeredBy: 'manual',
      commit: {
        hash: Math.random().toString(36).substr(2, 8),
        message: 'Manual pipeline trigger',
        author: 'user@company.com'
      },
      stages: [],
      artifacts: [],
      logs: []
    };

    // [advice from AI] 스테이지별 실행 시뮬레이션
    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i];
      
      // 스테이지 시작
      setPipelines(pipelines.map(p => 
        p.id === pipelineId 
          ? {
              ...p,
              stages: p.stages.map(s => 
                s.id === stage.id 
                  ? { ...s, status: 'running' }
                  : s
              )
            }
          : p
      ));

      // 스테이지 실행 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 스테이지 완료
      setPipelines(pipelines.map(p => 
        p.id === pipelineId 
          ? {
              ...p,
              stages: p.stages.map(s => 
                s.id === stage.id 
                  ? { 
                      ...s, 
                      status: 'completed',
                      duration: Math.floor(Math.random() * 300) + 60
                    }
                  : s
              )
            }
          : p
      ));
    }

    // [advice from AI] 파이프라인 완료
    setPipelines(pipelines.map(p => 
      p.id === pipelineId 
        ? { 
            ...p, 
            status: 'active',
            lastRun: {
              ...newRun,
              status: 'completed',
              completedAt: new Date().toISOString(),
              duration: 900
            }
          }
        : p
    ));
  };

  // [advice from AI] 파이프라인 중지
  const stopPipeline = (pipelineId: string) => {
    setPipelines(pipelines.map(p => 
      p.id === pipelineId 
        ? { ...p, status: 'inactive' }
        : p
    ));
  };

  // [advice from AI] 파이프라인 생성
  const createPipeline = (pipelineData: Partial<Pipeline>) => {
    const newPipeline: Pipeline = {
      id: `pipeline-${Date.now()}`,
      name: pipelineData.name || '새 파이프라인',
      description: pipelineData.description || '',
      type: pipelineData.type || 'jenkins',
      status: 'inactive',
      repository: pipelineData.repository || {
        url: '',
        branch: 'main',
        provider: 'github'
      },
      triggers: pipelineData.triggers || {
        push: true,
        pullRequest: false,
        schedule: false,
        manual: true
      },
      stages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setPipelines([...pipelines, newPipeline]);
    setCreateDialogOpen(false);
  };

  return (
    <Box>
      {/* [advice from AI] CI/CD 파이프라인 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          CI/CD 파이프라인 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 CI/CD 파이프라인 및 Jenkins/GitHub Actions 연동
        </Typography>
      </Box>

      {/* [advice from AI] 파이프라인 목록 */}
      <BackstageCard title="파이프라인 목록" variant="default">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            활성 파이프라인 ({pipelines.filter(p => p.status === 'active' || p.status === 'running').length}개)
          </Typography>
          <Button
            variant="contained"
            startIcon={<CodeIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            파이프라인 생성
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>파이프라인명</TableCell>
                <TableCell>타입</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>저장소</TableCell>
                <TableCell>마지막 실행</TableCell>
                <TableCell>소요 시간</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pipelines.map((pipeline) => (
                <TableRow key={pipeline.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {pipeline.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pipeline.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={pipeline.type} 
                      color="primary"
                      size="small"
                      icon={pipeline.type === 'jenkins' ? <BuildIcon /> : <GitHubIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={pipeline.status} 
                      color={getStatusColor(pipeline.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {pipeline.repository.provider}/{pipeline.repository.branch}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pipeline.repository.url}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {pipeline.lastRun ? new Date(pipeline.lastRun.startedAt).toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {pipeline.lastRun?.duration ? `${Math.floor(pipeline.lastRun.duration / 60)}분` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setSelectedPipeline(pipeline)}
                        color="primary"
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                      {pipeline.status === 'active' && (
                        <IconButton 
                          size="small" 
                          onClick={() => runPipeline(pipeline.id)}
                          color="success"
                        >
                          <PlayIcon fontSize="small" />
                        </IconButton>
                      )}
                      {pipeline.status === 'running' && (
                        <IconButton 
                          size="small" 
                          onClick={() => stopPipeline(pipeline.id)}
                          color="warning"
                        >
                          <StopIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        color="primary"
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </BackstageCard>

      {/* [advice from AI] 파이프라인 상세 정보 */}
      {selectedPipeline && (
        <BackstageCard title={`${selectedPipeline.name} 상세 정보`} variant="default">
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="파이프라인 설정" />
            <Tab label="실행 이력" />
            <Tab label="스테이지 상세" />
            <Tab label="로그" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      기본 정보
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="파이프라인명"
                        value={selectedPipeline.name}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="설명"
                        value={selectedPipeline.description}
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel>타입</InputLabel>
                        <Select value={selectedPipeline.type}>
                          <MenuItem value="jenkins">Jenkins</MenuItem>
                          <MenuItem value="github-actions">GitHub Actions</MenuItem>
                          <MenuItem value="gitlab-ci">GitLab CI</MenuItem>
                          <MenuItem value="azure-devops">Azure DevOps</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      저장소 설정
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="저장소 URL"
                        value={selectedPipeline.repository.url}
                        fullWidth
                        size="small"
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel>브랜치</InputLabel>
                        <Select value={selectedPipeline.repository.branch}>
                          <MenuItem value="main">main</MenuItem>
                          <MenuItem value="develop">develop</MenuItem>
                          <MenuItem value="feature">feature</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>제공업체</InputLabel>
                        <Select value={selectedPipeline.repository.provider}>
                          <MenuItem value="github">GitHub</MenuItem>
                          <MenuItem value="gitlab">GitLab</MenuItem>
                          <MenuItem value="bitbucket">Bitbucket</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      트리거 설정
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Chip 
                        label="Push 이벤트" 
                        color={selectedPipeline.triggers.push ? 'success' : 'default'}
                        size="small"
                      />
                      <Chip 
                        label="Pull Request" 
                        color={selectedPipeline.triggers.pullRequest ? 'success' : 'default'}
                        size="small"
                      />
                      <Chip 
                        label="스케줄" 
                        color={selectedPipeline.triggers.schedule ? 'success' : 'default'}
                        size="small"
                      />
                      <Chip 
                        label="수동 실행" 
                        color={selectedPipeline.triggers.manual ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  실행 이력
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>실행 ID</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>시작 시간</TableCell>
                        <TableCell>소요 시간</TableCell>
                        <TableCell>트리거</TableCell>
                        <TableCell>커밋</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>{selectedPipeline.lastRun?.id}</TableCell>
                        <TableCell>
                          <Chip 
                            label={selectedPipeline.lastRun?.status} 
                            color={getStatusColor(selectedPipeline.lastRun?.status || '') as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {selectedPipeline.lastRun ? new Date(selectedPipeline.lastRun.startedAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          {selectedPipeline.lastRun?.duration ? `${Math.floor(selectedPipeline.lastRun.duration / 60)}분` : '-'}
                        </TableCell>
                        <TableCell>{selectedPipeline.lastRun?.triggeredBy}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {selectedPipeline.lastRun?.commit.hash}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {selectedPipeline.lastRun?.commit.message}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {activeTab === 2 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  스테이지 상세
                </Typography>
                <Stepper orientation="vertical">
                  {selectedPipeline.stages.map((stage, index) => (
                    <Step key={stage.id} active={stage.status === 'running'} completed={stage.status === 'completed'}>
                      <StepLabel
                        icon={getStageIcon(stage.type)}
                        optional={
                          <Typography variant="caption" color="text.secondary">
                            {stage.duration ? `${stage.duration}초` : '대기중'}
                          </Typography>
                        }
                      >
                        <Box>
                          <Typography variant="h6">
                            {stage.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {stage.type} • {stage.status}
                          </Typography>
                          {stage.environment && (
                            <Chip 
                              label={stage.environment} 
                              size="small" 
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Paper>
            )}

            {activeTab === 3 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  실시간 로그
                </Typography>
                <Box sx={{ 
                  backgroundColor: '#1e1e1e', 
                  color: '#ffffff', 
                  p: 2, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  height: 400,
                  overflow: 'auto'
                }}>
                  <div>2024-01-20 14:30:15 [INFO] 파이프라인 실행 시작</div>
                  <div>2024-01-20 14:30:16 [INFO] 저장소 클론 완료</div>
                  <div>2024-01-20 14:30:18 [INFO] Docker 이미지 빌드 시작</div>
                  <div>2024-01-20 14:30:25 [SUCCESS] 빌드 완료</div>
                  <div>2024-01-20 14:30:26 [INFO] 단위 테스트 실행</div>
                  <div>2024-01-20 14:30:35 [SUCCESS] 모든 테스트 통과</div>
                  <div>2024-01-20 14:30:36 [INFO] 보안 스캔 시작</div>
                  <div>2024-01-20 14:30:45 [SUCCESS] 보안 스캔 완료</div>
                  <div>2024-01-20 14:30:46 [INFO] Kubernetes 배포 시작</div>
                  <div>2024-01-20 14:30:55 [SUCCESS] 배포 완료</div>
                </Box>
              </Paper>
            )}
          </Box>
        </BackstageCard>
      )}

      {/* [advice from AI] 파이프라인 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 파이프라인 생성</DialogTitle>
        <DialogContent>
          <Stepper orientation="vertical">
            <Step>
              <StepLabel>기본 정보</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <TextField label="파이프라인명" fullWidth size="small" />
                  <TextField label="설명" fullWidth multiline rows={3} size="small" />
                  <FormControl fullWidth size="small">
                    <InputLabel>타입</InputLabel>
                    <Select>
                      <MenuItem value="jenkins">Jenkins</MenuItem>
                      <MenuItem value="github-actions">GitHub Actions</MenuItem>
                      <MenuItem value="gitlab-ci">GitLab CI</MenuItem>
                      <MenuItem value="azure-devops">Azure DevOps</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>저장소 설정</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <TextField label="저장소 URL" fullWidth size="small" />
                  <FormControl fullWidth size="small">
                    <InputLabel>브랜치</InputLabel>
                    <Select>
                      <MenuItem value="main">main</MenuItem>
                      <MenuItem value="develop">develop</MenuItem>
                      <MenuItem value="feature">feature</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>제공업체</InputLabel>
                    <Select>
                      <MenuItem value="github">GitHub</MenuItem>
                      <MenuItem value="gitlab">GitLab</MenuItem>
                      <MenuItem value="bitbucket">Bitbucket</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </StepContent>
            </Step>
            <Step>
              <StepLabel>스테이지 설정</StepLabel>
              <StepContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <Typography variant="body2">파이프라인 스테이지를 선택하세요:</Typography>
                  {['코드 빌드', '단위 테스트', '보안 스캔', 'K8s 배포', '알림'].map(stage => (
                    <Box key={stage} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input type="checkbox" />
                      <Typography variant="body2">{stage}</Typography>
                    </Box>
                  ))}
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button variant="contained" onClick={() => createPipeline({})}>생성</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CICDPipeline;
