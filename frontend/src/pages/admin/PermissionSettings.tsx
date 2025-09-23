// [advice from AI] 권한 설정 페이지 - 소속그룹 기반 권한 관리 시스템

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Avatar, List, ListItem, ListItemText, ListItemAvatar,
  Paper, Divider, Alert, CircularProgress, TextField, InputAdornment
} from '@mui/material';
import {
  Security as SecurityIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  DragIndicator as DragIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 사용자 정보 인터페이스
interface UserInfo {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role_type?: string;
  department?: string;
  position?: string;
  status: string;
  created_at: string;
  assigned_groups?: string[];
}

// [advice from AI] 소속그룹 정의
interface GroupInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  level: number;
}

const PermissionSettings: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // [advice from AI] 소속그룹 정의 (스크린샷 기반)
  const groups: GroupInfo[] = [
    {
      id: 'executive',
      name: '최고 관리자',
      description: 'Executive 권한',
      color: '#e91e63',
      permissions: ['Manage Users', 'Manage Projects', 'Access Analytics', 'Deploy Services', 'Manage Code', 'Manage Tests'],
      level: 0
    },
    {
      id: 'po',
      name: 'PO (프로젝트 오너)',
      description: 'PO 권한',
      color: '#ff9800',
      permissions: ['Manage Projects', 'Access Analytics', 'Deploy Services', 'Manage Code'],
      level: 1
    },
    {
      id: 'pe',
      name: 'PE (프로젝트 엔지니어)',
      description: 'PE 권한',
      color: '#4caf50',
      permissions: ['Manage Code', 'Deploy Services', 'Manage Tests'],
      level: 2
    },
    {
      id: 'qa',
      name: 'QA/QC',
      description: 'QA/QC 권한',
      color: '#2196f3',
      permissions: ['Manage Tests', 'Access Analytics'],
      level: 3
    },
    {
      id: 'operations',
      name: '운영팀',
      description: '운영팀 권한',
      color: '#9c27b0',
      permissions: ['Deploy Services', 'Manage Users'],
      level: 4
    },
    {
      id: 'general',
      name: '일반 회원',
      description: '기본 권한 없음',
      color: '#9e9e9e',
      permissions: [],
      level: 5
    }
  ];

  // [advice from AI] 동적 API URL 결정 로직
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return '';
    }
  };

  // [advice from AI] 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/admin/users` : '/api/admin/users';
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUsers(result.data || []);
        }
      }
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  // [advice from AI] 사용자 그룹 배정
  const assignUserToGroup = async (userId: string, groupId: string) => {
    try {
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/admin/users/${userId}/assign-group` : `/api/admin/users/${userId}/assign-group`;
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ groupId })
      });

      if (response.ok) {
        // 사용자 목록 새로고침
        fetchUsers();
        alert('소속그룹이 성공적으로 배정되었습니다.');
      } else {
        alert('소속그룹 배정에 실패했습니다.');
      }
    } catch (error) {
      console.error('그룹 배정 오류:', error);
      alert('소속그룹 배정 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 사용자의 현재 그룹 정보 가져오기
  const getUserGroup = (user: UserInfo): GroupInfo => {
    const roleMapping: { [key: string]: string } = {
      'executive': 'executive',
      'admin': 'executive',
      'po': 'po',
      'pe': 'pe',
      'qa': 'qa',
      'operations': 'operations',
      'ops': 'operations'
    };

    const groupId = roleMapping[user.role_type || ''] || 'general';
    return groups.find(g => g.id === groupId) || groups[groups.length - 1];
  };

  // [advice from AI] 필터링된 사용자 목록
  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          권한 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          PO·PE·QA·운영팀 구성원의 역할별 권한을 관리합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 소속그룹 목록 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon />
            소속그룹 목록
          </Typography>
          
          <Grid container spacing={2}>
            {groups.map((group) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={group.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    bgcolor: `${group.color}10`,
                    border: `2px solid ${group.color}30`
                  }}
                >
                  <Chip 
                    label={group.name}
                    sx={{ 
                      bgcolor: group.color, 
                      color: 'white',
                      fontWeight: 600,
                      mb: 1
                    }}
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    Level {group.level}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {group.permissions.slice(0, 3).map((perm, index) => (
                      <Chip 
                        key={index}
                        label={perm}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.6rem',
                          height: '20px',
                          m: 0.2
                        }}
                      />
                    ))}
                    {group.permissions.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{group.permissions.length - 3} more
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 사용자 목록 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon />
              사용자 목록
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {/* TODO: 새 사용자 추가 */}}
            >
              새 사용자 추가
            </Button>
          </Box>

          {/* [advice from AI] 검색 */}
          <TextField
            fullWidth
            placeholder="사용자명, 이메일, 이름으로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* [advice from AI] 사용자 목록 테이블 */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', fontWeight: 600, py: 2, px: 1, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Box sx={{ flex: '0 0 120px' }}>사용자 정보</Box>
                <Box sx={{ flex: '0 0 100px' }}>역할</Box>
                <Box sx={{ flex: '0 0 120px' }}>권한 레벨</Box>
                <Box sx={{ flex: '0 0 100px' }}>상태</Box>
                <Box sx={{ flex: '0 0 120px' }}>마지막 로그인</Box>
                <Box sx={{ flex: '0 0 100px' }}>권한 설정</Box>
                <Box sx={{ flex: 1 }}>작업</Box>
              </Box>

              {filteredUsers.map((user) => {
                const userGroup = getUserGroup(user);
                return (
                  <Paper key={user.id} sx={{ mb: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {/* 사용자 정보 */}
                      <Box sx={{ flex: '0 0 120px', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: userGroup.color }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {user.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.username}
                          </Typography>
                        </Box>
                      </Box>

                      {/* 역할 */}
                      <Box sx={{ flex: '0 0 100px' }}>
                        <Chip 
                          label={userGroup.name}
                          size="small"
                          sx={{ 
                            bgcolor: userGroup.color, 
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      </Box>

                      {/* 권한 레벨 */}
                      <Box sx={{ flex: '0 0 120px' }}>
                        <Typography variant="body2">
                          Level {userGroup.level}
                        </Typography>
                      </Box>

                      {/* 상태 */}
                      <Box sx={{ flex: '0 0 100px' }}>
                        <Chip 
                          label={user.status === 'active' ? '활성' : '대기'}
                          size="small"
                          color={user.status === 'active' ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </Box>

                      {/* 마지막 로그인 */}
                      <Box sx={{ flex: '0 0 120px' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </Typography>
                      </Box>

                      {/* 권한 설정 (드래그 가능한 그룹들) */}
                      <Box sx={{ flex: '0 0 100px' }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {userGroup.permissions.slice(0, 3).map((perm, index) => (
                            <Chip 
                              key={index}
                              label={perm}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: '0.6rem',
                                height: '18px'
                              }}
                            />
                          ))}
                        </Box>
                      </Box>

                      {/* 작업 버튼들 */}
                      <Box sx={{ flex: 1, display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {groups.filter(g => g.id !== userGroup.id).slice(0, 3).map((group) => (
                          <Button
                            key={group.id}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              minWidth: 'auto',
                              p: 0.5,
                              fontSize: '0.7rem',
                              borderColor: group.color,
                              color: group.color,
                              '&:hover': {
                                bgcolor: `${group.color}10`,
                                borderColor: group.color
                              }
                            }}
                            onClick={() => assignUserToGroup(user.id, group.id)}
                          >
                            {group.name.split(' ')[0]}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}

          {/* [advice from AI] 빈 상태 */}
          {!loading && filteredUsers.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 권한 시스템 설명 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>소속그룹 기반 권한 시스템:</strong> 사용자에게 소속그룹을 배정하면 해당 그룹의 권한을 자동으로 부여받습니다. 
          소속그룹이 배정되지 않은 사용자는 자동으로 "일반 회원"으로 등록되어 기본 권한만 가집니다.
        </Typography>
      </Alert>
    </Container>
  );
};

export default PermissionSettings;
