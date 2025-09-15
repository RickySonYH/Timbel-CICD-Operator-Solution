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
  Tooltip
} from '@mui/material';
// [advice from AI] 아이콘 사용 최소화 - 텍스트 기반 UI로 변경

// [advice from AI] 알림 설정을 위한 인터페이스 정의
interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  useTLS: boolean;
  useSSL: boolean;
}

interface SystemNotificationSettings {
  enabled: boolean;
  browserPush: boolean;
  inAppNotification: boolean;
  soundEnabled: boolean;
  desktopNotification: boolean;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'system' | 'both';
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
}

interface NotificationRule {
  id: string;
  name: string;
  event: string;
  condition: string;
  actions: string[];
  isActive: boolean;
  recipients: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
}

interface NotificationLog {
  id: string;
  type: 'email' | 'system';
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  errorMessage?: string;
}

const NotificationSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 이메일 설정 상태
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    useTLS: true,
    useSSL: false
  });

  // 시스템 알림 설정 상태
  const [systemSettings, setSystemSettings] = useState<SystemNotificationSettings>({
    enabled: false,
    browserPush: false,
    inAppNotification: true,
    soundEnabled: true,
    desktopNotification: false
  });

  // 알림 템플릿 상태
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'email' as 'email' | 'system' | 'both',
    subject: '',
    content: '',
    isActive: true
  });

  // 알림 규칙 상태
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    event: '',
    condition: '',
    actions: [] as string[],
    isActive: true,
    recipients: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  // 알림 로그 상태
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');

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

      // 모든 알림 관련 데이터를 병렬로 로드
      const [emailRes, systemRes, templatesRes, rulesRes, logsRes] = await Promise.all([
        fetch('/api/admin/notifications/email', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/notifications/system', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/notifications/templates', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/notifications/rules', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/notifications/logs', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailSettings(emailData.settings || emailSettings);
      }

      if (systemRes.ok) {
        const systemData = await systemRes.json();
        setSystemSettings(systemData.settings || systemSettings);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.templates || []);
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 이메일 설정 저장
  const saveEmailSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/notifications/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(emailSettings)
      });

      if (!response.ok) {
        throw new Error('이메일 설정 저장 실패');
      }

      setSuccess('이메일 설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이메일 설정 저장 실패');
    }
  };

  // [advice from AI] 시스템 알림 설정 저장
  const saveSystemSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/notifications/system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(systemSettings)
      });

      if (!response.ok) {
        throw new Error('시스템 알림 설정 저장 실패');
      }

      setSuccess('시스템 알림 설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '시스템 알림 설정 저장 실패');
    }
  };

  // [advice from AI] 이메일 테스트
  const testEmailConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/notifications/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: testEmail })
      });

      if (!response.ok) {
        throw new Error('이메일 테스트 실패');
      }

      setSuccess('테스트 이메일이 성공적으로 전송되었습니다.');
      setTestEmailDialogOpen(false);
      setTestEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이메일 테스트 실패');
    }
  };

  // [advice from AI] 템플릿 관리
  const saveTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingTemplate 
        ? `/api/admin/notifications/templates/${editingTemplate.id}`
        : '/api/admin/notifications/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
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
      setEditingTemplate(null);
      resetTemplateForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 저장 실패');
    }
  };

  // [advice from AI] 규칙 관리
  const saveRule = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingRule 
        ? `/api/admin/notifications/rules/${editingRule.id}`
        : '/api/admin/notifications/rules';
      
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ruleForm)
      });

      if (!response.ok) {
        throw new Error('규칙 저장 실패');
      }

      setSuccess('알림 규칙이 성공적으로 저장되었습니다.');
      setRuleDialogOpen(false);
      setEditingRule(null);
      resetRuleForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '규칙 저장 실패');
    }
  };

  // [advice from AI] 폼 리셋 함수들
  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      type: 'email',
      subject: '',
      content: '',
      isActive: true
    });
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      event: '',
      condition: '',
      actions: [],
      isActive: true,
      recipients: [],
      priority: 'medium'
    });
  };

  // [advice from AI] 편집 모드 시작 함수들
  const startEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      isActive: template.isActive
    });
    setTemplateDialogOpen(true);
  };

  const startEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      event: rule.event,
      condition: rule.condition,
      actions: rule.actions,
      isActive: rule.isActive,
      recipients: rule.recipients,
      priority: rule.priority
    });
    setRuleDialogOpen(true);
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
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
          알림 설정
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
          <Tab label="이메일 설정" />
          <Tab label="시스템 알림" />
          <Tab label="템플릿 관리" />
          <Tab label="알림 규칙" />
          <Tab label="알림 로그" />
        </Tabs>
      </Box>

      {/* 이메일 설정 탭 */}
      {activeTab === 0 && (
        <Card>
          <CardHeader title="이메일 알림 설정" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.enabled}
                      onChange={(e) => setEmailSettings({ ...emailSettings, enabled: e.target.checked })}
                    />
                  }
                  label="이메일 알림 활성화"
                />
              </Grid>

              {emailSettings.enabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP 호스트"
                      value={emailSettings.smtpHost}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="SMTP 포트"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SMTP 사용자명"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="SMTP 비밀번호"
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="발신자 이메일"
                      value={emailSettings.fromEmail}
                      onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="발신자 이름"
                      value={emailSettings.fromName}
                      onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={emailSettings.useTLS}
                            onChange={(e) => setEmailSettings({ ...emailSettings, useTLS: e.target.checked })}
                          />
                        }
                        label="TLS 사용"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={emailSettings.useSSL}
                            onChange={(e) => setEmailSettings({ ...emailSettings, useSSL: e.target.checked })}
                          />
                        }
                        label="SSL 사용"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        onClick={saveEmailSettings}
                      >
                        설정 저장
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setTestEmailDialogOpen(true)}
                      >
                        이메일 테스트
                      </Button>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 시스템 알림 탭 */}
      {activeTab === 1 && (
        <Card>
          <CardHeader title="시스템 알림 설정" />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.enabled}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enabled: e.target.checked })}
                    />
                  }
                  label="시스템 알림 활성화"
                />
              </Grid>

              {systemSettings.enabled && (
                <>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.browserPush}
                          onChange={(e) => setSystemSettings({ ...systemSettings, browserPush: e.target.checked })}
                        />
                      }
                      label="브라우저 푸시 알림"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.inAppNotification}
                          onChange={(e) => setSystemSettings({ ...systemSettings, inAppNotification: e.target.checked })}
                        />
                      }
                      label="앱 내 알림"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.soundEnabled}
                          onChange={(e) => setSystemSettings({ ...systemSettings, soundEnabled: e.target.checked })}
                        />
                      }
                      label="소리 알림"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.desktopNotification}
                          onChange={(e) => setSystemSettings({ ...systemSettings, desktopNotification: e.target.checked })}
                        />
                      }
                      label="데스크톱 알림"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={saveSystemSettings}
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

      {/* 템플릿 관리 탭 */}
      {activeTab === 2 && (
        <Card>
          <CardHeader
            title="알림 템플릿"
            action={
              <Button
                variant="contained"
                onClick={() => {
                  setEditingTemplate(null);
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
                    <TableCell>제목</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>생성일</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>
                        <Chip label={template.type} size="small" />
                      </TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        <Chip
                          label={template.isActive ? '활성' : '비활성'}
                          color={template.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(template.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => startEditTemplate(template)}
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

      {/* 알림 규칙 탭 */}
      {activeTab === 3 && (
        <Card>
          <CardHeader
            title="알림 규칙"
            action={
              <Button
                variant="contained"
                onClick={() => {
                  setEditingRule(null);
                  resetRuleForm();
                  setRuleDialogOpen(true);
                }}
              >
                새 규칙
              </Button>
            }
          />
          <CardContent>
            <Grid container spacing={2}>
              {rules.map((rule) => (
                <Grid item xs={12} md={6} key={rule.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">{rule.name}</Typography>
                        <Chip
                          label={rule.isActive ? '활성' : '비활성'}
                          color={rule.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        이벤트: {rule.event}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          label={rule.priority}
                          color={getPriorityColor(rule.priority) as any}
                          size="small"
                        />
                        <Badge badgeContent={rule.actions.length} color="primary">
                          <Typography variant="caption">액션</Typography>
                        </Badge>
                      </Box>
                      <Button
                        size="small"
                        onClick={() => startEditRule(rule)}
                      >
                        수정
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 알림 로그 탭 */}
      {activeTab === 4 && (
        <Card>
          <CardHeader title="알림 로그" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>타입</TableCell>
                    <TableCell>수신자</TableCell>
                    <TableCell>제목</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>전송일시</TableCell>
                    <TableCell>오류 메시지</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Chip label={log.type} size="small" />
                      </TableCell>
                      <TableCell>{log.recipient}</TableCell>
                      <TableCell>{log.subject}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          color={getStatusColor(log.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(log.sentAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.errorMessage && (
                          <Tooltip title={log.errorMessage}>
                            <Typography variant="caption" color="error">
                              오류 발생
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 템플릿 편집 다이얼로그 */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? '템플릿 수정' : '새 템플릿 생성'}
        </DialogTitle>
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
              <FormControl fullWidth>
                <InputLabel>타입</InputLabel>
                <Select
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value as any })}
                >
                  <MenuItem value="email">이메일</MenuItem>
                  <MenuItem value="system">시스템</MenuItem>
                  <MenuItem value="both">둘 다</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="제목"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="내용"
                multiline
                rows={6}
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                placeholder="사용 가능한 변수: {{username}}, {{email}}, {{date}} 등"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={templateForm.isActive}
                    onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                  />
                }
                label="활성 상태"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>취소</Button>
          <Button onClick={saveTemplate} variant="contained">
            {editingTemplate ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 규칙 편집 다이얼로그 */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRule ? '알림 규칙 수정' : '새 알림 규칙 생성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="규칙 이름"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>이벤트</InputLabel>
                <Select
                  value={ruleForm.event}
                  onChange={(e) => setRuleForm({ ...ruleForm, event: e.target.value })}
                >
                  <MenuItem value="user_login">사용자 로그인</MenuItem>
                  <MenuItem value="user_logout">사용자 로그아웃</MenuItem>
                  <MenuItem value="system_error">시스템 오류</MenuItem>
                  <MenuItem value="backup_completed">백업 완료</MenuItem>
                  <MenuItem value="backup_failed">백업 실패</MenuItem>
                  <MenuItem value="security_alert">보안 경고</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="조건"
                multiline
                rows={3}
                value={ruleForm.condition}
                onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
                placeholder="예: error_level >= 'high'"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={ruleForm.priority}
                  onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value as any })}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="urgent">긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.isActive}
                    onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                  />
                }
                label="활성 상태"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>취소</Button>
          <Button onClick={saveRule} variant="contained">
            {editingRule ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 이메일 테스트 다이얼로그 */}
      <Dialog open={testEmailDialogOpen} onClose={() => setTestEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>이메일 테스트</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="테스트 이메일 주소"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestEmailDialogOpen(false)}>취소</Button>
          <Button onClick={testEmailConnection} variant="contained">
            테스트 전송
          </Button>
        </DialogActions>
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

export default NotificationSettings;
