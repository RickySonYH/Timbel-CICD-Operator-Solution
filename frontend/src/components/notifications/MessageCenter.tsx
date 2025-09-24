import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Paper,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 알림 통계 타입 정의 (QC/QA 피드백 포함)
interface NotificationStats {
  my_pending_approvals: number;
  my_pending_requests: number;
  unread_messages: number;
  total_notifications: number;
  role_specific_stats?: {
    pending_approvals: number;
    approved_projects: number;
    rejected_projects: number;
    total_projects: number;
  };
  qc_feedback_stats?: {
    new_feedbacks: number;
    pending_responses: number;
    completed_feedbacks: number;
  };
}

// [advice from AI] 알림 아이템 타입 정의
interface NotificationItem {
  id: string;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

const MessageCenter: React.FC = () => {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useJwtAuthStore();

  // [advice from AI] 메시지 생성 관련 상태
  const [createMessageDialog, setCreateMessageDialog] = useState(false);
  const [messageForm, setMessageForm] = useState({
    title: '',
    message: '',
    messageType: 'info',
    priority: 1,
    recipients: [] as any[]
  });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [submittingMessage, setSubmittingMessage] = useState(false);

  // [advice from AI] 동적 API URL 결정 로직
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3001';
    } else {
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };

  // [advice from AI] 경로 변경 감지 디버깅
  useEffect(() => {
    console.log('📍 MessageCenter - 현재 경로 변경됨:', location.pathname);
    console.log('📍 MessageCenter - 전체 URL:', window.location.href);
  }, [location.pathname]);

  // [advice from AI] 알림 데이터 로드
  const loadNotificationData = async () => {
    if (!user || !token) {
      console.log('❌ 사용자 또는 토큰이 없음:', { user: !!user, token: !!token });
      return;
    }

    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      console.log('📡 알림 데이터 로드 시작:', apiUrl);

      // 기본 알림 통계 및 메시지 로드 (QC/QA 피드백 포함)
      const apiCalls = [
        fetch(`${apiUrl}/api/notifications/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/notifications?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ];

      // PE 또는 QA 사용자인 경우 QC/QA 피드백 통계도 로드
      if (user?.roleType === 'pe' || user?.roleType === 'qa') {
        apiCalls.push(
          fetch(`${apiUrl}/api/notifications/feedback-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${apiUrl}/api/notifications/feedback-messages?limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        );
      }

      const responses = await Promise.all(apiCalls);
      const [statsResponse, notificationsResponse, feedbackStatsResponse, feedbackMessagesResponse] = responses;

      console.log('📊 API 응답 상태:', {
        stats: statsResponse.status,
        notifications: notificationsResponse.status
      });

      // 기본 통계 처리
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📊 통계 데이터:', statsData);
        setStats(statsData);
      } else {
        console.error('❌ 통계 API 실패:', statsResponse.status, statsResponse.statusText);
      }

