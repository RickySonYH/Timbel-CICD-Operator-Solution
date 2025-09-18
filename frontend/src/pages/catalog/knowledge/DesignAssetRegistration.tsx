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
import { useNavigate } from 'react-router-dom';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';
import KnowledgeAssetDetail from '../../../components/knowledge/KnowledgeAssetDetail';

interface DesignAsset {
  id: string;
  name: string;
  title?: string;
  description: string;
  category: string;
  file_type: string; // 추가된 속성
  file_path?: string;
  file_size?: number; // 추가된 속성
  file_size_bytes?: number;
  dimensions?: string;
  tags: string[] | string;
  version?: string;
  license?: string;
  file_info?: { // 선택적으로 변경
    originalName?: string;
    filename?: string;
    size?: number;
    mimetype?: string;
  };
  creator_name?: string;
  creator_id?: string;
  department_id?: string;
  download_count?: number;
  status?: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  // 관계 및 메타데이터 추가
  related_components?: any[];
  usage_locations?: any[];
  scan_metadata?: {
    owner?: string;
    scan_type?: string;
    owner_team?: string;
    scanner_version?: string;
  };
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
  const navigate = useNavigate();
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DesignAsset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<{
    type: 'design';
    id: string;
  } | null>(null);

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

      const response = await fetch(`/api/design-assets?${params}`, {
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

      const response = await fetch('/api/design-assets', {
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
      const response = await fetch(`/api/design-assets/${editingAsset.id}`, {
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
      const response = await fetch(`/api/design-assets/${id}`, {
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
      const response = await fetch(`/api/design-assets/${id}/download`, {
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
        tags: Array.isArray(asset.tags) ? asset.tags.join(', ') : asset.tags || '',
        version: asset.version || '1.0.0',
        license: asset.license || 'MIT',
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
    if (!mimetype || mimetype === 'unknown') return '📁';
    if (mimetype.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(mimetype)) return '🖼️';
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/knowledge/auto-registration')}
              color="secondary"
            >
              자동 등록
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              새 자산 등록
            </Button>
          </Box>
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

        {/* 인디케이터 설명 */}
        <Card sx={{ mb: 2, bgcolor: '#f8f9fa' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              📊 카드 인디케이터 가이드
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                • 🔗 관계: 연결된 지식 자산 수
                • 📍 사용처: 실제 사용되는 위치 수
                • 👤 스캔 정보: 자동 추출 메타데이터
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* 자산 목록 - 카드 형식 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {assets.map((asset) => (
              <Grid item xs={12} sm={6} md={4} key={asset.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* 파일 아이콘과 이름 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h4" sx={{ mr: 2 }}>
                        {getFileIcon(asset.file_info?.mimetype || asset.file_type || 'unknown')}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" noWrap>
                          {asset.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {asset.file_info?.originalName || asset.name}
                        </Typography>
                      </Box>
                    </Box>

                    {/* 설명 */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {asset.description || '설명 없음'}
                    </Typography>

                    {/* 카테고리 */}
                    <Box sx={{ mb: 2 }}>
                      <Chip label={asset.category} size="small" color="primary" />
                    </Box>

                    {/* 태그 */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {(Array.isArray(asset.tags) ? asset.tags : [asset.tags])
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((tag: string, index: number) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                      {(Array.isArray(asset.tags) ? asset.tags : [asset.tags]).filter(Boolean).length > 3 && (
                        <Chip label={`+${(Array.isArray(asset.tags) ? asset.tags : [asset.tags]).filter(Boolean).length - 3}개`} size="small" variant="outlined" />
                      )}
                    </Box>

                    {/* 메타 정보 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        버전: {asset.version || '1.0.0'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(asset.file_info?.size || asset.file_size || 0)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        다운로드: {asset.download_count || 0}회
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {asset.creator_name || 'RickySon'}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      생성일: {new Date(asset.created_at).toLocaleDateString('ko-KR')}
                    </Typography>

                    {/* 관계 및 다이어그램 인디케이터 */}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                      {asset.related_components && asset.related_components.length > 0 && (
                        <Chip 
                          label={`🔗 관계 ${asset.related_components.length}개`} 
                          size="small" 
                          variant="outlined" 
                          color="info"
                        />
                      )}
                      {asset.usage_locations && asset.usage_locations.length > 0 && (
                        <Chip 
                          label={`📍 사용처 ${asset.usage_locations.length}개`} 
                          size="small" 
                          variant="outlined" 
                          color="success"
                        />
                      )}
                      {asset.scan_metadata?.owner && (
                        <Chip 
                          label={`👤 ${asset.scan_metadata.owner}`} 
                          size="small" 
                          variant="outlined" 
                          color="default"
                        />
                      )}
                    </Box>
                  </CardContent>

                  {/* 액션 버튼 */}
                  <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadAsset(asset.id, asset.file_info?.originalName || asset.name)}
                        title="다운로드"
                        color="primary"
                      >
                        <DownloadIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setSelectedAsset({ type: 'design', id: asset.id })}
                        title="상세 보기"
                        color="info"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(asset)}
                        title="편집"
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
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

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

        {/* 상세 보기 다이얼로그 */}
        {selectedAsset && (
          <KnowledgeAssetDetail
            open={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
            assetType={selectedAsset.type}
            assetId={selectedAsset.id}
          />
        )}
      </Box>
    </Container>
  );
};

export default DesignAssetRegistration;