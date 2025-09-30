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
// [advice from AI] 사용자 요청에 따라 아이콘 제거 - 모든 아이콘 import 제거

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
  status?: string;
  progress_percentage: number;
  last_activity_at: string;
  project_name: string;
  description?: string;
  event_type?: string;
  formatted_time?: string;
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
  
  // [advice from AI] 프로젝트 관리 다이얼로그 상태
  const [projectManageDialog, setProjectManageDialog] = useState(false);
  const [selectedManageProject, setSelectedManageProject] = useState<any>(null);
  const [projectProgress, setProjectProgress] = useState(0);
  const [projectStatus, setProjectStatus] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [projectListTitle, setProjectListTitle] = useState('');
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // 완료 보고서 작성 다이얼로그 상태
  const [completionReportDialog, setCompletionReportDialog] = useState(false);
  const [selectedCompletionProject, setSelectedCompletionProject] = useState<any>(null);
  const [completionReportData, setCompletionReportData] = useState({
    projectSummary: '',
    knownIssues: '',
    deploymentNotes: '',
    deploymentComments: '', // 배포 관련 추가 코멘트
    additionalNotes: ''
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  
  // GitHub 분석 데이터 상태
  const [repoAnalysisData, setRepoAnalysisData] = useState<any>(null);

  // QC/QA 피드백 관련 상태
  const [feedbackStats, setFeedbackStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    fixed: 0,
    closed: 0
  });
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [filteredFeedbackList, setFilteredFeedbackList] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [feedbackDetailDialog, setFeedbackDetailDialog] = useState(false);
  const [feedbackResponseDialog, setFeedbackResponseDialog] = useState(false);
  const [feedbackResponse, setFeedbackResponse] = useState({
    response_type: 'acknowledgment',
    response_message: '',
    modification_details: '',
    estimated_fix_time: 0
  });

  // 프로젝트 히스토리 관련 상태
  const [projectHistory, setProjectHistory] = useState<any[]>([]);
  const [historyDialog, setHistoryDialog] = useState(false);

  // 피드백 필터링 상태
  const [feedbackFilters, setFeedbackFilters] = useState({
    status: 'all',
    severity: 'all',
    type: 'all',
    project: 'all'
  });
  
  // 상세 정보 다이얼로그는 제거됨 (README 전체 표시로 대체)

  // [advice from AI] API URL 결정
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      // 외부 도메인에서는 포트 3001 사용
      return `http://${currentHost.split(':')[0]}:3001`;
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
          } else if ((user?.roleType === 'admin' || user?.roleType === 'executive' || user?.roleType === 'po') && result.data.length > 0) {
            // Admin/PO/Executive인 경우 첫 번째 PE 자동 선택
            setSelectedPEUser(result.data[0].id);
            console.log('🔧 관리자 - 첫 번째 PE 자동 선택:', result.data[0].full_name);
          }
        }
      }
    } catch (error) {
      console.error('❌ PE 사용자 목록 로드 실패:', error);
    } finally {
      setLoadingPEUsers(false);
    }
  };

  // [advice from AI] 최근 활동 로드
  const loadRecentActivities = async (targetPEUserId?: string) => {
    try {
      const apiUrl = getApiUrl();
      
      // Admin/PO/Executive이고 특정 PE를 선택한 경우, 해당 PE의 활동 조회
      const isManagerViewingPE = (user?.roleType === 'admin' || user?.roleType === 'executive' || user?.roleType === 'po') && targetPEUserId;
      
      const endpoint = isManagerViewingPE 
        ? `${apiUrl}/api/projects/activities/recent/${targetPEUserId}`
        : `${apiUrl}/api/projects/activities/recent`;
      
      console.log('📋 최근 활동 로드:', { endpoint, isManagerViewingPE, targetPEUserId });
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 최근 활동 API 응답 상태:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 최근 활동 로드 성공:', result.data);
        console.log('🔍 최근 활동 API 응답 데이터:', result);
        
        // 활동 데이터를 UI에 맞게 변환
        const activities = result.data.map((activity: any) => {
          // event_data가 이미 객체인 경우와 문자열인 경우를 모두 처리
          let eventData: any = {};
          try {
            eventData = typeof activity.event_data === 'string' 
              ? JSON.parse(activity.event_data) 
              : (activity.event_data || {});
          } catch (error) {
            console.warn('❌ event_data 파싱 실패:', activity.event_data, error);
            eventData = {};
          }
          const eventTime = new Date(activity.event_timestamp);
          
          let title = activity.title;
          let description = activity.description;
          
          // 이벤트 타입별 제목과 설명 커스터마이징
          switch (activity.event_type) {
            case 'work_start':
              title = `🚀 ${activity.project_name} 작업 시작`;
              description = `예상 시간: ${eventData.estimated_hours || 0}시간`;
              break;
            case 'progress_update':
              title = `📈 ${activity.project_name} 진행률 업데이트`;
              description = `${eventData.old_progress || 0}% → ${eventData.new_progress || 0}%`;
              break;
            case 'work_pause':
              title = `⏸️ ${activity.project_name} 작업 일시정지`;
              break;
            case 'work_complete':
              title = `✅ ${activity.project_name} 작업 완료`;
              break;
          }
          
          return {
            title,
            description,
            project_name: activity.project_name,
            progress_percentage: activity.progress_percentage || eventData.new_progress || 0,
            last_activity_at: activity.event_timestamp,
            event_type: activity.event_type,
            formatted_time: `${eventTime.getMonth() + 1}/${eventTime.getDate()} ${eventTime.getHours().toString().padStart(2, '0')}:${eventTime.getMinutes().toString().padStart(2, '0')}`
          };
        });
        
        setRecentActivity(activities);
      } else {
        console.error('❌ 최근 활동 로드 실패:', response.status);
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('❌ 최근 활동 로드 중 오류:', error);
      setRecentActivity([]);
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
      
      console.log('🔍 API 응답 상태:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 API 응답 데이터:', result);
        if (result.success) {
          // 프로젝트 ID 기준으로 중복 제거 (가장 최근 할당 기준)
          const uniqueProjects = result.data.reduce((acc: any[], current: any) => {
            const existing = acc.find(item => item.project_id === current.project_id);
            if (!existing) {
              acc.push(current);
            } else {
              // 더 최근 할당이면 교체
              if (new Date(current.assigned_at) > new Date(existing.assigned_at)) {
                const index = acc.indexOf(existing);
                acc[index] = current;
              }
            }
            return acc;
          }, []);
          
          setAssignedProjects(uniqueProjects);
          console.log('✅ PE 할당 프로젝트 로드 완료:', uniqueProjects.length, '개 (중복 제거됨)');
          console.log('📊 프로젝트 데이터 샘플:', uniqueProjects[0]);
          
          // 레포지토리 데이터 확인
          uniqueProjects.forEach((project: any, index: number) => {
            console.log(`📁 프로젝트 ${index + 1} 레포지토리 정보:`, {
              projectName: project.project_name,
              repositoryUrl: project.repository_url,
              repositoryName: project.repository_name,
              gitPlatform: project.git_platform,
              hasRepository: !!project.repository_url
            });
          });
          
          // 통계 계산 (중복 제거된 데이터 사용)
          const totalTasks = uniqueProjects.length;
          const assignedTasks = uniqueProjects.filter((p: any) => p.assignment_status === 'assigned').length;
          const inProgressTasks = uniqueProjects.filter((p: any) => p.assignment_status === 'in_progress').length;
          const avgProgress = uniqueProjects.length > 0 
            ? uniqueProjects.reduce((sum: number, p: any) => sum + (p.progress_percentage || 0), 0) / uniqueProjects.length 
            : 0;

          // 시간 통계 계산
          const totalEstimatedHours = uniqueProjects.reduce((sum: number, p: any) => 
            sum + (p.pe_estimated_hours || 0), 0);
          const totalActualHours = uniqueProjects.reduce((sum: number, p: any) => 
            sum + (parseFloat(p.actual_hours_worked) || 0), 0);

          setStats({
            total_tasks: totalTasks,
            assigned_tasks: assignedTasks,
            in_progress_tasks: inProgressTasks,
            completed_tasks: 0, // 완료된 작업은 다른 API에서
            paused_tasks: 0,
            total_estimated_hours: totalEstimatedHours,
            total_actual_hours: Math.round(totalActualHours * 10) / 10, // 소수점 1자리
            avg_progress: Math.round(avgProgress)
          });

          // 실제 활동 기록 로드
          await loadRecentActivities(targetPEUserId);
          
          // QC/QA 피드백 데이터 로드
          await loadFeedbackData(targetPEUserId);
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
        
        // 현재 선택된 PE가 있으면 해당 PE의 프로젝트 로드
        if (selectedPEUser) {
          console.log('🔄 자동 새로고침 - 선택된 PE 유지:', selectedPEUser);
          await loadAssignedProjects(selectedPEUser);
          await loadProjectHistory(selectedPEUser.id);
        }
      } else {
        // PE 본인인 경우 자신의 프로젝트 로드
      await loadAssignedProjects();
        await loadProjectHistory(user?.id);
        await loadFeedbackData(user?.id);
      }
      
    } catch (error) {
      console.error('❌ 대시보드 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // QC/QA 피드백 데이터 로드
  const loadFeedbackData = async (peUserId?: string) => {
    try {
      const targetUserId = peUserId || (selectedPEUser ? selectedPEUser.id : user?.id);
      if (!targetUserId) return;

      console.log('🔍 QC/QA 피드백 데이터 로드:', { targetUserId });

      const response = await fetch(`${getApiUrl()}/api/projects/feedback/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ QC/QA 피드백 데이터 로드 성공:', result);
        
        if (result.success) {
          const feedbacks = result.data.feedbacks || [];
          setFeedbackList(feedbacks);
          setFilteredFeedbackList(feedbacks); // 초기에는 모든 피드백 표시
          setFeedbackStats(result.data.stats || {
            total: 0,
            open: 0,
            in_progress: 0,
            fixed: 0,
            closed: 0
          });
        }
      } else {
        console.log('⚠️ QC/QA 피드백 API 응답 상태:', response.status, response.statusText);
        // 404나 다른 에러의 경우 기본값 설정
        setFeedbackStats({
          total: 0,
          open: 0,
          in_progress: 0,
          fixed: 0,
          closed: 0
        });
        setFeedbackList([]);
        setFilteredFeedbackList([]);
      }
    } catch (error) {
      console.error('❌ QC/QA 피드백 로드 실패:', error);
      // 에러 시 기본값 설정
      setFeedbackStats({
        total: 0,
        open: 0,
        in_progress: 0,
        fixed: 0,
        closed: 0
      });
      setFeedbackList([]);
      setFilteredFeedbackList([]);
    }
  };

  // 피드백 필터링 함수
  const applyFeedbackFilters = () => {
    let filtered = [...feedbackList];

    // 상태별 필터
    if (feedbackFilters.status !== 'all') {
      filtered = filtered.filter(feedback => feedback.feedback_status === feedbackFilters.status);
    }

    // 심각도별 필터
    if (feedbackFilters.severity !== 'all') {
      filtered = filtered.filter(feedback => feedback.severity_level === feedbackFilters.severity);
    }

    // 유형별 필터
    if (feedbackFilters.type !== 'all') {
      filtered = filtered.filter(feedback => feedback.feedback_type === feedbackFilters.type);
    }

    // 프로젝트별 필터
    if (feedbackFilters.project !== 'all') {
      filtered = filtered.filter(feedback => feedback.project_name === feedbackFilters.project);
    }

    setFilteredFeedbackList(filtered);
  };

  // 필터 변경 시 자동 적용
  React.useEffect(() => {
    applyFeedbackFilters();
  }, [feedbackFilters, feedbackList]);

  // 고유 프로젝트 목록 추출
  const getUniqueProjects = () => {
    const projects = feedbackList.map(feedback => feedback.project_name).filter(Boolean);
    return Array.from(new Set(projects));
  };

  // PE 피드백 응답 처리
  const handleFeedbackResponse = async () => {
    if (!selectedFeedback || !feedbackResponse.response_message.trim()) {
      return;
    }

    try {
      console.log('🔄 피드백 응답 전송:', { 
        feedbackId: selectedFeedback.id, 
        responseType: feedbackResponse.response_type 
      });

      const response = await fetch(`${getApiUrl()}/api/projects/feedback-response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback_id: selectedFeedback.id,
          response_type: feedbackResponse.response_type,
          response_message: feedbackResponse.response_message,
          modification_details: feedbackResponse.modification_details,
          estimated_fix_time: feedbackResponse.estimated_fix_time
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 피드백 응답 전송 성공:', result);
        
        // 다이얼로그 닫기
        setFeedbackResponseDialog(false);
        setFeedbackDetailDialog(false);
        
        // 응답 폼 초기화
        setFeedbackResponse({
          response_type: 'acknowledgment',
          response_message: '',
          modification_details: '',
          estimated_fix_time: 0
        });
        
        // 피드백 데이터 새로고침
        const targetUserId = selectedPEUser ? selectedPEUser.id : user?.id;
        await loadFeedbackData(targetUserId);
        await loadRecentActivities(targetUserId);
        
        alert('피드백 응답이 성공적으로 전송되었습니다.');
      } else {
        const errorData = await response.json();
        console.error('❌ 피드백 응답 전송 실패:', errorData);
        alert(`피드백 응답 전송 실패: ${errorData.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 피드백 응답 전송 중 오류:', error);
      alert('피드백 응답 전송 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 프로젝트 히스토리 로드
  const loadProjectHistory = async (targetPEUserId?: string) => {
    try {
      const apiUrl = getApiUrl();
      const peUserId = targetPEUserId || user?.id;
      
      console.log('📚 프로젝트 히스토리 로드 시작:', peUserId);
      
      const response = await fetch(`${apiUrl}/api/projects/history/${peUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 프로젝트 히스토리 로드 완료:', result.data.length, '개');
        setProjectHistory(result.data);
        
        // 완료된 작업 수 업데이트
        setStats(prevStats => ({
          ...prevStats,
          completed_tasks: result.data.length
        }));
      } else {
        console.error('❌ 프로젝트 히스토리 로드 실패:', response.status);
        setProjectHistory([]);
      }
    } catch (error) {
      console.error('❌ 프로젝트 히스토리 로드 중 오류:', error);
      setProjectHistory([]);
    }
  };

  // [advice from AI] 카드 클릭 핸들러 - 할당된 프로젝트 리스트 다이얼로그 열기 (PE 권한)
  const handleCardClick = async (cardType: string) => {
    console.log('🔍 PE 카드 클릭:', cardType);
    
    // 완료된 작업의 경우 히스토리 다이얼로그 열기
    if (cardType === 'completed') {
      console.log('📚 완료된 프로젝트 히스토리 로드 시작');
      const targetUserId = selectedPEUser ? selectedPEUser.id : user?.id;
      await loadProjectHistory(targetUserId);
      setHistoryDialog(true);
      return;
    }
    
    let title = '';
    
    switch (cardType) {
      case 'total':
        title = '전체 할당 작업';
        break;
      case 'in_progress':
        title = '진행 중인 작업';
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

  // [advice from AI] 레포지토리 클릭 처리 - 새 탭에서 레포지토리 열기
  const handleRepositoryClick = (event: React.MouseEvent, project: any) => {
    event.stopPropagation(); // 카드 클릭 이벤트 방지
    
    if (!project.repository_url) {
      alert('레포지토리 URL이 등록되지 않았습니다.');
      return;
    }

    // URL 유효성 검사
    try {
      const url = new URL(project.repository_url);
      console.log('🔗 레포지토리 열기:', {
        projectName: project.project_name,
        repositoryUrl: project.repository_url,
        platform: project.git_platform
      });
      
      // 새 탭에서 레포지토리 열기
      window.open(project.repository_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('❌ 잘못된 레포지토리 URL:', project.repository_url);
      alert('잘못된 레포지토리 URL입니다. 관리자에게 문의하세요.');
    }
  };

  // [advice from AI] 프로젝트 카드 클릭 처리 - 프로젝트 관리 다이얼로그 열기
  const handleProjectCardClick = (project: any) => {
    console.log('📋 프로젝트 관리 다이얼로그 열기:', project.project_name);
    setSelectedManageProject(project);
    setProjectProgress(project.progress_percentage || 0);
    setProjectStatus(project.assignment_status || '');
    setProjectNotes(project.assignment_notes || '');
    setPauseReason('');
    setProjectManageDialog(true);
  };

  // [advice from AI] 프로젝트 진행률 업데이트
  const handleProgressUpdate = async () => {
    if (!selectedManageProject?.assignment_id) {
      alert('프로젝트 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/projects/progress/${selectedManageProject.assignment_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          progress_percentage: projectProgress,
          assignment_notes: projectNotes
        })
      });

      if (response.ok) {
        alert('진행률이 업데이트되었습니다.');
        setProjectManageDialog(false);
        loadAssignedProjects(selectedPEUser);
      } else {
        const errorText = await response.text();
        alert(`진행률 업데이트 실패: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ 진행률 업데이트 오류:', error);
      alert(`진행률 업데이트 실패: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 프로젝트 일시정지
  const handleProjectPause = async () => {
    if (!selectedManageProject?.assignment_id || !pauseReason.trim()) {
      alert('일시정지 사유를 입력해주세요.');
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/projects/pause/${selectedManageProject.assignment_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pause_reason: pauseReason,
          assignment_notes: projectNotes
        })
      });

      if (response.ok) {
        alert('프로젝트가 일시정지되었습니다.');
        setProjectManageDialog(false);
        loadAssignedProjects(selectedPEUser);
      } else {
        const errorText = await response.text();
        alert(`일시정지 실패: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ 프로젝트 일시정지 오류:', error);
      alert(`일시정지 실패: ${(error as Error).message}`);
    }
  };

  // 완료 보고서 작성 버튼 클릭 핸들러
  const handleCompletionReportClick = async (project: any) => {
    console.log('완료 보고서 작성 시작:', project);
    setSelectedCompletionProject(project);
    
    // 레포지토리 분석 데이터 가져오기
    let repoAnalysisData = null;
    if (project.repository_url) {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/projects/analyze-repository`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            repository_url: project.repository_url,
            project_id: project.project_id
          })
        });

        if (response.ok) {
          const result = await response.json();
          repoAnalysisData = result.data;
          console.log('레포지토리 분석 데이터 로드 완료:', repoAnalysisData);
        }
      } catch (error) {
        console.error('레포지토리 분석 데이터 로드 실패:', error);
      }
    }
    
    // GitHub 분석 데이터 저장
    setRepoAnalysisData(repoAnalysisData);
    
    // 프로젝트 정보와 레포지토리 분석 데이터를 활용한 자동 입력 데이터 생성
    const autoFilledData = generateAutoFilledReportData(project, repoAnalysisData);
    
    setCompletionReportData(autoFilledData);
    setCompletionReportDialog(true);
  };

  // 자동 입력 데이터 생성 함수
  const generateAutoFilledReportData = (project: any, repoData: any) => {
    const deployment = repoData?.deployment;

    return {
      projectSummary: project.project_overview || 
        `${project.project_name} 프로젝트 완료 보고서입니다.\n\n` +
        `목적: ${project.target_system_name || '시스템 개발'}\n` +
        `긴급도: ${project.urgency_level}\n` +
        `마감일: ${project.deadline ? new Date(project.deadline).toLocaleDateString() : '미정'}\n` +
        (repoData?.rawAnalysis?.project_stats?.description ? 
          `\n프로젝트 설명: ${repoData.rawAnalysis.project_stats.description}` : ''),

      knownIssues: '현재 알려진 이슈나 제한사항이 있다면 입력해주세요.',

      deploymentNotes: 
        (deployment ? 
          `배포 구성 (GitHub 기반):\n` +
          `${deployment.hasDockerfile ? '- Docker 컨테이너 배포 지원\n' : ''}` +
          `${deployment.hasDockerCompose ? '- Docker Compose 멀티 컨테이너 구성\n' : ''}` +
          `${deployment.hasPackageJson ? '- Node.js 패키지 관리 (npm/yarn)\n' : ''}` +
          `${deployment.hasRequirements ? '- Python 의존성 관리 (pip)\n' : ''}` +
          `- 기본 브랜치: ${deployment.defaultBranch}\n` +
          (deployment.buildScripts?.length > 0 ? 
            `- 빌드 스크립트: ${deployment.buildScripts.join(', ')}\n` : ''
          ) +
          `\n설치 방법: README.md 참조\n`
          : '배포 환경: 개발/스테이징/프로덕션\n설치 방법: README.md 참조\n'
        ),

      deploymentComments: '',

      additionalNotes: '추가 전달사항이나 특별한 고려사항을 입력해주세요.'
    };
  };

  // 완료 보고서 제출 처리
  const handleCompletionReportSubmit = async () => {
    if (!selectedCompletionProject) return;

    // 필수 필드 검증 (현재 UI에 맞게 수정)
    if (!completionReportData.projectSummary || !completionReportData.projectSummary.trim()) {
      alert('프로젝트 요약은 필수 입력 항목입니다.');
      return;
    }

    try {
      setSubmittingReport(true);
      const apiUrl = getApiUrl();
      
      console.log('완료 보고서 제출 시작:', {
        projectId: selectedCompletionProject.project_id,
        assignmentId: selectedCompletionProject.assignment_id,
        reportData: completionReportData
      });

      const response = await fetch(`${apiUrl}/api/projects/completion-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: selectedCompletionProject.project_id,
          assignment_id: selectedCompletionProject.assignment_id,
          repository_url: selectedCompletionProject.repository_url,
          completion_report: {
            project_summary: completionReportData.projectSummary,
            technical_details: repoAnalysisData?.techDetails ? JSON.stringify(repoAnalysisData.techDetails) : '',
            implemented_features: repoAnalysisData?.features ? JSON.stringify(repoAnalysisData.features) : '',
            known_issues: completionReportData.knownIssues,
            deployment_notes: completionReportData.deploymentNotes,
            deployment_comments: completionReportData.deploymentComments,
            additional_notes: completionReportData.additionalNotes,
            repo_analysis_data: repoAnalysisData ? JSON.stringify(repoAnalysisData) : null
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('완료 보고서가 성공적으로 제출되었습니다!\n프로젝트가 QC/QA 부서로 전달되었습니다.');
        setCompletionReportDialog(false);
        loadDashboardData(); // 데이터 새로고침
        console.log('완료 보고서 제출 성공:', result);
      } else {
        const error = await response.json();
        alert(`완료 보고서 제출 실패: ${error.message || '알 수 없는 오류'}`);
        console.error('완료 보고서 제출 실패:', error);
      }
    } catch (error) {
      console.error('완료 보고서 제출 중 오류:', error);
      alert('완료 보고서 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // [advice from AI] 프로젝트 되돌리기 (작업 거부)
  const handleProjectReturn = () => {
    setProjectManageDialog(false);
    setSelectedProject(selectedManageProject);
    setWorkRejectionDialog(true);
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
        {/* QC/QA 피드백 현황 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                QC/QA 피드백 현황
                <Chip 
                  label={`${feedbackStats.total}건`} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                      {feedbackStats.open}
                        </Typography>
                    <Typography variant="body2" sx={{ color: '#d32f2f' }}>
                      신규 접수
                            </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#ed6c02' }}>
                      {feedbackStats.in_progress}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ed6c02' }}>
                      처리 중
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0288d1' }}>
                      {feedbackStats.fixed}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#0288d1' }}>
                      수정 완료
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                      {feedbackStats.closed}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                      완료
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* QC/QA 피드백 목록 */}
        {feedbackList.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  QC/QA 피드백 목록
                  <Chip 
                    label={`${filteredFeedbackList.length}/${feedbackList.length}건`} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Typography>

                {/* 필터링 컨트롤 */}
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    {/* 상태 필터 */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>상태</InputLabel>
                        <Select
                          value={feedbackFilters.status}
                          label="상태"
                          onChange={(e) => setFeedbackFilters({
                            ...feedbackFilters,
                            status: e.target.value
                          })}
                        >
                          <MenuItem value="all">전체</MenuItem>
                          <MenuItem value="open">신규 접수</MenuItem>
                          <MenuItem value="in_progress">처리 중</MenuItem>
                          <MenuItem value="fixed">수정 완료</MenuItem>
                          <MenuItem value="closed">완료</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* 심각도 필터 */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>심각도</InputLabel>
                        <Select
                          value={feedbackFilters.severity}
                          label="심각도"
                          onChange={(e) => setFeedbackFilters({
                            ...feedbackFilters,
                            severity: e.target.value
                          })}
                        >
                          <MenuItem value="all">전체</MenuItem>
                          <MenuItem value="critical">Critical</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="low">Low</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* 유형 필터 */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>유형</InputLabel>
                        <Select
                          value={feedbackFilters.type}
                          label="유형"
                          onChange={(e) => setFeedbackFilters({
                            ...feedbackFilters,
                            type: e.target.value
                          })}
                        >
                          <MenuItem value="all">전체</MenuItem>
                          <MenuItem value="bug">버그</MenuItem>
                          <MenuItem value="improvement">개선사항</MenuItem>
                          <MenuItem value="enhancement">기능 개선</MenuItem>
                          <MenuItem value="documentation">문서화</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* 프로젝트 필터 */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>프로젝트</InputLabel>
                        <Select
                          value={feedbackFilters.project}
                          label="프로젝트"
                          onChange={(e) => setFeedbackFilters({
                            ...feedbackFilters,
                            project: e.target.value
                          })}
                        >
                          <MenuItem value="all">전체</MenuItem>
                          {getUniqueProjects().map((project) => (
                            <MenuItem key={project} value={project}>
                              {project}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
                
                <Grid container spacing={2}>
                  {filteredFeedbackList.map((feedback) => (
                    <Grid item xs={12} md={6} key={feedback.id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 2 },
                          borderLeft: `4px solid ${
                            feedback.severity_level === 'critical' ? '#d32f2f' :
                            feedback.severity_level === 'high' ? '#ed6c02' :
                            feedback.severity_level === 'medium' ? '#0288d1' : '#2e7d32'
                          }`
                        }}
                        onClick={() => {
                          setSelectedFeedback(feedback);
                          setFeedbackDetailDialog(true);
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                              {feedback.title}
                              </Typography>
                              <Chip
                              label={
                                feedback.feedback_status === 'open' ? '신규' :
                                feedback.feedback_status === 'in_progress' ? '처리중' :
                                feedback.feedback_status === 'fixed' ? '수정완료' : '완료'
                              }
                                size="small"
                              color={
                                feedback.feedback_status === 'open' ? 'error' :
                                feedback.feedback_status === 'in_progress' ? 'warning' :
                                feedback.feedback_status === 'fixed' ? 'info' : 'success'
                              }
                              variant="outlined"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {feedback.description?.substring(0, 100)}
                            {feedback.description?.length > 100 && '...'}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip
                                label={
                                  feedback.feedback_type === 'bug' ? '버그' :
                                  feedback.feedback_type === 'improvement' ? '개선' :
                                  feedback.feedback_type === 'enhancement' ? '기능개선' : '문서화'
                                }
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={
                                  feedback.severity_level === 'critical' ? 'Critical' :
                                  feedback.severity_level === 'high' ? 'High' :
                                  feedback.severity_level === 'medium' ? 'Medium' : 'Low'
                                }
                                size="small"
                                sx={{ 
                                  color: feedback.severity_level === 'critical' ? '#d32f2f' :
                                         feedback.severity_level === 'high' ? '#ed6c02' :
                                         feedback.severity_level === 'medium' ? '#0288d1' : '#2e7d32',
                                  borderColor: feedback.severity_level === 'critical' ? '#d32f2f' :
                                              feedback.severity_level === 'high' ? '#ed6c02' :
                                              feedback.severity_level === 'medium' ? '#0288d1' : '#2e7d32'
                                }}
                                variant="outlined"
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {feedback.project_name}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
            </CardContent>
          </Card>
        </Grid>
        )}

        {/* 최근 활동 로그 - 전체 너비로 확장 */}
        <Grid item xs={12}>
          <Card sx={{ height: 500 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                최근 활동 로그
                <Chip 
                  label={`${recentActivity.length}개`} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              </Typography>
              
              {recentActivity.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flex: 1,
                  color: 'text.secondary'
                }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>활동 없음</Typography>
                  <Typography variant="body1">아직 활동 기록이 없습니다</Typography>
                  <Typography variant="body2">작업을 시작하거나 진행률을 업데이트하면 여기에 표시됩니다</Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {recentActivity.slice(0, 5).map((activity, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        mb: 2, 
                        p: 2, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: 2,
                        backgroundColor: index === 0 ? 'action.hover' : 'background.paper',
                        position: 'relative',
                        '&:hover': {
                          backgroundColor: 'action.selected',
                          borderColor: 'primary.main'
                        }
                      }}
                    >
                      {/* 최신 활동 표시 */}
                      {index === 0 && (
                        <Chip 
                          label="최신" 
                          size="small" 
                          color="success" 
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8,
                            fontSize: '0.7rem'
                          }} 
                        />
                      )}
                      
                      {/* 활동 제목과 시간 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600,
                            color: index === 0 ? 'primary.main' : 'text.primary',
                            pr: 2
                          }}
                        >
                          {activity.title}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            flexShrink: 0,
                            backgroundColor: 'background.default',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontWeight: 500
                          }}
                        >
                          {activity.formatted_time || new Date(activity.last_activity_at).toLocaleDateString()}
                            </Typography>
                      </Box>
                      
                      {/* 활동 설명 */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mb: 1.5, lineHeight: 1.4 }}
                      >
                        {activity.description || activity.project_name}
                      </Typography>
                      
                      {/* 진행률 표시 (있는 경우) */}
                      {activity.progress_percentage > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: '60px' }}>
                            진행률:
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={activity.progress_percentage}
                            sx={{ 
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'action.hover'
                            }}
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              minWidth: '40px',
                              fontWeight: 600,
                              color: activity.progress_percentage >= 80 ? 'success.main' : 
                                     activity.progress_percentage >= 60 ? 'warning.main' : 'text.secondary'
                            }}
                          >
                            {activity.progress_percentage}%
                            </Typography>
                          </Box>
                      )}
                      
                      {/* 이벤트 타입별 태그 */}
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={
                            activity.event_type === 'work_start' ? '작업 시작' :
                            activity.event_type === 'progress_update' ? '진행률 업데이트' :
                            activity.event_type === 'work_pause' ? '작업 일시정지' :
                            activity.event_type === 'work_complete' ? '작업 완료' :
                            activity.event_type === 'project_completion' ? '완료 보고서 제출' :
                            // QC/QA 피드백 관련 이벤트
                            activity.event_type === 'qc_feedback_received' ? 'QC/QA 피드백 접수' :
                            activity.event_type === 'qc_feedback_in_progress' ? 'QC/QA 피드백 처리 중' :
                            activity.event_type === 'qc_feedback_fixed' ? 'QC/QA 피드백 수정 완료' :
                            activity.event_type === 'qc_feedback_verified' ? 'QC/QA 피드백 검증 완료' :
                            activity.event_type === 'qc_feedback_closed' ? 'QC/QA 피드백 종료' :
                            // PE 피드백 응답 관련 이벤트
                            activity.event_type === 'pe_feedback_acknowledged' ? '피드백 확인' :
                            activity.event_type === 'pe_feedback_progress' ? '피드백 진행 상황 업데이트' :
                            activity.event_type === 'pe_feedback_completed' ? '피드백 수정 완료' :
                            activity.event_type === 'pe_feedback_clarification' ? '피드백 추가 설명 요청' :
                            '기타'
                          }
                          size="small"
                          variant="outlined"
                          color={
                            activity.event_type === 'work_start' ? 'success' :
                            activity.event_type === 'progress_update' ? 'primary' :
                            activity.event_type === 'work_pause' ? 'warning' :
                            activity.event_type === 'work_complete' ? 'success' :
                            activity.event_type === 'project_completion' ? 'success' :
                            // QC/QA 피드백 관련 색상
                            activity.event_type === 'qc_feedback_received' ? 'error' :
                            activity.event_type === 'qc_feedback_in_progress' ? 'warning' :
                            activity.event_type === 'qc_feedback_fixed' ? 'info' :
                            activity.event_type === 'qc_feedback_verified' ? 'success' :
                            activity.event_type === 'qc_feedback_closed' ? 'success' :
                            // PE 피드백 응답 관련 색상
                            activity.event_type === 'pe_feedback_acknowledged' ? 'info' :
                            activity.event_type === 'pe_feedback_progress' ? 'info' :
                            activity.event_type === 'pe_feedback_completed' ? 'success' :
                            activity.event_type === 'pe_feedback_clarification' ? 'warning' :
                            'default'
                          }
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  ))}
                  
                  {/* 더 많은 활동이 있는 경우 */}
                  {recentActivity.length > 5 && (
                    <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary">
                        총 {recentActivity.length}개의 활동 중 최근 5개를 표시하고 있습니다
                      </Typography>
                    </Box>
                  )}
                </Box>
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
                <Typography variant="body2">시간 진행률</Typography>
                <Typography variant="body2" color={
                  stats.total_estimated_hours > 0 ? 
                    (stats.total_actual_hours / stats.total_estimated_hours * 100 <= 100 ? 'success.main' : 
                     stats.total_actual_hours / stats.total_estimated_hours * 100 <= 120 ? 'warning.main' : 'error.main')
                    : 'text.secondary'
                }>
                  {stats.total_estimated_hours > 0 ? 
                    Math.round((stats.total_actual_hours / stats.total_estimated_hours) * 100) : 0}%
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
                        {/* 클릭 가능한 프로젝트 정보 영역 */}
                        <Box
                          sx={{ 
                            cursor: 'pointer',
                            p: 2,
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                          onClick={() => handleProjectCardClick(project)}
                        >
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
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
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
                          </Box>
                        
                        {/* 액션 버튼 영역 */}
                        <CardContent sx={{ pt: 0, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                            📋 프로젝트 관리 (위 영역 클릭)
                          </Typography>
                          
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
                            
                            {/* 레포지토리 버튼과 완료 보고서 버튼 - 진행 중인 프로젝트에만 표시 */}
                            {project.assignment_status === 'in_progress' && (
                              <>
                <Button
                  variant="outlined"
                                size="small"
                                  sx={{ 
                                    flexGrow: 1,
                                    mr: 1,
                                    color: project.repository_url ? 'primary.main' : 'text.disabled',
                                    borderColor: project.repository_url ? 'primary.main' : 'text.disabled',
                                    '&:hover': {
                                      backgroundColor: project.repository_url ? 'primary.light' : 'transparent',
                                      color: project.repository_url ? 'white' : 'text.disabled'
                                    },
                                    '&:disabled': {
                                      color: 'text.disabled',
                                      borderColor: 'text.disabled'
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('🔗 레포지토리 버튼 클릭:', {
                                      projectName: project.project_name,
                                      repositoryUrl: project.repository_url,
                                      repositoryName: project.repository_name,
                                      hasUrl: !!project.repository_url
                                    });
                                    handleRepositoryClick(e, project);
                                  }}
                                  disabled={!project.repository_url}
                                  title={project.repository_url ? `${project.repository_name || '레포지토리'}로 이동` : '레포지토리가 등록되지 않았습니다'}
                                >
                                  {project.repository_url ? '레포지토리' : '레포지토리 없음'}
                </Button>
                                
           <Button
             variant="outlined"
             size="small"
             sx={{
               flexGrow: 1,
               fontWeight: 700,
               fontSize: '0.875rem',
               borderWidth: 2,
               borderColor: '#1976d2',
               color: '#1976d2',
               backgroundColor: 'transparent',
               textTransform: 'none',
               letterSpacing: '0.5px',
               '&:hover': {
                 borderWidth: 2,
                 borderColor: '#1565c0',
                 backgroundColor: '#e3f2fd',
                 color: '#1565c0',
                 transform: 'translateY(-1px)',
                 boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
               },
               '&:active': {
                 transform: 'translateY(0px)'
               },
               transition: 'all 0.2s ease-in-out'
             }}
             onClick={(e) => {
               e.stopPropagation();
               console.log('완료 보고서 작성 버튼 클릭:', {
                 projectName: project.project_name,
                 projectId: project.project_id,
                 assignmentId: project.assignment_id
               });
               handleCompletionReportClick(project);
             }}
             title="프로젝트 완료 보고서를 작성하고 QC/QA 부서로 전달합니다"
           >
             완료 보고서 작성
           </Button>
                              </>
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
                    <TableRow 
                      key={project.assignment_id || project.project_id}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                      onClick={() => {
                        setProjectListDialog(false);
                        handleProjectCardClick(project);
                      }}
                    >
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

      {/* [advice from AI] 프로젝트 관리 다이얼로그 */}
      <Dialog open={projectManageDialog} onClose={() => setProjectManageDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              📋 프로젝트 관리 - {selectedManageProject?.project_name}
            </Typography>
            <IconButton onClick={() => setProjectManageDialog(false)}>
              ✕
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedManageProject && (
            <Box sx={{ pt: 1 }}>
              {/* 프로젝트 기본 정보 */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>프로젝트:</strong> {selectedManageProject.project_name}<br />
                  <strong>상태:</strong> {
                    selectedManageProject.assignment_status === 'assigned' ? '할당됨' :
                    selectedManageProject.assignment_status === 'in_progress' ? '진행 중' :
                    selectedManageProject.assignment_status === 'paused' ? '일시정지' :
                    selectedManageProject.assignment_status === 'review' ? '검토 중' :
                    selectedManageProject.assignment_status
                  }<br />
                  <strong>긴급도:</strong> {selectedManageProject.urgency_level}<br />
                  <strong>마감일:</strong> {selectedManageProject.deadline ? new Date(selectedManageProject.deadline).toLocaleDateString() : '미정'}
                </Typography>
              </Alert>

              {/* 진행률 설정 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  📊 진행률 업데이트
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    현재 진행률: {projectProgress}%
                  </Typography>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={projectProgress}
                    onChange={(e) => setProjectProgress(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="진행 상황 메모"
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder="현재 진행 상황, 완료된 작업, 다음 계획 등을 입력하세요..."
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 프로젝트 관리 액션 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  🔧 프로젝트 관리
                </Typography>
                
                {/* 일시정지 */}
                {selectedManageProject.assignment_status === 'in_progress' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      ⏸️ 프로젝트 일시정지
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="일시정지 사유"
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      placeholder="일시정지가 필요한 이유를 입력하세요 (예: 요구사항 변경, 기술적 이슈, 리소스 부족 등)"
                      sx={{ mb: 1 }}
                    />
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleProjectPause}
                      disabled={!pauseReason.trim()}
                      sx={{ mr: 1 }}
                    >
                      ⏸️ 일시정지
                    </Button>
                  </Box>
                )}

                {/* 프로젝트 되돌리기 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    ↩️ 프로젝트 되돌리기
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    요구사항 불명확, 기술적 불가능 등의 이유로 PO에게 재검토 요청
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleProjectReturn}
                  >
                    ↩️ 작업 거부 / 되돌리기
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectManageDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleProgressUpdate}
            disabled={!selectedManageProject}
          >
            진행률 저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 완료 보고서 작성 다이얼로그 */}
      <Dialog 
        open={completionReportDialog} 
        onClose={() => setCompletionReportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          프로젝트 완료 보고서 작성
          {selectedCompletionProject && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedCompletionProject.project_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                완료 보고서를 작성하면 프로젝트가 완료 상태로 변경되고, QC/QA 부서로 품질 검증 요청이 전달됩니다.
                GitHub 레포지토리 분석 데이터가 자동으로 포함됩니다.
              </Typography>
            </Alert>

            {/* 프로젝트 요약 (읽기 전용) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                프로젝트 요약
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {completionReportData.projectSummary}
                </Typography>
              </Paper>
            </Box>

            {/* 개발 내용 정의 (README 전체) */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  개발 내용 정의 (README)
                </Typography>
                {selectedCompletionProject?.repository_url && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.open(selectedCompletionProject.repository_url, '_blank')}
                    sx={{ ml: 2 }}
                  >
                    레포지토리 방문
                  </Button>
                )}
              </Box>
              
              {repoAnalysisData?.rawAnalysis?.readme_content ? (
                <Paper 
                  sx={{ 
                    p: 4, 
                    backgroundColor: '#fafafa',
                    border: '3px solid #1976d2',
                    borderRadius: 3,
                    maxHeight: 600, 
                    overflow: 'auto',
                    boxShadow: '0 8px 24px rgba(25, 118, 210, 0.15)',
                    position: 'relative',
                    '&::before': {
                      content: '"📖 README.md"',
                      position: 'absolute',
                      top: -12,
                      left: 20,
                      backgroundColor: '#1976d2',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      letterSpacing: '0.5px'
                    }
                  }}
                >
                  <Typography 
                    variant="body1" 
                    component="div" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      fontFamily: '"Inter", "SF Pro Display", "Segoe UI", system-ui, sans-serif',
                      fontSize: '1.05rem',
                      fontWeight: 500,
                      lineHeight: 1.8,
                      color: '#1a1a1a',
                      letterSpacing: '0.2px',
                      
                      // 마크다운 헤더 스타일링
                      '& *:first-child': {
                        marginTop: 0
                      },
                      
                      // 헤더 스타일 개선
                      '& h1, & h2, & h3, & h4, & h5, & h6': {
                        fontWeight: 800,
                        color: '#0d47a1',
                        marginTop: '2em',
                        marginBottom: '0.8em',
                        paddingBottom: '0.3em',
                        borderBottom: '2px solid #e3f2fd'
                      },
                      
                      '& h1': {
                        fontSize: '2rem',
                        color: '#1976d2',
                        borderBottom: '3px solid #1976d2'
                      },
                      
                      '& h2': {
                        fontSize: '1.5rem',
                        color: '#1565c0'
                      },
                      
                      '& h3': {
                        fontSize: '1.25rem',
                        color: '#0d47a1'
                      },
                      
                      // 강조 텍스트
                      '& strong, & b': {
                        fontWeight: 700,
                        color: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        padding: '1px 3px',
                        borderRadius: '3px'
                      },
                      
                      // 인라인 코드
                      '& code': {
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #e0e0e0',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.9em',
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        color: '#d32f2f'
                      },
                      
                      // 코드 블록
                      '& pre': {
                        backgroundColor: '#263238',
                        color: '#ffffff',
                        padding: '16px',
                        borderRadius: '8px',
                        overflow: 'auto',
                        margin: '16px 0',
                        border: '1px solid #37474f',
                        '& code': {
                          backgroundColor: 'transparent',
                          border: 'none',
                          padding: 0,
                          color: '#ffffff'
                        }
                      },
                      
                      // 리스트 스타일
                      '& ul, & ol': {
                        paddingLeft: '24px',
                        marginBottom: '16px'
                      },
                      
                      '& li': {
                        marginBottom: '8px',
                        lineHeight: 1.6
                      },
                      
                      // 링크 스타일
                      '& a': {
                        color: '#1976d2',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        '&:hover': {
                          color: '#0d47a1',
                          backgroundColor: 'rgba(25, 118, 210, 0.08)'
                        }
                      },
                      
                      // 인용구
                      '& blockquote': {
                        borderLeft: '4px solid #1976d2',
                        paddingLeft: '16px',
                        margin: '16px 0',
                        fontStyle: 'italic',
                        backgroundColor: 'rgba(25, 118, 210, 0.05)',
                        padding: '12px 16px',
                        borderRadius: '0 4px 4px 0'
                      },
                      
                      // 테이블 스타일
                      '& table': {
                        borderCollapse: 'collapse',
                        width: '100%',
                        margin: '16px 0',
                        border: '1px solid #e0e0e0'
                      },
                      
                      '& th, & td': {
                        border: '1px solid #e0e0e0',
                        padding: '8px 12px',
                        textAlign: 'left'
                      },
                      
                      '& th': {
                        backgroundColor: '#f5f5f5',
                        fontWeight: 600
                      }
                    }}
                  >
                    {repoAnalysisData.rawAnalysis.readme_content}
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2" color="text.secondary">
                    README 파일이 없거나 레포지토리 분석 데이터를 불러올 수 없습니다.
                  </Typography>
                  {selectedCompletionProject?.repository_url && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => window.open(selectedCompletionProject.repository_url, '_blank')}
                      sx={{ mt: 1 }}
                    >
                      레포지토리에서 직접 확인하기
                    </Button>
                  )}
                </Paper>
              )}
              
              {/* 기술적 정보 요약 */}
              {repoAnalysisData?.techDetails && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    기술적 정보 요약
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Chip 
                      label={`주 언어: ${repoAnalysisData.techDetails.primaryLanguage}`} 
                      color="primary" 
                      size="small"
                    />
                    {repoAnalysisData.techDetails.techStack?.slice(0, 5).map((tech: string) => (
                      <Chip 
                        key={tech}
                        label={tech}
                        color="secondary"
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    파일 {repoAnalysisData.techDetails.fileCount}개, 
                    의존성 {repoAnalysisData.techDetails.dependencies?.length || 0}개
                  </Typography>
                </Box>
              )}
            </Box>


            {/* 알려진 이슈 */}
            <TextField
              fullWidth
              label="알려진 이슈 및 제한사항"
              multiline
              rows={3}
              value={completionReportData.knownIssues}
              onChange={(e) => setCompletionReportData({
                ...completionReportData,
                knownIssues: e.target.value
              })}
              placeholder="현재 알려진 버그, 제한사항, 개선이 필요한 부분을 기록해주세요..."
              sx={{ mb: 2 }}
            />

            {/* 배포 및 설치 가이드 */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  배포 및 설치 가이드
                </Typography>
                {selectedCompletionProject?.repository_url && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.open(selectedCompletionProject.repository_url, '_blank')}
                    sx={{ ml: 2 }}
                  >
                    레포지토리 방문
                  </Button>
                )}
              </Box>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', mb: 2 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 1 }}>
                  <strong>GitHub 기반 배포 정보:</strong>
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {completionReportData.deploymentNotes}
                </Typography>
              </Paper>
              
              <TextField
                fullWidth
                label="추가 배포 코멘트"
                multiline
                rows={3}
                value={completionReportData.deploymentComments}
                onChange={(e) => setCompletionReportData({
                  ...completionReportData,
                  deploymentComments: e.target.value
                })}
                placeholder="GitHub 정보 외에 추가로 전달할 배포 관련 사항이 있다면 입력해주세요..."
                sx={{ mb: 2 }}
              />
            </Box>

            {/* 추가 노트 */}
            <TextField
              fullWidth
              label="추가 노트"
              multiline
              rows={2}
              value={completionReportData.additionalNotes}
              onChange={(e) => setCompletionReportData({
                ...completionReportData,
                additionalNotes: e.target.value
              })}
              placeholder="기타 전달사항이나 특별한 고려사항이 있다면 기록해주세요..."
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletionReportDialog(false)}>
            취소
          </Button>
            <Button
              variant="contained"
              onClick={handleCompletionReportSubmit}
              disabled={submittingReport || !completionReportData.projectSummary || !completionReportData.projectSummary.trim()}
              sx={{
                backgroundColor: '#1976d2',
                color: 'white',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '12px 24px',
                textTransform: 'none',
                letterSpacing: '0.5px',
                '&:hover': {
                  backgroundColor: '#1565c0',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)'
                },
                '&:active': {
                  transform: 'translateY(0px)'
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#9e9e9e'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {submittingReport ? '제출 중...' : '완료 보고서 제출'}
            </Button>
        </DialogActions>
      </Dialog>

      {/* QC/QA 피드백 상세 보기 다이얼로그 */}
      <Dialog
        open={feedbackDetailDialog}
        onClose={() => setFeedbackDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          QC/QA 피드백 상세 정보
          {selectedFeedback && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedFeedback.project_name} - {selectedFeedback.qc_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Box sx={{ pt: 1 }}>
              {/* 기본 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  기본 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">제목</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedFeedback.title}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">상태</Typography>
                    <Chip
                      label={
                        selectedFeedback.feedback_status === 'open' ? '신규 접수' :
                        selectedFeedback.feedback_status === 'in_progress' ? '처리 중' :
                        selectedFeedback.feedback_status === 'fixed' ? '수정 완료' : '완료'
                      }
                      size="small"
                      color={
                        selectedFeedback.feedback_status === 'open' ? 'error' :
                        selectedFeedback.feedback_status === 'in_progress' ? 'warning' :
                        selectedFeedback.feedback_status === 'fixed' ? 'info' : 'success'
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">유형</Typography>
                    <Typography variant="body1">
                      {selectedFeedback.feedback_type === 'bug' ? '버그' :
                       selectedFeedback.feedback_type === 'improvement' ? '개선사항' :
                       selectedFeedback.feedback_type === 'enhancement' ? '기능 개선' : '문서화'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">심각도</Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: selectedFeedback.severity_level === 'critical' ? '#d32f2f' :
                               selectedFeedback.severity_level === 'high' ? '#ed6c02' :
                               selectedFeedback.severity_level === 'medium' ? '#0288d1' : '#2e7d32',
                        fontWeight: 600
                      }}
                    >
                      {selectedFeedback.severity_level === 'critical' ? 'Critical' :
                       selectedFeedback.severity_level === 'high' ? 'High' :
                       selectedFeedback.severity_level === 'medium' ? 'Medium' : 'Low'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* 상세 설명 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  상세 설명
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {selectedFeedback.description}
                  </Typography>
                </Paper>
              </Box>

              {/* 재현 단계 */}
              {selectedFeedback.steps_to_reproduce && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    재현 단계
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {selectedFeedback.steps_to_reproduce}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* 예상 동작 vs 실제 동작 */}
              {(selectedFeedback.expected_behavior || selectedFeedback.actual_behavior) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    동작 비교
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedFeedback.expected_behavior && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          예상 동작
                        </Typography>
                        <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {selectedFeedback.expected_behavior}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {selectedFeedback.actual_behavior && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          실제 동작
                        </Typography>
                        <Paper sx={{ p: 2, backgroundColor: '#ffeaea' }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {selectedFeedback.actual_behavior}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* 테스트 환경 */}
              {(selectedFeedback.test_environment || selectedFeedback.browser_os_info) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    테스트 환경
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedFeedback.test_environment && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">테스트 환경</Typography>
                        <Typography variant="body1">{selectedFeedback.test_environment}</Typography>
                      </Grid>
                    )}
                    {selectedFeedback.browser_os_info && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">브라우저/OS 정보</Typography>
                        <Typography variant="body1">{selectedFeedback.browser_os_info}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* QC 내부 노트 */}
              {selectedFeedback.qc_notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    QC 내부 노트
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#fff3e0' }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {selectedFeedback.qc_notes}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDetailDialog(false)}>
            닫기
          </Button>
          {selectedFeedback && selectedFeedback.feedback_status !== 'closed' && (
            <Button
              variant="contained"
              onClick={() => {
                setFeedbackDetailDialog(false);
                setFeedbackResponseDialog(true);
              }}
              sx={{ ml: 1 }}
            >
              피드백 응답
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* PE 피드백 응답 다이얼로그 */}
      <Dialog
        open={feedbackResponseDialog}
        onClose={() => setFeedbackResponseDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          피드백 응답 작성
          {selectedFeedback && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedFeedback.title} - {selectedFeedback.project_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 응답 유형 선택 */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>응답 유형</InputLabel>
              <Select
                value={feedbackResponse.response_type}
                label="응답 유형"
                onChange={(e) => setFeedbackResponse({
                  ...feedbackResponse,
                  response_type: e.target.value
                })}
              >
                <MenuItem value="acknowledgment">피드백 확인</MenuItem>
                <MenuItem value="progress_update">진행 상황 업데이트</MenuItem>
                <MenuItem value="completion">수정 완료</MenuItem>
                <MenuItem value="clarification_request">추가 설명 요청</MenuItem>
              </Select>
            </FormControl>

            {/* 응답 메시지 */}
            <TextField
              fullWidth
              label="응답 메시지"
              multiline
              rows={4}
              value={feedbackResponse.response_message}
              onChange={(e) => setFeedbackResponse({
                ...feedbackResponse,
                response_message: e.target.value
              })}
              placeholder={
                feedbackResponse.response_type === 'acknowledgment' ? '피드백을 확인했습니다. 검토 후 조치하겠습니다.' :
                feedbackResponse.response_type === 'progress_update' ? '현재 진행 상황을 알려드립니다...' :
                feedbackResponse.response_type === 'completion' ? '요청하신 사항을 수정 완료했습니다.' :
                '추가로 필요한 정보나 설명을 요청드립니다...'
              }
              sx={{ mb: 3 }}
              required
            />

            {/* 수정 세부사항 (수정 완료 시에만 표시) */}
            {feedbackResponse.response_type === 'completion' && (
              <TextField
                fullWidth
                label="수정 세부사항"
                multiline
                rows={3}
                value={feedbackResponse.modification_details}
                onChange={(e) => setFeedbackResponse({
                  ...feedbackResponse,
                  modification_details: e.target.value
                })}
                placeholder="어떤 부분을 어떻게 수정했는지 구체적으로 설명해주세요..."
                sx={{ mb: 3 }}
              />
            )}

            {/* 예상 수정 시간 (진행 상황 업데이트 시에만 표시) */}
            {feedbackResponse.response_type === 'progress_update' && (
              <TextField
                fullWidth
                label="예상 수정 시간 (시간)"
                type="number"
                value={feedbackResponse.estimated_fix_time}
                onChange={(e) => setFeedbackResponse({
                  ...feedbackResponse,
                  estimated_fix_time: parseInt(e.target.value) || 0
                })}
                placeholder="예상되는 수정 완료 시간을 입력해주세요"
                sx={{ mb: 3 }}
                InputProps={{
                  endAdornment: <Typography variant="body2" color="text.secondary">시간</Typography>
                }}
              />
            )}

            {/* 응답 유형별 안내 메시지 */}
            <Alert 
              severity={
                feedbackResponse.response_type === 'acknowledgment' ? 'info' :
                feedbackResponse.response_type === 'progress_update' ? 'warning' :
                feedbackResponse.response_type === 'completion' ? 'success' : 'info'
              }
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                {feedbackResponse.response_type === 'acknowledgment' && 
                  '피드백을 확인했음을 QC/QA 팀에 알립니다. 피드백 상태가 "처리 중"으로 변경됩니다.'}
                {feedbackResponse.response_type === 'progress_update' && 
                  '현재 진행 상황을 QC/QA 팀에 업데이트합니다. 예상 완료 시간을 함께 전달해주세요.'}
                {feedbackResponse.response_type === 'completion' && 
                  '수정이 완료되었음을 알립니다. 피드백 상태가 "수정 완료"로 변경되어 QC/QA 재검증을 요청합니다.'}
                {feedbackResponse.response_type === 'clarification_request' && 
                  '추가 정보나 설명이 필요한 경우 QC/QA 팀에 문의합니다.'}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackResponseDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleFeedbackResponse}
            disabled={!feedbackResponse.response_message.trim()}
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': { backgroundColor: '#1565c0' }
            }}
          >
            응답 전송
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 히스토리 다이얼로그 */}
      <Dialog
        open={historyDialog}
        onClose={() => setHistoryDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '70vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            완료된 프로젝트 히스토리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            총 {projectHistory.length}개 프로젝트
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {projectHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                완료된 프로젝트가 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary">
                프로젝트를 완료하면 여기에 히스토리가 표시됩니다.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {projectHistory.map((project, index) => (
                <Grid item xs={12} key={project.project_id}>
                  <Card 
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        boxShadow: 4,
                        borderColor: 'primary.main'
                      },
                      transition: 'all 0.2s'
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {project.project_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {project.project_overview}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            대상 시스템: {project.target_system_name} | 우선순위: {project.urgency_level}
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 2, textAlign: 'right' }}>
                          <Chip
                            label={project.project_status === 'completed' ? '완료됨' : 
                                  project.project_status === 'deployed' ? '배포됨' : '보관됨'}
                            color={project.project_status === 'completed' ? 'success' : 
                                  project.project_status === 'deployed' ? 'primary' : 'default'}
                            size="small"
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            완료일: {project.completion_date ? new Date(project.completion_date).toLocaleDateString('ko-KR') : 'N/A'}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* QC/QA 상태 정보 */}
                      {project.qc_qa_status ? (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            QC/QA 검증 현황
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">검증 상태:</Typography>
                                <Chip
                                  label={
                                    project.qc_qa_status.status === 'pending' ? '대기 중' :
                                    project.qc_qa_status.status === 'in_progress' ? '진행 중' :
                                    project.qc_qa_status.status === 'completed' ? '완료됨' : '알 수 없음'
                                  }
                                  color={
                                    project.qc_qa_status.status === 'pending' ? 'warning' :
                                    project.qc_qa_status.status === 'in_progress' ? 'info' :
                                    project.qc_qa_status.status === 'completed' ? 'success' : 'default'
                                  }
                                  size="small"
                                />
                              </Box>
                              {project.qc_qa_status.assignee_name && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">담당자:</Typography>
                                  <Typography variant="body2" color="primary.main">
                                    {project.qc_qa_status.assignee_name}
                                  </Typography>
                                </Box>
                              )}
                              {project.qc_qa_status.quality_score && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">품질 점수:</Typography>
                                  <Typography 
                                    variant="body2" 
                                    color={project.qc_qa_status.quality_score >= 80 ? 'success.main' : 
                                          project.qc_qa_status.quality_score >= 60 ? 'warning.main' : 'error.main'}
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {project.qc_qa_status.quality_score}점
                                  </Typography>
                                </Box>
                              )}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              {project.qc_qa_status.feedback_count > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">총 피드백:</Typography>
                                  <Typography variant="body2" color="info.main">
                                    {project.qc_qa_status.feedback_count}개
                                  </Typography>
                                </Box>
                              )}
                              {project.qc_qa_status.open_feedback_count > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">미해결 피드백:</Typography>
                                  <Typography variant="body2" color="error.main">
                                    {project.qc_qa_status.open_feedback_count}개
                                  </Typography>
                                </Box>
                              )}
                              {project.qc_qa_status.approved_at && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">승인일:</Typography>
                                  <Typography variant="body2" color="success.main">
                                    {new Date(project.qc_qa_status.approved_at).toLocaleDateString('ko-KR')}
                                  </Typography>
                                </Box>
                              )}
                            </Grid>
                          </Grid>
                        </Box>
                      ) : (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            QC/QA 검증 정보가 없습니다.
                          </Typography>
                        </Box>
                      )}

                      <Divider sx={{ my: 2 }} />

                      {/* 프로젝트 진행률 및 완료 정보 */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          프로젝트 완료 정보
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">진행률:</Typography>
                              <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                {project.progress_percentage || 100}%
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">할당 상태:</Typography>
                              <Typography variant="body2" color="success.main">
                                {project.assignment_status === 'completed' ? '완료됨' : project.assignment_status}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            {project.deadline && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">마감일:</Typography>
                                <Typography variant="body2">
                                  {new Date(project.deadline).toLocaleDateString('ko-KR')}
                                </Typography>
                              </Box>
                            )}
                            {project.assignment_completion_date && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">작업 완료일:</Typography>
                                <Typography variant="body2" color="success.main">
                                  {new Date(project.assignment_completion_date).toLocaleDateString('ko-KR')}
                                </Typography>
                              </Box>
                            )}
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setHistoryDialog(false)} variant="outlined">
            닫기
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PEDashboard;
