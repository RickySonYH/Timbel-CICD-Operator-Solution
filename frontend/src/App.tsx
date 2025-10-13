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

// [advice from AI] 운영센터 핵심 페이지들만 import
import OperationsDashboard from './pages/operations/OperationsDashboard'; // 새로운 메인 대시보드
import PipelineStatusDashboard from './pages/operations/PipelineStatusDashboard'; // 파이프라인 현황 통합
import DeploymentRequestManagement from './pages/operations/DeploymentRequestManagement'; // 배포 요청 처리
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
import ApprovalManagement from './pages/admin/ApprovalManagement';
import SLAManagement from './pages/operations/SLAManagement';
import RepositoryDeployment from './pages/operations/RepositoryDeployment';
import NexusManagement from './pages/operations/NexusManagement';
import ArgoCDManagement from './pages/operations/ArgoCDManagement';
import ComprehensiveMonitoring from './pages/operations/ComprehensiveMonitoring';
import ComprehensiveIssuesManagement from './pages/operations/ComprehensiveIssuesManagement';
import ProcessOptimizedOperationsCenter from './pages/operations/ProcessOptimizedOperationsCenter';
import AIHardwareCalculator from './pages/operations/AIHardwareCalculator';
import OperationsCenter from './pages/operations/OperationsCenter';
import CICDServerManagerEnhanced from './pages/operations/CICDServerManagerEnhanced';
import PipelineConfigCenter from './pages/operations/PipelineConfigCenter';
import BuildMonitoringCenter from './pages/operations/BuildMonitoringCenter';
import DeploymentExecutionCenter from './pages/operations/DeploymentExecutionCenter';
import PerformanceMonitoringCenter from './pages/operations/PerformanceMonitoringCenter';
import IntegratedDeploymentCenter from './pages/operations/IntegratedDeploymentCenter';
import MonitoringCenter from './pages/operations/MonitoringCenter';
import InfrastructureCenter from './pages/operations/InfrastructureCenter';
import OperationsToolsCenter from './pages/operations/OperationsToolsCenter';
import MultiTenantPage from './pages/operations/MultiTenantPage';
import ServiceConfigPage from './pages/operations/ServiceConfigPage';
import HardwareCalcPage from './pages/operations/HardwareCalcPage';
import TenantMgmtPage from './pages/operations/TenantMgmtPage';
import AutoDeployPage from './pages/operations/AutoDeployPage';
import MonitoringPage from './pages/operations/MonitoringPage';
import CICDPage from './pages/operations/CICDPage';
import InfrastructurePage from './pages/operations/InfrastructurePage';

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
          
          {/* [advice from AI] 최고관리자 및 시스템관리 라우트 */}
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/admin" element={<SystemManagement />} />
          <Route path="/admin/approvals" element={<ApprovalManagement />} />
          <Route path="/admin/approvals/systems-pending" element={<ApprovalManagement />} />
          <Route path="/admin/approvals/assets-pending" element={<ApprovalManagement />} />
          <Route path="/admin/approvals/approved-assets" element={<ApprovalManagement />} />
          <Route path="/admin/approvals/history" element={<ApprovalManagement />} />
          
          {/* [advice from AI] 운영센터 핵심 라우트 */}
          {/* [advice from AI] 운영센터 - 재구성된 프로세스 기반 메뉴 */}
          
          {/* 운영 센터 메인 */}
          <Route path="/operations" element={<OperationsDashboard />} />
          
          {/* 배포 관리 */}
          <Route path="/operations/deployment-requests" element={<DeploymentRequestManagement />} />
          <Route path="/operations/repository-deploy" element={<RepositoryDeployment />} />
          <Route path="/operations/deployment-history" element={<DeploymentHistory />} />
          
          {/* CI/CD 파이프라인 */}
          <Route path="/operations/pipeline-status" element={<PipelineStatusDashboard />} />
          <Route path="/operations/pipeline-config" element={<PipelineConfigCenter />} />
          <Route path="/operations/infrastructure" element={<CICDServerManagerEnhanced />} />
          
          {/* 모니터링 & 이슈 */}
          <Route path="/operations/comprehensive-monitoring" element={<ComprehensiveMonitoring />} />
          <Route path="/operations/issues" element={<ComprehensiveIssuesManagement />} />
          
          {/* AI 지원 도구 */}
          <Route path="/operations/hardware-calculator" element={<AIHardwareCalculator />} />
          
          {/* [advice from AI] 백워드 호환성을 위한 기존 경로 유지 */}
          <Route path="/operations/deployment-center" element={<DeploymentRequestManagement />} />
          <Route path="/operations/nexus" element={<PipelineStatusDashboard />} />
          <Route path="/operations/argocd" element={<PipelineStatusDashboard />} />
          <Route path="/operations/cicd-management" element={<CICDServerManagerEnhanced />} />
          <Route path="/operations/pipeline-templates" element={<PipelineConfigCenter />} />
          
          {/* [advice from AI] 기본 리다이렉트 - 모든 알 수 없는 경로는 운영센터로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BackstageLayout>

      {/* [advice from AI] 팀벨 회사 정보 푸터 */}
      <Footer />
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
