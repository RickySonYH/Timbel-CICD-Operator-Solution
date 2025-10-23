// [advice from AI] 배포 진행 상황 실시간 모니터링 컴포넌트
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Build as BuildIcon,
  CloudUpload as DeployIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface DeploymentStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}

interface DeploymentInfo {
  id: string;
  deployment_name: string;
  project_name: string;
  repository_url: string;
  status: string;
  progress_percentage: number;
  environment: string;
  created_by: string;
  created_at: string;
  stages: DeploymentStage[];
  estimated_completion?: string;
}

interface DeploymentLog {
  timestamp: string;
  stage: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface DeploymentMonitorProps {
  open: boolean;
  deploymentId: string;
  onClose: () => void;
}

const DeploymentMonitor: React.FC<DeploymentMonitorProps> = ({ open, deploymentId, onClose }) => {
  const { token } = useJwtAuthStore();
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // [advice from AI] 배포 상태 조회
  const fetchDeploymentStatus = async () => {
    if (!deploymentId || !token) return;
    
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/operations/deployment/${deploymentId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeployment(data.data);
      }
    } catch (error) {
      console.error('배포 상태 조회 실패:', error);
    }
  };

  // [advice from AI] 배포 로그 조회
  const fetchDeploymentLogs = async () => {
    if (!deploymentId || !token) return;
    
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/operations/deployment/${deploymentId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data.logs || []);
      }
    } catch (error) {
      console.error('배포 로그 조회 실패:', error);
    }
  };

  // [advice from AI] 초기 데이터 로드 및 자동 새로고침
  useEffect(() => {
    if (open && deploymentId) {
      setLoading(true);
      Promise.all([fetchDeploymentStatus(), fetchDeploymentLogs()])
        .finally(() => setLoading(false));
    }
  }, [open, deploymentId]);

  // [advice from AI] 자동 새로고침 (5초마다)
  useEffect(() => {
    if (!open || !autoRefresh || !deploymentId) return;
    
    const interval = setInterval(() => {
      if (deployment && ['pending', 'building', 'packaging', 'deploying'].includes(deployment.status)) {
        fetchDeploymentStatus();
        fetchDeploymentLogs();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [open, autoRefresh, deploymentId, deployment?.status]);

  // [advice from AI] 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'running':
        return <PlayArrowIcon color="primary" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'primary';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // [advice from AI] 단계별 아이콘
  const getStageIcon = (stageName: string) => {
    if (stageName.includes('Jenkins') || stageName.includes('Build')) {
      return <BuildIcon />;
    } else if (stageName.includes('Nexus') || stageName.includes('Push')) {
      return <StorageIcon />;
    } else if (stageName.includes('ArgoCD') || stageName.includes('Deploy')) {
      return <DeployIcon />;
    }
    return <PlayArrowIcon />;
  };

  if (!deployment && loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>배포 정보를 불러오는 중...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              🚀 배포 모니터링: {deployment?.deployment_name || deploymentId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {deployment?.environment} 환경 • {deployment?.created_by}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => { fetchDeploymentStatus(); fetchDeploymentLogs(); }}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {deployment && (
          <Box>
            {/* [advice from AI] 전체 진행률 */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  전체 진행률: {deployment.progress_percentage}%
                </Typography>
                <Chip 
                  label={deployment.status} 
                  color={getStatusColor(deployment.status) as any}
                  icon={getStatusIcon(deployment.status)}
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={deployment.progress_percentage} 
                sx={{ height: 8, borderRadius: 1 }}
              />
              {deployment.estimated_completion && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  예상 완료 시간: {new Date(deployment.estimated_completion).toLocaleString()}
                </Typography>
              )}
            </Paper>

            {/* [advice from AI] 탭 네비게이션 */}
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
              <Tab label="단계별 진행 상황" />
              <Tab label="실시간 로그" />
            </Tabs>

            {/* [advice from AI] 단계별 진행 상황 */}
            {activeTab === 0 && (
              <Paper sx={{ p: 2 }}>
                <Stepper orientation="vertical">
                  {deployment.stages?.map((stage, index) => (
                    <Step key={index} active={stage.status === 'running'} completed={stage.status === 'completed'}>
                      <StepLabel 
                        StepIconComponent={() => getStageIcon(stage.name)}
                        error={stage.status === 'failed'}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{stage.name}</Typography>
                          <Chip 
                            label={stage.status} 
                            size="small" 
                            color={getStatusColor(stage.status) as any}
                          />
                        </Box>
                      </StepLabel>
                      <StepContent>
                        <LinearProgress 
                          variant="determinate" 
                          value={stage.progress} 
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          진행률: {stage.progress}%
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </Paper>
            )}

            {/* [advice from AI] 실시간 로그 */}
            {activeTab === 1 && (
              <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                {logs.length === 0 ? (
                  <Alert severity="info">아직 로그가 없습니다.</Alert>
                ) : (
                  <List dense>
                    {logs.map((log, index) => (
                      <ListItem key={index} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={log.stage} size="small" variant="outlined" />
                              <Chip 
                                label={log.level} 
                                size="small" 
                                color={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'default'}
                              />
                              <Typography variant="body2">{log.message}</Typography>
                            </Box>
                          }
                          secondary={new Date(log.timestamp).toLocaleString()}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setAutoRefresh(!autoRefresh)}>
          {autoRefresh ? '자동 새로고침 중지' : '자동 새로고침 시작'}
        </Button>
        <Button onClick={onClose} variant="contained">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeploymentMonitor;
