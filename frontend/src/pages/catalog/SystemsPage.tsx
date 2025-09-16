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
  Select
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface Domain {
  id: string;
  name: string;
}

interface System {
  id: string;
  name: string;
  description: string;
  domain_id: string;
  domain_name: string;
  owner_name: string;
  owner_role: string;
  status: string;
  version: string;
  created_at: string;
  updated_at: string;
}

const SystemsPage: React.FC = () => {
  const { user } = useJwtAuthStore();
  const [systems, setSystems] = useState<System[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);

  // [advice from AI] 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain_id: '',
    version: '1.0.0',
    status: 'active'
  });

  // [advice from AI] 도메인 목록 조회
  const fetchDomains = async () => {
    try {
      const token = useJwtAuthStore.getState().token;
      
      const response = await fetch('http://localhost:3001/api/catalog/domains', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }

      const result = await response.json();
      if (result.success) {
        setDomains(result.data);
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
    }
  };

  // [advice from AI] 시스템 목록 조회
  const fetchSystems = async () => {
    try {
      setLoading(true);
      const token = useJwtAuthStore.getState().token;
      
      const response = await fetch('http://localhost:3001/api/catalog/systems', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch systems');
      }

      const result = await response.json();
      if (result.success) {
        setSystems(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch systems');
      }
    } catch (err) {
      console.error('Error fetching systems:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDomains();
      fetchSystems();
    }
  }, [user]);

  // [advice from AI] 시스템 생성/수정
  const handleSubmit = async () => {
    try {
      const token = useJwtAuthStore.getState().token;
      const url = editingSystem 
        ? `http://localhost:3001/api/catalog/systems/${editingSystem.id}`
        : 'http://localhost:3001/api/catalog/systems';
      
      const method = editingSystem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save system');
      }

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        setFormData({ name: '', description: '', domain_id: '', version: '1.0.0', status: 'active' });
        setEditingSystem(null);
        fetchSystems(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to save system');
      }
    } catch (err) {
      console.error('Error saving system:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 시스템 삭제
  const handleDelete = async (system: System) => {
    if (!window.confirm(`시스템 "${system.name}"을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = useJwtAuthStore.getState().token;
      
      const response = await fetch(`http://localhost:3001/api/catalog/systems/${system.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete system');
      }

      const result = await response.json();
      if (result.success) {
        fetchSystems(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to delete system');
      }
    } catch (err) {
      console.error('Error deleting system:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 수정 모드로 다이얼로그 열기
  const handleEdit = (system: System) => {
    setEditingSystem(system);
    setFormData({
      name: system.name,
      description: system.description,
      domain_id: system.domain_id,
      version: system.version,
      status: system.status
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  // [advice from AI] 새 시스템 생성 모드로 다이얼로그 열기
  const handleCreate = () => {
    setEditingSystem(null);
    setFormData({ name: '', description: '', domain_id: '', version: '1.0.0', status: 'active' });
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'archived': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'archived': return '보관됨';
      default: return status;
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
            Systems
          </Typography>
          <Typography variant="body1" color="text.secondary">
            시스템 아키텍처를 관리합니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          새 시스템
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 시스템 목록 테이블 */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>도메인</TableCell>
                  <TableCell>설명</TableCell>
                  <TableCell>소유자</TableCell>
                  <TableCell>버전</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {systems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {system.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {system.domain_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {system.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {system.owner_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({system.owner_role})
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={system.version}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(system.status)}
                        color={getStatusColor(system.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(system.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedSystem(system);
                        }}
                      >
                        작업
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* [advice from AI] 액션 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedSystem && handleEdit(selectedSystem)}>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedSystem && handleDelete(selectedSystem)}>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* [advice from AI] 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSystem ? '시스템 수정' : '새 시스템 생성'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="시스템 이름"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>도메인</InputLabel>
            <Select
              value={formData.domain_id}
              label="도메인"
              onChange={(e) => setFormData({ ...formData, domain_id: e.target.value })}
            >
              {domains.map((domain) => (
                <MenuItem key={domain.id} value={domain.id}>
                  {domain.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="설명"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="버전"
            fullWidth
            variant="outlined"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="상태"
            fullWidth
            select
            variant="outlined"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            SelectProps={{ native: true }}
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="archived">보관됨</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSystem ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemsPage;
