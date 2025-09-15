// [advice from AI] Resources 관리 페이지 - CRUD 기능 구현
// 리소스 및 에셋 관리 기능을 제공하는 페이지

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
  Tooltip,
  Grid,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  Code as CodeIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] Resource 데이터 타입 정의
interface Resource {
  id: string;
  name: string;
  description: string;
  type: string;
  owner_id: string;
  owner_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

const ResourcesPage: React.FC = () => {
  // [advice from AI] 상태 관리
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // [advice from AI] 폼 데이터 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'document',
    file_path: '',
    file_size: 0,
    mime_type: ''
  });

  // [advice from AI] 리소스 타입 옵션
  const resourceTypes = [
    { value: 'document', label: '문서', icon: DocumentIcon, color: '#1976d2' },
    { value: 'image', label: '이미지', icon: ImageIcon, color: '#388e3c' },
    { value: 'video', label: '비디오', icon: VideoIcon, color: '#d32f2f' },
    { value: 'audio', label: '오디오', icon: AudioIcon, color: '#7b1fa2' },
    { value: 'code', label: '코드', icon: CodeIcon, color: '#f57c00' },
    { value: 'archive', label: '아카이브', icon: ArchiveIcon, color: '#5d4037' },
    { value: 'other', label: '기타', icon: FolderIcon, color: '#616161' }
  ];

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadResources();
  }, []);

  // [advice from AI] Resources 데이터 로드 - 지식 데이터 통합
  const loadResources = async () => {
    try {
      setLoading(true);
      const token = useJwtAuthStore.getState().token;
      
      // 디자인 자산, 코드 컴포넌트, 문서를 모두 가져와서 통합
      const [designAssetsResponse, codeComponentsResponse, documentsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/design-assets', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:3001/api/code-components', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:3001/api/documents', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const [designAssets, codeComponents, documents] = await Promise.all([
        designAssetsResponse.ok ? designAssetsResponse.json() : { success: false, data: [] },
        codeComponentsResponse.ok ? codeComponentsResponse.json() : { success: false, data: [] },
        documentsResponse.ok ? documentsResponse.json() : { success: false, data: [] }
      ]);

      // 모든 지식 데이터를 통합하여 표시
      const allResources = [
        ...(designAssets.success ? designAssets.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          type: 'design_asset',
          category: item.category,
          tags: item.tags,
          version: item.version,
          created_at: item.created_at,
          creator_name: '디자인 자산'
        })) : []),
        ...(codeComponents.success ? codeComponents.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          type: 'code_component',
          category: item.type,
          tags: [item.language, item.framework].filter(Boolean),
          version: item.version,
          created_at: item.created_at,
          creator_name: item.creator_name || '코드 컴포넌트'
        })) : []),
        ...(documents.success ? documents.data.map((item: any) => ({
          id: item.id,
          name: item.title,
          description: item.content?.substring(0, 100) + '...',
          type: 'document',
          category: item.category,
          tags: item.tags,
          version: item.version,
          created_at: item.created_at,
          creator_name: item.creator_name || '문서'
        })) : [])
      ];

      setResources(allResources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'document',
      file_path: '',
      file_size: 0,
      mime_type: ''
    });
    setEditingResource(null);
  };

  // [advice from AI] 다이얼로그 열기
  const handleOpenDialog = (resource?: Resource) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({
        name: resource.name,
        description: resource.description,
        type: resource.type,
        file_path: resource.file_path,
        file_size: resource.file_size,
        mime_type: resource.mime_type
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
      const token = localStorage.getItem('token');
      const url = editingResource 
        ? `http://localhost:3001/api/catalog/resources/${editingResource.id}`
        : 'http://localhost:3001/api/catalog/resources';
      
      const method = editingResource ? 'PUT' : 'POST';
      
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
        throw new Error(errorData.error || 'Failed to save resource');
      }

      handleCloseDialog();
      loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    }
  };

  // [advice from AI] Resource 삭제
  const handleDelete = async (resource: Resource) => {
    if (!window.confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/catalog/resources/${resource.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete resource');
      }

      loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  };

  // [advice from AI] 메뉴 열기
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, resource: Resource) => {
    setAnchorEl(event.currentTarget);
    setSelectedResource(resource);
  };

  // [advice from AI] 메뉴 닫기
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedResource(null);
  };

  // [advice from AI] 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // [advice from AI] 리소스 타입 정보 가져오기
  const getResourceTypeInfo = (type: string) => {
    return resourceTypes.find(t => t.value === type) || resourceTypes[resourceTypes.length - 1];
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
        <Button onClick={loadResources} variant="contained">
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
            Resources 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            리소스 및 에셋 관리
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ minWidth: 120 }}
        >
          리소스 추가
        </Button>
      </Box>

      {/* [advice from AI] Resources 테이블 */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>리소스</TableCell>
                  <TableCell>타입</TableCell>
                  <TableCell>파일 크기</TableCell>
                  <TableCell>MIME 타입</TableCell>
                  <TableCell>소유자</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell align="right">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.map((resource) => {
                  const typeInfo = getResourceTypeInfo(resource.type);
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <TableRow key={resource.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: typeInfo.color, width: 40, height: 40 }}>
                            <TypeIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {resource.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {resource.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {resource.file_path}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeInfo.label}
                          size="small"
                          sx={{
                            backgroundColor: typeInfo.color,
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatFileSize(resource.file_size)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {resource.mime_type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{resource.owner_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(resource.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="작업 메뉴">
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, resource)}
                            size="small"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {resources.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                등록된 리소스가 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                새로운 리소스를 추가하여 시작하세요
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                첫 번째 리소스 추가
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
          handleOpenDialog(selectedResource!);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          if (selectedResource) {
            // 실제 다운로드 로직 구현 필요
            console.log('Download:', selectedResource.file_path);
          }
        }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>다운로드</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          if (selectedResource) {
            handleDelete(selectedResource);
          }
        }} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* [advice from AI] Resource 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingResource ? '리소스 수정' : '새 리소스 추가'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="리소스 이름"
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
                <InputLabel>리소스 타입</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  label="리소스 타입"
                >
                  {resourceTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <type.icon sx={{ color: type.color }} />
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="파일 경로"
                value={formData.file_path}
                onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                placeholder="/uploads/resources/example.pdf"
                required
                fullWidth
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="파일 크기 (bytes)"
                    type="number"
                    value={formData.file_size}
                    onChange={(e) => setFormData({ ...formData, file_size: parseInt(e.target.value) || 0 })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="MIME 타입"
                    value={formData.mime_type}
                    onChange={(e) => setFormData({ ...formData, mime_type: e.target.value })}
                    placeholder="application/pdf"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button type="submit" variant="contained">
              {editingResource ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ResourcesPage;