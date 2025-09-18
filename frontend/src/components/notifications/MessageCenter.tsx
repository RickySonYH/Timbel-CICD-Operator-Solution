// [advice from AI] 상단 헤더의 메시지 센터 컴포넌트
// 승인 대기, 의사결정 요청, 알림 카운트 표시 및 드롭다운 메뉴

import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Assignment as AssignmentIcon,
  HowToVote as VoteIcon,
  Message as MessageIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface NotificationStats {
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

interface NotificationItem {
  id: string;
  type: 'approval_request' | 'approval_response' | 'decision_request' | 'message';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  is_read: boolean;
  request_id?: string;
}

const MessageCenter: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();

  // [advice from AI] 동적 API URL 결정 로직
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      // 내부 접속 - 직접 백엔드 포트로
      return 'http://localhost:3001';
    } else {
      // 외부 접속 - Nginx 프록시를 통해
      return '';  // 상대 경로 사용
    }
  };

  const open = Boolean(anchorEl);

  // [advice from AI] 알림 통계 및 최근 알림 로드
  const loadNotificationData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (!token) return;

      // [advice from AI] 병렬로 데이터 로드
      const [statsResponse, notificationsResponse] = await Promise.all([
        fetch('/api/approvals/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${getApiUrl()}/api/approvals/messages?limit=10&is_read=false`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        if (notificationsData.success) {
          setRecentNotifications(notificationsData.data.slice(0, 5)); // 최근 5개만
        }
      }

    } catch (error) {
      console.error('알림 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드 - 오류 처리 개선한 자동 갱신
  useEffect(() => {
    if (!user || !token) return;
    
    loadNotificationData();
    
    // [advice from AI] 60초마다 자동 갱신 (오류 시에도 계속 시도하지만 로그만 남김)
    const interval = setInterval(() => {
      if (user && token) {
        loadNotificationData();
      }
    }, 60000); // 30초 → 60초로 늘려서 부하 감소
    
    return () => clearInterval(interval);
  }, [user, token]);

  // [advice from AI] 메뉴 열기/닫기
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (!open) {
      loadNotificationData(); // 메뉴 열 때마다 최신 데이터 로드
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // [advice from AI] 전체 알림 카운트 계산
  const getTotalNotificationCount = () => {
    if (!stats) return 0;
    return (
      parseInt(stats.my_approvals?.pending || '0') +
      (stats.unread_messages || 0)
    );
  };

  // [advice from AI] 긴급 알림 카운트 계산
  const getUrgentNotificationCount = () => {
    if (!stats) return 0;
    return 0; // 긴급 알림은 별도 구현 필요
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#1976d2';
      case 'low': return '#388e3c';
      default: return '#666666';
    }
  };

  // [advice from AI] 알림 타입별 아이콘
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_request': return <AssignmentIcon fontSize="small" />;
      case 'decision_request': return <VoteIcon fontSize="small" />;
      case 'message': return <MessageIcon fontSize="small" />;
      default: return <NotificationsIcon fontSize="small" />;
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

  const totalCount = getTotalNotificationCount();
  const urgentCount = getUrgentNotificationCount();

  return (
    <>
      <Tooltip title="메시지 센터">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ 
            mr: 1,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <Badge 
            badgeContent={totalCount} 
            color={urgentCount > 0 ? "error" : "primary"}
            max={99}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1.5,
            '& .MuiMenuItem-root': {
              padding: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* [advice from AI] 메시지 센터 헤더 */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            메시지 센터
          </Typography>
          {stats && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip 
                label={`승인 대기 ${stats.my_approvals?.pending || '0'}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`읽지 않음 ${stats.unread_messages || 0}`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            </Box>
          )}
        </Box>

        {/* [advice from AI] 빠른 액션 버튼들 */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<AssignmentIcon />}
              onClick={() => {
                handleClose();
                navigate('/approvals/dashboard');
              }}
              sx={{ flex: 1 }}
            >
              승인 대기
            </Button>
            <Button
              size="small"
              startIcon={<VoteIcon />}
              onClick={() => {
                handleClose();
                navigate('/test/message-center');
              }}
              sx={{ flex: 1 }}
            >
              테스트
            </Button>
          </Box>
        </Box>

        {/* [advice from AI] Phase 4: 최근 알림 목록 (3개만 표시) */}
        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                로딩 중...
              </Typography>
            </Box>
          ) : recentNotifications.length > 0 ? (
            <List sx={{ py: 0 }}>
                {recentNotifications.slice(0, 3).map((notification: NotificationItem, index: number) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => {
                      handleClose();
                      if (notification.request_id) {
                        navigate(`/approvals/requests/${notification.request_id}`);
                      }
                    }}
                    sx={{
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
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
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: notification.is_read ? 400 : 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {notification.priority === 'urgent' && (
                            <WarningIcon sx={{ fontSize: 16, color: '#d32f2f' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: '0.8rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: '0.7rem' }}
                          >
                            {formatTime(notification.created_at)}
                          </Typography>
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

        {/* [advice from AI] 하단 액션 버튼들 */}
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              handleClose();
              navigate('/admin/approvals/dashboard');
            }}
          >
            전체 승인 대시보드 보기
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default MessageCenter;
