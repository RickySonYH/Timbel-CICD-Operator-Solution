// [advice from AI] 배포 히스토리 - 모든 배포 기록 조회 및 롤백 관리
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 배포 기록 타입
interface DeploymentRecord {
  id: string;
  project_name: string;
  environment: string;
  status: 'success' | 'failed' | 'rollback';
  deployed_at: string;
  deployed_by: string;
  version: string;
  repository_url: string;
  commit_hash: string;
  duration_seconds: number;
}

const DeploymentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [filteredDeployments, setFilteredDeployments] = useState<DeploymentRecord[]>([]);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    environment: 'all',
    status: 'all',
    searchText: ''
  });
  
  // 상세/롤백 다이얼로그
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentRecord | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [rollbackDialog, setRollbackDialog] = useState(false);

  // [advice from AI] 배포 히스토리 로드
  const loadDeploymentHistory = async () => {
    try {
      setLoading(true);
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch('http://localhost:3001/api/operations/deployment-history', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDeployments(data.deployments || []);
        setFilteredDeployments(data.deployments || []);
      }
    } catch (error) {
      console.error('배포 히스토리 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeploymentHistory();
  }, []);

  // [advice from AI] 필터 적용
  useEffect(() => {
    let filtered = [...deployments];

    // 환경 필터
    if (filters.environment !== 'all') {
      filtered = filtered.filter(d => d.environment === filters.environment);
    }

    // 상태 필터
    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.status === filters.status);
    }

    // 검색 텍스트
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      filtered = filtered.filter(d => 
        d.project_name.toLowerCase().includes(search) ||
        d.deployed_by.toLowerCase().includes(search) ||
        d.version.toLowerCase().includes(search)
      );
    }

    setFilteredDeployments(filtered);
  }, [filters, deployments]);

  // [advice from AI] 롤백 실행
  const handleRollback = async () => {
    if (!selectedDeployment) return;

    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/operations/deployments/${selectedDeployment.id}/rollback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('롤백이 시작되었습니다.');
        setRollbackDialog(false);
        setSelectedDeployment(null);
        loadDeploymentHistory();
      }
    } catch (error) {
      console.error('롤백 실패:', error);
      alert('롤백에 실패했습니다.');
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" } = {
      'success': 'success',
      'failed': 'error',
      'rollback': 'warning'
    };
    return colors[status] || 'default';
  };

  // [advice from AI] 상태별 라벨
  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'success': '성공',
      'failed': '실패',
      'rollback': '롤백됨'
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
          배포 히스토리
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          모든 배포 기록을 조회하고 필요시 롤백을 수행합니다.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>배포 히스토리 기능:</strong><br/>
            • 모든 환경(dev/stg/prod)의 배포 기록 조회<br/>
            • 배포 성공/실패 현황 확인<br/>
            • 이전 버전으로 롤백<br/>
            • 배포 소요 시간 및 담당자 추적
          </Typography>
        </Alert>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                총 배포 횟수
              </Typography>
              <Typography variant="h3" color="primary">
                {deployments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                성공
              </Typography>
              <Typography variant="h3" color="success.main">
                {deployments.filter(d => d.status === 'success').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                실패
              </Typography>
              <Typography variant="h3" color="error.main">
                {deployments.filter(d => d.status === 'failed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                롤백
              </Typography>
              <Typography variant="h3" color="warning.main">
                {deployments.filter(d => d.status === 'rollback').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            필터
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>환경</InputLabel>
                <Select
                  value={filters.environment}
                  onChange={(e) => setFilters({ ...filters, environment: e.target.value })}
                  label="환경"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="development">개발</MenuItem>
                  <MenuItem value="staging">스테이징</MenuItem>
                  <MenuItem value="production">운영</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="success">성공</MenuItem>
                  <MenuItem value="failed">실패</MenuItem>
                  <MenuItem value="rollback">롤백</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="검색"
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                placeholder="프로젝트명, 배포자, 버전으로 검색"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 배포 히스토리 테이블 */}
      <Card>
        <CardContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              배포 기록 ({filteredDeployments.length}건)
            </Typography>
            <Button onClick={loadDeploymentHistory}>
              새로고침
            </Button>
          </Box>

          {filteredDeployments.length === 0 ? (
            <Alert severity="info">
              조회 결과가 없습니다.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>버전</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>배포자</TableCell>
                    <TableCell>배포일시</TableCell>
                    <TableCell>소요시간</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDeployments.map((deployment) => (
                    <TableRow key={deployment.id} hover>
                      <TableCell>{deployment.project_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={deployment.environment} 
                          color={deployment.environment === 'production' ? 'error' : 'default'}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{deployment.version}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(deployment.status)} 
                          color={getStatusColor(deployment.status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{deployment.deployed_by}</TableCell>
                      <TableCell>{new Date(deployment.deployed_at).toLocaleString('ko-KR')}</TableCell>
                      <TableCell>{deployment.duration_seconds}초</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            size="small" 
                            onClick={() => {
                              setSelectedDeployment(deployment);
                              setDetailDialog(true);
                            }}
                          >
                            상세
                          </Button>
                          {deployment.status === 'success' && (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="warning"
                              onClick={() => {
                                setSelectedDeployment(deployment);
                                setRollbackDialog(true);
                              }}
                            >
                              롤백
                            </Button>
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
        <DialogTitle>배포 상세 정보</DialogTitle>
        <DialogContent>
          {selectedDeployment && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">프로젝트명</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedDeployment.project_name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">환경</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedDeployment.environment}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">버전</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedDeployment.version}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Commit Hash</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedDeployment.commit_hash}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">레포지토리</Typography>
                  <Typography variant="body1">{selectedDeployment.repository_url}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">배포자</Typography>
                  <Typography variant="body1">{selectedDeployment.deployed_by}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">소요시간</Typography>
                  <Typography variant="body1">{selectedDeployment.duration_seconds}초</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 롤백 확인 다이얼로그 */}
      <Dialog open={rollbackDialog} onClose={() => setRollbackDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>롤백 확인</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다!
          </Alert>
          <Typography variant="body2" paragraph>
            다음 배포를 이전 버전으로 롤백하시겠습니까?
          </Typography>
          {selectedDeployment && (
            <Box>
              <Typography variant="body2">
                <strong>프로젝트:</strong> {selectedDeployment.project_name}
              </Typography>
              <Typography variant="body2">
                <strong>환경:</strong> {selectedDeployment.environment}
              </Typography>
              <Typography variant="body2">
                <strong>버전:</strong> {selectedDeployment.version}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialog(false)}>
            취소
          </Button>
          <Button 
            onClick={handleRollback} 
            variant="contained" 
            color="warning"
          >
            롤백 실행
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeploymentHistory;

