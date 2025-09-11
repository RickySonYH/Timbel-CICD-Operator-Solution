// [advice from AI] 백스테이지IO 스타일의 검색바 컴포넌트
// 지식 자원을 검색할 수 있는 메인 검색 인터페이스

import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showFilters?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "지식 자원을 검색하세요...",
  showFilters = true,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches] = useState([
    'React 컴포넌트',
    'API 설계',
    '데이터베이스 최적화',
    '보안 가이드',
  ]);

  const handleSearch = (query: string) => {
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      handleSearch(searchQuery.trim());
    }
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      {/* [advice from AI] 메인 검색 입력 필드 */}
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          '&:focus-within': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        <TextField
          fullWidth
          variant="standard"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              fontSize: '1.1rem',
              '& input': {
                padding: '8px 0',
              },
            },
          }}
        />
        {showFilters && (
          <IconButton
            size="small"
            sx={{
              ml: 1,
              color: theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.primary.main,
              },
            }}
          >
            <FilterIcon />
          </IconButton>
        )}
      </Paper>

      {/* [advice from AI] 최근 검색어 표시 */}
      {!searchQuery && recentSearches.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontSize: '0.875rem' }}
          >
            최근 검색어
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {recentSearches.map((search, index) => (
              <Chip
                key={index}
                label={search}
                size="small"
                variant="outlined"
                onClick={() => handleRecentSearch(search)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.light + '20',
                    borderColor: theme.palette.primary.main,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* [advice from AI] 검색 제안 표시 */}
      {searchQuery && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontSize: '0.875rem' }}
          >
            검색 제안
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {recentSearches
              .filter(search => 
                search.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((search, index) => (
                <Chip
                  key={index}
                  label={search}
                  size="small"
                  variant="outlined"
                  onClick={() => handleRecentSearch(search)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.light + '20',
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                />
              ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SearchBar;
