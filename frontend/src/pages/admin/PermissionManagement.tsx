import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

// [advice from AI] 권한 관리를 위한 인터페이스 정의
interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  lastLogin: string;
}

const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 권한 관리 상태
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [permissionForm, setPermissionForm] = useState({
    name: '',
    description: '',
    resource: '',
    action: ''
  });

  // 역할 관리 상태
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  // 사용자 관리 상태
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    roles: [] as string[],
    isActive: true
  });

  // 탭 상태
  const [activeTab, setActiveTab] = useState(0);

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('인증 토큰이 없습니다. 로그인해주세요.');
        return;
      }

      // 권한, 역할, 사용자 데이터를 병렬로 로드
      const [permissionsRes, rolesRes, usersRes] = await Promise.all([
        fetch('/api/admin/permissions', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/roles', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!permissionsRes.ok || !rolesRes.ok || !usersRes.ok) {
        throw new Error('데이터 로드 실패');
      }

      const [permissionsData, rolesData, usersData] = await Promise.all([
        permissionsRes.json(),
        rolesRes.json(),
        usersRes.json()
      ]);

      setPermissions(permissionsData.permissions || []);
      setRoles(rolesData.roles || []);
      setUsers(usersData.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 권한 CRUD 작업
  const handleCreatePermission = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(permissionForm)
      });

      if (!response.ok) {
        throw new Error('권한 생성 실패');
      }

      setSuccess('권한이 성공적으로 생성되었습니다.');
      setPermissionDialogOpen(false);
      resetPermissionForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 생성 실패');
    }
  };

  const handleUpdatePermission = async () => {
    if (!editingPermission) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/permissions/${editingPermission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(permissionForm)
      });

      if (!response.ok) {
        throw new Error('권한 수정 실패');
      }

      setSuccess('권한이 성공적으로 수정되었습니다.');
      setPermissionDialogOpen(false);
      setEditingPermission(null);
      resetPermissionForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 수정 실패');
    }
  };

  const handleDeletePermission = async (id: string) => {
    if (!window.confirm('이 권한을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/permissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('권한 삭제 실패');
      }

      setSuccess('권한이 성공적으로 삭제되었습니다.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '권한 삭제 실패');
    }
  };

  // [advice from AI] 역할 CRUD 작업
  const handleCreateRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(roleForm)
      });

      if (!response.ok) {
        throw new Error('역할 생성 실패');
      }

      setSuccess('역할이 성공적으로 생성되었습니다.');
      setRoleDialogOpen(false);
      resetRoleForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 생성 실패');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(roleForm)
      });

      if (!response.ok) {
        throw new Error('역할 수정 실패');
      }

      setSuccess('역할이 성공적으로 수정되었습니다.');
      setRoleDialogOpen(false);
      setEditingRole(null);
      resetRoleForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 수정 실패');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('이 역할을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('역할 삭제 실패');
      }

      setSuccess('역할이 성공적으로 삭제되었습니다.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 삭제 실패');
    }
  };

  // [advice from AI] 사용자 관리 작업
  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });

      if (!response.ok) {
        throw new Error('사용자 정보 수정 실패');
      }

      setSuccess('사용자 정보가 성공적으로 수정되었습니다.');
      setUserDialogOpen(false);
      setEditingUser(null);
      resetUserForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 정보 수정 실패');
    }
  };

  // [advice from AI] 폼 리셋 함수들
  const resetPermissionForm = () => {
    setPermissionForm({ name: '', description: '', resource: '', action: '' });
  };

  const resetRoleForm = () => {
    setRoleForm({ name: '', description: '', permissions: [] });
  };

  const resetUserForm = () => {
    setUserForm({ username: '', email: '', roles: [], isActive: true });
  };

  // [advice from AI] 편집 모드 시작 함수들
  const startEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action
    });
    setPermissionDialogOpen(true);
  };

  const startEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
    setRoleDialogOpen(true);
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive
    });
    setUserDialogOpen(true);
  };

  // [advice from AI] 권한 다이얼로그
  const PermissionDialog = () => (
    <Dialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingPermission ? '권한 수정' : '새 권한 생성'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="권한 이름"
              value={permissionForm.name}
              onChange={(e) => setPermissionForm({ ...permissionForm, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              value={permissionForm.description}
              onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>리소스</InputLabel>
              <Select
                value={permissionForm.resource}
                onChange={(e) => setPermissionForm({ ...permissionForm, resource: e.target.value })}
              >
                <MenuItem value="catalog">카탈로그</MenuItem>
                <MenuItem value="knowledge">지식</MenuItem>
                <MenuItem value="admin">관리</MenuItem>
                <MenuItem value="user">사용자</MenuItem>
                <MenuItem value="system">시스템</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>액션</InputLabel>
              <Select
                value={permissionForm.action}
                onChange={(e) => setPermissionForm({ ...permissionForm, action: e.target.value })}
              >
                <MenuItem value="read">읽기</MenuItem>
                <MenuItem value="write">쓰기</MenuItem>
                <MenuItem value="delete">삭제</MenuItem>
                <MenuItem value="admin">관리</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPermissionDialogOpen(false)}>취소</Button>
        <Button
          onClick={editingPermission ? handleUpdatePermission : handleCreatePermission}
          variant="contained"
        >
          {editingPermission ? '수정' : '생성'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // [advice from AI] 역할 다이얼로그
  const RoleDialog = () => (
    <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingRole ? '역할 수정' : '새 역할 생성'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="역할 이름"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              권한 선택
            </Typography>
            <FormControl fullWidth>
              <InputLabel>권한</InputLabel>
              <Select
                multiple
                value={roleForm.permissions}
                onChange={(e) => setRoleForm({ ...roleForm, permissions: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {permissions.map((permission) => (
                  <MenuItem key={permission.id} value={permission.id}>
                    {permission.name} ({permission.resource}.{permission.action})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRoleDialogOpen(false)}>취소</Button>
        <Button
          onClick={editingRole ? handleUpdateRole : handleCreateRole}
          variant="contained"
        >
          {editingRole ? '수정' : '생성'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // [advice from AI] 사용자 다이얼로그
  const UserDialog = () => (
    <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        사용자 정보 수정
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="사용자명"
              value={userForm.username}
              disabled
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="이메일"
              value={userForm.email}
              disabled
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>역할</InputLabel>
              <Select
                multiple
                value={userForm.roles}
                onChange={(e) => setUserForm({ ...userForm, roles: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const role = roles.find(r => r.id === value);
                      return <Chip key={value} label={role?.name || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={userForm.isActive}
                  onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                />
              }
              label="활성 상태"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setUserDialogOpen(false)}>취소</Button>
        <Button onClick={handleUpdateUser} variant="contained">
          수정
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>데이터를 로드하는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          권한 관리
        </Typography>
      </Box>

      {/* 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={activeTab === 0 ? 'contained' : 'text'}
            onClick={() => setActiveTab(0)}
          >
            권한 관리
          </Button>
          <Button
            variant={activeTab === 1 ? 'contained' : 'text'}
            onClick={() => setActiveTab(1)}
          >
            역할 관리
          </Button>
          <Button
            variant={activeTab === 2 ? 'contained' : 'text'}
            onClick={() => setActiveTab(2)}
          >
            사용자 관리
          </Button>
        </Box>
      </Box>

      {/* 권한 관리 탭 */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">권한 목록</Typography>
              <Button
                variant="contained"
                onClick={() => {
                  setEditingPermission(null);
                  resetPermissionForm();
                  setPermissionDialogOpen(true);
                }}
              >
                새 권한 생성
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>권한 이름</TableCell>
                    <TableCell>리소스</TableCell>
                    <TableCell>액션</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell>생성일</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        {permission.name}
                      </TableCell>
                      <TableCell>
                        <Chip label={permission.resource} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Chip label={permission.action} size="small" color="secondary" />
                      </TableCell>
                      <TableCell>{permission.description}</TableCell>
                      <TableCell>{new Date(permission.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Tooltip title="수정">
                          <IconButton onClick={() => startEditPermission(permission)}>
                            {/* [advice from AI] 아이콘 제거 */}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton onClick={() => handleDeletePermission(permission.id)}>
                            {/* [advice from AI] 아이콘 제거 */}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 역할 관리 탭 */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">역할 목록</Typography>
              <Button
                variant="contained"
                onClick={() => {
                  setEditingRole(null);
                  resetRoleForm();
                  setRoleDialogOpen(true);
                }}
              >
                새 역할 생성
              </Button>
            </Box>
            <Grid container spacing={2}>
              {roles.map((role) => (
                <Grid item xs={12} md={6} lg={4} key={role.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">{role.name}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {role.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Badge badgeContent={role.permissions.length} color="primary">
                          <Typography variant="body2">권한</Typography>
                        </Badge>
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          : {role.permissions.length}개
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        사용자: {role.userCount}명
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => startEditRole(role)}>
                        {/* [advice from AI] 아이콘 제거 */}
                        수정
                      </Button>
                      <Button size="small" color="error" onClick={() => handleDeleteRole(role.id)}>
                        {/* [advice from AI] 아이콘 제거 */}
                        삭제
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 사용자 관리 탭 */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>사용자 목록</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>사용자명</TableCell>
                    <TableCell>이메일</TableCell>
                    <TableCell>역할</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>최근 로그인</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.roles.map((roleId) => {
                            const role = roles.find(r => r.id === roleId);
                            return (
                              <Chip
                                key={roleId}
                                label={role?.name || roleId}
                                size="small"
                                color="primary"
                              />
                            );
                          })}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? '활성' : '비활성'}
                          color={user.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '없음'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="수정">
                          <IconButton onClick={() => startEditUser(user)}>
                            {/* [advice from AI] 아이콘 제거 */}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 다이얼로그들 */}
      <PermissionDialog />
      <RoleDialog />
      <UserDialog />

      {/* 알림 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PermissionManagement;
