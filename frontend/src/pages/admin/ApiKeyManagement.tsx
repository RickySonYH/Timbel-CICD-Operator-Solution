import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Badge,
  Tooltip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem as MenuItemComponent
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

// [advice from AI] API 키 관리를 위한 인터페이스 정의
interface ApiKey {
  id: string;
  name: string;
  description: string;
  key: string;
  maskedKey: string;
  type: 'read' | 'write' | 'admin';
  status: 'active' | 'inactive' | 'revoked';
  permissions: string[];
  rateLimit: {
    requests: number;
    period: string;
  };
  expiresAt?: string;
  lastUsed?: string;
  usageCount: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

interface ApiUsage {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

interface ApiKeyTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  permissions: string[];
  rateLimit: {
    requests: number;
    period: string;
  };
  expiresInDays?: number;
}

interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  inactiveKeys: number;
  revokedKeys: number;
  totalRequests: number;
  requestsToday: number;
  requestsThisMonth: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
}

const ApiKeyManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API 키 목록 상태
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsage[]>([]);
  const [apiKeyTemplates, setApiKeyTemplates] = useState<ApiKeyTemplate[]>([]);
  const [apiKeyStats, setApiKeyStats] = useState<ApiKeyStats | null>(null);

  // 다이얼로그 상태
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);

  // 폼 상태
  const [keyForm, setKeyForm] = useState({
    name: '',
    description: '',
    type: 'read' as 'read' | 'write' | 'admin',
    permissions: [] as string[],
    rateLimit: {
      requests: 1000,
      period: 'hour' as 'hour' | 'day' | 'month'
    },
    expiresInDays: undefined as number | undefined
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    type: 'read',
    permissions: [] as string[],
    rateLimit: {
      requests: 1000,
      period: 'hour' as 'hour' | 'day' | 'month'
    },
    expiresInDays: undefined as number | undefined
  });

  // 필터 및 검색 상태
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });

  // 메뉴 상태
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('인증 토큰이 없습니다. 로그인해주세요.');
        return;
      }

      // 모든 API 키 관련 데이터를 병렬로 로드
      const [keysRes, usageRes, templatesRes, statsRes] = await Promise.all([
        fetch('/api/admin/api-keys', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/api-keys/usage', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/api-keys/templates', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/api-keys/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setApiKeys(keysData.apiKeys || []);
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setApiUsage(usageData.usage || []);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setApiKeyTemplates(templatesData.templates || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setApiKeyStats(statsData.stats || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] API 키 생성
  const createApiKey = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(keyForm)
      });

      if (!response.ok) {
        throw new Error('API 키 생성 실패');
      }

      const result = await response.json();
      setSuccess('API 키가 성공적으로 생성되었습니다.');
      setKeyDialogOpen(false);
      resetKeyForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 키 생성 실패');
    }
  };

  // [advice from AI] API 키 수정
  const updateApiKey = async (id: string, updates: Partial<ApiKey>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('API 키 수정 실패');
      }

      setSuccess('API 키가 성공적으로 수정되었습니다.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 키 수정 실패');
    }
  };

  // [advice from AI] API 키 삭제
  const deleteApiKey = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('API 키 삭제 실패');
      }

      setSuccess('API 키가 성공적으로 삭제되었습니다.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 키 삭제 실패');
    }
  };

  // [advice from AI] API 키 복사
  const copyApiKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setSuccess('API 키가 클립보드에 복사되었습니다.');
    } catch (err) {
      setError('API 키 복사 실패');
    }
  };

  // [advice from AI] 템플릿 관리
  const saveTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/api-keys/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(templateForm)
      });

      if (!response.ok) {
        throw new Error('템플릿 저장 실패');
      }

      setSuccess('템플릿이 성공적으로 저장되었습니다.');
      setTemplateDialogOpen(false);
      resetTemplateForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 저장 실패');
    }
  };

  // [advice from AI] 폼 리셋 함수들
  const resetKeyForm = () => {
    setKeyForm({
      name: '',
      description: '',
      type: 'read',
      permissions: [],
      rateLimit: {
        requests: 1000,
        period: 'hour'
      },
      expiresInDays: undefined
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      type: 'read',
      permissions: [],
      rateLimit: {
        requests: 1000,
        period: 'hour'
      },
      expiresInDays: undefined
    });
  };

  // [advice from AI] 메뉴 핸들러
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, keyId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedKeyId(keyId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedKeyId(null);
  };

  // [advice from AI] 필터링된 API 키 목록
  const filteredApiKeys = apiKeys.filter(key => {
    if (filters.status && key.status !== filters.status) return false;
    if (filters.type && key.type !== filters.type) return false;
    if (filters.search && !key.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !key.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'revoked': return 'error';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'error';
      case 'write': return 'warning';
      case 'read': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>데이터를 로드하는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          API 키 관리
        </Typography>
        <Button
          // [advice from AI] 아이콘 제거
          onClick={loadData}
          disabled={loading}
        >
          새로고침
        </Button>
      </Box>

      {/* 통계 카드 */}
      {apiKeyStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  전체 API 키
                </Typography>
                <Typography variant="h4">
                  {apiKeyStats.totalKeys}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  활성 키
                </Typography>
                <Typography variant="h4" color="success.main">
                  {apiKeyStats.activeKeys}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  오늘 요청
                </Typography>
                <Typography variant="h4" color="info.main">
                  {apiKeyStats.requestsToday}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  이번 달 요청
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {apiKeyStats.requestsThisMonth}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="API 키 목록" />
          <Tab label="사용량 분석" />
          <Tab label="템플릿 관리" />
          <Tab label="사용 로그" />
        </Tabs>
      </Box>

      {/* API 키 목록 탭 */}
      {activeTab === 0 && (
        <Card>
          <CardHeader
            title="API 키 목록"
            action={
              <Button
                variant="contained"
                onClick={() => {
                  setSelectedApiKey(null);
                  resetKeyForm();
                  setKeyDialogOpen(true);
                }}
              >
                새 API 키
              </Button>
            }
          />
          <CardContent>
            {/* 필터 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="검색"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="이름 또는 설명으로 검색"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <MenuItem value="">모든 상태</MenuItem>
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="inactive">비활성</MenuItem>
                    <MenuItem value="revoked">취소됨</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>타입</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  >
                    <MenuItem value="">모든 타입</MenuItem>
                    <MenuItem value="read">읽기</MenuItem>
                    <MenuItem value="write">쓰기</MenuItem>
                    <MenuItem value="admin">관리자</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* API 키 테이블 */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell>타입</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>API 키</TableCell>
                    <TableCell>사용량</TableCell>
                    <TableCell>만료일</TableCell>
                    <TableCell>마지막 사용</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredApiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{key.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {key.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={key.type}
                          color={getTypeColor(key.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={key.status}
                          color={getStatusColor(key.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {key.maskedKey}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => copyApiKey(key.key)}
                          >
                            {/* [advice from AI] 아이콘 제거 */}
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {key.usageCount.toLocaleString()}회
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {key.expiresAt ? (
                          <Typography variant="body2">
                            {new Date(key.expiresAt).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            무제한
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {key.lastUsed ? (
                          <Typography variant="body2">
                            {new Date(key.lastUsed).toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            사용 안함
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, key.id)}
                        >
                          {/* [advice from AI] 아이콘 제거 */}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 사용량 분석 탭 */}
      {activeTab === 1 && (
        <Card>
          <CardHeader title="API 사용량 분석" />
          <CardContent>
            {apiKeyStats && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    인기 엔드포인트
                  </Typography>
                  <List>
                    {apiKeyStats.topEndpoints.map((endpoint, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={endpoint.endpoint}
                          secondary={`${endpoint.count.toLocaleString()}회 호출`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    요청 통계
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      오늘 총 요청
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(apiKeyStats.requestsToday / Math.max(apiKeyStats.requestsThisMonth, 1)) * 100} 
                    />
                    <Typography variant="body2">
                      {apiKeyStats.requestsToday.toLocaleString()} / {apiKeyStats.requestsThisMonth.toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* 템플릿 관리 탭 */}
      {activeTab === 2 && (
        <Card>
          <CardHeader
            title="API 키 템플릿"
            action={
              <Button
                variant="contained"
                onClick={() => {
                  resetTemplateForm();
                  setTemplateDialogOpen(true);
                }}
              >
                새 템플릿
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>템플릿 이름</TableCell>
                    <TableCell>타입</TableCell>
                    <TableCell>권한</TableCell>
                    <TableCell>속도 제한</TableCell>
                    <TableCell>만료일</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiKeyTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{template.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={template.type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {template.permissions.slice(0, 2).map((permission, index) => (
                            <Chip key={index} label={permission} size="small" variant="outlined" />
                          ))}
                          {template.permissions.length > 2 && (
                            <Chip 
                              label={`+${template.permissions.length - 2}`} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {template.rateLimit.requests} / {template.rateLimit.period}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {template.expiresInDays ? (
                          <Typography variant="body2">
                            {template.expiresInDays}일
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            무제한
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {
                            setKeyForm({
                              name: template.name,
                              description: template.description,
                              type: template.type as any,
                              permissions: template.permissions,
                              rateLimit: {
                                requests: template.rateLimit.requests,
                                period: template.rateLimit.period as 'hour' | 'day' | 'month'
                              },
                              expiresInDays: template.expiresInDays
                            });
                            setKeyDialogOpen(true);
                          }}
                        >
                          키 생성
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 사용 로그 탭 */}
      {activeTab === 3 && (
        <Card>
          <CardHeader title="API 사용 로그" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>시간</TableCell>
                    <TableCell>엔드포인트</TableCell>
                    <TableCell>메서드</TableCell>
                    <TableCell>상태 코드</TableCell>
                    <TableCell>응답 시간</TableCell>
                    <TableCell>IP 주소</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiUsage.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell>
                        {new Date(usage.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {usage.endpoint}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={usage.method}
                          color={usage.method === 'GET' ? 'info' : usage.method === 'POST' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={usage.statusCode}
                          color={usage.statusCode >= 200 && usage.statusCode < 300 ? 'success' : 
                                usage.statusCode >= 400 ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {usage.responseTime}ms
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {usage.ipAddress}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* API 키 생성/편집 다이얼로그 */}
      <Dialog open={keyDialogOpen} onClose={() => setKeyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedApiKey ? 'API 키 수정' : '새 API 키 생성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API 키 이름"
                value={keyForm.name}
                onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                multiline
                rows={2}
                value={keyForm.description}
                onChange={(e) => setKeyForm({ ...keyForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>타입</InputLabel>
                <Select
                  value={keyForm.type}
                  onChange={(e) => setKeyForm({ ...keyForm, type: e.target.value as any })}
                >
                  <MenuItem value="read">읽기</MenuItem>
                  <MenuItem value="write">쓰기</MenuItem>
                  <MenuItem value="admin">관리자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="만료일 (일)"
                value={keyForm.expiresInDays || ''}
                onChange={(e) => setKeyForm({ 
                  ...keyForm, 
                  expiresInDays: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                helperText="비워두면 만료되지 않음"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="속도 제한 (요청 수)"
                value={keyForm.rateLimit.requests}
                onChange={(e) => setKeyForm({ 
                  ...keyForm, 
                  rateLimit: { ...keyForm.rateLimit, requests: parseInt(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>속도 제한 기간</InputLabel>
                <Select
                  value={keyForm.rateLimit.period}
                  onChange={(e) => setKeyForm({ 
                    ...keyForm, 
                    rateLimit: { ...keyForm.rateLimit, period: e.target.value as any }
                  })}
                >
                  <MenuItem value="hour">시간</MenuItem>
                  <MenuItem value="day">일</MenuItem>
                  <MenuItem value="month">월</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyDialogOpen(false)}>취소</Button>
          <Button onClick={createApiKey} variant="contained">
            {selectedApiKey ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 템플릿 생성 다이얼로그 */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 API 키 템플릿</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="템플릿 이름"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                multiline
                rows={2}
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>타입</InputLabel>
                <Select
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                >
                  <MenuItem value="read">읽기</MenuItem>
                  <MenuItem value="write">쓰기</MenuItem>
                  <MenuItem value="admin">관리자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="만료일 (일)"
                value={templateForm.expiresInDays || ''}
                onChange={(e) => setTemplateForm({ 
                  ...templateForm, 
                  expiresInDays: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                helperText="비워두면 만료되지 않음"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="속도 제한 (요청 수)"
                value={templateForm.rateLimit.requests}
                onChange={(e) => setTemplateForm({ 
                  ...templateForm, 
                  rateLimit: { ...templateForm.rateLimit, requests: parseInt(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>속도 제한 기간</InputLabel>
                <Select
                  value={templateForm.rateLimit.period}
                  onChange={(e) => setTemplateForm({ 
                    ...templateForm, 
                    rateLimit: { ...templateForm.rateLimit, period: e.target.value as any }
                  })}
                >
                  <MenuItem value="hour">시간</MenuItem>
                  <MenuItem value="day">일</MenuItem>
                  <MenuItem value="month">월</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>취소</Button>
          <Button onClick={saveTemplate} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 컨텍스트 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemComponent onClick={() => {
          if (selectedKeyId) {
            const key = apiKeys.find(k => k.id === selectedKeyId);
            if (key) {
              copyApiKey(key.key);
            }
          }
          handleMenuClose();
        }}>
          {/* [advice from AI] 아이콘 제거 */}
          키 복사
        </MenuItemComponent>
        <MenuItemComponent onClick={() => {
          if (selectedKeyId) {
            const key = apiKeys.find(k => k.id === selectedKeyId);
            if (key) {
              setSelectedApiKey(key);
              setKeyForm({
                name: key.name,
                description: key.description,
                type: key.type,
                permissions: key.permissions,
                rateLimit: {
                  requests: key.rateLimit.requests,
                  period: key.rateLimit.period as 'hour' | 'day' | 'month'
                },
                expiresInDays: key.expiresAt ? Math.ceil((new Date(key.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : undefined
              });
              setKeyDialogOpen(true);
            }
          }
          handleMenuClose();
        }}>
          {/* [advice from AI] 아이콘 제거 */}
          수정
        </MenuItemComponent>
        <MenuItemComponent onClick={() => {
          if (selectedKeyId) {
            deleteApiKey(selectedKeyId);
          }
          handleMenuClose();
        }}>
          {/* [advice from AI] 아이콘 제거 */}
          삭제
        </MenuItemComponent>
      </Menu>

      {/* 알림 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApiKeyManagement;
