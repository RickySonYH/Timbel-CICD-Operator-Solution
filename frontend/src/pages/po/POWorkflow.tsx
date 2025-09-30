// [advice from AI] PO 프로젝트 워크플로우 - 7단계 생명주기 전체 현황
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, Button, Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

// [advice from AI] 상태 한글 변환
const getStatusLabel = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'draft': '작성 중',
    'pending_approval': '승인 대기',
    'po_approved': 'PO 승인',
    'pe_assigned': 'PE 배정',
    'qa_requested': 'QA 요청',
    'qa_approved': 'QA 승인',
    'po_final_approved': '최종 승인',
    'deployment_requested': '배포 요청',
    'deployment_approved': '배포 승인',
    'deployed': '배포 완료',
    'operational': '운영 중',
    'cancelled': '취소됨',
    'suspended': '중지됨',
  };
  return statusMap[status] || status;
};

const POWorkflow: React.FC = () => {
  const { token } = useJwtAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workflowData, setWorkflowData] = useState<any[]>([]);
  const [projectsByStage, setProjectsByStage] = useState<any>({});

  useEffect(() => {
    if (token) {
      loadWorkflowData();
    }
  }, [token]);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('http://rdc.rickyson.com:3001/api/executive-dashboard/workflow', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        // [advice from AI] 같은 단계 번호끼리 합치기
        const mergedData: any[] = [];
        const stageMap = new Map();
        
        result.data.forEach((item: any) => {
          if (stageMap.has(item.stage_number)) {
            const existing = stageMap.get(item.stage_number);
            existing.count = (parseInt(existing.count) + parseInt(item.count)).toString();
            existing.avg_days = ((parseFloat(existing.avg_days) + parseFloat(item.avg_days)) / 2).toString();
          } else {
            stageMap.set(item.stage_number, { ...item });
          }
        });
        
        const merged = Array.from(stageMap.values()).sort((a, b) => a.stage_number - b.stage_number);
        setWorkflowData(merged);
        
        // 각 단계별 프로젝트 로드
        await loadProjectsByStage();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsByStage = async () => {
    try {
      const response = await fetch('http://rdc.rickyson.com:3001/api/po/projects-by-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('📊 프로젝트 목록 로드:', result.data.length, '개');
        
        const grouped: any = {};
        result.data.forEach((project: any) => {
          const status = project.project_status;
          if (!grouped[status]) {
            grouped[status] = [];
          }
          grouped[status].push(project);
        });
        
        console.log('📦 그룹핑된 데이터:', Object.keys(grouped).map(k => `${k}: ${grouped[k].length}개`));
        setProjectsByStage(grouped);
      }
    } catch (err) {
      console.error('프로젝트 목록 로드 실패:', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={loadWorkflowData} sx={{ mt: 2 }}>재시도</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          프로젝트 워크플로우
        </Typography>
        <Typography variant="body1" color="text.secondary">
          7단계 프로젝트 생명주기 전체 현황
        </Typography>
      </Box>

      {/* 워크플로우 단계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {workflowData.map((stage, index) => (
          <Grid item xs={12} sm={6} md={3} key={stage.status_code}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                border: stage.count > 0 ? '2px solid' : '1px solid',
                borderColor: stage.count > 0 ? 'primary.main' : 'divider'
              }}
              onClick={() => {
                // [advice from AI] 해당 단계로 스크롤
                const element = document.getElementById(`stage-${stage.stage_number}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    STEP {index + 1}
                  </Typography>
                  <Chip 
                    label={stage.count}
                    size="small"
                    color={stage.count > 0 ? 'primary' : 'default'}
                  />
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  {stage.stage_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  평균 {parseFloat(stage.avg_days || 0).toFixed(1)}일 소요
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((stage.count / 5) * 100, 100)}
                  sx={{ height: 6, borderRadius: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 단계별 프로젝트 상세 */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            단계별 프로젝트 상세
          </Typography>
          
          <Stepper orientation="vertical">
            {workflowData.map((stage, index) => (
              <Step key={stage.status_code} active={stage.count > 0} completed={false}>
                <StepLabel id={`stage-${stage.stage_number}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {stage.stage_name}
                    </Typography>
                    <Chip 
                      label={`${stage.count}개 프로젝트`}
                      size="small"
                      color={stage.count > 0 ? 'primary' : 'default'}
                    />
                  </Box>
                </StepLabel>
                <StepContent>
                  {(() => {
                    // [advice from AI] stage_number로 해당 단계의 모든 프로젝트 찾기
                    const stageProjects = Object.values(projectsByStage).flat().filter((p: any) => {
                      const pStatus = p.project_status;
                      if (stage.stage_number === 1) return ['draft', 'pending_approval'].includes(pStatus);
                      if (stage.stage_number === 2) return pStatus === 'po_approved';
                      if (stage.stage_number === 3) return pStatus === 'pe_assigned';
                      if (stage.stage_number === 4) return ['qa_requested', 'qa_approved'].includes(pStatus);
                      if (stage.stage_number === 5) return pStatus === 'po_final_approved';
                      if (stage.stage_number === 6) return ['deployment_requested', 'deployment_approved'].includes(pStatus);
                      if (stage.stage_number === 7) return ['deployed', 'operational'].includes(pStatus);
                      return false;
                    });
                    
                    return stageProjects.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: '35%' }}>프로젝트명</TableCell>
                            <TableCell sx={{ width: '20%' }}>담당 PE</TableCell>
                            <TableCell sx={{ width: '15%', textAlign: 'center' }}>긴급도</TableCell>
                            <TableCell sx={{ width: '15%' }}>생성일</TableCell>
                            <TableCell sx={{ width: '15%', textAlign: 'center' }}>액션</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stageProjects.map((project: any) => (
                            <TableRow key={project.id}>
                              <TableCell sx={{ verticalAlign: 'middle' }}>{project.name}</TableCell>
                              <TableCell sx={{ verticalAlign: 'middle' }}>{project.assigned_pe_name || '미할당'}</TableCell>
                              <TableCell sx={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                <Chip 
                                  label={project.urgency_level || '보통'}
                                  size="small"
                                  color={
                                    project.urgency_level === 'critical' ? 'error' :
                                    project.urgency_level === 'high' ? 'warning' :
                                    'default'
                                  }
                                />
                              </TableCell>
                              <TableCell sx={{ verticalAlign: 'middle' }}>
                                {new Date(project.created_at).toLocaleDateString('ko-KR')}
                              </TableCell>
                              <TableCell sx={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                <Button 
                                  size="small" 
                                  onClick={() => navigate(`/po-dashboard`)}
                                >
                                  상세보기
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, ml: 2 }}>
                      이 단계의 프로젝트가 없습니다.
                    </Typography>
                  );
                  })()}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>
    </Container>
  );
};

export default POWorkflow;
