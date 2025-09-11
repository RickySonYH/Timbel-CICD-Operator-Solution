// [advice from AI] PE 개발도구 - 지식 관리 시스템
// 백스테이지IO 카탈로그 시스템을 참고한 지식 자원 관리

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  BugReport as BugReportIcon,
  Architecture as ArchitectureIcon,
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';

// [advice from AI] 지식 자원 타입 정의
interface KnowledgeResource {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'code' | 'api' | 'tutorial' | 'troubleshooting' | 'architecture';
  category: string;
  tags: string[];
  author: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  version: string;
  views: number;
  likes: number;
  fileSize?: string;
  language?: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

const KnowledgeManagement: React.FC = () => {
  // [advice from AI] 상태 관리
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentTab, setCurrentTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<KnowledgeResource | null>(null);

  // [advice from AI] 샘플 지식 자원 데이터
  const [knowledgeResources] = useState<KnowledgeResource[]>([
    {
      id: 'kb-001',
      title: 'React 컴포넌트 최적화 가이드',
      description: 'React 애플리케이션의 성능을 향상시키기 위한 컴포넌트 최적화 방법들을 정리한 문서',
      type: 'tutorial',
      category: 'Frontend',
      tags: ['React', 'Performance', 'Optimization', 'JavaScript'],
      author: 'PE 사용자',
      status: 'published',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20',
      version: '1.2.0',
      views: 156,
      likes: 23,
      fileSize: '2.3MB',
      complexity: 'intermediate'
    },
    {
      id: 'kb-002',
      title: 'API 인증 미들웨어',
      description: 'JWT 기반 API 인증을 위한 Express.js 미들웨어 구현 코드',
      type: 'code',
      category: 'Backend',
      tags: ['Node.js', 'Express', 'JWT', 'Authentication', 'Middleware'],
      author: 'PE 사용자',
      status: 'published',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-18',
      version: '2.0.1',
      views: 89,
      likes: 15,
      fileSize: '15KB',
      language: 'JavaScript',
      complexity: 'advanced'
    },
    {
      id: 'kb-003',
      title: '데이터베이스 연결 오류 해결',
      description: 'PostgreSQL 연결 시 발생하는 일반적인 오류들과 해결 방법',
      type: 'troubleshooting',
      category: 'Database',
      tags: ['PostgreSQL', 'Connection', 'Error', 'Troubleshooting'],
      author: 'PE 사용자',
      status: 'published',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-12',
      version: '1.0.0',
      views: 234,
      likes: 31,
      fileSize: '856KB',
      complexity: 'beginner'
    },
    {
      id: 'kb-004',
      title: '마이크로서비스 아키텍처 설계',
      description: '확장 가능한 마이크로서비스 아키텍처 설계 원칙과 구현 가이드',
      type: 'architecture',
      category: 'Architecture',
      tags: ['Microservices', 'Architecture', 'Scalability', 'Design'],
      author: 'PE 사용자',
      status: 'review',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-19',
      version: '0.9.0',
      views: 67,
      likes: 8,
      fileSize: '4.1MB',
      complexity: 'advanced'
    },
    {
      id: 'kb-005',
      title: 'RESTful API 설계 가이드',
      description: '표준적인 RESTful API 설계 원칙과 모범 사례',
      type: 'api',
      category: 'Backend',
      tags: ['API', 'REST', 'Design', 'Best Practices'],
      author: 'PE 사용자',
      status: 'published',
      createdAt: '2024-01-03',
      updatedAt: '2024-01-15',
      version: '1.1.0',
      views: 178,
      likes: 27,
      fileSize: '1.8MB',
      complexity: 'intermediate'
    }
  ]);

  // [advice from AI] 필터링된 지식 자원
  const filteredResources = knowledgeResources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || resource.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  // [advice from AI] 타입별 아이콘 매핑
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <DescriptionIcon />;
      case 'code': return <CodeIcon />;
      case 'api': return <ArchitectureIcon />;
      case 'tutorial': return <BookmarkIcon />;
      case 'troubleshooting': return <BugReportIcon />;
      case 'architecture': return <ArchitectureIcon />;
      default: return <DescriptionIcon />;
    }
  };

  // [advice from AI] 상태별 색상 매핑
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'review': return 'warning';
      case 'draft': return 'default';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  // [advice from AI] 복잡도별 색상 매핑
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link color="inherit" href="/pe-workspace">
            PE 작업공간
          </Link>
          <Typography color="text.primary">지식 관리</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              지식 자원 관리
            </Typography>
            <Typography variant="body1" color="text.secondary">
              개발 과정에서 축적된 지식과 경험을 체계적으로 관리하고 공유합니다.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ height: 40 }}
          >
            새 지식 등록
          </Button>
        </Box>
      </Box>

      {/* [advice from AI] 검색 및 필터 */}
      <BackstageCard title="검색 및 필터" variant="default">
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="지식 자원 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="카테고리"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="Frontend">Frontend</MenuItem>
                <MenuItem value="Backend">Backend</MenuItem>
                <MenuItem value="Database">Database</MenuItem>
                <MenuItem value="Architecture">Architecture</MenuItem>
                <MenuItem value="DevOps">DevOps</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>타입</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                label="타입"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="document">문서</MenuItem>
                <MenuItem value="code">코드</MenuItem>
                <MenuItem value="api">API</MenuItem>
                <MenuItem value="tutorial">튜토리얼</MenuItem>
                <MenuItem value="troubleshooting">문제해결</MenuItem>
                <MenuItem value="architecture">아키텍처</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="상태"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="published">발행됨</MenuItem>
                <MenuItem value="review">검토중</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="archived">보관됨</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              sx={{ height: 56 }}
            >
              고급 필터
            </Button>
          </Grid>
        </Grid>

        {/* [advice from AI] 결과 통계 */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={`총 ${filteredResources.length}개`} 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            label={`발행됨 ${filteredResources.filter(r => r.status === 'published').length}개`} 
            color="success" 
            variant="outlined" 
          />
          <Chip 
            label={`검토중 ${filteredResources.filter(r => r.status === 'review').length}개`} 
            color="warning" 
            variant="outlined" 
          />
        </Box>
      </BackstageCard>

      {/* [advice from AI] 지식 자원 목록 */}
      <BackstageCard title="지식 자원 목록" variant="default">
        <Grid container spacing={2}>
          {filteredResources.map((resource) => (
            <Grid item xs={12} md={6} lg={4} key={resource.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%',
                  '&:hover': { 
                    boxShadow: 2,
                    borderColor: 'primary.main'
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTypeIcon(resource.type)}
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {resource.title}
                      </Typography>
                    </Box>
                    <IconButton size="small">
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {resource.description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={resource.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={resource.status} 
                      size="small" 
                      color={getStatusColor(resource.status)}
                      variant="outlined" 
                    />
                    <Chip 
                      label={resource.complexity} 
                      size="small" 
                      color={getComplexityColor(resource.complexity)}
                      variant="outlined" 
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {resource.tags.slice(0, 3).map((tag) => (
                      <Chip 
                        key={tag}
                        label={tag} 
                        size="small" 
                        variant="outlined" 
                      />
                    ))}
                    {resource.tags.length > 3 && (
                      <Chip 
                        label={`+${resource.tags.length - 3}`} 
                        size="small" 
                        variant="outlined" 
                      />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      v{resource.version} • {resource.views} views • {resource.likes} likes
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {resource.updatedAt}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" startIcon={<ViewIcon />}>
                      보기
                    </Button>
                    <Button size="small" startIcon={<EditIcon />}>
                      편집
                    </Button>
                    <Button size="small" startIcon={<DownloadIcon />}>
                      다운로드
                    </Button>
                    <Button size="small" startIcon={<ShareIcon />}>
                      공유
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </BackstageCard>

      {/* [advice from AI] 새 지식 등록 다이얼로그 */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            새 지식 자원 등록
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="제목"
              fullWidth
              variant="outlined"
              placeholder="지식 자원의 제목을 입력하세요"
            />
            <TextField
              label="설명"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              placeholder="지식 자원에 대한 상세 설명을 입력하세요"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select label="카테고리">
                    <MenuItem value="Frontend">Frontend</MenuItem>
                    <MenuItem value="Backend">Backend</MenuItem>
                    <MenuItem value="Database">Database</MenuItem>
                    <MenuItem value="Architecture">Architecture</MenuItem>
                    <MenuItem value="DevOps">DevOps</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>타입</InputLabel>
                  <Select label="타입">
                    <MenuItem value="document">문서</MenuItem>
                    <MenuItem value="code">코드</MenuItem>
                    <MenuItem value="api">API</MenuItem>
                    <MenuItem value="tutorial">튜토리얼</MenuItem>
                    <MenuItem value="troubleshooting">문제해결</MenuItem>
                    <MenuItem value="architecture">아키텍처</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label="태그"
              fullWidth
              variant="outlined"
              placeholder="태그를 쉼표로 구분하여 입력하세요"
            />
            <TextField
              label="복잡도"
              fullWidth
              variant="outlined"
              select
            >
              <MenuItem value="beginner">초급</MenuItem>
              <MenuItem value="intermediate">중급</MenuItem>
              <MenuItem value="advanced">고급</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained">
            등록
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KnowledgeManagement;
