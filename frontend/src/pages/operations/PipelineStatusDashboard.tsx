// [advice from AI] 파이프라인 현황 통합 대시보드 - Jenkins + Nexus + Argo CD 한 화면에
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
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
  CircularProgress
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 탭 패널 컴포넌트
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// [advice from AI] 데이터 타입 정의
interface JenkinsJob {
  id: string;
  job_name: string;
  status: string;
  last_build_number: number;
  created_at: string;
  repository_url: string;
}

interface NexusImage {
  id: string;
  image_name: string;
  image_tag: string;
  registry_url: string;
  image_size_mb: number;
  push_status: string;
  pushed_at: string;
  jenkins_build_number: number;
}

interface ArgoCDApp {
  id: string;
  application_name: string;
  environment: string;
  sync_status: string;
  health_status: string;
  created_at: string;
  target_namespace: string;
}

const PipelineStatusDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // 데이터 상태
  const [jenkinsJobs, setJenkinsJobs] = useState<JenkinsJob[]>([]);
  const [nexusImages, setNexusImages] = useState<NexusImage[]>([]);
  const [argocdApps, setArgocdApps] = useState<ArgoCDApp[]>([]);
  
  // 통계 데이터
  const [stats, setStats] = useState({
    jenkins: { total: 0, running: 0, success: 0, failed: 0 },
    nexus: { total: 0, totalSize: 0 },
    argocd: { total: 0, synced: 0, outOfSync: 0, healthy: 0 }
  });

  // [advice from AI] 전체 데이터 로드
  const loadAllData = async () => {
    try {
      setLoading(true);
      const { token: authToken } = useJwtAuthStore.getState();

      // 병렬로 모든 데이터 로드
      const [jenkinsRes, nexusRes, argocdRes] = await Promise.all([
        fetch('http://localhost:3001/api/jenkins/jobs', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch('http://localhost:3001/api/nexus/push-history', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch('http://localhost:3001/api/argocd/applications', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      if (jenkinsRes.ok) {
        const jenkinsData = await jenkinsRes.json();
        setJenkinsJobs(jenkinsData.jobs || []);
        
        // Jenkins 통계 계산
        const jobs = jenkinsData.jobs || [];
        setStats(prev => ({
          ...prev,
          jenkins: {
            total: jobs.length,
            running: jobs.filter((j: JenkinsJob) => j.status === 'running').length,
            success: jobs.filter((j: JenkinsJob) => j.status === 'success').length,
            failed: jobs.filter((j: JenkinsJob) => j.status === 'failed').length
          }
        }));
      }

      if (nexusRes.ok) {
        const nexusData = await nexusRes.json();
        setNexusImages(nexusData.push_history || []);
        
        // Nexus 통계 계산
        const images = nexusData.push_history || [];
        const totalSize = images.reduce((sum: number, img: NexusImage) => 
          sum + (img.image_size_mb || 0), 0
        );
        setStats(prev => ({
          ...prev,
          nexus: {
            total: images.length,
            totalSize: totalSize
          }
        }));
      }

      if (argocdRes.ok) {
        const argocdData = await argocdRes.json();
        setArgocdApps(argocdData.applications || []);
        
        // Argo CD 통계 계산
        const apps = argocdData.applications || [];
        setStats(prev => ({
          ...prev,
          argocd: {
            total: apps.length,
            synced: apps.filter((a: ArgoCDApp) => a.sync_status === 'Synced').length,
            outOfSync: apps.filter((a: ArgoCDApp) => a.sync_status === 'OutOfSync').length,
            healthy: apps.filter((a: ArgoCDApp) => a.health_status === 'Healthy').length
          }
        }));
      }

    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // 30초마다 자동 새로고침
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // [advice from AI] 상태별 색상 반환
  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" } = {
      'success': 'success',
      'Synced': 'success',
      'Healthy': 'success',
      'running': 'info',
      'pending': 'warning',
      'failed': 'error',
      'OutOfSync': 'warning',
      'Degraded': 'error'
    };
    return statusMap[status] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 페이지 제목 및 설명 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          CI/CD 파이프라인 현황
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Jenkins 빌드, Nexus 이미지, Argo CD 배포를 한 화면에서 모니터링합니다.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>파이프라인 흐름:</strong> Jenkins에서 빌드 → Nexus에 이미지 푸시 → Argo CD로 자동 배포<br/>
            각 단계의 상태를 실시간으로 확인하고, 문제 발생 시 빠르게 대응할 수 있습니다.
          </Typography>
        </Alert>
      </Box>

      {/* 전체 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Jenkins 빌드
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.jenkins.total}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">진행중</Typography>
                  <Chip label={stats.jenkins.running} color="info" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">성공</Typography>
                  <Chip label={stats.jenkins.success} color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">실패</Typography>
                  <Chip label={stats.jenkins.failed} color="error" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nexus 이미지
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.nexus.total}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">총 용량</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {(stats.nexus.totalSize / 1024).toFixed(2)} GB
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Argo CD 배포
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.argocd.total}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">동기화됨</Typography>
                  <Chip label={stats.argocd.synced} color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">동기화 필요</Typography>
                  <Chip label={stats.argocd.outOfSync} color="warning" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">정상</Typography>
                  <Chip label={stats.argocd.healthy} color="success" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 상세 정보 탭 */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`Jenkins 빌드 (${jenkinsJobs.length})`} />
            <Tab label={`Nexus 이미지 (${nexusImages.length})`} />
            <Tab label={`Argo CD 배포 (${argocdApps.length})`} />
          </Tabs>
        </Box>

        {/* Jenkins 탭 */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Jenkins Job 목록</Typography>
            <Button onClick={loadAllData}>
              새로고침
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job 이름</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>빌드 번호</TableCell>
                  <TableCell>레포지토리</TableCell>
                  <TableCell>생성일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jenkinsJobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>{job.job_name}</TableCell>
                    <TableCell>
                      <Chip label={job.status} color={getStatusColor(job.status)} size="small" />
                    </TableCell>
                    <TableCell>#{job.last_build_number || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.repository_url}
                      </Typography>
                    </TableCell>
                    <TableCell>{new Date(job.created_at).toLocaleString('ko-KR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Nexus 탭 */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Nexus 이미지 목록</Typography>
            <Button onClick={loadAllData}>
              새로고침
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이미지명</TableCell>
                  <TableCell>태그</TableCell>
                  <TableCell>크기</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>Jenkins 빌드</TableCell>
                  <TableCell>푸시일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nexusImages.map((image) => (
                  <TableRow key={image.id} hover>
                    <TableCell>{image.image_name}</TableCell>
                    <TableCell>
                      <Chip label={image.image_tag} size="small" />
                    </TableCell>
                    <TableCell>{image.image_size_mb} MB</TableCell>
                    <TableCell>
                      <Chip label={image.push_status} color={getStatusColor(image.push_status)} size="small" />
                    </TableCell>
                    <TableCell>#{image.jenkins_build_number || 'N/A'}</TableCell>
                    <TableCell>{new Date(image.pushed_at).toLocaleString('ko-KR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Argo CD 탭 */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Argo CD 애플리케이션 목록</Typography>
            <Button onClick={loadAllData}>
              새로고침
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>애플리케이션명</TableCell>
                  <TableCell>환경</TableCell>
                  <TableCell>동기화 상태</TableCell>
                  <TableCell>헬스 상태</TableCell>
                  <TableCell>네임스페이스</TableCell>
                  <TableCell>생성일</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {argocdApps.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>{app.application_name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={app.environment} 
                        color={app.environment === 'production' ? 'error' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={app.sync_status} color={getStatusColor(app.sync_status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={app.health_status || 'Unknown'} color={getStatusColor(app.health_status || '')} size="small" />
                    </TableCell>
                    <TableCell>{app.target_namespace}</TableCell>
                    <TableCell>{new Date(app.created_at).toLocaleString('ko-KR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>

      {/* 하단 안내 */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="success">
          <Typography variant="body2">
            <strong>통합 파이프라인 뷰:</strong> 이 페이지에서 전체 CI/CD 파이프라인의 흐름을 한눈에 파악할 수 있습니다.<br/>
            각 단계별로 더 자세한 관리가 필요하면 파이프라인 구성 또는 인프라 서버 관리 메뉴를 이용하세요.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default PipelineStatusDashboard;

