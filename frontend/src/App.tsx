// [advice from AI] Timbel CICD Operator Solution - 운영센터 전용 앱 컴포넌트
// 배포 자동화 및 워크플로우 관리에 집중

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { useJwtAuthStore } from './store/jwtAuthStore';
import { backstageTheme } from './theme/backstageTheme';
import BackstageLayout from './components/layout/BackstageLayout';
import LoginForm from './components/auth/LoginForm';
import Footer from './components/common/Footer';
import ToastNotificationSystem from './components/common/ToastNotificationSystem';

// [advice from AI] 운영센터 핵심 페이지들만 import
import OperationsDashboard from './pages/operations/OperationsDashboard'; // 새로운 메인 대시보드
// import IntegratedPipelineDashboard from './pages/operations/IntegratedPipelineDashboard'; // [advice from AI] 더 이상 사용하지 않음 - PipelineSettingsManager로 교체
import OperationsCenterMain from './pages/operations/OperationsCenterMain'; // 읽기 전용 운영센터 메인
import PipelineSettingsManager from './pages/operations/PipelineSettingsManager'; // 파이프라인 설정 관리 전용
import DeploymentHistory from './pages/operations/DeploymentHistory'; // 배포 히스토리

// [advice from AI] 지식자원 카탈로그 페이지들 import
import KnowledgeCatalog from './pages/knowledge/KnowledgeCatalog';
import KnowledgeDashboard from './pages/knowledge/KnowledgeDashboard';
import DomainsPage from './pages/knowledge/DomainsPage';
import ProjectsPage from './pages/knowledge/ProjectsPage';
import SystemsPage from './pages/knowledge/SystemsPage';
import CodeComponentsPage from './pages/knowledge/CodeComponentsPage';
import DesignAssetsPage from './pages/knowledge/DesignAssetsPage';
import DocumentsPage from './pages/knowledge/DocumentsPage';

// [advice from AI] 관리자 및 최고관리자 페이지들 import
import ExecutiveDashboard from './pages/executive/ExecutiveDashboard';
import SystemManagement from './pages/admin/SystemManagement';
// [advice from AI] 실제 사용되는 운영센터 페이지들만 import
import RepositoryDeployment from './pages/operations/RepositoryDeployment';
import ComprehensiveMonitoring from './pages/operations/ComprehensiveMonitoring';
import ComprehensiveIssuesManagement from './pages/operations/ComprehensiveIssuesManagement';
import AIHardwareCalculator from './pages/operations/AIHardwareCalculator';
import ClusterManagement from './pages/operations/ClusterManagement';
import ClusterDashboard from './pages/operations/ClusterDashboard';
import SystemConfigurationCenter from './pages/admin/SystemConfigurationCenter';
import LogManagement from './pages/admin/LogManagement';
import SystemMonitoring from './pages/admin/SystemMonitoring';
import PermissionManagement from './pages/admin/PermissionManagement';
import CICDServerManagerEnhanced from './pages/operations/CICDServerManagerEnhanced';

