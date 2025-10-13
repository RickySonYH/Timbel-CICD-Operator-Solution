// [advice from AI] CI/CD 서버 관리 컴포넌트 - Jenkins, Nexus, Argo CD 서버 등록 및 관리
import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent, CardActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Tooltip, Divider, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 타입 정의
interface CICDServer {
  id: string;
  server_name: string;
  server_type: 'jenkins' | 'nexus' | 'argocd';
  server_url: string;
  username: string;
  is_active: boolean;
  health_status: 'healthy' | 'unhealthy' | 'warning' | 'unknown';
  last_health_check: string;
  description: string;
  created_at: string;
}

interface JenkinsJob {
  name: string;
  url: string;
  color: string;
  lastBuild?: {
    number: number;
    timestamp: number;
    result: string;
  };
}

const CICDServerManager: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [servers, setServers] = useState<CICDServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // [advice from AI] 다이얼로그 상태
  const [addServerDialog, setAddServerDialog] = useState(false);
  const [jobsDialog, setJobsDialog] = useState(false);
  const [selectedServer, setSelectedServer] = useState<CICDServer | null>(null);
  const [jenkinsJobs, setJenkinsJobs] = useState<JenkinsJob[]>([]);
  
  // [advice from AI] 새 서버 등록 폼 데이터
  const [newServer, setNewServer] = useState({
    server_name: '',
    server_type: 'jenkins' as 'jenkins' | 'nexus' | 'argocd',
    server_url: '',
    username: '',
    password: '',
    description: ''
  });

  // [advice from AI] 서버 목록 로딩
  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/cicd-servers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('서버 목록 로딩 실패');
      }

      const data = await response.json();
      setServers(data.data || []);

    } catch (err) {
      console.error('❌ 서버 목록 로딩 실패:', err);
      setError(err instanceof Error ? err.message : '서버 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 서버 헬스 체크
  const checkServerHealth = async (serverId: string) => {
    try {
      const response = await fetch(`/api/cicd-servers/${serverId}/health-check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('헬스 체크 실패');
      }

      const data = await response.json();
      console.log('✅ 헬스 체크 완료:', data);
      
      // 서버 목록 새로고침
      loadServers();

    } catch (err) {
      console.error('❌ 헬스 체크 실패:', err);
      setError('헬스 체크에 실패했습니다.');
    }
  };

  // [advice from AI] Jenkins Job 목록 조회
  const loadJenkinsJobs = async (serverId: string) => {
    try {
      const response = await fetch(`/api/cicd-servers/${serverId}/jenkins/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Jenkins Job 목록 로딩 실패');
      }

      const data = await response.json();
      setJenkinsJobs(data.data.jobs || []);
      setJobsDialog(true);

    } catch (err) {
      console.error('❌ Jenkins Job 목록 로딩 실패:', err);
      setError('Jenkins Job 목록을 불러오는데 실패했습니다.');
    }
  };

  // [advice from AI] 새 서버 등록
  const handleAddServer = async () => {
    try {
      const response = await fetch('/api/cicd-servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newServer)
      });

      if (!response.ok) {
        throw new Error('서버 등록 실패');
      }

      const data = await response.json();
      console.log('✅ 서버 등록 성공:', data);
      
      // 폼 초기화 및 다이얼로그 닫기
      setNewServer({
        server_name: '',
        server_type: 'jenkins',
        server_url: '',
        username: '',
        password: '',
        description: ''
      });
      setAddServerDialog(false);
      
      // 서버 목록 새로고침
      loadServers();

    } catch (err) {
      console.error('❌ 서버 등록 실패:', err);
      setError('서버 등록에 실패했습니다.');
    }
  };

  // [advice from AI] 서버 상태 색상
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  // [advice from AI] 서버 타입 아이콘
  const getServerTypeIcon = (type: string) => {
    switch (type) {
      case 'jenkins': return '🔨';
      case 'nexus': return '📦';
      case 'argocd': return '🚀';
      case 'gitlab': return '🦊';
      case 'github_actions': return '🐙';
      case 'azure_devops': return '🔷';
      case 'teamcity': return '🏗️';
      case 'circleci': return '⭕';
      case 'sonarqube': return '📊';
      case 'harbor': return '🏠';
      case 'docker_registry': return '🐳';
      case 'grafana': return '📈';
      case 'prometheus': return '🔥';
      default: return '⚙️';
    }
  };

  // [advice from AI] 서버 타입별 설명
  const getServerTypeDescription = (type: string) => {
    switch (type) {
      case 'jenkins': return 'CI/CD 자동화 서버. 빌드, 테스트, 배포 파이프라인을 관리합니다.';
      case 'nexus': return 'Artifact Repository. Maven, npm, Docker 이미지 등을 저장하고 관리합니다.';
      case 'argocd': return 'GitOps CD 도구. Git 레포지토리를 기반으로 Kubernetes 배포를 자동화합니다.';
      case 'gitlab': return 'GitLab CI/CD. 소스 코드 관리와 CI/CD 파이프라인을 통합 제공합니다.';
      case 'github_actions': return 'GitHub Actions. GitHub 레포지토리에서 직접 CI/CD 워크플로우를 실행합니다.';
      case 'azure_devops': return 'Microsoft Azure DevOps. 완전한 DevOps 라이프사이클을 지원합니다.';
      case 'teamcity': return 'JetBrains TeamCity. 강력한 빌드 관리 및 CI/CD 기능을 제공합니다.';
      case 'circleci': return 'CircleCI. 클라우드 기반 CI/CD 플랫폼으로 빠른 빌드와 배포를 지원합니다.';
      case 'sonarqube': return 'SonarQube. 코드 품질 분석 및 보안 취약점 검사를 수행합니다.';
      case 'harbor': return 'Harbor. 엔터프라이즈급 Docker 컨테이너 레지스트리입니다.';
      case 'docker_registry': return 'Docker Registry. Docker 이미지를 저장하고 배포하는 레지스트리입니다.';
      case 'grafana': return 'Grafana. 메트릭 시각화 및 모니터링 대시보드를 제공합니다.';
      case 'prometheus': return 'Prometheus. 시계열 데이터베이스 및 모니터링 시스템입니다.';
      default: return '선택한 서버 타입에 대한 설명이 없습니다.';
    }
  };

  // [advice from AI] 인증 방식별 도움말
  const getAuthHelperText = (type: string, field: 'username' | 'password') => {
    if (field === 'username') {
      switch (type) {
        case 'jenkins':
        case 'nexus':
        case 'teamcity':
        case 'harbor':
        case 'docker_registry':
        case 'grafana':
          return '서버 로그인 사용자명';
        case 'gitlab':
        case 'github_actions':
        case 'azure_devops':
        case 'circleci':
        case 'sonarqube':
          return '토큰 사용 시 사용자명 불필요 (선택사항)';
        case 'argocd':
          return 'Argo CD 사용자명 (기본: admin)';
        case 'prometheus':
          return '인증이 필요한 경우에만 입력';
        default:
          return '사용자명 (선택사항)';
      }
    } else {
      switch (type) {
        case 'jenkins':
        case 'nexus':
        case 'teamcity':
        case 'harbor':
        case 'docker_registry':
        case 'grafana':
          return '서버 로그인 비밀번호';
        case 'gitlab':
          return 'GitLab Personal Access Token 또는 비밀번호';
        case 'github_actions':
          return 'GitHub Personal Access Token (repo 권한 필요)';
        case 'azure_devops':
          return 'Azure DevOps Personal Access Token';
        case 'circleci':
          return 'CircleCI API Token';
        case 'sonarqube':
          return 'SonarQube Token 또는 비밀번호';
        case 'argocd':
          return 'Argo CD 비밀번호';
        case 'prometheus':
          return '인증이 필요한 경우에만 입력';
        default:
          return '비밀번호 또는 API 토큰';
      }
    }
  };

  // [advice from AI] Jenkins Job 상태 색상
  const getJobStatusColor = (color: string) => {
    if (color.includes('blue')) return 'success';
    if (color.includes('red')) return 'error';
    if (color.includes('yellow')) return 'warning';
    return 'default';
  };

  useEffect(() => {
    loadServers();
  }, [token]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            CI/CD 서버 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Jenkins, Nexus, Argo CD 서버를 등록하고 관리합니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setAddServerDialog(true)}
          sx={{ mt: 1 }}
        >
          새 서버 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 서버 목록 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {servers.map((server) => (
          <Grid item xs={12} md={6} lg={4} key={server.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ mr: 1 }}>
                    {server.server_name}
                  </Typography>
                  <Chip 
                    label={server.health_status.toUpperCase()} 
                    color={getHealthStatusColor(server.health_status) as any}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {server.server_url}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {server.description}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  마지막 체크: {server.last_health_check ? 
                    new Date(server.last_health_check).toLocaleString('ko-KR') : 
                    '없음'
                  }
                </Typography>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => checkServerHealth(server.id)}
                >
                  헬스 체크
                </Button>
                
                {server.server_type === 'jenkins' && (
                  <Button
                    size="small"
                    color="secondary"
                    onClick={() => {
                      setSelectedServer(server);
                      loadJenkinsJobs(server.id);
                    }}
                  >
                    Job 목록
                  </Button>
                )}
                
                <Button
                  size="small"
                  color="info"
                  onClick={() => window.open(server.server_url, '_blank')}
                >
                  접속
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 서버가 없을 경우 */}
      {servers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            등록된 CI/CD 서버가 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Jenkins, Nexus, Argo CD 서버를 등록하여 관리를 시작하세요.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setAddServerDialog(true)}
          >
            첫 번째 서버 등록
          </Button>
        </Box>
      )}

      {/* [advice from AI] 새 서버 등록 다이얼로그 */}
      <Dialog open={addServerDialog} onClose={() => setAddServerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 CI/CD 서버 등록</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="서버 이름"
                  value={newServer.server_name}
                  onChange={(e) => setNewServer(prev => ({ ...prev, server_name: e.target.value }))}
                  placeholder="예: 운영 Jenkins"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>서버 타입</InputLabel>
                  <Select
                    value={newServer.server_type}
                    onChange={(e) => setNewServer(prev => ({ ...prev, server_type: e.target.value as any }))}
                    label="서버 타입"
                  >
                    <MenuItem value="jenkins">Jenkins</MenuItem>
                    <MenuItem value="nexus">Nexus Repository</MenuItem>
                    <MenuItem value="argocd">Argo CD</MenuItem>
                    <MenuItem value="gitlab">GitLab CI/CD</MenuItem>
                    <MenuItem value="github_actions">GitHub Actions</MenuItem>
                    <MenuItem value="azure_devops">Azure DevOps</MenuItem>
                    <MenuItem value="teamcity">TeamCity</MenuItem>
                    <MenuItem value="circleci">CircleCI</MenuItem>
                    <MenuItem value="sonarqube">SonarQube</MenuItem>
                    <MenuItem value="harbor">Harbor Registry</MenuItem>
                    <MenuItem value="docker_registry">Docker Registry</MenuItem>
                    <MenuItem value="grafana">Grafana</MenuItem>
                    <MenuItem value="prometheus">Prometheus</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="서버 URL"
                  value={newServer.server_url}
                  onChange={(e) => setNewServer(prev => ({ ...prev, server_url: e.target.value }))}
                  placeholder="예: http://jenkins.company.com:8080"
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="사용자명"
                  value={newServer.username}
                  onChange={(e) => setNewServer(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="admin"
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="비밀번호"
                  value={newServer.password}
                  onChange={(e) => setNewServer(prev => ({ ...prev, password: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="설명"
                  value={newServer.description}
                  onChange={(e) => setNewServer(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="서버에 대한 설명을 입력하세요..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddServerDialog(false)}>취소</Button>
          <Button 
            onClick={handleAddServer}
            variant="contained"
            disabled={!newServer.server_name || !newServer.server_url}
          >
            등록
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] Jenkins Job 목록 다이얼로그 */}
      <Dialog open={jobsDialog} onClose={() => setJobsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Jenkins Job 목록 - {selectedServer?.server_name}
        </DialogTitle>
        <DialogContent>
          {jenkinsJobs.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job 이름</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>마지막 빌드</TableCell>
                    <TableCell>결과</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jenkinsJobs.map((job) => (
                    <TableRow key={job.name}>
                      <TableCell>{job.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={job.color} 
                          color={getJobStatusColor(job.color) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {job.lastBuild ? `#${job.lastBuild.number}` : '없음'}
                      </TableCell>
                      <TableCell>
                        {job.lastBuild?.result || '없음'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => window.open(job.url, '_blank')}
                        >
                          보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                등록된 Job이 없습니다.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobsDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CICDServerManager;
