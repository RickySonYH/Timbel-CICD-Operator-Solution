// [advice from AI] 역할별 계정 정보 안내 페이지
// PO-PE-QA-운영팀 구조의 각 역할별 계정 정보를 표시

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
} from '@mui/material';
import BackstageCard from '../components/layout/BackstageCard';

const RoleAccounts: React.FC = () => {
  // [advice from AI] 역할별 계정 정보
  const roleAccounts = [
    {
      role: '최고 관리자',
      username: 'executive',
      password: '1q2w3e4r',
      description: '전체 시스템 현황, 조직 관리, 비즈니스 분석',
      dashboard: '/executive',
      color: 'error' as const,
    },
    {
      role: 'PO (프로젝트 오너)',
      username: 'pouser',
      password: '1q2w3e4r',
      description: '프로젝트 관리, PE 관리, 요구사항 관리, 성과 분석',
      dashboard: '/po-dashboard',
      color: 'warning' as const,
    },
    {
      role: 'PE (프로젝트 엔지니어)',
      username: 'peuser',
      password: '1q2w3e4r',
      description: '내 프로젝트, 산출물 관리, 개발도구, 지식자원 활용',
      dashboard: '/pe-workspace',
      color: 'info' as const,
    },
    {
      role: 'QA/QC',
      username: 'qauser',
      password: '1q2w3e4r',
      description: '테스트 계획, 품질 검사, 결함 관리, 품질 지표',
      dashboard: '/qa-center',
      color: 'success' as const,
    },
    {
      role: '운영팀',
      username: 'opuser',
      password: '1q2w3e4r',
      description: 'ECP-AI K8s 기반 멀티테넌트 배포, 서비스별 설정, 하드웨어 계산기',
      dashboard: '/operations',
      color: 'secondary' as const,
    },
  ];

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          역할별 계정 정보
        </Typography>
        <Typography variant="body1" color="text.secondary">
          PO-PE-QA-운영팀 구조의 각 역할별 계정으로 로그인하여 해당 대시보드에 접근할 수 있습니다.
        </Typography>
      </Box>

      {/* [advice from AI] 계정 정보 테이블 */}
      <BackstageCard title="계정 정보" variant="default">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>역할</TableCell>
                <TableCell>사용자명</TableCell>
                <TableCell>비밀번호</TableCell>
                <TableCell>대시보드</TableCell>
                <TableCell>설명</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roleAccounts.map((account) => (
                <TableRow key={account.username}>
                  <TableCell>
                    <Chip 
                      label={account.role} 
                      color={account.color}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {account.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {account.password}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                      {account.dashboard}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {account.description}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </BackstageCard>

      {/* [advice from AI] 사용 방법 안내 */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <BackstageCard title="사용 방법" variant="default">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  1. 로그인
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  위의 사용자명과 비밀번호로 로그인하세요
                </Typography>
              </Paper>
              
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  2. 자동 리다이렉트
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  로그인 후 해당 역할의 대시보드로 자동 이동됩니다
                </Typography>
              </Paper>
              
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  3. 역할별 기능
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  각 역할에 맞는 전용 기능과 대시보드를 사용할 수 있습니다
                </Typography>
              </Paper>
            </Box>
          </BackstageCard>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <BackstageCard title="권한 레벨" variant="default">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {roleAccounts.map((account, index) => (
                <Box key={account.username} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 20, fontWeight: 600 }}>
                    {index + 1}
                  </Typography>
                  <Chip 
                    label={account.role} 
                    color={account.color}
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Level {index}
                  </Typography>
                </Box>
              ))}
            </Box>
          </BackstageCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RoleAccounts;
