// [advice from AI] APIs 관리 페이지 - CRUD 기능 구현
// API 문서 및 관리 기능을 제공하는 페이지

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] API 데이터 타입 정의
interface API {
  id: string;
  name: string;
  description: string;
  system_id: string;
  system_name: string;
  domain_name: string;
  owner_id: string;
  owner_name: string;
  endpoint: string;
  method: string;
  version: string;
  documentation_url: string;
  created_at: string;
  updated_at: string;
}

// [advice from AI] 시스템 데이터 타입 정의
interface System {
  id: string;
  name: string;
  domain_name: string;
}

const APIsPage: React.FC = () => {
  // [advice from AI] 상태 관리
  const [apis, setApis] = useState<API[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<API | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedApi, setSelectedApi] = useState<API | null>(null);

  // [advice from AI] 폼 데이터 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_id: '',
    endpoint: '',
    method: 'GET',
    version: '1.0.0',
    documentation_url: ''
  });

  // [advice from AI] HTTP 메서드 옵션
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadAPIs();
    loadSystems();
  }, []);

  // [advice from AI] APIs 데이터 로드
  const loadAPIs = async () => {
    try {
      setLoading(true);
      const token = useJwtAuthStore.getState().token;
      if (!token) {
        throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
      }
      const response = await fetch('http://localhost:3001/api/catalog/apis', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch APIs');
      }

      const result = await response.json();
      setApis(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load APIs');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 시스템 데이터 로드
  const loadSystems = async () => {
    try {
      const token = useJwtAuthStore.getState().token;
      if (!token) {
        return;
      }
      const response = await fetch('http://localhost:3001/api/catalog/systems', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSystems(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load systems:', err);
    }
  };

  // [advice from AI] 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      system_id: '',
      endpoint: '',
      method: 'GET',
      version: '1.0.0',
      documentation_url: ''
    });
    setEditingApi(null);
  };

  // [advice from AI] 다이얼로그 열기
  const handleOpenDialog = (api?: API) => {
    if (api) {
      setEditingApi(api);
      setFormData({
        name: api.name,
        description: api.description,
        system_id: api.system_id,
        endpoint: api.endpoint,
        method: api.method,
        version: api.version,
        documentation_url: api.documentation_url || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  // [advice from AI] 다이얼로그 닫기
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // [advice from AI] 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = useJwtAuthStore.getState().token;
      if (!token) {
        throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
      }
      const url = editingApi 
        ? `http://localhost:3001/api/catalog/apis/${editingApi.id}`
        : 'http://localhost:3001/api/catalog/apis';
      
      const method = editingApi ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API');
      }

      handleCloseDialog();
      loadAPIs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API');
    }
  };

  // [advice from AI] API 삭제
  const handleDelete = async (api: API) => {
    if (!window.confirm(`Are you sure you want to delete "${api.name}"?`)) {
      return;
    }

    try {
      const token = useJwtAuthStore.getState().token;
      if (!token) {
        throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
      }
      const response = await fetch(`http://localhost:3001/api/catalog/apis/${api.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete API');
      }

      loadAPIs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API');
    }
  };

  // [advice from AI] 메뉴 열기
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, api: API) => {
    setAnchorEl(event.currentTarget);
    setSelectedApi(api);
  };

  // [advice from AI] 메뉴 닫기
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedApi(null);
  };

  // [advice from AI] HTTP 메서드 색상 반환
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return '#4caf50';
      case 'POST': return '#2196f3';
      case 'PUT': return '#ff9800';
      case 'DELETE': return '#f44336';
      case 'PATCH': return '#9c27b0';
      default: return '#757575';
    }
  };

  // [advice from AI] 로딩 상태 처리
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // [advice from AI] 에러 상태 처리
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadAPIs} variant="contained">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            APIs 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            시스템 API 문서 및 관리
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ minWidth: 120 }}
        >
          API 추가
        </Button>
      </Box>

      {/* [advice from AI] APIs 테이블 */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>API 이름</TableCell>
                  <TableCell>시스템</TableCell>
                  <TableCell>엔드포인트</TableCell>
                  <TableCell>메서드</TableCell>
                  <TableCell>버전</TableCell>
                  <TableCell>소유자</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell align="right">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apis.map((api) => (
                  <TableRow key={api.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {api.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {api.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {api.system_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {api.domain_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {api.endpoint}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={api.method}
                        size="small"
                        sx={{
                          backgroundColor: getMethodColor(api.method),
                          color: 'white',
                          fontWeight: 600,
                          minWidth: 60
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{api.version}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{api.owner_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(api.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => handleMenuOpen(e, api)}
                      >
                        작업
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {apis.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                등록된 API가 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                새로운 API를 추가하여 시작하세요
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                첫 번째 API 추가
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 작업 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleMenuClose();
          handleOpenDialog(selectedApi!);
        }}>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          if (selectedApi) {
            window.open(selectedApi.documentation_url, '_blank');
          }
        }}>
          <ListItemText>문서 보기</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          if (selectedApi) {
            handleDelete(selectedApi);
          }
        }} sx={{ color: 'error.main' }}>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* [advice from AI] API 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingApi ? 'API 수정' : '새 API 추가'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="API 이름"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
              
              <TextField
                label="설명"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />

              <FormControl fullWidth required>
                <InputLabel>시스템</InputLabel>
                <Select
                  value={formData.system_id}
                  onChange={(e) => setFormData({ ...formData, system_id: e.target.value })}
                  label="시스템"
                >
                  {systems.map((system) => (
                    <MenuItem key={system.id} value={system.id}>
                      {system.name} ({system.domain_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="엔드포인트"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                placeholder="/api/v1/users"
                required
                fullWidth
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>HTTP 메서드</InputLabel>
                  <Select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    label="HTTP 메서드"
                  >
                    {httpMethods.map((method) => (
                      <MenuItem key={method} value={method}>
                        {method}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="버전"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                  sx={{ flexGrow: 1 }}
                />
              </Box>

              <TextField
                label="문서 URL"
                value={formData.documentation_url}
                onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
                placeholder="https://api.example.com/docs"
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button type="submit" variant="contained">
              {editingApi ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default APIsPage;