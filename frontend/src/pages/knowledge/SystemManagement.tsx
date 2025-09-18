// [advice from AI] 시스템 관리 페이지 - 승인된 시스템들을 관리하고 다운로드/클론 지원

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, InputAdornment, Menu, MenuItem, Tooltip, Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  MoreVert as MoreIcon,
  AccountTree as TreeIcon,
  CloudDownload as CloudIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useRoleBasedVisibility } from '../../hooks/usePermissions';
import SystemRepositoryView from '../../components/system/SystemRepositoryView';

interface SystemInfo {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  version: string;
  owner_group: string;
  lifecycle: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    source?: {
      type: string;
      url: string;
      branch: string;
    };
    extractedAssets?: {
      codeComponents: number;
      designAssets: number;
      documents: number;
      catalogComponents: number;
    };
  };
}

const SystemManagement: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useJwtAuthStore();
  const { permissions, showManageButtons, showAutoRegistration, getUserRoleDisplay } = useRoleBasedVisibility();
  
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [filteredSystems, setFilteredSystems] = useState<SystemInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloneDialog, setCloneDialog] = useState<{open: boolean, system: SystemInfo | null}>({
    open: false,
    system: null
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSystem, setSelectedSystem] = useState<SystemInfo | null>(null);
  const [showRepositoryView, setShowRepositoryView] = useState(false);
  const [repositorySystemId, setRepositorySystemId] = useState<string | null>(null);

  // [advice from AI] 시스템 목록 로드
  useEffect(() => {
    const fetchSystems = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await fetch('/api/systems', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('시스템 목록을 불러올 수 없습니다');
        }

        const data = await response.json();
        setSystems(data.data || []);
        setFilteredSystems(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchSystems();
  }, [token]);

  // [advice from AI] 시스템 필터링 로직 (확장)
  useEffect(() => {
    let filtered = systems.filter(system => {
      const matchesSearch = !searchTerm || 
        system.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        system.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        system.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || system.category === categoryFilter;
      const matchesStatus = !statusFilter || system.approval_status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    setFilteredSystems(filtered);
  }, [systems, searchTerm, categoryFilter, statusFilter]);

  // [advice from AI] 클론 URL 생성
  const generateCloneUrls = (system: SystemInfo) => {
    const sourceUrl = system.metadata?.source?.url;
    if (!sourceUrl) return null;

    return {
      git: sourceUrl,
      vscode: `vscode://vscode.git/clone?url=${encodeURIComponent(sourceUrl)}`,
      intellij: `jetbrains://idea/checkout/git?idea.required.plugins.id=Git4Idea&checkout.repo=${encodeURIComponent(sourceUrl)}`,
      github_desktop: `github-windows://openRepo/${sourceUrl.replace('https://github.com/', '')}`
    };
  };

  // [advice from AI] 클립보드 복사
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: 성공 토스트 표시
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  // [advice from AI] 시스템 다운로드
  const handleDownloadSystem = async (system: SystemInfo) => {
    try {
      const response = await fetch(`/api/catalog-systems/${system.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${system.name}-${system.version}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다');
    }
  };

  // [advice from AI] 시스템 리포지토리 뷰 열기
  const handleOpenRepositoryView = (systemId: string) => {
    setRepositorySystemId(systemId);
    setShowRepositoryView(true);
  };

  // [advice from AI] 생명주기별 색상
  const getLifecycleColor = (lifecycle: string) => {
    switch (lifecycle) {
      case 'production': return 'success';
      case 'development': return 'info';
      case 'experimental': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              시스템 (솔루션) 카탈로그
            </Typography>
            <Typography variant="body1" color="text.secondary">
              승인된 시스템들을 조회하고 활용할 수 있습니다. {showAutoRegistration && 'GitHub 저장소에서 새 시스템을 자동 등록할 수도 있습니다.'}
            </Typography>
          </Box>
          {showAutoRegistration && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/knowledge/auto-registration')}
              sx={{ 
                minWidth: 200,
                height: 56,
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              GitHub 자동 등록
            </Button>
          )}
        </Box>
        <Box sx={{ p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            <strong>시스템 등록 방식:</strong> GitHub 저장소 전체를 시스템으로 등록 → 승인 후 카탈로그에서 조회 → 개별 컴포넌트는 별도 분리 등록
          </Typography>
        </Box>
      </Box>

      {/* [advice from AI] 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="시스템 검색..."
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
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<TreeIcon />}
                  onClick={() => navigate('/knowledge/auto-registration')}
                >
                  새 시스템 등록
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 에러 표시 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 시스템 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>시스템</TableCell>
              <TableCell>GitHub 정보</TableCell>
              <TableCell>분류</TableCell>
              <TableCell>버전</TableCell>
              <TableCell>생명주기</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell align="right">액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : filteredSystems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  등록된 시스템이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredSystems.map((system) => (
                <TableRow key={system.id} hover>
                  <TableCell>
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        fontWeight="bold"
                        sx={{ 
                          cursor: 'pointer', 
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => handleOpenRepositoryView(system.id)}
                      >
                        {system.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {system.description}
                      </Typography>
                      {system.metadata?.source?.url && (
                        <Typography variant="caption" color="primary.main">
                          📦 {system.metadata.source.url.replace('https://github.com/', '')}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {system.metadata?.source?.url ? (
                      <Box>
                        <Chip 
                          label={`브랜치: ${system.metadata.source.branch || 'main'}`}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 0.5 }}
                        />
                        <br />
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => window.open(system.metadata.source.url, '_blank')}
                          sx={{ fontSize: '0.75rem', minWidth: 'auto', p: 0.5 }}
                        >
                          저장소 보기
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        수동 등록
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={system.category} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={`v${system.version}`} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={system.lifecycle} 
                      size="small" 
                      color={getLifecycleColor(system.lifecycle) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip 
                        label={`코드 ${system.metadata?.extractedAssets?.codeComponents || 0}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={`문서 ${system.metadata?.extractedAssets?.documents || 0}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(system.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="시스템 상세보기">
                        <IconButton 
                          size="small"
                          onClick={() => navigate(`/systems/${system.id}`)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="다운로드/클론">
                        <IconButton 
                          size="small"
                          onClick={() => setCloneDialog({open: true, system})}
                        >
                          <CloudIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedSystem(system);
                        }}
                      >
                        <MoreIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* [advice from AI] 더보기 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedSystem) {
            navigate(`/systems/${selectedSystem.id}`);
          }
          setAnchorEl(null);
        }}>
          <ViewIcon sx={{ mr: 1 }} />
          상세보기
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedSystem) {
            handleDownloadSystem(selectedSystem);
          }
          setAnchorEl(null);
        }}>
          <DownloadIcon sx={{ mr: 1 }} />
          ZIP 다운로드
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedSystem) {
            setCloneDialog({open: true, system: selectedSystem});
          }
          setAnchorEl(null);
        }}>
          <CodeIcon sx={{ mr: 1 }} />
          클론하기
        </MenuItem>
      </Menu>

      {/* [advice from AI] 클론/다운로드 다이얼로그 */}
      <Dialog 
        open={cloneDialog.open} 
        onClose={() => setCloneDialog({open: false, system: null})}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          🚀 {cloneDialog.system?.title} 다운로드/클론
        </DialogTitle>
        <DialogContent>
          {cloneDialog.system && (
            <Box>
              {/* ZIP 다운로드 */}
              <Card sx={{ mb: 3, p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DownloadIcon />
                  ZIP 파일 다운로드
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  시스템 전체를 압축 파일로 다운로드합니다.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudIcon />}
                  onClick={() => handleDownloadSystem(cloneDialog.system!)}
                  sx={{ bgcolor: 'primary.dark' }}
                >
                  {cloneDialog.system.name}-{cloneDialog.system.version}.zip 다운로드
                </Button>
              </Card>

              {/* Git 클론 */}
              {cloneDialog.system.metadata?.source && (
                <Card sx={{ mb: 3, p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon />
                    Git 클론
                  </Typography>
                  
                  {(() => {
                    const urls = generateCloneUrls(cloneDialog.system);
                    return urls ? (
                      <Box>
                        {/* HTTPS 클론 */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            HTTPS:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              fullWidth
                              size="small"
                              value={urls.git}
                              InputProps={{ readOnly: true }}
                              sx={{ fontFamily: 'monospace' }}
                            />
                            <Tooltip title="복사">
                              <IconButton 
                                size="small"
                                onClick={() => copyToClipboard(urls.git, 'Git URL')}
                              >
                                <CopyIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        {/* Git 명령어 */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            Git 명령어:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              fullWidth
                              size="small"
                              value={`git clone ${urls.git}`}
                              InputProps={{ readOnly: true }}
                              sx={{ fontFamily: 'monospace', fontSize: '12px' }}
                            />
                            <Tooltip title="복사">
                              <IconButton 
                                size="small"
                                onClick={() => copyToClipboard(`git clone ${urls.git}`, 'Git 명령어')}
                              >
                                <CopyIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Typography color="text.secondary">
                        원본 저장소 정보가 없습니다.
                      </Typography>
                    );
                  })()}
                </Card>
              )}

              {/* IDE 클론 링크 */}
              {cloneDialog.system.metadata?.source && (
                <Card sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LaunchIcon />
                    IDE에서 열기
                  </Typography>
                  
                  {(() => {
                    const urls = generateCloneUrls(cloneDialog.system);
                    return urls ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<CodeIcon />}
                            onClick={() => window.open(urls.vscode, '_blank')}
                          >
                            VS Code에서 열기
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<CodeIcon />}
                            onClick={() => window.open(urls.intellij, '_blank')}
                          >
                            IntelliJ에서 열기
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<LaunchIcon />}
                            onClick={() => window.open(urls.github_desktop, '_blank')}
                          >
                            GitHub Desktop
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<TerminalIcon />}
                            onClick={() => copyToClipboard(`git clone ${urls.git}`, 'Git 명령어')}
                          >
                            터미널 명령어 복사
                          </Button>
                        </Grid>
                      </Grid>
                    ) : null;
                  })()}
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialog({open: false, system: null})}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] GitHub 스타일 시스템 리포지토리 뷰 */}
      {showRepositoryView && repositorySystemId && (
        <Dialog 
          open={showRepositoryView} 
          onClose={() => setShowRepositoryView(false)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: { 
              height: '90vh',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
            <SystemRepositoryView 
              systemId={repositorySystemId}
              onClose={() => setShowRepositoryView(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Container>
  );
};

export default SystemManagement;
