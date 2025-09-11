import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  BugReport as BugReportIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

// [advice from AI] 테스트 계획 관리 컴포넌트 - 백스테이지IO 스타일
interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'functional' | 'integration' | 'performance' | 'security' | 'usability';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'running' | 'passed' | 'failed' | 'blocked';
  steps: TestStep[];
  expectedResult: string;
  actualResult?: string;
  assignee?: string;
  createdDate: string;
  lastModified: string;
  tags: string[];
  coverage: number;
}

interface TestStep {
  id: string;
  step: string;
  expected: string;
  actual?: string;
  status: 'pending' | 'passed' | 'failed';
}

interface TestPlan {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'completed';
  testCases: TestCase[];
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdDate: string;
  lastModified: string;
}

const TestPlanManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<TestPlan | null>(null);
  const [testPlanDialog, setTestPlanDialog] = useState(false);
  const [testCaseDialog, setTestCaseDialog] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [testExecutionDialog, setTestExecutionDialog] = useState(false);
  const [executingTestCase, setExecutingTestCase] = useState<TestCase | null>(null);

  // [advice from AI] 샘플 테스트 계획 데이터
  const [testPlans] = useState<TestPlan[]>([
    {
      id: 'TP-001',
      name: '사용자 인증 시스템 테스트',
      description: '로그인, 회원가입, 비밀번호 재설정 기능 테스트',
      version: '1.0',
      status: 'active',
      testCases: [
        {
          id: 'TC-001',
          name: '정상 로그인 테스트',
          description: '유효한 사용자 정보로 로그인하는 경우',
          type: 'functional',
          priority: 'critical',
          status: 'passed',
          steps: [
            { id: '1', step: '로그인 페이지 접속', expected: '로그인 폼이 표시됨', status: 'passed' },
            { id: '2', step: '사용자명과 비밀번호 입력', expected: '입력값이 정상적으로 표시됨', status: 'passed' },
            { id: '3', step: '로그인 버튼 클릭', expected: '대시보드 페이지로 이동됨', status: 'passed' }
          ],
          expectedResult: '사용자가 성공적으로 로그인되어 대시보드에 접근할 수 있음',
          actualResult: '정상적으로 로그인됨',
          assignee: '김테스터',
          createdDate: '2024-01-15',
          lastModified: '2024-01-20',
          tags: ['login', 'authentication', 'critical'],
          coverage: 100
        },
        {
          id: 'TC-002',
          name: '잘못된 비밀번호 로그인 테스트',
          description: '잘못된 비밀번호로 로그인 시도하는 경우',
          type: 'functional',
          priority: 'high',
          status: 'failed',
          steps: [
            { id: '1', step: '로그인 페이지 접속', expected: '로그인 폼이 표시됨', status: 'passed' },
            { id: '2', step: '올바른 사용자명과 잘못된 비밀번호 입력', expected: '입력값이 정상적으로 표시됨', status: 'passed' },
            { id: '3', step: '로그인 버튼 클릭', expected: '오류 메시지가 표시됨', status: 'failed' }
          ],
          expectedResult: '잘못된 비밀번호 오류 메시지가 표시됨',
          actualResult: '시스템 오류가 발생함',
          assignee: '김테스터',
          createdDate: '2024-01-15',
          lastModified: '2024-01-20',
          tags: ['login', 'error-handling', 'validation'],
          coverage: 0
        }
      ],
      startDate: '2024-01-15',
      endDate: '2024-01-25',
      createdBy: '김테스터',
      createdDate: '2024-01-15',
      lastModified: '2024-01-20'
    }
  ]);

  // [advice from AI] 테스트 타입별 색상
  const getTestTypeColor = (type: TestCase['type']) => {
    const colors = {
      functional: 'primary',
      integration: 'secondary',
      performance: 'warning',
      security: 'error',
      usability: 'info'
    } as const;
    return colors[type];
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: TestCase['priority']) => {
    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'default'
    } as const;
    return colors[priority];
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: TestCase['status']) => {
    const colors = {
      draft: 'default',
      ready: 'info',
      running: 'warning',
      passed: 'success',
      failed: 'error',
      blocked: 'error'
    } as const;
    return colors[status];
  };

  // [advice from AI] 테스트 실행
  const executeTestCase = (testCase: TestCase) => {
    setExecutingTestCase(testCase);
    setTestExecutionDialog(true);
  };

  // [advice from AI] 테스트 결과 업데이트
  const updateTestResult = (testCaseId: string, result: 'passed' | 'failed', actualResult: string) => {
    // 실제 구현에서는 API 호출
    console.log('테스트 결과 업데이트:', { testCaseId, result, actualResult });
    setTestExecutionDialog(false);
    setExecutingTestCase(null);
  };

  return (
    <Box>
      {/* [advice from AI] 테스트 계획 관리 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          테스트 계획 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          테스트 계획을 생성하고 관리하며, 테스트 케이스를 실행하고 결과를 추적합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 테스트 계획 목록 */}
      <BackstageCard title="테스트 계획 목록" variant="default">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            활성 테스트 계획
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTestPlanDialog(true)}
          >
            새 테스트 계획
          </Button>
        </Box>

        <Grid container spacing={3}>
          {testPlans.map((plan) => (
            <Grid item xs={12} md={6} key={plan.id}>
              <Card 
                variant="outlined"
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 2,
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {plan.name}
                    </Typography>
                    <Chip 
                      label={plan.status.toUpperCase()} 
                      color={getStatusColor(plan.status as any)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {plan.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={`v${plan.version}`} size="small" variant="outlined" />
                    <Chip label={`${plan.testCases.length}개 테스트`} size="small" variant="outlined" />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      생성자: {plan.createdBy}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {plan.lastModified}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </BackstageCard>

      {/* [advice from AI] 선택된 테스트 계획 상세 */}
      {selectedPlan && (
        <BackstageCard title={`${selectedPlan.name} - 테스트 케이스`} variant="default">
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              테스트 케이스 목록 ({selectedPlan.testCases.length}개)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setTestCaseDialog(true)}
            >
              테스트 케이스 추가
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>이름</TableCell>
                  <TableCell>타입</TableCell>
                  <TableCell>우선순위</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>담당자</TableCell>
                  <TableCell>커버리지</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedPlan.testCases.map((testCase) => (
                  <TableRow key={testCase.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {testCase.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {testCase.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {testCase.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={testCase.type.toUpperCase()} 
                        color={getTestTypeColor(testCase.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={testCase.priority.toUpperCase()} 
                        color={getPriorityColor(testCase.priority)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={testCase.status.toUpperCase()} 
                        color={getStatusColor(testCase.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {testCase.assignee || '미할당'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {testCase.coverage}%
                        </Typography>
                        <Box sx={{ width: 60, height: 8, backgroundColor: 'grey.200', borderRadius: 1 }}>
                          <Box 
                            sx={{ 
                              width: `${testCase.coverage}%`, 
                              height: '100%', 
                              backgroundColor: testCase.coverage >= 90 ? 'success.main' : testCase.coverage >= 70 ? 'warning.main' : 'error.main',
                              borderRadius: 1
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => executeTestCase(testCase)}
                          disabled={testCase.status === 'running'}
                        >
                          <PlayIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setEditingTestCase(testCase)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </BackstageCard>
      )}

      {/* [advice from AI] 테스트 실행 다이얼로그 */}
      <Dialog 
        open={testExecutionDialog} 
        onClose={() => setTestExecutionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          테스트 실행: {executingTestCase?.name}
        </DialogTitle>
        <DialogContent>
          {executingTestCase && (
            <Box>
              <Typography variant="body2" sx={{ mb: 3 }}>
                {executingTestCase.description}
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                테스트 단계
              </Typography>
              
              <Stepper orientation="vertical">
                {executingTestCase.steps.map((step, index) => (
                  <Step key={step.id} active={true}>
                    <StepLabel>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {step.step}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          예상 결과: {step.expected}
                        </Typography>
                        <TextField
                          label="실제 결과"
                          value={step.actual || ''}
                          onChange={(e) => {
                            // 실제 구현에서는 상태 업데이트
                          }}
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                        />
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  최종 결과
                </Typography>
                <TextField
                  label="실제 결과"
                  value={executingTestCase.actualResult || ''}
                  onChange={(e) => {
                    // 실제 구현에서는 상태 업데이트
                  }}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestExecutionDialog(false)}>
            취소
          </Button>
          <Button 
            onClick={() => updateTestResult(executingTestCase!.id, 'failed', '실패')}
            color="error"
            variant="outlined"
          >
            실패
          </Button>
          <Button 
            onClick={() => updateTestResult(executingTestCase!.id, 'passed', '성공')}
            color="success"
            variant="contained"
          >
            통과
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestPlanManager;
