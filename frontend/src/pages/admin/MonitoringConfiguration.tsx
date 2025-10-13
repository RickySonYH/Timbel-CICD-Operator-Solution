// [advice from AI] 모니터링 설정 페이지 - Prometheus/Grafana 연결 및 서버 등록 관리
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 모니터링 설정 타입
interface MonitoringConfig {
  id: string;
  config_name: string;
  config_type: 'prometheus' | 'grafana' | 'custom';
  endpoint_url: string;
  api_key?: string;
  username?: string;
  status: 'connected' | 'disconnected' | 'error';
  last_check?: string;
  created_at: string;
}

// [advice from AI] 모니터링 대상 서버 타입
interface MonitoredServer {
  id: string;
  server_name: string;
  server_type: 'web' | 'api' | 'database' | 'cache' | 'queue' | 'other';
  ip_address: string;
  port: number;
  monitoring_config_id: string;
  system_id?: string;
  health_check_url?: string;
  status: 'online' | 'offline' | 'maintenance' | 'unknown';
  last_heartbeat?: string;
  created_at: string;
}

const MonitoringConfiguration: React.FC = () => {
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [configs, setConfigs] = useState<MonitoringConfig[]>([]);
  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [configDialog, setConfigDialog] = useState(false);
  const [serverDialog, setServerDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MonitoringConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    config_name: '',
    config_type: 'prometheus' as MonitoringConfig['config_type'],
    endpoint_url: '',
    api_key: '',
    username: '',
    password: ''
  });
  const [serverForm, setServerForm] = useState({
    server_name: '',
    server_type: 'web' as MonitoredServer['server_type'],
    ip_address: '',
    port: 80,
    monitoring_config_id: '',
    health_check_url: ''
  });

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const [configsRes, serversRes] = await Promise.all([
        fetch('/api/admin/monitoring-configs', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/monitored-servers', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (configsRes.ok) {
        const data = await configsRes.json();
        setConfigs(data.configs || []);
      }

      if (serversRes.ok) {
        const data = await serversRes.json();
        setServers(data.servers || []);
      }
      
    } catch (error) {
      console.error('모니터링 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 모니터링 설정 생성
  const handleCreateConfig = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('/api/admin/monitoring-configs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configForm)
      });

      if (!response.ok) {
        throw new Error('모니터링 설정 생성 실패');
      }

      setConfigDialog(false);
      resetConfigForm();
      loadData();
      
    } catch (error) {
      console.error('모니터링 설정 생성 실패:', error);
    }
  };

  // [advice from AI] 서버 등록
  const handleCreateServer = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('/api/admin/monitored-servers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serverForm)
      });

      if (!response.ok) {
        throw new Error('서버 등록 실패');
      }

      setServerDialog(false);
      resetServerForm();
      loadData();
      
    } catch (error) {
      console.error('서버 등록 실패:', error);
    }
  };

  // [advice from AI] 연결 테스트
  const handleTestConnection = async (configId: string) => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch(`/api/admin/monitoring-configs/${configId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('연결 테스트 실패');
      }

      const data = await response.json();
      alert(data.success ? '연결 성공!' : `연결 실패: ${data.error}`);
      loadData();
      
    } catch (error) {
      console.error('연결 테스트 실패:', error);
      alert('연결 테스트 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 폼 초기화
  const resetConfigForm = () => {
    setConfigForm({
      config_name: '',
      config_type: 'prometheus',
      endpoint_url: '',
      api_key: '',
      username: '',
      password: ''
    });
  };

  const resetServerForm = () => {
    setServerForm({
      server_name: '',
      server_type: 'web',
      ip_address: '',
      port: 80,
      monitoring_config_id: '',
      health_check_url: ''
    });
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': 
      case 'online': return 'success';
      case 'disconnected': 
      case 'offline': return 'error';
      case 'maintenance': return 'warning';
      case 'unknown': 
      case 'error': return 'default';
      default: return 'default';
    }
  };

  useEffect(() => {
    if (permissions.canViewSystemAdmin) {
      loadData();
    }
  }, [permissions.canViewSystemAdmin]);

  if (!permissions.canViewSystemAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          모니터링 설정에 접근할 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          모니터링 설정
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        모니터링 설정
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Prometheus, Grafana 연결 및 모니터링 대상 서버를 관리합니다
      </Typography>

      {/* [advice from AI] 현재 상태 알림 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        현재 모니터링 설정이 없습니다. SLA 데이터 수집을 위해 모니터링 시스템을 연결하세요.
      </Alert>

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`모니터링 연결 (${configs.length})`} />
        <Tab label={`등록된 서버 (${servers.length})`} />
        <Tab label="연결 테스트" />
      </Tabs>

      {/* [advice from AI] 모니터링 연결 설정 탭 */}
      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">모니터링 시스템 연결</Typography>
            <Button variant="contained" onClick={() => setConfigDialog(true)}>
              새 연결 추가
            </Button>
          </Box>

          {configs.length === 0 ? (
            <Alert severity="warning">
              설정된 모니터링 연결이 없습니다. Prometheus 또는 Grafana를 연결하세요.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {configs.map((config) => (
                <Grid item xs={12} md={6} lg={4} key={config.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {config.config_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {config.config_type.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {config.endpoint_url}
                      </Typography>
                      <Chip 
                        label={config.status} 
                        color={getStatusColor(config.status) as any}
                        size="small"
                      />
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        onClick={() => handleTestConnection(config.id)}
                      >
                        연결 테스트
                      </Button>
                      <Button 
                        size="small" 
                        color="error"
                        onClick={() => {
                          if (confirm('이 모니터링 연결을 삭제하시겠습니까?')) {
                            // 삭제 로직
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* [advice from AI] 등록된 서버 탭 */}
      {tabValue === 1 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">모니터링 대상 서버</Typography>
            <Button 
              variant="contained" 
              onClick={() => setServerDialog(true)}
              disabled={configs.length === 0}
            >
              서버 등록
            </Button>
          </Box>

          {configs.length === 0 ? (
            <Alert severity="warning">
              먼저 모니터링 시스템을 연결해야 서버를 등록할 수 있습니다.
            </Alert>
          ) : servers.length === 0 ? (
            <Alert severity="info">
              등록된 모니터링 대상 서버가 없습니다.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>서버명</TableCell>
                    <TableCell>타입</TableCell>
                    <TableCell>IP 주소</TableCell>
                    <TableCell>포트</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>마지막 확인</TableCell>
                    <TableCell align="center">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {servers.map((server) => (
                    <TableRow key={server.id} hover>
                      <TableCell>{server.server_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={server.server_type} 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{server.ip_address}</TableCell>
                      <TableCell>{server.port}</TableCell>
                      <TableCell>
                        <Chip 
                          label={server.status} 
                          color={getStatusColor(server.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {server.last_heartbeat ? 
                          new Date(server.last_heartbeat).toLocaleString() : 
                          '확인 안됨'
                        }
                      </TableCell>
                      <TableCell align="center">
                        <Button 
                          size="small" 
                          onClick={() => {
                            // 헬스 체크 로직
                          }}
                        >
                          확인
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* [advice from AI] 연결 테스트 탭 */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>연결 테스트</Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            모든 모니터링 연결과 서버 상태를 확인합니다.
          </Alert>
          
          {configs.length === 0 ? (
            <Alert severity="warning">
              테스트할 모니터링 연결이 없습니다.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {configs.map((config) => (
                <Grid item xs={12} sm={6} md={4} key={config.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1">{config.config_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {config.endpoint_url}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={config.status} 
                          color={getStatusColor(config.status) as any}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        onClick={() => handleTestConnection(config.id)}
                      >
                        테스트
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* [advice from AI] 모니터링 설정 추가 대화상자 */}
      <Dialog open={configDialog} onClose={() => setConfigDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>모니터링 연결 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="설정명"
            fullWidth
            variant="outlined"
            value={configForm.config_name}
            onChange={(e) => setConfigForm({ ...configForm, config_name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>모니터링 타입</InputLabel>
            <Select
              value={configForm.config_type}
              label="모니터링 타입"
              onChange={(e) => setConfigForm({ ...configForm, config_type: e.target.value as any })}
            >
              <MenuItem value="prometheus">Prometheus</MenuItem>
              <MenuItem value="grafana">Grafana</MenuItem>
              <MenuItem value="custom">Custom API</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="엔드포인트 URL"
            fullWidth
            variant="outlined"
            value={configForm.endpoint_url}
            onChange={(e) => setConfigForm({ ...configForm, endpoint_url: e.target.value })}
            placeholder="http://prometheus:9090 또는 http://grafana:3000"
            sx={{ mb: 2 }}
          />
          {configForm.config_type === 'grafana' && (
            <>
              <TextField
                margin="dense"
                label="사용자명"
                fullWidth
                variant="outlined"
                value={configForm.username}
                onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="비밀번호"
                type="password"
                fullWidth
                variant="outlined"
                value={configForm.password}
                onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                sx={{ mb: 2 }}
              />
            </>
          )}
          <TextField
            margin="dense"
            label="API 키 (선택사항)"
            fullWidth
            variant="outlined"
            value={configForm.api_key}
            onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog(false)}>취소</Button>
          <Button onClick={handleCreateConfig} variant="contained">추가</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 서버 등록 대화상자 */}
      <Dialog open={serverDialog} onClose={() => setServerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>모니터링 대상 서버 등록</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="서버명"
            fullWidth
            variant="outlined"
            value={serverForm.server_name}
            onChange={(e) => setServerForm({ ...serverForm, server_name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>서버 타입</InputLabel>
            <Select
              value={serverForm.server_type}
              label="서버 타입"
              onChange={(e) => setServerForm({ ...serverForm, server_type: e.target.value as any })}
            >
              <MenuItem value="web">웹 서버</MenuItem>
              <MenuItem value="api">API 서버</MenuItem>
              <MenuItem value="database">데이터베이스</MenuItem>
              <MenuItem value="cache">캐시 서버</MenuItem>
              <MenuItem value="queue">메시지 큐</MenuItem>
              <MenuItem value="other">기타</MenuItem>
            </Select>
          </FormControl>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                margin="dense"
                label="IP 주소"
                fullWidth
                variant="outlined"
                value={serverForm.ip_address}
                onChange={(e) => setServerForm({ ...serverForm, ip_address: e.target.value })}
                placeholder="192.168.1.100"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                margin="dense"
                label="포트"
                type="number"
                fullWidth
                variant="outlined"
                value={serverForm.port}
                onChange={(e) => setServerForm({ ...serverForm, port: parseInt(e.target.value) || 80 })}
              />
            </Grid>
          </Grid>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>모니터링 설정</InputLabel>
            <Select
              value={serverForm.monitoring_config_id}
              label="모니터링 설정"
              onChange={(e) => setServerForm({ ...serverForm, monitoring_config_id: e.target.value })}
            >
              {configs.map((config) => (
                <MenuItem key={config.id} value={config.id}>
                  {config.config_name} ({config.config_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="헬스체크 URL (선택사항)"
            fullWidth
            variant="outlined"
            value={serverForm.health_check_url}
            onChange={(e) => setServerForm({ ...serverForm, health_check_url: e.target.value })}
            placeholder="/health 또는 /api/status"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServerDialog(false)}>취소</Button>
          <Button onClick={handleCreateServer} variant="contained">등록</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MonitoringConfiguration;
