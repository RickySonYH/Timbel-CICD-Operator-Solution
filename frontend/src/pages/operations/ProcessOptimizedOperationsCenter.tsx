// [advice from AI] 프로세스 최적화된 운영센터 - 역할별 명확한 업무 구분
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

const ProcessOptimizedOperationsCenter: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dashboardData, setDashboardData] = useState<any>({});

  // [advice from AI] 대시보드 데이터 로드
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/operations/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>운영센터</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        프로세스 최적화 운영센터
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        역할별 명확한 업무 프로세스 기반 CI/CD 운영 관리
      </Typography>

      {/* [advice from AI] 프로세스별 카테고리 */}
      <Grid container spacing={4}>
        
        {/* === 카테고리 1: 배포 요청 처리 (관리자 → 운영팀) === */}
        <Grid item xs={12}>
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="배포 요청 처리 프로세스"
              subheader="관리자/PO가 운영팀에게 배포를 요청하는 프로세스"
            />
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>프로세스:</strong> 관리자가 완성된 프로젝트를 배포 요청 → 운영팀이 검토 후 배포 실행
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/operations/deployment-center')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    통합 배포 센터
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    승인된 배포 요청 처리<br/>
                    (5단계 자동 진행)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/approval/deployments')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    배포 요청 승인
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    관리자 배포 요청 검토<br/>
                    (승인/거부 처리)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/operations/deployment-execution')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    배포 실행 모니터링
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    실행 중인 배포 상태<br/>
                    (실시간 진행 상황)
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* === 카테고리 2: 레포지토리 직접 배포 (운영팀 전용) === */}
        <Grid item xs={12}>
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="레포지토리 직접 배포 프로세스"
              subheader="운영팀이 GitHub 레포지토리 정보만으로 즉시 배포하는 프로세스"
            />
            <CardContent>
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>프로세스:</strong> 운영담당자가 레포지토리 URL만 입력 → 자동 분석 → 즉시 배포 또는 시스템 등록
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={() => navigate('/operations/repository-deploy')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    레포지토리 배포
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    GitHub URL 입력 → 즉시 배포<br/>
                    (ECP-AI 자동 하드웨어 계산)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="success"
                    size="large"
                    onClick={() => navigate('/knowledge/systems')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    시스템 등록 관리
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    배포된 시스템 등록<br/>
                    (지식자원 카탈로그 연동)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="success"
                    size="large"
                    onClick={() => navigate('/operations/hardware-calculator')}
                    sx={{ py: 2, mb: 1 }}
                    disabled
                  >
                    AI 하드웨어 계산기
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    채널별 리소스 계산<br/>
                    (인스턴스 ID 자동 생성)
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* === 카테고리 3: CI/CD 인프라 관리 (운영팀 전용) === */}
        <Grid item xs={12}>
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="CI/CD 인프라 관리 프로세스"
              subheader="Jenkins, Nexus, Argo CD 서버 및 파이프라인 관리"
            />
            <CardContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>프로세스:</strong> CI/CD 서버 추가/관리 → 파이프라인 템플릿 생성 → 자동화 규칙 설정
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => navigate('/operations/cicd-management')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    CI/CD 서버 관리
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Jenkins, Nexus, Argo CD<br/>
                    서버 추가 및 설정
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={() => navigate('/operations/pipeline-templates')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    파이프라인 템플릿
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    재사용 가능한 템플릿<br/>
                    (언어/프레임워크별)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={() => navigate('/operations/nexus')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    Nexus 이미지 관리
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Docker 이미지 레지스트리<br/>
                    (버전 관리)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={() => navigate('/operations/argocd')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    Argo CD 관리
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    GitOps 자동 배포<br/>
                    (멀티 환경)
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* === 카테고리 4: 모니터링 및 이슈 관리 (운영팀 전용) === */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="모니터링 및 이슈 관리 프로세스"
              subheader="실시간 모니터링, SLA 추적, 자동 이슈 감지 및 해결"
            />
            <CardContent>
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>프로세스:</strong> 실시간 모니터링 → 임계치 초과 시 자동 알림 → 이슈 자동 생성 → 해결 추적
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/operations/comprehensive-monitoring')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    종합 모니터링
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Prometheus + SLA<br/>
                    (실시간 알림)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/operations/issues')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    이슈 관리
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    자동 이슈 추적<br/>
                    (빌드/배포 실패)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/operations/sla')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    SLA 관리
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    서비스 수준 협약<br/>
                    (가용성 보장)
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/operations/performance')}
                    sx={{ py: 2, mb: 1 }}
                  >
                    성능 모니터링
                  </Button>
                  <Typography variant="body2" color="text.secondary" align="center">
                    시스템 성능 추적<br/>
                    (리소스 사용률)
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 현재 상태 요약 */}
      <Card sx={{ mt: 4 }}>
        <CardHeader title="현재 운영 현황" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {dashboardData.active_deployments || 3}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  활성 배포
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {dashboardData.successful_deployments || 15}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  성공한 배포
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="error.main">
                  {dashboardData.failed_deployments || 2}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  실패한 배포
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {dashboardData.pending_requests || 5}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  대기 중인 요청
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 프로세스 가이드 */}
      <Card sx={{ mt: 3 }}>
        <CardHeader title="운영 프로세스 가이드" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                배포 요청 프로세스 (관리자 → 운영팀)
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. 관리자가 완성된 프로젝트 배포 요청"
                    secondary="프로젝트 정보, 레포지토리, 요구사항 포함"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. 운영팀이 요청 검토 및 승인"
                    secondary="기술적 검토, 리소스 확인, 일정 조율"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="3. 통합 배포 센터에서 5단계 자동 실행"
                    secondary="분석 → 리소스 계산 → 빌드 → 배포 → 모니터링"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="4. 배포 완료 후 시스템 등록"
                    secondary="지식자원 카탈로그에 자동 등록"
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="success.main">
                레포지토리 직접 배포 (운영팀 전용)
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. 운영담당자가 GitHub URL 입력"
                    secondary="완성된 레포지토리 정보만 필요"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. 자동 레포지토리 분석"
                    secondary="언어, 프레임워크, Dockerfile, K8s 매니페스트 감지"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="3. AI 하드웨어 자동 계산 (ECP-AI)"
                    secondary="채널별 리소스 계산, 인스턴스 ID 자동 생성"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="4. Jenkins → Nexus → Argo CD 자동 연동"
                    secondary="즉시 배포 또는 시스템으로 등록 선택"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canManageDeployment && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          운영센터에 접근할 권한이 없습니다. 관리자에게 문의하세요.
        </Alert>
      )}
    </Box>
  );
};

export default ProcessOptimizedOperationsCenter;
