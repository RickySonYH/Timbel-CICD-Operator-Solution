// [advice from AI] 지식 자산 승인 대기 페이지 - 시스템 승인 후 개별 지식 자산 승인 관리

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Alert, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails,
  Checkbox, FormControlLabel, Avatar
} from '@mui/material';
import {
  Pending as PendingIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  SelectAll as SelectAllIcon,
  AccountTree as SystemIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface PendingAsset {
  id: string;
  name: string;
  type: string;
  description: string;
  file_path: string;
  language: string;
  size: number;
  systemName: string;
  systemId: string;
  requester_name: string;
  created_at: string;
  metadata: any;
}

interface SystemGroup {
  systemId: string;
  systemName: string;
  assets: PendingAsset[];
}

const AssetApprovalPending: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useJwtAuthStore();
  
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [systemGroups, setSystemGroups] = useState<SystemGroup[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [batchApprovalDialog, setBatchApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  // [advice from AI] 승인 대기 자산 목록 로드
  useEffect(() => {
    const fetchPendingAssets = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await fetch('/api/approvals/pending-assets?status=pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('승인 대기 자산을 불러올 수 없습니다');
        }

        const data = await response.json();
        console.log('지식 자산 승인 대기 데이터:', data);
        
        if (data.success) {
          const assets = data.data.assets || [];
          const systemGroups = data.data.systemGroups || [];
          
          setPendingAssets(assets);
          setSystemGroups(systemGroups);
        } else {
          throw new Error(data.message || '데이터 로드 실패');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingAssets();
  }, [token]);

  // [advice from AI] 자산 선택/해제
  const handleAssetSelection = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected);
  };

  // [advice from AI] 시스템 전체 선택/해제
  const handleSystemSelection = (systemGroup: SystemGroup, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    systemGroup.assets.forEach(asset => {
      if (checked) {
        newSelected.add(asset.id);
      } else {
        newSelected.delete(asset.id);
      }
    });
    setSelectedAssets(newSelected);
  };

  // [advice from AI] 일괄 승인/거부 처리
  const handleBatchApproval = async () => {
    try {
      const assetIds = Array.from(selectedAssets);
      
      const response = await fetch('/api/approvals/batch-action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assetIds,
          action: approvalAction,
          comment: `일괄 ${approvalAction === 'approve' ? '승인' : '거부'} by ${user?.fullName}`
        })
      });

      if (!response.ok) {
        throw new Error('일괄 처리에 실패했습니다');
      }

      // 목록 새로고침
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다');
    }
  };

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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          🧩 지식 자산 승인 대기
        </Typography>
        <Typography variant="body1" color="text.secondary">
          시스템 승인 후 개별 지식 자산들을 승인/거부할 수 있습니다.
        </Typography>
      </Box>

      {/* [advice from AI] 통계 및 일괄 작업 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4">{pendingAssets.length}</Typography>
              <Typography variant="body2" color="text.secondary">승인 대기</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SystemIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">{systemGroups.length}</Typography>
              <Typography variant="body2" color="text.secondary">시스템</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                일괄 작업 ({selectedAssets.size}개 선택됨)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  disabled={selectedAssets.size === 0}
                  onClick={() => {
                    setApprovalAction('approve');
                    setBatchApprovalDialog(true);
                  }}
                  size="small"
                >
                  선택 항목 승인
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RejectIcon />}
                  disabled={selectedAssets.size === 0}
                  onClick={() => {
                    setApprovalAction('reject');
                    setBatchApprovalDialog(true);
                  }}
                  size="small"
                >
                  선택 항목 거부
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 에러 표시 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 시스템별 그룹화된 자산 목록 */}
      {loading ? (
        <Typography>로딩 중...</Typography>
      ) : systemGroups.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <PendingIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              승인 대기 중인 지식 자산이 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              시스템이 승인되면 개별 지식 자산들이 여기에 표시됩니다.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        systemGroups.map((systemGroup) => (
          <Accordion key={systemGroup.systemId} defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <SystemIcon />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {systemGroup.systemName}
                </Typography>
                <Chip 
                  label={`${systemGroup.assets.length}개 자산`}
                  size="small"
                  sx={{ bgcolor: 'primary.dark', color: 'white' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={systemGroup.assets.every(asset => selectedAssets.has(asset.id))}
                      indeterminate={
                        systemGroup.assets.some(asset => selectedAssets.has(asset.id)) &&
                        !systemGroup.assets.every(asset => selectedAssets.has(asset.id))
                      }
                      onChange={(e) => handleSystemSelection(systemGroup, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  label="전체 선택"
                  sx={{ mr: 0 }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">선택</TableCell>
                      <TableCell>이름</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>경로</TableCell>
                      <TableCell>설명</TableCell>
                      <TableCell align="right">액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {systemGroup.assets.map((asset) => (
                      <TableRow key={asset.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onChange={(e) => handleAssetSelection(asset.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getAssetIcon(asset.type)}
                            <Typography variant="body2" fontWeight="bold">
                              {asset.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={asset.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {asset.path}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {asset.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<ApproveIcon />}
                            >
                              승인
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<RejectIcon />}
                            >
                              거부
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* [advice from AI] 일괄 승인/거부 확인 다이얼로그 */}
      <Dialog open={batchApprovalDialog} onClose={() => setBatchApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' ? '✅ 일괄 승인' : '❌ 일괄 거부'}
        </DialogTitle>
        <DialogContent>
          <Alert 
            severity={approvalAction === 'approve' ? 'success' : 'warning'} 
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              선택된 {selectedAssets.size}개의 지식 자산을 {approvalAction === 'approve' ? '승인' : '거부'}하시겠습니까?
            </Typography>
          </Alert>

          {approvalAction === 'approve' && (
            <Box sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                승인 시 수행 작업:
              </Typography>
              <Typography variant="body2">
                • 선택된 지식 자산들이 정식 카탈로그에 등록됩니다<br/>
                • 검색 및 재사용이 가능해집니다<br/>
                • 관련 다이어그램과 문서가 연결됩니다
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchApprovalDialog(false)}>
            취소
          </Button>
          <Button 
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            onClick={handleBatchApproval}
          >
            {approvalAction === 'approve' ? '승인하기' : '거부하기'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AssetApprovalPending;
