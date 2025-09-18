// [advice from AI] 다이어그램 에디터 - 드래그 앤 드롭으로 다이어그램 작성

import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Paper, List, ListItem, ListItemText, Divider, Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface DiagramTemplate {
  id: string;
  name: string;
  type: 'system-architecture' | 'component-flow' | 'api-flow' | 'data-flow';
  description: string;
  elements: any[];
}

interface SavedDiagram {
  id: string;
  name: string;
  type: string;
  description: string;
  relatedAssets: string[];
  created_at: string;
  updated_at: string;
}

const DiagramEditor: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<any>(null);
  const [diagramName, setDiagramName] = useState('');
  const [diagramType, setDiagramType] = useState('system-architecture');
  const [diagramDescription, setDiagramDescription] = useState('');
  const [saveDialog, setSaveDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [advice from AI] 다이어그램 템플릿
  const diagramTemplates: DiagramTemplate[] = [
    {
      id: 'system-arch',
      name: '시스템 아키텍처',
      type: 'system-architecture',
      description: '전체 시스템의 구조와 컴포넌트 관계',
      elements: []
    },
    {
      id: 'component-flow',
      name: '컴포넌트 플로우',
      type: 'component-flow', 
      description: '컴포넌트 간 데이터 흐름과 상호작용',
      elements: []
    },
    {
      id: 'api-flow',
      name: 'API 플로우',
      type: 'api-flow',
      description: 'API 엔드포인트와 데이터 흐름',
      elements: []
    },
    {
      id: 'data-flow',
      name: '데이터 플로우',
      type: 'data-flow',
      description: '데이터 처리 과정과 저장소 관계',
      elements: []
    }
  ];

  // [advice from AI] 저장된 다이어그램 로드
  useEffect(() => {
    const fetchDiagrams = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await fetch('/api/diagrams', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('다이어그램 목록을 불러올 수 없습니다');
        }

        const data = await response.json();
        setSavedDiagrams(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchDiagrams();
  }, [token]);

  // [advice from AI] 새 다이어그램 생성
  const createNewDiagram = (template: DiagramTemplate) => {
    setCurrentDiagram({
      ...template,
      id: `new-${Date.now()}`,
      name: `새 ${template.name}`,
      elements: []
    });
    setDiagramName(`새 ${template.name}`);
    setDiagramType(template.type);
    setDiagramDescription(template.description);
  };

  // [advice from AI] 다이어그램 저장
  const saveDiagram = async () => {
    if (!currentDiagram || !diagramName.trim()) return;

    try {
      const response = await fetch('/api/diagrams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: diagramName,
          type: diagramType,
          description: diagramDescription,
          content: currentDiagram,
          created_by: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('다이어그램 저장에 실패했습니다');
      }

      setSaveDialog(false);
      // 목록 새로고침
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          다이어그램 에디터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          시스템, API, 컴포넌트의 다이어그램을 직접 편집하고 생성할 수 있습니다.
        </Typography>
      </Box>

      {/* [advice from AI] 에러 표시 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* [advice from AI] 템플릿 및 저장된 다이어그램 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                다이어그램 템플릿
              </Typography>
              <List dense>
                {diagramTemplates.map((template) => (
                  <ListItem key={template.id}>
                    <ListItemText
                      primary={template.name}
                      secondary={template.description}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => createNewDiagram(template)}
                    >
                      생성
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                저장된 다이어그램
              </Typography>
              {loading ? (
                <Typography>로딩 중...</Typography>
              ) : savedDiagrams.length === 0 ? (
                <Typography color="text.secondary">
                  저장된 다이어그램이 없습니다.
                </Typography>
              ) : (
                <List dense>
                  {savedDiagrams.map((diagram) => (
                    <ListItem key={diagram.id}>
                      <ListItemText
                        primary={diagram.name}
                        secondary={
                          <Box>
                            <Chip label={diagram.type} size="small" />
                            <Typography variant="caption" display="block">
                              {new Date(diagram.updated_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" startIcon={<EditIcon />}>
                          편집
                        </Button>
                        <Button size="small" startIcon={<ViewIcon />}>
                          보기
                        </Button>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* [advice from AI] 다이어그램 편집 영역 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {currentDiagram ? `편집 중: ${currentDiagram.name}` : '다이어그램 편집기'}
                </Typography>
                {currentDiagram && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<SaveIcon />}
                      onClick={() => setSaveDialog(true)}
                    >
                      저장
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                    >
                      내보내기
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ mb: 2 }} />

              {currentDiagram ? (
                <Box sx={{ 
                  height: '600px', 
                  border: '2px dashed', 
                  borderColor: 'grey.300',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.50'
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      다이어그램 편집 영역
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      향후 드래그 앤 드롭 다이어그램 에디터가 여기에 구현됩니다.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      현재는 템플릿 기반 자동 생성을 지원합니다.
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ 
                  height: '600px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                  borderRadius: 1
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      다이어그램을 선택하거나 새로 생성하세요
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      왼쪽에서 템플릿을 선택하거나 저장된 다이어그램을 편집할 수 있습니다.
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* [advice from AI] 저장 다이얼로그 */}
      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>다이어그램 저장</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="다이어그램 이름"
              value={diagramName}
              onChange={(e) => setDiagramName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>타입</InputLabel>
              <Select
                value={diagramType}
                onChange={(e) => setDiagramType(e.target.value)}
                label="타입"
              >
                <MenuItem value="system-architecture">시스템 아키텍처</MenuItem>
                <MenuItem value="component-flow">컴포넌트 플로우</MenuItem>
                <MenuItem value="api-flow">API 플로우</MenuItem>
                <MenuItem value="data-flow">데이터 플로우</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="설명"
              value={diagramDescription}
              onChange={(e) => setDiagramDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={saveDiagram}
            disabled={!diagramName.trim()}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DiagramEditor;
