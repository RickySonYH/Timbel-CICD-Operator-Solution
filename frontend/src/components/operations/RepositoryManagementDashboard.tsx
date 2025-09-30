// [advice from AI] 레포지토리 관리 대시보드 - 등록된 레포지토리 목록 및 파이프라인 상태 관리
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, TextField, InputAdornment, FormControl, InputLabel,
  Select, MenuItem, Menu, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import RepositoryRegistrationWizard from './RepositoryRegistrationWizard';

// [advice from AI] 인터페이스 정의
interface Repository {
  id: string;
  name: string;
  description: string;
  repository_url: string;
  branch: string;
  language: string;
  framework?: string;
  project_id?: string;
  project_name?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  owner_name?: string;
  pipeline_status?: 'none' | 'configured' | 'running' | 'failed';
  last_build_status?: 'success' | 'failed' | 'running' | 'pending';
  last_build_time?: string;
}

interface Pipeline {
  id: string;
  pipeline_name: string;
  repository_id: string;
  status: string;
  last_run_at?: string;
  last_status?: string;
  jenkins_job_name?: string;
  environment: string;
}

const RepositoryManagementDashboard: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // [advice from AI] UI 상태
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    repository: Repository;
  } | null>(null);

  // [advice from AI] 데이터 로드
  const loadRepositories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/project-repositories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRepositories(data.repositories || data.data || []);
      } else {
        throw new Error(data.message || '레포지토리 목록 로드 실패');
      }
    } catch (err: any) {
      setError(err.message || '레포지토리 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadPipelines = useCallback(async () => {
    try {
      const response = await fetch('/api/operations/monitoring/cicd/pipelines', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPipelines(data.pipelines || []);
        }
      }
    } catch (err) {
      console.error('파이프라인 목록 로드 실패:', err);
    }
  }, [token]);

  useEffect(() => {
    loadRepositories();
    loadPipelines();
  }, [loadRepositories, loadPipelines]);

  // [advice from AI] 레포지토리와 파이프라인 매핑
  const getRepositoryWithPipeline = (repo: Repository) => {
    const pipeline = pipelines.find(p => p.repository_id === repo.id);
    return {
      ...repo,
      pipeline_status: pipeline ? 'configured' : 'none',
      last_build_status: pipeline?.last_status as any,
      last_build_time: pipeline?.last_run_at
    };
  };

  // [advice from AI] 필터링된 레포지토리 목록
  const filteredRepositories = repositories
    .map(getRepositoryWithPipeline)
    .filter(repo => {
      const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           repo.repository_url.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || repo.status === statusFilter;
      const matchesLanguage = languageFilter === 'all' || repo.language === languageFilter;
      
      return matchesSearch && matchesStatus && matchesLanguage;
    });

  // [advice from AI] 고유 언어 목록
  const uniqueLanguages = Array.from(new Set(repositories.map(repo => repo.language).filter(Boolean)));

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'configured': return 'primary';
      case 'running': return 'warning';
      case 'failed': return 'error';
      case 'success': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 파이프라인 생성 완료 핸들러
  const handleWizardComplete = (repository: Repository, pipelineConfig: any) => {
    console.log('파이프라인 생성 완료:', { repository, pipelineConfig });
    loadRepositories();
    loadPipelines();
    setWizardOpen(false);
  };

  // [advice from AI] 레포지토리 상세 보기
  const handleViewDetails = (repository: Repository) => {
    setSelectedRepo(repository);
    setDetailsOpen(true);
    setContextMenu(null);
  };

  // [advice from AI] 파이프라인 실행
  const handleRunPipeline = async (repository: Repository) => {
    const pipeline = pipelines.find(p => p.repository_id === repository.id);
    if (!pipeline) {
      alert('파이프라인이 설정되지 않았습니다.');
      return;
    }

    try {
      const response = await fetch(`/api/operations/cicd/pipelines/${pipeline.id}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('파이프라인 실행이 시작되었습니다.');
        loadPipelines();
      } else {
        alert('파이프라인 실행에 실패했습니다.');
      }
    } catch (err) {
      alert('파이프라인 실행 중 오류가 발생했습니다.');
    }
    setContextMenu(null);
  };

  // [advice from AI] 레포지토리 삭제
  const handleDeleteRepository = async (repository: Repository) => {
    if (!confirm(`"${repository.name}" 레포지토리를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/project-repositories/${repository.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('레포지토리가 삭제되었습니다.');
        loadRepositories();
      } else {
        alert('레포지토리 삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('레포지토리 삭제 중 오류가 발생했습니다.');
    }
    setContextMenu(null);
  };

  // [advice from AI] 컨텍스트 메뉴 핸들러
  const handleContextMenu = (event: React.MouseEvent, repository: Repository) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      repository
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>레포지토리 목록을 불러오는 중...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          레포지토리 관리
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setWizardOpen(true)}
        >
          새 레포지토리 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                전체 레포지토리
              </Typography>
              <Typography variant="h4">
                {repositories.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                활성 레포지토리
              </Typography>
              <Typography variant="h4" color="success.main">
                {repositories.filter(r => r.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                파이프라인 설정됨
              </Typography>
              <Typography variant="h4" color="primary.main">
                {repositories.filter(r => pipelines.some(p => p.repository_id === r.id)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                최근 빌드 성공
              </Typography>
              <Typography variant="h4" color="success.main">
                {pipelines.filter(p => p.last_status === 'success').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="레포지토리 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      🔍
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={statusFilter}
                  label="상태"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>언어</InputLabel>
                <Select
                  value={languageFilter}
                  label="언어"
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  <MenuItem value="all">전체</MenuItem>
                  {uniqueLanguages.map((language) => (
                    <MenuItem key={language} value={language}>
                      {language}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setLanguageFilter('all');
                }}
              >
                초기화
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 레포지토리 목록 테이블 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            레포지토리 목록 ({filteredRepositories.length})
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>언어/프레임워크</TableCell>
                  <TableCell>브랜치</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>파이프라인</TableCell>
                  <TableCell>최근 빌드</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRepositories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm || statusFilter !== 'all' || languageFilter !== 'all' 
                          ? '검색 조건에 맞는 레포지토리가 없습니다.'
                          : '등록된 레포지토리가 없습니다.'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRepositories.map((repo) => (
                    <TableRow 
                      key={repo.id} 
                      hover
                      onContextMenu={(e) => handleContextMenu(e, repo)}
                      sx={{ cursor: 'context-menu' }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {repo.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {repo.description}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="primary">
                            {repo.repository_url}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip label={repo.language} size="small" />
                          {repo.framework && (
                            <Chip 
                              label={repo.framework} 
                              size="small" 
                              variant="outlined" 
                              sx={{ ml: 1 }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={repo.branch} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={repo.status} 
                          size="small" 
                          color={getStatusColor(repo.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={repo.pipeline_status === 'configured' ? '설정됨' : '미설정'} 
                          size="small" 
                          color={getStatusColor(repo.pipeline_status || 'none') as any}
                        />
                      </TableCell>
                      <TableCell>
                        {repo.last_build_status ? (
                          <Box>
                            <Chip 
                              label={repo.last_build_status} 
                              size="small" 
                              color={getStatusColor(repo.last_build_status) as any}
                            />
                            {repo.last_build_time && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {new Date(repo.last_build_time).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            빌드 기록 없음
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(repo.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="상세 보기">
                          <IconButton size="small" onClick={() => handleViewDetails(repo)}>
                            👁️
                          </IconButton>
                        </Tooltip>
                        {repo.pipeline_status === 'configured' && (
                          <Tooltip title="파이프라인 실행">
                            <IconButton size="small" onClick={() => handleRunPipeline(repo)}>
                              ▶️
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* [advice from AI] 컨텍스트 메뉴 */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => contextMenu && handleViewDetails(contextMenu.repository)}>
          <ListItemIcon>👁️</ListItemIcon>
          <ListItemText>상세 보기</ListItemText>
        </MenuItem>
        {contextMenu?.repository.pipeline_status === 'configured' && (
          <MenuItem onClick={() => contextMenu && handleRunPipeline(contextMenu.repository)}>
            <ListItemIcon>▶️</ListItemIcon>
            <ListItemText>파이프라인 실행</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => contextMenu && handleDeleteRepository(contextMenu.repository)}>
          <ListItemIcon>🗑️</ListItemIcon>
          <ListItemText>삭제</ListItemText>
        </MenuItem>
      </Menu>

      {/* [advice from AI] 레포지토리 등록 마법사 */}
      <RepositoryRegistrationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />

      {/* [advice from AI] 레포지토리 상세 다이얼로그 */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>레포지토리 상세 정보</DialogTitle>
        <DialogContent>
          {selectedRepo && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedRepo.name}</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedRepo.description}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Repository URL</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {selectedRepo.repository_url}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">브랜치</Typography>
                <Typography variant="body2">{selectedRepo.branch}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">언어</Typography>
                <Typography variant="body2">{selectedRepo.language}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">프레임워크</Typography>
                <Typography variant="body2">{selectedRepo.framework || '없음'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">상태</Typography>
                <Chip 
                  label={selectedRepo.status} 
                  size="small" 
                  color={getStatusColor(selectedRepo.status) as any}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">생성일</Typography>
                <Typography variant="body2">
                  {new Date(selectedRepo.created_at).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RepositoryManagementDashboard;
