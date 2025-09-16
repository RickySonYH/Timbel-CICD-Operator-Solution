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
  Grid
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface System {
  id: string;
  name: string;
  domain_name: string;
}

interface Component {
  id: string;
  name: string;
  title?: string;
  description: string;
  type: string;
  system_id?: string;
  system_name?: string;
  domain_name?: string;
  owner_group?: string;
  lifecycle?: string;
  source_location?: string;
  deployment_info?: {
    version?: string;
    npm_package?: string;
    [key: string]: any;
  };
  performance_metrics?: {
    [key: string]: any;
  };
  reuse_stats?: {
    usage_count?: number;
    satisfaction_rate?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  // [advice from AI] 기존 필드들 (호환성)
  owner_name?: string;
  owner_role?: string;
  status?: string;
  version?: string;
  repository_url?: string;
  documentation_url?: string;
}

const ComponentsPage: React.FC = () => {
  const { user } = useJwtAuthStore();
  const [components, setComponents] = useState<Component[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // [advice from AI] 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_id: '',
    type: 'ui',
    version: '1.0.0',
    repository_url: '',
    documentation_url: '',
    status: 'active'
  });

  // [advice from AI] 시스템 목록 조회
  const fetchSystems = async () => {
    try {
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
      }
    } catch (err) {
      console.error('Error fetching systems:', err);
    }
  };

  // [advice from AI] 컴포넌트 목록 조회 - 실제 카탈로그 컴포넌트 데이터 사용
  const fetchComponents = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = useJwtAuthStore.getState().token;
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      console.log('📦 컴포넌트 목록 조회 시작');
      
      const response = await fetch('http://localhost:3001/api/catalog/components', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log(`✅ 컴포넌트 ${result.total}개 조회 성공`);
        
        // [advice from AI] 카탈로그 컴포넌트 데이터를 UI에 맞게 변환
        const transformedComponents = result.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          title: item.title,
          description: item.description,
          type: item.type,
          system_id: item.system_id,
          system_name: item.system_name || '미분류',
          domain_name: item.domain_name || '미분류',
          owner_group: item.owner_group,
          lifecycle: item.lifecycle,
          source_location: item.source_location,
          deployment_info: item.deployment_info,
          performance_metrics: item.performance_metrics,
          reuse_stats: item.reuse_stats,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
        setComponents(transformedComponents);
      } else {
        throw new Error(result.message || result.error || 'Failed to fetch components');
      }
    } catch (err) {
      console.error('❌ 컴포넌트 조회 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(`컴포넌트 목록을 불러올 수 없습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSystems();
      fetchComponents();
    }
  }, [user]);

  // [advice from AI] 컴포넌트 생성/수정
  const handleSubmit = async () => {
    try {
      const token = useJwtAuthStore.getState().token;
      const url = editingComponent 
        ? `http://localhost:3001/api/catalog/components/${editingComponent.id}`
        : 'http://localhost:3001/api/catalog/components';
      
      const method = editingComponent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save component');
      }

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        setFormData({ 
          name: '', 
          description: '', 
          system_id: '', 
          type: 'ui', 
          version: '1.0.0', 
          repository_url: '', 
          documentation_url: '', 
          status: 'active' 
        });
        setEditingComponent(null);
        fetchComponents(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to save component');
      }
    } catch (err) {
      console.error('Error saving component:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 컴포넌트 삭제
  const handleDelete = async (component: Component) => {
    if (!window.confirm(`컴포넌트 "${component.name}"을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = useJwtAuthStore.getState().token;
      
      const response = await fetch(`http://localhost:3001/api/catalog/components/${component.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete component');
      }

      const result = await response.json();
      if (result.success) {
        fetchComponents(); // 목록 새로고침
      } else {
        throw new Error(result.error || 'Failed to delete component');
      }
    } catch (err) {
      console.error('Error deleting component:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // [advice from AI] 수정 모드로 다이얼로그 열기
  const handleEdit = (component: Component) => {
    setEditingComponent(component);
    setFormData({
      name: component.name,
      description: component.description,
      system_id: component.system_id || '',
      type: component.type,
      version: component.version || component.deployment_info?.version || '1.0.0',
      repository_url: component.repository_url || '',
      documentation_url: component.documentation_url || '',
      status: component.status || component.lifecycle || 'active'
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  // [advice from AI] 새 컴포넌트 생성 모드로 다이얼로그 열기
  const handleCreate = () => {
    setEditingComponent(null);
    setFormData({ 
      name: '', 
      description: '', 
      system_id: '', 
      type: 'ui', 
      version: '1.0.0', 
      repository_url: '', 
      documentation_url: '', 
      status: 'active' 
    });
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

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ui': return 'UI 컴포넌트';
      case 'service': return '서비스';
      case 'library': return '라이브러리';
      case 'tool': return '도구';
      default: return type;
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
            Components
          </Typography>
          <Typography variant="body1" color="text.secondary">
            재사용 가능한 컴포넌트를 관리합니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          새 컴포넌트
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 컴포넌트 목록 테이블 */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>시스템</TableCell>
                  <TableCell>도메인</TableCell>
                  <TableCell>타입</TableCell>
                  <TableCell>소유자</TableCell>
                  <TableCell>버전</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                          {component.title || component.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {component.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {component.system_name || '미분류'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {component.domain_name || '미분류'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={component.type}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {component.owner_group}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={component.deployment_info?.version || '1.0.0'}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={component.lifecycle}
                        color={component.lifecycle === 'production' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(component.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedComponent(component);
                          setDetailDialogOpen(true);
                        }}
                      >
                        상세 보기
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
        <MenuItem onClick={() => selectedComponent && handleEdit(selectedComponent)}>
          <ListItemText>수정</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedComponent && handleDelete(selectedComponent)}>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* [advice from AI] 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingComponent ? '컴포넌트 수정' : '새 컴포넌트 생성'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="컴포넌트 이름"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>시스템</InputLabel>
            <Select
              value={formData.system_id}
              label="시스템"
              onChange={(e) => setFormData({ ...formData, system_id: e.target.value })}
            >
              {systems.map((system) => (
                <MenuItem key={system.id} value={system.id}>
                  {system.name} ({system.domain_name})
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
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>타입</InputLabel>
            <Select
              value={formData.type}
              label="타입"
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <MenuItem value="ui">UI 컴포넌트</MenuItem>
              <MenuItem value="service">서비스</MenuItem>
              <MenuItem value="library">라이브러리</MenuItem>
              <MenuItem value="tool">도구</MenuItem>
            </Select>
          </FormControl>
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
            label="저장소 URL"
            fullWidth
            variant="outlined"
            value={formData.repository_url}
            onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="문서 URL"
            fullWidth
            variant="outlined"
            value={formData.documentation_url}
            onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
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
            {editingComponent ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 컴포넌트 상세 보기 다이얼로그 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedComponent?.title || selectedComponent?.name} 상세 정보
            </Typography>
            <Chip
              label={selectedComponent?.lifecycle}
              color={selectedComponent?.lifecycle === 'production' ? 'success' : 'warning'}
              size="small"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedComponent && (
            <Grid container spacing={3}>
              {/* 기본 정보 */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      기본 정보
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        이름
                      </Typography>
                      <Typography variant="body1">
                        {selectedComponent.name}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        설명
                      </Typography>
                      <Typography variant="body1">
                        {selectedComponent.description}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        타입
                      </Typography>
                      <Chip label={selectedComponent.type} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        소유 팀
                      </Typography>
                      <Typography variant="body1">
                        {selectedComponent.owner_group}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* 배포 정보 */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      배포 정보
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        버전
                      </Typography>
                      <Typography variant="body1">
                        {selectedComponent.deployment_info?.version || '1.0.0'}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        NPM 패키지
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {selectedComponent.deployment_info?.npm_package || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        소스 위치
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        {selectedComponent.source_location}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* 성능 메트릭 */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      성능 메트릭
                    </Typography>
                    {selectedComponent.performance_metrics && Object.entries(selectedComponent.performance_metrics).map(([key, value]) => (
                      <Box key={key} sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                        <Typography variant="body1">
                          {String(value)}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* 재사용 통계 */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      재사용 통계
                    </Typography>
                    {selectedComponent.reuse_stats && (
                      <>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            사용 횟수
                          </Typography>
                          <Typography variant="h4" color="primary">
                            {selectedComponent.reuse_stats.usage_count}회
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            만족도
                          </Typography>
                          <Typography variant="h4" color="success.main">
                            {selectedComponent.reuse_stats.satisfaction_rate}/5.0
                          </Typography>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            닫기
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              // [advice from AI] 컴포넌트 다운로드/복사 기능
              navigator.clipboard.writeText(selectedComponent?.source_location || '');
            }}
          >
            소스 경로 복사
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComponentsPage;
