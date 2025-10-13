// [advice from AI] 시스템 관리 페이지 - 관리자 전용 시스템 설정
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import MonitoringConfiguration from './MonitoringConfiguration';

// [advice from AI] 시스템 설정 타입
interface SystemConfig {
  category: string;
  settings: {
    key: string;
    name: string;
    value: any;
    type: 'boolean' | 'string' | 'number';
    description: string;
  }[];
}

// [advice from AI] 사용자 데이터 타입
interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role_type: string;
  status: string;
  last_login: string;
  created_at: string;
}

const SystemManagement: React.FC = () => {
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);

  // [advice from AI] 사용자 목록 로드
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('사용자 목록 로드 실패');
      }

      const data = await response.json();
      setUsers(data.users || []);
      
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 시스템 설정 로드
  const loadSystemConfigs = async () => {
    try {
      const response = await fetch('/api/admin/system-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('시스템 설정 로드 실패');
      }

      const data = await response.json();
      setSystemConfigs(data.configs || []);
      
    } catch (error) {
      console.error('시스템 설정 로드 실패:', error);
    }
  };

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUsers(), loadSystemConfigs()]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 사용자 상태 변경
  const handleUserStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('사용자 상태 변경 실패');
      }

      loadUsers();
      
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
    }
  };

  // [advice from AI] 시스템 설정 변경
  const handleConfigChange = async (category: string, key: string, value: any) => {
    try {
      const response = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category, key, value })
      });

      if (!response.ok) {
        throw new Error('시스템 설정 변경 실패');
      }

      loadSystemConfigs();
      
    } catch (error) {
      console.error('시스템 설정 변경 실패:', error);
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
          시스템 관리에 접근할 권한이 없습니다.
        </Alert>
      </Box>
    );
  }

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
      <Typography variant="h4" gutterBottom>
        시스템 관리
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        시스템 전반의 설정과 사용자를 관리합니다
      </Typography>

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="대시보드" />
        <Tab label={`사용자 관리 (${users.length})`} />
        <Tab label="모니터링 설정" />
        <Tab label="시스템 설정" />
        <Tab label="보안 설정" />
        <Tab label="로그 관리" />
      </Tabs>

      {/* [advice from AI] 탭 컨텐츠 */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  총 사용자 수
                </Typography>
                <Typography variant="h4" color="primary">
                  {users.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  활성 사용자
                </Typography>
                <Typography variant="h4" color="success.main">
                  {users.filter(u => u.status === 'active').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  관리자 계정
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {users.filter(u => ['admin', 'executive'].includes(u.role_type)).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  시스템 상태
                </Typography>
                <Typography variant="h4" color="success.main">
                  정상
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 사용자 관리 탭 */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>사용자명</TableCell>
                <TableCell>이메일</TableCell>
                <TableCell>이름</TableCell>
                <TableCell>역할</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>마지막 로그인</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role_type} 
                      color={user.role_type === 'admin' ? 'error' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status} 
                      color={user.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : '없음'}
                  </TableCell>
                  <TableCell align="center">
                    <Button 
                      size="small" 
                      color={user.status === 'active' ? 'warning' : 'success'}
                      onClick={() => handleUserStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active')}
                    >
                      {user.status === 'active' ? '비활성화' : '활성화'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* [advice from AI] 시스템 설정 탭 */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {systemConfigs.map((config) => (
            <Grid item xs={12} md={6} key={config.category}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {config.category}
                </Typography>
                {config.settings.map((setting) => (
                  <Box key={setting.key} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {setting.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {setting.description}
                    </Typography>
                    {setting.type === 'boolean' && (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={setting.value}
                            onChange={(e) => handleConfigChange(config.category, setting.key, e.target.checked)}
                          />
                        }
                        label={setting.value ? '활성화' : '비활성화'}
                      />
                    )}
                    {setting.type === 'string' && (
                      <Typography variant="body1">
                        {setting.value}
                      </Typography>
                    )}
                    {setting.type === 'number' && (
                      <Typography variant="body1">
                        {setting.value}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 모니터링 설정 탭 */}
      {tabValue === 2 && (
        <MonitoringConfiguration />
      )}

      {/* [advice from AI] 기타 탭들 */}
      {tabValue === 3 && (
        <Alert severity="info">
          시스템 설정 기능은 개발 중입니다.
        </Alert>
      )}

      {tabValue === 4 && (
        <Alert severity="info">
          보안 설정 기능은 개발 중입니다.
        </Alert>
      )}

      {tabValue === 5 && (
        <Alert severity="info">
          로그 관리 기능은 개발 중입니다.
        </Alert>
      )}
    </Box>
  );
};

export default SystemManagement;
