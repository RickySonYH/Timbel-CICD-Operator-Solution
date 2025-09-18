// [advice from AI] 통합 지식 자산 검색 컴포넌트

import React, { useState, useEffect } from 'react';
import {
  Box, TextField, InputAdornment, Card, CardContent,
  Typography, List, ListItem, ListItemIcon, ListItemText,
  ListItemSecondaryAction, IconButton, Chip, Grid,
  FormControl, InputLabel, Select, MenuItem, Pagination,
  Alert, CircularProgress, Tabs, Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Category as CategoryIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import KnowledgeAssetDetail from './KnowledgeAssetDetail';

interface SearchResult {
  id: string;
  name: string;
  title?: string;
  description: string;
  type: string;
  file_path?: string;
  creator_name?: string;
  created_at: string;
  result_type: 'code' | 'design' | 'document' | 'catalog';
}

interface SearchResults {
  codeComponents: SearchResult[];
  designAssets: SearchResult[];
  documents: SearchResult[];
  catalogComponents: SearchResult[];
  totalResults: number;
}

const KnowledgeSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<{
    type: 'code' | 'design' | 'document' | 'catalog';
    id: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const { token } = useJwtAuthStore();

  const itemsPerPage = 20;

  // [advice from AI] 검색 실행
  const handleSearch = async () => {
    if (!token || !searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 지식 자산 검색:', { searchTerm, searchType });

      const params = new URLSearchParams({
        query: searchTerm,
        type: searchType,
        limit: itemsPerPage.toString(),
        offset: ((page - 1) * itemsPerPage).toString()
      });

      const response = await fetch(`http://localhost:3001/api/knowledge-extraction/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setSearchResults(result.data);
        console.log('✅ 검색 성공:', result.data.totalResults, '개 결과');
      } else {
        throw new Error(result.message || 'Search failed');
      }

    } catch (err) {
      console.error('❌ 검색 실패:', err);
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 엔터 키 처리
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // [advice from AI] 자산 상세 보기
  const handleViewAsset = (assetType: string, assetId: string) => {
    let type: 'code' | 'design' | 'document' | 'catalog';
    
    switch (assetType) {
      case 'code':
        type = 'code';
        break;
      case 'design':
        type = 'design';
        break;
      case 'document':
        type = 'document';
        break;
      case 'catalog':
        type = 'catalog';
        break;
      default:
        type = 'code';
    }

    setSelectedAsset({ type, id: assetId });
  };

  // [advice from AI] 자산 타입별 아이콘
  const getAssetIcon = (resultType: string) => {
    switch (resultType) {
      case 'code':
      case 'catalog':
        return <CodeIcon />;
      case 'design':
        return <ImageIcon />;
      case 'document':
        return <DocumentIcon />;
      default:
        return <CategoryIcon />;
    }
  };

  // [advice from AI] 모든 결과를 하나의 배열로 합치기
  const getAllResults = (): SearchResult[] => {
    if (!searchResults) return [];
    
    return [
      ...searchResults.codeComponents,
      ...searchResults.designAssets,
      ...searchResults.documents,
      ...searchResults.catalogComponents
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  // [advice from AI] 탭별 결과 필터링
  const getFilteredResults = (): SearchResult[] => {
    if (!searchResults) return [];
    
    switch (activeTab) {
      case 0: return getAllResults(); // 전체
      case 1: return searchResults.codeComponents; // 코드
      case 2: return searchResults.designAssets; // 디자인
      case 3: return searchResults.documents; // 문서
      case 4: return searchResults.catalogComponents; // 카탈로그
      default: return getAllResults();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, searchType, page]);

  return (
    <Box>
      {/* 검색 입력 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="지식 자산 검색... (예: 승인, 버튼, API, 인증)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>검색 타입</InputLabel>
                <Select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  label="검색 타입"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="code">코드 컴포넌트</MenuItem>
                  <MenuItem value="design">디자인 자산</MenuItem>
                  <MenuItem value="document">문서</MenuItem>
                  <MenuItem value="catalog">카탈로그</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 검색 결과 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {searchResults && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                검색 결과 ({searchResults.totalResults}개)
              </Typography>
              <Chip 
                label={`"${searchTerm}" 검색`} 
                variant="outlined" 
                size="small"
              />
            </Box>

            {/* 결과 타입별 탭 */}
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label={`전체 (${getAllResults().length})`} />
              <Tab label={`코드 (${searchResults.codeComponents.length})`} />
              <Tab label={`디자인 (${searchResults.designAssets.length})`} />
              <Tab label={`문서 (${searchResults.documents.length})`} />
              <Tab label={`카탈로그 (${searchResults.catalogComponents.length})`} />
            </Tabs>

            {/* 검색 결과 목록 */}
            <List>
              {getFilteredResults().map((result, index) => (
                <ListItem key={`${result.result_type}-${result.id}`} divider>
                  <ListItemIcon>
                    {getAssetIcon(result.result_type)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {result.title || result.name}
                        </Typography>
                        <Chip 
                          label={result.type} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={`${result.description} • ${result.file_path} • ${result.creator_name || 'RickySon'} • ${new Date(result.created_at).toLocaleDateString('ko-KR')}`}
                    secondaryTypographyProps={{
                      sx: { 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }
                    }}
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleViewAsset(result.result_type, result.id)}
                      title="상세 보기"
                    >
                      <ViewIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {getFilteredResults().length === 0 && searchTerm && (
              <Alert severity="info" sx={{ mt: 2 }}>
                "{searchTerm}"에 대한 검색 결과가 없습니다.
              </Alert>
            )}

            {/* 페이지네이션 */}
            {searchResults.totalResults > itemsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(searchResults.totalResults / itemsPerPage)}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

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

export default KnowledgeSearch;
