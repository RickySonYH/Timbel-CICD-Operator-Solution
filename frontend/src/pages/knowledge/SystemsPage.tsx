// [advice from AI] 시스템 관리 페이지 - 솔루션 및 시스템 아키텍처 관리
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] 시스템 데이터 타입 (레포지토리 중심 재정의)
interface System {
  id: string;
  name: string;
  description: string;
  domain_name: string;
  domain_id: string;
  owner: string;
  
  // 레포지토리 정보 (핵심)
  repository_url: string;
  repository_branch: string;
  last_commit_hash?: string;
  last_commit_message?: string;
  last_commit_date?: string;
  
  // 개발 단계 관리 (배포 상태 대신)
  development_stage: 'development' | 'staging' | 'production';
  code_status: 'active' | 'inactive' | 'deprecated' | 'archived';
  version: string;
  
  // 기술 정보
  type: 'web' | 'api' | 'database' | 'microservice' | 'mobile' | 'desktop' | 'ai_service';
  architecture: 'monolithic' | 'microservices' | 'serverless' | 'hybrid';
  tech_stack: string[];
  language: string;
  framework: string;
  
  // 배포 준비도
  has_dockerfile: boolean;
  has_k8s_manifests: boolean;
  deployment_ready: boolean;
  
  // 자동 등록 여부
  auto_registered: boolean;
  registration_source: 'manual' | 'repository_deploy' | 'project_completion';
  
  // 연결된 자원
  components_count: number;
  apis_count: number;
  documentation_url: string;
  
  created_at: string;
  updated_at: string;
}

// [advice from AI] 시스템 메트릭 타입
interface SystemMetrics {
  totalSystems: number;
  activeSystems: number;
  healthySystems: number;
  deployedSystems: number;
  typeBreakdown: { [key: string]: number };
  architectureBreakdown: { [key: string]: number };
  deploymentBreakdown: { [key: string]: number };
}

const SystemsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [systems, setSystems] = useState<System[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [domains, setDomains] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain_id: '',
    status: 'development' as System['status'],
    version: '1.0.0',
    type: 'web' as System['type'],
    architecture: 'monolithic' as System['architecture'],
    tech_stack: [] as string[],
    repository_url: '',
    documentation_url: '',
    deployment_status: 'not_deployed' as System['deployment_status']
  });

  // [advice from AI] 기술 스택 옵션
  const techStackOptions = [
    'React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'NestJS',
    'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Kotlin',
    'TypeScript', 'JavaScript', 'PostgreSQL', 'MySQL', 'MongoDB',
    'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Jenkins', 'GitLab CI', 'GitHub Actions', 'Terraform'
  ];

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 시스템 목록과 메트릭을 병렬로 로드
      const [systemsRes, metricsRes, domainsRes] = await Promise.all([
        fetch('/api/knowledge/systems', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/knowledge/systems/metrics', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/knowledge/domains', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (systemsRes.ok) {
        const systemsData = await systemsRes.json();
        setSystems(systemsData.systems || []);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);
      }

      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        setDomains(domainsData.domains || []);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 시스템 생성
  const handleCreateSystem = async () => {
    try {
      const response = await fetch('/api/knowledge/systems', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          owner_id: user?.id,
          tech_stack: formData.tech_stack.join(',')
        })
      });

      if (!response.ok) {
        throw new Error('시스템 생성 실패');
      }

      setCreateDialog(false);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('시스템 생성 실패:', error);
    }
  };

  // [advice from AI] 시스템 수정
  const handleUpdateSystem = async () => {
    if (!selectedSystem) return;

    try {
      const response = await fetch(`/api/knowledge/systems/${selectedSystem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          tech_stack: formData.tech_stack.join(',')
        })
      });

      if (!response.ok) {
        throw new Error('시스템 수정 실패');
      }

      setEditDialog(false);
      setSelectedSystem(null);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('시스템 수정 실패:', error);
    }
  };

  // [advice from AI] 시스템 삭제
  const handleDeleteSystem = async (systemId: string) => {
    if (!confirm('정말로 이 시스템을 삭제하시겠습니까? 연관된 컴포넌트와 API도 함께 삭제됩니다.')) return;

    try {
      const response = await fetch(`/api/knowledge/systems/${systemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('시스템 삭제 실패');
      }

      loadData();
      
    } catch (error) {
      console.error('시스템 삭제 실패:', error);
    }
  };

  // [advice from AI] 시스템 상세보기
  const handleViewSystem = (system: System) => {
    setSelectedSystem(system);
    setViewDialog(true);
  };

  // [advice from AI] 시스템 편집
  const handleEditSystem = (system: System) => {
    setSelectedSystem(system);
    setFormData({
      name: system.name,
      description: system.description,
      domain_id: system.domain_id,
      status: system.status,
      version: system.version,
      type: system.type,
      architecture: system.architecture,
      tech_stack: system.tech_stack || [],
      repository_url: system.repository_url,
      documentation_url: system.documentation_url,
      deployment_status: system.deployment_status
    });
    setEditDialog(true);
  };

  // [advice from AI] 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      domain_id: '',
      status: 'development',
      version: '1.0.0',
      type: 'web',
      architecture: 'monolithic',
      tech_stack: [],
      repository_url: '',
      documentation_url: '',
      deployment_status: 'not_deployed'
    });
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'development': return 'info';
      case 'inactive': return 'warning';
      case 'deprecated': return 'error';
      default: return 'default';
    }
  };

  // [advice from AI] 배포 상태별 색상
  const getDeploymentStatusColor = (status: string) => {
    switch (status) {
      case 'production': return 'success';
      case 'staging': return 'warning';
      case 'development': return 'info';
      case 'not_deployed': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 건강 상태별 색상
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'unknown': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 필터링된 시스템 목록 (개발 단계별)
  const filteredSystems = systems.filter(system => {
    const matchesSearch = system.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         system.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         system.tech_stack.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         system.repository_url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || system.code_status === statusFilter;
    const matchesType = typeFilter === 'all' || system.type === typeFilter;
    
    // 탭별 필터링 (개발 단계별)
    let matchesTab = true;
    if (tabValue === 1) matchesTab = system.development_stage === 'development';
    if (tabValue === 2) matchesTab = system.development_stage === 'staging';
    if (tabValue === 3) matchesTab = system.development_stage === 'production';
    if (tabValue === 4) matchesTab = system.auto_registered === true;
    
    return matchesSearch && matchesStatus && matchesType && matchesTab;
  });

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          시스템 관리
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          시스템 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          완성된 GitHub 레포지토리 기반 시스템을 관리합니다. 개발/스테이징/프로덕션 단계별로 진행 상황을 추적합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 메트릭 대시보드 */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 시스템
                </Typography>
                <Typography variant="h4" color="primary">
                  {metrics.totalSystems}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  활성: {metrics.activeSystems}개
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  건강한 시스템
                </Typography>
                <Typography variant="h4" color="success.main">
                  {metrics.healthySystems}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  전체의 {Math.round((metrics.healthySystems / metrics.totalSystems) * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  배포된 시스템
                </Typography>
                <Typography variant="h4" color="info.main">
                  {metrics.deployedSystems}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  운영 환경 배포 완료
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  마이크로서비스
                </Typography>
                <Typography variant="h4" color="secondary.main">
                  {metrics.architectureBreakdown?.microservices || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  현대적 아키텍처
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 탭 네비게이션 (개발 단계별) */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`전체 (${systems.length})`} />
        <Tab label={`개발 단계 (${systems.filter(s => s.development_stage === 'development').length})`} />
        <Tab label={`스테이징 (${systems.filter(s => s.development_stage === 'staging').length})`} />
        <Tab label={`프로덕션 (${systems.filter(s => s.development_stage === 'production').length})`} />
        <Tab label={`자동 등록 (${systems.filter(s => s.auto_registered).length})`} />
      </Tabs>

      {/* [advice from AI] 검색 및 필터 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="시스템명, 설명, 기술스택으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 350 }}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>상태</InputLabel>
          <Select
            value={statusFilter}
            label="상태"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="active">활성</MenuItem>
            <MenuItem value="development">개발중</MenuItem>
            <MenuItem value="inactive">비활성</MenuItem>
            <MenuItem value="deprecated">사용중단</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>타입</InputLabel>
          <Select
            value={typeFilter}
            label="타입"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="web">웹</MenuItem>
            <MenuItem value="api">API</MenuItem>
            <MenuItem value="database">데이터베이스</MenuItem>
            <MenuItem value="microservice">마이크로서비스</MenuItem>
            <MenuItem value="mobile">모바일</MenuItem>
            <MenuItem value="desktop">데스크톱</MenuItem>
          </Select>
        </FormControl>
        {permissions.canManageSystems && (
          <Button 
            variant="contained" 
            onClick={() => setCreateDialog(true)}
            sx={{ ml: 'auto' }}
          >
            새 시스템 등록
          </Button>
        )}
      </Box>

      {/* [advice from AI] 시스템 목록 */}
      {filteredSystems.length === 0 ? (
        <Alert severity="info">
          {systems.length === 0 ? '등록된 시스템이 없습니다.' : '검색 조건에 맞는 시스템이 없습니다.'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>시스템명</TableCell>
                <TableCell>도메인</TableCell>
                <TableCell>타입/등록</TableCell>
                <TableCell>아키텍처</TableCell>
                <TableCell>개발 단계</TableCell>
                <TableCell>배포 상태</TableCell>
                <TableCell>배포 준비도</TableCell>
                <TableCell>버전</TableCell>
                <TableCell>기술 스택</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSystems.map((system) => (
                <TableRow key={system.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{system.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {system.description.length > 50 ? 
                        system.description.substring(0, 50) + '...' : 
                        system.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{system.domain_name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip 
                        label={system.type} 
                        size="small"
                        variant="outlined"
                      />
                      {system.auto_registered && (
                        <Chip 
                          label="자동등록" 
                          size="small"
                          color="info"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={system.architecture} 
                      size="small"
                      color={system.architecture === 'microservices' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={system.development_stage || 'development'} 
                      color={
                        (system.development_stage || 'development') === 'production' ? 'success' :
                        (system.development_stage || 'development') === 'staging' ? 'warning' : 'info'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={system.deployment_status} 
                      color={getDeploymentStatusColor(system.deployment_status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {system.has_dockerfile && (
                          <Chip 
                            label="Dockerfile" 
                            size="small"
                            color="success"
                            sx={{ fontSize: '0.6rem', height: 18 }}
                          />
                        )}
                        {system.has_k8s_manifests && (
                          <Chip 
                            label="K8s" 
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.6rem', height: 18 }}
                          />
                        )}
                      </Box>
                      {system.deployment_ready && (
                        <Chip 
                          label="배포준비완료" 
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 18 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{system.version}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {system.tech_stack.slice(0, 3).map((tech, index) => (
                        <Chip 
                          key={index}
                          label={tech} 
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                      {system.tech_stack.length > 3 && (
                        <Chip 
                          label={`+${system.tech_stack.length - 3}`} 
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="상세보기">
                      <IconButton size="small" onClick={() => handleViewSystem(system)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {permissions.canManageSystems && (
                      <>
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleEditSystem(system)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" color="error" onClick={() => handleDeleteSystem(system.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* [advice from AI] 시스템 생성 대화상자 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>새 시스템 등록</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                margin="dense"
                label="시스템명"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>도메인</InputLabel>
                <Select
                  value={formData.domain_id}
                  label="도메인"
                  onChange={(e) => setFormData({ ...formData, domain_id: e.target.value })}
                >
                  {domains.map((domain) => (
                    <MenuItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="설명"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="dense">
                <InputLabel>시스템 타입</InputLabel>
                <Select
                  value={formData.type}
                  label="시스템 타입"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="web">웹 애플리케이션</MenuItem>
                  <MenuItem value="api">API 서버</MenuItem>
                  <MenuItem value="database">데이터베이스</MenuItem>
                  <MenuItem value="microservice">마이크로서비스</MenuItem>
                  <MenuItem value="mobile">모바일 앱</MenuItem>
                  <MenuItem value="desktop">데스크톱 앱</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="dense">
                <InputLabel>아키텍처</InputLabel>
                <Select
                  value={formData.architecture}
                  label="아키텍처"
                  onChange={(e) => setFormData({ ...formData, architecture: e.target.value as any })}
                >
                  <MenuItem value="monolithic">모놀리식</MenuItem>
                  <MenuItem value="microservices">마이크로서비스</MenuItem>
                  <MenuItem value="serverless">서버리스</MenuItem>
                  <MenuItem value="hybrid">하이브리드</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                margin="dense"
                label="버전"
                fullWidth
                variant="outlined"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="저장소 URL"
                fullWidth
                variant="outlined"
                value={formData.repository_url}
                onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="문서 URL"
                fullWidth
                variant="outlined"
                value={formData.documentation_url}
                onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>기술 스택</InputLabel>
                <Select
                  multiple
                  value={formData.tech_stack}
                  label="기술 스택"
                  onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {techStackOptions.map((tech) => (
                    <MenuItem key={tech} value={tech}>
                      {tech}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button onClick={handleCreateSystem} variant="contained">등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 시스템 상세보기 대화상자 */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>시스템 상세 정보</DialogTitle>
        <DialogContent>
          {selectedSystem && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedSystem.name}</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedSystem.description}</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>기본 정보</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="도메인" secondary={selectedSystem.domain_name} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="소유자" secondary={selectedSystem.owner} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="버전" secondary={selectedSystem.version} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="타입" secondary={selectedSystem.type} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="아키텍처" secondary={selectedSystem.architecture} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>상태 정보</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="시스템 상태" 
                        secondary={
                          <Chip 
                            label={selectedSystem.status} 
                            color={getStatusColor(selectedSystem.status) as any}
                            size="small"
                          />
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="배포 상태" 
                        secondary={
                          <Chip 
                            label={selectedSystem.deployment_status} 
                            color={getDeploymentStatusColor(selectedSystem.deployment_status) as any}
                            size="small"
                          />
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="건강 상태" 
                        secondary={
                          <Chip 
                            label={selectedSystem.health_status} 
                            color={getHealthStatusColor(selectedSystem.health_status) as any}
                            size="small"
                          />
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="컴포넌트 수" secondary={`${selectedSystem.components_count}개`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="API 수" secondary={`${selectedSystem.apis_count}개`} />
                    </ListItem>
                  </List>
                </Grid>
                {selectedSystem.tech_stack.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>기술 스택</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedSystem.tech_stack.map((tech, index) => (
                        <Chip key={index} label={tech} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}
                {(selectedSystem.repository_url || selectedSystem.documentation_url) && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>링크</Typography>
                    {selectedSystem.repository_url && (
                      <Button 
                        href={selectedSystem.repository_url} 
                        target="_blank" 
                        size="small" 
                        sx={{ mr: 1 }}
                      >
                        저장소
                      </Button>
                    )}
                    {selectedSystem.documentation_url && (
                      <Button 
                        href={selectedSystem.documentation_url} 
                        target="_blank" 
                        size="small"
                      >
                        문서
                      </Button>
                    )}
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>닫기</Button>
          {permissions.canManageSystems && (
            <Button onClick={() => {
              setViewDialog(false);
              if (selectedSystem) handleEditSystem(selectedSystem);
            }} variant="contained">
              수정
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          시스템 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default SystemsPage;
