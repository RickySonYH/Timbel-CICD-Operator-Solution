// [advice from AI] PE 작업공간 - 프로젝트 엔지니어용 작업공간
// 개발계획서 4.3 PE(프로젝트 엔지니어) 레벨 구조에 따른 구현

import React, { useState } from 'react';
import KnowledgeManagement from './KnowledgeManagement';
import CodeRegistration from './CodeRegistration';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Paper,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import BackstageCard from '../../components/layout/BackstageCard';

const PEWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  // [advice from AI] 개발계획서 4.3 PE 작업공간 구조에 따른 샘플 데이터
  const myProjects = [
    { id: 'PRJ-001', name: '모바일 뱅킹 앱', status: '진행중', progress: 75, dueDate: '2024-02-15' },
    { id: 'PRJ-002', name: '이커머스 리뉴얼', status: '진행중', progress: 60, dueDate: '2024-03-01' },
    { id: 'PRJ-003', name: 'AI 챗봇 도입', status: '완료', progress: 100, dueDate: '2024-01-10' },
  ];

  const deliverables = [
    { id: 'DEL-001', name: '사용자 인증 모듈', type: '컴포넌트', status: '검토중', version: 'v1.2' },
    { id: 'DEL-002', name: '결제 API', type: 'API', status: '승인완료', version: 'v2.0' },
    { id: 'DEL-003', name: 'UI 컴포넌트 라이브러리', type: '라이브러리', status: '등록완료', version: 'v1.5' },
  ];

  const codeLibraries = [
    { name: 'Button 컴포넌트', type: 'React Component', usage: 47, status: '승인됨' },
    { name: 'API 클라이언트', type: 'Utility', usage: 23, status: '승인됨' },
    { name: '폼 검증 훅', type: 'React Hook', usage: 15, status: '검토중' },
    { name: '데이터 변환 함수', type: 'Utility', usage: 8, status: '대기중' },
  ];

  const knowledgeResources = [
    { name: 'React 컴포넌트 패턴', type: '가이드', category: '프론트엔드', downloads: 156 },
    { name: 'RESTful API 설계', type: '문서', category: '백엔드', downloads: 89 },
    { name: '상태 관리 패턴', type: '예제', category: '프론트엔드', downloads: 67 },
    { name: '테스트 작성 가이드', type: '가이드', category: 'QA', downloads: 45 },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSubTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
  };

  const handleCodeRegistration = () => {
    setCodeDialogOpen(true);
  };

  return (
    <Box>
      {/* [advice from AI] 페이지 헤더 - 개발계획서 4.3 구조 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          PE 작업공간
        </Typography>
        <Typography variant="body1" color="text.secondary">
          내 프로젝트, 산출물 관리, 개발도구, 지식자원 활용
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 - 개발계획서 4.3 구조 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="내 프로젝트" />
          <Tab label="산출물 관리" />
          <Tab label="개발도구" />
          <Tab label="지식자원 활용" />
          <Tab label="내 성과" />
          <Tab label="커뮤니케이션" />
        </Tabs>
      </Box>

      {/* [advice from AI] 내 프로젝트 탭 */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <BackstageCard title="내 프로젝트" variant="default">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>프로젝트 ID</TableCell>
                      <TableCell>프로젝트명</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>진행률</TableCell>
                      <TableCell>마감일</TableCell>
                      <TableCell>액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {project.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {project.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={project.status} 
                            size="small"
                            color={project.status === '완료' ? 'success' : 
                                   project.status === '진행중' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {project.progress}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {project.dueDate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            상세보기
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </BackstageCard>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 산출물 관리 탭 */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <BackstageCard title="산출물 관리" variant="default">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>산출물 ID</TableCell>
                      <TableCell>산출물명</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>버전</TableCell>
                      <TableCell>액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deliverables.map((deliverable) => (
                      <TableRow key={deliverable.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {deliverable.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {deliverable.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={deliverable.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={deliverable.status} 
                            size="small"
                            color={deliverable.status === '승인완료' ? 'success' : 
                                   deliverable.status === '검토중' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {deliverable.version}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            수정
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </BackstageCard>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 개발도구 탭 - 코드 라이브러리화 */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeSubTab} onChange={handleSubTabChange}>
              <Tab label="코드 등록" />
              <Tab label="지식 관리" />
              <Tab label="라이브러리 목록" />
            </Tabs>
          </Box>

          {activeSubTab === 0 && <CodeRegistration />}
          {activeSubTab === 1 && <KnowledgeManagement />}
          {activeSubTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <BackstageCard title="등록된 라이브러리" variant="default">
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>라이브러리명</TableCell>
                          <TableCell>타입</TableCell>
                          <TableCell>사용 횟수</TableCell>
                          <TableCell>상태</TableCell>
                          <TableCell>액션</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {codeLibraries.map((library) => (
                          <TableRow key={library.name}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {library.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={library.type} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {library.usage}회
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={library.status} 
                                size="small"
                                color={library.status === '승인됨' ? 'success' : 
                                       library.status === '검토중' ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Button size="small" variant="outlined">
                                관리
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </BackstageCard>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* [advice from AI] 지식자원 활용 탭 - 백스테이지IO 기능 */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <BackstageCard title="지식자원 활용 (백스테이지IO 기능)" variant="default">
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  placeholder="컴포넌트, API, 서비스를 검색하세요..."
                  variant="outlined"
                  size="small"
                />
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>자원명</TableCell>
                      <TableCell>타입</TableCell>
                      <TableCell>카테고리</TableCell>
                      <TableCell>다운로드</TableCell>
                      <TableCell>액션</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {knowledgeResources.map((resource) => (
                      <TableRow key={resource.name}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {resource.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={resource.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {resource.category}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {resource.downloads}회
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            사용하기
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </BackstageCard>
          </Grid>
        </Grid>
      )}

      {/* [advice from AI] 코드 등록 다이얼로그 */}
      <Dialog open={codeDialogOpen} onClose={() => setCodeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>코드 등록</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="코드명"
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>코드 타입</InputLabel>
                <Select label="코드 타입">
                  <MenuItem value="component">컴포넌트</MenuItem>
                  <MenuItem value="service">서비스</MenuItem>
                  <MenuItem value="api">API</MenuItem>
                  <MenuItem value="utility">유틸리티</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="설명"
                variant="outlined"
                multiline
                rows={4}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="소스 코드"
                variant="outlined"
                multiline
                rows={10}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCodeDialogOpen(false)}>취소</Button>
          <Button variant="contained" onClick={() => setCodeDialogOpen(false)}>
            등록
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PEWorkspace;
