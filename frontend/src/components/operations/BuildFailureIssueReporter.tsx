// [advice from AI] 젠킨스 빌드 실패 자동 이슈 레포트 생성 시스템
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Grid, Alert, Chip, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemText, Divider, IconButton, Tooltip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon,
  BugReport as BugReportIcon, Assignment as AssignmentIcon,
  Send as SendIcon, Refresh as RefreshIcon, Visibility as VisibilityIcon,
  Screenshot as ScreenshotIcon, Code as CodeIcon, Person as PersonIcon,
  Schedule as ScheduleIcon, CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] 타입 정의
interface BuildFailure {
  id: string;
  jobName: string;
  buildNumber: number;
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  failedAt: string;
  duration: number;
  errorType: 'compilation' | 'test' | 'dependency' | 'deployment' | 'timeout' | 'unknown';
  errorStage: string;
  errorMessage: string;
  stackTrace: string;
  logUrl: string;
  screenshotUrl?: string;
  projectId?: string;
  assignedPE?: string;
}

interface IssueReport {
  id: string;
  buildFailureId: string;
  title: string;
  description: string;
  errorCategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  reproductionSteps: string[];
  suggestedSolution: string;
  attachments: Array<{
    type: 'screenshot' | 'log' | 'code';
    url: string;
    description: string;
  }>;
}

interface PEAssignment {
  peId: string;
  peName: string;
  email: string;
  projectIds: string[];
  skillTags: string[];
  currentWorkload: number;
}

