// [advice from AI] 동적 솔루션 인스턴스 관리 컴포넌트
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Build as BuildIcon,
  CloudUpload as DeployIcon,
  Storage as StorageIcon,
  Webhook as WebhookIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// [advice from AI] 솔루션 인스턴스 인터페이스 - 동적 확장 지원
interface SolutionInstance {
  id: string;
  type: string; // 동적 확장을 위해 string으로 변경
  name: string;
  url: string;
  environment: 'production' | 'staging' | 'development';
  region?: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  description?: string;
  credentials?: {
    username?: string;
    token?: string;
  };
  metrics?: Record<string, number | string>; // 동적 메트릭 지원
  created_at: string;
  updated_at: string;
}

// [advice from AI] 솔루션 타입 정의 인터페이스
interface SolutionType {
  key: string;
  name: string;
  icon: React.ReactElement;
  color: string;
  defaultPort: number;
  category: 'ci' | 'cd' | 'artifact' | 'webhook' | 'monitoring' | 'security' | 'testing';
  description?: string;
}

interface SolutionInstanceManagerProps {
  onInstanceChange?: (instances: SolutionInstance[]) => void;
}

const SolutionInstanceManager: React.FC<SolutionInstanceManagerProps> = ({ onInstanceChange }) => {
  const [instances, setInstances] = useState<SolutionInstance[]>([]);
  const [solutionTypes, setSolutionTypes] = useState<SolutionType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<SolutionInstance | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    url: '',
    environment: 'production' as 'production' | 'staging' | 'development',
    region: '',
    description: '',
    username: '',
    token: ''
  });
  const [newTypeData, setNewTypeData] = useState({
    key: '',
    name: '',
    category: 'ci' as 'ci' | 'cd' | 'artifact' | 'webhook' | 'monitoring' | 'security' | 'testing',
    defaultPort: 8080,
    description: ''
  });

  // [advice from AI] 기본 솔루션 타입 설정
  const getDefaultSolutionTypes = (): SolutionType[] => [
    // CI Solutions
    {
      key: 'jenkins',
      name: 'Jenkins CI',
      icon: <BuildIcon />,
      color: '#2196f3',
      defaultPort: 8080,
      category: 'ci',
      description: 'Continuous Integration Server'
    },
    // CD Solutions
    {
      key: 'argocd',
      name: 'Argo CD',
      icon: <DeployIcon />,
      color: '#4caf50',
      defaultPort: 8080,
      category: 'cd',
      description: 'GitOps Continuous Delivery'
    },
    // Artifact Repository
    {
      key: 'nexus',
      name: 'Nexus Repository',
      icon: <StorageIcon />,
      color: '#ff9800',
      defaultPort: 8081,
      category: 'artifact',
      description: 'Artifact Repository Manager'
    },
    // Monitoring
    {
      key: 'prometheus',
      name: 'Prometheus',
      icon: <ViewIcon />,
      color: '#e6522c',
      defaultPort: 9090,
      category: 'monitoring',
      description: 'Monitoring and Alerting'
    },
    {
      key: 'grafana',
      name: 'Grafana',
      icon: <ViewIcon />,
      color: '#f46800',
      defaultPort: 3000,
      category: 'monitoring',
      description: 'Metrics Visualization'
    },
    // Security
    {
      key: 'sonarqube',
      name: 'SonarQube',
      icon: <SettingsIcon />,
      color: '#4e9bcd',
      defaultPort: 9000,
      category: 'security',
      description: 'Code Quality and Security Analysis'
    },
    // Testing
    {
      key: 'selenium',
      name: 'Selenium Grid',
      icon: <SettingsIcon />,
      color: '#43b02a',
      defaultPort: 4444,
      category: 'testing',
      description: 'Automated Testing Framework'
    },
    // Webhook
    {
      key: 'webhook',
      name: 'Webhook Service',
      icon: <WebhookIcon />,
      color: '#607d8b',
      defaultPort: 8080,
      category: 'webhook',
      description: 'Git Repository Webhooks'
    }
  ];

  // [advice from AI] 카테고리별 아이콘 매핑
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ci': return <BuildIcon />;
      case 'cd': return <DeployIcon />;
      case 'artifact': return <StorageIcon />;
      case 'webhook': return <WebhookIcon />;
      case 'monitoring': return <ViewIcon />;
      case 'security': return <SettingsIcon />;
      case 'testing': return <SettingsIcon />;
      default: return <SettingsIcon />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ci': return '#2196f3';
      case 'cd': return '#4caf50';
      case 'artifact': return '#ff9800';
      case 'monitoring': return '#9c27b0';
      case 'webhook': return '#607d8b';
      case 'security': return '#f44336';
      case 'testing': return '#795548';
      default: return '#757575';
    }
  };

  // [advice from AI] 초기화 - 실제 데이터 로드
  useEffect(() => {
    loadSolutionTypes();
    loadInstances();
  }, []);

  // [advice from AI] 실제 솔루션 타입 로드
  const loadSolutionTypes = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/operations/solution-types`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt-auth-storage')?.split('"token":"')[1]?.split('"')[0]}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const types = data.data.map((type: any) => ({
          key: type.key,
          name: type.name,
          icon: getCategoryIcon(type.category),
          color: getCategoryColor(type.category),
          defaultPort: type.default_port,
          category: type.category,
          description: type.description
        }));
        setSolutionTypes(types);
        console.log('✅ 솔루션 타입 로드 완료:', types.length, '개');
      } else {
        console.warn('⚠️ 솔루션 타입 로드 실패, 기본값 사용');
        setSolutionTypes(getDefaultSolutionTypes());
      }
    } catch (error) {
      console.error('❌ 솔루션 타입 로드 오류:', error);
      setSolutionTypes(getDefaultSolutionTypes());
    }
  };

  // [advice from AI] 실제 솔루션 인스턴스 로드
  const loadInstances = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/operations/instances`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt-auth-storage')?.split('"token":"')[1]?.split('"')[0]}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInstances(data.data || []);
        onInstanceChange(data.data || []);
        console.log('✅ 솔루션 인스턴스 로드 완료:', data.data?.length || 0, '개');
      } else {
        console.warn('⚠️ 솔루션 인스턴스 로드 실패');
        setInstances([]);
      }
    } catch (error) {
      console.error('❌ 솔루션 인스턴스 로드 오류:', error);
      setInstances([]);
    }
  };

  const loadSampleInstances_DEPRECATED = () => {
    const sampleInstances: SolutionInstance[] = [
      {
        id: 'jenkins-prod',
        type: 'jenkins',
        name: 'Jenkins Production',
        url: 'http://jenkins-prod.company.com:8080',
        environment: 'production',
        region: 'US-East',
        status: 'healthy',
        description: 'Production Jenkins CI Server',
        metrics: { jobs: 15, lastCheck: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'jenkins-staging',
        type: 'jenkins',
        name: 'Jenkins Staging',
        url: 'http://jenkins-staging.company.com:8080',
        environment: 'staging',
        region: 'US-East',
        status: 'warning',
        description: 'Staging Jenkins CI Server',
        metrics: { jobs: 8, lastCheck: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'argocd-global',
        type: 'argocd',
        name: 'ArgoCD Global',
        url: 'http://argocd-global.company.com:8080',
        environment: 'production',
        region: 'Global',
        status: 'healthy',
        description: 'Global ArgoCD GitOps Server',
        metrics: { applications: 12, lastCheck: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'nexus-prod',
        type: 'nexus',
        name: 'Nexus Production',
        url: 'http://nexus-prod.company.com:8081',
        environment: 'production',
        region: 'US-East',
        status: 'healthy',
        description: 'Production Nexus Repository',
        metrics: { repositories: 25, lastCheck: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    setInstances(sampleInstances);
    onInstanceChange?.(sampleInstances);
  };

  // [advice from AI] 상태 아이콘 매핑
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <SettingsIcon color="disabled" />;
    }
  };

  // [advice from AI] 환경별 색상
  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'error';
      case 'staging':
        return 'warning';
      case 'development':
        return 'info';
      default:
        return 'default';
    }
  };

  // [advice from AI] 새 인스턴스 추가/편집
  const handleSaveInstance = async () => {
    if (!formData.type || !formData.name || !formData.url) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const token = localStorage.getItem('jwt-auth-storage')?.split('"token":"')[1]?.split('"')[0];
      
      const requestData = {
        type: formData.type,
        name: formData.name,
        url: formData.url,
        environment: formData.environment,
        region: formData.region,
        description: formData.description,
        username: formData.username,
        token: formData.token
      };

      const method = editingInstance ? 'PUT' : 'POST';
      const url = editingInstance 
        ? `${apiUrl}/api/operations/instances/${editingInstance.id}`
        : `${apiUrl}/api/operations/instances`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 솔루션 인스턴스 저장 완료:', data.data?.name);
        
        // 목록 새로고침
        await loadInstances();
        handleCloseDialog();
        
        alert(editingInstance ? '솔루션 인스턴스가 수정되었습니다.' : '솔루션 인스턴스가 추가되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`저장 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('❌ 솔루션 인스턴스 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleEditInstance = (instance: SolutionInstance) => {
    setEditingInstance(instance);
    setFormData({
      type: instance.type,
      name: instance.name,
      url: instance.url,
      environment: instance.environment,
      region: instance.region || '',
      description: instance.description || '',
      username: instance.credentials?.username || '',
      token: instance.credentials?.token || ''
    });
    setDialogOpen(true);
  };

  // [advice from AI] 새 솔루션 타입 추가
  const handleSaveNewType = async () => {
    if (!newTypeData.key || !newTypeData.name) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const token = localStorage.getItem('jwt-auth-storage')?.split('"token":"')[1]?.split('"')[0];

      const response = await fetch(`${apiUrl}/api/operations/solution-types`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: newTypeData.key,
          name: newTypeData.name,
          category: newTypeData.category,
          default_port: newTypeData.defaultPort,
          description: newTypeData.description
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 새 솔루션 타입 추가 완료:', data.data?.name);
        
        // 솔루션 타입 목록 새로고침
        await loadSolutionTypes();
        setTypeDialogOpen(false);
        
        // 폼 초기화
        setNewTypeData({
          key: '',
          name: '',
          category: 'ci',
          defaultPort: 8080,
          description: ''
        });
        
        alert('새 솔루션 타입이 추가되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`추가 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('❌ 솔루션 타입 추가 오류:', error);
      alert('추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (!window.confirm('정말로 이 인스턴스를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const token = localStorage.getItem('jwt-auth-storage')?.split('"token":"')[1]?.split('"')[0];
      
      const response = await fetch(`${apiUrl}/api/operations/instances/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ 솔루션 인스턴스 삭제 완료:', instanceId);
        
        // 목록 새로고침
        await loadInstances();
        
        alert('솔루션 인스턴스가 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`삭제 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('❌ 솔루션 인스턴스 삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingInstance(null);
    setFormData({
      type: 'jenkins',
      name: '',
      url: '',
      environment: 'production',
      region: '',
      description: '',
      username: '',
      token: ''
    });
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            🏗️ 솔루션 인스턴스 관리
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={() => setTypeDialogOpen(true)}
            >
              새 솔루션 타입 추가
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              새 인스턴스 추가
            </Button>
          </Box>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          각 솔루션(Jenkins, ArgoCD, Nexus)의 여러 인스턴스를 환경별, 지역별로 관리할 수 있습니다.
        </Alert>

        {/* 타입별 그룹핑 */}
        {solutionTypes.map((config) => {
          const typeInstances = instances.filter(inst => inst.type === config.key);
          
          return (
            <Box key={config.key} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {config.icon}
                <Typography variant="h6" sx={{ ml: 1, mr: 2 }}>
                  {config.name}
                </Typography>
                <Chip 
                  label={`${typeInstances.length}개 인스턴스`} 
                  size="small" 
                  color="primary" 
                />
              </Box>
              
              <Grid container spacing={2}>
                {typeInstances.map((instance) => (
                  <Grid item xs={12} sm={6} md={4} key={instance.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {instance.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {getStatusIcon(instance.status)}
                          <Tooltip title="편집">
                            <IconButton size="small" onClick={() => handleEditInstance(instance)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton size="small" onClick={() => handleDeleteInstance(instance.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {instance.url}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={instance.environment} 
                          size="small" 
                          color={getEnvironmentColor(instance.environment) as any}
                        />
                        {instance.region && (
                          <Chip label={instance.region} size="small" variant="outlined" />
                        )}
                      </Box>
                      
                      {instance.metrics && (
                        <Typography variant="caption" color="text.secondary">
                          {Object.entries(instance.metrics)
                            .filter(([key]) => key !== 'lastCheck')
                            .map(([key, value]) => `${value} ${key}`)
                            .join(' • ')}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
                
                {/* 새 인스턴스 추가 카드 */}
                <Grid item xs={12} sm={6} md={4}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 120,
                      border: '2px dashed',
                      borderColor: 'divider',
                      '&:hover': { 
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: type as any }));
                      setDialogOpen(true);
                    }}
                  >
                    <AddIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      새 {config.name} 추가
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          );
        })}

        {/* 인스턴스 추가/편집 다이얼로그 */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingInstance ? '인스턴스 편집' : '새 인스턴스 추가'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>솔루션 타입</InputLabel>
                  <Select
                    value={formData.type}
                    label="솔루션 타입"
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    {solutionTypes.map((config) => (
                      <MenuItem key={config.key} value={config.key}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {config.icon}
                          {config.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="인스턴스 이름"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: Jenkins Production"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder={`예: http://jenkins-prod.company.com:${solutionTypes.find(t => t.key === formData.type)?.defaultPort || 8080}`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>환경</InputLabel>
                  <Select
                    value={formData.environment}
                    label="환경"
                    onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value as any }))}
                  >
                    <MenuItem value="production">Production</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="development">Development</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="지역 (선택사항)"
                  value={formData.region}
                  onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="예: US-East, EU-West"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="설명 (선택사항)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="사용자명 (선택사항)"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="토큰/패스워드 (선택사항)"
                  value={formData.token}
                  onChange={(e) => setFormData(prev => ({ ...prev, token: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button 
              onClick={handleSaveInstance} 
              variant="contained"
              disabled={!formData.name || !formData.url}
            >
              {editingInstance ? '수정' : '추가'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* [advice from AI] 새 솔루션 타입 추가 다이얼로그 */}
        <Dialog open={typeDialogOpen} onClose={() => setTypeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>새 솔루션 타입 추가</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="타입 키"
                  value={newTypeData.key}
                  onChange={(e) => setNewTypeData(prev => ({ ...prev, key: e.target.value.toLowerCase() }))}
                  placeholder="예: gitlab"
                  helperText="영문 소문자로 입력"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="타입 이름"
                  value={newTypeData.name}
                  onChange={(e) => setNewTypeData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: GitLab"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={newTypeData.category}
                    label="카테고리"
                    onChange={(e) => setNewTypeData(prev => ({ ...prev, category: e.target.value as any }))}
                  >
                    <MenuItem value="ci">CI (Continuous Integration)</MenuItem>
                    <MenuItem value="cd">CD (Continuous Deployment)</MenuItem>
                    <MenuItem value="artifact">Artifact Repository</MenuItem>
                    <MenuItem value="webhook">Webhook Service</MenuItem>
                    <MenuItem value="monitoring">Monitoring</MenuItem>
                    <MenuItem value="security">Security Analysis</MenuItem>
                    <MenuItem value="testing">Testing Framework</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="기본 포트"
                  type="number"
                  value={newTypeData.defaultPort}
                  onChange={(e) => setNewTypeData(prev => ({ ...prev, defaultPort: parseInt(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="설명"
                  value={newTypeData.description}
                  onChange={(e) => setNewTypeData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="솔루션에 대한 간단한 설명"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTypeDialogOpen(false)}>취소</Button>
            <Button 
              onClick={handleSaveNewType} 
              variant="contained"
              disabled={!newTypeData.key || !newTypeData.name}
            >
              추가
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SolutionInstanceManager;
