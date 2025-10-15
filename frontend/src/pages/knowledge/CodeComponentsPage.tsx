// [advice from AI] 코드 컴포넌트 관리 페이지 - 재사용 가능한 코드 라이브러리 관리
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { 
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Launch as LaunchIcon,
  Download as DownloadIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 코드 컴포넌트 데이터 타입
interface CodeComponent {
  id: string;
  name: string;
  description: string;
  system_name: string;
  system_id: string;
  owner: string;
  type: 'ui' | 'service' | 'library' | 'tool' | 'utility' | 'hook' | 'api';
  language: string;
  framework: string;
  status: 'draft' | 'review' | 'approved' | 'deprecated';
  version: string;
  repository_url: string;
  documentation_url: string;
  npm_package: string;
  download_count: number;
  star_count: number;
  dependencies: string[];
  examples: string;
  license: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  last_used: string;
}

// [advice from AI] 코드 메트릭 타입
interface CodeMetrics {
  totalComponents: number;
  approvedComponents: number;
  recentlyUsed: number;
  totalDownloads: number;
  typeBreakdown: { [key: string]: number };
  languageBreakdown: { [key: string]: number };
  frameworkBreakdown: { [key: string]: number };
}

const CodeComponentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [components, setComponents] = useState<CodeComponent[]>([]);
  const [metrics, setMetrics] = useState<CodeMetrics | null>(null);
  const [systems, setSystems] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<CodeComponent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_id: '',
    type: 'ui' as CodeComponent['type'],
    language: 'JavaScript',
    framework: 'React',
    status: 'draft' as CodeComponent['status'],
    version: '1.0.0',
    repository_url: '',
    documentation_url: '',
    npm_package: '',
    dependencies: [] as string[],
    examples: '',
    license: 'MIT'
  });

  // [advice from AI] 프로그래밍 언어 옵션
  const languageOptions = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 
    'Rust', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'Dart'
  ];

  // [advice from AI] 프레임워크 옵션
  const frameworkOptions = [
    'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js',
    'Express', 'NestJS', 'FastAPI', 'Django', 'Spring Boot', 
    'ASP.NET Core', 'Laravel', 'Rails', 'Flutter', 'React Native'
  ];

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [componentsRes, metricsRes, systemsRes] = await Promise.all([
        fetch('/api/knowledge/code-components', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/knowledge/code-components/metrics', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/knowledge/systems', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (componentsRes.ok) {
        const data = await componentsRes.json();
        setComponents(data.components || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }

      if (systemsRes.ok) {
        const data = await systemsRes.json();
        setSystems(data.systems || []);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 생성
  const handleCreateComponent = async () => {
    try {
      const response = await fetch('/api/knowledge/code-components', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          owner_id: user?.id,
          dependencies: formData.dependencies.join(',')
        })
      });

      if (!response.ok) {
        throw new Error('컴포넌트 생성 실패');
      }

      setCreateDialog(false);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('컴포넌트 생성 실패:', error);
    }
  };

  // [advice from AI] 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      system_id: '',
      type: 'ui',
      language: 'JavaScript',
      framework: 'React',
      status: 'draft',
      version: '1.0.0',
      repository_url: '',
      documentation_url: '',
      npm_package: '',
      dependencies: [],
      examples: '',
      license: 'MIT'
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

  // [advice from AI] 타입별 라벨
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ui': return 'UI 컴포넌트';
      case 'service': return '서비스';
      case 'library': return '라이브러리';
      case 'tool': return '도구';
      case 'utility': return '유틸리티';
      case 'hook': return '훅';
      case 'api': return 'API';
      default: return type;
    }
  };

  // [advice from AI] 필터링된 컴포넌트 목록
  const filteredComponents = components.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         component.dependencies.some(dep => dep.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || component.status === statusFilter;
    const matchesType = typeFilter === 'all' || component.type === typeFilter;
    const matchesLanguage = languageFilter === 'all' || component.language === languageFilter;
    
    // 탭별 필터링
    let matchesTab = true;
    if (tabValue === 1) matchesTab = component.status === 'approved';
    if (tabValue === 2) matchesTab = component.download_count > 100;
    if (tabValue === 3) matchesTab = new Date(component.last_used) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return matchesSearch && matchesStatus && matchesType && matchesLanguage && matchesTab;
  });

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          코드 컴포넌트
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
          코드 컴포넌트
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          재사용 가능한 코드 라이브러리와 컴포넌트를 관리합니다
        </Typography>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>직접 생성 방식 적용:</strong> 승인 절차 없이 바로 코드 컴포넌트를 등록하고 관리할 수 있습니다.<br/>
            • <strong>즉시 등록</strong>: GitHub 레포지토리 URL 또는 파일 업로드로 즉시 등록<br/>
            • <strong>자동 분석</strong>: 코드 구조, 의존성, 사용법 자동 분석<br/>
            • <strong>버전 관리</strong>: Git 태그 기반 자동 버전 추적<br/>
            • <strong>사용 통계</strong>: 실시간 다운로드 및 사용 현황 추적
          </Typography>
        </Alert>
      </Box>

      {/* [advice from AI] 메트릭 대시보드 */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 컴포넌트
                </Typography>
                <Typography variant="h4" color="primary">
                  {metrics.totalComponents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  승인됨: {metrics.approvedComponents}개
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
                  지난 30일 내 사용
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  인기 언어
                </Typography>
                <Typography variant="h4" color="secondary.main">
                  {Object.entries(metrics.languageBreakdown || {})
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
        <Tab label={`전체 (${components.length})`} />
        <Tab label={`승인됨 (${components.filter(c => c.status === 'approved').length})`} />
        <Tab label={`인기 (${components.filter(c => c.download_count > 100).length})`} />
        <Tab label={`최근 사용 (${components.filter(c => new Date(c.last_used) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length})`} />
      </Tabs>

      {/* [advice from AI] 검색 및 필터 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="컴포넌트명, 설명, 의존성으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 350 }}
        />
        <FormControl sx={{ minWidth: 100 }}>
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
        <FormControl sx={{ minWidth: 100 }}>
          <InputLabel>타입</InputLabel>
          <Select
            value={typeFilter}
            label="타입"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="ui">UI</MenuItem>
            <MenuItem value="service">서비스</MenuItem>
            <MenuItem value="library">라이브러리</MenuItem>
            <MenuItem value="tool">도구</MenuItem>
            <MenuItem value="utility">유틸리티</MenuItem>
            <MenuItem value="hook">훅</MenuItem>
            <MenuItem value="api">API</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>언어</InputLabel>
          <Select
            value={languageFilter}
            label="언어"
            onChange={(e) => setLanguageFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            {languageOptions.map(lang => (
              <MenuItem key={lang} value={lang}>{lang}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {permissions.canManageCodeComponents && (
          <Button 
            variant="contained" 
            onClick={() => setCreateDialog(true)}
            sx={{ ml: 'auto' }}
          >
            새 컴포넌트 등록
          </Button>
        )}
      </Box>

      {/* [advice from AI] 컴포넌트 목록 */}
      {filteredComponents.length === 0 ? (
        <Alert severity="info">
          {components.length === 0 ? '등록된 코드 컴포넌트가 없습니다.' : '검색 조건에 맞는 컴포넌트가 없습니다.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredComponents.map((component) => (
            <Grid item xs={12} md={6} lg={4} key={component.id}>
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
                    <Typography variant="h6" component="div">
                      {component.name}
                    </Typography>
                    <Chip 
                      label={component.status} 
                      color={getStatusColor(component.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {component.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={getTypeLabel(component.type)} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={component.language} 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      label={component.framework} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      버전: {component.version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      시스템: {component.system_name}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        ★ {component.star_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ↓ {component.download_count}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(component.updated_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions>
                  <Button size="small" onClick={() => { setSelectedComponent(component); setViewDialog(true); }}>
                    상세보기
                  </Button>
                  {component.repository_url && (
                    <Button 
                      size="small" 
                      href={component.repository_url} 
                      target="_blank"
                      startIcon={<LaunchIcon />}
                    >
                      코드
                    </Button>
                  )}
                  {component.npm_package && (
                    <Button 
                      size="small" 
                      startIcon={<DownloadIcon />}
                      onClick={() => window.open(`https://www.npmjs.com/package/${component.npm_package}`, '_blank')}
                    >
                      NPM
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 컴포넌트 생성 대화상자 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>새 코드 컴포넌트 등록</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                margin="dense"
                label="컴포넌트명"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>시스템</InputLabel>
                <Select
                  value={formData.system_id}
                  label="시스템"
                  onChange={(e) => setFormData({ ...formData, system_id: e.target.value })}
                >
                  {systems.map((system) => (
                    <MenuItem key={system.id} value={system.id}>
                      {system.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>타입</InputLabel>
                <Select
                  value={formData.type}
                  label="타입"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="ui">UI 컴포넌트</MenuItem>
                  <MenuItem value="service">서비스</MenuItem>
                  <MenuItem value="library">라이브러리</MenuItem>
                  <MenuItem value="tool">도구</MenuItem>
                  <MenuItem value="utility">유틸리티</MenuItem>
                  <MenuItem value="hook">훅</MenuItem>
                  <MenuItem value="api">API</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>프로그래밍 언어</InputLabel>
                <Select
                  value={formData.language}
                  label="프로그래밍 언어"
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                >
                  {languageOptions.map(lang => (
                    <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>프레임워크</InputLabel>
                <Select
                  value={formData.framework}
                  label="프레임워크"
                  onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                >
                  {frameworkOptions.map(framework => (
                    <MenuItem key={framework} value={framework}>{framework}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="저장소 URL"
                fullWidth
                variant="outlined"
                value={formData.repository_url}
                onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="NPM 패키지명"
                fullWidth
                variant="outlined"
                value={formData.npm_package}
                onChange={(e) => setFormData({ ...formData, npm_package: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="사용 예시"
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={formData.examples}
                onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                placeholder="import { Button } from './Button';&#10;&#10;<Button variant='primary'>클릭</Button>"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button onClick={handleCreateComponent} variant="contained">등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 컴포넌트 상세보기 대화상자 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>컴포넌트 상세 정보</DialogTitle>
        <DialogContent>
          {selectedComponent && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedComponent.name}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedComponent.description}</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>기본 정보</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="타입" secondary={getTypeLabel(selectedComponent.type)} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="언어" secondary={selectedComponent.language} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="프레임워크" secondary={selectedComponent.framework} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="버전" secondary={selectedComponent.version} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="라이선스" secondary={selectedComponent.license} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>통계</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="다운로드" secondary={`${selectedComponent.download_count.toLocaleString()}회`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="별점" secondary={`${selectedComponent.star_count}개`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="파일 크기" secondary={`${(selectedComponent.file_size / 1024).toFixed(1)}KB`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="마지막 사용" secondary={new Date(selectedComponent.last_used).toLocaleDateString()} />
                    </ListItem>
                  </List>
                </Grid>
                {selectedComponent.dependencies.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>의존성</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedComponent.dependencies.map((dep, index) => (
                        <Chip key={index} label={dep} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}
                {selectedComponent.examples && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>사용 예시</Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                      <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {selectedComponent.examples}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>닫기</Button>
          {permissions.canManageCodeComponents && (
            <Button onClick={() => {
              setViewDialog(false);
              if (selectedComponent) {
                setFormData({
                  name: selectedComponent.name,
                  description: selectedComponent.description,
                  system_id: selectedComponent.system_id,
                  type: selectedComponent.type,
                  language: selectedComponent.language,
                  framework: selectedComponent.framework,
                  status: selectedComponent.status,
                  version: selectedComponent.version,
                  repository_url: selectedComponent.repository_url,
                  documentation_url: selectedComponent.documentation_url,
                  npm_package: selectedComponent.npm_package,
                  dependencies: selectedComponent.dependencies,
                  examples: selectedComponent.examples,
                  license: selectedComponent.license
                });
                setEditDialog(true);
              }
            }} variant="contained">
              수정
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          코드 컴포넌트에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default CodeComponentsPage;
