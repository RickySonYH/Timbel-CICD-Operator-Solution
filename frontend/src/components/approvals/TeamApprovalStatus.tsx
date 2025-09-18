// [advice from AI] 팀/부서별 승인 현황 컴포넌트
// 조직 단위의 승인 현황과 성과 지표를 실시간으로 표시

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import {
  Business as DepartmentIcon,
  Group as TeamIcon,
  TrendingUp as TrendIcon,
  Schedule as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Assignment as RequestIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface DepartmentStats {
  department_id: string;
  department_name: string;
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  approval_rate: number;
  avg_processing_time: number;
  pending_by_stage: StageStats[];
  top_approvers: ApproverStats[];
  recent_activities: RecentActivity[];
}

interface StageStats {
  stage: number;
  stage_name: string;
  pending_count: number;
  avg_time_hours: number;
}

interface ApproverStats {
  approver_id: string;
  approver_name: string;
  role_type: string;
  pending_count: number;
  processed_count: number;
  approval_rate: number;
  avg_response_time: number;
}

interface RecentActivity {
  request_id: string;
  title: string;
  action: string;
  actor_name: string;
  created_at: string;
}

const TeamApprovalStatus: React.FC = () => {
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useJwtAuthStore();

  // [advice from AI] 팀/부서별 승인 현황 데이터 로드
  const loadTeamStats = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/approvals/team/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDepartmentStats(data.data);
        }
      } else {
        setError('팀/부서별 승인 현황을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('팀 승인 현황 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamStats();
    // [advice from AI] 자동 갱신 제거 - 무한 루프 방지
    // const interval = setInterval(loadTeamStats, 60000);
    // return () => clearInterval(interval);
  }, [token]);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // [advice from AI] 승인율에 따른 색상
  const getApprovalRateColor = (rate: number) => {
    if (rate >= 80) return 'success.main';
    if (rate >= 60) return 'warning.main';
    return 'error.main';
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  const filteredStats = selectedDepartment === 'all' 
    ? departmentStats 
    : departmentStats.filter(dept => dept.department_id === selectedDepartment);

  return (
    <Box>
      {/* [advice from AI] 부서 선택 및 새로고침 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>부서 선택</InputLabel>
          <Select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <MenuItem value="all">전체 부서</MenuItem>
            {departmentStats.map((dept) => (
              <MenuItem key={dept.department_id} value={dept.department_id}>
                {dept.department_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadTeamStats}
        >
          새로고침
        </Button>
      </Box>

      {/* [advice from AI] 부서별 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {filteredStats.map((dept) => (
          <Grid item xs={12} md={6} lg={4} key={dept.department_id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <DepartmentIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {dept.department_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      총 {dept.total_requests}건 요청
                    </Typography>
                  </Box>
                </Box>

                {/* [advice from AI] 처리 현황 */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main">
                        {dept.pending_requests}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        대기
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">
                        {dept.approved_requests}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        승인
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main">
                        {dept.rejected_requests}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        반려
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* [advice from AI] 승인율 */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">승인율</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {Math.round(dept.approval_rate)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={dept.approval_rate} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getApprovalRateColor(dept.approval_rate)
                      }
                    }}
                  />
                </Box>

                {/* [advice from AI] 평균 처리시간 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    평균 처리시간
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dept.avg_processing_time}시간
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 상세 분석 */}
      {selectedDepartment !== 'all' && filteredStats.length > 0 && (
        <Grid container spacing={3}>
          {/* [advice from AI] 단계별 병목 현황 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🚨 단계별 병목 현황
                </Typography>
                
                {filteredStats[0].pending_by_stage.map((stage) => (
                  <Box key={stage.stage} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2">
                        {stage.stage_name}
                      </Typography>
                      <Chip 
                        label={`${stage.pending_count}건 대기`}
                        size="small"
                        color={stage.pending_count > 0 ? 'error' : 'success'}
                      />
                    </Box>
                    
                    {stage.pending_count > 0 && (
                      <Box sx={{ p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                        <Typography variant="caption" color="error.dark">
                          ⚠️ {stage.pending_count}개 항목이 평균 {stage.avg_time_hours}시간 대기 중
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* [advice from AI] 주요 승인자 현황 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  👥 주요 승인자 현황
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>승인자</TableCell>
                        <TableCell>대기</TableCell>
                        <TableCell>처리</TableCell>
                        <TableCell>승인율</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStats[0].top_approvers.map((approver) => (
                        <TableRow key={approver.approver_id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                <PersonIcon sx={{ fontSize: 14 }} />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {approver.approver_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {approver.role_type}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={approver.pending_count}
                              size="small"
                              color={approver.pending_count > 0 ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {approver.processed_count}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              color={getApprovalRateColor(approver.approval_rate)}
                              fontWeight="bold"
                            >
                              {Math.round(approver.approval_rate)}%
                            </Typography>
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

      {/* [advice from AI] 전체 부서 비교 테이블 */}
      {selectedDepartment === 'all' && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 부서별 승인 성과 비교
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>부서명</TableCell>
                    <TableCell>총 요청</TableCell>
                    <TableCell>대기 중</TableCell>
                    <TableCell>승인</TableCell>
                    <TableCell>반려</TableCell>
                    <TableCell>승인율</TableCell>
                    <TableCell>평균 처리시간</TableCell>
                    <TableCell>성과</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departmentStats
                    .sort((a, b) => b.approval_rate - a.approval_rate)
                    .map((dept) => (
                    <TableRow key={dept.department_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DepartmentIcon color="primary" />
                          <Typography variant="body2" fontWeight="bold">
                            {dept.department_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {dept.total_requests}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={dept.pending_requests}
                          size="small"
                          color={dept.pending_requests > 0 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main">
                          {dept.approved_requests}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="error.main">
                          {dept.rejected_requests}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color={getApprovalRateColor(dept.approval_rate)}
                          >
                            {Math.round(dept.approval_rate)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={dept.approval_rate} 
                            sx={{ 
                              width: 50, 
                              height: 4,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getApprovalRateColor(dept.approval_rate)
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {dept.avg_processing_time}시간
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            dept.approval_rate >= 80 ? '우수' :
                            dept.approval_rate >= 60 ? '보통' : '개선필요'
                          }
                          size="small"
                          color={
                            dept.approval_rate >= 80 ? 'success' :
                            dept.approval_rate >= 60 ? 'warning' : 'error'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TeamApprovalStatus;
