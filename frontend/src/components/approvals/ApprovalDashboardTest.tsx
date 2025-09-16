// [advice from AI] 승인 대시보드 테스트 컴포넌트
// Mock 데이터 생성 및 API 연동 테스트

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

const ApprovalDashboardTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, token } = useJwtAuthStore();

  // [advice from AI] 테스트 결과 추가
  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // [advice from AI] 대시보드 통계 API 테스트
  const testDashboardStats = async () => {
    if (!user || !token) {
      addTestResult('❌ 로그인이 필요합니다');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/approvals/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        addTestResult(`✅ 대시보드 통계 조회 성공`);
        addTestResult(`📊 승인 대기: ${data.data.pending_approvals?.total_pending || 0}건`);
        addTestResult(`📋 내 요청: ${data.data.my_requests?.total_requests || 0}건`);
        addTestResult(`📨 읽지 않은 메시지: ${data.data.unread_messages?.total_unread || 0}건`);
      } else {
        addTestResult(`❌ 통계 조회 실패: ${data.error || '알 수 없는 오류'}`);
      }

    } catch (error) {
      addTestResult(`❌ 네트워크 오류: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 내가 승인해야 할 항목들 API 테스트
  const testPendingApprovals = async () => {
    if (!user || !token) {
      addTestResult('❌ 로그인이 필요합니다');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/approvals/requests?my_approvals=true&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        addTestResult(`✅ 승인 대기 목록 조회 성공`);
        addTestResult(`📋 총 ${data.data?.length || 0}개 항목`);
        if (data.data && data.data.length > 0) {
          data.data.forEach((item: any, index: number) => {
            addTestResult(`  ${index + 1}. ${item.title} (${item.priority})`);
          });
        }
      } else {
        addTestResult(`❌ 승인 대기 목록 조회 실패: ${data.error || '알 수 없는 오류'}`);
      }

    } catch (error) {
      addTestResult(`❌ 네트워크 오류: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 내가 요청한 승인들 API 테스트
  const testMyRequests = async () => {
    if (!user || !token) {
      addTestResult('❌ 로그인이 필요합니다');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/approvals/requests?my_requests=true&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        addTestResult(`✅ 내 요청 목록 조회 성공`);
        addTestResult(`📋 총 ${data.data?.length || 0}개 항목`);
        if (data.data && data.data.length > 0) {
          data.data.forEach((item: any, index: number) => {
            addTestResult(`  ${index + 1}. ${item.title} (${item.status})`);
          });
        }
      } else {
        addTestResult(`❌ 내 요청 목록 조회 실패: ${data.error || '알 수 없는 오류'}`);
      }

    } catch (error) {
      addTestResult(`❌ 네트워크 오류: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 권한 레벨 정보 API 테스트
  const testPermissionLevels = async () => {
    if (!user || !token) {
      addTestResult('❌ 로그인이 필요합니다');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/approvals/permission-levels', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        addTestResult(`✅ 권한 레벨 정보 조회 성공`);
        Object.entries(data.data).forEach(([level, info]: [string, any]) => {
          addTestResult(`  Level ${level}: ${info.name} - ${info.description}`);
        });
      } else {
        addTestResult(`❌ 권한 레벨 조회 실패: ${data.error || '알 수 없는 오류'}`);
      }

    } catch (error) {
      addTestResult(`❌ 네트워크 오류: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 모든 테스트 실행
  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('🚀 승인 대시보드 통합 테스트 시작');
    
    await testDashboardStats();
    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
    
    await testPendingApprovals();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testMyRequests();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testPermissionLevels();
    
    addTestResult('🎉 모든 테스트 완료');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        승인 대시보드 테스트
      </Typography>
      
      <Grid container spacing={3}>
        {/* [advice from AI] 테스트 버튼들 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API 테스트
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={runAllTests}
                  disabled={loading}
                  fullWidth
                >
                  전체 테스트 실행
                </Button>
                
                <Divider />
                
                <Button
                  variant="outlined"
                  onClick={testDashboardStats}
                  disabled={loading}
                >
                  대시보드 통계 테스트
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={testPendingApprovals}
                  disabled={loading}
                >
                  승인 대기 목록 테스트
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={testMyRequests}
                  disabled={loading}
                >
                  내 요청 목록 테스트
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={testPermissionLevels}
                  disabled={loading}
                >
                  권한 레벨 정보 테스트
                </Button>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  현재 사용자: {user?.fullName} ({user?.roleType})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  권한 레벨: {user?.permissionLevel}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 테스트 결과 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                테스트 결과
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {testResults.length > 0 ? (
                  <List dense>
                    {testResults.map((result, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={result}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              color: result.includes('✅') ? 'success.main' : 
                                     result.includes('❌') ? 'error.main' : 
                                     result.includes('📊') || result.includes('📋') || result.includes('📨') ? 'info.main' :
                                     'text.primary'
                            }}
                          />
                        </ListItem>
                        {index < testResults.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    테스트를 실행하면 결과가 여기에 표시됩니다.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ApprovalDashboardTest;
