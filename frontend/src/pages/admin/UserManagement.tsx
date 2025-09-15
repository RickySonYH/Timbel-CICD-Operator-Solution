// [advice from AI] 사용자 관리 페이지 컴포넌트
// 사용자 CRUD, 권한 관리, 그룹 할당 등의 기능을 제공

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Person as UserIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Lock as LockIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role_type: string;
  permission_level: number;
  is_active: boolean;
  group_count: number;
  created_at: string;
  updated_at: string;
}

interface UserDetail extends User {
  groups: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

const UserManagement: React.FC = () => {
  const { user } = useJwtAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // [advice from AI] 페이지네이션 및 검색
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // [advice from AI] 폼 데이터
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    role_type: 'user',
    permission_level: 1,
    is_active: true
  });

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  // [advice from AI] 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwt_token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter })
      });
      
      const response = await fetch(`http://localhost:3001/api/admin/users?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 사용자 상세 정보 조회
  const fetchUserDetail = async (userId: string) => {
    try {
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user detail');
      }

      const result = await response.json();
      if (result.success) {
        setSelectedUser(result.data);
        setDetailDialogOpen(true);
      } else {
        throw new Error(result.error || 'Failed to fetch user detail');
      }
    } catch (err) {
      console.error('Error fetching user detail:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, pagination.page, search, roleFilter]);

  // [advice from AI] 사용자 생성/수정
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const url = editingUser 
        ? `http://localhost:3001/api/admin/users/${editingUser.id}`
        : 'http://localhost:3001/api/admin/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser ? formData : { ...formData, password: 'default123' };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to save user');
      }

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        setFormData({ username: '', email: '', full_name: '', role_type: 'user', permission_level: 1, is_active: true });
        setEditingUser(null);
        fetchUsers(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to save user');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 비밀번호 변경
  const handlePasswordChange = async () => {
    if (passwordData.password !== passwordData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`http://localhost:3001/api/admin/users/${editingUser?.id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: passwordData.password })
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      const result = await response.json();
      if (result.success) {
        setPasswordDialogOpen(false);
        setPasswordData({ password: '', confirmPassword: '' });
        setEditingUser(null);
      } else {
        throw new Error(result.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 사용자 삭제
  const handleDelete = async (user: User) => {
    if (!window.confirm(`사용자 "${user.username}"을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`http://localhost:3001/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      const result = await response.json();
      if (result.success) {
        fetchUsers(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 수정 모드로 다이얼로그 열기
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role_type: user.role_type,
      permission_level: user.permission_level,
      is_active: user.is_active
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  // [advice from AI] 새 사용자 생성 모드로 다이얼로그 열기
  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', full_name: '', role_type: 'user', permission_level: 1, is_active: true });
    setDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'pe': return 'primary';
      case 'po': return 'secondary';
      case 'qa': return 'warning';
      case 'op': return 'info';
      default: return 'default';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return '관리자';
      case 'pe': return 'PE';
      case 'po': return 'PO';
      case 'qa': return 'QA';
      case 'op': return '운영';
      default: return role;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            사용자 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            시스템 사용자를 생성, 수정, 삭제하고 권한을 관리합니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          새 사용자
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="사용자 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>역할</InputLabel>
              <Select
                value={roleFilter}
                label="역할"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="admin">관리자</MenuItem>
                <MenuItem value="pe">PE</MenuItem>
                <MenuItem value="po">PO</MenuItem>
                <MenuItem value="qa">QA</MenuItem>
                <MenuItem value="op">운영</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] 사용자 목록 테이블 */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>사용자</TableCell>
                  <TableCell>이메일</TableCell>
                  <TableCell>역할</TableCell>
                  <TableCell>권한 레벨</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>그룹 수</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <UserIcon sx={{ mr: 1, color: '#1976d2' }} />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                            {user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.full_name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleText(user.role_type)}
                        color={getRoleColor(user.role_type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.permission_level}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? '활성' : '비활성'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.group_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(user.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setEditingUser(user);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* [advice from AI] 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] 액션 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => editingUser && fetchUserDetail(editingUser.id)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>상세 보기</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => editingUser && handleEdit(editingUser)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => editingUser && setPasswordDialogOpen(true)}>
          <ListItemIcon>
            <LockIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>비밀번호 변경</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => editingUser && handleDelete(editingUser)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* [advice from AI] 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? '사용자 수정' : '새 사용자 생성'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="사용자명"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="이메일"
            fullWidth
            variant="outlined"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="전체 이름"
            fullWidth
            variant="outlined"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>역할</InputLabel>
            <Select
              value={formData.role_type}
              label="역할"
              onChange={(e) => setFormData({ ...formData, role_type: e.target.value })}
            >
              <MenuItem value="user">일반 사용자</MenuItem>
              <MenuItem value="pe">PE</MenuItem>
              <MenuItem value="po">PO</MenuItem>
              <MenuItem value="qa">QA</MenuItem>
              <MenuItem value="op">운영</MenuItem>
              <MenuItem value="admin">관리자</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="권한 레벨"
            fullWidth
            type="number"
            variant="outlined"
            value={formData.permission_level}
            onChange={(e) => setFormData({ ...formData, permission_level: parseInt(e.target.value) })}
            sx={{ mb: 2 }}
            inputProps={{ min: 1, max: 5 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="활성 상태"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 비밀번호 변경 다이얼로그 */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>비밀번호 변경</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="새 비밀번호"
            fullWidth
            type="password"
            variant="outlined"
            value={passwordData.password}
            onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="비밀번호 확인"
            fullWidth
            type="password"
            variant="outlined"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>취소</Button>
          <Button onClick={handlePasswordChange} variant="contained">
            변경
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 사용자 상세 정보 다이얼로그 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>사용자 상세 정보</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography><strong>사용자명:</strong> {selectedUser.username}</Typography>
                <Typography><strong>이메일:</strong> {selectedUser.email}</Typography>
                <Typography><strong>전체 이름:</strong> {selectedUser.full_name}</Typography>
                <Typography><strong>역할:</strong> {getRoleText(selectedUser.role_type)}</Typography>
                <Typography><strong>권한 레벨:</strong> {selectedUser.permission_level}</Typography>
                <Typography><strong>상태:</strong> {selectedUser.is_active ? '활성' : '비활성'}</Typography>
              </Box>
              
              <Typography variant="h6" gutterBottom>
                소속 그룹
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedUser.groups && selectedUser.groups.length > 0 ? (
                  selectedUser.groups.map((group, index) => (
                    <Chip
                      key={index}
                      label={`${group.name} (${group.role})`}
                      icon={<GroupIcon />}
                      color="primary"
                      variant="outlined"
                    />
                  ))
                ) : (
                  <Typography color="text.secondary">소속된 그룹이 없습니다.</Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
