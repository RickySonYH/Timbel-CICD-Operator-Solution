// [advice from AI] 도메인 관리 페이지 - 다른 지식자원들과 동일한 형태로 통일
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Container
} from '@mui/material';
import { 
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import PermissionButton from '../../components/common/PermissionButton';
import { usePermissions } from '../../hooks/usePermissions';
import EmptyState from '../../components/common/EmptyState';

// [advice from AI] 도메인 데이터 타입
interface Domain {
  id: string;
  name: string;
  description: string;
  business_area?: string;
  region?: string;
  contact_person?: string;
  contact_email?: string;
  priority_level?: 'low' | 'medium' | 'high' | 'critical';
  approval_status?: 'pending' | 'approved' | 'rejected';
  owner_group?: string;
  total_systems?: number;
  active_systems?: number;
  created_at: string;
  updated_at: string;
}

const DomainsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    company_type: '',
    industry: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: ''
  });

  // [advice from AI] API URL 생성
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/knowledge/domains`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains || []);
      } else {
        // API가 없거나 실패할 경우 빈 배열로 설정
        setDomains([]);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // [advice from AI] 필터링된 도메인 목록
  const filteredDomains = domains.filter(domain => {
    const matchesSearch = domain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         domain.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || domain.approval_status === filterStatus;
    const matchesPriority = filterPriority === 'all' || domain.priority_level === filterPriority;
    const matchesRegion = filterRegion === 'all' || domain.region === filterRegion;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesRegion;
  });

  // [advice from AI] 도메인 생성
  const handleCreateDomain = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/knowledge/domains`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setCreateDialog(false);
        setFormData({
          name: '',
          description: '',
          company_type: '',
          industry: '',
          contact_person: '',
          contact_email: '',
          contact_phone: '',
          address: ''
        });
        loadData();
      }
    } catch (error) {
      console.error('도메인 생성 실패:', error);
    }
  };

  // [advice from AI] 도메인 편집
  const handleEditDomain = async () => {
    if (!selectedDomain) return;
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/knowledge/domains/${selectedDomain.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setEditDialog(false);
        setSelectedDomain(null);
        loadData();
      }
    } catch (error) {
      console.error('도메인 편집 실패:', error);
    }
  };

  // [advice from AI] 도메인 삭제
  const handleDeleteDomain = async (domainId: string) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/knowledge/domains/${domainId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('도메인 삭제 실패:', error);
    }
  };

  // [advice from AI] 편집 다이얼로그 열기
  const handleOpenEditDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setFormData({
      name: domain.name,
      description: domain.description || '',
      company_type: domain.company_type || '',
      industry: domain.industry || '',
      contact_person: domain.contact_person || '',
      contact_email: domain.contact_email || '',
      contact_phone: domain.contact_phone || '',
      address: domain.address || ''
    });
    setEditDialog(true);
  };

  // [advice from AI] 지역 옵션 (실제 데이터에서 추출)
  const regions = [...new Set(domains.map(domain => domain.region).filter(Boolean))];

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          도메인 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          비즈니스 도메인별로 지식 자산을 체계적으로 관리합니다. 각 도메인은 영업처 개념으로 비즈니스 영역을 구분합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="도메인 검색"
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>승인 상태</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="승인 상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="pending">대기중</MenuItem>
                  <MenuItem value="approved">승인됨</MenuItem>
                  <MenuItem value="rejected">거부됨</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  label="우선순위"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="critical">긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>지역</InputLabel>
                <Select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  label="지역"
                >
                  <MenuItem value="all">전체</MenuItem>
                  {regions.map((region) => (
                    <MenuItem key={region} value={region}>{region}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <PermissionButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog(true)}
                permissions={['can_manage_domains']}
                noPermissionTooltip="도메인 관리 권한이 필요합니다"
                hideIfNoPermission={true}
                fullWidth
              >
                새 도메인
              </PermissionButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 도메인 목록 */}
      {filteredDomains.length === 0 ? (
        domains.length === 0 ? (
          <EmptyState
            title="등록된 도메인이 없습니다"
            description="아직 등록된 도메인이 없습니다. 새로운 도메인을 등록하여 비즈니스 영역을 구분해보세요."
            actionText="도메인 등록하기"
            actionPath="/knowledge/domains"
            secondaryActionText="프로젝트 먼저 만들기"
            secondaryActionPath="/knowledge/projects"
          />
        ) : (
          <Alert severity="info" sx={{ textAlign: 'center', py: 3 }}>
            검색 조건에 맞는 도메인이 없습니다. 다른 검색어를 시도해보세요.
          </Alert>
        )
      ) : (
        <Grid container spacing={3}>
          {filteredDomains.map((domain) => (
            <Grid item xs={12} sm={6} md={4} key={domain.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {domain.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {domain.company_type || '회사 유형 미정'} • {domain.industry || '산업 분야 미정'}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        setSelectedDomain(domain);
                        setViewDialog(true);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {domain.description || '도메인 개요가 없습니다.'}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      담당자: {domain.contact_person || '미정'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      이메일: {domain.contact_email || '미정'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      전화번호: {domain.contact_phone || '미정'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    <Chip 
                      label={domain.is_active ? '활성' : '비활성'}
                      size="small"
                      color={domain.is_active ? 'success' : 'default'}
                    />
                    <Chip 
                      label={domain.company_type || '회사 유형 미정'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {domain.industry || '산업 분야 미정'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(domain.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      setSelectedDomain(domain);
                      setViewDialog(true);
                    }}
                    sx={{ 
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    상세보기
                  </Button>
                  
                  {permissions.canManageDomains && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="도메인 편집">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditDialog(domain)}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'primary.50'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="도메인 삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm('이 도메인을 삭제하시겠습니까?')) {
                              handleDeleteDomain(domain.id);
                            }
                          }}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'error.50'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 도메인 생성 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">새 도메인 등록</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* 기본 정보 섹션 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2, color: 'primary.main' }}>
              📋 기본 정보
            </Typography>
            <TextField
              fullWidth
              label="도메인명"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              margin="normal"
              required
              helperText="도메인의 고유한 이름을 입력하세요"
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
              required
              helperText="도메인의 목적과 역할을 설명하세요"
            />
            
            {/* 회사 정보 섹션 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
              🏢 회사 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="회사 유형"
                  value={formData.company_type}
                  onChange={(e) => setFormData({...formData, company_type: e.target.value})}
                  margin="normal"
                  helperText="예: 대기업, 중소기업, 스타트업"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="산업 분야"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  margin="normal"
                  helperText="예: IT, 금융, 제조업, 서비스업"
                />
              </Grid>
            </Grid>
            
            {/* 연락처 정보 섹션 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
              📞 연락처 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="담당자명"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  margin="normal"
                  helperText="도메인 담당자 이름"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="담당자 이메일"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  margin="normal"
                  type="email"
                  helperText="담당자 이메일 주소"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="담당자 전화번호"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  margin="normal"
                  helperText="예: 010-1234-5678"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="회사 주소"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  margin="normal"
                  multiline
                  rows={2}
                  helperText="회사 또는 사업장 주소"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCreateDialog(false)} size="large">
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateDomain} 
            size="large"
            disabled={!formData.name || !formData.description}
          >
            도메인 등록
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 도메인 편집 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">도메인 편집</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* 기본 정보 섹션 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2, color: 'primary.main' }}>
              📋 기본 정보
            </Typography>
            <TextField
              fullWidth
              label="도메인명"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              margin="normal"
              required
              helperText="도메인의 고유한 이름을 입력하세요"
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
              required
              helperText="도메인의 목적과 역할을 설명하세요"
            />
            
            {/* 회사 정보 섹션 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
              🏢 회사 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="회사 유형"
                  value={formData.company_type}
                  onChange={(e) => setFormData({...formData, company_type: e.target.value})}
                  margin="normal"
                  helperText="예: 대기업, 중소기업, 스타트업"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="산업 분야"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  margin="normal"
                  helperText="예: IT, 금융, 제조업, 서비스업"
                />
              </Grid>
            </Grid>
            
            {/* 연락처 정보 섹션 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
              📞 연락처 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="담당자명"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  margin="normal"
                  helperText="도메인 담당자 이름"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="담당자 이메일"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  margin="normal"
                  type="email"
                  helperText="담당자 이메일 주소"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="담당자 전화번호"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  margin="normal"
                  helperText="예: 010-1234-5678"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="회사 주소"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  margin="normal"
                  multiline
                  rows={2}
                  helperText="회사 또는 사업장 주소"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialog(false)} size="large">
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleEditDomain} 
            size="large"
            disabled={!formData.name || !formData.description}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 도메인 상세보기 다이얼로그 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">도메인 상세 정보</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDomain && (
            <Box sx={{ mt: 2 }}>
              {/* 기본 정보 섹션 */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2, color: 'primary.main' }}>
                📋 기본 정보
              </Typography>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {selectedDomain.name}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                  {selectedDomain.description || '설명이 없습니다.'}
                </Typography>
              </Box>
              
              {/* 회사 정보 섹션 */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
                🏢 회사 정보
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      회사 유형
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {selectedDomain.company_type || '미정'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      산업 분야
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {selectedDomain.industry || '미정'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* 연락처 정보 섹션 */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
                📞 연락처 정보
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      담당자
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {selectedDomain.contact_person || '미정'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      이메일
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {selectedDomain.contact_email || '미정'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      전화번호
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {selectedDomain.contact_phone || '미정'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      주소
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {selectedDomain.address || '미정'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {/* 상태 정보 섹션 */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
                📊 상태 정보
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      활성 상태
                    </Typography>
                    <Chip 
                      label={selectedDomain.is_active ? '활성' : '비활성'}
                      color={selectedDomain.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      생성일
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {new Date(selectedDomain.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      수정일
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {new Date(selectedDomain.updated_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setViewDialog(false)} size="large">
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 관련 안내 */}
      {!permissions.canManageDomains && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          도메인 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Container>
  );
};

export default DomainsPage;