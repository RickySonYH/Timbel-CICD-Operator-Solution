import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Alert, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField, Checkbox, FormControlLabel,
  LinearProgress, Divider, Avatar, List, ListItem, ListItemText, ListItemAvatar,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface Role {
  id: string;
  role_name: string;
  role_display_name: string;
  description: string;
  permission_level: number;
  assigned_users_count: number;
  can_read_all: boolean;
  can_write_all: boolean;
  can_delete_all: boolean;
  can_admin_all: boolean;
  can_manage_users: boolean;
  can_manage_roles: boolean;
  can_view_logs: boolean;
  can_manage_system: boolean;
  can_view_monitoring: boolean;
  can_manage_domains: boolean;
  can_manage_projects: boolean;
  can_manage_systems: boolean;
  can_manage_components: boolean;
  can_manage_documents: boolean;
  can_manage_designs: boolean;
  can_deploy_services: boolean;
  can_manage_pipelines: boolean;
  can_view_operations: boolean;
  can_manage_infrastructure: boolean;
  can_approve_requests: boolean;
  can_submit_requests: boolean;
  is_active: boolean;
  created_at: string;
}

interface UserPermission {
  id: string;
  username: string;
  email: string;
  full_name: string;
  legacy_role: string;
  roles: Array<{
    role_name: string;
    role_display_name: string;
    permission_level: number;
    permissions: Record<string, boolean>;
    assigned_at: string;
    expires_at?: string;
  }>;
  highest_permission_level: number;
  effective_permissions: Record<string, boolean>;
  roles_count: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action_type: string;
  target_username?: string;
  target_full_name?: string;
  performed_by_username: string;
  performed_by_full_name: string;
  result: string;
  reason?: string;
  metadata?: any;
}

const PermissionManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPermission | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleDetailDialogOpen, setRoleDetailDialogOpen] = useState(false);
  const [roleEditDialogOpen, setRoleEditDialogOpen] = useState(false);
  const [userPermissionDialogOpen, setUserPermissionDialogOpen] = useState(false);
  const [roleAssignmentDialogOpen, setRoleAssignmentDialogOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // [advice from AI] 새 역할 생성 상태
  const [newRoleData, setNewRoleData] = useState({
    role_name: '',
    role_display_name: '',
    description: '',
    permission_level: 1,
    can_read_all: false,
    can_write_all: false,
    can_delete_all: false,
    can_admin_all: false,
    can_manage_users: false,
    can_manage_roles: false,
    can_view_logs: false,
    can_manage_system: false,
    can_view_monitoring: false,
    can_manage_domains: false,
    can_manage_projects: false,
    can_manage_systems: false,
    can_manage_components: false,
    can_manage_documents: false,
    can_manage_designs: false,
    can_deploy_services: false,
    can_manage_pipelines: false,
    can_view_operations: false,
    can_manage_infrastructure: false,
    can_approve_requests: false,
    can_submit_requests: false
  });
  
  const { token } = useJwtAuthStore();

  useEffect(() => {
    if (tabValue === 0) {
      loadRoles();
    } else if (tabValue === 1) {
      loadUsers();
    } else if (tabValue === 2) {
      loadAuditLogs();
    }
  }, [tabValue]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const response = await fetch(`${apiUrl}/api/admin/permissions/roles`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRoles(data.data);
        }
      }
    } catch (error) {
      console.error('역할 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const response = await fetch(`${apiUrl}/api/admin/users`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users);
        }
      }
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const response = await fetch(`${apiUrl}/api/admin/permissions/audit-logs?limit=100`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAuditLogs(data.data.logs);
        }
      }
    } catch (error) {
      console.error('감사 로그 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const response = await fetch(`${apiUrl}/api/admin/permissions/users/${userId}/permissions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedUser(data.data);
          setUserPermissionDialogOpen(true);
        }
      }
    } catch (error) {
      console.error('사용자 권한 로드 실패:', error);
    }
  };

  // [advice from AI] 역할 상세보기 핸들러
  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    setRoleDetailDialogOpen(true);
  };

  // [advice from AI] 역할 편집 핸들러
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setNewRoleData({
      role_name: role.role_name,
      role_display_name: role.role_display_name,
      description: role.description,
      permission_level: role.permission_level,
      can_read_all: role.can_read_all,
      can_write_all: role.can_write_all,
      can_delete_all: role.can_delete_all,
      can_admin_all: role.can_admin_all,
      can_manage_users: role.can_manage_users,
      can_manage_roles: role.can_manage_roles,
      can_view_logs: role.can_view_logs,
      can_manage_system: role.can_manage_system,
      can_view_monitoring: role.can_view_monitoring,
      can_manage_domains: role.can_manage_domains,
      can_manage_projects: role.can_manage_projects,
      can_manage_systems: role.can_manage_systems,
      can_manage_components: role.can_manage_components,
      can_manage_documents: role.can_manage_documents,
      can_manage_designs: role.can_manage_designs,
      can_deploy_services: role.can_deploy_services,
      can_manage_pipelines: role.can_manage_pipelines,
      can_view_operations: role.can_view_operations,
      can_manage_infrastructure: role.can_manage_infrastructure,
      can_approve_requests: role.can_approve_requests,
      can_submit_requests: role.can_submit_requests
    });
    setRoleEditDialogOpen(true);
  };

  // [advice from AI] 역할 삭제 핸들러
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`정말로 "${roleName}" 역할을 삭제하시겠습니까? 이 역할이 할당된 사용자들의 권한이 변경됩니다.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/permissions/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('역할이 성공적으로 삭제되었습니다.');
          loadRoles();
        }
      } else {
        const errorData = await response.json();
        alert(`역할 삭제 실패: ${errorData.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('역할 삭제 실패:', error);
      alert('역할 삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 역할 업데이트 핸들러
  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`/api/admin/permissions/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRoleData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('역할이 성공적으로 수정되었습니다.');
          loadRoles();
          setRoleEditDialogOpen(false);
          setSelectedRole(null);
        }
      } else {
        const errorData = await response.json();
        alert(`역할 수정 실패: ${errorData.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('역할 수정 실패:', error);
      alert('역할 수정 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 새 역할 생성 핸들러
  const handleCreateRole = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const response = await fetch(`${apiUrl}/api/admin/permissions/roles`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRoleData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 성공 시 목록 새로고침
          loadRoles();
          setDialogOpen(false);
          // 폼 초기화
          setNewRoleData({
            role_name: '',
            role_display_name: '',
            description: '',
            permission_level: 1,
            can_read_all: false,
            can_write_all: false,
            can_delete_all: false,
            can_admin_all: false,
            can_manage_users: false,
            can_manage_roles: false,
            can_view_logs: false,
            can_manage_system: false,
            can_view_monitoring: false,
            can_manage_domains: false,
            can_manage_projects: false,
            can_manage_systems: false,
            can_manage_components: false,
            can_manage_documents: false,
            can_manage_designs: false,
            can_deploy_services: false,
            can_manage_pipelines: false,
            can_view_operations: false,
            can_manage_infrastructure: false,
            can_approve_requests: false,
            can_submit_requests: false
          });
        } else {
          console.error('역할 생성 실패:', data.message);
        }
      } else {
        console.error('역할 생성 API 호출 실패:', response.status);
      }
    } catch (error) {
      console.error('역할 생성 중 오류:', error);
    }
  };

  const handleRoleAssignment = async () => {
    if (!selectedUserForRole || selectedRoles.length === 0) return;

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

      const response = await fetch(`${apiUrl}/api/admin/permissions/users/${selectedUserForRole.id}/roles`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleIds: selectedRoles,
          reason: '관리자에 의한 역할 할당'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRoleAssignmentDialogOpen(false);
          setSelectedUserForRole(null);
          setSelectedRoles([]);
          loadUsers(); // 사용자 목록 새로고침
          alert('역할이 성공적으로 할당되었습니다.');
        }
      }
    } catch (error) {
      console.error('역할 할당 실패:', error);
      alert('역할 할당 중 오류가 발생했습니다.');
    }
  };

  const getPermissionLevelColor = (level: number) => {
    if (level <= 10) return 'error';
    if (level <= 30) return 'warning';
    if (level <= 50) return 'info';
    return 'default';
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success': return 'success';
      case 'denied': return 'error';
      case 'error': return 'warning';
      default: return 'default';
    }
  };

  const renderPermissionChips = (permissions: Record<string, boolean>) => {
    const truePermissions = Object.entries(permissions)
      .filter(([key, value]) => value)
      .map(([key]) => key);

    return truePermissions.slice(0, 5).map(permission => (
      <Chip 
        key={permission} 
        label={permission.replace('can_', '').replace('_', ' ')} 
        size="small" 
        sx={{ mr: 0.5, mb: 0.5 }}
      />
    ));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>권한 관리</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        사용자 역할 및 권한을 체계적으로 관리합니다
      </Typography>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab 
          label="역할 관리" 
          icon={<SecurityIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="사용자 권한" 
          icon={<PersonIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="감사 로그" 
          icon={<HistoryIcon />} 
          iconPosition="start"
        />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* 역할 관리 탭 */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">시스템 역할 ({roles.length})</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setDialogOpen(true)}
                  >
                    새 역할 생성
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>역할명</TableCell>
                        <TableCell>권한 레벨</TableCell>
                        <TableCell>할당된 사용자</TableCell>
                        <TableCell>주요 권한</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell align="center">작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {role.role_display_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {role.role_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`레벨 ${role.permission_level}`}
                              color={getPermissionLevelColor(role.permission_level) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${role.assigned_users_count}명`}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {role.can_admin_all && <Chip label="전체 관리" color="error" size="small" />}
                              {role.can_manage_users && <Chip label="사용자 관리" size="small" />}
                              {role.can_deploy_services && <Chip label="서비스 배포" size="small" />}
                              {role.can_manage_projects && <Chip label="프로젝트 관리" size="small" />}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={role.is_active ? '활성' : '비활성'}
                              color={role.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="상세 보기">
                              <IconButton size="small" onClick={() => handleViewRole(role)} color="primary">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="편집">
                              <IconButton size="small" onClick={() => handleEditRole(role)} color="info">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="삭제">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteRole(role.id, role.role_display_name)}
                                color="error"
                                disabled={role.role_name === 'admin' || role.assigned_users_count > 0}
                              >
                                <DeleteIcon />
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
          </Grid>
        </Grid>
      )}

      {/* 사용자 권한 탭 */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  사용자별 권한 현황 ({users.length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>사용자</TableCell>
                        <TableCell>이메일</TableCell>
                        <TableCell>기존 역할</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell align="center">작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {user.full_name?.charAt(0) || user.username.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {user.full_name || user.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  @{user.username}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip 
                              label={user.role || '없음'} 
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={user.status || '활성'}
                              color={user.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="권한 조회">
                              <IconButton 
                                size="small"
                                onClick={() => loadUserPermissions(user.id)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="역할 할당">
                              <IconButton 
                                size="small"
                                onClick={() => {
                                  setSelectedUserForRole(user);
                                  setRoleAssignmentDialogOpen(true);
                                }}
                              >
                                <GroupIcon />
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
          </Grid>
        </Grid>
      )}

      {/* 감사 로그 탭 */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  권한 감사 로그 ({auditLogs.length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>시간</TableCell>
                        <TableCell>액션</TableCell>
                        <TableCell>대상 사용자</TableCell>
                        <TableCell>수행자</TableCell>
                        <TableCell>결과</TableCell>
                        <TableCell>사유</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(log.timestamp).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={log.action_type.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {log.target_full_name || log.target_username || '-'}
                          </TableCell>
                          <TableCell>
                            {log.performed_by_full_name || log.performed_by_username}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={log.result}
                              color={getResultColor(log.result) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {log.reason || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 사용자 권한 상세 다이얼로그 */}
      <Dialog 
        open={userPermissionDialogOpen} 
        onClose={() => setUserPermissionDialogOpen(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>사용자 권한 상세</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">
                    {selectedUser.full_name} ({selectedUser.username})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.email}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    할당된 역할 ({selectedUser.roles_count})
                  </Typography>
                  {selectedUser.roles.map((role, index) => (
                    <Accordion key={index}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={role.role_display_name}
                            color={getPermissionLevelColor(role.permission_level) as any}
                            size="small"
                          />
                          <Typography variant="body2">
                            할당일: {new Date(role.assigned_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {renderPermissionChips(role.permissions)}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    통합 권한 (최고 권한 레벨: {selectedUser.highest_permission_level})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {renderPermissionChips(selectedUser.effective_permissions)}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserPermissionDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 역할 할당 다이얼로그 */}
      <Dialog 
        open={roleAssignmentDialogOpen} 
        onClose={() => setRoleAssignmentDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>역할 할당</DialogTitle>
        <DialogContent>
          {selectedUserForRole && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>{selectedUserForRole.full_name}</strong>님에게 역할을 할당합니다.
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                할당할 역할 선택:
              </Typography>
              
              {roles.map((role) => (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Checkbox
                      checked={selectedRoles.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role.id]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                        }
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">
                        {role.role_display_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        권한 레벨: {role.permission_level} | {role.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleAssignmentDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleRoleAssignment}
            variant="contained"
            disabled={selectedRoles.length === 0}
          >
            할당
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 새 역할 생성 대화상자 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>새 역할 생성</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* 기본 정보 */}
            <Typography variant="h6" sx={{ mb: 2 }}>기본 정보</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="역할 코드"
                  value={newRoleData.role_name}
                  onChange={(e) => setNewRoleData({...newRoleData, role_name: e.target.value})}
                  placeholder="예: developer"
                  helperText="영문 소문자, 숫자, 언더스코어만 사용"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="역할 표시명"
                  value={newRoleData.role_display_name}
                  onChange={(e) => setNewRoleData({...newRoleData, role_display_name: e.target.value})}
                  placeholder="예: 개발자"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="설명"
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({...newRoleData, description: e.target.value})}
                  placeholder="역할에 대한 설명을 입력하세요"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>권한 레벨</InputLabel>
                  <Select
                    value={newRoleData.permission_level}
                    label="권한 레벨"
                    onChange={(e) => setNewRoleData({...newRoleData, permission_level: Number(e.target.value)})}
                  >
                    <MenuItem value={1}>1 - 기본 사용자</MenuItem>
                    <MenuItem value={2}>2 - 고급 사용자</MenuItem>
                    <MenuItem value={3}>3 - 팀 리더</MenuItem>
                    <MenuItem value={4}>4 - 관리자</MenuItem>
                    <MenuItem value={5}>5 - 시스템 관리자</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* 권한 설정 */}
            <Typography variant="h6" sx={{ mb: 2 }}>권한 설정</Typography>
            
            {/* 기본 권한 */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">기본 권한</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_read_all}
                          onChange={(e) => setNewRoleData({...newRoleData, can_read_all: e.target.checked})}
                        />
                      }
                      label="전체 읽기 권한"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_write_all}
                          onChange={(e) => setNewRoleData({...newRoleData, can_write_all: e.target.checked})}
                        />
                      }
                      label="전체 쓰기 권한"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_delete_all}
                          onChange={(e) => setNewRoleData({...newRoleData, can_delete_all: e.target.checked})}
                        />
                      }
                      label="전체 삭제 권한"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_admin_all}
                          onChange={(e) => setNewRoleData({...newRoleData, can_admin_all: e.target.checked})}
                        />
                      }
                      label="전체 관리자 권한"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 시스템 관리 권한 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">시스템 관리</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_users}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_users: e.target.checked})}
                        />
                      }
                      label="사용자 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_roles}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_roles: e.target.checked})}
                        />
                      }
                      label="역할 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_view_logs}
                          onChange={(e) => setNewRoleData({...newRoleData, can_view_logs: e.target.checked})}
                        />
                      }
                      label="로그 조회"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_system}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_system: e.target.checked})}
                        />
                      }
                      label="시스템 설정 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_view_monitoring}
                          onChange={(e) => setNewRoleData({...newRoleData, can_view_monitoring: e.target.checked})}
                        />
                      }
                      label="모니터링 조회"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 지식자원 관리 권한 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">지식자원 관리</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_domains}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_domains: e.target.checked})}
                        />
                      }
                      label="도메인 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_projects}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_projects: e.target.checked})}
                        />
                      }
                      label="프로젝트 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_systems}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_systems: e.target.checked})}
                        />
                      }
                      label="시스템 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_components}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_components: e.target.checked})}
                        />
                      }
                      label="컴포넌트 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_documents}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_documents: e.target.checked})}
                        />
                      }
                      label="문서 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_designs}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_designs: e.target.checked})}
                        />
                      }
                      label="디자인 관리"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 운영 권한 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">운영 권한</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_deploy_services}
                          onChange={(e) => setNewRoleData({...newRoleData, can_deploy_services: e.target.checked})}
                        />
                      }
                      label="서비스 배포"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_pipelines}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_pipelines: e.target.checked})}
                        />
                      }
                      label="파이프라인 관리"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_view_operations}
                          onChange={(e) => setNewRoleData({...newRoleData, can_view_operations: e.target.checked})}
                        />
                      }
                      label="운영 현황 조회"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_manage_infrastructure}
                          onChange={(e) => setNewRoleData({...newRoleData, can_manage_infrastructure: e.target.checked})}
                        />
                      }
                      label="인프라 관리"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* 승인 권한 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">승인 권한</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_approve_requests}
                          onChange={(e) => setNewRoleData({...newRoleData, can_approve_requests: e.target.checked})}
                        />
                      }
                      label="요청 승인"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newRoleData.can_submit_requests}
                          onChange={(e) => setNewRoleData({...newRoleData, can_submit_requests: e.target.checked})}
                        />
                      }
                      label="요청 제출"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleCreateRole}
            variant="contained"
            disabled={!newRoleData.role_name || !newRoleData.role_display_name}
          >
            생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 역할 상세보기 다이얼로그 */}
      <Dialog open={roleDetailDialogOpen} onClose={() => setRoleDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>역할 상세 정보</DialogTitle>
        <DialogContent dividers>
          {selectedRole && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>{selectedRole.role_display_name}</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {selectedRole.description}
                  </Typography>
                  <Chip label={`권한 레벨: ${selectedRole.permission_level}`} color="primary" sx={{ mr: 1 }} />
                  <Chip label={selectedRole.is_active ? '활성' : '비활성'} color={selectedRole.is_active ? 'success' : 'default'} />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">할당 정보</Typography>
                  <Typography variant="body2">
                    할당된 사용자: <strong>{selectedRole.assigned_users_count}명</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    생성일: {new Date(selectedRole.created_at).toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">권한 목록</Typography>
                  <Grid container spacing={1}>
                    {selectedRole.can_admin_all && (
                      <Grid item xs={6}><Chip label="전체 관리" color="error" size="small" /></Grid>
                    )}
                    {selectedRole.can_read_all && (
                      <Grid item xs={6}><Chip label="전체 읽기" size="small" /></Grid>
                    )}
                    {selectedRole.can_write_all && (
                      <Grid item xs={6}><Chip label="전체 쓰기" size="small" /></Grid>
                    )}
                    {selectedRole.can_delete_all && (
                      <Grid item xs={6}><Chip label="전체 삭제" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_users && (
                      <Grid item xs={6}><Chip label="사용자 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_roles && (
                      <Grid item xs={6}><Chip label="역할 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_view_logs && (
                      <Grid item xs={6}><Chip label="로그 조회" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_system && (
                      <Grid item xs={6}><Chip label="시스템 설정" size="small" /></Grid>
                    )}
                    {selectedRole.can_view_monitoring && (
                      <Grid item xs={6}><Chip label="모니터링 조회" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_domains && (
                      <Grid item xs={6}><Chip label="도메인 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_projects && (
                      <Grid item xs={6}><Chip label="프로젝트 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_systems && (
                      <Grid item xs={6}><Chip label="시스템 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_components && (
                      <Grid item xs={6}><Chip label="컴포넌트 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_documents && (
                      <Grid item xs={6}><Chip label="문서 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_designs && (
                      <Grid item xs={6}><Chip label="디자인 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_deploy_services && (
                      <Grid item xs={6}><Chip label="서비스 배포" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_pipelines && (
                      <Grid item xs={6}><Chip label="파이프라인 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_view_operations && (
                      <Grid item xs={6}><Chip label="운영 조회" size="small" /></Grid>
                    )}
                    {selectedRole.can_manage_infrastructure && (
                      <Grid item xs={6}><Chip label="인프라 관리" size="small" /></Grid>
                    )}
                    {selectedRole.can_approve_requests && (
                      <Grid item xs={6}><Chip label="요청 승인" size="small" /></Grid>
                    )}
                    {selectedRole.can_submit_requests && (
                      <Grid item xs={6}><Chip label="요청 제출" size="small" /></Grid>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDetailDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 역할 편집 다이얼로그 - 생성 다이얼로그와 동일한 구조 사용 */}
      <Dialog open={roleEditDialogOpen} onClose={() => setRoleEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>역할 편집</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            역할 이름(role_name)은 변경할 수 없습니다. 표시 이름과 권한만 수정 가능합니다.
          </Alert>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="역할 표시 이름"
              value={newRoleData.role_display_name}
              onChange={(e) => setNewRoleData({...newRoleData, role_display_name: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={2}
              value={newRoleData.description}
              onChange={(e) => setNewRoleData({...newRoleData, description: e.target.value})}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>권한 레벨</InputLabel>
              <Select
                value={newRoleData.permission_level}
                onChange={(e) => setNewRoleData({...newRoleData, permission_level: Number(e.target.value)})}
                label="권한 레벨"
              >
                <MenuItem value={0}>0 (최고 관리자)</MenuItem>
                <MenuItem value={1}>1 (시스템 관리자)</MenuItem>
                <MenuItem value={2}>2 (운영자)</MenuItem>
                <MenuItem value={3}>3 (개발자)</MenuItem>
                <MenuItem value={4}>4 (일반 사용자)</MenuItem>
              </Select>
            </FormControl>

            {/* 권한 체크박스들은 생성 다이얼로그와 동일 - 간략화 버전 */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>주요 권한</Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <FormControlLabel
                  control={<Checkbox checked={newRoleData.can_manage_users} onChange={(e) => setNewRoleData({...newRoleData, can_manage_users: e.target.checked})} />}
                  label="사용자 관리"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={<Checkbox checked={newRoleData.can_manage_roles} onChange={(e) => setNewRoleData({...newRoleData, can_manage_roles: e.target.checked})} />}
                  label="역할 관리"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={<Checkbox checked={newRoleData.can_deploy_services} onChange={(e) => setNewRoleData({...newRoleData, can_deploy_services: e.target.checked})} />}
                  label="서비스 배포"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={<Checkbox checked={newRoleData.can_manage_projects} onChange={(e) => setNewRoleData({...newRoleData, can_manage_projects: e.target.checked})} />}
                  label="프로젝트 관리"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRoleEditDialogOpen(false);
            setSelectedRole(null);
          }}>취소</Button>
          <Button 
            onClick={handleUpdateRole}
            variant="contained"
            color="primary"
          >
            수정 저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PermissionManagement;
