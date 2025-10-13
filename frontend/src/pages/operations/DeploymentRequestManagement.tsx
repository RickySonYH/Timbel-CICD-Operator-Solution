// [advice from AI] 배포 요청 처리 - 관리자 요청 승인 및 5단계 자동 진행 모니터링
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 배포 요청 타입
interface DeploymentRequest {
  id: string;
  project_name: string;
  repository_url: string;
  environment: string;
  priority: string;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';
  current_step: number;
}

// [advice from AI] 배포 단계 정의
const DEPLOYMENT_STEPS = [
  {
    label: '1단계: 레포지토리 분석',
    description: 'GitHub 레포지토리를 분석하여 언어, 프레임워크, 의존성을 파악합니다.'
  },
  {
    label: '2단계: Jenkins Job 생성',
    description: 'Jenkins에 빌드 Job을 생성하고 Webhook을 설정합니다.'
  },
  {
    label: '3단계: Docker 빌드 & Nexus 푸시',
    description: 'Docker 이미지를 빌드하고 Nexus 레지스트리에 푸시합니다.'
  },
  {
    label: '4단계: Argo CD 애플리케이션 생성',
    description: 'Argo CD에 애플리케이션을 생성하고 배포 설정을 구성합니다.'
  },
  {
    label: '5단계: Kubernetes 배포',
    description: 'Kubernetes 클러스터에 실제 배포하고 헬스체크를 수행합니다.'
  }
];

const DeploymentRequestManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DeploymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DeploymentRequest | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // [advice from AI] 배포 요청 목록 로드
  const loadDeploymentRequests = async () => {
    try {
      setLoading(true);
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch('http://localhost:3001/api/operations/deployment-requests', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('배포 요청 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeploymentRequests();
    // 10초마다 자동 새로고침
    const interval = setInterval(loadDeploymentRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  // [advice from AI] 배포 요청 승인
  const handleApproveRequest = async (requestId: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/operations/deployment-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('배포 요청이 승인되었습니다. 5단계 자동 진행이 시작됩니다.');
        loadDeploymentRequests();
      }
    } catch (error) {
      console.error('배포 요청 승인 실패:', error);
      alert('배포 요청 승인에 실패했습니다.');
    }
  };

  // [advice from AI] 배포 요청 거부
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/operations/deployment-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });

      if (response.ok) {
        alert('배포 요청이 거부되었습니다.');
        setRejectDialog(false);
        setRejectReason('');
        setSelectedRequest(null);
        loadDeploymentRequests();
      }
    } catch (error) {
      console.error('배포 요청 거부 실패:', error);
      alert('배포 요청 거부에 실패했습니다.');
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" } = {
      'pending': 'warning',
      'approved': 'info',
      'in_progress': 'info',
      'completed': 'success',
      'failed': 'error',
      'rejected': 'error'
    };
    return colors[status] || 'default';
  };

  // [advice from AI] 상태별 라벨
  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'pending': '대기중',
      'approved': '승인됨',
      'in_progress': '진행중',
      'completed': '완료',
      'failed': '실패',
      'rejected': '거부됨'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 페이지 제목 및 설명 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          배포 요청 처리
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          관리자가 작성한 배포 요청을 검토하고 승인/거부합니다. 승인 시 5단계 자동 진행이 시작됩니다.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>배포 요청 프로세스:</strong><br/>
            • <strong>1단계</strong>: 관리자가 배포 요청 작성<br/>
            • <strong>2단계</strong>: 운영팀 검토 및 승인/거부<br/>
            • <strong>3단계</strong>: 승인 시 5단계 자동 진행 (레포 분석 → Jenkins → Nexus → Argo CD → K8s)<br/>
            • <strong>4단계</strong>: 배포 완료 후 결과 확인<br/>
          </Typography>
        </Alert>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                대기중 요청
              </Typography>
              <Typography variant="h3" color="warning.main">
                {requests.filter(r => r.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                진행중
              </Typography>
              <Typography variant="h3" color="info.main">
                {requests.filter(r => r.status === 'in_progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                완료
              </Typography>
              <Typography variant="h3" color="success.main">
                {requests.filter(r => r.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                실패/거부
              </Typography>
              <Typography variant="h3" color="error.main">
                {requests.filter(r => r.status === 'failed' || r.status === 'rejected').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 배포 요청 목록 */}
      <Card>
        <CardContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">배포 요청 목록</Typography>
            <Button onClick={loadDeploymentRequests}>
              새로고침
            </Button>
          </Box>

          {requests.length === 0 ? (
            <Alert severity="info">
              현재 처리할 배포 요청이 없습니다.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>우선순위</TableCell>
                    <TableCell>요청자</TableCell>
                    <TableCell>요청일</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>진행률</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.project_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={request.environment} 
                          color={request.environment === 'production' ? 'error' : 'default'}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={request.priority} 
                          color={request.priority === 'urgent' ? 'error' : 'default'}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{request.requested_by}</TableCell>
                      <TableCell>{new Date(request.requested_at).toLocaleString('ko-KR')}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(request.status)} 
                          color={getStatusColor(request.status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={(request.current_step / 5) * 100} 
                            sx={{ flexGrow: 1, minWidth: 80 }}
                          />
                          <Typography variant="body2">{request.current_step}/5</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            size="small" 
                            onClick={() => {
                              setSelectedRequest(request);
                              setDetailDialog(true);
                            }}
                          >
                            상세
                          </Button>
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                size="small" 
                                variant="contained" 
                                color="success"
                                onClick={() => handleApproveRequest(request.id)}
                              >
                                승인
                              </Button>
                              <Button 
                                size="small" 
                                variant="outlined" 
                                color="error"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setRejectDialog(true);
                                }}
                              >
                                거부
                              </Button>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 상세 다이얼로그 */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>배포 요청 상세 정보</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                프로젝트: {selectedRequest.project_name}
              </Typography>
              <Typography variant="body2" paragraph>
                레포지토리: {selectedRequest.repository_url}
              </Typography>
              <Typography variant="body2" paragraph>
                환경: {selectedRequest.environment} | 우선순위: {selectedRequest.priority}
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                진행 단계
              </Typography>
              <Stepper activeStep={selectedRequest.current_step} orientation="vertical">
                {DEPLOYMENT_STEPS.map((step, index) => (
                  <Step key={index}>
                    <StepLabel>
                      {step.label}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 거부 다이얼로그 */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>배포 요청 거부</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            배포 요청을 거부하는 이유를 입력하세요.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="거부 사유를 입력하세요"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>
            취소
          </Button>
          <Button 
            onClick={handleRejectRequest} 
            variant="contained" 
            color="error"
            disabled={!rejectReason.trim()}
          >
            거부 확정
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeploymentRequestManagement;

