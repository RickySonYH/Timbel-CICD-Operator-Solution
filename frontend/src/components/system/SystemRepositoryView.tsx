import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Breadcrumbs,
  Link,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Avatar,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CallSplit as ForkIcon,
  Visibility as WatchIcon,
  Computer as SystemIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Palette as DesignIcon,
  Category as CatalogIcon,
  BugReport as IssueIcon,
  Download as DownloadIcon,
  Launch as LaunchIcon,
  History as HistoryIcon
} from '@mui/icons-material';

interface SystemRepositoryViewProps {
  systemId: string;
  onClose?: () => void;
}

interface FileTreeItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lastModified?: string;
  language?: string;
  content?: string;
  children?: FileTreeItem[];
}

interface SystemInfo {
  id: string;
  name: string;
  description: string;
  sourceUrl: string;
  sourceBranch: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    codeComponents: number;
    documents: number;
    designAssets: number;
    catalogComponents: number;
    totalFiles: number;
    totalSize: number;
  };
  branches: string[];
  tags: string[];
  releases: Array<{
    name: string;
    tag: string;
    date: string;
    description: string;
  }>;
}

const SystemRepositoryView: React.FC<SystemRepositoryViewProps> = ({ systemId, onClose }) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileTreeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    loadSystemInfo();
    loadFileTree();
  }, [systemId, currentBranch]);

  const loadSystemInfo = async () => {
    try {
      // [advice from AI] 실제 시스템 스냅샷 데이터 로딩
      const response = await fetch(`/api/systems/${systemId}/snapshot`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const snapshot = data.data;
          const systemInfo: SystemInfo = {
            id: systemId,
            name: snapshot.system_name,
            description: snapshot.system_description,
            sourceUrl: snapshot.repository_url,
            sourceBranch: snapshot.branch_name || currentBranch,
            owner: 'System',
            createdAt: snapshot.created_at,
            updatedAt: snapshot.created_at,
            stats: {
              codeComponents: snapshot.metadata?.assets?.codeComponents || 0,
              documents: snapshot.metadata?.assets?.documents || 0,
              designAssets: snapshot.metadata?.assets?.designAssets || 0,
              catalogComponents: snapshot.metadata?.assets?.catalogComponents || 0,
              totalFiles: snapshot.total_files || 0,
              totalSize: snapshot.total_size || 0
            },
            branches: [snapshot.branch_name || 'main'],
            tags: [],
            releases: []
          };
          setSystemInfo(systemInfo);
        }
      } else {
        console.error('시스템 스냅샷 로드 실패:', response.status);
        // [advice from AI] 실패 시 기본 정보로 대체
        setSystemInfo({
          id: systemId,
          name: `System ${systemId}`,
          description: '시스템 정보를 로드할 수 없습니다',
          sourceUrl: '',
          sourceBranch: currentBranch,
          owner: 'Unknown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: { codeComponents: 0, documents: 0, designAssets: 0, catalogComponents: 0, totalFiles: 0, totalSize: 0 },
          branches: [currentBranch],
          tags: [],
          releases: []
        });
      }
    } catch (error) {
      console.error('시스템 정보 로드 실패:', error);
    }
  };

  const loadFileTree = async () => {
    try {
      setLoading(true);
      // [advice from AI] 실제 소스코드 저장소에서 파일 트리 로딩
      const response = await fetch(`/api/systems/${systemId}/files`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFileTree(data.data);
        }
      } else {
        console.error('파일 트리 로드 실패:', response.status);
        setFileTree([]);
      }
    } catch (error) {
      console.error('파일 트리 로드 실패:', error);
      setFileTree([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  const getFileIcon = (item: FileTreeItem) => {
    if (item.type === 'directory') {
      return <FolderIcon color="primary" />;
    }
    
    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <CodeIcon color="success" />;
      case 'md':
      case 'txt':
      case 'rst':
        return <DocumentIcon color="info" />;
      case 'yml':
      case 'yaml':
      case 'json':
      case 'xml':
        return <CatalogIcon color="warning" />;
      default:
        return <FileIcon />;
    }
  };

  const handleFileClick = (item: FileTreeItem) => {
    if (item.type === 'file') {
      setSelectedFile(item);
      // [advice from AI] 파일 내용 로드 로직 추가 가능
    }
  };

  if (!systemInfo) {
    return <Typography>시스템 정보를 로드하는 중...</Typography>;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* [advice from AI] 시스템 헤더 정보 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <SystemIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1" fontWeight="bold">
                  {systemInfo.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {systemInfo.description}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={1}>
                  <Chip label={`by ${systemInfo.owner}`} size="small" />
                  <Chip label="Public" size="small" color="success" />
                </Box>
              </Box>
            </Box>
            
            <Box display="flex" gap={1}>
              <Button
                variant={isStarred ? "contained" : "outlined"}
                startIcon={isStarred ? <StarIcon /> : <StarBorderIcon />}
                onClick={() => setIsStarred(!isStarred)}
                size="small"
              >
                {isStarred ? 'Starred' : 'Star'} 0
              </Button>
              <Button variant="outlined" startIcon={<ForkIcon />} size="small">
                Fork 0
              </Button>
              <Button variant="outlined" startIcon={<WatchIcon />} size="small">
                Watch 0
              </Button>
            </Box>
          </Box>

          {/* [advice from AI] 통계 정보 */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="primary">{systemInfo.stats.codeComponents}</Typography>
                <Typography variant="body2">코드 컴포넌트</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">{systemInfo.stats.documents}</Typography>
                <Typography variant="body2">문서</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">{systemInfo.stats.designAssets}</Typography>
                <Typography variant="body2">디자인 자산</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h6" color="info.main">{systemInfo.stats.catalogComponents}</Typography>
                <Typography variant="body2">카탈로그</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 브랜치/태그 선택 및 액션 버튼 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Branch</InputLabel>
                <Select
                  value={currentBranch}
                  onChange={(e) => setCurrentBranch(e.target.value)}
                  label="Branch"
                >
                  {systemInfo.branches.map((branch) => (
                    <MenuItem key={branch} value={branch}>
                      {branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button variant="outlined" size="small">
                {systemInfo.tags.length} Tags
              </Button>
              
              <Button variant="outlined" size="small">
                {systemInfo.releases.length} Releases
              </Button>
            </Box>

            <Box display="flex" gap={1}>
              <Button variant="contained" startIcon={<DownloadIcon />} size="small">
                Code
              </Button>
              <Button variant="outlined" startIcon={<LaunchIcon />} size="small">
                Open in IDE
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* [advice from AI] 파일 트리 */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">
              📁 {formatFileSize(systemInfo.stats.totalSize)} • {systemInfo.stats.totalFiles} files
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Last updated {formatDate(systemInfo.updatedAt)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* [advice from AI] 파일 목록 테이블 */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Last Modified</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fileTree.map((item) => (
                  <TableRow 
                    key={item.path}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleFileClick(item)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getFileIcon(item)}
                        <Typography variant="body2">
                          {item.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {item.size ? formatFileSize(item.size) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {item.lastModified ? formatDate(item.lastModified) : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* [advice from AI] README 프리뷰 (선택적) */}
      {selectedFile && selectedFile.name === 'README.md' && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📖 README.md
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
              {/* [advice from AI] 실제 README 내용이 로드되면 여기에 표시 */}
              README 내용이 여기에 표시됩니다...
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default SystemRepositoryView;
