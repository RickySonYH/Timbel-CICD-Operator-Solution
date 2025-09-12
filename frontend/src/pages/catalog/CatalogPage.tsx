import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Tabs,
  Tab,
  Pagination,
  InputAdornment,
  Avatar,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Domain as DomainIcon,
  Storage as SystemIcon,
  Extension as ComponentIcon,
  Api as ApiIcon,
  Folder as ResourceIcon,
  Group as GroupIcon,
  Person as UserIcon,
  Build as CICDIcon,
  Description as DocsIcon,
  Cloud as K8sIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] Backstage.io 스타일의 카탈로그 메인 페이지
const CatalogPage: React.FC = () => {
  const { isAuthenticated, token } = useJwtAuthStore();
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [selectedLifecycle, setSelectedLifecycle] = useState('all');
  const [selectedTab, setSelectedTab] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // [advice from AI] 엔티티 종류별 아이콘 매핑
  const getEntityIcon = (kind: string) => {
    switch (kind) {
      case 'domain': return <DomainIcon />;
      case 'system': return <SystemIcon />;
      case 'component': return <ComponentIcon />;
      case 'api': return <ApiIcon />;
      case 'resource': return <ResourceIcon />;
      case 'group': return <GroupIcon />;
      case 'user': return <UserIcon />;
      default: return <ComponentIcon />;
    }
  };

  // [advice from AI] 라이프사이클별 색상
  const getLifecycleColor = (lifecycle: string) => {
    switch (lifecycle) {
      case 'production': return 'success';
      case 'experimental': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 엔티티 목록 조회
  const fetchEntities = async () => {
    if (!isAuthenticated || !token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedKind !== 'all' && { kind: selectedKind }),
        ...(selectedOwner !== 'all' && { owner: selectedOwner }),
        ...(selectedLifecycle !== 'all' && { lifecycle: selectedLifecycle })
      });

      const response = await fetch(`http://localhost:3001/api/catalog/entities?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEntities(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('엔티티 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [isAuthenticated, token, pagination.page, selectedKind, selectedOwner, selectedLifecycle, searchTerm]);

  // [advice from AI] 검색 핸들러
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // [advice from AI] 필터 핸들러
  const handleKindChange = (event: any) => {
    setSelectedKind(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleOwnerChange = (event: any) => {
    setSelectedOwner(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleLifecycleChange = (event: any) => {
    setSelectedLifecycle(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // [advice from AI] 페이지 변경 핸들러
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // [advice from AI] 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    const kinds = ['all', 'domain', 'system', 'component', 'api', 'resource', 'group', 'user'];
    setSelectedKind(kinds[newValue]);
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">로그인이 필요합니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#1a1a1a' }}>
      {/* [advice from AI] 왼쪽 사이드바 - 필터 영역 */}
      <Box sx={{ 
        width: 300, 
        bgcolor: '#2d2d2d', 
        p: 2, 
        borderRight: '1px solid #404040',
        overflowY: 'auto'
      }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
          필터
        </Typography>

        {/* Kind 필터 */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: 'white' }}>Kind</InputLabel>
          <Select
            value={selectedKind}
            onChange={handleKindChange}
            sx={{ 
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' }
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="domain">Domain</MenuItem>
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="component">Component</MenuItem>
            <MenuItem value="api">API</MenuItem>
            <MenuItem value="resource">Resource</MenuItem>
            <MenuItem value="group">Group</MenuItem>
            <MenuItem value="user">User</MenuItem>
          </Select>
        </FormControl>

        {/* Owner 필터 */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: 'white' }}>Owner</InputLabel>
          <Select
            value={selectedOwner}
            onChange={handleOwnerChange}
            sx={{ 
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' }
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="team-a">Team A</MenuItem>
            <MenuItem value="Team B">Team B</MenuItem>
            <MenuItem value="Team C">Team C</MenuItem>
            <MenuItem value="ACME Corp">ACME Corp</MenuItem>
          </Select>
        </FormControl>

        {/* Lifecycle 필터 */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: 'white' }}>Lifecycle</InputLabel>
          <Select
            value={selectedLifecycle}
            onChange={handleLifecycleChange}
            sx={{ 
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' }
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="production">Production</MenuItem>
            <MenuItem value="experimental">Experimental</MenuItem>
            <MenuItem value="deprecated">Deprecated</MenuItem>
          </Select>
        </FormControl>

        {/* Personal 섹션 */}
        <Typography variant="subtitle2" sx={{ color: '#888', mt: 3, mb: 1 }}>
          PERSONAL
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CICDIcon sx={{ color: '#888', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: 'white' }}>Owned</Typography>
            <Chip label="0" size="small" sx={{ ml: 'auto', bgcolor: '#404040', color: 'white' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StarBorderIcon sx={{ color: '#888', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ color: 'white' }}>Starred</Typography>
            <Chip label="0" size="small" sx={{ ml: 'auto', bgcolor: '#404040', color: 'white' }} />
          </Box>
        </Box>

        {/* My Company 섹션 */}
        <Typography variant="subtitle2" sx={{ color: '#888', mt: 3, mb: 1 }}>
          MY COMPANY
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'white' }}>All</Typography>
          <Chip label={pagination.total} size="small" sx={{ ml: 'auto', bgcolor: '#404040', color: 'white' }} />
        </Box>
      </Box>

      {/* [advice from AI] 메인 콘텐츠 영역 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <Box sx={{ 
          bgcolor: '#2d2d2d', 
          p: 2, 
          borderBottom: '1px solid #404040',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
            My Company Catalog
          </Typography>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              sx={{ 
                bgcolor: '#1976d2', 
                mr: 1,
                '&:hover': { bgcolor: '#1565c0' }
              }}
            >
              CREATE
            </Button>
            <Button 
              variant="outlined" 
              sx={{ 
                color: 'white', 
                borderColor: '#404040',
                '&:hover': { borderColor: '#666' }
              }}
            >
              ? SUPPORT
            </Button>
          </Box>
        </Box>

        {/* 탭 네비게이션 */}
        <Box sx={{ bgcolor: '#2d2d2d', borderBottom: '1px solid #404040' }}>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': { color: '#888' },
              '& .Mui-selected': { color: 'white' },
              '& .MuiTabs-indicator': { bgcolor: '#1976d2' }
            }}
          >
            <Tab label="All" />
            <Tab label="Domains" />
            <Tab label="Systems" />
            <Tab label="Components" />
            <Tab label="APIs" />
            <Tab label="Resources" />
            <Tab label="Groups" />
            <Tab label="Users" />
          </Tabs>
        </Box>

        {/* 검색 및 테이블 */}
        <Box sx={{ flex: 1, p: 2, bgcolor: '#1a1a1a' }}>
          {/* 검색 바 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', mr: 2 }}>
              All {selectedKind === 'all' ? 'entities' : selectedKind + 's'} ({pagination.total})
            </Typography>
            <TextField
              placeholder="Search"
              value={searchTerm}
              onChange={handleSearch}
              size="small"
              sx={{
                ml: 'auto',
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: '#404040' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2' }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#888' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Typography sx={{ color: '#888' }}>×</Typography>
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* 엔티티 테이블 */}
          <TableContainer component={Paper} sx={{ bgcolor: '#2d2d2d' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>NAME</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>OWNER</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>DESCRIPTION</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>TAGS</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entities.map((entity) => (
                  <TableRow key={entity.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: '#404040', mr: 1, width: 24, height: 24 }}>
                          {getEntityIcon(entity.kind)}
                        </Avatar>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#1976d2', 
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                        >
                          {entity.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: '#404040', mr: 1, width: 20, height: 20 }}>
                          <UserIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          {entity.owner}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#888' }}>
                        {entity.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {entity.tags && entity.tags.length > 0 ? (
                          entity.tags.map((tag: string, index: number) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              sx={{ 
                                bgcolor: '#404040', 
                                color: 'white',
                                fontSize: '0.75rem'
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" sx={{ color: '#666' }}>
                            No tags
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View">
                          <IconButton size="small">
                            <ViewIcon sx={{ color: '#888', fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small">
                            <EditIcon sx={{ color: '#888', fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Star">
                          <IconButton size="small">
                            <StarBorderIcon sx={{ color: '#888', fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: 'white',
                  '&.Mui-selected': {
                    bgcolor: '#1976d2'
                  }
                }
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CatalogPage;
