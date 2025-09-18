// [advice from AI] 승인된 자산 관리 페이지 - 카탈로그 뷰와 대기 뷰 분리

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Tabs, Tab, Paper, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Category as CategoryIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface ApprovedAsset {
  id: string;
  name: string;
  type: 'code' | 'design' | 'document' | 'catalog';
  description: string;
  systemName: string;
  status: 'approved' | 'processing' | 'registered';
  approvedAt: string;
  approvedBy: string;
  registeredAt?: string;
  path: string;
  metadata: any;
}

const ApprovedAssetsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useJwtAuthStore();
  
  const [approvedAssets, setApprovedAssets] = useState<ApprovedAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<ApprovedAsset[]>([]);
  const [activeTab, setActiveTab] = useState(0); // 0: 카탈로그 뷰, 1: 대기 뷰
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [systemFilter, setSystemFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] 승인된 자산 목록 로드
  useEffect(() => {
    const fetchApprovedAssets = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await fetch('/api/approvals/approved-assets', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('승인된 자산 목록을 불러올 수 없습니다');
        }

        const data = await response.json();
        console.log('승인된 자산 데이터:', data);
        
        if (data.success) {
          // [advice from AI] 백엔드 응답 구조에 맞게 데이터 매핑
          const assets = data.data.assets.map(asset => ({
            id: asset.id,
            name: asset.name,
            type: asset.asset_type,
            description: asset.description?.substring(0, 200) || '',
            systemName: 'Unknown System', // 시스템 정보는 별도 조회 필요
            status: 'registered', // 승인된 자산은 등록된 것으로 간주
            approvedAt: asset.updated_at,
            approvedBy: asset.created_by_name || 'System',
            registeredAt: asset.created_at,
            path: asset.file_path || '',
            metadata: {
              language: asset.language,
              complexity_score: asset.complexity_score,
              line_count: asset.line_count,
              file_size: asset.line_count // line_count를 file_size로 사용
            }
          }));
          
          setApprovedAssets(assets);
        } else {
          throw new Error(data.message || '데이터 로드 실패');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedAssets();
  }, [token]);

  // [advice from AI] 필터링 적용
  useEffect(() => {
    let filtered = approvedAssets;

    // 탭별 필터링
    if (activeTab === 0) {
      // 카탈로그 뷰: 정식 등록된 자산들
      filtered = filtered.filter(asset => asset.status === 'registered');
    } else {
      // 대기 뷰: 승인되었지만 아직 처리 중인 자산들
      filtered = filtered.filter(asset => asset.status === 'approved' || asset.status === 'processing');
    }

    // 검색 필터
    if (searchTerm.trim()) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.systemName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 타입 필터
    if (typeFilter !== 'all') {
      filtered = filtered.filter(asset => asset.type === typeFilter);
    }

    // 시스템 필터
    if (systemFilter !== 'all') {
      filtered = filtered.filter(asset => asset.systemName === systemFilter);
    }

    setFilteredAssets(filtered);
  }, [approvedAssets, activeTab, searchTerm, typeFilter, systemFilter]);

  // [advice from AI] 고유 시스템 목록
  const uniqueSystems = [...new Set(approvedAssets.map(asset => asset.systemName))];

  // [advice from AI] 자산 타입별 아이콘
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'code': return <CodeIcon color="primary" />;
      case 'design': return <ImageIcon color="secondary" />;
      case 'document': return <DocumentIcon color="info" />;
      case 'catalog': return <CategoryIcon color="success" />;
      default: return <CategoryIcon />;
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered': return 'success';
      case 'processing': return 'warning';
      case 'approved': return 'info';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          ✅ 승인된 자산 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          승인된 지식 자산들을 카탈로그 등록 상태별로 관리합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 뷰 선택 탭 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab 
            icon={<ApprovedIcon />} 
            label={`카탈로그 뷰 (${approvedAssets.filter(a => a.status === 'registered').length})`}
          />
          <Tab 
            icon={<PendingIcon />} 
            label={`대기 뷰 (${approvedAssets.filter(a => a.status !== 'registered').length})`}
          />
        </Tabs>
      </Paper>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="자산 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>타입</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="타입"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="code">코드</MenuItem>
                  <MenuItem value="design">디자인</MenuItem>
                  <MenuItem value="document">문서</MenuItem>
                  <MenuItem value="catalog">카탈로그</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>시스템</InputLabel>
                <Select
                  value={systemFilter}
                  onChange={(e) => setSystemFilter(e.target.value)}
                  label="시스템"
                >
                  <MenuItem value="all">전체</MenuItem>
                  {uniqueSystems.map((system) => (
                    <MenuItem key={system} value={system}>{system}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                총 {filteredAssets.length}개 자산
              </Typography>
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

      {/* [advice from AI] 자산 목록 테이블 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>자산</TableCell>
              <TableCell>시스템</TableCell>
              <TableCell>타입</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>승인일</TableCell>
              <TableCell>등록일</TableCell>
              <TableCell align="right">액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {activeTab === 0 ? '등록된 자산이 없습니다.' : '처리 대기 중인 자산이 없습니다.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getAssetIcon(asset.type)}
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {asset.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {asset.description}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{asset.systemName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={asset.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={asset.status} 
                      size="small" 
                      color={getStatusColor(asset.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(asset.approvedAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {asset.approvedBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {asset.registeredAt 
                        ? new Date(asset.registeredAt).toLocaleDateString()
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => navigate(`/knowledge/${asset.type}/${asset.id}`)}
                    >
                      상세보기
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default ApprovedAssetsManagement;
