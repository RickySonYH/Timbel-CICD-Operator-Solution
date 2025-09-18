import React, { useState, useEffect, useRef } from 'react';
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
  InputAdornment,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  FileUpload as FileUploadIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  School as SchoolIcon,
  Engineering as EngineeringIcon,
  AccountTree as WorkflowIcon,
  BugReport as BugReportIcon,
  Announcement as ReleaseIcon,
  Help as HelpIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';
import KnowledgeAssetDetail from '../../../components/knowledge/KnowledgeAssetDetail';

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  type: string;
  tags: string[];
  version: string;
  status: string;
  is_public: boolean;
  file_info?: {
    originalName: string;
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  };
  creator_id: string;
  creator_name?: string;
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
}

const DocumentGuideRegistration: React.FC = () => {
  const { token } = useJwtAuthStore();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // [advice from AI] 새 문서 생성 관련 상태
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    category: 'User Guide',
    type: 'document',
    tags: [] as string[],
    version: '1.0.0',
    status: 'draft',
    is_public: false
  });
  const [tagInput, setTagInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentMode, setDocumentMode] = useState<'upload' | 'online'>('online');

  // [advice from AI] 문서 상세 보기 관련 상태
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{
    type: 'document';
    id: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // [advice from AI] 카테고리 아이콘 매핑
  const categoryIcons: { [key: string]: React.ReactElement } = {
    'User Guide': <DescriptionIcon />,
    'API Documentation': <CodeIcon />,
    'Tutorial': <SchoolIcon />,
    'Technical Specification': <EngineeringIcon />,
    'Process Guide': <WorkflowIcon />,
    'Troubleshooting': <BugReportIcon />,
    'Release Notes': <ReleaseIcon />,
    'FAQ': <HelpIcon />
  };

  // [advice from AI] 문서 목록 조회
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedType) params.append('type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/documents?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('문서 목록을 불러오는데 실패했습니다.');
      }

      const result = await response.json();
      setDocuments(result.data || []);
    } catch (error) {
      console.error('문서 목록 조회 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 새 문서 생성
  const handleCreateDocument = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      formData.append('title', newDocument.title);
      formData.append('content', newDocument.content);
      formData.append('category', newDocument.category);
      formData.append('type', newDocument.type);
      formData.append('tags', newDocument.tags.join(','));
      formData.append('version', newDocument.version);
      formData.append('status', newDocument.status);
      formData.append('is_public', newDocument.is_public.toString());

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('문서 생성에 실패했습니다.');
      }

      const result = await response.json();
      console.log('문서 생성 성공:', result.data);

      // 성공 후 초기화
      setNewDocument({
        title: '',
        content: '',
        category: 'User Guide',
        type: 'document',
        tags: [],
        version: '1.0.0',
        status: 'draft',
        is_public: false
      });
      setSelectedFile(null);
      setTagInput('');
      setDocumentMode('online');

      // 목록 새로고침
      await fetchDocuments();
      
      setError(null);
    } catch (error) {
      console.error('문서 생성 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 문서 삭제
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('정말로 이 문서를 삭제하시겠습니까?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('문서 삭제에 실패했습니다.');
      }

      await fetchDocuments();
      setError(null);
    } catch (error) {
      console.error('문서 삭제 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 파일 다운로드
  const handleDownloadFile = async (doc: Document) => {
    if (!doc.file_info) return;

    try {
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_info.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('파일 다운로드 오류:', error);
      setError(error instanceof Error ? error.message : '파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 문서 목록 조회
  useEffect(() => {
    fetchDocuments();
  }, [searchTerm, selectedCategory, selectedType, selectedStatus]);

  // [advice from AI] 상태별 색상 매핑
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'review': return 'warning';
      case 'published': return 'success';
      case 'archived': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 상태별 한글 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '초안';
      case 'review': return '검토중';
      case 'published': return '발행';
      case 'archived': return '보관';
      default: return status;
    }
  };

  // [advice from AI] 타입별 한글 텍스트
  const getTypeText = (type: string) => {
    switch (type) {
      case 'document': return '문서';
      case 'guide': return '가이드';
      case 'tutorial': return '튜토리얼';
      case 'manual': return '매뉴얼';
      case 'reference': return '참조';
      default: return type;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          📚 문서/가이드 카탈로그
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
            onClick={() => setTabValue(1)}
            sx={{ bgcolor: 'primary.main' }}
          >
            새 문서 등록
          </Button>
        </Box>
      </Box>

      {/* [advice from AI] 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="문서 목록" />
          <Tab label="새 문서 등록" />
        </Tabs>
      </Paper>

      {/* [advice from AI] 문서 목록 탭 */}
      {tabValue === 0 && (
        <Box>
          {/* [advice from AI] 검색 및 필터 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    placeholder="문서 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>카테고리</InputLabel>
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      label="카테고리"
                    >
                      <MenuItem value="">전체</MenuItem>
                      <MenuItem value="User Guide">User Guide</MenuItem>
                      <MenuItem value="API Documentation">API Documentation</MenuItem>
                      <MenuItem value="Tutorial">Tutorial</MenuItem>
                      <MenuItem value="Technical Specification">Technical Specification</MenuItem>
                      <MenuItem value="Process Guide">Process Guide</MenuItem>
                      <MenuItem value="Troubleshooting">Troubleshooting</MenuItem>
                      <MenuItem value="Release Notes">Release Notes</MenuItem>
                      <MenuItem value="FAQ">FAQ</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>타입</InputLabel>
                    <Select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      label="타입"
                    >
                      <MenuItem value="">전체</MenuItem>
                      <MenuItem value="document">문서</MenuItem>
                      <MenuItem value="guide">가이드</MenuItem>
                      <MenuItem value="tutorial">튜토리얼</MenuItem>
                      <MenuItem value="manual">매뉴얼</MenuItem>
                      <MenuItem value="reference">참조</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>상태</InputLabel>
                    <Select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      label="상태"
                    >
                      <MenuItem value="">전체</MenuItem>
                      <MenuItem value="draft">초안</MenuItem>
                      <MenuItem value="review">검토중</MenuItem>
                      <MenuItem value="published">발행</MenuItem>
                      <MenuItem value="archived">보관</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    variant="outlined"
                    onClick={fetchDocuments}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                  >
                    검색
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* [advice from AI] 문서 목록 */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {documents.map((document) => (
                <Grid item xs={12} md={6} lg={4} key={document.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        {categoryIcons[document.category] || <DescriptionIcon />}
                        <Typography variant="h6" component="h3" sx={{ ml: 1, flexGrow: 1 }}>
                          {document.title}
                        </Typography>
                        <Chip
                          label={getStatusText(document.status)}
                          color={getStatusColor(document.status) as any}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {document.content.substring(0, 100)}...
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {document.tags.slice(0, 3).map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                        {document.tags.length > 3 && (
                          <Chip label={`+${document.tags.length - 3}`} size="small" variant="outlined" />
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {getTypeText(document.type)} • v{document.version}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(document.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="조회수">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ViewIcon fontSize="small" />
                              <Typography variant="caption">{document.view_count}</Typography>
                            </Box>
                          </Tooltip>
                          {document.file_info && (
                            <Tooltip title="다운로드수">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <DownloadIcon fontSize="small" />
                                <Typography variant="caption">{document.download_count}</Typography>
                              </Box>
                            </Tooltip>
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => setSelectedAsset({ type: 'document', id: document.id })}
                            title="상세 보기"
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton size="small">
                            <EditIcon />
                          </IconButton>
                          {document.file_info && (
                            <IconButton size="small" onClick={() => handleDownloadFile(document)}>
                              <DownloadIcon />
                            </IconButton>
                          )}
                          <IconButton size="small" onClick={() => handleDeleteDocument(document.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* [advice from AI] 새 문서 등록 탭 */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              새 문서 등록
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
                      label="문서 제목"
                      value={newDocument.title}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>카테고리</InputLabel>
                      <Select
                        value={newDocument.category}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
                        label="카테고리"
                      >
                        <MenuItem value="User Guide">User Guide</MenuItem>
                        <MenuItem value="API Documentation">API Documentation</MenuItem>
                        <MenuItem value="Tutorial">Tutorial</MenuItem>
                        <MenuItem value="Technical Specification">Technical Specification</MenuItem>
                        <MenuItem value="Process Guide">Process Guide</MenuItem>
                        <MenuItem value="Troubleshooting">Troubleshooting</MenuItem>
                        <MenuItem value="Release Notes">Release Notes</MenuItem>
                        <MenuItem value="FAQ">FAQ</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>타입</InputLabel>
                      <Select
                        value={newDocument.type}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, type: e.target.value }))}
                        label="타입"
                      >
                        <MenuItem value="document">문서</MenuItem>
                        <MenuItem value="guide">가이드</MenuItem>
                        <MenuItem value="tutorial">튜토리얼</MenuItem>
                        <MenuItem value="manual">매뉴얼</MenuItem>
                        <MenuItem value="reference">참조</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>

              {/* [advice from AI] 문서 모드 선택 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  문서 생성 방식
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant={documentMode === 'online' ? 'contained' : 'outlined'}
                    startIcon={<DescriptionIcon />}
                    onClick={() => setDocumentMode('online')}
                  >
                    온라인 작성
                  </Button>
                  <Button
                    variant={documentMode === 'upload' ? 'contained' : 'outlined'}
                    startIcon={<FileUploadIcon />}
                    onClick={() => setDocumentMode('upload')}
                  >
                    파일 업로드
                  </Button>
                </Box>
              </Grid>

              {/* [advice from AI] 파일 업로드 */}
              {documentMode === 'upload' && (
                <Grid item xs={12}>
                  <Box sx={{ border: '2px dashed', borderColor: 'grey.300', p: 3, textAlign: 'center' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          // 파일명을 제목으로 자동 설정
                          if (!newDocument.title) {
                            setNewDocument(prev => ({
                              ...prev,
                              title: file.name.replace(/\.[^/.]+$/, "")
                            }));
                          }
                        }
                      }}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.txt,.md,.html,.json,.xml,.jpg,.jpeg,.png,.gif,.zip"
                    />
                    <Button
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ mb: 2 }}
                    >
                      파일 선택
                    </Button>
                    {selectedFile && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          선택된 파일: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              )}

              {/* [advice from AI] 온라인 작성 */}
              {documentMode === 'online' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="문서 내용"
                    multiline
                    rows={12}
                    value={newDocument.content}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="마크다운 형식으로 문서를 작성하세요..."
                    helperText="마크다운 문법을 지원합니다. (예: # 제목, **굵게**, *기울임*, - 목록)"
                  />
                </Grid>
              )}

              {/* [advice from AI] 태그 관리 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  태그 관리
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {newDocument.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => {
                        setNewDocument(prev => ({
                          ...prev,
                          tags: prev.tags.filter(t => t !== tag)
                        }));
                      }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="태그 입력"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && tagInput.trim() && !newDocument.tags.includes(tagInput.trim())) {
                        setNewDocument(prev => ({
                          ...prev,
                          tags: [...prev.tags, tagInput.trim()]
                        }));
                        setTagInput('');
                      }
                    }}
                  />
                  <Button variant="outlined" onClick={() => {
                    if (tagInput.trim() && !newDocument.tags.includes(tagInput.trim())) {
                      setNewDocument(prev => ({
                        ...prev,
                        tags: [...prev.tags, tagInput.trim()]
                      }));
                      setTagInput('');
                    }
                  }}>
                    추가
                  </Button>
                </Box>
              </Grid>

              {/* [advice from AI] 버전 및 상태 */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  버전 및 상태
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="버전"
                      value={newDocument.version}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="1.0.0"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>상태</InputLabel>
                      <Select
                        value={newDocument.status}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, status: e.target.value }))}
                        label="상태"
                      >
                        <MenuItem value="draft">초안</MenuItem>
                        <MenuItem value="review">검토중</MenuItem>
                        <MenuItem value="published">발행</MenuItem>
                        <MenuItem value="archived">보관</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <Button
                        variant={newDocument.is_public ? 'contained' : 'outlined'}
                        onClick={() => setNewDocument(prev => ({ ...prev, is_public: !prev.is_public }))}
                        fullWidth
                      >
                        {newDocument.is_public ? '공개 문서' : '비공개 문서'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* [advice from AI] 저장 버튼 */}
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
                    startIcon={<SaveIcon />}
                    onClick={handleCreateDocument}
                    disabled={loading || !newDocument.title || (!newDocument.content && !selectedFile)}
                  >
                    {loading ? <CircularProgress size={20} /> : '문서 저장'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* [advice from AI] 문서 상세 보기 다이얼로그 */}
      <Dialog
        open={showDocumentDialog}
        onClose={() => setShowDocumentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            문서 상세 보기
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            문서 상세 내용이 여기에 표시됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDocumentDialog(false)}>닫기</Button>
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
  );
};

export default DocumentGuideRegistration;
