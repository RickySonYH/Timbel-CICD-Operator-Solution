// [advice from AI] 최고관리자 통합 대시보드 - 프로젝트 현황 모니터링

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Chip, Alert, CircularProgress, LinearProgress, Table, TableBody,
  TableCell, TableContainer, TableRow, TableHead, Paper, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Tooltip, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';
// [advice from AI] 아이콘 사용 자제 - 모든 아이콘 import 제거
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

// [advice from AI] 프로젝트 할당 정보 인터페이스
interface ProjectAssignment {
  assignment_id: string;
  project_id: string;
  project_name: string;
  assigned_pe_id: string;
  assigned_pe_name: string;
  assignment_status: string;
  progress_percentage: number;
  urgency_level: string;
  deadline: string;
  assigned_at: string;
  work_group_name?: string;
  assignment_notes: string;
  approval_status: string;
  project_status: string;
}

// [advice from AI] 대시보드 데이터 인터페이스
interface DashboardData {
  project_stats: {
    by_approval_status: { [key: string]: number };
    by_project_status: { [key: string]: number };
    by_urgency: { [key: string]: number };
  };
  approval_trends: Array<{
    approval_action: string;
    count: number;
    week: string;
  }>;
  pe_workload: Array<{
    pe_id: string;
    pe_name: string;
    total_assignments: number;
    active_assignments: number;
    completed_assignments: number;
    avg_progress: number;
  }>;
  knowledge_usage: Array<{
    asset_type: string;
    usage_count: number;
    unique_users: number;
    total_time_saved: number;
  }>;
  summary: {
    total_projects: number;
    pending_approvals: number;
    approved_waiting_po: number;
    active_projects: number;
    completed_projects: number;
    rejected_projects: number;
    total_pe_assignments: number;
    knowledge_assets_used: number;
  };
}

