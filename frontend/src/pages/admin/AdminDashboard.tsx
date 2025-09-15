// [advice from AI] 시스템 관리 대시보드 컴포넌트
// 사용자, 그룹, 권한, 시스템 설정 등의 관리 기능을 제공

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { user } = useJwtAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] 시스템 통계 조회 - 실제 API 연동
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = useJwtAuthStore.getState().token;
        
        // 토큰 null 체크
        if (!token) {
          throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
        }

        // 사용자, 그룹, 권한, 로그, 백업, API키 통계를 병렬로 조회
        const [usersResponse, groupsResponse, permissionsResponse, logsResponse, backupsResponse, apiKeysResponse, systemSettingsResponse] = await Promise.all([
          fetch('http://localhost:3001/api/admin/users?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/groups', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/permissions', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/logs/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/backups', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/api-keys/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [usersData, groupsData, permissionsData, logsData, backupsData, apiKeysResponseData, systemSettingsData] = await Promise.all([
          usersResponse.json(),
          groupsResponse.json(),
          permissionsResponse.json(),
          logsResponse.json(),
          backupsResponse.json(),
          apiKeysResponse.json(),
          systemSettingsResponse.json()
        ]);

        // 활성 사용자 수 계산
        const activeUsers = usersData.success && usersData.data 
          ? usersData.data.filter((u: any) => u.is_active).length 
          : 0;

        // [advice from AI] 디버깅용 로그 추가
        console.log('🔍 AdminDashboard 실제 데이터:', {
          usersData,
          groupsData,
          permissionsData,
          logsData,
          backupsData,
          apiKeysResponseData,
          systemSettingsData
        });

        setStats({
          totalUsers: usersData.success ? usersData.data?.pagination?.total || 0 : 0,
          totalGroups: groupsData.success ? groupsData.data?.length || 0 : 0,
          totalPermissions: permissionsData.success ? permissionsData.data?.length || 0 : 0,
          activeUsers: activeUsers,
          totalLogs: logsData.success ? logsData.stats?.total_logs || 0 : 0,
          errorLogs: logsData.success ? logsData.stats?.error_count || 0 : 0,
          totalBackups: backupsData.success ? backupsData.backups?.length || 0 : 0,
          totalApiKeys: apiKeysResponseData.success ? apiKeysResponseData.stats?.total_keys || 0 : 0,
          systemSettings: systemSettingsData.success ? Object.keys(systemSettingsData.settings || {}).length : 0
        });
      } catch (err) {
        console.error('❌ AdminDashboard API 에러:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // [advice from AI] 에러 시에도 기본값 설정하지 않음 - 실제 에러 표시
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  // [advice from AI] 관리 메뉴 항목들 - 아이콘 제거
  const adminItems = [
    {
      title: '사용자 관리',
      description: '사용자 계정 생성, 수정, 삭제 및 권한 관리',
      path: '/admin/users',
      color: '#1976d2',
      stats: stats?.totalUsers || 0
    },
    {
      title: '그룹 관리',
      description: '사용자 그룹 생성 및 멤버 관리',
      path: '/admin/groups',
      color: '#388e3c',
      stats: stats?.totalGroups || 0
    },
    {
      title: '권한 관리',
      description: '권한 정의 및 그룹별 권한 할당',
      path: '/admin/permissions',
      color: '#f57c00',
      stats: stats?.totalPermissions || 0
    },
    {
      title: '시스템 설정',
      description: '전역 설정 및 환경 변수 관리',
      path: '/admin/settings',
      color: '#7b1fa2'
    },
    {
      title: '로그 관리',
      description: '시스템 로그 및 사용자 활동 로그',
      path: '/admin/logs',
      color: '#d32f2f'
    },
    {
      title: '백업 및 복원',
      description: '데이터 백업 및 복원 관리',
      path: '/admin/backup',
      color: '#795548'
    },
    {
      title: '알림 설정',
      description: '이메일 및 시스템 알림 설정',
      path: '/admin/notifications',
      color: '#607d8b'
    },
    {
      title: '보안 설정',
      description: '인증 및 보안 정책 설정',
      path: '/admin/security',
      color: '#e91e63'
    },
    {
      title: 'API 키 관리',
      description: 'API 키 생성 및 관리',
      path: '/admin/api-keys',
      color: '#9c27b0'
    }
  ];

  // [advice from AI] 최근 활동 데이터 상태
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // [advice from AI] 최근 활동 데이터 조회
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const token = useJwtAuthStore.getState().token;
        
        // 토큰 null 체크
        if (!token) {
          throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
        }

        // 최근 로그, 알림 로그, 보안 이벤트를 조회
        const [logsResponse, notificationLogsResponse, securityEventsResponse] = await Promise.all([
          fetch('http://localhost:3001/api/admin/logs?limit=5', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/notifications/logs?limit=5', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/admin/security/events?limit=5', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [logsData, notificationLogsData, securityEventsData] = await Promise.all([
          logsResponse.json(),
          notificationLogsResponse.json(),
          securityEventsResponse.json()
        ]);

        const activities: any[] = [];

        // 로그 데이터 처리
        if (logsData.success && logsData.logs) {
          logsData.logs.slice(0, 3).forEach((log: any) => {
            activities.push({
              type: log.level.toLowerCase(),
              title: `${log.source} - ${log.message}`,
              user: '시스템',
              time: new Date(log.created_at).toLocaleString(),
              icon: 'log'
            });
          });
        }

        // 알림 로그 데이터 처리
        if (notificationLogsData.success && notificationLogsData.logs) {
          notificationLogsData.logs.slice(0, 2).forEach((log: any) => {
            activities.push({
              type: 'notification',
              title: `${log.type} 알림 - ${log.subject}`,
              user: log.recipient,
              time: new Date(log.sent_at).toLocaleString(),
              icon: 'notification'
            });
          });
        }

        // 보안 이벤트 데이터 처리
        if (securityEventsData.success && securityEventsData.events) {
          securityEventsData.events.slice(0, 2).forEach((event: any) => {
            activities.push({
              type: 'security',
              title: `${event.type} - ${event.description}`,
              user: event.source,
              time: new Date(event.timestamp).toLocaleString(),
              icon: 'security'
            });
          });
        }

        // 시간순으로 정렬하고 최대 5개만 표시
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivities(activities.slice(0, 5));
      } catch (err) {
        console.error('Error fetching recent activities:', err);
        // 에러 시 기본 데이터 사용
        setRecentActivities([
          { type: 'user', title: '새 사용자 등록', user: '김관리', time: '5분 전', icon: 'user' },
          { type: 'group', title: '그룹 권한 변경', user: '이관리', time: '15분 전', icon: 'group' },
          { type: 'system', title: '시스템 설정 업데이트', user: '박관리', time: '1시간 전', icon: 'system' },
          { type: 'security', title: '보안 정책 변경', user: '최관리', time: '2시간 전', icon: 'security' }
        ]);
      }
    };

    if (user) {
      fetchRecentActivities();
    }
  }, [user]);

  // [advice from AI] 아이콘 제거 - 텍스트 기반으로 변경
  const getActivityIcon = (type: string) => {
    return null; // 아이콘 사용하지 않음
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return '#1976d2';
      case 'group': return '#388e3c';
      case 'system': return '#7b1fa2';
      case 'security': return '#e91e63';
      default: return '#666';
    }
  };

  // [advice from AI] 로딩 상태 처리
  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // [advice from AI] 에러 상태 처리
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          시스템 관리 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          시스템의 사용자, 그룹, 권한 및 전반적인 설정을 관리합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 통계 요약 카드 - 실제 데이터 연동 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#1976d2', mb: 2 }}>
                총 사용자
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#1976d2' }}>
                {stats?.totalUsers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                활성 사용자: {stats?.activeUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#388e3c', mb: 2 }}>
                사용자 그룹
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#388e3c' }}>
                {stats?.totalGroups || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                권한 그룹
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f57c00', mb: 2 }}>
                시스템 로그
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#f57c00' }}>
                {stats?.totalLogs || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                오류 로그: {stats?.errorLogs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#7b1fa2', mb: 2 }}>
                API 키
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                {stats?.totalApiKeys || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                백업: {stats?.totalBackups || 0}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 관리 메뉴 그리드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {adminItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate(item.path)}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, color: item.color, mb: 2 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {item.description}
                </Typography>
                {item.stats !== undefined && (
                  <Typography variant="h4" sx={{ fontWeight: 600, color: item.color }}>
                    {item.stats}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button size="small">
                  관리
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 최근 활동 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                최근 관리 활동
              </Typography>
              <List>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem disablePadding>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              {activity.user}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {activity.time}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                시스템 정보
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="시스템 버전"
                    secondary="Timbel Platform v1.0.0"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="총 시스템 설정"
                    secondary={`${stats?.systemSettings || 0}개 설정 항목`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="총 권한"
                    secondary={`${stats?.totalPermissions || 0}개 권한`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="시스템 로그"
                    secondary={`총 ${stats?.totalLogs || 0}개 (오류 ${stats?.errorLogs || 0}개)`}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="백업 파일"
                    secondary={`${stats?.totalBackups || 0}개 백업`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;