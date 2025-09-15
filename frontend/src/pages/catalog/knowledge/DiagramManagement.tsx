import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Switch,
  FormControlLabel,
  Slider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  AccountTree as DiagramIcon,
  Timeline as TimelineIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface Diagram {
  id: string;
  title: string;
  description: string;
  type: 'flowchart' | 'mindmap' | 'network' | 'hierarchy' | 'timeline';
  category: string;
  source_items: string[];
  status: 'generating' | 'completed' | 'error' | 'needs_review';
  created_at: string;
  updated_at: string;
  created_by: string;
  version: string;
  is_public: boolean;
  tags: string[];
  config: DiagramConfig;
}

interface DiagramConfig {
  layout: 'hierarchical' | 'force' | 'circular' | 'tree';
  theme: 'light' | 'dark' | 'colorful';
  nodeSize: number;
  edgeWidth: number;
  fontSize: number;
  showLabels: boolean;
  showTooltips: boolean;
  animationSpeed: number;
}

const DiagramManagement: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [showDiagramDialog, setShowDiagramDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    category: ''
  });

  // [advice from AI] 다이어그램 편집 상태
  const [diagramConfig, setDiagramConfig] = useState<DiagramConfig>({
    layout: 'hierarchical',
    theme: 'light',
    nodeSize: 50,
    edgeWidth: 2,
    fontSize: 12,
    showLabels: true,
    showTooltips: true,
    animationSpeed: 1000
  });

  // [advice from AI] 다이어그램 생성 상태
  const [newDiagram, setNewDiagram] = useState({
    title: '',
    description: '',
    type: 'flowchart',
    category: 'Knowledge Map',
    source_items: [] as string[],
    is_public: false
  });

  // [advice from AI] 타입별 아이콘 매핑
  const typeIcons = {
    flowchart: <TimelineIcon />,
    mindmap: <DiagramIcon />,
    network: <DiagramIcon />,
    hierarchy: <DiagramIcon />,
    timeline: <TimelineIcon />
  };

  // [advice from AI] 타입별 한글 텍스트
  const typeLabels = {
    flowchart: '플로우차트',
    mindmap: '마인드맵',
    network: '네트워크',
    hierarchy: '계층구조',
    timeline: '타임라인'
  };

  // [advice from AI] 상태별 색상 매핑
  const getStatusColor = (status: Diagram['status']) => {
    switch (status) {
      case 'generating': return 'warning';
      case 'completed': return 'success';
      case 'error': return 'error';
      case 'needs_review': return 'info';
      default: return 'default';
    }
  };

  // [advice from AI] 상태별 한글 텍스트
  const getStatusText = (status: Diagram['status']) => {
    switch (status) {
      case 'generating': return '생성중';
      case 'completed': return '완료';
      case 'error': return '오류';
      case 'needs_review': return '검토필요';
      default: return '알 수 없음';
    }
  };

  // [advice from AI] 다이어그램 목록 조회
  const fetchDiagrams = async () => {
    try {
      setLoading(true);
      
      // [advice from AI] 임시 데이터로 다이어그램 목록 시뮬레이션
      const mockData: Diagram[] = [
        {
          id: '1',
          title: 'React 컴포넌트 관계도',
          description: 'React 프로젝트의 컴포넌트 간 의존성과 관계를 보여주는 다이어그램입니다.',
          type: 'network',
          category: 'Component Map',
          source_items: ['comp1', 'comp2', 'comp3'],
          status: 'completed',
          created_at: '2024-01-20T10:30:00Z',
          updated_at: '2024-01-22T14:20:00Z',
          created_by: '김개발',
          version: '1.2.0',
          is_public: true,
          tags: ['react', 'component', 'dependency'],
          config: {
            layout: 'force',
            theme: 'light',
            nodeSize: 60,
            edgeWidth: 3,
            fontSize: 14,
            showLabels: true,
            showTooltips: true,
            animationSpeed: 800
          }
        },
        {
          id: '2',
          title: '디자인 시스템 구조',
          description: 'UI 디자인 시스템의 컴포넌트 계층 구조를 나타내는 다이어그램입니다.',
          type: 'hierarchy',
          category: 'Design System',
          source_items: ['design1', 'design2'],
          status: 'completed',
          created_at: '2024-01-18T09:15:00Z',
          updated_at: '2024-01-21T11:45:00Z',
          created_by: '이디자인',
          version: '2.1.0',
          is_public: true,
          tags: ['design', 'ui', 'system'],
          config: {
            layout: 'hierarchical',
            theme: 'colorful',
            nodeSize: 70,
            edgeWidth: 2,
            fontSize: 12,
            showLabels: true,
            showTooltips: true,
            animationSpeed: 1000
          }
        },
        {
          id: '3',
          title: 'API 문서 관계도',
          description: 'API 문서들 간의 참조 관계를 보여주는 다이어그램입니다.',
          type: 'flowchart',
          category: 'Documentation',
          source_items: ['doc1', 'doc2', 'doc3', 'doc4'],
          status: 'generating',
          created_at: '2024-01-25T16:20:00Z',
          updated_at: '2024-01-25T16:20:00Z',
          created_by: '박문서',
          version: '1.0.0',
          is_public: false,
          tags: ['api', 'documentation', 'reference'],
          config: {
            layout: 'tree',
            theme: 'dark',
            nodeSize: 50,
            edgeWidth: 2,
            fontSize: 10,
            showLabels: true,
            showTooltips: false,
            animationSpeed: 1200
          }
        }
      ];

      setDiagrams(mockData);
    } catch (error) {
      console.error('다이어그램 목록 조회 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 새 다이어그램 생성
  const handleCreateDiagram = async () => {
    try {
      setLoading(true);
      
      // [advice from AI] 임시로 다이어그램 생성 시뮬레이션
      const newDiagramData: Diagram = {
        id: Date.now().toString(),
        title: newDiagram.title,
        description: newDiagram.description,
        type: newDiagram.type as any,
        category: newDiagram.category,
        source_items: newDiagram.source_items,
        status: 'generating',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: '현재사용자',
        version: '1.0.0',
        is_public: newDiagram.is_public,
        tags: [],
        config: {
          layout: 'hierarchical',
          theme: 'light',
          nodeSize: 50,
          edgeWidth: 2,
          fontSize: 12,
          showLabels: true,
          showTooltips: true,
          animationSpeed: 1000
        }
      };

      setDiagrams(prev => [newDiagramData, ...prev]);
      
      // 성공 후 초기화
      setNewDiagram({
        title: '',
        description: '',
        type: 'flowchart',
        category: 'Knowledge Map',
        source_items: [],
        is_public: false
      });
      
      setError(null);
    } catch (error) {
      console.error('다이어그램 생성 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 다이어그램 삭제
  const handleDeleteDiagram = async (diagramId: string) => {
    if (!window.confirm('정말로 이 다이어그램을 삭제하시겠습니까?')) return;

    try {
      setLoading(true);
      setDiagrams(prev => prev.filter(diagram => diagram.id !== diagramId));
      setError(null);
    } catch (error) {
      console.error('다이어그램 삭제 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 다이어그램 설정 업데이트
  const handleUpdateConfig = async () => {
    if (!selectedDiagram) return;

    try {
      setLoading(true);
      setDiagrams(prev => prev.map(diagram => 
        diagram.id === selectedDiagram.id 
          ? { ...diagram, config: diagramConfig, updated_at: new Date().toISOString() }
          : diagram
      ));
      
      setSelectedDiagram(prev => prev ? { ...prev, config: diagramConfig } : null);
      setShowEditDialog(false);
      setError(null);
    } catch (error) {
      console.error('다이어그램 설정 업데이트 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 다이어그램 목록 조회
  useEffect(() => {
    fetchDiagrams();
  }, []);

  // [advice from AI] 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          📊 다이어그램 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setTabValue(1)}
          sx={{ bgcolor: 'primary.main' }}
        >
          새 다이어그램 생성
        </Button>
      </Box>

      {/* [advice from AI] 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e: any, newValue: number) => setTabValue(newValue)}>
          <Tab label="다이어그램 목록" />
          <Tab label="새 다이어그램 생성" />
          <Tab label="다이어그램 편집기" />
        </Tabs>
      </Paper>

      {/* [advice from AI] 다이어그램 목록 탭 */}
      {tabValue === 0 && (
        <Box>
          {/* [advice from AI] 필터 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>타입</InputLabel>
                    <Select
                      value={filter.type}
                      onChange={(e: any) => setFilter((prev: any) => ({ ...prev, type: e.target.value }))}
                      label="타입"
                    >
                      <MenuItem value="">전체</MenuItem>
                      <MenuItem value="flowchart">플로우차트</MenuItem>
                      <MenuItem value="mindmap">마인드맵</MenuItem>
                      <MenuItem value="network">네트워크</MenuItem>
                      <MenuItem value="hierarchy">계층구조</MenuItem>
                      <MenuItem value="timeline">타임라인</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>상태</InputLabel>
                    <Select
                      value={filter.status}
                      onChange={(e: any) => setFilter((prev: any) => ({ ...prev, status: e.target.value }))}
                      label="상태"
                    >
                      <MenuItem value="">전체</MenuItem>
                      <MenuItem value="generating">생성중</MenuItem>
                      <MenuItem value="completed">완료</MenuItem>
                      <MenuItem value="error">오류</MenuItem>
                      <MenuItem value="needs_review">검토필요</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>카테고리</InputLabel>
                    <Select
                      value={filter.category}
                      onChange={(e: any) => setFilter((prev: any) => ({ ...prev, category: e.target.value }))}
                      label="카테고리"
                    >
                      <MenuItem value="">전체</MenuItem>
                      <MenuItem value="Knowledge Map">지식맵</MenuItem>
                      <MenuItem value="Component Map">컴포넌트맵</MenuItem>
                      <MenuItem value="Design System">디자인시스템</MenuItem>
                      <MenuItem value="Documentation">문서</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    variant="outlined"
                    onClick={fetchDiagrams}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                    fullWidth
                  >
                    새로고침
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* [advice from AI] 다이어그램 목록 */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {diagrams.map((diagram: Diagram) => (
                <Grid item xs={12} md={6} lg={4} key={diagram.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* [advice from AI] 다이어그램 헤더 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        {typeIcons[diagram.type]}
                        <Chip
                          label={typeLabels[diagram.type]}
                          size="small"
                          sx={{ ml: 1, mr: 1 }}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip
                          label={getStatusText(diagram.status)}
                          color={getStatusColor(diagram.status) as any}
                          size="small"
                        />
                      </Box>

                      {/* [advice from AI] 제목 */}
                      <Typography
                        variant="h6"
                        component="h3"
                        gutterBottom
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => {
                          setSelectedDiagram(diagram);
                          setShowDiagramDialog(true);
                        }}
                      >
                        {diagram.title}
                      </Typography>

                      {/* [advice from AI] 설명 */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {diagram.description}
                      </Typography>

                      {/* [advice from AI] 메타 정보 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {diagram.created_by} • v{diagram.version}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(diagram.updated_at)}
                        </Typography>
                      </Box>

                      {/* [advice from AI] 태그 */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {diagram.tags.slice(0, 3).map((tag: string, index: number) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                        {diagram.tags.length > 3 && (
                          <Chip label={`+${diagram.tags.length - 3}`} size="small" variant="outlined" />
                        )}
                      </Box>

                      {/* [advice from AI] 액션 버튼 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="보기">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedDiagram(diagram);
                                setShowDiagramDialog(true);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="편집">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedDiagram(diagram);
                                setDiagramConfig(diagram.config);
                                setShowEditDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="다운로드">
                            <IconButton size="small">
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="공유">
                            <IconButton size="small">
                              <ShareIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteDiagram(diagram.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* [advice from AI] 새 다이어그램 생성 탭 */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              새 다이어그램 생성
            </Typography>
            
            <Grid container spacing={3}>
              {/* [advice from AI] 기본 정보 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  기본 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="다이어그램 제목"
                      value={newDiagram.title}
                      onChange={(e: any) => setNewDiagram((prev: any) => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>타입</InputLabel>
                      <Select
                        value={newDiagram.type}
                        onChange={(e: any) => setNewDiagram((prev: any) => ({ ...prev, type: e.target.value }))}
                        label="타입"
                      >
                        <MenuItem value="flowchart">플로우차트</MenuItem>
                        <MenuItem value="mindmap">마인드맵</MenuItem>
                        <MenuItem value="network">네트워크</MenuItem>
                        <MenuItem value="hierarchy">계층구조</MenuItem>
                        <MenuItem value="timeline">타임라인</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>카테고리</InputLabel>
                      <Select
                        value={newDiagram.category}
                        onChange={(e: any) => setNewDiagram((prev: any) => ({ ...prev, category: e.target.value }))}
                        label="카테고리"
                      >
                        <MenuItem value="Knowledge Map">지식맵</MenuItem>
                        <MenuItem value="Component Map">컴포넌트맵</MenuItem>
                        <MenuItem value="Design System">디자인시스템</MenuItem>
                        <MenuItem value="Documentation">문서</MenuItem>
                        <MenuItem value="Process Flow">프로세스플로우</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>

              {/* [advice from AI] 설명 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="다이어그램 설명"
                  multiline
                  rows={3}
                  value={newDiagram.description}
                  onChange={(e: any) => setNewDiagram((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder="다이어그램의 목적과 내용을 설명하세요..."
                />
              </Grid>

              {/* [advice from AI] 소스 자산 선택 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  소스 자산 선택
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  다이어그램에 포함할 지식 자산을 선택하세요. 자동으로 관계를 분석하여 다이어그램을 생성합니다.
                </Alert>
                <Box sx={{ border: '1px dashed', borderColor: 'grey.300', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    소스 자산 선택 기능은 추후 구현 예정입니다.
                  </Typography>
                </Box>
              </Grid>

              {/* [advice from AI] 공개 설정 */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newDiagram.is_public}
                      onChange={(e: any) => setNewDiagram((prev: any) => ({ ...prev, is_public: e.target.checked }))}
                    />
                  }
                  label="공개 다이어그램"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  공개로 설정하면 다른 사용자들이 이 다이어그램을 볼 수 있습니다.
                </Typography>
              </Grid>

              {/* [advice from AI] 생성 버튼 */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setTabValue(0)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateDiagram}
                    disabled={loading || !newDiagram.title}
                  >
                    {loading ? <CircularProgress size={20} /> : '다이어그램 생성'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* [advice from AI] 다이어그램 편집기 탭 */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              다이어그램 편집기
            </Typography>
            <Alert severity="info">
              다이어그램 편집기는 선택한 다이어그램의 설정을 수정할 수 있습니다.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* [advice from AI] 다이어그램 상세 보기 다이얼로그 */}
      <Dialog
        open={showDiagramDialog}
        onClose={() => setShowDiagramDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedDiagram?.title}
            </Typography>
            <IconButton onClick={() => setShowDiagramDialog(false)}>
              <ClearIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDiagram && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedDiagram.description}
              </Typography>
              
              {/* [advice from AI] 다이어그램 미리보기 영역 */}
              <Box sx={{ 
                border: '1px solid', 
                borderColor: 'grey.300', 
                borderRadius: 1, 
                p: 3, 
                textAlign: 'center',
                minHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <DiagramIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    다이어그램 미리보기
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {typeLabels[selectedDiagram.type]} 다이어그램
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    상태: {getStatusText(selectedDiagram.status)}
                  </Typography>
                </Box>
              </Box>

              {/* [advice from AI] 다이어그램 정보 */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>생성자</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDiagram.created_by}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>버전</Typography>
                  <Typography variant="body2" color="text.secondary">
                    v{selectedDiagram.version}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>생성일</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(selectedDiagram.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>수정일</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(selectedDiagram.updated_at)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDiagramDialog(false)}>닫기</Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              setShowDiagramDialog(false);
              setShowEditDialog(true);
            }}
          >
            편집
          </Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            다운로드
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 다이어그램 설정 편집 다이얼로그 */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          다이어그램 설정 편집
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* [advice from AI] 레이아웃 설정 */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                레이아웃 설정
              </Typography>
              <FormControl fullWidth>
                <InputLabel>레이아웃</InputLabel>
                <Select
                  value={diagramConfig.layout}
                  onChange={(e: any) => setDiagramConfig((prev: any) => ({ ...prev, layout: e.target.value }))}
                  label="레이아웃"
                >
                  <MenuItem value="hierarchical">계층형</MenuItem>
                  <MenuItem value="force">포스 레이아웃</MenuItem>
                  <MenuItem value="circular">원형</MenuItem>
                  <MenuItem value="tree">트리</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* [advice from AI] 테마 설정 */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>테마</InputLabel>
                <Select
                  value={diagramConfig.theme}
                  onChange={(e: any) => setDiagramConfig((prev: any) => ({ ...prev, theme: e.target.value }))}
                  label="테마"
                >
                  <MenuItem value="light">라이트</MenuItem>
                  <MenuItem value="dark">다크</MenuItem>
                  <MenuItem value="colorful">컬러풀</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* [advice from AI] 노드 크기 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                노드 크기: {diagramConfig.nodeSize}px
              </Typography>
              <Slider
                value={diagramConfig.nodeSize}
                onChange={(e: any, value: any) => setDiagramConfig((prev: any) => ({ ...prev, nodeSize: value }))}
                min={20}
                max={100}
                step={10}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            {/* [advice from AI] 엣지 두께 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                엣지 두께: {diagramConfig.edgeWidth}px
              </Typography>
              <Slider
                value={diagramConfig.edgeWidth}
                onChange={(e: any, value: any) => setDiagramConfig((prev: any) => ({ ...prev, edgeWidth: value }))}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            {/* [advice from AI] 폰트 크기 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                폰트 크기: {diagramConfig.fontSize}px
              </Typography>
              <Slider
                value={diagramConfig.fontSize}
                onChange={(e: any, value: any) => setDiagramConfig((prev: any) => ({ ...prev, fontSize: value }))}
                min={8}
                max={24}
                step={2}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            {/* [advice from AI] 표시 옵션 */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                표시 옵션
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={diagramConfig.showLabels}
                    onChange={(e: any) => setDiagramConfig((prev: any) => ({ ...prev, showLabels: e.target.checked }))}
                  />
                }
                label="라벨 표시"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={diagramConfig.showTooltips}
                    onChange={(e: any) => setDiagramConfig((prev: any) => ({ ...prev, showTooltips: e.target.checked }))}
                  />
                }
                label="툴팁 표시"
              />
            </Grid>

            {/* [advice from AI] 애니메이션 속도 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                애니메이션 속도: {diagramConfig.animationSpeed}ms
              </Typography>
              <Slider
                value={diagramConfig.animationSpeed}
                onChange={(e: any, value: any) => setDiagramConfig((prev: any) => ({ ...prev, animationSpeed: value }))}
                min={500}
                max={2000}
                step={100}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>취소</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleUpdateConfig}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : '설정 저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiagramManagement;
