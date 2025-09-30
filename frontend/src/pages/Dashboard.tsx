// [advice from AI] 백스테이지IO 스타일의 홈화면 구현
// Phase 1-4 개발된 기능들을 통합한 메인 대시보드

import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Container,
  useTheme,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Engineering as EngineeringIcon,
  BugReport as BugReportIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  Storage as StorageIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import BackstageCard from '../components/layout/BackstageCard';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  // [advice from AI] Phase별 기능 카드 데이터
  const phaseFeatures = [
    {
      phase: "Phase 1",
      title: "프로젝트 관리 시스템",
      description: "프로젝트 생성, 관리, 진행 상황 추적",
      icon: <StorageIcon />,
      color: "primary",
      route: "/projects",
      features: ["프로젝트 생성", "진행 상황 추적", "팀원 관리"]
    },
    {
      phase: "Phase 2", 
      title: "PO 업무 지원 시스템",
      description: "개발 지시서 작성, 업무 분배, 승인 워크플로우",
      icon: <AssignmentIcon />,
      color: "secondary",
      route: "/po-dashboard",
      features: ["지시서 작성", "업무 분배", "승인 관리"]
    },
    {
      phase: "Phase 3",
      title: "PE 업무 지원 시스템", 
      description: "할당된 지시서 관리, 진행 상황 추적, 주간 보고서",
      icon: <EngineeringIcon />,
      color: "success",
      route: "/pe-workspace",
      features: ["지시서 관리", "진행 추적", "주간 보고서"]
    },
    {
      phase: "Phase 4",
      title: "완료 및 인수인계 시스템",
      description: "완료 체크리스트, 테스트 환경, 인수인계 문서",
      icon: <CheckCircleIcon />,
      color: "info",
      route: "/completion",
      features: ["완료 체크리스트", "테스트 환경", "인수인계"]
    },
    {
      phase: "Phase 5",
      title: "QA/QC 시스템",
      description: "테스트 케이스 관리, 버그 리포트, 품질 관리",
      icon: <BugReportIcon />,
      color: "warning",
      route: "/qa-center",
      features: ["테스트 케이스", "버그 관리", "품질 검증"]
    },
    {
      phase: "Phase 6",
      title: "운영팀 시스템",
      description: "테넌트 관리, 배포 자동화, 모니터링",
      icon: <SettingsIcon />,
      color: "error",
      route: "/operations",
      features: ["테넌트 관리", "자동 배포", "모니터링"]
    },
    {
      phase: "Phase 7",
      title: "통합 모니터링 시스템",
      description: "전체 시스템 모니터링, 예측 분석, 자동 스케일링",
      icon: <TimelineIcon />,
      color: "primary",
      route: "/monitoring",
      features: ["통합 대시보드", "예측 분석", "자동 스케일링"]
    },
    {
      phase: "Phase 8",
      title: "지식 자산 관리 (Backstage.io 기반)",
      description: "소프트웨어 카탈로그 및 지식 자산 관리",
      icon: <SearchIcon />,
      color: "secondary",
      route: "/catalog",
      features: ["소프트웨어 카탈로그", "CI/CD 통합", "API 문서화", "의존성 관리"]
    }
  ];

  return (
    <Container maxWidth="xl">
      {/* [advice from AI] 웰컴 섹션 */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 2
          }}
        >
          Timbel Project Management Solution
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            mb: 4,
            maxWidth: 800,
            mx: 'auto',
            lineHeight: 1.6
          }}
        >
          개발 프로세스의 모든 단계를 지원하는 통합 플랫폼입니다.
          <br />
          Phase 1부터 Phase 6까지 체계적인 업무 프로세스를 제공합니다.
        </Typography>
      </Box>

      {/* [advice from AI] Phase별 기능 카드들 */}
      <Grid container spacing={3}>
        {phaseFeatures.map((feature, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <BackstageCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    bgcolor: `${feature.color}.light`, 
                    color: `${feature.color}.contrastText`,
                    mr: 2
                  }}>
                    {feature.icon}
                  </Box>
                  <Box>
                    <Chip 
                      label={feature.phase} 
                      size="small" 
                      color={feature.color as any}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6" component="h2">
                      {feature.title}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {feature.description}
                </Typography>

                <List dense>
                  {feature.features.map((item, idx) => (
                    <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <TimelineIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={item} 
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />
                
                <Button 
                  variant="contained" 
                  color={feature.color as any}
                  fullWidth
                  onClick={() => navigate(feature.route)}
                  startIcon={<DashboardIcon />}
                >
                  {feature.title} 접속
                </Button>
              </CardContent>
            </BackstageCard>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 빠른 액세스 섹션 */}
      <Box sx={{ mt: 4 }}>
        <BackstageCard>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              빠른 액세스
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<AssignmentIcon />}
                  onClick={() => navigate('/po-dashboard')}
                >
                  PO 대시보드
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<EngineeringIcon />}
                  onClick={() => navigate('/pe-workspace')}
                >
                  PE 워크스페이스
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<BugReportIcon />}
                  onClick={() => navigate('/qa-center')}
                >
                  QA 센터
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<SettingsIcon />}
                  onClick={() => navigate('/operations')}
                >
                  운영센터
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<TimelineIcon />}
                  onClick={() => navigate('/monitoring')}
                >
                  통합 모니터링
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </BackstageCard>
      </Box>
    </Container>
  );
};

export default Dashboard;