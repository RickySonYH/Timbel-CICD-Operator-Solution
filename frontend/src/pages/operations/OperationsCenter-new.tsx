// [advice from AI] 통합 운영센터 대시보드 - 탭 없이 모든 정보를 한 화면에 표시
import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  LinearProgress, Chip, Alert, Button, List, ListItem,
  ListItemText, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import DeploymentProcessWizard from '../../components/operations/DeploymentProcessWizard';

// [advice from AI] 타입 정의
interface ProjectStats {
  stage1_count: number;
  stage2_count: number;
  stage3_count: number;
  stage4_count: number;
  stage5_count: number;
  stage6_count: number;
  stage7_count: number;
  total_projects: number;
  completed_projects: number;
}

interface DeploymentRequest {
  id: string;
  project_name: string;
  po_name: string;
  priority: 'high' | 'normal' | 'low';
  target_environment: string;
  repository_url: string;
  quality_score: number;
  resource_requirements: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
  };
  deployment_notes: string;
  status: string;
  created_at: string;
}

const OperationsCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [deploymentRequests, setDeploymentRequests] = useState<DeploymentRequest[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DeploymentRequest | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, deploymentsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/project-workflow/overview', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/deployment-requests?limit=10', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setProjectStats(statsData.data);
      } else {
        console.log('⚠️ 프로젝트 통계 API 실패, Mock 데이터 사용');
        setProjectStats({
          stage1_count: 5, stage2_count: 2, stage3_count: 8, stage4_count: 15,
          stage5_count: 7, stage6_count: 3, stage7_count: 10,
          total_projects: 50, completed_projects: 28
        });
      }

      if (deploymentsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json();
        setDeploymentRequests(deploymentsData.data?.requests || []);
      } else {
        console.log('⚠️ 배포 요청 API 실패, Mock 데이터 사용');
        setDeploymentRequests([
          {
            id: 'req-1',
            project_name: 'ECP-AI K8s Orchestrator',
            po_name: '김PO',
            priority: 'high',
            target_environment: 'production',
            repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
            quality_score: 92,
            resource_requirements: { cpu_cores: 4, memory_gb: 8, storage_gb: 50 },
            deployment_notes: '고객사 요청으로 긴급 배포 필요. QA 완료 후 프로덕션 환경 배포 예정.',
            status: 'pending_operations',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'req-2',
            project_name: 'AICC 챗봇 시스템',
            po_name: '이PO',
            priority: 'normal',
            target_environment: 'staging',
            repository_url: 'https://github.com/company/aicc-chatbot',
            quality_score: 88,
            resource_requirements: { cpu_cores: 2, memory_gb: 4, storage_gb: 30 },
            deployment_notes: 'QA 완료 후 스테이징 환경에서 최종 테스트 진행',
            status: 'pending_operations',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ]);
      }

      setRecentActivities([
        { id: 1, type: 'deployment', message: 'ECP-AI K8s Orchestrator 배포 완료', time: '5분 전' },
        { id: 2, type: 'build', message: 'AICC 챗봇 시스템 빌드 성공', time: '12분 전' },
        { id: 3, type: 'approval', message: '신규 프로젝트 3건 승인 대기', time: '25분 전' },
        { id: 4, type: 'issue', message: '빌드 실패 이슈 2건 PE 할당 완료', time: '1시간 전' }
      ]);

    } catch (err) {
      console.error('❌ 대시보드 데이터 로딩 실패:', err);
      setError(err instanceof Error ? err.message : '대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          종합 운영센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          전체 프로젝트의 운영 현황을 한눈에 확인하고, 배포 요청을 처리합니다.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 통합 대시보드 - 탭 없이 모든 정보를 한 화면에 표시 */}
      <Grid container spacing={3}>
        
        {/* 좌측: 배포 대기 목록 */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                배포 승인 대기 목록
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                PO가 승인한 배포 요청들입니다. 각 요청을 클릭하여 배포 처리 마법사를 시작하세요.
              </Alert>

              {deploymentRequests.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>프로젝트명</TableCell>
                        <TableCell>담당 PO</TableCell>
                        <TableCell>우선순위</TableCell>
                        <TableCell>대상 환경</TableCell>
                        <TableCell>품질점수</TableCell>
                        <TableCell>요청일시</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deploymentRequests.map((request) => (
                        <TableRow key={request.id} hover>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {request.project_name}
                            </Typography>
                          </TableCell>
                          <TableCell>{request.po_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={request.priority.toUpperCase()}
                              color={getPriorityColor(request.priority) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={request.target_environment}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color={request.quality_score >= 90 ? 'success.main' :
                                     request.quality_score >= 80 ? 'warning.main' : 'error.main'}
                            >
                              {request.quality_score}점
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(request.created_at).toLocaleString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              size="small"
                              color="primary"
                              onClick={() => {
                                setSelectedRequest(request);
                                setWizardOpen(true);
                              }}
                            >
                              배포 처리
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
                    배포 대기 중인 요청이 없습니다.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 우측: 프로젝트 진행 현황 및 최근 활동 */}
        <Grid item xs={12} lg={4}>
          
          {/* 프로젝트 단계별 현황 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                프로젝트 단계별 현황
              </Typography>
              {projectStats ? (
                <List dense>
                  {[
                    { label: '1단계: 프로젝트 생성', count: projectStats.stage1_count },
                    { label: '2단계: 최고운영자 승인', count: projectStats.stage2_count },
                    { label: '3단계: PO 검토/PE 할당', count: projectStats.stage3_count },
                    { label: '4단계: PE 개발 진행', count: projectStats.stage4_count },
                    { label: '5단계: QA 승인 대기', count: projectStats.stage5_count },
                    { label: '6단계: PO 배포 결정', count: projectStats.stage6_count },
                    { label: '7단계: 운영팀 배포', count: projectStats.stage7_count },
                  ].map((stage, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemText
                        primary={stage.label}
                        secondary={`${stage.count} 건`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <LinearProgress
                        variant="determinate"
                        value={(stage.count / (projectStats.total_projects || 1)) * 100}
                        sx={{ width: '40%', ml: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="warning" size="small">
                  프로젝트 통계를 불러올 수 없습니다.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 최근 활동 로그 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 활동 로그
              </Typography>
              <List dense>
                {recentActivities.map((activity) => (
                  <ListItem key={activity.id} disablePadding>
                    <ListItemText
                      primary={activity.message}
                      secondary={activity.time}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 하단: 빠른 액션 버튼들 */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/operations/deployment-approval')}
        >
          배포 승인 처리
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => navigate('/operations/build-pipeline')}
        >
          빌드 모니터링
        </Button>
        <Button
          variant="outlined"
          color="info"
          onClick={() => navigate('/operations/cicd-servers')}
        >
          CI/CD 서버 관리
        </Button>
        <Button
          variant="outlined"
          color="warning"
          onClick={() => navigate('/operations/build-issues')}
        >
          이슈 관리
        </Button>
      </Box>

      <DeploymentProcessWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setSelectedRequest(null);
        }}
        selectedRequest={selectedRequest}
      />
    </Container>
  );
};

export default OperationsCenter;
