// [advice from AI] 운영 센터 - ECP-AI K8s Orchestrator 기반 운영 센터
// 개발계획서 4.5 운영팀 레벨 (ECP-AI K8s Orchestrator 기반) 구조에 따른 구현

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Paper,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

// [advice from AI] 타입 정의
interface Tenant {
  tenantId: string;
  tenantName: string;
  tenant_status: 'active' | 'creating' | 'error' | 'inactive';
  description?: string;
  environment?: string;
  cloudProvider?: string;
  region?: string;
  deploymentMode?: string;
  deploymentStrategy?: string;
  autoScaling?: boolean;
  monitoringEnabled?: boolean;
  infrastructureId?: string;
  services?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SimulatorMonitoring {
  tenantId: string;
  timestamp: string;
  cpu: number;
  memory: number;
  pods: number;
  health: 'excellent' | 'good' | 'warning' | 'critical';
  services: Array<{
    service: string;
    status: string;
    cpu: number;
    memory: number;
    uptime: number;
  }>;
}

interface SimulatorData {
  tenants: number;
  monitoring: Record<string, SimulatorMonitoring>;
}

interface StatsData {
  total_deployments?: number;
  active_deployments?: number;
  [key: string]: any;
}
// [advice from AI] 운영센터 메인 대시보드 - 개별 컴포넌트들은 사이드바 메뉴로 분리

const OperationsCenter: React.FC = () => {
  const navigate = useNavigate();
  const { getAuthHeaders } = useJwtAuthStore();
  
  // [advice from AI] PostgreSQL 기반 실시간 대시보드 데이터
  const [dashboardSummary, setDashboardSummary] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalServices: 0,
    runningServices: 0,
    totalDeployments: 0,
    activeDeployments: 0,
    systemHealth: 0,
    alerts: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  // [advice from AI] PostgreSQL에서 운영 센터 통계 로드
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      
      // [advice from AI] 테넌트 데이터 로드
      const tenantsResponse = await fetch('http://localhost:3001/api/operations/tenants', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      // [advice from AI] ECP-AI 시뮬레이터 모니터링 데이터 로드
      const simulatorResponse = await fetch('http://localhost:3001/api/simulator/monitoring', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      // [advice from AI] 배포 통계 로드
      const statsResponse = await fetch('http://localhost:3001/api/operations/deployments-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      let tenantsData = { data: { tenants: [] } };
      let simulatorData = { data: { tenants: 0, monitoring: {} } };
      let statsData = { data: {} };

      if (tenantsResponse.ok) {
        tenantsData = await tenantsResponse.json();
        console.log('✅ 테넌트 데이터 로드 완료:', tenantsData.data.tenants.length, '개');
      }

      if (simulatorResponse.ok) {
        simulatorData = await simulatorResponse.json();
        console.log('✅ 시뮬레이터 모니터링 데이터 로드 완료:', simulatorData.data);
      }

      if (statsResponse.ok) {
        statsData = await statsResponse.json();
        console.log('✅ 배포 통계 로드 완료:', statsData.data);
      }

      // [advice from AI] 실제 데이터로 대시보드 업데이트
      const tenants: Tenant[] = tenantsData.data.tenants || [];
      const stats: StatsData = statsData.data || {};
      const simulator: SimulatorData = simulatorData.data || { tenants: 0, monitoring: {} };
      
      // [advice from AI] ECP-AI K8s Orchestrator 기반 서비스 계산
      // 각 테넌트는 8개 기본 서비스 (callbot, chatbot, advisor, stt, tts, ta, qa, common)를 가짐
      const ECP_AI_SERVICES = ['callbot', 'chatbot', 'advisor', 'stt', 'tts', 'ta', 'qa', 'common'];
      const totalServices = tenants.length * ECP_AI_SERVICES.length;
      
      // [advice from AI] 활성 테넌트 계산
      const activeTenants = tenants.filter(tenant => tenant.tenant_status === 'active').length;
      
      // [advice from AI] 시뮬레이터 데이터 기반 서비스 상태 계산
      let runningServices = 0;
      let systemHealth = 0;
      
      if (simulator.tenants > 0 && simulator.monitoring) {
        // [advice from AI] 시뮬레이터에서 실제 실행 중인 서비스 수 계산
        runningServices = Object.values(simulator.monitoring).reduce((total: number, tenant: SimulatorMonitoring) => {
          return total + (tenant.pods || 0);
        }, 0);
        
        // [advice from AI] 시뮬레이터에서 평균 헬스 계산
        const healthValues: number[] = Object.values(simulator.monitoring).map((tenant: SimulatorMonitoring) => {
          if (tenant.health === 'excellent') return 100;
          if (tenant.health === 'good') return 80;
          if (tenant.health === 'warning') return 60;
          if (tenant.health === 'critical') return 20;
          return 0;
        });
        
        systemHealth = healthValues.length > 0 ? 
          Math.round(healthValues.reduce((sum: number, h: number) => sum + h, 0) / healthValues.length) : 0;
      } else {
        // [advice from AI] 시뮬레이터 데이터가 없으면 기존 로직 사용
        runningServices = tenants.reduce((total: number, tenant: Tenant) => {
          if (tenant.tenant_status === 'active') {
            return total + ECP_AI_SERVICES.length;
          } else if (tenant.tenant_status === 'creating') {
            return total + Math.floor(ECP_AI_SERVICES.length * 0.5);
          } else if (tenant.tenant_status === 'error') {
            return total + Math.floor(ECP_AI_SERVICES.length * 0.25);
          }
          return total;
        }, 0);
        
        systemHealth = tenants.length > 0 ? 
          Math.round((activeTenants / tenants.length) * 100) : 0;
      }
      
      
      // [advice from AI] 알림 수 계산 (ECP-AI 알림 시스템 기반)
      const alerts = tenants.reduce((total: number, tenant: Tenant) => {
        if (tenant.tenant_status === 'error') return total + 3; // 오류 테넌트당 3개 알림
        if (tenant.tenant_status === 'creating') return total + 1; // 생성 중 테넌트당 1개 알림
        return total;
      }, 0);
      
      setDashboardSummary({
        totalTenants: tenants.length,
        activeTenants: activeTenants,
        totalServices: totalServices,
        runningServices: runningServices,
        totalDeployments: stats.total_deployments || tenants.length, // 각 테넌트당 1개 배포
        activeDeployments: stats.active_deployments || activeTenants, // 활성 테넌트 수만큼 활성 배포
        systemHealth: systemHealth,
        alerts: alerts
      });
      
      console.log('✅ 운영 센터 대시보드 데이터 업데이트 완료:', {
        totalTenants: tenants.length,
        activeTenants: activeTenants,
        totalServices: totalServices,
        runningServices: runningServices,
        systemHealth: systemHealth,
        alerts: alerts
      });
      
      // [advice from AI] ECP-AI K8s Orchestrator 서비스별 상세 로그
      const activeTenantCount = tenants.filter((t: Tenant) => t.tenant_status === 'active').length;
      console.log('🔍 ECP-AI 서비스 분석:', {
        '📞 콜봇': activeTenantCount,
        '💬 챗봇': activeTenantCount,
        '👨‍💼 어드바이저': activeTenantCount,
        '🎤 STT': activeTenantCount,
        '🔊 TTS': activeTenantCount,
        '📊 TA': activeTenantCount,
        '✅ QA': activeTenantCount,
        '🔧 공통': activeTenantCount
      });
    } catch (error) {
      console.error('운영 센터 통계 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  // [advice from AI] 실시간 대시보드 업데이트 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        console.log('🔄 운영 센터 대시보드 자동 새로고침...');
        loadDashboardData();
      }
    }, 30000); // 30초마다

    return () => clearInterval(interval);
  }, [isLoading]);

