// [advice from AI] QA/QC 센터 - 백스테이지IO 스타일 품질 관리 시스템
// 개발계획서 4.4 QA/QC 부서 레벨 구조에 따른 구현

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';
import TestPlanManager from '../../components/qa/TestPlanManager';
import DefectManager from '../../components/qa/DefectManager';

const QACenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 품질 지표 데이터
  const qualityMetrics = [
    { metric: '테스트 커버리지', value: 89, target: 90, status: 'warning', icon: <CheckIcon /> },
    { metric: '결함 밀도', value: 2.3, target: 2.0, status: 'error', icon: <BugReportIcon /> },
    { metric: '코드 품질 점수', value: 85, target: 80, status: 'success', icon: <SpeedIcon /> },
    { metric: '보안 취약점', value: 1, target: 0, status: 'warning', icon: <SecurityIcon /> },
    { metric: '성능 점수', value: 92, target: 85, status: 'success', icon: <TimelineIcon /> },
    { metric: '사용자 만족도', value: 4.2, target: 4.0, status: 'success', icon: <AssignmentIcon /> }
  ];

  // [advice from AI] 최근 테스트 실행 결과
  const recentTestResults = [
    { id: 'TR-001', name: '사용자 인증 테스트', status: 'passed', duration: '2m 30s', date: '2024-01-20 14:30' },
    { id: 'TR-002', name: 'API 성능 테스트', status: 'failed', duration: '5m 15s', date: '2024-01-20 13:45' },
    { id: 'TR-003', name: '보안 취약점 검사', status: 'passed', duration: '1m 45s', date: '2024-01-20 12:20' },
    { id: 'TR-004', name: 'UI 반응성 테스트', status: 'passed', duration: '3m 10s', date: '2024-01-20 11:15' }
  ];

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          QA/QC 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          백스테이지IO 스타일 품질 관리 시스템 - 테스트 계획, 결함 관리, 품질 지표, 테스트 실행
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="테스트 계획 관리" />
          <Tab label="결함 관리" />
          <Tab label="품질 지표" />
          <Tab label="테스트 실행" />
        </Tabs>
      </Box>

      {/* [advice from AI] 테스트 계획 관리 탭 */}
      {activeTab === 0 && <TestPlanManager />}

      {/* [advice from AI] 결함 관리 탭 */}
      {activeTab === 1 && <DefectManager />}

      {/* [advice from AI] 품질 지표 탭 */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            품질 지표 대시보드
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {qualityMetrics.map((metric, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <BackstageCard title={metric.metric} variant="default">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      backgroundColor: metric.status === 'success' ? 'success.50' : 
                                     metric.status === 'warning' ? 'warning.50' : 'error.50',
                      color: metric.status === 'success' ? 'success.main' : 
                             metric.status === 'warning' ? 'warning.main' : 'error.main'
                    }}>
                      {metric.icon}
                    </Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {metric.value}
                        {typeof metric.value === 'number' && metric.value <= 100 && '%'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        목표: {metric.target}
                        {typeof metric.target === 'number' && metric.target <= 100 && '%'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={typeof metric.value === 'number' && metric.value <= 100 ? metric.value : 100}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: metric.status === 'success' ? 'success.main' : 
                                       metric.status === 'warning' ? 'warning.main' : 'error.main'
                      }
                    }}
                  />
                  
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={metric.status === 'success' ? '양호' : 
                             metric.status === 'warning' ? '주의' : '위험'}
                      color={metric.status === 'success' ? 'success' : 
                             metric.status === 'warning' ? 'warning' : 'error'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {metric.status === 'success' ? '목표 달성' : 
                       metric.status === 'warning' ? '목표 근접' : '목표 미달'}
                    </Typography>
                  </Box>
                </BackstageCard>
              </Grid>
            ))}
          </Grid>

          {/* [advice from AI] 품질 트렌드 차트 */}
          <BackstageCard title="품질 트렌드" variant="default">
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>품질 트렌드 분석:</strong> 최근 30일간의 품질 지표 변화를 시각화합니다.
                차트 기능은 향후 구현 예정입니다.
              </Typography>
            </Alert>
            
            <Box sx={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'grey.50',
              borderRadius: 1,
              border: '2px dashed',
              borderColor: 'grey.300'
            }}>
              <Typography variant="h6" color="text.secondary">
                품질 트렌드 차트 (구현 예정)
              </Typography>
            </Box>
          </BackstageCard>
        </Box>
      )}

      {/* [advice from AI] 테스트 실행 탭 */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            테스트 실행 관리
          </Typography>
          
          {/* [advice from AI] 최근 테스트 실행 결과 */}
          <BackstageCard title="최근 테스트 실행 결과" variant="default">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>테스트 ID</TableCell>
                    <TableCell>테스트명</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>실행 시간</TableCell>
                    <TableCell>실행 일시</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTestResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {result.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {result.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={result.status.toUpperCase()} 
                          color={result.status === 'passed' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {result.duration}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {result.date}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          상세보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BackstageCard>

          {/* [advice from AI] 테스트 실행 도구 */}
          <Grid container spacing={3} sx={{ mt: 3 }}>
            <Grid item xs={12} md={6}>
              <BackstageCard title="자동화 테스트" variant="default">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      단위 테스트 실행
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Jest 기반 단위 테스트 자동 실행
                    </Typography>
                    <Button size="small" variant="contained" startIcon={<SpeedIcon />}>
                      실행
                    </Button>
                  </Paper>
                  
                  <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      통합 테스트 실행
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      API 및 컴포넌트 통합 테스트
                    </Typography>
                    <Button size="small" variant="contained" startIcon={<AssignmentIcon />}>
                      실행
                    </Button>
                  </Paper>
                </Box>
              </BackstageCard>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <BackstageCard title="성능 테스트" variant="default">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      부하 테스트
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      동시 사용자 부하 테스트
                    </Typography>
                    <Button size="small" variant="contained" startIcon={<TimelineIcon />}>
                      실행
                    </Button>
                  </Paper>
                  
                  <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      보안 테스트
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      취약점 스캔 및 보안 검사
                    </Typography>
                    <Button size="small" variant="contained" startIcon={<SecurityIcon />}>
                      실행
                    </Button>
                  </Paper>
                </Box>
              </BackstageCard>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default QACenter;