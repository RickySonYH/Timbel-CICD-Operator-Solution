// [advice from AI] 어드민 관리 페이지 메인 대시보드
// 성과 분석, 사용자 관리, 시스템 설정 등의 어드민 기능들을 포함

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  useTheme,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

const AdminDashboard: React.FC = () => {
  const theme = useTheme();

  // [advice from AI] 어드민 메뉴 아이템들
  const adminMenuItems = [
    {
      id: '1',
      title: '성과 분석',
      description: 'ROI 대시보드 및 성과 지표 분석',
      icon: <AnalyticsIcon />,
      href: '/admin/analytics',
      color: theme.palette.primary.main,
      tags: ['ROI', '분석', '대시보드'],
    },
    {
      id: '2',
      title: '사용자 관리',
      description: '팀원 및 권한 관리',
      icon: <PeopleIcon />,
      href: '/admin/users',
      color: theme.palette.secondary.main,
      tags: ['사용자', '권한', '팀관리'],
    },
    {
      id: '3',
      title: '시스템 설정',
      description: '시스템 환경 및 구성 관리',
      icon: <SettingsIcon />,
      href: '/admin/settings',
      color: theme.palette.info.main,
      tags: ['설정', '환경', '구성'],
    },
    {
      id: '4',
      title: '보안 관리',
      description: '보안 정책 및 접근 제어',
      icon: <SecurityIcon />,
      href: '/admin/security',
      color: theme.palette.error.main,
      tags: ['보안', '정책', '접근제어'],
    },
    {
      id: '5',
      title: '데이터 관리',
      description: '데이터베이스 및 스토리지 관리',
      icon: <StorageIcon />,
      href: '/admin/data',
      color: theme.palette.warning.main,
      tags: ['데이터', 'DB', '스토리지'],
    },
    {
      id: '6',
      title: '리포트',
      description: '상세 리포트 및 로그 분석',
      icon: <AssessmentIcon />,
      href: '/admin/reports',
      color: theme.palette.success.main,
      tags: ['리포트', '로그', '분석'],
    },
  ];

  const handleMenuClick = (href: string) => {
    window.location.href = href;
  };

  return (
    <Box>
      {/* [advice from AI] 어드민 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 1
          }}
        >
          🔧 관리자 대시보드
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 600,
            lineHeight: 1.6
          }}
        >
          시스템 관리 및 모니터링을 위한 통합 관리 도구
        </Typography>
      </Box>

      {/* [advice from AI] 어드민 메뉴 그리드 */}
      <Grid container spacing={3}>
        {adminMenuItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <BackstageCard
              title={item.title}
              subtitle={item.description}
              variant="elevated"
              size="medium"
              tags={item.tags}
              onClick={() => handleMenuClick(item.href)}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: item.color + '20',
                    color: item.color,
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            </BackstageCard>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 시스템 상태 요약 */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          📊 시스템 상태 요약
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="활성 사용자"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                156
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                현재 온라인 사용자
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="시스템 상태"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                정상
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                모든 서비스 정상 운영
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="저장소 사용량"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                68%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                디스크 사용량
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="마지막 백업"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                2시간
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                전 백업 완료
              </Typography>
            </BackstageCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
