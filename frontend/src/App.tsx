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
import IntegratedHomeDashboard from './pages/dashboard/IntegratedHomeDashboard';
// [advice from AI] Phase 1: 카탈로그 페이지들 제거됨 - 지식 관리로 통합

// [advice from AI] 지식 등록 및 관리 페이지들 (독립 메뉴로 이동)
import KnowledgeManagement from './pages/knowledge/KnowledgeManagement';
import KnowledgeDashboard from './pages/knowledge/KnowledgeDashboard';
import AutoKnowledgeRegistration from './pages/knowledge/AutoKnowledgeRegistration';
// [advice from AI] 지식 등록 및 관리 페이지들
import DesignAssetRegistration from './pages/catalog/knowledge/DesignAssetRegistration';
import CodeComponentRegistration from './pages/catalog/knowledge/CodeComponentRegistration';
import DocumentGuideRegistration from './pages/catalog/knowledge/DocumentGuideRegistration';
import ApprovalWorkflow from './pages/catalog/knowledge/ApprovalWorkflow';
import DiagramManagement from './pages/catalog/knowledge/DiagramManagement';
import SystemManagement from './pages/knowledge/SystemManagement';
import DomainManagement from './pages/knowledge/DomainManagement';
import ProjectManagement from './pages/knowledge/ProjectManagement';
import SystemRepositoryView from './pages/systems/SystemRepositoryView';
// [advice from AI] Phase 1: 카탈로그 관련 컴포넌트들 제거됨
import SystemApprovalPending from './pages/admin/approvals/SystemApprovalPending';
import AssetApprovalPending from './pages/admin/approvals/AssetApprovalPending';
import ProjectApprovalManagement from './pages/admin/ProjectApprovalManagement';
import ExecutiveDashboard from './pages/admin/ExecutiveDashboard';
import PODashboard from './pages/po/PODashboard';
import ProgressManagement from './pages/po/ProgressManagement';
import ProgressPerformanceManagement from './pages/po/ProgressPerformanceManagement';
import ApprovedAssetsManagement from './pages/admin/approvals/ApprovedAssetsManagement';
import DiagramEditor from './pages/knowledge/DiagramEditor';
import MyPendingApprovals from './pages/knowledge/MyPendingApprovals';
import VibeStudio from './pages/VibeStudio';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import GroupManagement from './pages/admin/GroupManagement';
import PermissionManagement from './pages/admin/PermissionManagement';
import PermissionSettings from './pages/admin/PermissionSettings';
import MembersList from './pages/admin/MembersList';
import SystemSettings from './pages/admin/SystemSettings';
import LogManagement from './pages/admin/LogManagement';
import BackupRestore from './pages/admin/BackupRestore';
import NotificationSettings from './pages/admin/NotificationSettings';
import SecuritySettings from './pages/admin/SecuritySettings';
import ApiKeyManagement from './pages/admin/ApiKeyManagement';
import PEWorkspace from './pages/pe/PEWorkspace';
import QACenter from './pages/qa/QACenter';
import OperationsCenter from './pages/operations/OperationsCenter';
import CompletionChecklist from './pages/completion/CompletionChecklist';
import RoleAccounts from './pages/RoleAccounts';
import UserManagement from './pages/executive/UserManagement';
import TestLogin from './pages/TestLogin';
import PEKnowledgeManagement from './pages/pe/KnowledgeManagement';
import CodeRegistration from './pages/pe/CodeRegistration';
import MessageCenterTest from './components/notifications/MessageCenterTest';
import MessageCenter from './components/notifications/MessageCenter';
import ApprovalDashboard from './pages/approvals/ApprovalDashboard';
import ApprovalDashboardTest from './components/approvals/ApprovalDashboardTest';
import PEDashboard from './pages/pe/PEDashboard';
import QCDashboard from './pages/qc/QCDashboard';
import TaskManagement from './pages/pe/TaskManagement';
import WeeklyReports from './pages/pe/WeeklyReports';
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
// [advice from AI] 새로운 운영 센터들
import MonitoringCenter from './pages/operations/MonitoringCenter';
import InfrastructureCenter from './pages/operations/InfrastructureCenter';
import OperationsToolsCenter from './pages/operations/OperationsToolsCenter';
// [advice from AI] 통합 모니터링 센터
import IntegratedMonitoringCenter from './pages/monitoring/IntegratedMonitoringCenter';
import CatalogCenter from './pages/catalog/CatalogCenter';

