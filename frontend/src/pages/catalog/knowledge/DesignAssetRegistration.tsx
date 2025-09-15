import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
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
  Alert,
  CircularProgress,
  InputAdornment,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface DesignAsset {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  license: string;
  file_info: {
    originalName: string;
    filename: string;
    size: number;
    mimetype: string;
  };
  creator_name: string;
  download_count: number;
  created_at: string;
  updated_at: string;
}

interface DesignAssetFormData {
  name: string;
  description: string;
  category: string;
  tags: string;
  version: string;
  license: string;
  file: File | null;
}

const DesignAssetRegistration: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DesignAsset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const [formData, setFormData] = useState<DesignAssetFormData>({
    name: '',
    description: '',
    category: '',
    tags: '',
    version: '1.0.0',
    license: 'MIT',
    file: null
  });

  const categories = [
    'Icons', 'Illustrations', 'UI Components', 'Templates',
    'Brand Assets', 'Photography', 'Vectors', 'Mockups'
  ];

  const licenses = ['MIT', 'Apache 2.0', 'GPL 3.0', 'CC BY 4.0', 'Proprietary'];

  // [advice from AI] 디자인 자산 목록 조회
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (tagFilter) params.append('tag', tagFilter);

      const response = await fetch(`http://localhost:3001/api/design-assets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch design assets');
      }

      const data = await response.json();
      setAssets(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAssets();
    }
  }, [token, searchTerm, categoryFilter, tagFilter]);

  // [advice from AI] 디자인 자산 생성
  const handleCreateAsset = async () => {
    if (!formData.file) {
      setError('파일을 선택해주세요');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('version', formData.version);
      formDataToSend.append('license', formData.license);
      formDataToSend.append('file', formData.file);

      const response = await fetch('http://localhost:3001/api/design-assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to create design asset');
      }

      setOpenDialog(false);
      resetForm();
      fetchAssets();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 디자인 자산 수정
  const handleUpdateAsset = async () => {
    if (!editingAsset) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/design-assets/${editingAsset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          version: formData.version,
          license: formData.license
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update design asset');
      }

      setOpenDialog(false);
      setEditingAsset(null);
      resetForm();
      fetchAssets();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 디자인 자산 삭제
  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/design-assets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete design asset');
      }

      fetchAssets();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 파일 다운로드
  const handleDownloadAsset = async (id: string, filename: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/design-assets/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      tags: '',
      version: '1.0.0',
      license: 'MIT',
      file: null
    });
  };

  const handleOpenDialog = (asset?: DesignAsset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name,
        description: asset.description,
        category: asset.category,
        tags: asset.tags.join(', '),
        version: asset.version,
        license: asset.license,
        file: null
      });
    } else {
      setEditingAsset(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAsset(null);
    resetForm();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('zip')) return '📦';
    return '📁';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            디자인 자산 등록
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            새 자산 등록
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 검색 및 필터 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="카테고리"
                  >
                    <MenuItem value="">전체</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="태그 필터"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 자산 목록 */}
        <Card>
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>파일</TableCell>
                      <TableCell>이름</TableCell>
                      <TableCell>카테고리</TableCell>
                      <TableCell>태그</TableCell>
                      <TableCell>버전</TableCell>
                      <TableCell>크기</TableCell>
                      <TableCell>다운로드</TableCell>
                      <TableCell>생성자</TableCell>
                      <TableCell>생성일</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <Typography variant="h6">
                            {getFileIcon(asset.file_info.mimetype)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {asset.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {asset.file_info.originalName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={asset.category} size="small" />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {asset.tags.map((tag, index) => (
                              <Chip key={index} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>{asset.version}</TableCell>
                        <TableCell>{formatFileSize(asset.file_info.size)}</TableCell>
                        <TableCell>{asset.download_count}</TableCell>
                        <TableCell>{asset.creator_name}</TableCell>
                        <TableCell>
                          {new Date(asset.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadAsset(asset.id, asset.file_info.originalName)}
                            title="다운로드"
                          >
                            <DownloadIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(asset)}
                            title="수정"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAsset(asset.id)}
                            title="삭제"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* 등록/수정 다이얼로그 */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingAsset ? '디자인 자산 수정' : '새 디자인 자산 등록'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="자산명"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="설명"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>카테고리</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      label="카테고리"
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="태그 (쉼표로 구분)"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="예: UI, 컴포넌트, 버튼"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="버전"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>라이선스</InputLabel>
                    <Select
                      value={formData.license}
                      onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                      label="라이선스"
                    >
                      {licenses.map((license) => (
                        <MenuItem key={license} value={license}>
                          {license}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {!editingAsset && (
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      fullWidth
                      sx={{ py: 2 }}
                    >
                      {formData.file ? formData.file.name : '파일 선택'}
                      <input
                        type="file"
                        hidden
                        accept="image/*,.pdf,.zip,.ai,.sketch,.fig"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, file });
                          }
                        }}
                      />
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button
              onClick={editingAsset ? handleUpdateAsset : handleCreateAsset}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : (editingAsset ? '수정' : '등록')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DesignAssetRegistration;