// [advice from AI] 도메인 관리 페이지 - 비즈니스 도메인별 지식 자산 관리 (영업처 개념)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Avatar, Divider, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, Paper
} from '@mui/material';
// [advice from AI] 아이콘 import 제거 (텍스트 기반 UI로 변경)
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 도메인 정보 인터페이스 (영업처 개념 강화)
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

const DomainsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [filteredDomains, setFilteredDomains] = useState<DomainInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  // [advice from AI] API URL 생성
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      return 'http://localhost:3001';
    } else {
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };

  // [advice from AI] 도메인 목록 로드
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        
        if (!token) {
          setError('인증 토큰이 없습니다. 다시 로그인해주세요.');
          return;
        }

        const { token: authToken } = useJwtAuthStore.getState();
        const response = await fetch('http://localhost:3001/api/knowledge/domains', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`도메인 목록을 불러올 수 없습니다 (상태: ${response.status})`);
        }

        const result = await response.json();
        const domainsData = result.success ? result.domains : [];
        setDomains(domainsData || []);
        setFilteredDomains(domainsData || []);
        
      } catch (err) {
        console.error('도메인 로딩 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

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

  // [advice from AI] 새 도메인 생성 (영업처 정보 포함)
  const handleCreateDomain = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/knowledge/domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newDomain,
          owner_id: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('도메인 생성에 실패했습니다');
      }

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
      
      // 목록 새로고침
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '도메인 생성 중 오류가 발생했습니다');
    }
  };

  // [advice from AI] 도메인 상세 보기
  const handleViewDomain = async (domain: DomainInfo) => {
    setSelectedDomain(domain);
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          도메인 (영업처) 카탈로그
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            비즈니스 도메인별로 지식 자산을 체계적으로 관리합니다.
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
            총 {domains.length}개 도메인
          </Typography>
        </Box>
      </Box>

      {/* [advice from AI] 액션 버튼 */}
      {permissions.canManageDomains && (
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
      
      {/* [advice from AI] 권한 안내 */}
      {!permissions.canManageDomains && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            현재 권한으로는 도메인 카탈로그 조회만 가능합니다. 등록이나 수정이 필요한 경우 관리자에게 문의하세요.
          </Alert>
        </Box>
      )}

      {/* [advice from AI] 에러 표시 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 도메인 목록 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredDomains.map((domain) => (
            <Grid item xs={12} sm={6} md={4} key={domain.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }} 
                onClick={() => handleViewDomain(domain)}
              >
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

      {/* [advice from AI] 새 도메인 생성 다이얼로그 (영업처 정보 포함) */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 도메인 추가</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="도메인 이름"
              value={newDomain.name}
              onChange={(e) => setNewDomain({...newDomain, name: e.target.value})}
              placeholder="예: 국민은행, 삼성전자, LG화학"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="설명"
              value={newDomain.description}
              onChange={(e) => setNewDomain({...newDomain, description: e.target.value})}
              placeholder="이 도메인(영업처)의 목적과 범위를 설명하세요"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="비즈니스 영역"
              value={newDomain.business_area}
              onChange={(e) => setNewDomain({...newDomain, business_area: e.target.value})}
              placeholder="예: 금융, 제조, 유통, IT서비스"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="지역"
              value={newDomain.region}
              onChange={(e) => setNewDomain({...newDomain, region: e.target.value})}
              placeholder="예: 서울, 부산, 해외"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="담당자"
              value={newDomain.contact_person}
              onChange={(e) => setNewDomain({...newDomain, contact_person: e.target.value})}
              placeholder="영업 담당자 이름"
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
              {permissions.canManageDomains && (
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
                  onClick={() => {
                    if (selectedDomain && window.confirm(`"${selectedDomain.name}" 도메인을 정말 삭제하시겠습니까?`)) {
                      // 삭제 로직
                    }
                  }}
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
              placeholder="예: 국민은행, 삼성전자"
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
              placeholder="예: 금융, 제조, 유통"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="지역"
              value={editDomain.region}
              onChange={(e) => setEditDomain({...editDomain, region: e.target.value})}
              placeholder="예: 서울, 부산, 해외"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="담당자"
              value={editDomain.contact_person}
              onChange={(e) => setEditDomain({...editDomain, contact_person: e.target.value})}
              placeholder="영업 담당자 이름"
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
            onClick={() => {
              // 수정 로직 구현 예정
              setEditDialog(false);
            }}
            disabled={!editDomain.name || !editDomain.description}
          >
            수정
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DomainsPage;