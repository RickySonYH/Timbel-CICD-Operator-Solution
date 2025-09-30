// [advice from AI] 배포 승인 처리 센터 - 운영팀이 PO의 배포 요청을 승인/반려하는 전용 페이지 (PO→PE, PE→QA 프로세스와 유사한 구조)
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem,
  Divider, List, ListItem, ListItemText, ListItemIcon, Avatar, Tabs, Tab
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface DeploymentApproval {
  id: string;
  project_name: string;
  po_name: string;
  request_date: string;
  priority: 'high' | 'normal' | 'low';
  target_environment: string;
  repository_url: string;
  quality_score: number;
  resource_requirements: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
  };
  deployment_notes: string;
  status: 'pending' | 'approved' | 'rejected';
}

const DeploymentApprovalCenter: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [currentTab, setCurrentTab] = useState(0); // [advice from AI] 기존 시스템과 유사한 탭 구조
  const [approvals, setApprovals] = useState<DeploymentApproval[]>([]);
  const [completedApprovals, setCompletedApprovals] = useState<DeploymentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<DeploymentApproval | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'reject' | ''>('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  

  // [advice from AI] 승인 대기 목록 로드
  const loadPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/deployment-requests?status=pending_operations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // [advice from AI] API 응답을 컴포넌트 형식에 맞게 변환
          const transformedApprovals = data.data.requests.map((req: any) => ({
            id: req.id,
            project_name: req.project_name,
            po_name: req.po_name,
            request_date: req.created_at,
            priority: req.priority || 'normal',
            target_environment: req.deployment_config?.target_environment || 'production',
            repository_url: req.repository_url || '',
            quality_score: req.knowledge_assets?.reusability_score || 0,
            resource_requirements: req.deployment_config?.resource_requirements || {
              cpu_cores: 2,
              memory_gb: 4,
              storage_gb: 20
            },
            deployment_notes: req.notes || '',
            status: 'pending'
          }));

          setApprovals(transformedApprovals);
          console.log('✅ 배포 승인 대기 목록 로딩 완료:', transformedApprovals.length);
        }
      } else {
        // [advice from AI] Mock 데이터로 대체
        const mockApprovals: DeploymentApproval[] = [
          {
            id: 'approval-1',
            project_name: 'ECP-AI K8s Orchestrator',
            po_name: '김PO',
            request_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            priority: 'high',
            target_environment: 'production',
            repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
            quality_score: 92,
            resource_requirements: {
              cpu_cores: 4,
              memory_gb: 8,
              storage_gb: 50
            },
            deployment_notes: '고객사 요청으로 긴급 배포 필요',
            status: 'pending'
          },
          {
            id: 'approval-2',
            project_name: 'AICC 챗봇 시스템',
            po_name: '이PO',
            request_date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            priority: 'normal',
            target_environment: 'staging',
            repository_url: 'https://github.com/company/aicc-chatbot',
            quality_score: 88,
            resource_requirements: {
              cpu_cores: 2,
              memory_gb: 4,
              storage_gb: 30
            },
            deployment_notes: 'QA 완료 후 스테이징 배포',
            status: 'pending'
          }
        ];
        setApprovals(mockApprovals);
      }
    } catch (error) {
      console.error('❌ 배포 승인 목록 로딩 오류:', error);
      setError(error instanceof Error ? error.message : '데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [token]);


  // [advice from AI] 승인/반려 처리
  const handleDecision = async () => {
    if (!selectedApproval || !decision) return;

    try {
      setProcessing(true);

      const response = await fetch(`/api/deployment-requests/${selectedApproval.id}/decision`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          decision,
          notes: decisionNotes
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ 배포 승인 처리 완료:', decision);
          
          // 목록에서 제거
          setApprovals(prev => prev.filter(a => a.id !== selectedApproval.id));
          
          // 다이얼로그 닫기
          setApprovalDialog(false);
          setSelectedApproval(null);
          setDecision('');
          setDecisionNotes('');
        }
      } else {
        throw new Error('승인 처리 실패');
      }
    } catch (error) {
      console.error('❌ 배포 승인 처리 오류:', error);
      setError(error instanceof Error ? error.message : '승인 처리 실패');
    } finally {
      setProcessing(false);
    }
  };

  // [advice from AI] 우선순위 색상 매핑
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 환경별 색상 매핑
  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'error';
      case 'staging': return 'warning';
      case 'development': return 'info';
      default: return 'default';
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* [advice from AI] 헤더 - 기존 시스템과 유사한 구조 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            배포 승인 처리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            PO가 요청한 배포를 검토하고 승인/반려를 결정합니다. (6단계 → 7단계 전환)
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => window.open('/po-dashboard', '_blank')}
          sx={{ mt: 1 }}
        >
          PO 배포 요청서 작성
        </Button>
      </Box>

      {/* [advice from AI] 탭 메뉴 - PO→PE, PE→QA와 유사한 구조 */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={`승인 대기 (${approvals.filter(a => a.status === 'pending').length})`} 
            sx={{ fontWeight: 'bold' }}
          />
          <Tab 
            label={`처리 완료 (${completedApprovals.length})`} 
          />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* [advice from AI] 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                승인 대기
              </Typography>
              <Typography variant="h4">
                {approvals.filter(a => a.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                긴급 요청
              </Typography>
              <Typography variant="h4" color="error.main">
                {approvals.filter(a => a.priority === 'high').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                평균 품질 점수
              </Typography>
              <Typography variant="h4" color="success.main">
                {approvals.length > 0 ? 
                  Math.round(approvals.reduce((sum, a) => sum + a.quality_score, 0) / approvals.length) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                프로덕션 배포
              </Typography>
              <Typography variant="h4" color="warning.main">
                {approvals.filter(a => a.target_environment === 'production').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 승인 대기 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            승인 대기 목록
          </Typography>
          
          {approvals.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                승인 대기 중인 배포 요청이 없습니다.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>PO</TableCell>
                    <TableCell>우선순위</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>품질점수</TableCell>
                    <TableCell>요청일시</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvals.map((approval) => (
                    <TableRow key={approval.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {approval.project_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{approval.po_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.priority.toUpperCase()} 
                          color={getPriorityColor(approval.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={approval.target_environment} 
                          color={getEnvironmentColor(approval.target_environment) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color={approval.quality_score >= 90 ? 'success.main' : 
                                 approval.quality_score >= 80 ? 'warning.main' : 'error.main'}
                        >
                          {approval.quality_score}점
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(approval.request_date).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setApprovalDialog(true);
                          }}
                        >
                          검토
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* [advice from AI] 승인/반려 다이얼로그 */}
      <Dialog 
        open={approvalDialog} 
        onClose={() => setApprovalDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          배포 승인 검토: {selectedApproval?.project_name}
        </DialogTitle>
        <DialogContent>
          {selectedApproval && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    프로젝트 정보
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="프로젝트명" 
                        secondary={selectedApproval.project_name} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="담당 PO" 
                        secondary={selectedApproval.po_name} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="레포지토리" 
                        secondary={selectedApproval.repository_url} 
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    배포 설정
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="대상 환경" 
                        secondary={selectedApproval.target_environment} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="품질 점수" 
                        secondary={`${selectedApproval.quality_score}점`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="리소스" 
                        secondary={`CPU: ${selectedApproval.resource_requirements.cpu_cores}코어, 메모리: ${selectedApproval.resource_requirements.memory_gb}GB`} 
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                배포 요청 사유
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                {selectedApproval.deployment_notes || '사유 없음'}
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>승인 결정</InputLabel>
                <Select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as 'approve' | 'reject')}
                  label="승인 결정"
                >
                  <MenuItem value="approve">승인</MenuItem>
                  <MenuItem value="reject">반려</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="결정 사유"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="승인/반려 사유를 입력하세요..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>
            취소
          </Button>
          <Button 
            onClick={handleDecision}
            variant="contained"
            disabled={!decision || processing}
          >
            {processing ? <CircularProgress size={20} /> : '결정 확정'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default DeploymentApprovalCenter;
