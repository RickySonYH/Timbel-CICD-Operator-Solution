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
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

// [advice from AI] 보안 설정을 위한 인터페이스 정의
interface JWTSettings {
  secretKey: string;
  expirationTime: number;
  refreshTokenExpiration: number;
  algorithm: string;
  issuer: string;
  audience: string;
}

interface EncryptionSettings {
  enabled: boolean;
  algorithm: string;
  keyLength: number;
  saltRounds: number;
  dataAtRest: boolean;
  dataInTransit: boolean;
}

interface AccessControlSettings {
  enabled: boolean;
  ipWhitelist: string[];
  ipBlacklist: string[];
  geoRestrictions: boolean;
  allowedCountries: string[];
  blockedCountries: string[];
  timeRestrictions: boolean;
  allowedHours: { start: number; end: number }[];
  maxLoginAttempts: number;
  lockoutDuration: number;
}

interface SessionSettings {
  enabled: boolean;
  timeout: number;
  maxConcurrentSessions: number;
  rememberMe: boolean;
  rememberMeDuration: number;
  secureCookies: boolean;
  httpOnlyCookies: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
}

interface SecurityPolicy {
  id: string;
  name: string;
  type: 'password' | 'access' | 'data' | 'network';
  rules: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  timestamp: string;
  resolved: boolean;
}

interface SecurityAudit {
  id: string;
  type: string;
  result: 'passed' | 'failed' | 'warning';
  details: string;
  timestamp: string;
  performedBy: string;
}

const SecuritySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // JWT 설정 상태
  const [jwtSettings, setJwtSettings] = useState<JWTSettings>({
    secretKey: '',
    expirationTime: 30, // 분 단위로 변경
    refreshTokenExpiration: 7, // 일 단위로 변경
    algorithm: 'HS256',
    issuer: 'timbel-platform',
    audience: 'timbel-users'
  });

  // 암호화 설정 상태
  const [encryptionSettings, setEncryptionSettings] = useState<EncryptionSettings>({
    enabled: true,
    algorithm: 'AES-256-GCM',
    keyLength: 256,
    saltRounds: 12,
    dataAtRest: true,
    dataInTransit: true
  });

  // 접근 제어 설정 상태
  const [accessControlSettings, setAccessControlSettings] = useState<AccessControlSettings>({
    enabled: false,
    ipWhitelist: [],
    ipBlacklist: [],
    geoRestrictions: false,
    allowedCountries: [],
    blockedCountries: [],
    timeRestrictions: false,
    allowedHours: [{ start: 0, end: 23 }],
    maxLoginAttempts: 5,
    lockoutDuration: 900
  });

  // 세션 설정 상태
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    enabled: true,
    timeout: 1800,
    maxConcurrentSessions: 3,
    rememberMe: true,
    rememberMeDuration: 2592000,
    secureCookies: true,
    httpOnlyCookies: true,
    sameSitePolicy: 'strict'
  });

  // 보안 정책 상태
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    type: 'password' as 'password' | 'access' | 'data' | 'network',
    rules: [] as string[],
    isActive: true,
    priority: 1
  });

  // 보안 이벤트 상태
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditResults, setAuditResults] = useState<SecurityAudit[]>([]);

  // 테스트 관련 상태
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testType, setTestType] = useState('');
  const [testProgress, setTestProgress] = useState(0);

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

      // 모든 보안 관련 데이터를 병렬로 로드
      const [jwtRes, encryptionRes, accessRes, sessionRes, policiesRes, eventsRes, auditRes] = await Promise.all([
        fetch('/api/admin/security/jwt', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/security/encryption', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/security/access-control', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/security/session', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/security/policies', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/security/events', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/security/audit', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (jwtRes.ok) {
        const jwtData = await jwtRes.json();
        setJwtSettings(jwtData.settings || jwtSettings);
      }

      if (encryptionRes.ok) {
        const encryptionData = await encryptionRes.json();
        setEncryptionSettings(encryptionData.settings || encryptionSettings);
      }

      if (accessRes.ok) {
        const accessData = await accessRes.json();
        setAccessControlSettings(accessData.settings || accessControlSettings);
      }

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setSessionSettings(sessionData.settings || sessionSettings);
      }

      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        setPolicies(policiesData.policies || []);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setSecurityEvents(eventsData.events || []);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditResults(auditData.audits || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 설정 저장 함수들
  const saveJWTSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/security/jwt', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(jwtSettings)
      });

      if (!response.ok) {
        throw new Error('JWT 설정 저장 실패');
      }

      setSuccess('JWT 설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JWT 설정 저장 실패');
    }
  };

  const saveEncryptionSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/security/encryption', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(encryptionSettings)
      });

      if (!response.ok) {
        throw new Error('암호화 설정 저장 실패');
      }

      setSuccess('암호화 설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '암호화 설정 저장 실패');
    }
  };

  const saveAccessControlSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/security/access-control', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(accessControlSettings)
      });

      if (!response.ok) {
        throw new Error('접근 제어 설정 저장 실패');
      }

      setSuccess('접근 제어 설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '접근 제어 설정 저장 실패');
    }
  };

  const saveSessionSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/security/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(sessionSettings)
      });

      if (!response.ok) {
        throw new Error('세션 설정 저장 실패');
      }

      setSuccess('세션 설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '세션 설정 저장 실패');
    }
  };

  // [advice from AI] 보안 정책 관리
  const savePolicy = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingPolicy 
        ? `/api/admin/security/policies/${editingPolicy.id}`
        : '/api/admin/security/policies';
      
      const method = editingPolicy ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(policyForm)
      });

      if (!response.ok) {
        throw new Error('보안 정책 저장 실패');
      }

      setSuccess('보안 정책이 성공적으로 저장되었습니다.');
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
      resetPolicyForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '보안 정책 저장 실패');
    }
  };

  const resetPolicyForm = () => {
    setPolicyForm({
      name: '',
      type: 'password',
      rules: [],
      isActive: true,
      priority: 1
    });
  };

  const startEditPolicy = (policy: SecurityPolicy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      type: policy.type,
      rules: policy.rules,
      isActive: policy.isActive,
      priority: policy.priority
    });
    setPolicyDialogOpen(true);
  };

  // [advice from AI] 보안 테스트
  const runSecurityTest = async (testType: string) => {
    try {
      setTestDialogOpen(true);
      setTestType(testType);
      setTestProgress(0);

      const token = localStorage.getItem('token');
      
      // 테스트 진행 시뮬레이션
      const interval = setInterval(() => {
        setTestProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setTestDialogOpen(false);
              setSuccess(`${testType} 테스트가 완료되었습니다.`);
            }, 1000);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // 실제 테스트 API 호출
      const response = await fetch(`/api/admin/security/test/${testType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('보안 테스트 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '보안 테스트 실패');
      setTestDialogOpen(false);
    }
  };

  // [advice from AI] 상태별 색상
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getAuditResultColor = (result: string) => {
    switch (result) {
      case 'passed': return 'success';
      case 'failed': return 'error';
      case 'warning': return 'warning';
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
          보안 설정
        </Typography>
        <Button
          // [advice from AI] 아이콘 제거
          onClick={loadData}
          disabled={loading}
        >
          새로고침
        </Button>
      </Box>

      {/* 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="JWT 설정" />
          <Tab label="암호화 설정" />
          <Tab label="접근 제어" />
          <Tab label="세션 관리" />
          <Tab label="보안 정책" />
          <Tab label="보안 이벤트" />
          <Tab label="보안 감사" />
        </Tabs>
      </Box>

      {/* JWT 설정 탭 */}
      {activeTab === 0 && (
        <Card>
          <CardHeader title="JWT 토큰 설정" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="시크릿 키"
                  type="password"
                  value={jwtSettings.secretKey}
                  onChange={(e) => setJwtSettings({ ...jwtSettings, secretKey: e.target.value })}
                  helperText="JWT 토큰 서명에 사용되는 비밀 키"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="토큰 만료 시간 (분)"
                  value={jwtSettings.expirationTime}
                  onChange={(e) => setJwtSettings({ ...jwtSettings, expirationTime: parseInt(e.target.value) })}
                  helperText="JWT 토큰의 만료 시간을 분 단위로 설정"
                  inputProps={{ min: 1, max: 1440 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="리프레시 토큰 만료 시간 (일)"
                  value={jwtSettings.refreshTokenExpiration}
                  onChange={(e) => setJwtSettings({ ...jwtSettings, refreshTokenExpiration: parseInt(e.target.value) })}
                  helperText="리프레시 토큰의 만료 시간을 일 단위로 설정"
                  inputProps={{ min: 1, max: 365 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>알고리즘</InputLabel>
                  <Select
                    value={jwtSettings.algorithm}
                    onChange={(e) => setJwtSettings({ ...jwtSettings, algorithm: e.target.value })}
                  >
                    <MenuItem value="HS256">HS256</MenuItem>
                    <MenuItem value="HS384">HS384</MenuItem>
                    <MenuItem value="HS512">HS512</MenuItem>
                    <MenuItem value="RS256">RS256</MenuItem>
                    <MenuItem value="RS384">RS384</MenuItem>
                    <MenuItem value="RS512">RS512</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="발급자 (Issuer)"
                  value={jwtSettings.issuer}
                  onChange={(e) => setJwtSettings({ ...jwtSettings, issuer: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="대상자 (Audience)"
                  value={jwtSettings.audience}
                  onChange={(e) => setJwtSettings({ ...jwtSettings, audience: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={saveJWTSettings}
                  >
                    설정 저장
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => runSecurityTest('jwt')}
                  >
                    JWT 테스트
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 암호화 설정 탭 */}
      {activeTab === 1 && (
        <Card>
          <CardHeader title="암호화 설정" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={encryptionSettings.enabled}
                      onChange={(e) => setEncryptionSettings({ ...encryptionSettings, enabled: e.target.checked })}
                    />
                  }
                  label="암호화 활성화"
                />
              </Grid>

              {encryptionSettings.enabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>암호화 알고리즘</InputLabel>
                      <Select
                        value={encryptionSettings.algorithm}
                        onChange={(e) => setEncryptionSettings({ ...encryptionSettings, algorithm: e.target.value })}
                      >
                        <MenuItem value="AES-256-GCM">AES-256-GCM</MenuItem>
                        <MenuItem value="AES-256-CBC">AES-256-CBC</MenuItem>
                        <MenuItem value="AES-192-GCM">AES-192-GCM</MenuItem>
                        <MenuItem value="AES-128-GCM">AES-128-GCM</MenuItem>
                        <MenuItem value="ChaCha20-Poly1305">ChaCha20-Poly1305</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="키 길이 (비트)"
                      value={encryptionSettings.keyLength}
                      onChange={(e) => setEncryptionSettings({ ...encryptionSettings, keyLength: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="솔트 라운드"
                      value={encryptionSettings.saltRounds}
                      onChange={(e) => setEncryptionSettings({ ...encryptionSettings, saltRounds: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={encryptionSettings.dataAtRest}
                            onChange={(e) => setEncryptionSettings({ ...encryptionSettings, dataAtRest: e.target.checked })}
                          />
                        }
                        label="저장 데이터 암호화"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={encryptionSettings.dataInTransit}
                            onChange={(e) => setEncryptionSettings({ ...encryptionSettings, dataInTransit: e.target.checked })}
                          />
                        }
                        label="전송 데이터 암호화"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={saveEncryptionSettings}
                    >
                      설정 저장
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 접근 제어 탭 */}
      {activeTab === 2 && (
        <Card>
          <CardHeader title="접근 제어 설정" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={accessControlSettings.enabled}
                      onChange={(e) => setAccessControlSettings({ ...accessControlSettings, enabled: e.target.checked })}
                    />
                  }
                  label="접근 제어 활성화"
                />
              </Grid>

              {accessControlSettings.enabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="IP 화이트리스트"
                      value={accessControlSettings.ipWhitelist.join('\n')}
                      onChange={(e) => setAccessControlSettings({ 
                        ...accessControlSettings, 
                        ipWhitelist: e.target.value.split('\n').filter(ip => ip.trim())
                      })}
                      placeholder="각 줄에 하나씩 IP 주소 입력"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="IP 블랙리스트"
                      value={accessControlSettings.ipBlacklist.join('\n')}
                      onChange={(e) => setAccessControlSettings({ 
                        ...accessControlSettings, 
                        ipBlacklist: e.target.value.split('\n').filter(ip => ip.trim())
                      })}
                      placeholder="각 줄에 하나씩 IP 주소 입력"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={accessControlSettings.geoRestrictions}
                          onChange={(e) => setAccessControlSettings({ ...accessControlSettings, geoRestrictions: e.target.checked })}
                        />
                      }
                      label="지역 제한"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="최대 로그인 시도 횟수"
                      value={accessControlSettings.maxLoginAttempts}
                      onChange={(e) => setAccessControlSettings({ ...accessControlSettings, maxLoginAttempts: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="계정 잠금 시간 (초)"
                      value={accessControlSettings.lockoutDuration}
                      onChange={(e) => setAccessControlSettings({ ...accessControlSettings, lockoutDuration: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={saveAccessControlSettings}
                    >
                      설정 저장
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 세션 관리 탭 */}
      {activeTab === 3 && (
        <Card>
          <CardHeader title="세션 관리 설정" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sessionSettings.enabled}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, enabled: e.target.checked })}
                    />
                  }
                  label="세션 관리 활성화"
                />
              </Grid>

              {sessionSettings.enabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="세션 타임아웃 (초)"
                      value={sessionSettings.timeout}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, timeout: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="최대 동시 세션 수"
                      value={sessionSettings.maxConcurrentSessions}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, maxConcurrentSessions: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={sessionSettings.rememberMe}
                          onChange={(e) => setSessionSettings({ ...sessionSettings, rememberMe: e.target.checked })}
                        />
                      }
                      label="로그인 유지 기능"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="로그인 유지 기간 (초)"
                      value={sessionSettings.rememberMeDuration}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, rememberMeDuration: parseInt(e.target.value) })}
                      disabled={!sessionSettings.rememberMe}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>SameSite 정책</InputLabel>
                      <Select
                        value={sessionSettings.sameSitePolicy}
                        onChange={(e) => setSessionSettings({ ...sessionSettings, sameSitePolicy: e.target.value as any })}
                      >
                        <MenuItem value="strict">Strict</MenuItem>
                        <MenuItem value="lax">Lax</MenuItem>
                        <MenuItem value="none">None</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={sessionSettings.secureCookies}
                            onChange={(e) => setSessionSettings({ ...sessionSettings, secureCookies: e.target.checked })}
                          />
                        }
                        label="보안 쿠키"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={sessionSettings.httpOnlyCookies}
                            onChange={(e) => setSessionSettings({ ...sessionSettings, httpOnlyCookies: e.target.checked })}
                          />
                        }
                        label="HTTP Only 쿠키"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={saveSessionSettings}
                    >
                      설정 저장
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 보안 정책 탭 */}
      {activeTab === 4 && (
        <Card>
          <CardHeader
            title="보안 정책"
            action={
              <Button
                variant="contained"
                onClick={() => {
                  setEditingPolicy(null);
                  resetPolicyForm();
                  setPolicyDialogOpen(true);
                }}
              >
                새 정책
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>정책 이름</TableCell>
                    <TableCell>타입</TableCell>
                    <TableCell>우선순위</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>생성일</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>{policy.name}</TableCell>
                      <TableCell>
                        <Chip label={policy.type} size="small" />
                      </TableCell>
                      <TableCell>{policy.priority}</TableCell>
                      <TableCell>
                        <Chip
                          label={policy.isActive ? '활성' : '비활성'}
                          color={policy.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(policy.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => startEditPolicy(policy)}
                        >
                          수정
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

      {/* 보안 이벤트 탭 */}
      {activeTab === 5 && (
        <Card>
          <CardHeader title="보안 이벤트" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>이벤트 타입</TableCell>
                    <TableCell>심각도</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell>소스</TableCell>
                    <TableCell>시간</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.type}</TableCell>
                      <TableCell>
                        <Chip
                          label={event.severity}
                          color={getSeverityColor(event.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{event.description}</TableCell>
                      <TableCell>{event.source}</TableCell>
                      <TableCell>
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.resolved ? '해결됨' : '미해결'}
                          color={event.resolved ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 보안 감사 탭 */}
      {activeTab === 6 && (
        <Card>
          <CardHeader 
            title="보안 감사 결과"
            action={
              <Button
                variant="outlined"
                onClick={() => runSecurityTest('audit')}
              >
                감사 실행
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>감사 타입</TableCell>
                    <TableCell>결과</TableCell>
                    <TableCell>세부사항</TableCell>
                    <TableCell>실행자</TableCell>
                    <TableCell>실행 시간</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditResults.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>{audit.type}</TableCell>
                      <TableCell>
                        <Chip
                          label={audit.result}
                          color={getAuditResultColor(audit.result) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{audit.details}</TableCell>
                      <TableCell>{audit.performedBy}</TableCell>
                      <TableCell>
                        {new Date(audit.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 보안 정책 편집 다이얼로그 */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPolicy ? '보안 정책 수정' : '새 보안 정책 생성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="정책 이름"
                value={policyForm.name}
                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>정책 타입</InputLabel>
                <Select
                  value={policyForm.type}
                  onChange={(e) => setPolicyForm({ ...policyForm, type: e.target.value as any })}
                >
                  <MenuItem value="password">비밀번호</MenuItem>
                  <MenuItem value="access">접근 제어</MenuItem>
                  <MenuItem value="data">데이터 보호</MenuItem>
                  <MenuItem value="network">네트워크 보안</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="우선순위"
                value={policyForm.priority}
                onChange={(e) => setPolicyForm({ ...policyForm, priority: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="정책 규칙"
                value={policyForm.rules.join('\n')}
                onChange={(e) => setPolicyForm({ 
                  ...policyForm, 
                  rules: e.target.value.split('\n').filter(rule => rule.trim())
                })}
                placeholder="각 줄에 하나씩 규칙 입력"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={policyForm.isActive}
                    onChange={(e) => setPolicyForm({ ...policyForm, isActive: e.target.checked })}
                  />
                }
                label="활성 상태"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>취소</Button>
          <Button onClick={savePolicy} variant="contained">
            {editingPolicy ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 보안 테스트 진행 다이얼로그 */}
      <Dialog open={testDialogOpen} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>보안 테스트 실행 중</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {testType} 테스트를 실행하고 있습니다...
          </Typography>
          <LinearProgress variant="determinate" value={testProgress} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {testProgress}% 완료
          </Typography>
        </DialogContent>
      </Dialog>

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

export default SecuritySettings;
