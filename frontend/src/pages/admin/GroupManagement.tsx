// [advice from AI] 그룹 관리 페이지 컴포넌트
// 그룹 CRUD, 권한 할당, 사용자 멤버십 관리 등의 기능을 제공

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
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  PersonAdd as AddUserIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface Group {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
  createdAt: string;
  isActive: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleType: string;
}

const GroupManagement: React.FC = () => {
  const { user } = useJwtAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // [advice from AI] 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    permissions: [] as string[]
  });

  // [advice from AI] 권한 카테고리별 그룹화
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // [advice from AI] 그룹 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('jwt_token');
        
        // [advice from AI] 실제 API 호출 (향후 구현)
        // const response = await fetch('/api/admin/groups', {
        //   headers: { 'Authorization': `Bearer ${token}` }
        // });
        
        // [advice from AI] 목업 데이터 (실제 구현 시 제거)
        setGroups([
          {
            id: 1,
            name: '개발팀',
            description: '개발 관련 업무를 담당하는 팀',
            memberCount: 15,
            permissions: ['components.write', 'apis.write', 'resources.write'],
            createdAt: '2024-01-15',
            isActive: true
          },
          {
            id: 2,
            name: '디자인팀',
            description: 'UI/UX 디자인을 담당하는 팀',
            memberCount: 8,
            permissions: ['design.write', 'components.read'],
            createdAt: '2024-01-10',
            isActive: true
          },
          {
            id: 3,
            name: 'QA팀',
            description: '품질 보증을 담당하는 팀',
            memberCount: 12,
            permissions: ['components.read', 'apis.read', 'resources.read'],
            createdAt: '2024-01-08',
            isActive: true
          },
          {
            id: 4,
            name: '운영팀',
            description: '시스템 운영을 담당하는 팀',
            memberCount: 6,
            permissions: ['admin.read', 'monitoring.write'],
            createdAt: '2024-01-05',
            isActive: true
          }
        ]);

        setPermissions([
          { id: 'domains.read', name: 'Domains 조회', description: '도메인 정보를 조회할 수 있습니다', category: '카탈로그' },
          { id: 'domains.write', name: 'Domains 관리', description: '도메인을 생성, 수정, 삭제할 수 있습니다', category: '카탈로그' },
          { id: 'systems.read', name: 'Systems 조회', description: '시스템 정보를 조회할 수 있습니다', category: '카탈로그' },
          { id: 'systems.write', name: 'Systems 관리', description: '시스템을 생성, 수정, 삭제할 수 있습니다', category: '카탈로그' },
          { id: 'components.read', name: 'Components 조회', description: '컴포넌트 정보를 조회할 수 있습니다', category: '카탈로그' },
          { id: 'components.write', name: 'Components 관리', description: '컴포넌트를 생성, 수정, 삭제할 수 있습니다', category: '카탈로그' },
          { id: 'apis.read', name: 'APIs 조회', description: 'API 정보를 조회할 수 있습니다', category: '카탈로그' },
          { id: 'apis.write', name: 'APIs 관리', description: 'API를 생성, 수정, 삭제할 수 있습니다', category: '카탈로그' },
          { id: 'resources.read', name: 'Resources 조회', description: '리소스 정보를 조회할 수 있습니다', category: '카탈로그' },
          { id: 'resources.write', name: 'Resources 관리', description: '리소스를 생성, 수정, 삭제할 수 있습니다', category: '카탈로그' },
          { id: 'design.read', name: '디자인 자산 조회', description: '디자인 자산을 조회할 수 있습니다', category: '지식 관리' },
          { id: 'design.write', name: '디자인 자산 관리', description: '디자인 자산을 등록하고 관리할 수 있습니다', category: '지식 관리' },
          { id: 'code.read', name: '코드 조회', description: '코드 자산을 조회할 수 있습니다', category: '지식 관리' },
          { id: 'code.write', name: '코드 관리', description: '코드 자산을 등록하고 관리할 수 있습니다', category: '지식 관리' },
          { id: 'docs.read', name: '문서 조회', description: '문서를 조회할 수 있습니다', category: '지식 관리' },
          { id: 'docs.write', name: '문서 관리', description: '문서를 등록하고 관리할 수 있습니다', category: '지식 관리' },
          { id: 'approval.read', name: '승인 조회', description: '승인 요청을 조회할 수 있습니다', category: '지식 관리' },
          { id: 'approval.write', name: '승인 관리', description: '승인 요청을 처리할 수 있습니다', category: '지식 관리' },
          { id: 'admin.read', name: '관리자 조회', description: '관리자 기능을 조회할 수 있습니다', category: '시스템 관리' },
          { id: 'admin.write', name: '관리자 관리', description: '관리자 기능을 사용할 수 있습니다', category: '시스템 관리' },
          { id: 'monitoring.read', name: '모니터링 조회', description: '모니터링 정보를 조회할 수 있습니다', category: '시스템 관리' },
          { id: 'monitoring.write', name: '모니터링 관리', description: '모니터링 설정을 관리할 수 있습니다', category: '시스템 관리' }
        ]);

        setUsers([
          { id: 1, username: 'dev1', email: 'dev1@company.com', fullName: '김개발', roleType: 'pe' },
          { id: 2, username: 'designer1', email: 'designer1@company.com', fullName: '이디자인', roleType: 'designer' },
          { id: 3, username: 'qa1', email: 'qa1@company.com', fullName: '박테스트', roleType: 'qa' },
          { id: 4, username: 'ops1', email: 'ops1@company.com', fullName: '최운영', roleType: 'operations' }
        ]);

      } catch (err) {
        console.error('Error loading group data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // [advice from AI] 검색 필터링
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // [advice from AI] 페이지네이션
  const paginatedGroups = filteredGroups.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // [advice from AI] 폼 핸들러
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // [advice from AI] 권한 토글
  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  // [advice from AI] 그룹 생성/수정
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const groupData = {
        ...formData,
        id: editingGroup?.id
      };

      // [advice from AI] 실제 API 호출 (향후 구현)
      // const response = await fetch(
      //   editingGroup ? `/api/admin/groups/${editingGroup.id}` : '/api/admin/groups',
      //   {
      //     method: editingGroup ? 'PUT' : 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'Authorization': `Bearer ${token}`
      //     },
      //     body: JSON.stringify(groupData)
      //   }
      // );

      if (editingGroup) {
        // [advice from AI] 그룹 수정
        setGroups(prev => prev.map(group => 
          group.id === editingGroup.id 
            ? { ...group, ...formData, memberCount: group.memberCount }
            : group
        ));
      } else {
        // [advice from AI] 그룹 생성
        const newGroup: Group = {
          id: Math.max(...groups.map(g => g.id)) + 1,
          ...formData,
          memberCount: 0,
          createdAt: new Date().toISOString().split('T')[0]
        };
        setGroups(prev => [...prev, newGroup]);
      }

      handleCloseDialog();
    } catch (err) {
      console.error('Error saving group:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 그룹 삭제
  const handleDelete = async (groupId: number) => {
    try {
      const token = localStorage.getItem('jwt_token');
      
      // [advice from AI] 실제 API 호출 (향후 구현)
      // await fetch(`/api/admin/groups/${groupId}`, {
      //   method: 'DELETE',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });

      setGroups(prev => prev.filter(group => group.id !== groupId));
      setAnchorEl(null);
      setSelectedGroup(null);
    } catch (err) {
      console.error('Error deleting group:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 대화상자 열기/닫기
  const handleOpenDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description,
        isActive: group.isActive,
        permissions: group.permissions
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        description: '',
        isActive: true,
        permissions: []
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      isActive: true,
      permissions: []
    });
  };

  // [advice from AI] 메뉴 핸들러
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: Group) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  // [advice from AI] 로딩 상태
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            그룹 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            그룹을 생성하고 권한을 관리합니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ height: '40px' }}
        >
          새 그룹 생성
        </Button>
      </Box>

      {/* [advice from AI] 에러 표시 */}
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
              placeholder="그룹명 또는 설명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] 그룹 목록 테이블 */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>그룹명</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>설명</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>멤버 수</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>권한</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>상태</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>생성일</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedGroups.map((group) => (
                  <TableRow key={group.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {group.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {group.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${group.memberCount}명`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {group.permissions.slice(0, 2).map((permission) => (
                          <Chip
                            key={permission}
                            label={permission}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {group.permissions.length > 2 && (
                          <Chip
                            label={`+${group.permissions.length - 2}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={group.isActive ? '활성' : '비활성'}
                        color={group.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {group.createdAt}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, group)}
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
          {filteredGroups.length > rowsPerPage && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={Math.ceil(filteredGroups.length / rowsPerPage)}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 그룹 생성/수정 대화상자 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGroup ? '그룹 수정' : '새 그룹 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="그룹명"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
              }
              label="활성 상태"
              sx={{ mt: 2 }}
            />
            
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              권한 설정
            </Typography>
            
            {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
              <Accordion key={category} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {category}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {categoryPermissions.map((permission) => (
                      <ListItem key={permission.id} disablePadding>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.permissions.includes(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {permission.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {permission.description}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            {editingGroup ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 액션 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedGroup) {
            handleOpenDialog(selectedGroup);
          }
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedGroup) {
            handleDelete(selectedGroup.id);
          }
        }}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default GroupManagement;
