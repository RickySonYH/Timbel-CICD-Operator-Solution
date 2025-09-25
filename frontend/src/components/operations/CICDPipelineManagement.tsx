// [advice from AI] CI/CD 파이프라인 통합 관리 컴포넌트
// Jenkins, Nexus, Argo CD 연동 및 파이프라인 설정

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 파이프라인 상태 인터페이스
interface PipelineStatus {
  id: string;
  project_name: string;
  repository_url: string;
  branch: string;
  jenkins_job_name: string;
  build_number?: number;
  build_status: 'pending' | 'running' | 'success' | 'failed';
  image_tag?: string;
  deployment_status: 'pending' | 'deploying' | 'deployed' | 'failed';
  created_at: string;
  updated_at: string;
}

// [advice from AI] CI/CD 설정 인터페이스
interface CICDConfig {
  jenkins_url: string;
  jenkins_username: string;
  jenkins_token: string;
  nexus_url: string;
  nexus_username: string;
  nexus_password: string;
  argocd_url: string;
  argocd_username: string;
  argocd_password: string;
  github_token?: string;
}

const CICDPipelineManagement: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  // 상태 관리
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pipelines, setPipelines] = useState<PipelineStatus[]>([]);
  const [cicdConfig, setCicdConfig] = useState<CICDConfig | null>(null);
  
  // 다이얼로그 상태
  const [configDialog, setConfigDialog] = useState(false);
  const [pipelineDialog, setPipelineDialog] = useState(false);
  const [newPipelineData, setNewPipelineData] = useState({
    project_name: '',
    repository_url: '',
    branch: 'main',
    dockerfile_path: 'Dockerfile',
    deployment_environment: 'development'
  });

  // API URL 생성
  const getApiUrl = () => {
    const currentHost = window.location.host;
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3001';
    }
    return `http://${currentHost.split(':')[0]}:3001`;
  };

  // 파이프라인 목록 로드
  const loadPipelines = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/operations/cicd/pipelines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPipelines(data.data);
        }
      }
    } catch (error) {
      console.error('❌ 파이프라인 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // CI/CD 설정 로드
  const loadCICDConfig = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/operations/cicd/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCicdConfig(data.data);
        }
      }
    } catch (error) {
      console.error('❌ CI/CD 설정 로드 실패:', error);
    }
  };

  // 새 파이프라인 생성
  const createPipeline = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/operations/cicd/pipelines`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPipelineData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPipelineDialog(false);
          setNewPipelineData({
            project_name: '',
            repository_url: '',
            branch: 'main',
            dockerfile_path: 'Dockerfile',
            deployment_environment: 'development'
          });
          loadPipelines();
        }
      }
    } catch (error) {
      console.error('❌ 파이프라인 생성 실패:', error);
    }
  };

  // 파이프라인 트리거
  const triggerPipeline = async (pipelineId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/operations/cicd/pipelines/${pipelineId}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          loadPipelines(); // 상태 새로고침
        }
      }
    } catch (error) {
      console.error('❌ 파이프라인 트리거 실패:', error);
    }
  };

  // 빌드 상태 색상
  const getBuildStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'running': return 'warning';
      default: return 'default';
    }
  };

  // 배포 상태 색상
  const getDeploymentStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'success';
      case 'failed': return 'error';
      case 'deploying': return 'info';
      default: return 'default';
    }
  };

  useEffect(() => {
    loadPipelines();
    loadCICDConfig();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="파이프라인 현황" />
          <Tab label="CI/CD 설정" />
          <Tab label="통계 및 모니터링" />
        </Tabs>
      </Paper>

      {/* 파이프라인 현황 탭 */}
      {currentTab === 0 && (
        <Box>
          {/* 액션 버튼 */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">CI/CD 파이프라인 현황</Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={() => setPipelineDialog(true)}
                color="primary"
              >
                새 파이프라인 생성
              </Button>
              <Button
                variant="outlined"
                onClick={loadPipelines}
                disabled={loading}
              >
                새로고침
              </Button>
            </Box>
          </Box>

          {/* 파이프라인 통계 카드 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {pipelines.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 파이프라인
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {pipelines.filter(p => p.build_status === 'success').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    성공한 빌드
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                    {pipelines.filter(p => p.build_status === 'running').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    실행 중
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    {pipelines.filter(p => p.build_status === 'failed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    실패한 빌드
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 파이프라인 목록 */}
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : pipelines.length === 0 ? (
            <Alert severity="info">
              등록된 CI/CD 파이프라인이 없습니다. 새 파이프라인을 생성해보세요.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>저장소</TableCell>
                    <TableCell>브랜치</TableCell>
                    <TableCell align="center">빌드 상태</TableCell>
                    <TableCell align="center">배포 상태</TableCell>
                    <TableCell align="center">이미지 태그</TableCell>
                    <TableCell align="center">마지막 업데이트</TableCell>
                    <TableCell align="center">액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pipelines.map((pipeline) => (
                    <TableRow key={pipeline.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pipeline.project_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pipeline.repository_url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={pipeline.branch} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={pipeline.build_status}
                          size="small"
                          color={getBuildStatusColor(pipeline.build_status) as any}
                        />
                        {pipeline.build_number && (
                          <Typography variant="caption" display="block">
                            #{pipeline.build_number}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={pipeline.deployment_status}
                          size="small"
                          color={getDeploymentStatusColor(pipeline.deployment_status) as any}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {pipeline.image_tag || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {new Date(pipeline.updated_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => triggerPipeline(pipeline.id)}
                          disabled={pipeline.build_status === 'running'}
                        >
                          {pipeline.build_status === 'running' ? '실행 중' : '빌드 시작'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* CI/CD 설정 탭 */}
      {currentTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>CI/CD 연동 설정</Typography>
          
          {cicdConfig ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      Jenkins 설정
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      URL: {cicdConfig.jenkins_url}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      사용자: {cicdConfig.jenkins_username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      토큰: {'*'.repeat(20)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      Nexus Repository 설정
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      URL: {cicdConfig.nexus_url}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      사용자: {cicdConfig.nexus_username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      비밀번호: {'*'.repeat(20)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      Argo CD 설정
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      URL: {cicdConfig.argocd_url}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      사용자: {cicdConfig.argocd_username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      비밀번호: {'*'.repeat(20)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="warning" sx={{ mb: 3 }}>
              CI/CD 연동 설정이 필요합니다. 설정을 완료해주세요.
            </Alert>
          )}
          
          <Box mt={3}>
            <Button
              variant="contained"
              onClick={() => setConfigDialog(true)}
            >
              CI/CD 설정 수정
            </Button>
          </Box>
        </Box>
      )}

      {/* 통계 및 모니터링 탭 */}
      {currentTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3 }}>파이프라인 통계 및 모니터링</Typography>
          <Alert severity="info">
            파이프라인 통계 및 모니터링 기능은 개발 중입니다.
          </Alert>
        </Box>
      )}

      {/* 새 파이프라인 생성 다이얼로그 */}
      <Dialog open={pipelineDialog} onClose={() => setPipelineDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 CI/CD 파이프라인 생성</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="프로젝트명"
                  value={newPipelineData.project_name}
                  onChange={(e) => setNewPipelineData(prev => ({ ...prev, project_name: e.target.value }))}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="GitHub 저장소 URL"
                  value={newPipelineData.repository_url}
                  onChange={(e) => setNewPipelineData(prev => ({ ...prev, repository_url: e.target.value }))}
                  margin="normal"
                  placeholder="https://github.com/username/repository"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="브랜치"
                  value={newPipelineData.branch}
                  onChange={(e) => setNewPipelineData(prev => ({ ...prev, branch: e.target.value }))}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dockerfile 경로"
                  value={newPipelineData.dockerfile_path}
                  onChange={(e) => setNewPipelineData(prev => ({ ...prev, dockerfile_path: e.target.value }))}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>배포 환경</InputLabel>
                  <Select
                    value={newPipelineData.deployment_environment}
                    onChange={(e) => setNewPipelineData(prev => ({ ...prev, deployment_environment: e.target.value }))}
                    label="배포 환경"
                  >
                    <MenuItem value="development">Development</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPipelineDialog(false)}>취소</Button>
          <Button 
            onClick={createPipeline} 
            variant="contained"
            disabled={!newPipelineData.project_name || !newPipelineData.repository_url}
          >
            생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* CI/CD 설정 다이얼로그 */}
      <Dialog open={configDialog} onClose={() => setConfigDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>CI/CD 연동 설정</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            CI/CD 설정 기능은 개발 중입니다. 현재는 인프라 관리에서 개별 서비스를 등록해주세요.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CICDPipelineManagement;
