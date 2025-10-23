// [advice from AI] 문서/가이드 페이지 - 프로젝트 페이지와 동일한 형태로 통일
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
  CircularProgress,
  LinearProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Container,
  Tab,
  Tabs
} from '@mui/material';
import { 
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import EmptyState from '../../components/common/EmptyState';

// [advice from AI] 문서 데이터 타입
interface Document {
  id: string;
  title: string;
  name?: string; // 백엔드에서 name으로 올 수 있음
  description: string;
  doc_type: 'api_guide' | 'user_manual' | 'technical_spec' | 'best_practice' | 'tutorial' | 'faq';
  category: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  version: string;
  content_format: 'markdown' | 'html' | 'pdf' | 'docx' | 'text' | 'json';
  content_url: string;
  file_url?: string; // 업로드된 파일 URL
  file_path?: string; // 서버 파일 경로
  file_size?: number; // 파일 크기 (바이트)
  mime_type?: string; // MIME 타입
  download_count: number;
  view_count: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [tabValue, setTabValue] = useState(0); // 0: URL 입력, 1: 파일 업로드
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
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
  
  const [editFormData, setEditFormData] = useState({
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
      
      // 실제 API 호출 (현재는 빈 배열 반환)
      const response = await fetch('/api/knowledge/documents', {
          headers: {
          'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        // API가 없거나 실패할 경우 빈 배열로 설정
        setDocuments([]);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // [advice from AI] 필터링된 문서 목록
  const filteredDocuments = documents.filter(document => {
    const matchesSearch = (document.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (document.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || true; // status 필드가 없으므로 항상 true
    const matchesType = filterType === 'all' || true; // doc_type 필드가 없으므로 항상 true  
    const matchesCategory = filterCategory === 'all' || document.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  // [advice from AI] 문서 생성
  const handleCreateDocument = async () => {
    try {
      console.log('📄 문서 등록 시작:', formData);
      
      const response = await fetch('/api/knowledge/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 문서 등록 성공:', result);
        alert('문서가 성공적으로 등록되었습니다.');

      setCreateDialog(false);
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
      loadData();
      } else {
        const errorData = await response.json();
        console.error('❌ 문서 등록 실패:', errorData);
        alert(`등록 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 문서 등록 중 오류:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 크기 제한 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('파일 크기는 50MB를 초과할 수 없습니다.');
        return;
      }

      // 허용되는 파일 타입 검증
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'text/html',
        'application/json'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('지원되지 않는 파일 형식입니다.\nPDF, DOC, DOCX, TXT, MD, HTML, JSON 파일만 업로드 가능합니다.');
        return;
      }

      setSelectedFile(file);
      
      // 파일명에서 제목 자동 생성 (확장자 제거)
      if (!formData.title) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: fileName }));
      }
    }
  };

  // [advice from AI] 파일 업로드 처리
  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }

    if (!formData.title.trim()) {
      alert('문서명을 입력해주세요.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      console.log('📁 파일 업로드 시작:', selectedFile.name);

      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('doc_type', formData.doc_type);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('tags', JSON.stringify(formData.tags));
      uploadFormData.append('version', formData.version);

      const response = await fetch('/api/knowledge/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 파일 업로드 성공:', result);
        alert('문서 파일이 성공적으로 업로드되었습니다.');
        
        // 폼 초기화
        setCreateDialog(false);
        setSelectedFile(null);
        setTabValue(0);
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
        loadData();
      } else {
        const errorData = await response.json();
        console.error('❌ 파일 업로드 실패:', errorData);
        alert(`업로드 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 파일 업로드 중 오류:', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // [advice from AI] 탭 변경 처리
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedFile(null);
  };

  // [advice from AI] 문서 편집 다이얼로그 열기
  const handleOpenEditDialog = (document: Document) => {
    setSelectedDocument(document);
    setEditFormData({
      title: document.title || document.name || '',
      description: document.description || '',
      doc_type: document.doc_type || 'api_guide',
      category: document.category || '',
      tags: Array.isArray(document.tags) ? document.tags : [],
      status: document.status || 'draft',
      version: document.version || '1.0.0',
      content_format: document.content_format || 'markdown',
      content_url: document.content_url || document.file_url || ''
    });
    setEditDialog(true);
  };

  // [advice from AI] 문서 편집 처리
  const handleEditDocument = async () => {
    if (!selectedDocument) return;

    try {
      console.log('📝 문서 편집 시작:', editFormData);
      
      const response = await fetch(`/api/knowledge/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 문서 편집 성공:', result);
        alert('문서가 성공적으로 수정되었습니다.');
        
        setEditDialog(false);
        setSelectedDocument(null);
        loadData();
      } else {
        const errorData = await response.json();
        console.error('❌ 문서 편집 실패:', errorData);
        alert(`편집 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 문서 편집 중 오류:', error);
      alert('편집 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 문서 삭제 처리
  const handleDeleteDocument = async (document: Document) => {
    if (!window.confirm(`"${document.title || document.name}" 문서를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      console.log('🗑️ 문서 삭제 시작:', document.id);
      
      const response = await fetch(`/api/knowledge/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 문서 삭제 성공:', result);
        alert('문서가 성공적으로 삭제되었습니다.');
    loadData();
      } else {
        const errorData = await response.json();
        console.error('❌ 문서 삭제 실패:', errorData);
        alert(`삭제 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 문서 삭제 중 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 상세보기 다이얼로그 열기
  const handleOpenViewDialog = (document: Document) => {
    setSelectedDocument(document);
    setViewDialog(true);
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
          문서/가이드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          개발 가이드, 매뉴얼, 기술 문서를 체계적으로 관리합니다. 각 문서는 개발자와 사용자를 위한 지식 자산입니다.
        </Typography>
      </Box>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
              <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
        <TextField
                fullWidth
                placeholder="문서 검색"
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
                  <MenuItem value="published">발행됨</MenuItem>
            <MenuItem value="archived">보관됨</MenuItem>
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>문서 타입</InputLabel>
          <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="문서 타입"
          >
            <MenuItem value="all">전체</MenuItem>
                  {documentTypeOptions.map((type) => (
              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
            <InputLabel>카테고리</InputLabel>
            <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
              label="카테고리"
            >
              <MenuItem value="all">전체</MenuItem>
                  {categories.map((category) => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
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
                  새 문서
          </Button>
        )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 문서 목록 */}
      {filteredDocuments.length === 0 ? (
        documents.length === 0 ? (
          <EmptyState
            title="등록된 문서가 없습니다"
            description="아직 등록된 문서가 없습니다. 새로운 문서를 등록하여 지식 베이스를 구축해보세요."
            actionText="문서 등록하기"
            actionPath="/knowledge/documents"
            secondaryActionText="디자인 자산 먼저 만들기"
            secondaryActionPath="/knowledge/design-assets"
          />
        ) : (
          <Alert severity="info" sx={{ textAlign: 'center', py: 3 }}>
            검색 조건에 맞는 문서가 없습니다. 다른 검색어를 시도해보세요.
        </Alert>
        )
      ) : (
        <Grid container spacing={3}>
          {filteredDocuments.map((document) => (
            <Grid item xs={12} sm={6} md={4} key={document.id}>
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
                        {document.name}
                          </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {document.category || '문서'} • {document.file_path ? '파일' : '링크'}
                      </Typography>
                    </Box>
                    <IconButton 
                            size="small"
                      onClick={() => {
                        setSelectedDocument(document);
                        setViewDialog(true);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                        </Box>
                        
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {document.description || '문서 개요가 없습니다.'}
                        </Typography>
                        
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      카테고리: {document.category || '미분류'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      버전: {document.version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      조회수: {document.view_count || 0}회
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {Array.isArray(document.tags) && document.tags.slice(0, 3).map((tag, index) => (
                          <Chip 
                        key={index}
                        label={tag} 
                            size="small" 
                            variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                          />
                    ))}
                    {Array.isArray(document.tags) && document.tags.length > 3 && (
                          <Chip 
                        label={`+${document.tags.length - 3}`} 
                            size="small" 
                            variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                          />
                    )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={document.status || '활성'}
                      size="small"
                      color="success"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(document.created_at).toLocaleDateString('ko-KR')}
                          </Typography>
                        </Box>
                      </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleOpenViewDialog(document)}
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
                      <Tooltip title="문서 편집">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditDialog(document)}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'primary.50'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="문서 삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDocument(document)}
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

      {/* [advice from AI] 문서 생성 다이얼로그 - 파일 업로드 기능 추가 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 문서 등록</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* 탭 메뉴 */}
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tab label="URL 입력" icon={<DescriptionIcon />} />
              <Tab label="파일 업로드" icon={<CloudUploadIcon />} />
            </Tabs>

            {/* 공통 필드 */}
              <TextField
                fullWidth
              label="문서명"
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
                <InputLabel>문서 타입</InputLabel>
                <Select
                  value={formData.doc_type}
                onChange={(e) => setFormData({...formData, doc_type: e.target.value as Document['doc_type']})}
                  label="문서 타입"
                >
                {documentTypeOptions.map((type) => (
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
              label="카테고리"
                value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="버전"
              value={formData.version}
              onChange={(e) => setFormData({...formData, version: e.target.value})}
              margin="normal"
            />

            {/* URL 입력 탭 */}
            {tabValue === 0 && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth margin="normal">
                <InputLabel>콘텐츠 형식</InputLabel>
                <Select
                  value={formData.content_format}
                    onChange={(e) => setFormData({...formData, content_format: e.target.value as Document['content_format']})}
                  label="콘텐츠 형식"
                >
                  <MenuItem value="markdown">Markdown</MenuItem>
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="docx">DOCX</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                  label="콘텐츠 URL"
                value={formData.content_url}
                  onChange={(e) => setFormData({...formData, content_url: e.target.value})}
                  margin="normal"
                  placeholder="https://example.com/document.pdf"
                />
              </Box>
            )}

            {/* 파일 업로드 탭 */}
            {tabValue === 1 && (
              <Box sx={{ mt: 2 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: selectedFile ? 'success.light' : 'grey.50',
                    border: selectedFile ? '2px solid' : '2px dashed',
                    borderColor: selectedFile ? 'success.main' : 'grey.300',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: selectedFile ? 'success.light' : 'grey.100'
                    }
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md,.html,.json"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  {selectedFile ? (
                    <Box>
                      <AttachFileIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                      <Typography variant="h6" color="success.main" gutterBottom>
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        크기: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        클릭하여 다른 파일 선택
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        파일을 드래그하거나 클릭하여 업로드
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        PDF, DOC, DOCX, TXT, MD, HTML, JSON 파일 지원 (최대 50MB)
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {isUploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                      업로드 중... {uploadProgress}%
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          {tabValue === 0 ? (
            <Button 
              variant="contained" 
              onClick={handleCreateDocument}
              disabled={!formData.title.trim() || !formData.content_url.trim()}
            >
              등록
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleFileUpload}
              disabled={!selectedFile || !formData.title.trim() || isUploading}
              startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            >
              {isUploading ? '업로드 중...' : '업로드'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 문서 상세보기 다이얼로그 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            문서 상세 정보
            <IconButton onClick={() => setViewDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box sx={{ pt: 1 }}>
              {/* 기본 정보 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  기본 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      문서명
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
                      {selectedDocument.title || selectedDocument.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      문서 타입
                    </Typography>
                    <Chip 
                      label={selectedDocument.doc_type || '문서'} 
                      color="primary" 
                      variant="outlined" 
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      설명
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {selectedDocument.description || '설명이 없습니다.'}
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
                      {selectedDocument.category || '미정'}
                    </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      버전
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDocument.version || '1.0.0'}
                    </Typography>
                </Grid>
                  
                  {/* 파일 형식 정보 */}
                  {selectedDocument.content_format && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        파일 형식
                      </Typography>
                      <Chip 
                        label={selectedDocument.content_format.toUpperCase()} 
                        color="info" 
                        variant="outlined" 
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                  )}

                  {/* 파일 크기 정보 */}
                  {selectedDocument.file_size && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        파일 크기
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Grid>
                  )}

                  {/* 파일 액션 버튼들 */}
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      파일 액션
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {/* 업로드된 파일이 있는 경우 (file_path가 실제 파일 경로인 경우) */}
                      {selectedDocument.file_url && selectedDocument.file_path && selectedDocument.file_path.startsWith('/app/uploads/') && (
                        <>
                          {/* 다운로드 버튼 */}
                          <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={async () => {
                              try {
                                // fetch로 파일 다운로드 (JWT 헤더 포함)
                                const response = await fetch(`/api/knowledge/documents/${selectedDocument.id}/download`, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`
                                  }
                                });

                                if (!response.ok) {
                                  throw new Error('다운로드 실패');
                                }

                                // 파일을 blob으로 변환
                                const blob = await response.blob();
                                
                                // 파일명 추출 (Content-Disposition 헤더에서)
                                const contentDisposition = response.headers.get('Content-Disposition');
                                let fileName = selectedDocument.title || selectedDocument.name || 'document';
                                
                                if (contentDisposition) {
                                  const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                                  if (matches && matches[1]) {
                                    fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''));
                                  }
                                }

                                // 다운로드 링크 생성
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = fileName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);

                              } catch (error) {
                                console.error('다운로드 실패:', error);
                                alert('파일 다운로드에 실패했습니다.');
                              }
                            }}
                            sx={{ mb: 1 }}
                          >
                            다운로드
                          </Button>

                          {/* 새 창에서 미리보기 버튼 */}
                          <Button
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => {
                              // [advice from AI] 미리보기 전용 API 엔드포인트 사용
                              const previewUrl = `http://rdc.rickyson.com:3001/api/knowledge/documents/${selectedDocument.id}/preview`;
                              window.open(previewUrl, '_blank');
                            }}
                            sx={{ mb: 1 }}
                          >
                            새 창에서 미리보기
                          </Button>

                          {/* PDF인 경우 미리보기 버튼 */}
                          {selectedDocument.content_format === 'pdf' && (
                            <Button
                              variant="outlined"
                              startIcon={<DescriptionIcon />}
                              onClick={() => {
                                // PDF 미리보기 모달 열기
                                setPdfPreviewUrl(selectedDocument.file_url);
                                setPdfPreviewOpen(true);
                              }}
                              sx={{ mb: 1 }}
                            >
                              PDF 미리보기
                            </Button>
                          )}
                        </>
                      )}

                      {/* 외부 링크가 있는 경우 (업로드된 파일이 아닌 경우) */}
                      {selectedDocument.content_url && (!selectedDocument.file_path || !selectedDocument.file_path.startsWith('/app/uploads/')) && (
                        <Button
                          variant="outlined"
                          startIcon={<LinkIcon />}
                          href={selectedDocument.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ mb: 1 }}
                        >
                          외부 링크 열기
                        </Button>
                      )}

                      {/* 파일도 링크도 없는 경우 */}
                      {(!selectedDocument.file_path || !selectedDocument.file_path.startsWith('/app/uploads/')) && !selectedDocument.content_url && (
                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                          사용 가능한 파일이나 링크가 없습니다.
                        </Typography>
                      )}
                    </Box>
                  </Grid>
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
                      생성일
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedDocument.created_at).toLocaleDateString('ko-KR', {
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
                      {new Date(selectedDocument.updated_at).toLocaleDateString('ko-KR', {
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
              {Array.isArray(selectedDocument.tags) && selectedDocument.tags.length > 0 && (
                <Paper elevation={1} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    태그
                  </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedDocument.tags.map((tag, index) => (
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
          {permissions.canEditCatalog && selectedDocument && (
            <>
            <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => {
                  setViewDialog(false);
                  handleOpenEditDialog(selectedDocument);
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
                  handleDeleteDocument(selectedDocument);
                }}
              >
                삭제
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 문서 편집 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>문서 편집</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="문서명"
              value={editFormData.title}
              onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={editFormData.description}
              onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>문서 타입</InputLabel>
              <Select
                value={editFormData.doc_type}
                onChange={(e) => setEditFormData({...editFormData, doc_type: e.target.value as Document['doc_type']})}
                label="문서 타입"
              >
                {documentTypeOptions.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="카테고리"
              value={editFormData.category}
              onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="버전"
              value={editFormData.version}
              onChange={(e) => setEditFormData({...editFormData, version: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="콘텐츠 URL"
              value={editFormData.content_url}
              onChange={(e) => setEditFormData({...editFormData, content_url: e.target.value})}
              margin="normal"
              placeholder="https://example.com/document.pdf"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button 
              variant="contained"
            onClick={handleEditDocument}
            disabled={!editFormData.title.trim()}
            >
            수정
            </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] PDF 미리보기 다이얼로그 */}
      <Dialog 
        open={pdfPreviewOpen} 
        onClose={() => setPdfPreviewOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            PDF 미리보기
            <IconButton onClick={() => setPdfPreviewOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {pdfPreviewUrl && (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <iframe
                src={pdfPreviewUrl}
                width="100%"
                height="100%"
                style={{ border: 'none', minHeight: '500px' }}
                title="PDF Preview"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfPreviewOpen(false)}>닫기</Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={async () => {
              if (!selectedDocument) return;
              
              try {
                // fetch로 파일 다운로드 (JWT 헤더 포함)
                const response = await fetch(`/api/knowledge/documents/${selectedDocument.id}/file`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (!response.ok) {
                  throw new Error('다운로드 실패');
                }

                // 파일을 blob으로 변환
                const blob = await response.blob();
                
                // 파일명 추출
                const contentDisposition = response.headers.get('Content-Disposition');
                let fileName = selectedDocument.title || selectedDocument.name || 'document.pdf';
                
                if (contentDisposition) {
                  const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                  if (matches && matches[1]) {
                    fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''));
                  }
                }

                // 다운로드 링크 생성
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

              } catch (error) {
                console.error('다운로드 실패:', error);
                alert('파일 다운로드에 실패했습니다.');
              }
            }}
          >
            다운로드
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<LinkIcon />}
            onClick={() => window.open(pdfPreviewUrl, '_blank')}
          >
            새 창에서 열기
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 관련 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          문서/가이드에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Container>
  );
};

export default DocumentsPage;