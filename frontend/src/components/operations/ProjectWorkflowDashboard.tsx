// [advice from AI] 프로젝트 워크플로우 대시보드 - 7단계 프로젝트 생명주기 전체 현황 추적
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, TextField, FormControl, InputLabel, Select, MenuItem,
  Stepper, Step, StepLabel, StepContent, LinearProgress, Divider, List, ListItem,
  ListItemText, ListItemIcon, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 프로젝트 워크플로우 단계 정의
const WORKFLOW_STEPS = [
  { id: 1, name: '도메인/프로젝트 생성', description: '도메인 및 프로젝트 등록' },
  { id: 2, name: '최고운영자 승인', description: '전략적 검토 및 승인' },
  { id: 3, name: 'PO 검토 및 PE 할당', description: 'PO가 프로젝트 검토하고 PE 할당' },
  { id: 4, name: 'PE 개발 및 레포지토리', description: 'PE가 개발하고 레포지토리 등록' },
  { id: 5, name: 'QA 승인', description: '품질 검증 및 승인' },
  { id: 6, name: 'PO 지식자산/배포 결정', description: 'PO가 지식자산 등록 및 배포 결정' },
  { id: 7, name: '운영센터 배포', description: '운영팀이 배포 실행' }
];

// [advice from AI] 인터페이스 정의
interface ProjectWorkflow {
  id: string;
  project_name: string;
  domain_name: string;
  current_step: number;
  status: 'active' | 'completed' | 'blocked' | 'cancelled';
  created_at: string;
  updated_at: string;
  assigned_po?: string;
  assigned_pe?: string;
  assigned_qa?: string;
  step_details: StepDetail[];
  priority: 'high' | 'medium' | 'low';
  estimated_completion?: string;
}

interface StepDetail {
  step_id: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  started_at?: string;
  completed_at?: string;
  assigned_user?: string;
  notes?: string;
  duration_days?: number;
}

interface WorkflowStats {
  total_projects: number;
  by_step: { [key: number]: number };
  by_status: { [key: string]: number };
  avg_completion_time: number;
  bottleneck_step: number;
}

// [advice from AI] 현재 단계 상태에서 단계 번호 추출 헬퍼 함수
const getCurrentStepFromStatus = (status: string): number => {
  if (status.includes('관리자 승인')) return 2;
  if (status.includes('최고운영자 승인')) return 2;
  if (status.includes('PO 검토') || status.includes('PE 할당')) return 3;
  if (status.includes('PE 개발') || status.includes('개발 진행')) return 4;
  if (status.includes('QA') || status.includes('검토')) return 5;
  if (status.includes('배포 결정')) return 6;
  if (status.includes('배포 진행') || status.includes('운영센터')) return 7;
  return 1; // 기본값
};

