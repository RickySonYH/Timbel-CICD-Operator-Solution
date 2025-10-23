// [advice from AI] 시스템 관리 페이지 - 관리자 전용 시스템 설정
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import MonitoringConfiguration from './MonitoringConfiguration';

// [advice from AI] 시스템 설정 타입
interface SystemConfig {
  category: string;
  settings: {
    key: string;
    name: string;
    value: any;
    type: 'boolean' | 'string' | 'number';
    description: string;
  }[];
}

// [advice from AI] 사용자 데이터 타입
interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role_type: string;
  status: string;
  last_login: string;
  created_at: string;
}

const SystemManagement: React.FC = () => {
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  
  // [advice from AI] 사용자 생성 다이얼로그
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role_type: 'developer',
    permission_level: 2
  });

  // [advice from AI] 사용자 목록 로드
  const loadUsers = async () => {
    try {
      console.log('📥 사용자 목록 로드 중...');
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('사용자 목록 로드 실패');
      }

      const data = await response.json();
      console.log('📊 로드된 사용자 데이터:', data.users);
      setUsers(data.users || []);
      console.log(`✅ 사용자 목록 업데이트 완료: ${data.users?.length || 0}명`);
      
    } catch (error) {
      console.error('❌ 사용자 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 가입 승인 대기 사용자 로드
  const loadPendingUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('가입 승인 대기 사용자 로드 실패');
      }

      const data = await response.json();
      setPendingUsers(data.pending_users || []);
      
    } catch (error) {
      console.error('가입 승인 대기 사용자 로드 실패:', error);
    }
  };

  // [advice from AI] 시스템 설정 로드
  const loadSystemConfigs = async () => {
    try {
      const response = await fetch('/api/admin/system-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('시스템 설정 로드 실패');
      }

      const data = await response.json();
      setSystemConfigs(data.configs || []);
      
    } catch (error) {
      console.error('시스템 설정 로드 실패:', error);
    }
  };

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUsers(), loadPendingUsers(), loadSystemConfigs()]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 사용자 생성
  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.message || '사용자 생성 실패');
        return;
      }

      alert('사용자가 성공적으로 생성되었습니다.');
      setCreateUserDialogOpen(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role_type: 'developer',
        permission_level: 2
      });
      loadUsers();
      
    } catch (error) {
      console.error('사용자 생성 실패:', error);
      alert('사용자 생성 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 회원가입 승인
  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role_type: 'developer',
          permission_level: 2
        })
      });

      if (!response.ok) {
        throw new Error('회원가입 승인 실패');
      }

      alert('회원가입이 승인되었습니다.');
      loadUsers();
      loadPendingUsers();
      
    } catch (error) {
      console.error('회원가입 승인 실패:', error);
      alert('회원가입 승인 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 회원가입 거부
  const handleRejectUser = async (userId: string) => {
    if (!confirm('정말로 이 회원가입 요청을 거부하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: '관리자에 의한 거부' })
      });

      if (!response.ok) {
        throw new Error('회원가입 거부 실패');
      }

      alert('회원가입이 거부되었습니다.');
      loadPendingUsers();
      
    } catch (error) {
      console.error('회원가입 거부 실패:', error);
      alert('회원가입 거부 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 사용자 상태 변경 - 즉시 UI 업데이트
  const handleUserStatusChange = async (userId: string, newStatus: string) => {
    try {
      console.log(`🔄 사용자 상태 변경 요청: ${userId} -> ${newStatus}`);
      
      // [advice from AI] 낙관적 업데이트: UI를 먼저 변경
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, status: newStatus }
            : user
        )
      );
      console.log('⚡ UI 즉시 업데이트 완료');
      
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 실패 시 이전 상태로 되돌리기
        await loadUsers();
        throw new Error(errorData.message || '사용자 상태 변경 실패');
      }

      const result = await response.json();
      console.log('✅ 사용자 상태 변경 성공:', result);
      
    } catch (error) {
      console.error('❌ 사용자 상태 변경 실패:', error);
      alert(`사용자 상태 변경 중 오류가 발생했습니다: ${error}`);
    }
  };

  // [advice from AI] 사용자 삭제
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.message || '사용자 삭제 실패');
        return;
      }

      alert('사용자가 삭제되었습니다.');
      loadUsers();
      
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      alert('사용자 삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 시스템 설정 변경
  const handleConfigChange = async (category: string, key: string, value: any) => {
    try {
      const response = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category, key, value })
      });

      if (!response.ok) {
        throw new Error('시스템 설정 변경 실패');
      }

      loadSystemConfigs();
      
    } catch (error) {
      console.error('시스템 설정 변경 실패:', error);
    }
  };

  useEffect(() => {
    if (permissions.canViewSystemAdmin) {
      loadData();
    }
  }, [permissions.canViewSystemAdmin]);

  if (!permissions.canViewSystemAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          시스템 관리에 접근할 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          시스템 관리
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        시스템 관리
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        시스템 전반의 설정과 사용자를 관리합니다
      </Typography>

      {/* [advice from AI] 사용자 현황 대시보드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                총 사용자 수
              </Typography>
              <Typography variant="h4" color="primary">
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                활성 사용자
              </Typography>
              <Typography variant="h4" color="success.main">
                {users.filter(u => u.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                관리자 계정
              </Typography>
              <Typography variant="h4" color="warning.main">
                {users.filter(u => u.role === 'admin').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                시스템 상태
              </Typography>
              <Typography variant="h4" color="success.main">
                정상
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 가입 승인 대기 섹션 - 항상 표시 */}
      <Card sx={{ mb: 4, bgcolor: pendingUsers.length > 0 ? 'warning.light' : 'background.paper' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <Badge badgeContent={pendingUsers.length} color="error">
                가입 승인 대기
              </Badge>
            </Typography>
          </Box>
          {pendingUsers.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>사용자명</TableCell>
                    <TableCell>이메일</TableCell>
                    <TableCell>이름</TableCell>
                    <TableCell>신청일</TableCell>
                    <TableCell align="center">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="승인">
                          <IconButton 
                            color="success" 
                            size="small"
                            onClick={() => handleApproveUser(user.id)}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="거부">
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => handleRejectUser(user.id)}
                          >
                            <RejectIcon />
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
              현재 가입 승인 대기 중인 사용자가 없습니다.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 사용자 관리 테이블 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 4 }}>
        <Typography variant="h5">
          사용자 관리 ({users.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateUserDialogOpen(true)}
        >
          사용자 생성
        </Button>
      </Box>
      <Paper sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>사용자명</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>역할</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>마지막 로그인</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role} 
                    color={user.role === 'admin' ? 'error' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.status} 
                    color={user.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '없음'}
                </TableCell>
                <TableCell align="center">
                  {/* [advice from AI] Admin 계정은 상태 변경 및 삭제 불가 */}
                  {user.username === 'admin' ? (
                    <Chip 
                      label="보호된 계정" 
                      size="small" 
                      color="primary"
                      sx={{ fontWeight: 'bold' }}
                    />
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <Typography variant="body2" color="text.secondary">
                        비활성
                      </Typography>
                      <Switch
                        checked={user.status === 'active'}
                        onChange={(e) => {
                          console.log(`🔄 토글 변경: ${user.username} -> ${e.target.checked ? 'active' : 'inactive'}`);
                          handleUserStatusChange(user.id, e.target.checked ? 'active' : 'inactive');
                        }}
                        color="success"
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary">
                        활성
                      </Typography>
                      <Tooltip title="사용자 삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user.id)}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* [advice from AI] 사용자 생성 다이얼로그 */}
      <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 사용자 생성</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="사용자명"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="이름"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>역할</InputLabel>
                <Select
                  value={newUser.role_type}
                  label="역할"
                  onChange={(e) => setNewUser({ ...newUser, role_type: e.target.value })}
                >
                  <MenuItem value="developer">Developer</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>권한 레벨</InputLabel>
                <Select
                  value={newUser.permission_level}
                  label="권한 레벨"
                  onChange={(e) => setNewUser({ ...newUser, permission_level: Number(e.target.value) })}
                >
                  <MenuItem value={0}>0 - 전체 관리자</MenuItem>
                  <MenuItem value={1}>1 - 시스템 관리자</MenuItem>
                  <MenuItem value={2}>2 - 프로젝트 관리자</MenuItem>
                  <MenuItem value={3}>3 - 일반 사용자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained"
            disabled={!newUser.username || !newUser.email || !newUser.password || !newUser.full_name}
          >
            생성
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default SystemManagement;
