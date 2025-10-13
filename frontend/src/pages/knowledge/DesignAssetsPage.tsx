// [advice from AI] 디자인 자산 페이지 - UI/UX 디자인 리소스 관리
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 디자인 자산 데이터 타입
interface DesignAsset {
  id: string;
  title: string;
  description: string;
  asset_type: 'component' | 'icon' | 'color_palette' | 'typography' | 'layout' | 'template';
  design_tool: 'figma' | 'sketch' | 'adobe_xd' | 'photoshop' | 'illustrator' | 'other';
  file_format: 'fig' | 'sketch' | 'xd' | 'psd' | 'ai' | 'svg' | 'png' | 'pdf';
  owner: string;
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

// [advice from AI] 디자인 메트릭 타입
interface DesignMetrics {
  totalAssets: number;
  approvedAssets: number;
  recentlyUsed: number;
  totalDownloads: number;
  typeBreakdown: { [key: string]: number };
  toolBreakdown: { [key: string]: number };
  formatBreakdown: { [key: string]: number };
}

const DesignAssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [metrics, setMetrics] = useState<DesignMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [toolFilter, setToolFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
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
      
      const { token: authToken } = useJwtAuthStore.getState();
      const [assetsRes, metricsRes] = await Promise.all([
        fetch('/api/knowledge/design-assets', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/knowledge/design-assets/metrics', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(data.assets || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }
      
    } catch (error) {
      console.error('디자인 자산 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 디자인 자산 생성
  const handleCreateAsset = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('/api/knowledge/design-assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          owner_id: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('디자인 자산 생성 실패');
      }

      setCreateDialog(false);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('디자인 자산 생성 실패:', error);
    }
  };

  // [advice from AI] 폼 초기화
  const resetForm = () => {
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
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'review': return 'warning';
      case 'draft': return 'info';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 자산 타입별 라벨
  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case 'component': return 'UI 컴포넌트';
      case 'icon': return '아이콘';
      case 'color_palette': return '컬러 팔레트';
      case 'typography': return '타이포그래피';
      case 'layout': return '레이아웃';
      case 'template': return '템플릿';
      default: return type;
    }
  };

  // [advice from AI] 필터링된 자산 목록
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    const matchesTool = toolFilter === 'all' || asset.design_tool === toolFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesTool;
  });

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          디자인 자산
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          디자인 자산
        </Typography>
        <Typography variant="body1" color="text.secondary">
          UI/UX 디자인 리소스를 체계적으로 관리합니다
        </Typography>
      </Box>