const BuildFailureIssueReporter: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  // [advice from AI] 상태 관리
  const [buildFailures, setBuildFailures] = useState<BuildFailure[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [peAssignments, setPEAssignments] = useState<PEAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  
  // [advice from AI] 이슈 생성 다이얼로그 상태
  const [createIssueDialog, setCreateIssueDialog] = useState(false);
  const [selectedFailure, setSelectedFailure] = useState<BuildFailure | null>(null);
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    errorCategory: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assignedTo: '',
    reproductionSteps: [''],
    suggestedSolution: ''
  });

  // [advice from AI] 빌드 실패 목록 가져오기
  const fetchBuildFailures = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/build-issues/build-failures', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBuildFailures(data.failures);
        }
      }
    } catch (error) {
      console.error('빌드 실패 목록 가져오기 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // [advice from AI] 이슈 레포트 목록 가져오기
  const fetchIssueReports = useCallback(async () => {
    try {
      const response = await fetch('/api/build-issues/issue-reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIssueReports(data.reports);
        }
      }
    } catch (error) {
      console.error('이슈 레포트 목록 가져오기 실패:', error);
    }
  }, [token]);

  // [advice from AI] PE 할당 정보 가져오기
  const fetchPEAssignments = useCallback(async () => {
    try {
      const response = await fetch('/api/build-issues/pe-assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPEAssignments(data.assignments);
        }
      }
    } catch (error) {
      console.error('PE 할당 정보 가져오기 실패:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchBuildFailures();
    fetchIssueReports();
    fetchPEAssignments();
  }, [fetchBuildFailures, fetchIssueReports, fetchPEAssignments]);

  // [advice from AI] 자동 이슈 생성
  const createAutomaticIssue = useCallback(async (failure: BuildFailure) => {
    try {
      setLoading(true);
      
      // [advice from AI] 오류 분석 및 자동 분류
      const errorAnalysis = analyzeError(failure);
      
      // [advice from AI] 적절한 PE 자동 할당
      const assignedPE = findBestPE(failure, peAssignments);
      
      const issueData = {
        buildFailureId: failure.id,
        title: `[빌드 실패] ${failure.jobName} #${failure.buildNumber} - ${errorAnalysis.category}`,
        description: generateIssueDescription(failure, errorAnalysis),
        errorCategory: errorAnalysis.category,
        severity: errorAnalysis.severity,
        assignedTo: assignedPE?.peId || '',
        reproductionSteps: errorAnalysis.reproductionSteps,
        suggestedSolution: errorAnalysis.suggestedSolution,
        attachments: [
          {
            type: 'log' as const,
            url: failure.logUrl,
            description: '빌드 로그'
          },
          ...(failure.screenshotUrl ? [{
            type: 'screenshot' as const,
            url: failure.screenshotUrl,
            description: '오류 스크린샷'
          }] : [])
        ]
      };

      const response = await fetch('/api/build-issues/issue-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // [advice from AI] PE에게 알림 전송
          await sendPENotification(assignedPE, data.report, failure);
          
          // [advice from AI] 목록 새로고침
          fetchIssueReports();
          
          alert('이슈 레포트가 자동으로 생성되고 담당 PE에게 알림이 전송되었습니다.');
        }
      }
    } catch (error) {
      console.error('자동 이슈 생성 실패:', error);
      alert('자동 이슈 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token, peAssignments, fetchIssueReports]);

  // [advice from AI] 오류 분석 함수
  const analyzeError = (failure: BuildFailure) => {
    const { errorMessage, stackTrace, errorStage } = failure;
    
    let category = 'unknown';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let reproductionSteps: string[] = [];
    let suggestedSolution = '';

    // [advice from AI] 오류 패턴 분석
    if (errorMessage.includes('compilation') || errorMessage.includes('compile')) {
      category = 'compilation';
      severity = 'high';
      reproductionSteps = [
        '1. 해당 브랜치를 로컬에 체크아웃',
        '2. 동일한 환경에서 빌드 실행',
        '3. 컴파일 오류 확인'
      ];
      suggestedSolution = '컴파일 오류를 수정하고 코드 문법을 확인하세요.';
    } else if (errorMessage.includes('test') || errorStage.includes('test')) {
      category = 'test';
      severity = 'medium';
      reproductionSteps = [
        '1. 테스트 환경 설정 확인',
        '2. 실패한 테스트 케이스 개별 실행',
        '3. 테스트 데이터 및 모킹 확인'
      ];
      suggestedSolution = '실패한 테스트 케이스를 분석하고 수정하세요.';
    } else if (errorMessage.includes('dependency') || errorMessage.includes('package')) {
      category = 'dependency';
      severity = 'medium';
      reproductionSteps = [
        '1. package.json 또는 requirements.txt 확인',
        '2. 의존성 버전 충돌 검사',
        '3. 캐시 클리어 후 재설치'
      ];
      suggestedSolution = '의존성 버전을 확인하고 충돌을 해결하세요.';
    } else if (errorMessage.includes('timeout')) {
      category = 'timeout';
      severity = 'low';
      reproductionSteps = [
        '1. 빌드 시간 확인',
        '2. 리소스 사용량 모니터링',
        '3. 타임아웃 설정 검토'
      ];
      suggestedSolution = '빌드 시간을 최적화하거나 타임아웃 설정을 조정하세요.';
    } else if (errorStage.includes('deploy')) {
      category = 'deployment';
      severity = 'critical';
      reproductionSteps = [
        '1. 배포 환경 상태 확인',
        '2. 네트워크 연결 및 권한 검사',
        '3. 배포 스크립트 검증'
      ];
      suggestedSolution = '배포 환경과 설정을 점검하세요.';
    }

    return { category, severity, reproductionSteps, suggestedSolution };
  };

  // [advice from AI] 최적 PE 찾기
  const findBestPE = (failure: BuildFailure, assignments: PEAssignment[]) => {
    // [advice from AI] 프로젝트 기반 할당 우선
    if (failure.projectId) {
      const projectPE = assignments.find(pe => 
        pe.projectIds.includes(failure.projectId!)
      );
      if (projectPE) return projectPE;
    }

    // [advice from AI] 워크로드가 가장 적은 PE 할당
    return assignments.reduce((best, current) => 
      current.currentWorkload < best.currentWorkload ? current : best
    );
  };

  // [advice from AI] 이슈 설명 자동 생성
  const generateIssueDescription = (failure: BuildFailure, analysis: any) => {
    return `
## 빌드 실패 정보
- **Job**: ${failure.jobName}
- **Build Number**: #${failure.buildNumber}
- **Repository**: ${failure.repositoryUrl}
- **Branch**: ${failure.branch}
- **Commit**: ${failure.commitSha.substring(0, 7)} - ${failure.commitMessage}
- **실패 시간**: ${new Date(failure.failedAt).toLocaleString()}
- **소요 시간**: ${Math.round(failure.duration / 1000)}초

## 오류 정보
- **단계**: ${failure.errorStage}
- **유형**: ${analysis.category}
- **심각도**: ${analysis.severity}

## 오류 메시지
\`\`\`
${failure.errorMessage}
\`\`\`

## 스택 트레이스
\`\`\`
${failure.stackTrace}
\`\`\`

## 제안된 해결 방법
${analysis.suggestedSolution}

---
*이 이슈는 빌드 실패 시 자동으로 생성되었습니다.*
    `.trim();
  };

  // [advice from AI] PE 알림 전송
  const sendPENotification = async (pe: PEAssignment | undefined, report: IssueReport, failure: BuildFailure) => {
    if (!pe) return;

    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: pe.peId,
          title: `[긴급] 빌드 실패 이슈 할당`,
          message: `${failure.jobName} #${failure.buildNumber} 빌드가 실패했습니다. 확인 및 수정이 필요합니다.`,
          type: 'build_failure',
          priority: 'high',
          relatedUrl: `/operations/issues/${report.id}`
        })
      });
    } catch (error) {
      console.error('PE 알림 전송 실패:', error);
    }
  };

  // [advice from AI] 수동 이슈 생성
  const handleCreateManualIssue = async () => {
    if (!selectedFailure) return;

    try {
      setLoading(true);
      
      const issueData = {
        buildFailureId: selectedFailure.id,
        ...issueForm,
        reproductionSteps: issueForm.reproductionSteps.filter(step => step.trim() !== ''),
        attachments: [
          {
            type: 'log' as const,
            url: selectedFailure.logUrl,
            description: '빌드 로그'
          }
        ]
      };

      const response = await fetch('/api/build-issues/issue-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCreateIssueDialog(false);
          fetchIssueReports();
          
          // [advice from AI] 할당된 PE에게 알림
          const assignedPE = peAssignments.find(pe => pe.peId === issueForm.assignedTo);
          if (assignedPE) {
            await sendPENotification(assignedPE, data.report, selectedFailure);
          }
          
          alert('이슈 레포트가 생성되었습니다.');
        }
      }
    } catch (error) {
      console.error('수동 이슈 생성 실패:', error);
      alert('이슈 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 심각도별 색상
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          빌드 실패 이슈 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          젠킨스 빌드 실패 시 자동 이슈 레포트 생성 및 PE 할당
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* [advice from AI] 최근 빌드 실패 목록 */}
        <Grid item xs={12} lg={8}>
          <BackstageCard title="최근 빌드 실패" variant="default">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">빌드 실패 목록</Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchBuildFailures}
                disabled={loading}
              >
                새로고침
              </Button>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job</TableCell>
                    <TableCell>Build #</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>오류 유형</TableCell>
                    <TableCell>실패 시간</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buildFailures.map((failure) => (
                    <TableRow key={failure.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {failure.jobName}
                        </Typography>
                      </TableCell>
                      <TableCell>#{failure.buildNumber}</TableCell>
                      <TableCell>{failure.branch}</TableCell>
                      <TableCell>
                        <Chip 
                          label={failure.errorType}
                          color={failure.errorType === 'compilation' ? 'error' : 
                                failure.errorType === 'test' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(failure.failedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="자동 이슈 생성">
                          <IconButton 
                            size="small"
                            onClick={() => createAutomaticIssue(failure)}
                            disabled={loading}
                          >
                            <BugReportIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수동 이슈 생성">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedFailure(failure);
                              setIssueForm({
                                title: `[빌드 실패] ${failure.jobName} #${failure.buildNumber}`,
                                description: '',
                                errorCategory: failure.errorType,
                                severity: 'medium',
                                assignedTo: '',
                                reproductionSteps: [''],
                                suggestedSolution: ''
                              });
                              setCreateIssueDialog(true);
                            }}
                          >
                            <AssignmentIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="로그 보기">
                          <IconButton 
                            size="small"
                            href={failure.logUrl}
                            target="_blank"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 이슈 레포트 현황 */}
        <Grid item xs={12} lg={4}>
          <BackstageCard title="이슈 레포트 현황" variant="default">
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {issueReports.filter(r => r.status === 'open').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      미해결
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      {issueReports.filter(r => r.status === 'in_progress').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      진행 중
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>최근 이슈</Typography>
            <List>
              {issueReports.slice(0, 5).map((report) => (
                <ListItem key={report.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap>
                          {report.title}
                        </Typography>
                        <Chip 
                          label={report.status}
                          color={getStatusColor(report.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Chip 
                          label={report.severity}
                          color={getSeverityColor(report.severity)}
                          size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* [advice from AI] 수동 이슈 생성 다이얼로그 */}
      <Dialog open={createIssueDialog} onClose={() => setCreateIssueDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>이슈 레포트 생성</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="제목"
                value={issueForm.title}
                onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>오류 카테고리</InputLabel>
                <Select
                  value={issueForm.errorCategory}
                  label="오류 카테고리"
                  onChange={(e) => setIssueForm(prev => ({ ...prev, errorCategory: e.target.value }))}
                >
                  <MenuItem value="compilation">컴파일 오류</MenuItem>
                  <MenuItem value="test">테스트 실패</MenuItem>
                  <MenuItem value="dependency">의존성 문제</MenuItem>
                  <MenuItem value="deployment">배포 오류</MenuItem>
                  <MenuItem value="timeout">타임아웃</MenuItem>
                  <MenuItem value="unknown">기타</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>심각도</InputLabel>
                <Select
                  value={issueForm.severity}
                  label="심각도"
                  onChange={(e) => setIssueForm(prev => ({ ...prev, severity: e.target.value as any }))}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="critical">긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>담당 PE</InputLabel>
                <Select
                  value={issueForm.assignedTo}
                  label="담당 PE"
                  onChange={(e) => setIssueForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                >
                  {peAssignments.map((pe) => (
                    <MenuItem key={pe.peId} value={pe.peId}>
                      {pe.peName} (워크로드: {pe.currentWorkload})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="상세 설명"
                value={issueForm.description}
                onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>재현 단계</Typography>
              {issueForm.reproductionSteps.map((step, index) => (
                <TextField
                  key={index}
                  fullWidth
                  label={`단계 ${index + 1}`}
                  value={step}
                  onChange={(e) => {
                    const newSteps = [...issueForm.reproductionSteps];
                    newSteps[index] = e.target.value;
                    setIssueForm(prev => ({ ...prev, reproductionSteps: newSteps }));
                  }}
                  sx={{ mb: 1 }}
                />
              ))}
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIssueForm(prev => ({ 
                  ...prev, 
                  reproductionSteps: [...prev.reproductionSteps, ''] 
                }))}
              >
                단계 추가
              </Button>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="제안된 해결 방법"
                value={issueForm.suggestedSolution}
                onChange={(e) => setIssueForm(prev => ({ ...prev, suggestedSolution: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateIssueDialog(false)}>취소</Button>
          <Button 
            onClick={handleCreateManualIssue}
            variant="contained"
            disabled={loading || !issueForm.title || !issueForm.assignedTo}
          >
            이슈 생성
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BuildFailureIssueReporter;
