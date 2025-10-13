// [advice from AI] Nexus Container Registry 관리 페이지 - 이미지 푸시, 버전 관리, 태깅
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';

// [advice from AI] Nexus 레포지토리 타입
interface NexusRepository {
  name: string;
  type: 'hosted' | 'proxy' | 'group';
  format: string;
  url: string;
}

// [advice from AI] 이미지 푸시 히스토리 타입
interface ImagePush {
  id: string;
  image_name: string;
  image_tag: string;
  registry_url: string;
  image_digest: string;
  image_size_mb: number;
  push_status: 'pending' | 'success' | 'failed';
  pushed_at: string;
  jenkins_build_number?: number;
  system_name?: string;
}

const NexusManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [repositories, setRepositories] = useState<NexusRepository[]>([]);
  const [pushHistory, setPushHistory] = useState<ImagePush[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [pushDialog, setPushDialog] = useState(false);
  const [tagDialog, setTagDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePush | null>(null);
  const [pushForm, setPushForm] = useState({
    image_name: '',
    image_tag: 'latest',
    system_id: '',
    jenkins_build_number: ''
  });

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      const { token: authToken } = useJwtAuthStore.getState();
      const [reposRes, historyRes] = await Promise.all([
        fetch('http://localhost:3001/api/nexus/repositories', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:3001/api/nexus/push-history', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (reposRes.ok) {
        const data = await reposRes.json();
        setRepositories(data.repositories || []);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setPushHistory(data.push_history || []);
      }
      
    } catch (error) {
      console.error('Nexus 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 이미지 푸시 실행
  const handlePushImage = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      const response = await fetch('http://localhost:3001/api/nexus/push-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...pushForm,
          repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator'
        })
      });

      if (!response.ok) {
        throw new Error('이미지 푸시 실패');
      }

      const data = await response.json();
      if (data.success) {
        alert('이미지 푸시가 성공적으로 완료되었습니다!');
        setPushDialog(false);
        loadData();
      }
      
    } catch (error) {
      console.error('이미지 푸시 실패:', error);
      alert('이미지 푸시에 실패했습니다.');
    }
  };

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Nexus 관리
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 */}
      <Typography variant="h4" gutterBottom>
        Nexus Container Registry 관리
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Docker 이미지 레지스트리 관리 및 자동 푸시 시스템
      </Typography>

      {/* [advice from AI] 메트릭 대시보드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                총 레포지토리
              </Typography>
              <Typography variant="h4" color="primary">
                {repositories.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Docker 레지스트리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                총 이미지 푸시
              </Typography>
              <Typography variant="h4" color="success.main">
                {pushHistory.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                성공: {pushHistory.filter(p => p.push_status === 'success').length}개
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                총 이미지 크기
              </Typography>
              <Typography variant="h4" color="info.main">
                {Math.round(pushHistory.reduce((sum, p) => sum + (p.image_size_mb || 0), 0) / 1024 * 10) / 10}GB
              </Typography>
              <Typography variant="body2" color="text.secondary">
                누적 저장 용량
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                최근 푸시
              </Typography>
              <Typography variant="h4" color="secondary.main">
                {pushHistory.length > 0 ? 
                  new Date(pushHistory[0].pushed_at).toLocaleDateString() : 
                  '없음'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                마지막 이미지 푸시
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 탭 네비게이션 */}
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`레포지토리 (${repositories.length})`} />
        <Tab label={`푸시 히스토리 (${pushHistory.length})`} />
        <Tab label="이미지 관리" />
      </Tabs>

      {/* [advice from AI] 레포지토리 목록 탭 */}
      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Nexus 레포지토리</Typography>
            {permissions.canManageDeployment && (
              <Button variant="contained" onClick={() => setPushDialog(true)}>
                이미지 푸시
              </Button>
            )}
          </Box>

          <Grid container spacing={3}>
            {repositories.map((repo, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {repo.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {repo.format.toUpperCase()} {repo.type}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {repo.url}
                    </Typography>
                    <Chip 
                      label={repo.type} 
                      color={repo.type === 'hosted' ? 'primary' : 'default'}
                      size="small"
                    />
                  </CardContent>
                  <CardActions>
                    <Button size="small" href={repo.url} target="_blank">
                      접속
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* [advice from AI] 푸시 히스토리 탭 */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>이미지명</TableCell>
                <TableCell>태그</TableCell>
                <TableCell>크기</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>시스템</TableCell>
                <TableCell>빌드 번호</TableCell>
                <TableCell>푸시 시간</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pushHistory.map((push) => (
                <TableRow key={push.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{push.image_name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {push.image_digest.substring(0, 20)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={push.image_tag} 
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{push.image_size_mb}MB</TableCell>
                  <TableCell>
                    <Chip 
                      label={push.push_status} 
                      color={getStatusColor(push.push_status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{push.system_name || '-'}</TableCell>
                  <TableCell>#{push.jenkins_build_number || '-'}</TableCell>
                  <TableCell>
                    {new Date(push.pushed_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* [advice from AI] 이미지 관리 탭 */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>이미지 태그 관리</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            이미지 태그 추가, 제거 및 버전 관리 기능
          </Alert>
          
          <Grid container spacing={2}>
            {[...new Set(pushHistory.map(p => p.image_name))].map((imageName) => (
              <Grid item xs={12} sm={6} md={4} key={imageName}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">{imageName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      태그: {pushHistory.filter(p => p.image_name === imageName).length}개
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => {
                        setSelectedImage(pushHistory.find(p => p.image_name === imageName) || null);
                        setTagDialog(true);
                      }}
                    >
                      태그 관리
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* [advice from AI] 이미지 푸시 대화상자 */}
      <Dialog open={pushDialog} onClose={() => setPushDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Docker 이미지 푸시</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="이미지명"
            fullWidth
            variant="outlined"
            value={pushForm.image_name}
            onChange={(e) => setPushForm({ ...pushForm, image_name: e.target.value })}
            placeholder="예: ecp-ai-k8s-orchestrator"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="이미지 태그"
            fullWidth
            variant="outlined"
            value={pushForm.image_tag}
            onChange={(e) => setPushForm({ ...pushForm, image_tag: e.target.value })}
            placeholder="예: v2.0.0, latest"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Jenkins 빌드 번호"
            type="number"
            fullWidth
            variant="outlined"
            value={pushForm.jenkins_build_number}
            onChange={(e) => setPushForm({ ...pushForm, jenkins_build_number: e.target.value })}
            placeholder="예: 123"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPushDialog(false)}>취소</Button>
          <Button onClick={handlePushImage} variant="contained">푸시 실행</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 태그 관리 대화상자 */}
      <Dialog open={tagDialog} onClose={() => setTagDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>이미지 태그 관리</DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedImage.image_name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                현재 태그들을 관리할 수 있습니다.
              </Typography>
              
              <List dense>
                {pushHistory
                  .filter(p => p.image_name === selectedImage.image_name)
                  .map((push) => (
                    <ListItem key={push.id}>
                      <ListItemText
                        primary={push.image_tag}
                        secondary={`${push.image_size_mb}MB - ${new Date(push.pushed_at).toLocaleDateString()}`}
                      />
                      <Chip 
                        label={push.push_status} 
                        color={getStatusColor(push.push_status) as any}
                        size="small"
                      />
                    </ListItem>
                  ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 없음 안내 */}
      {!permissions.canManageDeployment && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Nexus 관리에 접근할 권한이 없습니다.
        </Alert>
      )}
    </Box>
  );
};

export default NexusManagement;
