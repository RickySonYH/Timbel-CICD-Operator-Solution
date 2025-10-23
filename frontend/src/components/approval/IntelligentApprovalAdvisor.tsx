// [advice from AI] 프로덕션 레벨 지능형 승인 어드바이저 컴포넌트
// 단계별 체크리스트, 자동 검증, ML 예측, 실시간 가이드 제공

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardActions,
  Typography, Box, Stepper, Step, StepLabel, StepContent,
  Checkbox, FormControlLabel, FormGroup, Button,
  Alert, AlertTitle, Chip, LinearProgress, Divider,
  Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, IconButton, CircularProgress, Grid,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Fade, Zoom, Collapse
} from '@mui/material';
import {
  CheckCircle, Warning, Error, Info, TrendingUp,
  Psychology, Speed, Security, Assessment,
  ExpandMore, Help, Refresh, Settings,
  Timeline, TextFields, AutoAwesome,
  Analytics, SmartToy, Insights
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 인터페이스 정의
interface ChecklistItem {
  id: string;
  text: string;
  weight: number;
  category: 'critical' | 'important' | 'recommended';
  description: string;
  validationRules: string[];
  automatedCheck: boolean;
  dependencies: string[];
  validationStatus?: {
    status: 'passed' | 'failed' | 'warning' | 'pending';
    message: string;
    value?: any;
  };
}

interface RiskAnalysis {
  type: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  warning: string;
  recommendations: string[];
  probability?: number;
}

interface ApprovalScore {
  score: number;
  recommendation: 'proceed' | 'caution' | 'block';
  criticalIssues: string[];
  improvements: string[];
}

interface SuccessPrediction {
  probability: number;
  confidence: 'very_low' | 'low' | 'medium' | 'high';
  reason: string;
  factors: {
    baseSuccessRate: number;
    teamSize: number;
    avgExperience: number;
    complexityScore: number;
    similarProjectsCount: number;
  };
}

interface IntelligentApprovalAdvisorProps {
  projectId: string;
  stage: 'project_creation' | 'po_approval' | 'pe_assignment' | 'qa_approval' | 'deployment_approval';
  onApprovalDecision?: (decision: 'approved' | 'rejected' | 'pending', data: any) => void;
  readonly?: boolean;
}

const IntelligentApprovalAdvisor: React.FC<IntelligentApprovalAdvisorProps> = ({
  projectId,
  stage,
  onApprovalDecision,
  readonly = false
}) => {
  const { token } = useJwtAuthStore();
  
  // [advice from AI] 상태 관리
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis[]>([]);
  const [approvalScore, setApprovalScore] = useState<ApprovalScore | null>(null);
  const [successPrediction, setSuccessPrediction] = useState<SuccessPrediction | null>(null);
  const [bestPractices, setBestPractices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoValidationResults, setAutoValidationResults] = useState<Record<string, any>>({});

  // [advice from AI] API 호출 함수들
  const apiUrl = useMemo(() => {
    const currentHost = window.location.host;
    return currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000'
      ? 'http://localhost:3001'
      : `http://${currentHost.split(':')[0]}:3001`;
  }, []);

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/intelligent-approval/projects/${projectId}/checklist/${stage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`체크리스트 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setChecklist(data.data.checklist || []);
        setRiskAnalysis(data.data.riskAnalysis || []);
        setBestPractices(data.data.bestPractices || []);
        
        // 초기 응답 상태 설정
        const initialResponses: Record<string, boolean> = {};
        data.data.checklist?.forEach((item: ChecklistItem) => {
          initialResponses[item.id] = false;
        });
        setResponses(initialResponses);
      } else {
        throw new Error(data.message || '체크리스트 조회 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      console.error('체크리스트 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, projectId, stage, token]);

  const calculateApprovalScore = useCallback(async () => {
    try {
      setCalculating(true);
      
      const response = await fetch(`${apiUrl}/api/intelligent-approval/projects/${projectId}/approval-score/${stage}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          checklistResponses: responses,
          additionalData: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        throw new Error(`승인 점수 계산 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setApprovalScore(data.data.approvalScore);
        setSuccessPrediction(data.data.successPrediction);
        
        // 승인 결정 콜백 호출
        if (onApprovalDecision) {
          const decision = data.data.approvalScore.recommendation === 'proceed' ? 'approved' :
                          data.data.approvalScore.recommendation === 'block' ? 'rejected' : 'pending';
          onApprovalDecision(decision, data.data);
        }
      } else {
        throw new Error(data.message || '승인 점수 계산 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '승인 점수 계산 오류');
      console.error('승인 점수 계산 오류:', err);
    } finally {
      setCalculating(false);
    }
  }, [apiUrl, projectId, stage, token, responses, onApprovalDecision]);

  const runAutoValidation = useCallback(async () => {
    try {
      setValidating(true);
      
      const response = await fetch(`${apiUrl}/api/intelligent-approval/projects/${projectId}/validation-status/${stage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`자동 검증 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAutoValidationResults(data.data || {});
      }
    } catch (err) {
      console.error('자동 검증 오류:', err);
    } finally {
      setValidating(false);
    }
  }, [apiUrl, projectId, stage, token]);

  // [advice from AI] 초기 데이터 로드
  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // [advice from AI] 응답 변경 핸들러
  const handleResponseChange = useCallback((itemId: string, checked: boolean) => {
    if (readonly) return;
    
    setResponses(prev => ({
      ...prev,
      [itemId]: checked
    }));
  }, [readonly]);

  // [advice from AI] 유틸리티 함수들
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'critical': return <Error color="error" />;
      case 'important': return <Warning color="warning" />;
      case 'recommended': return <Info color="info" />;
      default: return <CheckCircle />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'critical': return 'error';
      case 'important': return 'warning';
      case 'recommended': return 'info';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'proceed': return <CheckCircle color="success" />;
      case 'caution': return <Warning color="warning" />;
      case 'block': return <Error color="error" />;
      default: return <Help />;
    }
  };

  // [advice from AI] 완료율 계산
  const completionRate = useMemo(() => {
    const totalItems = checklist.length;
    const completedItems = Object.values(responses).filter(Boolean).length;
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  }, [checklist, responses]);

  // [advice from AI] 로딩 상태 렌더링
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={4}>
            <CircularProgress size={60} />
            <Typography variant="h6">지능형 승인 어드바이저 로딩 중...</Typography>
            <Typography variant="body2" color="textSecondary">
              프로젝트 분석 및 체크리스트 생성 중입니다.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // [advice from AI] 에러 상태 렌더링
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <AlertTitle>지능형 승인 어드바이저 오류</AlertTitle>
            {error}
          </Alert>
          <Box mt={2}>
            <Button variant="outlined" onClick={fetchChecklist} startIcon={<Refresh />}>
              다시 시도
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* [advice from AI] 헤더 섹션 */}
      <Card elevation={3} sx={{ mb: 2 }}>
        <CardHeader
          avatar={<SmartToy color="primary" fontSize="large" />}
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5">지능형 승인 어드바이저</Typography>
              <Chip 
                label="AI 기반" 
                color="primary" 
                size="small" 
                icon={<AutoAwesome />}
              />
            </Box>
          }
          subheader={`${stage} 단계 분석 및 가이드`}
          action={
            <Box display="flex" gap={1}>
              <Tooltip title="자동 검증 실행">
                <IconButton onClick={runAutoValidation} disabled={validating}>
                  {validating ? <CircularProgress size={20} /> : <Assessment />}
                </IconButton>
              </Tooltip>
              <Tooltip title="상세 정보 보기">
                <IconButton onClick={() => setShowDetails(!showDetails)}>
                  <Insights />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
        
        {/* [advice from AI] 진행률 표시 */}
        <CardContent sx={{ pt: 0 }}>
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="textSecondary">
                체크리스트 완료율
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {Math.round(completionRate)}% ({Object.values(responses).filter(Boolean).length}/{checklist.length})
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={completionRate} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* [advice from AI] 위험 분석 요약 */}
          {riskAnalysis.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                🚨 감지된 위험 요소
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {riskAnalysis.map((risk, index) => (
                  <Chip
                    key={index}
                    label={`${risk.type} (${risk.level})`}
                    color={risk.level === 'critical' ? 'error' : risk.level === 'high' ? 'warning' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 체크리스트 섹션 */}
      <Card>
        <CardHeader
          title="단계별 체크리스트"
          subheader="각 항목을 신중히 검토하고 체크해주세요"
        />
        <CardContent>
          <FormGroup>
            {checklist.map((item, index) => (
              <Box key={item.id} mb={2}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box mt={0.5}>
                      {getCategoryIcon(item.category)}
                    </Box>
                    
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={responses[item.id] || false}
                              onChange={(e) => handleResponseChange(item.id, e.target.checked)}
                              disabled={readonly}
                            />
                          }
                          label={
                            <Typography 
                              variant="body1" 
                              fontWeight={item.category === 'critical' ? 'bold' : 'normal'}
                            >
                              {item.text}
                            </Typography>
                          }
                        />
                        <Chip
                          label={item.category}
                          color={getCategoryColor(item.category) as any}
                          size="small"
                        />
                        <Typography variant="caption" color="textSecondary">
                          가중치: {item.weight}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {item.description}
                      </Typography>

                      {/* [advice from AI] 자동 검증 결과 표시 */}
                      {item.automatedCheck && autoValidationResults[item.id] && (
                        <Alert 
                          severity={autoValidationResults[item.id].status === 'passed' ? 'success' : 'warning'}
                          size="small"
                          sx={{ mt: 1 }}
                        >
                          <Typography variant="caption">
                            자동 검증: {autoValidationResults[item.id].message}
                          </Typography>
                        </Alert>
                      )}

                      {/* [advice from AI] 의존성 표시 */}
                      {item.dependencies.length > 0 && (
                        <Typography variant="caption" color="textSecondary">
                          의존성: {item.dependencies.join(', ')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Box>
            ))}
          </FormGroup>
        </CardContent>

        {/* [advice from AI] 액션 버튼들 */}
        <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              onClick={runAutoValidation}
              disabled={validating}
              startIcon={validating ? <CircularProgress size={16} /> : <Assessment />}
            >
              자동 검증
            </Button>
          </Box>
          
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              onClick={calculateApprovalScore}
              disabled={calculating || readonly}
              startIcon={calculating ? <CircularProgress size={16} /> : <Analytics />}
            >
              승인 분석
            </Button>
          </Box>
        </CardActions>
      </Card>

      {/* [advice from AI] 승인 점수 및 예측 결과 */}
      {approvalScore && (
        <Fade in={true}>
          <Card sx={{ mt: 2 }}>
            <CardHeader
              title="승인 분석 결과"
              avatar={<TrendingUp color="primary" />}
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* 승인 점수 */}
                <Grid item xs={12} md={4}>
                  <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={getScoreColor(approvalScore.score)}>
                      {approvalScore.score}점
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      승인 점수
                    </Typography>
                    <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                      {getRecommendationIcon(approvalScore.recommendation)}
                      <Typography variant="body1" sx={{ ml: 1 }}>
                        {approvalScore.recommendation === 'proceed' ? '승인 권장' :
                         approvalScore.recommendation === 'caution' ? '주의 검토' : '승인 보류'}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>

                {/* 성공 예측 */}
                <Grid item xs={12} md={4}>
                  <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {Math.round((successPrediction?.probability || 0) * 100)}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      성공 확률
                    </Typography>
                    <Chip
                      label={`신뢰도: ${successPrediction?.confidence || 'unknown'}`}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>

                {/* 위험 수준 */}
                <Grid item xs={12} md={4}>
                  <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color={approvalScore.score >= 80 ? 'success' : 'warning'}>
                      {approvalScore.score >= 80 ? '낮음' : approvalScore.score >= 60 ? '중간' : '높음'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      위험 수준
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {approvalScore.criticalIssues.length}개 중요 이슈
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* 중요 이슈 및 개선사항 */}
              {(approvalScore.criticalIssues.length > 0 || approvalScore.improvements.length > 0) && (
                <Box mt={3}>
                  <Grid container spacing={2}>
                    {approvalScore.criticalIssues.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Alert severity="error">
                          <AlertTitle>중요 이슈</AlertTitle>
                          <List dense>
                            {approvalScore.criticalIssues.map((issue, index) => (
                              <ListItem key={index}>
                                <ListItemIcon><Error fontSize="small" /></ListItemIcon>
                                <ListItemText primary={issue} />
                              </ListItem>
                            ))}
                          </List>
                        </Alert>
                      </Grid>
                    )}

                    {approvalScore.improvements.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Alert severity="info">
                          <AlertTitle>개선 권장사항</AlertTitle>
                          <List dense>
                            {approvalScore.improvements.slice(0, 3).map((improvement, index) => (
                              <ListItem key={index}>
                                <ListItemIcon><Info fontSize="small" /></ListItemIcon>
                                <ListItemText primary={improvement} />
                              </ListItem>
                            ))}
                          </List>
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* [advice from AI] 베스트 프랙티스 및 위험 분석 상세 */}
      <Collapse in={showDetails}>
        <Box mt={2}>
          <Grid container spacing={2}>
            {/* 베스트 프랙티스 */}
            {bestPractices.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader
                    title="베스트 프랙티스"
                    avatar={<Psychology color="success" />}
                  />
                  <CardContent>
                    <List>
                      {bestPractices.map((practice, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircle color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={practice} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* 위험 분석 상세 */}
            {riskAnalysis.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader
                    title="위험 분석 상세"
                    avatar={<Security color="warning" />}
                  />
                  <CardContent>
                    {riskAnalysis.map((risk, index) => (
                      <Accordion key={index}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={risk.level}
                              color={risk.level === 'critical' ? 'error' : 'warning'}
                              size="small"
                            />
                            <Typography variant="body2">{risk.type}</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" paragraph>
                            {risk.warning}
                          </Typography>
                          <Typography variant="subtitle2" gutterBottom>
                            권장사항:
                          </Typography>
                          <List dense>
                            {risk.recommendations.map((rec, recIndex) => (
                              <ListItem key={recIndex}>
                                <ListItemIcon>
                                  <Info fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={rec} />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
};

export default IntelligentApprovalAdvisor;