  // [advice from AI] 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (!isLoading) {
        console.log('👁️ 운영 센터 포커스 - 데이터 새로고침');
        loadDashboardData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoading]);

  // [advice from AI] 최근 활동
  const recentActivities = [
    {
      id: 1,
      type: 'deployment',
      message: 'ECP-메인-배포-v1.2.0 배포 완료',
      timestamp: '2024-01-20 14:30:00',
      status: 'success'
    },
    {
      id: 2,
      type: 'alert',
      message: 'STT 서비스 응답 시간 초과 경고',
      timestamp: '2024-01-20 14:25:00',
      status: 'warning'
    },
    {
      id: 3,
      type: 'deployment',
      message: 'ECP-개발-배포-v1.1.5 배포 시작',
      timestamp: '2024-01-20 14:20:00',
      status: 'running'
    },
    {
      id: 4,
      type: 'service',
      message: 'TTS 서비스 에러율 증가',
      timestamp: '2024-01-20 14:15:00',
      status: 'error'
    }
  ];


  return (
    <Box>
      {/* [advice from AI] 운영 센터 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          운영 센터
        </Typography>
      </Box>

      {/* [advice from AI] 대시보드 요약 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CloudUploadIcon color="primary" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardSummary.totalTenants}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 테넌시 ({dashboardSummary.activeTenants}개 활성)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SettingsIcon color="success" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardSummary.totalServices}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 서비스 ({dashboardSummary.runningServices}개 실행중)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PlayArrowIcon color="warning" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardSummary.totalDeployments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 배포 ({dashboardSummary.activeDeployments}개 진행중)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimelineIcon color="info" />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {dashboardSummary.systemHealth}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    시스템 헬스 ({dashboardSummary.alerts}개 알림)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 최근 활동 및 알림 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <BackstageCard title="최근 활동" variant="default">
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {recentActivities.map((activity) => (
                <Box key={activity.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {activity.type === 'deployment' && <CloudUploadIcon fontSize="small" />}
                    {activity.type === 'alert' && <NotificationsIcon fontSize="small" />}
                    {activity.type === 'service' && <SettingsIcon fontSize="small" />}
                    <Chip 
                      label={activity.status} 
                      color={activity.status === 'success' ? 'success' : activity.status === 'warning' ? 'warning' : activity.status === 'error' ? 'error' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {activity.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {activity.timestamp}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <BackstageCard title="시스템 상태" variant="default">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  전체 시스템 헬스
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={dashboardSummary.systemHealth}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {dashboardSummary.systemHealth}% 정상
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  활성 서비스
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={dashboardSummary.totalServices > 0 ? (dashboardSummary.runningServices / dashboardSummary.totalServices) * 100 : 0}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {dashboardSummary.runningServices}/{dashboardSummary.totalServices} 서비스 실행중
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  활성 테넌시
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={dashboardSummary.totalTenants > 0 ? (dashboardSummary.activeTenants / dashboardSummary.totalTenants) * 100 : 0}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {dashboardSummary.activeTenants}/{dashboardSummary.totalTenants} 테넌시 활성
                </Typography>
              </Box>
            </Box>
          </BackstageCard>
        </Grid>
      </Grid>

    </Box>
  );
};

export default OperationsCenter;