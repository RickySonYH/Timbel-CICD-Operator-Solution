// [advice from AI] Kubernetes 클러스터 관리 - 멀티 클러스터 배포 지원
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 클러스터 타입
interface Cluster {
  id: string;
  cluster_name: string;
  cluster_type: 'development' | 'staging' | 'production' | 'dr';
  api_server_url: string;
  region: string;
  cloud_provider: string;
  status: 'active' | 'maintenance' | 'inactive';
  kubernetes_version: string;
  node_count: number;
  total_cpu_cores: number;
  total_memory_gb: number;
  is_default: boolean;
  is_connected: boolean;
  last_health_check: string;
  namespace_count: number;
  deployment_count: number;
  description: string;
}

// [advice from AI] 네임스페이스 타입
interface Namespace {
  id: string;
  namespace_name: string;
  environment: string;
  pod_count: number;
  status: string;
}

const ClusterManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  
  // 다이얼로그 상태
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [namespaceDialog, setNamespaceDialog] = useState(false);
  
  // 폼 상태
  const [clusterForm, setClusterForm] = useState({
    cluster_name: '',
    cluster_type: 'development',
    api_server_url: '',
    region: '',
    cloud_provider: 'on-premise',
    kubernetes_version: '',
    description: '',
    is_default: false,
    ingress_class: '',
    storage_class: '',
    auth_type: 'kubeconfig'
  });

  // 프로바이더 기본 설정
  const [providerDefaults, setProviderDefaults] = useState<any>(null);

  const [namespaceForm, setNamespaceForm] = useState({
    namespace_name: '',
    environment: 'development',
    cpu_limit: '2',
    memory_limit: '4Gi',
    storage_limit: '10Gi'
  });

  // [advice from AI] 클러스터 목록 로드
  const loadClusters = async () => {
    try {
      setLoading(true);
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch('http://localhost:3001/api/clusters/clusters', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClusters(data.clusters || []);
      }
    } catch (error) {
      console.error('클러스터 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 네임스페이스 목록 로드
  const loadNamespaces = async (clusterId: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/clusters/clusters/${clusterId}/namespaces`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNamespaces(data.namespaces || []);
      }
    } catch (error) {
      console.error('네임스페이스 목록 로드 실패:', error);
    }
  };

  useEffect(() => {
    loadClusters();
  }, []);

  // [advice from AI] 프로바이더 변경 시 기본 설정 로드
  const loadProviderDefaults = async (provider: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/clusters/provider-defaults/${provider}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProviderDefaults(data.defaults);
        
        // 기본값 자동 적용
        setClusterForm(prev => ({
          ...prev,
          ingress_class: data.defaults.ingress_class || '',
          storage_class: data.defaults.storage_class || ''
        }));
      }
    } catch (error) {
      console.error('프로바이더 기본 설정 로드 실패:', error);
    }
  };

  // [advice from AI] 클러스터 생성
  const handleCreateCluster = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch('http://localhost:3001/api/clusters/clusters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clusterForm)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.cluster.cluster_name} 클러스터가 성공적으로 등록되었습니다.`);
        setCreateDialog(false);
        setClusterForm({
          cluster_name: '',
          cluster_type: 'development',
          api_server_url: '',
          region: '',
          cloud_provider: 'on-premise',
          kubernetes_version: '',
          description: '',
          is_default: false,
          ingress_class: '',
          storage_class: '',
          auth_type: 'kubeconfig'
        });
        setProviderDefaults(null);
        loadClusters();
      } else {
        const errorData = await response.json();
        alert(`❌ 클러스터 등록 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('클러스터 생성 실패:', error);
      alert('❌ 네트워크 오류로 클러스터 등록에 실패했습니다. 연결을 확인하세요.');
    }
  };

  // [advice from AI] 클러스터 수정
  const handleUpdateCluster = async () => {
    if (!selectedCluster) return;

    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/clusters/clusters/${selectedCluster.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clusterForm)
      });

      if (response.ok) {
        alert('클러스터 정보가 업데이트되었습니다.');
        setEditDialog(false);
        setSelectedCluster(null);
        loadClusters();
      }
    } catch (error) {
      console.error('클러스터 수정 실패:', error);
      alert('클러스터 수정에 실패했습니다.');
    }
  };

  // [advice from AI] 클러스터 삭제
  const handleDeleteCluster = async (clusterId: string) => {
    if (!confirm('이 클러스터를 삭제하시겠습니까?')) return;

    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/clusters/clusters/${clusterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('클러스터가 삭제되었습니다.');
        loadClusters();
      } else {
        const data = await response.json();
        alert(data.error || '클러스터 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('클러스터 삭제 실패:', error);
      alert('클러스터 삭제에 실패했습니다.');
    }
  };

  // [advice from AI] 헬스 체크
  const handleHealthCheck = async (clusterId: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch(`http://localhost:3001/api/clusters/clusters/${clusterId}/health-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const cluster = data.cluster;
        if (data.is_healthy) {
          alert(`✅ ${cluster.cluster_name} 클러스터가 정상적으로 연결되었습니다.\n연결 시간: ${new Date().toLocaleTimeString()}`);
        } else {
          alert(`❌ ${cluster.cluster_name} 클러스터 연결에 실패했습니다.\nAPI Server: ${cluster.api_server_url}\n다시 시도하거나 설정을 확인하세요.`);
        }
        loadClusters();
      } else {
        const errorData = await response.json();
        alert(`❌ 헬스 체크 실패: ${errorData.error}`);
      }
    } catch (error) {
      console.error('헬스 체크 실패:', error);
      alert('❌ 네트워크 오류로 헬스 체크에 실패했습니다.');
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" } = {
      'active': 'success',
      'maintenance': 'warning',
      'inactive': 'error'
    };
    return colors[status] || 'default';
  };

  // [advice from AI] 환경별 색상
  const getTypeColor = (type: string) => {
    const colors: { [key: string]: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" } = {
      'development': 'info',
      'staging': 'warning',
      'production': 'error',
      'dr': 'secondary'
    };
    return colors[type] || 'default';
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
          클러스터 관리
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Kubernetes 클러스터를 등록하고 관리합니다. 멀티 클러스터 배포를 지원합니다.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>실사용 클러스터 관리 가이드:</strong><br/>
            • <strong>클러스터 등록</strong>: 실제 Kubernetes 클러스터의 API Server URL (예: https://k8s-api.company.com:6443)을 입력하세요.<br/>
            • <strong>프로바이더별 설정</strong>: AWS EKS, GCP GKE, Azure AKS 등 선택 시 최적화된 설정이 자동 적용됩니다.<br/>
            • <strong>환경별 분리</strong>: 개발/스테이징/운영 환경을 독립된 클러스터로 관리하여 안정성을 확보하세요.<br/>
            • <strong>연결 테스트</strong>: 등록 후 반드시 "연결 테스트"를 실행하여 클러스터 접근 가능성을 확인하세요.<br/>
            • <strong>보안 주의</strong>: Kubeconfig 파일은 안전한 경로에 저장하고, 접근 권한을 제한하세요.
          </Typography>
        </Alert>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                총 클러스터
              </Typography>
              <Typography variant="h3" color="primary">
                {clusters.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                활성 클러스터
              </Typography>
              <Typography variant="h3" color="success.main">
                {clusters.filter(c => c.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                연결됨
              </Typography>
              <Typography variant="h3" color="info.main">
                {clusters.filter(c => c.is_connected).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                총 노드
              </Typography>
              <Typography variant="h3">
                {clusters.reduce((sum, c) => sum + (c.node_count || 0), 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 클러스터 목록 */}
      <Card>
        <CardContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">클러스터 목록</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={loadClusters}>
                새로고침
              </Button>
              <Button variant="contained" onClick={() => setCreateDialog(true)}>
                클러스터 등록
              </Button>
            </Box>
          </Box>

          {clusters.length === 0 ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>클러스터가 등록되지 않았습니다</strong><br/>
                배포를 시작하려면 먼저 Kubernetes 클러스터를 등록하세요.<br/>
                <br/>
                <strong>권장 설정:</strong><br/>
                • 개발환경: Kind 또는 Minikube 클러스터<br/>
                • 운영환경: AWS EKS, GCP GKE, 또는 On-Premise 클러스터<br/>
                • 최소 요구사항: Kubernetes v1.25 이상, 2GB RAM, 2 CPU Core
              </Typography>
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>클러스터명</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>API Server</TableCell>
                    <TableCell>리전</TableCell>
                    <TableCell>K8s 버전</TableCell>
                    <TableCell>노드</TableCell>
                    <TableCell>리소스</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>연결</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clusters.map((cluster) => (
                    <TableRow key={cluster.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {cluster.cluster_name}
                          </Typography>
                          {cluster.is_default && (
                            <Chip label="기본" color="primary" size="small" sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={cluster.cluster_type} 
                          color={getTypeColor(cluster.cluster_type)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cluster.api_server_url}
                        </Typography>
                      </TableCell>
                      <TableCell>{cluster.region || '-'}</TableCell>
                      <TableCell>{cluster.kubernetes_version || '-'}</TableCell>
                      <TableCell>{cluster.node_count || 0}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cluster.total_cpu_cores || 0}Core / {cluster.total_memory_gb || 0}GB
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={cluster.status} 
                          color={getStatusColor(cluster.status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={cluster.is_connected ? '연결됨' : '끊김'} 
                          color={cluster.is_connected ? 'success' : 'error'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button 
                            size="small"
                            onClick={() => handleHealthCheck(cluster.id)}
                          >
                            연결 테스트
                          </Button>
                          <Button 
                            size="small"
                            onClick={() => {
                              setSelectedCluster(cluster);
                              setClusterForm({
                                cluster_name: cluster.cluster_name,
                                cluster_type: cluster.cluster_type,
                                api_server_url: cluster.api_server_url,
                                region: cluster.region || '',
                                cloud_provider: cluster.cloud_provider || 'on-premise',
                                kubernetes_version: cluster.kubernetes_version || '',
                                description: cluster.description || '',
                                is_default: cluster.is_default
                              });
                              setEditDialog(true);
                            }}
                          >
                            수정
                          </Button>
                          <Button 
                            size="small"
                            onClick={() => {
                              setSelectedCluster(cluster);
                              loadNamespaces(cluster.id);
                              setNamespaceDialog(true);
                            }}
                          >
                            네임스페이스
                          </Button>
                          <Button 
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCluster(cluster.id)}
                          >
                            삭제
                          </Button>
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

      {/* 클러스터 등록 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>클러스터 등록</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 1 }}>
            Kubernetes 클러스터를 등록합니다. API Server URL과 Kubeconfig가 필요합니다.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="클러스터명"
                value={clusterForm.cluster_name}
                onChange={(e) => setClusterForm({ ...clusterForm, cluster_name: e.target.value })}
                required
                helperText="예: Timbel-Production-Cluster"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>환경 구분</InputLabel>
                <Select
                  value={clusterForm.cluster_type}
                  onChange={(e) => setClusterForm({ ...clusterForm, cluster_type: e.target.value as any })}
                  label="환경 구분"
                >
                  <MenuItem value="development">개발 (Development)</MenuItem>
                  <MenuItem value="staging">스테이징 (Staging)</MenuItem>
                  <MenuItem value="production">운영 (Production)</MenuItem>
                  <MenuItem value="dr">재해복구 (DR)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Server URL"
                value={clusterForm.api_server_url}
                onChange={(e) => setClusterForm({ ...clusterForm, api_server_url: e.target.value })}
                required
                placeholder="https://k8s-api.example.com:6443"
                helperText="Kubernetes API Server 접속 URL"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="리전"
                value={clusterForm.region}
                onChange={(e) => setClusterForm({ ...clusterForm, region: e.target.value })}
                placeholder="ap-northeast-2"
                helperText="클러스터가 위치한 리전"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>클라우드 제공자</InputLabel>
                <Select
                  value={clusterForm.cloud_provider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    setClusterForm({ ...clusterForm, cloud_provider: newProvider });
                    loadProviderDefaults(newProvider);
                  }}
                  label="클라우드 제공자"
                >
                  <MenuItem value="aws">AWS (EKS)</MenuItem>
                  <MenuItem value="gcp">Google Cloud (GKE)</MenuItem>
                  <MenuItem value="azure">Azure (AKS)</MenuItem>
                  <MenuItem value="ncp">Naver Cloud (NKS)</MenuItem>
                  <MenuItem value="on-premise">On-Premise</MenuItem>
                  <MenuItem value="kind">Kind (Local)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Kubernetes 버전"
                value={clusterForm.kubernetes_version}
                onChange={(e) => setClusterForm({ ...clusterForm, kubernetes_version: e.target.value })}
                placeholder="v1.27.3"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ingress Class"
                value={clusterForm.ingress_class}
                onChange={(e) => setClusterForm({ ...clusterForm, ingress_class: e.target.value })}
                placeholder="nginx, alb, gce"
                helperText={providerDefaults ? `권장: ${providerDefaults.ingress_class}` : '프로바이더별 자동 설정'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Storage Class"
                value={clusterForm.storage_class}
                onChange={(e) => setClusterForm({ ...clusterForm, storage_class: e.target.value })}
                placeholder="gp3, standard-rwo"
                helperText={providerDefaults ? `권장: ${providerDefaults.storage_class}` : '프로바이더별 자동 설정'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="설명"
                value={clusterForm.description}
                onChange={(e) => setClusterForm({ ...clusterForm, description: e.target.value })}
                placeholder="이 클러스터에 대한 설명을 입력하세요"
              />
            </Grid>
            {providerDefaults && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>{clusterForm.cloud_provider.toUpperCase()} 기본 설정:</strong><br/>
                    • Load Balancer: {providerDefaults.load_balancer_type}<br/>
                    • Service Type: {providerDefaults.service_type}<br/>
                    • Ingress: {providerDefaults.ingress_class}<br/>
                    • Storage: {providerDefaults.storage_class}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            취소
          </Button>
          <Button 
            onClick={handleCreateCluster} 
            variant="contained"
            disabled={!clusterForm.cluster_name || !clusterForm.api_server_url}
          >
            등록
          </Button>
        </DialogActions>
      </Dialog>

      {/* 클러스터 수정 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>클러스터 수정</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="클러스터명"
                value={clusterForm.cluster_name}
                onChange={(e) => setClusterForm({ ...clusterForm, cluster_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>환경 구분</InputLabel>
                <Select
                  value={clusterForm.cluster_type}
                  onChange={(e) => setClusterForm({ ...clusterForm, cluster_type: e.target.value as any })}
                  label="환경 구분"
                >
                  <MenuItem value="development">개발</MenuItem>
                  <MenuItem value="staging">스테이징</MenuItem>
                  <MenuItem value="production">운영</MenuItem>
                  <MenuItem value="dr">재해복구</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Server URL"
                value={clusterForm.api_server_url}
                onChange={(e) => setClusterForm({ ...clusterForm, api_server_url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="설명"
                value={clusterForm.description}
                onChange={(e) => setClusterForm({ ...clusterForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>
            취소
          </Button>
          <Button onClick={handleUpdateCluster} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 네임스페이스 다이얼로그 */}
      <Dialog open={namespaceDialog} onClose={() => setNamespaceDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          네임스페이스 관리 - {selectedCluster?.cluster_name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            이 클러스터의 네임스페이스 목록입니다.
          </Typography>
          {namespaces.length === 0 ? (
            <Alert severity="info">네임스페이스가 없습니다.</Alert>
          ) : (
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>네임스페이스</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>Pod 수</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {namespaces.map((ns) => (
                    <TableRow key={ns.id}>
                      <TableCell>{ns.namespace_name}</TableCell>
                      <TableCell>{ns.environment || '-'}</TableCell>
                      <TableCell>{ns.pod_count || 0}</TableCell>
                      <TableCell>
                        <Chip label={ns.status} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNamespaceDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClusterManagement;

