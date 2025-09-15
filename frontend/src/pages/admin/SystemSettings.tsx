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
// [advice from AI] API 클라이언트 import
import { api } from '../../utils/apiClient';

// [advice from AI] 시스템 설정을 위한 인터페이스 정의
interface SystemSetting {
  id: number;
  key: string;
  settings: any;
  updatedAt: string;
  updatedBy: string;
}

interface SettingCategory {
  id: string;
  name: string;
  description: string;
  settings: SystemSetting[];
}

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 설정 카테고리 상태
  const [categories, setCategories] = useState<SettingCategory[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  // 편집 다이얼로그 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [settingForm, setSettingForm] = useState({
    key: '',
    settings: {} as any
  });

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // [advice from AI] API 클라이언트를 사용하여 토큰 만료 감지
      const response = await api.get<{ settings: SystemSetting[] }>('/api/admin/settings');
      
      setSettings(response.data?.settings || []);
      
      // 설정을 카테고리별로 그룹화
      const groupedSettings = groupSettingsByCategory(response.data?.settings || []);
      setCategories(groupedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 설정을 카테고리별로 그룹화
  const groupSettingsByCategory = (settingsList: SystemSetting[]): SettingCategory[] => {
    const categoryMap = new Map<string, SettingCategory>();

    settingsList.forEach(setting => {
      const categoryId = getCategoryId(setting.key);
      const categoryName = getCategoryName(categoryId);
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          description: getCategoryDescription(categoryId),
          settings: []
        });
      }
      
      categoryMap.get(categoryId)!.settings.push(setting);
    });

    return Array.from(categoryMap.values());
  };

  const getCategoryId = (key: string): string => {
    if (key.includes('email') || key.includes('smtp')) return 'notifications';
    if (key.includes('security') || key.includes('auth')) return 'security';
    if (key.includes('database') || key.includes('storage')) return 'database';
    if (key.includes('cache') || key.includes('redis')) return 'performance';
    if (key.includes('logging') || key.includes('log')) return 'logging';
    return 'general';
  };

  const getCategoryName = (categoryId: string): string => {
    const names: { [key: string]: string } = {
      notifications: '알림 설정',
      security: '보안 설정',
      database: '데이터베이스 설정',
      performance: '성능 설정',
      logging: '로깅 설정',
      general: '일반 설정'
    };
    return names[categoryId] || '기타';
  };

  const getCategoryDescription = (categoryId: string): string => {
    const descriptions: { [key: string]: string } = {
      notifications: '이메일 및 시스템 알림 관련 설정',
      security: '보안 및 인증 관련 설정',
      database: '데이터베이스 연결 및 설정',
      performance: '캐시 및 성능 최적화 설정',
      logging: '로그 레벨 및 로깅 설정',
      general: '일반적인 시스템 설정'
    };
    return descriptions[categoryId] || '기타 설정';
  };

  // [advice from AI] 설정 저장
  const saveSetting = async () => {
    try {
      // [advice from AI] API 클라이언트를 사용하여 토큰 만료 감지
      await api.put(`/api/admin/settings/${editingSetting?.key || settingForm.key}`, {
        settings: settingForm.settings
      });

      setSuccess('설정이 성공적으로 저장되었습니다.');
      setEditDialogOpen(false);
      setEditingSetting(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 저장 실패');
    }
  };

  // [advice from AI] 설정 편집 시작
  const startEditSetting = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setSettingForm({
      key: setting.key,
      settings: setting.settings
    });
    setEditDialogOpen(true);
  };

  // [advice from AI] 설정 값 업데이트
  const updateSettingValue = (path: string, value: any) => {
    const newSettings = { ...settingForm.settings };
    const keys = path.split('.');
    let current = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setSettingForm({ ...settingForm, settings: newSettings });
  };

  // [advice from AI] 카테고리별 아이콘
  const getCategoryIcon = (categoryId: string) => {
    return null; // 아이콘 사용 최소화
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
          시스템 설정
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
          {categories.map((category, index) => (
            <Tab key={category.id} label={category.name} />
          ))}
        </Tabs>
      </Box>

      {/* 설정 카테고리별 표시 */}
      {categories.map((category, index) => (
        activeTab === index && (
          <Card key={category.id}>
            <CardHeader title={category.name} subheader={category.description} />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>설정 키</TableCell>
                      <TableCell>현재 값</TableCell>
                      <TableCell>마지막 수정</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {category.settings.map((setting) => (
                      <TableRow key={setting.id}>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                            {setting.key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap>
                              {JSON.stringify(setting.settings).substring(0, 100)}
                              {JSON.stringify(setting.settings).length > 100 ? '...' : ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(setting.updatedAt).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => startEditSetting(setting)}
                          >
                            편집
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )
      ))}

      {/* 설정 편집 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          설정 편집: {editingSetting?.key}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              JSON 형태로 설정을 편집할 수 있습니다.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              label="설정 값 (JSON)"
              value={JSON.stringify(settingForm.settings, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setSettingForm({ ...settingForm, settings: parsed });
                } catch (err) {
                  // JSON 파싱 오류는 무시 (편집 중일 수 있음)
                }
              }}
              error={(() => {
                try {
                  JSON.parse(JSON.stringify(settingForm.settings));
                  return false;
                } catch {
                  return true;
                }
              })()}
              helperText="유효한 JSON 형식으로 입력해주세요."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button onClick={saveSetting} variant="contained">
            저장
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

export default SystemSettings;