// [advice from AI] 라우팅 래퍼 컴포넌트
function AppContent() {
  const { isAuthenticated, logout, checkTokenExpiration } = useJwtAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // [advice from AI] JWT 토큰은 자동으로 localStorage에서 로드됨
  // useEffect(() => {
  //   checkAuth();
  // }, [checkAuth]);

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

  // [advice from AI] 인증되지 않은 경우 기존 로그인 폼 표시
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* [advice from AI] 백스테이지IO 스타일의 메인 레이아웃 적용 */}
      <BackstageLayout title="Timbel 지식자원 플랫폼">
        <Routes>
          <Route path="/" element={<IntegratedHomeDashboard />} />
          <Route path="/monitoring" element={<IntegratedMonitoringCenter />} />
            {/* [advice from AI] Phase 1: 카탈로그 라우트를 지식 관리로 통합 리다이렉트 */}
            <Route path="/catalog" element={<Navigate to="/knowledge/dashboard" replace />} />
            <Route path="/catalog/dashboard" element={<Navigate to="/knowledge/dashboard" replace />} />
            <Route path="/catalog/domains" element={<Navigate to="/knowledge/domains" replace />} />
            <Route path="/catalog/systems" element={<Navigate to="/knowledge/systems" replace />} />
            <Route path="/catalog/design-assets" element={<Navigate to="/knowledge/design" replace />} />
            <Route path="/catalog/code-components" element={<Navigate to="/knowledge/code" replace />} />
            <Route path="/catalog/documents" element={<Navigate to="/knowledge/docs" replace />} />
            {/* [advice from AI] 지식 등록 및 관리 라우트들 (독립 메뉴로 이동) */}
            <Route path="/knowledge" element={<KnowledgeManagement />} />
            <Route path="/knowledge/dashboard" element={<KnowledgeDashboard />} />
            <Route path="/knowledge/auto-registration" element={<AutoKnowledgeRegistration />} />
            <Route path="/knowledge/domains" element={<DomainManagement />} />
            <Route path="/knowledge/projects" element={<ProjectManagement />} />
            <Route path="/knowledge/systems" element={<SystemManagement />} />
            <Route path="/knowledge/design" element={<DesignAssetRegistration />} />
            <Route path="/knowledge/code" element={<CodeComponentRegistration />} />
            <Route path="/knowledge/docs" element={<DocumentGuideRegistration />} />
              <Route path="/knowledge/diagram-editor" element={<DiagramEditor />} />
              <Route path="/knowledge/my-approvals" element={<MyPendingApprovals />} />
            
            {/* 시스템 상세 뷰 */}
            <Route path="/systems/:systemId" element={<SystemRepositoryView />} />
            
            {/* [advice from AI] 관계 시각화는 지식 관리 내부 탭으로 통합 예정 */}
            <Route path="/catalog/relationships" element={<Navigate to="/knowledge/dashboard" replace />} />
            
            {/* 메시지 센터 라우트 */}
            <Route path="/message-center" element={<MessageCenter />} />
            
            {/* 관리자 승인 관리 라우트 - 메시지 센터로 통합 */}
            <Route path="/admin/approvals/dashboard" element={<Navigate to="/message-center" replace />} />
            <Route path="/admin/approvals/systems-pending" element={<SystemApprovalPending />} />
            <Route path="/admin/approvals/assets-pending" element={<AssetApprovalPending />} />
            <Route path="/admin/approvals/approved-assets" element={<ApprovedAssetsManagement />} />
            <Route path="/admin/approvals" element={<ProjectApprovalManagement />} />
            <Route path="/admin/approvals/projects" element={<ProjectApprovalManagement />} />
            
            {/* PO 전용 라우트 */}
            <Route path="/po-dashboard" element={<PODashboard />} />
            <Route path="/po/progress" element={<ProgressPerformanceManagement />} />
            
            {/* QC/QA 전용 라우트 */}
            <Route path="/qc-dashboard" element={<QCDashboard />} />
          <Route path="/vibe-studio" element={<VibeStudio />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/members" element={<MembersList />} />
          <Route path="/admin/groups" element={<GroupManagement />} />
          <Route path="/admin/permissions" element={<PermissionSettings />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
          <Route path="/admin/security" element={<SecuritySettings />} />
          <Route path="/admin/api-keys" element={<ApiKeyManagement />} />
          <Route path="/admin/logs" element={<LogManagement />} />
          <Route path="/admin/backup" element={<BackupRestore />} />
          <Route path="/admin/notifications" element={<NotificationSettings />} />
          {/* [advice from AI] PO-PE-QA-운영팀 구조 역할별 대시보드 라우트 */}
          <Route path="/pe-workspace" element={<PEWorkspace />} />
          <Route path="/completion" element={<CompletionChecklist />} />
          <Route path="/qa-center" element={<QACenter />} />
          <Route path="/operations" element={<OperationsCenter />} />
          {/* [advice from AI] 운영센터 통합 라우트 */}
          <Route path="/operations/tenant-center" element={<TenantManagementCenter />} />
          <Route path="/operations/cicd-services" element={<CICDServiceCenter />} />
          {/* [advice from AI] 새로운 운영 센터들 */}
          <Route path="/operations/monitoring-center" element={<MonitoringCenter />} />
          <Route path="/operations/infrastructure-center" element={<InfrastructureCenter />} />
          <Route path="/operations/tools-center" element={<OperationsToolsCenter />} />
          {/* [advice from AI] 통합 모니터링 센터 */}
          <Route path="/monitoring" element={<IntegratedMonitoringCenter />} />
          
          {/* [advice from AI] PE 작업공간 하위 기능들 */}
          <Route path="/pe-workspace/reports" element={<WeeklyReports />} />
          
          {/* [advice from AI] 제거된 PE 기능들을 적절한 곳으로 리다이렉트 */}
          <Route path="/pe-workspace/dashboard" element={<Navigate to="/pe-workspace" replace />} />
          <Route path="/pe-workspace/tasks" element={<Navigate to="/pe-workspace" replace />} />
          <Route path="/pe-workspace/knowledge" element={<Navigate to="/catalog/knowledge" replace />} />
          <Route path="/pe-workspace/code-registration" element={<Navigate to="/catalog/knowledge/code" replace />} />
          
          {/* [advice from AI] 기존 분리된 라우트들 → 통합 센터로 리다이렉트 */}
          <Route path="/operations/deployment-wizard" element={<Navigate to="/operations/tenant-center?tab=1" replace />} />
          <Route path="/operations/multi-tenant" element={<Navigate to="/operations/tools-center?tab=2" replace />} />
          <Route path="/operations/tenant-mgmt" element={<Navigate to="/operations/tenant-center?tab=3" replace />} />
          <Route path="/operations/hardware-calc" element={<Navigate to="/operations/infrastructure-center?tab=1" replace />} />
          <Route path="/operations/service-config" element={<Navigate to="/operations/tools-center?tab=1" replace />} />
          <Route path="/operations/auto-deploy" element={<Navigate to="/operations/tools-center?tab=0" replace />} />
          <Route path="/operations/cicd" element={<CICDPage />} />
          <Route path="/operations/monitoring" element={<Navigate to="/operations/monitoring-center" replace />} />
          <Route path="/operations/infrastructure" element={<Navigate to="/operations/infrastructure-center" replace />} />
          
          {/* [advice from AI] 기존 개별 페이지들 (백워드 호환성) */}
          <Route path="/operations/monitoring-old" element={<MonitoringPage />} />
          <Route path="/operations/cicd-old" element={<CICDPage />} />
          <Route path="/operations/infrastructure-old" element={<InfrastructurePage />} />
          <Route path="/role-accounts" element={<RoleAccounts />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/test-login" element={<TestLogin />} />
          <Route path="/login-jwt" element={<LoginJWT />} />
          {/* [advice from AI] 메시지 센터 테스트 페이지 */}
          <Route path="/test/message-center" element={<MessageCenterTest />} />
          {/* [advice from AI] 승인 대시보드 */}
          <Route path="/approvals/dashboard" element={<ApprovalDashboard />} />
          <Route path="/test/approval-dashboard" element={<ApprovalDashboardTest />} />
          {/* [advice from AI] 기존 개별 PE 기능들 → PE 작업공간으로 리다이렉트 */}
          <Route path="/knowledge-management" element={<Navigate to="/pe-workspace/knowledge" replace />} />
          <Route path="/code-registration" element={<Navigate to="/pe-workspace/code-registration" replace />} />
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