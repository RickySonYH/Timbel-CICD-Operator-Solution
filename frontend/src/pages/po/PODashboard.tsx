// [advice from AI] PO 대시보드 메인 페이지

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Tooltip, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

// [advice from AI] 대시보드 데이터 인터페이스
interface PODashboardData {
  project_summary: {
    total_projects: number;
    approved_projects: number;
    assigned_projects: number;
    completed_projects: number;
    overdue_projects: number;
  };
  pe_workload: Array<{
    pe_id: string;
    pe_name: string;
    total_assignments: number;
    active_assignments: number;
    completed_assignments: number;
    avg_progress: number;
    current_workload_hours: number;
    git_activity?: {
      commits_last_7_days: number;
      commits_last_30_days: number;
      last_commit_date: string;
      activity_score: number;
      repository_count: number;
    };
  }>;
  recent_activities: Array<{
  id: string;
    type: string;
    title: string;
    description: string;
    created_at: string;
    project_name?: string;
    pe_name?: string;
  }>;
  urgent_items: Array<{
  id: string;
    type: 'deadline' | 'overdue' | 'blocked';
  title: string;
    description: string;
    deadline?: string;
  project_name: string;
  }>;
}

const PODashboard: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  const navigate = useNavigate();
  
  // 상태 관리
  const [dashboardData, setDashboardData] = useState<PODashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // [advice from AI] 프로젝트 리스트 다이얼로그 상태 (최고관리자 대시보드와 동일)
  const [projectListDialog, setProjectListDialog] = useState(false);
  const [projectListTitle, setProjectListTitle] = useState('');
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // [advice from AI] 프로젝트 관리 상태
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  // [advice from AI] PE 관리 관련 상태
  const [availablePEs, setAvailablePEs] = useState<any[]>([]);
  
  // QC/QA 승인 완료 알림 및 시스템 등록 결정 상태
  const [qcApprovalNotifications, setQcApprovalNotifications] = useState<any[]>([]);
  const [systemRegistrationDialog, setSystemRegistrationDialog] = useState(false);
  const [selectedApprovalNotification, setSelectedApprovalNotification] = useState<any>(null);
  const [systemRegistrationDecision, setSystemRegistrationDecision] = useState({
    decision: 'approve', // approve, reject, defer
    registration_notes: '',
    deployment_priority: 'normal', // high, normal, low
    target_environment: 'production' // production, staging, development
  });
  const [submittingDecision, setSubmittingDecision] = useState(false);
  
  // QC/QA 진행 현황 상태
  const [qcProgressData, setQcProgressData] = useState<any[]>([]);
  const [qcProgressDialog, setQcProgressDialog] = useState(false);
  const [selectedQcRequest, setSelectedQcRequest] = useState<any>(null);
  
  // PE 성과 분석 상태
  const [pePerformanceData, setPePerformanceData] = useState<any>(null);
  const [performanceAnalyticsDialog, setPerformanceAnalyticsDialog] = useState(false);
  
  // 업무 부하 분산 상태
  const [workloadDistributionData, setWorkloadDistributionData] = useState<any>(null);
  const [workloadAnalyticsDialog, setWorkloadAnalyticsDialog] = useState(false);
  const [loadingPEs, setLoadingPEs] = useState(false);
  
  // 프로젝트 리스크 분석 상태
  const [riskAnalytics, setRiskAnalytics] = useState<any>(null);
  const [loadingRiskAnalytics, setLoadingRiskAnalytics] = useState(false);
  const [riskAnalysisDialog, setRiskAnalysisDialog] = useState(false);
  
  // [advice from AI] 통합 설정 다이얼로그 상태
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [settingsTab, setSettingsTab] = useState('pe_assignment'); // 'pe_assignment', 'project_edit', 'status_change'
  const [newAssignedPE, setNewAssignedPE] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  // [advice from AI] API URL 결정 (수정됨)
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    console.log('🌐 현재 호스트:', currentHost);
    
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      console.log('🏠 로컬 환경 - 직접 백엔드 포트 사용');
      return 'http://localhost:3001';
    } else {
      console.log('🌍 외부 환경 - 포트 3001 사용');
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };

  // QC/QA 승인 완료 알림 로드 (승인 완료된 것만)
  const loadQcApprovalNotifications = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/notifications?type=qc_approval_notification&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // QC/QA 검증이 승인 완료된 것만 필터링
        const approvedNotifications = (data.data || []).filter((notification: any) => {
          const metadata = notification.metadata || {};
          return metadata.requires_decision === true && metadata.decision_type === 'system_registration';
        });
        
        setQcApprovalNotifications(approvedNotifications);
        console.log('✅ QC/QA 승인 완료 알림 로드 완료:', approvedNotifications.length, '건');
      } else {
        console.error('❌ QC/QA 승인 알림 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ QC/QA 승인 알림 로드 중 오류:', error);
    }
  };

  // QC/QA 진행 현황 로드
  const loadQcProgressData = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/qc/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQcProgressData(data.data || []);
        console.log('✅ QC/QA 진행 현황 로드 완료:', data.data?.length || 0, '건');
      } else {
        console.error('❌ QC/QA 진행 현황 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ QC/QA 진행 현황 로드 중 오류:', error);
    }
  };

  // QC/QA 상세 정보 다이얼로그 열기
  const handleOpenQcProgressDialog = (qcRequest: any) => {
    setSelectedQcRequest(qcRequest);
    setQcProgressDialog(true);
  };

  // PE 성과 분석 데이터 로딩
  const loadPePerformanceAnalytics = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/po/pe-performance-analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPePerformanceData(result.data);
          console.log('✅ PE 성과 분석 데이터 로딩 완료:', result.data);
        }
      }
    } catch (error) {
      console.error('❌ PE 성과 분석 로딩 실패:', error);
    }
  };

  // 업무 부하 분산 분석 데이터 로딩
  const loadWorkloadDistributionAnalytics = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/po/workload-distribution-analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWorkloadDistributionData(result.data);
          console.log('✅ 업무 부하 분산 분석 데이터 로딩 완료:', result.data);
        }
      }
    } catch (error) {
      console.error('❌ 업무 부하 분산 분석 로딩 실패:', error);
    }
  };

  // 프로젝트 리스크 분석 데이터 로딩
  const loadProjectRiskAnalytics = async () => {
    setLoadingRiskAnalytics(true);
    try {
      console.log('🔍 프로젝트 리스크 분석 로드 시작...');
      
      const response = await fetch(`${getApiUrl()}/api/po/project-risk-analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRiskAnalytics(result.data);
          console.log('✅ 프로젝트 리스크 분석 로드 완료:', result.data);
        }
      } else {
        console.error('❌ 프로젝트 리스크 분석 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 프로젝트 리스크 분석 로드 오류:', error);
    } finally {
      setLoadingRiskAnalytics(false);
    }
  };

  // 시스템 등록 결정 다이얼로그 열기
  const handleOpenSystemRegistrationDialog = (notification: any) => {
    setSelectedApprovalNotification(notification);
    setSystemRegistrationDecision({
      decision: 'approve',
      registration_notes: `${notification.project_name || '프로젝트'}의 QC/QA 검증이 완료되어 시스템 등록을 승인합니다.`,
      deployment_priority: 'normal',
      target_environment: 'production'
    });
    setSystemRegistrationDialog(true);
  };

  // 시스템 등록 결정 처리
  const handleSystemRegistrationDecision = async () => {
    if (!selectedApprovalNotification) return;
    
    try {
      setSubmittingDecision(true);
      
      const response = await fetch(`${getApiUrl()}/api/po/system-registration-decision`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_id: selectedApprovalNotification.id,
          project_id: selectedApprovalNotification.related_project_id,
          qc_request_id: selectedApprovalNotification.metadata?.qc_request_id,
          ...systemRegistrationDecision
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`시스템 등록 결정이 완료되었습니다!\n\n` +
              `프로젝트: ${selectedApprovalNotification.project_name || '알 수 없음'}\n` +
              `결정: ${systemRegistrationDecision.decision === 'approve' ? '승인' : 
                      systemRegistrationDecision.decision === 'reject' ? '반려' : '보류'}\n\n` +
              `${systemRegistrationDecision.decision === 'approve' ? 
                '관리자에게 시스템 등록 승인 요청이 전송되었습니다.' : 
                '결정 사유가 관련 담당자에게 전달되었습니다.'}`);
        
        setSystemRegistrationDialog(false);
        setSelectedApprovalNotification(null);
        setSystemRegistrationDecision({
          decision: 'approve',
          registration_notes: '',
          deployment_priority: 'normal',
          target_environment: 'production'
        });
        
        // 알림 목록 새로고침
        loadQcApprovalNotifications();
        
        console.log('✅ 시스템 등록 결정 완료:', result);
      } else {
        const error = await response.json();
        alert(`시스템 등록 결정 실패: ${error.message || '알 수 없는 오류'}`);
        console.error('❌ 시스템 등록 결정 실패:', error);
      }
    } catch (error) {
      console.error('❌ 시스템 등록 결정 중 오류:', error);
      alert('시스템 등록 결정 중 오류가 발생했습니다.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // [advice from AI] 대시보드 데이터 조회 (디버깅 강화)
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(''); // 이전 에러 초기화
      console.log('📊 PO 대시보드 데이터 조회 시작...');
      
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/po/dashboard-stats`;
      
      console.log('🔗 API 호출 URL:', fullUrl);
      console.log('🔑 사용자 토큰 존재:', !!token);
      console.log('👤 사용자 정보:', user);
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 API 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('📄 API 응답 데이터:', result);
        
        if (result.success) {
          setDashboardData(result.data);
          console.log('✅ PO 대시보드 데이터 로드 완료:', result.data);
        } else {
          console.error('❌ API 응답 실패:', result);
          setError(result.message || '대시보드 데이터를 불러올 수 없습니다');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ HTTP 오류:', response.status, errorText);
        setError(`서버 오류: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ PO 대시보드 데이터 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 카드 클릭 핸들러 - 프로젝트 리스트 다이얼로그 열기 (PO 권한)
  const handleCardClick = async (cardType: string) => {
    console.log('🔍 PO 카드 클릭:', cardType);
    
    let title = '';
    let statusFilter = '';
    
    switch (cardType) {
      case 'approved':
        title = '승인된 프로젝트 (할당 대기)';
        statusFilter = 'approved_waiting_assignment';
        break;
      case 'assigned':
        title = '할당된 프로젝트';
        statusFilter = 'assigned';
        break;
      case 'in_progress':
        title = '진행 중인 프로젝트';
        statusFilter = 'in_progress';
        break;
      case 'completed':
        title = '완료된 프로젝트';
        statusFilter = 'completed';
        break;
      case 'overdue':
        title = '지연된 프로젝트';
        statusFilter = 'overdue';
        break;
      default:
        title = '전체 프로젝트';
        statusFilter = 'all';
    }
    
    setProjectListTitle(title);
    setProjectListDialog(true);
    await loadProjectList(statusFilter);
  };

  // [advice from AI] 프로젝트 리스트 로드 (PO 권한)
  const loadProjectList = async (filterType: string) => {
    try {
      setLoadingProjects(true);
      const apiUrl = getApiUrl();
      
      let endpoint = '/api/admin/approvals/projects';
      let params = '';
      
      switch (filterType) {
        case 'approved_waiting_assignment':
          params = '?status=approved';
          break;
        case 'assigned':
          params = '?status=assigned';
          break;
        case 'in_progress':
          params = '?status=in_progress';
          break;
        case 'completed':
          params = '?status=completed';
          break;
        case 'overdue':
          params = '?overdue=true';
          break;
        default:
          params = '';
      }
      
      const response = await fetch(`${apiUrl}${endpoint}${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProjectList(result.data || []);
        } else {
          console.error('PO 프로젝트 리스트 로드 실패:', result.message);
          setProjectList([]);
        }
      } else {
        console.error('PO 프로젝트 리스트 API 호출 실패:', response.status);
        setProjectList([]);
      }
    } catch (error) {
      console.error('PO 프로젝트 리스트 로드 오류:', error);
      setProjectList([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // [advice from AI] PE 목록 로드
  const loadAvailablePEs = async () => {
    try {
      setLoadingPEs(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/projects/list/users/pe`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvailablePEs(result.data || []);
        } else {
          console.error('PE 목록 로드 실패:', result.message);
          setAvailablePEs([]);
        }
      }
    } catch (error) {
      console.error('PE 목록 로드 오류:', error);
      setAvailablePEs([]);
    } finally {
      setLoadingPEs(false);
    }
  };


  // [advice from AI] 통합 설정 다이얼로그 열기
  const openSettingsDialog = (project: any) => {
    setSelectedProject(project);
    setNewAssignedPE('');
    setAssignmentReason('');
    
    // 기본 탭 설정
    if (!project.assigned_pe_name) {
      setSettingsTab('pe_assignment'); // PE 할당
    } else {
      setSettingsTab('pe_assignment'); // PE 재할당
    }
    
    loadAvailablePEs();
    setSettingsDialog(true);
  };

  // [advice from AI] PE 할당/재할당 처리 (통합됨)
  const handlePEAssignment = async () => {
    if (!selectedProject || !newAssignedPE || !assignmentReason.trim()) return;

    try {
      setSettingsSubmitting(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/admin/approvals/projects/${selectedProject.project_id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_status: selectedProject.approval_status || 'approved',
          project_status: 'in_progress',
          change_reason: assignmentReason,
          action_type: selectedProject.assigned_pe_name ? 'reassign_pe' : 'assign_pe',
          new_assignee_id: newAssignedPE
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ PE 할당/재할당 완료:', result.message);
          setSettingsDialog(false);
          setAssignmentReason('');
          setNewAssignedPE('');
          // 프로젝트 리스트 새로고침
          await loadProjectList('all');
          // 대시보드 데이터 새로고침
          await fetchDashboardData();
        } else {
          setError(result.message || 'PE 할당에 실패했습니다');
        }
      } else {
        const errorText = await response.text();
        setError(`PE 할당 실패: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ PE 할당 실패:', err);
      setError(err instanceof Error ? err.message : 'PE 할당 중 오류가 발생했습니다');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // [advice from AI] PE 할당 처리 (PO 권한) - 기존 함수
  const handleAssignPE = async (peId: string, reason: string) => {
    if (!selectedProject) return;

    try {
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/admin/approvals/projects/${selectedProject.project_id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_status: selectedProject.approval_status,
          project_status: 'in_progress',
          change_reason: reason,
          action_type: 'assign_pe',
          new_assignee_id: peId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ PE 할당 완료:', result.message);
          // 프로젝트 리스트 새로고침
          await loadProjectList('all');
          // 대시보드 데이터 새로고침
          await fetchDashboardData();
        } else {
          setError(result.message || 'PE 할당에 실패했습니다');
        }
      }
    } catch (err) {
      console.error('❌ PE 할당 실패:', err);
      setError(err instanceof Error ? err.message : 'PE 할당 중 오류가 발생했습니다');
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드 (admin 계정도 포함)
  useEffect(() => {
    console.log('🔄 useEffect 실행:', { token: !!token, userRoleType: user?.roleType });
    
    if (token && user && (user.roleType === 'po' || user.roleType === 'admin' || user.roleType === 'executive')) {
      console.log('✅ PO 대시보드 로딩 조건 만족 - API 호출 시작');
      fetchDashboardData();
      loadQcApprovalNotifications();
      loadQcProgressData();
      loadPePerformanceAnalytics();
      loadWorkloadDistributionAnalytics();
      loadProjectRiskAnalytics();
      
      // 주기적 데이터 새로고침 (30초마다)
      const interval = setInterval(() => {
        fetchDashboardData();
        loadQcApprovalNotifications();
        loadQcProgressData();
        loadPePerformanceAnalytics();
        loadWorkloadDistributionAnalytics();
        loadProjectRiskAnalytics();
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      console.log('❌ PO 대시보드 로딩 조건 불만족:', {
        hasToken: !!token,
        hasUser: !!user,
        userRoleType: user?.roleType,
        allowedRoles: ['po', 'admin', 'executive']
      });
    }
  }, [token, user]);

  // 진행률 색상 반환
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'info';
    if (progress >= 40) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
      </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          PO 대시보드
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, lineHeight: 1.6 }}>
          프로젝트 진행 현황과 PE 작업 분배를 실시간으로 모니터링하고 관리합니다
        </Typography>
      </Box>

      {dashboardData ? (
        <>
          {/* 주요 지표 카드 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('total')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {dashboardData.project_summary.total_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                    전체 프로젝트
                  </Typography>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
                        클릭하여 관리
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
            
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('approved')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {dashboardData.project_summary.approved_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        승인된 프로젝트
                  </Typography>
                      <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>
                        클릭하여 PE 할당
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
            
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('in_progress')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                        {dashboardData.project_summary.assigned_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        진행 중
                  </Typography>
                      <Typography variant="caption" color="info.main" sx={{ fontWeight: 500 }}>
                        클릭하여 관리
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
            
        <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick('overdue')}
              >
            <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {dashboardData.project_summary.overdue_projects}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        지연 위험
                  </Typography>
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 500 }}>
                        클릭하여 관리
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

          {/* QC/QA 승인 완료 알림 섹션 */}
          {qcApprovalNotifications.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Card sx={{ backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#e65100' }}>
                      QC/QA 검증 승인 완료 - 프로젝트 최종 보고서 작성 필요
                      <Chip 
                        label={`${qcApprovalNotifications.length}건`} 
                        size="small" 
                        color="warning" 
                      />
                    </Typography>
                    
                    <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                      {qcApprovalNotifications.map((notification, index) => (
                        <Card key={notification.id || index} sx={{ mb: 2, border: '1px solid #ffcc02' }}>
                          <CardContent sx={{ py: 2 }}>
                            <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                  {notification.title || 'QC/QA 검증 승인 완료'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  {notification.message || notification.content || '검증 완료 보고서와 함께 승인되었습니다.'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {notification.created_at ? new Date(notification.created_at).toLocaleString() : '방금 전'}
                                </Typography>
                                {notification.metadata?.quality_score && (
                                  <Chip 
                                    label={`품질 점수: ${notification.metadata.quality_score}점`} 
                                    size="small" 
                                    color="success" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Grid>
                              <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleOpenSystemRegistrationDialog(notification)}
                                  sx={{
                                    backgroundColor: '#2e7d32',
                                    '&:hover': {
                                      backgroundColor: '#1b5e20'
                                    },
                                    fontWeight: 'bold'
                                  }}
                                >
                                  프로젝트 최종 보고서 생성
                                </Button>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* QC/QA 진행 현황 섹션 */}
          {qcProgressData.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      QC/QA 검증 진행 현황
                      <Chip 
                        label={`${qcProgressData.length}건`} 
                        size="small" 
                        color="info" 
                      />
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>프로젝트명</TableCell>
                            <TableCell>담당자</TableCell>
                            <TableCell>상태</TableCell>
                            <TableCell>테스트 진행률</TableCell>
                            <TableCell>품질 점수</TableCell>
                            <TableCell>우선순위</TableCell>
                            <TableCell>생성일</TableCell>
                            <TableCell>액션</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {qcProgressData.map((qcRequest) => (
                            <TableRow key={qcRequest.id} hover>
                              <TableCell>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {qcRequest.project_name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {qcRequest.assigned_to_name || '미할당'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={
                                    qcRequest.request_status === 'pending' ? '대기 중' :
                                    qcRequest.request_status === 'in_progress' ? '진행 중' :
                                    qcRequest.request_status === 'completed' ? '완료' : qcRequest.request_status
                                  }
                                  size="small"
                                  color={
                                    qcRequest.request_status === 'pending' ? 'default' :
                                    qcRequest.request_status === 'in_progress' ? 'primary' :
                                    qcRequest.request_status === 'completed' ? 'success' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={qcRequest.test_progress_percentage || 0}
                                    sx={{ width: 80, height: 8, borderRadius: 4 }}
                                  />
                                  <Typography variant="caption">
                                    {qcRequest.test_progress_percentage || 0}%
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {qcRequest.quality_score ? `${qcRequest.quality_score}점` : '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={
                                    qcRequest.priority_level === 'high' ? '높음' :
                                    qcRequest.priority_level === 'normal' ? '보통' : '낮음'
                                  }
                                  size="small"
                                  color={
                                    qcRequest.priority_level === 'high' ? 'error' :
                                    qcRequest.priority_level === 'normal' ? 'warning' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(qcRequest.created_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleOpenQcProgressDialog(qcRequest)}
                                >
                                  상세보기
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* PE 성과 분석 및 업무 부하 분산 모니터링 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    📊 PE 성과 분석
                    <Chip 
                      label={pePerformanceData?.pe_performance?.length || 0} 
                      size="small" 
                      color="primary" 
                    />
                  </Typography>
                  
                  {!pePerformanceData?.pe_performance || pePerformanceData.pe_performance.length === 0 ? (
                    <Alert severity="info">
                      PE 성과 데이터를 로딩 중입니다...
                    </Alert>
                  ) : (
                    <Box>
                      {/* 팀 벤치마크 요약 */}
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          팀 평균 성과
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">완료율</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {pePerformanceData.team_benchmark?.team_avg_completion_rate?.toFixed(1) || 0}%
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">품질점수</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {pePerformanceData.team_benchmark?.team_avg_quality_score?.toFixed(1) || 0}점
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* 상위 성과자 목록 */}
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>PE</TableCell>
                              <TableCell align="center">등급</TableCell>
                              <TableCell align="center">완료율</TableCell>
                              <TableCell align="center">품질점수</TableCell>
                              <TableCell align="center">트렌드</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pePerformanceData.pe_performance.slice(0, 5).map((pe: any) => (
                              <TableRow key={pe.pe_id} hover>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    color="primary"
                                    onClick={() => navigate(`/pe-workspace?peId=${pe.pe_id}&peName=${encodeURIComponent(pe.pe_name)}`)}
                                    sx={{ 
                                      textTransform: 'none',
                                      fontWeight: 600,
                                      p: 0,
                                      minWidth: 'auto'
                                    }}
                                  >
                                    {pe.pe_name}
                                  </Button>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={pe.performance_grade}
                                    size="small"
                                    color={
                                      pe.performance_grade === 'S' ? 'success' :
                                      pe.performance_grade === 'A' ? 'info' :
                                      pe.performance_grade === 'B' ? 'warning' : 'default'
                                    }
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {pe.completion_rate?.toFixed(1) || 0}%
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {pe.avg_quality_score?.toFixed(1) || 0}점
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Chip
                                      label={pe.productivity_trend === 'up' ? '↗' : pe.productivity_trend === 'down' ? '↘' : '→'}
                                      size="small"
                                      color={pe.productivity_trend === 'up' ? 'success' : pe.productivity_trend === 'down' ? 'error' : 'default'}
                                      variant="outlined"
                                    />
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setPerformanceAnalyticsDialog(true)}
                        >
                          상세 분석 보기
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    ⚖️ 업무 부하 분산
                    <Chip 
                      label={workloadDistributionData?.workload_analysis?.length || 0} 
                      size="small" 
                      color="secondary" 
                    />
                  </Typography>
                  
                  {!workloadDistributionData?.workload_analysis || workloadDistributionData.workload_analysis.length === 0 ? (
                    <Alert severity="info">
                      업무 부하 데이터를 로딩 중입니다...
                    </Alert>
                  ) : (
                    <Box>
                      {/* 워크로드 상태별 요약 */}
                      <Box sx={{ mb: 3 }}>
                        <Grid container spacing={1}>
                          {['overloaded', 'busy', 'balanced', 'light', 'available'].map((status) => {
                            const count = workloadDistributionData.workload_analysis.filter((pe: any) => pe.workload_status === status).length;
                            const statusLabels = {
                              overloaded: '과부하',
                              busy: '바쁨',
                              balanced: '적정',
                              light: '여유',
                              available: '가능'
                            };
                            const statusColors = {
                              overloaded: 'error',
                              busy: 'warning',
                              balanced: 'success',
                              light: 'info',
                              available: 'default'
                            };
                            return (
                              <Grid item key={status}>
                                <Chip
                                  label={`${statusLabels[status as keyof typeof statusLabels]} ${count}`}
                                  size="small"
                                  color={statusColors[status as keyof typeof statusColors] as any}
                                  variant="outlined"
                                />
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>

                      {/* 워크로드 상위 PE 목록 */}
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>PE</TableCell>
                              <TableCell align="center">상태</TableCell>
                              <TableCell align="center">진행중</TableCell>
                              <TableCell align="center">점수</TableCell>
                              <TableCell align="center">권장사항</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {workloadDistributionData.workload_analysis.slice(0, 5).map((pe: any) => (
                              <TableRow key={pe.pe_id} hover>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    color="primary"
                                    onClick={() => navigate(`/pe-workspace?peId=${pe.pe_id}&peName=${encodeURIComponent(pe.pe_name)}`)}
                                    sx={{ 
                                      textTransform: 'none',
                                      fontWeight: 600,
                                      p: 0,
                                      minWidth: 'auto'
                                    }}
                                  >
                                    {pe.pe_name}
                                  </Button>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={
                                      pe.workload_status === 'overloaded' ? '과부하' :
                                      pe.workload_status === 'busy' ? '바쁨' :
                                      pe.workload_status === 'balanced' ? '적정' :
                                      pe.workload_status === 'light' ? '여유' : '가능'
                                    }
                                    size="small"
                                    color={
                                      pe.workload_status === 'overloaded' ? 'error' :
                                      pe.workload_status === 'busy' ? 'warning' :
                                      pe.workload_status === 'balanced' ? 'success' :
                                      pe.workload_status === 'light' ? 'info' : 'default'
                                    }
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {pe.active_projects}개
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {pe.workload_score || 0}점
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="caption" color="text.secondary">
                                    {
                                      pe.recommendation === 'redistribute_urgent' ? '재분배 필요' :
                                      pe.recommendation === 'monitor_closely' ? '모니터링' :
                                      pe.recommendation === 'optimal_load' ? '최적' :
                                      pe.recommendation === 'can_take_more' ? '추가 가능' : '할당 필요'
                                    }
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setWorkloadAnalyticsDialog(true)}
                        >
                          상세 분석 보기
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 프로젝트 리스크 분석 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🚨 프로젝트 리스크 분석
                    <Chip 
                      label={riskAnalytics?.risk_projects?.length || 0} 
                      size="small" 
                      color="warning" 
                    />
                  </Typography>
                  
                  {loadingRiskAnalytics ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : !riskAnalytics?.risk_projects || riskAnalytics.risk_projects.length === 0 ? (
                    <Alert severity="success">
                      현재 리스크가 감지된 프로젝트가 없습니다.
                    </Alert>
                  ) : (
                    <Box>
                      {/* 리스크 요약 */}
                      <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                          리스크 요약
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={2}>
                            <Typography variant="caption" color="text.secondary">전체</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {riskAnalytics.risk_summary?.total_projects || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="caption" color="error.main">위험</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                              {riskAnalytics.risk_summary?.critical_risk_count || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="caption" color="warning.main">높음</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                              {riskAnalytics.risk_summary?.high_risk_count || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="caption" color="info.main">보통</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                              {riskAnalytics.risk_summary?.medium_risk_count || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="caption" color="success.main">낮음</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                              {riskAnalytics.risk_summary?.low_risk_count || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <Typography variant="caption" color="text.secondary">평균점수</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {riskAnalytics.risk_summary?.avg_risk_score || 0}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* 고위험 프로젝트 목록 */}
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>프로젝트명</TableCell>
                              <TableCell align="center">리스크점수</TableCell>
                              <TableCell align="center">우선순위</TableCell>
                              <TableCell align="center">담당PE</TableCell>
                              <TableCell align="center">마감일</TableCell>
                              <TableCell align="center">리스크요인</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {riskAnalytics.risk_projects.slice(0, 5).map((project: any) => (
                              <TableRow key={project.id}>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {project.project_name}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={project.risk_score}
                                    size="small"
                                    color={
                                      project.risk_score >= 70 ? 'error' :
                                      project.risk_score >= 40 ? 'warning' :
                                      project.risk_score >= 20 ? 'info' : 'success'
                                    }
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={project.urgency_level}
                                    size="small"
                                    variant="outlined"
                                    color={
                                      project.urgency_level === 'critical' ? 'error' :
                                      project.urgency_level === 'high' ? 'warning' : 'default'
                                    }
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {project.pe_name || '미할당'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" color={
                                    project.deadline && new Date(project.deadline) < new Date() ? 'error.main' : 'text.secondary'
                                  }>
                                    {project.deadline ? new Date(project.deadline).toLocaleDateString() : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {project.risk_factors?.slice(0, 2).map((factor: string, index: number) => (
                                      <Chip
                                        key={index}
                                        label={
                                          factor === 'deadline_overdue' ? '마감초과' :
                                          factor === 'deadline_approaching' ? '마감임박' :
                                          factor === 'low_progress' ? '진행지연' :
                                          factor === 'unassigned' ? '미할당' :
                                          factor === 'not_started' ? '미시작' :
                                          factor === 'high_priority_delayed' ? '우선순위지연' : factor
                                        }
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                    ))}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setRiskAnalysisDialog(true)}
                        >
                          상세 분석 보기
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* PE 작업 현황 및 긴급 사항 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    PE 작업 현황
                    <Chip 
                      label={`${dashboardData.pe_workload.length}명`} 
                      size="small" 
                      color="primary" 
                    />
              </Typography>
                  
                  {dashboardData.pe_workload.length === 0 ? (
                    <Alert severity="info">
                      현재 작업이 할당된 PE가 없습니다.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableBody>
                          {dashboardData.pe_workload.map((pe) => (
                            <TableRow key={pe.pe_id} hover>
                              <TableCell sx={{ fontWeight: 600 }}>
                                <Button
                                  variant="text"
                                  color="primary"
                                  onClick={() => {
                                    // PE 대시보드로 이동 (PE ID를 URL 파라미터로 전달)
                                    navigate(`/pe-workspace?peId=${pe.pe_id}&peName=${encodeURIComponent(pe.pe_name)}`);
                                  }}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    p: 0,
                                    minWidth: 'auto',
                                    '&:hover': {
                                      backgroundColor: 'transparent',
                                      textDecoration: 'underline'
                                    }
                                  }}
                                >
                                  {pe.pe_name}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    총 {pe.total_assignments}개
                              </Typography>
                              <Chip
                                    label={`진행중 ${pe.active_assignments}`} 
                                    size="small" 
                                    color="info"
                                    variant="outlined"
                                  />
                                  <Chip 
                                    label={`완료 ${pe.completed_assignments}`} 
                                    size="small" 
                                    color="success"
                                    variant="outlined"
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip 
                                      label={pe.active_assignments > 0 ? `작업중` : `대기중`} 
                                size="small"
                                      color={pe.active_assignments > 0 ? "success" : "default"}
                                        variant="outlined"
                              />
                                    {pe.avg_progress > 0 && (
                              <Chip
                                        label={`평균 ${pe.avg_progress?.toFixed(0) || 0}%`} 
                                size="small"
                                        color={pe.avg_progress > 70 ? "success" : pe.avg_progress > 40 ? "warning" : "error"}
                                        variant="outlined"
                              />
                                    )}
                            </Box>
                                    <Typography variant="caption" color="text.secondary">
                                    {pe.active_assignments > 0 
                                      ? `${pe.active_assignments}개 프로젝트 진행중`
                                      : pe.completed_assignments > 0 
                                        ? `최근 ${pe.completed_assignments}개 완료`
                                        : '할당 대기중'
                                    }
                                    </Typography>
                          </Box>
                              </TableCell>
                              <TableCell sx={{ width: '200px' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={pe.avg_progress || 0}
                                    sx={{ flex: 1 }}
                                    color={getProgressColor(pe.avg_progress || 0)}
                                  />
                                  <Typography variant="caption" sx={{ minWidth: '40px' }}>
                                    {pe.avg_progress?.toFixed(0) || 0}%
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {pe.current_workload_hours || 0}시간
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    긴급 처리 사항
                    <Chip 
                      label={dashboardData.urgent_items?.length || 0} 
                      size="small" 
                      color="error" 
                    />
              </Typography>
                  
                  {!dashboardData.urgent_items || dashboardData.urgent_items.length === 0 ? (
                    <Alert severity="success">
                      현재 긴급 처리 사항이 없습니다.
                    </Alert>
                  ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {dashboardData.urgent_items.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <ListItem sx={{ px: 0 }}>
                      <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {item.title}
                                  </Typography>
                                  <Chip 
                                    label={
                                      item.type === 'deadline' ? '마감임박' :
                                      item.type === 'overdue' ? '지연' : '차단됨'
                                    }
                                    size="small"
                                    color={
                                      item.type === 'deadline' ? 'warning' :
                                      item.type === 'overdue' ? 'error' : 'secondary'
                                    }
                                  />
                                </Box>
                              }
                        secondary={
                          <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.description}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    프로젝트: {item.project_name}
                            </Typography>
                                  {item.deadline && (
                                    <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                      마감: {new Date(item.deadline).toLocaleDateString('ko-KR')}
                            </Typography>
                                  )}
                          </Box>
                        }
                      />
                    </ListItem>
                          {index < dashboardData.urgent_items.length - 1 && <Divider />}
                        </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 PE 활동 섹션 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 PE 활동
                <Chip 
                  label={dashboardData.recent_activities?.length || 0} 
                  size="small" 
                  color="info" 
                />
                </Typography>
              
              {!dashboardData.recent_activities || dashboardData.recent_activities.length === 0 ? (
                <Alert severity="info">
                  최근 PE 활동이 없습니다.
                </Alert>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {dashboardData.recent_activities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem sx={{ px: 0 }}>
                      <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Button
                                variant="text"
                                color="primary"
                                onClick={() => {
                                  navigate(`/pe-workspace?peId=${(activity as any).pe_id}&peName=${encodeURIComponent((activity as any).pe_name || activity.pe_name || '')}`);
                                }}
                                sx={{ 
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  p: 0,
                                  minWidth: 'auto',
                                  '&:hover': {
                                    backgroundColor: 'transparent',
                                    textDecoration: 'underline'
                                  }
                                }}
                              >
                                {activity.pe_name}
                              </Button>
                              <Chip 
                                label={
                                  (activity as any).activity_type === 'project_assignment' ? '할당' :
                                  (activity as any).activity_type === 'work_start' ? '작업 시작' :
                                  (activity as any).activity_type === 'progress_update' ? '진행률 업데이트' :
                                  (activity as any).activity_type === 'code_commit' ? 'Git 커밋' :
                                  (activity as any).activity_type === 'issue_reported' ? '이슈 보고' : '활동'
                                }
                                size="small" 
                                color={
                                  (activity as any).status === 'success' ? 'success' :
                                  (activity as any).status === 'active' ? 'info' :
                                  (activity as any).status === 'warning' ? 'warning' :
                                  (activity as any).status === 'completed' ? 'primary' : 'default'
                                } 
                              />
                            </Box>
                          }
                        secondary={
                          <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {activity.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {activity.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                📋 프로젝트: {activity.project_name}
                            </Typography>
                              <Typography variant="caption" color="text.secondary">
                                🕐 {new Date((activity as any).timestamp || activity.created_at).toLocaleString('ko-KR')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                      {index < dashboardData.recent_activities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
              </CardContent>
            </Card>
        </Grid>
          </Grid>

        </>
      ) : (
        <Alert severity="info">
          대시보드 데이터가 없습니다.
        </Alert>
      )}

      {/* [advice from AI] 프로젝트 리스트 다이얼로그 - PO 권한별 관리 기능 */}
      <Dialog open={projectListDialog} onClose={() => setProjectListDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{projectListTitle}</Typography>
            <Button onClick={() => setProjectListDialog(false)} size="small">
              닫기
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingProjects ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>담당 PE</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>진행률</TableCell>
                    <TableCell>긴급도</TableCell>
                    <TableCell>마감일</TableCell>
                    <TableCell>PO 관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                          해당 조건의 프로젝트가 없습니다.
                </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectList.map((project) => (
                      <TableRow key={project.assignment_id || project.project_id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {project.project_name}
                            </Typography>
                            {project.work_group_name && (
                              <Typography variant="caption" color="text.secondary">
                                작업 그룹: {project.work_group_name}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {project.assigned_pe_name || '미할당'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.project_status}
                            color={
                              project.project_status === 'completed' ? 'success' :
                              project.project_status === 'in_progress' ? 'info' :
                              project.project_status === 'on_hold' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={project.progress_percentage || 0}
                              sx={{ width: 80, mr: 1 }}
                            />
                            <Typography variant="body2">
                              {project.progress_percentage || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {project.urgency_level && (
                            <Chip
                              label={project.urgency_level}
                              color={
                                project.urgency_level === 'critical' ? 'error' :
                                project.urgency_level === 'high' ? 'warning' :
                                project.urgency_level === 'medium' ? 'info' :
                                'success'
                              }
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {project.deadline ? new Date(project.deadline).toLocaleDateString() : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {/* [advice from AI] PO 권한: 통합 설정 */}
                            {user && ['po', 'admin', 'executive'].includes(user.roleType) && (
                              <Button
                                onClick={() => openSettingsDialog(project)}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ minWidth: 60 }}
                              >
                                설정
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectListDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 통합 설정 다이얼로그 - PO 권한 */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">프로젝트 설정</Typography>
            <Button onClick={() => setSettingsDialog(false)} size="small">
              닫기
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 1 }}>
              {/* 프로젝트 정보 */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                  📋 {selectedProject.project_name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>현재 담당 PE:</strong> {selectedProject.assigned_pe_name || '미할당'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>프로젝트 상태:</strong> {selectedProject.project_status}
              </Typography>
                <Typography variant="body2">
                  <strong>긴급도:</strong> {selectedProject.urgency_level}
                </Typography>
              </Box>

              {/* PE 할당/재할당 섹션 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  👨‍💼 PE 할당 관리
              </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>담당 PE 선택</InputLabel>
                  <Select
                    value={newAssignedPE}
                    onChange={(e) => setNewAssignedPE(e.target.value)}
                    label="담당 PE 선택"
                  >
                    {availablePEs.map((pe) => (
                      <MenuItem key={pe.id} value={pe.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <Typography>{pe.full_name} ({pe.username})</Typography>
                          <Chip 
                            label={`${pe.current_assignments || 0}개 할당`}
                            size="small"
                            color={
                              (pe.current_assignments || 0) === 0 ? 'success' :
                              (pe.current_assignments || 0) <= 2 ? 'info' :
                              (pe.current_assignments || 0) <= 4 ? 'warning' : 'error'
                            }
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label={selectedProject.assigned_pe_name ? 'PE 재할당 사유' : 'PE 할당 사유'}
                  multiline
                  rows={3}
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  placeholder={
                    selectedProject.assigned_pe_name 
                      ? '재할당하는 사유를 입력해주세요. (예: 기술 스킬 매칭, 업무량 조절 등)'
                      : '할당하는 사유를 입력해주세요. (예: 적합한 기술 스킬 보유, 업무 가능 시간 등)'
                  }
                  required
                  sx={{ mb: 2 }}
                />

                {newAssignedPE && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>{availablePEs.find(pe => pe.id === newAssignedPE)?.full_name}님</strong>에게 할당됩니다.
                      <br />현재 작업량: {availablePEs.find(pe => pe.id === newAssignedPE)?.current_assignments || 0}개
                      <br />워크로드 레벨: {availablePEs.find(pe => pe.id === newAssignedPE)?.workload_level || 'Normal'}
              </Typography>
                  </Alert>
                )}
              </Box>
              </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setSettingsDialog(false)}
            disabled={settingsSubmitting}
          >
            취소
          </Button>
          <Button 
            onClick={handlePEAssignment}
            variant="contained"
            color="primary"
            disabled={!newAssignedPE || !assignmentReason.trim() || settingsSubmitting}
          >
            {settingsSubmitting ? '처리 중...' : (selectedProject?.assigned_pe_name ? 'PE 재할당' : 'PE 할당')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 시스템 등록 결정 다이얼로그 */}
      <Dialog 
        open={systemRegistrationDialog} 
        onClose={() => setSystemRegistrationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          프로젝트 최종 보고서 생성
          {selectedApprovalNotification && (
            <Typography variant="subtitle2" color="text.secondary">
              프로젝트: {selectedApprovalNotification.project_name || '알 수 없음'}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* 알림 정보 요약 */}
              {selectedApprovalNotification && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="h6" gutterBottom>
                      QC/QA 검증 결과 요약
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>프로젝트:</strong> {selectedApprovalNotification.project_name || '알 수 없음'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>검증 완료일:</strong> {selectedApprovalNotification.created_at ? new Date(selectedApprovalNotification.created_at).toLocaleString() : '알 수 없음'}
                    </Typography>
                    {selectedApprovalNotification.metadata?.quality_score && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>품질 점수:</strong> {selectedApprovalNotification.metadata.quality_score}점
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      <strong>검증 내용:</strong><br />
                      {selectedApprovalNotification.message || selectedApprovalNotification.content || '검증 완료 보고서와 함께 승인되었습니다.'}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {/* 프로젝트 최종 결정 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  프로젝트 최종 결정
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>최종 결정</InputLabel>
                  <Select
                    value={systemRegistrationDecision.decision}
                    onChange={(e) => setSystemRegistrationDecision(prev => ({
                      ...prev,
                      decision: e.target.value
                    }))}
                    label="최종 결정"
                  >
                    <MenuItem value="approve">승인 - 시스템 등록 및 배포 진행</MenuItem>
                    <MenuItem value="reject">반려 - 추가 개선 후 재검토</MenuItem>
                    <MenuItem value="defer">보류 - 추가 검토 필요</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 배포 우선순위 (승인 시에만) */}
              {systemRegistrationDecision.decision === 'approve' && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>배포 우선순위</InputLabel>
                      <Select
                        value={systemRegistrationDecision.deployment_priority}
                        onChange={(e) => setSystemRegistrationDecision(prev => ({
                          ...prev,
                          deployment_priority: e.target.value
                        }))}
                        label="배포 우선순위"
                      >
                        <MenuItem value="high">높음 - 긴급 배포</MenuItem>
                        <MenuItem value="normal">보통 - 일반 배포</MenuItem>
                        <MenuItem value="low">낮음 - 차후 배포</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>대상 환경</InputLabel>
                      <Select
                        value={systemRegistrationDecision.target_environment}
                        onChange={(e) => setSystemRegistrationDecision(prev => ({
                          ...prev,
                          target_environment: e.target.value
                        }))}
                        label="대상 환경"
                      >
                        <MenuItem value="production">프로덕션</MenuItem>
                        <MenuItem value="staging">스테이징</MenuItem>
                        <MenuItem value="development">개발</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}

              {/* 최종 보고서 및 결정 사유 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label={systemRegistrationDecision.decision === 'approve' ? '프로젝트 최종 보고서 및 승인 사유' : 
                       systemRegistrationDecision.decision === 'reject' ? '프로젝트 최종 보고서 및 반려 사유' : '프로젝트 최종 보고서 및 보류 사유'}
                  value={systemRegistrationDecision.registration_notes}
                  onChange={(e) => setSystemRegistrationDecision(prev => ({
                    ...prev,
                    registration_notes: e.target.value
                  }))}
                  placeholder={systemRegistrationDecision.decision === 'approve' ? 
                    '프로젝트 완료 현황, 품질 검증 결과, 시스템 등록 승인 사유, 배포 계획 등을 포함한 최종 보고서를 작성해주세요.' :
                    systemRegistrationDecision.decision === 'reject' ?
                    '프로젝트 완료 현황, 품질 검증 결과, 반려 사유, 개선 요청사항 등을 포함한 최종 보고서를 작성해주세요.' :
                    '프로젝트 완료 현황, 품질 검증 결과, 보류 사유, 추가 검토 사항 등을 포함한 최종 보고서를 작성해주세요.'
                  }
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSystemRegistrationDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSystemRegistrationDecision}
            disabled={submittingDecision || !systemRegistrationDecision.registration_notes.trim()}
            color={systemRegistrationDecision.decision === 'approve' ? 'success' : 
                   systemRegistrationDecision.decision === 'reject' ? 'error' : 'warning'}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {submittingDecision ? '보고서 생성 중...' : 
             systemRegistrationDecision.decision === 'approve' ? '최종 보고서 생성 및 승인' :
             systemRegistrationDecision.decision === 'reject' ? '최종 보고서 생성 및 반려' : '최종 보고서 생성 및 보류'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QC/QA 진행 상세 정보 다이얼로그 */}
      <Dialog 
        open={qcProgressDialog} 
        onClose={() => setQcProgressDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          QC/QA 검증 상세 정보
          {selectedQcRequest && (
            <Typography variant="subtitle2" color="text.secondary">
              프로젝트: {selectedQcRequest.project_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedQcRequest && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* 기본 정보 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    기본 정보
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">프로젝트명</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {selectedQcRequest.project_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">담당자</Typography>
                        <Typography variant="body1">
                          {selectedQcRequest.assigned_to_name || '미할당'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">상태</Typography>
                        <Chip 
                          label={
                            selectedQcRequest.request_status === 'pending' ? '대기 중' :
                            selectedQcRequest.request_status === 'in_progress' ? '진행 중' :
                            selectedQcRequest.request_status === 'completed' ? '완료' : selectedQcRequest.request_status
                          }
                          size="small"
                          color={
                            selectedQcRequest.request_status === 'pending' ? 'default' :
                            selectedQcRequest.request_status === 'in_progress' ? 'primary' :
                            selectedQcRequest.request_status === 'completed' ? 'success' : 'default'
                          }
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">우선순위</Typography>
                        <Chip 
                          label={
                            selectedQcRequest.priority_level === 'high' ? '높음' :
                            selectedQcRequest.priority_level === 'normal' ? '보통' : '낮음'
                          }
                          size="small"
                          color={
                            selectedQcRequest.priority_level === 'high' ? 'error' :
                            selectedQcRequest.priority_level === 'normal' ? 'warning' : 'default'
                          }
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* 테스트 진행 현황 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    테스트 진행 현황
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        전체 진행률
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={selectedQcRequest.test_progress_percentage || 0}
                          sx={{ flex: 1, height: 12, borderRadius: 6 }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {selectedQcRequest.test_progress_percentage || 0}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    {selectedQcRequest.test_statistics && (
                      <Grid container spacing={2}>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="primary">
                              {selectedQcRequest.test_statistics.total_tests || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              전체 테스트
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="success.main">
                              {selectedQcRequest.test_statistics.passed_tests || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              통과
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="error.main">
                              {selectedQcRequest.test_statistics.failed_tests || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              실패
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="warning.main">
                              {selectedQcRequest.test_statistics.pending_tests || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              대기 중
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    )}
                  </Paper>
                </Grid>

                {/* 품질 점수 */}
                {selectedQcRequest.quality_score && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      품질 평가
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                        {selectedQcRequest.quality_score}점
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        최종 품질 점수
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {/* 승인 상태 */}
                {selectedQcRequest.approval_status && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      승인 상태
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip 
                          label={
                            selectedQcRequest.approval_status === 'approved' ? '승인 완료' :
                            selectedQcRequest.approval_status === 'pending' ? '승인 대기' : '미승인'
                          }
                          color={selectedQcRequest.approval_status === 'approved' ? 'success' : 'default'}
                        />
                        {selectedQcRequest.approved_at && (
                          <Typography variant="body2" color="text.secondary">
                            승인일: {new Date(selectedQcRequest.approved_at).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQcProgressDialog(false)}>
            닫기
          </Button>
        </DialogActions>
        </Dialog>

        {/* PE 성과 분석 상세 다이얼로그 */}
        <Dialog 
          open={performanceAnalyticsDialog} 
          onClose={() => setPerformanceAnalyticsDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              📊 PE 성과 분석 상세 보고서
            </Typography>
          </DialogTitle>
          <DialogContent>
            {pePerformanceData && (
              <Box sx={{ mt: 2 }}>
                {/* 팀 전체 요약 */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      팀 전체 성과 요약
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {pePerformanceData.team_benchmark?.total_pe_count || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">총 PE 수</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {pePerformanceData.team_benchmark?.high_performers_count || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">고성과자 (80%+)</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                            {pePerformanceData.team_benchmark?.team_avg_completion_rate?.toFixed(1) || 0}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">평균 완료율</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                            {pePerformanceData.team_benchmark?.team_avg_quality_score?.toFixed(1) || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">평균 품질점수</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* 전체 PE 성과 테이블 */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      전체 PE 성과 상세 분석
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>PE</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>등급</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>총 프로젝트</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>완료율</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>품질점수</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>평균 개발시간</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>재작업률</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>최근 30일 활동</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>지연 프로젝트</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>생산성 트렌드</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>품질 트렌드</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pePerformanceData.pe_performance.map((pe: any) => (
                            <TableRow key={pe.pe_id} hover>
                              <TableCell>
                                <Button
                                  variant="text"
                                  color="primary"
                                  onClick={() => {
                                    setPerformanceAnalyticsDialog(false);
                                    navigate(`/pe-workspace?peId=${pe.pe_id}&peName=${encodeURIComponent(pe.pe_name)}`);
                                  }}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    p: 0,
                                    minWidth: 'auto'
                                  }}
                                >
                                  {pe.pe_name}
                                </Button>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {pe.email}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={pe.performance_grade}
                                  size="small"
                                  color={
                                    pe.performance_grade === 'S' ? 'success' :
                                    pe.performance_grade === 'A' ? 'info' :
                                    pe.performance_grade === 'B' ? 'warning' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {pe.total_projects || 0}개
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  (완료: {pe.completed_projects || 0}, 진행: {pe.active_projects || 0})
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={pe.completion_rate || 0}
                                    sx={{ width: '60px', mb: 0.5 }}
                                    color={
                                      (pe.completion_rate || 0) >= 80 ? 'success' :
                                      (pe.completion_rate || 0) >= 60 ? 'info' :
                                      (pe.completion_rate || 0) >= 40 ? 'warning' : 'error'
                                    }
                                  />
                                  <Typography variant="caption">
                                    {pe.completion_rate?.toFixed(1) || 0}%
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {pe.avg_quality_score?.toFixed(1) || 0}점
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {pe.avg_development_hours ? `${(parseFloat(pe.avg_development_hours) || 0).toFixed(1)}시간` : 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography 
                                  variant="body2"
                                  color={
                                    (pe.rework_rate || 0) > 20 ? 'error.main' :
                                    (pe.rework_rate || 0) > 10 ? 'warning.main' : 'success.main'
                                  }
                                >
                                  {pe.rework_rate?.toFixed(1) || 0}%
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {pe.recent_activity_count || 0}건
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography 
                                  variant="body2"
                                  color={(pe.delayed_projects || 0) > 0 ? 'error.main' : 'text.primary'}
                                >
                                  {pe.delayed_projects || 0}개
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={pe.productivity_trend === 'up' ? '↗ 상승' : pe.productivity_trend === 'down' ? '↘ 하락' : '→ 안정'}
                                  size="small"
                                  color={pe.productivity_trend === 'up' ? 'success' : pe.productivity_trend === 'down' ? 'error' : 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={pe.quality_trend === 'up' ? '↗ 개선' : pe.quality_trend === 'down' ? '↘ 저하' : '→ 유지'}
                                  size="small"
                                  color={pe.quality_trend === 'up' ? 'success' : pe.quality_trend === 'down' ? 'error' : 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPerformanceAnalyticsDialog(false)}>
              닫기
            </Button>
          </DialogActions>
        </Dialog>

        {/* 업무 부하 분산 상세 다이얼로그 */}
        <Dialog 
          open={workloadAnalyticsDialog} 
          onClose={() => setWorkloadAnalyticsDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              ⚖️ 업무 부하 분산 상세 분석
            </Typography>
          </DialogTitle>
          <DialogContent>
            {workloadDistributionData && (
              <Box sx={{ mt: 2 }}>
                {/* 워크로드 상태 요약 */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      워크로드 상태 분포
                    </Typography>
                    <Grid container spacing={2}>
                      {['overloaded', 'busy', 'balanced', 'light', 'available'].map((status) => {
                        const count = workloadDistributionData.workload_analysis.filter((pe: any) => pe.workload_status === status).length;
                        const percentage = ((count / workloadDistributionData.workload_analysis.length) * 100).toFixed(1);
                        const statusLabels = {
                          overloaded: '과부하',
                          busy: '바쁨',
                          balanced: '적정',
                          light: '여유',
                          available: '가능'
                        };
                        const statusColors = {
                          overloaded: 'error',
                          busy: 'warning',
                          balanced: 'success',
                          light: 'info',
                          available: 'default'
                        };
                        return (
                          <Grid item xs={12} md={2.4} key={status}>
                            <Box sx={{ 
                              textAlign: 'center', 
                              p: 2, 
                              bgcolor: `${statusColors[status as keyof typeof statusColors]}.50`, 
                              borderRadius: 1,
                              border: 1,
                              borderColor: `${statusColors[status as keyof typeof statusColors]}.200`
                            }}>
                              <Typography variant="h4" sx={{ 
                                fontWeight: 700, 
                                color: `${statusColors[status as keyof typeof statusColors]}.main` 
                              }}>
                                {count}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {statusLabels[status as keyof typeof statusLabels]}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({percentage}%)
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </CardContent>
                </Card>

                {/* 전체 PE 워크로드 테이블 */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      전체 PE 워크로드 상세 분석
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>PE</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>상태</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>워크로드 점수</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>진행중 프로젝트</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>우선순위별</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>지연/마감임박</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>예상 작업시간</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>최근 완료</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>권장사항</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {workloadDistributionData.workload_analysis.map((pe: any) => (
                            <TableRow key={pe.pe_id} hover>
                              <TableCell>
                                <Button
                                  variant="text"
                                  color="primary"
                                  onClick={() => {
                                    setWorkloadAnalyticsDialog(false);
                                    navigate(`/pe-workspace?peId=${pe.pe_id}&peName=${encodeURIComponent(pe.pe_name)}`);
                                  }}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    p: 0,
                                    minWidth: 'auto'
                                  }}
                                >
                                  {pe.pe_name}
                                </Button>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={
                                    pe.workload_status === 'overloaded' ? '과부하' :
                                    pe.workload_status === 'busy' ? '바쁨' :
                                    pe.workload_status === 'balanced' ? '적정' :
                                    pe.workload_status === 'light' ? '여유' : '가능'
                                  }
                                  size="small"
                                  color={
                                    pe.workload_status === 'overloaded' ? 'error' :
                                    pe.workload_status === 'busy' ? 'warning' :
                                    pe.workload_status === 'balanced' ? 'success' :
                                    pe.workload_status === 'light' ? 'info' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={pe.workload_score || 0}
                                    sx={{ width: '60px', mb: 0.5 }}
                                    color={
                                      (pe.workload_score || 0) >= 80 ? 'error' :
                                      (pe.workload_score || 0) >= 60 ? 'warning' :
                                      (pe.workload_score || 0) >= 30 ? 'success' : 'info'
                                    }
                                  />
                                  <Typography variant="caption">
                                    {pe.workload_score || 0}점
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {pe.active_projects || 0}개
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {pe.high_priority_projects > 0 && (
                                    <Chip label={`긴급 ${pe.high_priority_projects}`} size="small" color="error" variant="outlined" />
                                  )}
                                  {pe.normal_priority_projects > 0 && (
                                    <Chip label={`보통 ${pe.normal_priority_projects}`} size="small" color="info" variant="outlined" />
                                  )}
                                  {pe.low_priority_projects > 0 && (
                                    <Chip label={`낮음 ${pe.low_priority_projects}`} size="small" color="default" variant="outlined" />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {pe.overdue_projects > 0 && (
                                    <Chip label={`지연 ${pe.overdue_projects}`} size="small" color="error" />
                                  )}
                                  {pe.due_this_week > 0 && (
                                    <Chip label={`마감임박 ${pe.due_this_week}`} size="small" color="warning" />
                                  )}
                                  {pe.overdue_projects === 0 && pe.due_this_week === 0 && (
                                    <Typography variant="caption" color="success.main">양호</Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {pe.total_estimated_hours ? `${(parseFloat(pe.total_estimated_hours) || 0).toFixed(1)}시간` : 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {pe.recent_completions || 0}건
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography 
                                  variant="caption" 
                                  color={
                                    pe.recommendation === 'redistribute_urgent' ? 'error.main' :
                                    pe.recommendation === 'monitor_closely' ? 'warning.main' :
                                    pe.recommendation === 'optimal_load' ? 'success.main' : 'info.main'
                                  }
                                  sx={{ fontWeight: 600 }}
                                >
                                  {
                                    pe.recommendation === 'redistribute_urgent' ? '재분배 필요' :
                                    pe.recommendation === 'monitor_closely' ? '모니터링' :
                                    pe.recommendation === 'optimal_load' ? '최적 상태' :
                                    pe.recommendation === 'can_take_more' ? '추가 할당 가능' : '할당 필요'
                                  }
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* 프로젝트 할당 최적화 제안 */}
                {workloadDistributionData.optimization_suggestions && workloadDistributionData.optimization_suggestions.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        🎯 프로젝트 할당 최적화 제안
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>프로젝트</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>우선순위</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>기술스택</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>추천 PE</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>현재 부하</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>매칭점수</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {workloadDistributionData.optimization_suggestions.slice(0, 10).map((suggestion: any, index: number) => (
                              <TableRow key={index} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {suggestion.project_name}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={suggestion.urgency_level === 'high' ? '긴급' : suggestion.urgency_level === 'normal' ? '보통' : '낮음'}
                                    size="small"
                                    color={suggestion.urgency_level === 'high' ? 'error' : suggestion.urgency_level === 'normal' ? 'info' : 'default'}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="caption">
                                    {suggestion.tech_stack || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="text"
                                    color="primary"
                                    onClick={() => navigate(`/pe-workspace?peId=${suggestion.pe_id}&peName=${encodeURIComponent(suggestion.pe_name)}`)}
                                    sx={{ 
                                      textTransform: 'none',
                                      fontWeight: 600,
                                      p: 0,
                                      minWidth: 'auto'
                                    }}
                                  >
                                    {suggestion.pe_name}
                                  </Button>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2">
                                    {suggestion.current_load}개
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={`${suggestion.match_score}점`}
                                    size="small"
                                    color={suggestion.match_score >= 50 ? 'success' : suggestion.match_score >= 30 ? 'info' : 'default'}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWorkloadAnalyticsDialog(false)}>
              닫기
          </Button>
        </DialogActions>
      </Dialog>

        {/* 프로젝트 리스크 분석 상세 다이얼로그 */}
        <Dialog 
          open={riskAnalysisDialog} 
          onClose={() => setRiskAnalysisDialog(false)}
          maxWidth="xl"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🚨 프로젝트 리스크 분석 상세 보고서
            </Typography>
          </DialogTitle>
          <DialogContent>
            {riskAnalytics && (
              <Box sx={{ mt: 2 }}>
                {/* 전체 리스크 요약 */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      전체 리스크 현황
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {riskAnalytics.risk_summary?.total_projects || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">전체 프로젝트</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {riskAnalytics.risk_summary?.critical_risk_count || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">위험 (70+)</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                            {riskAnalytics.risk_summary?.high_risk_count || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">높음 (40-69)</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                            {riskAnalytics.risk_summary?.medium_risk_count || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">보통 (20-39)</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {riskAnalytics.risk_summary?.low_risk_count || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">낮음 (0-19)</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {riskAnalytics.risk_summary?.avg_risk_score || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">평균 점수</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* 전체 프로젝트 리스크 목록 */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      프로젝트별 리스크 상세
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>프로젝트명</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>리스크점수</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>우선순위</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>담당PE</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>진행률</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>마감일</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>예상완료일</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>리스크요인</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {riskAnalytics.risk_projects.map((project: any) => (
                            <TableRow key={project.id}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {project.project_name}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={project.risk_score}
                                  size="small"
                                  color={
                                    project.risk_score >= 70 ? 'error' :
                                    project.risk_score >= 40 ? 'warning' :
                                    project.risk_score >= 20 ? 'info' : 'success'
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={project.urgency_level}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    project.urgency_level === 'critical' ? 'error' :
                                    project.urgency_level === 'high' ? 'warning' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {project.pe_name || '미할당'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {project.progress_percentage ? `${project.progress_percentage}%` : '0%'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" color={
                                  project.deadline && new Date(project.deadline) < new Date() ? 'error.main' : 'text.secondary'
                                }>
                                  {project.deadline ? new Date(project.deadline).toLocaleDateString() : '-'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" color="text.secondary">
                                  {project.estimated_completion_date ? 
                                    new Date(project.estimated_completion_date).toLocaleDateString() : '-'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {project.risk_factors?.map((factor: string, index: number) => (
                                    <Chip
                                      key={index}
                                      label={
                                        factor === 'deadline_overdue' ? '마감초과' :
                                        factor === 'deadline_approaching' ? '마감임박' :
                                        factor === 'low_progress' ? '진행지연' :
                                        factor === 'unassigned' ? '미할당' :
                                        factor === 'not_started' ? '미시작' :
                                        factor === 'high_priority_delayed' ? '우선순위지연' : factor
                                      }
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  ))}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRiskAnalysisDialog(false)}>
              닫기
            </Button>
          </DialogActions>
        </Dialog>

    </Container>
  );
};

export default PODashboard;