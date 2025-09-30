// [advice from AI] 운영센터 재설계 - 5단계 구조
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Input
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

const OperationsCenterRedesigned: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // STEP 1: 배포 요청 관리
  const [deploymentRequests, setDeploymentRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalReason, setApprovalReason] = useState('');
  
  // PE 지원 요청 시스템
  const [supportDialog, setSupportDialog] = useState(false);
  const [supportRequest, setSupportRequest] = useState({
    project_name: '',
    issue_type: 'build_failure',
    description: '',
    screenshot_data: null as File | null,
    urgency_level: 'medium'
  });
  const [availablePEs, setAvailablePEs] = useState<any[]>([]);
  const [selectedPE, setSelectedPE] = useState('');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // 시스템 등록 요청 직접 조회 (deployment-requests API 대신)
      const response = await fetch('http://rdc.rickyson.com:3001/api/po/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 운영센터 데이터 로드 완료');
        
        // PE 목록 로드
        setAvailablePEs([
          { id: 'pe1', name: 'PE (프로젝트 엔지니어)', speciality: 'Backend' },
          { id: 'pe2', name: '김신백', speciality: 'Frontend' },
          { id: 'pe3', name: '이개발', speciality: 'DevOps' },
          { id: 'pe4', name: '박코딩', speciality: 'Full Stack' }
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // PE 지원 요청 처리
  const handleSupportRequest = async () => {
    if (!supportRequest.description.trim() || !selectedPE) {
      alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    try {
      // 이슈 보고서 생성 API 호출
      const formData = new FormData();
      formData.append('project_name', supportRequest.project_name);
      formData.append('issue_type', supportRequest.issue_type);
      formData.append('description', supportRequest.description);
      formData.append('assigned_to', selectedPE);
      formData.append('urgency_level', supportRequest.urgency_level);
      formData.append('created_by', 'operations');
      
      if (supportRequest.screenshot_data) {
        formData.append('screenshot', supportRequest.screenshot_data);
      }

      const response = await fetch('http://rdc.rickyson.com:3001/api/operations/create-pe-support-issue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (response.ok) {
        alert('PE 지원 요청이 성공적으로 전송되었습니다!');
        setSupportDialog(false);
        setSupportRequest({
          project_name: '',
          issue_type: 'build_failure',
          description: '',
          screenshot_data: null,
          urgency_level: 'medium'
        });
        setSelectedPE('');
      } else {
        alert('PE 지원 요청 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('PE 지원 요청 오류:', error);
      alert('PE 지원 요청 중 오류가 발생했습니다.');
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
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          운영 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          배포 요청 관리, 파이프라인 설정, 빌드 모니터링, 배포 실행, 성능 모니터링
        </Typography>
      </Box>

      {/* 5단계 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="1. 배포 요청 관리" />
          <Tab label="2. 파이프라인 설정" />
          <Tab label="3. 빌드 모니터링" />
          <Tab label="4. 배포 실행" />
          <Tab label="5. 성능 모니터링" />
        </Tabs>
      </Paper>

      {/* STEP 1: 배포 요청 관리 */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              📋 배포 요청 접수 및 검토
            </Typography>
            
            {/* ECP-AI 샘플 배포 요청 */}
            <Alert severity="info" sx={{ mb: 3 }}>
              🚀 <strong>ECP-AI K8s Orchestrator v2.0</strong> 배포 요청이 접수되었습니다.
              QA 검증 완료 (92점), PO 최종 승인 완료 상태입니다.
            </Alert>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>요청자</TableCell>
                    <TableCell>환경</TableCell>
                    <TableCell>우선순위</TableCell>
                    <TableCell>QA 점수</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ECP-AI K8s Orchestrator v2.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Multi-tenant AI Service Deployment System
                      </Typography>
                    </TableCell>
                    <TableCell>PO (프로덕트 오너)</TableCell>
                    <TableCell>
                      <Chip label="Production" color="error" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label="높음" color="error" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label="92점" color="success" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label="검토 대기" color="warning" size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            setSelectedRequest({
                              id: 'ecp-ai-sample',
                              name: 'ECP-AI K8s Orchestrator v2.0',
                              description: 'Multi-tenant AI Service Deployment System',
                              repo_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator'
                            });
                            setApprovalAction('approve');
                            setApprovalDialog(true);
                          }}
                        >
                          승인
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedRequest({
                              id: 'ecp-ai-sample',
                              name: 'ECP-AI K8s Orchestrator v2.0'
                            });
                            setApprovalAction('reject');
                            setApprovalDialog(true);
                          }}
                        >
                          반려
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            alert('📋 상세 정보:\n\n• 레포지토리: https://github.com/RickySonYH/ecp-ai-k8s-orchestrator\n• QA 점수: 92점\n• 8개 AI 서비스 지원\n• 4개 클라우드 플랫폼 호환');
                          }}
                        >
                          상세보기
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSupportRequest({
                              ...supportRequest,
                              project_name: 'ECP-AI K8s Orchestrator v2.0'
                            });
                            setSupportDialog(true);
                          }}
                        >
                          PE 지원요청
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* 테스트 체크리스트 */}
            <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                ✅ STEP 1 테스트 체크리스트
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. ECP-AI 배포 요청이 목록에 표시되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. 승인/반려 버튼이 정상 작동하는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. 상세보기에서 레포지토리 정보가 표시되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="4. QA 점수 92점이 정확히 표시되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="5. 승인 처리 후 다음 단계로 이동하는가?" />
                </ListItem>
              </List>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* STEP 2: 파이프라인 설정 */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              ⚙️ CI/CD 파이프라인 설정
            </Typography>
            <Alert severity="info">
              ECP-AI 프로젝트용 Jenkins Job 생성 및 GitHub Webhook 설정을 진행합니다.
            </Alert>
            
            <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                ✅ STEP 2 테스트 체크리스트
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. Jenkins Job이 자동 생성되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. GitHub Webhook이 설정되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. 빌드 설정이 올바르게 구성되는가?" />
                </ListItem>
              </List>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* STEP 3: 빌드 모니터링 */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              📊 실시간 빌드 모니터링
            </Typography>
            <Alert severity="info">
              ECP-AI 프로젝트 빌드 상태를 실시간으로 모니터링합니다.
            </Alert>
            
            <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                ✅ STEP 3 테스트 체크리스트
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. 빌드 진행 상황이 실시간 표시되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. 로그 스트리밍이 작동하는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. 빌드 실패 시 알림이 전송되는가?" />
                </ListItem>
              </List>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* STEP 4: 배포 실행 */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              🚀 Kubernetes 배포 실행
            </Typography>
            <Alert severity="info">
              ECP-AI 프로젝트를 Kubernetes 환경에 배포합니다.
            </Alert>
            
            <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                ✅ STEP 4 테스트 체크리스트
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. Kubernetes 매니페스트가 생성되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. Argo CD Application이 생성되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. 배포 진행 상황이 표시되는가?" />
                </ListItem>
              </List>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* STEP 5: 성능 모니터링 */}
      <TabPanel value={tabValue} index={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              📈 성능 모니터링 및 운영
            </Typography>
            <Alert severity="info">
              배포된 ECP-AI 서비스의 성능을 모니터링합니다.
            </Alert>
            
            <Box sx={{ mt: 3, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                ✅ STEP 5 테스트 체크리스트
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. 서비스 상태가 실시간 표시되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. 리소스 사용량이 모니터링되는가?" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. 알림 시스템이 작동하는가?" />
                </ListItem>
              </List>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* 승인/반려 다이얼로그 */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          배포 요청 {approvalAction === 'approve' ? '승인' : '반려'}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>프로젝트:</strong> {selectedRequest.name}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="처리 사유"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder={
                  approvalAction === 'approve' 
                    ? '승인 사유를 입력하세요. (인프라 검토 결과, 리소스 할당 계획 등)'
                    : '반려 사유를 입력하세요. (요구사항 미충족, 리소스 부족 등)'
                }
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            color={approvalAction === 'approve' ? 'primary' : 'error'}
            onClick={() => {
              alert(`배포 요청이 ${approvalAction === 'approve' ? '승인' : '반려'}되었습니다.`);
              setApprovalDialog(false);
              setApprovalReason('');
            }}
          >
            {approvalAction === 'approve' ? '승인' : '반려'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PE 지원 요청 다이얼로그 */}
      <Dialog open={supportDialog} onClose={() => setSupportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          🆘 PE 개발자 지원 요청
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              배포 과정에서 개발자 지원이 필요한 경우 이슈를 생성하여 담당 PE에게 즉시 전달됩니다.
            </Alert>

            <TextField
              fullWidth
              label="프로젝트명"
              value={supportRequest.project_name}
              onChange={(e) => setSupportRequest({...supportRequest, project_name: e.target.value})}
              sx={{ mb: 2 }}
              disabled
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>이슈 유형</InputLabel>
              <Select
                value={supportRequest.issue_type}
                onChange={(e) => setSupportRequest({...supportRequest, issue_type: e.target.value})}
                label="이슈 유형"
              >
                <MenuItem value="build_failure">빌드 실패</MenuItem>
                <MenuItem value="deployment_error">배포 오류</MenuItem>
                <MenuItem value="config_issue">설정 문제</MenuItem>
                <MenuItem value="dependency_error">의존성 오류</MenuItem>
                <MenuItem value="environment_issue">환경 설정 문제</MenuItem>
                <MenuItem value="performance_issue">성능 문제</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>긴급도</InputLabel>
              <Select
                value={supportRequest.urgency_level}
                onChange={(e) => setSupportRequest({...supportRequest, urgency_level: e.target.value})}
                label="긴급도"
              >
                <MenuItem value="critical">🔴 Critical (즉시 처리)</MenuItem>
                <MenuItem value="high">🟠 High (2시간 내)</MenuItem>
                <MenuItem value="medium">🟡 Medium (당일 내)</MenuItem>
                <MenuItem value="low">🟢 Low (3일 내)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>담당 PE 선택</InputLabel>
              <Select
                value={selectedPE}
                onChange={(e) => setSelectedPE(e.target.value)}
                label="담당 PE 선택"
              >
                {availablePEs.map((pe) => (
                  <MenuItem key={pe.id} value={pe.id}>
                    {pe.name} ({pe.speciality})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="상세 설명"
              value={supportRequest.description}
              onChange={(e) => setSupportRequest({...supportRequest, description: e.target.value})}
              placeholder="발생한 문제를 상세히 설명해주세요. 오류 메시지, 재현 방법, 예상 원인 등을 포함하세요."
              sx={{ mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                스크린샷 첨부 (선택사항)
              </Typography>
              <Input
                type="file"
                inputProps={{ accept: 'image/*' }}
                onChange={(e: any) => {
                  const file = e.target.files?.[0];
                  setSupportRequest({...supportRequest, screenshot_data: file});
                }}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                오류 화면, 로그 등의 스크린샷을 첨부하면 더 빠른 해결이 가능합니다.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupportDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleSupportRequest}
            disabled={!supportRequest.description.trim() || !selectedPE}
          >
            긴급 지원 요청
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OperationsCenterRedesigned;
