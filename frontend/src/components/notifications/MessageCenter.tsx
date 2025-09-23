import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
  Vote as VoteIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 알림 통계 타입 정의
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();

  // [advice from AI] 동적 API URL 결정 로직
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3000';
    } else if (currentHost.includes('rdc.rickyson.com')) {
      return 'http://rdc.rickyson.com:3000';
    } else {
      return `http://${currentHost}`;
    }
  };

  // [advice from AI] 알림 데이터 로드
  const loadNotificationData = async () => {
    if (!user || !token) return;

    try {
      setLoading(true);
      const apiUrl = getApiUrl();

      // 기본 알림 통계 및 메시지 로드
      const [statsResponse, notificationsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/notifications/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/notifications?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setRecentNotifications(notificationsData.notifications || []);
      }

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

  // [advice from AI] 알림 클릭 시 처리 (읽음 처리 및 상세 보기)
  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
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
      if (notification.type === 'deletion_approval') {
        // 삭제 승인 요청인 경우 - 이미 승인/거부 버튼이 있으므로 추가 처리 없음
        return;
      } else if (notification.type === 'project_created') {
        // 프로젝트 생성 알림인 경우 프로젝트 관리 페이지로 이동
        navigate('/admin/approvals');
      } else if (notification.type === 'project_approved') {
        // 프로젝트 승인 완료 알림인 경우 프로젝트 목록으로 이동
        navigate('/admin/approvals/projects');
      } else if (notification.type === 'urgent_project') {
        // 긴급 프로젝트 알림인 경우 프로젝트 관리 페이지로 이동
        navigate('/admin/approvals');
      } else if (notification.type === 'project_completed') {
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            메시지 센터
          </Typography>
          
          {/* [advice from AI] 빠른 네비게이션 버튼들 */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/')}
            >
              홈
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/knowledge/dashboard')}
            >
              지식자원 카탈로그
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/vibe-studio')}
            >
              VibeStudio
            </Button>
            {(user?.roleType === 'admin' || user?.roleType === 'executive') && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/admin')}
              >
                관리자 대시보드
              </Button>
            )}
          </Box>
        </Box>

        {/* [advice from AI] 통계 카드들 */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
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
              <Card>
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
              <Card>
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
              <Card>
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
        ) : recentNotifications.length > 0 ? (
          <List sx={{ py: 0 }}>
            {recentNotifications.map((notification: NotificationItem, index: number) => (
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
                          {notification.subject}
                        </Typography>
                        {!notification.is_read && (
                          <Chip
                            label="NEW"
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.6rem', height: 16 }}
                          />
                        )}
                        <Chip
                          label={notification.priority}
                          size="small"
                          sx={{ 
                            fontSize: '0.6rem', 
                            height: 16,
                            backgroundColor: getPriorityColor(notification.priority),
                            color: 'white'
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography component="span" variant="body2" color="text.secondary">
                          {notification.content}
                        </Typography>
                        <Typography 
                          component="span" 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: '0.7rem', display: 'block' }}
                        >
                          {formatTime(notification.created_at)}
                        </Typography>
                        
                        {/* 삭제 승인 요청인 경우 승인/거부 버튼 표시 (관리자/PO만) */}
                        {notification.type === 'deletion_approval' && !notification.is_read && 
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
    </Box>
  );
};

export default MessageCenter;