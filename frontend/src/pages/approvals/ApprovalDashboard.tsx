// [advice from AI] 승인 대시보드 메인 페이지
// 내가 승인해야 할 항목들, 내가 요청한 승인 상태, 팀/부서별 승인 현황을 통합 관리

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Badge,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  HowToVote as VoteIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  ThumbUp as ApproveIcon,
  ThumbDown as RejectIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import ApprovalRequestDetail from '../../components/approvals/ApprovalRequestDetail';
import ApprovalRequestCreate from '../../components/approvals/ApprovalRequestCreate';
import ApprovalFlowVisualization from '../../components/approvals/ApprovalFlowVisualization';
import TeamApprovalStatus from '../../components/approvals/TeamApprovalStatus';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ApprovalRequest {
  id: string;
  request_id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  requester_name: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  urgency_status?: string;
}

interface DashboardStats {
  my_requests: {
    total: string;
    pending: string;
    approved: string;
    rejected: string;
  };
  my_approvals: {
    total: string;
    pending: string;
    approved: string;
    rejected: string;
  };
  my_decisions: {
    total: string;
    open: string;
    voting: string;
    decided: string;
  };
  unread_messages: number;
}

const ApprovalDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();

  // [advice from AI] 데이터 로드
  const loadDashboardData = async () => {
    if (!user || !token) {
      console.log('사용자 또는 토큰이 없습니다:', { user, token: token ? '있음' : '없음' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('승인 대시보드 데이터 로드 시작...');
      
      // [advice from AI] 병렬로 모든 데이터 로드
      const [statsResponse, pendingResponse, requestsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/approvals/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/approvals/requests?my_approvals=true&status=pending&limit=10', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/approvals/requests?my_requests=true&limit=20', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      console.log('API 응답 상태:', {
        stats: statsResponse.status,
        pending: pendingResponse.status,
        requests: requestsResponse.status
      });

      // [advice from AI] 통계 데이터 처리
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('통계 데이터:', statsData);
        if (statsData.success) {
          setStats(statsData.data);
        }
      } else {
        console.error('통계 API 오류:', statsResponse.status, await statsResponse.text());
      }

      // [advice from AI] 내가 승인해야 할 항목들
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        console.log('승인 대기 데이터:', pendingData);
        if (pendingData.success) {
          setPendingApprovals(pendingData.data);
        }
      } else {
        console.error('승인 대기 API 오류:', pendingResponse.status, await pendingResponse.text());
      }

      // [advice from AI] 내가 요청한 승인들
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        console.log('내 요청 데이터:', requestsData);
        if (requestsData.success) {
          setMyRequests(requestsData.data);
        }
      } else {
        console.error('내 요청 API 오류:', requestsResponse.status, await requestsResponse.text());
      }

    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, token]);

  // [advice from AI] 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // [advice from AI] 승인 요청 상세 보기
  const handleViewRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setDetailDialogOpen(true);
  };

  // [advice from AI] 승인 요청 생성
  const handleCreateRequest = () => {
    setCreateDialogOpen(true);
  };

  // [advice from AI] 승인 상태 변경 후 데이터 새로고침
  const handleStatusChange = () => {
    loadDashboardData();
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 긴급도별 아이콘
  const getUrgencyIcon = (urgencyStatus: string) => {
    switch (urgencyStatus) {
      case 'overdue': return <WarningIcon color="error" />;
      case 'urgent': return <ScheduleIcon color="warning" />;
      default: return null;
    }
  };

  // [advice from AI] 시간 포맷팅
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        승인 대시보드
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 통계 카드들 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {stats.my_approvals?.pending || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      승인 대기
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <VoteIcon color="secondary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="secondary">
                      {stats.my_requests?.pending || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      요청 대기
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {stats.my_requests?.approved || '0'}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <WarningIcon color="error" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="error">
                      0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      기한 초과
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 탭 네비게이션 */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab 
              label={
                <Badge badgeContent={parseInt(stats?.my_approvals?.pending || '0')} color="error">
                  처리 대기
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={parseInt(stats?.my_requests?.pending || '0')} color="primary">
                  요청 현황
                </Badge>
              } 
            />
            <Tab label="팀/부서별 승인 현황" />
            <Tab label="승인 체계 흐름" />
          </Tabs>
        </Box>

        {/* [advice from AI] 탭 1: 처리 대기 목록 */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              처리 대기 목록
            </Typography>
            <Typography variant="body2" color="text.secondary">
              승인 또는 반려 처리가 필요한 항목들
            </Typography>
          </Box>

          {pendingApprovals.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>제목</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>요청자</TableCell>
                    <TableCell>우선순위</TableCell>
                    <TableCell>요청일</TableCell>
                    <TableCell>처리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingApprovals.map((approval) => (
                    <TableRow 
                      key={approval.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewRequest(approval.request_id)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getUrgencyIcon(approval.urgency_status || '')}
                          <Typography variant="body2" fontWeight="bold">
                            {approval.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{approval.requester_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.priority}
                          color={getPriorityColor(approval.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(approval.created_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="상세보기 및 처리">
                            <IconButton 
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewRequest(approval.request_id);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              처리할 승인 항목이 없습니다.
            </Alert>
          )}
        </TabPanel>

        {/* [advice from AI] 탭 2: 요청 현황 */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              요청 현황
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained" 
                onClick={handleCreateRequest}
              >
                새 승인 요청
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/test/message-center')}
              >
                테스트
              </Button>
            </Box>
          </Box>

          {myRequests.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>제목</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>우선순위</TableCell>
                    <TableCell>최종 결과</TableCell>
                    <TableCell>처리 시간</TableCell>
                    <TableCell>요청일</TableCell>
                    <TableCell>상세</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myRequests.map((request) => (
                    <TableRow 
                      key={request.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleViewRequest(request.request_id)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {request.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={request.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={request.priority}
                          color={getPriorityColor(request.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={
                              request.status === 'approved' ? '✅ 승인됨' :
                              request.status === 'rejected' ? '❌ 반려됨' :
                              request.status === 'pending' ? '⏳ 처리 대기' :
                              request.status
                            }
                            color={getStatusColor(request.status) as any}
                            size="small"
                            sx={{ 
                              fontWeight: 'bold',
                              minWidth: '100px'
                            }}
                          />
                          {request.status !== 'pending' && (
                            <Typography variant="caption" color="text.secondary">
                              최종결과
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {request.status !== 'pending' ? formatDateTime(request.updated_at) : '진행 중'}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDateTime(request.created_at)}</TableCell>
                      <TableCell>
                        <Tooltip title="상세보기">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewRequest(request.request_id);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              요청한 승인이 없습니다.
            </Alert>
          )}
        </TabPanel>

        {/* [advice from AI] 탭 3: 팀/부서별 승인 현황 */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">
              팀/부서별 승인 현황
            </Typography>
            <Typography variant="body2" color="text.secondary">
              조직 단위의 승인 성과와 병목 지점을 분석합니다.
            </Typography>
          </Box>

          <TeamApprovalStatus />
        </TabPanel>

        {/* [advice from AI] 탭 4: 승인 체계 흐름 */}
        <TabPanel value={currentTab} index={3}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">
              승인 체계 흐름 및 성과 지표
            </Typography>
            <Typography variant="body2" color="text.secondary">
              실시간 승인 흐름 현황과 성과 지표를 확인할 수 있습니다.
            </Typography>
          </Box>

          <ApprovalFlowVisualization />
        </TabPanel>
      </Card>


      {/* [advice from AI] 승인 요청 상세 보기 다이얼로그 */}
      {selectedRequestId && (
        <ApprovalRequestDetail
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedRequestId(null);
          }}
          requestId={selectedRequestId}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* [advice from AI] 승인 요청 생성 다이얼로그 */}
      <ApprovalRequestCreate
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleStatusChange}
      />
    </Box>
  );
};

export default ApprovalDashboard;
