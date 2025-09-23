// [advice from AI] PE 대시보드 페이지
// Phase 3: PE 업무 지원 시스템의 통합 대시보드

import React, { useState, useEffect } from 'react';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  RadioGroup,
  Radio,
  FormControlLabel
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';
// [advice from AI] 아이콘 사용 자제 - 모든 아이콘 import 제거

interface DashboardStats {
  total_tasks: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  paused_tasks: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  avg_progress: number;
}

interface RecentActivity {
  title: string;
  status: string;
  progress_percentage: number;
  last_activity_at: string;
  project_name: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress_percentage: number;
  estimated_hours: number;
  actual_hours?: number;
  project_name: string;
  created_by_name: string;
  last_activity_at?: string;
}

const PEDashboard: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  const [searchParams] = useSearchParams();
  
  const [stats, setStats] = useState<DashboardStats>({
    total_tasks: 0,
    assigned_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    paused_tasks: 0,
    total_estimated_hours: 0,
    total_actual_hours: 0,
    avg_progress: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // [advice from AI] 작업 시작/레포지토리 등록 다이얼로그 상태
  const [workStartDialog, setWorkStartDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [gitService, setGitService] = useState('github'); // github, gitlab, bitbucket
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{success: boolean, message: string} | null>(null);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [workStartNotes, setWorkStartNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // [advice from AI] 작업 시작 단계별 승인 과정 상태
  const [currentStep, setCurrentStep] = useState(0); // 0: 요구사항, 1: 일정계획, 2: 레포지토리, 3: 최종승인
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  
  // 1단계: 요구사항 검토
  const [requirementsConfirmed, setRequirementsConfirmed] = useState(false);
  const [requirementsFeedback, setRequirementsFeedback] = useState('');
  const [documentsReviewed, setDocumentsReviewed] = useState<string[]>([]);
  
  // 2단계: 일정 계획
  const [peEstimatedCompletionDate, setPeEstimatedCompletionDate] = useState('');
  const [difficultyFeedback, setDifficultyFeedback] = useState('as_expected');
  const [plannedMilestones, setPlannedMilestones] = useState<any[]>([]);
  
  // 3단계: 레포지토리 설정 (기존 변수 활용)
  // repositoryUrl, accessToken, estimatedHours, workStartNotes
  
  // 4단계: 최종 승인
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [workStartConfirmation, setWorkStartConfirmation] = useState('');
  
  // [advice from AI] 작업 거부 관련 상태
  const [workRejectionDialog, setWorkRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionCategory, setRejectionCategory] = useState('technical_impossible');
  const [rejectionDetails, setRejectionDetails] = useState('');
  
  // [advice from AI] Admin용 PE 선택 상태
  const [selectedPEUser, setSelectedPEUser] = useState<string>('');
  const [peUsers, setPeUsers] = useState<any[]>([]);
  const [loadingPEUsers, setLoadingPEUsers] = useState(false);
  
  // [advice from AI] URL 파라미터로 전달된 PE 정보
  const urlPeId = searchParams.get('peId');
  const urlPeName = searchParams.get('peName');
  
  // [advice from AI] 프로젝트 리스트 다이얼로그 상태 (PE 권한)
  const [projectListDialog, setProjectListDialog] = useState(false);
  const [projectListTitle, setProjectListTitle] = useState('');
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // [advice from AI] API URL 결정
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return `http://${currentHost.split(':')[0]}:3000`;
    }
  };

  // [advice from AI] PE 사용자 목록 로드 (Admin용)
  const loadPEUsers = async () => {
    try {
      setLoadingPEUsers(true);
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
          setPeUsers(result.data);
          console.log('✅ PE 사용자 목록 로드 완료:', result.data.length, '개');
          
          // 현재 로그인한 사용자가 PE인 경우만 자동 선택
          if (user?.roleType === 'pe') {
            setSelectedPEUser(user.id);
            console.log('🔧 PE 사용자 - 본인 계정 자동 선택:', user.username);
          }
          // Admin/PO/Executive인 경우 수동 선택하도록 변경 (자동 선택 제거)
        }
      }
    } catch (error) {
      console.error('❌ PE 사용자 목록 로드 실패:', error);
    } finally {
      setLoadingPEUsers(false);
    }
  };

  // [advice from AI] 할당된 프로젝트 로드 (선택된 PE용)
  const loadAssignedProjects = async (targetPEUserId?: string) => {
    try {
      const apiUrl = getApiUrl();
      
      // Admin/PO/Executive이고 특정 PE를 선택한 경우, 해당 PE의 프로젝트 조회
      const isManagerViewingPE = (user?.roleType === 'admin' || user?.roleType === 'executive' || user?.roleType === 'po') && (targetPEUserId || selectedPEUser);
      const peUserId = targetPEUserId || selectedPEUser;
      
      const endpoint = isManagerViewingPE && peUserId 
        ? `${apiUrl}/api/projects/assigned/${peUserId}`
        : `${apiUrl}/api/projects/assigned/me`;
      
      console.log('📋 할당 프로젝트 조회:', { isManagerViewingPE, peUserId, endpoint });
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAssignedProjects(result.data);
          console.log('✅ PE 할당 프로젝트 로드 완료:', result.data.length, '개');
          
          // 통계 계산
          const totalTasks = result.data.length;
          const assignedTasks = result.data.filter((p: any) => p.assignment_status === 'assigned').length;
          const inProgressTasks = result.data.filter((p: any) => p.assignment_status === 'in_progress').length;
          const avgProgress = result.data.length > 0 
            ? result.data.reduce((sum: number, p: any) => sum + (p.progress_percentage || 0), 0) / result.data.length 
            : 0;
          
          setStats({
            total_tasks: totalTasks,
            assigned_tasks: assignedTasks,
            in_progress_tasks: inProgressTasks,
            completed_tasks: 0, // 완료된 작업은 다른 API에서
            paused_tasks: 0,
            total_estimated_hours: 0,
            total_actual_hours: 0,
            avg_progress: Math.round(avgProgress)
          });
        }
      }
    } catch (error) {
      console.error('❌ 할당된 프로젝트 로드 실패:', error);
    }
  };

  // [advice from AI] 데이터 로드 함수들 (실제 데이터 기반)
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Admin/PO/Executive인 경우 PE 사용자 목록 먼저 로드
      if (user?.roleType === 'admin' || user?.roleType === 'executive' || user?.roleType === 'po') {
        await loadPEUsers();
      }
      
      // 실제 할당된 프로젝트 로드
      await loadAssignedProjects();
      
      // 목업 활동 데이터 (추후 실제 API로 교체 예정)
      setRecentActivity([
        {
          title: 'Git 커밋 활동 기반 실제 데이터로 교체 예정',
          status: 'active',
          progress_percentage: 75,
          last_activity_at: new Date().toISOString(),
          project_name: '시스템 개발'
        }
      ]);
      
    } catch (error) {
      console.error('❌ 대시보드 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // [advice from AI] 카드 클릭 핸들러 - 할당된 프로젝트 리스트 다이얼로그 열기 (PE 권한)
  const handleCardClick = async (cardType: string) => {
    console.log('🔍 PE 카드 클릭:', cardType);
    
    let title = '';
    
    switch (cardType) {
      case 'total':
        title = '전체 할당 작업';
        break;
      case 'in_progress':
        title = '진행 중인 작업';
        break;
      case 'completed':
        title = '완료된 작업';
        break;
      case 'paused':
        title = '일시 중단된 작업';
        break;
      default:
        title = '할당된 작업';
    }
    
    setProjectListTitle(title);
    setProjectListDialog(true);
    
    // 현재 할당된 프로젝트를 필터링해서 표시
    const filteredProjects = assignedProjects.filter(project => {
      switch (cardType) {
        case 'in_progress':
          // 실제로 작업이 시작된 프로젝트만 (assigned 상태 제외)
          return project.assignment_status === 'in_progress';
        case 'completed':
          return project.assignment_status === 'completed';
        case 'paused':
          return project.assignment_status === 'paused';
        default:
          return true;
      }
    });
    
    setProjectList(filteredProjects);
  };

  // [advice from AI] 단계별 승인 완료 후 작업 시작 처리
  const handleStartWork = async () => {
    console.log('🚀 작업 시작 검증:', {
      selectedProject: selectedProject,
      projectId: selectedProject?.project_id,
      projectName: selectedProject?.project_name,
      repositoryUrl: repositoryUrl,
      accessToken: accessToken ? '***설정됨***' : '없음',
      gitService: gitService,
      workStartDialog: workStartDialog
    });

    // 작업 시작 다이얼로그가 열려있다면 프로젝트가 선택된 상태여야 함
    if (!selectedProject) {
      console.error('❌ selectedProject가 null입니다. 다이얼로그 상태 확인 필요');
      alert('시스템 오류: 프로젝트 정보를 찾을 수 없습니다. 다이얼로그를 닫고 다시 시도해주세요.');
      return;
    }

    if (!selectedProject.project_id) {
      console.error('❌ project_id가 없습니다:', selectedProject);
      alert('시스템 오류: 프로젝트 ID가 없습니다. 다이얼로그를 닫고 다시 시도해주세요.');
      return;
    }

    if (!repositoryUrl.trim()) {
      alert('레포지토리 URL을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const apiUrl = getApiUrl();

      // 단계별 승인 데이터 구성
      const approvalData = {
        // 레포지토리 정보
        repository_url: repositoryUrl,
        access_token: accessToken || null,
        work_group_id: selectedProject?.work_group_id,
        
        // 요구사항 검토 결과
        requirements_feedback: requirementsFeedback,
        documents_reviewed: documentsReviewed,
        requirements_confirmed: requirementsConfirmed,
        
        // 일정 계획 결과
        pe_estimated_completion_date: peEstimatedCompletionDate,
        estimated_hours: estimatedHours ? parseInt(estimatedHours) : null,
        difficulty_feedback: difficultyFeedback,
        planned_milestones: plannedMilestones.filter(m => m.name.trim()),
        
        // 기술 및 환경 정보
        work_notes: workStartNotes,
        
        // 최종 승인 확인
        work_start_confirmation: workStartConfirmation,
        final_confirmation: finalConfirmation,
        
        // 메타데이터
        approval_completed_at: new Date().toISOString(),
        approval_process_steps: currentStep + 1
      };

      console.log('🚀 단계별 작업 시작 승인 데이터:', approvalData);

      // 작업 시작 승인 API 호출
      const response = await fetch(`${apiUrl}/api/dev-environment/projects/${selectedProject?.project_id}/work-start-approval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(approvalData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const milestonesCount = plannedMilestones.filter(m => m.name.trim()).length;
          const successMessage = `🎉 작업 시작이 성공적으로 승인되었습니다!

📋 승인 완료 내용:
✅ 요구사항 검토: ${documentsReviewed.length}개 문서 검토 완료
✅ 일정 계획: ${peEstimatedCompletionDate} 완료 예정 (${estimatedHours}시간)
✅ 마일스톤: ${milestonesCount}개 등록
✅ 레포지토리: ${repositoryUrl}
✅ 진행률 추적 시작

이제 개발을 시작하세요! 🚀`;

          alert(successMessage);
          closeWorkStartDialog();
          loadAssignedProjects(); // 데이터 새로고침
          loadDashboardData(); // 대시보드 새로고침
        } else {
          alert(`작업 시작 승인 실패: ${result.message}`);
        }
      } else {
        const errorText = await response.text();
        alert(`서버 오류: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ 작업 시작 승인 오류:', error);
      alert(`작업 시작 승인 실패: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // [advice from AI] 작업 시작 다이얼로그 닫기
  const closeWorkStartDialog = () => {
    setWorkStartDialog(false);
    setSelectedProject(null);
    resetWorkStartForm();
  };

  // [advice from AI] 작업 시작 폼 초기화
  const resetWorkStartForm = () => {
    // 주의: selectedProject는 여기서 초기화하지 않음 (다이얼로그 열 때 설정되므로)
    setCurrentStep(0);
    
    // 레포지토리 관련
    setRepositoryUrl('');
    setAccessToken('');
    setEstimatedHours('');
    setWorkStartNotes('');
    
    // 요구사항 검토
    setProjectDocuments([]);
    setRequirementsConfirmed(false);
    setRequirementsFeedback('');
    setDocumentsReviewed([]);
    
    // 일정 계획
    setPeEstimatedCompletionDate('');
    setDifficultyFeedback('as_expected');
    setPlannedMilestones([]);
    
    // 최종 승인
    setFinalConfirmation(false);
    setWorkStartConfirmation('');
  };

  // [advice from AI] 프로젝트 문서 로드
  const loadProjectDocuments = async (projectId: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.documents) {
          setProjectDocuments(result.data.documents);
          console.log('✅ 프로젝트 문서 로드 완료:', result.data.documents.length, '개');
        }
      }
    } catch (error) {
      console.error('❌ 프로젝트 문서 로드 실패:', error);
    }
  };

  // [advice from AI] 작업 시작 다이얼로그 열기
  const openWorkStartDialog = (project: any) => {
    console.log('📋 작업 시작 다이얼로그 열기:', {
      project: project,
      projectId: project?.project_id,
      projectName: project?.project_name,
      hasProjectId: !!project?.project_id
    });
    
    if (!project || !project.project_id) {
      console.error('❌ 유효하지 않은 프로젝트 데이터:', project);
      alert('프로젝트 정보가 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해주세요.');
      return;
    }
    
    // 프로젝트 설정을 먼저 하고 나머지 상태들을 설정
    setSelectedProject(project);
    
    // 다음 렌더링 사이클에서 다이얼로그 열기
    setTimeout(() => {
      setWorkStartDialog(true);
      setCurrentStep(0); // 요구사항 검토부터 시작
      resetWorkStartForm();
      loadProjectDocuments(project.project_id);
      
      // 프로젝트 정보에서 기본값 설정
      if (project.due_date) {
        setPeEstimatedCompletionDate(project.due_date);
      }
      if (project.estimated_hours) {
        setEstimatedHours(project.estimated_hours.toString());
      }
      
      console.log('✅ 작업 시작 다이얼로그 설정 완료');
    }, 0);
  };

  // [advice from AI] 단계별 진행 관리
  const stepTitles = [
    '요구사항 검토',
    '일정 계획 수립', 
    '레포지토리 설정',
    '최종 승인'
  ];

  // [advice from AI] 다음 단계로 진행
  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  // [advice from AI] 이전 단계로 돌아가기
  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // [advice from AI] 현재 단계 완료 가능 여부 확인
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // 요구사항 검토
        return requirementsConfirmed && requirementsFeedback.trim().length > 0;
      case 1: // 일정 계획
        return peEstimatedCompletionDate && estimatedHours;
      case 2: // 레포지토리 설정
        return repositoryUrl.trim().length > 0;
      case 3: // 최종 승인
        return finalConfirmation && workStartConfirmation.trim().length > 0;
      default:
        return false;
    }
  };

  // [advice from AI] 문서 검토 상태 토글
  const toggleDocumentReview = (docId: string) => {
    if (documentsReviewed.includes(docId)) {
      setDocumentsReviewed(documentsReviewed.filter(id => id !== docId));
    } else {
      setDocumentsReviewed([...documentsReviewed, docId]);
    }
  };

  // [advice from AI] 마일스톤 추가
  const addMilestone = () => {
    const newMilestone = {
      id: Date.now().toString(),
      name: '',
      target_date: '',
      description: '',
      weight: 1
    };
    setPlannedMilestones([...plannedMilestones, newMilestone]);
  };

  // [advice from AI] 마일스톤 업데이트
  const updateMilestone = (id: string, field: string, value: any) => {
    setPlannedMilestones(plannedMilestones.map(milestone => 
      milestone.id === id ? { ...milestone, [field]: value } : milestone
    ));
  };

  // [advice from AI] 마일스톤 삭제
  const removeMilestone = (id: string) => {
    setPlannedMilestones(plannedMilestones.filter(milestone => milestone.id !== id));
  };

  // [advice from AI] 문서 다운로드
  const handleDocumentDownload = async (projectId: string, documentId: string, filename: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/projects/${projectId}/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('❌ 문서 다운로드 실패:', error);
    }
  };

  // [advice from AI] 작업 거부 다이얼로그 열기
  const openWorkRejectionDialog = (project: any) => {
    setSelectedProject(project);
    setWorkRejectionDialog(true);
    setRejectionReason('');
    setRejectionCategory('technical_impossible');
    setRejectionDetails('');
  };

  // [advice from AI] Git 레포지토리 연결 테스트
  const testRepositoryConnection = async () => {
    if (!repositoryUrl.trim()) {
      setConnectionResult({
        success: false,
        message: '레포지토리 URL을 입력해주세요.'
      });
      return;
    }

    setConnectionTesting(true);
    setConnectionResult(null);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/dev-environment/test-repository-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_url: repositoryUrl,
          access_token: accessToken,
          git_service: gitService
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConnectionResult({
          success: true,
          message: `✅ ${gitService.toUpperCase()} 연결 성공! 레포지토리에 접근할 수 있습니다.`
        });
      } else {
        setConnectionResult({
          success: false,
          message: `❌ 연결 실패: ${result.message || '알 수 없는 오류'}`
        });
      }
    } catch (error) {
      console.error('Repository connection test error:', error);
      setConnectionResult({
        success: false,
        message: '❌ 연결 테스트 중 오류가 발생했습니다.'
      });
    } finally {
      setConnectionTesting(false);
    }
  };

  // [advice from AI] 작업 거부 처리
  const handleWorkRejection = async () => {
    if (!selectedProject?.project_id || !rejectionReason.trim()) {
      alert('프로젝트가 선택되지 않았거나 거부 사유를 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const apiUrl = getApiUrl();

      const rejectionData = {
        project_id: selectedProject?.project_id,
        assignment_id: selectedProject?.assignment_id,
        rejection_category: rejectionCategory,
        rejection_reason: rejectionReason,
        rejection_details: rejectionDetails,
        rejected_at: new Date().toISOString(),
        rejected_by: user?.id
      };

      console.log('❌ 작업 거부 요청:', rejectionData);

      const response = await fetch(`${apiUrl}/api/work-rejection/${selectedProject?.project_id}/reject-assignment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rejectionData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(`작업이 거부되었습니다.\n\nPO에게 재검토 요청이 전달되었습니다.\n거부 사유: ${rejectionReason}`);
          setWorkRejectionDialog(false);
          loadAssignedProjects(); // 데이터 새로고침
        } else {
          alert(`작업 거부 실패: ${result.message}`);
        }
      } else {
        const errorText = await response.text();
        alert(`서버 오류: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ 작업 거부 오류:', error);
      alert(`작업 거부 실패: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // [advice from AI] PE 선택 변경 핸들러 (Admin용)
  const handlePEUserChange = async (peUserId: string) => {
    setSelectedPEUser(peUserId);
    console.log('🔄 PE 사용자 변경:', peUserId);
    
    // 선택된 PE의 프로젝트 다시 로드
    setIsLoading(true);
    await loadAssignedProjects(peUserId);
    setIsLoading(false);
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드 (PE/Admin/PO/Executive 계정)
  useEffect(() => {
    if (token && user && (user.roleType === 'pe' || user.roleType === 'admin' || user.roleType === 'executive' || user.roleType === 'po')) {
      console.log('✅ PE 대시보드 로딩 시작 - 사용자:', user.roleType);
      loadDashboardData();
      
      // 주기적 데이터 새로고침 (30초마다)
      const interval = setInterval(() => {
        loadDashboardData();
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      console.log('❌ PE 대시보드 접근 권한 없음:', user?.roleType);
    }
  }, [token, user]);

  // [advice from AI] selectedPEUser 변경 시 할당된 프로젝트 다시 로드
  // [advice from AI] URL 파라미터 처리 - PO에서 PE 클릭 시
  useEffect(() => {
    if (urlPeId && peUsers.length > 0) {
      console.log('🔗 URL 파라미터로 PE 선택:', urlPeId, urlPeName);
      setSelectedPEUser(urlPeId);
      // 즉시 데이터 로드
      loadAssignedProjects(urlPeId);
    }
  }, [urlPeId, peUsers]);

  useEffect(() => {
    if (selectedPEUser && (user?.roleType === 'admin' || user?.roleType === 'executive' || user?.roleType === 'po')) {
      console.log('🔄 선택된 PE 변경 - 프로젝트 다시 로드:', selectedPEUser);
      loadAssignedProjects(selectedPEUser);
    }
  }, [selectedPEUser]);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {urlPeName ? `${urlPeName}님의 PE 대시보드` : 'PE 대시보드'}
        </Typography>
          {user?.roleType === 'admin' && selectedPEUser && !urlPeId && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 4 }}>
              현재 조회 중: {peUsers.find(pe => pe.id === selectedPEUser)?.full_name || '선택된 PE'}
            </Typography>
          )}
          {urlPeId && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" color="primary.main">
                PO가 요청한 PE 대시보드 조회
        </Typography>
        <Button
          variant="outlined"
                size="small"
                onClick={() => window.history.back()}
              >
                PO 대시보드로 돌아가기
              </Button>
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {/* [advice from AI] Admin/PO/Executive용 PE 선택 드롭다운 (URL 파라미터가 없을 때만 표시) */}
          {(user?.roleType === 'admin' || user?.roleType === 'executive' || user?.roleType === 'po') && !urlPeId && (
            <Box sx={{ minWidth: 300 }}>
              <FormControl fullWidth size="small">
                <InputLabel>조회할 PE 선택</InputLabel>
                <Select
                  value={selectedPEUser}
                  onChange={(e) => handlePEUserChange(e.target.value)}
                  label="조회할 PE 선택"
                  disabled={loadingPEUsers}
                >
                  <MenuItem value="">
                    <em>PE를 선택하세요</em>
                  </MenuItem>
                  {peUsers.map((pe) => (
                    <MenuItem key={pe.id} value={pe.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Chip 
                          label="PE" 
                          size="small" 
                          color="info" 
                          sx={{ fontSize: '0.7rem', minWidth: 35 }} 
                        />
                        <Typography sx={{ fontWeight: 600 }}>
                          {pe.full_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({pe.username})
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                          작업: {pe.current_assignments || 0}개
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
        <Button
          variant="outlined"
          onClick={loadDashboardData}
            disabled={isLoading}
        >
          새로고침
        </Button>
        </Box>
      </Box>

      {/* 주요 지표 카드 - 최고관리자 스타일 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
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
                    {stats.total_tasks}
                  </Typography>
                <Typography variant="body2" color="text.secondary">
                  전체 업무
                  </Typography>
                </Box>
              <Typography variant="caption" color="primary.main" sx={{ mt: 1, fontWeight: 500 }}>
                클릭하여 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
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
            onClick={() => handleCardClick('in_progress')}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {stats.in_progress_tasks}
                  </Typography>
                <Typography variant="body2" color="text.secondary">
                  진행 중
                  </Typography>
                </Box>
              <Typography variant="caption" color="warning.main" sx={{ mt: 1, fontWeight: 500 }}>
                클릭하여 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
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
            onClick={() => handleCardClick('completed')}
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {stats.completed_tasks}
                  </Typography>
                <Typography variant="body2" color="text.secondary">
                  완료됨
                  </Typography>
                </Box>
              <Typography variant="caption" color="success.main" sx={{ mt: 1, fontWeight: 500 }}>
                클릭하여 보기
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
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
          >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {Math.round(stats.avg_progress)}%
                  </Typography>
                <Typography variant="body2" color="text.secondary">
                  평균 진행률
                  </Typography>
                </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                전체 작업 진행률
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 현재 업무 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                현재 업무
              </Typography>
              {tasks.length === 0 ? (
                <Alert severity="info">할당된 업무가 없습니다.</Alert>
              ) : (
                <List>
                  {tasks.slice(0, 5).map((task) => (
                    <ListItem key={task.id} divider>
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {task.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {task.project_name} • {task.created_by_name}
                            </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={task.progress_percentage || 0}
                            sx={{ width: '100px' }}
                              />
                          <Typography variant="body2">
                                {task.progress_percentage || 0}%
                              </Typography>
                              <Chip
                                label={task.status}
                                color={getStatusColor(task.status)}
                                size="small"
                              />
                              <Chip
                                label={task.priority}
                                color={getPriorityColor(task.priority)}
                                size="small"
                              />
                            </Box>
                          </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 활동 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 활동
              </Typography>
              {recentActivity.length === 0 ? (
                <Alert severity="info">최근 활동이 없습니다.</Alert>
              ) : (
                <List>
                  {recentActivity.map((activity, index) => (
                    <ListItem key={index} divider>
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {activity.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {activity.project_name}
                            </Typography>
                        <Typography variant="caption" color="text.secondary">
                              진행률: {activity.progress_percentage || 0}% • 
                              {activity.last_activity_at ? 
                                new Date(activity.last_activity_at).toLocaleDateString() : 
                                '활동 없음'
                              }
                            </Typography>
                          </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 업무 시간 통계 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                업무 시간 통계
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">예상 시간</Typography>
                <Typography variant="body2">{stats.total_estimated_hours}시간</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">실제 시간</Typography>
                <Typography variant="body2" color="primary.main">{stats.total_actual_hours}시간</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">효율성</Typography>
                <Typography variant="body2" color={stats.total_actual_hours <= stats.total_estimated_hours ? 'success.main' : 'warning.main'}>
                  {stats.total_estimated_hours > 0 ? 
                    Math.round((stats.total_estimated_hours / stats.total_actual_hours) * 100) : 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 업무 상태 분포 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                업무 상태 분포
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">할당됨</Typography>
                <Typography variant="body2" color="info.main">{stats.assigned_tasks}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">진행 중</Typography>
                <Typography variant="body2" color="primary.main">{stats.in_progress_tasks}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">완료됨</Typography>
                <Typography variant="body2" color="success.main">{stats.completed_tasks}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">일시정지</Typography>
                <Typography variant="body2" color="warning.main">{stats.paused_tasks}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>


        {/* [advice from AI] 할당된 프로젝트 목록 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                할당된 프로젝트 ({assignedProjects.length}개)
              </Typography>
              {assignedProjects.length === 0 ? (
                <Alert severity="info">할당된 프로젝트가 없습니다.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {assignedProjects.map((project) => (
                    <Grid item xs={12} md={6} lg={4} key={project.assignment_id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                              {project.project_name}
                            </Typography>
                            <Chip
                              label={project.urgency_level}
                              size="small"
                              color={
                                project.urgency_level === 'critical' ? 'error' :
                                project.urgency_level === 'high' ? 'warning' :
                                project.urgency_level === 'medium' ? 'info' : 'default'
                              }
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {project.project_overview}
                          </Typography>
                          
                          {project.work_group_name && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>작업 그룹:</strong> {project.work_group_name}
                            </Typography>
                          )}
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>도메인:</strong> {project.domain_name}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>마감일:</strong> {new Date(project.deadline).toLocaleDateString('ko-KR')}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={project.progress_percentage || 0}
                              sx={{ width: '100px', mr: 2 }}
                            />
                            <Typography variant="body2">
                              {project.progress_percentage || 0}%
                            </Typography>
                            <Chip
                              label={project.assignment_status}
                              size="small"
                              color={getStatusColor(project.assignment_status)}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {project.assignment_status === 'assigned' && (
                              <>
                <Button
                  variant="contained"
                                  size="small"
                                  onClick={() => openWorkStartDialog(project)}
                                  sx={{ flexGrow: 1 }}
                >
                                  작업 시작
                </Button>
                <Button
                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={() => openWorkRejectionDialog(project)}
                                  sx={{ minWidth: 'auto', px: 1 }}
                                >
                                  거부
                </Button>
                              </>
                            )}
                            
                            {project.assignment_status === 'in_progress' && (
                <Button
                  variant="outlined"
                                size="small"
                                sx={{ flexGrow: 1 }}
                >
                                레포지토리
                </Button>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
      </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* [advice from AI] 작업 시작 단계별 승인 다이얼로그 */}
      <Dialog open={workStartDialog} onClose={closeWorkStartDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              작업 시작 승인 과정 - {stepTitles[currentStep]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentStep + 1} / {stepTitles.length}
            </Typography>
          </Box>
          
          {/* 진행률 표시 */}
          <LinearProgress 
            variant="determinate" 
            value={(currentStep / (stepTitles.length - 1)) * 100} 
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* 디버깅 정보 */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>현재 단계:</strong> {currentStep} ({stepTitles[currentStep] || '알 수 없음'})<br />
                <strong>선택된 프로젝트:</strong> {selectedProject?.project_name || '프로젝트 없음'}<br />
                <strong>프로젝트 ID:</strong> {selectedProject?.project_id || '없음'}
              </Typography>
            </Alert>
              {/* 프로젝트 정보 헤더 */}
              {selectedProject && (
                <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    📋 {selectedProject?.project_name || '프로젝트명 없음'}
                  </Typography>
                {selectedProject?.work_group_name && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>작업 그룹:</strong> {selectedProject.work_group_name}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>마감일:</strong> {selectedProject?.deadline ? new Date(selectedProject.deadline).toLocaleDateString('ko-KR') : '마감일 없음'}
                </Typography>
                <Typography variant="body2">
                  <strong>긴급도:</strong> {selectedProject?.urgency_level || '미정'}
                </Typography>
                </Box>
              )}

              {/* 1단계: 요구사항 검토 */}
              {currentStep === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    📋 요구사항 및 프로젝트 문서 검토
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    프로젝트 관련 문서들을 검토하고 요구사항을 파악해주세요.
                  </Typography>
                  
                  {/* 기본 프로젝트 정보 표시 */}
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      📊 프로젝트 기본 정보
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>프로젝트명:</strong> {selectedProject?.project_name || 'ERP 현대화 프로젝트'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>프로젝트 개요:</strong> {selectedProject?.description || '기존 레거시 ERP 시스템을 최신 기술 스택으로 현대화'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>담당 도메인:</strong> {selectedProject?.domain_name || '제조업'}
                    </Typography>
                  </Box>

                  {/* 프로젝트 문서 목록 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      프로젝트 문서 ({projectDocuments.length}개)
                    </Typography>
                    
                    {/* 디버깅 정보 */}
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>프로젝트 ID:</strong> {selectedProject?.project_id || '없음'}<br />
                        <strong>문서 로드 상태:</strong> {projectDocuments.length > 0 ? '로드 완료' : '로드 중 또는 문서 없음'}
                      </Typography>
                    </Alert>
                    {projectDocuments.length === 0 ? (
                      <Alert severity="info">업로드된 프로젝트 문서가 없습니다.</Alert>
                    ) : (
                      <List>
                        {projectDocuments.map((doc) => (
                          <ListItem key={doc.id} divider>
                            <ListItemText
                              primary={doc.original_filename}
                              secondary={`크기: ${(doc.file_size / 1024).toFixed(1)}KB • 업로드: ${new Date(doc.uploaded_at).toLocaleDateString()}`}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                                size="small"
                                onClick={() => handleDocumentDownload(selectedProject?.project_id, doc.id, doc.original_filename)}
                              >
                                다운로드
                              </Button>
                              <Button
                                variant={documentsReviewed.includes(doc.id) ? "contained" : "outlined"}
                                size="small"
                                color={documentsReviewed.includes(doc.id) ? "success" : "primary"}
                                onClick={() => toggleDocumentReview(doc.id)}
                              >
                                {documentsReviewed.includes(doc.id) ? '검토완료' : '검토하기'}
                </Button>
              </Box>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>

                  {/* 개발자를 위한 상세 정보 */}
                  {selectedProject && selectedProject.metadata && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        📋 개발자를 위한 상세 정보
                      </Typography>
                      <Grid container spacing={2}>
                        {selectedProject.metadata.tech_stack && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>권장 기술 스택:</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedProject.metadata.tech_stack}</Typography>
        </Grid>
                        )}
                        {selectedProject.metadata.dev_environment && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>개발 환경 요구사항:</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedProject.metadata.dev_environment}</Typography>
                          </Grid>
                        )}
                        {selectedProject.metadata.database_info && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>데이터베이스 정보:</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedProject.metadata.database_info}</Typography>
                          </Grid>
                        )}
                        {selectedProject.metadata.performance_security && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>성능 및 보안 요구사항:</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedProject.metadata.performance_security}</Typography>
                          </Grid>
                        )}
                        {selectedProject.metadata.api_specs && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>API 명세 및 연동 정보:</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                              {selectedProject.metadata.api_specs}
                            </Typography>
                          </Grid>
                        )}
                        {selectedProject.metadata.special_notes && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>특별 고려사항 및 제약조건:</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                              {selectedProject.metadata.special_notes}
                            </Typography>
                          </Grid>
                        )}
      </Grid>
                    </Box>
                  )}

                  {/* 요구사항 검토 의견 */}
                  <TextField
                    fullWidth
                    label="요구사항 검토 의견 *"
                    multiline
                    rows={4}
                    placeholder="프로젝트 요구사항에 대한 이해도와 검토 의견을 작성해주세요..."
                    value={requirementsFeedback}
                    onChange={(e) => setRequirementsFeedback(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  {/* 요구사항 확인 체크박스 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <input
                      type="checkbox"
                      id="requirements-confirmed"
                      checked={requirementsConfirmed}
                      onChange={(e) => setRequirementsConfirmed(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    <label htmlFor="requirements-confirmed">
                      <Typography variant="body2">
                        프로젝트 요구사항을 충분히 검토하였으며, 작업 진행이 가능함을 확인합니다.
                      </Typography>
                    </label>
                  </Box>
                </Box>
              )}

              {/* 2단계: 일정 계획 수립 */}
              {currentStep === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    📅 일정 계획 수립
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    작업 완료 예상 일정과 상세 계획을 수립해주세요.
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="완료 예상일 *"
                        type="date"
                        value={peEstimatedCompletionDate}
                        onChange={(e) => setPeEstimatedCompletionDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText="실제 완료 가능한 현실적인 날짜를 설정해주세요"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="예상 작업 시간 (시간) *"
                        type="number"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        helperText="총 소요 예상 시간"
                      />
                    </Grid>
                  </Grid>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>난이도 평가</InputLabel>
                    <Select
                      value={difficultyFeedback}
                      onChange={(e) => setDifficultyFeedback(e.target.value)}
                    >
                      <MenuItem value="easier">예상보다 쉬움</MenuItem>
                      <MenuItem value="as_expected">예상 수준</MenuItem>
                      <MenuItem value="harder">예상보다 어려움</MenuItem>
                      <MenuItem value="much_harder">매우 어려움</MenuItem>
                    </Select>
                  </FormControl>

                  {/* 마일스톤 계획 */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        마일스톤 계획 (선택사항)
                      </Typography>
                      <Button variant="outlined" size="small" onClick={addMilestone}>
                        마일스톤 추가
                      </Button>
                    </Box>
                    
                    {plannedMilestones.map((milestone) => (
                      <Box key={milestone.id} sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2, mb: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="마일스톤 이름"
                              value={milestone.name}
                              onChange={(e) => updateMilestone(milestone.id, 'name', e.target.value)}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="목표 날짜"
                              type="date"
                              value={milestone.target_date}
                              onChange={(e) => updateMilestone(milestone.id, 'target_date', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="설명"
                              value={milestone.description}
                              onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={1}>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => removeMilestone(milestone.id)}
                              sx={{ minWidth: 'auto', p: 1 }}
                            >
                              ×
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* 3단계: 레포지토리 설정 */}
              {currentStep === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    🔧 레포지토리 설정
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    프로젝트 개발을 위한 Git 레포지토리를 설정해주세요.
                  </Typography>

                  {/* Git 서비스 선택 */}
                  <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      Git 서비스 선택
                    </Typography>
                    <RadioGroup
                      row
                      value={gitService}
                      onChange={(e) => setGitService(e.target.value)}
                    >
                      <FormControlLabel 
                        value="github" 
                        control={<Radio />} 
                        label="GitHub" 
                      />
                      <FormControlLabel 
                        value="gitlab" 
                        control={<Radio />} 
                        label="GitLab" 
                      />
                      <FormControlLabel 
                        value="bitbucket" 
                        control={<Radio />} 
                        label="Bitbucket" 
                      />
                      <FormControlLabel 
                        value="other" 
                        control={<Radio />} 
                        label="기타" 
                      />
                    </RadioGroup>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="레포지토리 URL *"
                    placeholder={
                      gitService === 'github' ? 'https://github.com/username/repository' :
                      gitService === 'gitlab' ? 'https://gitlab.com/username/repository' :
                      gitService === 'bitbucket' ? 'https://bitbucket.org/username/repository' :
                      'https://your-git-server.com/username/repository'
                    }
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    sx={{ mb: 2 }}
                    helperText={`${gitService.charAt(0).toUpperCase() + gitService.slice(1)} 레포지토리 URL을 입력하세요`}
                  />

                  <TextField
                    fullWidth
                    label="액세스 토큰 (Private 레포지토리용)"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    sx={{ mb: 2 }}
                    helperText={
                      gitService === 'github' ? 'Public 레포지토리는 토큰 없이도 가능합니다. Private 레포지토리의 경우 GitHub: Settings > Developer settings > Personal access tokens에서 생성' :
                      gitService === 'gitlab' ? 'Public 레포지토리는 토큰 없이도 가능합니다. Private 레포지토리의 경우 GitLab: User Settings > Access Tokens에서 생성' :
                      gitService === 'bitbucket' ? 'Public 레포지토리는 토큰 없이도 가능합니다. Private 레포지토리의 경우 Bitbucket: Personal settings > App passwords에서 생성' :
                      'Public 레포지토리는 토큰 없이도 가능합니다. Private 레포지토리의 경우 해당 Git 서비스에서 Personal Access Token을 생성하여 입력하세요'
                    }
                    placeholder={
                      gitService === 'github' ? 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (선택사항)' :
                      gitService === 'gitlab' ? 'glpat-xxxxxxxxxxxxxxxxxxxx (선택사항)' :
                      gitService === 'bitbucket' ? 'ATBB-xxxxxxxxxxxxxxxx (선택사항)' :
                      'your-access-token (선택사항)'
                    }
                  />

                  {/* 연결 테스트 버튼 및 결과 */}
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={testRepositoryConnection}
                      disabled={connectionTesting || !repositoryUrl}
                      sx={{ mb: 1 }}
                    >
                      {connectionTesting ? '연결 테스트 중...' : '연결 테스트'}
                    </Button>
                    
                    {connectionResult && (
                      <Alert 
                        severity={connectionResult.success ? 'success' : 'error'}
                        sx={{ mt: 1 }}
                      >
                        {connectionResult.message}
                      </Alert>
                    )}
                  </Box>
                  
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>🔐 토큰 생성 안내:</strong><br />
                      • <strong>GitHub:</strong> Settings → Developer settings → Personal access tokens → Generate new token<br />
                      • <strong>GitLab:</strong> User Settings → Access Tokens → Add new token<br />
                      • <strong>필요 권한:</strong> repo (또는 read_repository), contents, metadata<br />
                      • <strong>Public 레포지토리:</strong> 토큰 없이도 접근 가능 (비워두세요)
                    </Typography>
                  </Alert>

                  <TextField
                    fullWidth
                    label="개발 환경 및 기술 스택 노트"
                    multiline
                    rows={3}
                    value={workStartNotes}
                    onChange={(e) => setWorkStartNotes(e.target.value)}
                    placeholder="사용할 기술 스택, 개발 환경, 특별한 고려사항 등을 기록해주세요"
                    sx={{ mb: 2 }}
                  />

                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>레포지토리 등록 후:</strong><br />
                      • Git 커밋 활동을 기반으로 자동 진행률 추적이 시작됩니다<br />
                      • 코드 품질, 문서화 수준 등이 자동으로 분석됩니다<br />
                      • PO와 관리자가 실시간으로 진행 상황을 모니터링할 수 있습니다
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* 4단계: 최종 승인 */}
              {currentStep === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>
                    ✅ 최종 승인
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    모든 단계를 검토하고 작업 시작을 최종 승인해주세요.
                  </Typography>

                  {/* 단계별 요약 */}
                  <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      📋 승인 과정 요약
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>✅ 요구사항 검토:</strong> 완료 ({documentsReviewed.length}개 문서 검토)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        {requirementsFeedback.substring(0, 100)}...
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>✅ 일정 계획:</strong> {peEstimatedCompletionDate} 완료 예정 ({estimatedHours}시간)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        난이도 평가: {difficultyFeedback} • 마일스톤: {plannedMilestones.length}개
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>✅ 레포지토리:</strong> {repositoryUrl}
                      </Typography>
                    </Box>
                  </Box>

                  <TextField
                    fullWidth
                    label="작업 시작 다짐 및 최종 의견 *"
                    multiline
                    rows={4}
                    value={workStartConfirmation}
                    onChange={(e) => setWorkStartConfirmation(e.target.value)}
                    placeholder="이 프로젝트를 성공적으로 완료하겠다는 다짐과 최종 의견을 작성해주세요..."
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <input
                      type="checkbox"
                      id="final-confirmation"
                      checked={finalConfirmation}
                      onChange={(e) => setFinalConfirmation(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    <label htmlFor="final-confirmation">
                      <Typography variant="body2">
                        위의 모든 내용을 확인하였으며, 프로젝트 작업을 시작할 준비가 완료되었음을 확인합니다.
                      </Typography>
                    </label>
                  </Box>
                </Box>
              )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, backgroundColor: 'grey.50' }}>
          <Button 
            onClick={closeWorkStartDialog} 
            disabled={submitting}
          >
            취소
          </Button>
          
          {currentStep > 0 && (
            <Button 
              onClick={goToPrevStep}
              disabled={submitting}
            >
              이전
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button 
              onClick={goToNextStep}
              variant="contained"
              disabled={!canProceedToNextStep()}
            >
              다음 단계
            </Button>
          ) : (
            <Button 
              onClick={handleStartWork}
              variant="contained"
              color="success"
              disabled={submitting || !canProceedToNextStep()}
            >
              {submitting ? '처리 중...' : '🚀 작업 시작 승인'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 작업 거부 다이얼로그 */}
      <Dialog open={workRejectionDialog} onClose={() => setWorkRejectionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          ❌ 작업 거부 요청
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>주의:</strong> 작업을 거부하면 PO에게 재검토 요청이 전달됩니다.<br />
                  필요시 PO가 최고관리자에게 에스컬레이션할 수 있습니다.
                </Typography>
              </Alert>

              <Typography variant="h6" gutterBottom>
                📋 {selectedProject?.project_name || '프로젝트명 없음'}
              </Typography>
              {selectedProject?.work_group_name && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  작업 그룹: {selectedProject.work_group_name}
                </Typography>
              )}

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>거부 사유 분류 *</InputLabel>
                <Select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                >
                  <MenuItem value="technical_impossible">기술적으로 불가능</MenuItem>
                  <MenuItem value="insufficient_time">일정이 부족함</MenuItem>
                  <MenuItem value="unclear_requirements">요구사항이 불명확함</MenuItem>
                  <MenuItem value="resource_shortage">리소스 부족</MenuItem>
                  <MenuItem value="skill_mismatch">기술 스킬 부족</MenuItem>
                  <MenuItem value="workload_exceeded">업무량 초과</MenuItem>
                  <MenuItem value="other">기타</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="거부 사유 *"
                multiline
                rows={3}
                placeholder="구체적인 거부 사유를 작성해주세요..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                sx={{ mb: 2 }}
                helperText="PO가 이해할 수 있도록 명확하고 구체적으로 작성해주세요"
              />

              <TextField
                fullWidth
                label="상세 설명 및 제안사항 (선택사항)"
                multiline
                rows={4}
                placeholder="추가 설명이나 대안 제안이 있다면 작성해주세요..."
                value={rejectionDetails}
                onChange={(e) => setRejectionDetails(e.target.value)}
                sx={{ mb: 2 }}
                helperText="프로젝트 개선 방안이나 대안이 있다면 함께 제안해주세요"
              />

              <Box sx={{ mt: 2, p: 2, backgroundColor: 'error.50', borderRadius: 1, border: 1, borderColor: 'error.200' }}>
                <Typography variant="subtitle2" color="error.main" gutterBottom>
                  거부 후 프로세스:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  1. PO에게 즉시 알림 전달<br />
                  2. PO가 7일 내 재검토 및 프로젝트 수정<br />
                  3. 필요시 최고관리자에게 에스컬레이션<br />
                  4. 수정된 프로젝트로 재할당 또는 프로젝트 취소
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkRejectionDialog(false)} disabled={submitting}>
            취소
          </Button>
          <Button 
            onClick={handleWorkRejection}
            variant="contained"
            color="error"
            disabled={submitting || !rejectionReason.trim()}
          >
            {submitting ? '처리 중...' : '작업 거부'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] PE 할당 작업 리스트 다이얼로그 */}
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
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>프로젝트명</TableCell>
                  <TableCell>할당 상태</TableCell>
                  <TableCell>진행률</TableCell>
                  <TableCell>마감일</TableCell>
                  <TableCell>작업 관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">
                        해당 조건의 작업이 없습니다.
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
                          {project.assignment_notes && (
                            <Typography variant="caption" color="text.secondary">
                              {project.assignment_notes}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            project.assignment_status === 'assigned' ? '할당됨' :
                            project.assignment_status === 'in_progress' ? '진행 중' :
                            project.assignment_status === 'completed' ? '완료' :
                            project.assignment_status === 'paused' ? '일시 중단' :
                            project.assignment_status || '미정'
                          }
                          color={
                            project.assignment_status === 'completed' ? 'success' :
                            project.assignment_status === 'in_progress' ? 'info' :
                            project.assignment_status === 'paused' ? 'warning' :
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
                        <Typography variant="body2">
                          {project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {/* [advice from AI] PE 권한: 작업 시작/진행률 업데이트 */}
                          {project.assignment_status === 'assigned' && (
                            <Button
                              onClick={() => openWorkStartDialog(project)}
                              size="small"
                              variant="contained"
                              color="success"
                              sx={{ minWidth: 80 }}
                            >
                              작업 시작
                            </Button>
                          )}
                          {project.assignment_status === 'in_progress' && (
                            <Button
                              onClick={() => {
                                // 진행률 업데이트 다이얼로그 (추후 구현)
                                console.log('진행률 업데이트:', project);
                              }}
                              size="small"
                              variant="outlined"
                              color="info"
                              sx={{ minWidth: 80 }}
                            >
                              진행률 업데이트
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectListDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PEDashboard;
