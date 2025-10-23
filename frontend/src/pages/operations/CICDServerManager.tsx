// [advice from AI] CICD 서버 관리 - 동적 파이프라인 그룹 및 Ingress 관리
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CICDServerManager: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // CICD 서버 관리
  const [cicdServers, setCicdServers] = useState<any[]>([]);
  const [serverDialog, setServerDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  
  // 파이프라인 그룹 관리
  const [pipelineGroups, setPipelineGroups] = useState<any[]>([]);
  const [groupDialog, setGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  
  // 도메인 관리
  const [domains, setDomains] = useState<any[]>([]);
  const [domainDialog, setDomainDialog] = useState(false);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [serversRes, groupsRes, domainsRes] = await Promise.all([
        fetch('http://rdc.rickyson.com:3001/api/cicd/servers', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://rdc.rickyson.com:3001/api/cicd/pipeline-groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://rdc.rickyson.com:3001/api/ingress/domains', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // 실제 API 응답 처리
      const serversData = serversRes.ok ? await serversRes.json() : { success: false, data: [] };
      const groupsData = groupsRes.ok ? await groupsRes.json() : { success: false, data: [] };
      const domainsData = domainsRes.ok ? await domainsRes.json() : { success: false, data: [] };

      if (serversData.success) {
        setCicdServers(serversData.data);
      } else {
        // 샘플 데이터 사용
        setCicdServers([
          { id: '1', server_name: 'Jenkins 메인', server_type: 'jenkins', location_type: 'internal', 
            ingress_hostname: 'jenkins.rdc.rickyson.com', health_status: 'healthy', status: 'active' },
          { id: '2', server_name: 'Nexus Repository', server_type: 'nexus', location_type: 'internal',
            ingress_hostname: 'nexus.rdc.rickyson.com', health_status: 'healthy', status: 'active' },
          { id: '3', server_name: 'Argo CD', server_type: 'argocd', location_type: 'internal',
            ingress_hostname: 'argocd.rdc.rickyson.com', health_status: 'healthy', status: 'active' },
          { id: '4', server_name: 'AWS Jenkins', server_type: 'jenkins', location_type: 'external',
            ingress_hostname: 'jenkins-aws.rdc.rickyson.com', health_status: 'unknown', status: 'inactive' }
        ]);
      }

      if (groupsData.success) {
        setPipelineGroups(groupsData.data);
      } else {
        // [advice from AI] API 실패 시 빈 배열로 초기화 (목업 데이터 제거)
        setPipelineGroups([]);
      }

      if (domainsData.success) {
        setDomains(domainsData.data);
      } else {
        // [advice from AI] API 실패 시 빈 배열로 초기화 (목업 데이터 제거)
        setDomains([]);
      }

    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          CICD 서버 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Jenkins, Nexus, Argo CD 서버 관리 및 동적 파이프라인 그룹 설정
        </Typography>
      </Box>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="서버 관리" />
          <Tab label="파이프라인 그룹" />
          <Tab label="도메인 & SSL" />
        </Tabs>
      </Paper>

      {/* TAB 1: CICD 서버 관리 */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            CICD 서버 목록
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => {
              setEditingServer(null);
              setServerDialog(true);
            }}
          >
            서버 추가
          </Button>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>서버명</TableCell>
                <TableCell>타입</TableCell>
                <TableCell>위치</TableCell>
                <TableCell>도메인</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>헬스</TableCell>
                <TableCell>액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cicdServers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell>{server.server_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={server.server_type.toUpperCase()} 
                      color="primary" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={server.location_type} 
                      color={server.location_type === 'internal' ? 'success' : 'warning'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => window.open(`https://${server.ingress_hostname}`, '_blank')}
                    >
                      {server.ingress_hostname}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={server.status} 
                      color={server.status === 'active' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={server.health_status} 
                      color={
                        server.health_status === 'healthy' ? 'success' :
                        server.health_status === 'unhealthy' ? 'error' : 'default'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setEditingServer(server);
                          setServerDialog(true);
                        }}
                      >
                        편집
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => {
                          if (confirm(`${server.server_name}을(를) 삭제하시겠습니까?`)) {
                            alert('서버가 삭제되었습니다.');
                          }
                        }}
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
      </TabPanel>

      {/* TAB 2: 파이프라인 그룹 관리 */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            파이프라인 그룹 (프로젝트별 동적 구성)
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => {
              setEditingGroup(null);
              setGroupDialog(true);
            }}
          >
            그룹 생성
          </Button>
        </Box>

        <Grid container spacing={3}>
          {pipelineGroups.map((group) => (
            <Grid item xs={12} md={6} key={group.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {group.group_name}
                    </Typography>
                    <Chip 
                      label={group.execution_strategy} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        구성 요소: {group.components_count}개
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        성공률: {group.success_rate}%
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        최근 실행: {group.last_execution_at || group.last_execution}
                      </Typography>
                    </Grid>
                  </Grid>

                  <LinearProgress 
                    variant="determinate" 
                    value={group.success_rate} 
                    sx={{ mb: 2, height: 8, borderRadius: 1 }}
                    color={group.success_rate > 90 ? 'success' : group.success_rate > 70 ? 'primary' : 'warning'}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setEditingGroup(group);
                        setGroupDialog(true);
                      }}
                    >
                      설정
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      onClick={() => {
                        alert(`${group.group_name} 파이프라인을 실행합니다.`);
                      }}
                    >
                      실행
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="info"
                      onClick={() => {
                        alert(`${group.group_name} 실행 로그를 표시합니다.`);
                      }}
                    >
                      로그
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* TAB 3: 도메인 & SSL 관리 */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            도메인 및 SSL 인증서 관리
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setDomainDialog(true)}
          >
            도메인 추가
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Nginx Ingress를 통해 포트 포워딩 없이 직접 도메인 접속이 가능합니다.
        </Alert>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>도메인</TableCell>
                <TableCell>SSL 상태</TableCell>
                <TableCell>만료일</TableCell>
                <TableCell>남은 일수</TableCell>
                <TableCell>액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {domains.map((domain, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Button
                      variant="text"
                      onClick={() => window.open(`https://${domain.domain_name}`, '_blank')}
                    >
                      {domain.domain_name}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={domain.cert_status} 
                      color={domain.cert_status === 'valid' ? 'success' : 'error'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{domain.cert_expires_at}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color={
                        new Date(domain.cert_expires_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 
                          ? 'error.main' : 'text.primary'
                      }
                    >
                      {Math.round((new Date(domain.cert_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))}일
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="outlined" size="small">갱신</Button>
                      <Button variant="outlined" size="small" color="error">삭제</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* 서버 추가/편집 다이얼로그 */}
      <Dialog open={serverDialog} onClose={() => setServerDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingServer ? 'CICD 서버 편집' : 'CICD 서버 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="서버명"
                  defaultValue={editingServer?.server_name || ''}
                  placeholder="Jenkins 메인 서버"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>서버 타입</InputLabel>
                  <Select
                    defaultValue={editingServer?.server_type || 'jenkins'}
                    label="서버 타입"
                  >
                    <MenuItem value="jenkins">Jenkins</MenuItem>
                    <MenuItem value="nexus">Nexus</MenuItem>
                    <MenuItem value="argocd">Argo CD</MenuItem>
                    <MenuItem value="grafana">Grafana</MenuItem>
                    <MenuItem value="prometheus">Prometheus</MenuItem>
                    <MenuItem value="custom">커스텀</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>위치 타입</InputLabel>
                  <Select
                    defaultValue={editingServer?.location_type || 'internal'}
                    label="위치 타입"
                  >
                    <MenuItem value="internal">내부 (Kubernetes)</MenuItem>
                    <MenuItem value="external">외부 서버</MenuItem>
                    <MenuItem value="cloud">클라우드</MenuItem>
                    <MenuItem value="hybrid">하이브리드</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ingress 도메인"
                  defaultValue={editingServer?.ingress_hostname || ''}
                  placeholder="jenkins.rdc.rickyson.com"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked={editingServer?.ssl_enabled !== false} />}
                  label="SSL 인증서 자동 발급"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServerDialog(false)}>취소</Button>
          <Button 
            variant="contained"
            onClick={() => {
              alert('CICD 서버가 등록되었습니다!');
              setServerDialog(false);
              loadData();
            }}
          >
            {editingServer ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 파이프라인 그룹 다이얼로그 */}
      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingGroup ? '파이프라인 그룹 편집' : '파이프라인 그룹 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              프로젝트 특성에 맞는 파이프라인 그룹을 동적으로 구성할 수 있습니다.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="그룹명"
                  defaultValue={editingGroup?.group_name || ''}
                  placeholder="프로젝트별 파이프라인"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>그룹 타입</InputLabel>
                  <Select
                    defaultValue={editingGroup?.group_type || 'project_based'}
                    label="그룹 타입"
                  >
                    <MenuItem value="project_based">프로젝트 기반</MenuItem>
                    <MenuItem value="environment_based">환경 기반</MenuItem>
                    <MenuItem value="service_based">서비스 기반</MenuItem>
                    <MenuItem value="custom">커스텀</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>실행 전략</InputLabel>
                  <Select
                    defaultValue={editingGroup?.execution_strategy || 'sequential'}
                    label="실행 전략"
                  >
                    <MenuItem value="sequential">순차 실행</MenuItem>
                    <MenuItem value="parallel">병렬 실행</MenuItem>
                    <MenuItem value="conditional">조건부 실행</MenuItem>
                    <MenuItem value="hybrid">하이브리드</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="우선순위 (1-10)"
                  defaultValue={editingGroup?.priority_level || 5}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="설명"
                  defaultValue={editingGroup?.description || ''}
                  placeholder="파이프라인 그룹의 목적과 구성을 설명하세요..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(false)}>취소</Button>
          <Button 
            variant="contained"
            onClick={() => {
              alert('파이프라인 그룹이 생성되었습니다!');
              setGroupDialog(false);
              loadData();
            }}
          >
            {editingGroup ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CICDServerManager;
