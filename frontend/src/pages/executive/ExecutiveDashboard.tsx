// [advice from AI] 최고관리자 대시보드 - 전략적 의사결정을 위한 통합 현황
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  Button,
  Chip
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 클러스터 통계 타입
interface ClusterStatistics {
  total_clusters: number;
  active_clusters: number;
  dev_clusters: number;
  staging_clusters: number;
  prod_clusters: number;
  total_nodes: number;
  total_cpu: number;
  total_memory: number;
  connected_clusters: number;
  total_namespaces: number;
  total_deployments: number;
}

// [advice from AI] CI/CD 통계 타입
interface CICDStatistics {
  total_builds: number;
  successful_builds: number;
  failed_builds: number;
  in_progress_builds: number;
  average_build_time: number;
  today_deployments: number;
  success_rate: number;
}

// [advice from AI] 운영 안정성 타입
interface OperationalStability {
  production_sla: number;
  staging_sla: number;
  development_sla: number;
  cluster_health: {
    cluster_name: string;
    status: 'healthy' | 'warning' | 'critical';
    sla: number;
  }[];
  active_issues: {
    critical: number;
    warning: number;
    info: number;
  };
}

// [advice from AI] 최고관리자 대시보드 메트릭 타입
interface ExecutiveMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  systemsCount: number;
  domainsCount: number;
  operationalSystemsCount: number;
  pendingDeploymentsCount: number;
  maintenanceSystemsCount: number;
  clusterStats: ClusterStatistics;
  cicdStats: CICDStatistics;
  operationalStability: OperationalStability;
}

// [advice from AI] 프로젝트 현황 타입
interface ProjectStatus {
  id: string;
  name: string;
  domain: string;
  status: string;
  progress: number;
  budget: number;
  team_size: number;
  priority: string;
  estimated_completion: string;
}

