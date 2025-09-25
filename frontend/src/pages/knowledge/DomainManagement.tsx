// [advice from AI] 도메인 관리 페이지 - 비즈니스 도메인별 지식 자산 관리

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Avatar, Divider, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, Paper
} from '@mui/material';
import {
  Domain as DomainIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  AccountTree as TreeIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useRoleBasedVisibility } from '../../hooks/usePermissions';

interface DomainInfo {
  id: string;
  name: string;
  title?: string;
  description: string;
  business_area?: string;
  region?: string;
  contact_person?: string;
  contact_email?: string;
  priority_level?: string;
  approval_status?: string;
  owner_group?: string;
  created_at: string;
  updated_at: string;
  total_systems?: number;
  active_systems?: number;
  current_systems_count?: number;
  created_by_name?: string;
  systemCount?: number;
  componentCount?: number;
}

const DomainManagement: React.FC = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated, user } = useJwtAuthStore();
  const { permissions, showManageButtons, getUserRoleDisplay } = useRoleBasedVisibility();
  
  // [advice from AI] 컴포넌트 마운트 시 인증 상태 로깅
  useEffect(() => {
    console.log('🎯 DomainManagement 마운트됨');
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user:', user);
    console.log('  - token 존재:', !!token);
    console.log('  - localStorage 확인:', localStorage.getItem('jwt-auth-storage'));
  }, []);
  
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [filteredDomains, setFilteredDomains] = useState<DomainInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // [advice from AI] 동적 API URL 결정 로직
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    console.log('🌐 현재 호스트:', currentHost);
    
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      console.log('🏠 로컬 환경 - 직접 백엔드 포트 사용');
      return 'http://localhost:3001';
    } else {
      console.log('🌍 외부 환경 - 포트 3001 사용');
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };
  const [regionFilter, setRegionFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DomainInfo | null>(null);
  const [newDomain, setNewDomain] = useState({
    name: '',
    description: '',
    business_area: '',
    region: '',
    contact_person: '',
    contact_email: '',
    priority_level: 'medium'
  });
  const [editDomain, setEditDomain] = useState({
    name: '',
    description: '',
    business_area: '',
    region: '',
    contact_person: '',
    contact_email: '',
    priority_level: 'medium'
  });

  // [advice from AI] 도메인 목록 로드
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        
        // [advice from AI] 상세 디버깅 정보 추가
        console.log('🚀 DomainManagement 컴포넌트 상태:');
        console.log('  - token 존재:', !!token);
        console.log('  - token 길이:', token?.length || 0);
        console.log('  - token 앞부분:', token?.substring(0, 50) + '...' || 'null');
        
        if (!token) {
          console.log('❌ 토큰 없음 - 오류 설정');
          setError('인증 토큰이 없습니다. 다시 로그인해주세요.');
          return;
        }

         console.log('🔄 도메인 목록 요청 시작...'); // [advice from AI] 디버깅용 로그
         const apiUrl = getApiUrl();
         const fullUrl = `${apiUrl}/api/domains`;
         console.log('  - 요청 URL:', fullUrl);
         console.log('  - 요청 헤더:', { 'Authorization': `Bearer ${token.substring(0, 20)}...` });
         
         const response = await fetch(fullUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('📡 API 응답 상태:', response.status); // [advice from AI] 디버깅용 로그
        console.log('📡 API 응답 헤더:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.log('❌ 응답 오류 내용:', errorText);
          throw new Error(`도메인 목록을 불러올 수 없습니다 (상태: ${response.status})`);
        }

        const result = await response.json();
        console.log('📊 받은 데이터:', result); // [advice from AI] 디버깅용 로그
        console.log('📊 데이터 타입:', typeof result);
        console.log('📊 success 필드:', result.success);
        console.log('📊 data 필드:', result.data);
        console.log('📊 data 배열 길이:', Array.isArray(result.data) ? result.data.length : 'not array');
        
        const domainsData = result.success ? result.data : [];
        setDomains(domainsData || []);
        setFilteredDomains(domainsData || []); // 초기에는 모든 데이터 표시
        
        console.log('✅ 도메인 데이터 설정 완료:', domainsData?.length || 0, '개'); // [advice from AI] 디버깅용 로그
      } catch (err) {
        console.error('❌ 도메인 로딩 오류:', err); // [advice from AI] 디버깅용 로그
        console.error('❌ 오류 스택:', err instanceof Error ? err.stack : 'No stack');
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
        console.log('🏁 로딩 상태 해제'); // [advice from AI] 디버깅용 로그
      }
    };

    console.log('🔄 useEffect 실행됨 - token 변경:', !!token);
    fetchDomains();
  }, [token]);

  // [advice from AI] 도메인 필터링 로직
  useEffect(() => {
    let filtered = domains.filter(domain => {
      const matchesSearch = !searchTerm || 
        domain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        domain.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        domain.business_area?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRegion = !regionFilter || domain.region === regionFilter;
      const matchesPriority = !priorityFilter || domain.priority_level === priorityFilter;
      
      return matchesSearch && matchesRegion && matchesPriority;
    });

    setFilteredDomains(filtered);
  }, [domains, searchTerm, regionFilter, priorityFilter]);

  // [advice from AI] 새 도메인 생성
  const handleCreateDomain = async () => {
    try {
       const response = await fetch(`${getApiUrl()}/api/domains`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDomain)
      });

      if (!response.ok) {
        throw new Error('도메인 생성에 실패했습니다');
      }

      // 목록 새로고침 및 다이얼로그 닫기
      setCreateDialog(false);
      setNewDomain({
        name: '',
        description: '',
        business_area: '',
        region: '',
        contact_person: '',
        contact_email: '',
        priority_level: 'medium'
      });
       // 도메인 목록 다시 로드
       const response2 = await fetch('/api/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response2.ok) {
        const result2 = await response2.json();
        const domainsData = result2.success ? result2.data : [];
        setDomains(domainsData || []);
        setFilteredDomains(domainsData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '도메인 생성 중 오류가 발생했습니다');
    }
  };

  // [advice from AI] 도메인 상세 보기 - 연관 데이터 포함
  const handleViewDomain = async (domain: DomainInfo) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/domains/${domain.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSelectedDomain(result.data); // 연관 데이터가 포함된 상세 정보
        } else {
          setSelectedDomain(domain); // 실패 시 기본 정보
        }
      } else {
        setSelectedDomain(domain); // 실패 시 기본 정보
      }
    } catch (error) {
      console.error('도메인 상세 정보 로드 실패:', error);
      setSelectedDomain(domain); // 실패 시 기본 정보
    }
    
    setDetailDialog(true);
  };

  // [advice from AI] 도메인 수정 시작
  const handleEditDomain = (domain: DomainInfo) => {
    setSelectedDomain(domain);
    setEditDomain({
      name: domain.name,
      description: domain.description,
      business_area: domain.business_area || '',
      region: domain.region || '',
      contact_person: domain.contact_person || '',
      contact_email: domain.contact_email || '',
      priority_level: domain.priority_level || 'medium'
    });
    setEditDialog(true);
  };

  // [advice from AI] 도메인 수정 저장
  const handleUpdateDomain = async () => {
    if (!selectedDomain) return;
    
    try {
      const response = await fetch(`${getApiUrl()}/api/domains/${selectedDomain.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editDomain)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`도메인 수정에 실패했습니다 (상태: ${response.status})`);
      }

      const result = await response.json();
      if (result.success) {
        // 목록 새로고침
        const response2 = await fetch(`${getApiUrl()}/api/domains`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response2.ok) {
          const result2 = await response2.json();
          const domainsData = result2.success ? result2.data : [];
          setDomains(domainsData || []);
          setFilteredDomains(domainsData || []);
        }
        
        setEditDialog(false);
        setSelectedDomain(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '도메인 수정 중 오류가 발생했습니다');
    }
  };

  // [advice from AI] 도메인 삭제
  const handleDeleteDomain = async () => {
    if (!selectedDomain) return;
    
    if (!window.confirm(`"${selectedDomain.name}" 도메인을 정말 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${getApiUrl()}/api/domains/${selectedDomain.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        // [advice from AI] 연결된 시스템이 있는 경우 상세 정보와 함께 강제 삭제 옵션 제공
        if (response.status === 400 && result.canForceDelete && result.connectedSystems) {
          const systemsList = result.connectedSystems.map(sys => 
            `• ${sys.name} (${sys.version || 'v1.0'}) - ${sys.description || '설명 없음'}`
          ).join('\n');
          
          const confirmMessage = `${result.message}\n\n📋 연결된 시스템 목록 (${result.systemCount}개):\n${systemsList}\n\n⚠️ 강제 삭제 시 위 시스템들의 도메인 연결이 해제됩니다.\n\n정말로 강제 삭제하시겠습니까?`;
          
          const confirmForce = window.confirm(confirmMessage);
          
          if (confirmForce) {
            return handleDeleteDomain(true); // 강제 삭제 재시도
          }
          return;
        }
        
        throw new Error(result.message || `도메인 삭제에 실패했습니다 (상태: ${response.status})`);
      }
      if (result.success) {
        // 목록 새로고침
        const response2 = await fetch(`${getApiUrl()}/api/domains`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response2.ok) {
          const result2 = await response2.json();
          const domainsData = result2.success ? result2.data : [];
          setDomains(domainsData || []);
          setFilteredDomains(domainsData || []);
        }
        
        setDetailDialog(false);
        setSelectedDomain(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '도메인 삭제 중 오류가 발생했습니다');
    }
  };

  return (
    <>
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          도메인 (영업처) 카탈로그
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            비즈니스 도메인별로 지식 자산을 체계적으로 관리합니다.
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
            현재 권한: {getUserRoleDisplay()} | 총 {domains.length}개 도메인
          </Typography>
        </Box>
      </Box>

      {/* 액션 버튼 - 권한 기반 표시 */}
      {showManageButtons && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            새 도메인 추가
          </Button>
        </Box>
      )}
      
      {/* 권한 없는 사용자를 위한 안내 */}
      {!showManageButtons && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            현재 권한으로는 도메인 카탈로그 조회만 가능합니다. 등록이나 수정이 필요한 경우 관리자에게 문의하세요.
          </Alert>
        </Box>
      )}

      {/* 에러 표시 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 도메인 목록 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
      <Grid container spacing={3}>
        {filteredDomains.map((domain) => (
            <Grid item xs={12} sm={6} md={4} key={domain.id}>
              <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => handleViewDomain(domain)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <BusinessIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {domain.title || domain.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {domain.business_area || domain.name}
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {domain.description}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        label={`시스템 ${domain.current_systems_count || 0}`}
                        size="small"
                        variant="outlined"
                      />
                      {domain.priority_level && (
                        <Chip 
                          label={domain.priority_level}
                          size="small"
                          variant="outlined"
                          color={domain.priority_level === 'critical' ? 'error' : domain.priority_level === 'high' ? 'warning' : 'default'}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(domain.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
        ))}
      </Grid>
      )}
      {/* [advice from AI] 새 도메인 생성 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 도메인 추가</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="도메인 이름"
              value={newDomain.name}
              onChange={(e) => setNewDomain({...newDomain, name: e.target.value})}
              placeholder="예: user-management"
              helperText="영문 소문자, 하이픈 사용"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="설명"
              value={newDomain.description}
              onChange={(e) => setNewDomain({...newDomain, description: e.target.value})}
              placeholder="이 도메인의 목적과 범위를 설명하세요"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="비즈니스 영역"
              value={newDomain.business_area}
              onChange={(e) => setNewDomain({...newDomain, business_area: e.target.value})}
              placeholder="예: 고객관리, 주문관리, 재고관리"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="지역"
              value={newDomain.region}
              onChange={(e) => setNewDomain({...newDomain, region: e.target.value})}
              placeholder="예: KR, US, EU"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="담당자"
              value={newDomain.contact_person}
              onChange={(e) => setNewDomain({...newDomain, contact_person: e.target.value})}
              placeholder="담당자 이름"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="담당자 이메일"
              value={newDomain.contact_email}
              onChange={(e) => setNewDomain({...newDomain, contact_email: e.target.value})}
              placeholder="contact@example.com"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              select
              label="우선순위"
              value={newDomain.priority_level}
              onChange={(e) => setNewDomain({...newDomain, priority_level: e.target.value})}
              SelectProps={{ native: true }}
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
              <option value="critical">긴급</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateDomain}
            disabled={!newDomain.name || !newDomain.description}
          >
            생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 도메인 상세 정보 다이얼로그 */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            도메인 상세 정보
            <Box sx={{ display: 'flex', gap: 1 }}>
              {showManageButtons && (
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setDetailDialog(false);
                    handleEditDomain(selectedDomain!);
                  }}
                >
                  수정
                </Button>
              )}
              {permissions.canViewSystemAdmin && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteDomain}
                >
                  삭제
                </Button>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDomain && (
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50', width: '30%' }}>
                      도메인 이름
                    </TableCell>
                    <TableCell>{selectedDomain.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      비즈니스 영역
                    </TableCell>
                    <TableCell>{selectedDomain.business_area || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      설명
                    </TableCell>
                    <TableCell>{selectedDomain.description}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      지역
                    </TableCell>
                    <TableCell>{selectedDomain.region || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      담당자
                    </TableCell>
                    <TableCell>{selectedDomain.contact_person || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      담당자 이메일
                    </TableCell>
                    <TableCell>{selectedDomain.contact_email || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      우선순위
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={selectedDomain.priority_level || 'medium'}
                        size="small"
                        color={selectedDomain.priority_level === 'critical' ? 'error' : selectedDomain.priority_level === 'high' ? 'warning' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      연결된 시스템
                    </TableCell>
                    <TableCell>{selectedDomain.current_systems_count || 0}개</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      승인 상태
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={selectedDomain.approval_status || 'pending'}
                        size="small"
                        color={selectedDomain.approval_status === 'approved' ? 'success' : selectedDomain.approval_status === 'rejected' ? 'error' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      생성일
                    </TableCell>
                    <TableCell>
                      {selectedDomain.created_at ? new Date(selectedDomain.created_at).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>
                      생성자
                    </TableCell>
                    <TableCell>{selectedDomain.created_by_name || '-'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 도메인 수정 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>도메인 수정</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="도메인 이름"
              value={editDomain.name}
              onChange={(e) => setEditDomain({...editDomain, name: e.target.value})}
              placeholder="예: user-management"
              helperText="영문 소문자, 하이픈 사용"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="설명"
              value={editDomain.description}
              onChange={(e) => setEditDomain({...editDomain, description: e.target.value})}
              placeholder="이 도메인의 목적과 범위를 설명하세요"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="비즈니스 영역"
              value={editDomain.business_area}
              onChange={(e) => setEditDomain({...editDomain, business_area: e.target.value})}
              placeholder="예: 고객관리, 주문관리, 재고관리"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="지역"
              value={editDomain.region}
              onChange={(e) => setEditDomain({...editDomain, region: e.target.value})}
              placeholder="예: KR, US, EU"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="담당자"
              value={editDomain.contact_person}
              onChange={(e) => setEditDomain({...editDomain, contact_person: e.target.value})}
              placeholder="담당자 이름"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="담당자 이메일"
              value={editDomain.contact_email}
              onChange={(e) => setEditDomain({...editDomain, contact_email: e.target.value})}
              placeholder="contact@example.com"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              select
              label="우선순위"
              value={editDomain.priority_level}
              onChange={(e) => setEditDomain({...editDomain, priority_level: e.target.value})}
              SelectProps={{ native: true }}
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
              <option value="critical">긴급</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateDomain}
            disabled={!editDomain.name || !editDomain.description}
          >
            수정
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
};

export default DomainManagement;
