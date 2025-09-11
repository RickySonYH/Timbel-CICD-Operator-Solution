// [advice from AI] 백스테이지IO 스타일의 빠른 액세스 컴포넌트
// 자주 사용되는 기능들에 대한 빠른 접근 링크

import React from 'react';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Code as CodeIcon,
  LibraryBooks as LibraryIcon,
  Rocket as DeployIcon,
  Group as TeamIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

interface QuickAccessItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  color: string;
  tags: string[];
}

const QuickAccess: React.FC = () => {
  const theme = useTheme();

  // [advice from AI] 빠른 액세스 아이템들
  const quickAccessItems: QuickAccessItem[] = [
    {
      id: '1',
      title: 'AI 코드 생성',
      description: 'AI가 코드를 자동으로 생성해드립니다',
      icon: <CodeIcon />,
      onClick: () => console.log('AI 코드 생성 클릭'),
      color: theme.palette.primary.main,
      tags: ['AI', '자동화'],
    },
    {
      id: '2',
      title: '컴포넌트 라이브러리',
      description: '재사용 가능한 컴포넌트를 찾아보세요',
      icon: <LibraryIcon />,
      href: '/catalog',
      color: theme.palette.secondary.main,
      tags: ['라이브러리', '재사용'],
    },
    {
      id: '3',
      title: '원클릭 배포',
      description: '간편한 배포를 경험하세요',
      icon: <DeployIcon />,
      onClick: () => console.log('배포 클릭'),
      color: theme.palette.success.main,
      tags: ['배포', 'CI/CD'],
    },
    {
      id: '4',
      title: '팀 관리',
      description: '팀원과 권한을 관리하세요',
      icon: <TeamIcon />,
      onClick: () => console.log('팀 관리 클릭'),
      color: theme.palette.warning.main,
      tags: ['관리', '권한'],
    },
    {
      id: '5',
      title: '분석 대시보드',
      description: '프로젝트 현황을 분석하세요',
      icon: <AnalyticsIcon />,
      onClick: () => console.log('분석 대시보드 클릭'),
      color: theme.palette.info.main,
      tags: ['분석', '대시보드'],
    },
    {
      id: '6',
      title: '보안 설정',
      description: '보안 정책을 관리하세요',
      icon: <SecurityIcon />,
      onClick: () => console.log('보안 설정 클릭'),
      color: theme.palette.error.main,
      tags: ['보안', '정책'],
    },
    {
      id: '7',
      title: '파일 업로드',
      description: '문서와 자산을 업로드하세요',
      icon: <UploadIcon />,
      onClick: () => console.log('파일 업로드 클릭'),
      color: theme.palette.primary.light,
      tags: ['업로드', '파일'],
    },
    {
      id: '8',
      title: '시스템 설정',
      description: '시스템 환경을 설정하세요',
      icon: <SettingsIcon />,
      onClick: () => console.log('시스템 설정 클릭'),
      color: theme.palette.text.secondary,
      tags: ['설정', '환경'],
    },
  ];

  const handleItemClick = (item: QuickAccessItem) => {
    if (item.href) {
      window.location.href = item.href;
    } else if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        ⚡ 빠른 액세스
      </Typography>
      
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 2 
      }}>
        {quickAccessItems.map((item) => (
          <BackstageCard
            key={item.id}
            variant="default"
            size="small"
            onClick={() => handleItemClick(item)}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* [advice from AI] 아이콘 영역 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  backgroundColor: item.color + '20',
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </Box>

              {/* [advice from AI] 내용 영역 */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title}
                </Typography>
                
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.description}
                </Typography>

                {/* [advice from AI] 태그 표시 */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {item.tags.map((tag, index) => (
                    <Typography
                      key={index}
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        backgroundColor: theme.palette.action.hover,
                        color: theme.palette.text.secondary,
                        fontSize: '0.7rem',
                      }}
                    >
                      {tag}
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Box>
          </BackstageCard>
        ))}
      </Box>
    </Box>
  );
};

export default QuickAccess;
