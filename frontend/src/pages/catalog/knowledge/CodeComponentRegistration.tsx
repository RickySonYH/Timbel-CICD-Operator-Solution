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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  GitHub as GitHubIcon,
  Extension as NpmIcon,
  Link as LinkIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface CodeComponent {
  id: string;
  name: string;
  description: string;
  type: string;
  language: string;
  framework: string;
  dependencies: any[];
  usage_example: string;
  version: string;
  source_type: string;
  source_url: string;
  source_info: any;
  file_info: {
    originalName: string;
    filename: string;
    size: number;
    mimetype: string;
  } | null;
  creator_name: string;
  download_count: number;
  created_at: string;
  updated_at: string;
}

interface CodeComponentFormData {
  name: string;
  description: string;
  type: string;
  language: string;
  framework: string;
  dependencies: string;
  usage_example: string;
  version: string;
  source_type: string;
  source_url: string;
  file: File | null;
}

interface ExternalSourceInfo {
  name?: string;
  description?: string;
  language?: string;
  version?: string;
  dependencies?: any;
  stars?: number;
  forks?: number;
  last_updated?: string;
  clone_url?: string;
}

const CodeComponentRegistration: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [components, setComponents] = useState<CodeComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingComponent, setEditingComponent] = useState<CodeComponent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [externalInfo, setExternalInfo] = useState<ExternalSourceInfo | null>(null);

  const [formData, setFormData] = useState<CodeComponentFormData>({
    name: '',
    description: '',
    type: 'component',
    language: 'javascript',
    framework: '',
    dependencies: '',
    usage_example: '',
    version: '1.0.0',
    source_type: 'upload',
    source_url: '',
    file: null
  });

  const componentTypes = [
    'Component', 'Library', 'Snippet', 'Template', 'Utility', 'Hook', 'Service', 'Middleware'
  ];

  const languages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Scala'
  ];

  const frameworks = [
    'React', 'Vue', 'Angular', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails', 'Next.js', 'Nuxt.js', 'Svelte'
  ];

  const sourceTypes = [
    { value: 'upload', label: '파일 업로드', icon: <UploadIcon /> },
    { value: 'github', label: 'GitHub', icon: <GitHubIcon /> },
    { value: 'gitlab', label: 'GitLab', icon: <LinkIcon /> },
    { value: 'bitbucket', label: 'Bitbucket', icon: <LinkIcon /> },
    { value: 'npm', label: 'NPM', icon: <NpmIcon /> },
    { value: 'url', label: '기타 URL', icon: <LinkIcon /> }
  ];

  // [advice from AI] 코드 컴포넌트 목록 조회
  const fetchComponents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('type', typeFilter);
      if (languageFilter) params.append('language', languageFilter);
      if (sourceTypeFilter) params.append('source_type', sourceTypeFilter);

      const response = await fetch(`http://localhost:3001/api/code-components?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch code components');
      }

      const data = await response.json();
      setComponents(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchComponents();
    }
  }, [token, searchTerm, typeFilter, languageFilter, sourceTypeFilter]);

  // [advice from AI] 외부 저장소 정보 미리보기 (자동 수집 + 수동 수정 가능)
  const handlePreviewExternal = async () => {
    if (!formData.source_type || !formData.source_url) {
      setError('소스 타입과 URL을 입력해주세요');
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/code-components/preview-external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source_type: formData.source_type,
          source_url: formData.source_url
        })
      });

      if (!response.ok) {
        throw new Error('Failed to preview external source');
      }

      const data = await response.json();
      setExternalInfo(data.data);
      
      // [advice from AI] 자동으로 폼 데이터에 외부 정보 채우기 (수동 수정 가능)
      setFormData(prev => ({
        ...prev,
        name: prev.name || data.data.name || '',
        description: prev.description || data.data.description || '',
        language: prev.language || (data.data.language || '').toLowerCase(),
        version: prev.version || data.data.version || '1.0.0',
        type: prev.type || 'library'
      }));

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to preview external source');
    } finally {
      setPreviewLoading(false);
    }
  };

  // [advice from AI] 코드 컴포넌트 생성
  const handleCreateComponent = async () => {
    setLoading(true);
    try {
      let response;

      if (formData.source_type === 'upload') {
        if (!formData.file) {
          setError('파일을 선택해주세요');
          return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('type', formData.type);
        formDataToSend.append('language', formData.language);
        formDataToSend.append('framework', formData.framework);
        formDataToSend.append('dependencies', formData.dependencies);
        formDataToSend.append('usage_example', formData.usage_example);
        formDataToSend.append('version', formData.version);
        formDataToSend.append('file', formData.file);

        response = await fetch('http://localhost:3001/api/code-components', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataToSend
        });
      } else {
        response = await fetch('http://localhost:3001/api/code-components', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            type: formData.type,
            language: formData.language,
            framework: formData.framework,
            dependencies: formData.dependencies,
            usage_example: formData.usage_example,
            version: formData.version,
            source_type: formData.source_type,
            source_url: formData.source_url
          })
        });
      }

      if (!response.ok) {
        throw new Error('Failed to create code component');
      }

      setOpenDialog(false);
      resetForm();
      fetchComponents();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'component',
      language: 'javascript',
      framework: '',
      dependencies: '',
      usage_example: '',
      version: '1.0.0',
      source_type: 'upload',
      source_url: '',
      file: null
    });
    setExternalInfo(null);
  };

  const handleOpenDialog = (component?: CodeComponent) => {
    if (component) {
      setEditingComponent(component);
      setFormData({
        name: component.name,
        description: component.description,
        type: component.type,
        language: component.language,
        framework: component.framework,
        dependencies: JSON.stringify(component.dependencies || []),
        usage_example: component.usage_example,
        version: component.version,
        source_type: component.source_type,
        source_url: component.source_url,
        file: null
      });
    } else {
      setEditingComponent(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingComponent(null);
    resetForm();
  };

  const getSourceIcon = (sourceType: string) => {
    const source = sourceTypes.find(s => s.value === sourceType);
    return source?.icon || <LinkIcon />;
  };

  const getSourceLabel = (sourceType: string) => {
    const source = sourceTypes.find(s => s.value === sourceType);
    return source?.label || sourceType;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            코드/컴포넌트 등록
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            새 컴포넌트 등록
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
              <Grid item xs={12} md={3}>
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
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>타입</InputLabel>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    label="타입"
                  >
                    <MenuItem value="">전체</MenuItem>
                    {componentTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>언어</InputLabel>
                  <Select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    label="언어"
                  >
                    <MenuItem value="">전체</MenuItem>
                    {languages.map((language) => (
                      <MenuItem key={language} value={language}>
                        {language}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>소스 타입</InputLabel>
                  <Select
                    value={sourceTypeFilter}
                    onChange={(e) => setSourceTypeFilter(e.target.value)}
                    label="소스 타입"
                  >
                    <MenuItem value="">전체</MenuItem>
                    {sourceTypes.map((source) => (
                      <MenuItem key={source.value} value={source.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {source.icon}
                          {source.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 컴포넌트 목록 */}
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
                      <TableCell>소스</TableCell>
                      <TableCell>이름</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>언어</TableCell>
                      <TableCell>프레임워크</TableCell>
                      <TableCell>버전</TableCell>
                      <TableCell>다운로드</TableCell>
                      <TableCell>생성자</TableCell>
                      <TableCell>생성일</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {components.map((component) => (
                      <TableRow key={component.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getSourceIcon(component.source_type)}
                            <Chip label={getSourceLabel(component.source_type)} size="small" />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {component.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {component.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={component.type} size="small" />
                        </TableCell>
                        <TableCell>{component.language}</TableCell>
                        <TableCell>{component.framework}</TableCell>
                        <TableCell>{component.version}</TableCell>
                        <TableCell>{component.download_count}</TableCell>
                        <TableCell>{component.creator_name}</TableCell>
                        <TableCell>
                          {new Date(component.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          {component.file_info && (
                            <IconButton
                              size="small"
                              onClick={() => window.open(`http://localhost:3001/api/code-components/${component.id}/download`)}
                              title="다운로드"
                            >
                              <DownloadIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(component)}
                            title="수정"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
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
            {editingComponent ? '코드 컴포넌트 수정' : '새 코드 컴포넌트 등록'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {/* 소스 타입 선택 */}
              {!editingComponent && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      소스 타입 선택
                    </Typography>
                  </Grid>
                  {sourceTypes.map((source) => (
                    <Grid item xs={12} sm={6} md={4} key={source.value}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: formData.source_type === source.value ? 2 : 1,
                          borderColor: formData.source_type === source.value ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => setFormData({ ...formData, source_type: source.value })}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Box sx={{ mb: 1 }}>{source.icon}</Box>
                          <Typography variant="body2">{source.label}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* 외부 저장소 URL 입력 */}
              {formData.source_type !== 'upload' && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      외부 저장소 정보
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <TextField
                        fullWidth
                        label="URL"
                        value={formData.source_url}
                        onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                        placeholder={
                          formData.source_type === 'github' ? 'https://github.com/owner/repo' :
                          formData.source_type === 'npm' ? 'https://www.npmjs.com/package/package-name' :
                          'https://...'
                        }
                      />
                      <Button
                        variant="outlined"
                        startIcon={<PreviewIcon />}
                        onClick={handlePreviewExternal}
                        disabled={!formData.source_url || previewLoading}
                      >
                        {previewLoading ? <CircularProgress size={20} /> : '미리보기'}
                      </Button>
                    </Box>

                    {/* [advice from AI] 외부 저장소 정보 미리보기 (자동 수집된 정보 표시) */}
                    {externalInfo && (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          자동 수집된 정보 (아래 폼에서 수정 가능)
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {externalInfo.name && <Chip label={`이름: ${externalInfo.name}`} size="small" />}
                          {externalInfo.language && <Chip label={`언어: ${externalInfo.language}`} size="small" />}
                          {externalInfo.version && <Chip label={`버전: ${externalInfo.version}`} size="small" />}
                          {externalInfo.stars && <Chip label={`⭐ ${externalInfo.stars}`} size="small" />}
                        </Box>
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              )}

              {/* 파일 업로드 */}
              {formData.source_type === 'upload' && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      파일 업로드
                    </Typography>
                  </Grid>
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
                        accept=".js,.ts,.jsx,.tsx,.vue,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.json,.xml,.yaml,.yml,.md,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, file });
                          }
                        }}
                      />
                    </Button>
                  </Grid>
                </Grid>
              )}

              {/* 기본 정보 입력 (자동 수집된 정보는 수정 가능) */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    기본 정보 (자동 수집된 정보는 수정 가능)
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="컴포넌트명"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
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
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>타입</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      label="타입"
                    >
                      {componentTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>언어</InputLabel>
                    <Select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      label="언어"
                    >
                      {languages.map((language) => (
                        <MenuItem key={language} value={language.toLowerCase()}>
                          {language}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>프레임워크</InputLabel>
                    <Select
                      value={formData.framework}
                      onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                      label="프레임워크"
                    >
                      <MenuItem value="">없음</MenuItem>
                      {frameworks.map((framework) => (
                        <MenuItem key={framework} value={framework}>
                          {framework}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="의존성 (JSON 형태)"
                    value={formData.dependencies}
                    onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
                    placeholder='[{"name": "react", "version": "^18.0.0"}]'
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="사용 예제"
                    value={formData.usage_example}
                    onChange={(e) => setFormData({ ...formData, usage_example: e.target.value })}
                    multiline
                    rows={4}
                    placeholder="// 사용 예제 코드를 입력하세요"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button
              onClick={handleCreateComponent}
              variant="contained"
              disabled={loading || !formData.name}
            >
              {loading ? <CircularProgress size={20} /> : '등록'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default CodeComponentRegistration;