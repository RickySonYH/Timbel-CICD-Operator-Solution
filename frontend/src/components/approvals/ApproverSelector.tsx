// [advice from AI] 승인권자 선택 컴포넌트
// 회원 리스트에서 승인권자를 선택할 수 있는 기능

import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AdminPanelSettings as AdminIcon,
  Engineering as PEIcon,
  BugReport as QAIcon,
  Settings as OpsIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role_type: string;
  permission_level: number;
  department: string;
}

interface Approver {
  user_id: string;
  username: string;
  full_name: string;
  role_type: string;
  permission_level: number;
  level: number;
  timeout_hours: number;
  is_required: boolean;
}

interface ApproverSelectorProps {
  open: boolean;
  onClose: () => void;
  onApproversSelected: (approvers: Approver[]) => void;
  initialApprovers?: Approver[];
  approvalType?: string;
}

const ApproverSelector: React.FC<ApproverSelectorProps> = ({
  open,
  onClose,
  onApproversSelected,
  initialApprovers = [],
  approvalType = 'code_component'
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<Approver[]>(initialApprovers);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const { token } = useJwtAuthStore();

  // [advice from AI] 사용자 목록 로드
  const loadUsers = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/users?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open, token]);

  // [advice from AI] 역할별 아이콘
  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case 'admin': return <AdminIcon color="error" />;
      case 'po': return <PersonIcon color="primary" />;
      case 'pe': return <PEIcon color="info" />;
      case 'qa': return <QAIcon color="warning" />;
      case 'operations': return <OpsIcon color="success" />;
      default: return <PersonIcon />;
    }
  };

  // [advice from AI] 역할별 권장 타임아웃 시간
  const getRecommendedTimeout = (roleType: string, approvalType: string) => {
    const timeouts: { [key: string]: { [key: string]: number } } = {
      'code_component': { pe: 24, qa: 48, po: 72, admin: 96 },
      'solution_deployment': { pe: 48, qa: 24, ops: 24, po: 72 },
      'release_approval': { qa: 24, po: 48, ops: 24, admin: 96 },
      'bug_fix': { qa: 6, pe: 12, ops: 12 },
      'architecture_change': { pe: 72, po: 96, admin: 120 }
    };

    return timeouts[approvalType]?.[roleType] || 24;
  };

  // [advice from AI] 승인자 추가
  const addApprover = (user: User) => {
    const exists = selectedApprovers.find((a: Approver) => a.user_id === user.id);
    if (exists) return;

    const newApprover: Approver = {
      user_id: user.id,
      username: user.username,
      full_name: user.full_name,
      role_type: user.role_type,
      permission_level: user.permission_level,
      level: selectedApprovers.length + 1,
      timeout_hours: getRecommendedTimeout(user.role_type, approvalType),
      is_required: true
    };

    setSelectedApprovers([...selectedApprovers, newApprover]);
  };

  // [advice from AI] 승인자 제거
  const removeApprover = (userId: string) => {
    const newApprovers = selectedApprovers.filter((a: Approver) => a.user_id !== userId);
    // 레벨 재정렬
    const reorderedApprovers = newApprovers.map((approver: Approver, index: number) => ({
      ...approver,
      level: index + 1
    }));
    setSelectedApprovers(reorderedApprovers);
  };

  // [advice from AI] 승인자 순서 변경
  const moveApprover = (fromIndex: number, toIndex: number) => {
    const newApprovers = [...selectedApprovers];
    const [moved] = newApprovers.splice(fromIndex, 1);
    newApprovers.splice(toIndex, 0, moved);
    
    // 레벨 재정렬
    const reorderedApprovers = newApprovers.map((approver: Approver, index: number) => ({
      ...approver,
      level: index + 1
    }));
    setSelectedApprovers(reorderedApprovers);
  };

  // [advice from AI] 타임아웃 시간 변경
  const updateTimeout = (userId: string, hours: number) => {
    setSelectedApprovers(selectedApprovers.map((approver: Approver) => 
      approver.user_id === userId 
        ? { ...approver, timeout_hours: hours }
        : approver
    ));
  };

  // [advice from AI] 필터링된 사용자 목록
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = searchTerm === '' || 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === '' || user.role_type === filterRole;
    
    const notAlreadySelected = !selectedApprovers.find((a: Approver) => a.user_id === user.id);
    
    return matchesSearch && matchesRole && notAlreadySelected;
  });

  // [advice from AI] 저장 및 닫기
  const handleSave = () => {
    onApproversSelected(selectedApprovers);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        승인권자 선택
        <Typography variant="body2" color="text.secondary">
          {approvalType} 승인을 위한 승인권자를 선택하세요
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* [advice from AI] 사용자 검색 및 필터 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                사용자 목록
              </Typography>
              
              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="이름, 사용자명, 이메일로 검색"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    size="small"
                  />
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>역할</InputLabel>
                  <Select
                    value={filterRole}
                    onChange={(e: any) => setFilterRole(e.target.value)}
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="admin">관리자</MenuItem>
                    <MenuItem value="po">PO</MenuItem>
                    <MenuItem value="pe">PE</MenuItem>
                    <MenuItem value="qa">QA</MenuItem>
                    <MenuItem value="operations">운영팀</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {filteredUsers.map((user: User) => (
                <Card key={user.id} sx={{ mb: 1 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {getRoleIcon(user.role_type)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {user.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.username} • {user.role_type} • Level {user.permission_level}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => addApprover(user)}
                      >
                        추가
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              
              {filteredUsers.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  검색 결과가 없습니다
                </Typography>
              )}
            </Box>
          </Grid>

          {/* [advice from AI] 선택된 승인자 목록 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                선택된 승인자 ({selectedApprovers.length}명)
              </Typography>
            </Box>

            <List>
              {selectedApprovers.map((approver: Approver, index: number) => (
                <ListItem
                  key={approver.user_id}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {getRoleIcon(approver.role_type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {approver.full_name}
                        </Typography>
                        <Chip 
                          label={`${approver.level}단계`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {approver.username} • {approver.role_type}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <TextField
                            size="small"
                            type="number"
                            label="타임아웃(시간)"
                            value={approver.timeout_hours}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTimeout(approver.user_id, parseInt(e.target.value))}
                            sx={{ width: 120 }}
                            inputProps={{ min: 1, max: 168 }}
                          />
                        </Box>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {index > 0 && (
                      <Button
                        size="small"
                        onClick={() => moveApprover(index, index - 1)}
                      >
                        ↑
                      </Button>
                    )}
                    {index < selectedApprovers.length - 1 && (
                      <Button
                        size="small"
                        onClick={() => moveApprover(index, index + 1)}
                      >
                        ↓
                      </Button>
                    )}
                    <Tooltip title="제거">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeApprover(approver.user_id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
              
              {selectedApprovers.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  승인권자를 선택해주세요
                </Typography>
              )}
            </List>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          취소
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={selectedApprovers.length === 0}
        >
          선택 완료 ({selectedApprovers.length}명)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApproverSelector;
