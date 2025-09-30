// [advice from AI] 시스템 저장소 뷰 - GitHub 스타일 시스템 상세 페이지

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Chip, Button, Avatar, Divider, List, ListItem, ListItemIcon, ListItemText,
  Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Breadcrumbs, Link
} from '@mui/material';
import {
  Star as StarIcon,
  CallSplit as ForkIcon,
  BugReport as IssueIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Settings as SettingsIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  AccountTree as TreeIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface SystemInfo {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  version: string;
  owner: string;
  lifecycle: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    source?: any;
    extractedAssets?: any;
    techStack?: string[];
    dependencies?: string[];
  };
  stats?: {
    components: number;
    documents: number;
    apis: number;
    stars: number;
  };
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modified?: string;
  children?: FileNode[];
}

interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  status: 'approved' | 'pending' | 'rejected';
  description: string;
  path: string;
}

const SystemRepositoryView: React.FC = () => {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const { token } = useJwtAuthStore();
  
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [readme, setReadme] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] 시스템 정보 로드
  useEffect(() => {
    const fetchSystemInfo = async () => {
      if (!systemId || !token) return;

      try {
        setLoading(true);
        
        // 시스템 기본 정보
        const systemResponse = await fetch(`/api/catalog-systems/${systemId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!systemResponse.ok) {
          throw new Error('시스템 정보를 불러올 수 없습니다');
        }
        
        const system = await systemResponse.json();
        setSystemInfo(system.data);
        
        // README 생성
        generateReadme(system.data);
        
        // 파일 트리 및 컴포넌트 정보는 임시 데이터로 설정
        setFileTree(generateMockFileTree());
        setComponents(generateMockComponents());
        
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchSystemInfo();
  }, [systemId, token]);

  // [advice from AI] README 자동 생성
  const generateReadme = (system: SystemInfo) => {
    const readmeContent = `# ${system.title}

${system.description}

## 📋 시스템 정보

- **버전**: ${system.version}
- **분류**: ${system.category}
- **생명주기**: ${system.lifecycle}
- **소유자**: ${system.owner}

## 🏗️ 아키텍처 개요

${system.metadata?.extractedAssets ? `
### 추출된 지식 자산
- **코드 컴포넌트**: ${system.metadata.extractedAssets.codeComponents || 0}개
- **디자인 자산**: ${system.metadata.extractedAssets.designAssets || 0}개  
- **문서**: ${system.metadata.extractedAssets.documents || 0}개
- **카탈로그 컴포넌트**: ${system.metadata.extractedAssets.catalogComponents || 0}개
` : ''}

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+
- Docker & Docker Compose
- Git

### 설치 및 실행

\`\`\`bash
# 저장소 클론
git clone ${system.metadata?.source?.url || 'repository-url'}

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 또는 Docker로 실행
docker-compose up -d
\`\`\`

## 📚 문서

- [API 문서](./docs/api.md)
- [개발 가이드](./docs/development.md)
- [배포 가이드](./docs/deployment.md)

## 🤝 기여하기

이 프로젝트에 기여하고 싶으시다면 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your Changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the Branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

*Generated by Timbel Project Management Solution*
`;
    setReadme(readmeContent);
  };

  // [advice from AI] 임시 파일 트리 생성
  const generateMockFileTree = (): FileNode[] => {
    return [
      {
        name: 'src',
        type: 'directory',
        path: '/src',
        children: [
          { name: 'components', type: 'directory', path: '/src/components' },
          { name: 'services', type: 'directory', path: '/src/services' },
          { name: 'utils', type: 'directory', path: '/src/utils' },
          { name: 'index.js', type: 'file', path: '/src/index.js', size: 1024 }
        ]
      },
      {
        name: 'docs',
        type: 'directory', 
        path: '/docs',
        children: [
          { name: 'README.md', type: 'file', path: '/docs/README.md', size: 2048 },
          { name: 'api.md', type: 'file', path: '/docs/api.md', size: 4096 }
        ]
      },
      { name: 'docker-compose.yml', type: 'file', path: '/docker-compose.yml', size: 512 },
      { name: 'package.json', type: 'file', path: '/package.json', size: 256 },
      { name: '.env.example', type: 'file', path: '/.env.example', size: 128 },
      { name: 'Dockerfile', type: 'file', path: '/Dockerfile', size: 384 }
    ];
  };

  // [advice from AI] 임시 컴포넌트 정보 생성
  const generateMockComponents = (): ComponentInfo[] => {
    return [
      {
        id: '1',
        name: 'UserService',
        type: 'service',
        status: 'approved',
        description: '사용자 관리 서비스',
        path: '/src/services/UserService.js'
      },
      {
        id: '2', 
        name: 'AuthController',
        type: 'controller',
        status: 'pending',
        description: '인증 컨트롤러',
        path: '/src/controllers/AuthController.js'
      },
      {
        id: '3',
        name: 'DatabaseConfig',
        type: 'config',
        status: 'approved', 
        description: '데이터베이스 설정',
        path: '/src/config/database.js'
      }
    ];
  };

  // [advice from AI] 파일 트리 렌더링
  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => (
      <Box key={node.path}>
        <ListItem 
          sx={{ pl: level * 2 + 1, py: 0.5, cursor: 'pointer' }}
          onClick={() => {/* 파일 클릭 처리 */}}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {node.type === 'directory' ? <FolderIcon /> : <FileIcon />}
          </ListItemIcon>
          <ListItemText 
            primary={node.name}
            secondary={node.size ? `${(node.size / 1024).toFixed(1)} KB` : undefined}
          />
        </ListItem>
        {node.children && renderFileTree(node.children, level + 1)}
      </Box>
    ));
  };

  // [advice from AI] 상태별 컴포넌트 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>로딩 중...</Typography>
      </Container>
    );
  }

  if (error || !systemInfo) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography color="error">{error || '시스템을 찾을 수 없습니다'}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* [advice from AI] 브레드크럼 네비게이션 */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" href="/knowledge" sx={{ display: 'flex', alignItems: 'center' }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          지식 플랫폼
        </Link>
        <Link color="inherit" href="/catalog/systems">
          시스템 카탈로그
        </Link>
        <Typography color="text.primary">{systemInfo.name}</Typography>
      </Breadcrumbs>

      {/* [advice from AI] 시스템 헤더 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                <TreeIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  {systemInfo.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {systemInfo.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={systemInfo.category} size="small" />
                  <Chip label={`v${systemInfo.version}`} size="small" variant="outlined" />
                  <Chip 
                    label={systemInfo.lifecycle} 
                    size="small" 
                    color={systemInfo.lifecycle === 'production' ? 'success' : 'warning'}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<StarIcon />} variant="outlined" size="small">
                Star {systemInfo.stats?.stars || 0}
              </Button>
              <Button startIcon={<ForkIcon />} variant="outlined" size="small">
                Fork
              </Button>
              <Button startIcon={<ShareIcon />} variant="outlined" size="small">
                Share
              </Button>
            </Box>
          </Box>

          {/* [advice from AI] 통계 정보 */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{systemInfo.stats?.components || 0}</Typography>
                <Typography variant="caption" color="text.secondary">Components</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{systemInfo.stats?.documents || 0}</Typography>
                <Typography variant="caption" color="text.secondary">Documents</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{systemInfo.stats?.apis || 0}</Typography>
                <Typography variant="caption" color="text.secondary">APIs</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{systemInfo.stats?.stars || 0}</Typography>
                <Typography variant="caption" color="text.secondary">Stars</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<DocumentIcon />} label="README" />
          <Tab icon={<CodeIcon />} label="Code" />
          <Tab icon={<TreeIcon />} label="Components" />
          <Tab icon={<TimelineIcon />} label="Insights" />
          <Tab icon={<SecurityIcon />} label="Security" />
        </Tabs>
      </Paper>

      {/* [advice from AI] 탭 컨텐츠 */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '14px' }}>
              {readme}
            </pre>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📁 파일 구조
                </Typography>
                <List dense>
                  {renderFileTree(fileTree)}
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📄 파일 내용
                </Typography>
                <Typography color="text.secondary">
                  파일을 선택하면 내용을 표시합니다.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🧩 시스템 컴포넌트
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>이름</TableCell>
                    <TableCell>타입</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell>경로</TableCell>
                    <TableCell>액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {components.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell>{component.name}</TableCell>
                      <TableCell>
                        <Chip label={component.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={component.status} 
                          size="small" 
                          color={getStatusColor(component.status) as any}
                        />
                      </TableCell>
                      <TableCell>{component.description}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {component.path}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 시스템 인사이트
            </Typography>
            <Typography color="text.secondary">
              시스템 분석 결과 및 메트릭을 표시합니다.
            </Typography>
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔒 보안 정보
            </Typography>
            <Typography color="text.secondary">
              보안 취약점 분석 및 권장사항을 표시합니다.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default SystemRepositoryView;