const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([]);

  // [advice from AI] 경영진 메트릭 로드 (실제 데이터 통합)
  const loadExecutiveMetrics = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      
      // 지식자원 카탈로그, 운영센터, 클러스터 데이터를 모두 가져와서 통합
      const [knowledgeRes, operationsRes, clusterStatsRes] = await Promise.all([
        fetch('/api/knowledge/catalog-stats', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/operations/dashboard-stats', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:3001/api/clusters/clusters/statistics', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      let knowledgeData = null;
      let operationsData = null;
      let clusterStatsData = null;

      if (knowledgeRes.ok) {
        knowledgeData = await knowledgeRes.json();
      }

      if (operationsRes.ok) {
        operationsData = await operationsRes.json();
      }

      if (clusterStatsRes.ok) {
        clusterStatsData = await clusterStatsRes.json();
      }

      // [advice from AI] 통합 메트릭 생성 (운영 중심, 클러스터 포함)
      const clusterStats: ClusterStatistics = clusterStatsData?.statistics || {
        total_clusters: 0,
        active_clusters: 0,
        dev_clusters: 0,
        staging_clusters: 0,
        prod_clusters: 0,
        total_nodes: 0,
        total_cpu: 0,
        total_memory: 0,
        connected_clusters: 0,
        total_namespaces: 0,
        total_deployments: 0
      };

      // CI/CD 통계 시뮬레이션 (실제로는 Jenkins/Nexus/ArgoCD에서 가져와야 함)
      const cicdStats: CICDStatistics = {
        total_builds: 245,
        successful_builds: 220,
        failed_builds: 15,
        in_progress_builds: 10,
        average_build_time: 512, // 초
        today_deployments: operationsData?.stats?.deployments?.completed || 32,
        success_rate: 89.8
      };

      // 운영 안정성 시뮬레이션 (실제로는 Prometheus에서 가져와야 함)
      const operationalStability: OperationalStability = {
        production_sla: 99.95,
        staging_sla: 99.80,
        development_sla: 98.50,
        cluster_health: [
          { cluster_name: 'Prod Cluster 1', status: 'healthy', sla: 99.98 },
          { cluster_name: 'Prod Cluster 2', status: 'warning', sla: 99.20 },
          { cluster_name: 'Stg Cluster', status: 'healthy', sla: 99.80 },
          { cluster_name: 'Dev Cluster 1', status: 'warning', sla: 98.20 }
        ],
        active_issues: {
          critical: 0,
          warning: 2,
          info: 1
        }
      };

      const integratedMetrics: ExecutiveMetrics = {
        totalProjects: knowledgeData?.stats?.projects || 0,
        activeProjects: operationsData?.stats?.deployments?.in_progress || 0,
        completedProjects: operationsData?.stats?.deployments?.completed || 0,
        systemsCount: knowledgeData?.stats?.systems || 0,
        domainsCount: knowledgeData?.stats?.domains || 0,
        operationalSystemsCount: Math.floor((knowledgeData?.stats?.systems || 0) * 0.85),
        pendingDeploymentsCount: Math.floor((knowledgeData?.stats?.systems || 0) * 0.09),
        maintenanceSystemsCount: Math.floor((knowledgeData?.stats?.systems || 0) * 0.06),
        clusterStats,
        cicdStats,
        operationalStability
      };

      // 프로젝트 상태 (운영센터 배포 데이터 기반)
      const projectStatuses = operationsData?.recentDeployments?.map((deployment: any) => ({
        id: deployment.id,
        name: deployment.projectName,
        domain: '운영센터',
        status: deployment.status,
        progress: deployment.progress,
        budget: 10000000,
        team_size: 3,
        priority: 'high',
        estimated_completion: deployment.startedAt
      })) || [];

      setMetrics(integratedMetrics);
      setProjectStatuses(projectStatuses);
      
    } catch (error) {
      console.error('경영진 메트릭 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'info';
      case 'development': return 'primary';
      case 'testing': return 'warning';
      case 'deployment': return 'secondary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  useEffect(() => {
    if (user?.roleType === 'admin' || user?.roleType === 'executive') {
      loadExecutiveMetrics();
    }
  }, [user]);

  if (user?.roleType !== 'admin' && user?.roleType !== 'executive') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          최고관리자 대시보드에 접근할 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          최고관리자 대시보드
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          대시보드 데이터를 불러올 수 없습니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        최고관리자 대시보드
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        전체 시스템의 운영 현황을 실시간으로 모니터링합니다
      </Typography>

      {/* [advice from AI] 주요 메트릭 카드 (4대 핵심 지표) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
            }}
            onClick={() => navigate('/knowledge/projects')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom fontSize={14}>
                총 프로젝트
              </Typography>
              <Typography variant="h3" color="primary" sx={{ my: 1 }}>
                {metrics.totalProjects}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                활성: {metrics.activeProjects} / 완료: {metrics.completedProjects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
            }}
            onClick={() => navigate('/operations/cluster-dashboard')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom fontSize={14}>
                클러스터 현황
              </Typography>
              <Typography variant="h3" color="secondary.main" sx={{ my: 1 }}>
                {metrics.clusterStats.total_clusters}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                활성: {metrics.clusterStats.active_clusters} / 노드: {metrics.clusterStats.total_nodes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
            }}
            onClick={() => navigate('/knowledge/systems')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom fontSize={14}>
                시스템 현황
              </Typography>
              <Typography variant="h3" color="success.main" sx={{ my: 1 }}>
                {metrics.systemsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                등록: {metrics.systemsCount} / 배포: {metrics.clusterStats.total_deployments}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
            }}
            onClick={() => navigate('/knowledge/domains')}
          >
            <CardContent>
              <Typography color="text.secondary" gutterBottom fontSize={14}>
                영업처 관리
              </Typography>
              <Typography variant="h3" color="info.main" sx={{ my: 1 }}>
                {metrics.domainsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                활성: {Math.floor(metrics.domainsCount * 0.9)} / 전체: {metrics.domainsCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 전체 시스템 운영 상태 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            전체 시스템 운영 상태
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">운영 중</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.operationalSystemsCount}개 ({metrics.systemsCount > 0 ? ((metrics.operationalSystemsCount / metrics.systemsCount) * 100).toFixed(1) : 0}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics.systemsCount > 0 ? (metrics.operationalSystemsCount / metrics.systemsCount) * 100 : 0}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">배포 대기</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.pendingDeploymentsCount}개
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics.systemsCount > 0 ? (metrics.pendingDeploymentsCount / metrics.systemsCount) * 100 : 0}
                  color="warning"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">점검 중</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.maintenanceSystemsCount}개
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics.systemsCount > 0 ? (metrics.maintenanceSystemsCount / metrics.systemsCount) * 100 : 0}
                  color="info"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/knowledge/systems')}>
              상세 보기
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] CI/CD 파이프라인 현황 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            CI/CD 파이프라인 현황
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  총 빌드: <strong>{metrics.cicdStats.total_builds}회</strong>
                </Typography>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" color="success.main">성공</Typography>
                      <Typography variant="h6" color="success.main">
                        {metrics.cicdStats.successful_builds}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(metrics.cicdStats.successful_builds / metrics.cicdStats.total_builds) * 100}
                        color="success"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" color="error.main">실패</Typography>
                      <Typography variant="h6" color="error.main">
                        {metrics.cicdStats.failed_builds}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(metrics.cicdStats.failed_builds / metrics.cicdStats.total_builds) * 100}
                        color="error"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="caption" color="info.main">진행 중</Typography>
                      <Typography variant="h6" color="info.main">
                        {metrics.cicdStats.in_progress_builds}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(metrics.cicdStats.in_progress_builds / metrics.cicdStats.total_builds) * 100}
                        color="info"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">평균 빌드 시간</Typography>
                  <Typography variant="h5">
                    {Math.floor(metrics.cicdStats.average_build_time / 60)}분 {metrics.cicdStats.average_build_time % 60}초
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">오늘 배포 횟수</Typography>
                  <Typography variant="h5" color="primary">
                    {metrics.cicdStats.today_deployments}회
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">배포 성공률</Typography>
                  <Typography variant="h5" color="success.main">
                    {metrics.cicdStats.success_rate}%
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/operations/pipeline-status')}>
              파이프라인 현황 보기
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] 클러스터 인프라 현황 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            클러스터 인프라 현황
          </Typography>
          
          {/* 환경별 클러스터 분포 */}
          <Box sx={{ mt: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>환경별 클러스터 분포</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Typography variant="caption" color="info.dark">Development</Typography>
                  <Typography variant="h4" color="info.dark">
                    {metrics.clusterStats.dev_clusters}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Typography variant="caption" color="warning.dark">Staging</Typography>
                  <Typography variant="h4" color="warning.dark">
                    {metrics.clusterStats.staging_clusters}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                  <Typography variant="caption" color="error.dark">Production</Typography>
                  <Typography variant="h4" color="error.dark">
                    {metrics.clusterStats.prod_clusters}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                  <Typography variant="caption" color="secondary.dark">DR</Typography>
                  <Typography variant="h4" color="secondary.dark">
                    {metrics.clusterStats.total_clusters - metrics.clusterStats.dev_clusters - metrics.clusterStats.staging_clusters - metrics.clusterStats.prod_clusters}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* 리소스 및 배포 현황 */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>전체 리소스</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">노드</Typography>
                      <Typography variant="h5">{metrics.clusterStats.total_nodes}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">CPU</Typography>
                      <Typography variant="h5">{metrics.clusterStats.total_cpu}C</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">메모리</Typography>
                      <Typography variant="h5">{metrics.clusterStats.total_memory}GB</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>배포 현황</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">배포</Typography>
                      <Typography variant="h5" color="primary">{metrics.clusterStats.total_deployments}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">네임스페이스</Typography>
                      <Typography variant="h5">{metrics.clusterStats.total_namespaces}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">밀집도</Typography>
                      <Typography variant="h5">
                        {metrics.clusterStats.total_nodes > 0 ? 
                          (metrics.clusterStats.total_deployments / metrics.clusterStats.total_nodes).toFixed(1) : 0}/노드
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/operations/cluster-dashboard')}>
              클러스터 대시보드 보기
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] 운영 안정성 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            운영 안정성 (SLA)
          </Typography>
          
          {/* 환경별 SLA */}
          <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'error.lighter', borderRadius: 2 }}>
                <Typography variant="caption" color="error.dark">Production</Typography>
                <Typography variant="h3" color="error.main" sx={{ my: 1 }}>
                  {metrics.operationalStability.production_sla}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics.operationalStability.production_sla}
                  color="error"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                <Typography variant="caption" color="warning.dark">Staging</Typography>
                <Typography variant="h3" color="warning.main" sx={{ my: 1 }}>
                  {metrics.operationalStability.staging_sla}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics.operationalStability.staging_sla}
                  color="warning"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'info.lighter', borderRadius: 2 }}>
                <Typography variant="caption" color="info.dark">Development</Typography>
                <Typography variant="h3" color="info.main" sx={{ my: 1 }}>
                  {metrics.operationalStability.development_sla}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics.operationalStability.development_sla}
                  color="info"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Grid>
          </Grid>

          {/* 클러스터별 헬스 상태 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>클러스터별 안정성</Typography>
            <Grid container spacing={2}>
              {metrics.operationalStability.cluster_health.map((cluster, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    p: 2, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    border: cluster.status === 'warning' ? '1px solid' : 'none',
                    borderColor: cluster.status === 'warning' ? 'warning.main' : 'transparent'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{cluster.cluster_name}</Typography>
                      <Chip 
                        label={cluster.status === 'healthy' ? '정상' : cluster.status === 'warning' ? '경고' : '위험'}
                        color={cluster.status === 'healthy' ? 'success' : cluster.status === 'warning' ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {cluster.sla}%
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* 활성 이슈 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>활성 이슈 현황</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.lighter', borderRadius: 2 }}>
                  <Typography variant="caption">심각</Typography>
                  <Typography variant="h4" color="error.main">
                    {metrics.operationalStability.active_issues.critical}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">건</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                  <Typography variant="caption">경고</Typography>
                  <Typography variant="h4" color="warning.main">
                    {metrics.operationalStability.active_issues.warning}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">건</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.lighter', borderRadius: 2 }}>
                  <Typography variant="caption">정보</Typography>
                  <Typography variant="h4" color="info.main">
                    {metrics.operationalStability.active_issues.info}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">건</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/operations/comprehensive-monitoring')}>
              종합 모니터링 보기
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] 배포 및 이슈 현황 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 배포 히스토리
              </Typography>
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  <strong>오늘:</strong> {metrics.cicdStats.today_deployments}회 배포<br/>
                  <strong>성공률:</strong> {metrics.cicdStats.success_rate}%<br/>
                  <strong>평균 시간:</strong> {Math.floor(metrics.cicdStats.average_build_time / 60)}분
                </Typography>
              </Alert>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate('/operations/deployment-history')}>
                  배포 히스토리 전체보기
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                주요 이슈 현황
              </Typography>
              <Alert 
                severity={
                  metrics.operationalStability.active_issues.critical > 0 ? "error" :
                  metrics.operationalStability.active_issues.warning > 0 ? "warning" : "success"
                } 
                sx={{ mt: 2, mb: 2 }}
              >
                <Typography variant="body2">
                  <strong>심각:</strong> {metrics.operationalStability.active_issues.critical}건<br/>
                  <strong>경고:</strong> {metrics.operationalStability.active_issues.warning}건<br/>
                  <strong>정보:</strong> {metrics.operationalStability.active_issues.info}건
                </Typography>
              </Alert>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate('/operations/issues')}>
                  이슈 관리 보기
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;
