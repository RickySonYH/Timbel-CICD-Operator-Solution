// [advice from AI] 백스테이지IO 스타일의 최근 이슈 컴포넌트
// 최근 발생한 이슈들을 카드 형태로 표시

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  BugReport as BugIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';

interface Issue {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'security' | 'warning' | 'info';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  assigneeAvatar?: string;
  createdAt: string;
  status: 'open' | 'in-progress' | 'resolved';
  tags: string[];
}

const RecentIssues: React.FC = () => {
  const theme = useTheme();

  // [advice from AI] 샘플 이슈 데이터
  const issues: Issue[] = [
    {
      id: '1',
      title: 'API 응답 시간 지연 문제',
      description: '사용자 인증 API의 응답 시간이 평균 3초로 지연되고 있습니다.',
      type: 'warning',
      priority: 'high',
      assignee: '김개발',
      assigneeAvatar: '김',
      createdAt: '2시간 전',
      status: 'in-progress',
      tags: ['API', '성능', '인증'],
    },
    {
      id: '2',
      title: '보안 취약점 발견',
      description: 'JWT 토큰 검증 로직에서 보안 취약점이 발견되었습니다.',
      type: 'security',
      priority: 'high',
      assignee: '박보안',
      assigneeAvatar: '박',
      createdAt: '4시간 전',
      status: 'open',
      tags: ['보안', 'JWT', '긴급'],
    },
    {
      id: '3',
      title: '데이터베이스 연결 오류',
      description: 'PostgreSQL 연결 풀이 가득 차서 새로운 연결을 생성할 수 없습니다.',
      type: 'bug',
      priority: 'medium',
      assignee: '이데이터',
      assigneeAvatar: '이',
      createdAt: '6시간 전',
      status: 'resolved',
      tags: ['데이터베이스', 'PostgreSQL', '연결'],
    },
    {
      id: '4',
      title: 'UI 컴포넌트 스타일 불일치',
      description: 'Button 컴포넌트의 hover 상태가 디자인 가이드와 다릅니다.',
      type: 'info',
      priority: 'low',
      assignee: '최디자인',
      assigneeAvatar: '최',
      createdAt: '1일 전',
      status: 'open',
      tags: ['UI', '디자인', 'Button'],
    },
    {
      id: '5',
      title: '메모리 누수 의심',
      description: '이미지 업로드 후 메모리 사용량이 지속적으로 증가하고 있습니다.',
      type: 'warning',
      priority: 'medium',
      assignee: '정성능',
      assigneeAvatar: '정',
      createdAt: '2일 전',
      status: 'in-progress',
      tags: ['메모리', '이미지', '성능'],
    },
  ];

  // [advice from AI] 이슈 타입별 아이콘과 색상
  const getIssueIcon = (type: Issue['type']) => {
    switch (type) {
      case 'bug':
        return <BugIcon fontSize="small" />;
      case 'security':
        return <SecurityIcon fontSize="small" />;
      case 'warning':
        return <WarningIcon fontSize="small" />;
      case 'info':
        return <InfoIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getIssueColor = (type: Issue['type']): 'error' | 'warning' | 'info' => {
    switch (type) {
      case 'bug':
        return 'error';
      case 'security':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  const getPriorityColor = (priority: Issue['priority']) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: Issue['status']) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'in-progress':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: Issue['status']) => {
    switch (status) {
      case 'open':
        return '열림';
      case 'in-progress':
        return '진행중';
      case 'resolved':
        return '해결됨';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        🚨 최근 이슈
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {issues.map((issue) => (
          <BackstageCard
            key={issue.id}
            variant="outlined"
            size="small"
            onClick={() => console.log(`이슈 ${issue.id} 클릭`)}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* [advice from AI] 이슈 타입 아이콘 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: theme.palette[getIssueColor(issue.type)].light + '20',
                  color: theme.palette[getIssueColor(issue.type)].main,
                  flexShrink: 0,
                }}
              >
                {getIssueIcon(issue.type)}
              </Box>

              {/* [advice from AI] 이슈 내용 */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {issue.title}
                  </Typography>
                  
                  {/* [advice from AI] 우선순위와 상태 칩 */}
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <Chip
                      label={issue.priority.toUpperCase()}
                      size="small"
                      color={getPriorityColor(issue.priority)}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                    <Chip
                      label={getStatusText(issue.status)}
                      size="small"
                      color={getStatusColor(issue.status)}
                      variant="filled"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                </Box>

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
                  {issue.description}
                </Typography>

                {/* [advice from AI] 태그와 담당자 정보 */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {issue.tags.slice(0, 3).map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.7rem',
                          height: 18,
                          '& .MuiChip-label': {
                            px: 0.5,
                          },
                        }}
                      />
                    ))}
                    {issue.tags.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{issue.tags.length - 3}개
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {issue.assignee && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Avatar
                          sx={{
                            width: 20,
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: theme.palette.primary.main,
                          }}
                        >
                          {issue.assigneeAvatar}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                          {issue.assignee}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }} />
                      <Typography variant="caption" color="text.secondary">
                        {issue.createdAt}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </BackstageCard>
        ))}
      </Box>

      {/* [advice from AI] 모든 이슈 보기 링크 */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography
          variant="body2"
          color="primary"
          sx={{
            cursor: 'pointer',
            textDecoration: 'underline',
            '&:hover': {
              textDecoration: 'none',
            },
          }}
        >
          모든 이슈 보기 →
        </Typography>
      </Box>
    </Box>
  );
};

export default RecentIssues;
