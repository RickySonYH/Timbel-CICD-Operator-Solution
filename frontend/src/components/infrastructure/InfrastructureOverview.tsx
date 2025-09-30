import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import InfrastructureDialog from './InfrastructureDialog';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface Infrastructure {
  id: string;
  service_name: string;
  service_type: string;
  environment: string;
  service_url: string;
  admin_username: string;
  admin_password_encrypted?: string;
  service_accounts?: any;
  description?: string;
  tags?: any;
  health_check_url?: string;
  metadata?: any;
  status?: string;
  health_status?: string;
  health_message?: string;
  response_time_ms?: number;
  last_health_check?: string;
  created_at: string;
  updated_at: string;
}

const getApiUrl = (): string => {
  const currentHost = window.location.host;
  
  if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
    return 'http://localhost:3001';
  } else {
    return `http://${currentHost.split(':')[0]}:3001`;
  }
};

const InfrastructureOverview: React.FC = () => {
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInfrastructure, setEditingInfrastructure] = useState<Infrastructure | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const { token } = useJwtAuthStore();

  const fetchInfrastructures = async () => {
    try {
      setError(null);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/deployment-infrastructure`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setInfrastructures(data.data);
      } else {
        throw new Error(data.message || '인프라 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 인프라 목록 조회 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchInfrastructures();
    }
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInfrastructures();
  };

  const handleAdd = () => {
    setEditingInfrastructure(null);
    setDialogOpen(true);
  };

  const handleEdit = (infrastructure: Infrastructure) => {
    setEditingInfrastructure(infrastructure);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말로 이 인프라를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/deployment-infrastructure/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchInfrastructures(); // 목록 새로고침
      } else {
        throw new Error(data.message || '인프라 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 인프라 삭제 실패:', error);
      alert(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDialogClose = (shouldRefresh?: boolean) => {
    setDialogOpen(false);
    setEditingInfrastructure(null);
    if (shouldRefresh) {
      fetchInfrastructures();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'success';
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'maintenance': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHealthStatusColor = (healthStatus?: string) => {
    switch (healthStatus) {
      case 'active': return 'success';
      case 'healthy': return 'success';
      case 'inactive': return 'warning';
      case 'timeout': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'nexus': return 'Nexus Repository';
      case 'docker_registry': return 'Docker Registry';
      case 'jenkins': return 'Jenkins CI/CD';
      case 'argocd': return 'Argo CD';
      default: return serviceType;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="h2">
              배포 인프라 관리
            </Typography>
            <Box>
              <Tooltip title="새로고침">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                sx={{ ml: 1 }}
              >
                인프라 추가
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 통계 요약 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {infrastructures.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  전체 인프라
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {infrastructures.filter(i => i.status === 'active').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  활성 상태
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {infrastructures.filter(i => i.health_status === 'active' || i.health_status === 'healthy').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  정상 상태
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {infrastructures.filter(i => i.health_status === 'error' || i.health_status === 'inactive' || i.health_status === 'timeout').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  오류 상태
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>서비스 타입</TableCell>
                  <TableCell>환경</TableCell>
                  <TableCell>서비스 URL</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>헬스 상태</TableCell>
                  <TableCell>관리자</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {infrastructures.map((infrastructure) => (
                  <TableRow key={infrastructure.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {infrastructure.service_name || getServiceTypeLabel(infrastructure.service_type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={infrastructure.environment || 'Global'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {infrastructure.service_url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={infrastructure.status}
                        size="small"
                        color={getStatusColor(infrastructure.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={infrastructure.health_message || ''}>
                        <Chip
                          label={infrastructure.health_status || 'Unknown'}
                          size="small"
                          color={getHealthStatusColor(infrastructure.health_status) as any}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {infrastructure.admin_username || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="편집">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(infrastructure)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(infrastructure.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {infrastructures.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        등록된 인프라가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <InfrastructureDialog
        open={dialogOpen}
        infrastructure={editingInfrastructure}
        onClose={handleDialogClose}
      />
    </Box>
  );
};

export default InfrastructureOverview;