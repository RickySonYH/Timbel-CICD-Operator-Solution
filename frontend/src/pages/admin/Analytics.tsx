// [advice from AI] 성과 분석 페이지 (ROI 대시보드)
// 어드민 관리 페이지의 성과 분석 메뉴에 해당하는 ROI 대시보드

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  useTheme,
} from '@mui/material';
import BackstageCard from '../../components/layout/BackstageCard';

const Analytics: React.FC = () => {
  const theme = useTheme();

  return (
    <Box>
      {/* [advice from AI] 성과 분석 페이지 헤더 */}
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
          📊 성과 분석 대시보드
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 600,
            lineHeight: 1.6
          }}
        >
          Timbel 플랫폼의 ROI 및 성과 지표를 분석합니다
        </Typography>
      </Box>

      {/* [advice from AI] ROI 메트릭 카드들 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard
            title="연간 절감"
            variant="elevated"
            size="medium"
          >
            <Typography variant="h3" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
              19.6억원
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              전년 대비 15% 증가
            </Typography>
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ↗ +2.6억원 (15.2%)
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard
            title="ROI"
            variant="elevated"
            size="medium"
          >
            <Typography variant="h3" color="secondary" sx={{ fontWeight: 700, mb: 1 }}>
              1,307%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              투자 대비 수익률
            </Typography>
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ↗ +127% (10.7%)
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard
            title="생산성 향상"
            variant="elevated"
            size="medium"
          >
            <Typography variant="h3" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
              300%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              개발 속도 개선
            </Typography>
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ↗ +45% (17.6%)
            </Typography>
          </BackstageCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BackstageCard
            title="재사용률"
            variant="elevated"
            size="medium"
          >
            <Typography variant="h3" color="info.main" sx={{ fontWeight: 700, mb: 1 }}>
              60%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              컴포넌트 재사용
            </Typography>
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ↗ +8% (15.4%)
            </Typography>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* [advice from AI] 상세 분석 섹션 */}
      <Grid container spacing={4}>
        {/* [advice from AI] 월별 성과 추이 */}
        <Grid item xs={12} md={8}>
          <BackstageCard
            title="월별 성과 추이"
            subtitle="최근 12개월간의 주요 지표 변화"
            variant="outlined"
            size="large"
            tags={['트렌드', '분석', '차트']}
          >
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                📈 차트 영역 (Chart.js 또는 D3.js로 구현 예정)
              </Typography>
            </Box>
          </BackstageCard>
        </Grid>

        {/* [advice from AI] 주요 성과 요약 */}
        <Grid item xs={12} md={4}>
          <BackstageCard
            title="주요 성과 요약"
            subtitle="이번 달 주요 성과"
            variant="outlined"
            size="large"
            tags={['요약', '성과']}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  PrimaryButton 컴포넌트 1,847회 재사용
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  가장 많이 사용되는 컴포넌트
                </Typography>
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                  1.27억원 절감 효과
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  모바일 뱅킹 앱 4.5개월 완료
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  기존 8개월 예상에서 단축
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                  44% 개발 기간 단축
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  이커머스 리뉴얼 78% 재사용
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  기존 컴포넌트 활용
                </Typography>
                <Typography variant="caption" color="info.main" sx={{ fontWeight: 600 }}>
                  개발 완료
                </Typography>
              </Box>
            </Box>
          </BackstageCard>
        </Grid>
      </Grid>

      {/* [advice from AI] 부서별 성과 분석 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          🏢 부서별 성과 분석
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="개발팀"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                8.2억원
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                절감 효과
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                ↗ +1.1억원 (15.5%)
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="디자인팀"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="secondary" sx={{ fontWeight: 600, mb: 1 }}>
                4.8억원
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                절감 효과
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                ↗ +0.6억원 (14.3%)
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="QA팀"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                3.2억원
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                절감 효과
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                ↗ +0.4억원 (14.3%)
              </Typography>
            </BackstageCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <BackstageCard
              title="기타"
              variant="outlined"
              size="small"
            >
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 600, mb: 1 }}>
                3.4억원
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                절감 효과
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                ↗ +0.5억원 (17.2%)
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
    </Box>
  );
};

export default Analytics;

