// [advice from AI] 승인 체계 흐름 시각화 컴포넌트
// 승인 요청의 흐름과 각 단계별 상태를 시각적으로 표시

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Person as PersonIcon,
  TrendingUp as TrendIcon,
  Assignment as RequestIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface ApprovalFlowData {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  avg_approval_time: string;
  approval_rate: number;
  recent_activities: ActivityItem[];
  workflow_stages: WorkflowStage[];
}

interface ActivityItem {
  id: string;
  type: 'request_created' | 'approved' | 'rejected' | 'commented';
  title: string;
  description: string;
  user_name: string;
  created_at: string;
  status: string;
}

interface WorkflowStage {
  stage: string;
  name: string;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_count: number;
  avg_time_hours: number;
  approval_rate: number;
  pending_items: PendingItem[];
}

interface PendingItem {
  request_id: string;
  title: string;
  priority: string;
  waiting_hours: number;
}

interface ApprovalFlowVisualizationProps {
  requestId?: string;
}

const ApprovalFlowVisualization: React.FC<ApprovalFlowVisualizationProps> = ({
  requestId
}) => {
  const [flowData, setFlowData] = useState<ApprovalFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useJwtAuthStore();

  // [advice from AI] 승인 흐름 데이터 로드
  const loadFlowData = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const url = requestId 
        ? `http://localhost:3001/api/approvals/workflow/flow/${requestId}`
        : `http://localhost:3001/api/approvals/workflow/overview`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFlowData(data.data);
        }
      } else {
        setError('승인 흐름 데이터를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('승인 흐름 데이터 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlowData();
    // [advice from AI] 자동 갱신 제거 - 무한 루프 방지
    // const interval = setInterval(loadFlowData, 30000);
    // return () => clearInterval(interval);
  }, [token, requestId]);

  // [advice from AI] 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <ApprovedIcon color="success" />;
      case 'rejected': return <RejectedIcon color="error" />;
      case 'pending': return <PendingIcon color="warning" />;
      default: return <RequestIcon color="info" />;
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'info';
    }
  };

  // [advice from AI] 시간 포맷팅
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            승인 체계 흐름
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error || !flowData) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            승인 체계 흐름
          </Typography>
          <Typography color="error">
            {error || '데이터를 불러올 수 없습니다.'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* [advice from AI] 시스템 헬스 설명 */}
      <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔍 시스템 헬스 현황
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            실시간으로 승인 시스템의 전반적인 건강 상태와 성과 지표를 모니터링합니다.
            아래 데이터는 최근 30일간의 승인 활동을 기준으로 산출됩니다.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="caption" color="white">
                  총 요청: 전체 승인 요청 수
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="caption" color="white">
                  대기 중: 현재 처리 대기 중인 요청
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="caption" color="white">
                  승인 완료: 성공적으로 승인된 요청
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="caption" color="white">
                  승인율: 전체 처리 대비 승인 비율
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 전체 통계 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RequestIcon color="primary" />
                <Box>
                  <Typography variant="h4" color="primary">
                    {flowData.total_requests}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 요청
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PendingIcon color="warning" />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {flowData.pending_requests}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    대기 중
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ApprovedIcon color="success" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {flowData.approved_requests}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    승인 완료
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendIcon color="info" />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {Math.round(flowData.approval_rate)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    승인율
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* [advice from AI] 워크플로우 단계별 상세 현황 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔄 승인 단계별 상세 현황
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                각 승인 단계에서 멈춰있는 항목들과 병목 지점을 실시간으로 확인합니다.
              </Typography>
              
              <Grid container spacing={3}>
                {flowData.workflow_stages.length > 0 ? (
                  flowData.workflow_stages.map((stage, index) => (
                    <Grid item xs={12} sm={6} md={4} key={stage.stage}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          height: '100%',
                          border: stage.pending_count > 0 ? '2px solid' : '1px solid',
                          borderColor: stage.pending_count > 0 ? 'warning.main' : 'divider',
                          bgcolor: stage.pending_count > 0 ? 'warning.light' : 'background.paper'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Typography variant="h6" color={stage.pending_count > 0 ? 'warning.dark' : 'text.primary'}>
                            {stage.name}
                          </Typography>
                          {stage.pending_count > 0 && (
                            <Chip 
                              label="병목!"
                              size="small"
                              color="error"
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h4" color={stage.pending_count > 0 ? 'warning.dark' : 'success.main'}>
                            {stage.pending_count}건
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {stage.pending_count > 0 ? '🚨 대기 중' : '✅ 원활함'}
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            평균 처리시간
                          </Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {stage.avg_time_hours || 0}시간
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            승인율
                          </Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {Math.round(stage.approval_rate || 0)}%
                          </Typography>
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={stage.approval_rate || 0} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: stage.approval_rate > 80 ? 'success.main' : 
                                      stage.approval_rate > 60 ? 'warning.main' : 'error.main'
                            }
                          }}
                        />
                        
                        {stage.pending_count > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 1, mb: 1 }}>
                              <Typography variant="caption" color="warning.dark" fontWeight="bold">
                                ⚠️ 주의: {stage.pending_count}개 항목이 이 단계에서 대기 중
                              </Typography>
                            </Box>
                            
                            {stage.pending_items && stage.pending_items.length > 0 && (
                              <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                                  🔍 대기 중인 항목들:
                                </Typography>
                                {stage.pending_items.slice(0, 3).map((item, idx) => (
                                  <Box key={idx} sx={{ 
                                    p: 1, 
                                    mb: 0.5, 
                                    bgcolor: 'background.paper', 
                                    borderRadius: 0.5,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                  }}>
                                    <Typography variant="caption" fontWeight="bold" display="block">
                                      {item.title.length > 30 ? `${item.title.substring(0, 30)}...` : item.title}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Chip 
                                        label={item.priority} 
                                        size="small" 
                                        color={
                                          item.priority === 'urgent' ? 'error' :
                                          item.priority === 'high' ? 'warning' : 'default'
                                        }
                                        sx={{ fontSize: '0.6rem', height: 16 }}
                                      />
                                      <Typography variant="caption" color="error">
                                        {item.waiting_hours}시간 대기
                                      </Typography>
                                    </Box>
                                  </Box>
                                ))}
                                {stage.pending_items.length > 3 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    ...외 {stage.pending_items.length - 3}개 더
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        📊 워크플로우 데이터를 로드하는 중입니다...
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 최근 활동 타임라인 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 활동
              </Typography>
              
              <List>
                {flowData.recent_activities.slice(0, 8).map((activity, index) => (
                  <ListItem key={activity.id} alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: getStatusColor(activity.status) === 'success' ? 'success.main' :
                                getStatusColor(activity.status) === 'error' ? 'error.main' :
                                getStatusColor(activity.status) === 'warning' ? 'warning.main' : 'info.main'
                      }}>
                        {getStatusIcon(activity.status)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" component="span">
                            {activity.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(activity.created_at)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {activity.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {activity.user_name}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 성과 지표 */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                성과 지표
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="primary">
                      {flowData.avg_approval_time}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      평균 승인 시간
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main">
                      {Math.round(flowData.approval_rate)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      전체 승인율
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" color="warning.main">
                      {flowData.pending_requests}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      현재 대기 건수
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ApprovalFlowVisualization;
