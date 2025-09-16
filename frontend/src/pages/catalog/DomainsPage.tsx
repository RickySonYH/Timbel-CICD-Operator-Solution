import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
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
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface Domain {
  id: string;
  name: string;
  description: string;
  owner_name: string;
  owner_role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const DomainsPage: React.FC = () => {
  const { user } = useJwtAuthStore();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  // [advice from AI] 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  // [advice from AI] 도메인 목록 조회
  const fetchDomains = async () => {
    try {
      setLoading(true);
      const token = useJwtAuthStore.getState().token;
      
      if (!token) {
        throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
      }
      
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
      } else {
        throw new Error(result.error || 'Failed to fetch domains');
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDomains();
    }
  }, [user]);

  // [advice from AI] 도메인 생성/수정
  const handleSubmit = async () => {
    try {
      const token = useJwtAuthStore.getState().token;
      const url = editingDomain 
        ? `http://localhost:3001/api/catalog/domains/${editingDomain.id}`
        : 'http://localhost:3001/api/catalog/domains';
      
      const method = editingDomain ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save domain');
      }

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        setFormData({ name: '', description: '', status: 'active' });
        setEditingDomain(null);
        fetchDomains(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to save domain');
      }
    } catch (err) {
      console.error('Error saving domain:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 도메인 삭제
  const handleDelete = async (domain: Domain) => {
    if (!window.confirm(`도메인 "${domain.name}"을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = useJwtAuthStore.getState().token;
      
      const response = await fetch(`http://localhost:3001/api/catalog/domains/${domain.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete domain');
      }

      const result = await response.json();
      if (result.success) {
        fetchDomains(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to delete domain');
      }
    } catch (err) {
      console.error('Error deleting domain:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 수정 모드로 다이얼로그 열기
  const handleEdit = (domain: Domain) => {
    setEditingDomain(domain);
    setFormData({
      name: domain.name,
      description: domain.description,
      status: domain.status
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  // [advice from AI] 새 도메인 생성 모드로 다이얼로그 열기
  const handleCreate = () => {
    setEditingDomain(null);
    setFormData({ name: '', description: '', status: 'active' });
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
            Domains
          </Typography>
          <Typography variant="body1" color="text.secondary">
            비즈니스 도메인을 관리합니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          새 도메인
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 도메인 목록 테이블 */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>설명</TableCell>
                  <TableCell>소유자</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {domain.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {domain.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {domain.owner_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({domain.owner_role})
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(domain.status)}
                        color={getStatusColor(domain.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(domain.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedDomain(domain);
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
        <MenuItem onClick={() => selectedDomain && handleEdit(selectedDomain)}>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedDomain && handleDelete(selectedDomain)}>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* [advice from AI] 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDomain ? '도메인 수정' : '새 도메인 생성'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="도메인 이름"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
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
            {editingDomain ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DomainsPage;
