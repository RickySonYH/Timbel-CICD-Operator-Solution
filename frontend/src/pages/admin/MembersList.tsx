// [advice from AI] 회원 리스트 페이지 - 기본 정보, 소속 그룹, 권한 표시

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Avatar, List, ListItem, ListItemText, ListItemAvatar,
  Chip, Divider, CircularProgress, TextField, InputAdornment
} from '@mui/material';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Work as WorkIcon
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
}

const MembersList: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  // [advice from AI] 역할 표시 색상
  const getRoleColor = (roleType?: string) => {
    switch (roleType) {
      case 'executive': case 'admin': return '#e91e63';
      case 'po': return '#ff9800';
      case 'pe': return '#4caf50';
      case 'qa': return '#2196f3';
      case 'operations': case 'ops': return '#9c27b0';
      default: return '#9e9e9e';
    }
  };

  // [advice from AI] 역할 표시 이름
  const getRoleName = (roleType?: string) => {
    switch (roleType) {
      case 'executive': return '경영진';
      case 'admin': return '관리자';
      case 'po': return 'PO';
      case 'pe': return 'PE';
      case 'qa': return 'QA/QC';
      case 'operations': case 'ops': return '운영팀';
      default: return '일반 회원';
    }
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
          회원 리스트
        </Typography>
        <Typography variant="body1" color="text.secondary">
          등록된 회원들의 기본 정보와 소속 그룹을 확인합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
                {users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                전체 회원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                {users.filter(u => u.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                활성 회원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                {users.filter(u => u.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                승인 대기
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 600 }}>
                {users.filter(u => !u.role_type).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                일반 회원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="회원명, 이메일, 사용자명으로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* [advice from AI] 회원 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon />
            회원 목록 ({filteredUsers.length}명)
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {filteredUsers.map((user, index) => (
                <React.Fragment key={user.id}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getRoleColor(user.role_type) }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {user.full_name}
                          </Typography>
                          <Chip 
                            label={getRoleName(user.role_type)}
                            size="small"
                            sx={{ 
                              bgcolor: getRoleColor(user.role_type), 
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                          <Chip 
                            label={user.status === 'active' ? '활성' : '대기'}
                            size="small"
                            color={user.status === 'active' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {user.username}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <EmailIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                          {(user.department || user.position) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <WorkIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {user.department} {user.position && `• ${user.position}`}
                              </Typography>
                            </Box>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            가입일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredUsers.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );

  // [advice from AI] 사용자 그룹 배정 함수 (향후 구현)
  async function assignUserToGroup(userId: string, groupId: string) {
    // TODO: 실제 API 호출 구현
    alert(`그룹 배정 기능은 권한 설정 페이지에서 사용하세요.`);
  }
};

export default MembersList;