const ExecutiveDashboard: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  const navigate = useNavigate();
  
  // 상태 관리
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // QC/QA 현황 상태
  const [qcOverviewData, setQcOverviewData] = useState<any>(null);
  const [qcDetailDialog, setQcDetailDialog] = useState(false);
  const [selectedQcData, setSelectedQcData] = useState<any>(null);
  
  // 프로젝트 생명주기 현황 상태
  const [lifecycleData, setLifecycleData] = useState<any>(null);
  
  // 지연 프로젝트 알림 상태
  const [delayedProjects, setDelayedProjects] = useState<any[]>([]);
  const [delayAlertsDialog, setDelayAlertsDialog] = useState(false);
  const [generatingAlerts, setGeneratingAlerts] = useState(false);
  const [loadingDelayedProjects, setLoadingDelayedProjects] = useState(false);
  
  // 시스템 등록 승인 관리 상태
  const [systemRegistrationRequests, setSystemRegistrationRequests] = useState<any[]>([]);
  const [registrationApprovalDialog, setRegistrationApprovalDialog] = useState(false);
  const [selectedRegistrationRequest, setSelectedRegistrationRequest] = useState<any>(null);
  const [registrationDecision, setRegistrationDecision] = useState({
    decision: 'approve', // approve, reject
    admin_notes: '',
    deployment_schedule: ''
  });
  const [submittingRegistrationDecision, setSubmittingRegistrationDecision] = useState(false);
  
  // [advice from AI] 프로젝트 리스트 다이얼로그 상태
  const [projectListDialog, setProjectListDialog] = useState(false);
  const [projectListTitle, setProjectListTitle] = useState('');
  const [projectList, setProjectList] = useState<ProjectAssignment[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // 액션 메뉴 상태
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectAssignment | null>(null);
  
  // [advice from AI] PE 재할당 다이얼로그 상태
  const [reassignDialog, setReassignDialog] = useState(false);
  const [availablePEs, setAvailablePEs] = useState<any[]>([]);
  const [selectedPE, setSelectedPE] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [loadingPEs, setLoadingPEs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // [advice from AI] 승인/거부 다이얼로그 상태
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved');
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  
  // [advice from AI] 상태 변경 다이얼로그 상태
  const [statusChangeDialog, setStatusChangeDialog] = useState(false);
  const [statusChangeAction, setStatusChangeAction] = useState<'cancel_approval' | 'change_status' | 'hold' | 'cancel'>('change_status');
  const [newApprovalStatus, setNewApprovalStatus] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  
  // [advice from AI] PE 변경 관련 상태 (통합됨)
  const [changePE, setChangePE] = useState(false);
  const [newAssignedPE, setNewAssignedPE] = useState('');

  // [advice from AI] API URL 생성 함수
  const getApiUrl = () => {
    const currentHost = window.location.host;
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3001';
    }
    return `http://${currentHost.split(':')[0]}:3001`;
  };

  // QC/QA 현황 데이터 로드
  const loadQcOverviewData = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/qc/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQcOverviewData(data.data);
        console.log('✅ QC/QA 현황 로드 완료:', data.data);
      } else {
        console.error('❌ QC/QA 현황 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ QC/QA 현황 로드 중 오류:', error);
    }
  };

  // QC/QA 상세 정보 다이얼로그 열기
  const handleOpenQcDetailDialog = () => {
    setQcDetailDialog(true);
  };

  // 시스템 등록 승인 요청 로드
  const loadSystemRegistrationRequests = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/admin/approvals/system-registration-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemRegistrationRequests(data.data || []);
        console.log('✅ 시스템 등록 승인 요청 로드 완료:', data.data?.length || 0, '건');
      } else {
        console.error('❌ 시스템 등록 승인 요청 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 시스템 등록 승인 요청 로드 중 오류:', error);
    }
  };

  // 시스템 등록 승인 다이얼로그 열기
  const handleOpenRegistrationApprovalDialog = (request: any) => {
    setSelectedRegistrationRequest(request);
    setRegistrationDecision({
      decision: 'approve',
      admin_notes: `${request.project_name} 프로젝트의 시스템 등록을 승인합니다.\n\nQC/QA 품질 점수: ${request.qc_quality_score || 'N/A'}점\nPO 승인 사유: ${request.registration_notes || '없음'}`,
      deployment_schedule: ''
    });
    setRegistrationApprovalDialog(true);
  };

  // 시스템 등록 승인/반려 처리
  const handleRegistrationDecision = async () => {
    if (!selectedRegistrationRequest || !registrationDecision.admin_notes.trim()) {
      alert('결정 사유를 입력해주세요.');
      return;
    }

    setSubmittingRegistrationDecision(true);

    try {
      const response = await fetch(`${getApiUrl()}/api/admin/approvals/system-registration-decision/${selectedRegistrationRequest.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationDecision)
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || '시스템 등록 결정이 처리되었습니다.');
        
        // 요청 목록 새로고침
        await loadSystemRegistrationRequests();
        
        // 다이얼로그 닫기
        setRegistrationApprovalDialog(false);
        setSelectedRegistrationRequest(null);
        
        console.log('✅ 시스템 등록 결정 처리 완료:', data);
      } else {
        const errorData = await response.json();
        alert(errorData.message || '시스템 등록 결정 처리에 실패했습니다.');
        console.error('❌ 시스템 등록 결정 처리 실패:', response.status, errorData);
      }
    } catch (error) {
      alert('시스템 등록 결정 처리 중 오류가 발생했습니다.');
      console.error('❌ 시스템 등록 결정 처리 중 오류:', error);
    } finally {
      setSubmittingRegistrationDecision(false);
    }
  };

  // 프로젝트 생명주기 현황 로드
  const loadProjectLifecycleData = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/admin/approvals/project-lifecycle-overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLifecycleData(data.data);
        console.log('✅ 프로젝트 생명주기 현황 로드 완료:', data.data);
      } else {
        console.error('❌ 프로젝트 생명주기 현황 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 프로젝트 생명주기 현황 로드 중 오류:', error);
    }
  };

  // 지연 프로젝트 로드
  const loadDelayedProjects = async () => {
    setLoadingDelayedProjects(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/admin/approvals/delayed-projects-simple`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDelayedProjects(data.data || []);
        console.log(`✅ 지연 프로젝트 로드 완료: ${data.data?.length || 0}건`);
      } else {
        console.error('❌ 지연 프로젝트 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 지연 프로젝트 로드 중 오류:', error);
    } finally {
      setLoadingDelayedProjects(false);
    }
  };

  // 지연 알림 생성
  const handleGenerateDelayAlerts = async () => {
    setGeneratingAlerts(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/admin/approvals/generate-delay-alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`지연 프로젝트 알림이 성공적으로 생성되었습니다. (${data.alertsGenerated}건)`);
        setDelayAlertsDialog(false);
      } else {
        alert('지연 프로젝트 알림 생성에 실패했습니다.');
      }
    } catch (error) {
      alert('지연 프로젝트 알림 생성 중 오류가 발생했습니다.');
      console.error('❌ 지연 알림 생성 중 오류:', error);
    } finally {
      setGeneratingAlerts(false);
    }
  };
  
  // [advice from AI] 카드 클릭 핸들러 - 프로젝트 리스트 다이얼로그 열기
  const handleCardClick = async (cardType: string) => {
    console.log('🔍 카드 클릭:', cardType);
    
    let title = '';
    let statusFilter = '';
    
    switch(cardType) {
      case 'total':
        title = '전체 프로젝트';
        statusFilter = 'all';
        break;
      case 'pending':
        title = '승인 대기 프로젝트';
        statusFilter = 'pending_approval';
        break;
      case 'approved':
        title = '승인된 프로젝트 (할당 대기)';
        statusFilter = 'approved_waiting_assignment';
        break;
      case 'active':
        title = '진행 중 프로젝트';
        statusFilter = 'in_progress';
        break;
      case 'completed':
        title = '완료된 프로젝트';
        statusFilter = 'completed';
        break;
      default:
        console.log('알 수 없는 카드 타입:', cardType);
        return;
    }
    
    setProjectListTitle(title);
    setProjectListDialog(true);
    await loadProjectList(statusFilter);
  };


  // [advice from AI] 프로젝트 관리 액션
  const handleProjectAction = async (action: string) => {
    if (!selectedProject) return;

    try {
      const apiUrl = getApiUrl();
      let endpoint = '';
      let requestData = {};

      switch (action) {
        case 'pause':
          endpoint = `/api/admin/project-management/${selectedProject.assignment_id}/pause`;
          requestData = { reason: '관리자에 의한 일시 정지' };
          break;
        case 'resume':
          endpoint = `/api/admin/project-management/${selectedProject.assignment_id}/status`;
          requestData = { new_status: 'in_progress', reason: '관리자에 의한 재시작' };
          break;
        case 'reassign':
          // PE 재할당 다이얼로그 열기
          handleActionMenuClose();
          await openReassignDialog();
          return;
        default:
          return;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('작업이 성공적으로 처리되었습니다.');
          // 리스트 새로고침
          await loadProjectList('all');
        } else {
          alert(`처리 실패: ${result.message}`);
        }
      } else {
        alert(`서버 오류: ${response.status}`);
      }
    } catch (error) {
      console.error('프로젝트 액션 처리 실패:', error);
      alert(`처리 중 오류가 발생했습니다: ${(error as Error).message}`);
    } finally {
      handleActionMenuClose();
    }
  };

  // [advice from AI] PE 재할당 다이얼로그 열기
  const openReassignDialog = async () => {
    if (!selectedProject) return;
    
    setReassignDialog(true);
    setSelectedPE('');
    setReassignReason('');
    await loadAvailablePEs();
  };

  // [advice from AI] 사용 가능한 PE 목록 로드
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
        }
      } else {
        console.error('PE 목록 API 호출 실패:', response.status);
      }
    } catch (error) {
      console.error('PE 목록 로드 오류:', error);
    } finally {
      setLoadingPEs(false);
    }
  };

  // [advice from AI] 액션 메뉴 열기
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, project: ProjectAssignment) => {
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  // [advice from AI] 액션 메뉴 닫기
  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  // [advice from AI] 프로젝트 리스트 로드
  const loadProjectList = async (filterType: string) => {
    try {
      setLoadingProjects(true);
      const apiUrl = getApiUrl();
      
      let endpoint = '/api/admin/approvals/projects';
      let params = '';
      
      switch (filterType) {
        case 'pending_approval':
          params = '?status=pending';
          break;
        case 'approved_waiting_assignment':
          params = '?status=approved';
          break;
        case 'in_progress':
          params = '?status=in_progress';
          break;
        case 'completed':
          params = '?status=completed';
          break;
        case 'all':
        default:
          params = '';
          break;
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
          console.error('프로젝트 리스트 로드 실패:', result.message);
          setProjectList([]);
        }
      } else {
        console.error('프로젝트 리스트 API 호출 실패:', response.status);
        setProjectList([]);
      }
    } catch (error) {
      console.error('프로젝트 리스트 로드 오류:', error);
      setProjectList([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // [advice from AI] PE 재할당 실행
  const handleReassignment = async () => {
    if (!selectedProject || !selectedPE || !reassignReason.trim()) return;

    try {
      setSubmitting(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/admin/project-management/${selectedProject.assignment_id}/reassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_assignee_id: selectedPE,
          reason: reassignReason
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('PE 재할당이 완료되었습니다.');
          setReassignDialog(false);
          // 프로젝트 리스트 새로고침
          await loadProjectList('all');
        } else {
          alert(`재할당 실패: ${result.message}`);
        }
      } else {
        alert(`서버 오류: ${response.status}`);
      }
    } catch (error) {
      console.error('PE 재할당 실패:', error);
      alert(`재할당 중 오류가 발생했습니다: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // [advice from AI] 승인/거부 다이얼로그 열기
  const openApprovalDialog = (action: 'approved' | 'rejected') => {
    setApprovalAction(action);
    setApprovalComment('');
    setApprovalDialog(true);
  };

  // [advice from AI] 프로젝트 승인/거부 처리
  const handleProjectApproval = async () => {
    if (!selectedProject || !approvalComment.trim()) return;

    try {
      setApprovalSubmitting(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/admin/approvals/projects/${selectedProject.project_id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_action: approvalAction,
          approval_comment: approvalComment
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ 프로젝트 승인 처리 완료:', result.message);
          setApprovalDialog(false);
          setApprovalComment('');
          // 프로젝트 리스트 새로고침
          await loadProjectList(projectListTitle === '승인 대기' ? 'pending_approval' : 'all');
          // 대시보드 통계 새로고침
          await fetchDashboardData();
        } else {
          setError(result.message || '승인 처리에 실패했습니다');
        }
      } else {
        const errorText = await response.text();
        setError(`승인 처리 실패: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ 승인 처리 실패:', err);
      setError(err instanceof Error ? err.message : '승인 처리 중 오류가 발생했습니다');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // [advice from AI] 상태 변경 다이얼로그 열기
  const openStatusChangeDialog = (action: 'cancel_approval' | 'change_status' | 'hold' | 'cancel') => {
    if (!selectedProject) return;
    
    setStatusChangeAction(action);
    setStatusChangeReason('');
    setChangePE(false);
    setNewAssignedPE('');
    
    // 기본 상태 설정
    switch (action) {
      case 'cancel_approval':
        setNewApprovalStatus('pending');
        setNewProjectStatus(selectedProject.project_status || 'planning');
        break;
      case 'hold':
        setNewApprovalStatus(selectedProject.approval_status || 'approved');
        setNewProjectStatus('on_hold');
        break;
      case 'cancel':
        setNewApprovalStatus(selectedProject.approval_status || 'approved');
        setNewProjectStatus('cancelled');
        break;
      default:
        setNewApprovalStatus(selectedProject.approval_status || 'approved');
        setNewProjectStatus(selectedProject.project_status || 'planning');
    }
    
    // PE 목록 로드
    loadAvailablePEs();
    setStatusChangeDialog(true);
  };

  // [advice from AI] 프로젝트 상태 변경 처리
  const handleStatusChange = async () => {
    if (!selectedProject || !statusChangeReason.trim()) return;

    try {
      setStatusSubmitting(true);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/admin/approvals/projects/${selectedProject.project_id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approval_status: newApprovalStatus,
          project_status: newProjectStatus,
          change_reason: statusChangeReason,
          action_type: statusChangeAction,
          new_assignee_id: changePE ? newAssignedPE : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ 프로젝트 상태 변경 완료:', result.message);
          setStatusChangeDialog(false);
          setStatusChangeReason('');
          // 프로젝트 리스트 새로고침
          await loadProjectList('all');
          // 대시보드 통계 새로고침
          await fetchDashboardData();
        } else {
          setError(result.message || '상태 변경에 실패했습니다');
        }
      } else {
        const errorText = await response.text();
        setError(`상태 변경 실패: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ 상태 변경 실패:', err);
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // [advice from AI] 대시보드 데이터 조회
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 최고관리자 대시보드 데이터 조회 시작...');
      console.log('🔑 사용 토큰:', token ? '토큰 존재' : '토큰 없음');
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/admin/approvals/dashboard-stats` : '/api/admin/approvals/dashboard-stats';
      console.log('🌐 API URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 응답 상태:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📦 API 응답 데이터:', result);
        if (result.success) {
          setDashboardData(result.data);
          console.log('✅ 대시보드 데이터 로드 완료:', result.data);
          setError(null); // 에러 초기화
        } else {
          console.error('❌ API 응답 실패:', result.message || result.error);
          setError(result.message || '대시보드 데이터를 불러올 수 없습니다');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ HTTP 오류:', response.status, errorText);
        setError(`서버 오류: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ 대시보드 데이터 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (token && (user?.roleType === 'admin' || user?.roleType === 'executive')) {
      fetchDashboardData();
      loadQcOverviewData();
      loadSystemRegistrationRequests();
      loadProjectLifecycleData();
      loadDelayedProjects();
      
      // 주기적 데이터 새로고침 (30초마다)
      const interval = setInterval(() => {
        fetchDashboardData();
        loadQcOverviewData();
        loadSystemRegistrationRequests();
        loadProjectLifecycleData();
        loadDelayedProjects();
      }, 30000);
      
      return () => clearInterval(interval);
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

  if (!dashboardData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info">
          대시보드 데이터가 없습니다.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          최고관리자 대시보드
        </Typography>
        <Button 
          variant="outlined" 
          onClick={fetchDashboardData}
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? '새로고침 중...' : '새로고침'}
        </Button>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, lineHeight: 1.6 }}>
          프로젝트 현황, PE 작업 분배, 지식 자산 활용 트렌드를 실시간으로 모니터링합니다
        </Typography>
      </Box>

      {/* 주요 지표 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              height: 140,
              '&:hover': { 
                transform: 'translateY(-2px)', 
                boxShadow: 4,
                bgcolor: 'action.hover'
              } 
            }}
            onClick={() => handleCardClick('total')}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {dashboardData.summary.total_projects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 프로젝트
                  </Typography>
                </Box>
              <Typography variant="caption" color="text.secondary">
                📋 클릭하여 프로젝트 목록 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              height: 140,
              '&:hover': { 
                transform: 'translateY(-2px)', 
                boxShadow: 4,
                bgcolor: 'action.hover'
              } 
            }}
            onClick={() => handleCardClick('pending')}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {dashboardData.summary.pending_approvals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    승인 대기
                  </Typography>
                </Box>
              <Typography variant="caption" color="text.secondary">
                ⏳ 클릭하여 승인 처리하기
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              height: 140,
              '&:hover': { 
                transform: 'translateY(-2px)', 
                boxShadow: 4 
              } 
            }}
            onClick={() => handleCardClick('approved')}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    {dashboardData.summary.approved_waiting_po}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    PO 할당 대기
                  </Typography>
                </Box>
              <Typography variant="caption" color="text.secondary">
                👥 클릭하여 할당 대기 목록 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              height: 140,
              '&:hover': { 
                transform: 'translateY(-2px)', 
                boxShadow: 4 
              } 
            }}
            onClick={() => handleCardClick('active')}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {dashboardData.summary.active_projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  진행 중
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                🚀 클릭하여 진행 중인 프로젝트 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              height: 140,
              '&:hover': { 
                transform: 'translateY(-2px)', 
                boxShadow: 4 
              } 
            }}
            onClick={() => handleCardClick('completed')}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {dashboardData.summary.completed_projects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    완료
                  </Typography>
                </Box>
              <Typography variant="caption" color="text.secondary">
                클릭하여 완료된 프로젝트 보기
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 프로젝트 상태별 분포 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                프로젝트 승인 상태
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(dashboardData.project_stats.by_approval_status).map(([status, count]) => (
                  <Box 
                    key={status} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'scale(1.02)'
                      }
                    }}
                    onClick={() => handleCardClick(status)}
                  >
                    <Typography variant="body2">
                      {status === 'pending' ? '승인 대기' :
                       status === 'approved' ? '승인됨' :
                       status === 'rejected' ? '거부됨' : status}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(count / dashboardData.summary.total_projects) * 100}
                        sx={{ width: 100, mr: 1 }}
                        color={
                          status === 'approved' ? 'success' :
                          status === 'pending' ? 'warning' :
                          status === 'rejected' ? 'error' : 'primary'
                        }
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '30px' }}>
                        {count}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                프로젝트 진행 상태
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(dashboardData.project_stats.by_project_status).map(([status, count]) => (
                  <Box 
                    key={status} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'scale(1.02)'
                      }
                    }}
                    onClick={() => handleCardClick(status)}
                  >
                    <Typography variant="body2">
                      {status === 'planning' ? '계획' :
                       status === 'in_progress' ? '진행 중' :
                       status === 'development' ? '개발' :
                       status === 'testing' ? '테스트' :
                       status === 'completed' ? '완료' :
                       status === 'on_hold' ? '보류' :
                       status === 'cancelled' ? '취소' : status}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(count / dashboardData.summary.total_projects) * 100}
                        sx={{ width: 100, mr: 1 }}
                        color={
                          status === 'completed' ? 'success' :
                          status === 'in_progress' || status === 'development' ? 'info' :
                          status === 'testing' ? 'warning' :
                          status === 'on_hold' || status === 'cancelled' ? 'error' : 'primary'
                        }
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '30px' }}>
                        {count}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

          {/* QC/QA 검증 현황 */}
          {qcOverviewData && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      QC/QA 검증 현황
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleOpenQcDetailDialog}
                        sx={{ ml: 'auto' }}
                      >
                        상세보기
                      </Button>
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                            {qcOverviewData.total_requests || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            전체 검증 요청
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                            {qcOverviewData.pending_requests || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            대기 중
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                            {qcOverviewData.in_progress_requests || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            진행 중
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                            {qcOverviewData.completed_requests || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            완료
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* 평균 품질 점수 */}
                    {qcOverviewData.average_quality_score && (
                      <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                          평균 품질 점수: {qcOverviewData.average_quality_score}점
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={qcOverviewData.average_quality_score} 
                          sx={{ mt: 1, height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* 시스템 등록 승인 관리 */}
          {systemRegistrationRequests.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Card sx={{ backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#e65100', display: 'flex', alignItems: 'center', gap: 1 }}>
                      시스템 등록 최종 승인 필요
                      <Chip 
                        label={`${systemRegistrationRequests.length}건`} 
                        size="small" 
                        color="warning" 
                      />
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>프로젝트명</TableCell>
                            <TableCell>대상 시스템</TableCell>
                            <TableCell>PO 승인자</TableCell>
                            <TableCell>배포 우선순위</TableCell>
                            <TableCell>대상 환경</TableCell>
                            <TableCell>QC 품질점수</TableCell>
                            <TableCell>요청일</TableCell>
                            <TableCell>액션</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {systemRegistrationRequests.map((request) => (
                            <TableRow key={request.id} hover>
                              <TableCell>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {request.project_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {request.project_overview}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {request.target_system_name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {request.po_name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={
                                    request.deployment_priority === 'high' ? '높음' :
                                    request.deployment_priority === 'normal' ? '보통' : '낮음'
                                  }
                                  size="small"
                                  color={
                                    request.deployment_priority === 'high' ? 'error' :
                                    request.deployment_priority === 'normal' ? 'warning' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {request.target_environment === 'production' ? '운영' :
                                   request.target_environment === 'staging' ? '스테이징' : '개발'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                  {request.qc_quality_score ? `${request.qc_quality_score}점` : 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() => handleOpenRegistrationApprovalDialog(request)}
                                  sx={{
                                    backgroundColor: '#2e7d32',
                                    '&:hover': {
                                      backgroundColor: '#1b5e20'
                                    }
                                  }}
                                >
                                  최종 승인 처리
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

          {/* 프로젝트 생명주기 현황 */}
          {lifecycleData && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      프로젝트 생명주기 현황
                    </Typography>
                    
                    {/* 단계별 분포 */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                            {lifecycleData.lifecycle_overview?.approval_pending_count || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            승인 대기
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                            {lifecycleData.lifecycle_overview?.development_count || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            개발 진행
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                            {(lifecycleData.lifecycle_overview?.qc_pending_count || 0) + 
                             (lifecycleData.lifecycle_overview?.qc_in_progress_count || 0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            QC/QA 검증
                          </Typography>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                            {lifecycleData.lifecycle_overview?.approved_for_deployment_count || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            배포 승인
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* 병목 지점 분석 */}
                    {lifecycleData.bottleneck_analysis && lifecycleData.bottleneck_analysis.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          병목 지점 분석
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>단계</TableCell>
                                <TableCell align="right">평균 소요일</TableCell>
                                <TableCell align="right">지연 건수</TableCell>
                                <TableCell align="right">전체 건수</TableCell>
                                <TableCell align="right">지연율</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {lifecycleData.bottleneck_analysis.map((stage: any) => (
                                <TableRow key={stage.stage_name}>
                                  <TableCell>{stage.stage_display_name}</TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {stage.avg_duration_days || 0}일
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        color: stage.delayed_count > 0 ? 'error.main' : 'text.secondary',
                                        fontWeight: stage.delayed_count > 0 ? 600 : 400
                                      }}
                                    >
                                      {stage.delayed_count || 0}건
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">{stage.total_count || 0}건</TableCell>
                                  <TableCell align="right">
                                    <Chip 
                                      label={`${Math.round(((stage.delayed_count || 0) / Math.max(stage.total_count || 1, 1)) * 100)}%`}
                                      size="small"
                                      color={
                                        ((stage.delayed_count || 0) / Math.max(stage.total_count || 1, 1)) > 0.3 ? 'error' :
                                        ((stage.delayed_count || 0) / Math.max(stage.total_count || 1, 1)) > 0.1 ? 'warning' : 'success'
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    {/* 전체 통계 */}
                    <Grid container spacing={2} sx={{ mt: 3 }}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: 'error.main' }}>
                            {lifecycleData.lifecycle_overview?.delayed_projects_count || 0}건
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            지연 프로젝트
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {lifecycleData.lifecycle_overview?.avg_progress_percentage || 0}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            평균 진행률
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                            {lifecycleData.lifecycle_overview?.avg_quality_score || 0}점
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            평균 품질 점수
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* 지연 프로젝트 알림 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Card sx={{ backgroundColor: '#ffebee', border: '2px solid #f44336' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#c62828' }}>
                    지연 프로젝트 알림 관리
                    <Chip 
                      label={`${delayedProjects.length}건`} 
                      size="small" 
                      color="error" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>

                  {loadingDelayedProjects ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : delayedProjects.length === 0 ? (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      현재 지연된 프로젝트가 없습니다.
                    </Alert>
                  ) : (
                    <>
                      <Alert severity="warning" sx={{ mb: 3 }}>
                        {delayedProjects.length}개의 프로젝트가 지연되고 있습니다. 관련 담당자들에게 알림을 전송할 수 있습니다.
                      </Alert>

                      <TableContainer component={Paper} sx={{ mb: 3 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>프로젝트명</TableCell>
                              <TableCell>현재 단계</TableCell>
                              <TableCell>지연 유형</TableCell>
                              <TableCell>지연 시간</TableCell>
                              <TableCell>심각도</TableCell>
                              <TableCell>긴급도</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {delayedProjects.map((project, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {project.project_name}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={project.current_stage} 
                                    size="small" 
                                    color="info"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">
                                    {project.delay_type}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="error">
                                    {project.delay_hours}시간
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={project.severity} 
                                    size="small" 
                                    color={
                                      project.severity === 'critical' ? 'error' :
                                      project.severity === 'high' ? 'warning' :
                                      project.severity === 'medium' ? 'info' : 'default'
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={project.urgency} 
                                    size="small" 
                                    variant="outlined"
                                    color={
                                      project.urgency === 'high' ? 'error' :
                                      project.urgency === 'medium' ? 'warning' : 'default'
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ textAlign: 'center' }}>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => setDelayAlertsDialog(true)}
                          sx={{
                            backgroundColor: '#d32f2f',
                            '&:hover': {
                              backgroundColor: '#b71c1c'
                            }
                          }}
                        >
                          지연 프로젝트 알림 생성
                        </Button>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* PE 작업 현황 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        <TableRow key={pe.pe_name} hover>
                          <TableCell sx={{ fontWeight: 600 }}>
                            <Button
                              variant="text"
                              sx={{ 
                                p: 0, 
                                minWidth: 'auto',
                                fontWeight: 600,
                                color: 'primary.main',
                                '&:hover': {
                                  backgroundColor: 'transparent',
                                  textDecoration: 'underline'
                                }
                              }}
                              onClick={() => navigate(`/pe-dashboard?peId=${pe.pe_id}&peName=${encodeURIComponent(pe.pe_name)}`)}
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
                          <TableCell sx={{ width: '200px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={pe.avg_progress || 0}
                                sx={{ flex: 1 }}
                                color={getProgressColor(pe.avg_progress || 0)}
                              />
                              <Typography variant="caption" sx={{ minWidth: '40px' }}>
                                {typeof pe.avg_progress === 'number' ? pe.avg_progress.toFixed(0) : 0}%
                              </Typography>
                            </Box>
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
      </Grid>

      {/* 지식 자산 활용 현황 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                지식 자산 활용 통계 (최근 30일)
              </Typography>
              
              {dashboardData.knowledge_usage.length === 0 ? (
                <Alert severity="info">
                  최근 30일간 지식 자산 사용 기록이 없습니다.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dashboardData.knowledge_usage.map((usage) => (
                    <Box key={usage.asset_type} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        {usage.asset_type === 'code_component' ? '코드 컴포넌트' :
                         usage.asset_type === 'document' ? '문서' :
                         usage.asset_type === 'design_asset' ? '디자인 자산' :
                         usage.asset_type === 'system_template' ? '시스템 템플릿' : usage.asset_type}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          사용 횟수: {usage.usage_count}회 • 사용자: {usage.unique_users}명
                        </Typography>
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                          절약시간: {typeof usage.total_time_saved === 'number' ? usage.total_time_saved.toFixed(1) : 0}시간
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                성과 요약
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">총 PE 할당 건수</Typography>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                    {dashboardData.summary.total_pe_assignments}건
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">지식 자산 활용 건수</Typography>
                  <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 600 }}>
                    {dashboardData.summary.knowledge_assets_used}건
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">프로젝트 완료율</Typography>
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                    {dashboardData.summary.total_projects > 0 
                      ? (((dashboardData.summary.completed_projects || 0) / (dashboardData.summary.total_projects || 1)) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">총 절약 시간</Typography>
                  <Typography variant="h6" color="info.main" sx={{ fontWeight: 600 }}>
                    {(dashboardData.knowledge_usage?.reduce((sum, usage) => sum + (usage.total_time_saved || 0), 0) || 0).toFixed(1)}시간
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 빠른 액션 버튼들 */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="contained" 
            color="warning"
            fullWidth
            size="large"
            onClick={() => navigate('/admin/approvals/projects')}
            disabled={dashboardData.summary.pending_approvals === 0}
          >
            프로젝트 승인 ({dashboardData.summary.pending_approvals})
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="outlined" 
            color="primary"
            fullWidth
            size="large"
            onClick={() => navigate('/knowledge/projects')}
          >
            프로젝트 관리
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="outlined" 
            color="secondary"
            fullWidth
            size="large"
            onClick={() => navigate('/knowledge/dashboard')}
          >
            지식자원 카탈로그
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="outlined" 
            color="info"
            fullWidth
            size="large"
            onClick={() => window.location.reload()}
          >
            새로고침
          </Button>
        </Grid>
      </Grid>

      {/* [advice from AI] 프로젝트 리스트 다이얼로그 - 권한별 관리 기능 통합 */}
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
                    <TableCell>관리</TableCell>
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
                            {project.assignment_notes && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {project.assignment_notes}
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
                            label={
                              project.assignment_status === 'assigned' ? '할당됨' :
                              project.assignment_status === 'in_progress' ? '진행 중' :
                              project.assignment_status === 'paused' ? '일시정지' :
                              project.assignment_status === 'completed' ? '완료' :
                              project.approval_status === 'pending' ? '승인 대기' :
                              project.approval_status === 'approved' ? '승인됨' :
                              project.assignment_status || project.approval_status || '알 수 없음'
                            }
                            color={
                              project.assignment_status === 'in_progress' ? 'primary' :
                              project.assignment_status === 'completed' ? 'success' :
                              project.assignment_status === 'paused' ? 'warning' :
                              project.approval_status === 'pending' ? 'warning' :
                              project.approval_status === 'approved' ? 'info' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {project.progress_percentage !== undefined ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120 }}>
                              <LinearProgress
                                variant="determinate"
                                value={project.progress_percentage}
                                sx={{ flexGrow: 1, mr: 1 }}
                              />
                              <Typography variant="caption">
                                {project.progress_percentage}%
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              -
                            </Typography>
                          )}
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
                            {/* [advice from AI] 승인 대기 프로젝트의 승인/거부 버튼 */}
                            {project.approval_status === 'pending' && user && ['admin', 'executive'].includes(user.roleType) && (
                              <>
                                <Button
                                  onClick={() => {
                                    setSelectedProject(project);
                                    openApprovalDialog('approved');
                                  }}
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  sx={{ minWidth: 60, mr: 1 }}
                                >
                                  승인
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedProject(project);
                                    openApprovalDialog('rejected');
                                  }}
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  sx={{ minWidth: 60 }}
                                >
                                  거부
                                </Button>
                              </>
                            )}
                            
                            {/* [advice from AI] 모든 프로젝트의 상태 변경 버튼들 */}
                            {user && ['admin', 'executive'].includes(user.roleType) && (
                              <>
                                {/* 승인 대기 프로젝트 전용 버튼들은 이미 위에 있음 */}
                                
                                {/* 승인된 프로젝트 전용 버튼들 */}
                                {project.approval_status === 'approved' && (
                                  <>
                                    <Button
                                      onClick={() => {
                                        setSelectedProject(project);
                                        openStatusChangeDialog('cancel_approval');
                                      }}
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      sx={{ minWidth: 80, mr: 1 }}
                                    >
                                      승인 취소
                                    </Button>
                                    
                                    {project.project_status !== 'on_hold' && (
                                      <Button
                                        onClick={() => {
                                          setSelectedProject(project);
                                          openStatusChangeDialog('hold');
                                        }}
                                        size="small"
                                        variant="outlined"
                                        color="info"
                                        sx={{ minWidth: 70, mr: 1 }}
                                      >
                                        일시 중단
                                      </Button>
                                    )}
                                  </>
                                )}
                                
                                {/* 모든 프로젝트 공통 상태 변경 버튼 */}
                                <Button
                                  onClick={() => {
                                    setSelectedProject(project);
                                    openStatusChangeDialog('change_status');
                                  }}
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  sx={{ minWidth: 60 }}
                                >
                                  설정
                                </Button>
                              </>
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


      {/* [advice from AI] PE 재할당 다이얼로그 */}
      <Dialog open={reassignDialog} onClose={() => setReassignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              PE 재할당
            </Typography>
            <IconButton onClick={() => setReassignDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
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
                {selectedProject.work_group_name && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>작업 그룹:</strong> {selectedProject.work_group_name}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>현재 담당 PE:</strong> {selectedProject.assigned_pe_name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>진행률:</strong> {selectedProject.progress_percentage || 0}%
                </Typography>
                <Typography variant="body2">
                  <strong>상태:</strong> 
                  <Chip 
                    label={selectedProject.assignment_status} 
                    size="small" 
                    sx={{ ml: 1 }} 
                  />
                </Typography>
              </Box>

              {/* PE 선택 */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>새로운 담당 PE *</InputLabel>
                <Select
                  value={selectedPE}
                  onChange={(e) => setSelectedPE(e.target.value)}
                  label="새로운 담당 PE *"
                  disabled={loadingPEs}
                >
                  {availablePEs.map((pe) => (
                    <MenuItem key={pe.id} value={pe.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>
                          {pe.full_name} ({pe.username})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          작업: {pe.current_assignments || 0}개 | 워크로드: {pe.workload_level || 'Normal'}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 재할당 사유 */}
              <TextField
                fullWidth
                label="재할당 사유 *"
                multiline
                rows={3}
                placeholder="PE 재할당 사유를 상세히 입력해주세요..."
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                sx={{ mb: 2 }}
              />

              {/* 선택된 PE의 워크로드 정보 */}
              {selectedPE && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>선택된 PE 정보:</strong><br />
                    {availablePEs.find(pe => pe.id === selectedPE)?.full_name}님의 현재 작업량: {' '}
                    {availablePEs.find(pe => pe.id === selectedPE)?.current_assignments || 0}개<br />
                    워크로드 레벨: {availablePEs.find(pe => pe.id === selectedPE)?.workload_level || 'Normal'}
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setReassignDialog(false)}
            disabled={submitting}
          >
            취소
          </Button>
          <Button 
            onClick={handleReassignment}
            variant="contained"
            disabled={submitting || !selectedPE || !reassignReason.trim()}
          >
            {submitting ? '처리 중...' : '재할당 실행'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 승인/거부 다이얼로그 */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">
            프로젝트 {approvalAction === 'approved' ? '승인' : '거부'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {selectedProject.project_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedProject.description || '프로젝트 설명이 없습니다.'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip 
                  label={`긴급도: ${selectedProject.urgency_level}`} 
                  color={selectedProject.urgency_level === 'critical' ? 'error' : 
                         selectedProject.urgency_level === 'high' ? 'warning' : 'info'}
                  size="small" 
                />
                {selectedProject.deadline && (
                  <Chip 
                    label={`마감: ${new Date(selectedProject.deadline).toLocaleDateString()}`}
                    variant="outlined"
                    size="small" 
                  />
                )}
              </Box>
            </Box>
          )}
          
          <TextField
            fullWidth
            label={`${approvalAction === 'approved' ? '승인' : '거부'} 사유`}
            multiline
            rows={3}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder={approvalAction === 'approved' 
              ? '승인 사유를 입력해주세요. (예: 요구사항이 명확하고 실현 가능합니다.)'
              : '거부 사유를 입력해주세요. (예: 요구사항이 불명확하여 추가 검토가 필요합니다.)'
            }
            required
            sx={{ mb: 2 }}
          />
          
          <Alert severity={approvalAction === 'approved' ? 'success' : 'warning'} sx={{ mt: 1 }}>
            {approvalAction === 'approved' 
              ? '승인 시 프로젝트가 PO에게 할당되어 개발 준비 단계로 진행됩니다.'
              : '거부 시 프로젝트 요청자에게 수정 요청이 전달됩니다.'
            }
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApprovalDialog(false)}
            disabled={approvalSubmitting}
          >
            취소
          </Button>
          <Button 
            onClick={handleProjectApproval}
            variant="contained"
            color={approvalAction === 'approved' ? 'success' : 'error'}
            disabled={!approvalComment.trim() || approvalSubmitting}
          >
            {approvalSubmitting ? '처리 중...' : (approvalAction === 'approved' ? '승인' : '거부')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 상태 변경 다이얼로그 */}
      <Dialog open={statusChangeDialog} onClose={() => setStatusChangeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">
            프로젝트 상태 변경
          </Typography>
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
                  <strong>현재 승인 상태:</strong> {
                    selectedProject.approval_status === 'pending' ? '승인 대기' :
                    selectedProject.approval_status === 'approved' ? '승인됨' :
                    selectedProject.approval_status === 'rejected' ? '거부됨' : selectedProject.approval_status
                  }
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>현재 프로젝트 상태:</strong> {
                    selectedProject.project_status === 'planning' ? '기획 중' :
                    selectedProject.project_status === 'in_progress' ? '진행 중' :
                    selectedProject.project_status === 'completed' ? '완료' :
                    selectedProject.project_status === 'on_hold' ? '일시 중단' :
                    selectedProject.project_status === 'cancelled' ? '취소' : selectedProject.project_status
                  }
                </Typography>
                <Typography variant="body2">
                  <strong>긴급도:</strong> {selectedProject.urgency_level}
                </Typography>
              </Box>

              {/* 액션 타입별 설명 */}
              <Box sx={{ mb: 3 }}>
                <Alert severity={
                  statusChangeAction === 'cancel_approval' ? 'warning' :
                  statusChangeAction === 'hold' ? 'info' :
                  statusChangeAction === 'cancel' ? 'error' : 'info'
                }>
                  <Typography variant="body2">
                    <strong>
                      {statusChangeAction === 'cancel_approval' && '승인 취소'}
                      {statusChangeAction === 'hold' && '프로젝트 일시 중단'}
                      {statusChangeAction === 'cancel' && '프로젝트 취소'}
                      {statusChangeAction === 'change_status' && '상태 변경'}
                    </strong><br />
                    {statusChangeAction === 'cancel_approval' && '승인된 프로젝트를 다시 승인 대기 상태로 되돌립니다.'}
                    {statusChangeAction === 'hold' && '프로젝트를 일시적으로 중단합니다. 나중에 재개할 수 있습니다.'}
                    {statusChangeAction === 'cancel' && '프로젝트를 완전히 취소합니다. 이 작업은 신중히 결정해주세요.'}
                    {statusChangeAction === 'change_status' && '프로젝트의 승인 상태나 진행 상태를 변경합니다.'}
                  </Typography>
                </Alert>
              </Box>

              {/* 상태 변경 옵션 (change_status인 경우만) */}
              {statusChangeAction === 'change_status' && (
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>승인 상태</InputLabel>
                        <Select
                          value={newApprovalStatus}
                          onChange={(e) => setNewApprovalStatus(e.target.value)}
                          label="승인 상태"
                        >
                          <MenuItem value="pending">승인 대기</MenuItem>
                          <MenuItem value="approved">승인됨</MenuItem>
                          <MenuItem value="rejected">거부됨</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>프로젝트 상태</InputLabel>
                        <Select
                          value={newProjectStatus}
                          onChange={(e) => setNewProjectStatus(e.target.value)}
                          label="프로젝트 상태"
                        >
                          <MenuItem value="planning">기획 중</MenuItem>
                          <MenuItem value="in_progress">진행 중</MenuItem>
                          <MenuItem value="development">개발 중</MenuItem>
                          <MenuItem value="testing">테스트 중</MenuItem>
                          <MenuItem value="completed">완료</MenuItem>
                          <MenuItem value="on_hold">일시 중단</MenuItem>
                          <MenuItem value="cancelled">취소</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* PE 변경 옵션 */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'info.main', mr: 2 }}>
                        👨‍💼 PE 할당 변경
                      </Typography>
                      <FormControl>
                        <Select
                          size="small"
                          value={changePE ? 'yes' : 'no'}
                          onChange={(e) => setChangePE(e.target.value === 'yes')}
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="no">변경하지 않음</MenuItem>
                          <MenuItem value="yes">PE 변경</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {selectedProject && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        <strong>현재 담당 PE:</strong> {selectedProject.assigned_pe_name || '미할당'}
                      </Typography>
                    )}

                    {changePE && (
                      <Box>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>새로운 담당 PE</InputLabel>
                          <Select
                            value={newAssignedPE}
                            onChange={(e) => setNewAssignedPE(e.target.value)}
                            label="새로운 담당 PE"
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

                        {newAssignedPE && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              {availablePEs.find(pe => pe.id === newAssignedPE)?.full_name}님에게 할당됩니다.
                              <br />현재 작업량: {availablePEs.find(pe => pe.id === newAssignedPE)?.current_assignments || 0}개
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* 변경 사유 입력 */}
              <TextField
                fullWidth
                label="변경 사유"
                multiline
                rows={3}
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder={
                  statusChangeAction === 'cancel_approval' ? '승인을 취소하는 사유를 입력해주세요.' :
                  statusChangeAction === 'hold' ? '프로젝트를 일시 중단하는 사유를 입력해주세요.' :
                  statusChangeAction === 'cancel' ? '프로젝트를 취소하는 사유를 입력해주세요.' :
                  '상태를 변경하는 사유를 입력해주세요.'
                }
                required
                sx={{ mb: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setStatusChangeDialog(false)}
            disabled={statusSubmitting}
          >
            취소
          </Button>
          <Button 
            onClick={handleStatusChange}
            variant="contained"
            color={
              statusChangeAction === 'cancel_approval' ? 'warning' :
              statusChangeAction === 'hold' ? 'info' :
              statusChangeAction === 'cancel' ? 'error' : 'primary'
            }
            disabled={!statusChangeReason.trim() || statusSubmitting}
          >
            {statusSubmitting ? '처리 중...' : 
             statusChangeAction === 'cancel_approval' ? '승인 취소' :
             statusChangeAction === 'hold' ? '일시 중단' :
             statusChangeAction === 'cancel' ? '프로젝트 취소' : '상태 변경'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* 시스템 등록 승인 다이얼로그 */}
      <Dialog 
        open={registrationApprovalDialog} 
        onClose={() => setRegistrationApprovalDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          시스템 등록 최종 승인
          {selectedRegistrationRequest && (
            <Typography variant="subtitle2" color="text.secondary">
              프로젝트: {selectedRegistrationRequest.project_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedRegistrationRequest && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* 프로젝트 정보 요약 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    프로젝트 정보
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">프로젝트명</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {selectedRegistrationRequest.project_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">대상 시스템</Typography>
                        <Typography variant="body1">
                          {selectedRegistrationRequest.target_system_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">프로젝트 개요</Typography>
                        <Typography variant="body1">
                          {selectedRegistrationRequest.project_overview}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* QC/QA 검증 결과 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    QC/QA 검증 결과
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">품질 점수</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                          {selectedRegistrationRequest.qc_quality_score || 'N/A'}점
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">승인 상태</Typography>
                        <Chip 
                          label="승인 완료"
                          color="success"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">승인일</Typography>
                        <Typography variant="body1">
                          {selectedRegistrationRequest.qc_approved_at ? 
                            new Date(selectedRegistrationRequest.qc_approved_at).toLocaleString() : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* PO 승인 정보 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    PO 승인 정보
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">승인자</Typography>
                        <Typography variant="body1">
                          {selectedRegistrationRequest.po_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">배포 우선순위</Typography>
                        <Chip 
                          label={
                            selectedRegistrationRequest.deployment_priority === 'high' ? '높음' :
                            selectedRegistrationRequest.deployment_priority === 'normal' ? '보통' : '낮음'
                          }
                          size="small"
                          color={
                            selectedRegistrationRequest.deployment_priority === 'high' ? 'error' :
                            selectedRegistrationRequest.deployment_priority === 'normal' ? 'warning' : 'default'
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">PO 승인 사유</Typography>
                        <Typography variant="body1">
                          {selectedRegistrationRequest.registration_notes || '사유 없음'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* 관리자 결정 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    최종 승인 결정
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>결정</InputLabel>
                    <Select
                      value={registrationDecision.decision}
                      onChange={(e) => setRegistrationDecision(prev => ({
                        ...prev,
                        decision: e.target.value
                      }))}
                      label="결정"
                    >
                      <MenuItem value="approve">승인 - 시스템 등록 및 배포 진행</MenuItem>
                      <MenuItem value="reject">반려 - 추가 검토 필요</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* 배포 일정 (승인 시에만) */}
                {registrationDecision.decision === 'approve' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="배포 예정 일정"
                      value={registrationDecision.deployment_schedule}
                      onChange={(e) => setRegistrationDecision(prev => ({
                        ...prev,
                        deployment_schedule: e.target.value
                      }))}
                      placeholder="예: 2024-01-15 14:00 또는 즉시 배포"
                      helperText="배포 예정 일정을 입력해주세요 (선택사항)"
                    />
                  </Grid>
                )}

                {/* 관리자 메모 */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label={registrationDecision.decision === 'approve' ? '승인 사유 및 배포 지시사항' : '반려 사유 및 추가 검토 사항'}
                    value={registrationDecision.admin_notes}
                    onChange={(e) => setRegistrationDecision(prev => ({
                      ...prev,
                      admin_notes: e.target.value
                    }))}
                    required
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegistrationApprovalDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleRegistrationDecision}
            disabled={submittingRegistrationDecision || !registrationDecision.admin_notes.trim()}
            color={registrationDecision.decision === 'approve' ? 'success' : 'error'}
            sx={{
              px: 3,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {submittingRegistrationDecision ? '처리 중...' : 
             registrationDecision.decision === 'approve' ? '최종 승인' : '반려 처리'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 지연 프로젝트 알림 생성 다이얼로그 */}
      <Dialog 
        open={delayAlertsDialog} 
        onClose={() => setDelayAlertsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          지연 프로젝트 알림 생성
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            선택된 지연 프로젝트들에 대해 관련 담당자들에게 자동으로 알림이 전송됩니다.
          </Alert>

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            알림 대상 프로젝트: {delayedProjects.length}건
          </Typography>

          <Box sx={{ mb: 3 }}>
            {delayedProjects.map((project, index) => (
              <Box key={index} sx={{ 
                p: 2, 
                mb: 1, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                backgroundColor: '#fafafa'
              }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                  {project.project_name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`단계: ${project.current_stage}`} size="small" color="info" />
                  <Chip label={`지연: ${project.delay_hours}시간`} size="small" color="error" />
                  <Chip label={`심각도: ${project.severity}`} size="small" color="warning" />
                </Box>
              </Box>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary">
            알림은 다음 담당자들에게 전송됩니다:
          </Typography>
          <ul>
            <li>프로젝트 담당 PE</li>
            <li>해당 PO</li>
            <li>QC/QA 담당자 (해당하는 경우)</li>
            <li>최고 관리자</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelayAlertsDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleGenerateDelayAlerts}
            disabled={generatingAlerts || delayedProjects.length === 0}
            sx={{
              backgroundColor: '#d32f2f',
              '&:hover': {
                backgroundColor: '#b71c1c'
              }
            }}
          >
            {generatingAlerts ? '알림 생성 중...' : '알림 생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExecutiveDashboard;
