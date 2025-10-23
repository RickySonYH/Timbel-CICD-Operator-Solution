// [advice from AI] 프로덕션 레벨 향상된 네비게이션 컴포넌트
// 접근성, 성능 최적화, 키보드 네비게이션, 검색 기능 포함

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Badge,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Skeleton,
  Alert
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Clear as ClearIcon,
  KeyboardArrowRight,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdvancedPermissions } from '../../hooks/useAdvancedPermissions';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { 
  menuCategories, 
  filterMenusByRole, 
  searchMenuItems, 
  keyboardShortcuts,
  accessibilityConfig,
  performanceConfig,
  MenuItem,
  MenuCategory
} from './MenuConfig';

interface EnhancedNavigationProps {
  onItemClick?: (path: string) => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  onItemClick,
  isMobile = false,
  onMobileClose
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useJwtAuthStore();
  const { 
    hasPermission, 
    hasRole, 
    loading: permissionsLoading 
  } = useAdvancedPermissions();

  // [advice from AI] 상태 관리
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['dashboard']));
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentItems, setRecentItems] = useState<MenuItem[]>([]);

  // [advice from AI] 사용자 역할 및 권한 추출
  const userRoles = useMemo(() => {
    if (!user) return [];
    return Array.isArray(user.roles) ? user.roles : [user.roleType || 'development'];
  }, [user]);

  const userPermissions = useMemo(() => {
    // 실제 권한 시스템에서 가져오거나 기본값 설정
    const basePermissions = ['can_read_knowledge', 'can_access_operations'];
    if (hasRole('admin')) basePermissions.push('can_access_admin', 'can_access_executive');
    if (hasRole('executive')) basePermissions.push('can_access_executive');
    return basePermissions;
  }, [hasRole]);

  // [advice from AI] 필터링된 메뉴 계산 (메모이제이션)
  const filteredMenus = useMemo(() => {
    if (permissionsLoading) return [];
    return filterMenusByRole(menuCategories, userRoles, userPermissions);
  }, [userRoles, userPermissions, permissionsLoading]);

  // [advice from AI] 검색 기능 (디바운스 적용)
  const handleSearch = useCallback(
    debounce((term: string) => {
      if (term.trim()) {
        const results = searchMenuItems(filteredMenus, term);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, performanceConfig.debounceSearch),
    [filteredMenus]
  );

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);

  // [advice from AI] 키보드 네비게이션
  useEffect(() => {
    if (!accessibilityConfig.keyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.key}`;
      
      if (keyboardShortcuts[shortcut]) {
        event.preventDefault();
        const action = keyboardShortcuts[shortcut];
        
        if (action === 'search') {
          // 검색 필드에 포커스
          const searchInput = document.querySelector('[data-testid="menu-search"]') as HTMLInputElement;
          searchInput?.focus();
        } else if (action === 'close-menu' && isMobile) {
          onMobileClose?.();
        } else if (action.startsWith('/')) {
          navigate(action);
          onItemClick?.(action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onItemClick, isMobile, onMobileClose]);

  // [advice from AI] 카테고리 확장/축소
  const handleCategoryToggle = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // [advice from AI] 메뉴 아이템 클릭 처리
  const handleItemClick = (item: MenuItem) => {
    // 최근 방문 목록 업데이트
    setRecentItems(prev => {
      const filtered = prev.filter(recentItem => recentItem.id !== item.id);
      return [item, ...filtered].slice(0, 5);
    });

    navigate(item.path);
    onItemClick?.(item.path);
    
    if (isMobile) {
      onMobileClose?.();
    }
  };

  // [advice from AI] 즐겨찾기 토글
  const handleFavoriteToggle = (itemId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // [advice from AI] 현재 경로 확인
  const isCurrentPath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // [advice from AI] 로딩 상태 처리
  if (permissionsLoading) {
    return (
      <Box sx={{ p: 2 }}>
        {[...Array(5)].map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={40}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  // [advice from AI] 메뉴 렌더링
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* [advice from AI] 검색 영역 */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <TextField
          fullWidth
          size="small"
          placeholder="메뉴 검색... (Ctrl+K)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="menu-search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  aria-label="검색어 지우기"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              '&:hover': {
                backgroundColor: theme.palette.background.paper
              }
            }
          }}
        />
      </Box>

      {/* [advice from AI] 메인 네비게이션 영역 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* 검색 결과 표시 */}
        {searchTerm && searchResults.length > 0 && (
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>
              검색 결과 ({searchResults.length}개)
            </Typography>
            <List dense>
              {searchResults.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleItemClick(item)}
                    selected={isCurrentPath(item.path)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.16)
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {/* 아이콘 렌더링 로직 추가 필요 */}
                      <KeyboardArrowRight fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      secondary={item.description}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
          </Box>
        )}

        {/* 검색어가 있지만 결과가 없는 경우 */}
        {searchTerm && searchResults.length === 0 && (
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ borderRadius: 1 }}>
              '{searchTerm}'에 대한 검색 결과가 없습니다.
            </Alert>
          </Box>
        )}

        {/* 즐겨찾기 섹션 (검색 중이 아닐 때만) */}
        {!searchTerm && favorites.size > 0 && (
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>
              즐겨찾기
            </Typography>
            <List dense>
              {Array.from(favorites).map((favoriteId) => {
                const item = filteredMenus
                  .flatMap(cat => cat.items)
                  .find(item => item.id === favoriteId);
                
                if (!item) return null;
                
                return (
                  <ListItem key={item.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleItemClick(item)}
                      selected={isCurrentPath(item.path)}
                      sx={{ borderRadius: 1, mx: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <StarIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
            <Divider sx={{ my: 1 }} />
          </Box>
        )}

        {/* 메인 메뉴 카테고리 */}
        {!searchTerm && (
          <List sx={{ py: 1 }}>
            {filteredMenus.map((category) => (
              <Box key={category.id}>
                {/* 카테고리 헤더 */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleCategoryToggle(category.id)}
                    sx={{
                      py: 1,
                      px: 2,
                      borderRadius: 1,
                      mx: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {/* 카테고리 아이콘 렌더링 로직 */}
                      <KeyboardArrowRight fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={category.name}
                      primaryTypographyProps={{
                        variant: 'subtitle2',
                        fontWeight: 600,
                        color: 'primary.main'
                      }}
                    />
                    {expandedCategories.has(category.id) ? (
                      <ExpandLess />
                    ) : (
                      <ExpandMore />
                    )}
                  </ListItemButton>
                </ListItem>

                {/* 카테고리 아이템들 */}
                <Collapse
                  in={expandedCategories.has(category.id)}
                  timeout="auto"
                  unmountOnExit
                >
                  <List disablePadding sx={{ pl: 1 }}>
                    {category.items.map((item) => (
                      <ListItem key={item.id} disablePadding>
                        <ListItemButton
                          onClick={() => handleItemClick(item)}
                          selected={isCurrentPath(item.path)}
                          sx={{
                            borderRadius: 1,
                            mx: 1,
                            py: 0.75,
                            ...(item.highlight && {
                              backgroundColor: alpha(theme.palette.warning.main, 0.08),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.warning.main, 0.12)
                              }
                            }),
                            '&.Mui-selected': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.12),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.16)
                              }
                            }
                          }}
                          aria-label={item.ariaLabel}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {/* 아이템 아이콘 렌더링 로직 */}
                            <KeyboardArrowRight fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {item.text}
                                </Typography>
                                {item.badge && (
                                  <Chip
                                    label={item.badge}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ height: 16, fontSize: '0.6rem' }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={item.description}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              sx: { display: { xs: 'none', md: 'block' } }
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFavoriteToggle(item.id);
                            }}
                            aria-label={`${item.text} 즐겨찾기 ${favorites.has(item.id) ? '제거' : '추가'}`}
                          >
                            {favorites.has(item.id) ? (
                              <StarIcon fontSize="small" color="primary" />
                            ) : (
                              <StarBorderIcon fontSize="small" />
                            )}
                          </IconButton>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* [advice from AI] 키보드 단축키 도움말 */}
      {!isMobile && (
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            단축키: Ctrl+K (검색), Alt+H (홈)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// [advice from AI] 디바운스 유틸리티 함수
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default EnhancedNavigation;
