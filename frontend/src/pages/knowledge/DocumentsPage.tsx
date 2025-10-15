// [advice from AI] 문서/가이드 페이지 - 개발 가이드 및 문서 관리
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
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 문서 데이터 타입
interface Document {
  id: string;
  title: string;
  description: string;
  doc_type: 'api_guide' | 'user_manual' | 'technical_spec' | 'best_practice' | 'tutorial' | 'faq';
  category: string;
  owner: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  version: string;
  content_format: 'markdown' | 'html' | 'pdf' | 'docx';
  content_url: string;
  download_count: number;
  view_count: number;
  file_size: number;
  last_updated: string;
  created_at: string;
}

// [advice from AI] 문서 메트릭 타입
interface DocumentMetrics {
  totalDocuments: number;
  publishedDocuments: number;
  totalViews: number;
  totalDownloads: number;
  typeBreakdown: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
  formatBreakdown: { [key: string]: number };
}

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    doc_type: 'api_guide' as Document['doc_type'],
    category: '',
    tags: [] as string[],
    status: 'draft' as Document['status'],
    version: '1.0.0',
    content_format: 'markdown' as Document['content_format'],
    content_url: ''
  });

  // [advice from AI] 문서 타입 옵션
  const documentTypeOptions = [
    { value: 'api_guide', label: 'API 가이드' },
    { value: 'user_manual', label: '사용자 매뉴얼' },
    { value: 'technical_spec', label: '기술 명세서' },
    { value: 'best_practice', label: '베스트 프랙티스' },
    { value: 'tutorial', label: '튜토리얼' },
    { value: 'faq', label: 'FAQ' }
  ];

  // [advice from AI] 카테고리 옵션 (실제 데이터에서 추출)
  const categories = [...new Set(documents.map(doc => doc.category).filter(Boolean))];

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const [documentsRes, metricsRes] = await Promise.all([
        fetch('/api/knowledge/documents', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/knowledge/documents/metrics', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (documentsRes.ok) {
        const data = await documentsRes.json();
        setDocuments(data.documents || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }
      
    } catch (error) {
      console.error('문서 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 문서 생성
  const handleCreateDocument = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('/api/knowledge/documents', {
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
        throw new Error('문서 생성 실패');
      }

      setCreateDialog(false);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('문서 생성 실패:', error);
    }
  };

  // [advice from AI] 폼 초기화
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      doc_type: 'api_guide',
      category: '',
      tags: [],
      status: 'draft',
      version: '1.0.0',
      content_format: 'markdown',
      content_url: ''
    });
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'review': return 'warning';
      case 'draft': return 'info';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 문서 타입별 라벨
  const getDocTypeLabel = (type: string) => {
    const option = documentTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  // [advice from AI] 필터링된 문서 목록
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.doc_type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  // [advice from AI] 카테고리별 그룹화
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category || '기타';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as { [key: string]: Document[] });

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          문서/가이드
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
          문서/가이드
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          개발 가이드, 매뉴얼, 기술 문서를 체계적으로 관리합니다
        </Typography>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>직접 작성 방식:</strong> 승인 절차 없이 바로 문서를 작성하고 공유할 수 있습니다.<br/>
            • <strong>즉시 작성</strong>: Markdown 에디터로 실시간 작성 및 미리보기<br/>
            • <strong>자동 분류</strong>: API 가이드, 사용자 매뉴얼, 기술 스펙 자동 분류<br/>
            • <strong>검색 최적화</strong>: 전문 검색 및 태그 기반 분류<br/>
            • <strong>협업 기능</strong>: 실시간 공동 편집 및 댓글 시스템
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
                  총 문서
                </Typography>
                <Typography variant="h4" color="primary">
                  {metrics.totalDocuments}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  발행됨: {metrics.publishedDocuments}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 조회수
                </Typography>
                <Typography variant="h4" color="success.main">
                  {metrics.totalViews.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  누적 조회수
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
                <Typography variant="h4" color="info.main">
                  {metrics.totalDownloads.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  누적 다운로드
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  인기 형식
                </Typography>
                <Typography variant="h4" color="secondary.main">
                  {Object.entries(metrics.formatBreakdown || {})
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

      {/* [advice from AI] 검색 및 필터 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="문서 제목, 내용, 태그로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 350 }}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>상태</InputLabel>
          <Select
            value={statusFilter}
            label="상태"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="published">발행됨</MenuItem>
            <MenuItem value="review">검토중</MenuItem>
            <MenuItem value="draft">작성중</MenuItem>
            <MenuItem value="archived">보관됨</MenuItem>
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
            {documentTypeOptions.map(type => (
              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {categories.length > 0 && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={categoryFilter}
              label="카테고리"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="all">전체</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {permissions.canManageDocuments && (
          <Button 
            variant="contained" 
            onClick={() => setCreateDialog(true)}
            sx={{ ml: 'auto' }}
          >
            새 문서 등록
          </Button>
        )}
      </Box>

      {/* [advice from AI] 문서 목록 (카테고리별 그룹화) */}
      {Object.keys(groupedDocuments).length === 0 ? (
        <Alert severity="info">
          {documents.length === 0 ? '등록된 문서가 없습니다.' : '검색 조건에 맞는 문서가 없습니다.'}
        </Alert>
      ) : (
        Object.entries(groupedDocuments).map(([category, categoryDocs]) => (
          <Accordion key={category} defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                {category} ({categoryDocs.length}개)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {categoryDocs.map((doc) => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => { setSelectedDocument(doc); setViewDialog(true); }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {doc.title}
                          </Typography>
                          <Chip 
                            label={doc.status} 
                            color={getStatusColor(doc.status) as any}
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                          {doc.description.length > 100 ? 
                            doc.description.substring(0, 100) + '...' : 
                            doc.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                          <Chip 
                            label={getDocTypeLabel(doc.doc_type)} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                          <Chip 
                            label={doc.content_format.toUpperCase()} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              👁 {doc.view_count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ↓ {doc.download_count}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            v{doc.version}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* [advice from AI] 문서 생성 대화상자 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 문서 등록</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                margin="dense"
                label="문서 제목"
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>문서 타입</InputLabel>
                <Select
                  value={formData.doc_type}
                  label="문서 타입"
                  onChange={(e) => setFormData({ ...formData, doc_type: e.target.value as any })}
                >
                  {documentTypeOptions.map(type => (
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="카테고리"
                fullWidth
                variant="outlined"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="예: Frontend, Backend, DevOps"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>콘텐츠 형식</InputLabel>
                <Select
                  value={formData.content_format}
                  label="콘텐츠 형식"
                  onChange={(e) => setFormData({ ...formData, content_format: e.target.value as any })}
                >
                  <MenuItem value="markdown">Markdown</MenuItem>
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="docx">Word Document</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="문서 URL"
                fullWidth
                variant="outlined"
                value={formData.content_url}
                onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                placeholder="https://docs.example.com/guide"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button onClick={handleCreateDocument} variant="contained">등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 문서 상세보기 대화상자 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>문서 상세 정보</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedDocument.title}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedDocument.description}</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="타입" secondary={getDocTypeLabel(selectedDocument.doc_type)} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="카테고리" secondary={selectedDocument.category} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="형식" secondary={selectedDocument.content_format.toUpperCase()} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="버전" secondary={selectedDocument.version} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="조회수" secondary={`${selectedDocument.view_count.toLocaleString()}회`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="다운로드" secondary={`${selectedDocument.download_count.toLocaleString()}회`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="파일 크기" secondary={`${(selectedDocument.file_size / 1024 / 1024).toFixed(1)}MB`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="마지막 수정" secondary={new Date(selectedDocument.last_updated).toLocaleDateString()} />
                    </ListItem>
                  </List>
                </Grid>
                {selectedDocument.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>태그</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedDocument.tags.map((tag, index) => (
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
          {selectedDocument?.content_url && (
            <Button 
              href={selectedDocument.content_url} 
              target="_blank" 
              variant="contained"
            >
              문서 보기
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          문서/가이드에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default DocumentsPage;
