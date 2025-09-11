// [advice from AI] 최고 관리자용 유저 관리 페이지
// PO-PE-QA-운영팀 구조의 역할별 권한 관리

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

// [advice from AI] 사용자 인터페이스 정의
interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleType: 'executive' | 'po' | 'pe' | 'qa' | 'operations';
  permissionLevel: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  permissions: {
    canManageUsers: boolean;
    canManageProjects: boolean;
    canAccessAnalytics: boolean;
    canDeployServices: boolean;
    canManageCode: boolean;
    canManageTests: boolean;
  };
}

// [advice from AI] 역할별 기본 권한 설정
const ROLE_PERMISSIONS = {
  executive: {
    canManageUsers: true,
    canManageProjects: true,
    canAccessAnalytics: true,
    canDeployServices: true,
    canManageCode: true,
    canManageTests: true,
  },
  po: {
    canManageUsers: false,
    canManageProjects: true,
    canAccessAnalytics: true,
    canDeployServices: false,
    canManageCode: false,
    canManageTests: false,
  },
  pe: {
    canManageUsers: false,
    canManageProjects: false,
    canAccessAnalytics: false,
    canDeployServices: false,
    canManageCode: true,
    canManageTests: false,
  },
  qa: {
    canManageUsers: false,
    canManageProjects: false,
    canAccessAnalytics: false,
    canDeployServices: false,
    canManageCode: false,
    canManageTests: true,
  },
  operations: {
    canManageUsers: false,
    canManageProjects: false,
    canAccessAnalytics: false,
    canDeployServices: true,
    canManageCode: false,
    canManageTests: false,
  },
};

