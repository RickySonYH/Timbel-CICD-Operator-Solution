// [advice from AI] 내 소유 미승인 항목 관리 페이지 - 소유자가 직접 승인 신청

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Alert, CircularProgress,
  Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
  TextField, InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Assignment as RequestIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Category as CategoryIcon,
  Computer as SystemIcon,
  Business as DomainIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import ApprovalRequestForm from '../../components/approvals/ApprovalRequestForm';

interface PendingItem {
  id: string;
  type: 'system' | 'domain' | 'api' | 'component' | 'design' | 'document';
  name: string;
  description: string;
  created_at: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  owner_id: string;
  metadata: any;
}

const MyPendingApprovals: React.FC = () => {
  const { user, token } = useJwtAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);

  useEffect(() => {
    loadMyPendingItems();
  }, [activeTab]);

  const loadMyPendingItems = async () => {
    try {
      setLoading(true);
      
      // 탭별 상태 매핑
      const statusMap = {
        0: 'draft', // 미승인 (승인 신청 전)
        1: 'pending_approval', // 승인 대기중
        2: 'approved', // 승인 완료
        3: 'rejected' // 승인 거부
      };
      
      const status = statusMap[activeTab as keyof typeof statusMap];
      
      const response = await fetch(`/api/approvals/my-items?status=${status}&owner_id=${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setPendingItems(result.data || []);
      } else {
        console.error('내 승인 항목 조회 실패');
      }
    } catch (error) {
      console.error('내 승인 항목 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalRequest = (item: PendingItem) => {
    setSelectedItem(item);
    setShowApprovalForm(true);
  };

  const handleApprovalSubmit = async (approvalData: any) => {
    try {
      const response = await fetch('http://localhost:3001/api/approvals/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...approvalData,
          targetItemId: selectedItem?.id,
          targetItemType: selectedItem?.type
        })
      });
      
      if (response.ok) {
        await loadMyPendingItems(); // 목록 새로고침
        setShowApprovalForm(false);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('승인 신청 실패:', error);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'system': return <SystemIcon />;
      case 'domain': return <DomainIcon />;
      case 'api': return <CodeIcon />;
      case 'component': return <CategoryIcon />;
      case 'design': return <ImageIcon />;
      case 'document': return <DocumentIcon />;
      default: return <CategoryIcon />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip size="small" label="미승인" color="default" />;
      case 'pending_approval':
        return <Chip size="small" label="승인 대기" color="warning" icon={<PendingIcon />} />;
      case 'approved':
        return <Chip size="small" label="승인 완료" color="success" icon={<ApprovedIcon />} />;
      case 'rejected':
        return <Chip size="small" label="승인 거부" color="error" icon={<RejectedIcon />} />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

  const filteredItems = pendingItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const tabLabels = [
    '미승인 항목',
    '승인 대기중',
    '승인 완료',
    '승인 거부'
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          내 승인 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          내가 소유한 지식 자산들의 승인 상태를 관리하고 승인을 신청할 수 있습니다.
        </Typography>
      </Box>

      {/* 탭 네비게이션 */}
      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      </Card>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="이름 또는 설명으로 검색..."
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
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>타입 필터</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="타입 필터"
                  startAdornment={<FilterIcon sx={{ mr: 1 }} />}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="system">시스템</MenuItem>
                  <MenuItem value="domain">도메인</MenuItem>
                  <MenuItem value="api">API</MenuItem>
                  <MenuItem value="component">컴포넌트</MenuItem>
                  <MenuItem value="design">디자인</MenuItem>
                  <MenuItem value="document">문서</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadMyPendingItems}
                disabled={loading}
              >
                새로고침
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 목록 표시 */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            내 승인 항목을 불러오는 중...
          </Typography>
        </Box>
      ) : filteredItems.length === 0 ? (
        <Alert severity="info">
          {activeTab === 0 ? '승인 신청이 필요한 항목이 없습니다.' : 
           activeTab === 1 ? '승인 대기중인 항목이 없습니다.' :
           activeTab === 2 ? '승인 완료된 항목이 없습니다.' :
           '승인 거부된 항목이 없습니다.'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>타입</TableCell>
                <TableCell>이름</TableCell>
                <TableCell>설명</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>생성일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getItemIcon(item.type)}
                      {item.type}
                    </Box>
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {item.status === 'draft' && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleApprovalRequest(item)}
                        startIcon={<RequestIcon />}
                      >
                        승인 신청
                      </Button>
                    )}
                    {item.status === 'approved' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/catalog/${item.type}s/${item.id}`)}
                      >
                        카탈로그에서 보기
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 승인 신청 폼 */}
      {selectedItem && (
        <ApprovalRequestForm
          open={showApprovalForm}
          onClose={() => {
            setShowApprovalForm(false);
            setSelectedItem(null);
          }}
          onSubmit={handleApprovalSubmit}
          data={{
            type: selectedItem.type === 'system' ? 'system_registration' : 'knowledge_asset',
            title: selectedItem.name,
            description: selectedItem.description,
            systemInfo: selectedItem.metadata?.systemInfo,
            extractionResult: selectedItem.metadata?.extractionResult,
            metadata: selectedItem.metadata
          }}
        />
      )}
    </Container>
  );
};

export default MyPendingApprovals;
