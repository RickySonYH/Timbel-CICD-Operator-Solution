// [advice from AI] 경영진 통합 대시보드 - 재구성된 레이아웃
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

const ExecutiveDashboardReorganized: React.FC = () => {
  const { token } = useJwtAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [workflowData, setWorkflowData] = useState<any[]>([]);
  const [qaStats, setQaStats] = useState<any>(null);
  const [deploymentStats, setDeploymentStats] = useState<any>(null);
  const [pePerformanceData, setPePerformanceData] = useState<any>(null);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [dashboardRes, workflowRes, qaRes, deploymentRes, peRes] = await Promise.all([
        fetch('http://rdc.rickyson.com:3001/api/po/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
        fetch('http://rdc.rickyson.com:3001/api/executive-dashboard/workflow', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
        fetch('http://rdc.rickyson.com:3001/api/qc/stats', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
        fetch('http://rdc.rickyson.com:3001/api/po/deployment-stats', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
        fetch('http://rdc.rickyson.com:3001/api/po/pe-performance', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
      ]);

      const [dashboardResult, workflowResult, qaResult, deploymentResult, peResult] = await Promise.all([
        dashboardRes.json(),
        workflowRes.json(),
        qaRes.json(),
        deploymentRes.json(),
        peRes.json()
      ]);
      
      if (dashboardResult.success) setDashboardData(dashboardResult.data);
      if (workflowResult.success) setWorkflowData(workflowResult.data);
      if (qaResult.success) setQaStats(qaResult.data);
      if (deploymentResult.success) setDeploymentStats(deploymentResult.data);
      if (peResult.success) setPePerformanceData(peResult.data);
      
      console.log('📊 로드된 데이터:', { 
        dashboard: !!dashboardResult.success, 
        workflow: workflowResult.data?.length, 
        qa: !!qaResult.success,
        deployment: !!deploymentResult.success,
        pe: peResult.data?.length 
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <Button onClick={loadDashboardData} sx={{ mt: 2 }}>재시도</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          경영진 통합 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          전사 프로젝트 현황, 조직 성과 분석, 전략적 의사결정을 지원합니다
        </Typography>
      </Box>

      {dashboardData && (
        <>
          {/* 총 수행 및 운영 현황 (긴 카드) */}
          <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    총 수행 및 운영 현황
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    1-7단계 전체 워크플로우 진행 상황
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {(() => {
                        // [advice from AI] 7단계 카드 합계로 계산
                        const stageMap = new Map();
                        workflowData.forEach(stage => {
                          if (stageMap.has(stage.stage_number)) {
                            const existing = stageMap.get(stage.stage_number);
                            existing.count = (parseInt(existing.count) + parseInt(stage.count)).toString();
                          } else {
                            stageMap.set(stage.stage_number, { ...stage });
                          }
                        });
                        
                        const stage1 = parseInt(stageMap.get(1)?.count || 0);
                        const stage2 = parseInt(stageMap.get(2)?.count || 0);
                        const stage3 = parseInt(stageMap.get(3)?.count || 0);
                        const stage4 = (qaStats?.pending_requests || 0) + (qaStats?.in_progress_requests || 0);
                        const stage5 = parseInt(stageMap.get(5)?.count || 0);
                        const stage6 = parseInt(stageMap.get(6)?.count || 0);
                        const stage7 = parseInt(stageMap.get(7)?.count || 0);
                        
                        return stage1 + stage2 + stage3 + stage4 + stage5 + stage6 + stage7;
                      })()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">총 수행 건수</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {(() => {
                        const stageMap = new Map();
                        workflowData.forEach(stage => {
                          if (stageMap.has(stage.stage_number)) {
                            const existing = stageMap.get(stage.stage_number);
                            existing.count = (parseInt(existing.count) + parseInt(stage.count)).toString();
                          } else {
                            stageMap.set(stage.stage_number, { ...stage });
                          }
                        });
                        
                        const stage1 = parseInt(stageMap.get(1)?.count || 0);
                        const stage2 = parseInt(stageMap.get(2)?.count || 0);
                        const stage3 = parseInt(stageMap.get(3)?.count || 0);
                        const stage4 = (qaStats?.pending_requests || 0) + (qaStats?.in_progress_requests || 0);
                        const stage5 = parseInt(stageMap.get(5)?.count || 0);
                        const stage6 = parseInt(stageMap.get(6)?.count || 0);
                        const stage7 = parseInt(stageMap.get(7)?.count || 0);
                        
                        const total = stage1 + stage2 + stage3 + stage4 + stage5 + stage6 + stage7;
                        
                        return Math.round((stage7 / Math.max(total, 1)) * 100);
                      })()}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">완료율</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* 7단계 워크플로우 카드 */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {(() => {
              // [advice from AI] 7단계로 통합 (같은 stage_number끼리 합치기)
              const mergedStages = [];
              const stageMap = new Map();
              
              workflowData.forEach(stage => {
                if (stageMap.has(stage.stage_number)) {
                  const existing = stageMap.get(stage.stage_number);
                  existing.count = (parseInt(existing.count) + parseInt(stage.count)).toString();
                } else {
                  stageMap.set(stage.stage_number, { ...stage });
                }
              });
              
              // 7단계 고정 생성
              const stages = [
                { number: 1, name: '승인대기', count: stageMap.get(1)?.count || '0', color: 'warning.main' },
                { number: 2, name: 'PO승인', count: stageMap.get(2)?.count || '0', color: 'primary.main' },
                { number: 3, name: 'PE개발', count: stageMap.get(3)?.count || '0', color: 'info.main' },
                { number: 4, name: 'QA검증', count: qaStats?.pending_requests + qaStats?.in_progress_requests || '0', color: 'secondary.main' },
                { number: 5, name: '최종승인', count: stageMap.get(5)?.count || '0', color: 'success.main' },
                { number: 6, name: '배포승인', count: stageMap.get(6)?.count || '0', color: 'orange' },
                { number: 7, name: '운영중', count: stageMap.get(7)?.count || '0', color: 'success.dark' }
              ];
              
              return stages.map((stage) => (
                <Grid item xs={12} sm={6} md={1.71} key={stage.number}>
                  <Card sx={{ textAlign: 'center', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: stage.color }}>
                        {stage.count}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stage.number}단계: {stage.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ));
            })()}
          </Grid>

          {/* 1. 프로젝트 리스크 분석 (최상단) */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                🚨 프로젝트 리스크 분석
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                위험도가 높은 프로젝트를 우선적으로 관리하세요
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                <Typography variant="body2">
                  리스크 분석 데이터를 로드하는 중...
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 2. PE 작업 현황 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                👨‍💻 PE 작업 현황
              </Typography>
              <TableContainer>
                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '20%' }}>PE 이름</TableCell>
                      <TableCell sx={{ width: '15%', textAlign: 'center' }}>할당 수</TableCell>
                      <TableCell sx={{ width: '35%' }}>진행률</TableCell>
                      <TableCell sx={{ width: '15%', textAlign: 'center' }}>워크로드</TableCell>
                      <TableCell sx={{ width: '15%', textAlign: 'center' }}>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.pe_workload?.slice(0, 6).map((pe: any) => (
                      <TableRow key={pe.pe_id}>
                        <TableCell sx={{ verticalAlign: 'middle' }}>{pe.pe_name}</TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <Chip 
                            label={pe.active_assignments} 
                            size="small" 
                            color={pe.active_assignments > 3 ? 'error' : pe.active_assignments > 1 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={parseFloat(pe.avg_progress || 0)}
                              sx={{ 
                                width: '100%', 
                                height: 8, 
                                borderRadius: 1,
                                backgroundColor: 'grey.200'
                              }}
                              color={
                                pe.avg_progress > 80 ? 'success' :
                                pe.avg_progress > 50 ? 'primary' : 'warning'
                              }
                            />
                            <Typography variant="caption" sx={{ minWidth: 40 }}>
                              {parseFloat(pe.avg_progress || 0).toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          {pe.current_workload_hours}h
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <Chip 
                            label={pe.current_workload_hours > 40 ? '과부하' : pe.current_workload_hours > 20 ? '적정' : '여유'}
                            size="small"
                            color={pe.current_workload_hours > 40 ? 'error' : pe.current_workload_hours > 20 ? 'primary' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* 3. QA 검증 현황 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                🔍 QA 검증 현황
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {qaStats?.pending_requests || 0}
                    </Typography>
                    <Typography variant="caption">대기 중</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {qaStats?.in_progress_requests || 0}
                    </Typography>
                    <Typography variant="caption">진행 중</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {qaStats?.completed_requests || 0}
                    </Typography>
                    <Typography variant="caption">완료</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {qaStats?.avg_quality_score || 0}점
                    </Typography>
                    <Typography variant="caption">평균 품질점수</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 4. 배포 현황 (DB 연동) */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                🚀 배포 현황
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {deploymentStats?.total_deployments || 0}
                    </Typography>
                    <Typography variant="caption">전체 배포</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {deploymentStats?.active_deployments || 0}
                    </Typography>
                    <Typography variant="caption">활성 배포</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {deploymentStats?.pending_deployments || 0}
                    </Typography>
                    <Typography variant="caption">대기 중</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {Math.round(deploymentStats?.success_rate || 0)}%
                    </Typography>
                    <Typography variant="caption">성공률</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 5. PE 성과 분석 / 업무 부하 분산 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    📊 PE 성과 분석
                  </Typography>
                  {pePerformanceData?.pe_performance ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>PE</TableCell>
                            <TableCell align="right">완료율</TableCell>
                            <TableCell align="right">품질점수</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pePerformanceData.slice(0, 4).map((pe: any) => (
                            <TableRow key={pe.pe_id}>
                              <TableCell>{pe.pe_name}</TableCell>
                              <TableCell align="right">{parseFloat(pe.avg_completion_rate || 0).toFixed(1)}%</TableCell>
                              <TableCell align="right">{parseFloat(pe.avg_quality_score || 0).toFixed(1)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">성과 데이터 로딩 중...</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    ⚖️ 업무 부하 분산
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {pePerformanceData?.team_benchmark?.team_avg_workload || 0}h
                        </Typography>
                        <Typography variant="caption">평균 워크로드</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                          {pePerformanceData?.team_benchmark?.balanced_pe_count || 0}
                        </Typography>
                        <Typography variant="caption">균형 PE 수</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 6. 긴급 처리 사항 (최하단) */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
                🚨 긴급 처리 사항
              </Typography>
              {dashboardData.urgent_items?.length > 0 ? (
                <List>
                  {dashboardData.urgent_items.slice(0, 5).map((item: any, index: number) => (
                    <React.Fragment key={item.id || index}>
                      <ListItem>
                        <ListItemText
                          primary={item.title}
                          secondary={item.description}
                        />
                        <Chip 
                          label={item.type} 
                          color={item.type === 'deadline' ? 'error' : 'warning'} 
                          size="small" 
                        />
                      </ListItem>
                      {index < 4 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="success">현재 긴급 처리가 필요한 사항이 없습니다.</Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
};

export default ExecutiveDashboardReorganized;