const UserManagement: React.FC = () => {
  // [advice from AI] 상태 관리
  const [users, setUsers] = useState<User[]>([
    {
      id: 'exec-001',
      username: 'executive',
      email: 'executive@timbel.com',
      fullName: '최고 관리자',
      roleType: 'executive',
      permissionLevel: 0,
      isActive: true,
      lastLogin: '2024-01-15 09:30',
      createdAt: '2024-01-01',
      permissions: ROLE_PERMISSIONS.executive,
    },
    {
      id: 'po-001',
      username: 'pouser',
      email: 'po@timbel.com',
      fullName: 'PO 사용자',
      roleType: 'po',
      permissionLevel: 1,
      isActive: true,
      lastLogin: '2024-01-15 08:45',
      createdAt: '2024-01-01',
      permissions: ROLE_PERMISSIONS.po,
    },
    {
      id: 'pe-001',
      username: 'peuser',
      email: 'pe@timbel.com',
      fullName: 'PE 사용자',
      roleType: 'pe',
      permissionLevel: 2,
      isActive: true,
      lastLogin: '2024-01-15 10:15',
      createdAt: '2024-01-01',
      permissions: ROLE_PERMISSIONS.pe,
    },
    {
      id: 'qa-001',
      username: 'qauser',
      email: 'qa@timbel.com',
      fullName: 'QA 사용자',
      roleType: 'qa',
      permissionLevel: 3,
      isActive: true,
      lastLogin: '2024-01-15 11:20',
      createdAt: '2024-01-01',
      permissions: ROLE_PERMISSIONS.qa,
    },
    {
      id: 'op-001',
      username: 'opuser',
      email: 'operations@timbel.com',
      fullName: '운영팀 사용자',
      roleType: 'operations',
      permissionLevel: 4,
      isActive: true,
      lastLogin: '2024-01-15 07:30',
      createdAt: '2024-01-01',
      permissions: ROLE_PERMISSIONS.operations,
    },
  ]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>('');

  // [advice from AI] 역할별 색상 매핑
  const getRoleColor = (roleType: string) => {
    switch (roleType) {
      case 'executive': return 'error';
      case 'po': return 'warning';
      case 'pe': return 'info';
      case 'qa': return 'success';
      case 'operations': return 'secondary';
      default: return 'default';
    }
  };

  // [advice from AI] 역할별 표시 텍스트
  const getRoleText = (roleType: string) => {
    switch (roleType) {
      case 'executive': return '최고 관리자';
      case 'po': return 'PO (프로젝트 오너)';
      case 'pe': return 'PE (프로젝트 엔지니어)';
      case 'qa': return 'QA/QC';
      case 'operations': return '운영팀';
      default: return '사용자';
    }
  };

  // [advice from AI] 사용자 편집 핸들러
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  // [advice from AI] 사용자 삭제 핸들러
  const handleDeleteUser = (userId: string) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      setUsers(users.filter(user => user.id !== userId));
      setAlertMessage('사용자가 삭제되었습니다.');
    }
  };

  // [advice from AI] 사용자 상태 토글
  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, isActive: !user.isActive } : user
    ));
  };

  // [advice from AI] 권한 업데이트
  const handlePermissionUpdate = (userId: string, permission: keyof User['permissions'], value: boolean) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, permissions: { ...user.permissions, [permission]: value } }
        : user
    ));
  };

  // [advice from AI] 새 사용자 추가
  const handleAddUser = () => {
    setNewUserDialogOpen(true);
  };

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            유저 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            PO-PE-QA-운영팀 구조의 역할별 권한을 관리합니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleAddUser}
          sx={{ height: 40 }}
        >
          새 사용자 추가
        </Button>
      </Box>

      {/* [advice from AI] 알림 메시지 */}
      {alertMessage && (
        <Alert 
          severity="success" 
          onClose={() => setAlertMessage('')}
          sx={{ mb: 3 }}
        >
          {alertMessage}
        </Alert>
      )}

      {/* [advice from AI] 사용자 목록 테이블 */}
      <BackstageCard title="사용자 목록" variant="default">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>사용자 정보</TableCell>
                <TableCell>역할</TableCell>
                <TableCell>권한 레벨</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>마지막 로그인</TableCell>
                <TableCell>권한 설정</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {user.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getRoleText(user.roleType)} 
                      color={getRoleColor(user.roleType)}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      Level {user.permissionLevel}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.isActive ? '활성' : '비활성'} 
                      color={user.isActive ? 'success' : 'default'}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {user.lastLogin || '없음'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {Object.entries(user.permissions).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                          color={value ? 'success' : 'default'}
                          variant="outlined"
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="편집">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="상태 토글">
                        <Switch
                          checked={user.isActive}
                          onChange={() => handleToggleUserStatus(user.id)}
                          size="small"
                        />
                      </Tooltip>
                      {user.roleType !== 'executive' && (
                        <Tooltip title="삭제">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </BackstageCard>

      {/* [advice from AI] 통계 카드 */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <BackstageCard title="총 사용자" variant="default">
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {users.length}
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <BackstageCard title="활성 사용자" variant="default">
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
              {users.filter(u => u.isActive).length}
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <BackstageCard title="역할별 분포" variant="default">
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
              {Object.keys(ROLE_PERMISSIONS).length}
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <BackstageCard title="권한 관리" variant="default">
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
              {Object.keys(ROLE_PERMISSIONS.executive).length}
            </Typography>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* [advice from AI] 사용자 편집 다이얼로그 */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            사용자 권한 편집
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedUser.fullName} ({selectedUser.roleType})
              </Typography>
              
              <Grid container spacing={2}>
                {Object.entries(selectedUser.permissions).map(([key, value]) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          onChange={(e) => handlePermissionUpdate(
                            selectedUser.id, 
                            key as keyof User['permissions'], 
                            e.target.checked
                          )}
                        />
                      }
                      label={key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setEditDialogOpen(false);
              setAlertMessage('권한이 업데이트되었습니다.');
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 새 사용자 추가 다이얼로그 */}
      <Dialog 
        open={newUserDialogOpen} 
        onClose={() => setNewUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            새 사용자 추가
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="사용자명"
              fullWidth
              variant="outlined"
            />
            <TextField
              label="이메일"
              fullWidth
              variant="outlined"
              type="email"
            />
            <TextField
              label="전체 이름"
              fullWidth
              variant="outlined"
            />
            <FormControl fullWidth>
              <InputLabel>역할</InputLabel>
              <Select label="역할">
                <MenuItem value="po">PO (프로젝트 오너)</MenuItem>
                <MenuItem value="pe">PE (프로젝트 엔지니어)</MenuItem>
                <MenuItem value="qa">QA/QC</MenuItem>
                <MenuItem value="operations">운영팀</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="비밀번호"
              fullWidth
              variant="outlined"
              type="password"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewUserDialogOpen(false)}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setNewUserDialogOpen(false);
              setAlertMessage('새 사용자가 추가되었습니다.');
            }}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
