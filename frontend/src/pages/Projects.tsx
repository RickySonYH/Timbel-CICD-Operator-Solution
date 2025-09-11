// [advice from AI] 프로젝트 관리 페이지
// 진행 중인 프로젝트들을 관리하고 모니터링할 수 있는 페이지

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Button,
  Chip,
  useTheme,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import BackstageCard from '../components/layout/BackstageCard';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'planning';
  progress: number;
  team: string[];
  startDate: string;
  endDate?: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
}

const Projects: React.FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // [advice from AI] 샘플 프로젝트 데이터
  const projects: Project[] = [
    {
      id: '1',
      name: '모바일 뱅킹 앱 리뉴얼',
      description: '기존 뱅킹 앱의 UI/UX 개선 및 새로운 기능 추가',
      status: 'active',
      progress: 75,
      team: ['김개발', '박디자인', '이QA'],
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      priority: 'high',
      tags: ['모바일', '뱅킹', 'React Native'],
    },
    {
      id: '2',
      name: '이커머스 플랫폼 구축',
      description: '새로운 이커머스 플랫폼의 프론트엔드 개발',
      status: 'active',
      progress: 45,
      team: ['최프론트', '정백엔드', '한인프라'],
      startDate: '2024-02-01',
      endDate: '2024-08-31',
      priority: 'high',
      tags: ['이커머스', 'React', 'Node.js'],
    },
    {
      id: '3',
      name: 'AI 챗봇 서비스',
      description: '고객 지원을 위한 AI 기반 챗봇 개발',
      status: 'paused',
      progress: 30,
      team: ['박AI', '김백엔드'],
      startDate: '2024-01-01',
      priority: 'medium',
      tags: ['AI', '챗봇', 'Python'],
    },
    {
      id: '4',
      name: '데이터 분석 대시보드',
      description: '비즈니스 인사이트를 위한 데이터 시각화 도구',
      status: 'completed',
      progress: 100,
      team: ['이데이터', '최프론트'],
      startDate: '2023-10-01',
      endDate: '2024-01-31',
      priority: 'medium',
      tags: ['데이터', '대시보드', 'D3.js'],
    },
    {
      id: '5',
      name: 'API 게이트웨이 구축',
      description: '마이크로서비스 아키텍처를 위한 API 게이트웨이',
      status: 'planning',
      progress: 0,
      team: ['정아키텍트', '김인프라'],
      startDate: '2024-04-01',
      endDate: '2024-07-31',
      priority: 'high',
      tags: ['API', '마이크로서비스', 'Kong'],
    },
  ];

  // [advice from AI] 상태별 필터링
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && project.status === filterStatus;
  });

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'planning': return 'default';
      default: return 'default';
    }
  };

  // [advice from AI] 상태별 텍스트
  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'active': return '진행중';
      case 'paused': return '일시정지';
      case 'completed': return '완료';
      case 'planning': return '계획중';
      default: return status;
    }
  };

  // [advice from AI] 우선순위별 색상
  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // [advice from AI] 프로젝트 액션 메뉴
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, projectId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedProject(projectId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const handleProjectAction = (action: string) => {
    console.log(`${action} 프로젝트:`, selectedProject);
    handleMenuClose();
  };

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
          📋 프로젝트 관리
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 600,
            lineHeight: 1.6
          }}
        >
          진행 중인 프로젝트들을 관리하고 모니터링하세요
        </Typography>
      </Box>

      {/* [advice from AI] 검색 및 필터 영역 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="프로젝트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300, flex: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            sx={{ minWidth: 120 }}
          >
            필터
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ minWidth: 120 }}
          >
            새 프로젝트
          </Button>
        </Box>

        {/* [advice from AI] 상태별 탭 */}
        <Tabs
          value={filterStatus}
          onChange={(e, newValue) => setFilterStatus(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="전체" value="all" />
          <Tab label="진행중" value="active" />
          <Tab label="일시정지" value="paused" />
          <Tab label="완료" value="completed" />
          <Tab label="계획중" value="planning" />
        </Tabs>
      </Box>

      {/* [advice from AI] 프로젝트 카드 그리드 */}
      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <BackstageCard
              variant="outlined"
              size="large"
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* [advice from AI] 프로젝트 헤더 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {project.description}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, project.id)}
                  sx={{ ml: 1, flexShrink: 0 }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>

              {/* [advice from AI] 상태 및 우선순위 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={getStatusText(project.status)}
                  size="small"
                  color={getStatusColor(project.status)}
                  variant="filled"
                />
                <Chip
                  label={project.priority.toUpperCase()}
                  size="small"
                  color={getPriorityColor(project.priority)}
                  variant="outlined"
                />
              </Box>

              {/* [advice from AI] 진행률 */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    진행률
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project.progress}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    height: 6,
                    backgroundColor: theme.palette.action.hover,
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${project.progress}%`,
                      height: '100%',
                      backgroundColor: theme.palette.primary.main,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Box>

              {/* [advice from AI] 팀원 정보 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  팀원 ({project.team.length}명)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {project.team.map((member, index) => (
                    <Chip
                      key={index}
                      label={member}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem', height: 20 }}
                    />
                  ))}
                </Box>
              </Box>

              {/* [advice from AI] 태그 */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {project.tags.map((tag, index) => (
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
                </Box>
              </Box>

              {/* [advice from AI] 날짜 정보 */}
              <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  시작: {project.startDate}
                  {project.endDate && ` | 종료: ${project.endDate}`}
                </Typography>
              </Box>
            </BackstageCard>
          </Grid>
        ))}
      </Grid>

      {/* [advice from AI] 프로젝트 액션 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 160,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <MenuItem onClick={() => handleProjectAction('편집')}>
          <EditIcon sx={{ mr: 1, fontSize: '1rem' }} />
          편집
        </MenuItem>
        <MenuItem onClick={() => handleProjectAction('시작')}>
          <PlayIcon sx={{ mr: 1, fontSize: '1rem' }} />
          시작
        </MenuItem>
        <MenuItem onClick={() => handleProjectAction('일시정지')}>
          <PauseIcon sx={{ mr: 1, fontSize: '1rem' }} />
          일시정지
        </MenuItem>
        <MenuItem onClick={() => handleProjectAction('완료')}>
          <StopIcon sx={{ mr: 1, fontSize: '1rem' }} />
          완료
        </MenuItem>
        <MenuItem onClick={() => handleProjectAction('삭제')} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: '1rem' }} />
          삭제
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Projects;