      // 기본 알림 처리
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        console.log('📨 알림 데이터:', notificationsData);
        setRecentNotifications(notificationsData.data || []);
      } else {
        console.error('❌ 알림 API 실패:', notificationsResponse.status, notificationsResponse.statusText);
      }

      // QC/QA 피드백 통계 처리
      if (feedbackStatsResponse && feedbackStatsResponse.ok) {
        const feedbackStatsData = await feedbackStatsResponse.json();
        console.log('📊 QC/QA 피드백 통계:', feedbackStatsData);
        
        // 기존 통계와 QC/QA 피드백 통계 병합
        setStats(prevStats => ({
          ...(prevStats || {}),
          ...feedbackStatsData.data,
          total_notifications: ((prevStats?.total_notifications || 0) + (feedbackStatsData.data.total_notifications || 0))
        }));
      }

      // QC/QA 피드백 메시지 처리
      if (feedbackMessagesResponse && feedbackMessagesResponse.ok) {
        const feedbackMessagesData = await feedbackMessagesResponse.json();
        console.log('📨 QC/QA 피드백 메시지:', feedbackMessagesData);
        
        // 기존 알림과 QC/QA 피드백 메시지 병합
        setRecentNotifications(prevNotifications => [
          ...prevNotifications,
          ...(feedbackMessagesData.data || []).map((msg: any) => ({
            id: msg.id,
            subject: msg.title,
            content: msg.content,
            message_type: msg.message_type,
            priority: msg.priority,
            created_at: msg.created_at,
            is_read: msg.is_read,
            sender_name: msg.sender_name,
            project_name: msg.project_name,
            feedback_title: msg.feedback_title,
            feedback_status: msg.feedback_status,
            severity_level: msg.severity_level
          }))
        ]);
      }

      // 초기 필터링된 알림 설정은 useEffect에서 처리

    } catch (error) {
      console.error('❌ 알림 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadNotificationData();
    
    // 30초마다 데이터 새로고침
    const interval = setInterval(loadNotificationData, 30000);
    
    return () => clearInterval(interval);
  }, [user, token]);

  // [advice from AI] recentNotifications 변경 시 filteredNotifications 초기화
  useEffect(() => {
    setFilteredNotifications(recentNotifications);
  }, [recentNotifications]);

  // [advice from AI] 현황 카드 클릭 처리
  const handleCardClick = (cardType: string) => {
    console.log('📊 현황 카드 클릭:', cardType);
    
    // 카드 타입에 따라 필터링된 알림 목록 표시
    switch (cardType) {
      case 'pending_approvals':
        setFilteredNotifications(recentNotifications.filter(n => 
          n.message_type === 'approval_request' && !n.is_read
        ));
        break;
      case 'pending_requests':
        setFilteredNotifications(recentNotifications.filter(n => 
          n.message_type === 'work_request' && !n.is_read
        ));
        break;
      case 'unread_messages':
        setFilteredNotifications(recentNotifications.filter(n => !n.is_read));
        break;
      case 'all_notifications':
        setFilteredNotifications(recentNotifications);
        break;
      default:
        setFilteredNotifications(recentNotifications);
    }
  };

  // [advice from AI] 알림 클릭 시 처리 (읽음 처리 및 상세 보기)
  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      console.log('🔔 알림 클릭:', notification);
      
      // 읽음 처리
      if (!notification.is_read) {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/api/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // 로컬 상태 업데이트
        setRecentNotifications(prev => 
          prev.map(item => 
            item.id === notification.id 
              ? { ...item, is_read: true }
              : item
          )
        );
      }

      // 알림 타입별 처리
      const messageType = (notification as any).message_type || notification.type;
      if (messageType === 'deletion_approval') {
        // 삭제 승인 요청인 경우 - 이미 승인/거부 버튼이 있으므로 추가 처리 없음
        return;
      } else if (messageType === 'project_created') {
        // 프로젝트 생성 알림인 경우 프로젝트 관리 페이지로 이동
        navigate('/admin/approvals');
      } else if (messageType === 'project_approved') {
        // 프로젝트 승인 완료 알림인 경우 프로젝트 목록으로 이동
        navigate('/admin/approvals/projects');
      } else if (messageType === 'urgent_project') {
        // 긴급 프로젝트 알림인 경우 프로젝트 관리 페이지로 이동
        navigate('/admin/approvals');
      } else if (messageType === 'project_completed') {
        // 프로젝트 완료 알림인 경우 프로젝트 목록으로 이동
        navigate('/admin/approvals/projects');
      }
    } catch (error) {
      console.error('알림 처리 실패:', error);
    }
  };

  // [advice from AI] 삭제 승인 처리
  const handleDeletionApproval = async (messageId: string, action: 'approved' | 'rejected') => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/notifications/approve/${messageId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        // 성공 시 알림 목록 새로고침
        loadNotificationData();
      } else {
        console.error('승인 처리 실패');
      }
    } catch (error) {
      console.error('승인 처리 중 오류:', error);
    }
  };

  // [advice from AI] 우선순위별 색상 반환
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  // [advice from AI] 우선순위별 아이콘 반환
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <CheckIcon />;
      default: return <NotificationsIcon />;
    }
  };

  // [advice from AI] 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  // [advice from AI] 사용자 목록 로드
  const loadAvailableUsers = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/users/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('❌ 사용자 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 메시지 생성 다이얼로그 열기
  const handleOpenCreateMessage = () => {
    setCreateMessageDialog(true);
    loadAvailableUsers();
  };

  // [advice from AI] 메시지 생성
  const handleCreateMessage = async () => {
    if (!messageForm.title.trim() || !messageForm.message.trim() || messageForm.recipients.length === 0) {
      alert('제목, 내용, 수신자를 모두 입력해주세요.');
      return;
    }

    try {
      setSubmittingMessage(true);

      const response = await fetch(`${getApiUrl()}/api/messages/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: messageForm.title,
          message: messageForm.message,
          messageType: messageForm.messageType,
          priority: messageForm.priority,
          recipients: messageForm.recipients.map(user => user.id),
          eventCategory: 'manual_message',
          eventSource: 'user'
        })
      });

      if (response.ok) {
        console.log('✅ 메시지 생성 완료');
        setCreateMessageDialog(false);
        setMessageForm({
          title: '',
          message: '',
          messageType: 'info',
          priority: 1,
          recipients: []
        });
        // 알림 목록 새로고침
        await loadNotificationData();
        alert('메시지가 성공적으로 전송되었습니다.');
      } else {
        const error = await response.json();
        console.error('❌ 메시지 생성 실패:', error);
        alert(`메시지 전송 실패: ${error.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 메시지 생성 중 오류:', error);
      alert('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setSubmittingMessage(false);
    }
  };

  // [advice from AI] 로그인하지 않은 사용자 처리
  if (!user || !token) {
    return (
      <Box sx={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            로그인이 필요합니다
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            메시지 센터를 사용하려면 먼저 로그인해주세요.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            startIcon={<NotificationsIcon />}
          >
            로그인하기
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* [advice from AI] 메시지 센터 헤더 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, alignSelf: 'flex-start' }}>
            메시지 센터
          </Typography>
          
          {/* [advice from AI] 빠른 네비게이션 버튼들 */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleOpenCreateMessage}
              data-testid="create-message-button"
              sx={{ 
                backgroundColor: 'primary.main',
                '&:hover': { backgroundColor: 'primary.dark' }
              }}
            >
              메시지 생성
            </Button>
          </Box>
        </Box>

        {/* [advice from AI] 통계 카드들 */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => handleCardClick('pending_approvals')}
              >
                <CardContent>
                  <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                    내 승인 대기
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.my_pending_approvals || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    승인이 필요한 항목
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => handleCardClick('pending_requests')}
              >
                <CardContent>
                  <Typography variant="h6" color="secondary" sx={{ mb: 1 }}>
                    내 요청 대기
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.my_pending_requests || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    처리 대기 중인 요청
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => handleCardClick('unread_messages')}
              >
                <CardContent>
                  <Typography variant="h6" color="warning.main" sx={{ mb: 1 }}>
                    읽지 않은 메시지
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.unread_messages || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    확인하지 않은 알림
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => handleCardClick('all_notifications')}
              >
                <CardContent>
                  <Typography variant="h6" color="success.main" sx={{ mb: 1 }}>
                    총 알림
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {(stats.total_notifications || 0).toString().padStart(2, '0')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 알림 수
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* QC/QA 피드백 통계 (PE/QA 사용자만) */}
            {(user?.roleType === 'pe' || user?.roleType === 'qa') && stats.qc_feedback_stats && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1, color: '#d32f2f' }}>
                        신규 피드백
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                        {stats.qc_feedback_stats.new_feedbacks || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.roleType === 'pe' ? '새로 받은 피드백' : '새로운 QC 요청'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1, color: '#ed6c02' }}>
                        처리 중
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ed6c02' }}>
                        {stats.qc_feedback_stats.pending_responses || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.roleType === 'pe' ? '응답 대기 중' : '진행 중인 검증'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1, color: '#2e7d32' }}>
                        완료
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {stats.qc_feedback_stats.completed_feedbacks || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.roleType === 'pe' ? '수정 완료' : '검증 완료'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        )}
      </Paper>

      {/* [advice from AI] 알림 리스트 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          최근 알림
        </Typography>
            
        {/* 알림 목록 */}
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              로딩 중...
            </Typography>
          </Box>
        ) : filteredNotifications.length > 0 ? (
          <List sx={{ py: 0 }}>
            {filteredNotifications.map((notification: NotificationItem, index: number) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    backgroundColor: notification.is_read ? 'transparent' : 'rgba(25, 118, 210, 0.04)',
                    '&:hover': {
                      backgroundColor: notification.is_read ? 'rgba(0, 0, 0, 0.04)' : 'rgba(25, 118, 210, 0.08)'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: getPriorityColor(notification.priority),
                      }}
                    >
                      {getPriorityIcon(notification.priority)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {(notification as any).title || notification.subject || '알림'}
                        </Typography>
                        {!notification.is_read && (
                          <Chip
                            label="NEW"
                            size="small"
                            color="error"
                            sx={{ fontSize: '0.6rem', height: 16 }}
                          />
                        )}
                        <Chip
                          label={(notification as any).message_type || notification.type || 'info'}
                          size="small"
                          sx={{ 
                            fontSize: '0.6rem', 
                            height: 16,
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2'
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography component="span" variant="body2" color="text.primary" sx={{ fontWeight: 400 }}>
                          {(notification as any).message || notification.content || '내용이 없습니다.'}
                        </Typography>
                        <Typography 
                          component="span" 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: '0.7rem', display: 'block' }}
                        >
                          {new Date(notification.created_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                        
                        {/* 삭제 승인 요청인 경우 승인/거부 버튼 표시 (관리자/PO만) */}
                        {((notification as any).message_type === 'deletion_approval' || notification.type === 'deletion_approval') && !notification.is_read && 
                         (user?.roleType === 'admin' || user?.roleType === 'executive' || user?.roleType === 'po') && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletionApproval(notification.id, 'approved');
                              }}
                              sx={{ minWidth: 60, fontSize: '0.7rem' }}
                            >
                              승인
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletionApproval(notification.id, 'rejected');
                              }}
                              sx={{ minWidth: 60, fontSize: '0.7rem' }}
                            >
                              거부
                            </Button>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < recentNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CheckIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              모든 알림을 확인했습니다
            </Typography>
          </Box>
        )}
      </Box>

      {/* [advice from AI] 메시지 생성 다이얼로그 */}
      <Dialog
        open={createMessageDialog}
        onClose={() => setCreateMessageDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '60vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          pb: 2
        }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            새 메시지 작성
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* 제목 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="제목"
                value={messageForm.title}
                onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                variant="outlined"
                required
              />
            </Grid>

            {/* 메시지 타입 및 우선순위 */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>메시지 타입</InputLabel>
                <Select
                  value={messageForm.messageType}
                  label="메시지 타입"
                  onChange={(e) => setMessageForm(prev => ({ ...prev, messageType: e.target.value }))}
                >
                  <MenuItem value="info">정보</MenuItem>
                  <MenuItem value="success">성공</MenuItem>
                  <MenuItem value="warning">경고</MenuItem>
                  <MenuItem value="error">오류</MenuItem>
                  <MenuItem value="urgent">긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={messageForm.priority}
                  label="우선순위"
                  onChange={(e) => setMessageForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                >
                  <MenuItem value={1}>낮음</MenuItem>
                  <MenuItem value={2}>보통</MenuItem>
                  <MenuItem value={3}>높음</MenuItem>
                  <MenuItem value={4}>긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 수신자 선택 */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={availableUsers}
                getOptionLabel={(option) => `${option.full_name} (${option.role_type})`}
                value={messageForm.recipients}
                onChange={(event, newValue) => {
                  setMessageForm(prev => ({ ...prev, recipients: newValue }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="수신자 선택"
                    placeholder="수신자를 선택하세요"
                    required
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={`${option.full_name} (${option.role_type})`}
                      {...getTagProps({ index })}
                      key={option.id}
                    />
                  ))
                }
              />
            </Grid>

            {/* 메시지 내용 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="메시지 내용"
                value={messageForm.message}
                onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                variant="outlined"
                multiline
                rows={6}
                required
                placeholder="메시지 내용을 입력하세요..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setCreateMessageDialog(false)}
            variant="outlined"
          >
            취소
          </Button>
          <Button
            onClick={handleCreateMessage}
            variant="contained"
            disabled={submittingMessage || !messageForm.title.trim() || !messageForm.message.trim() || messageForm.recipients.length === 0}
            sx={{
              backgroundColor: 'primary.main',
              '&:hover': { backgroundColor: 'primary.dark' }
            }}
          >
            {submittingMessage ? <CircularProgress size={20} color="inherit" /> : '메시지 전송'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MessageCenter;