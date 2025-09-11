// [advice from AI] Timbel 플랫폼 메인 앱 컴포넌트
// 백스테이지IO 디자인 시스템을 적용한 통합 대시보드 구조

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { useJwtAuthStore } from './store/jwtAuthStore';
import { backstageTheme } from './theme/backstageTheme';
import BackstageLayout from './components/layout/BackstageLayout';
import LoginForm from './components/auth/LoginForm';
import LoginJWT from './pages/LoginJWT';
import Footer from './components/common/Footer';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Projects from './pages/Projects';
import VibeStudio from './pages/VibeStudio';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import ExecutiveDashboard from './pages/executive/ExecutiveDashboard';
import PODashboard from './pages/po/PODashboard';
import PEWorkspace from './pages/pe/PEWorkspace';
import QACenter from './pages/qa/QACenter';
import OperationsCenter from './pages/operations/OperationsCenter';
import RoleAccounts from './pages/RoleAccounts';
import UserManagement from './pages/executive/UserManagement';
import TestLogin from './pages/TestLogin';
import KnowledgeManagement from './pages/pe/KnowledgeManagement';
import CodeRegistration from './pages/pe/CodeRegistration';
// [advice from AI] 운영센터 하위 메뉴 페이지들
import MultiTenantPage from './pages/operations/MultiTenantPage';
import ServiceConfigPage from './pages/operations/ServiceConfigPage';
import HardwareCalcPage from './pages/operations/HardwareCalcPage';
import TenantMgmtPage from './pages/operations/TenantMgmtPage';
import AutoDeployPage from './pages/operations/AutoDeployPage';
import MonitoringPage from './pages/operations/MonitoringPage';
import CICDPage from './pages/operations/CICDPage';
import InfrastructurePage from './pages/operations/InfrastructurePage';
import DeploymentWizard from './components/operations/DeploymentWizard';
import TenantManagementCenter from './components/operations/TenantManagementCenter';
import CICDServiceCenter from './components/operations/CICDServiceCenter';

// [advice from AI] 라우팅 래퍼 컴포넌트
function AppContent() {
  const { isAuthenticated, logout } = useJwtAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // [advice from AI] JWT 토큰은 자동으로 localStorage에서 로드됨
  // useEffect(() => {
  //   checkAuth();
  // }, [checkAuth]);

  // [advice from AI] 로그아웃 후 홈으로 리다이렉트
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/') {
      console.log('🔒 인증되지 않음 - 홈으로 리다이렉트');
      navigate('/', { replace: true });
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

  // [advice from AI] 로그인되지 않은 경우 기존 로그인 폼 표시 (JWT 로그인은 별도 페이지)
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* [advice from AI] 백스테이지IO 스타일의 메인 레이아웃 적용 */}
      <BackstageLayout title="Timbel 지식자원 플랫폼">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/vibe-studio" element={<VibeStudio />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          {/* [advice from AI] PO-PE-QA-운영팀 구조 역할별 대시보드 라우트 */}
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/po-dashboard" element={<PODashboard />} />
          <Route path="/pe-workspace" element={<PEWorkspace />} />
          <Route path="/qa-center" element={<QACenter />} />
          <Route path="/operations" element={<OperationsCenter />} />
          {/* [advice from AI] 운영센터 통합 라우트 */}
          <Route path="/operations/tenant-center" element={<TenantManagementCenter />} />
          <Route path="/operations/cicd-services" element={<CICDServiceCenter />} />
          
          {/* [advice from AI] 기존 분리된 라우트들 → 통합 센터로 리다이렉트 */}
          <Route path="/operations/deployment-wizard" element={<Navigate to="/operations/tenant-center?tab=1" replace />} />
          <Route path="/operations/multi-tenant" element={<Navigate to="/operations/tenant-center?tab=2" replace />} />
          <Route path="/operations/tenant-mgmt" element={<Navigate to="/operations/tenant-center?tab=3" replace />} />
          <Route path="/operations/hardware-calc" element={<Navigate to="/operations/tenant-center?tab=3" replace />} />
          <Route path="/operations/service-config" element={<Navigate to="/operations/cicd-services?tab=0" replace />} />
          <Route path="/operations/auto-deploy" element={<Navigate to="/operations/cicd-services?tab=2" replace />} />
          <Route path="/operations/cicd" element={<Navigate to="/operations/cicd-services?tab=1" replace />} />
          
          {/* [advice from AI] 독립적인 운영 도구들 */}
          <Route path="/operations/monitoring" element={<MonitoringPage />} />
          <Route path="/operations/cicd" element={<CICDPage />} />
          <Route path="/operations/infrastructure" element={<InfrastructurePage />} />
          <Route path="/role-accounts" element={<RoleAccounts />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/test-login" element={<TestLogin />} />
          <Route path="/login-jwt" element={<LoginJWT />} />
          <Route path="/knowledge-management" element={<KnowledgeManagement />} />
          <Route path="/code-registration" element={<CodeRegistration />} />
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
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;