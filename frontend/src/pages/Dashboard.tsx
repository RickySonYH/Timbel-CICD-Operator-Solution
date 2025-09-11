// [advice from AI] 백스테이지IO 스타일의 홈화면 구현
// 지식 자원 검색, 최근 이슈, 빠른 액세스를 포함한 백스테이지IO 홈화면

import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Container,
  useTheme,
} from '@mui/material';
import SearchBar from '../components/search/SearchBar';
import RecentIssues from '../components/issues/RecentIssues';
import QuickAccess from '../components/quickaccess/QuickAccess';
import BackstageCard from '../components/layout/BackstageCard';

const Dashboard: React.FC = () => {
  const theme = useTheme();

  // [advice from AI] 검색 핸들러
  const handleSearch = (query: string) => {
    console.log('검색어:', query);
    // TODO: 실제 검색 로직 구현
  };

  return (
    <Container maxWidth="xl">
      {/* [advice from AI] 백스테이지IO 스타일의 웰컴 섹션 */}
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
          Timbel 지식자원 플랫폼
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            mb: 4,
            maxWidth: 600,
            mx: 'auto',
            lineHeight: 1.6
          }}
        >
          AI 기반 지식자원 관리 플랫폼으로 개발 생산성을 극대화하세요
        </Typography>
      </Box>

      {/* [advice from AI] 메인 검색 영역 */}
      <Box sx={{ mb: 6 }}>
        <SearchBar 
          onSearch={handleSearch}
          placeholder="지식 자원, 컴포넌트, 문서를 검색하세요..."
        />
      </Box>

      {/* [advice from AI] 백스테이지IO 스타일의 메인 컨텐츠 그리드 */}
      <Grid container spacing={4}>
        {/* [advice from AI] 왼쪽 컬럼 - 최근 이슈 */}
        <Grid item xs={12} lg={8}>
          <RecentIssues />
        </Grid>

        {/* [advice from AI] 오른쪽 컬럼 - 빠른 액세스 */}
        <Grid item xs={12} lg={4}>
          <QuickAccess />
        </Grid>
      </Grid>

      {/* [advice from AI] 하단 통계 카드들 */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          📊 플랫폼 현황
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="총 컴포넌트"
              variant="elevated"
              size="small"
            >
              <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                2,847
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                재사용 가능한 컴포넌트
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="월간 재사용"
              variant="elevated"
              size="small"
            >
              <Typography variant="h4" color="secondary" sx={{ fontWeight: 600 }}>
                15,234
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                이번 달 재사용 횟수
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="활성 프로젝트"
              variant="elevated"
              size="small"
            >
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                47
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                진행 중인 프로젝트
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="팀원 수"
              variant="elevated"
              size="small"
            >
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                156
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                활성 사용자
              </Typography>
            </BackstageCard>
          </Grid>
        </Grid>
      </Box>

      {/* [advice from AI] 하단 푸터 정보 */}
      <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          align="center" 
          sx={{ display: 'block' }}
        >
          Powered by Timbel AI Platform | (주)팀벨 Timeless Label
        </Typography>
      </Box>
    </Container>
  );
};

export default Dashboard;
