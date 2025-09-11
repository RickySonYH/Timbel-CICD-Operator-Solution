// [advice from AI] 백스테이지IO 스타일의 카탈로그 시스템 구현
// Domain → System → Component → APIs 구조의 지식자원 카탈로그

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Chip,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Api as ApiIcon,
  Extension as ExtensionIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import BackstageCard from '../components/layout/BackstageCard';

const Catalog: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // [advice from AI] 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 검색 핸들러
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('카탈로그 검색:', query);
  };

  // [advice from AI] 도메인 데이터
  const domains = [
    {
      id: '1',
      name: '비즈니스',
      description: '비즈니스 로직 및 도메인 서비스',
      count: 12,
      icon: <StorageIcon />,
      color: theme.palette.primary.main,
    },
    {
      id: '2',
      name: '기술',
      description: '기술 인프라 및 개발 도구',
      count: 18,
      icon: <CodeIcon />,
      color: theme.palette.secondary.main,
    },
    {
      id: '3',
      name: 'AI 혁신',
      description: 'AI 및 머신러닝 관련 서비스',
      count: 8,
      icon: <ExtensionIcon />,
      color: theme.palette.success.main,
    },
  ];

  // [advice from AI] API 데이터
  const apis = [
    {
      id: '1',
      name: '사용자 인증 API',
      description: 'JWT 기반 사용자 인증 및 권한 관리',
      version: 'v2.1.0',
      status: 'active',
      method: 'REST',
      endpoint: '/api/auth',
      icon: <ApiIcon />,
      color: theme.palette.primary.main,
    },
    {
      id: '2',
      name: '컴포넌트 검색 API',
      description: '지식자원 카탈로그 검색 및 필터링',
      version: 'v1.5.2',
      status: 'active',
      method: 'GraphQL',
      endpoint: '/api/search',
      icon: <ApiIcon />,
      color: theme.palette.secondary.main,
    },
    {
      id: '3',
      name: 'AI 코드 생성 API',
      description: 'AI 기반 코드 자동 생성 서비스',
      version: 'v3.0.1',
      status: 'beta',
      method: 'REST',
      endpoint: '/api/ai/generate',
      icon: <ApiIcon />,
      color: theme.palette.success.main,
    },
    {
      id: '4',
      name: '프로젝트 관리 API',
      description: '프로젝트 생성, 수정, 삭제 관리',
      version: 'v1.2.0',
      status: 'active',
      method: 'REST',
      endpoint: '/api/projects',
      icon: <ApiIcon />,
      color: theme.palette.info.main,
    },
  ];

  // [advice from AI] 컴포넌트 데이터
  const components = [
    {
      id: '1',
      name: 'PrimaryButton',
      description: '기본 버튼 컴포넌트',
      type: 'React Component',
      usage: 1847,
      lastUsed: '2시간 전',
      icon: <CodeIcon />,
      color: theme.palette.primary.main,
    },
    {
      id: '2',
      name: 'AuthService',
      description: '인증 서비스 클래스',
      type: 'Service',
      usage: 923,
      lastUsed: '1일 전',
      icon: <CodeIcon />,
      color: theme.palette.secondary.main,
    },
    {
      id: '3',
      name: 'DataTable',
      description: '데이터 테이블 컴포넌트',
      type: 'React Component',
      usage: 456,
      lastUsed: '3시간 전',
      icon: <CodeIcon />,
      color: theme.palette.success.main,
    },
  ];

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 */}
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
          📚 지식자원 카탈로그
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 600,
            lineHeight: 1.6
          }}
        >
          재사용 가능한 컴포넌트, API, 서비스를 관리하고 검색하세요
        </Typography>
      </Box>

      {/* [advice from AI] 검색 영역 */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="컴포넌트, API, 서비스를 검색하세요..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="1,847개 결과" color="primary" />
          <Chip label="평균 검색 시간: 1.2초" color="info" />
          <Chip label="실시간 업데이트" color="success" />
        </Box>
      </Box>

      {/* [advice from AI] 카탈로그 탭 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="도메인" />
          <Tab label="APIs" />
          <Tab label="컴포넌트" />
          <Tab label="서비스" />
        </Tabs>
      </Box>

      {/* [advice from AI] 도메인 탭 */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            🏢 도메인 ({domains.length}개)
          </Typography>
          <Grid container spacing={3}>
            {domains.map((domain) => (
              <Grid item xs={12} sm={6} md={4} key={domain.id}>
                <BackstageCard
                  title={domain.name}
                  subtitle={domain.description}
                  variant="elevated"
                  size="medium"
                  tags={[`${domain.count}개 항목`]}
                  onClick={() => console.log(`${domain.name} 도메인 클릭`)}
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
                        backgroundColor: domain.color + '20',
                        color: domain.color,
                      }}
                    >
                      {domain.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {domain.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {domain.description}
                      </Typography>
                    </Box>
                  </Box>
                </BackstageCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* [advice from AI] APIs 탭 */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            🔌 APIs ({apis.length}개)
          </Typography>
          <Grid container spacing={3}>
            {apis.map((api) => (
              <Grid item xs={12} sm={6} md={4} key={api.id}>
                <BackstageCard
                  title={api.name}
                  subtitle={api.description}
                  variant="outlined"
                  size="large"
                  tags={[api.method, api.version, api.status]}
                  onClick={() => console.log(`${api.name} API 클릭`)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: api.color + '20',
                        color: api.color,
                      }}
                    >
                      {api.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {api.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {api.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {api.endpoint}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Chip
                      label={api.status}
                      size="small"
                      color={api.status === 'active' ? 'success' : 'warning'}
                      variant="filled"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {api.method}
                    </Typography>
                  </Box>
                </BackstageCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* [advice from AI] 컴포넌트 탭 */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            🔧 컴포넌트 ({components.length}개)
          </Typography>
          <Grid container spacing={3}>
            {components.map((component) => (
              <Grid item xs={12} sm={6} md={4} key={component.id}>
                <BackstageCard
                  title={component.name}
                  subtitle={component.description}
                  variant="default"
                  size="medium"
                  tags={[component.type, `${component.usage}회 사용`]}
                  onClick={() => console.log(`${component.name} 컴포넌트 클릭`)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: component.color + '20',
                        color: component.color,
                      }}
                    >
                      {component.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {component.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {component.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        마지막 사용: {component.lastUsed}
                      </Typography>
                    </Box>
                  </Box>
                </BackstageCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* [advice from AI] 서비스 탭 */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            ⚙️ 서비스 (준비중)
          </Typography>
          <BackstageCard
            title="서비스 카탈로그"
            subtitle="마이크로서비스 및 백엔드 서비스 관리"
            variant="outlined"
            size="large"
            tags={['준비중', '개발예정']}
          >
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                🚧 서비스 카탈로그는 준비 중입니다
              </Typography>
              <Typography variant="body2" color="text.secondary">
                곧 마이크로서비스 및 백엔드 서비스를 관리할 수 있습니다
              </Typography>
            </Box>
          </BackstageCard>
        </Box>
      )}
    </Box>
  );
};

export default Catalog;