// [advice from AI] 라우팅 래퍼 컴포넌트
function AppContent() {
  const { isAuthenticated, logout, checkTokenExpiration } = useJwtAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // [advice from AI] 토큰 만료 감지 및 자동 로그아웃
  useEffect(() => {
    if (isAuthenticated) {
      // 토큰 만료 확인
      if (checkTokenExpiration()) {
        console.log('⏰ 토큰이 만료되어 자동 로그아웃됩니다');
        return;
      }

      // 주기적으로 토큰 만료 확인 (10분마다)
      const interval = setInterval(() => {
        if (checkTokenExpiration()) {
          console.log('⏰ 주기적 토큰 만료 확인 - 자동 로그아웃');
          clearInterval(interval);
        }
      }, 10 * 60 * 1000); // 10분

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, checkTokenExpiration]);

  // [advice from AI] 로그아웃 후 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/') {
      console.log('🔒 인증되지 않음 - 로그인 페이지로 리다이렉트');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  // [advice from AI] 개발용 강제 로그아웃 (Ctrl+Shift+L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        console.log('🔒 강제 로그아웃 실행');
        logout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logout]);

  // [advice from AI] 인증되지 않은 경우 로그인 폼 표시
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* [advice from AI] 백스테이지IO 스타일의 메인 레이아웃 적용 */}
      <BackstageLayout title="Timbel CICD Operator Solution">
        <Routes>
          {/* [advice from AI] 새로운 운영 대시보드를 홈으로 사용 */}
          <Route path="/" element={<OperationsDashboard />} />
          
          {/* [advice from AI] 지식자원 카탈로그 라우트 */}
          <Route path="/knowledge" element={<KnowledgeCatalog />} />
          <Route path="/knowledge/dashboard" element={<KnowledgeDashboard />} />
          <Route path="/knowledge/domains" element={<DomainsPage />} />
          <Route path="/knowledge/projects" element={<ProjectsPage />} />
          <Route path="/knowledge/projects/:id" element={<ProjectsPage />} />
          <Route path="/knowledge/systems" element={<SystemsPage />} />
          <Route path="/knowledge/code" element={<CodeComponentsPage />} />
          <Route path="/knowledge/design" element={<DesignAssetsPage />} />
          <Route path="/knowledge/docs" element={<DocumentsPage />} />
          
          {/* [advice from AI] 최고관리자 및 시스템관리 라우트 (승인 관리 제거) */}
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/admin" element={<SystemManagement />} />
                <Route path="/admin/system-config" element={<SystemConfigurationCenter />} />
                <Route path="/admin/permissions" element={<PermissionManagement />} />
                <Route path="/admin/monitoring" element={<SystemMonitoring />} />
                <Route path="/admin/logs" element={<LogManagement />} />
          
          {/* [advice from AI] 운영 기능들 - 홈에서 직접 접근 가능하도록 경로 유지 */}
          
          {/* 배포 관리 */}
          <Route path="/operations/repository-deploy" element={<RepositoryDeployment />} />
          <Route path="/operations/deployment-history" element={<DeploymentHistory />} />
          
          {/* CI/CD 파이프라인 */}
          <Route path="/operations/pipeline" element={<PipelineSettingsManager />} />
          <Route path="/operations/pipeline-status" element={<Navigate to="/operations/pipeline" replace />} />
          <Route path="/operations/pipeline-config" element={<Navigate to="/operations/pipeline" replace />} />
          <Route path="/operations/infrastructure" element={<CICDServerManagerEnhanced />} />
          
          {/* 모니터링 & 이슈 */}
          <Route path="/operations/comprehensive-monitoring" element={<ComprehensiveMonitoring />} />
          <Route path="/operations/issues" element={<ComprehensiveIssuesManagement />} />
          
          {/* AI 지원 도구 */}
          <Route path="/operations/hardware-calculator" element={<AIHardwareCalculator />} />
          
          {/* 클러스터 관리 */}
          <Route path="/operations/cluster-dashboard" element={<ClusterDashboard />} />
          <Route path="/operations/cluster-management" element={<ClusterManagement />} />
          
          {/* [advice from AI] 운영 센터 메인 - 읽기 전용 대시보드 */}
          <Route path="/operations" element={<OperationsCenterMain />} />
          <Route path="/operations/deployment-center" element={<Navigate to="/operations/pipeline" replace />} />
          <Route path="/operations/nexus" element={<Navigate to="/operations/pipeline" replace />} />
          <Route path="/operations/argocd" element={<Navigate to="/operations/pipeline" replace />} />
          <Route path="/operations/cicd-management" element={<CICDServerManagerEnhanced />} />
          <Route path="/operations/pipeline-templates" element={<Navigate to="/operations/pipeline" replace />} />
          
          {/* [advice from AI] 기본 리다이렉트 - 모든 알 수 없는 경로는 운영센터로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BackstageLayout>

      {/* [advice from AI] 팀벨 회사 정보 푸터 */}
      <Footer />
      
      {/* [advice from AI] 전역 토스트 알림 시스템 */}
      <ToastNotificationSystem />
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={backstageTheme}>
      <CssBaseline />
      <Router 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
