// [advice from AI] PE 개발도구 - 코드 등록 시스템
// GitHub 연동을 통한 코드 라이브러리화 및 백스테이지IO 스타일 폼

import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon,
  Upload as UploadIcon,
  Link as LinkIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  BugReport as BugReportIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  AccountTree as ArchitectureIcon,
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';
import SystemDiagram from '../../components/diagrams/SystemDiagram';
import DiagramCanvas from '../../components/diagrams/DiagramCanvas';

// [advice from AI] 코드 등록 단계 정의
const steps = [
  'GitHub 연동',
  '코드 정보 입력',
  '메타데이터 설정',
  '검토 및 등록'
];

// [advice from AI] GitHub 저장소 인터페이스
interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  lastUpdated: string;
  url: string;
  isPrivate: boolean;
  topics: string[];
}

// [advice from AI] 코드 등록 폼 데이터
interface CodeRegistrationData {
  // GitHub 연동
  githubRepo: GitHubRepository | null;
  branch: string;
  commitHash: string;
  
  // 코드 정보
  title: string;
  description: string;
  category: string;
  type: 'library' | 'component' | 'utility' | 'service' | 'middleware' | 'plugin';
  language: string;
  framework: string;
  
  // 메타데이터
  tags: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  license: string;
  version: string;
  author: string;
  
  // 추가 정보
  documentation: string;
  examples: string;
  dependencies: string[];
  requirements: string[];
  
  // 설정
  isPublic: boolean;
  allowContributions: boolean;
  autoUpdate: boolean;
}

