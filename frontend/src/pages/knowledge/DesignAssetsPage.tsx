// [advice from AI] 디자인 자산 페이지 - 프로젝트 페이지와 동일한 형태로 통일
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Container,
  Avatar
} from '@mui/material';
import { 
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Palette as PaletteIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import EmptyState from '../../components/common/EmptyState';

// [advice from AI] 디자인 자산 데이터 타입
interface DesignAsset {
  id: string;
  title: string;
  description: string;
  asset_type: 'component' | 'icon' | 'color_palette' | 'typography' | 'layout' | 'template';
  design_tool: 'figma' | 'sketch' | 'adobe_xd' | 'photoshop' | 'illustrator' | 'other';
  file_format: 'fig' | 'sketch' | 'xd' | 'psd' | 'ai' | 'svg' | 'png' | 'pdf';
  tags: string[];
  status: 'draft' | 'review' | 'approved' | 'deprecated';
  version: string;
  file_url: string;
  preview_url: string;
  download_count: number;
  star_count: number;
  file_size: number;
  created_at: string;
  updated_at: string;
}

const DesignAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterTool, setFilterTool] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<DesignAsset | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    asset_type: 'component' as DesignAsset['asset_type'],
    design_tool: 'figma' as DesignAsset['design_tool'],
    file_format: 'fig' as DesignAsset['file_format'],
    tags: [] as string[],
    status: 'draft' as DesignAsset['status'],
    version: '1.0.0',
    file_url: '',
    preview_url: ''
  });

  // [advice from AI] 디자인 도구 옵션
  const designToolOptions = [
    { value: 'figma', label: 'Figma' },
    { value: 'sketch', label: 'Sketch' },
    { value: 'adobe_xd', label: 'Adobe XD' },
    { value: 'photoshop', label: 'Photoshop' },
    { value: 'illustrator', label: 'Illustrator' },
    { value: 'other', label: '기타' }
  ];

  // [advice from AI] 파일 형식 옵션
  const fileFormatOptions = [
    { value: 'fig', label: 'Figma (.fig)' },
    { value: 'sketch', label: 'Sketch (.sketch)' },
    { value: 'xd', label: 'Adobe XD (.xd)' },
    { value: 'psd', label: 'Photoshop (.psd)' },
    { value: 'ai', label: 'Illustrator (.ai)' },
    { value: 'svg', label: 'SVG (.svg)' },
    { value: 'png', label: 'PNG (.png)' },
    { value: 'pdf', label: 'PDF (.pdf)' }
  ];

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 실제 API 호출 (현재는 빈 배열 반환)
      const response = await fetch('/api/knowledge/design-assets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      } else {
        // API가 없거나 실패할 경우 빈 배열로 설정
        setAssets([]);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // [advice from AI] 필터링된 자산 목록
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    const matchesType = filterType === 'all' || asset.asset_type === filterType;
    const matchesTool = filterTool === 'all' || asset.design_tool === filterTool;
    
    return matchesSearch && matchesStatus && matchesType && matchesTool;
  });

  // [advice from AI] 자산 생성
  const handleCreateAsset = async () => {
    try {
      console.log('🎨 디자인 자산 등록 시작:', formData);
      
      const response = await fetch('/api/knowledge/design-assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 디자인 자산 등록 성공:', result);
        alert('디자인 자산이 성공적으로 등록되었습니다.');
        
        setCreateDialog(false);
        setFormData({
          title: '',
          description: '',
          asset_type: 'component',
          design_tool: 'figma',
          file_format: 'fig',
          tags: [],
          status: 'draft',
          version: '1.0.0',
          file_url: '',
          preview_url: ''
        });
        loadData();
      } else {
        const errorData = await response.json();
        console.error('❌ 디자인 자산 등록 실패:', errorData);
        alert(`등록 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 디자인 자산 등록 중 오류:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          디자인 자산
        </Typography>
        <Typography variant="body1" color="text.secondary">
          UI/UX 디자인 리소스를 체계적으로 관리합니다. 각 자산은 재사용 가능한 디자인 컴포넌트와 리소스입니다.
        </Typography>
      </Box>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="디자인 자산 검색"
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="draft">초안</MenuItem>
                  <MenuItem value="review">검토중</MenuItem>
                  <MenuItem value="approved">승인됨</MenuItem>
                  <MenuItem value="deprecated">폐기예정</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>타입</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="타입"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="component">컴포넌트</MenuItem>
                  <MenuItem value="icon">아이콘</MenuItem>
                  <MenuItem value="color_palette">컬러 팔레트</MenuItem>
                  <MenuItem value="typography">타이포그래피</MenuItem>
                  <MenuItem value="layout">레이아웃</MenuItem>
                  <MenuItem value="template">템플릿</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>디자인 도구</InputLabel>
                <Select
                  value={filterTool}
                  onChange={(e) => setFilterTool(e.target.value)}
                  label="디자인 도구"
                >
                  <MenuItem value="all">전체</MenuItem>
                  {designToolOptions.map((tool) => (
                    <MenuItem key={tool.value} value={tool.value}>{tool.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              {permissions.canEditCatalog && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialog(true)}
                  fullWidth
                >
                  새 자산
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 자산 목록 */}
      {filteredAssets.length === 0 ? (
        assets.length === 0 ? (
          <EmptyState
            title="등록된 디자인 자산이 없습니다"
            description="아직 등록된 디자인 자산이 없습니다. 새로운 디자인 자산을 등록하여 UI/UX 리소스 라이브러리를 구축해보세요."
            actionText="자산 등록하기"
            actionPath="/knowledge/design-assets"
            secondaryActionText="코드 컴포넌트 먼저 만들기"
            secondaryActionPath="/knowledge/components"
          />
        ) : (
          <Alert severity="info" sx={{ textAlign: 'center', py: 3 }}>
            검색 조건에 맞는 디자인 자산이 없습니다. 다른 검색어를 시도해보세요.
          </Alert>
        )
      ) : (
        <Grid container spacing={3}>
          {filteredAssets.map((asset) => (
            <Grid item xs={12} sm={6} md={4} key={asset.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {asset.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {asset.asset_type} • {designToolOptions.find(t => t.value === asset.design_tool)?.label}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setViewDialog(true);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {asset.description || '디자인 자산 개요가 없습니다.'}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      파일 형식: {fileFormatOptions.find(f => f.value === asset.file_format)?.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      버전: {asset.version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      다운로드: {asset.download_count || 0}회
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {asset.tags.slice(0, 3).map((tag, index) => (
                      <Chip 
                        key={index}
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {asset.tags.length > 3 && (
                      <Chip 
                        label={`+${asset.tags.length - 3}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={asset.status}
                      size="small"
                      color={
                        asset.status === 'approved' ? 'success' :
                        asset.status === 'review' ? 'warning' :
                        asset.status === 'deprecated' ? 'error' : 'default'
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(asset.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setViewDialog(true);
                    }}
                    sx={{ 
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    상세보기
                  </Button>
                  
                  {permissions.canEditCatalog && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="자산 편집">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedAsset(asset);
                            setEditDialog(true);
                          }}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'primary.50'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="자산 삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm('이 디자인 자산을 삭제하시겠습니까?')) {
                              // 삭제 로직 구현
                            }
                          }}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'error.50'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 자산 생성 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 디자인 자산 등록</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="자산명"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>자산 타입</InputLabel>
              <Select
                value={formData.asset_type}
                onChange={(e) => setFormData({...formData, asset_type: e.target.value as DesignAsset['asset_type']})}
                label="자산 타입"
              >
                <MenuItem value="component">컴포넌트</MenuItem>
                <MenuItem value="icon">아이콘</MenuItem>
                <MenuItem value="color_palette">컬러 팔레트</MenuItem>
                <MenuItem value="typography">타이포그래피</MenuItem>
                <MenuItem value="layout">레이아웃</MenuItem>
                <MenuItem value="template">템플릿</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>디자인 도구</InputLabel>
              <Select
                value={formData.design_tool}
                onChange={(e) => setFormData({...formData, design_tool: e.target.value as DesignAsset['design_tool']})}
                label="디자인 도구"
              >
                {designToolOptions.map((tool) => (
                  <MenuItem key={tool.value} value={tool.value}>{tool.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>파일 형식</InputLabel>
              <Select
                value={formData.file_format}
                onChange={(e) => setFormData({...formData, file_format: e.target.value as DesignAsset['file_format']})}
                label="파일 형식"
              >
                {fileFormatOptions.map((format) => (
                  <MenuItem key={format.value} value={format.value}>{format.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="버전"
              value={formData.version}
              onChange={(e) => setFormData({...formData, version: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="파일 URL"
              value={formData.file_url}
              onChange={(e) => setFormData({...formData, file_url: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="미리보기 URL"
              value={formData.preview_url}
              onChange={(e) => setFormData({...formData, preview_url: e.target.value})}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleCreateAsset}>등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 디자인 자산 상세보기 다이얼로그 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            디자인 자산 상세 정보
            <IconButton onClick={() => setViewDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Box sx={{ pt: 1 }}>
              {/* 기본 정보 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  기본 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      자산명
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedAsset.title || selectedAsset.name || '이름 없음'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      자산 타입
                    </Typography>
                    <Chip 
                      label={selectedAsset.asset_type || '미정'} 
                      color="primary" 
                      variant="outlined" 
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      설명
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedAsset.description || '설명이 없습니다.'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* 파일 정보 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  파일 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      카테고리
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedAsset.category || '미정'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      다운로드 수
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedAsset.download_count || 0}회
                    </Typography>
                  </Grid>
                  {selectedAsset.file_url && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        파일 링크
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<LinkIcon />}
                        href={selectedAsset.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mb: 2 }}
                      >
                        파일 열기
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* 메타데이터 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  메타데이터
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      작성자
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedAsset.author || '알 수 없음'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      생성일
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedAsset.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      수정일
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedAsset.updated_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* 태그 */}
              {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                <Paper elevation={1} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    태그
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedAsset.tags.map((tag, index) => (
                      <Chip 
                        key={index} 
                        label={tag} 
                        variant="outlined" 
                        size="small"
                        color="secondary"
                      />
                    ))}
                  </Box>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>닫기</Button>
          {permissions.canEditCatalog && selectedAsset && (
            <>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => {
                  setViewDialog(false);
                  setSelectedAsset(selectedAsset);
                  setEditDialog(true);
                }}
              >
                편집
              </Button>
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setViewDialog(false);
                  if (window.confirm(`"${selectedAsset.title || selectedAsset.name}" 디자인 자산을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
                    // 삭제 로직 추가 필요
                    console.log('디자인 자산 삭제:', selectedAsset.id);
                  }
                }}
              >
                삭제
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 관련 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          디자인 자산에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Container>
  );
};

export default DesignAssetsPage;