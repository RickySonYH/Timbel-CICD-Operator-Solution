// [advice from AI] 시스템 승인 대기 페이지 - 자동 추출된 시스템들의 승인 관리

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Alert, Divider, List, ListItem, ListItemText, Avatar, IconButton,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Pending as PendingIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  AccountTree as SystemIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../../store/jwtAuthStore';

interface PendingSystemApproval {
  request_id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  request_status: string;
  requester_name: string;
  created_at: string;
  due_date?: string;
  approval_level?: number;
  my_approval_status?: string;
  assigned_at?: string;
  timeout_hours?: number;
  code_components_count?: number;
  documents_count?: number;
  design_assets_count?: number;
  catalog_components_count?: number;
  total_assets_count?: number;
}

const SystemApprovalPending: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useJwtAuthStore();
  
  const [pendingSystems, setPendingSystems] = useState<PendingSystemApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<PendingSystemApproval | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  // [advice from AI] 승인 대기 시스템 목록 로드
  useEffect(() => {
    const fetchPendingSystems = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await fetch('/api/approvals/requests?type=system_registration&status=pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('승인 대기 목록을 불러올 수 없습니다');
        }

        const data = await response.json();
        setPendingSystems(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingSystems();
  }, [token]);

  // [advice from AI] 시스템 승인/거부 처리
  const handleApprovalAction = async () => {
    if (!selectedSystem) return;

    try {
      const response = await fetch(`/api/approvals/${selectedSystem.request_id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: approvalAction,
          comment: `시스템 ${approvalAction === 'approve' ? '승인' : '거부'} by ${user?.fullName}`
        })
      });

      if (!response.ok) {
        throw new Error(`${approvalAction === 'approve' ? '승인' : '거부'} 처리에 실패했습니다`);
      }

      // 목록 새로고침
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다');
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          📋 시스템 승인 대기
        </Typography>
        <Typography variant="body1" color="text.secondary">
          자동 추출된 시스템들의 승인을 관리합니다. 승인 시 카탈로그와 지식 자산에 동시 등록됩니다.
        </Typography>
      </Box>

      {/* [advice from AI] 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4">{pendingSystems.length}</Typography>
              <Typography variant="body2" color="text.secondary">승인 대기</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">
                {pendingSystems.filter(s => s.priority === 'high').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">긴급</Typography>
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

      {/* [advice from AI] 승인 대기 시스템 목록 */}
      {loading ? (
        <Typography>로딩 중...</Typography>
      ) : pendingSystems.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <PendingIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              승인 대기 중인 시스템이 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              새로운 시스템이 자동 추출되면 여기에 표시됩니다.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {pendingSystems.map((system) => (
            <Grid item xs={12} key={system.request_id}>
              <Card>
                <CardContent>
                  {/* [advice from AI] 시스템 헤더 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <SystemIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {system.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip 
                            label={system.type} 
                            size="small" 
                            variant="outlined" 
                          />
                          <Chip 
                            label={system.priority} 
                            size="small" 
                            color={getPriorityColor(system.priority) as any}
                          />
                          <Chip 
                            label={`Level ${system.approval_level || 1}`} 
                            size="small" 
                            color="info"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          요청자: {system.requester_name}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<ViewIcon />}
                        onClick={() => setSelectedSystem(system)}
                        size="small"
                      >
                        상세보기
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => {
                          setSelectedSystem(system);
                          setApprovalAction('approve');
                          setApprovalDialog(true);
                        }}
                        size="small"
                      >
                        승인
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => {
                          setSelectedSystem(system);
                          setApprovalAction('reject');
                          setApprovalDialog(true);
                        }}
                        size="small"
                      >
                        거부
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* [advice from AI] 시스템 설명 */}
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {system.description}
                  </Typography>

                  {/* [advice from AI] 추출된 자산 통계 */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      📊 추출된 지식 자산:
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CodeIcon color="primary" />
                          <Typography variant="body2">
                            코드 컴포넌트: {system.code_components_count || 0}개
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ImageIcon color="secondary" />
                          <Typography variant="body2">
                            디자인 자산: {system.design_assets_count || 0}개
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DocumentIcon color="info" />
                          <Typography variant="body2">
                            문서: {system.documents_count || 0}개
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SystemIcon color="success" />
                          <Typography variant="body2">
                            카탈로그: {system.catalog_components_count || 0}개
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* [advice from AI] 승인 정보 */}
                  <Accordion sx={{ mt: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        ⏰ 승인 정보
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>요청일:</strong> {new Date(system.created_at).toLocaleDateString('ko-KR')}
                        </Typography>
                        {system.due_date && (
                          <Typography variant="body2" gutterBottom>
                            <strong>마감일:</strong> {new Date(system.due_date).toLocaleDateString('ko-KR')}
                          </Typography>
                        )}
                        <Typography variant="body2" gutterBottom>
                          <strong>승인 단계:</strong> {system.approval_level}차 승인
                        </Typography>
                        <Typography variant="body2">
                          <strong>총 자산:</strong> {system.total_assets_count || 0}개
                        </Typography>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 승인/거부 확인 다이얼로그 */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' ? '✅ 시스템 승인' : '❌ 시스템 거부'}
        </DialogTitle>
        <DialogContent>
          {selectedSystem && (
            <Box>
              <Alert 
                severity={approvalAction === 'approve' ? 'success' : 'warning'} 
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  {approvalAction === 'approve' 
                    ? '이 시스템을 승인하면 다음 작업이 수행됩니다:'
                    : '이 시스템을 거부하면 추출된 모든 데이터가 삭제됩니다.'
                  }
                </Typography>
              </Alert>

              <Typography variant="h6" gutterBottom>
                {selectedSystem.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedSystem.description}
              </Typography>

              {approvalAction === 'approve' && (
                <Box sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    승인 시 수행 작업:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="1. 카탈로그 시스템에 등록" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="2. 지식 자산에 시스템 등록" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="3. 개별 지식 자산들을 승인 대기 상태로 전환" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary={`4. 총 ${selectedSystem.total_assets_count || 0}개 지식 자산 승인 대기`} />
                    </ListItem>
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>
            취소
          </Button>
          <Button 
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            onClick={handleApprovalAction}
          >
            {approvalAction === 'approve' ? '승인하기' : '거부하기'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 시스템 상세보기 다이얼로그 */}
      <Dialog 
        open={Boolean(selectedSystem) && !approvalDialog} 
        onClose={() => setSelectedSystem(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          🏗️ 시스템 상세 정보
        </DialogTitle>
        <DialogContent>
          {selectedSystem && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>시스템 정보</Typography>
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>이름:</strong> {selectedSystem.system.name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>분류:</strong> {selectedSystem.system.category}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>버전:</strong> {selectedSystem.system.version}
                    </Typography>
                    <Typography variant="body2">
                      <strong>설명:</strong> {selectedSystem.system.description}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>요청 정보</Typography>
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>요청자:</strong> {selectedSystem.requester.name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>이메일:</strong> {selectedSystem.requester.email}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>우선순위:</strong> {selectedSystem.priority}
                    </Typography>
                    <Typography variant="body2">
                      <strong>요청일:</strong> {new Date(selectedSystem.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>추출된 지식 자산</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>유형</TableCell>
                        <TableCell align="right">수량</TableCell>
                        <TableCell>설명</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>코드 컴포넌트</TableCell>
                        <TableCell align="right">{selectedSystem.code_components_count || 0}</TableCell>
                        <TableCell>함수, 클래스, 모듈 등</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>디자인 자산</TableCell>
                        <TableCell align="right">{selectedSystem.design_assets_count || 0}</TableCell>
                        <TableCell>이미지, 스타일, 레이아웃 등</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>문서</TableCell>
                        <TableCell align="right">{selectedSystem.documents_count || 0}</TableCell>
                        <TableCell>README, API 문서 등</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>카탈로그 컴포넌트</TableCell>
                        <TableCell align="right">{selectedSystem.catalog_components_count || 0}</TableCell>
                        <TableCell>재사용 가능한 컴포넌트</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSystem(null)}>
            닫기
          </Button>
          <Button 
            variant="contained"
            color="success"
            startIcon={<ApproveIcon />}
            onClick={() => {
              setApprovalAction('approve');
              setApprovalDialog(true);
            }}
          >
            승인하기
          </Button>
          <Button 
            variant="contained"
            color="error"
            startIcon={<RejectIcon />}
            onClick={() => {
              setApprovalAction('reject');
              setApprovalDialog(true);
            }}
          >
            거부하기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SystemApprovalPending;
