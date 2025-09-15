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
  InputAdornment,
  Tabs,
  Tab,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  Palette as PaletteIcon,
  AccountTree as DiagramIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface KnowledgeItem {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'code' | 'design' | 'diagram';
  category: string;
  tags: string[];
  author: string;
  author_id: string;
  view_count: number;
  like_count: number;
  bookmark_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  is_featured: boolean;
  rating: number;
  file_size?: number;
  file_type?: string;
}

interface SearchFilters {
  type: string;
  category: string;
  tags: string[];
  dateRange: string;
  author: string;
  rating: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const KnowledgeSearchManagement: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [tabValue, setTabValue] = useState(0);

  // [advice from AI] 검색 필터 상태
  const [filters, setFilters] = useState<SearchFilters>({
    type: '',
    category: '',
    tags: [],
    dateRange: '',
    author: '',
    rating: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // [advice from AI] 타입별 아이콘 매핑
  const typeIcons = {
    document: <DescriptionIcon />,
    code: <CodeIcon />,
    design: <PaletteIcon />,
    diagram: <DiagramIcon />
  };

  // [advice from AI] 타입별 한글 텍스트
  const typeLabels = {
    document: '문서',
    code: '코드',
    design: '디자인',
    diagram: '다이어그램'
  };

  // [advice from AI] 지식 자원 검색 (임시 데이터 사용)
  const searchKnowledge = async () => {
    try {
      setLoading(true);
      
      // [advice from AI] 임시 데이터로 검색 결과 시뮬레이션
      const mockData: KnowledgeItem[] = [
        {
          id: '1',
          title: 'React 컴포넌트 가이드',
          description: 'React 컴포넌트를 작성하고 관리하는 방법에 대한 상세 가이드입니다.',
          type: 'document',
          category: 'Tutorial',
          tags: ['react', 'component', 'guide'],
          author: '김개발',
          author_id: 'user1',
          view_count: 1250,
          like_count: 45,
          bookmark_count: 23,
          download_count: 156,
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-20T14:20:00Z',
          is_public: true,
          is_featured: true,
          rating: 4.5,
          file_size: 1024000,
          file_type: 'pdf'
        },
        {
          id: '2',
          title: 'Button 컴포넌트',
          description: '재사용 가능한 Button 컴포넌트입니다. 다양한 스타일과 크기를 지원합니다.',
          type: 'code',
          category: 'Component',
          tags: ['button', 'component', 'ui'],
          author: '박프론트',
          author_id: 'user2',
          view_count: 890,
          like_count: 32,
          bookmark_count: 18,
          download_count: 67,
          created_at: '2024-01-18T09:15:00Z',
          updated_at: '2024-01-22T11:45:00Z',
          is_public: true,
          is_featured: false,
          rating: 4.2,
          file_size: 512000,
          file_type: 'tsx'
        },
        {
          id: '3',
          title: 'UI 디자인 시스템',
          description: '일관된 UI/UX를 위한 디자인 시스템 가이드입니다.',
          type: 'design',
          category: 'Design System',
          tags: ['design', 'ui', 'system'],
          author: '이디자인',
          author_id: 'user3',
          view_count: 2100,
          like_count: 78,
          bookmark_count: 45,
          download_count: 234,
          created_at: '2024-01-10T16:20:00Z',
          updated_at: '2024-01-25T13:30:00Z',
          is_public: true,
          is_featured: true,
          rating: 4.8,
          file_size: 2048000,
          file_type: 'figma'
        }
      ];

      // [advice from AI] 검색어 필터링
      let filteredData = mockData;
      if (searchTerm) {
        filteredData = filteredData.filter(item =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // [advice from AI] 타입 필터링
      if (filters.type) {
        filteredData = filteredData.filter(item => item.type === filters.type);
      }

      // [advice from AI] 카테고리 필터링
      if (filters.category) {
        filteredData = filteredData.filter(item => item.category === filters.category);
      }

      // [advice from AI] 정렬
      filteredData.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof KnowledgeItem];
        const bValue = b[filters.sortBy as keyof KnowledgeItem];
        
        if (filters.sortOrder === 'asc') {
          return (aValue ?? '') > (bValue ?? '') ? 1 : -1;
        } else {
          return (aValue ?? '') < (bValue ?? '') ? 1 : -1;
        }
      });

      setKnowledgeItems(filteredData);
    } catch (error) {
      console.error('지식 검색 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 즐겨찾기 토글
  const toggleBookmark = async (itemId: string) => {
    try {
      const isBookmarked = bookmarkedItems.has(itemId);
      const newBookmarks = new Set(bookmarkedItems);
      if (isBookmarked) {
        newBookmarks.delete(itemId);
      } else {
        newBookmarks.add(itemId);
      }
      setBookmarkedItems(newBookmarks);
    } catch (error) {
      console.error('즐겨찾기 토글 오류:', error);
    }
  };

  // [advice from AI] 좋아요 토글
  const toggleLike = async (itemId: string) => {
    try {
      const isLiked = likedItems.has(itemId);
      const newLikes = new Set(likedItems);
      if (isLiked) {
        newLikes.delete(itemId);
      } else {
        newLikes.add(itemId);
      }
      setLikedItems(newLikes);
    } catch (error) {
      console.error('좋아요 토글 오류:', error);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 초기 검색
  useEffect(() => {
    searchKnowledge();
  }, []);

  // [advice from AI] 검색어 변경 시 자동 검색 (디바운스)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        searchKnowledge();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters]);

  // [advice from AI] 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}주 전`;
    return date.toLocaleDateString();
  };

  // [advice from AI] 별점 렌더링
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <StarIcon
        key={index}
        fontSize="small"
        sx={{ color: index < rating ? 'gold' : 'grey.300' }}
      />
    ));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          🔍 지식 검색 및 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            필터
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={searchKnowledge}
            disabled={loading}
          >
            새로고침
          </Button>
        </Box>
      </Box>

      {/* [advice from AI] 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 검색 바 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="지식 자원 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>타입</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  label="타입"
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="document">문서</MenuItem>
                  <MenuItem value="code">코드</MenuItem>
                  <MenuItem value="design">디자인</MenuItem>
                  <MenuItem value="diagram">다이어그램</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>정렬</InputLabel>
                <Select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  label="정렬"
                >
                  <MenuItem value="created_at">최신순</MenuItem>
                  <MenuItem value="view_count">조회수순</MenuItem>
                  <MenuItem value="like_count">좋아요순</MenuItem>
                  <MenuItem value="rating">평점순</MenuItem>
                  <MenuItem value="title">제목순</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                onClick={searchKnowledge}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                fullWidth
              >
                검색
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 고급 필터 */}
      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              고급 필터
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    label="카테고리"
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="Tutorial">튜토리얼</MenuItem>
                    <MenuItem value="Component">컴포넌트</MenuItem>
                    <MenuItem value="Design System">디자인 시스템</MenuItem>
                    <MenuItem value="API Documentation">API 문서</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>평점</InputLabel>
                  <Select
                    value={filters.rating}
                    onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                    label="평점"
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="5">5점</MenuItem>
                    <MenuItem value="4">4점 이상</MenuItem>
                    <MenuItem value="3">3점 이상</MenuItem>
                    <MenuItem value="2">2점 이상</MenuItem>
                    <MenuItem value="1">1점 이상</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>기간</InputLabel>
                  <Select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    label="기간"
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="1d">최근 1일</MenuItem>
                    <MenuItem value="1w">최근 1주</MenuItem>
                    <MenuItem value="1m">최근 1개월</MenuItem>
                    <MenuItem value="3m">최근 3개월</MenuItem>
                    <MenuItem value="1y">최근 1년</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>정렬 순서</InputLabel>
                  <Select
                    value={filters.sortOrder}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                    label="정렬 순서"
                  >
                    <MenuItem value="desc">내림차순</MenuItem>
                    <MenuItem value="asc">오름차순</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* [advice from AI] 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="전체" />
          <Tab label="즐겨찾기" />
          <Tab label="인기" />
          <Tab label="최신" />
        </Tabs>
      </Paper>

      {/* [advice from AI] 검색 결과 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {knowledgeItems.map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* [advice from AI] 즐겨찾기 버튼 */}
                <IconButton
                  sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                  onClick={() => toggleBookmark(item.id)}
                  size="small"
                >
                  {bookmarkedItems.has(item.id) ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
                </IconButton>

                <CardContent sx={{ flexGrow: 1 }}>
                  {/* [advice from AI] 아이템 헤더 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {typeIcons[item.type]}
                    <Chip
                      label={typeLabels[item.type]}
                      size="small"
                      sx={{ ml: 1, mr: 1 }}
                    />
                    <Box sx={{ flexGrow: 1 }} />
                    {item.is_featured && (
                      <Chip
                        label="추천"
                        size="small"
                        color="secondary"
                        icon={<StarIcon />}
                      />
                    )}
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
                      setSelectedItem(item);
                      setShowDetailDialog(true);
                    }}
                  >
                    {item.title}
                  </Typography>

                  {/* [advice from AI] 설명 */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {item.description}
                  </Typography>

                  {/* [advice from AI] 태그 */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {item.tags.slice(0, 3).map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                    {item.tags.length > 3 && (
                      <Chip label={`+${item.tags.length - 3}`} size="small" variant="outlined" />
                    )}
                  </Box>

                  {/* [advice from AI] 메타 정보 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.author} • {formatDate(item.created_at)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {renderStars(item.rating)}
                    </Box>
                  </Box>

                  {/* [advice from AI] 통계 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Tooltip title="조회수">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ViewIcon fontSize="small" />
                          <Typography variant="caption">{item.view_count}</Typography>
                        </Box>
                      </Tooltip>
                      <Tooltip title="좋아요">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ThumbUpIcon fontSize="small" />
                          <Typography variant="caption">{item.like_count}</Typography>
                        </Box>
                      </Tooltip>
                      <Tooltip title="다운로드">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DownloadIcon fontSize="small" />
                          <Typography variant="caption">{item.download_count}</Typography>
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* [advice from AI] 액션 버튼 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => toggleLike(item.id)}
                        color={likedItems.has(item.id) ? 'primary' : 'default'}
                      >
                        <ThumbUpIcon />
                      </IconButton>
                      <IconButton size="small">
                        <ShareIcon />
                      </IconButton>
                      <IconButton size="small">
                        <CopyIcon />
                      </IconButton>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowDetailDialog(true);
                      }}
                    >
                      자세히
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 검색 결과가 없을 때 */}
      {!loading && knowledgeItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            검색 결과가 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary">
            다른 검색어나 필터를 시도해보세요
          </Typography>
        </Box>
      )}

      {/* [advice from AI] 상세 보기 다이얼로그 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedItem?.title}
            </Typography>
            <IconButton onClick={() => setShowDetailDialog(false)}>
              <ClearIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedItem.description}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>작성자</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedItem.author}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>생성일</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(selectedItem.created_at).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>타입</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {typeLabels[selectedItem.type]}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>평점</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {renderStars(selectedItem.rating)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      ({selectedItem.rating}/5)
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>태그</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {selectedItem.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" />
                ))}
              </Box>

              <Typography variant="subtitle2" gutterBottom>통계</Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{selectedItem.view_count}</Typography>
                    <Typography variant="caption" color="text.secondary">조회수</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{selectedItem.like_count}</Typography>
                    <Typography variant="caption" color="text.secondary">좋아요</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{selectedItem.bookmark_count}</Typography>
                    <Typography variant="caption" color="text.secondary">즐겨찾기</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{selectedItem.download_count}</Typography>
                    <Typography variant="caption" color="text.secondary">다운로드</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>닫기</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            다운로드
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KnowledgeSearchManagement;
