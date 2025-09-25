// QC/QA 대시보드 페이지
// 품질 검증 및 테스트 관리 전용 대시보드

import React, { useState, useEffect } from 'react';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
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
  Paper,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';

interface QCStats {
  total_requests: number;
  pending_requests: number;
  in_progress_requests: number;
  completed_requests: number;
  rejected_requests: number;
  avg_quality_score: number;
}

interface QCRequest {
  id: string;
  project_id: string;
  project_name: string;
  completion_report_id: string;
  request_status: string;
  priority_level: string;
  requested_by: string;
  pe_name: string;
  assigned_to?: string;
  test_plan?: string;
  test_results?: string;
  quality_score?: number;
  approval_status: string;
  created_at: string;
  updated_at: string;
  repository_url?: string;
  project_summary?: string;
  technical_details?: string;
  implemented_features?: string;
}

const QCDashboard: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  
  const [stats, setStats] = useState<QCStats>({
    total_requests: 0,
    pending_requests: 0,
    in_progress_requests: 0,
    completed_requests: 0,
    rejected_requests: 0,
    avg_quality_score: 0
  });
  
  const [qcRequests, setQcRequests] = useState<QCRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 3단계 테스트 계획 다이얼로그 상태
  const [testPlanDialog, setTestPlanDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<QCRequest | null>(null);
  
  // 1단계: 테스트 항목 선택
  const [step1Data, setStep1Data] = useState({
    basicTests: [] as string[],
    functionalTests: {
      basicFeatures: [] as string[],
      additionalFeatures: [] as string[],
      readmeBasedTests: [] as string[]
    },
    performanceTests: [] as string[],
    securityTests: [] as string[],
    usabilityTests: {
      files: [] as File[],
      requirements: ''
    },
    compatibilityTests: {
      enabled: false,
      platforms: [] as string[]
    }
  });
  
  // 2단계: 테스트 셋 선택
  const [step2Data, setStep2Data] = useState({
    selectedTestSets: [] as string[],
    customTestSet: {
      name: '',
      description: '',
      estimatedHours: 0,
      testItems: [] as string[]
    }
  });
  
  // 3단계: 최종 체크리스트
  const [step3Data, setStep3Data] = useState({
    finalChecklist: [] as {
      category: string;
      item: string;
      description: string;
      required: boolean;
      estimatedTime: number;
    }[],
    totalEstimatedHours: 0,
    testEnvironment: '',
    testTools: '',
    specialInstructions: ''
  });
  
  // 작업 시작 관련 상태
  const [startingWork, setStartingWork] = useState<string | null>(null);
  
  // 임시: 기존 테스트 계획 상태 (3단계 다이얼로그로 교체 예정)
  const [testPlanData, setTestPlanData] = useState({
    basicTests: '',
    functionalTests: '',
    performanceTests: '',
    securityTests: '',
    usabilityTests: '',
    compatibilityTests: '',
    additionalTests: '',
    standardizedTestSets: [] as string[],
    estimatedHours: '',
    testEnvironment: '',
    testTools: ''
  });
  
  // 테스트 계획 제출 상태
  const [submittingTestPlan, setSubmittingTestPlan] = useState(false);
  
  // 테스트 항목 기본 데이터
  const basicTestOptions = [
    '기능 동작 확인', '사용자 인터페이스 검증', '데이터 무결성 확인', 
    '오류 처리 검증', '로그 및 모니터링', '문서화 완성도'
  ];
  
  const performanceTestOptions = [
    '응답 시간 측정', '처리량 테스트', '부하 테스트', 
    '스트레스 테스트', '메모리 사용량 확인', '리소스 최적화'
  ];
  
  const securityTestOptions = [
    '인증 및 권한 확인', '데이터 암호화 검증', '입력 검증 테스트',
    '보안 취약점 스캔', 'SQL 인젝션 방지', 'XSS 방지 확인'
  ];
  
  const compatibilityPlatforms = [
    'Windows 10/11', 'macOS', 'Linux Ubuntu', 'Chrome 브라우저',
    'Firefox 브라우저', 'Safari 브라우저', 'Edge 브라우저', 'Mobile iOS', 'Mobile Android'
  ];

  // 피드백 관련 상태
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedFeedbackRequest, setSelectedFeedbackRequest] = useState<QCRequest | null>(null);
  const [availablePEs, setAvailablePEs] = useState<any[]>([]);
  const [originalPE, setOriginalPE] = useState<any>(null);
  const [feedbackData, setFeedbackData] = useState({
    feedback_type: 'bug',
    severity_level: 'medium',
    priority_level: 'normal',
    title: '',
    description: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    test_environment: '',
    browser_os_info: '',
    assigned_to_pe: '', // 선택된 PE ID
    qc_notes: '',
    attachment_files: [] as File[]
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // 테스트 실행 관련 상태
  const [testExecutionDialog, setTestExecutionDialog] = useState(false);
  const [selectedTestRequest, setSelectedTestRequest] = useState<QCRequest | null>(null);
  const [testExecutionData, setTestExecutionData] = useState<any[]>([]);
  const [testProgress, setTestProgress] = useState(0);
  const [executingTests, setExecutingTests] = useState(false);
  
  // 단계별 테스트 실행 상태
  const [currentTestStep, setCurrentTestStep] = useState(0);
  const [testCategories, setTestCategories] = useState<any[]>([]);
  const [currentCategoryItems, setCurrentCategoryItems] = useState<any[]>([]);
  
  // 실패 항목 이슈 레포트 상태
  const [failedItemIssueDialog, setFailedItemIssueDialog] = useState(false);
  const [selectedFailedItem, setSelectedFailedItem] = useState<any>(null);
  
  
  // 활동 로그 및 히스토리 상태
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [failureHistory, setFailureHistory] = useState<any[]>([]);
  const [allActivityLogs, setAllActivityLogs] = useState<any[]>([]);
  const [allFailureHistory, setAllFailureHistory] = useState<any[]>([]);
  
  // QC 검증 승인 상태
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<QCRequest | null>(null);
  const [approvalData, setApprovalData] = useState({
    approval_notes: '',
    quality_score: 85
  });
  const [submittingApproval, setSubmittingApproval] = useState(false);
  
  // 검증 완료 보고서 상태
  const [verificationReportDialog, setVerificationReportDialog] = useState(false);
  const [verificationReportData, setVerificationReportData] = useState({
    // 프로젝트 요약 (자동 입력)
    projectSummary: '',
    
    // 테스트 실행 결과
    testExecutionSummary: '',
    totalTestCases: 0,
    passedTestCases: 0,
    failedTestCases: 0,
    testCoverage: '',
    
    // 품질 평가
    qualityScore: 85,
    functionalityScore: 0,
    reliabilityScore: 0,
    usabilityScore: 0,
    performanceScore: 0,
    securityScore: 0,
    
    // 발견된 이슈 및 해결 상태
    criticalIssues: '',
    majorIssues: '',
    minorIssues: '',
    resolvedIssues: '',
    
    // 권장사항 및 개선점
    recommendations: '',
    improvementSuggestions: '',
    
    // 배포 승인 여부
    deploymentRecommendation: 'approved', // approved, conditional, rejected
    deploymentConditions: '',
    
    // 추가 노트
    additionalNotes: ''
  });
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedRequestForHistory, setSelectedRequestForHistory] = useState<QCRequest | null>(null);

  // 테스트 진행 상황 저장 함수
  const saveTestProgress = async (requestId: string, progressData: any, category: string, step: number) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/qc/save-test-progress/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test_progress: progressData,
          current_category: category,
          current_step: step
        })
      });

      if (response.ok) {
        console.log('💾 테스트 진행 상황 저장 완료');
      } else {
        console.error('❌ 테스트 진행 상황 저장 실패');
      }
    } catch (error) {
      console.error('❌ 테스트 진행 상황 저장 중 오류:', error);
    }
  };

  // 테스트 진행 상황 불러오기 함수
  const loadTestProgress = async (requestId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/qc/load-test-progress/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          console.log('📂 저장된 테스트 진행 상황 발견:', result.data);
          return result.data;
        }
      }
    } catch (error) {
      console.error('❌ 테스트 진행 상황 불러오기 중 오류:', error);
    }
    return null;
  };

  // 테스트 진행 상황 삭제 함수
  const clearTestProgress = async (requestId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/qc/clear-test-progress/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('🗑️ 테스트 진행 상황 삭제 완료');
      }
    } catch (error) {
      console.error('❌ 테스트 진행 상황 삭제 중 오류:', error);
    }
  };

  // 테스트 실행 시작 함수
  const handleStartTestExecution = async (request: QCRequest) => {
    setSelectedTestRequest(request);
    
    // 먼저 저장된 진행 상황이 있는지 확인
    const savedProgress = await loadTestProgress(request.id);
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/qc/test-plan/${request.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const testPlan = result.success ? result.data : result;
        console.log('📋 테스트 계획 데이터:', testPlan);
        
        // 테스트 계획을 실행 가능한 체크리스트로 변환
        const checklist = testPlan.finalChecklist || testPlan.final_checklist || [];
        console.log('📋 체크리스트 데이터:', checklist);
        
        const executionItems = checklist.map((item: any, index: number) => ({
          id: index,
          category: item.category,
          item: item.item,
          description: item.description,
          status: 'pending', // pending, passed, failed
          notes: '',
          execution_time: null
        }));
        
        // 카테고리별로 그룹화
        const groupedByCategory = executionItems.reduce((acc: any, item: any) => {
          const category = item.category || '기타';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {});
        
        const categories = Object.keys(groupedByCategory).map(categoryName => ({
          name: categoryName,
          items: groupedByCategory[categoryName],
          completed: false
        }));
        
        // 저장된 진행 상황이 있으면 복원
        if (savedProgress && savedProgress.test_progress) {
          console.log('📂 저장된 진행 상황 복원 중...');
          
          // 저장된 테스트 상태 복원
          const restoredExecutionItems = executionItems.map((item: any) => {
            const savedItem = savedProgress.test_progress[item.id];
            if (savedItem) {
              return {
                ...item,
                status: savedItem.status || 'pending',
                notes: savedItem.notes || ''
              };
            }
            return item;
          });
          
          // 카테고리별 아이템 상태 복원
          const restoredCategories = categories.map(category => ({
            ...category,
            items: category.items.map((item: any) => {
              const savedItem = savedProgress.test_progress[item.id];
              if (savedItem) {
                return {
                  ...item,
                  status: savedItem.status || 'pending',
                  notes: savedItem.notes || ''
                };
              }
              return item;
            })
          }));
          
          // 현재 카테고리와 스텝 복원
          const currentStep = Math.min(savedProgress.current_step || 0, categories.length - 1);
          
          setTestExecutionData(restoredExecutionItems);
          setTestCategories(restoredCategories);
          setCurrentTestStep(currentStep);
          setCurrentCategoryItems(restoredCategories[currentStep]?.items || []);
          
          // 진행률 계산
          const completedCount = restoredExecutionItems.filter((item: any) => 
            item.status === 'passed' || item.status === 'failed'
          ).length;
          setTestProgress(Math.round((completedCount / restoredExecutionItems.length) * 100));
          
          alert(`저장된 테스트 진행 상황을 불러왔습니다.\n\n` +
                `진행률: ${completedCount}/${restoredExecutionItems.length} (${Math.round((completedCount / restoredExecutionItems.length) * 100)}%)\n` +
                `마지막 저장: ${new Date(savedProgress.last_saved_at).toLocaleString()}`);
        } else {
          setTestExecutionData(executionItems);
          setTestCategories(categories);
          setCurrentTestStep(0);
          setCurrentCategoryItems(categories[0]?.items || []);
          setTestProgress(0);
        }
        
        setTestExecutionDialog(true);
      } else {
        alert('테스트 계획을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('테스트 계획 로드 오류:', error);
      alert('테스트 계획 로드 중 오류가 발생했습니다.');
    }
  };

  // 다음 카테고리로 이동
  const handleNextTestCategory = () => {
    if (currentTestStep < testCategories.length - 1) {
      const nextStep = currentTestStep + 1;
      setCurrentTestStep(nextStep);
      setCurrentCategoryItems(testCategories[nextStep].items);
    }
  };

  // 이전 카테고리로 이동
  const handlePrevTestCategory = () => {
    if (currentTestStep > 0) {
      const prevStep = currentTestStep - 1;
      setCurrentTestStep(prevStep);
      setCurrentCategoryItems(testCategories[prevStep].items);
    }
  };

  // 실패 항목 이슈 레포트 열기
  const handleFailedItemIssue = async (item: any) => {
    setSelectedFailedItem(item);
    
    // 먼저 available PEs를 로드하여 originalPE 정보를 확보
    if (selectedTestRequest) {
      try {
        const response = await fetch(`${getApiUrl()}/api/qc/available-pes/${selectedTestRequest.project_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          setAvailablePEs(result.data.available_pes || []);
          setOriginalPE(result.data.original_pe);
          
          // 피드백 데이터 초기화 (실패한 테스트 항목 정보로 미리 채우기)
          setFeedbackData({
            feedback_type: 'bug',
            severity_level: 'high', // 테스트 실패는 높은 심각도로 설정
            priority_level: 'high', // 테스트 실패는 높은 우선순위로 설정
            title: `[테스트 실패] ${item.category} - ${item.item}`,
            description: `테스트 실행 중 다음 항목에서 실패가 발생했습니다.\n\n` +
                        `📋 테스트 항목: ${item.item}\n` +
                        `🏷️ 카테고리: ${item.category}\n` +
                        `📝 항목 설명: ${item.description}\n` +
                        `💬 테스트 메모: ${item.notes || '없음'}\n\n` +
                        `⚠️ 이 이슈는 QC/QA 테스트 실행 중 자동으로 생성되었습니다.`,
            steps_to_reproduce: `1. QC/QA 테스트 실행\n2. "${item.category}" 카테고리의 "${item.item}" 항목 테스트\n3. 실패 발생`,
            expected_behavior: item.description || '테스트 항목이 정상적으로 통과되어야 함',
            actual_behavior: '테스트 실패 (구체적인 실패 내용을 작성해주세요)',
            test_environment: `QC/QA 테스트 환경\n프로젝트: ${selectedTestRequest.project_name}`,
            browser_os_info: '',
            assigned_to_pe: result.data.original_pe?.id || '',
            qc_notes: `자동 생성된 테스트 실패 이슈\n테스트 항목: ${item.category} > ${item.item}\n실행 시간: ${new Date().toLocaleString()}`,
            attachment_files: []
          });
        }
      } catch (error) {
        console.error('❌ PE 목록 조회 실패:', error);
      }
    }
    
    setFailedItemIssueDialog(true);
  };

  // 개별 테스트 항목 상태 업데이트 (자동 저장 포함)
  const handleTestItemUpdate = async (itemId: number, status: string, notes: string = '') => {
    // 실패 상태로 변경될 때만 이슈 레포트 다이얼로그 열기 (토글로 되돌리는 경우 제외)
    if (status === 'failed') {
      const failedItem = currentCategoryItems.find(item => item.id === itemId);
      if (failedItem && failedItem.status !== 'failed') { // 이전 상태가 실패가 아닐 때만
        handleFailedItemIssue({ ...failedItem, notes });
      }
    }
    
    setTestExecutionData(prev => {
      const updatedData = prev.map(item => 
        item.id === itemId 
          ? { ...item, status, notes, execution_time: new Date().toISOString() }
          : item
      );
      
      // 자동 저장 (비동기로 실행하여 UI 블록 방지)
      setTimeout(async () => {
        if (selectedTestRequest) {
          const progressData = updatedData.reduce((acc: any, item: any) => {
            acc[item.id] = {
              status: item.status,
              notes: item.notes || '',
              execution_time: item.execution_time
            };
            return acc;
          }, {});
          
          const currentCategory = testCategories[currentTestStep]?.name || '';
          await saveTestProgress(selectedTestRequest.id, progressData, currentCategory, currentTestStep);
        }
      }, 500); // 0.5초 디바운스
      
      // 현재 카테고리 항목들도 업데이트
      setCurrentCategoryItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, status, notes, execution_time: new Date().toISOString() }
            : item
        )
      );
      
      // 진행률 계산
      const completedItems = updatedData.filter(item => item.status !== 'pending').length;
      const progress = updatedData.length > 0 ? Math.round((completedItems / updatedData.length) * 100) : 0;
      setTestProgress(progress);
      
      return updatedData;
    });
  };

  // 테스트 실행 완료 및 결과 저장
  const handleCompleteTestExecution = async () => {
    const incompleteItems = testExecutionData.filter(item => item.status === 'pending');
    if (incompleteItems.length > 0) {
      const confirm = window.confirm(`${incompleteItems.length}개의 테스트가 아직 완료되지 않았습니다. 계속하시겠습니까?`);
      if (!confirm) return;
    }

    // 품질 점수 계산 (통과 비율 기반)
    const totalItems = testExecutionData.length;
    const passedItems = testExecutionData.filter(item => item.status === 'passed').length;
    const failedItems = testExecutionData.filter(item => item.status === 'failed').length;
    
    // 점수 계산: 통과율 기반 (0-100점)
    const passRate = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;
    let qualityScore = Math.round(passRate);
    
    // 실패 항목에 따른 점수 조정 (심각도 고려)
    if (failedItems > 0) {
      const failurePenalty = Math.min(failedItems * 5, 30); // 실패 1개당 5점 차감, 최대 30점
      qualityScore = Math.max(qualityScore - failurePenalty, 0);
    }

    setExecutingTests(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/qc/test-execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: selectedTestRequest?.id,
          execution_results: testExecutionData,
          overall_status: failedItems > 0 ? 'failed' : 'passed',
          quality_score: qualityScore,
          total_tests: totalItems,
          passed_tests: passedItems,
          failed_tests: failedItems,
          completion_date: new Date().toISOString()
        })
      });

      if (response.ok) {
        alert(`테스트 실행이 완료되었습니다.\n품질 점수: ${qualityScore}점 (통과: ${passedItems}/${totalItems})`);
        
        // 저장된 진행 상황 삭제 (테스트 완료)
        if (selectedTestRequest) {
          await clearTestProgress(selectedTestRequest.id);
        }
        
        setTestExecutionDialog(false);
        setTestExecutionData([]);
        setTestProgress(0);
        loadDashboardData(); // 데이터 새로고침
        loadAllActivityHistory(); // 활동 히스토리 새로고침
      } else {
        const error = await response.json();
        alert(`테스트 결과 저장 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('테스트 결과 저장 오류:', error);
      alert('테스트 결과 저장 중 오류가 발생했습니다.');
    } finally {
      setExecutingTests(false);
    }
  };

  // 정형화된 테스트 셋 목록
  const standardizedTestSets = [
    {
      id: 'software_certification',
      name: '소프트웨어 인증 테스트',
      description: 'GS인증, CC인증 등 소프트웨어 품질 인증 테스트',
      estimatedHours: 40,
      testItems: [
        '기능성 테스트 (정확성, 상호운용성, 보안성)',
        '신뢰성 테스트 (성숙성, 장애허용성, 회복성)',
        '사용성 테스트 (이해성, 학습성, 운용성)',
        '효율성 테스트 (시간효율성, 자원효율성)',
        '유지보수성 테스트 (분석성, 변경성, 안정성, 시험성)',
        '이식성 테스트 (적응성, 설치성, 대체성, 공존성)'
      ]
    },
    {
      id: 'web_accessibility',
      name: '웹 접근성 테스트',
      description: 'WCAG 2.1 기준 웹 접근성 준수 테스트',
      estimatedHours: 24,
      testItems: [
        '인식의 용이성 (대체 텍스트, 자막, 색상 대비)',
        '운용의 용이성 (키보드 접근, 충분한 시간 제공)',
        '이해의 용이성 (가독성, 예측 가능성)',
        '견고성 (마크업 오류, 웹 표준 준수)'
      ]
    },
    {
      id: 'security_vulnerability',
      name: '보안 취약점 테스트',
      description: 'OWASP Top 10 기반 보안 취약점 점검',
      estimatedHours: 32,
      testItems: [
        'SQL 인젝션 테스트',
        'XSS (Cross-Site Scripting) 테스트',
        '인증 및 세션 관리 테스트',
        '접근 제어 테스트',
        '암호화 및 데이터 보호 테스트',
        'CSRF (Cross-Site Request Forgery) 테스트'
      ]
    },
    {
      id: 'performance_load',
      name: '성능 및 부하 테스트',
      description: '시스템 성능 및 확장성 검증 테스트',
      estimatedHours: 48,
      testItems: [
        '응답시간 테스트 (평균, 최대 응답시간)',
        '처리량 테스트 (TPS, 동시 사용자)',
        '부하 테스트 (정상 부하 상황)',
        '스트레스 테스트 (한계 상황)',
        '볼륨 테스트 (대용량 데이터)',
        '안정성 테스트 (장시간 운영)'
      ]
    },
    {
      id: 'mobile_compatibility',
      name: '모바일 호환성 테스트',
      description: '다양한 모바일 환경에서의 호환성 테스트',
      estimatedHours: 20,
      testItems: [
        '다양한 화면 크기 대응 테스트',
        '터치 인터페이스 테스트',
        '모바일 브라우저 호환성 테스트',
        '네트워크 환경별 테스트 (3G, 4G, WiFi)',
        '배터리 소모량 테스트',
        '오프라인 모드 테스트'
      ]
    },
    {
      id: 'api_integration',
      name: 'API 통합 테스트',
      description: 'REST API 및 외부 시스템 연동 테스트',
      estimatedHours: 28,
      testItems: [
        'API 기능 테스트 (CRUD 동작)',
        'API 성능 테스트 (응답시간, 처리량)',
        'API 보안 테스트 (인증, 권한)',
        '데이터 형식 검증 테스트',
        '오류 처리 테스트',
        '버전 호환성 테스트'
      ]
    },
    {
      id: 'database_integrity',
      name: '데이터베이스 무결성 테스트',
      description: '데이터 정합성 및 트랜잭션 안정성 테스트',
      estimatedHours: 24,
      testItems: [
        '데이터 정합성 테스트',
        '트랜잭션 무결성 테스트',
        '동시성 제어 테스트',
        '백업 및 복구 테스트',
        '데이터 마이그레이션 테스트',
        '성능 최적화 테스트'
      ]
    }
  ];

  // API URL 결정
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    }
    // 프로덕션 환경에서는 3001 포트 사용
    return `http://${currentHost.split(':')[0]}:3001`;
  };

  // QC/QA 통계 로드
  const loadQCStats = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/qc/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
        console.log('QC/QA 통계 로드 완료:', result.data);
      } else {
        console.error('QC/QA 통계 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('QC/QA 통계 로드 중 오류:', error);
    }
  };

  // QC/QA 요청 목록 로드
  const loadQCRequests = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/qc/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setQcRequests(result.data);
        console.log('QC/QA 요청 목록 로드 완료:', result.data.length, '개');
      } else {
        console.error('QC/QA 요청 목록 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('QC/QA 요청 목록 로드 중 오류:', error);
    }
  };

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadQCStats(),
        loadQCRequests()
      ]);
    } catch (error) {
      console.error('대시보드 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 피드백 다이얼로그 열기
  const handleOpenFeedbackDialog = async (request: QCRequest) => {
    try {
      setSelectedFeedbackRequest(request);
      
      // 할당 가능한 PE 목록 조회
      const response = await fetch(`${getApiUrl()}/api/qc/available-pes/${request.project_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAvailablePEs(result.data.available_pes || []);
        setOriginalPE(result.data.original_pe);
        
        // 기본적으로 원래 개발한 PE를 선택
        if (result.data.original_pe) {
          setFeedbackData(prev => ({
            ...prev,
            assigned_to_pe: result.data.original_pe.id
          }));
        }
      }

      setFeedbackDialog(true);
    } catch (error) {
      console.error('❌ PE 목록 조회 실패:', error);
      setFeedbackDialog(true); // 에러가 있어도 다이얼로그는 열기
    }
  };

  // 활동 로그 및 히스토리 로드
  const loadActivityHistory = async (requestId: string) => {
    try {
      const [activityResponse, historyResponse] = await Promise.all([
        fetch(`${getApiUrl()}/api/qc/activity-logs/${requestId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${getApiUrl()}/api/qc/failure-history/${requestId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (activityResponse.ok) {
        const activityResult = await activityResponse.json();
        setActivityLogs(activityResult.data || []);
      }

      if (historyResponse.ok) {
        const historyResult = await historyResponse.json();
        setFailureHistory(historyResult.data || []);
      }
    } catch (error) {
      console.error('❌ 활동 히스토리 로드 오류:', error);
    }
  };

  // 전체 활동 히스토리 로드 (대시보드용)
  const loadAllActivityHistory = async () => {
    try {
      // 모든 QC 요청에 대한 활동 로그와 실패 히스토리를 가져옴
      const allLogs: any[] = [];
      const allFailures: any[] = [];

      for (const request of qcRequests) {
        try {
          const [activityResponse, historyResponse] = await Promise.all([
            fetch(`${getApiUrl()}/api/qc/activity-logs/${request.id}?limit=5`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${getApiUrl()}/api/qc/failure-history/${request.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ]);

          if (activityResponse.ok) {
            const activityResult = await activityResponse.json();
            const logsWithProject = (activityResult.data || []).map((log: any) => ({
              ...log,
              project_name: request.project_name,
              project_id: request.project_id
            }));
            allLogs.push(...logsWithProject);
          } else if (activityResponse.status !== 404) {
            // 404가 아닌 다른 에러만 로그 출력 (테이블이 없을 수 있음)
            console.warn(`⚠️ ${request.project_name} 활동 로그 로드 실패: ${activityResponse.status}`);
          }

          if (historyResponse.ok) {
            const historyResult = await historyResponse.json();
            const failuresWithProject = (historyResult.data || []).map((failure: any) => ({
              ...failure,
              project_name: request.project_name,
              project_id: request.project_id
            }));
            allFailures.push(...failuresWithProject);
          } else if (historyResponse.status !== 404) {
            // 404가 아닌 다른 에러만 로그 출력 (테이블이 없을 수 있음)
            console.warn(`⚠️ ${request.project_name} 실패 히스토리 로드 실패: ${historyResponse.status}`);
          }
        } catch (error) {
          // 네트워크 오류나 기타 예외는 조용히 처리
          console.warn(`⚠️ ${request.project_name} 히스토리 로드 중 오류:`, error);
        }
      }

      // 시간순으로 정렬
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      allFailures.sort((a, b) => new Date(b.failure_date).getTime() - new Date(a.failure_date).getTime());

      setAllActivityLogs(allLogs.slice(0, 10)); // 최근 10개만
      setAllFailureHistory(allFailures.slice(0, 10)); // 최근 10개만
    } catch (error) {
      // 전체 로드 실패는 조용히 처리 (히스토리는 부가 기능)
      console.warn('⚠️ 전체 활동 히스토리 로드 중 오류:', error);
    }
  };

  // 히스토리 다이얼로그 열기
  const handleOpenHistory = async (request: QCRequest) => {
    setSelectedRequestForHistory(request);
    await loadActivityHistory(request.id);
    setHistoryDialog(true);
  };

  // 기타 이슈 레포트 열기 (테스트 실행 중)
  const handleOpenGeneralIssueReport = async () => {
    if (!selectedTestRequest) return;
    
    // 프로젝트 정보를 기반으로 기본 내용 자동 작성
    try {
      const response = await fetch(`${getApiUrl()}/api/qc/available-pes/${selectedTestRequest.project_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAvailablePEs(result.data.available_pes || []);
        setOriginalPE(result.data.original_pe);
        
        // 기본 피드백 데이터 설정
        setFeedbackData({
          feedback_type: 'improvement',
          severity_level: 'medium',
          priority_level: 'normal',
          title: `[기타 이슈] ${selectedTestRequest.project_name} - 추가 개선사항`,
          description: `테스트 실행 중 발견된 추가 개선사항입니다.\n\n` +
                      `📋 프로젝트: ${selectedTestRequest.project_name}\n` +
                      `🎯 대상 시스템: ${selectedTestRequest.target_system || '미지정'}\n` +
                      `📅 테스트 일시: ${new Date().toLocaleString()}\n\n` +
                      `💡 이 이슈는 테스트 실행 중 QC/QA에서 발견한 추가 개선사항입니다.\n` +
                      `아래에 구체적인 개선사항을 작성해주세요.`,
          steps_to_reproduce: '',
          expected_behavior: '개선된 기능 또는 사용자 경험',
          actual_behavior: '현재 상태 (개선이 필요한 부분을 구체적으로 작성)',
          test_environment: `QC/QA 테스트 환경\n프로젝트: ${selectedTestRequest.project_name}`,
          browser_os_info: '',
          assigned_to_pe: result.data.original_pe?.id || '',
          qc_notes: `테스트 실행 중 발견된 추가 개선사항\n프로젝트: ${selectedTestRequest.project_name}\n발견 시간: ${new Date().toLocaleString()}`,
          attachment_files: []
        });
      }
    } catch (error) {
      console.error('❌ PE 목록 조회 실패:', error);
    }
    
    setFeedbackDialog(true);
  };

  // QC 검증 승인 다이얼로그 열기 (검증 완료 보고서 작성)
  const handleOpenApprovalDialog = async (request: QCRequest) => {
    setSelectedRequestForApproval(request);
    
    try {
      // 테스트 실행 결과 데이터 로드
      const testResultsResponse = await fetch(`${getApiUrl()}/api/qc/test-results/${request.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let testResults = {};
      if (testResultsResponse.ok) {
        testResults = await testResultsResponse.json();
      }
      
      // 피드백 통계 로드
      const feedbackResponse = await fetch(`${getApiUrl()}/api/qc/feedback-stats/${request.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let feedbackStats = {};
      if (feedbackResponse.ok) {
        feedbackStats = await feedbackResponse.json();
      }
      
      // 검증 완료 보고서 데이터 자동 입력
      setVerificationReportData({
        projectSummary: `프로젝트명: ${request.project_name}\n` +
                       `대상 시스템: ${request.target_system || '미지정'}\n` +
                       `요청자: ${request.pe_name}\n` +
                       `검증 기간: ${new Date(request.created_at).toLocaleDateString()} ~ ${new Date().toLocaleDateString()}\n` +
                       `검증 담당자: ${user?.full_name || '시스템'}`,
        
        testExecutionSummary: `총 ${testResults.total_tests || 0}개의 테스트 케이스를 실행하였으며, ` +
                             `${testResults.passed_tests || 0}개 통과, ${testResults.failed_tests || 0}개 실패하였습니다.`,
        totalTestCases: testResults.total_tests || 0,
        passedTestCases: testResults.passed_tests || 0,
        failedTestCases: testResults.failed_tests || 0,
        testCoverage: testResults.coverage || '85%',
        
        qualityScore: request.quality_score || 85,
        functionalityScore: testResults.functionality_score || 85,
        reliabilityScore: testResults.reliability_score || 80,
        usabilityScore: testResults.usability_score || 75,
        performanceScore: testResults.performance_score || 80,
        securityScore: testResults.security_score || 90,
        
        criticalIssues: feedbackStats.critical_count ? `${feedbackStats.critical_count}건의 치명적 이슈가 발견되었습니다.` : '치명적 이슈가 발견되지 않았습니다.',
        majorIssues: feedbackStats.major_count ? `${feedbackStats.major_count}건의 주요 이슈가 발견되었습니다.` : '주요 이슈가 발견되지 않았습니다.',
        minorIssues: feedbackStats.minor_count ? `${feedbackStats.minor_count}건의 경미한 이슈가 발견되었습니다.` : '경미한 이슈가 발견되지 않았습니다.',
        resolvedIssues: feedbackStats.resolved_count ? `${feedbackStats.resolved_count}건의 이슈가 해결되었습니다.` : '',
        
        recommendations: '품질 기준을 충족하며 배포 가능한 상태입니다.',
        improvementSuggestions: '지속적인 코드 품질 관리 및 테스트 커버리지 향상을 권장합니다.',
        
        deploymentRecommendation: (request.quality_score || 85) >= 80 ? 'approved' : 'conditional',
        deploymentConditions: (request.quality_score || 85) < 80 ? '품질 점수 80점 이상 달성 후 배포 권장' : '',
        
        additionalNotes: ''
      });
      
    } catch (error) {
      console.error('❌ 검증 보고서 데이터 로드 실패:', error);
      // 기본값으로 설정
      setVerificationReportData({
        projectSummary: `프로젝트명: ${request.project_name}\n검증 담당자: ${user?.full_name || '시스템'}`,
        testExecutionSummary: '테스트 실행 결과를 확인 중입니다.',
        totalTestCases: 0,
        passedTestCases: 0,
        failedTestCases: 0,
        testCoverage: '85%',
        qualityScore: request.quality_score || 85,
        functionalityScore: 85,
        reliabilityScore: 80,
        usabilityScore: 75,
        performanceScore: 80,
        securityScore: 90,
        criticalIssues: '치명적 이슈가 발견되지 않았습니다.',
        majorIssues: '주요 이슈가 발견되지 않았습니다.',
        minorIssues: '경미한 이슈가 발견되지 않았습니다.',
        resolvedIssues: '',
        recommendations: '품질 기준을 충족하며 배포 가능한 상태입니다.',
        improvementSuggestions: '지속적인 코드 품질 관리를 권장합니다.',
        deploymentRecommendation: 'approved',
        deploymentConditions: '',
        additionalNotes: ''
      });
    }
    
    setVerificationReportDialog(true);
  };

  // 검증 완료 보고서 제출 및 승인 처리
  const handleSubmitVerificationReport = async () => {
    if (!selectedRequestForApproval) return;
    
    // 필수 필드 검증
    if (!verificationReportData.testExecutionSummary.trim() || !verificationReportData.recommendations.trim()) {
      alert('테스트 실행 요약과 권장사항은 필수 입력 항목입니다.');
      return;
    }
    
    try {
      setSubmittingApproval(true);
      
      const response = await fetch(`${getApiUrl()}/api/qc/approve-verification/${selectedRequestForApproval.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verification_report: verificationReportData,
          quality_score: verificationReportData.qualityScore,
          approval_notes: `검증 완료 보고서와 함께 승인되었습니다. 배포 권장사항: ${verificationReportData.deploymentRecommendation}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`검증 완료 보고서가 제출되고 승인이 완료되었습니다!\n\n` +
              `프로젝트: ${selectedRequestForApproval.project_name}\n` +
              `품질 점수: ${verificationReportData.qualityScore}점\n` +
              `배포 권장: ${verificationReportData.deploymentRecommendation === 'approved' ? '승인' : 
                          verificationReportData.deploymentRecommendation === 'conditional' ? '조건부 승인' : '보류'}\n\n` +
              `PO에게 시스템 등록 결정 알림이 전송되었습니다.`);
        
        setVerificationReportDialog(false);
        setSelectedRequestForApproval(null);
        setVerificationReportData({
          projectSummary: '',
          testExecutionSummary: '',
          totalTestCases: 0,
          passedTestCases: 0,
          failedTestCases: 0,
          testCoverage: '',
          qualityScore: 85,
          functionalityScore: 0,
          reliabilityScore: 0,
          usabilityScore: 0,
          performanceScore: 0,
          securityScore: 0,
          criticalIssues: '',
          majorIssues: '',
          minorIssues: '',
          resolvedIssues: '',
          recommendations: '',
          improvementSuggestions: '',
          deploymentRecommendation: 'approved',
          deploymentConditions: '',
          additionalNotes: ''
        });
        
        // 대시보드 데이터 새로고침
        loadDashboardData();
        
        console.log('✅ 검증 완료 보고서 제출 및 승인 완료:', result);
      } else {
        const error = await response.json();
        alert(`검증 완료 보고서 제출 실패: ${error.message || '알 수 없는 오류'}`);
        console.error('❌ 검증 완료 보고서 제출 실패:', error);
      }
    } catch (error) {
      console.error('❌ 검증 완료 보고서 제출 중 오류:', error);
      alert('검증 완료 보고서 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // 테스트 항목 재설정 다이얼로그 열기 (기존 테스트 계획 다이얼로그 재사용)
  const handleOpenTestPlanEdit = async (request: QCRequest) => {
    try {
      // 기존 테스트 계획 로드
      const response = await fetch(`${getApiUrl()}/api/qc/test-plan/${request.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const existingPlan = result.data || {};
        
        // 기존 테스트 계획 데이터를 3단계 다이얼로그 상태에 설정
        console.log('🔍 기존 테스트 계획 데이터:', existingPlan);
        
        // Step 1 데이터 설정 - 문자열을 배열로 변환
        const step1DataToSet = {
          basicTests: existingPlan.basicTests ? existingPlan.basicTests.split(', ').filter(item => item.trim()) : [],
          performanceTests: existingPlan.performanceTests ? existingPlan.performanceTests.split(', ').filter(item => item.trim()) : [],
          securityTests: existingPlan.securityTests ? existingPlan.securityTests.split(', ').filter(item => item.trim()) : [],
          usabilityTests: existingPlan.usabilityTests ? { requirements: existingPlan.usabilityTests } : { requirements: '' },
          compatibilityTests: existingPlan.compatibilityTests ? {
            enabled: true,
            platforms: existingPlan.compatibilityTests.split(', ').filter(item => item.trim())
          } : { enabled: false, platforms: [] }
        };
        
        setStep1Data(step1DataToSet);
        console.log('✅ Step1 데이터 설정:', step1DataToSet);
        
        // Step 2 데이터 설정
        const step2DataToSet = {
          selectedTestSets: existingPlan.standardizedTestSets || [],
          additionalTests: existingPlan.additionalTests || []
        };
        
        setStep2Data(step2DataToSet);
        console.log('✅ Step2 데이터 설정:', step2DataToSet);
        
        // Step 3 데이터 설정
        if (existingPlan.finalChecklist) {
          setStep3Data({
            finalChecklist: existingPlan.finalChecklist,
            totalEstimatedHours: existingPlan.totalEstimatedHours || 0,
            testEnvironment: existingPlan.testEnvironment || '',
            testTools: existingPlan.testTools || ''
          });
        }
        
        console.log('✅ 기존 테스트 계획 로드됨:', existingPlan);
      } else {
        console.log('⚠️ 기존 테스트 계획이 없음, 새로 작성');
        // 기존 계획이 없으면 초기화
        setStep1Data({});
        setStep2Data({ standardizedTestSets: [], additionalTests: [] });
        setStep3Data({ finalChecklist: [], totalEstimatedHours: 0, testEnvironment: '', testTools: '' });
      }
    } catch (error) {
      console.error('❌ 기존 테스트 계획 로드 실패:', error);
      // 에러 시 초기화
      setStep1Data({});
      setStep2Data({ standardizedTestSets: [], additionalTests: [] });
      setStep3Data({ finalChecklist: [], totalEstimatedHours: 0, testEnvironment: '', testTools: '' });
    }
    
    // 선택된 요청 설정하고 테스트 계획 다이얼로그 열기
    setSelectedRequest(request);
    setCurrentStep(1);
    setTestPlanDialog(true);
  };

  // 피드백 제출
  const handleSubmitFeedback = async (customData?: any) => {
    const dataToSubmit = customData || feedbackData;
    try {
      if (!dataToSubmit.title.trim() || !dataToSubmit.description.trim()) {
        alert('제목과 설명은 필수 입력 항목입니다.');
        return;
      }

      if (!dataToSubmit.assigned_to_pe) {
        alert('피드백을 할당할 PE를 선택해주세요.');
        return;
      }

      setSubmittingFeedback(true);

      const response = await fetch(`${getApiUrl()}/api/qc/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qc_request_id: selectedFeedbackRequest?.id || selectedTestRequest?.id,
          ...dataToSubmit
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '피드백 생성에 실패했습니다.');
      }

      const result = await response.json();
      console.log('✅ QC/QA 피드백 생성 성공:', result);

      // 다이얼로그 닫기 및 데이터 초기화
      setFeedbackDialog(false);
      setSelectedFeedbackRequest(null);
      setFeedbackData({
        feedback_type: 'bug',
        severity_level: 'medium',
        priority_level: 'normal',
        title: '',
        description: '',
        steps_to_reproduce: '',
        expected_behavior: '',
        actual_behavior: '',
        test_environment: '',
        browser_os_info: '',
        assigned_to_pe: '',
        qc_notes: ''
      });

      // 데이터 새로고침
      await Promise.all([loadDashboardData(), loadQCRequests()]);

      alert('피드백이 성공적으로 생성되어 PE에게 전달되었습니다.');
      loadAllActivityHistory(); // 활동 히스토리 새로고침

    } catch (error) {
      console.error('❌ QC/QA 피드백 생성 실패:', error);
      alert(`피드백 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // 테스트 계획 작성 시작
  const handleTestPlanClick = (request: QCRequest) => {
    console.log('테스트 계획 작성 시작:', request);
    setSelectedRequest(request);
    setTestPlanData({
      basicTests: '',
      functionalTests: '',
      performanceTests: '',
      securityTests: '',
      usabilityTests: '',
      compatibilityTests: '',
      additionalTests: '',
      standardizedTestSets: [],
      estimatedHours: '',
      testEnvironment: '',
      testTools: ''
    });
    setTestPlanDialog(true);
  };

  // 정형화된 테스트 셋 선택 처리
  const handleStandardizedTestSetChange = (testSetIds: string[]) => {
    const selectedTestSets = (standardizedTestSets || []).filter(set => (testSetIds || []).includes(set.id));
    
    // 선택된 테스트 셋들의 예상 시간 합계 계산
    const totalEstimatedHours = selectedTestSets.reduce((sum, set) => sum + set.estimatedHours, 0);
    
    // 선택된 테스트 셋들의 테스트 항목들을 추가 테스트에 자동 추가
    const additionalTestItems = selectedTestSets.map(set => 
      `${set.name}:\n${set.testItems.map(item => `- ${item}`).join('\n')}`
    ).join('\n\n');
    
    setTestPlanData(prev => ({
      ...prev,
      standardizedTestSets: testSetIds,
      additionalTests: prev.additionalTests ? 
        `${prev.additionalTests}\n\n${additionalTestItems}` : 
        additionalTestItems,
      estimatedHours: prev.estimatedHours ? 
        (parseInt(prev.estimatedHours) + totalEstimatedHours).toString() : 
        totalEstimatedHours.toString()
    }));
  };

  // 단계 이동 핸들러
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      
      // 2단계로 넘어갈 때 1단계 데이터 기반으로 체크리스트 생성
      if (currentStep === 2) {
        generateFinalChecklist();
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 최종 체크리스트 생성
  const generateFinalChecklist = () => {
    const checklist: any[] = [];
    let totalHours = 0;

    // 기본 테스트 항목 추가
    (step1Data.basicTests || []).forEach(test => {
      checklist.push({
        category: '기본 테스트',
        item: test,
        description: `${test}에 대한 상세 검증`,
        required: true,
        estimatedTime: 2
      });
      totalHours += 2;
    });

    // 성능 테스트 항목 추가
    (step1Data.performanceTests || []).forEach(test => {
      checklist.push({
        category: '성능 테스트',
        item: test,
        description: `${test} 성능 측정 및 분석`,
        required: true,
        estimatedTime: 4
      });
      totalHours += 4;
    });

    // 보안 테스트 항목 추가
    (step1Data.securityTests || []).forEach(test => {
      checklist.push({
        category: '보안 테스트',
        item: test,
        description: `${test} 보안 검증`,
        required: true,
        estimatedTime: 3
      });
      totalHours += 3;
    });

    // 호환성 테스트 항목 추가
    if (step1Data.compatibilityTests && step1Data.compatibilityTests.enabled) {
      (step1Data.compatibilityTests.platforms || []).forEach(platform => {
        checklist.push({
          category: '호환성 테스트',
          item: `${platform} 호환성`,
          description: `${platform} 환경에서의 정상 동작 확인`,
          required: false,
          estimatedTime: 2
        });
        totalHours += 2;
      });
    }

    // 선택된 테스트 셋 항목 추가
    (step2Data.selectedTestSets || []).forEach(setName => {
      const testSet = (standardizedTestSets || []).find(set => set.name === setName);
      if (testSet && testSet.testItems) {
        testSet.testItems.forEach(item => {
          checklist.push({
            category: '표준 테스트',
            item: item,
            description: `${setName}: ${item}`,
            required: true,
            estimatedTime: Math.ceil(testSet.estimatedHours / testSet.testItems.length)
          });
        });
        totalHours += testSet.estimatedHours;
      }
    });

    setStep3Data(prev => ({
      ...prev,
      finalChecklist: checklist,
      totalEstimatedHours: totalHours
    }));
  };

  // 테스트 계획 제출
  const handleTestPlanSubmit = async () => {
    if (!selectedRequest) return;

    // 필수 필드 검증
    if (step3Data.finalChecklist.length === 0) {
      alert('테스트 항목을 선택해주세요.');
      return;
    }

    try {
      setSubmittingTestPlan(true);
      const apiUrl = getApiUrl();
      
      // 3단계 데이터를 기존 형식으로 변환
      const consolidatedTestPlan = {
        basicTests: (step1Data.basicTests || []).join(', '),
        functionalTests: '프로젝트 기능 테스트',
        performanceTests: (step1Data.performanceTests || []).join(', '),
        securityTests: (step1Data.securityTests || []).join(', '),
        usabilityTests: (step1Data.usabilityTests && step1Data.usabilityTests.requirements) || '사용성 테스트',
        compatibilityTests: (step1Data.compatibilityTests && step1Data.compatibilityTests.enabled) ? 
          (step1Data.compatibilityTests.platforms || []).join(', ') : '',
        additionalTests: (step2Data.selectedTestSets || []).join(', '),
        standardizedTestSets: step2Data.selectedTestSets || [],
        estimatedHours: step3Data.totalEstimatedHours.toString(),
        testEnvironment: step3Data.testEnvironment,
        testTools: step3Data.testTools,
        finalChecklist: step3Data.finalChecklist
      };

      console.log('3단계 테스트 계획 제출 시작:', {
        requestId: selectedRequest.id,
        consolidatedTestPlan
      });

      const response = await fetch(`${apiUrl}/api/qc/test-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          test_plan: consolidatedTestPlan
        })
      });

      if (response.ok) {
        const result = await response.json();
        const isEditMode = step3Data.finalChecklist && step3Data.finalChecklist.length > 0;
        alert(isEditMode 
          ? '테스트 계획이 성공적으로 수정되었습니다!\n변경사항이 적용됩니다.' 
          : '테스트 계획이 성공적으로 등록되었습니다!\n품질 검증 작업이 시작됩니다.'
        );
        setTestPlanDialog(false);
        setCurrentStep(1); // 단계 초기화
        // 상태 초기화
        setStep1Data({});
        setStep2Data({ standardizedTestSets: [], additionalTests: [] });
        setStep3Data({ finalChecklist: [], totalEstimatedHours: 0, testEnvironment: '', testTools: '' });
        loadDashboardData(); // 데이터 새로고침
        console.log('테스트 계획 제출 성공:', result);
      } else {
        const error = await response.json();
        alert(`테스트 계획 제출 실패: ${error.message || '알 수 없는 오류'}`);
        console.error('테스트 계획 제출 실패:', error);
      }
    } catch (error) {
      console.error('테스트 계획 제출 중 오류:', error);
      alert('테스트 계획 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmittingTestPlan(false);
    }
  };

  // 우선순위 색상 결정
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // 상태 색상 결정
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  useEffect(() => {
    if (token && user && (user.roleType === 'qa' || user.roleType === 'admin' || user.roleType === 'executive')) {
      loadDashboardData();
      
      // 30초마다 자동 새로고침
      const interval = setInterval(() => {
        loadDashboardData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token, user]);

  // QC 요청이 로드된 후 전체 활동 히스토리 로드
  useEffect(() => {
    if (qcRequests.length > 0) {
      loadAllActivityHistory();
    }
  }, [qcRequests]);

  if (!user || (user.roleType !== 'qa' && user.roleType !== 'admin' && user.roleType !== 'executive')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          QC/QA 대시보드에 접근할 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        QC/QA 대시보드
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {stats.total_requests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전체 요청
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                {stats.pending_requests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                대기 중
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                {stats.in_progress_requests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                진행 중
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                {stats.completed_requests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                완료
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>
                {stats.rejected_requests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                반려
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {stats.avg_quality_score}점
              </Typography>
              <Typography variant="body2" color="text.secondary">
                평균 품질점수
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QC/QA 요청 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            품질 검증 요청 목록
          </Typography>
          
          {qcRequests.length === 0 ? (
            <Alert severity="info">
              현재 품질 검증 요청이 없습니다.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 150 }}>프로젝트명</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>요청자</TableCell>
                    <TableCell sx={{ minWidth: 80 }}>우선순위</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>상태</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>테스트 진행률</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>승인상태</TableCell>
                    <TableCell sx={{ minWidth: 80 }}>품질점수</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>요청일</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qcRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {request.project_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{request.pe_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            request.priority_level === 'high' ? '높음' :
                            request.priority_level === 'normal' ? '보통' : '낮음'
                          }
                          color={getPriorityColor(request.priority_level) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            request.request_status === 'pending' ? '대기중' :
                            request.request_status === 'in_progress' ? '진행중' :
                            request.request_status === 'completed' ? '완료' : '반려'
                          }
                          color={getStatusColor(request.request_status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={request.test_progress_percentage || 0}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" sx={{ minWidth: 35 }}>
                            {request.test_progress_percentage || 0}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            request.approval_status === 'pending' ? '대기중' :
                            request.approval_status === 'approved' ? '승인' : '반려'
                          }
                          color={getStatusColor(request.approval_status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {request.quality_score ? `${request.quality_score}점` : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {request.request_status === 'pending' && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleTestPlanClick(request)}
                          >
                            테스트 계획 작성
                          </Button>
                        )}
                        {request.request_status === 'in_progress' && (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleStartTestExecution(request)}
                              sx={{ mr: 1 }}
                            >
                              테스트 실행
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleOpenTestPlanEdit(request)}
                              sx={{
                                borderColor: '#9c27b0',
                                color: '#9c27b0',
                                '&:hover': {
                                  backgroundColor: '#f3e5f5',
                                  borderColor: '#7b1fa2'
                                },
                                mr: 1
                              }}
                            >
                              테스트 항목 재설정
                            </Button>
                          </>
                        )}
                        
                        {request.request_status === 'completed' && request.approval_status !== 'approved' && (
                          <Button
                            variant="contained"
                            size="small"
                            color="success"
                            onClick={() => handleOpenApprovalDialog(request)}
                            sx={{
                              backgroundColor: '#2e7d32',
                              '&:hover': {
                                backgroundColor: '#1b5e20'
                              }
                            }}
                          >
                            검증 승인
                          </Button>
                        )}
                        
                        {request.approval_status === 'approved' && (
                          <Chip 
                            label="승인 완료" 
                            color="success" 
                            size="small"
                            sx={{ 
                              backgroundColor: '#4caf50',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* QC/QA 활동 히스토리 섹션 */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* 테스트 실패 히스토리 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 테스트 실패 히스토리
              </Typography>
              {allFailureHistory.length > 0 ? (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {allFailureHistory.map((failure, index) => (
                    <Paper key={failure.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {failure.test_item_name}
                        </Typography>
                        <Chip 
                          label={failure.status_display} 
                          size="small"
                          color={
                            failure.status === 'resolved' ? 'success' :
                            failure.status === 'in_progress' ? 'warning' : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body2" color="primary" gutterBottom>
                        프로젝트: {failure.project_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        카테고리: {failure.test_category}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {failure.failure_reason?.length > 100 
                          ? `${failure.failure_reason.substring(0, 100)}...` 
                          : failure.failure_reason}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        보고일: {new Date(failure.failure_date).toLocaleString()}
                      </Typography>
                      {failure.feedback_title && (
                        <Typography variant="caption" display="block" color="primary">
                          연관 피드백: {failure.feedback_title}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">테스트 실패 히스토리가 없습니다.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 활동 로그 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 QC/QA 활동 로그
              </Typography>
              {allActivityLogs.length > 0 ? (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {allActivityLogs.map((log, index) => (
                    <Paper key={log.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Chip 
                          label={log.activity_type_display} 
                          size="small"
                          color={
                            log.activity_type === 'test_failure' ? 'error' :
                            log.activity_type === 'feedback_sent' ? 'warning' :
                            log.activity_type === 'pe_response' ? 'info' :
                            log.activity_type === 'issue_resolved' ? 'success' : 'default'
                          }
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="primary" gutterBottom>
                        프로젝트: {log.project_name}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        {log.activity_title}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {log.activity_description?.length > 100 
                          ? `${log.activity_description.substring(0, 100)}...` 
                          : log.activity_description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {log.performer_name && (
                          <Typography variant="caption" color="text.secondary">
                            수행자: {log.performer_name}
                          </Typography>
                        )}
                        {log.target_name && (
                          <Typography variant="caption" color="text.secondary">
                            대상: {log.target_name}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">활동 로그가 없습니다.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3단계 테스트 계획 작성 다이얼로그 */}
      <Dialog 
        open={testPlanDialog} 
        onClose={() => setTestPlanDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">
                {step3Data.finalChecklist && step3Data.finalChecklist.length > 0 
                  ? '테스트 계획 수정' 
                  : '테스트 계획 작성'} - 단계 {currentStep}/3
              </Typography>
              {selectedRequest && (
                <Typography variant="body2" color="text.secondary">
                  프로젝트: {selectedRequest.project_name}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[1, 2, 3].map((step) => (
                <Chip
                  key={step}
                  label={step}
                  color={step === currentStep ? 'primary' : step < currentStep ? 'success' : 'default'}
                  variant={step === currentStep ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* 단계별 안내 메시지 */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                {currentStep === 1 && (
                  <>
                    1단계: 프로젝트에 필요한 테스트 항목들을 선택해주세요.
                    <br />
                    <strong>📋 번호 설명:</strong> 각 테스트 항목은 1-42번의 고유 번호를 가지며, 선택된 항목들이 최종 테스트 체크리스트에 포함됩니다.
                  </>
                )}
                {currentStep === 2 && "2단계: 표준화된 테스트 셋을 선택하고 커스텀 테스트를 추가해주세요."}
                {currentStep === 3 && "3단계: 최종 체크리스트를 확인하고 테스트 계획을 완성해주세요."}
              </Typography>
            </Alert>

            {/* 1단계: 테스트 항목 선택 */}
            {currentStep === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>테스트 항목 선택</Typography>
                
                <Grid container spacing={3}>
                  {/* 기본 테스트 */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      기본 테스트 항목
                    </Typography>
                    <Grid container spacing={1}>
                      {basicTestOptions.map((option) => (
                        <Grid item xs={12} sm={6} md={4} key={option}>
                          <Paper
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: (step1Data.basicTests || []).includes(option) ? 2 : 1,
                              borderColor: (step1Data.basicTests || []).includes(option) ? 'primary.main' : 'divider',
                              backgroundColor: (step1Data.basicTests || []).includes(option) ? 'primary.50' : 'transparent',
                              '&:hover': { backgroundColor: 'grey.50' }
                            }}
                            onClick={() => {
                              const currentBasicTests = step1Data.basicTests || [];
                              const newBasicTests = currentBasicTests.includes(option)
                                ? currentBasicTests.filter(item => item !== option)
                                : [...currentBasicTests, option];
                              setStep1Data(prev => ({ ...prev, basicTests: newBasicTests }));
                            }}
                          >
                            <Typography variant="body2">{option}</Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>

                  {/* 성능 테스트 */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      성능 테스트 항목
                    </Typography>
                    <Grid container spacing={1}>
                      {performanceTestOptions.map((option) => (
                        <Grid item xs={12} sm={6} md={4} key={option}>
                          <Paper
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: (step1Data.performanceTests || []).includes(option) ? 2 : 1,
                              borderColor: (step1Data.performanceTests || []).includes(option) ? 'primary.main' : 'divider',
                              backgroundColor: (step1Data.performanceTests || []).includes(option) ? 'primary.50' : 'transparent',
                              '&:hover': { backgroundColor: 'grey.50' }
                            }}
                            onClick={() => {
                              const currentPerformanceTests = step1Data.performanceTests || [];
                              const newPerformanceTests = currentPerformanceTests.includes(option)
                                ? currentPerformanceTests.filter(item => item !== option)
                                : [...currentPerformanceTests, option];
                              setStep1Data(prev => ({ ...prev, performanceTests: newPerformanceTests }));
                            }}
                          >
                            <Typography variant="body2">{option}</Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>

              {/* 성능 테스트 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="성능 테스트 항목"
                  multiline
                  rows={3}
                  value={testPlanData.performanceTests}
                  onChange={(e) => setTestPlanData({
                    ...testPlanData,
                    performanceTests: e.target.value
                  })}
                  placeholder="응답시간, 처리량, 리소스 사용량 등..."
                />
              </Grid>

              {/* 보안 테스트 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="보안 테스트 항목"
                  multiline
                  rows={3}
                  value={testPlanData.securityTests}
                  onChange={(e) => setTestPlanData({
                    ...testPlanData,
                    securityTests: e.target.value
                  })}
                  placeholder="인증, 권한, 데이터 보안 등..."
                />
              </Grid>

              {/* 사용성 테스트 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="사용성 테스트 항목"
                  multiline
                  rows={3}
                  value={testPlanData.usabilityTests}
                  onChange={(e) => setTestPlanData({
                    ...testPlanData,
                    usabilityTests: e.target.value
                  })}
                  placeholder="UI/UX, 사용자 경험 등..."
                />
              </Grid>

              {/* 호환성 테스트 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="호환성 테스트 항목"
                  multiline
                  rows={3}
                  value={testPlanData.compatibilityTests}
                  onChange={(e) => setTestPlanData({
                    ...testPlanData,
                    compatibilityTests: e.target.value
                  })}
                  placeholder="브라우저, OS, 디바이스 호환성 등..."
                />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* 2단계: 테스트 셋 선택 */}
            {currentStep === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>테스트 셋 선택</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  표준화된 테스트 셋을 선택하고 커스텀 테스트를 추가해주세요.
                </Typography>
                
                <Grid container spacing={3}>
                  {/* 표준화된 테스트 셋 */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      표준화된 테스트 셋
                    </Typography>
                    <Grid container spacing={2}>
                      {standardizedTestSets.map((testSet) => (
                        <Grid item xs={12} md={6} key={testSet.id}>
                          <Paper
                            sx={{
                              p: 3,
                              cursor: 'pointer',
                              border: (step2Data.selectedTestSets || []).includes(testSet.name) ? 2 : 1,
                              borderColor: (step2Data.selectedTestSets || []).includes(testSet.name) ? 'primary.main' : 'divider',
                              backgroundColor: (step2Data.selectedTestSets || []).includes(testSet.name) ? 'primary.50' : 'transparent',
                              '&:hover': { backgroundColor: 'grey.50' }
                            }}
                            onClick={() => {
                              const currentSelectedSets = step2Data.selectedTestSets || [];
                              const newSelectedSets = currentSelectedSets.includes(testSet.name)
                                ? currentSelectedSets.filter(item => item !== testSet.name)
                                : [...currentSelectedSets, testSet.name];
                              setStep2Data(prev => ({ ...prev, selectedTestSets: newSelectedSets }));
                            }}
                          >
                            <Typography variant="h6" sx={{ mb: 1 }}>
                              {testSet.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {testSet.description}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              예상 시간: {testSet.estimatedHours}시간
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>

                  {/* 커스텀 테스트 추가 */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      추가 커스텀 테스트
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={step2Data.customTests}
                      onChange={(e) => setStep2Data(prev => ({ ...prev, customTests: e.target.value }))}
                      placeholder="프로젝트 특성에 맞는 추가 테스트 항목을 입력하세요..."
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* 3단계: 최종 체크리스트 */}
            {currentStep === 3 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 3 }}>최종 체크리스트</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  선택된 테스트 항목들을 확인하고 최종 계획을 완성해주세요.
                </Typography>
                
                {/* 체크리스트 테이블 */}
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>카테고리</TableCell>
                        <TableCell>테스트 항목</TableCell>
                        <TableCell>설명</TableCell>
                        <TableCell>필수</TableCell>
                        <TableCell>예상 시간</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {step3Data.finalChecklist.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.item}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Chip 
                              label={item.required ? '필수' : '선택'} 
                              color={item.required ? 'error' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{item.estimatedTime}시간</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* 총 예상 시간 */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    총 예상 테스트 시간: {step3Data.totalEstimatedHours}시간
                  </Typography>
                </Alert>

                {/* 테스트 환경 및 도구 설정 */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="테스트 환경"
                      value={step3Data.testEnvironment}
                      onChange={(e) => setStep3Data(prev => ({ ...prev, testEnvironment: e.target.value }))}
                      placeholder="개발/스테이징/프로덕션"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="사용할 테스트 도구"
                      value={step3Data.testTools}
                      onChange={(e) => setStep3Data(prev => ({ ...prev, testTools: e.target.value }))}
                      placeholder="Jest, Selenium, Postman 등"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestPlanDialog(false)}>
            취소
          </Button>
          
          {/* 이전 단계 버튼 */}
          {currentStep > 1 && (
            <Button onClick={handlePrevStep}>
              이전
            </Button>
          )}
          
          {/* 다음 단계 또는 완료 버튼 */}
          {currentStep < 3 ? (
            <Button
              variant="contained"
              onClick={handleNextStep}
              disabled={
                (currentStep === 1 && (step1Data.basicTests || []).length === 0) ||
                (currentStep === 2 && (step2Data.selectedTestSets || []).length === 0)
              }
            >
              다음
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleTestPlanSubmit}
              disabled={submittingTestPlan || step3Data.finalChecklist.length === 0}
            >
              {submittingTestPlan ? '등록 중...' : '테스트 계획 등록'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 테스트 실행 다이얼로그 */}
      <Dialog 
        open={testExecutionDialog} 
        onClose={() => setTestExecutionDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              테스트 실행 - {selectedTestRequest?.project_name}
              {testCategories.length > 0 && (
                <Typography variant="subtitle2" color="text.secondary">
                  {testCategories[currentTestStep]?.name} ({currentTestStep + 1}/{testCategories.length})
                </Typography>
              )}
            </Box>
            <Chip 
              label="자동 저장됨" 
              size="small" 
              color="success" 
              sx={{ 
                backgroundColor: '#4caf50',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* 단계 표시 */}
          {testCategories.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {testCategories.map((category, index) => (
                  <Chip
                    key={index}
                    label={category.name}
                    color={index === currentTestStep ? 'primary' : 'default'}
                    variant={index === currentTestStep ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* 진행률 표시 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              전체 테스트 진행률: {testProgress}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={testProgress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* 테스트 항목 체크리스트 - 2열 레이아웃 */}
          <Grid container spacing={2}>
            {currentCategoryItems.map((item, index) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    height: '100%',
                    border: item.status === 'passed' ? '2px solid #4caf50' : 
                           item.status === 'failed' ? '2px solid #f44336' : '1px solid #e0e0e0'
                  }}
                >
                  <Box sx={{ mb: 1 }}>
                    <Chip 
                      label={item.category} 
                      size="small" 
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                    <Chip 
                      label={
                        item.status === 'pending' ? '대기중' :
                        item.status === 'passed' ? '통과' : '실패'
                      }
                      color={
                        item.status === 'pending' ? 'default' :
                        item.status === 'passed' ? 'success' : 'error'
                      }
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    {item.item}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {item.description}
                  </Typography>
                  
                  <TextField
                    size="small"
                    multiline
                    rows={2}
                    fullWidth
                    value={item.notes}
                    onChange={(e) => {
                      const updatedData = testExecutionData.map(testItem => 
                        testItem.id === item.id 
                          ? { ...testItem, notes: e.target.value }
                          : testItem
                      );
                      setTestExecutionData(updatedData);
                      
                      // 현재 카테고리 항목들도 업데이트
                      setCurrentCategoryItems(prevItems => 
                        prevItems.map(prevItem => 
                          prevItem.id === item.id 
                            ? { ...prevItem, notes: e.target.value }
                            : prevItem
                        )
                      );
                    }}
                    placeholder="테스트 메모..."
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant={item.status === 'passed' ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => {
                        const newStatus = item.status === 'passed' ? 'pending' : 'passed';
                        handleTestItemUpdate(item.id, newStatus, item.notes);
                      }}
                    >
                      {item.status === 'passed' ? '✓ 통과됨' : '통과'}
                    </Button>
                    <Button
                      size="small"
                      variant={item.status === 'failed' ? 'contained' : 'outlined'}
                      color="error"
                      onClick={() => {
                        const newStatus = item.status === 'failed' ? 'pending' : 'failed';
                        handleTestItemUpdate(item.id, newStatus, item.notes);
                      }}
                    >
                      {item.status === 'failed' ? '✗ 실패됨' : '실패'}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestExecutionDialog(false)}>
            취소
          </Button>
          
          <Button
            variant="outlined"
            onClick={async () => {
              if (selectedTestRequest) {
                const progressData = testExecutionData.reduce((acc: any, item: any) => {
                  acc[item.id] = {
                    status: item.status,
                    notes: item.notes || '',
                    execution_time: item.execution_time
                  };
                  return acc;
                }, {});
                
                const currentCategory = testCategories[currentTestStep]?.name || '';
                await saveTestProgress(selectedTestRequest.id, progressData, currentCategory, currentTestStep);
                alert('테스트 진행 상황이 수동으로 저장되었습니다.');
              }
            }}
          >
            수동 저장
          </Button>
          
          <Button
            variant="outlined"
            color="warning"
            onClick={() => handleOpenGeneralIssueReport()}
            sx={{ ml: 1 }}
          >
            기타 이슈 레포트 작성
          </Button>
          
          <Box sx={{ flex: 1 }} />
          
          {/* 단계별 네비게이션 */}
          {testCategories.length > 1 && (
            <>
              <Button
                onClick={handlePrevTestCategory}
                disabled={currentTestStep === 0}
              >
                이전 카테고리
              </Button>
              <Button
                onClick={handleNextTestCategory}
                disabled={currentTestStep === testCategories.length - 1}
                variant="outlined"
              >
                다음 카테고리
              </Button>
            </>
          )}
          
          <Button
            variant="contained"
            onClick={handleCompleteTestExecution}
            disabled={executingTests || testExecutionData.length === 0}
          >
            {executingTests ? '저장 중...' : '테스트 완료'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 이슈 피드백 작성 다이얼로그 */}
      <Dialog 
        open={feedbackDialog} 
        onClose={() => setFeedbackDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          이슈 피드백 작성
          {selectedFeedbackRequest && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              프로젝트: {selectedFeedbackRequest.project_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                테스트 중 발견된 버그나 개선사항을 PE에게 전달합니다.
                상세한 정보를 제공하여 빠른 해결을 도와주세요.
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              {/* 피드백 유형 */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>피드백 유형</InputLabel>
                  <Select
                    value={feedbackData.feedback_type || 'bug'}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      feedback_type: e.target.value
                    })}
                  >
                    <MenuItem value="bug">버그</MenuItem>
                    <MenuItem value="improvement">개선사항</MenuItem>
                    <MenuItem value="enhancement">기능 개선</MenuItem>
                    <MenuItem value="documentation">문서화</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 심각도 */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>심각도</InputLabel>
                  <Select
                    value={feedbackData.severity_level || 'medium'}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      severity_level: e.target.value
                    })}
                  >
                    <MenuItem value="critical">Critical - 시스템 중단</MenuItem>
                    <MenuItem value="high">High - 주요 기능 영향</MenuItem>
                    <MenuItem value="medium">Medium - 일반적 문제</MenuItem>
                    <MenuItem value="low">Low - 경미한 문제</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 우선순위 */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>우선순위</InputLabel>
                  <Select
                    value={feedbackData.priority_level || 'normal'}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      priority_level: e.target.value
                    })}
                  >
                    <MenuItem value="urgent">긴급</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="normal">보통</MenuItem>
                    <MenuItem value="low">낮음</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 할당할 PE 선택 */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>할당할 PE</InputLabel>
                  <Select
                    value={feedbackData.assigned_to_pe || ''}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      assigned_to_pe: e.target.value
                    })}
                  >
                    {originalPE && (
                      <MenuItem value={originalPE.id}>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {originalPE.full_name} (원 개발자)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{originalPE.username}
                          </Typography>
                        </Box>
                      </MenuItem>
                    )}
                    <Divider />
                    {availablePEs.filter(pe => pe.id !== originalPE?.id).map((pe) => (
                      <MenuItem key={pe.id} value={pe.id}>
                        <Box>
                          <Typography variant="body1">
                            {pe.full_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{pe.username} | 활성 작업: {pe.active_assignments}개 | 대기 피드백: {pe.pending_feedbacks}개
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 제목 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="이슈 제목"
                  value={feedbackData.title}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    title: e.target.value
                  })}
                  placeholder="간단하고 명확한 이슈 제목을 입력하세요"
                />
              </Grid>

              {/* 설명 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="상세 설명"
                  multiline
                  rows={4}
                  value={feedbackData.description}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    description: e.target.value
                  })}
                  placeholder="발견된 문제나 개선사항에 대한 상세한 설명을 입력하세요"
                />
              </Grid>

              {/* 재현 단계 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="재현 단계"
                  multiline
                  rows={3}
                  value={feedbackData.steps_to_reproduce}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    steps_to_reproduce: e.target.value
                  })}
                  placeholder="문제를 재현하는 단계를 순서대로 입력하세요"
                />
              </Grid>

              {/* 예상 결과 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="예상 결과"
                  multiline
                  rows={3}
                  value={feedbackData.expected_behavior}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    expected_behavior: e.target.value
                  })}
                  placeholder="예상했던 정상적인 동작을 설명하세요"
                />
              </Grid>

              {/* 실제 결과 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="실제 결과"
                  multiline
                  rows={3}
                  value={feedbackData.actual_behavior}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    actual_behavior: e.target.value
                  })}
                  placeholder="실제로 발생한 문제나 동작을 설명하세요"
                />
              </Grid>

              {/* 테스트 환경 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="테스트 환경"
                  multiline
                  rows={3}
                  value={feedbackData.test_environment}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    test_environment: e.target.value
                  })}
                  placeholder="테스트 환경 정보 (서버, 데이터베이스 등)"
                />
              </Grid>

              {/* 브라우저/OS 정보 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="브라우저/OS 정보"
                  value={feedbackData.browser_os_info}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    browser_os_info: e.target.value
                  })}
                  placeholder="Chrome 120.0, Windows 11, macOS 14.0 등"
                />
              </Grid>

              {/* QC 노트 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="QC 내부 노트"
                  multiline
                  rows={2}
                  value={feedbackData.qc_notes}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    qc_notes: e.target.value
                  })}
                  placeholder="QC/QA 팀 내부 메모 (PE에게 전달되지 않음)"
                />
              </Grid>

              {/* 파일 첨부 */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    스크린샷 및 첨부파일
                  </Typography>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setFeedbackData({
                        ...feedbackData,
                        attachment_files: [...feedbackData.attachment_files, ...files]
                      });
                    }}
                    style={{ display: 'none' }}
                    id="feedback-file-upload"
                  />
                  <label htmlFor="feedback-file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<span>📎</span>}
                      sx={{ mb: 1 }}
                    >
                      파일 첨부
                    </Button>
                  </label>
                  
                  {feedbackData.attachment_files.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {feedbackData.attachment_files.map((file, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => {
                              const newFiles = feedbackData.attachment_files.filter((_, i) => i !== index);
                              setFeedbackData({
                                ...feedbackData,
                                attachment_files: newFiles
                              });
                            }}
                          >
                            삭제
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitFeedback}
            disabled={submittingFeedback || !feedbackData.title.trim() || !feedbackData.description.trim() || !feedbackData.assigned_to_pe}
            sx={{
              backgroundColor: '#ff9800',
              '&:hover': {
                backgroundColor: '#f57c00'
              }
            }}
          >
            {submittingFeedback ? '전송 중...' : '피드백 전송'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 실패 항목 이슈 레포트 다이얼로그 */}
      <Dialog 
        open={failedItemIssueDialog} 
        onClose={() => setFailedItemIssueDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          테스트 실패 이슈 레포트 작성
          {selectedFailedItem && (
            <Typography variant="subtitle2" color="text.secondary">
              실패 항목: {selectedFailedItem.item}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              {/* 피드백 유형 */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>피드백 유형</InputLabel>
                  <Select
                    value={feedbackData.feedback_type || 'bug'}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      feedback_type: e.target.value
                    })}
                  >
                    <MenuItem value="bug">버그</MenuItem>
                    <MenuItem value="improvement">개선사항</MenuItem>
                    <MenuItem value="feature">기능 요청</MenuItem>
                    <MenuItem value="performance">성능 이슈</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 심각도 */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>심각도</InputLabel>
                  <Select
                    value={feedbackData.severity_level || 'medium'}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      severity_level: e.target.value
                    })}
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">심각</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 우선순위 */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>우선순위</InputLabel>
                  <Select
                    value={feedbackData.priority_level || 'normal'}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      priority_level: e.target.value
                    })}
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="normal">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="urgent">긴급</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 할당할 PE */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>할당할 PE</InputLabel>
                  <Select
                    value={feedbackData.assigned_to_pe || ''}
                    onChange={(e) => setFeedbackData({
                      ...feedbackData,
                      assigned_to_pe: e.target.value
                    })}
                  >
                    {availablePEs.map((pe) => (
                      <MenuItem key={pe.id} value={pe.id}>
                        {pe.full_name} ({pe.username})
                        {originalPE && pe.id === originalPE.id && ' - 원래 개발자'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 이슈 제목 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="이슈 제목"
                  value={feedbackData.title}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    title: e.target.value
                  })}
                  required
                />
              </Grid>

              {/* 상세 설명 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="상세 설명"
                  multiline
                  rows={4}
                  value={feedbackData.description}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    description: e.target.value
                  })}
                  required
                />
              </Grid>

              {/* 재현 단계 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="재현 단계"
                  multiline
                  rows={3}
                  value={feedbackData.steps_to_reproduce}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    steps_to_reproduce: e.target.value
                  })}
                />
              </Grid>

              {/* 실제 결과 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="실제 결과"
                  multiline
                  rows={3}
                  value={feedbackData.actual_behavior}
                  onChange={(e) => setFeedbackData({
                    ...feedbackData,
                    actual_behavior: e.target.value
                  })}
                />
              </Grid>

              {/* 파일 첨부 */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    스크린샷 및 첨부파일
                  </Typography>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setFeedbackData({
                        ...feedbackData,
                        attachment_files: [...feedbackData.attachment_files, ...files]
                      });
                    }}
                    style={{ display: 'none' }}
                    id="failed-item-file-upload"
                  />
                  <label htmlFor="failed-item-file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<span>📎</span>}
                      sx={{ mb: 1 }}
                    >
                      파일 첨부
                    </Button>
                  </label>
                  
                  {feedbackData.attachment_files.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {feedbackData.attachment_files.map((file, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => {
                              const newFiles = feedbackData.attachment_files.filter((_, i) => i !== index);
                              setFeedbackData({
                                ...feedbackData,
                                attachment_files: newFiles
                              });
                            }}
                          >
                            삭제
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFailedItemIssueDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              // 테스트 실패 관련 정보를 추가하여 피드백 제출
              const testFailureData = {
                ...feedbackData,
                test_item_id: selectedFailedItem?.id?.toString(),
                test_item_name: selectedFailedItem?.item,
                test_category: selectedFailedItem?.category,
                is_test_failure: true
              };
              
              await handleSubmitFeedback(testFailureData);
              setFailedItemIssueDialog(false);
            }}
            disabled={submittingFeedback || !feedbackData.title.trim() || !feedbackData.description.trim()}
            color="error"
          >
            {submittingFeedback ? '전송 중...' : '이슈 레포트 전송'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 활동 히스토리 다이얼로그 */}
      <Dialog 
        open={historyDialog} 
        onClose={() => setHistoryDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          QC/QA 활동 히스토리 및 검증 보고서
          {selectedRequestForHistory && (
            <Typography variant="subtitle2" color="text.secondary">
              프로젝트: {selectedRequestForHistory.project_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* 테스트 실패 히스토리 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  테스트 실패 히스토리
                </Typography>
                {failureHistory.length > 0 ? (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {failureHistory.map((failure, index) => (
                      <Paper key={failure.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {failure.test_item_name}
                          </Typography>
                          <Chip 
                            label={failure.status_display} 
                            size="small"
                            color={
                              failure.status === 'resolved' ? 'success' :
                              failure.status === 'in_progress' ? 'warning' : 'default'
                            }
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          카테고리: {failure.test_category}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {failure.failure_reason}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          보고일: {new Date(failure.failure_date).toLocaleString()}
                        </Typography>
                        {failure.feedback_title && (
                          <Typography variant="caption" display="block" color="primary">
                            연관 피드백: {failure.feedback_title}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">테스트 실패 히스토리가 없습니다.</Alert>
                )}
              </Grid>

              {/* 활동 로그 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  최근 활동 로그
                </Typography>
                {activityLogs.length > 0 ? (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {activityLogs.map((log, index) => (
                      <Paper key={log.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Chip 
                            label={log.activity_type_display} 
                            size="small"
                            color={
                              log.activity_type === 'test_failure' ? 'error' :
                              log.activity_type === 'feedback_sent' ? 'warning' :
                              log.activity_type === 'pe_response' ? 'info' :
                              log.activity_type === 'issue_resolved' ? 'success' : 'default'
                            }
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          {log.activity_title}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {log.activity_description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {log.performer_name && (
                            <Typography variant="caption" color="text.secondary">
                              수행자: {log.performer_name}
                            </Typography>
                          )}
                          {log.target_name && (
                            <Typography variant="caption" color="text.secondary">
                              대상: {log.target_name}
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">활동 로그가 없습니다.</Alert>
                )}
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 검증 완료 보고서 다이얼로그 */}
      <Dialog 
        open={verificationReportDialog} 
        onClose={() => setVerificationReportDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          검증 완료 보고서 작성
          {selectedRequestForApproval && (
            <Typography variant="subtitle2" color="text.secondary">
              프로젝트: {selectedRequestForApproval.project_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* 프로젝트 요약 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  프로젝트 요약
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {verificationReportData.projectSummary}
                  </Typography>
                </Paper>
              </Grid>

              {/* 테스트 실행 결과 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  테스트 실행 결과
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="테스트 실행 요약"
                      value={verificationReportData.testExecutionSummary}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        testExecutionSummary: e.target.value
                      }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="총 테스트 케이스"
                        type="number"
                        value={verificationReportData.totalTestCases}
                        onChange={(e) => setVerificationReportData(prev => ({
                          ...prev,
                          totalTestCases: parseInt(e.target.value) || 0
                        }))}
                      />
                      <TextField
                        label="통과한 테스트"
                        type="number"
                        value={verificationReportData.passedTestCases}
                        onChange={(e) => setVerificationReportData(prev => ({
                          ...prev,
                          passedTestCases: parseInt(e.target.value) || 0
                        }))}
                      />
                      <TextField
                        label="실패한 테스트"
                        type="number"
                        value={verificationReportData.failedTestCases}
                        onChange={(e) => setVerificationReportData(prev => ({
                          ...prev,
                          failedTestCases: parseInt(e.target.value) || 0
                        }))}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* 품질 평가 점수 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  품질 평가 점수
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="전체 품질 점수"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={verificationReportData.qualityScore}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        qualityScore: parseInt(e.target.value) || 0
                      }))}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="기능성"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={verificationReportData.functionalityScore}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        functionalityScore: parseInt(e.target.value) || 0
                      }))}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="신뢰성"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={verificationReportData.reliabilityScore}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        reliabilityScore: parseInt(e.target.value) || 0
                      }))}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="사용성"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={verificationReportData.usabilityScore}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        usabilityScore: parseInt(e.target.value) || 0
                      }))}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="성능"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={verificationReportData.performanceScore}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        performanceScore: parseInt(e.target.value) || 0
                      }))}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="보안"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={verificationReportData.securityScore}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        securityScore: parseInt(e.target.value) || 0
                      }))}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* 권장사항 및 개선점 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  권장사항 및 개선점
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="권장사항"
                      value={verificationReportData.recommendations}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        recommendations: e.target.value
                      }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="개선 제안사항"
                      value={verificationReportData.improvementSuggestions}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        improvementSuggestions: e.target.value
                      }))}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* 배포 승인 여부 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  배포 승인 여부
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>배포 권장사항</InputLabel>
                      <Select
                        value={verificationReportData.deploymentRecommendation}
                        onChange={(e) => setVerificationReportData(prev => ({
                          ...prev,
                          deploymentRecommendation: e.target.value
                        }))}
                        label="배포 권장사항"
                      >
                        <MenuItem value="approved">승인</MenuItem>
                        <MenuItem value="conditional">조건부 승인</MenuItem>
                        <MenuItem value="rejected">보류</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="배포 조건 (조건부 승인 시)"
                      value={verificationReportData.deploymentConditions}
                      onChange={(e) => setVerificationReportData(prev => ({
                        ...prev,
                        deploymentConditions: e.target.value
                      }))}
                      disabled={verificationReportData.deploymentRecommendation !== 'conditional'}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* 추가 노트 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="추가 노트"
                  value={verificationReportData.additionalNotes}
                  onChange={(e) => setVerificationReportData(prev => ({
                    ...prev,
                    additionalNotes: e.target.value
                  }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationReportDialog(false)}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitVerificationReport}
            disabled={submittingApproval || !verificationReportData.testExecutionSummary.trim() || !verificationReportData.recommendations.trim()}
            sx={{
              backgroundColor: '#2e7d32',
              '&:hover': {
                backgroundColor: '#1b5e20'
              },
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {submittingApproval ? '제출 중...' : '검증 완료 보고서 제출'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default QCDashboard;