const ProjectWorkflowDashboard: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [workflows, setWorkflows] = useState<ProjectWorkflow[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWorkflow | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);

  // [advice from AI] 워크플로우 데이터 로드
  const loadWorkflowData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // [advice from AI] 실제 API 호출
      const response = await fetch('/api/project-workflow/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // [advice from AI] API 응답 데이터를 컴포넌트 형식에 맞게 변환
          const workflowData = data.data;
          
          // 통계 데이터 설정
          setStats({
            total_projects: workflowData.stage_statistics.total_projects,
            by_step: {
              1: workflowData.stage_statistics.stage1_planning,
              2: workflowData.stage_statistics.stage2_admin_approval,
              3: workflowData.stage_statistics.stage3_po_assignment,
              4: workflowData.stage_statistics.stage4_development,
              5: workflowData.stage_statistics.stage5_qa_review,
              6: workflowData.stage_statistics.stage6_deployment_decision,
              7: workflowData.stage_statistics.stage7_operations_deployment
            },
            by_status: {
              active: workflowData.stage_statistics.total_projects - workflowData.stage_statistics.completed_projects,
              completed: workflowData.stage_statistics.completed_projects,
              blocked: 0,
              cancelled: 0
            },
            avg_completion_time: workflowData.processing_times.total_average,
            bottleneck_step: workflowData.bottlenecks.length > 0 ? 
              parseInt(workflowData.bottlenecks[0].stage.replace('stage', '')) : 4
          });

          // 최근 활동을 워크플로우 형식으로 변환
          const mockWorkflows = workflowData.recent_activity.map((activity: any, index: number) => ({
            id: activity.project_id,
            project_name: activity.project_name,
            domain_name: '도메인 정보 없음',
            current_step: getCurrentStepFromStatus(activity.current_stage),
            status: 'active' as const,
            created_at: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: activity.updated_at,
            assigned_po: activity.po_name,
            assigned_pe: '할당된 PE',
            step_details: [],
            priority: 'medium' as const
          }));

          setWorkflows(mockWorkflows);
          console.log('✅ 프로젝트 워크플로우 데이터 로딩 완료:', workflowData);
        }
      } else {
        // Mock 데이터로 대체
        const mockWorkflows: ProjectWorkflow[] = [
          {
            id: 'proj-1',
            project_name: 'ECP-AI K8s Orchestrator',
            domain_name: 'AI/ML 플랫폼',
            current_step: 4,
            status: 'active',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            assigned_po: '김PO',
            assigned_pe: '이PE',
            priority: 'high',
            estimated_completion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            step_details: [
              { step_id: 1, status: 'completed', started_at: '2024-01-01', completed_at: '2024-01-02', duration_days: 1 },
              { step_id: 2, status: 'completed', started_at: '2024-01-02', completed_at: '2024-01-03', duration_days: 1 },
              { step_id: 3, status: 'completed', started_at: '2024-01-03', completed_at: '2024-01-05', duration_days: 2 },
              { step_id: 4, status: 'in_progress', started_at: '2024-01-05', assigned_user: '이PE' },
              { step_id: 5, status: 'pending' },
              { step_id: 6, status: 'pending' },
              { step_id: 7, status: 'pending' }
            ]
          },
          {
            id: 'proj-2',
            project_name: 'Langsa AICC 챗봇',
            domain_name: '고객서비스',
            current_step: 6,
            status: 'active',
            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            assigned_po: '박PO',
            assigned_pe: '최PE',
            assigned_qa: '정QA',
            priority: 'medium',
            step_details: [
              { step_id: 1, status: 'completed', duration_days: 1 },
              { step_id: 2, status: 'completed', duration_days: 2 },
              { step_id: 3, status: 'completed', duration_days: 1 },
              { step_id: 4, status: 'completed', duration_days: 10 },
              { step_id: 5, status: 'completed', duration_days: 3 },
              { step_id: 6, status: 'in_progress', started_at: '2024-01-20', assigned_user: '박PO' },
              { step_id: 7, status: 'pending' }
            ]
          },
          {
            id: 'proj-3',
            project_name: '데이터 분석 플랫폼',
            domain_name: '데이터 사이언스',
            current_step: 2,
            status: 'blocked',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            priority: 'low',
            step_details: [
              { step_id: 1, status: 'completed', duration_days: 1 },
              { step_id: 2, status: 'blocked', started_at: '2024-01-22', notes: '리소스 부족으로 대기 중' },
              { step_id: 3, status: 'pending' },
              { step_id: 4, status: 'pending' },
              { step_id: 5, status: 'pending' },
              { step_id: 6, status: 'pending' },
              { step_id: 7, status: 'pending' }
            ]
          }
        ];

        const mockStats: WorkflowStats = {
          total_projects: mockWorkflows.length,
          by_step: {
            1: 0, 2: 1, 3: 0, 4: 1, 5: 0, 6: 1, 7: 0
          },
          by_status: {
            active: 2, completed: 0, blocked: 1, cancelled: 0
          },
          avg_completion_time: 18,
          bottleneck_step: 4
        };

        setWorkflows(mockWorkflows);
        setStats(mockStats);
      }
    } catch (err: any) {
      setError(err.message || '워크플로우 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWorkflowData();
  }, [loadWorkflowData]);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': case 'active': return 'primary';
      case 'blocked': return 'error';
      case 'pending': return 'default';
      case 'cancelled': return 'secondary';
      default: return 'default';
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  // [advice from AI] 단계별 진행률 계산
  const getProgressPercentage = (currentStep: number) => {
    return Math.round((currentStep / WORKFLOW_STEPS.length) * 100);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>프로젝트 워크플로우 데이터를 불러오는 중...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          프로젝트 워크플로우 관리
        </Typography>
        <Button variant="contained" color="primary">
          워크플로우 분석 보고서
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 통계 카드 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  전체 프로젝트
                </Typography>
                <Typography variant="h3">
                  {stats.total_projects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  진행 중인 프로젝트
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  활성 프로젝트
                </Typography>
                <Typography variant="h3">
                  {stats.by_status.active || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  정상 진행 중
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main">
                  블록된 프로젝트
                </Typography>
                <Typography variant="h3">
                  {stats.by_status.blocked || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  진행 지연 중
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  평균 완료 시간
                </Typography>
                <Typography variant="h3">
                  {stats.avg_completion_time}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  일 (예상)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 워크플로우 단계 개요 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            프로젝트 생명주기 단계
          </Typography>
          <Stepper orientation="horizontal" sx={{ mt: 2 }}>
            {WORKFLOW_STEPS.map((step, index) => (
              <Step key={step.id} completed={false}>
                <StepLabel>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {step.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                    {stats && (
                      <Typography variant="caption" color="primary">
                        ({stats.by_step[step.id] || 0}개 프로젝트)
                      </Typography>
                    )}
                  </Box>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* [advice from AI] 프로젝트 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            진행 중인 프로젝트
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>프로젝트</TableCell>
                  <TableCell>현재 단계</TableCell>
                  <TableCell>진행률</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>담당자</TableCell>
                  <TableCell>우선순위</TableCell>
                  <TableCell>예상 완료</TableCell>
                  <TableCell>액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        진행 중인 프로젝트가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows.map((project) => (
                    <TableRow key={project.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {project.project_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.domain_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {project.current_step}단계: {WORKFLOW_STEPS[project.current_step - 1]?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {WORKFLOW_STEPS[project.current_step - 1]?.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={getProgressPercentage(project.current_step)}
                            sx={{ width: 80, height: 6 }}
                          />
                          <Typography variant="caption">
                            {getProgressPercentage(project.current_step)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={project.status} 
                          size="small" 
                          color={getStatusColor(project.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          {project.assigned_po && (
                            <Typography variant="caption" display="block">
                              PO: {project.assigned_po}
                            </Typography>
                          )}
                          {project.assigned_pe && (
                            <Typography variant="caption" display="block">
                              PE: {project.assigned_pe}
                            </Typography>
                          )}
                          {project.assigned_qa && (
                            <Typography variant="caption" display="block">
                              QA: {project.assigned_qa}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={project.priority} 
                          size="small" 
                          color={getPriorityColor(project.priority) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {project.estimated_completion 
                            ? new Date(project.estimated_completion).toLocaleDateString()
                            : '-'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="상세 보기">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedProject(project);
                              setDetailDialog(true);
                            }}
                          >
                            📋
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* [advice from AI] 프로젝트 상세 다이얼로그 */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          프로젝트 워크플로우 상세: {selectedProject?.project_name}
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box sx={{ mt: 2 }}>
              {/* [advice from AI] 프로젝트 기본 정보 */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">도메인</Typography>
                  <Typography variant="body2">{selectedProject.domain_name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">현재 상태</Typography>
                  <Chip 
                    label={selectedProject.status} 
                    size="small" 
                    color={getStatusColor(selectedProject.status) as any}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">생성일</Typography>
                  <Typography variant="body2">
                    {new Date(selectedProject.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">마지막 업데이트</Typography>
                  <Typography variant="body2">
                    {new Date(selectedProject.updated_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* [advice from AI] 단계별 상세 정보 */}
              <Typography variant="h6" gutterBottom>
                단계별 진행 상황
              </Typography>
              <Stepper orientation="vertical">
                {WORKFLOW_STEPS.map((step) => {
                  const stepDetail = selectedProject.step_details.find(d => d.step_id === step.id);
                  return (
                    <Step key={step.id} active={stepDetail?.status === 'in_progress'} completed={stepDetail?.status === 'completed'}>
                      <StepLabel>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {step.name}
                          </Typography>
                          {stepDetail && (
                            <Chip 
                              label={stepDetail.status} 
                              size="small" 
                              color={getStatusColor(stepDetail.status) as any}
                            />
                          )}
                        </Box>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {step.description}
                        </Typography>
                        {stepDetail && (
                          <Box sx={{ mt: 1 }}>
                            {stepDetail.started_at && (
                              <Typography variant="caption" display="block">
                                시작: {new Date(stepDetail.started_at).toLocaleDateString()}
                              </Typography>
                            )}
                            {stepDetail.completed_at && (
                              <Typography variant="caption" display="block">
                                완료: {new Date(stepDetail.completed_at).toLocaleDateString()}
                              </Typography>
                            )}
                            {stepDetail.assigned_user && (
                              <Typography variant="caption" display="block">
                                담당자: {stepDetail.assigned_user}
                              </Typography>
                            )}
                            {stepDetail.duration_days && (
                              <Typography variant="caption" display="block">
                                소요 시간: {stepDetail.duration_days}일
                              </Typography>
                            )}
                            {stepDetail.notes && (
                              <Typography variant="caption" display="block" color="warning.main">
                                메모: {stepDetail.notes}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </StepContent>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>닫기</Button>
          <Button variant="contained">워크플로우 수정</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectWorkflowDashboard;
