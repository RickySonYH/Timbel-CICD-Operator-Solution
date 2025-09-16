// [advice from AI] 메시지 센터 테스트 컴포넌트
// 승인 요청 생성, 알림 테스트 등의 기능

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import ApproverSelector from '../approvals/ApproverSelector';

const MessageCenterTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [approverSelectorOpen, setApproverSelectorOpen] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState<any[]>([]);
  const { user, token } = useJwtAuthStore();

  // [advice from AI] 테스트 승인 요청 데이터
  const [testRequest, setTestRequest] = useState({
    title: '테스트 컴포넌트 배포 승인',
    description: '새로운 UI 컴포넌트의 배포 승인을 요청합니다.',
    type: 'code_component',
    component_name: 'TestComponent',
    version: '1.0.0',
    priority: 'medium'
  });

  // [advice from AI] 테스트 승인 요청 생성
  const createTestApprovalRequest = async () => {
    if (!user) {
      setResult('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      if (!token) {
        setResult('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/approvals/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...testRequest,
          approvers: selectedApprovers.length > 0 ? selectedApprovers : [
            { user_id: 'pe-001', config: { step: 1 } },
            { user_id: 'qa-001', config: { step: 2 } }
          ]
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult(`✅ 테스트 승인 요청 생성 성공!\nRequest ID: ${data.data.request_id}`);
      } else {
        setResult(`❌ 승인 요청 생성 실패: ${data.error || '알 수 없는 오류'}`);
      }

    } catch (error) {
      setResult(`❌ 네트워크 오류: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 테스트 의사결정 요청 생성
  const createTestDecisionRequest = async () => {
    if (!user) {
      setResult('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      if (!token) {
        setResult('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/approvals/decisions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: '테스트 기술 스택 선택',
          description: '새 프로젝트에서 사용할 기술 스택을 결정해주세요.',
          type: 'technical',
          priority: 'high',
          voting_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          participants: [
            { user_id: 'pe-001', role: 'voter' },
            { user_id: 'qa-001', role: 'voter' },
            { user_id: 'po-001', role: 'decision_maker' }
          ]
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult(`✅ 테스트 의사결정 요청 생성 성공!\nRequest ID: ${data.data.request_id}`);
      } else {
        setResult(`❌ 의사결정 요청 생성 실패: ${data.error || '알 수 없는 오류'}`);
      }

    } catch (error) {
      setResult(`❌ 네트워크 오류: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 알림 센터 통계 테스트
  const testNotificationStats = async () => {
    if (!user) {
      setResult('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      if (!token) {
        setResult('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/approvals/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult(`✅ 알림 센터 통계 조회 성공!\n${JSON.stringify(data.data, null, 2)}`);
      } else {
        setResult(`❌ 통계 조회 실패: ${data.error || '알 수 없는 오류'}`);
      }

    } catch (error) {
      setResult(`❌ 네트워크 오류: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        메시지 센터 테스트
      </Typography>
      
      <Grid container spacing={3}>
        {/* [advice from AI] 테스트 승인 요청 생성 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                테스트 승인 요청 생성
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="제목"
                  value={testRequest.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestRequest({...testRequest, title: e.target.value})}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="설명"
                  multiline
                  rows={3}
                  value={testRequest.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestRequest({...testRequest, description: e.target.value})}
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>승인 유형</InputLabel>
                  <Select
                    value={testRequest.type}
                    onChange={(e: any) => setTestRequest({...testRequest, type: e.target.value})}
                  >
                    <MenuItem value="code_component">코드 컴포넌트</MenuItem>
                    <MenuItem value="solution_deployment">솔루션 배포</MenuItem>
                    <MenuItem value="prototype_qc">프로토타입 QC</MenuItem>
                    <MenuItem value="release_approval">출시 승인</MenuItem>
                    <MenuItem value="bug_fix">버그 수정</MenuItem>
                    <MenuItem value="architecture_change">아키텍처 변경</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>우선순위</InputLabel>
                  <Select
                    value={testRequest.priority}
                    onChange={(e: any) => setTestRequest({...testRequest, priority: e.target.value})}
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="urgent">긴급</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ mb: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setApproverSelectorOpen(true)}
                  >
                    승인권자 선택 ({selectedApprovers.length}명)
                  </Button>
                  
                  {selectedApprovers.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {selectedApprovers.map((approver: any, index: number) => (
                        <Chip
                          key={approver.user_id}
                          label={`${index + 1}. ${approver.full_name} (${approver.role_type})`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                onClick={createTestApprovalRequest}
                disabled={loading}
              >
                테스트 승인 요청 생성
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 테스트 의사결정 요청 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                테스트 기능들
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={createTestDecisionRequest}
                  disabled={loading}
                >
                  테스트 의사결정 요청 생성
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={testNotificationStats}
                  disabled={loading}
                >
                  알림 센터 통계 테스트
                </Button>
                
                <Divider />
                
                <Typography variant="body2" color="text.secondary">
                  현재 사용자: {user?.fullName} ({user?.roleType})
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 테스트 결과 표시 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                테스트 결과
              </Typography>
              
              {result && (
                <Alert 
                  severity={result.includes('✅') ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                >
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {result}
                  </pre>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 승인권자 선택 다이얼로그 */}
      <ApproverSelector
        open={approverSelectorOpen}
        onClose={() => setApproverSelectorOpen(false)}
        onApproversSelected={(approvers: any[]) => {
          setSelectedApprovers(approvers);
          setApproverSelectorOpen(false);
        }}
        approvalType={testRequest.type}
        initialApprovers={selectedApprovers}
      />
    </Box>
  );
};

export default MessageCenterTest;