      {/* [advice from AI] 메트릭 대시보드 */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 디자인 자산
                </Typography>
                <Typography variant="h4" color="primary">
                  {metrics.totalAssets}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  승인됨: {metrics.approvedAssets}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 다운로드
                </Typography>
                <Typography variant="h4" color="success.main">
                  {metrics.totalDownloads.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  누적 다운로드 수
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  최근 사용
                </Typography>
                <Typography variant="h4" color="info.main">
                  {metrics.recentlyUsed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  지난 30일 내
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  인기 도구
                </Typography>
                <Typography variant="h4" color="secondary.main">
                  {Object.entries(metrics.toolBreakdown || {})
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  가장 많이 사용됨
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`전체 (${assets.length})`} />
        <Tab label={`승인됨 (${assets.filter(a => a.status === 'approved').length})`} />
        <Tab label={`컴포넌트 (${assets.filter(a => a.asset_type === 'component').length})`} />
        <Tab label={`아이콘 (${assets.filter(a => a.asset_type === 'icon').length})`} />
      </Tabs>

      {/* [advice from AI] 검색 및 필터 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="디자인 자산 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>상태</InputLabel>
          <Select
            value={statusFilter}
            label="상태"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="approved">승인됨</MenuItem>
            <MenuItem value="review">검토중</MenuItem>
            <MenuItem value="draft">작성중</MenuItem>
            <MenuItem value="deprecated">사용중단</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>타입</InputLabel>
          <Select
            value={typeFilter}
            label="타입"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="component">컴포넌트</MenuItem>
            <MenuItem value="icon">아이콘</MenuItem>
            <MenuItem value="color_palette">컬러팔레트</MenuItem>
            <MenuItem value="typography">타이포그래피</MenuItem>
            <MenuItem value="layout">레이아웃</MenuItem>
            <MenuItem value="template">템플릿</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>도구</InputLabel>
          <Select
            value={toolFilter}
            label="도구"
            onChange={(e) => setToolFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            {designToolOptions.map(tool => (
              <MenuItem key={tool.value} value={tool.value}>{tool.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {permissions.canManageDesignAssets && (
          <Button 
            variant="contained" 
            onClick={() => setCreateDialog(true)}
            sx={{ ml: 'auto' }}
          >
            새 디자인 자산 등록
          </Button>
        )}
      </Box>

      {/* [advice from AI] 디자인 자산 목록 */}
      {filteredAssets.length === 0 ? (
        <Alert severity="info">
          {assets.length === 0 ? '등록된 디자인 자산이 없습니다.' : '검색 조건에 맞는 디자인 자산이 없습니다.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredAssets.map((asset) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={asset.id}>
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
                  {/* [advice from AI] 미리보기 이미지 */}
                  {asset.preview_url ? (
                    <Box 
                      component="img"
                      src={asset.preview_url}
                      alt={asset.title}
                      sx={{ 
                        width: '100%', 
                        height: 120, 
                        objectFit: 'cover',
                        borderRadius: 1,
                        mb: 2,
                        backgroundColor: 'grey.100'
                      }}
                    />
                  ) : (
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: 120, 
                        backgroundColor: 'grey.100',
                        borderRadius: 1,
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        미리보기 없음
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
                      {asset.title}
                    </Typography>
                    <Chip 
                      label={asset.status} 
                      color={getStatusColor(asset.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {asset.description.length > 80 ? 
                      asset.description.substring(0, 80) + '...' : 
                      asset.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={getAssetTypeLabel(asset.asset_type)} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={designToolOptions.find(t => t.value === asset.design_tool)?.label || asset.design_tool} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        ★ {asset.star_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ↓ {asset.download_count}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      v{asset.version}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => { setSelectedAsset(asset); setViewDialog(true); }}
                  >
                    상세보기
                  </Button>
                  {asset.file_url && (
                    <Button 
                      size="small" 
                      href={asset.file_url} 
                      target="_blank"
                    >
                      다운로드
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 디자인 자산 생성 대화상자 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 디자인 자산 등록</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                margin="dense"
                label="자산명"
                fullWidth
                variant="outlined"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="버전"
                fullWidth
                variant="outlined"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="설명"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="dense">
                <InputLabel>자산 타입</InputLabel>
                <Select
                  value={formData.asset_type}
                  label="자산 타입"
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value as any })}
                >
                  <MenuItem value="component">UI 컴포넌트</MenuItem>
                  <MenuItem value="icon">아이콘</MenuItem>
                  <MenuItem value="color_palette">컬러 팔레트</MenuItem>
                  <MenuItem value="typography">타이포그래피</MenuItem>
                  <MenuItem value="layout">레이아웃</MenuItem>
                  <MenuItem value="template">템플릿</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="dense">
                <InputLabel>디자인 도구</InputLabel>
                <Select
                  value={formData.design_tool}
                  label="디자인 도구"
                  onChange={(e) => setFormData({ ...formData, design_tool: e.target.value as any })}
                >
                  {designToolOptions.map(tool => (
                    <MenuItem key={tool.value} value={tool.value}>{tool.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="dense">
                <InputLabel>파일 형식</InputLabel>
                <Select
                  value={formData.file_format}
                  label="파일 형식"
                  onChange={(e) => setFormData({ ...formData, file_format: e.target.value as any })}
                >
                  {fileFormatOptions.map(format => (
                    <MenuItem key={format.value} value={format.value}>{format.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="파일 URL"
                fullWidth
                variant="outlined"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://www.figma.com/file/..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="미리보기 URL"
                fullWidth
                variant="outlined"
                value={formData.preview_url}
                onChange={(e) => setFormData({ ...formData, preview_url: e.target.value })}
                placeholder="https://example.com/preview.png"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button onClick={handleCreateAsset} variant="contained">등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 상세보기 대화상자 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>디자인 자산 상세 정보</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedAsset.title}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedAsset.description}</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="타입" secondary={getAssetTypeLabel(selectedAsset.asset_type)} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="디자인 도구" secondary={selectedAsset.design_tool} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="파일 형식" secondary={selectedAsset.file_format} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="버전" secondary={selectedAsset.version} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="다운로드" secondary={`${selectedAsset.download_count.toLocaleString()}회`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="별점" secondary={`${selectedAsset.star_count}개`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="파일 크기" secondary={`${(selectedAsset.file_size / 1024 / 1024).toFixed(1)}MB`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="업데이트" secondary={new Date(selectedAsset.updated_at).toLocaleDateString()} />
                    </ListItem>
                  </List>
                </Grid>
                {selectedAsset.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>태그</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedAsset.tags.map((tag, index) => (
                        <Chip key={index} label={tag} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>닫기</Button>
          {selectedAsset?.file_url && (
            <Button 
              href={selectedAsset.file_url} 
              target="_blank" 
              variant="contained"
            >
              다운로드
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          디자인 자산에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default DesignAssetsPage;
