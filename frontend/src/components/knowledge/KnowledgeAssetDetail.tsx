// [advice from AI] 지식 자산 통합 상세 보기 컴포넌트

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Tabs, Tab, Card, CardContent,
  Chip, Divider, List, ListItem, ListItemText, ListItemIcon,
  CircularProgress, Alert, Grid, Paper, IconButton,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  AccountTree as RelationshipIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface KnowledgeAssetDetailProps {
  open: boolean;
  onClose: () => void;
  assetType: 'code' | 'design' | 'document' | 'catalog';
  assetId: string;
}

interface AssetDetail {
  id: string;
  name: string;
  title?: string;
  description: string;
  type: string;
  file_path?: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface Relationship {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relationship_type: string;
  confidence_score: number;
  source_name?: string;
  target_name?: string;
}

const KnowledgeAssetDetail: React.FC<KnowledgeAssetDetailProps> = ({
  open,
  onClose,
  assetType,
  assetId
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [relationships, setRelationships] = useState<{
    incoming: Relationship[];
    outgoing: Relationship[];
    summary: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useJwtAuthStore();

  // [advice from AI] 자산 상세 정보 로드
  const loadAssetDetail = async () => {
    if (!token || !assetId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📊 자산 상세 정보 로드:', { assetType, assetId });

      const response = await fetch(`http://localhost:3001/api/knowledge-extraction/item/${assetType}/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setAssetDetail(result.data.item);
        console.log('✅ 자산 상세 정보 로드 성공');
      } else {
        throw new Error(result.message || 'Failed to load asset detail');
      }

    } catch (err) {
      console.error('❌ 자산 상세 정보 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 관계 정보 로드
  const loadRelationships = async () => {
    if (!token || !assetId) return;

    try {
      console.log('🔗 관계 정보 로드:', { assetType, assetId });

      const response = await fetch(`http://localhost:3001/api/knowledge-extraction/relationships/${assetType}/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRelationships(result.data);
          console.log('✅ 관계 정보 로드 성공');
        }
      }

    } catch (err) {
      console.error('⚠️ 관계 정보 로드 실패:', err);
      // 관계 정보는 선택사항이므로 오류를 무시
    }
  };

  useEffect(() => {
    if (open && assetId) {
      loadAssetDetail();
      loadRelationships();
    }
  }, [open, assetId, assetType, token]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 자산 타입별 아이콘
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'code':
      case 'catalog':
        return <CodeIcon />;
      case 'design':
        return <ImageIcon />;
      case 'document':
        return <DocumentIcon />;
      default:
        return <CategoryIcon />;
    }
  };

  // [advice from AI] 다운로드 처리
  const handleDownload = async () => {
    if (!assetDetail || !token) return;

    try {
      let downloadUrl = '';
      
      if (assetType === 'design') {
        downloadUrl = `http://localhost:3001/api/design-assets/${assetId}/download`;
      } else if (assetType === 'document') {
        // 문서는 내용을 텍스트 파일로 다운로드
        const blob = new Blob([assetDetail.content || ''], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${assetDetail.name || 'document'}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
        return;
      } else {
        // 코드 컴포넌트는 소스 코드를 파일로 다운로드
        const extension = assetDetail.language === 'typescript' ? '.ts' : '.js';
        const blob = new Blob([assetDetail.source_code || ''], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${assetDetail.name || 'component'}${extension}`;
        a.click();
        window.URL.revokeObjectURL(url);
        return;
      }

      // 서버에서 파일 다운로드
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = assetDetail.name || 'download';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('다운로드 실패');
      }

    } catch (err) {
      console.error('다운로드 오류:', err);
      setError('다운로드 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 종속성 포함 다운로드 처리
  const handleDownloadWithDependencies = async () => {
    if (!assetDetail || !token || assetType !== 'design') return;

    try {
      const downloadUrl = `http://localhost:3001/api/design-assets/${assetId}/download-with-dependencies`;

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${assetDetail.name}_with_dependencies.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('종속성 포함 다운로드 실패');
      }

    } catch (err) {
      console.error('종속성 다운로드 오류:', err);
      setError('종속성 포함 다운로드 중 오류가 발생했습니다.');
    }
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getAssetIcon(assetType)}
            <Typography variant="h6">
              {assetDetail?.title || assetDetail?.name || '지식 자산 상세'}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {assetDetail && (
          <>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
              <Tab label="📋 기본 정보" />
              <Tab label="🔗 관계 정보" />
              <Tab label="📊 상세 분석" />
              {assetType === 'code' && <Tab label="💻 소스 코드" />}
              {assetType === 'document' && <Tab label="📄 문서 내용" />}
            </Tabs>

            {/* 기본 정보 탭 */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        📋 기본 정보
                      </Typography>
                      
                      <List>
                        <ListItem>
                          <ListItemIcon><CategoryIcon /></ListItemIcon>
                          <ListItemText 
                            primary="이름" 
                            secondary={assetDetail.name}
                          />
                        </ListItem>
                        
                        {assetDetail.title && (
                          <ListItem>
                            <ListItemIcon><CategoryIcon /></ListItemIcon>
                            <ListItemText 
                              primary="제목" 
                              secondary={assetDetail.title}
                            />
                          </ListItem>
                        )}

                        <ListItem>
                          <ListItemIcon><DocumentIcon /></ListItemIcon>
                          <ListItemText 
                            primary="설명" 
                            secondary={assetDetail.description || '설명 없음'}
                          />
                        </ListItem>

                        <ListItem>
                          <ListItemIcon><CategoryIcon /></ListItemIcon>
                          <ListItemText 
                            primary="타입" 
                            secondary={assetDetail.type}
                          />
                        </ListItem>

                        {assetDetail.file_path && (
                          <ListItem>
                            <ListItemIcon><LinkIcon /></ListItemIcon>
                            <ListItemText 
                              primary="파일 경로" 
                              secondary={assetDetail.file_path}
                            />
                          </ListItem>
                        )}

                        <ListItem>
                          <ListItemIcon><PersonIcon /></ListItemIcon>
                          <ListItemText 
                            primary="생성자" 
                            secondary={assetDetail.creator_name || 'RickySon'}
                          />
                        </ListItem>

                        <ListItem>
                          <ListItemIcon><ScheduleIcon /></ListItemIcon>
                          <ListItemText 
                            primary="생성일" 
                            secondary={new Date(assetDetail.created_at).toLocaleString('ko-KR')}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        🏷️ 태그
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(Array.isArray(assetDetail.tags) ? assetDetail.tags : [assetDetail.tags])
                          .filter(Boolean)
                          .map((tag: string, index: number) => (
                            <Chip key={index} label={tag} size="small" variant="outlined" />
                          ))}
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="h6" gutterBottom>
                        🔧 작업
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                          startIcon={<DownloadIcon />}
                          onClick={handleDownload}
                          variant="outlined"
                          size="small"
                        >
                          다운로드
                        </Button>
                        
                        {assetType === 'design' && (
                          <Button
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadWithDependencies}
                            variant="outlined"
                            size="small"
                            color="secondary"
                          >
                            종속성 포함 다운로드
                          </Button>
                        )}
                        
                        {assetDetail.file_path && (
                          <Button
                            startIcon={<ViewIcon />}
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              // 파일 경로 복사
                              navigator.clipboard.writeText(assetDetail.file_path || '');
                            }}
                          >
                            경로 복사
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* 관계 정보 탭 */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  🔗 연결된 지식 자산
                </Typography>
                
                {relationships ? (
                  <Grid container spacing={2}>
                    {relationships.incoming.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              📥 이 자산을 참조하는 항목들
                            </Typography>
                            <List dense>
                              {relationships.incoming.map((rel, index) => (
                                <ListItem key={index}>
                                  <ListItemIcon><RelationshipIcon /></ListItemIcon>
                                  <ListItemText
                                    primary={rel.source_name || rel.source_id}
                                    secondary={`${rel.relationship_type} (신뢰도: ${(rel.confidence_score * 100).toFixed(0)}%)`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {relationships.outgoing.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              📤 이 자산이 참조하는 항목들
                            </Typography>
                            <List dense>
                              {relationships.outgoing.map((rel, index) => (
                                <ListItem key={index}>
                                  <ListItemIcon><RelationshipIcon /></ListItemIcon>
                                  <ListItemText
                                    primary={rel.target_name || rel.target_id}
                                    secondary={`${rel.relationship_type} (신뢰도: ${(rel.confidence_score * 100).toFixed(0)}%)`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {relationships.incoming.length === 0 && relationships.outgoing.length === 0 && (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          연결된 지식 자산이 없습니다. 관계 매핑을 실행하면 자동으로 연결고리가 생성됩니다.
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                ) : (
                  <Alert severity="info">
                    관계 정보를 불러오는 중이거나, 관계 매핑이 아직 실행되지 않았습니다.
                  </Alert>
                )}
              </Box>
            )}

            {/* 상세 분석 탭 */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  📊 상세 분석 정보
                </Typography>

                {/* 코드 컴포넌트 분석 */}
                {assetType === 'code' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            📈 코드 메트릭
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemText 
                                primary="언어" 
                                secondary={assetDetail.language || '알 수 없음'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="프레임워크" 
                                secondary={assetDetail.framework || '없음'}
                              />
                            </ListItem>
                            {assetDetail.file_info && (
                              <ListItem>
                                <ListItemText 
                                  primary="라인 수" 
                                  secondary={assetDetail.file_info.line_count || '알 수 없음'}
                                />
                              </ListItem>
                            )}
                            {assetDetail.file_info && (
                              <ListItem>
                                <ListItemText 
                                  primary="복잡도" 
                                  secondary={`${assetDetail.file_info.complexity_score || 0}/10`}
                                />
                              </ListItem>
                            )}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            🔧 구조 정보
                          </Typography>
                          {assetDetail.dependencies && (
                            <Box>
                              {assetDetail.dependencies.functions?.length > 0 && (
                                <Accordion>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>함수 ({assetDetail.dependencies.functions.length}개)</Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <List dense>
                                      {assetDetail.dependencies.functions.slice(0, 10).map((func: any, index: number) => (
                                        <ListItem key={index}>
                                          <ListItemText 
                                            primary={func.name}
                                            secondary={func.type}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  </AccordionDetails>
                                </Accordion>
                              )}

                              {assetDetail.dependencies.api_endpoints?.length > 0 && (
                                <Accordion>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>API 엔드포인트 ({assetDetail.dependencies.api_endpoints.length}개)</Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <List dense>
                                      {assetDetail.dependencies.api_endpoints.map((endpoint: any, index: number) => (
                                        <ListItem key={index}>
                                          <ListItemText 
                                            primary={`${endpoint.method} ${endpoint.path}`}
                                            secondary="API 엔드포인트"
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  </AccordionDetails>
                                </Accordion>
                              )}

                              {assetDetail.dependencies.imports?.length > 0 && (
                                <Accordion>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>의존성 ({assetDetail.dependencies.imports.length}개)</Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <List dense>
                                      {assetDetail.dependencies.imports.slice(0, 10).map((imp: any, index: number) => (
                                        <ListItem key={index}>
                                          <ListItemText 
                                            primary={imp.module}
                                            secondary={imp.isLocal ? '로컬 모듈' : '외부 패키지'}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  </AccordionDetails>
                                </Accordion>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {/* 디자인 자산 분석 */}
                {assetType === 'design' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            🎨 디자인 자산 정보
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemText 
                                primary="파일 타입" 
                                secondary={assetDetail.file_type}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="파일 크기" 
                                secondary={`${assetDetail.file_size || assetDetail.file_size_bytes || 0} bytes`}
                              />
                            </ListItem>
                            {assetDetail.dimensions && (
                              <ListItem>
                                <ListItemText 
                                  primary="크기" 
                                  secondary={assetDetail.dimensions}
                                />
                              </ListItem>
                            )}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {/* 문서 분석 */}
                {assetType === 'document' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            📄 문서 정보
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemText 
                                primary="형식" 
                                secondary={assetDetail.format || 'markdown'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="단어 수" 
                                secondary={assetDetail.word_count || '알 수 없음'}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText 
                                primary="가독성 점수" 
                                secondary={`${assetDetail.readability_score || 0}/10`}
                              />
                            </ListItem>
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}

            {/* 소스 코드 탭 */}
            {activeTab === 3 && assetType === 'code' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  💻 소스 코드
                </Typography>
                <Paper sx={{ p: 0, maxHeight: '70vh', overflow: 'auto', bgcolor: '#1e1e1e' }}>
                  <SyntaxHighlighter
                    language={assetDetail.language?.toLowerCase() || 'javascript'}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '16px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      maxHeight: '70vh',
                      overflow: 'auto'
                    }}
                    showLineNumbers={true}
                    wrapLines={true}
                  >
                    {assetDetail.source_code || '// 소스 코드를 불러올 수 없습니다.'}
                  </SyntaxHighlighter>
                </Paper>
              </Box>
            )}

            {/* 문서 내용 탭 */}
            {activeTab === 3 && assetType === 'document' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  📄 문서 내용
                </Typography>
                <Paper sx={{ p: 0, maxHeight: '70vh', overflow: 'auto', bgcolor: '#1e1e1e' }}>
                  <SyntaxHighlighter
                    language="markdown"
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '16px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      maxHeight: '70vh',
                      overflow: 'auto'
                    }}
                    showLineNumbers={true}
                    wrapLines={true}
                  >
                    {assetDetail.content || '# 문서 내용을 불러올 수 없습니다.'}
                  </SyntaxHighlighter>
                </Paper>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDownload} startIcon={<DownloadIcon />}>
          다운로드
        </Button>
        <Button onClick={onClose}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KnowledgeAssetDetail;