const CodeRegistration: React.FC = () => {
  // [advice from AI] 상태 관리
  const [activeStep, setActiveStep] = useState(0);
  const [currentTab, setCurrentTab] = useState(0);
  const [diagramNodes, setDiagramNodes] = useState<any[]>([]);
  
  // [advice from AI] 다이어그램 노드 생성 함수
  const generateDiagramNodes = () => {
    const nodes = [
      {
        id: 'current-code',
        label: formData.title || '새 코드',
        type: 'component',
        status: 'development',
        dependencies: formData.dependencies || [],
        metadata: {
          version: formData.version,
          description: formData.description,
          owner: formData.author,
          lastUpdated: new Date().toISOString()
        }
      },
      // GitHub 저장소 노드
      ...(formData.githubRepo ? [{
        id: 'github-repo',
        label: formData.githubRepo.name,
        type: 'external',
        status: 'active',
        dependencies: [],
        metadata: {
          version: formData.version,
          description: `GitHub: ${formData.githubRepo.fullName}`,
          owner: formData.githubRepo.fullName.split('/')[0], // fullName에서 owner 추출
          lastUpdated: formData.githubRepo.lastUpdated
        }
      }] : []),
      // 의존성 노드들
      ...(formData.dependencies || []).map((dep, index) => ({
        id: `dep-${index}`,
        label: dep,
        type: 'api',
        status: 'active',
        dependencies: [],
        metadata: {
          description: `의존성: ${dep}`,
          lastUpdated: new Date().toISOString()
        }
      }))
    ];
    
    setDiagramNodes(nodes);
  };

  const [formData, setFormData] = useState<CodeRegistrationData>({
    githubRepo: null,
    branch: 'main',
    commitHash: '',
    title: '',
    description: '',
    category: '',
    type: 'library',
    language: '',
    framework: '',
    tags: [],
    complexity: 'intermediate',
    license: 'MIT',
    version: '1.0.0',
    author: '',
    documentation: '',
    examples: '',
    dependencies: [],
    requirements: [],
    isPublic: true,
    allowContributions: true,
    autoUpdate: false
  });

  // [advice from AI] 폼 데이터 변경 시 다이어그램 자동 업데이트
  useEffect(() => {
    if (formData.title || formData.githubRepo) {
      generateDiagramNodes();
    }
  }, [formData.title, formData.githubRepo, formData.dependencies, formData.version]);

  // [advice from AI] GitHub 저장소 샘플 데이터
  const [githubRepos] = useState<GitHubRepository[]>([
    {
      id: 1,
      name: 'react-auth-middleware',
      fullName: 'timbel/react-auth-middleware',
      description: 'JWT 기반 React 인증 미들웨어 라이브러리',
      language: 'TypeScript',
      stars: 45,
      forks: 12,
      lastUpdated: '2024-01-20',
      url: 'https://github.com/timbel/react-auth-middleware',
      isPrivate: false,
      topics: ['react', 'authentication', 'jwt', 'middleware', 'typescript']
    },
    {
      id: 2,
      name: 'node-utils',
      fullName: 'timbel/node-utils',
      description: 'Node.js 개발을 위한 유틸리티 함수 모음',
      language: 'JavaScript',
      stars: 23,
      forks: 8,
      lastUpdated: '2024-01-18',
      url: 'https://github.com/timbel/node-utils',
      isPrivate: false,
      topics: ['nodejs', 'utilities', 'javascript', 'helper']
    },
    {
      id: 3,
      name: 'database-migrations',
      fullName: 'timbel/database-migrations',
      description: 'PostgreSQL 마이그레이션 관리 도구',
      language: 'SQL',
      stars: 67,
      forks: 15,
      lastUpdated: '2024-01-15',
      url: 'https://github.com/timbel/database-migrations',
      isPrivate: false,
      topics: ['postgresql', 'migration', 'database', 'sql']
    }
  ]);

  // [advice from AI] 단계별 핸들러
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      githubRepo: null,
      branch: 'main',
      commitHash: '',
      title: '',
      description: '',
      category: '',
      type: 'library',
      language: '',
      framework: '',
      tags: [],
      complexity: 'intermediate',
      license: 'MIT',
      version: '1.0.0',
      author: '',
      documentation: '',
      examples: '',
      dependencies: [],
      requirements: [],
      isPublic: true,
      allowContributions: true,
      autoUpdate: false
    });
  };

  // [advice from AI] GitHub 저장소 선택
  const handleRepoSelect = (repo: GitHubRepository) => {
    setFormData(prev => ({
      ...prev,
      githubRepo: repo,
      title: repo.name,
      description: repo.description,
      language: repo.language,
      tags: repo.topics
    }));
  };

  // [advice from AI] 폼 데이터 업데이트
  const handleFormChange = (field: keyof CodeRegistrationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // [advice from AI] 태그 추가
  const handleTagAdd = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  // [advice from AI] 태그 제거
  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          코드 등록 및 라이브러리화
        </Typography>
        <Typography variant="body1" color="text.secondary">
          GitHub 연동을 통해 개발된 코드를 지식 자원으로 등록하고 라이브러리화합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 등록 단계 스테퍼 */}
      <BackstageCard title="코드 등록 단계" variant="default">
        <Stepper activeStep={activeStep} orientation="horizontal">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </BackstageCard>

      {/* [advice from AI] 다이어그램 및 등록 탭 */}
      <Box sx={{ mt: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab 
            icon={<CodeIcon />} 
            label="코드 등록" 
            iconPosition="start"
          />
          <Tab 
            icon={<ArchitectureIcon />} 
            label="시스템 다이어그램" 
            iconPosition="start"
          />
        </Tabs>

        {/* 코드 등록 탭 */}
        {currentTab === 0 && (
          <Box>
            {/* [advice from AI] 단계별 콘텐츠 */}
        {/* 1단계: GitHub 연동 */}
        {activeStep === 0 && (
          <BackstageCard title="GitHub 저장소 선택" variant="default">
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>GitHub 연동:</strong> 등록할 코드가 있는 GitHub 저장소를 선택하세요. 
                저장소 정보가 자동으로 가져와집니다.
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              {githubRepos.map((repo) => (
                <Grid item xs={12} md={6} lg={4} key={repo.id}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        boxShadow: 2,
                        borderColor: 'primary.main'
                      },
                      ...(formData.githubRepo?.id === repo.id && {
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.50'
                      })
                    }}
                    onClick={() => handleRepoSelect(repo)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <GitHubIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {repo.name}
                        </Typography>
                        {repo.isPrivate && (
                          <Chip label="Private" size="small" color="warning" />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {repo.description}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          label={repo.language} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`⭐ ${repo.stars}`} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`🍴 ${repo.forks}`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        {repo.topics.slice(0, 3).map((topic) => (
                          <Chip 
                            key={topic}
                            label={topic} 
                            size="small" 
                            variant="outlined" 
                          />
                        ))}
                        {repo.topics.length > 3 && (
                          <Chip 
                            label={`+${repo.topics.length - 3}`} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        최종 업데이트: {repo.lastUpdated}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleReset}>
                초기화
              </Button>
              <Button 
                variant="contained" 
                onClick={handleNext}
                disabled={!formData.githubRepo}
              >
                다음 단계
              </Button>
            </Box>
          </BackstageCard>
        )}

        {/* 2단계: 코드 정보 입력 */}
        {activeStep === 1 && (
          <BackstageCard title="코드 정보 입력" variant="default">
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="제목"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="코드 라이브러리의 제목을 입력하세요"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="코드의 기능과 용도에 대한 상세 설명을 입력하세요"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    label="카테고리"
                  >
                    <MenuItem value="Frontend">Frontend</MenuItem>
                    <MenuItem value="Backend">Backend</MenuItem>
                    <MenuItem value="Database">Database</MenuItem>
                    <MenuItem value="DevOps">DevOps</MenuItem>
                    <MenuItem value="Mobile">Mobile</MenuItem>
                    <MenuItem value="AI/ML">AI/ML</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>타입</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    label="타입"
                  >
                    <MenuItem value="library">라이브러리</MenuItem>
                    <MenuItem value="component">컴포넌트</MenuItem>
                    <MenuItem value="utility">유틸리티</MenuItem>
                    <MenuItem value="service">서비스</MenuItem>
                    <MenuItem value="middleware">미들웨어</MenuItem>
                    <MenuItem value="plugin">플러그인</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="프로그래밍 언어"
                  value={formData.language}
                  onChange={(e) => handleFormChange('language', e.target.value)}
                  placeholder="예: TypeScript, JavaScript, Python"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="프레임워크"
                  value={formData.framework}
                  onChange={(e) => handleFormChange('framework', e.target.value)}
                  placeholder="예: React, Express, Django"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="태그"
                  value=""
                  onChange={(e) => {
                    if (e.target.value.includes(',')) {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                      tags.forEach(tag => handleTagAdd(tag));
                      e.target.value = '';
                    }
                  }}
                  placeholder="태그를 쉼표로 구분하여 입력하세요"
                />
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleTagRemove(tag)}
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                이전 단계
              </Button>
              <Button 
                variant="contained" 
                onClick={handleNext}
                disabled={!formData.title || !formData.description}
              >
                다음 단계
              </Button>
            </Box>
          </BackstageCard>
        )}

        {/* 3단계: 메타데이터 설정 */}
        {activeStep === 2 && (
          <BackstageCard title="메타데이터 설정" variant="default">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>복잡도</InputLabel>
                  <Select
                    value={formData.complexity}
                    onChange={(e) => handleFormChange('complexity', e.target.value)}
                    label="복잡도"
                  >
                    <MenuItem value="beginner">초급</MenuItem>
                    <MenuItem value="intermediate">중급</MenuItem>
                    <MenuItem value="advanced">고급</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="버전"
                  value={formData.version}
                  onChange={(e) => handleFormChange('version', e.target.value)}
                  placeholder="예: 1.0.0"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>라이선스</InputLabel>
                  <Select
                    value={formData.license}
                    onChange={(e) => handleFormChange('license', e.target.value)}
                    label="라이선스"
                  >
                    <MenuItem value="MIT">MIT</MenuItem>
                    <MenuItem value="Apache-2.0">Apache 2.0</MenuItem>
                    <MenuItem value="GPL-3.0">GPL 3.0</MenuItem>
                    <MenuItem value="BSD-3-Clause">BSD 3-Clause</MenuItem>
                    <MenuItem value="ISC">ISC</MenuItem>
                    <MenuItem value="Unlicense">Unlicense</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="작성자"
                  value={formData.author}
                  onChange={(e) => handleFormChange('author', e.target.value)}
                  placeholder="작성자명을 입력하세요"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="문서화 링크"
                  value={formData.documentation}
                  onChange={(e) => handleFormChange('documentation', e.target.value)}
                  placeholder="API 문서나 사용 가이드 링크를 입력하세요"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="예제 코드 링크"
                  value={formData.examples}
                  onChange={(e) => handleFormChange('examples', e.target.value)}
                  placeholder="예제 코드나 데모 링크를 입력하세요"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  설정 옵션
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isPublic}
                        onChange={(e) => handleFormChange('isPublic', e.target.checked)}
                      />
                    }
                    label="공개 라이브러리로 등록"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allowContributions}
                        onChange={(e) => handleFormChange('allowContributions', e.target.checked)}
                      />
                    }
                    label="기여 허용"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.autoUpdate}
                        onChange={(e) => handleFormChange('autoUpdate', e.target.checked)}
                      />
                    }
                    label="자동 업데이트"
                  />
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                이전 단계
              </Button>
              <Button 
                variant="contained" 
                onClick={handleNext}
                disabled={!formData.version || !formData.author}
              >
                다음 단계
              </Button>
            </Box>
          </BackstageCard>
        )}

        {/* 4단계: 검토 및 등록 */}
        {activeStep === 3 && (
          <BackstageCard title="검토 및 등록" variant="default">
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>등록 준비 완료:</strong> 모든 정보가 올바르게 입력되었습니다. 
                아래 정보를 확인하고 등록을 완료하세요.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GitHubIcon />
                    GitHub 정보
                  </Typography>
                  {formData.githubRepo && (
                    <Box>
                      <Typography variant="body2"><strong>저장소:</strong> {formData.githubRepo.fullName}</Typography>
                      <Typography variant="body2"><strong>브랜치:</strong> {formData.branch}</Typography>
                      <Typography variant="body2"><strong>언어:</strong> {formData.githubRepo.language}</Typography>
                      <Typography variant="body2"><strong>별점:</strong> ⭐ {formData.githubRepo.stars}</Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon />
                    코드 정보
                  </Typography>
                  <Box>
                    <Typography variant="body2"><strong>제목:</strong> {formData.title}</Typography>
                    <Typography variant="body2"><strong>타입:</strong> {formData.type}</Typography>
                    <Typography variant="body2"><strong>카테고리:</strong> {formData.category}</Typography>
                    <Typography variant="body2"><strong>복잡도:</strong> {formData.complexity}</Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon />
                    상세 정보
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>설명:</strong> {formData.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {formData.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                  <Typography variant="body2"><strong>버전:</strong> {formData.version}</Typography>
                  <Typography variant="body2"><strong>라이선스:</strong> {formData.license}</Typography>
                  <Typography variant="body2"><strong>작성자:</strong> {formData.author}</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                이전 단계
              </Button>
              <Button 
                variant="contained" 
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => {
                  // 등록 로직 구현
                  alert('코드 라이브러리가 성공적으로 등록되었습니다!');
                  handleReset();
                }}
              >
                등록 완료
              </Button>
            </Box>
          </BackstageCard>
        )}
          </Box>
        )}

        {/* 시스템 다이어그램 탭 */}
        {currentTab === 1 && (
          <Box>
            <Tabs 
              value={currentTab === 1 ? 0 : 0} 
              onChange={(e, newValue) => {}}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
              <Tab 
                icon={<ArchitectureIcon />} 
                label="자동 생성 다이어그램" 
                iconPosition="start"
              />
              <Tab 
                icon={<EditIcon />} 
                label="수동 그리기" 
                iconPosition="start"
              />
            </Tabs>

            {/* 자동 생성 다이어그램 */}
            <Box sx={{ height: '600px' }}>
              <SystemDiagram
                nodes={diagramNodes}
                title="코드 아키텍처 다이어그램 (자동 생성)"
                onNodeClick={(node) => {
                  console.log('선택된 노드:', node);
                }}
                onRefresh={() => {
                  generateDiagramNodes();
                }}
              />
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArchitectureIcon />}
                onClick={() => {
                  generateDiagramNodes();
                }}
              >
                다이어그램 새로고침
              </Button>
              <Button
                variant="contained"
                startIcon={<CodeIcon />}
                onClick={() => setCurrentTab(0)}
              >
                코드 등록으로 돌아가기
              </Button>
            </Box>

            {/* 수동 그리기 캔버스 */}
            <Box sx={{ mt: 4, height: '600px', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <DiagramCanvas
                onSave={(nodes, connections) => {
                  console.log('저장된 다이어그램:', { nodes, connections });
                  alert('다이어그램이 저장되었습니다!');
                }}
                initialNodes={diagramNodes}
                initialConnections={[]}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CodeRegistration;
